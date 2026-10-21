/**
 * P30.S24 — a card's quiz item as the signed quiz's grading rules take it (`QuizSpec`). The
 * queue carries a quiz card's `front` (what is asked) and `back` (the key, S10), so grading is
 * client-side, as in the chapter. A highlight card has no spec.
 */
import { REVIEW } from "@/content/review";
import { fresh, type ItemState, type QuizSpec } from "@/lib/reader/quiz";

import type { ReviewCard } from "./types";

export function specFor(card: ReviewCard): QuizSpec | null {
  const n = card.where.item_index ?? 1;
  const id = card.card_id;
  if (card.item_type === "choice") {
    return {
      id,
      type: "choice",
      n,
      options: card.front.options.map((o, j) => ({
        id: o.id,
        key: "ABCDEF".charAt(j),
      })),
      answer: card.back.answer,
      multi: card.front.multi,
    };
  }
  if (card.item_type === "cloze") {
    return { id, type: "cloze", n, accepted: card.back.accepted };
  }
  if (card.item_type === "recall") return { id, type: "recall", n };
  return null;
}

/** A card's first answer state: unanswered, with the drift note when item drift reset it. */
export function freshFor(card: ReviewCard): ItemState {
  return fresh(card.reset ? REVIEW.card.drift : "");
}
