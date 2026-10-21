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
  /**
   * P30.S25 — the legacy reader (`09-legacy-and-print` round 01, *Every string this job
   * wrote*, on screen), word for word. The chapter end's words, the version notices, the
   * bookmark control and "Highlights are not available in this document." are the signed
   * strings above, reused.
   */
  legacy: {
    /** The document bar's region label. */
    region: "This document",
    print: "Print · new tab",
    printHint:
      "Opens the original document in a new tab, where it prints in its own layout.",
    noRestyle: "The theme and text size don't restyle it.",
    skip: "Skip to the document",
    frameLabel: (title: string): string => `${title}, in its original layout`,
    loading: "Loading the original document…",
    slow: "Still loading. This document is taking longer than usual.",
    loadingLabel: "Loading",
    slowLabel: "Still loading",
    missingCode: "Not found · 404",
    missingTitle: (noun: "chapter" | "document"): string =>
      `This ${noun}'s file is missing`,
    missingSub: (noun: "chapter" | "document"): string =>
      `The library lists this ${noun}, but the file that holds its text isn't there, so there is nothing to show. ${
        noun === "chapter"
          ? "The book's other chapters still open."
          : "The rest of the library still opens."
      }`,
    backToBook: "Back to the book",
    backToLibrary: "Back to the library",
    failedCode: "Error · 502",
    failedTitle: "The original document didn't load.",
    failedSub:
      "The connection to its file failed on our side. Try again — and if it keeps failing, the reference below tells us where it stopped.",
    display: {
      label: "In this document",
      note: {
        auto: "It keeps its original layout. The theme colours the reading controls, and Dark (or System, when this device is dark) also shows the document's own dark look. Text size doesn't reach inside: to read it larger, use your browser's zoom.",
        light:
          "It keeps its original layout, which is light only. The theme colours the reading controls around it. Text size doesn't reach inside: to read it larger, use your browser's zoom.",
      },
    },
  },
  /**
   * P30.S26 — the printed sheet (`09-legacy-and-print` round 01, *Every string this job
   * wrote*, "On paper"), word for word. Chrome copy on the sheet stays English (D36 (4)).
   * The no-break spaces are the round's: "a short segment never breaks inside", and the " · "
   * between segments takes a no-break space before the dot.
   */
  print: {
    brand: "knowledge",
    /** " · " between the segments of a label: a no-break space before the dot. */
    sep: " · ",
    /** A short segment kept whole ("Chapter 2 of 5", "v2, 12 Oct 2026"). */
    keep: (text: string): string => text.replace(/ /g, " "),
    printed: (date: string): string => `Printed ${date}`,
    olderTag: (v: number): string => `Older version · v${v}`,
    olderLine: (newest: number): string => `The current version is v${newest}, at `,
    quizLabel: (n: number): string =>
      `Quiz · ${n} ${n === 1 ? "question" : "questions"}`,
    choiceOne: "Choose one answer.",
    choiceMany: "Select all that apply.",
    clozeOne: "Fill in the blank.",
    clozeMany: "Fill in the blanks.",
    recall: "Write your answer, then check it against the key.",
    quizNote: (noun: "chapter" | "document"): string =>
      `Answers are at the end of this ${noun}.`,
    answers: "Answers",
    answersLead: (n: number, title: string): string =>
      `${n} ${n === 1 ? "answer" : "answers"} to “${title}”, each with why.`,
    answersLeadUntitled: (n: number): string =>
      `${n} ${n === 1 ? "answer" : "answers"}, each with why.`,
    answerLabel: "Answer",
    or: (list: string): string => ` (or ${list})`,
    colophonPrinted: (date: string, address: string): string =>
      `Printed ${date} from ${address}.`,
    colophonCurrent: (v: number): string =>
      `This is v${v}, the current version on that date; the address always opens the newest.`,
    colophonOlder: (v: number, newest: number): string =>
      `This is v${v}, an earlier version; the current version is v${newest}, at `,
    /** The notice sheet ⌘P prints from the legacy reader. */
    notice: {
      title: (noun: "chapter" | "document"): string =>
        `This ${noun} prints from its own page`,
      lead: "keeps its original layout, inside a frame that doesn’t print. Open its own page and print from there:",
      onScreen: (noun: "chapter" | "document"): string =>
        `On screen, the bar under the ${noun} has Print · new tab, which opens that page for you.`,
    },
  },
  top: {
    logoLabel: "knowledge library",
    /** A loose document's back link (and its short form) go to the library. */
    library: "Library",
    /** Below 40rem a chapter's back link says this instead of the book title. */
    bookShort: "Book",
    olderVersion: (v: number): string => `Older version · v${v}`,
    languageLabel: "Language",
    display: "Display",
    /** P30.S21: a loose document has no Contents sheet, so its top bar opens the Notes. */
    notes: "Notes",
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
   * descriptions. P30.S21 adds the bookmark, place bar, margin, Notes sheet, list-row and
   * per-book list strings (round 01 *Every string this job wrote*, round 02's "Back to the
   * book"), word for word.
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
    /** P30.S21 — bookmarks, the place bar and the plain document's bar. */
    bm: {
      bookmark: "Bookmark",
      bookmarked: "Bookmarked",
      position: "Bookmark this position",
      positionOn: "Bookmarked here",
      removed: "Bookmark removed.",
      plain: "Highlights are not available in this document.",
      /** "{Section | Diagram | Quiz | Figure | Sources} · {title}" is the bar's message. */
      kind: "Bookmark",
      noLabel:
        "No label. A label says why you kept this place, in the Notes list and the book's list.",
      label: "Label",
      placeholder: "Why this place?",
      saveLabel: "Save label",
      addLabel: "Add label",
      editLabel: "Edit label",
      remove: "Remove bookmark",
      removeShort: "Remove",
    },
    place: {
      group: "The section you are reading",
      groupPos: "This position",
    },
    margin: {
      rail: "Notes in the margin",
      note: "Note",
      noteSection: "Note on this section",
      noteDiagram: "Note on this diagram",
      bookmarked: "Bookmarked",
      changed: "Text changed",
    },
    /** Popover bodies for Text changed and the other language. */
    changed: {
      kind: "Text changed",
      leadOne: (language: string, v: number): string =>
        `You made this on ${language} v${v}. This version no longer says it, so it is not painted here.`,
      leadMany: (language: string, v: number): string =>
        `You made these on ${language} v${v}. This version no longer says them, so they are not painted here.`,
      read: (v: number): string => `Read this section in v${v} →`,
      delete: "Delete",
      /** The row and margin item: "{n} highlight(s) you made no longer match(es) the text". */
      item: (words: string, n: number): string =>
        `${words} you made no longer ${n === 1 ? "matches" : "match"} the text`,
    },
    other: {
      leadOne: (language: string): string =>
        `Highlights belong to their language, so this one is not painted on the ${language} text.`,
      leadMany: (language: string): string =>
        `Highlights belong to their language, so these are not painted on the ${language} text.`,
      /** …followed by the endonym in its own `lang`, then " →" */
      readPre: "Read this section in ",
      /** Margin item and row: "{n} highlight(s) in {endonym}" (the endonym follows in its own lang). */
      item: (words: string): string => `${words} in `,
    },
    /** A hidden dialog name for a list's Delete (`aria-label="Delete highlight: …"`). */
    aria: {
      deleteHighlight: "Delete highlight: ",
      deleteNote: "Delete note: ",
      removeBookmark: "Remove bookmark: ",
    },
    /** The Notes view of the Contents sheet. */
    sheet: {
      notes: "Notes",
      contents: "Contents",
      close: "Close",
      chapterGroup: "In this chapter",
      documentGroup: "In this document",
      lead: "In reading order. Choose one to go to its place.",
      inLang: "In ",
      /** …followed by the endonym in its own `lang`, then "." */
      otherLeadPre:
        "Highlights belong to their language, so these are not painted here. Choose one to read it in ",
      unanchored: "Unanchored",
      unanchoredLead:
        "The text these were made on is no longer in this chapter. They stay until you delete them.",
      allNotes: "All notes in this book →",
      emptyChapter:
        "Nothing marked in this chapter yet: select a passage to highlight it, or bookmark a section from the bar at the bottom.",
      emptyDocument:
        "Nothing marked in this document yet: use Bookmark this position to keep a place.",
      /** A plain Markdown chapter: no highlights, only positions. */
      emptyPlainChapter:
        "Nothing marked in this chapter yet: use Bookmark this position to keep a place.",
    },
    /** A row in a list (`NoteItem`). */
    row: {
      kHighlight: "Highlight",
      kHighlightNote: "Highlight · note",
      kNoteSection: "Note on this section",
      kNoteDiagram: "Note on this diagram",
      kBookmark: "Bookmark",
      kApprox: "Bookmark · approximate",
      kPosition: "Bookmark · position",
      kChanged: "Text changed",
      kUnanchored: "Unanchored",
      reviewOn: "Review this · on",
      metaChanged: (language: string, v: number): string =>
        `Made on ${language} v${v} · this version no longer says it`,
      metaGone: (block: string, chapter: string | null): string =>
        `Was in “${block}”${chapter ? ` · ${chapter}` : ""}`,
      metaGoneBlock: "a removed section",
      metaApprox: (pct: number): string =>
        `About ${pct}% through · placed from the HTML version`,
      metaPosition: (pct: number): string => `About ${pct}% through`,
      del: "Delete",
      remove: "Remove",
    },
    /** The per-book list (`BookNotes`). */
    book: {
      backChapter: "Back to the chapter",
      backBook: "Back to the book",
      title: "Notes in this book",
      show: "Show",
      all: "All",
      bookmarks: "Bookmarks",
      highlights: "Highlights and notes",
      chapterN: (n: number): string => `Chapter ${n}`,
      emptyAll:
        "Nothing marked in this book yet: highlights, notes and bookmarks you make in its chapters gather here.",
      emptyBookmarks:
        "No bookmarks in this book yet: use Bookmark in the bar below a chapter’s text.",
      emptyHighlights:
        "No highlights or notes in this book yet: select a passage in a chapter to highlight it.",
      /** "26 items in 5 chapters · 2 approximate · 2 unanchored" */
      count: (
        n: number,
        noun: "items" | "bookmarks" | "highlights",
        chapters: number,
        approx: number,
        gone: number,
      ): string => {
        const nouns = {
          items: n === 1 ? "item" : "items",
          bookmarks: n === 1 ? "bookmark" : "bookmarks",
          highlights: n === 1 ? "highlight or note" : "highlights and notes",
        } as const;
        return (
          `${n} ${nouns[noun]} in ${chapters} ${chapters === 1 ? "chapter" : "chapters"}` +
          (approx ? ` · ${approx} approximate` : "") +
          (gone ? ` · ${gone} unanchored` : "")
        );
      },
    },
  },
} as const;
