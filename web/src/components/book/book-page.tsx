import Link from "next/link";

import { BOOK } from "@/content/book";
import { hangulRuns, isKorean, joinHyphens } from "@/lib/reader/hangul";
import type { ReaderSettings } from "@/lib/reader-cookie";
import type { BookView } from "@/lib/book/view";

import { BookFrame } from "./book-frame";
import { BookTop } from "./book-top";
import { ChapterRows } from "./chapter-rows";
import { ClearData } from "./clear-data";
import { TopMid } from "./top-mid";

const HEAD_ID = "bk-head";

/**
 * The book page (`07-book-page` round 01): the top bar, the head, Continue reading, the
 * per-book list's entry, Contents, and the reading-data foot. A server component over the
 * loaded view; the client parts are the top bar's scroll test, the rows' Versions
 * toggle, and Clear with its confirmation.
 *
 * Below 64rem one column (head, Continue, notes entry, then Contents and the foot); from
 * 64rem two (head, Continue and the notes entry on the left, Contents and the foot on the
 * right). The window scrolls.
 */
export function BookPage({
  view,
  settings,
}: {
  view: BookView;
  settings: ReaderSettings;
}) {
  const anon = view.viewer === "anon";
  return (
    <BookFrame
      settings={settings}
      top={
        <BookTop
          libraryHref={view.libraryHref}
          signInHref={anon ? view.signInHref : null}
          mid={
            <TopMid title={view.title} line={view.topLine} headId={HEAD_ID} />
          }
        />
      }
    >
      <main className="bk-main" id="main-content">
        <div className="bk-layout">
          <div className="bk-side">
            <Head view={view} />
            <Continue view={view} />
            {view.notes ? (
              <Link
                className="bk-notes"
                href={view.notes.href}
                prefetch={false}
              >
                <span className="bk-notes__title">
                  {BOOK.notes.title} <span aria-hidden="true">→</span>
                </span>
                <span className="bk-notes__meta">{view.notes.line}</span>
              </Link>
            ) : null}
          </div>
          <div className="bk-body">
            <section className="bk-list" aria-labelledby="bk-contents">
              <div className="rd-end__listhead">
                <h2 className="rd-end__listtitle" id="bk-contents">
                  {BOOK.contents.title}
                </h2>
                <span className="rd-end__count">{view.count}</span>
              </div>
              {view.shapeNote ? (
                <p className="bk-list__note">{view.shapeNote}</p>
              ) : null}
              <ChapterRows rows={view.rows} />
            </section>
            {view.signedIn ? (
              <ClearData
                org={view.org}
                project={view.project}
                book={view.slug}
                title={view.title}
                data={view.data}
              />
            ) : null}
          </div>
        </div>
      </main>
    </BookFrame>
  );
}

function Head({ view }: { view: BookView }) {
  const anon = view.viewer === "anon";
  return (
    <header className="bk-head" id={HEAD_ID}>
      <div className="bk-head__id">
        <p className="bk-head__kind">
          <span className="rd-head__n">{view.kindLabel}</span>
          <span>{view.place}</span>
        </p>
        <h1 className="bk-head__title">{view.title}</h1>
      </div>
      {view.description ? (
        <p className="bk-head__desc">{view.description}</p>
      ) : null}
      {!anon ? (
        <div className="bk-prog">
          <p className="bk-prog__text">
            <b>
              {view.done} of {view.total}
            </b>{" "}
            finished
          </p>
          <span className="bk-prog__bar" aria-hidden="true">
            <span className="bk-prog__fill" style={{ width: `${view.pct}%` }} />
          </span>
        </div>
      ) : (
        <div className="bk-prog">
          <p className="bk-prog__text">
            <b>{view.count}</b>
          </p>
          <p className="bk-anon">
            {BOOK.head.anonLead}
            <Link href={view.signInHref} prefetch={false}>
              {BOOK.head.anonLink}
            </Link>
            {BOOK.head.anonTail}
          </p>
        </div>
      )}
    </header>
  );
}

/** Continue reading (§3): the reader's "Next" block, the page's one primary button. */
function Continue({ view }: { view: BookView }) {
  const c = view.cont;
  const t = BOOK.cont;
  const label =
    c.kind === "continue"
      ? t.continue(c.n)
      : c.kind === "next"
        ? t.next(c.n)
        : c.kind === "start"
          ? t.start(c.n)
          : t.finished;
  const button =
    c.kind === "continue"
      ? t.continueReading
      : c.kind === "next"
        ? t.readNext
        : c.kind === "start"
          ? t.readChapter(c.n)
          : t.readAgain(c.n);
  const primary = c.kind !== "finished" || c.updatedN !== null;
  const wrap = !isKorean(c.lang);
  return (
    <section className="rd-next bk-cont" aria-labelledby="bk-cont-label">
      <h2 className="rd-next__label" id="bk-cont-label">
        {label}
      </h2>
      {c.kind !== "finished" ? (
        <p className="rd-next__title" lang={c.lang}>
          {hangulRuns(joinHyphens(c.title), wrap)}
        </p>
      ) : (
        <p className="rd-next__title">{t.allFinished(c.total)}</p>
      )}
      {c.kind === "continue" && c.section ? (
        <p className="bk-cont__at">
          {t.stoppedAtLead}
          <b lang={c.lang}>{hangulRuns(c.section, wrap)}</b>
          {t.stoppedAtTail(c.pct)}
        </p>
      ) : null}
      {c.kind === "continue" && !c.section && c.pct > 0 ? (
        <p className="bk-cont__at">{t.stoppedPct(c.pct)}</p>
      ) : null}
      {c.kind === "continue" && !c.section && c.pct <= 0 ? (
        <p className="bk-cont__at">{t.opened}</p>
      ) : null}
      {c.kind === "next" && c.after !== null ? (
        <p className="bk-cont__at">{t.youFinished(c.after)}</p>
      ) : null}
      {(c.kind === "start" || c.kind === "next") && c.summary ? (
        <p className="rd-next__lede" lang={c.lang}>
          {hangulRuns(c.summary, wrap)}
        </p>
      ) : null}
      {c.kind === "finished" && c.updatedN !== null ? (
        <p className="bk-cont__at">{t.updated(c.updatedN)}</p>
      ) : null}
      {c.legacy ? (
        <span className="rd-tag rd-tag--plain">{t.originalLayout}</span>
      ) : null}
      <Link
        className={`rd-btn ${primary ? "rd-btn--primary" : "rd-btn--secondary"}`}
        href={c.href}
        prefetch={false}
      >
        {button} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
