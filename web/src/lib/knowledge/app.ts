import "server-only";

import { getJson, getRaw, sendJson } from "./client";
import type {
  KbCredential,
  KbDashboard,
  KbDocument,
  KbDocumentsPage,
  KbDocumentsQuery,
  KbGraph,
  KbMintedCredential,
  KbProject,
  KbProjectUsage,
  KbSearchPage,
  KbUsage,
} from "./types";

// P12.S3 — typed server-side calls against knowledge's session-scoped `/app/*`
// surface, the sibling of `auth.ts` (which is scoped to `/auth/*`). Both sit on the
// same `client.ts` seam: the caller passes the knowledge bearer token unsealed from
// the httpOnly cookie by `requireIdentity()`, and every call is `cache: "no-store"`
// by construction — per-user data must never hit Next's fetch cache.
//
// Every function takes the `token` as a REQUIRED first argument: these routes are
// all `require_user`-guarded, so an unauthenticated call is never meaningful. Errors
// surface as `ApiError` carrying the STATUS — callers branch on that, never on
// knowledge's `detail` text.

/** The `GET /app/projects` envelope. */
interface RawProjectsResponse {
  projects?: KbProject[];
}

/** The `POST /app/projects` envelope. */
interface RawProjectResponse {
  project: KbProject;
}

/**
 * `GET /app/projects` (bearer) → 200 `{projects: [...]}` — the caller's tenant's
 * projects oldest-first, unpaginated. A tenant with no projects answers
 * `{projects: []}`. Added for completeness / S4 reuse; the dashboard page reads
 * `getDashboard` (the richer per-project rollup) instead.
 *
 * The `?? []` is defensive only — knowledge always sends the key.
 */
export async function listProjects(
  token: string,
  signal?: AbortSignal,
): Promise<KbProject[]> {
  const raw = await getJson<RawProjectsResponse>("/app/projects", {
    token,
    signal,
  });
  return raw.projects ?? [];
}

/**
 * `POST /app/projects` (bearer) `{name}` → 201 `{project}`.
 *
 * knowledge validates `name` as 1–200 chars and stores it TRIMMED, rejecting an
 * all-whitespace name — but as a **422** (FastAPI body validation), not vocky's 400.
 * Callers validate their own input first and map both 400 and 422 by status.
 */
export async function createProject(
  token: string,
  name: string,
): Promise<KbProject> {
  const raw = await sendJson<RawProjectResponse>(
    "/app/projects",
    "POST",
    { name },
    { token },
  );
  return raw.project;
}

/**
 * `GET /app/usage` (bearer) → 200 `{window, totals, daily_counts, projects}`.
 *
 * Called BARE: knowledge defaults the window to the last 30 days when `days` is
 * omitted and echoes the resolved window back in `window` — which the UI labels off
 * rather than recomputing. No envelope to unwrap — the payload IS the response.
 * `daily_counts` is contiguous and zero-filled (length = days), even for a
 * zero-event tenant, so the trend series never has a gap.
 */
export async function getUsage(
  token: string,
  signal?: AbortSignal,
): Promise<KbUsage> {
  return getJson<KbUsage>("/app/usage", { token, signal });
}

/**
 * `GET /app/dashboard` (bearer) → 200 `{projects, activity}` — the P12.S3 tenant
 * rollup: per-project `documents`/`keys`/`last_used_at` plus a newest-first
 * lifecycle activity feed, assembled server-side so the browser makes one
 * round-trip. Called BARE (30-day window). No envelope — the payload IS the
 * response. Tenant-scoped + unmetered on the backend.
 */
export async function getDashboard(
  token: string,
  signal?: AbortSignal,
): Promise<KbDashboard> {
  return getJson<KbDashboard>("/app/dashboard", { token, signal });
}

// ── /app/projects/{id} — project detail + credential lifecycle (P12.S4) ─────
// The per-project drill-down's server calls. `encodeURIComponent` every path id.
// The project page reads `getProjectUsage` alone (it bundles `project` +
// `credentials`); `getProject` is the standalone header fetch for callers that do
// not need usage.

/**
 * `GET /app/projects/{id}` (bearer) → 200 `{project}` — reuses the
 * `POST /app/projects` envelope (knowledge wraps both in `{project}`).
 *
 * Failure statuses meaningful to the caller: 400 (`id` is not a UUID) and 404
 * (missing OR another tenant's — knowledge answers 404-never-403 via
 * `_load_scoped_project`, so project ids can never be probed across tenants). The
 * UI maps both to the branded not-found so the two are indistinguishable.
 */
export async function getProject(
  token: string,
  projectId: string,
  signal?: AbortSignal,
): Promise<KbProject> {
  const raw = await getJson<RawProjectResponse>(
    `/app/projects/${encodeURIComponent(projectId)}`,
    { token, signal },
  );
  return raw.project;
}

/**
 * `PATCH /app/projects/{id}` (bearer) `{visibility}` → 200 `{project}` — the P19
 * visibility toggle. Session-only on the backend; `_load_scoped_project` answers
 * 404 for a missing OR cross-tenant project (404-never-403), and an invalid value is
 * a 422 (the backend's `Literal["private","public"]`). Reuses the `{project}`
 * envelope, so the updated `visibility` rides back on the same shape as `getProject`.
 */
export async function setProjectVisibility(
  token: string,
  projectId: string,
  visibility: "private" | "public",
): Promise<KbProject> {
  const raw = await sendJson<RawProjectResponse>(
    `/app/projects/${encodeURIComponent(projectId)}`,
    "PATCH",
    { visibility },
    { token },
  );
  return raw.project;
}

/**
 * `POST /app/projects/{id}/credentials` (bearer) `{name?}` → 201
 * `{credential, key}`.
 *
 * Returns the envelope WHOLE (`KbMintedCredential`), unlike every other call here:
 * `key` is the PLAINTEXT `vk_…` credential and knowledge returns it EXACTLY ONCE
 * (only its sha256 hash + short prefix are persisted), so unwrapping to
 * `credential` would silently discard the only copy in existence. The caller owns
 * the secret from here: show it once, never log it, never persist it.
 *
 * `name` is OPTIONAL — knowledge accepts an empty body and defaults it to `null` —
 * so an omitted name sends `{}` rather than `{name: null}`/`{name: ""}`.
 */
export async function createCredential(
  token: string,
  projectId: string,
  name?: string,
): Promise<KbMintedCredential> {
  return sendJson<KbMintedCredential>(
    `/app/projects/${encodeURIComponent(projectId)}/credentials`,
    "POST",
    name === undefined ? {} : { name },
    { token },
  );
}

/**
 * `DELETE /app/projects/{id}/credentials/{cid}` (bearer) → 204, empty body.
 *
 * Revoke is a STAMP, not a delete: knowledge sets `revoked_at` and the credential
 * stays listed (the revalidated render flips its status to Revoked). 404 when the
 * credential is not in the scoped project (so foreign credential ids cannot be
 * probed or revoked), 400 on a malformed id, 404 on a foreign project id.
 *
 * `sendJson<void>` is the `auth.ts::logout` idiom — the 204 maps to `undefined`,
 * so there is nothing to unwrap.
 */
export async function revokeCredential(
  token: string,
  projectId: string,
  credentialId: string,
): Promise<void> {
  await sendJson<void>(
    `/app/projects/${encodeURIComponent(projectId)}/credentials/${encodeURIComponent(credentialId)}`,
    "DELETE",
    undefined,
    { token },
  );
}

/**
 * `GET /app/projects/{id}/usage` (bearer) → 200
 * `{window, totals, daily_counts, project, credentials}`.
 *
 * Called BARE, exactly like `getUsage`: knowledge defaults the window to the last
 * 30 days and echoes the resolved bounds back in `window`. No envelope (the payload
 * IS the response). This is the project page's SINGLE fetch — knowledge bundles the
 * `project` header + the `credentials` table here (cleaner than vocky's two calls),
 * so the page reads everything from this one response. Same not-found mapping as
 * `getProject` (400/404 → branded not-found).
 */
export async function getProjectUsage(
  token: string,
  projectId: string,
  signal?: AbortSignal,
): Promise<KbProjectUsage> {
  return getJson<KbProjectUsage>(
    `/app/projects/${encodeURIComponent(projectId)}/usage`,
    { token, signal },
  );
}

// ── /app/credentials — org-level credential lifecycle (P18.S3) ──────────────
// The tenant/org-scoped credential seam, mirroring the per-project calls above but
// keyed to the ORG (there is no project id in the path). An org key authorizes the
// whole tenant and serializes `project_id: null`. These sit ALONGSIDE the per-project
// credential routes (both work) — additive to the frozen `/app/*` contract (P18.S2).

/** The `GET /app/credentials` envelope. */
interface RawOrgCredentialsResponse {
  credentials?: KbCredential[];
}

/**
 * `GET /app/credentials` (bearer) → 200 `{credentials: [...]}` — the caller's ORG
 * (tenant) credentials, oldest-first, INCLUDING revoked (the revoke is a soft stamp,
 * so a revoked key stays listed and the UI derives its Revoked state). Org-level only
 * (`project_id null`); the per-project keys live under `/app/projects/{id}/usage`.
 *
 * The `?? []` is defensive only — knowledge always sends the key.
 */
export async function listOrgCredentials(
  token: string,
  signal?: AbortSignal,
): Promise<KbCredential[]> {
  const raw = await getJson<RawOrgCredentialsResponse>("/app/credentials", {
    token,
    signal,
  });
  return raw.credentials ?? [];
}

/**
 * `POST /app/credentials` (bearer) `{name?}` → 201 `{credential, key}`.
 *
 * Mirrors `createCredential` exactly, minus the project id: mints an ORG-level `vk_`
 * (`project_id null`) scoped to the caller's tenant. Returns the envelope WHOLE
 * (`KbMintedCredential`) — `key` is the PLAINTEXT credential knowledge returns EXACTLY
 * ONCE (only its sha256 hash + short prefix persist), so unwrapping to `credential`
 * would discard the only copy. Show it once, never log/persist it.
 *
 * `name` is OPTIONAL — knowledge accepts an empty body and defaults it to `null` — so
 * an omitted name sends `{}` rather than `{name: null}`/`{name: ""}`.
 */
export async function createOrgCredential(
  token: string,
  name?: string,
): Promise<KbMintedCredential> {
  return sendJson<KbMintedCredential>(
    "/app/credentials",
    "POST",
    name === undefined ? {} : { name },
    { token },
  );
}

/**
 * `DELETE /app/credentials/{cid}` (bearer) → 204, empty body.
 *
 * Revoke is a STAMP, not a delete (like the per-project revoke): knowledge sets
 * `revoked_at` and the key stays listed (the revalidated render flips it to Revoked).
 * 404 when the id is not one of the caller's own ORG-level credentials (so foreign /
 * project-bound ids cannot be probed or revoked here); 400 on a malformed id. The 204
 * maps to `undefined`, so there is nothing to unwrap.
 */
export async function revokeOrgCredential(
  token: string,
  credentialId: string,
): Promise<void> {
  await sendJson<void>(
    `/app/credentials/${encodeURIComponent(credentialId)}`,
    "DELETE",
    undefined,
    { token },
  );
}

// ── /app/documents + /app/search — the per-tenant knowledge viewer (P12.S5) ──
// The documents browse/search/read seam. These `/app` routes are UNMETERED,
// session-scoped, and tenant-scoped on the backend, so web-UI browsing never
// pollutes the metered `searches` figure. `project` is a control-plane project UUID
// that the backend bridges to the content-plane project NAME (404 if cross-tenant).

/**
 * Build the query string, mirroring vocky's `feedbackQueryString` (the rules it
 * settles):
 *   - BLANK IS OMITTED, never sent. A GET form submits its empty fields, so an
 *     unfiltered submit yields `?q=&project=`; the backend would 422 a blank
 *     `project` (`UUID("")`). Dropping blanks is what makes the empty form mean "no
 *     filter". Strings are trimmed to match the page's own normalization.
 *   - `URLSearchParams` does ALL the escaping — do NOT `encodeURIComponent` on top,
 *     or Korean double-encodes (`검색` → `%25EA%25B2%25...`). It encodes a space as
 *     `+`, which Starlette decodes back correctly.
 *   - No params ⇒ the path stays BARE (`/app/documents`, no trailing `?`).
 */
function documentsQueryString(query: KbDocumentsQuery): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    const raw = typeof value === "string" ? value.trim() : String(value);
    if (raw === "") continue;
    search.set(key, raw);
  }
  const qs = search.toString();
  return qs === "" ? "" : `?${qs}`;
}

/**
 * `GET /app/documents` (bearer) → 200 `{total, items}` — the caller's tenant's
 * documents, newest-first (`date DESC, id DESC`), OFFSET-paged. `total` is the full
 * filtered count (independent of the `limit`/`offset` window). Items carry no
 * `markdown` (a single fetch adds it).
 *
 * `project` (a control-plane UUID) narrows the scope: the backend resolves it to a
 * project NAME, answering 404 when it is missing OR another tenant's — a malformed
 * one is a 422. The page maps 400/404 to the branded not-found.
 */
export async function getDocuments(
  token: string,
  query: KbDocumentsQuery = {},
  signal?: AbortSignal,
): Promise<KbDocumentsPage> {
  return getJson<KbDocumentsPage>(
    `/app/documents${documentsQueryString(query)}`,
    { token, signal },
  );
}

/**
 * `GET /app/documents/{id}` → 200 the projected document WITH `markdown`.
 *
 * OPTIONAL-IDENTITY (P19): `token` is `string | undefined`. With a bearer the
 * backend serves the member-scoped read (plus a public-project fallback for a
 * cross-org caller); tokenless it serves ONLY public-project docs. Either way a
 * private/nonexistent/cross-tenant id answers **404** (404-never-403, ids cannot be
 * probed); a non-integer id is a 422. The read page maps 404/400 to the branded
 * not-found (member) or a `/login` bounce (anonymous). `authHeaders(undefined)`
 * sends no `Authorization`, so an anonymous read never smuggles a token upstream.
 */
export async function getDocument(
  token: string | undefined,
  id: number,
  signal?: AbortSignal,
): Promise<KbDocument> {
  // `id` is a number, so there is nothing to URL-escape — interpolate directly.
  return getJson<KbDocument>(`/app/documents/${id}`, { token, signal });
}

/**
 * `GET /app/documents/{id}/raw` (bearer) → 200 the raw HTML bytes of an HTML
 * explainer doc as `text/html`, returned as the UNREAD `Response` (the
 * `client.ts::getRaw` byte-passthrough seam) for the BFF relay route to stream
 * straight to the browser's sandboxed iframe. Only the `/api/documents/{id}/raw`
 * relay calls this — the JSON read path uses `getDocument`.
 *
 * `ApiError` (from the shared `!res.ok` contract) on a non-2xx: 404 for a missing /
 * cross-tenant / non-HTML doc, which the relay maps to a 404. The caller MUST relay
 * or consume the body.
 *
 * OPTIONAL-IDENTITY (P19): `token` is `string | undefined`, mirroring `getDocument`.
 * The anonymous relay (a public doc's sandboxed iframe, loaded by a visitor with no
 * cookie) calls it tokenless and the backend serves only public raw HTML; a member's
 * iframe forwards their bearer. A private/nonexistent doc is a 404 either way.
 */
export async function getDocumentRaw(
  token: string | undefined,
  id: number,
  signal?: AbortSignal,
): Promise<Response> {
  // `id` is a number, so there is nothing to URL-escape — interpolate directly
  // (mirrors `getDocument`).
  return getRaw(`/app/documents/${id}/raw`, { token, signal });
}

/**
 * `GET /app/search` (bearer) → 200 `{query, mode, total, limit, offset, results}` —
 * BM25 + recency ranking (fused with the Gemini vector signal when embeddings are
 * enabled → `mode: "hybrid"`), scoped to the caller's tenant. `q` is REQUIRED (a
 * blank/absent `q` would be a 422); the page only calls this when `q` is present and
 * uses `getDocuments` otherwise. Same `project` bridge + 400/404 mapping as
 * `getDocuments`.
 */
export async function searchDocuments(
  token: string,
  query: KbDocumentsQuery & { q: string },
  signal?: AbortSignal,
): Promise<KbSearchPage> {
  return getJson<KbSearchPage>(
    `/app/search${documentsQueryString(query)}`,
    { token, signal },
  );
}

// ── /app/graph — the per-tenant knowledge map (P12.S6) ──────────────────────
// The in-app graph's data source: the same `{version, projects, nodes, edges}`
// contract the build-time mkdocs `graph.json` emits, but derived from the content
// store for the caller's tenant. UNMETERED, session-scoped, tenant-scoped on the
// backend. The graph route fetches this ONCE on the server and passes the payload
// as a prop to the client `<GraphCanvas>` (no browser fetch / BFF proxy).

/**
 * `GET /app/graph` → 200 a knowledge graph
 * (`{version, projects, nodes, edges, truncated}`). Two shapes, one route (P19):
 *   - BARE (`options.org` omitted, member bearer) — the in-app per-tenant map: the
 *     caller's whole corpus. `token` required in practice for this path (401 if
 *     absent), which is how the logged-in `/graph` page still calls it.
 *   - `?org={tenant_uuid}` — the OPTIONAL-IDENTITY public view: only that org's
 *     public-project nodes/edges/tag-hubs. `token` is `string | undefined` here — a
 *     member viewing their own org gets the full map, an anonymous or cross-org
 *     caller gets the public subset, and an org with no public projects (or a
 *     nonexistent org) is a **404** (no existence leak).
 *
 * `org` is appended via `encodeURIComponent`; no `org` keeps the path BARE (no `?`),
 * byte-compatible with the pre-P19 logged-in call. A doc node's `url` is the read
 * route `/documents/{id}`.
 */
export async function getGraph(
  token: string | undefined,
  options: { org?: string } = {},
  signal?: AbortSignal,
): Promise<KbGraph> {
  const query =
    options.org === undefined
      ? ""
      : `?org=${encodeURIComponent(options.org)}`;
  return getJson<KbGraph>(`/app/graph${query}`, { token, signal });
}
