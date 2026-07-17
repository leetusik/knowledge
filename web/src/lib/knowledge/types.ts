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

// ── /app/* shapes (P12.S3) ────────────────────────────────────────────────
// Mirror knowledge's `/app/*` serializers verbatim: ids are stringified UUIDs and
// timestamps are ISO-8601 strings. The dashboard page codes against these.

/** `serialize_project` (`server/app_api.py`) — a tenant's project. */
export interface KbProject {
  id: string;
  name: string;
  tenant_id: string;
  created_at: string;
}

/**
 * The echoed usage window `[start, end)`. NOTE: knowledge uses `start`/`end` (not
 * vocky's `*_ingested_at`) — `server/usage_api.py::serialize_usage_metrics`.
 */
export interface KbUsageWindow {
  start: string;
  end: string;
}

/** Window-wide usage totals (summed from the daily buckets). */
export interface KbUsageTotals {
  total: number;
  documents_created: number;
  documents_deleted: number;
  searches: number;
}

/** One UTC calendar day's zero-filled usage counts. */
export interface KbDailyCount {
  /** `YYYY-MM-DD`. */
  day: string;
  total: number;
  documents_created: number;
  documents_deleted: number;
  searches: number;
}

/**
 * `GET /app/usage` — the whole-tenant usage aggregate: window + totals + the
 * contiguous zero-filled daily series + the tenant's project list.
 */
export interface KbUsage {
  window: KbUsageWindow;
  totals: KbUsageTotals;
  daily_counts: KbDailyCount[];
  projects: KbProject[];
}

/**
 * One project row in the dashboard rollup (`GET /app/dashboard`, P12.S3). NOTE:
 * `documents` is `documents_created` over the window, NOT a live per-project total
 * (the content-plane bridge is S5).
 */
export interface KbDashboardProject {
  id: string;
  name: string;
  created_at: string;
  documents: number;
  /** Non-revoked credential count. */
  keys: number;
  /** Most-recent ingest recency across the project's credentials, or null. */
  last_used_at: string | null;
}

/** One lifecycle event in the dashboard activity feed. */
export interface KbActivityEvent {
  type: "project_created" | "key_minted" | "key_revoked";
  at: string;
  project_name: string;
  credential_name: string | null;
}

/** `GET /app/dashboard` — per-project rollup + newest-first lifecycle activity. */
export interface KbDashboard {
  projects: KbDashboardProject[];
  activity: KbActivityEvent[];
}

// ── /app/projects/{id} credential + usage shapes (P12.S4) ──────────────────
// Mirror `server/app_api.py::serialize_credential` and
// `server/usage_api.py::_project_usage_response` verbatim.

/**
 * `serialize_credential` — one project ingest key's METADATA. Never carries
 * `token_hash`, and never the plaintext key (see `KbMintedCredential`).
 *
 * There is NO `status` field: the UI DERIVES a three-state status from
 * `revoked_at` / `last_used_at` (`credential-status.ts`). Revoked credentials
 * REMAIN listed (knowledge's revoke is a soft stamp, not a delete), so any
 * consumer must derive the state rather than assume the list is live-only.
 *
 * `token_prefix` is `"vk_"` plus a short slice of the opaque token — a DISPLAY
 * STUB, never a usable credential.
 */
export interface KbCredential {
  id: string;
  project_id: string;
  /** Optional display label; `null` when the key was minted unnamed. */
  name: string | null;
  token_prefix: string;
  created_at: string;
  /** Stamped on each ingest call; `null` until the key is first used. */
  last_used_at: string | null;
  /** `null` ⇔ not revoked. */
  revoked_at: string | null;
}

/**
 * `POST /app/projects/{id}/credentials` → 201 `{credential, key}` — the one
 * response that cannot be unwrapped to a single domain type.
 *
 * `key` is the PLAINTEXT `vk_…` credential, returned EXACTLY ONCE and never
 * recoverable: knowledge persists only the sha256 hash + short prefix. Unwrapping
 * this to a bare `KbCredential` would throw away the only copy, so the envelope is
 * kept whole and the caller is forced to decide what to do with the secret. It
 * must never be logged, put in a URL, or persisted.
 */
export interface KbMintedCredential {
  credential: KbCredential;
  key: string;
}

/**
 * `GET /app/projects/{id}/usage` — one project's usage PLUS the project itself and
 * that project's credentials. Unlike `KbUsage`, this payload carries no `projects`
 * list; instead knowledge bundles `project` (through the same `serialize_project`)
 * and `credentials` (through the same `serialize_credential` as the standalone list
 * route). That single-call bundling is why the project page needs no separate
 * `getProject`/credentials-list round-trips. `window`/`totals`/`daily_counts` come
 * from the same `serialize_usage_metrics` and are identical to the dashboard's.
 */
export interface KbProjectUsage {
  window: KbUsageWindow;
  totals: KbUsageTotals;
  daily_counts: KbDailyCount[];
  project: KbProject;
  credentials: KbCredential[];
}
