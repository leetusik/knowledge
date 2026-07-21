// Documents-surface copy (P12.S5) — the per-tenant knowledge viewer: browse + search
// the tenant's documents, and read one (rendered markdown). Copy-as-data per the S1
// convention: the pages never hardcode strings inline.

export const DOCUMENTS = {
  /** Document <title> for the list (the SITE template appends " · knowledge"). */
  title: "Documents",
  /** Mono eyebrow suffix on the list header, rendered as `{tenant} · {eyebrow}`. */
  eyebrow: "Org",
  /** Sub-line under the list title. */
  sub: "Browse and search every document in your org.",

  search: {
    /** Accessible label for the search input. */
    label: "Search documents",
    placeholder: "Search titles and content…",
    /** Accessible label for the project filter select. */
    projectLabel: "Project",
    /** The blank "all projects" first option. */
    projectAll: "All projects",
    submitLabel: "Search",
    resetLabel: "Reset",
    /** Mono hint under the search form. */
    hint: "Search matches titles, tags, and body text. Leave blank to browse newest-first.",
  },

  list: {
    columns: {
      title: "Title",
      project: "Project",
      date: "Date",
      tags: "Tags",
    },
    /** No tags on a row. */
    noTags: "—",
    /** No documents at all yet (nothing has been ingested). */
    emptyNoDocuments:
      "No documents yet. Ingest documents with an API key to see them here.",
    /** The current filters/search matched nothing. */
    emptyNoMatches: "No documents match your filters. Try a broader search.",
  },

  count: {
    /** `{n} results` / `1 result` — the match-count line above the table. */
    label: (n: number): string =>
      `${n.toLocaleString("en-US")} ${n === 1 ? "result" : "results"}`,
  },

  pager: {
    prevLabel: "Previous",
    nextLabel: "Next",
    /** Accessible label for the pager nav landmark. */
    ariaLabel: "Documents pagination",
  },

  read: {
    /** Back link to the list. */
    backLabel: "All documents",
    /** Mono eyebrow above the document title, rendered as `{project}`. */
    eyebrow: (project: string): string => project,
    /** Field labels in the metadata strip. */
    fields: {
      project: "Project",
      date: "Date",
      tags: "Tags",
      source: "Source",
    },
    /** Shown for the source field when the document carries no `source_repo`. */
    noSource: "—",
    /** Shown when a document has no body (empty markdown). */
    emptyBody: "This document has no content.",
  },

  /** The branded not-found (`[id]/not-found.tsx`), on the `.kb-empty` classes. */
  notFound: {
    title: "Document not found",
    sub: "This document doesn't exist, or it isn't part of your org.",
    backLabel: "Back to documents",
  },

  /**
   * The list-level not-found (`not-found.tsx`) — reached only when a hand-crafted
   * `?project=` filter doesn't resolve to one of the tenant's projects (404/400).
   */
  filterNotFound: {
    title: "No such view",
    sub: "That project filter doesn't match a project in your org.",
    backLabel: "Back to documents",
  },
} as const;

export type DocumentsCopy = typeof DOCUMENTS;
