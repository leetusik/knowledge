import { READER } from "@/content";
import type { ReaderVersions } from "@/lib/reader/types";

import { publishedDate } from "@/lib/reader/date";

/**
 * The Version history sheet's body (`01-reader` §14, `VersionList`, board 17).
 *
 *  - the lead: "English · 2 earlier versions, newest first." (the variant's own
 *    language name), or "This is the only version.";
 *  - the rows, newest first: "vN" in mono, "Current" (accent tag) on the newest,
 *    "Published <date>", "Translated from English v1" on a translation; the open
 *    version is an `accent-soft` row with `aria-current` and "Reading now", every
 *    other row has a secondary "View" button ("View version N");
 *  - failed: "Unavailable" and the one-line reason (the chapter itself is fine).
 *
 * Server-safe: the one handler is the `onOpen` prop.
 */
export function VersionList({
  versions,
  version,
  newest,
  noun,
  onOpen,
}: {
  versions: ReaderVersions;
  /** The version on screen. */
  version: number;
  newest: number;
  noun: "chapter" | "document";
  onOpen: (n: number) => void;
}) {
  const t = READER.versions;
  if (!versions.ok) {
    return (
      <p className="rd-ver__fail">
        <span className="rd-ver__failcode">{t.unavailable}</span>
        <span className="rd-ver__failsub">{t.failed(noun)}</span>
      </p>
    );
  }
  return (
    <>
      <p className="rd-sheet__lead">
        {t.lead(versions.label, versions.rows.length - 1)}
      </p>
      <ol className="rd-vers" aria-label={t.listLabel}>
        {versions.rows.map((v) => {
          const open = v.n === version;
          return (
            <li
              key={v.n}
              className="rd-ver"
              aria-current={open ? "true" : undefined}
            >
              <div className="rd-ver__main">
                <span className="rd-ver__line">
                  <span className="rd-ver__n">v{v.n}</span>
                  {v.n === newest ? (
                    <span className="rd-tag rd-tag--accent">{t.current}</span>
                  ) : null}
                </span>
                {v.date ? (
                  <span className="rd-ver__date">
                    {t.published(publishedDate(v.date))}
                  </span>
                ) : null}
                {v.from ? (
                  <span className="rd-ver__from">
                    {t.from(v.from.label, v.from.version)}
                  </span>
                ) : null}
              </div>
              {open ? (
                <span className="rd-ver__reading">
                  {READER.chapterList.readingNow}
                </span>
              ) : (
                <button
                  type="button"
                  className="rd-btn rd-btn--secondary"
                  aria-label={t.viewAria(v.n)}
                  onClick={() => onOpen(v.n)}
                >
                  {t.view}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
