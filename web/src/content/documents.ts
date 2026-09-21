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

    // ── Round 06 §7, the screen/control half (P28.S7 · D30 default: the card
    //    copy adopted VERBATIM). The print-only strings (`print.*`) are P28.S8's.
    //    The six `export*` strings are copy for S8's `<ExportPdfButton>`; they
    //    land here with the rest of their table so one slice owns one table.

    /** The Export PDF control's resting label (§7). */
    exportLabel: "Export PDF",
    /** Its `aria-busy` label while the print dialog is being opened. */
    exportPending: "Preparing…",
    /** The hint line under the control on a desktop browser. */
    exportDialog:
      "Choose Save as PDF as the destination. Keep headers and footers on if you want page numbers.",
    /** The hint line on iOS, where printing goes through the share sheet. */
    exportDialogIos: "Print goes to the share sheet — choose Save to Files.",
    /** `window.print()` threw, or `beforeprint` never fired. */
    exportFailed:
      "Couldn't open the print dialog. Use your browser's Print command instead — ⌘P, or Ctrl+P.",
    /** Shown BEFORE the dialog when the page holds an unmeasured explainer. */
    exportUnmeasured:
      "This explainer didn't report its height, so only its first page will print. Open it full width and print from there.",

    /** The control that enters the chrome-less view (`?view=full`). */
    fullWidthLabel: "Full width",
    /** The floating exit pill's visible label in that view. */
    fullWidthExit: "Exit full width",
    /** The waiting line inside the explainer frame, before its height lands. */
    explainerLoading: "Loading explainer…",
    /** The honest footnote under a frame that never reported a height. */
    explainerUnmeasured:
      "This explainer didn't report its height, so it scrolls inside its frame. Open it full width for the whole page.",

    /**
     * The relay's two failure answers, rendered as an editorial INSIDE the
     * frame's reserved box (§5, `explainer-frame.tsx`). The two sub lines and
     * `reload` are §7's own; the two mono eyebrows are not in §7 at all —
     * `notFound` reuses `STATES.notFoundCode` at the call site and
     * `upstreamCode` is ORIGINATED here as the exact parallel of round 03's
     * `Error · 500` (reported as a §7 record gap, P28.S7).
     */
    explainerError: {
      notFound:
        "This explainer's file couldn't be found. Its metadata is above; the body may have been removed from the content plane.",
      upstream:
        "The explainer couldn't be loaded right now. Reload the page to try again.",
      /** ORIGINATED — §7 gives the 404 branch no eyebrow either; that one reuses `STATES.notFoundCode`. */
      upstreamCode: "Error · 502",
      reload: "Reload",
    },

    /**
     * Accessible names for the two regions in a document body that SCROLL and
     * therefore must be focusable (§6: "Code block" / "Table"). §6 states both
     * literals in prose and §7 lists no key for either — reported as a record
     * gap; the strings themselves are the record's. The language suffix is the
     * only originated part, and it is what §5's "an aria-label from the fence's
     * language" asks for.
     */
    regions: {
      code: (language: string | null): string =>
        language === null ? "Code block" : `Code block (${language})`,
      table: "Table",
    },
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

  /**
   * Version history (P23.S3) — the read page's history panel and the past-version
   * view at `/documents/{id}/versions/{v}`.
   *
   * Two facts the copy must keep straight, because both are counter-intuitive:
   *   - the CURRENT version is not an archived version (it IS the document), so the
   *     panel lists the current row from the document itself and links only the
   *     superseded ones;
   *   - a version row's `created_at` is when that body was ARCHIVED (i.e. when the
   *     next version replaced it), not when it was written — hence "Superseded",
   *     never "Created".
   */
  versions: {
    /** `v3` — the compact version label used in the panel, links and headings. */
    label: (n: number): string => `v${n}`,

    panel: {
      heading: "Version history",
      /** Sub-line under the panel heading; `n` counts the SUPERSEDED versions. */
      lead: (n: number): string =>
        `${n === 1 ? "1 earlier version" : `${n} earlier versions`} of this document, newest first.`,
      columns: {
        version: "Version",
        title: "Title",
        superseded: "Superseded",
        actions: "Actions",
      },
      /** Chip on the row for the live document. */
      currentLabel: "Current",
      /** Shown in the Superseded column for the current (still-live) row. */
      currentDash: "—",
      /** Per-row link into the past-version view. */
      viewLabel: "View",
      /** Accessible name for that link (the label alone is ambiguous per row). */
      viewAriaPrefix: "View version",

      /**
       * Round 06 §5 — the panel's FAILURE state. Before this round a history
       * fetch that threw was indistinguishable from a document with no history
       * (both drew nothing); `loadVersions` now returns `{ ok: false }` and the
       * panel says so. The mono eyebrow and the sub line are §7's own; there is
       * deliberately no button (the page itself is fine — reloading is the
       * reader's own move). (P28.S7)
       */
      failedCode: "Unavailable",
      failedSub:
        "Couldn't load this document's history. The document itself is fine — reload to try again.",
    },

    read: {
      /** Static <title> for the past-version view (the SITE template adds the suffix). */
      title: "Document version",
      /** Back link to the live document. */
      backLabel: "Current version",
      /**
       * The banner above a past body. Says plainly that this is not what the
       * document says today, and names the version that is.
       */
      notice: (viewing: number, current: number): string =>
        `You're reading v${viewing} of this document. It was superseded — the current version is v${current}.`,
      /** Field labels in the past-version metadata strip. */
      fields: {
        version: "Version",
        superseded: "Superseded",
        date: "Date",
        tags: "Tags",
        archive: "Archive",
      },
      /** Shown when an archived body is empty. */
      emptyBody: "This version has no content.",
    },
  },

  /** The branded not-found (`[id]/not-found.tsx`), on the `.kb-empty` classes. */
  notFound: {
    title: "Document not found",
    sub: "This document doesn't exist, or it isn't part of your org.",
    backLabel: "Back to documents",
  },

  /**
   * The PRETTY-URL not-found (P25.S3 —
   * `(public)/[org]/[project]/[slug]/not-found.tsx`). A separate block from
   * `notFound` above because that surface is reached by id and its CTA points at the
   * member-gated `/documents` list; this one is the public share surface, so most
   * visitors are anonymous strangers and the CTA must go somewhere they can actually
   * go — the marketing home.
   *
   * The copy stays deliberately vague about WHY: the resolver answers one
   * indistinguishable 404 for an unknown org slug, an unknown project, an unknown doc
   * slug and a private project alike (404-never-403), so naming a cause here would
   * either be a guess or a leak.
   */
  publicNotFound: {
    title: "Document not found",
    sub: "This link doesn't point at a shared document. It may have moved, been unshared, or never existed.",
    homeLabel: "Go to knowledge",
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
