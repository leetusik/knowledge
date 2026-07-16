import "server-only";

import { getJson, sendJson } from "./client";
import type { KbIdentity, KbSession, KbTenant, KbUser } from "./types";

// P12.S2 — typed server-side calls against knowledge's `/auth/*` surface, used only
// by the BFF route handlers and the `(app)`/`(auth)` server components.
//
// The one real adaptation is normalizing knowledge's signup/login TENANT ASYMMETRY:
//   POST /auth/signup → 201 { token, user, tenant  }   ← singular
//   POST /auth/login  → 200 { token, user, tenants[] } ← array
//   GET  /auth/me     → 200 { user, tenants[] }
// Callers get one shape (`{ token, user, tenant }`), with `tenants[0]` as the
// active tenant — matching knowledge's own `require_user`. Callers key off STATUS
// CODES (401/409/400), never knowledge's `detail` text.

/** The raw signup/login envelope before normalization (either tenant shape). */
interface RawAuthResponse {
  token: string;
  user: KbUser;
  /** Signup answers this. */
  tenant?: KbTenant;
  /** Login answers this. */
  tenants?: KbTenant[];
}

/** The raw `/auth/me` envelope. */
interface RawMeResponse {
  user: KbUser;
  tenants?: KbTenant[];
}

/**
 * Collapse knowledge's `tenant` (signup) / `tenants[]` (login) asymmetry to a
 * single active tenant. Exported for the S2 mapping test; prefers the singular
 * field and falls back to `tenants[0]`, yielding `null` when neither is present.
 */
export function activeTenant(raw: {
  tenant?: KbTenant;
  tenants?: KbTenant[];
}): KbTenant | null {
  return raw.tenant ?? raw.tenants?.[0] ?? null;
}

/**
 * Normalize a raw signup OR login response into the single `KbSession` shape.
 * Exported for the S2 mapping test — the whole point is that both knowledge shapes
 * produce an identical result.
 */
export function normalizeAuthResponse(raw: RawAuthResponse): KbSession {
  return { token: raw.token, user: raw.user, tenant: activeTenant(raw) };
}

/**
 * `POST /auth/signup` → 201 `{token, user, tenant}`. Throws `ApiError` on 409
 * (duplicate email) / 400 (validation) — the route maps the STATUS to the client
 * without echoing knowledge's detail text.
 */
export async function signup(
  email: string,
  password: string,
): Promise<KbSession> {
  const raw = await sendJson<RawAuthResponse>("/auth/signup", "POST", {
    email,
    password,
  });
  return normalizeAuthResponse(raw);
}

/**
 * `POST /auth/login` → 200 `{token, user, tenants[]}`. Throws `ApiError` on 401
 * (identical for unknown-email and bad-password — knowledge does not let callers
 * enumerate accounts, and neither does the BFF) / 400 (validation).
 */
export async function login(
  email: string,
  password: string,
): Promise<KbSession> {
  const raw = await sendJson<RawAuthResponse>("/auth/login", "POST", {
    email,
    password,
  });
  return normalizeAuthResponse(raw);
}

/**
 * `POST /auth/logout` (bearer) → 204 always; idempotent and never 401. Revokes the
 * token server-side. FIRE-AND-FORGET: any transport error is swallowed, because the
 * BFF clears the sealed cookie regardless — the browser's session must end even if
 * knowledge is unreachable.
 */
export async function logout(token: string): Promise<void> {
  try {
    await sendJson<void>("/auth/logout", "POST", undefined, { token });
  } catch {
    // best-effort — the cookie clear is the real end of the browser session
  }
}

/**
 * `GET /auth/me` (bearer) → 200 `{user, tenants[]}`; 401 (missing/unknown/expired,
 * indistinguishable) throws `ApiError(401)`, which the `(app)` layout turns into a
 * redirect to /login.
 */
export async function me(
  token: string,
  signal?: AbortSignal,
): Promise<KbIdentity> {
  const raw = await getJson<RawMeResponse>("/auth/me", { token, signal });
  return {
    user: raw.user,
    tenant: activeTenant(raw),
    tenants: raw.tenants ?? [],
  };
}
