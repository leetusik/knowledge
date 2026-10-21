// P30.S24 — the review surface's own words, from `08-review` round 01's *Every string written
// for review* (English only; D36 (4)). The quiz's and the annotations' own strings are used
// unchanged, from `lib/reader/quiz.ts` and `READER`. Pure functions for the plural forms, so the
// page, the skeleton and the tests read one source.

export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

export const REVIEW = {
  metaTitle: "Review",
  top: { library: "Library", settings: "Settings", display: "Display" },
  head: {
    title: "Review",
    due: "due",
    newHighlight: (n: number): string =>
      n === 1 ? "new highlight" : "new highlights",
    doneToday: "done today",
    byBook: "By book",
    loadingLabel: "Loading your cards…",
    booksLabel: "Due today, by book",
    dueN: (n: number): string => `${n} due`,
    newN: (n: number): string => plural(n, "new highlight", "new highlights"),
    bookSub: (project: string): string => `${project} · book`,
    looseSub: "Documents not in a book",
    notes: {
      mixed: "The queue mixes every book, in the order the cards fell due.",
      heldNew: " New highlights past today’s limit wait for tomorrow.",
      limitReviews: (n: number): string =>
        `You reached today’s limit of ${plural(n, "review", "reviews")}, so these wait for tomorrow.`,
      limitNew: (n: number): string =>
        n > 0
          ? `You reached today’s limit of ${plural(n, "new highlight", "new highlights")}, so these wait for tomorrow.`
          : "New highlights are paused, so these wait.",
      none: "Nothing is due today in any book.",
    },
    saved: "Saved",
    settingsSaved: "Settings saved",
    settingsSavedRest: (max: number, nw: number): string =>
      `${plural(max, "review", "reviews")} and ${plural(nw, "new highlight", "new highlights")} a day`,
    savedRest: (rating: "good" | "again", ivl: string): string =>
      `${rating === "good" ? "Good" : "Again"} · next review in ${ivl}`,
  },
  card: {
    question: "Question",
    highlight: "Highlight",
    yourNote: "Your note",
    tags: {
      new: "New",
      reset: "Starts over",
      relearning: "Relearning",
      relearningDue: (n: number): string =>
        `Relearning · due ${n} ${n === 1 ? "day" : "days"} ago`,
      learningToday: "Learning · added today",
      learning: "Learning",
    },
    book: (title: string, n: number, total: number): string =>
      `${title} · Chapter ${n} of ${total}`,
    loose: (project: string): string => `${project} · Document`,
    drift:
      "This question changed since your last review, so its card starts over. Your history is kept.",
  },
  foot: {
    check: "Check",
    next: "Next",
    saving: "Saving…",
    tryAgain: "Try again",
    nothingYet: "Nothing to check yet",
    chooseFirst: "Choose at least one answer first.",
    blankFirst: "Fill in at least one blank first.",
    rates: (rating: "good" | "again", ivl: string): string =>
      `Next rates it ${rating === "good" ? "Good" : "Again"} · in ${ivl}`,
    notSaved: "Not saved · check your connection",
    recall: { ask: "Did you get it?", good: "I got it", again: "I missed it" },
    highlight: {
      ask: "Did it stay with you?",
      good: "Got it",
      again: "Show sooner",
    },
    gotIt: "Got it",
    missedIt: "Missed it",
    preview: (rating: "good" | "again", ivl: string): string =>
      `${rating === "good" ? "Good" : "Again"} · in ${ivl}`,
    correct: "Correct",
  },
  where: {
    fromChapter: "From the chapter",
    fromDocument: "From the document",
    quiz: (title: string | null, n: number, total: number): string =>
      title
        ? `Quiz “${title}” · question ${n} of ${total}`
        : `Quiz · question ${n} of ${total}`,
    section: (title: string): string => `Section “${title}”`,
    openQuestion: "Open at this question →",
    openHighlight: "Open at this highlight →",
    suspend: "Suspend card",
  },
  suspend: {
    done: "Card suspended. It leaves your reviews and keeps its history.",
    highlight: "Card suspended, and Review this is off on its highlight.",
    undo: "Undo",
    failed: "Not suspended · check your connection",
    tryAgain: "Try again",
  },
  end: {
    mark: "Done for today",
    doneTitle: "That’s every card due today.",
    doneBody: (done: number, when: string | null): string =>
      `You reviewed ${plural(done, "card", "cards")} today.` +
      (when ? ` The next card is due ${when}, your time.` : ""),
    limitTitle: (n: number): string =>
      `You reached today’s limit of ${plural(n, "review", "reviews")}.`,
    limitBody: (due: number, nw: number, hour: string): string => {
      const bits: string[] = [];
      if (due > 0) bits.push(plural(due, "more card", "more cards"));
      if (nw > 0) bits.push(plural(nw, "new highlight", "new highlights"));
      const one = due + nw === 1;
      return `${bits.join(" and ")} ${one ? "is due, and it waits" : "are due, and they wait"} for tomorrow. Your next review day starts at ${hour}.`;
    },
    newLimitTitle: (n: number): string =>
      `Your reviews are done, and so are today’s ${plural(n, "new highlight", "new highlights")}.`,
    newLimitBody: (nw: number, hour: string): string =>
      `${nw === 1 ? "1 more new highlight waits" : `${nw} more new highlights wait`} for tomorrow. Your next review day starts at ${hour}.`,
    pausedTitle: "Your reviews are done. New highlights are paused.",
    pausedBody: (nw: number): string =>
      `${nw === 1 ? "1 new highlight waits" : `${nw} new highlights wait`}. They join your reviews when New highlights a day is above 0.`,
    changeLimits: "Change your daily limits →",
    continue: {
      label: "Continue reading",
      go: "Continue reading →",
    },
    emptyTitle: "No review cards yet",
    emptyBody:
      "A card is made when you answer a quiz question in a chapter, or turn on Review this on a highlight. It comes back here when it is due.",
    openLibrary: "Open the library →",
    failedCode: "Error · 500",
    failedTitle: "Something on our side stopped reading.",
    failedSub:
      "Your cards did not load. Try again — and if it keeps failing, the reference below tells us where it stopped.",
    retry: "Try again",
    refPrefix: "ref",
  },
  settings: {
    title: "Review settings",
    close: "Close",
    lead: "These apply to all your cards, on every device.",
    timeZone: "Time zone",
    timeZoneHint:
      "Your review day and every due time follow it. It was taken from this browser on your first review.",
    reviews: "Reviews a day",
    reviewsHint:
      "The most cards you review in one day. The rest wait for tomorrow.",
    reviewsError: "Enter a whole number from 1 to 999.",
    newHighlights: "New highlights a day",
    newHint:
      "Highlights you have not reviewed yet that join your reviews each day. 0 pauses new ones.",
    newError: "Enter a whole number from 0 to 999.",
    day: "Your review day starts at 04:00, so a review after midnight still counts for the day before.",
    save: "Save settings",
    saving: "Saving…",
    tryAgain: "Try again",
    cancel: "Cancel",
    notSaved: "Not saved · check your connection",
  },
  closePanel: "Close panel",
  intervals: {
    minute: ["minute", "minutes"],
    hour: ["hour", "hours"],
    day: ["day", "days"],
    month: ["month", "months"],
    year: ["year", "years"],
  },
} as const;
