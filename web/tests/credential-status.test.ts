import { describe, expect, it } from "vitest";

import { credentialStatus } from "@/lib/knowledge/credential-status";

// P12.S4 — the one bit of real logic on the project page: deriving a credential's
// three-state status. Locks the precedence (revoked wins over used) and each edge.

describe("credentialStatus", () => {
  it("is revoked when revoked_at is set — even if the key was also used", () => {
    expect(
      credentialStatus({
        revoked_at: "2026-02-01T00:00:00+00:00",
        last_used_at: "2026-01-15T00:00:00+00:00",
      }),
    ).toBe("revoked");
    expect(
      credentialStatus({
        revoked_at: "2026-02-01T00:00:00+00:00",
        last_used_at: null,
      }),
    ).toBe("revoked");
  });

  it("is active when never revoked but used at least once", () => {
    expect(
      credentialStatus({
        revoked_at: null,
        last_used_at: "2026-01-15T00:00:00+00:00",
      }),
    ).toBe("active");
  });

  it("is idle when never revoked and never used", () => {
    expect(credentialStatus({ revoked_at: null, last_used_at: null })).toBe(
      "idle",
    );
  });
});
