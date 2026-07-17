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
