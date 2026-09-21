"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { Plus } from "lucide-react";

import { AppButton, appButtonClass, FieldError, Input } from "@/components/ui";
import { DASHBOARD } from "@/content";

import {
  mintOrgCredentialAction,
  type MintOrgCredentialState,
} from "./actions";

/**
 * The form's initial state lives HERE, not in `actions.ts`: that file is
 * `"use server"`, where every export is a callable server action, so exporting a
 * plain object throws at request time. A type-only import is safe.
 */
const INITIAL_STATE: MintOrgCredentialState = { error: null };

/**
 * P18.S3 — the org-level mint island, a page-local copy of the project
 * `MintCredentialForm` (established pattern: page-local copies, not a shared
 * abstraction) minus the `projectId` hidden input — an org key targets the caller's
 * tenant. It renders the panel-head disclosure (a "New key" button toggling a compact
 * inline form); on a successful mint the form collapses and the show-once
 * `<ShowOnceKey>` modal reveals the plaintext key.
 *
 * The minted `vk_` key arrives in the ACTION STATE — the ONE sanctioned server→client
 * crossing (knowledge returns it exactly once and stores only its hash, so the user
 * copies it now or loses it forever). Keeping it in the action state (never the
 * server-rendered tree) is what makes it survive `revalidatePath`'s re-render and
 * vanish on the next submit or navigation, with no persistence.
 *
 * P28.S5 — round 04 §4.4, the ONE disclosure placement. The revealed form is the
 * **next sibling of the head**, not a thing that replaces the trigger inside it, so
 * this component now RENDERS the panel head and takes its `.kb-panel__headmain`
 * as `children`: that is the only way one piece of client state can put the trigger
 * in the head and the form after it. Both come out as children of the panel (a
 * fragment adds no element), and the heading + lead stay server-rendered.
 *
 * The trigger NEVER disappears — it toggles `aria-expanded`, points `aria-controls`
 * at the form, and closing hands focus back to it while opening moves focus to the
 * first field. Busy is `aria-busy` + a spinner and never `disabled` (§6), so the
 * double-submit guard is an early return in the form's own `onSubmit`.
 */
export function MintOrgKeyForm({ children }: { children: ReactNode }) {
  const copy = DASHBOARD.orgKeys.mint;
  const [open, setOpen] = useState(false);

  // Collapse the inline form on a successful mint, inside the action transition (not
  // a `useEffect` — the repo's eslint `react-hooks/set-state-in-effect` forbids
  // setState in effects). The modal stays up: it keys off the action state.
  const [state, formAction, pending] = useActionState(
    async (prev: MintOrgCredentialState, formData: FormData) => {
      const result = await mintOrgCredentialAction(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    INITIAL_STATE,
  );

  const baseId = useId();
  const nameId = `${baseId}-name`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const formId = `${baseId}-form`;

  // Dismissal is keyed by the `ok` stamp of the modal that was dismissed, NOT a
  // boolean: a plain `dismissed` flag would stay true and swallow the NEXT minted key
  // — the one case where a silent miss is unrecoverable.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const handleDismiss = useCallback(
    () => setDismissedAt(state.ok ?? null),
    [state.ok],
  );

  // The "New key" trigger receives focus back when the modal closes (it is always
  // rendered while the modal is up — a successful mint collapses the form).
  const triggerRef = useRef<HTMLButtonElement>(null);

  const invalid = state.error !== null;
  const showKey =
    state.key !== undefined && state.ok !== undefined && state.ok !== dismissedAt;

  // §4.4 — focus goes back to the trigger on close. The trigger is always mounted
  // now (it never disappears), so a plain ref is enough.
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  return (
    <>
      {/* §4.3/§4.5 — the panel head: heading + lead (server-rendered, arriving as
          `children`) and the disclosure TRIGGER. */}
      <div className="kb-panel__head kb-panel__head--start">
        {children}
        <button
          ref={triggerRef}
          type="button"
          className={appButtonClass("secondary")}
          aria-expanded={open}
          aria-controls={formId}
          onClick={() => (open ? close() : setOpen(true))}
        >
          <Plus size={16} aria-hidden />
          {copy.newKeyLabel}
        </button>
      </div>

      {open ? (
        <form
          id={formId}
          action={formAction}
          onSubmit={(event) => {
            if (pending) event.preventDefault();
          }}
          className="kb-inlineform"
        >
          {/* The label is VISIBLE: the form no longer sits inside the head beside
              the heading that used to stand in for it (the `org-slug-form.tsx`
              precedent from P28.S4). */}
          <label className="kb-field" htmlFor={nameId}>
            <span className="kb-field__label">{copy.nameLabel}</span>
            {/* No `required`: knowledge defaults an omitted name to `null`, so
                an unnamed key is a legitimate, first-class case. */}
            <Input
              id={nameId}
              name="name"
              type="text"
              placeholder={copy.namePlaceholder}
              maxLength={200}
              autoFocus
              disabled={pending}
              aria-invalid={invalid}
              aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
            />
          </label>
          <p id={hintId} className="kb-field__hint">
            {copy.nameHint}
          </p>
          {/* §4.4 — the field's own always-rendered `.kb-field__error` (1.1rem
              reserved), so arriving at an error moves nothing. */}
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

      {showKey && state.key !== undefined ? (
        <ShowOnceKey
          value={state.key}
          onDismiss={handleDismiss}
          returnFocusTo={triggerRef}
        />
      ) : null}
    </>
  );
}

/**
 * The show-once reveal — the only render of the plaintext key that will ever happen.
 * A page-local copy of the project form's `ShowOnceKey` (same modal, org copy): a
 * `document.body` portal with a FIXED-position overlay overriding the specimen's
 * `position:absolute` so it centers over the viewport, plus `role="dialog"` +
 * `aria-modal`, a focus trap, Escape-to-dismiss, and focus return to the trigger. The
 * key is selectable mono text plus a clipboard button, with amber caution copy —
 * dismissing this modal destroys the key.
 *
 * The plaintext key is NEVER logged (not even in the clipboard-copy catch), cached,
 * persisted, or placed in a URL/storage — it lives only in this render.
 */
function ShowOnceKey({
  value,
  onDismiss,
  returnFocusTo,
}: {
  value: string;
  onDismiss: () => void;
  returnFocusTo: React.RefObject<HTMLButtonElement | null>;
}) {
  const copy = DASHBOARD.orgKeys.keyPanel;
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const warnId = useId();

  // Move focus into the dialog on mount; restore it to the trigger on unmount. The
  // trigger is captured at mount (the modal only mounts once the mint collapses the
  // form, so the "New key" button is committed in the same pass).
  useEffect(() => {
    const restore = returnFocusTo.current;
    const target =
      dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      dialogRef.current;
    target?.focus();
    return () => {
      restore?.focus();
    };
  }, [returnFocusTo]);

  // Escape-to-dismiss + a focus trap: capture Tab at the document level and cycle
  // focus within the dialog's focusable elements. No setState here (DOM only), so the
  // `react-hooks/set-state-in-effect` rule is not tripped.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const dialog = dialogRef.current;
      if (!dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onDismiss();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [onDismiss]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      // Clipboard access can be denied (insecure origin, permissions). The key is
      // selectable text either way, so we say so — and NEVER log the value.
      setCopyFailed(true);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    // P28.S5 — the portal root, and the one piece of this modal that is NOT the
    // record's markup. It exists because round 04 §4.4's phone sheet and round
    // 03's `column-reverse` are both written `@container kbapp (width < 40rem)`,
    // and this dialog portals to `<body>`, OUTSIDE `.kb-app` — so neither rule
    // could ever match and the sheet would never appear. Portalling INTO
    // `.kb-app` is not the fix: a container is a containing block for its
    // `position: fixed` descendants, so the overlay would pin to the document
    // instead of the screen (the same trap that keeps `.kb-toast-region` a
    // sibling of `.kb-app` — see `app-shell.tsx`).
    //
    // So the wrapper does both jobs: it is the fixed, screen-sized box, and it
    // re-declares `kbapp` at the VIEWPORT's inline size, which on a phone is the
    // app's width anyway. `.kb-reveal-overlay` then keeps the record's own
    // `position: absolute; inset: 0` — the P12-era inline override on it is gone.
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        containerName: "kbapp",
        containerType: "inline-size",
      }}
    >
      <div className="kb-reveal-overlay">
        <div
          ref={dialogRef}
          className="kb-reveal kb-reveal-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={warnId}
        >
          <h2 id={titleId} className="kb-reveal__title">
            {copy.heading}
          </h2>
          <p id={warnId} className="kb-reveal__warn">
            <span className="kb-status__dot" aria-hidden />
            <span>{copy.warning}</span>
          </p>

          {/* §4.4 — Copy sits INSIDE the key block, beside the code. Below 40rem
              that block stacks and Copy goes full width beneath it (the
              `.kb-reveal__key .kb-appbtn { width: 100% }` phone rule, which had
              nothing to match while Copy lived in the actions row). */}
          <div className="kb-reveal__key">
            <code aria-label={copy.keyLabel} className="kb-reveal__code select-all">
              {value}
            </code>
            <AppButton
              data-autofocus
              variant="secondary"
              size="sm"
              onClick={handleCopy}
            >
              {copied ? copy.copiedLabel : copy.copyLabel}
            </AppButton>
          </div>

          <div className="kb-reveal__actions">
            <AppButton variant="ghost" size="sm" onClick={onDismiss}>
              {copy.dismissLabel}
            </AppButton>
          </div>

          {copyFailed ? (
            <p
              role="alert"
              className="mt-[0.6rem] text-[0.82rem] text-[var(--kb-status-revoked-ink)]"
            >
              {copy.copyFailedLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
