import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as rawGET } from "@/app/api/documents/[id]/raw/route";
import { SESSION_COOKIE, sealSession } from "@/lib/session";

// P16.S2 / P19 — the BFF raw-HTML relay route, driven against a STUBBED knowledge
// backend (global fetch is replaced, like the auth-routes suite). What these lock
// down: the five pinned sandbox headers re-asserted explicitly on a 200, the raw body
// streamed straight through, the id / upstream-404 mappings, and P19's
// OPTIONAL-IDENTITY relay — a valid cookie forwards the bearer (member read), while
// NO cookie relays TOKENLESS so an anonymous visitor's iframe on a PUBLIC doc loads
// (a private/nonexistent doc is an indistinguishable upstream 404 either way).

const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";
const HTML =
  "<!DOCTYPE html><html><body><h1>Quiz</h1><script>1</script></body></html>";

beforeAll(() => {
  process.env.SESSION_SECRET = "p16s2-test-secret-not-a-real-one";
  process.env.KB_API_BASE_URL = "http://kb.test:8766";
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Stub knowledge's raw-route response (fresh per call — a body is single-use). */
function stubKb(status: number, body: string | null, contentType: string) {
  vi.mocked(fetch).mockImplementation(() =>
    Promise.resolve(new Response(body, { status, headers: { "content-type": contentType } })),
  );
}

/** A GET Request to the relay, optionally carrying a sealed session cookie. */
function makeReq(sealed?: string): Request {
  return new Request("http://localhost:3030/api/documents/123/raw", {
    method: "GET",
    headers: sealed ? { cookie: `${SESSION_COOKIE}=${sealed}` } : {},
  });
}

/** The route-handler context: Next 16 hands `params` as a Promise. */
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("GET /api/documents/[id]/raw — the sandboxed-iframe HTML relay", () => {
  it("relays the raw HTML with the five pinned sandbox headers on a valid session + upstream 200", async () => {
    stubKb(200, HTML, "text/html; charset=utf-8");
    const res = await rawGET(makeReq(sealSession(TOKEN)), ctx("123"));

    expect(res.status).toBe(200);
    // Calls knowledge's raw route with the unsealed bearer, no Accept negotiation.
    expect(fetch).toHaveBeenCalledWith(
      "http://kb.test:8766/app/documents/123/raw",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
    // The raw HTML streams straight through, script intact.
    await expect(res.text()).resolves.toBe(HTML);
    // The pinned sandbox headers, set explicitly (opaque-origin containment).
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("content-security-policy")).toBe(
      "sandbox allow-scripts; frame-ancestors 'self'",
    );
    expect(res.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("relays anonymously with NO Authorization header when the cookie is absent (public doc)", async () => {
    stubKb(200, HTML, "text/html; charset=utf-8");
    const res = await rawGET(makeReq(), ctx("123"));

    expect(res.status).toBe(200);
    // knowledge is called TOKENLESS — no Authorization header is smuggled upstream.
    expect(fetch).toHaveBeenCalledWith(
      "http://kb.test:8766/app/documents/123/raw",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
    const headers = (vi.mocked(fetch).mock.calls[0][1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
    await expect(res.text()).resolves.toBe(HTML);
  });

  it("passes an upstream 404 (missing / cross-tenant / private / non-HTML doc) through as 404 — member OR anonymous", async () => {
    stubKb(404, JSON.stringify({ detail: "not found" }), "application/json");
    const withCookie = await rawGET(makeReq(sealSession(TOKEN)), ctx("123"));
    expect(withCookie.status).toBe(404);

    stubKb(404, JSON.stringify({ detail: "not found" }), "application/json");
    const anonymous = await rawGET(makeReq(), ctx("123"));
    expect(anonymous.status).toBe(404);
  });

  it("404s a non-integer or non-positive id before any session read or upstream call", async () => {
    for (const bad of ["abc", "0"]) {
      const res = await rawGET(makeReq(sealSession(TOKEN)), ctx(bad));
      expect(res.status).toBe(404);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});
