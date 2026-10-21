"use client";

import { useId } from "react";

import { REVIEW } from "@/content/review";
import { cx } from "@/lib/cx";
import { hangulRuns } from "@/lib/reader/hangul";
import { bookRow } from "@/lib/review/model";
import type { Counts } from "@/lib/review/types";

/**
 * P30.S24 — the queue header (`08-review` §1, `QueueHead`, board 16): the title, one counts
 * line in words and numbers beside By book, and the saved line. Everything below it stays
 * where it is: the counts and their skeleton share one cell, By book keeps its place unseen
 * while the queue loads or has failed (a dimmed control would read under 4.5:1), and the saved
 * line is always laid out (`visibility: hidden` until the first save).
 */
export interface Saved {
  word: string;
  rest: string;
}

export function QueueHead({
  counts,
  loading,
  ready,
  saved,
  open,
  note,
  onBooks,
}: {
  counts: Counts;
  /** The queue is being read: the counts show their skeleton. */
  loading: boolean;
  /** The counts are the server's (neither loading nor failed). */
  ready: boolean;
  saved: Saved | null;
  open: boolean;
  /** The note under the rows (what the rows are, or why cards wait). */
  note: string;
  onBooks: () => void;
}) {
  const H = REVIEW.head;
  const booksId = useId();
  const rows = counts.by_book.map(bookRow);
  const shown = ready;
  return (
    <header className="rv-head">
      <h1 className="rv-head__title">{H.title}</h1>
      <div className="rv-head__row">
        <div className="rv-head__counts">
          <p
            className={cx("rv-count", !shown && "is-off")}
            aria-hidden={shown ? undefined : "true"}
          >
            <b>{counts.due}</b> {H.due} · <b>{counts.new_highlights}</b>{" "}
            {H.newHighlight(counts.new_highlights)} · <b>{counts.done_today}</b>{" "}
            {H.doneToday}
          </p>
          {loading ? (
            <span
              className="rd-skel rv-count__sk"
              role="status"
              aria-label={H.loadingLabel}
            />
          ) : null}
        </div>
        <button
          type="button"
          className="rd-tbtn rv-bybook"
          aria-expanded={open && shown ? "true" : "false"}
          aria-controls={booksId}
          disabled={!shown}
          onClick={onBooks}
        >
          {H.byBook}
        </button>
      </div>
      <p className={cx("rv-saved", !(saved && shown) && "is-off")} role="status">
        <b>{saved?.word ?? H.saved}</b> · {saved?.rest ?? ""}
      </p>
      {open && shown ? (
        <div id={booksId}>
          {rows.length > 0 ? (
            <>
              <ul className="rv-books" aria-label={H.booksLabel}>
                {rows.map((r) => (
                  <li className="rv-book" key={r.key}>
                    <span className="rv-book__title">
                      {hangulRuns(r.title, true)}
                    </span>
                    <span className="rv-book__n">{r.counts}</span>
                    <span className="rv-book__sub">
                      {hangulRuns(r.sub, true)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="rv-books__note">{note}</p>
            </>
          ) : (
            <p className="rv-books__note">{H.notes.none}</p>
          )}
        </div>
      ) : null}
    </header>
  );
}
