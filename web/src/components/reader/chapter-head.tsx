import Link from "next/link";

import { READER } from "@/content";
import { publishedDate } from "@/lib/reader/date";
import { hangulRuns, isKorean, joinHyphens } from "@/lib/reader/hangul";
import { readerHref } from "@/lib/reader-href";
import type { ReaderHeading, ReaderView } from "@/lib/reader/types";

import { VersionsButton } from "./versions-button";

/**
 * The chapter opening (`01-reader` §5, `ChapterHead`, board 08), a server component:
 * the book line, the title, the lede, the version line, the notices and the generated
 * table of contents, in that order. It sits in the text column, above the body.
 *
 * Hangul runs inside other-language text are wrapped (§6a): the title, the lede, the
 * contents entries and the book title (which carries no language of its own, so it
 * is always wrapped). A Korean variant is `lang="ko"` already.
 */
export function ChapterHead({ view }: { view: ReaderView }) {
  const loose = view.kind === "loose" || view.book === null;
  const noun = loose ? "document" : "chapter";
  const wrap = !isKorean(view.lang);
  const older = view.version < view.newest;
  const hasHistory = view.newest > 1;
  const h2s = view.headings.filter((h) => h.level === 2).length;

  // The newest version of this same chapter and language; the source language's newest.
  const newestHref = readerHref(view.target, {
    lang: view.langs.length > 1 ? view.lang : null,
  });
  const src = view.staleSource;

  return (
    <header className="rd-head">
      <p className="rd-head__book">
        <span className="rd-head__n">
          {loose || !view.book
            ? READER.opening.document
            : READER.opening.chapterOf(view.book.n, view.book.total)}
        </span>
        <span>
          {hangulRuns(
            loose || !view.book ? view.project : view.book.title,
            true,
          )}
        </span>
      </p>
      <h1 className="rd-head__title" lang={view.lang}>
        {hangulRuns(joinHyphens(view.title), wrap)}
      </h1>
      {view.summary ? (
        <p className="rd-head__lede" lang={view.lang}>
          {hangulRuns(view.summary, wrap)}
        </p>
      ) : null}
      <p className="rd-head__meta">
        <span>
          {READER.opening.version(view.version, publishedDate(view.date))}
        </span>
        {hasHistory ? (
          <>
            <span aria-hidden="true">·</span>
            <VersionsButton />
          </>
        ) : null}
      </p>
      {older ? (
        <div className="rd-notice">
          <p className="rd-notice__text">
            <span className="rd-notice__label">
              {READER.opening.olderVersion}
            </span>
            <span>
              {READER.opening.olderVersionBody(view.version, view.newest, noun)}
            </span>
          </p>
          <Link className="rd-linkbtn" href={newestHref} prefetch={false}>
            {READER.opening.readNewest(view.newest)}
          </Link>
        </div>
      ) : null}
      {src ? (
        <div className="rd-notice">
          <p className="rd-notice__text">
            <span className="rd-notice__label">
              {READER.opening.olderTranslation}
            </span>
            <span>
              {READER.opening.olderTranslationBody(
                src.label,
                src.from,
                src.newest,
              )}
            </span>
          </p>
          <Link
            className="rd-linkbtn"
            href={readerHref(view.target, { lang: src.lang })}
            prefetch={false}
          >
            {READER.opening.readSource(src.label, src.newest)}
          </Link>
        </div>
      ) : null}
      {h2s >= 2 ? (
        <Toc
          noun={noun}
          headings={view.headings}
          lang={view.lang}
          wrap={wrap}
        />
      ) : null}
    </header>
  );
}

/** The generated contents: every h2 with its h3s under it, from the chapter's heading ids. */
function Toc({
  noun,
  headings,
  lang,
  wrap,
}: {
  noun: string;
  headings: ReaderHeading[];
  lang: string;
  wrap: boolean;
}) {
  const groups: { h2: ReaderHeading; subs: ReaderHeading[] }[] = [];
  for (const h of headings) {
    if (h.level === 2) groups.push({ h2: h, subs: [] });
    else if (groups.length) groups[groups.length - 1].subs.push(h);
  }
  const label = READER.opening.contents(noun);
  return (
    <div className="rd-toc">
      <p className="rd-toc__label">{label}</p>
      <ol className="rd-toc__list" aria-label={label}>
        {groups.map(({ h2, subs }) => (
          <li key={h2.id} className="rd-toc__group">
            <a className="rd-toc__a" href={`#${h2.id}`} lang={lang}>
              {hangulRuns(h2.text, wrap)}
            </a>
            {subs.length ? (
              <ol className="rd-toc__sub">
                {subs.map((s) => (
                  <li key={s.id}>
                    <a className="rd-toc__a" href={`#${s.id}`} lang={lang}>
                      {hangulRuns(s.text, wrap)}
                    </a>
                  </li>
                ))}
              </ol>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
