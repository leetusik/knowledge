import { READER } from "@/content";

/**
 * "Sign in to save" (`01-reader` §12, `SignInToSave`, board 15): the one reusable
 * pattern. Wave 2 and 3 jobs reuse it as is, changing only `what`.
 *
 *  - `role="group"`, `aria-label="Sign in to save"`, max-width 30rem, a 1px
 *    `kb-border-strong` outline on the surface; `raised` adds `kb-shadow-raise`;
 *  - the title in Fraunces 1.125rem, the body in 15px secondary;
 *  - a secondary "Sign in" (a link to the existing auth flow, returning to this
 *    chapter, language, version and section) and a quiet "Not now" that closes it.
 *
 * The caller builds `signInHref` with `signInToSaveHref` (`@/lib/reader-href`) from the
 * place the reader is at, so the return address is live.
 */
export function SignInToSave({
  what = READER.save.whats.progress,
  place,
  raised,
  signInHref,
  onDismiss,
}: {
  what?: string;
  place: "chapter" | "document";
  raised?: boolean;
  signInHref: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={raised ? "rd-save rd-save--raised" : "rd-save"}
      role="group"
      aria-label={READER.save.title}
    >
      <p className="rd-save__title">{READER.save.title}</p>
      <p className="rd-save__body">
        {READER.save.body(what)}
        {READER.save.place(place)}
      </p>
      <div className="rd-save__actions">
        <a className="rd-btn rd-btn--secondary" href={signInHref}>
          {READER.save.signIn}
        </a>
        <button
          type="button"
          className="rd-btn rd-btn--quiet"
          onClick={onDismiss}
        >
          {READER.save.notNow}
        </button>
      </div>
    </div>
  );
}
