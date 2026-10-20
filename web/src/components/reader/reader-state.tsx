import Link from "next/link";

import { READER } from "@/content";
import { LIBRARY_HREF } from "@/lib/reader-href";

/**
 * Loading, not found, failed (`01-reader` §16, `ReaderState`, board 18). The line and
 * the top bar stay in every state (the frame draws them); the chapter bar appears only
 * once the chapter is ready. Server-safe: only "Try again" needs a handler, passed in.
 *
 *  - Loading: `role="status"`, aria-label "Loading…", a skeleton mirroring the chapter
 *    opening at that width, with a sheen moving across (still under reduced motion);
 *  - Not found: a missing chapter and one private to this reader are the SAME state;
 *  - Failed: "Error · 500", the primary "Try again" and "ref · <request id>".
 */
export function ReaderStateBlock({
  kind,
  noun = "chapter",
  reference,
  onRetry,
}: {
  kind: "loading" | "notfound" | "failed";
  noun?: "chapter" | "document";
  /** The request id, when the failure has one. */
  reference?: string | null;
  onRetry?: () => void;
}) {
  const s = READER.states;
  return (
    <div className="rd-flow">
      {kind === "loading" ? (
        <div className="rd-sk" role="status" aria-label={s.loadingLabel}>
          <span className="rd-skel rd-sk__book" />
          <span className="rd-skel rd-sk__title" />
          <span className="rd-skel rd-sk__title2" />
          <span className="rd-skel rd-sk__lede" />
          <span className="rd-skel rd-sk__lede rd-sk__lede2" />
          <span className="rd-skel rd-sk__meta" />
          <div className="rd-sk__toc">
            <span className="rd-skel rd-sk__tocline rd-sk__w60" />
            <span className="rd-skel rd-sk__tocline rd-sk__w45" />
            <span className="rd-skel rd-sk__tocline rd-sk__w55" />
            <span className="rd-skel rd-sk__tocline rd-sk__w40" />
          </div>
          <span className="rd-skel rd-sk__h2" />
          <span className="rd-skel rd-sk__line rd-sk__w100" />
          <span className="rd-skel rd-sk__line rd-sk__w95" />
          <span className="rd-skel rd-sk__line rd-sk__w100" />
          <span className="rd-skel rd-sk__line rd-sk__w70" />
          <span className="rd-skel rd-sk__code" />
        </div>
      ) : null}
      {kind === "notfound" ? (
        <div className="rd-ed">
          <span className="rd-ed__code">{s.notFoundCode}</span>
          <h1 className="rd-ed__title">{s.notFoundTitle(noun)}</h1>
          <p className="rd-ed__sub">{s.notFoundSub(noun)}</p>
          <div className="rd-ed__actions">
            <Link
              className="rd-btn rd-btn--primary"
              href={LIBRARY_HREF}
              prefetch={false}
            >
              <span aria-hidden="true">‹</span> {s.backToLibrary}
            </Link>
          </div>
        </div>
      ) : null}
      {kind === "failed" ? (
        <div className="rd-ed">
          <span className="rd-ed__code">{s.errorCode}</span>
          <h1 className="rd-ed__title">{s.errorTitle}</h1>
          <p className="rd-ed__sub">{s.errorSub(noun)}</p>
          <div className="rd-ed__actions">
            <button
              type="button"
              className="rd-btn rd-btn--primary"
              onClick={onRetry}
            >
              {s.retry}
            </button>
          </div>
          {reference ? (
            <p className="rd-ed__ref">
              {s.refPrefix} · {reference}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
