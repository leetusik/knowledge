"use client";

import { useActionState, useId, useState } from "react";

import { appButtonClass } from "@/components/ui";
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

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
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
