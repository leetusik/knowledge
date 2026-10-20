import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { GET as assetGET } from "@/app/api/documents/[id]/assets/[file]/route";
import { SESSION_COOKIE, sealSession } from "@/lib/session";

// P30.S4 — the chapter-image relay against a STUBBED knowledge backend: the pinned
// headers (never upstream's), the optional-identity relay, and the 404 mappings.

const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";
const FILE = `${"ab".repeat(32)}.png`;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeAll(() => {
  process.env.SESSION_SECRET = "p30s4-test-secret-not-a-real-one";
  process.env.KB_API_BASE_URL = "http://kb.test:8766";
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

function stubKb(status: number, headers: Record<string, string>) {
  vi.mocked(fetch).mockImplementation(() =>
    Promise.resolve(
      new Response(status === 200 ? PNG : '{"detail":"no such asset"}', {
        status,
        headers,
      }),
    ),
  );
}

function makeReq(sealed?: string): Request {
  return new Request(`http://localhost:3030/api/documents/7/assets/${FILE}`, {
    headers: sealed ? { cookie: `${SESSION_COOKIE}=${sealed}` } : {},
  });
}

const ctx = (id: string, file: string) => ({
  params: Promise.resolve({ id, file }),
});

describe("GET /api/documents/[id]/assets/[file] — the image relay", () => {
  it("relays the bytes with the pinned headers, never upstream's", async () => {
    stubKb(200, {
      "content-type": "text/html",
      "cache-control": "public, max-age=300",
    });
    const res = await assetGET(makeReq(sealSession(TOKEN)), ctx("7", FILE));

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      `http://kb.test:8766/app/documents/7/assets/${FILE}`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toBe(
      "default-src 'none'; sandbox",
    );
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
  });

  it("relays tokenless without a session, and keeps a private scope private", async () => {
    stubKb(200, { "cache-control": "private, max-age=300" });
    const res = await assetGET(makeReq(), ctx("7", FILE));

    expect(res.status).toBe(200);
    const headers = (vi.mocked(fetch).mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
    expect(res.headers.get("cache-control")).toBe("private, max-age=300");
  });

  it("maps an upstream 404 to 404, and 404s bad segments before any call", async () => {
    stubKb(404, { "content-type": "application/json" });
    expect((await assetGET(makeReq(), ctx("7", FILE))).status).toBe(404);
    vi.mocked(fetch).mockClear();

    for (const [id, file] of [
      ["abc", FILE],
      ["0", FILE],
      ["7", "../secret.png"],
      ["7", `${"AB".repeat(32)}.png`],
      ["7", `${"ab".repeat(32)}.svg`],
    ]) {
      expect((await assetGET(makeReq(), ctx(id, file))).status).toBe(404);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
