import { READER } from "@/content";
import { REVIEW } from "@/content/review";
import { schemeFor, type ReaderSettings } from "@/lib/reader-cookie";
import { LIBRARY_HREF } from "@/lib/reader-href";

import { CardSkeleton } from "./skeleton";

import "@/app/reader-fonts.css";
import "@/app/reader.css";
import "@/app/review.css";

/**
 * P30.S24 — the review frame without its island (`08-review` §6, Loading and Failed): the
 * progress line, the top bar (the logo and "‹ Library"; Settings and Display wait for the
 * page) and the header over a body the caller passes. Used by `loading.tsx` and `error.tsx`.
 * A server component with NO client import on purpose: Next emits the `<script>` of every
 * client chunk a loading file reaches without the nonce, and `next/link` is one, so the bar's
 * links are plain anchors (`topics/notes-later.md` → *The book page as shipped*).
 */
export function ReviewStatic({
  settings,
  loading,
  children,
}: {
  settings: ReaderSettings;
  /** Show the counts' skeleton (the header while the queue loads). */
  loading: boolean;
  children?: React.ReactNode;
}) {
  const H = REVIEW.head;
  return (
    <div
      className={`rd-root rd-size-${settings.size}`}
      data-md-color-scheme={schemeFor(settings.theme)}
      data-theme-choice={settings.theme}
      lang="en"
    >
      <div className="rd-in">
        <div className="rd-line" aria-hidden="true">
          <span className="rd-line__fill" style={{ width: "0%" }} />
        </div>
        <header className="rd-top">
          <div className="rd-top__start">
            <a
              className="rd-logo"
              href={LIBRARY_HREF}
              aria-label={READER.top.logoLabel}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a static 22px mark */}
              <img src="/logo.svg" alt="" width={22} height={22} />
            </a>
            <a className="rd-back" href={LIBRARY_HREF}>
              <span className="rd-back__chev" aria-hidden="true">
                ‹
              </span>
              <span className="rd-back__long">{REVIEW.top.library}</span>
              <span className="rd-back__short">{REVIEW.top.library}</span>
            </a>
          </div>
          <div className="rd-top__end" />
        </header>
        <main
          className="rd-page rd-flow rv-page"
          id="main-content"
          aria-busy={loading ? "true" : undefined}
        >
          <header className="rv-head">
            <h1 className="rv-head__title">{H.title}</h1>
            <div className="rv-head__row">
              <div className="rv-head__counts">
                {loading ? (
                  <span
                    className="rd-skel rv-count__sk"
                    role="status"
                    aria-label={H.loadingLabel}
                  />
                ) : null}
              </div>
              <button type="button" className="rd-tbtn rv-bybook" disabled>
                {H.byBook}
              </button>
            </div>
            <p className="rv-saved is-off" role="status">
              <b>{H.saved}</b> ·
            </p>
          </header>
          {loading ? <CardSkeleton /> : children}
        </main>
      </div>
    </div>
  );
}
