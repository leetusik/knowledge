"use client";

import { useActionState, useId, useState } from "react";

import { appButtonClass } from "@/components/ui";
import { PROJECT } from "@/content";

import {
  revokeCredentialAction,
  type RevokeCredentialState,
} from "./actions";

/** Initial state lives here, not in the `"use server"` file — see `actions.ts`. */
const INITIAL_STATE: RevokeCredentialState = { error: null };

export interface RevokeCredentialButtonProps {
  projectId: string;
  credentialId: string;
  /** For the action's accessible name — `name ?? token_prefix`, never the key. */
  credentialLabel: string;
}

/**
 * P12.S4 — the per-row revoke island.
 *
 * Both ids ride as hidden inputs (keeping the plain `(prevState, formData)` action
 * shape); the action re-validates them and knowledge scopes the whole thing to the
 * caller's tenant regardless.
 *
 * Revoke is irreversible and unprompted clicks sit one row apart, so it takes a
 * two-step confirm — rendered inline rather than as a `window.confirm`, which is
 * unstyleable and blocks the whole tab. The trigger uses the DESIGNED terracotta
 * `.kb-appbtn--danger` variant (knowledge HAS it, unlike vocky).
 */
export function RevokeCredentialButton({
  projectId,
  credentialId,
  credentialLabel,
}: RevokeCredentialButtonProps) {
  const [state, formAction, pending] = useActionState(
    revokeCredentialAction,
    INITIAL_STATE,
  );

  const copy = PROJECT.revoke;
  const errorId = `${useId()}-error`;
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="credentialId" value={credentialId} />

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
          aria-label={`${copy.ariaLabelPrefix} ${credentialLabel}`}
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
