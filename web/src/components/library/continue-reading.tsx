import Link from "next/link";

import { LIBRARY } from "@/content";
import type { ContinueItem } from "@/lib/library/continue";

import { LangText } from "./lang-text";

function label(item: ContinueItem): string {
  return item.kind === "doc"
    ? LIBRARY.continue.document
    : LIBRARY.continue.chapterOf(item.n, item.total);
}

function book(item: ContinueItem): string {
  return item.kind === "doc"
    ? item.project
    : item.bookTitle + (item.showProject ? ` · ${item.project}` : "");
}

/** "Left off at {section} · {pct}%" / "Left off at {pct}%" / "Up next · you finished chapter {n}", then the language. */
function Place({ item, rowForm }: { item: ContinueItem; rowForm?: boolean }) {
  const lead = item.next ? (
    <span>{LIBRARY.continue.upNext(item.finishedN)}</span>
  ) : item.section ? (
    <span>
      {LIBRARY.continue.leftOffAt}
      <b lang={item.lang}>{item.section}</b> · {item.pct}%
    </span>
  ) : (
    <span>{LIBRARY.continue.leftOffPct(item.pct)}</span>
  );
  return (
    <>
      {lead}
      {item.langName ? (
        <>
          {rowForm ? (
            <span className="lib-dot" aria-hidden="true">
              ·
            </span>
          ) : (
            " · "
          )}
          <span lang="ko">{item.langName}</span>
        </>
      ) : null}
    </>
  );
}

/**
 * Continue reading (`06-library` §3, board 10): the lead is one link with the reader's own
 * 3px progress line as its top edge and a primary-styled span as its action (`pointer-events:
 * none`, so the whole lead is the one target); the other items are a hairline list of rows.
 * Drawn only when there is at least one item; the page decides.
 */
export function ContinueReading({ items }: { items: ContinueItem[] }) {
  const [lead, ...rows] = items;
  if (!lead) return null;
  return (
    <div className={rows.length > 0 ? "lib-cont lib-cont--many" : "lib-cont"}>
      <Link className="lib-lead" href={lead.href}>
        <span className="lib-lead__line" aria-hidden="true">
          <span
            className="lib-lead__fill"
            style={{ width: `${lead.next ? 0 : lead.pct}%` }}
          />
        </span>
        <span className="lib-bookline">
          <span className="lib-label">{label(lead)}</span>
          <span className="lib-bookline__book">{book(lead)}</span>
          {lead.legacy ? (
            <span className="rd-tag rd-tag--plain">
              {LIBRARY.card.originalLayout}
            </span>
          ) : null}
        </span>
        <span className="lib-lead__title">
          <LangText text={lead.title} lang={lead.lang} />
        </span>
        <span className="lib-lead__place">
          <Place item={lead} />
        </span>
        <span className="lib-btn lib-btn--primary lib-lead__go">
          {lead.next ? LIBRARY.continue.goNext : LIBRARY.continue.go}{" "}
          <span aria-hidden="true">→</span>
        </span>
      </Link>
      {rows.length > 0 ? (
        <ul className="lib-rows" aria-label={LIBRARY.continue.alsoInProgress}>
          {rows.map((r) => (
            <li key={r.key}>
              <Link className="lib-row" href={r.href}>
                <span className="lib-bookline">
                  <span className="lib-label">{label(r)}</span>
                  <span className="lib-row__book">{book(r)}</span>
                </span>
                <span className="lib-row__title">
                  <LangText text={r.title} lang={r.lang} />
                </span>
                <span className="lib-row__meta">
                  <Place item={r} rowForm />
                  {r.legacy ? (
                    <span className="rd-tag rd-tag--plain">
                      {LIBRARY.card.originalLayout}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
