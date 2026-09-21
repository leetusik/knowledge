"use client";

import { useActionState, useCallback, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Plus } from "lucide-react";

import { AppButton, appButtonClass, FieldError, Input } from "@/components/ui";
import { DASHBOARD } from "@/content";

import { createProjectAction, type CreateProjectState } from "./actions";

/**
 * The form's initial state lives HERE, not in `actions.ts`: that file is
 * `"use server"`, where every export is a callable server action, so a plain object
 * export throws at request time. A type-only import is safe (erased at compile time).
 */
const INITIAL_STATE: CreateProjectState = { error: null };

/**
 * P12.S3 — the create-project affordance in the dashboard header.
 *
 * The action wrapper posts to the server action (`revalidatePath("/dashboard")` on
 * success — the new row + refreshed usage arrive with the server re-render) and, on
 * success, collapses the form. Collapsing inside the action's transition (not a
 * `useEffect`) is the idiomatic React 19 pattern and unmounts the inputs, so there is
 * no field state to reset. `<form action={...}>` also means submit works before
 * hydration.
 *
 * P28.S5 — round 04 §4.4, the ONE disclosure placement the console now uses
 * everywhere. Two consequences shape this file:
 *
 *   - The revealed form is the **next sibling of the head**, not a thing that
 *     replaces the trigger inside it. The head here is the page frame, so this
 *     component now RENDERS the frame and takes its title wrap as `children`: it is
 *     the only way one piece of client state can put the trigger inside the frame
 *     and the form after it. Both come out as direct children of the page's
 *     `.kb-page-flow` (a fragment adds no element).
 *   - The trigger NEVER disappears: it toggles `aria-expanded`, points
 *     `aria-controls` at the form, and closing returns focus to it. Opening moves
 *     focus to the first field.
 *
 * The form wears `.kb-inlineform--framed` — §4.4's variant for a form that hangs off
 * the page frame, where there is no panel around it to supply a surface. Busy is
 * `aria-busy` + a spinner, never `disabled` (§6), so the double-submit guard is an
 * early return in the form's own `onSubmit`.
 */
export function CreateProjectForm({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: CreateProjectState, formData: FormData) => {
      const result = await createProjectAction(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    INITIAL_STATE,
  );

  const copy = DASHBOARD.createProject;
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const errorId = `${baseId}-error`;
  const formId = `${baseId}-form`;

  // §4.4 — focus goes back to the trigger on close. The trigger is always mounted,
  // so a plain ref is enough (unlike the confirm rows, which unmount theirs).
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const invalid = state.error !== null;

  return (
    <>
      {/* Round 03 §4.4 — the shared `.kb-pageframe`; the title wrap arrives as
          `children` and stays server-rendered. */}
      <div className="kb-pageframe">
        {children}
        <div className="kb-pageframe__actions">
          <button
            ref={triggerRef}
            type="button"
            className={appButtonClass("primary")}
            aria-expanded={open}
            aria-controls={formId}
            onClick={() => (open ? close() : setOpen(true))}
          >
            <Plus size={16} aria-hidden />
            {copy.openLabel}
          </button>
        </div>
      </div>

      {open ? (
        <form
          id={formId}
          action={formAction}
          onSubmit={(event) => {
            if (pending) event.preventDefault();
          }}
          className="kb-inlineform kb-inlineform--framed"
        >
          {/* The label is VISIBLE: the form no longer sits beside the page title
              that used to stand in for it, so the input would otherwise carry only
              a placeholder (the `org-slug-form.tsx` precedent from P28.S4). */}
          <label className="kb-field" htmlFor={nameId}>
            <span className="kb-field__label">{copy.nameLabel}</span>
            <Input
              id={nameId}
              name="name"
              type="text"
              placeholder={copy.namePlaceholder}
              maxLength={200}
              required
              autoFocus
              disabled={pending}
              aria-invalid={invalid}
              aria-describedby={invalid ? errorId : undefined}
            />
          </label>
          {/* §4.4 — the error is the field's own always-rendered
              `.kb-field__error` (1.1rem reserved), so arriving at one moves
              nothing. It sits above the actions for that reason. */}
          <FieldError id={errorId}>{state.error ?? undefined}</FieldError>
          <div className="kb-form-actions kb-form-actions--end">
            <AppButton variant="ghost" onClick={close}>
              {copy.cancelLabel}
            </AppButton>
            <AppButton type="submit" variant="primary" busy={pending}>
              {pending ? copy.submitPendingLabel : copy.submitLabel}
            </AppButton>
          </div>
        </form>
      ) : null}
    </>
  );
}
