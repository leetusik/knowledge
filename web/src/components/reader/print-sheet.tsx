import { Fragment } from "react";

import { READER } from "@/content";
import { publishedDate } from "@/lib/reader/date";
import { hangulRuns, isKorean, joinHyphens } from "@/lib/reader/hangul";
import { addressPieces, printAddress, printDate } from "@/lib/reader/print";
import type { ReaderView } from "@/lib/reader/types";
import { readerHref } from "@/lib/reader-href";

import { PrintedOn } from "./print-client";

/**
 * P30.S26 — the native reader's two print-only blocks (`09-legacy-and-print` round 01,
 * *Print: the native sheet*): the masthead that opens page 1 and the colophon that is the
 * last thing printed. Both are server components that are always in the DOM; the sheet's
 * stylesheet (`kb-print.css`) shows them on paper and hides them on screen, so the markup
 * is there however the reader prints (⌘P, the menu, "Save as PDF").
 *
 * A sheet of paper has lost every affordance the screen carries its provenance in (the
 * address bar, the version list, the "current" badge), so the masthead and the colophon say
 * where it came from, which version it is, when it was printed and where the newest lives.
 * A member's saved answers, highlights and notes do not print (OQ7).
 */

/** An address with a break opportunity between its segments (`<wbr>`). */
export function PrintAddr({ address }: { address: string }) {
  const pieces = addressPieces(address);
  return (
    <>
      {pieces.map((piece, i) => (
        <Fragment key={i}>
          {i > 0 ? <wbr /> : null}
          {piece}
        </Fragment>
      ))}
    </>
  );
}

const P = READER.print;

/** The label: "knowledge · {book title} · Chapter {n} of {N}" (a loose document: "knowledge · {project}"). */
function labelOf(view: ReaderView): string {
  if (view.kind === "loose" || !view.book) {
    return `${P.brand}${P.sep}${view.project}`;
  }
  return [
    P.brand,
    view.book.title,
    P.keep(READER.opening.chapterOf(view.book.n, view.book.total)),
  ].join(P.sep);
}

/** The address of what is on the paper, and of the newest version of that same variant. */
function addressesOf(view: ReaderView): { here: string; current: string } {
  const lang = view.langs.length > 1 ? view.lang : null;
  const older = view.version < view.newest;
  return {
    here: printAddress(
      readerHref(view.target, { lang, version: older ? view.version : null }),
    ),
    current: printAddress(readerHref(view.target, { lang })),
  };
}

/** The variant's language, each named in itself ("English", "한국어"). */
function languageOf(view: ReaderView): string {
  return (
    view.langs.find((l) => l.lang === view.lang)?.label ??
    view.versions?.label ??
    view.lang
  );
}

/** The date the server renders until the reader's own replaces it (`PrintedOn`). */
function serverDate(): string {
  return printDate(new Date());
}

export function PrintMasthead({ view }: { view: ReaderView }) {
  const older = view.version < view.newest;
  const { here, current } = addressesOf(view);
  const wrap = !isKorean(view.lang);
  const published = view.date ? `, ${publishedDate(view.date)}` : "";
  const facts = P.keep(`v${view.version}${published}`);
  return (
    <div className="pp-head pp-only">
      <p className="pp-head__label">{labelOf(view)}</p>
      <p className="pp-head__addr">
        <PrintAddr address={here} />
        {P.sep}
        {facts}
        {P.sep}
        <span className="pp-nobr">
          Printed <PrintedOn initial={serverDate()} />
        </span>
      </p>
      {older ? (
        <p className="pp-head__old">
          <span className="pp-head__tag">{P.olderTag(view.version)}</span>{" "}
          {P.olderLine(view.newest)}
          <PrintAddr address={current} />.
        </p>
      ) : null}
      <p className="pp-head__title" lang={view.lang}>
        {hangulRuns(joinHyphens(view.title), wrap)}
      </p>
      {view.summary ? (
        <p className="pp-head__lede" lang={view.lang}>
          {hangulRuns(view.summary, wrap)}
        </p>
      ) : null}
    </div>
  );
}

export function PrintColophon({ view }: { view: ReaderView }) {
  const older = view.version < view.newest;
  const { here, current } = addressesOf(view);
  const src = view.staleSource;
  const line = [
    labelOf(view),
    P.keep(`${languageOf(view)} · v${view.version}`),
  ].join(P.sep);
  return (
    <footer className="pp-colo pp-only">
      <p className="pp-colo__line">{line}</p>
      <p>
        Printed <PrintedOn initial={serverDate()} /> from{" "}
        <PrintAddr address={here} />.{" "}
        {older ? (
          <>
            {P.colophonOlder(view.version, view.newest)}
            <PrintAddr address={current} />.
          </>
        ) : (
          P.colophonCurrent(view.version)
        )}
      </p>
      {src ? (
        <p>
          {READER.opening.olderTranslationBody(src.label, src.from, src.newest)}
        </p>
      ) : null}
    </footer>
  );
}

/**
 * The one notice sheet ⌘P prints from the legacy reader (`09-legacy-and-print` round 01,
 * *⌘P on the legacy reader*). The framed document never prints (the frame is hidden and the
 * page does not scroll), so the sheet says so and gives the address that does: the raw
 * relay, top-level, where the browser prints the original in its own layout.
 */
export function PrintNotice({
  view,
  relay,
}: {
  view: ReaderView;
  /** The raw relay's path, as the document bar's Print · new tab opens it. */
  relay: string;
}) {
  const noun: "chapter" | "document" =
    view.kind === "loose" || !view.book ? "document" : "chapter";
  return (
    <section className="pp-notice pp-only">
      <p className="pp-notice__label">{labelOf(view)}</p>
      <h1 className="pp-notice__title">{P.notice.title(noun)}</h1>
      <p className="pp-notice__p">
        {"“"}
        <span lang={view.lang}>{view.title}</span>
        {"” "}
        {P.notice.lead}
      </p>
      <p className="pp-notice__addr">
        <PrintAddr address={printAddress(relay)} />
      </p>
      <p className="pp-notice__p">{P.notice.onScreen(noun)}</p>
      <p className="pp-notice__printed">
        Printed <PrintedOn initial={serverDate()} />
      </p>
    </section>
  );
}
