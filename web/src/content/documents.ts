// Documents-surface copy (P12.S5) — the per-tenant knowledge viewer: browse + search
// the tenant's documents, and read one (rendered markdown). P21 adds the member
// delete action (list rows + the read page's member branch). Copy-as-data per the S1
// convention: the pages never hardcode strings inline.
//
// As in `project.ts` / `auth.ts`, the form error copy is keyed by HTTP STATUS, never
// by knowledge's `detail` text — the text is a server-side implementation detail.

/**
 * Status-keyed delete-document error copy (P21.S2), mirroring
 * `REVOKE_CREDENTIAL_ERRORS`.
 *
 * `notFound` covers BOTH of the backend's 404 cases — a document that is already
 * gone and one belonging to another org — because the endpoint answers them
 * identically (404-never-403, so ids cannot be probed). One member CAN see another
 * org's public document on the read page; deleting it lands here.
 */
export const DELETE_DOCUMENT_ERRORS = {
  /** A tampered/garbled hidden input, or knowledge's 400/422 on a non-integer id. */
  invalidRequest:
    "Could not delete that document. Reload the page and try again.",
  /** 401 — the session died mid-request; the next navigation bounces to /login. */
  sessionExpired: "Your session has expired. Sign in again to continue.",
  /** 404 — already deleted, or not part of your org. */
  notFound: "That document no longer exists, or it isn't part of your org.",
  /** 5xx / network / anything else. */
  generic: "Could not delete the document. Please try again.",
} as const;

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
      /** The trailing actions column — visually blank, announced to screen readers. */
      actions: "Actions",
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

  /**
   * The member delete action (P21) — the per-row control on the list and the
   * trailing control on the read page's member branch. Mirrors `PROJECT.revoke`.
   *
   * The delete is HARD: the file, its database row, its search index entry, and its
   * embeddings all go, and a public document's shared URL and graph edges break with
   * it. There is no trash and no undo, so the copy says so and promises nothing about
   * recovery.
   */
  delete: {
    label: "Delete",
    /** Shown in place of the button once the confirm step is armed. */
    confirmPrompt: "Delete permanently? This can't be undone.",
    confirmLabel: "Yes, delete",
    cancelLabel: "Cancel",
    pendingLabel: "Deleting…",
    /** Accessible name for the action (the label alone is ambiguous per row). */
    ariaLabelPrefix: "Delete document",
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
