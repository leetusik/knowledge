import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cookies } from "next/headers";

import { GET as orgGET, POST as orgPOST } from "@/app/api/auth/org/route";
import { getJson, sendJson } from "@/lib/knowledge/client";
import { ORG_COOKIE, SESSION_COOKIE, sealSession } from "@/lib/session";

// Multi-org sessions on the web: the active-org cookie, the one place the API header
// is added, and the switch/reset route. `next/headers` is mocked so the client can
// read a cookie outside a real request; the route reads its own request.

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));

const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";
const ORG_A = "9a8b7c6d-1111-4e5f-9a0b-2c3d4e5f6a7b";
const ORG_B = "2b3c4d5e-2222-4f60-8a1b-3c4d5e6f7a8b";
const USER = { id: "u1", email: "a@b.co", created_at: "2026-01-01T00:00:00+00:00" };
const tenant = (id: string, name: string) => ({
  id,
  name,
  slug: null,
  plan: "free",
  created_at: "2026-01-01T00:00:00+00:00",
});

beforeAll(() => {
  process.env.SESSION_SECRET = "p56-s3-test-secret-not-a-real-one";
  process.env.KB_API_BASE_URL = "http://kb.test:8766";
});
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Point the mocked cookie store at an org cookie value (or none). */
function withOrgCookie(value: string | undefined) {
  const store = {
    get: (name: string) =>
      name === ORG_COOKIE && value !== undefined ? { value } : undefined,
  };
  vi.mocked(cookies).mockResolvedValue(
    store as unknown as Awaited<ReturnType<typeof cookies>>,
  );
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** The headers of the n-th stubbed fetch call. */
function sentHeaders(n = 0): Record<string, string> {
  const init = vi.mocked(fetch).mock.calls[n]?.[1] as RequestInit;
  return init.headers as Record<string, string>;
}

describe("the client names the active org", () => {
  it("sends X-Hi2vi-Org with a token when the cookie holds an org", async () => {
    withOrgCookie(ORG_B);
    vi.mocked(fetch).mockResolvedValue(json(200, {}));
    await getJson("/app/dashboard", { token: TOKEN });
    expect(sentHeaders()["X-Hi2vi-Org"]).toBe(ORG_B);
    expect(sentHeaders().Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("never sends it without a token", async () => {
    withOrgCookie(ORG_B);
    vi.mocked(fetch).mockImplementation(async () => json(200, {}));
    await sendJson("/auth/login", "POST", { email: "a@b.co", password: "x" });
    expect(sentHeaders()["X-Hi2vi-Org"]).toBeUndefined();
    await sendJson("/auth/login", "POST", {}, { org: ORG_A });
    expect(sentHeaders(1)["X-Hi2vi-Org"]).toBeUndefined();
  });

  it("sends nothing for a missing or malformed cookie", async () => {
    vi.mocked(fetch).mockImplementation(async () => json(200, {}));
    withOrgCookie(undefined);
    await getJson("/app/dashboard", { token: TOKEN });
    withOrgCookie("not-a-uuid");
    await getJson("/app/dashboard", { token: TOKEN });
    expect(sentHeaders(0)["X-Hi2vi-Org"]).toBeUndefined();
    expect(sentHeaders(1)["X-Hi2vi-Org"]).toBeUndefined();
  });

  it("lets the explicit override win, null included", async () => {
    withOrgCookie(ORG_B);
    vi.mocked(fetch).mockImplementation(async () => json(200, {}));
    await getJson("/auth/me", { token: TOKEN, org: ORG_A });
    await getJson("/auth/me", { token: TOKEN, org: null });
    expect(sentHeaders(0)["X-Hi2vi-Org"]).toBe(ORG_A);
    expect(sentHeaders(1)["X-Hi2vi-Org"]).toBeUndefined();
  });
});

function switchReq(
  org: string,
  { headers = {}, session = true }: { headers?: Record<string, string>; session?: boolean } = {},
) {
  return new Request("http://localhost:3030/api/auth/org", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "sec-fetch-site": "same-origin",
      ...(session ? { cookie: `${SESSION_COOKIE}=${sealSession(TOKEN)}` } : {}),
      ...headers,
    },
    body: new URLSearchParams({ org }).toString(),
  });
}

const orgSetCookie = (res: Response) =>
  (res.headers.get("set-cookie") ?? "")
    .split(/,(?=\s*\w+=)/)
    .find((c) => c.trim().startsWith(`${ORG_COOKIE}=`));

describe("POST /api/auth/org — the switch", () => {
  beforeEach(() => withOrgCookie(undefined));

  it("403s a cross-site post and sets nothing", async () => {
    const res = await orgPOST(
      switchReq(ORG_B, {
        headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      }),
    );
    expect(res.status).toBe(403);
    expect(orgSetCookie(res)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sets nothing for an org the API says the user is not in (403)", async () => {
    vi.mocked(fetch).mockResolvedValue(json(403, { detail: "not a member of that org" }));
    const res = await orgPOST(switchReq(ORG_B));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/dashboard");
    expect(orgSetCookie(res)).toBeUndefined();
  });

  it("confirms membership with that org named, then sets the cookie and lands on /dashboard", async () => {
    vi.mocked(fetch).mockResolvedValue(
      json(200, {
        user: USER,
        tenants: [tenant(ORG_A, "A"), tenant(ORG_B, "B")],
        active_tenant_id: ORG_B,
      }),
    );
    const res = await orgPOST(switchReq(ORG_B));
    expect(sentHeaders()["X-Hi2vi-Org"]).toBe(ORG_B);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/dashboard");
    const cookie = orgSetCookie(res);
    expect(cookie).toContain(`${ORG_COOKIE}=${ORG_B}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=strict");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses a malformed org without asking the API", async () => {
    const res = await orgPOST(switchReq("../../etc"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/dashboard");
    expect(orgSetCookie(res)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends a visitor with no session to /login", async () => {
    const res = await orgPOST(switchReq(ORG_B, { session: false }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/login");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/org — the reset", () => {
  it("clears the cookie and returns to a safe next", async () => {
    const res = await orgGET(
      new Request("http://localhost:3030/api/auth/org?next=%2Fprojects%2Fabc%3Fx%3D1"),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/projects/abc?x=1");
    expect(orgSetCookie(res)).toContain("Max-Age=0");
  });

  it("never redirects off-site", async () => {
    for (const next of ["//evil.example", "https://evil.example", "/%2F%2Fevil.example", "/\\evil"]) {
      const res = await orgGET(
        new Request(`http://localhost:3030/api/auth/org?next=${encodeURIComponent(next)}`),
      );
      expect(res.headers.get("location")).toBe("/library");
    }
  });
});
