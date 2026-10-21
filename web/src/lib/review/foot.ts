/**
 * P30.S24 — a card's foot (`08-review` §3): what happened, in words, beside the action. Pure.
 *
 * Every sentence the status can show sits in ONE grid cell (the others hidden), every label of
 * the main button in one button, and the pair and the retry in one cell, so grading, sending and
 * failing move nothing (the signed quiz's own rule, extended). This builds those lists from the
 * card, its answer state and the rating in flight.
 */
import { REVIEW } from "@/content/review";
import {
  gradeItem,
  verdictWord,
  type ItemState,
  type QuizSpec,
} from "@/lib/reader/quiz";

import { formatInterval } from "./model";
import type { Rating, ReviewCard } from "./types";

const F = REVIEW.foot;

export interface FootCell {
  key: string;
  on: boolean;
  word: string;
  tone: "" | "ok" | "bad";
  sub: string;
}

export type MainPhase = "check" | "next" | "saving" | "retry";

export interface MainButton {
  phase: MainPhase;
  primary: boolean;
  /** Single choice grades on tap: until then the button keeps its place, unseen. */
  hidden: boolean;
  disabled: boolean;
  busy: boolean;
}

export interface RateButton {
  rating: Rating;
  word: string;
  sub: string;
  /** This is the rating in flight: its word is swapped for "Saving…". */
  saving: boolean;
}

export interface Foot {
  show: boolean;
  kind: "main" | "pair";
  cells: FootCell[];
  live: string;
  main: MainButton | null;
  pair: RateButton[] | null;
  /** The pair is replaced, in the same cell, by one "Try again". */
  failed: boolean;
}

/** What the page tracks about a rating of THIS card. */
export interface InFlight {
  rating: Rating;
}

function words(card: ReviewCard): { good: string; again: string; ask: string } {
  if (card.source === "highlight")
    return {
      good: F.highlight.good,
      again: F.highlight.again,
      ask: F.highlight.ask,
    };
  return { good: F.recall.good, again: F.recall.again, ask: F.recall.ask };
}

export function footFor(args: {
  card: ReviewCard;
  spec: QuizSpec | null;
  st: ItemState | null;
  pending: InFlight | null;
  failed: InFlight | null;
}): Foot {
  const { card, spec, st, pending, failed } = args;
  const busy = pending !== null;
  const fail = failed !== null && !busy;
  const good = formatInterval(card.previews.good.interval);
  const again = formatInterval(card.previews.again.interval);
  const cell = (
    key: string,
    on: boolean,
    word: string,
    tone: FootCell["tone"],
    sub: string,
  ): FootCell => ({ key, on, word, tone, sub });

  // --- choice and cloze: one main button; Next rates the grade -----------------------
  if (spec && st && spec.type !== "recall") {
    const graded = st.ph === "graded";
    const g = gradeItem(spec, st);
    const ok = graded && !!st.correct;
    const verdict = graded ? verdictWord(spec, st, g) : null;
    const emptySub = spec.type === "cloze" ? F.blankFirst : F.chooseFirst;
    const goodSub = F.rates("good", good);
    const againSub = F.rates("again", again);
    const blanks = spec.type === "cloze" ? spec.accepted.length : 0;
    // The word the "wrong" cell reserves room for: the longest the quiz can say.
    const reserveBad =
      spec.type === "cloze" && blanks > 1
        ? `Incorrect · ${Math.max(0, blanks - 1)} of ${blanks} blanks right`
        : spec.type === "choice" && spec.multi
          ? "Incorrect · partly right"
          : "Incorrect";
    const k = !graded
      ? st.empty
        ? "empty"
        : "none"
      : fail
        ? "fail"
        : ok
          ? "ok"
          : "bad";
    const cells: FootCell[] = [
      cell("none", k === "none", "", "", ""),
      cell("empty", k === "empty", F.nothingYet, "", emptySub),
      cell("ok", k === "ok", F.correct, "ok", goodSub),
      cell(
        "bad",
        k === "bad",
        graded && !ok && verdict ? verdict.word : reserveBad,
        "bad",
        againSub,
      ),
      cell(
        "fail",
        k === "fail",
        verdict?.word ?? F.correct,
        ok ? "ok" : "bad",
        F.notSaved,
      ),
    ];
    const open = !graded;
    const phase: MainPhase = busy
      ? "saving"
      : fail
        ? "retry"
        : graded
          ? "next"
          : "check";
    const hidden = open && spec.type === "choice" && !spec.multi;
    const live = busy
      ? F.saving
      : fail
        ? F.notSaved
        : graded
          ? `${verdict?.word ?? ""}. ${ok ? goodSub : againSub}`
          : k === "empty"
            ? `${F.nothingYet}. ${emptySub}`
            : "";
    return {
      show: true,
      kind: "main",
      cells,
      live,
      main: {
        phase,
        primary: !open,
        hidden,
        disabled: busy || hidden,
        busy,
      },
      pair: null,
      failed: fail,
    };
  }

  // --- recall (after the answer) and highlights: two ratings, Good first ---------------
  const w = words(card);
  const chosen = pending?.rating ?? failed?.rating ?? null;
  const chosenWord =
    chosen === null
      ? ""
      : card.source === "highlight"
        ? chosen === "good"
          ? F.highlight.good
          : F.highlight.again
        : chosen === "good"
          ? F.gotIt
          : F.missedIt;
  const cells: FootCell[] = [
    cell("ask", !fail, w.ask, "", ""),
    cell(
      "fail",
      fail,
      chosenWord || F.gotIt,
      chosen === null ? "" : chosen === "good" ? "ok" : "bad",
      F.notSaved,
    ),
  ];
  const pair: RateButton[] = (["good", "again"] as const).map((rating) => ({
    rating,
    word: rating === "good" ? w.good : w.again,
    sub: F.preview(rating, rating === "good" ? good : again),
    saving: busy && pending?.rating === rating,
  }));
  return {
    show:
      card.source === "highlight" ||
      (st !== null && st.ph !== "open") ||
      busy ||
      fail,
    kind: "pair",
    cells,
    live: busy ? F.saving : fail ? F.notSaved : "",
    main: null,
    pair,
    failed: fail,
  };
}
