// P30.S13 — the reader's own words, from `01-reader` round 02's *Every string written
// for the reader* (the chrome copy is English only; D36 (4)). Only what the shell
// builds is here: the top bar, the chapter bar, the sheets, Sign in to save and the
// three states. The chapter opening's strings (P30.S14) are under `opening`; the
// resume pill, the chapter end and version history's (P30.S15) are under `resume`,
// `end` and `versions`.

export const READER = {
  /** The chapter opening (`ChapterHead`, §5). */
  opening: {
    chapterOf: (n: number, total: number): string => `Chapter ${n} of ${total}`,
    document: "Document",
    version: (v: number, date: string): string => `v${v} · Published ${date}`,
    versionHistory: "Version history",
    olderVersion: "Older version",
    olderVersionBody: (v: number, newest: number, noun: string): string =>
      `You're reading v${v} of this ${noun}. It was superseded — the current version is v${newest}.`,
    readNewest: (newest: number): string => `Read v${newest} →`,
    olderTranslation: "Older translation",
    olderTranslationBody: (
      source: string,
      from: number,
      newest: number,
    ): string =>
      `Translated from ${source} v${from}. ${source} has been updated since: it is at v${newest}.`,
    readSource: (source: string, newest: number): string =>
      `Read ${source} v${newest} →`,
    contents: (noun: string): string => `In this ${noun}`,
  },
  /** The resume pill (§4). */
  resume: {
    lead: "Picked up where you left off",
    fromTop: "From the top",
  },
  /** The chapter end (§10). Each sentence is a [state word, sub-line] pair. */
  end: {
    mark: (noun: string): string => `End of ${noun}`,
    signedOut: [
      "Not saved",
      "Signed-out reading isn't saved. Your display settings stay on this device.",
    ] as const,
    finished: ["Finished", "Saved to your progress."] as const,
    updated: (noun: string): readonly [string, string] => [
      "Finished",
      `You finished an earlier version. This ${noun} has been updated since.`,
    ],
    unread: [
      "Not finished",
      "Marked as unread. Read it to the end again to finish it.",
    ] as const,
    notYet: (noun: string): readonly [string, string] => [
      "Not finished yet",
      `Reaching this point marks the ${noun} finished.`,
    ],
    markFinished: "Mark as finished",
    markUnread: "Mark as unread",
    nextLabel: (n: number): string => `Next · Chapter ${n}`,
    readNext: "Read next →",
    lastLabel: "Last chapter",
    lastTitle: "You've reached the end of this book.",
    backToBook: "Back to the book →",
    backToLibrary: "Back to the library",
    inThisBook: "In this book",
    finishedCount: (done: number, total: number): string =>
      `${done} of ${total} finished`,
    chapters: (total: number): string => `${total} chapters`,
  },
  /** The Version history sheet (§14). */
  versions: {
    lead: (label: string, earlier: number): string =>
      `${label} · ${
        earlier <= 0
          ? "This is the only version."
          : earlier === 1
            ? "1 earlier version, newest first."
            : `${earlier} earlier versions, newest first.`
      }`,
    current: "Current",
    published: (date: string): string => `Published ${date}`,
    from: (label: string, version: number): string =>
      `Translated from ${label} v${version}`,
    view: "View",
    viewAria: (n: number): string => `View version ${n}`,
    listLabel: "Versions",
    unavailable: "Unavailable",
    failed: (noun: "chapter" | "document"): string =>
      `Couldn't load this ${noun}'s history. The ${noun} itself is fine — reload to try again.`,
  },
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
  /**
   * P30.S20 — highlights and notes, from `05-annotations` round 01's *Every string this
   * job wrote* (the selection bar, the popover, the undo line) and round 02's three hidden
   * descriptions. The bookmark, margin, Notes sheet and per-book list strings are S21's.
   */
  notes: {
    bar: {
      highlight: "Highlight",
      addNote: "Add note",
      /** "Highlights stay inside one section, so this one stops at the end of {section}." */
      clippedLead: "Highlights stay inside one section, so this one stops at the end of ",
      clippedTail: ".",
      refuse: "Highlights start at the first section.",
      selected: "Selected text",
      /** "This section" / "This diagram" / "This quiz" / "This figure" / "This sources". */
      blockLabel: (word: string): string => `This ${word.toLowerCase()}`,
    },
    pop: {
      close: "Close",
      addNote: "Add note",
      editNote: "Edit note",
      saveNote: "Save note",
      cancel: "Cancel",
      deleteNote: "Delete note",
      deleteHighlight: "Delete highlight",
      kindHighlight: "Highlight",
      kindHighlightNote: "Highlight · note",
      kindNew: "New highlight",
      kindBlock: (word: "section" | "diagram"): string => `Note on this ${word}`,
      kindCount: (n: number): string => `${n} ${n === 1 ? "highlight" : "highlights"}`,
      dialogNew: "Note on a new highlight",
      dialogChoose: "Choose a highlight",
      fieldNew: "Note on this highlight",
      field: "Note",
      placeholder: "What do you want to remember about this?",
      hint: "⌘ Enter saves · Esc cancels · line breaks are kept",
      /** Open question 17, as signed: from 1,800 characters, "1,850 / 2,000". */
      count: (n: number): string => `${n.toLocaleString("en-US")} / 2,000`,
      countFull: "2,000 / 2,000 · the most a note holds",
      review: "Review this",
      on: "On",
      off: "Off",
      reviewOn: "It is a card in your reviews.",
      reviewPaused: "Its card is paused, and keeps its history.",
      reviewNever: "Turn on to make it a review card.",
      goesBoth: "Its note and its review card go with it.",
      goesCard: "Its review card goes with it.",
      goesNote: "Its note goes with it.",
      overlap: "They overlap here. Pick one to open it.",
    },
    undo: {
      cardOnly: "Highlight deleted, and its review card with it.",
      all: "Highlight, note and review card deleted.",
      note: "Highlight and its note deleted.",
      plain: "Highlight deleted.",
      noteOnly: "Note deleted.",
      undo: "Undo",
    },
    /** Round 02: what a highlight's tab stop is described as (never shown). */
    desc: {
      one: "Highlight",
      note: "Highlight with a note",
      many: "Highlights overlap here",
    },
    /** A write that did not reach the server (undrawn; `04-quiz`'s "Not saved" line, OQ99). */
    notSaved: "Not saved · check your connection",
    tryAgain: "Try again",
  },
} as const;
