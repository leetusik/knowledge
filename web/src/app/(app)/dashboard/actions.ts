"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CREATE_PROJECT_ERRORS,
  MINT_ORG_CREDENTIAL_ERRORS,
  REVOKE_ORG_CREDENTIAL_ERRORS,
} from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import {
  createOrgCredential,
  createProject,
  revokeOrgCredential,
} from "@/lib/knowledge/app";
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

// ── Org-level API keys (P18.S3) ─────────────────────────────────────────────
// Mint/revoke ORG credentials as SERVER ACTIONS, page-local copies of the
// `projects/[projectId]/actions.ts` pattern minus the per-project id: an org key
// grants the whole tenant (`POST/DELETE /app/credentials`). Same rules — behind
// `requireIdentity()`, status-mapped error copy, `revalidatePath` the dashboard. The
// knowledge token never reaches the browser; the minted plaintext `vk_` rides back
// only in the mint action state and is shown once.
//
// As above, only ASYNC functions may be exported from this `"use server"` module, so
// each form's initial state lives in its client island (never here).

/**
 * `name` is OPTIONAL and capped at 200 chars measured BEFORE stripping, exactly as
 * knowledge's pydantic `Field(max_length=200)` runs ahead of its strip validator. A
 * blank/whitespace-only name is NOT an error — knowledge maps it to `null` — so it is
 * normalized to `undefined` below and the body omits the field entirely.
 */
const orgKeyNameSchema = z.string().max(200).optional();

export interface MintOrgCredentialState {
  /** Display copy for a failure, or `null` on success / first render. */
  error: string | null;
  /**
   * The PLAINTEXT `vk_…` key, present only on the render right after a successful
   * mint — the ONE sanctioned server→client crossing (knowledge returns it exactly
   * once and persists only its sha256 hash, so the user MUST see it now or lose it
   * forever). Never logged, never in a URL, never persisted; it lives in the action
   * state and dies with the next submit or navigation.
   */
  key?: string;
  /** Bumped on each success; the client island keys the show-once modal on it. */
  ok?: number;
}

export interface RevokeOrgCredentialState {
  error: string | null;
  ok?: number;
}

/**
 * `useActionState` action: validate → `POST /app/credentials` → revalidate. Returns
 * the minted key in the state (see `MintOrgCredentialState.key`).
 *
 * Failures map by HTTP STATUS, never by knowledge's `detail` text. knowledge answers a
 * body-validation failure (name >200 chars) as **422**, mapped to `invalidName`. No
 * `notFound` case: an org key targets the caller's tenant, which always exists.
 */
export async function mintOrgCredentialAction(
  _prevState: MintOrgCredentialState,
  formData: FormData,
): Promise<MintOrgCredentialState> {
  // Blank/whitespace → `undefined` → an omitted field, which knowledge stores as
  // `null`. Only a too-long name is a real rejection.
  const rawName = formData.get("name");
  const candidate =
    typeof rawName === "string" && rawName.trim() !== "" ? rawName : undefined;
  const name = orgKeyNameSchema.safeParse(candidate);
  if (!name.success) {
    return { error: MINT_ORG_CREDENTIAL_ERRORS.invalidName };
  }

  // OUTSIDE the try on purpose: `requireIdentity()` signals "no session" by calling
  // `redirect()`, which works by THROWING a control-flow error Next must see.
  // Catching it would swallow the redirect and render a bogus error instead of
  // bouncing to /login.
  const { token } = await requireIdentity();

  let minted;
  try {
    minted = await createOrgCredential(token, name.data);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400 || error.status === 422) {
        return { error: MINT_ORG_CREDENTIAL_ERRORS.invalidName };
      }
      if (error.status === 401) {
        return { error: MINT_ORG_CREDENTIAL_ERRORS.sessionExpired };
      }
    }
    return { error: MINT_ORG_CREDENTIAL_ERRORS.generic };
  }

  // Re-renders the page (refetching the org-credentials list), so the new row appears
  // without client-side list state. The show-once modal survives it: it lives in the
  // action state, not in the server-rendered tree.
  revalidatePath("/dashboard", "page");
  return { error: null, key: minted.key, ok: Date.now() };
}

/**
 * `useActionState` action: validate → `DELETE /app/credentials/{cid}` → revalidate.
 * knowledge answers 204 and the credential stays LISTED with a `revoked_at` stamp, so
 * the revalidated render flips the row's status to Revoked rather than dropping it.
 */
export async function revokeOrgCredentialAction(
  _prevState: RevokeOrgCredentialState,
  formData: FormData,
): Promise<RevokeOrgCredentialState> {
  const credentialId = z.uuid().safeParse(formData.get("credentialId"));
  if (!credentialId.success) {
    return { error: REVOKE_ORG_CREDENTIAL_ERRORS.invalidRequest };
  }

  // Outside the try — same reason as above.
  const { token } = await requireIdentity();

  try {
    await revokeOrgCredential(token, credentialId.data);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400) {
        return { error: REVOKE_ORG_CREDENTIAL_ERRORS.invalidRequest };
      }
      if (error.status === 401) {
        return { error: REVOKE_ORG_CREDENTIAL_ERRORS.sessionExpired };
      }
      if (error.status === 404) {
        return { error: REVOKE_ORG_CREDENTIAL_ERRORS.notFound };
      }
    }
    return { error: REVOKE_ORG_CREDENTIAL_ERRORS.generic };
  }

  revalidatePath("/dashboard", "page");
  return { error: null, ok: Date.now() };
}
