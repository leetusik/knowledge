import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { GET as versionRawGET } from "@/app/api/documents/[id]/versions/[v]/raw/route";
import { HEIGHT_REPORTER_MARKER } from "@/lib/explainer-height";
import { SESSION_COOKIE, sealSession } from "@/lib/session";

// P23.S3 — the version-aware BFF raw-HTML relay, driven against a STUBBED knowledge
// backend (the P16.S2 raw-route suite's shape). An ARCHIVED explainer is exactly as
// untrusted as a live one, so the same four properties are locked down here: the
// pinned sandbox headers re-asserted explicitly, the upstream VERSION url, the
// optional-identity relay (tokenless without a cookie), and the 404 mappings — a
// bad segment short-circuits before any session read or upstream call.

const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";
const HTML =
  "<!DOCTYPE html><html><body><h1>Quiz v1</h1><script>1</script></body></html>";

beforeAll(() => {
  process.env.SESSION_SECRET = "p23s3-test-secret-not-a-real-one";
  process.env.KB_API_BASE_URL = "http://kb.test:8766";
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Stub knowledge's version-raw response (fresh per call — a body is single-use). */
function stubKb(status: number, body: string | null, contentType: string) {
  vi.mocked(fetch).mockImplementation(() =>
    Promise.resolve(
      new Response(body, { status, headers: { "content-type": contentType } }),
    ),
  );
}

/** A GET Request to the relay, optionally carrying a sealed session cookie. */
function makeReq(sealed?: string): Request {
  return new Request("http://localhost:3030/api/documents/123/versions/2/raw", {
    method: "GET",
    headers: sealed ? { cookie: `${SESSION_COOKIE}=${sealed}` } : {},
  });
}

/** The route-handler context: Next 16 hands `params` as a Promise. */
const ctx = (id: string, v: string) => ({ params: Promise.resolve({ id, v }) });

describe("GET /api/documents/[id]/versions/[v]/raw — the archived-explainer relay", () => {
  it("relays the archived HTML from the VERSION route with the pinned sandbox headers", async () => {
    stubKb(200, HTML, "text/html; charset=utf-8");
    const res = await versionRawGET(
      makeReq(sealSession(TOKEN)),
      ctx("123", "2"),
    );

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "http://kb.test:8766/app/documents/123/versions/2/raw",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
    const body = await res.text();
    expect(body).toContain("<h1>Quiz v1</h1>");
    expect(body).toContain(HEIGHT_REPORTER_MARKER);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("content-security-policy")).toBe(
      "sandbox allow-scripts; frame-ancestors 'self'",
    );
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("relays anonymously with NO Authorization header when the cookie is absent", async () => {
    stubKb(200, HTML, "text/html; charset=utf-8");
    const res = await versionRawGET(makeReq(), ctx("123", "2"));

    expect(res.status).toBe(200);
    const headers = (vi.mocked(fetch).mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("passes an upstream 404 (missing version / non-HTML / unreadable doc) through as 404", async () => {
    stubKb(404, JSON.stringify({ detail: "not found" }), "application/json");
    const res = await versionRawGET(
      makeReq(sealSession(TOKEN)),
      ctx("123", "2"),
    );
    expect(res.status).toBe(404);
  });

  it("404s a bad id or version before any session read or upstream call", async () => {
    for (const [id, v] of [
      ["abc", "2"],
      ["123", "0"],
      ["123", "abc"],
      ["1e21", "2"],
    ]) {
      const res = await versionRawGET(makeReq(sealSession(TOKEN)), ctx(id, v));
      expect(res.status).toBe(404);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
