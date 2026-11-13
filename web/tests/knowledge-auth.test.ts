import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { activeTenant, me, normalizeAuthResponse } from "@/lib/knowledge/auth";
import type { KbTenant, KbUser } from "@/lib/knowledge/types";

// P12.S2 — knowledge's signup/login TENANT ASYMMETRY is the one shape mismatch the
// BFF has to absorb: signup answers `tenant` (singular), login answers `tenants[]`.
// Both must collapse to one `{token, user, tenant}` so nothing downstream branches
// on which call produced the session.

const USER: KbUser = {
  id: "6f1d2c3b-0000-4a5b-8c9d-1e2f3a4b5c6d",
  email: "owner@example.com",
  created_at: "2026-07-16T00:00:00+00:00",
};
const TENANT: KbTenant = {
  id: "9a8b7c6d-1111-4e5f-9a0b-2c3d4e5f6a7b",
  name: "owner's workspace",
  // P25 — the org slug rides on every tenant payload; `null` is the pre-claim state
  // (nullable, no backfill), which is what a fresh signup answers.
  slug: null,
  plan: "free",
  created_at: "2026-07-16T00:00:00+00:00",
};
const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";

describe("normalizeAuthResponse", () => {
  it("maps signup's `tenant` and login's `tenants[]` to an identical session", () => {
    const fromSignup = normalizeAuthResponse({
      token: TOKEN,
      user: USER,
      tenant: TENANT,
    });
    const fromLogin = normalizeAuthResponse({
      token: TOKEN,
      user: USER,
      tenants: [TENANT],
    });

    expect(fromSignup).toEqual({ token: TOKEN, user: USER, tenant: TENANT });
    expect(fromLogin).toEqual(fromSignup);
  });

  it("treats tenants[0] as the active tenant (matching knowledge's require_user)", () => {
    const second: KbTenant = { ...TENANT, id: "second", name: "second" };
    expect(
      normalizeAuthResponse({ token: TOKEN, user: USER, tenants: [TENANT, second] })
        .tenant,
    ).toEqual(TENANT);
  });
});

// Multi-org sessions: `/auth/me` names the tenant this request acts in.
describe("me", () => {
  const second: KbTenant = {
    ...TENANT,
    id: "2b3c4d5e-2222-4f60-8a1b-3c4d5e6f7a8b",
    name: "second org",
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
  const answer = (body: unknown) =>
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

  it("picks the tenant named by active_tenant_id", async () => {
    answer({ user: USER, tenants: [TENANT, second], active_tenant_id: second.id });
    const identity = await me(TOKEN);
    expect(identity.tenant).toEqual(second);
    expect(identity.tenants).toEqual([TENANT, second]);
  });

  it("falls back to tenants[0] when the field is absent (an older API)", async () => {
    answer({ user: USER, tenants: [TENANT, second] });
    expect((await me(TOKEN)).tenant).toEqual(TENANT);
  });
});

describe("activeTenant", () => {
  it("yields null rather than throwing when the user has no tenant", () => {
    expect(activeTenant({})).toBeNull();
    expect(activeTenant({ tenants: [] })).toBeNull();
  });
});
