// P30.S13 — the reader's own words, from `01-reader` round 02's *Every string written
// for the reader* (the chrome copy is English only; D36 (4)). Only what the shell
// builds is here: the top bar, the chapter bar, the sheets, Sign in to save and the
// three states. The chapter opening, the resume pill, the chapter end and version
// history carry their strings in S14 and S15.

export const READER = {
  /** The skip button, first in the tab order, shown while the chrome is hidden. */
  showControls: "Show reading controls",
  top: {
    logoLabel: "knowledge library",
    /** A loose document's back link (and its short form) go to the library. */
    library: "Library",
    /** Below 40rem a chapter's back link says this instead of the book title. */
    bookShort: "Book",
    olderVersion: (v: number): string => `Older version · v${v}`,
    languageLabel: "Language",
    display: "Display",
    signIn: "Sign in",
  },
  bottom: {
    navLabel: "Chapters",
    previous: "Previous",
    contents: "Contents",
    next: "Next →",
    backToBook: "Back to the book →",
    backToBookShort: "The book →",
    where: (n: number, total: number, pct: number): string =>
      `Chapter ${n} of ${total} · ${pct}%`,
    /** The compact bar's short count, under 20rem. */
    count: (n: number, total: number): string => `${n} of ${total}`,
  },
  chapterList: {
    label: "Chapters",
    sectionsLabel: "Sections of this chapter",
    notStarted: "Not started",
    started: "Started",
    startedAt: (pct: number): string => `Started · ${pct}%`,
    finished: "Finished",
    updated: "Updated",
    originalLayout: "Original layout",
    readingNow: "Reading now",
  },
  sheets: {
    close: "Close",
    closePanel: "Close panel",
    contents: "Contents",
    display: "Display",
    versionHistory: "Version history",
    bookMeta: (n: number, total: number, finished: number | null): string =>
      finished === null
        ? `Chapter ${n} of ${total}`
        : `Chapter ${n} of ${total} · ${finished} of ${total} finished`,
  },
  display: {
    textSize: "Text size",
    theme: "Theme",
    sizeAria: (n: number, note: string): string =>
      `Text size ${n} of 5${note ? `, ${note}` : ""}`,
    sizeNote: { 1: "smallest", 3: "default", 5: "largest" } as Record<
      number,
      string
    >,
    themes: {
      system: "System",
      light: "Light",
      dark: "Dark",
      sepia: "Sepia",
    },
    systemNote: (os: "light" | "dark"): string =>
      ` · follows this device, ${os} now`,
    sepiaNote: " · warm paper, for long reading",
    saved: "Saved on this device. Your other devices keep their own.",
  },
  save: {
    title: "Sign in to save",
    body: (what: string): string =>
      `Signed in, your ${what} are kept across your devices.`,
    place: (place: "chapter" | "document"): string =>
      ` After you sign in, you come back to this ${place}, at this section.`,
    signIn: "Sign in",
    notNow: "Not now",
    /** `what`, per the surface that raises the prompt. */
    whats: {
      progress: "finished chapters and your place in each one",
      bookmarks: "bookmarks",
      notes: "highlights and notes",
      quiz: "quiz answers",
    },
  },
  states: {
    loadingLabel: "Loading…",
    notFoundCode: "Not found · 404",
    notFoundTitle: (noun: "chapter" | "document"): string =>
      `${noun === "chapter" ? "Chapter" : "Document"} not found`,
    notFoundSub: (noun: "chapter" | "document"): string =>
      `There's no ${noun} at this address. It may have moved, or the link may be wrong.`,
    backToLibrary: "Back to the library",
    errorCode: "Error · 500",
    errorTitle: "Something on our side stopped reading.",
    errorSub: (noun: "chapter" | "document"): string =>
      `This ${noun} did not finish loading. Try again — and if it keeps failing, the reference below tells us where it stopped.`,
    retry: "Try again",
    refPrefix: "ref",
  },
} as const;
