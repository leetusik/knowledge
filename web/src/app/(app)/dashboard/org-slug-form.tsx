"use client";

import { useActionState, useId } from "react";

import { AppButton, FieldError, Input } from "@/components/ui";
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
 * Round 04 §4.3 is what shapes it now, and it is a real change of placement: because
 * the field is always visible it CANNOT sit in the panel head beside the lead, so it
 * is a `.kb-fieldrow` ROW under the head at every width — field and Save side by side
 * above 40rem of `kbmain`, stacked with a full-width 44px Save below it. The label is
 * **visible**, not `sr-only`: on a phone the panel heading is two lines above the
 * input and cannot act as its label. The hint moves from `.kb-field__hint` to
 * `.kb-hintline` (§3: mono, hint-grey, and NOT uppercased — it is a sentence).
 *
 * The `<form>` is a transparent wrapper: `.kb-fieldrow`'s rules are direct-child
 * selectors (`> .kb-field`, `> .kb-appbtn`), so the row element has to be the flex
 * parent of exactly those two, with the hint and the error as siblings BELOW the row
 * rather than cells inside it.
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
    // §6 — a busy control is `aria-busy`, NEVER `disabled`: a disabled button drops
    // out of the tab order mid-action and moves focus to the document. The
    // double-submit guard therefore lives here, on the form, as an early return on
    // the pending flag rather than as a DOM attribute.
    <form
      action={formAction}
      onSubmit={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      <div className="kb-fieldrow">
        <label className="kb-field" htmlFor={slugId}>
          <span className="kb-field__label">{copy.label}</span>
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
        </label>
        <AppButton type="submit" variant="secondary" busy={pending}>
          {pending ? copy.submitPendingLabel : copy.submitLabel}
        </AppButton>
      </div>
      <p id={hintId} className="kb-hintline">
        {copy.hint}
      </p>
      <FieldError id={errorId}>{state.error ?? undefined}</FieldError>
    </form>
  );
}
