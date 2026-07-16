import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { POST as signupPOST } from "@/app/api/auth/signup/route";
import { openSession, SESSION_COOKIE, sealSession } from "@/lib/session";

// P12.S2 — the BFF route pipeline, driven against a STUBBED knowledge backend
// (global fetch is replaced, so no backend is needed here; the live round-trip is
// verified separately against a real knowledge-api). What these lock down: the
// ordered rejections, that a success seals a real openable token into a
// correctly-attributed cookie, and that knowledge's `detail` text never reaches the
// client.

const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";
const USER = { id: "u1", email: "owner@example.com", created_at: "2026-07-16T00:00:00+00:00" };
const TENANT = { id: "t1", name: "owner's workspace", created_at: "2026-07-16T00:00:00+00:00" };

beforeAll(() => {
  process.env.SESSION_SECRET = "p12s2-test-secret-not-a-real-one";
  process.env.KB_API_BASE_URL = "http://kb.test:8766";
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Stub knowledge's response. Must build a FRESH `Response` per call
 * (`mockImplementation`, not `mockResolvedValue`): a body can only be consumed
 * once, so a shared instance would make every call after the first throw.
 */
function stubKb(status: number, body: unknown) {
  vi.mocked(fetch).mockImplementation(() =>
    Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "content-type": "application/json" },
      }),
    ),
  );
}

/**
 * Build a request to a BFF auth route. Every test passes a DISTINCT `ip`: the rate
 * limiter is module-level and persists across tests, so shared keys would leak
 * state between cases.
 */
function makeReq(
  path: string,
  {
    body = JSON.stringify({ email: "owner@example.com", password: "correct-horse" }),
    headers = {},
    ip,
  }: { body?: string | null; headers?: Record<string, string>; ip: string },
) {
  return new Request(`http://localhost:3030${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": ip,
      ...headers,
    },
    body,
  });
}

const setCookieOf = (res: Response) => res.headers.get("set-cookie");
/** Pull the sealed value out of a Set-Cookie header. */
const cookieValue = (setCookie: string) =>
  setCookie.slice(setCookie.indexOf("=") + 1, setCookie.indexOf(";"));

describe("POST /api/auth/login — ordered rejections", () => {
  it("415s a non-JSON content-type before anything else", async () => {
    const res = await loginPOST(
      makeReq("/api/auth/login", { headers: { "content-type": "text/plain" }, ip: "10.0.0.1" }),
    );
    expect(res.status).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("403s a cross-site request (CSRF layer 2)", async () => {
    const res = await loginPOST(
      makeReq("/api/auth/login", { headers: { "sec-fetch-site": "cross-site" }, ip: "10.0.0.2" }),
    );
    expect(res.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("400s a malformed JSON body", async () => {
    const res = await loginPOST(makeReq("/api/auth/login", { body: "{not json", ip: "10.0.0.3" }));
    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("422s a well-formed body of the wrong shape", async () => {
    const res = await loginPOST(
      makeReq("/api/auth/login", { body: JSON.stringify({ email: "" }), ip: "10.0.0.4" }),
    );
    expect(res.status).toBe(422);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("429s past the 5-per-IP login throttle", async () => {
    stubKb(200, { token: TOKEN, user: USER, tenants: [TENANT] });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await loginPOST(makeReq("/api/auth/login", { ip: "10.0.0.5" }))).status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
  });
});

describe("POST /api/auth/login — knowledge outcomes", () => {
  it("seals the token into the cookie on success and returns 200", async () => {
    stubKb(200, { token: TOKEN, user: USER, tenants: [TENANT] });
    const res = await loginPOST(makeReq("/api/auth/login", { ip: "10.0.1.1" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    const setCookie = setCookieOf(res);
    expect(setCookie).toContain(`${SESSION_COOKIE}=v1.`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=strict");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=2592000");
    // Not production ⇒ no Secure (dev is plain http on 127.0.0.1).
    expect(setCookie).not.toContain("Secure");
    // The raw knowledge token is never in the cookie — only its sealed envelope,
    // which must open back to exactly that token.
    expect(setCookie).not.toContain(TOKEN);
    expect(openSession(cookieValue(setCookie!))).toBe(TOKEN);
  });

  it("calls knowledge with the right URL/method and no bearer, then 401s without leaking detail", async () => {
    stubKb(401, { detail: "invalid email or password" });
    const res = await loginPOST(makeReq("/api/auth/login", { ip: "10.0.1.2" }));

    expect(fetch).toHaveBeenCalledWith(
      "http://kb.test:8766/auth/login",
      expect.objectContaining({ method: "POST", cache: "no-store" }),
    );
    expect(res.status).toBe(401);
    expect(setCookieOf(res)).toBeNull();
    // knowledge's detail text must not cross the BFF boundary.
    await expect(res.json()).resolves.toEqual({ ok: false });
  });

  it("passes knowledge's 400 through but maps an unexpected upstream status to 502", async () => {
    stubKb(400, { detail: "password: must have at least 8 characters" });
    expect((await loginPOST(makeReq("/api/auth/login", { ip: "10.0.1.3" }))).status).toBe(400);

    stubKb(500, { detail: "boom" });
    const res = await loginPOST(makeReq("/api/auth/login", { ip: "10.0.1.4" }));
    expect(res.status).toBe(502);
    expect(setCookieOf(res)).toBeNull();
  });
});

describe("POST /api/auth/signup", () => {
  it("normalizes knowledge's 201 + singular `tenant` into a 200 with a sealed cookie", async () => {
    stubKb(201, { token: TOKEN, user: USER, tenant: TENANT });
    const res = await signupPOST(makeReq("/api/auth/signup", { ip: "10.0.2.1" }));

    expect(res.status).toBe(200);
    expect(openSession(cookieValue(setCookieOf(res)!))).toBe(TOKEN);
  });

  it("passes the duplicate-email 409 through with no cookie", async () => {
    stubKb(409, { detail: "a user with this email already exists" });
    const res = await signupPOST(makeReq("/api/auth/signup", { ip: "10.0.2.2" }));

    expect(res.status).toBe(409);
    expect(setCookieOf(res)).toBeNull();
    await expect(res.json()).resolves.toEqual({ ok: false });
  });

  it("keeps its own throttle bucket, independent of login's", async () => {
    stubKb(201, { token: TOKEN, user: USER, tenant: TENANT });
    const ip = "10.0.2.3";
    // Exhaust login's 5-per-window budget for this IP...
    for (let i = 0; i < 6; i += 1) await loginPOST(makeReq("/api/auth/login", { ip }));
    // ...signup from the same IP must still be allowed (separate bucket).
    expect((await signupPOST(makeReq("/api/auth/signup", { ip }))).status).toBe(200);
  });
});

describe("POST /api/auth/logout", () => {
  it("revokes at knowledge with the unsealed bearer, then clears the cookie", async () => {
    stubKb(204, undefined);
    const sealed = sealSession(TOKEN);
    const res = await logoutPOST(
      makeReq("/api/auth/logout", {
        body: null,
        headers: { cookie: `${SESSION_COOKIE}=${sealed}` },
        ip: "10.0.3.1",
      }),
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://kb.test:8766/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
    expect(res.status).toBe(200);
    expect(setCookieOf(res)).toContain("Max-Age=0");
  });

  it("still clears the cookie when knowledge is unreachable (never fails open)", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await logoutPOST(
      makeReq("/api/auth/logout", {
        body: null,
        headers: { cookie: `${SESSION_COOKIE}=${sealSession(TOKEN)}` },
        ip: "10.0.3.2",
      }),
    );
    expect(res.status).toBe(200);
    expect(setCookieOf(res)).toContain("Max-Age=0");
  });

  it("clears the cookie without calling knowledge when there is no valid session", async () => {
    const res = await logoutPOST(makeReq("/api/auth/logout", { body: null, ip: "10.0.3.3" }));
    expect(res.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
    expect(setCookieOf(res)).toContain("Max-Age=0");
  });

  it("403s a cross-site logout", async () => {
    const res = await logoutPOST(
      makeReq("/api/auth/logout", {
        body: null,
        headers: { "sec-fetch-site": "cross-site" },
        ip: "10.0.3.4",
      }),
    );
    expect(res.status).toBe(403);
  });
});
