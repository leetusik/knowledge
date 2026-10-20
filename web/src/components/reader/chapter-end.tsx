"use client";

import Link from "next/link";
import { useState } from "react";

import { READER } from "@/content";
import { hangulRuns, isKorean, joinHyphens } from "@/lib/reader/hangul";
import { LIBRARY_HREF } from "@/lib/reader-href";
import type { NeighbourChapter } from "@/lib/reader/types";

import { ChapterList } from "./chapter-list";
import { useReaderProgress } from "./reader-progress";
import { SignInToSave } from "./sign-in-to-save";

/**
 * The chapter end (`01-reader` §10, `ChapterEnd`, board 14), the last block of the
 * article and the end sentinel (`data-end`) the frame watches.
 *
 *  - the end mark ("END OF CHAPTER" / "END OF DOCUMENT") between two hairlines;
 *  - the status row: a state word over a sub-line, and a secondary button at least
 *    10.5rem wide. A member's four sentences share one grid cell, the three not
 *    current at `visibility: hidden`, so pressing Mark as finished / Mark as unread
 *    changes which sentence shows and the button's label and moves nothing; the cell
 *    is a polite live region. The signed-out reader has the one sentence and Mark as
 *    finished opens Sign in to save inline, raised;
 *  - the next chapter (label, title, lede, "Read next →"), or on the last chapter
 *    "Last chapter" with the way back to the book, or on a loose document "‹ Back to
 *    the library";
 *  - "In this book" with "X of M finished" (member) or "M chapters", over the chapter
 *    list (chapters only).
 *
 * Its state comes from the frame through `ReaderProgressContext`, so the same
 * numbers drive this, the Contents sheet and the bottom bar.
 */
export function ChapterEnd({
  noun,
  loose,
  next,
  isLast,
  bookBackHref,
  total,
}: {
  noun: "chapter" | "document";
  loose: boolean;
  next?: NeighbourChapter;
  isLast: boolean;
  bookBackHref?: string;
  total?: number;
}) {
  const progress = useReaderProgress();
  const [prompt, setPrompt] = useState(false);
  const t = READER.end;
  const member = progress?.member ?? false;
  const saves = progress?.saves ?? false;

  // Every sentence the status cell can show; only the current one is visible.
  const lines: { key: string; word: string; sub: string }[] = member
    ? [
        { key: "finished", word: t.finished[0], sub: t.finished[1] },
        { key: "updated", word: t.updated(noun)[0], sub: t.updated(noun)[1] },
        { key: "unread", word: t.unread[0], sub: t.unread[1] },
        { key: "started", word: t.notYet(noun)[0], sub: t.notYet(noun)[1] },
      ]
    : [{ key: "anon", word: t.signedOut[0], sub: t.signedOut[1] }];
  const current = member ? (progress?.state ?? "started") : "anon";
  const finishedNow =
    member && (current === "finished" || current === "updated");

  const finish = () => {
    if (!member) {
      setPrompt(true);
      return;
    }
    progress?.mark(true);
  };

  return (
    <div className="rd-end" data-end="1">
      <p className="rd-end__mark">
        <span>{t.mark(noun)}</span>
      </p>

      {!member || saves ? (
        <div className="rd-status">
          <div className="rd-status__text" aria-live="polite">
            {lines.map((l) => (
              <p
                key={l.key}
                className={
                  l.key === current
                    ? "rd-status__line"
                    : "rd-status__line is-off"
                }
              >
                <span className="rd-status__state">{l.word}</span>
                <span className="rd-status__sub">{l.sub}</span>
              </p>
            ))}
          </div>
          {finishedNow ? (
            <button
              type="button"
              className="rd-btn rd-btn--secondary rd-status__btn"
              onClick={() => progress?.mark(false)}
            >
              {t.markUnread}
            </button>
          ) : (
            <button
              type="button"
              className="rd-btn rd-btn--secondary rd-status__btn"
              aria-expanded={!member ? prompt : undefined}
              onClick={finish}
            >
              {t.markFinished}
            </button>
          )}
        </div>
      ) : null}

      {!member && prompt ? (
        <div className="rd-end__prompt">
          <SignInToSave
            raised
            place={noun}
            signInHref={progress?.signInHref ?? "/login"}
            onDismiss={() => setPrompt(false)}
          />
        </div>
      ) : null}

      {!loose && next ? (
        <div className="rd-next">
          <p className="rd-next__label">{t.nextLabel(next.n ?? 0)}</p>
          <p className="rd-next__title" lang={next.lang}>
            {hangulRuns(joinHyphens(next.title), !isKorean(next.lang))}
          </p>
          {next.summary ? (
            <p className="rd-next__lede" lang={next.lang}>
              {hangulRuns(next.summary, !isKorean(next.lang))}
            </p>
          ) : null}
          <Link
            className="rd-btn rd-btn--primary"
            href={next.href}
            prefetch={false}
          >
            {t.readNext}
          </Link>
        </div>
      ) : null}

      {!loose && isLast ? (
        <div className="rd-next">
          <p className="rd-next__label">{t.lastLabel}</p>
          <p className="rd-next__title">{t.lastTitle}</p>
          <Link
            className="rd-btn rd-btn--primary"
            href={bookBackHref ?? LIBRARY_HREF}
            prefetch={false}
          >
            {t.backToBook}
          </Link>
        </div>
      ) : null}

      {loose ? (
        <div className="rd-next">
          <Link
            className="rd-btn rd-btn--secondary"
            href={LIBRARY_HREF}
            prefetch={false}
          >
            <span aria-hidden="true">‹</span> {t.backToLibrary}
          </Link>
        </div>
      ) : null}

      {!loose && progress ? (
        <div className="rd-end__list">
          <div className="rd-end__listhead">
            <h2 className="rd-end__listtitle">{t.inThisBook}</h2>
            <span className="rd-end__count">
              {member && progress.finishedCount !== null
                ? t.finishedCount(progress.finishedCount, total ?? 0)
                : t.chapters(total ?? progress.rows.length)}
            </span>
          </div>
          <ChapterList rows={progress.rows} member={member} />
        </div>
      ) : null}
    </div>
  );
}
