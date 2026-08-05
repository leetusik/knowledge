"use client";

import { useActionState, useId, useState } from "react";

import { appButtonClass } from "@/components/ui";
import { DOCUMENTS } from "@/content";

import { deleteDocumentAction, type DeleteDocumentState } from "./actions";

/** Initial state lives here, not in the `"use server"` file — see `actions.ts`. */
const INITIAL_STATE: DeleteDocumentState = { error: null };

export interface DeleteDocumentButtonProps {
  documentId: number;
  /** For the action's accessible name — every row's label is otherwise "Delete". */
  documentTitle: string;
  /**
   * Where to go after a successful delete. The READ page passes `"/documents"` (the
   * page it is on becomes a 404); the LIST page omits it and stays put, letting the
   * revalidated render drop the row. The action re-validates this as a literal, so
   * it can never become an open redirect.
   */
  redirectTo?: "/documents";
}

/**
 * P21.S2 — the shared delete island, rendered per row on the documents list and once
 * on the read page's MEMBER branch (the anonymous branch and `document-view.tsx` stay
 * auth-free and untouched). One island, one action, two surfaces: the only difference
 * is the optional `redirectTo` hidden input.
 *
 * The id rides as a hidden input (keeping the plain `(prevState, formData)` action
 * shape); the token never comes near the browser, and knowledge scopes the delete to
 * the caller's tenant regardless of what is submitted.
 *
 * The delete is HARD and irreversible and unprompted clicks sit one row apart, so it
 * takes a two-step confirm — rendered inline rather than as a `window.confirm`, which
 * is unstyleable and blocks the whole tab (the `RevokeCredentialButton` precedent).
 * On the redirecting (read-page) path a success never renders here at all: the
 * redirect throws before the state comes back. Failures always return first, so the
 * error line below still shows.
 */
export function DeleteDocumentButton({
  documentId,
  documentTitle,
  redirectTo,
}: DeleteDocumentButtonProps) {
  const [state, formAction, pending] = useActionState(
    deleteDocumentAction,
    INITIAL_STATE,
  );

  const copy = DOCUMENTS.delete;
  const errorId = `${useId()}-error`;
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="documentId" value={documentId} />
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}

      {confirming ? (
        <div className="inline-flex items-center gap-2">
          <span className="text-[0.78rem] text-[var(--kb-secondary)]">
            {copy.confirmPrompt}
          </span>
          <button
            type="submit"
            className={appButtonClass("danger", "sm")}
            disabled={pending}
            aria-describedby={state.error ? errorId : undefined}
          >
            {pending ? copy.pendingLabel : copy.confirmLabel}
          </button>
          <button
            type="button"
            className={appButtonClass("ghost", "sm")}
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            {copy.cancelLabel}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={appButtonClass("danger", "sm")}
          onClick={() => setConfirming(true)}
          aria-label={`${copy.ariaLabelPrefix} ${documentTitle}`}
        >
          {copy.label}
        </button>
      )}

      {state.error ? (
        <p
          id={errorId}
          role="alert"
          className="text-[0.72rem] text-[var(--kb-status-revoked-ink)]"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
