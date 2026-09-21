"use client";

import { useActionState, useCallback, useId, useRef, useState } from "react";

import { AppButton, appButtonClass } from "@/components/ui";
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
 *
 * P28.S5 — round 04 §4.7/§6. Three changes, all of them the record's:
 *   - the armed state is the designed `.kb-confirm` (prompt · Cancel · Yes, delete,
 *     in that order), and focus moves to CANCEL, never to the destructive button;
 *   - the wrapper `<form>` loses its `inline-flex`. Round 03's phone rule
 *     `.kb-dtable tr > td:last-child .kb-appbtn { width: 100% }` resolved against
 *     that shrink-wrapped form, so Delete measured 57.7px in a 390 card instead of
 *     spanning it (P28.S2's finding). The RULE is right; the wrapper was wrong;
 *   - busy is `aria-busy` + a spinner and never `disabled` (§6: a disabled control
 *     drops out of the tab order mid-action), so the double-submit guard moves into
 *     the form's own `onSubmit` as an early return on the pending flag.
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

  // Cancelling unmounts the armed row, which would drop focus onto the document.
  // A one-shot flag + a callback ref hands it back to the trigger as it remounts —
  // no `useEffect`, so the repo's `react-hooks/set-state-in-effect` rule is moot.
  const returnFocus = useRef(false);
  const triggerRef = useCallback((node: HTMLButtonElement | null) => {
    if (node && returnFocus.current) {
      returnFocus.current = false;
      node.focus();
    }
  }, []);

  return (
    <form
      action={formAction}
      // §6 — the guard lives here, not on the buttons.
      onSubmit={(event) => {
        if (pending) event.preventDefault();
      }}
      // NOT `inline-flex`: the phone rule that stretches the action cell's button
      // resolves against this element (see the header comment).
      className="w-full"
    >
      <input type="hidden" name="documentId" value={documentId} />
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}

      {confirming ? (
        <span className="kb-confirm">
          <span className="kb-confirm__prompt">{copy.confirmPrompt}</span>
          {/* §6: focus lands on Cancel, not on the destructive button. */}
          <AppButton
            autoFocus
            variant="ghost"
            size="sm"
            onClick={() => {
              returnFocus.current = true;
              setConfirming(false);
            }}
          >
            {copy.cancelLabel}
          </AppButton>
          <AppButton
            type="submit"
            variant="danger"
            size="sm"
            busy={pending}
            aria-describedby={state.error ? errorId : undefined}
          >
            {pending ? copy.pendingLabel : copy.confirmLabel}
          </AppButton>
        </span>
      ) : (
        // A plain `<button>`, not `<AppButton>`: the trigger needs a ref and
        // never needs a busy state (it submits nothing).
        <button
          ref={triggerRef}
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
          className="mt-1 text-[0.72rem] text-[var(--kb-status-revoked-ink)]"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
