// P12.S2 — shared shapes for knowledge's `/auth/*` JSON (server-side). Pure types,
// no runtime values. S3–S6 extend this seam with the `/app/*` shapes (projects,
// credentials, usage, documents, graph) as they add those calls — this file holds
// the S2 subset only (identity + session).
//
// These mirror knowledge's serializers verbatim (`server/auth_api.py`
// `serialize_user` / `serialize_tenant`): ids are STRINGS (UUIDs stringified) and
// timestamps are ISO-8601 strings, never Date objects.

/** `serialize_user` — never carries `password_hash`. */
export interface KbUser {
  id: string;
  email: string;
  created_at: string;
}

/** `serialize_tenant`. */
export interface KbTenant {
  id: string;
  name: string;
  created_at: string;
}

/**
 * The normalized result of signup/login: the raw knowledge bearer token (which the
 * BFF immediately seals into the cookie and never returns to the browser) plus the
 * caller's identity and their ACTIVE tenant.
 *
 * `tenant` is normalized across knowledge's signup/login asymmetry — signup answers
 * `tenant` (singular), login answers `tenants[]` — matching knowledge's own
 * `require_user`, which treats `tenants[0]` as the active tenant. It is `null` only
 * in the pathological zero-tenant case (signup always provisions one).
 */
export interface KbSession {
  token: string;
  user: KbUser;
  tenant: KbTenant | null;
}

/** `GET /auth/me` — identity without a token, tenant normalized as above. */
export interface KbIdentity {
  user: KbUser;
  tenant: KbTenant | null;
  /** Every tenant the user belongs to, in knowledge's order (`tenants[0]` = active). */
  tenants: KbTenant[];
}
