// P30.S12 — the native/md chapter render pipeline's own words (`@/lib/native`).
// Plumbing copy only: S13 onwards restyle every surface under the signed rounds
// and may re-word these where a round's build prompt names a string.

export const CHAPTER = {
  /** Shown in place of a block that fails the render-time re-validation. */
  unshowableBlock: "This block couldn't be shown.",
  /** Shown in place of a whole chapter whose header or size fails it. */
  unshowableChapter: "This chapter couldn't be shown.",
  /** Screen-reader suffix on a link whose target cannot be opened. */
  missingLink: "(link unavailable)",
  regions: {
    code: (language: string | null): string =>
      language === null ? "Code block" : `Code block (${language})`,
    table: "Table",
  },
  /** P30.S14 — the prose kit's strings (`01-reader` round 02, *Every string written for the reader* → Prose). */
  newTab: " · new tab",
  /** A callout's type word (the head's mono label); a collapsed one ends in Show / Hide. */
  calloutWord: {
    NOTE: "Note",
    IMPORTANT: "Important",
    WARNING: "Warning",
    CAUTION: "Caution",
    SKIP: "Skip",
    DEFINITION: "Definition",
  } as Record<string, string>,
  calloutShow: "Show",
  calloutHide: "Hide",
  /** An ASCII drawing (`text` fence) wider than its box. */
  drawing: {
    aria: "Drawing, scrolls sideways",
    hint: "Scroll sideways to see the whole drawing →",
  },
  /** A table that scrolls in its own box. */
  tableBox: {
    ariaSideways: (cols: number): string =>
      `Table, ${cols} columns, scrolls sideways`,
    ariaLong: (cols: number, rows: number): string =>
      `Table, ${cols} columns, ${rows} rows`,
    hintSideways: (cols: number): string =>
      `Scroll sideways for all ${cols} columns →`,
    hintLong: (rows: number, cols: number): string =>
      `Scroll in the table for all ${rows} rows and ${cols} columns`,
  },
  /** A callout's label, used as the disclosure summary when it has no title. */
  calloutLabel: {
    NOTE: "Note",
    IMPORTANT: "Important",
    WARNING: "Warning",
    CAUTION: "Caution",
    SKIP: "Skip this if you know it",
    DEFINITION: "Definition",
  } as Record<string, string>,
  quiz: {
    label: "Quiz",
    showAnswer: "Show answer",
    explanation: "Explanation",
    blank: "blank",
  },
  diagram: {
    nodes: "Nodes",
    edges: "Connections",
    steps: "Steps",
    layers: "Layers",
    lanes: "Lanes",
    series: "Series",
  },
  /** P30.S16 — the figures' strings (`02-figures` round 01, *Every string written for these blocks*). */
  figure: {
    missing: "Image not available",
    credit: "Credit",
    still: "Still frame: your device is set to reduce motion.",
    /** A `wide` figure that scrolls sideways. */
    aria: "Image, scrolls sideways",
    hint: "Scroll sideways to see the whole image →",
  },
  sources: {
    label: "Sources",
    accessed: (date: string): string => `Accessed ${date}`,
    back: "Back to the text",
    backLead: "Back to the text:",
    /** `, in “<section>”` is left out when no h2 precedes the citation. */
    backAria: (section: string | null): string =>
      section ? `Back to the text, in “${section}”` : "Back to the text",
    backLetterAria: (
      letter: string,
      count: number,
      section: string | null,
    ): string =>
      section
        ? `Back to citation ${letter} of ${count}, in “${section}”`
        : `Back to citation ${letter} of ${count}`,
  },
} as const;
