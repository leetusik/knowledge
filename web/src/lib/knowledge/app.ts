import "server-only";

import { getJson, sendJson } from "./client";
import type { KbDashboard, KbProject, KbUsage } from "./types";

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
