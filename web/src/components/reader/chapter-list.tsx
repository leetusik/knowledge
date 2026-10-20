import Link from "next/link";

import { READER } from "@/content";
import type { ChapterRow, ReaderHeading } from "@/lib/reader/types";

/**
 * The chapter list (`01-reader` §11, `ChapterList`, board 13): the Contents sheet's
 * body, and S15's chapter end reuses it. No client directive: it works in a server
 * tree and inside the client frame alike; the one handler is an optional prop.
 *
 *  - each row is a link to its own chapter, a grid of `2.4rem | 1fr`;
 *  - the meta line (member): "Not started", "Started · 38%", "Started" (a chapter
 *    marked unread, at 0%), "Finished" plus the accent tag "UPDATED", a legacy
 *    chapter's state plus the plain tag "ORIGINAL LAYOUT";
 *  - signed out: no state words and no counts, only the current row's "Reading now";
 *  - the current row is `accent-soft` with `aria-current="page"`; in the Contents
 *    sheet (`sections` given) its sections list sits under it, the one being read
 *    `aria-current="location"`.
 */
export function ChapterList({
  rows,
  member,
  sections,
  lang,
  currentSection,
  onSection,
  onOpen,
}: {
  rows: ChapterRow[];
  member: boolean;
  /** The current chapter's h2s, for the Contents sheet only. */
  sections?: ReaderHeading[];
  /** The current chapter's language: its sections' `lang`. */
  lang?: string;
  /** The h2 containing the section being read. */
  currentSection?: string | null;
  onSection?: (id: string) => void;
  onOpen?: () => void;
}) {
  return (
    <ol className="rd-chs" aria-label={READER.chapterList.label}>
      {rows.map((row) => {
        const word = member ? stateWord(row) : "";
        const showSep = row.current && word !== "";
        const hasMeta =
          row.current || word !== "" || row.updated || row.format === "legacy";
        return (
          <li key={row.key} className="rd-chs__item">
            <Link
              className="rd-ch"
              href={row.href}
              prefetch={false}
              aria-current={row.current ? "page" : undefined}
              onClick={onOpen}
            >
              <span className="rd-ch__n">{row.n}</span>
              <span className="rd-ch__body">
                <span className="rd-ch__title" lang={row.lang}>
                  {row.title}
                </span>
                {hasMeta ? (
                  <span className="rd-ch__meta">
                    {row.current ? (
                      <span className="rd-ch__now">
                        {READER.chapterList.readingNow}
                      </span>
                    ) : null}
                    {showSep ? <span aria-hidden="true">·</span> : null}
                    {word !== "" ? <span>{word}</span> : null}
                    {member && row.state === "finished" && row.updated ? (
                      <span className="rd-tag rd-tag--accent rd-ch__tag">
                        {READER.chapterList.updated}
                      </span>
                    ) : null}
                    {member && row.format === "legacy" ? (
                      <span className="rd-tag rd-tag--plain rd-ch__tag">
                        {READER.chapterList.originalLayout}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </span>
            </Link>
            {row.current && sections && sections.length > 0 ? (
              <ol
                className="rd-ch__secs"
                aria-label={READER.chapterList.sectionsLabel}
              >
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      className="rd-ch__sec"
                      href={`#${s.id}`}
                      lang={lang}
                      aria-current={
                        currentSection === s.id ? "location" : undefined
                      }
                      onClick={() => onSection?.(s.id)}
                    >
                      {s.text}
                    </a>
                  </li>
                ))}
              </ol>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function stateWord(row: ChapterRow): string {
  switch (row.state) {
    case "unopened":
      return READER.chapterList.notStarted;
    case "started":
      return row.percent && row.percent > 0
        ? READER.chapterList.startedAt(row.percent)
        : READER.chapterList.started;
    case "finished":
      return READER.chapterList.finished;
    default:
      return "";
  }
}
