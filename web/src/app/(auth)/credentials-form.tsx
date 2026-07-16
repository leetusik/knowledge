"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { AuthPageCopy } from "@/content";

/**
 * The shared email+password client island behind BOTH auth forms (P12.S2) — login
 * and signup differ only in their endpoint, copy, autocomplete hint, and
 * status→message mapping, so the submit/error/navigation logic lives here once
 * rather than being duplicated across two near-identical forms. `LoginForm` /
 * `SignupForm` are the thin, page-local wrappers that configure it.
 *
 * The flow: POST JSON to the same-origin BFF route (which satisfies its
 * `assertSameOrigin` check with no CSRF header needed) → on `res.ok` the server has
 * already sealed the knowledge token into the httpOnly cookie, so we `replace()` to
 * the dashboard and `refresh()` to re-run the now-authenticated server tree.
 *
 * The response body is never read: the BFF answers a bare status by design, so
 * `errorFor(status)` is the whole error vocabulary. The password never touches a
 * URL and is cleared on failure so a wrong value isn't left staged.
 *
 * Skinned as hi2vi_web's dark gate: security-mint field labels, dark translucent
 * inputs with a green focus ring, a full-width green submit (hover → security-teal),
 * and a circular-badge error (design operator/login).
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

const fieldClass = (invalid: boolean) =>
  cn(
    "block w-full rounded-md border bg-[rgba(6,21,18,0.55)] px-3.5 py-[13px] text-body-md text-on-dark transition outline-none placeholder:text-[#5f7d72] focus:border-green-deep focus:shadow-[0_0_0_3px_rgba(0,182,106,0.28)] disabled:opacity-70",
    invalid
      ? "border-[rgba(212,80,60,0.6)] shadow-[0_0_0_3px_rgba(212,80,60,0.16)]"
      : "border-hairline-dark",
  );

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
  const labelClass =
    "mb-2 block text-caption font-bold tracking-[0.2px] text-security-mint";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor={emailId} className={labelClass}>
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
          className={fieldClass(invalid)}
        />
      </div>

      <div>
        <label htmlFor={passwordId} className={labelClass}>
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
          className={fieldClass(invalid)}
        />
        {copy.passwordHint ? (
          <p className="mt-2 text-[11px] leading-normal text-on-dark-muted">
            {copy.passwordHint}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-green px-4 py-[14px] text-button-md font-bold text-on-primary transition hover:bg-security-teal disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? copy.submitPendingLabel : copy.submitLabel}
      </button>

      {invalid ? (
        <div
          id={errorId}
          role="alert"
          className="mt-3.5 flex items-start gap-[9px] rounded-md border border-[rgba(212,80,60,0.36)] bg-[rgba(212,80,60,0.14)] px-3 py-2.5 text-caption leading-normal text-[#f2b8ac]"
        >
          <span className="mt-px grid h-[18px] w-[18px] flex-none place-items-center rounded-full bg-danger text-[11px] font-extrabold text-white">
            !
          </span>
          <span>{error}</span>
        </div>
      ) : null}
    </form>
  );
}
