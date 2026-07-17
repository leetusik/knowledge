"use client";

import { useActionState, useId, useState } from "react";

import { Plus } from "lucide-react";

import { appButtonClass, FieldError, Input, Label } from "@/components/ui";
import { DASHBOARD } from "@/content";

import { createProjectAction, type CreateProjectState } from "./actions";

/**
 * The form's initial state lives HERE, not in `actions.ts`: that file is
 * `"use server"`, where every export is a callable server action, so a plain object
 * export throws at request time. A type-only import is safe (erased at compile time).
 */
const INITIAL_STATE: CreateProjectState = { error: null };

/**
 * P12.S3 — the create-project affordance in the dashboard header (`.mainhead`).
 *
 * The design shows a primary "New project" button, not vocky's always-visible inline
 * form. This is the ONLY client component on the dashboard (everything else is
 * server-rendered, so no knowledge data crosses a client boundary). The button
 * toggles a small inline create form built from the DESIGNED `.kb-field` +
 * `.kb-appbtn--primary` classes — no invented modal look (the create form's exact
 * appearance is the one spot the design specimen leaves open).
 *
 * The action wrapper posts to the server action (`revalidatePath("/dashboard")` on
 * success — the new row + refreshed usage arrive with the server re-render) and, on
 * success, collapses the form. Collapsing inside the action's transition (not a
 * `useEffect`) is the idiomatic React 19 pattern and unmounts the inputs, so there is
 * no field state to reset. `<form action={...}>` also means submit works before
 * hydration.
 */
export function CreateProjectForm() {
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

  if (!open) {
    return (
      <button
        type="button"
        className={appButtonClass("primary")}
        onClick={() => setOpen(true)}
      >
        <Plus size={16} aria-hidden />
        {copy.openLabel}
      </button>
    );
  }

  const invalid = state.error !== null;

  return (
    <form action={formAction} className="w-[17rem] max-w-full">
      <Label htmlFor={nameId} className="sr-only">
        {copy.nameLabel}
      </Label>
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
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          className={appButtonClass("ghost", "sm")}
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          {copy.cancelLabel}
        </button>
        <button
          type="submit"
          className={appButtonClass("primary", "sm")}
          disabled={pending}
        >
          {pending ? copy.submitPendingLabel : copy.submitLabel}
        </button>
      </div>
      <FieldError id={errorId}>{state.error ?? undefined}</FieldError>
    </form>
  );
}
