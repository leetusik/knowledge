"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CREATE_PROJECT_ERRORS } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { createProject } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";

/**
 * P12.S3 — create-project as a SERVER ACTION, the architectural rule for authed
 * mutations in this app (S4's credential mint/revoke follows it too).
 *
 * Why not a route handler + client fetch, like S2's auth surface? Those routes exist
 * for a PUBLIC, UNAUTHENTICATED, rate-limited surface that must do its own origin
 * check + throttling before anyone is identified. This mutation sits behind
 * `requireIdentity()`, gets Next's built-in server-action CSRF protection for free,
 * and can `revalidatePath` the very page that renders the result. The knowledge
 * token never reaches the browser: it is unsealed from the httpOnly cookie inside
 * this action and handed straight to the server-to-server knowledge call.
 */

/**
 * Mirrors knowledge's `CreateProjectInput` (1–200 chars) so the common mistakes are
 * caught without a round-trip. Length is measured BEFORE trimming, exactly as
 * knowledge's pydantic model does (`Field(min_length=1, max_length=200)` runs before
 * the `_strip_name` validator); the trailing `.trim()` then rejects an all-whitespace
 * name, which knowledge also rejects. knowledge remains the authority — its
 * 400/422 is still mapped below.
 */
const nameSchema = z
  .string()
  .min(1)
  .max(200)
  .refine((value) => value.trim().length > 0);

/**
 * NOTE: a `"use server"` module may export ONLY async functions — every export is
 * registered as a callable server action, so exporting a plain value throws "A 'use
 * server' file can only export async functions" at request time. A TYPE export like
 * this one is fine (types are erased before the loader sees the module); the form's
 * initial state lives in the client island, not here.
 */
export interface CreateProjectState {
  /** Display copy for a failure, or `null` on success / first render. */
  error: string | null;
  /** Bumped on each success so the client island can reset + collapse the form. */
  ok?: number;
}

/**
 * `useActionState` action: validate → `POST /app/projects` → revalidate.
 *
 * Failures map by HTTP STATUS, never by knowledge's `detail` text. knowledge answers
 * a blank/too-long name as a **422** (FastAPI body validation), not vocky's 400, so
 * both are mapped to `invalidName`. A 401 means the session died mid-request; the
 * next navigation hits the `(app)` guard and bounces to /login.
 */
export async function createProjectAction(
  _prevState: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: CREATE_PROJECT_ERRORS.invalidName };
  }

  // OUTSIDE the try on purpose: `requireIdentity()` signals "no session" by calling
  // `redirect()`, which works by THROWING a control-flow error Next must see.
  // Catching it here would swallow the redirect and render a bogus error instead of
  // bouncing to /login.
  const { token } = await requireIdentity();

  try {
    await createProject(token, parsed.data);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400 || error.status === 422) {
        return { error: CREATE_PROJECT_ERRORS.invalidName };
      }
      if (error.status === 401) {
        return { error: CREATE_PROJECT_ERRORS.sessionExpired };
      }
    }
    return { error: CREATE_PROJECT_ERRORS.generic };
  }

  // The page re-fetches `/app/dashboard` + `/app/usage` on the next render, so the
  // new project (and its now-zero-filled row) appears without a client-side refresh.
  revalidatePath("/dashboard");
  return { error: null, ok: Date.now() };
}
