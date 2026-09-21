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
 * state to keep in sync. Composition only: an `AppButton` + the existing
 * `FieldError`, no new chrome.
 *
 * Round 04 §4.5 changes two things about it, and they are linked.
 *
 * **Busy, not disabled.** The in-flight state is round 03 §4.9's affordance —
 * `aria-busy="true"` + the leading `.kb-appbtn__spin` ring + the present-participle
 * label — and `busy` deliberately does NOT set `disabled`, because a disabled button
 * drops out of the tab order mid-action and throws focus to the document. So the
 * double-submit guard moves OUT of the DOM and into the form's own handler: an early
 * `preventDefault()` while `pending`. Without that move, removing `disabled` would
 * have left the form genuinely unguarded.
 *
 * **It is a cell of the page frame's status column now.** §4.5 puts the chip, this
 * toggle and the state hint in one `.kb-pageframe__status`, which below 40rem of
 * `kbmain` becomes a single full-width row — chip left, toggle taking the rest. That
 * rule reaches a direct child (`.kb-pageframe__status > .kb-appbtn`), and this
 * island's button is one level deeper inside its own `<form>`, so the two container
 * utilities below hand the same growth to the form and then to the button. They only
 * ADD properties the `.kb-*` classes never set (`.kb-appbtn` declares no `width` and
 * no `flex`), which is the one way markup may compose with the unlayered record
 * sheets; nothing is overridden and no rule was written.
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
    <form
      action={formAction}
      onSubmit={(event) => {
        if (pending) event.preventDefault();
      }}
      className="flex flex-col items-end gap-[0.3rem] @max-[40rem]:flex-auto"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="visibility" value={target} />
      <AppButton
        type="submit"
        variant="secondary"
        busy={pending}
        className="@max-[40rem]:w-full"
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
