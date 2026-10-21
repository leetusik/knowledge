// P30.S22 — the library's own words, from `06-library` round 01's *Every string written for
// these surfaces* (English only; D36 (4)). Pure functions for the plural and sentence forms,
// so the page, the skeleton and the tests read one source.

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

export const LIBRARY = {
  title: "Library",
  /** `<title>` of the member's library. */
  metaTitle: "Library",
  /** The sub line under the title; hidden when the library is empty. */
  sub: (books: number, docs: number): string =>
    `${plural(books, "book", "books")} · ${plural(docs, "document", "documents")}`,
  publicSub: (books: number, docs: number, any: boolean): string =>
    any
      ? `Public library · ${plural(books, "book", "books")} · ${plural(docs, "document", "documents")}`
      : "Public library",
  /** `/@{org}`, signed out; "Sign in" is a link. */
  signedOutNote: {
    before: "Signed out, nothing you read here is saved. ",
    link: "Sign in",
    after: " to keep your place in each book; you come back to this page.",
  },
  privateProgressNote: "Your progress in these books is private to you.",

  continue: {
    heading: "Continue reading",
    alsoInProgress: "Also in progress",
    chapterOf: (n: number, total: number): string => `Chapter ${n} of ${total}`,
    document: "Document",
    leftOffAt: "Left off at ",
    leftOffPct: (pct: number): string => `Left off at ${pct}%`,
    upNext: (n: number): string => `Up next · you finished chapter ${n}`,
    go: "Continue reading",
    goNext: "Read next",
  },

  shelves: {
    heading: "Books and documents",
    groupName: "Group books and documents",
    byProject: "By project",
    bySubject: "By subject",
    noSubjects:
      "Nothing has a subject yet. A book or document gets one when it's published with a subject.",
    withoutSubject: "Without a subject",
    count: (books: number, docs: number): string => {
      const out: string[] = [];
      if (books > 0) out.push(plural(books, "book", "books"));
      if (docs > 0) out.push(plural(docs, "document", "documents"));
      return out.join(" · ");
    },
    booksIn: (shelf: string): string => `Books in ${shelf}`,
    docsIn: (shelf: string): string => `Documents in ${shelf}`,
    publicTag: "Public",
    showAll: (n: number): string => `Show all ${n} documents`,
    showFewer: "Show fewer",
    emptyProjects: (n: number): string =>
      n === 1
        ? "1 project has nothing to read yet."
        : `${n} projects have nothing to read yet.`,
    onDashboard: "They're on the dashboard",
  },

  card: {
    chapters: (n: number): string => plural(n, "chapter", "chapters"),
    finished: (done: number, total: number): string =>
      `${done} of ${total} finished`,
    updated: "Updated",
    originalLayout: "Original layout",
  },
  row: {
    notStarted: "Not started",
    started: (pct: number): string =>
      pct > 0 ? `Started · ${pct}%` : "Started",
    finished: "Finished",
  },

  data: {
    heading: "Your reading data",
    lead: "What you've finished, your place in each book and document, bookmarks, highlights, notes, quiz answers and review cards. Only you can see them.",
    clear: "Clear all reading data",
    confirmTitle: "Clear all reading data?",
    removes: "This removes, from every library you read:",
    list: [
      "your place and progress in every book and document",
      "bookmarks",
      "highlights and notes",
      "quiz answers",
      "review cards and their schedule",
    ],
    keeps:
      "It keeps the books and documents themselves, your review settings, and your display settings on this device. It can't be undone.",
    cancel: "Cancel",
    confirm: "Yes, clear all reading data",
    clearing: "Clearing…",
    clearedLead: "All reading data cleared.",
    clearedRest: " Every book and document is back to the start.",
    failedLead: "Nothing was cleared.",
    failedRest:
      " Something on our side stopped, so your reading data is as it was. Try again.",
    ref: (id: string): string => `ref · ${id}`,
  },

  states: {
    loading: "Loading…",
    failedCode: "Error · 500",
    failedTitle: "Something on our side stopped reading.",
    failedLibrary:
      "Your library did not finish loading. Try again — and if it keeps failing, the reference below tells us where it stopped.",
    failedPublic:
      "This library did not finish loading. Try again — and if it keeps failing, the reference below tells us where it stopped.",
    retry: "Try again",
    ref: (id: string): string => `ref · ${id}`,
    emptyTitle: "No books or documents yet",
    emptyBody: "Publish one with an API key, and it shows up here.",
    emptyLink: "Create an API key on the dashboard",
    notFoundCode: "Not found · 404",
    notFoundTitle: "Library not found",
    notFoundBody:
      "There's no public library at this address. It may have moved, or the link may be wrong.",
    notFoundSignIn: "Sign in",
    notFoundBack: "‹ Back to your library",
    nothingPublicTitle: "Nothing here is public yet",
    nothingPublicBody: (org: string): string =>
      `Visitors to this address see a not-found page until a project is public. Only members of ${org} see this note.`,
    nothingPublicLink: "Make a project public on the dashboard",
  },
} as const;
