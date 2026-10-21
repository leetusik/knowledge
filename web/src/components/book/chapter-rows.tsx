"use client";

import Link from "next/link";
import { useState } from "react";

import { BOOK } from "@/content/book";
import { hangulRuns, isKorean } from "@/lib/reader/hangul";
import type { RowView } from "@/lib/book/view";

const T = BOOK.contents;

/**
 * Contents' chapter rows (`07-book-page` §5-§6, `ChapterRow`, board 09): the reader's
 * chapter list (`rd-chs`, a hairline above and one under each row) in manifest order. One
 * row's versions panel is open at a time on the page, so the list holds that one key.
 */
export function ChapterRows({ rows }: { rows: RowView[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ol className="rd-chs" aria-label={T.listName}>
      {rows.map((row) => (
        <li key={row.key} className="rd-chs__item">
          <Row
            row={row}
            open={open === row.key}
            onVersions={() =>
              setOpen((cur) => (cur === row.key ? null : row.key))
            }
          />
        </li>
      ))}
    </ol>
  );
}

function Row({
  row,
  open,
  onVersions,
}: {
  row: RowView;
  open: boolean;
  onVersions: () => void;
}) {
  const multiLang = row.langLinks.length > 1;
  const hasVars = multiLang || row.multiVer;
  const lead = row.slice ? (row.word ? ` · ${row.word}` : "") : row.word;
  const hasLead = !!row.slice || !!row.word;
  const showPanel = open && row.multiVer;
  return (
    <div className={hasVars ? "bk-row bk-row--vars" : "bk-row"}>
      <Link className="rd-ch" href={row.href} prefetch={false}>
        <span className="rd-ch__n">{row.n}</span>
        <span className="rd-ch__body">
          <span className="rd-ch__title" lang={row.lang}>
            {hangulRuns(row.title, !isKorean(row.lang))}
          </span>
          <span className="rd-ch__meta">
            {hasLead ? (
              <span>
                {row.slice ? (
                  <span className="bk-ch__src">{row.slice}</span>
                ) : null}
                {lead}
              </span>
            ) : null}
            {row.state === "updated" ? (
              <span className="rd-tag rd-tag--accent rd-ch__tag">
                {T.updated}
              </span>
            ) : null}
            {row.legacy ? (
              <span className="rd-tag rd-tag--plain rd-ch__tag">
                {T.originalLayout}
              </span>
            ) : null}
          </span>
        </span>
      </Link>
      {hasVars ? (
        <div className="bk-vars">
          {multiLang ? (
            <span className="bk-vars__langs">
              {row.langLinks.map((l) => (
                <span key={l.code} className="bk-lang">
                  <Link
                    className="bk-lang__link"
                    href={l.href}
                    lang={l.code}
                    prefetch={false}
                  >
                    {T.langLink(l.label, l.v)}
                  </Link>
                  {l.stale ? (
                    <span className="rd-tag">{T.olderTranslation}</span>
                  ) : null}
                </span>
              ))}
            </span>
          ) : null}
          {!multiLang && row.single ? (
            <span className="bk-vars__one">{row.single}</span>
          ) : null}
          {row.multiVer ? (
            <button
              type="button"
              className="rd-btn rd-btn--quiet bk-verbtn"
              aria-expanded={showPanel}
              onClick={onVersions}
            >
              <span className="bk-stack">
                <span className={showPanel ? "is-off" : undefined}>
                  {T.versions}
                </span>
                <span className={showPanel ? undefined : "is-off"}>
                  {T.hideVersions}
                </span>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}
      {showPanel ? (
        <div
          className="bk-verpanel"
          role="region"
          aria-label={T.versionsOf(row.n)}
        >
          {row.groups.map((g) => (
            <div key={g.code} className="bk-vergroup">
              {row.groups.length > 1 ? (
                <p className="bk-vergroup__name">
                  <span lang={g.code}>{g.label}</span>
                  {g.legacy ? (
                    <span className="rd-tag rd-tag--plain">
                      {T.originalLayout}
                    </span>
                  ) : null}
                </p>
              ) : null}
              <ol className="rd-vers">
                {g.rows.map((v) => (
                  <li key={v.v} className="rd-ver">
                    <div className="rd-ver__main">
                      <span className="rd-ver__line">
                        <span className="rd-ver__n">v{v.v}</span>
                        {v.current ? (
                          <span className="rd-tag rd-tag--accent">
                            {T.current}
                          </span>
                        ) : null}
                      </span>
                      {v.published ? (
                        <span className="rd-ver__date">{v.published}</span>
                      ) : null}
                      {v.from ? (
                        <span className="rd-ver__from">{v.from}</span>
                      ) : null}
                    </div>
                    <Link
                      className="rd-btn rd-btn--secondary"
                      href={v.href}
                      aria-label={v.aria}
                      prefetch={false}
                    >
                      {T.view}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
