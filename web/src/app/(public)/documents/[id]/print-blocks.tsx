import type { ReactNode } from "react";

import { BRAND, DOCUMENTS, SITE } from "@/content";

/**
 * P28.S8 — round 06 §4.5's two PRINT-ONLY blocks: the masthead that opens the
 * printed sheet and the colophon that closes it.
 *
 * Both are SERVER components and both are ALWAYS in the DOM — `kb-print.css`'s
 * one screen-side rule (`.kb-printonly, .kb-printhead, .kb-printfoot { display:
 * none }`) keeps them off the screen, and the `@media print` block turns them
 * back on. Nothing here is conditional on a print event, because there is no
 * reliable one to be conditional on: a reader may print with ⌘P, from the
 * browser menu, or from the export control, and only markup that is already
 * there survives all three.
 *
 * WHY THEY EXIST AT ALL (§3.2's own reasoning): a sheet of paper has lost every
 * affordance the screen carries its provenance in — no address bar, no version
 * panel, no "current" badge. The four facts the record names (where it came
 * from, which version it is, when it was taken off the screen, and who made it)
 * are therefore printed on the page itself, at the top and again at the bottom,
 * because the first and last pages of a printout get separated.
 *
 * THE DATE IS THE READER'S, NOT THE SERVER'S (§4.5). Both blocks render the
 * server's ISO date as a default and mark the date itself with
 * `data-kb-print-date`; the export island (`export-pdf-button.tsx`) overwrites
 * those nodes with the reader's own local date on mount. Only the DATE travels —
 * the sentence around it is composed here from `DOCUMENTS.read.print`, so the
 * island never holds a copy of the copy.
 */

/** The attribute the export island rewrites with the reader's local date. */
export const PRINT_DATE_ATTR = "data-kb-print-date";

/** Today, ISO `YYYY-MM-DD`, as the SERVER sees it — the default the client replaces. */
function serverDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The absolute address of what is on the paper, without its scheme — §4.5's own
 * specimen reads `knowledge.hi2vi.com/@leetusik/knowledge/frontend`. A printed
 * URL is typed by hand or read aloud, and `https://` is four syllables nobody
 * needs; the host and path are the part that identifies the document.
 */
function printUrl(path: string): string {
  return `${SITE.url}${path}`.replace(/^https?:\/\//, "");
}

/**
 * Compose one of §7's `print.*` sentences with its date in its own element, so
 * the client can replace the DATE without re-rendering (or duplicating) the
 * sentence. The marker is a character that cannot occur in the copy.
 */
function withDateSlot(
  sentence: (date: string) => string,
  date: string,
): ReactNode {
  const MARK = "\u0000";
  const [before, after = ""] = sentence(MARK).split(MARK);
  return (
    <>
      {before}
      <span {...{ [PRINT_DATE_ATTR]: "" }}>{date}</span>
      {after}
    </>
  );
}

/**
 * §4.5's masthead — the first thing on the first printed page. Rendered right
 * after the actions row (§4.1's order), which print drops, so on paper it is the
 * top of the sheet and on screen it is nowhere.
 */
export function PrintMasthead({
  path,
  version,
  date = serverDate(),
}: {
  /** The document's own path — `canonical_path` when it has one, else the id URL. */
  path: string;
  /** The version THIS body is, which is the fact the sheet cannot otherwise carry. */
  version: number;
  date?: string;
}) {
  return (
    <div className="kb-printhead kb-printonly">
      <span className="kb-printhead__word">{BRAND.wordmark}</span>
      <span className="kb-printhead__url">{printUrl(path)}</span>
      <span>{DOCUMENTS.versions.label(version)}</span>
      <span>{withDateSlot(DOCUMENTS.read.print.printedOn, date)}</span>
    </div>
  );
}

/**
 * §4.5's colophon — the last thing on the last printed page, repeating the
 * masthead's facts on purpose.
 *
 * `currentVersion` is what makes it the ARCHIVED variant: on a past version the
 * second line states which version is current instead of promising that this one
 * was current when it was printed, because that sentence would be a lie on an
 * archived body. The boxed `.kb-docnotice` stamp says the same thing at the top;
 * the two ends of the sheet are the two places a separated page can be read from.
 */
export function PrintColophon({
  title,
  path,
  version,
  currentVersion,
  date = serverDate(),
}: {
  title: string;
  path: string;
  version: number;
  /** Set only on a past version, and only then is the archived line used. */
  currentVersion?: number;
  date?: string;
}) {
  const { print } = DOCUMENTS.read;
  return (
    <div className="kb-printfoot kb-printonly">
      <b>{BRAND.wordmark}</b> · {title} · {DOCUMENTS.versions.label(version)} ·{" "}
      <span>{printUrl(path)}</span>
      <br />
      {currentVersion === undefined
        ? withDateSlot(print.colophon, date)
        : withDateSlot(
            (value) => print.archivedColophon(value, currentVersion),
            date,
          )}
    </div>
  );
}
