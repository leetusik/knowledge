"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { DELETE_DOCUMENT_ERRORS } from "@/content";
import { requireIdentity } from "@/lib/auth-guards";
import { deleteDocument } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";

/**
 * P21.S2 — the documents surface's ONLY mutation, as a SERVER ACTION following the
 * rule P12.S3/S4 established for authed writes (route handlers stay reserved for the
 * public, unauthenticated `/api/auth/*` surface). It sits behind `requireIdentity()`,
 * gets Next's server-action CSRF protection for free, and revalidates the very pages
 * that render the result. The knowledge token never reaches the browser: it is
 * unsealed from the httpOnly cookie inside the action.
 *
 * NOTE: this file may export ONLY async functions — a `"use server"` module registers
 * EVERY export as a callable server action, so exporting a plain value throws "A
 * 'use server' file can only export async functions" at REQUEST time (typecheck /
 * lint / `next build` all pass; P12.S3 caught it only in a live run). Type exports are
 * fine (erased before the loader sees the module), so `INITIAL_STATE` lives in the
 * client island.
 *
 * Both revalidated routes are DYNAMIC, so each `revalidatePath` passes the ROUTE
 * PATTERN plus the `"page"` type argument. Passing the concrete path would silently
 * revalidate nothing.
 */

/**
 * The document id rides in as a hidden input (keeping the plain
 * `(prevState, formData)` action shape), so it arrives as a STRING and is coerced
 * here. knowledge's path param is int-typed — a non-integer id is a 422.
 *
 * Tampering buys nothing: the backend scopes the delete to the caller's tenant and
 * answers 404 (never 403) for a missing OR foreign id, so a forged id can only delete
 * something the caller already owns, or 404. This validation is a cheap rejection, not
 * the boundary — the boundary is backend-enforced.
 */
const idSchema = z.coerce.number().int().positive();

/**
 * The ONLY accepted post-delete destination. Validated as a LITERAL, never used as a
 * free-form string: an open redirect is exactly the bug a hidden input invites, and
 * this action has one legitimate destination (the list, for the read page's delete).
 * Anything else — including the list page's omitted input — means "stay put".
 */
const redirectToSchema = z.literal("/documents");

export interface DeleteDocumentState {
  /** Display copy for a failure, or `null` on success / first render. */
  error: string | null;
  /** Bumped on each success; only the non-redirecting (list) caller ever sees it. */
  ok?: number;
}

/**
 * `useActionState` action: validate → `DELETE /app/documents/{id}` → revalidate →
 * (optionally) redirect. knowledge answers 204 and the document is GONE — file, row,
 * search index, embeddings — so the revalidated list simply renders without it.
 *
 * Failures map by HTTP STATUS, never by knowledge's `detail` text: 400/422 (a
 * tampered id) → `invalidRequest`, 401 → `sessionExpired`, 404 (already deleted OR
 * another org's — indistinguishable by design) → `notFound`, everything else →
 * `generic`.
 */
export async function deleteDocumentAction(
  _prevState: DeleteDocumentState,
  formData: FormData,
): Promise<DeleteDocumentState> {
  const documentId = idSchema.safeParse(formData.get("documentId"));
  if (!documentId.success) {
    return { error: DELETE_DOCUMENT_ERRORS.invalidRequest };
  }
  // Absent on the list page (stay on the page); `"/documents"` from the read page.
  const redirectTo = redirectToSchema.safeParse(formData.get("redirectTo"));

  // OUTSIDE the try on purpose: `requireIdentity()` signals "no session" by calling
  // `redirect()`, which works by THROWING a control-flow error Next must see.
  // Catching it would swallow the redirect and render a bogus error instead of
  // bouncing to /login.
  const { token } = await requireIdentity();

  try {
    await deleteDocument(token, documentId.data);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 400 || error.status === 422) {
        return { error: DELETE_DOCUMENT_ERRORS.invalidRequest };
      }
      if (error.status === 401) {
        return { error: DELETE_DOCUMENT_ERRORS.sessionExpired };
      }
      if (error.status === 404) {
        return { error: DELETE_DOCUMENT_ERRORS.notFound };
      }
    }
    return { error: DELETE_DOCUMENT_ERRORS.generic };
  }

  // Both surfaces that can render the deleted document: the list (the row must go)
  // and the read page (it would now 404 — for anyone still holding the URL).
  revalidatePath("/documents", "page");
  revalidatePath("/documents/[id]", "page");

  // OUTSIDE the try, and after the revalidations: `redirect()` signals by throwing
  // NEXT_REDIRECT, so a `catch` above would swallow it and render a bogus error.
  // Deleting from the read page must leave it — that URL is now a 404.
  if (redirectTo.success) redirect(redirectTo.data);

  return { error: null, ok: Date.now() };
}
