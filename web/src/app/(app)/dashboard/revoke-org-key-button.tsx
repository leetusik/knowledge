"use client";

import { useActionState, useCallback, useId, useRef, useState } from "react";

import { AppButton, appButtonClass } from "@/components/ui";
import { DASHBOARD } from "@/content";

import {
  revokeOrgCredentialAction,
  type RevokeOrgCredentialState,
} from "./actions";

/** Initial state lives here, not in the `"use server"` file — see `actions.ts`. */
const INITIAL_STATE: RevokeOrgCredentialState = { error: null };

export interface RevokeOrgKeyButtonProps {
  credentialId: string;
  /** For the action's accessible name — `name ?? token_prefix`, never the key. */
  credentialLabel: string;
}

/**
 * P18.S3 — the per-row org-key revoke island, a page-local copy of the project
 * `RevokeCredentialButton` minus the `projectId` hidden input (an org key is revoked
 * by id alone, `DELETE /app/credentials/{cid}`). The `credentialId` rides as a hidden
 * input; the action re-validates it and knowledge scopes the whole thing to the
 * caller's tenant regardless.
 *
 * Revoke is irreversible and unprompted clicks sit one row apart, so it takes a
 * two-step confirm — rendered inline rather than as a `window.confirm`, which is
 * unstyleable and blocks the whole tab. The trigger uses the DESIGNED terracotta
 * `.kb-appbtn--danger` variant.
 *
 * P28.S5 — round 04 §4.7/§6: the armed state is the designed `.kb-confirm`
 * (prompt · Cancel · Revoke, in that order) with focus landing on CANCEL, the
 * wrapper `<form>` drops its `inline-flex` so round 03's phone rule can stretch the
 * trigger across a 390 card, and busy is `aria-busy` + a spinner rather than
 * `disabled` — so the double-submit guard moves into the form's own `onSubmit`.
 */
export function RevokeOrgKeyButton({
  credentialId,
  credentialLabel,
}: RevokeOrgKeyButtonProps) {
  const [state, formAction, pending] = useActionState(
    revokeOrgCredentialAction,
    INITIAL_STATE,
  );

  const copy = DASHBOARD.orgKeys.revoke;
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
      // NOT `inline-flex`: round 03's `.kb-dtable tr > td:last-child .kb-appbtn
      // { width: 100% }` resolves against THIS element in a stacked phone card.
      className="w-full"
    >
      <input type="hidden" name="credentialId" value={credentialId} />

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
        // A plain `<button>`, not `<AppButton>`: the trigger needs a ref and never
        // needs a busy state (it submits nothing).
        <button
          ref={triggerRef}
          type="button"
          className={appButtonClass("danger", "sm")}
          onClick={() => setConfirming(true)}
          aria-label={`${copy.ariaLabelPrefix} ${credentialLabel}`}
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
