"use client";

import { useActionState, useId } from "react";

import { appButtonClass, FieldError, Input, Label } from "@/components/ui";
import { DASHBOARD } from "@/content";

import { setOrgSlugAction, type SetOrgSlugState } from "./actions";

/**
 * The form's initial state lives HERE, not in `actions.ts`: that file is
 * `"use server"`, where every export is a callable server action, so exporting a
 * plain object throws at request time. A type-only import is safe.
 */
const INITIAL_STATE: SetOrgSlugState = { error: null };

/**
 * P25.S5 — the public-URL (org slug) island in the dashboard's Public URL panel,
 * following the `visibility-toggle` / mint-form server-action idiom (`useActionState`
 * → `setOrgSlugAction` → `revalidatePath`).
 *
 * ALWAYS VISIBLE, unlike the "New key" / "New project" disclosures: a slug is mutable
 * and its current value is exactly what the operator comes here to see, so it is
 * prefilled (`defaultValue`) rather than hidden behind a trigger. Uncontrolled on
 * purpose — the input keeps whatever was typed across the post-save re-render, which
 * IS the saved value.
 *
 * `maxLength={40}` mirrors knowledge's cap; the rest of the rule (charset, 2-char
 * minimum, the reserved words) is enforced by the action and the backend, which stays
 * authoritative. Nothing here re-derives a pretty URL — the panel above renders it.
 */
export function OrgSlugForm({ defaultValue }: { defaultValue: string }) {
  const copy = DASHBOARD.orgSlug;
  const [state, formAction, pending] = useActionState(
    setOrgSlugAction,
    INITIAL_STATE,
  );

  const baseId = useId();
  const slugId = `${baseId}-slug`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const invalid = state.error !== null;

  return (
    <form action={formAction} className="w-[19rem] max-w-full">
      {/* The panel heading carries the visible label; the input's accessible name
          comes from this sr-only <Label>, as in the mint form. */}
      <Label htmlFor={slugId} className="sr-only">
        {copy.label}
      </Label>
      <div className="flex items-start gap-2">
        <Input
          id={slugId}
          name="slug"
          type="text"
          defaultValue={defaultValue}
          placeholder={copy.placeholder}
          maxLength={40}
          spellCheck={false}
          autoComplete="off"
          disabled={pending}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
        />
        <button
          type="submit"
          className={appButtonClass("primary", "sm")}
          disabled={pending}
        >
          {pending ? copy.submitPendingLabel : copy.submitLabel}
        </button>
      </div>
      <p id={hintId} className="kb-field__hint">
        {copy.hint}
      </p>
      <FieldError id={errorId}>{state.error ?? undefined}</FieldError>
    </form>
  );
}
