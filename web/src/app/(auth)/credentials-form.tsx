"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

import { AppButton } from "@/components/ui";
import type { AuthPageCopy } from "@/content";
import { DEFAULT_NEXT_PATH, safeNextPath } from "@/lib/next-path";

/**
 * The shared email+password client island behind BOTH auth forms (P12.S2,
 * re-skinned P12.S2R) — login and signup differ only in their endpoint, copy,
 * autocomplete hint, and status→message mapping, so the submit/error/navigation
 * logic lives here once. `LoginForm` / `SignupForm` are the thin, page-local
 * wrappers that configure it.
 *
 * The flow (UNCHANGED): POST JSON to the same-origin BFF route (which satisfies
 * its `assertSameOrigin` check with no CSRF header needed) → on `res.ok` the
 * server has already sealed the knowledge token into the httpOnly cookie, so we
 * `replace()` to the destination and `refresh()` to re-run the now-authenticated
 * server tree.
 *
 * The response body is never read: the BFF answers a bare status by design, so
 * `errorFor(status)` is the whole error vocabulary. The password never touches a
 * URL and is cleared on failure so a wrong value isn't left staged.
 *
 * P28.S5 — round 04 §4.8. The error is now an ALWAYS-RENDERED
 * `.kb-authcard__error` (empty string when there is none) sitting between the
 * password field and the submit: `min-height: 1.15rem` is reserved for it, so
 * arriving at an error moves nothing, and `role="alert"` on a persistent element
 * means the message is announced when it CHANGES rather than on mount. It is one
 * message for the form, never per field — which is why both inputs carry
 * `aria-invalid` and point `aria-describedby` at it while it stands, and why
 * typing in either one clears the error and both attributes. The submit is
 * full-width `.kb-authcard__submit`, busy via `aria-busy` + the spinner and never
 * `disabled` (§6), so the double-submit guard is the early return in the handler.
 *
 * P28.S5 (D18) — `next`: where a successful sign-in lands. It arrives already
 * laundered from `login/page.tsx` and is laundered AGAIN here before it is handed
 * to `router.replace()`. That is deliberate belt-and-braces on a security
 * boundary: this component is a client island whose props any future caller could
 * set, and `safeNextPath` is cheap and fails closed.
 */
export interface CredentialsFormProps {
  /** BFF endpoint, e.g. `/api/auth/login`. */
  endpoint: string;
  copy: AuthPageCopy;
  /** `current-password` (login) or `new-password` (signup). */
  passwordAutoComplete: "current-password" | "new-password";
  /** Map a non-ok BFF status (or `null` for a network throw) to display copy. */
  errorFor: (status: number | null) => string;
  /**
   * Post-sign-in destination. Omitted (signup) means `/dashboard`; `/login` passes
   * the sanitised `?next=` it was reached with.
   */
  next?: string;
}

export function CredentialsForm({
  endpoint,
  copy,
  passwordAutoComplete,
  errorFor,
  next,
}: CredentialsFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseId = useId();
  const emailId = `${baseId}-email`;
  const passwordId = `${baseId}-password`;
  const errorId = `${baseId}-error`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // §6 — the submit is never `disabled`, so THIS is the double-submit guard.
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        // Cookie is set — leave `pending` true through the navigation.
        router.replace(next ? safeNextPath(next) : DEFAULT_NEXT_PATH);
        router.refresh();
        return;
      }
      setError(errorFor(res.status));
      setPassword("");
      setPending(false);
    } catch {
      setError(errorFor(null));
      setPending(false);
    }
  }

  const invalid = error !== null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="kb-field">
        <label htmlFor={emailId} className="kb-field__label">
          {copy.emailLabel}
        </label>
        <input
          id={emailId}
          type="email"
          name="email"
          value={email}
          placeholder={copy.emailPlaceholder}
          autoComplete="email"
          required
          disabled={pending}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          className="kb-field__input"
        />
      </div>

      <div className="kb-field">
        <label htmlFor={passwordId} className="kb-field__label">
          {copy.passwordLabel}
        </label>
        <input
          id={passwordId}
          type="password"
          name="password"
          value={password}
          placeholder={copy.passwordPlaceholder}
          autoComplete={passwordAutoComplete}
          required
          disabled={pending}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError(null);
          }}
          className="kb-field__input"
        />
        {/* Signup only, and it NEVER carries an error (§4.8). */}
        {copy.passwordHint ? (
          <p className="kb-field__hint">{copy.passwordHint}</p>
        ) : null}
      </div>

      {/* Always rendered, empty string when there is nothing to say. */}
      <p id={errorId} role="alert" className="kb-authcard__error">
        {error ?? ""}
      </p>

      <AppButton
        type="submit"
        variant="primary"
        busy={pending}
        className="kb-authcard__submit"
      >
        {pending ? copy.submitPendingLabel : copy.submitLabel}
      </AppButton>
    </form>
  );
}
