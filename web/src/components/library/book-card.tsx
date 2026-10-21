import { Fragment } from "react";

import Link from "next/link";

import { LIBRARY } from "@/content";
import type { BookCard } from "@/lib/library/model";

import { LangText } from "./lang-text";

/**
 * `BookCard` (`06-library` §5, board 08): one link to the book page on `kb-surface`. Signed
 * out it reads "{n} chapters"; signed in the 3px bar and "{done} of {total} finished" sit at
 * the card's foot. "Not started" is a chapter's or a document's word, never a book's.
 * `showProject` names the project (by subject, so two books with one slug read apart).
 */
export function BookCardView({
  card,
  signedIn,
  showProject,
}: {
  card: BookCard;
  signedIn: boolean;
  showProject: boolean;
}) {
  const pct = card.total > 0 ? Math.round((card.done / card.total) * 100) : 0;
  const meta: { text: string; lang: string }[] = [];
  if (!signedIn)
    meta.push({ text: LIBRARY.card.chapters(card.total), lang: "en" });
  if (card.langs.length > 1) {
    for (const l of card.langs) meta.push({ text: l.name, lang: l.lang });
  }
  return (
    <Link className="lib-book" href={card.href}>
      {showProject ? <span className="lib-label">{card.project}</span> : null}
      <span className="lib-book__title">
        <LangText text={card.title} lang="en" />
      </span>
      {meta.length > 0 || card.allLegacy ? (
        <span className="lib-book__meta">
          {meta.map((m, i) => (
            <Fragment key={`${m.lang}-${i}`}>
              {i > 0 ? (
                <span className="lib-dot" aria-hidden="true">
                  ·
                </span>
              ) : null}
              <span lang={m.lang}>{m.text}</span>
            </Fragment>
          ))}
          {card.allLegacy ? (
            <span className="rd-tag rd-tag--plain">
              {LIBRARY.card.originalLayout}
            </span>
          ) : null}
        </span>
      ) : null}
      {signedIn ? (
        <span className="lib-book__prog">
          <span className="lib-bar" aria-hidden="true">
            <span className="lib-bar__fill" style={{ width: `${pct}%` }} />
          </span>
          <span className="lib-book__count">
            <span>{LIBRARY.card.finished(card.done, card.total)}</span>
            {card.updated ? (
              <span className="rd-tag rd-tag--accent">
                {LIBRARY.card.updated}
              </span>
            ) : null}
          </span>
        </span>
      ) : null}
    </Link>
  );
}
