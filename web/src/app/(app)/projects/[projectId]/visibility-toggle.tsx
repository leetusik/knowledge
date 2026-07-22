"use client";

import { useActionState, useId } from "react";

import { Globe, Lock } from "lucide-react";

import { AppButton, FieldError } from "@/components/ui";
import { PROJECT } from "@/content";

import { setProjectVisibilityAction, type SetVisibilityState } from "./actions";

/**
 * The form's initial state lives HERE, not in `actions.ts`: that file is
 * `"use server"`, where every export is a callable server action, so exporting a
 * plain object throws at request time. A type-only import is safe.
 */
const INITIAL_STATE: SetVisibilityState = { error: null };

/**
 * P19 — the project visibility toggle island, beside the header Public/Private
 * badge. It follows the mint/revoke server-action idiom (`useActionState` →
 * `setProjectVisibilityAction` → `revalidatePath`), submitting the INVERSE of the
 * current visibility via hidden inputs. On success the page re-renders with the new
 * `visibility` prop, so the badge + this button's label flip together — no local
 * state to keep in sync. Composition only: an `AppButton` (secondary, sm) + the
 * existing `FieldError`, no new chrome.
 */
export function VisibilityToggle({
  projectId,
  visibility,
}: {
  projectId: string;
  visibility: "private" | "public";
}) {
  const copy = PROJECT.visibility;
  const [state, formAction, pending] = useActionState(
    setProjectVisibilityAction,
    INITIAL_STATE,
  );

  const isPublic = visibility === "public";
  const target = isPublic ? "private" : "public";
  const label = isPublic ? copy.toggle.makePrivate : copy.toggle.makePublic;
  const errorId = useId();

  return (
    <form action={formAction} className="flex flex-col items-end gap-[0.3rem]">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="visibility" value={target} />
      <AppButton
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending}
        aria-describedby={state.error ? errorId : undefined}
      >
        {isPublic ? (
          <Lock size={14} aria-hidden />
        ) : (
          <Globe size={14} aria-hidden />
        )}
        {pending ? copy.toggle.pendingLabel : label}
      </AppButton>
      <FieldError id={errorId}>{state.error ?? undefined}</FieldError>
    </form>
  );
}
