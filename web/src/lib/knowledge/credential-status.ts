import type { KbCredential } from "./types";

// P12.S4 — the one bit of real logic on the project page: deriving a credential's
// three-state status from its timestamps. knowledge's `serialize_credential` has no
// `status` field (revoked keys stay listed with a `revoked_at` stamp), and the
// Knowledge Base design ships a THREE-state status vocabulary
// (`.kb-status--active/idle/revoked`), so the state is derived here rather than read.
//
// Kept as a tiny pure module (no `server-only`, no React) so the page's server
// component and the unit test can both import it.

/** The Knowledge Base console's credential state, matching the `Badge` `status` prop. */
export type CredentialStatus = "active" | "idle" | "revoked";

/**
 * Derive a credential's status, in precedence order:
 *   - `revoked_at` set   → **revoked** (a soft-revoked key stays listed; this wins
 *                          even if it was also used, so a revoked-but-once-used key
 *                          reads Revoked, not Active);
 *   - else `last_used_at` set → **active** (ever used to ingest);
 *   - else                    → **idle** (minted but never used).
 */
export function credentialStatus(
  credential: Pick<KbCredential, "revoked_at" | "last_used_at">,
): CredentialStatus {
  if (credential.revoked_at !== null) return "revoked";
  if (credential.last_used_at !== null) return "active";
  return "idle";
}
