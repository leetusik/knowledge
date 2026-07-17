import "server-only";

import { getJson, sendJson } from "./client";
import type {
  KbDashboard,
  KbMintedCredential,
  KbProject,
  KbProjectUsage,
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
