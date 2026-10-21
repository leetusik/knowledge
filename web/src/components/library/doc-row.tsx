import { Fragment } from "react";

import Link from "next/link";

import { LIBRARY } from "@/content";
import type { DocRow } from "@/lib/library/model";

import { LangText } from "./lang-text";

/**
 * `DocRow` (`06-library` §6, board 09): a loose document as a row link. Signed in, the state
 * in the reader's words ("Not started", "Started · 38%", "Finished"); then the newest
 * version's date, `UPDATED` (finished on an older version) and `ORIGINAL LAYOUT`. No version
 * numbers and no series markers.
 */
export function DocRowView({
  doc,
  signedIn,
  showProject,
}: {
  doc: DocRow;
  signedIn: boolean;
  showProject: boolean;
}) {
  const parts: { text: string; label?: boolean }[] = [];
  if (showProject) parts.push({ text: doc.project, label: true });
  if (signedIn) {
    parts.push({
      text:
        doc.state === "started"
          ? LIBRARY.row.started(doc.pct)
          : doc.state === "finished"
            ? LIBRARY.row.finished
            : LIBRARY.row.notStarted,
    });
  }
  parts.push({ text: doc.date });
  return (
    <Link className="lib-row" href={doc.href}>
      <span className="lib-row__title">
        <LangText text={doc.title} lang={doc.lang} />
      </span>
      <span className="lib-row__meta">
        {parts.map((p, i) => (
          <Fragment key={i}>
            {i > 0 ? (
              <span className="lib-dot" aria-hidden="true">
                ·
              </span>
            ) : null}
            <span className={p.label ? "lib-label" : undefined}>{p.text}</span>
          </Fragment>
        ))}
        {signedIn && doc.updated ? (
          <span className="rd-tag rd-tag--accent">{LIBRARY.card.updated}</span>
        ) : null}
        {doc.legacy ? (
          <span className="rd-tag rd-tag--plain">
            {LIBRARY.card.originalLayout}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
