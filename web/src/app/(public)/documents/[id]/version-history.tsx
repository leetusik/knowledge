import Link from "next/link";

import { Editorial } from "@/components/states";
import { appButtonClass, DataTable, type DataTableColumn } from "@/components/ui";
import { DOCUMENTS } from "@/content";
import type { KbDocumentVersion } from "@/lib/knowledge/types";

// P23.S3 — the document read page's version-history panel. A SERVER component and
// pure presentation: it fetches nothing and holds no auth, so the identical panel
// serves the member and the anonymous branch (browsing history is as public as the
// document itself — knowledge scopes the archive to the OWNING document's tenant).
// It sits in the page rather than inside `<DocumentView>`, which stays the shared
// body renderer.
//
// The chain is "the live document + its superseded bodies": knowledge deliberately
// does NOT address the current version as a version (that URL is a 404), so the
// first row is built from the `KbDocument` the page already has and only the
// archived rows link out. The panel renders ONLY when there is history — an
// unversioned corpus draws byte-identically to pre-P23.
//
// No new visual language (phase finding F6): `.kb-panel` + `.kb-panel__head` chrome
// and the existing headless `<DataTable>`, exactly like the project page's
// credentials table.
//
// P28.S7 (round 06 §5) gives it three things: the `.kb-docversions` name the
// full-width view hides it by, column PRIORITIES (Title 3, Superseded 2 — round
// 03 §4.6's `data-pri`, emitted by `<DataTable>`), and — the real change — an
// `ok` prop. Until now a history fetch that THREW was indistinguishable from a
// document with no history, because `loadVersions` caught the error and returned
// an empty list: the panel simply vanished and nobody was told. It now returns
// `{ ok: false }` and this says so.

/** One row of the table, normalized across "the live document" and an archive row. */
interface VersionRow {
  version: number;
  title: string;
  /** ISO archive time; `null` marks the current (not-yet-superseded) row. */
  supersededAt: string | null;
}

/** `"2026-03-12T09:31:02+00:00"` → `"2026-03-12"`; unparseable → its first 10 chars. */
function formatDate(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso.slice(0, 10);
  return at.toISOString().slice(0, 10);
}

export function VersionHistory({
  id,
  currentVersion,
  currentTitle,
  versions,
  ok,
}: {
  id: number;
  currentVersion: number;
  currentTitle: string;
  /** SUPERSEDED versions only, newest first — the server's order, kept verbatim. */
  versions: KbDocumentVersion[];
  /**
   * `false` ⇒ the history fetch FAILED (round 06 §5). Absent/`true` ⇒ the list is
   * the truth, including the empty list, which is the ordinary answer for a
   * document that has never been re-published.
   */
  ok?: boolean;
}) {
  // The failure panel: the head, then the editorial, and deliberately NO button —
  // the document itself loaded, so there is nothing here to retry that reloading
  // the page would not do better.
  if (ok === false) {
    return (
      <section className="kb-panel kb-docversions" aria-labelledby="version-history-head">
        <div className="kb-panel__head">
          <div>
            <h2
              id="version-history-head"
              className="kb-app-h2"
              style={{ fontSize: "1.05rem" }}
            >
              {DOCUMENTS.versions.panel.heading}
            </h2>
          </div>
        </div>
        <Editorial
          variant="inline"
          code={DOCUMENTS.versions.panel.failedCode}
          sub={DOCUMENTS.versions.panel.failedSub}
        />
      </section>
    );
  }

  // No history ⇒ no panel. `total: 0` is the normal answer for a document that has
  // never been re-published, not an error, so this is the common case.
  if (versions.length === 0) return null;

  const rows: VersionRow[] = [
    { version: currentVersion, title: currentTitle, supersededAt: null },
    ...versions.map((v) => ({
      version: v.version,
      title: v.title,
      supersededAt: v.created_at,
    })),
  ];

  const columns: DataTableColumn<VersionRow>[] = [
    {
      key: "version",
      header: DOCUMENTS.versions.panel.columns.version,
      className: "mono",
      cell: (row) => (
        <span className="flex items-center gap-[0.45rem]">
          {DOCUMENTS.versions.label(row.version)}
          {row.supersededAt === null ? (
            <span className="kb-chip">
              {DOCUMENTS.versions.panel.currentLabel}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "title",
      header: DOCUMENTS.versions.panel.columns.title,
      // Round 06 §5 — the one column a narrow console can lose: the version
      // number and the date already identify a row.
      priority: 3,
      // An archived row keeps the title that body carried — a retitled document
      // shows its old titles here, which is the point of a history.
      cell: (row) => row.title,
    },
    {
      key: "superseded",
      header: DOCUMENTS.versions.panel.columns.superseded,
      className: "mono",
      priority: 2,
      // When this body was ARCHIVED (i.e. when the next version replaced it) — not
      // when it was authored. The live row has not been superseded at all.
      cell: (row) =>
        row.supersededAt === null
          ? DOCUMENTS.versions.panel.currentDash
          : formatDate(row.supersededAt),
    },
    {
      key: "actions",
      // Visually blank (the links name themselves), announced to screen readers —
      // the documents-list convention.
      header: (
        <span className="sr-only">
          {DOCUMENTS.versions.panel.columns.actions}
        </span>
      ),
      actions: true,
      // The current row is the page you are already on, so it links nowhere.
      // Round 06 §5: a ghost `sm` BUTTON carrying the version in its VISIBLE
      // label — below 40rem the table stacks into one card per row, where a bare
      // "View" has no row left to belong to. The visible text is now unambiguous
      // on its own, so the `aria-label` that used to supply the version is gone
      // rather than duplicated.
      cell: (row) =>
        row.supersededAt === null ? null : (
          <Link
            href={`/documents/${id}/versions/${row.version}`}
            className={appButtonClass("ghost", "sm")}
          >
            {DOCUMENTS.versions.panel.viewLabel}{" "}
            {DOCUMENTS.versions.label(row.version)}
          </Link>
        ),
    },
  ];

  return (
    // `.kb-docversions` (§3.1) carries no margin of its own — the article's own
    // `gap` is the rhythm now — and is the name `?view=full` hides the panel by.
    <section
      className="kb-panel kb-docversions"
      aria-labelledby="version-history-head"
    >
      <div className="kb-panel__head">
        <div>
          <h2
            id="version-history-head"
            className="kb-app-h2"
            style={{ fontSize: "1.05rem" }}
          >
            {DOCUMENTS.versions.panel.heading}
          </h2>
          <p className="mt-[0.3rem] text-[0.85rem] text-[var(--kb-secondary)]">
            {DOCUMENTS.versions.panel.lead(versions.length)}
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.version)}
      />
    </section>
  );
}
