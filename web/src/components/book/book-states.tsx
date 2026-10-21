import { BOOK } from "@/content/book";

const W = [
  "bk-sk__w90",
  "bk-sk__w75",
  "bk-sk__w85",
  "bk-sk__w60",
  "bk-sk__w50",
];

/**
 * Loading, not found, failed (`07-book-page` §8, `BookState`, board 11): the reader's §16
 * with the noun "book", inside the page under the top bar (which stays, with no middle).
 * Server-safe: only "Try again" needs a handler, passed in.
 *
 *  - Loading: `role="status"`, aria-label "Loading…", the skeleton in the page's own shape
 *    (the kind line, two title lines, the progress line and track, a Continue block, then
 *    the list head and five rows; two columns from 64rem);
 *  - Not found: a private book's address and a missing one are the same state (404, never 403);
 *  - Failed: "Error · 500", the primary "Try again" and the request's reference.
 */
export function BookStateBlock({
  kind,
  libraryHref,
  reference,
  onRetry,
}: {
  kind: "loading" | "notfound" | "failed";
  libraryHref?: string;
  reference?: string | null;
  onRetry?: () => void;
}) {
  const s = BOOK.states;
  return (
    <main className="bk-main" id="main-content">
      {kind === "loading" ? (
        <div className="bk-layout" role="status" aria-label={s.loadingLabel}>
          <div className="bk-sk">
            <span className="rd-skel bk-sk__kind" />
            <span className="rd-skel bk-sk__title" />
            <span className="rd-skel bk-sk__title2" />
            <span className="rd-skel bk-sk__prog" />
            <span className="rd-skel bk-sk__bar" />
            <div className="bk-sk__cont">
              <span className="rd-skel bk-sk__label" />
              <span className="rd-skel bk-sk__ctitle" />
              <span className="rd-skel bk-sk__m bk-sk__w60" />
              <span className="rd-skel bk-sk__btn" />
            </div>
          </div>
          <div className="bk-sk">
            <span className="rd-skel bk-sk__head" />
            <div className="bk-sk__rows">
              {W.map((w) => (
                <div key={w} className="bk-sk__row">
                  <span className="rd-skel bk-sk__n" />
                  <span className="bk-sk__lines">
                    <span className={`rd-skel bk-sk__t ${w}`} />
                    <span className="rd-skel bk-sk__m" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {kind === "notfound" ? (
        <div className="rd-ed">
          <span className="rd-ed__code">{s.notFoundCode}</span>
          <h1 className="rd-ed__title">{s.notFoundTitle}</h1>
          <p className="rd-ed__sub">{s.notFoundSub}</p>
          <div className="rd-ed__actions">
            <a
              className="rd-btn rd-btn--primary"
              href={libraryHref ?? "/library"}
            >
              <span aria-hidden="true">‹</span> {s.backToLibrary}
            </a>
          </div>
        </div>
      ) : null}
      {kind === "failed" ? (
        <div className="rd-ed">
          <span className="rd-ed__code">{s.errorCode}</span>
          <h1 className="rd-ed__title">{s.errorTitle}</h1>
          <p className="rd-ed__sub">{s.errorSub}</p>
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
    </main>
  );
}
