"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { MINT_CREDENTIAL_ERRORS, REVOKE_CREDENTIAL_ERRORS } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { createCredential, revokeCredential } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";

/**
 * P12.S4 — credential mint + revoke as SERVER ACTIONS, following the rule S3
 * established for authed mutations (route handlers are reserved for S2's public,
 * unauthenticated, rate-limited `/api/auth/*` surface). Both sit behind
 * `requireIdentity()`, get Next's server-action CSRF protection for free, and can
 * `revalidatePath` the very page that renders the result. The knowledge token never
 * reaches the browser: it is unsealed from the httpOnly cookie inside the action.
 *
 * NOTE: this file may export ONLY async functions — a `"use server"` module
 * registers EVERY export as a callable server action, so exporting a plain value
 * throws "A 'use server' file can only export async functions" at REQUEST time
 * (typecheck/lint/`next build` all pass; S3 caught it only in a live run). Type
 * exports are fine (erased before the loader sees the module). Each form's initial
 * state therefore lives in its client island.
 *
 * The route is dynamic, so every `revalidatePath` passes the ROUTE PATTERN plus the
 * `"page"` type argument — `revalidatePath("/projects/[projectId]", "page")`.
 * Passing the concrete path would silently revalidate nothing.
 */

/**
 * Both ids ride in as hidden inputs (keeping the plain `(prevState, formData)`
 * action shape), so they are untrusted input and get parsed as UUIDs here.
 *
 * Tampering buys nothing: knowledge scopes every project read to the caller's
 * tenant (`_load_scoped_project` → 404, never 403) and 404s a credential not in the
 * named project, so a forged id can only revoke something the caller already owns,
 * or 404. This validation is a cheap rejection, not the boundary — the boundary is
 * backend-enforced.
 */
const idSchema = z.uuid();

/**
 * `name` is OPTIONAL (unlike a project name) and capped at 200 chars measured
 * BEFORE stripping, exactly as knowledge's pydantic `Field(max_length=200)` runs
 * ahead of its strip validator. A blank/whitespace-only name is NOT an error —
 * knowledge maps it to `null` — so it is normalized to `undefined` below and the
 * body omits the field entirely.
 */
const nameSchema = z.string().max(200).optional();

export interface MintCredentialState {
  /** Display copy for a failure, or `null` on success / first render. */
  error: string | null;
  /**
   * The PLAINTEXT `vk_…` key, present only on the render right after a successful
   * mint.
   *
   * This is the ONE place knowledge data deliberately crosses the server→client
   * boundary (S2/S3's rule is that it never does): knowledge returns the key
   * exactly once and persists only its sha256 hash, so the user MUST see it now or
   * lose it forever. It is never logged, never put in a URL, and never persisted —
   * it lives in the action state, is rendered once, and dies with the next submit
   * or navigation.
   */
  key?: string;
  /** Bumped on each success; the client island keys the show-once modal on it. */
  ok?: number;
}

export interface RevokeCredentialState {
  error: string | null;
  ok?: number;
}

/**
 * `useActionState` action: validate → `POST /app/projects/{id}/credentials` →
 * revalidate. Returns the minted key in the state (see `MintCredentialState.key`).
 *
 * Failures map by HTTP STATUS, never by knowledge's `detail` text. knowledge
 * answers a body-validation failure (name >200 chars) as **422**, not vocky's 400,
 * so both are mapped to `invalidName`.
 */
export async function mintCredentialAction(
  _prevState: MintCredentialState,
  formData: FormData,
): Promise<MintCredentialState> {
  const projectId = idSchema.safeParse(formData.get("projectId"));
  if (!projectId.success) {
    return { error: MINT_CREDENTIAL_ERRORS.generic };
  }

  // Blank/whitespace → `undefined` → an omitted field, which knowledge stores as
  // `null`. Only a too-long name is a real rejection.
  const rawName = formData.get("name");
  const candidate =
    typeof rawName === "string" && rawName.trim() !== "" ? rawName : undefined;
  const name = nameSchema.safeParse(candidate);
  if (!name.success) {
    return { error: MINT_CREDENTIAL_ERRORS.invalidName };
  }

  // OUTSIDE the try on purpose: `requireIdentity()` signals "no session" by calling
  // `redirect()`, which works by THROWING a control-flow error Next must see.
  // Catching it would swallow the redirect and render a bogus error instead of
  // bouncing to /login.
  const { token } = await requireIdentity();

  let minted;
  try {
    minted = await createCredential(token, projectId.data, name.data);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400 || error.status === 422) {
        return { error: MINT_CREDENTIAL_ERRORS.invalidName };
      }
      if (error.status === 401) {
        return { error: MINT_CREDENTIAL_ERRORS.sessionExpired };
      }
      if (error.status === 404) {
        return { error: MINT_CREDENTIAL_ERRORS.notFound };
      }
    }
    return { error: MINT_CREDENTIAL_ERRORS.generic };
  }

  // Re-renders the page (refetching usage + credentials), so the new row appears
  // without client-side list state. The show-once modal survives it: it lives in
  // the action state, not in the server-rendered tree.
  revalidatePath("/projects/[projectId]", "page");
  return { error: null, key: minted.key, ok: Date.now() };
}

/**
 * `useActionState` action: validate → `DELETE /app/projects/{id}/credentials/{cid}`
 * → revalidate. knowledge answers 204 and the credential stays LISTED with a
 * `revoked_at` stamp, so the revalidated render flips the row's status to Revoked
 * rather than dropping it.
 */
export async function revokeCredentialAction(
  _prevState: RevokeCredentialState,
  formData: FormData,
): Promise<RevokeCredentialState> {
  const projectId = idSchema.safeParse(formData.get("projectId"));
  const credentialId = idSchema.safeParse(formData.get("credentialId"));
  if (!projectId.success || !credentialId.success) {
    return { error: REVOKE_CREDENTIAL_ERRORS.invalidRequest };
  }

  // Outside the try — same reason as above.
  const { token } = await requireIdentity();

  try {
    await revokeCredential(token, projectId.data, credentialId.data);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400) {
        return { error: REVOKE_CREDENTIAL_ERRORS.invalidRequest };
      }
      if (error.status === 401) {
        return { error: REVOKE_CREDENTIAL_ERRORS.sessionExpired };
      }
      if (error.status === 404) {
        return { error: REVOKE_CREDENTIAL_ERRORS.notFound };
      }
    }
    return { error: REVOKE_CREDENTIAL_ERRORS.generic };
  }

  revalidatePath("/projects/[projectId]", "page");
  return { error: null, ok: Date.now() };
}
