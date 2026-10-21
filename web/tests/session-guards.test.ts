import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cookies, headers } from "next/headers";

import {
  optionalIdentity,
  redirectIfAuthenticated,
  requireIdentity,
} from "@/lib/auth-guards";
import { REQUEST_PATH_HEADER } from "@/lib/next-path";
import { getSession, requireSession, SESSION_COOKIE, sealSession } from "@/lib/session";

// P12.S2 — the server guards. `next/headers` and `next/navigation` are mocked
// because both need a real request scope; the logic under test is "what does the
// guard do with a given cookie", which is exactly what matters at the auth
// boundary. Kept in its own file so the `next/*` mocks don't leak into the route
// tests, which need the real modules.

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";

beforeAll(() => {
  process.env.SESSION_SECRET = "p12s2-test-secret-not-a-real-one";
});

/** Point the mocked cookie store at `value` (or nothing at all). */
function withCookie(value: string | undefined) {
  const store = {
    get: (name: string) =>
      name === SESSION_COOKIE && value !== undefined ? { value } : undefined,
  };
  vi.mocked(cookies).mockResolvedValue(
    store as unknown as Awaited<ReturnType<typeof cookies>>,
  );
}

/** Point the mocked request headers at a proxy-stamped path (or none). */
function withRequestPath(path: string | undefined) {
  const h = new Headers();
  if (path !== undefined) h.set(REQUEST_PATH_HEADER, path);
  vi.mocked(headers).mockResolvedValue(
    h as unknown as Awaited<ReturnType<typeof headers>>,
  );
}

beforeEach(() => {
  vi.mocked(cookies).mockReset();
  withRequestPath(undefined);
});

describe("getSession", () => {
  it("returns the unsealed knowledge token for a valid cookie", async () => {
    withCookie(sealSession(TOKEN));
    await expect(getSession()).resolves.toBe(TOKEN);
  });

  it("returns null when the cookie is absent or tampered", async () => {
    withCookie(undefined);
    await expect(getSession()).resolves.toBeNull();

    withCookie(`${sealSession(TOKEN)}tampered`);
    await expect(getSession()).resolves.toBeNull();
  });
});

describe("requireSession", () => {
  it("returns the token — the bearer the (app) tree injects into knowledge calls", async () => {
    withCookie(sealSession(TOKEN));
    await expect(requireSession()).resolves.toBe(TOKEN);
  });

  it("redirects to /login when there is no valid session", async () => {
    withCookie(undefined);
    await expect(requireSession()).rejects.toThrow(/^REDIRECT:\/login$/);
  });

  // P30.S11 (D32) — the bounce carries the refused page as `?next=`.
  it("carries the refused page (path + query) as ?next=", async () => {
    withCookie(undefined);
    withRequestPath("/documents?tag=rust");
    await expect(requireSession()).rejects.toThrow(
      /^REDIRECT:\/login\?next=%2Fdocuments%3Ftag%3Drust$/,
    );
  });

  it("drops a crafted request path instead of carrying it", async () => {
    withCookie(undefined);
    for (const crafted of ["//evil.example", "/%2F%2Fevil.example", "https://evil.example"]) {
      withRequestPath(crafted);
      await expect(requireSession()).rejects.toThrow(/^REDIRECT:\/login$/);
    }
  });
});

// P19 — the optional-identity guard behind the public doc/graph pages. It reads the
// cookie like `getSession` but confirms liveness at knowledge (`/auth/me`, stubbed
// fetch here) and NEVER redirects: a live session yields the member context, every
// anonymous/dead-cookie path yields `null`. `cache()` is a passthrough outside a
// request scope, so each call re-runs against the freshly-mocked cookie.
describe("optionalIdentity", () => {
  const ME = {
    user: { id: "u1", email: "a@b.co", created_at: "2026-01-01T00:00:00+00:00" },
    tenants: [{ id: "t1", name: "Org", created_at: "2026-01-01T00:00:00+00:00" }],
  };

  beforeAll(() => {
    process.env.KB_API_BASE_URL = "http://kb.test:8766";
  });
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null for an anonymous visitor (no cookie) — knowledge never called", async () => {
    withCookie(undefined);
    await expect(optionalIdentity()).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("degrades a dead cookie (knowledge 401) to anonymous null, not an error", async () => {
    withCookie(sealSession(TOKEN));
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(optionalIdentity()).resolves.toBeNull();
  });

  it("returns the member context (token + identity) for a live session", async () => {
    withCookie(sealSession(TOKEN));
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(ME), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const ctx = await optionalIdentity();
    expect(ctx?.token).toBe(TOKEN);
    expect(ctx?.identity.user.email).toBe("a@b.co");
    expect(ctx?.identity.tenant?.id).toBe("t1");
  });
});

// P30.S11 (D32, D18) — every sign-in path honours a safe return address and
// ignores an unsafe one: the dead-token bounce carries `next`, and the gate's
// already-signed-in bounce lands on it.
describe("return address through the member guard and the gate", () => {
  const ME = {
    user: { id: "u1", email: "a@b.co", created_at: "2026-01-01T00:00:00+00:00" },
    tenants: [{ id: "t1", name: "Org", slug: null, created_at: "2026-01-01T00:00:00+00:00" }],
  };
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  beforeAll(() => {
    process.env.KB_API_BASE_URL = "http://kb.test:8766";
  });
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requireIdentity's dead-token 401 carries ?next= too", async () => {
    withCookie(sealSession(TOKEN));
    withRequestPath("/projects/abc");
    vi.mocked(fetch).mockResolvedValue(json(401, { detail: "unauthorized" }));
    await expect(requireIdentity()).rejects.toThrow(
      /^REDIRECT:\/login\?next=%2Fprojects%2Fabc$/,
    );
  });

  it("the gate sends a signed-in visitor to a safe next, hash and all", async () => {
    withCookie(sealSession(TOKEN));
    vi.mocked(fetch).mockImplementation(async () => json(200, ME));
    await expect(
      redirectIfAuthenticated("/@acme/handbook/books/b/k?lang=ko#s-2"),
    ).rejects.toThrow(/^REDIRECT:\/@acme\/handbook\/books\/b\/k\?lang=ko#s-2$/);
  });

  it("the gate ignores an unsafe next and lands on the default", async () => {
    withCookie(sealSession(TOKEN));
    vi.mocked(fetch).mockImplementation(async () => json(200, ME));
    for (const unsafe of ["//evil.example", "/\\evil", "javascript:alert(1)"]) {
      await expect(redirectIfAuthenticated(unsafe)).rejects.toThrow(
        /^REDIRECT:\/library$/,
      );
    }
  });
});
