import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getSession, requireSession } from "./session";
import { me } from "./knowledge/auth";
import { ApiError } from "./knowledge/client";
import type { KbIdentity } from "./knowledge/types";

// P12.S2 — the composed page guards, one layer above `session.ts` (cookie/crypto)
// and `knowledge/auth.ts` (the API calls). `session.ts` deliberately knows nothing
// about knowledge and vice-versa; this module is where the two meet.

const DASHBOARD_PATH = "/dashboard";
const LOGIN_PATH = "/login";

export interface AuthenticatedContext {
  /** The knowledge bearer token, unsealed from the cookie — for server-to-server calls. */
  token: string;
  identity: KbIdentity;
}

/**
 * The `(app)` route-group guard: require a sealed session, then confirm it is still
 * LIVE at knowledge (`GET /auth/me`) and return the caller's identity + token.
 *
 * Two distinct failures, two distinct handlings:
 *   - no/invalid/expired cookie → `requireSession()` redirects to /login;
 *   - a cookie whose knowledge token is dead (revoked/expired server-side) →
 *     knowledge answers 401 and we redirect to /login. We cannot CLEAR the cookie
 *     here (Next only allows cookie writes from route handlers / server actions), so
 *     the stale cookie survives — which is exactly why `redirectIfAuthenticated`
 *     below re-verifies rather than trusting the cookie alone. A successful login
 *     overwrites it; `POST /api/auth/logout` clears it.
 * Any OTHER error (knowledge down, transport failure) is rethrown rather than
 * silently logging the user out — an outage should surface, not masquerade as a
 * session expiry.
 *
 * `cache()` dedupes this per request, so a layout + its page both calling it cost
 * ONE `/auth/me` round-trip.
 */
export const requireIdentity = cache(
  async (): Promise<AuthenticatedContext> => {
    const token = await requireSession();
    try {
      return { token, identity: await me(token) };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        redirect(LOGIN_PATH);
      }
      throw error;
    }
  },
);

/**
 * The `(public)` optional-identity guard — the anonymous-capable sibling of
 * `requireIdentity`, added for P19's public doc/graph surfaces. It NEVER redirects
 * and NEVER throws for the unauthenticated case: it returns the caller's context
 * when a live session resolves, or `null` when the visitor is anonymous.
 *
 * Two "anonymous" paths both yield `null` (mirroring knowledge's server-side
 * `optional_user`, which returns `None` on every miss rather than raising):
 *   - no/invalid/expired cookie → `getSession()` is null → `null`;
 *   - a crypto-valid cookie whose knowledge token is dead (revoked/expired
 *     server-side) → knowledge answers 401 → we treat it as anonymous (`null`),
 *     so a stale cookie simply degrades to the public view rather than erroring.
 * Any OTHER error (knowledge down, transport failure) is rethrown — an outage must
 * surface, never masquerade as "anonymous".
 *
 * The caller decides what a `null` means for its surface: the public doc page
 * renders the anonymous view; a private/nonexistent read then 404s server-side
 * (404-never-403), which the page turns into `/login` (docs) or `notFound()` (graph).
 *
 * `cache()` dedupes per request, exactly like `requireIdentity`.
 */
export const optionalIdentity = cache(
  async (): Promise<AuthenticatedContext | null> => {
    const token = await getSession();
    if (!token) return null;
    try {
      return { token, identity: await me(token) };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      throw error;
    }
  },
);

/**
 * The `(auth)` page bounce: send an already-signed-in visitor to the dashboard.
 *
 * It VERIFIES the token against knowledge before bouncing, on purpose. Checking
 * only the cookie would ping-pong forever in the revoked-token case: /login sees a
 * crypto-valid cookie → /dashboard → the guard's `/auth/me` 401s → back to /login
 * → … Verifying breaks that loop — a dead cookie simply renders the login form, and
 * signing in overwrites it.
 */
export async function redirectIfAuthenticated(): Promise<void> {
  const token = await getSession();
  if (!token) return;
  const identity = await me(token).catch(() => null);
  if (identity) redirect(DASHBOARD_PATH);
}
