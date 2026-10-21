// P30.S23 — the book page's own words, from `07-book-page` round 01's *Every string written
// for the book page* (English only; D36 (4)). The reader's words that the page reuses
// unchanged ("Not started", "UPDATED", "CURRENT"...) are written here once more only where
// the book page builds the sentence itself; pure functions carry the plural forms so the
// page, the skeleton and the tests read one source.

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

export const BOOK = {
  /** The tab title of a book that did not load. */
  metaTitle: "Book",
  top: {
    library: "Library",
    signIn: "Sign in",
  },
  head: {
    codebase: "Codebase",
    subject: "Subject",
    place: (org: string, project: string): string => `@${org} / ${project}`,
    finished: (done: number, total: number): string =>
      `${done} of ${total} finished`,
    chapters: (total: number): string => plural(total, "chapter", "chapters"),
    anonLead: "Signed-out reading isn't saved. ",
    anonLink: "Sign in",
    anonTail: " to keep your place and progress in this book.",
  },
  cont: {
    continue: (n: number): string => `Continue · Chapter ${n}`,
    next: (n: number): string => `Next · Chapter ${n}`,
    start: (n: number): string => `Start · Chapter ${n}`,
    finished: "Finished",
    stoppedAtLead: "You stopped at ",
    stoppedAtTail: (pct: number): string => `, ${pct}% of the way in.`,
    stoppedPct: (pct: number): string => `You stopped ${pct}% of the way in.`,
    opened: "You've opened it, but not read far yet.",
    youFinished: (n: number): string => `You finished chapter ${n}.`,
    allFinished: (total: number): string =>
      `You've finished all ${total} chapters.`,
    updated: (n: number): string =>
      `Chapter ${n} has been updated since you finished it.`,
    continueReading: "Continue reading",
    readNext: "Read next",
    readChapter: (n: number): string => `Read chapter ${n}`,
    readAgain: (n: number): string => `Read chapter ${n} again`,
    originalLayout: "Original layout",
  },
  notes: {
    title: "Notes in this book",
    count: (n: number, chapters: number): string =>
      n === 0
        ? "Nothing marked yet"
        : `${plural(n, "item", "items")} in ${plural(chapters, "chapter", "chapters")}`,
  },
  contents: {
    title: "Contents",
    listName: "Chapters",
    phases: "One chapter for each phase that was explained, in phase order.",
    slices: (phase: string): string =>
      `One chapter for each slice of ${phase}, in slice order.`,
    notStarted: "Not started",
    started: "Started",
    startedAt: (pct: number): string => `Started · ${pct}%`,
    finished: "Finished",
    updated: "Updated",
    originalLayout: "Original layout",
    olderTranslation: "Older translation",
    current: "Current",
    published: (date: string): string => `Published ${date}`,
    translatedFrom: (language: string, version: number): string =>
      `Translated from ${language} v${version}`,
    view: "View",
    viewAria: (n: number, language: string | null): string =>
      `View version ${n}${language ? `, ${language}` : ""}`,
    langLink: (language: string, version: number): string =>
      `${language} · v${version}`,
    single: (version: number, date: string): string =>
      date ? `v${version} · ${date}` : `v${version}`,
    versions: "Versions",
    hideVersions: "Hide versions",
    versionsOf: (n: number): string => `Versions of chapter ${n}`,
  },
  data: {
    title: "Your reading data",
    lead: "Your place, progress, bookmarks, highlights and notes in this book are kept for you alone.",
    trigger: "Clear this book's reading data",
    question: "Clear your reading data for this book?",
    removesLead: "This removes, from ",
    removesTail: " only:",
    place: (n: number): string =>
      `your place and progress in ${plural(n, "chapter", "chapters")}`,
    marks: (n: number): string =>
      n === 1
        ? "1 bookmark, highlight or note"
        : `${n} bookmarks, highlights and notes`,
    quiz: "your quiz answers, and the review cards from its chapters",
    keeps:
      "It keeps every other book, the chapters themselves, and your display settings on this device. You can't undo this.",
    cancel: "Cancel",
    confirm: "Clear reading data",
    clearing: "Clearing…",
    failedLead: "Couldn't clear this book's reading data.",
    failedRest: " Nothing was cleared. Try again.",
    doneLead: "Reading data cleared.",
    doneRest:
      " Every chapter of this book reads Not started, and there's no place to continue from.",
  },
  states: {
    loadingLabel: "Loading…",
    notFoundCode: "Not found · 404",
    notFoundTitle: "Book not found",
    notFoundSub:
      "There's no book at this address. It may have moved, or the link may be wrong.",
    backToLibrary: "Back to the library",
    errorCode: "Error · 500",
    errorTitle: "Something on our side stopped reading.",
    errorSub:
      "This book did not finish loading. Try again — and if it keeps failing, the reference below tells us where it stopped.",
    retry: "Try again",
    refPrefix: "ref",
  },
} as const;
