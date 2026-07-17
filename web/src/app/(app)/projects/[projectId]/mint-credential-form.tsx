"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Plus } from "lucide-react";

import { AppButton, appButtonClass, FieldError, Input, Label } from "@/components/ui";
import { PROJECT } from "@/content";

import { mintCredentialAction, type MintCredentialState } from "./actions";

/**
 * The form's initial state lives HERE, not in `actions.ts`: that file is
 * `"use server"`, where every export is a callable server action, so exporting a
 * plain object throws at request time. A type-only import is safe.
 */
const INITIAL_STATE: MintCredentialState = { error: null };

export interface MintCredentialFormProps {
  projectId: string;
}

/**
 * P12.S4 — the mint-credential island, and the app's only handler of a plaintext
 * secret. It renders the panel-head disclosure (the S3 create-project pattern): a
 * "New key" button that toggles a compact inline form. On a successful mint the
 * form collapses and the show-once `<ShowOnceKey>` modal reveals the plaintext key.
 *
 * The minted `vk_` key arrives in the ACTION STATE — the ONE sanctioned server→
 * client crossing (knowledge returns it exactly once and stores only its hash, so
 * the user copies it now or loses it forever). Keeping it in the action state
 * (never the server-rendered tree) is what makes it survive `revalidatePath`'s
 * re-render and vanish on the next submit or navigation, with no persistence.
 */
export function MintCredentialForm({ projectId }: MintCredentialFormProps) {
  const copy = PROJECT.mint;
  const [open, setOpen] = useState(false);

  // Collapse the inline form on a successful mint, inside the action transition
  // (not a `useEffect` — the repo's eslint `react-hooks/set-state-in-effect`
  // forbids setState in effects). The modal stays up: it keys off the action state.
  const [state, formAction, pending] = useActionState(
    async (prev: MintCredentialState, formData: FormData) => {
      const result = await mintCredentialAction(prev, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    INITIAL_STATE,
  );

  const baseId = useId();
  const nameId = `${baseId}-name`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;

  // Dismissal is keyed by the `ok` stamp of the modal that was dismissed, NOT a
  // boolean: a plain `dismissed` flag would stay true and swallow the NEXT minted
  // key — the one case where a silent miss is unrecoverable.
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

  return (
    <>
      {open ? (
        <form action={formAction} className="w-[19rem] max-w-full">
          <Label htmlFor={nameId} className="sr-only">
            {copy.nameLabel}
          </Label>
          {/* No `required`: knowledge defaults an omitted name to `null`, so an
              unnamed key is a legitimate, first-class case. */}
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
          <p id={hintId} className="kb-field__hint">
            {copy.nameHint}
          </p>
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
      ) : (
        <button
          ref={triggerRef}
          type="button"
          className={appButtonClass("primary")}
          onClick={() => setOpen(true)}
        >
          <Plus size={16} aria-hidden />
          {copy.newKeyLabel}
        </button>
      )}

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
 * The show-once reveal — the only render of the plaintext key that will ever
 * happen. Built as a real viewport modal (a `document.body` portal with a
 * FIXED-position overlay overriding the specimen's `position:absolute`, so it
 * centers over the viewport, not the panel), with the a11y an inline card would not
 * need: `role="dialog"` + `aria-modal`, a focus trap, Escape-to-dismiss, and focus
 * return to the trigger. The key is selectable mono text plus a clipboard button —
 * and the amber caution copy, because dismissing this modal destroys the key.
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
  const copy = PROJECT.keyPanel;
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const warnId = useId();

  // Move focus into the dialog on mount; restore it to the trigger on unmount. The
  // trigger is captured at mount (the modal only mounts once the mint collapses the
  // form, so the "New key" button is committed in the same pass) — reading the ref
  // in the cleanup would trip `react-hooks/exhaustive-deps`, and the node is stable.
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
  // focus within the dialog's focusable elements. No setState here (DOM only), so
  // the `react-hooks/set-state-in-effect` rule is not tripped.
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
    <div
      className="kb-reveal-overlay"
      // Override the specimen's `position:absolute` so the modal centers over the
      // viewport (an inline style beats the unlayered `.kb-*` rule).
      style={{ position: "fixed", zIndex: 50 }}
    >
      <div
        ref={dialogRef}
        className="kb-reveal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={warnId}
      >
        <h4 id={titleId} className="kb-reveal__title">
          {copy.heading}
        </h4>
        <p id={warnId} className="kb-reveal__warn">
          <span className="kb-status__dot" aria-hidden />
          <span>{copy.warning}</span>
        </p>

        <div className="kb-reveal__key">
          <code aria-label={copy.keyLabel} className="kb-reveal__code select-all">
            {value}
          </code>
        </div>

        <div className="kb-reveal__actions">
          <AppButton
            data-autofocus
            variant="primary"
            size="sm"
            onClick={handleCopy}
          >
            {copied ? copy.copiedLabel : copy.copyLabel}
          </AppButton>
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
    </div>,
    document.body,
  );
}
