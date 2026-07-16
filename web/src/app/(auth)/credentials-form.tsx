"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

import type { AuthPageCopy } from "@/content";

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
 * `replace()` to the dashboard and `refresh()` to re-run the now-authenticated
 * server tree.
 *
 * The response body is never read: the BFF answers a bare status by design, so
 * `errorFor(status)` is the whole error vocabulary. The password never touches a
 * URL and is cleared on failure so a wrong value isn't left staged.
 *
 * Re-skinned to the Knowledge Base console `.kb-field*` + a full-width
 * `.kb-appbtn--primary` submit; the dark `(auth)` `slate` scheme resolves the
 * fields to dark surfaces with a teal focus ring, `aria-invalid` → terracotta.
 */
export interface CredentialsFormProps {
  /** BFF endpoint, e.g. `/api/auth/login`. */
  endpoint: string;
  copy: AuthPageCopy;
  /** `current-password` (login) or `new-password` (signup). */
  passwordAutoComplete: "current-password" | "new-password";
  /** Map a non-ok BFF status (or `null` for a network throw) to display copy. */
  errorFor: (status: number | null) => string;
}

export function CredentialsForm({
  endpoint,
  copy,
  passwordAutoComplete,
  errorFor,
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
        router.replace("/dashboard");
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
        {copy.passwordHint ? (
          <p className="kb-field__hint">{copy.passwordHint}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="kb-appbtn kb-appbtn--primary"
        style={{ width: "100%", marginTop: "1.2rem" }}
      >
        {pending ? copy.submitPendingLabel : copy.submitLabel}
      </button>

      {invalid ? (
        <p id={errorId} role="alert" className="kb-field__error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
