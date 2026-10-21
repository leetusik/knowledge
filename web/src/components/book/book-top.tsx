import type { ReactNode } from "react";

import { BOOK } from "@/content/book";
import { READER } from "@/content";

/**
 * The book page's top bar (`07-book-page` §1, `BookTop`, board 05): sticky, the reader's
 * logo and "‹ Library" at every width, the book's title over its progress once the head
 * has scrolled under the bar (`TopMid`, the one client part), and "Sign in" signed out (at
 * every width: a book page has no chapter end to carry it).
 *
 * A server component with NO client import on purpose: the loading state draws this bar too,
 * and Next emits the `<script>` of every client chunk a `loading.tsx` reaches without the
 * reader routes' nonce (a CSP violation in the console); that includes `next/link`'s own chunk, so
 * this bar uses plain anchors (a full load to the library or sign-in, which is all a click there needs). The page hands the middle in as `mid`
 * (`TopMid`); a state (loading, not found, failed) passes none, so the bar has no middle.
 */
export function BookTop({
  libraryHref,
  signInHref,
  mid,
}: {
  libraryHref: string;
  /** Signed out only. */
  signInHref?: string | null;
  /** The scroll-watched middle (`TopMid`); absent in a state. */
  mid?: ReactNode;
}) {
  return (
    <div className="bk-topwrap">
      <header className="bk-top">
        <div className="bk-top__start">
          <a
            className="rd-logo"
            href={libraryHref}
            aria-label={READER.top.logoLabel}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a static 22px mark */}
            <img src="/logo.svg" alt="" width={22} height={22} />
          </a>
          <a className="rd-back" href={libraryHref}>
            <span className="rd-back__chev" aria-hidden="true">
              ‹
            </span>
            <span className="rd-back__long">{BOOK.top.library}</span>
            <span className="rd-back__short">{BOOK.top.library}</span>
          </a>
        </div>
        {mid ?? (
          <div className="bk-top__mid" data-on="false" aria-hidden="true" />
        )}
        <div className="bk-top__end">
          {signInHref ? (
            <a className="rd-tbtn rd-tbtn--signin" href={signInHref}>
              {BOOK.top.signIn}
            </a>
          ) : null}
        </div>
      </header>
    </div>
  );
}
