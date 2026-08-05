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
  /**
   * Per-project read visibility (P19). `"private"` (the default for every new
   * project) keeps docs/graph member-only; `"public"` exposes the project's docs +
   * graph nodes to anonymous and cross-org readers. Toggled via
   * `PATCH /app/projects/{id}` (session-only); every `serialize_project` payload
   * carries it.
   */
  visibility: "private" | "public";
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
  /**
   * The project's read visibility (P19) — the dashboard rollup surfaces it as a
   * Public/Private badge column. Built straight from the Postgres `ProjectRecord`
   * the rollup already loads, so it needs no extra query.
   */
  visibility: "private" | "public";
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
  /**
   * The bound project's UUID, or `null` for an **org-level** key (P18.S2's
   * `serialize_credential` is NULL-safe): an org key authorizes the whole tenant and
   * carries no project binding, while a project-bound key still names its project for
   * attribution. Consumers that need a project id for a project-bound key should read
   * it from the project in scope, not from here.
   */
  project_id: string | null;
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

// ── /app/documents + /app/search shapes (P12.S5) ───────────────────────────
// Mirror the `server/documents_api.py` `/app` projector (`_app_doc`) and the
// `server/search.py::_finalize` result shape verbatim. These are the CONTENT plane
// (documents key off the project NAME string), distinct from the control-plane
// `/app/projects` UUIDs — the page bridges the two by sending a project UUID that the
// backend resolves to a name. The `/app` projector drops `markdown` (list only),
// `tags_text`, and `tenant_id`.

/**
 * One document in the `GET /app/documents` list — no `markdown` (dropped from list
 * rows; a single fetch adds it). `project` is the content-plane project NAME string,
 * not a UUID. `related` is the doc's forward `related:` links (rel_paths).
 */
export interface KbDocumentListItem {
  id: number;
  project: string;
  slug: string;
  /** `YYYY-MM-DD`. */
  date: string;
  title: string;
  tags: string[];
  rel_path: string;
  source_repo: string | null;
  related: string[];
  /**
   * `"md"` (default) or `"html"` (P16) — an additive field the backend now sends on
   * every list + detail projection. `"html"` docs are self-contained HTML explainers
   * the viewer renders in a sandboxed opaque-origin iframe (never as markdown); `"md"`
   * docs render byte-identically to before via `<MarkdownBody>`.
   */
  format: "md" | "html";
  /**
   * The document's CURRENT version number (P23) — `1` for a document that has never
   * been re-published, `N` after N-1 version bumps. Additive on every list + detail
   * projection (an unversioned corpus reads `1` everywhere: the column is
   * `NOT NULL DEFAULT 1` and pre-P23 rows were back-filled, never migrated).
   *
   * The current body IS this document — it is deliberately NOT addressable as a
   * version — so the full chain is "`version` plus the superseded rows listed by
   * `GET /app/documents/{id}/versions`" (see `KbDocumentVersionsPage`).
   */
  version: number;
  created_at: string;
  updated_at: string;
}

/** `GET /app/documents/{id}` — a list item PLUS the rendered-from `markdown` body. */
export interface KbDocument extends KbDocumentListItem {
  /** The document body WITHOUT frontmatter (starts at the H1). */
  markdown: string;
}

/** `GET /app/documents` → `{total, items}` (offset-paged; `total` is the full count). */
export interface KbDocumentsPage {
  total: number;
  items: KbDocumentListItem[];
}

/**
 * One `GET /app/search` result (`server/search.py::_finalize`): the list-item fields
 * (minus `related`) PLUS the ranking `score`, a highlighted `snippet` (contains
 * literal `<mark>…</mark>` delimiters — never raw HTML to inject), and the `signals`
 * breakdown. Never carries `markdown` or `tenant_id`.
 */
export interface KbSearchResult {
  id: number;
  project: string;
  slug: string;
  date: string;
  title: string;
  tags: string[];
  rel_path: string;
  source_repo: string | null;
  created_at: string;
  updated_at: string;
  score: number;
  /** FTS excerpt with matched terms wrapped in literal `<mark>`/`</mark>`. */
  snippet: string;
  /** `{bm25?, recency, vector?}` — the per-signal contributions. */
  signals: {
    bm25?: number;
    recency: number;
    vector?: number;
  };
}

/** `GET /app/search` → `{query, mode, total, limit, offset, results}`. */
export interface KbSearchPage {
  query: string;
  /** `"hybrid"` when the Gemini vector signal fused in, else `"bm25"`. */
  mode: string;
  total: number;
  limit: number;
  offset: number;
  results: KbSearchResult[];
}

/**
 * The query for `getDocuments`/`searchDocuments`. `project` is a control-plane
 * project UUID (the backend bridges it to a name). All fields optional; blanks are
 * omitted from the URL by `documentsQueryString`.
 */
export interface KbDocumentsQuery {
  q?: string;
  project?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}

// ── /app/documents/{id}/versions shapes (P23.S3) ───────────────────────────
// Mirror `server/documents_api.py::_app_version` verbatim. That projector drops
// `id` (an autoincrement on the DISPOSABLE `document_versions` table — reindex
// rebuilds every row from the `.versions` files on disk, so it is NOT stable and
// nothing may key off it), `tenant_id`, and `raw_html` (an archived HTML body's
// bytes leave this plane through the `/raw` twin alone, never in JSON). `markdown`
// is dropped from index rows and kept on a single-version fetch.

/**
 * One SUPERSEDED version of a document. The archive is identity-keyed on
 * `(tenant_id, rel_path, version)` server-side, so a version is addressed by its
 * document's id plus the number — `GET /app/documents/{id}/versions/{version}`.
 *
 * `title`/`date`/`tags`/`format` are the values that body carried WHEN IT WAS
 * ARCHIVED (a retitled v3 leaves v2's old title here — that is the point of a
 * history), and `date` stays the document's original publication date because a
 * version bump never moves `rel_path`.
 *
 * `created_at` is when the body was ARCHIVED — i.e. when the version AFTER it was
 * published — not when it was authored. Label it accordingly; it is not the doc's
 * `created_at`.
 *
 * `archive_path` is the on-disk `.versions/…/vNNNN.<ext>` location, shown as
 * provenance only: that tree is never served, so it is not a link.
 */
export interface KbDocumentVersion {
  /** The owning document's path — identical for every version in a chain. */
  rel_path: string;
  version: number;
  archive_path: string;
  title: string;
  /** `YYYY-MM-DD` — the document's publication date, not the archive time. */
  date: string;
  tags: string[];
  format: "md" | "html";
  /** ISO-8601. When this body was superseded and archived. */
  created_at: string;
  /**
   * The archived body, present ONLY on a single-version fetch (index rows are
   * body-less). For an `html` version this is the extracted plain text; the
   * rendered body comes from the `/raw` twin.
   */
  markdown?: string;
}

/**
 * `GET /app/documents/{id}/versions` → `{rel_path, current_version, total,
 * versions}`.
 *
 * `versions` lists SUPERSEDED bodies only, newest first (`version DESC`);
 * `current_version` is the live document's `version`, so the chain is
 * "`current_version` + `versions`". An UNVERSIONED document answers
 * `{current_version: 1, total: 0, versions: []}` — never a 404 — so one call is
 * enough to decide between "no history" and a panel.
 */
export interface KbDocumentVersionsPage {
  rel_path: string;
  current_version: number;
  total: number;
  versions: KbDocumentVersion[];
}

// ── /app/graph shapes (P12.S6) ─────────────────────────────────────────────
// Mirror the `server/graph_api.py` twin of `scripts/graph_hook.py`'s inversion —
// the SAME `{version, projects, nodes, edges}` contract graph.json emits, so the
// ported canvas renderer consumes it unchanged. Nodes are keyed on `rel_path`; a
// doc node's `url` is the S5 read route `/documents/{db_id}`. The renderer reads
// only `projects` / `nodes` / `edges` (and each node's fields) — the shapes are
// intentionally permissive (`title`/`url`/`date`/`project`/`tags`/`degree` are
// absent on tag + missing nodes) to match the emitted union.

/** One project in the legend, `(-docs, name)`-ordered (the renderer inks by index). */
export interface KbGraphProject {
  name: string;
  docs: number;
}

/**
 * One graph node. `type` discriminates: `doc` carries the full metadata (incl. the
 * `/documents/{id}` `url`); `tag` hubs and `missing` ghosts carry only `id`/`title`/
 * `degree`. Kept loose (all but `id`/`type` optional) so a single type covers the
 * union without narrowing the imperative engine.
 */
export interface KbGraphNode {
  id: string;
  type: "doc" | "tag" | "missing";
  title?: string;
  /** Doc nodes only — the S5 read route `/documents/{db_id}`. */
  url?: string;
  date?: string;
  project?: string;
  tags?: string[];
  degree?: number;
}

/** One graph edge: `related` (doc→doc, `broken` into a ghost) or `tag` (doc→`tag:<t>`). */
export interface KbGraphEdge {
  source: string;
  target: string;
  kind: "related" | "tag";
  /** `related` edge into an unresolved target (a `missing` ghost node). */
  broken?: boolean;
}

/** `GET /app/graph` — the tenant's knowledge map (graph.json contract + `truncated`). */
export interface KbGraph {
  version: number;
  projects: KbGraphProject[];
  nodes: KbGraphNode[];
  edges: KbGraphEdge[];
  /** True when the corpus exceeded the node cap and the newest docs were graphed. */
  truncated?: boolean;
}
