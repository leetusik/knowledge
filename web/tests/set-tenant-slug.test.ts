import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { setTenantSlug } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";

// P25.S5 — the client seam for the org-slug claim, driven against a STUBBED knowledge
// backend (the `resolve-document` suite's idiom). What matters is exactly what leaves
// the BFF — `PATCH /app/tenant` with `{slug}` and the caller's bearer, no id in the
// path (the route is implicitly scoped to the caller's own tenant) — and that a 409
// surfaces as an `ApiError` carrying the status, since the action branches on 409
// ("already taken") separately from every other failure.

const TOKEN = "0GkQ3vJ8bYd1wZs5RfN7tXcA2eLmPqU9hVjK4oIyB6M";

beforeAll(() => {
  process.env.KB_API_BASE_URL = "http://kb.test:8766";
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Stub one knowledge JSON response. */
function stubKb(body: unknown, status = 200) {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("setTenantSlug", () => {
  it("PATCHes /app/tenant with {slug} + the bearer and unwraps {tenant}", async () => {
    stubKb({
      tenant: {
        id: "t1",
        name: "Org",
        slug: "hi2vi",
        created_at: "2026-01-01T00:00:00+00:00",
      },
    });

    await expect(setTenantSlug(TOKEN, "hi2vi")).resolves.toMatchObject({
      slug: "hi2vi",
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://kb.test:8766/app/tenant",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ slug: "hi2vi" }),
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      }),
    );
  });

  it("throws ApiError(409) when another org already holds the slug", async () => {
    stubKb({ detail: "that org slug is already taken" }, 409);

    // `tenants.slug` is GLOBALLY unique, so this is the likeliest real failure — the
    // action maps it to its own "already taken" copy rather than the generic retry.
    await expect(setTenantSlug(TOKEN, "hi2vi")).rejects.toBeInstanceOf(
      ApiError,
    );
    await expect(setTenantSlug(TOKEN, "hi2vi")).rejects.toMatchObject({
      status: 409,
    });
  });
});
