"use client";

import Link from "next/link";
import { useId } from "react";

import { REVIEW } from "@/content/review";
import { hangulRuns, isKorean } from "@/lib/reader/hangul";
import { LIBRARY_HREF } from "@/lib/reader-href";
import { hourText, whenText, type EndKind } from "@/lib/review/model";
import type { ContinueView } from "@/lib/review/actions";
import type { QueueMeta } from "@/lib/review/types";

/**
 * P30.S24 — the queue's other states (`08-review` §6, `ReviewEnd`, board 17), in the page's
 * slot where the card was: done for today, a daily limit reached (with "Change your daily
 * limits →"), no cards yet and failed to load. Loading is the card skeleton (`skeleton.tsx`).
 * The held cards of a limit are still due today, so the header's counts stay true beside it.
 */
export function ReviewEnd({
  kind,
  meta,
  next,
  onSettings,
}: {
  kind: Exclude<EndKind, "card">;
  meta: QueueMeta;
  /** The continue-reading pointer; absent, the block is omitted. */
  next: ContinueView | null;
  onSettings: (opener: HTMLElement) => void;
}) {
  const E = REVIEW.end;
  const titleId = useId();
  const { counts, profile } = meta;
  const hour = hourText(profile.day_starts_at_hour);

  if (kind === "empty") {
    return (
      <section
        className="rv-empty"
        tabIndex={-1}
        aria-labelledby={titleId}
        data-rv-end="1"
      >
        <h2 className="rv-empty__title" id={titleId}>
          {E.emptyTitle}
        </h2>
        <p className="rv-empty__body">{E.emptyBody}</p>
        <Link
          className="rd-btn rd-btn--primary"
          href={LIBRARY_HREF}
          prefetch={false}
        >
          {E.openLibrary}
        </Link>
      </section>
    );
  }

  let title: string;
  let body: string;
  if (kind === "limit") {
    title = E.limitTitle(profile.max_reviews_per_day);
    body = E.limitBody(counts.due, counts.new_highlights, hour);
  } else if (kind === "limitNew") {
    title = E.newLimitTitle(profile.new_highlights_per_day);
    body = E.newLimitBody(counts.new_highlights, hour);
  } else if (kind === "paused") {
    title = E.pausedTitle;
    body = E.pausedBody(counts.new_highlights);
  } else {
    title = E.doneTitle;
    body = E.doneBody(
      counts.done_today,
      meta.next_due_at
        ? whenText(meta.next_due_at, meta.now, meta.day.time_zone)
        : null,
    );
  }
  const limit = kind === "limit" || kind === "limitNew" || kind === "paused";
  return (
    <section
      className="rv-end"
      tabIndex={-1}
      aria-labelledby={titleId}
      data-rv-end="1"
    >
      <p className="rd-end__mark">{E.mark}</p>
      <h2 className="rv-end__title" id={titleId}>
        {title}
      </h2>
      <p className="rv-end__body">{body}</p>
      {limit ? (
        <p className="rv-end__more">
          <button
            type="button"
            className="rd-linkbtn"
            onClick={(e) => onSettings(e.currentTarget)}
          >
            {E.changeLimits}
          </button>
        </p>
      ) : null}
      {next ? (
        <div className="rd-next">
          <p className="rd-next__label">{E.continue.label}</p>
          <p className="rd-next__title" lang={next.lang}>
            {hangulRuns(next.title, !isKorean(next.lang))}
          </p>
          <p className="rd-next__lede">{hangulRuns(next.lede, true)}</p>
          <Link
            className="rd-btn rd-btn--primary"
            href={next.href}
            prefetch={false}
          >
            {E.continue.go}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

/** "Failed to load": the signed editorial state, with Try again and the reference. */
export function ReviewFailed({
  reference,
  onRetry,
}: {
  reference: string | null;
  onRetry: () => void;
}) {
  const E = REVIEW.end;
  return (
    <div className="rd-ed" tabIndex={-1} data-rv-end="1">
      <span className="rd-ed__code">{E.failedCode}</span>
      <h2 className="rd-ed__title">{E.failedTitle}</h2>
      <p className="rd-ed__sub">{E.failedSub}</p>
      <div className="rd-ed__actions">
        <button
          type="button"
          className="rd-btn rd-btn--primary"
          onClick={onRetry}
        >
          {E.retry}
        </button>
      </div>
      {reference ? (
        <p className="rd-ed__ref">
          {E.refPrefix} · {reference}
        </p>
      ) : null}
    </div>
  );
}
