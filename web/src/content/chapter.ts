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
  /** The accessible name of a figure whose image cannot be loaded. */
  missingImage: (alt: string): string =>
    alt ? `Image unavailable: ${alt}` : "Image unavailable",
  regions: {
    code: (language: string | null): string =>
      language === null ? "Code block" : `Code block (${language})`,
    table: "Table",
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
  sources: {
    label: "Sources",
    accessed: (date: string): string => `accessed ${date}`,
  },
} as const;
