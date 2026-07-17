// Graph-surface copy (P12.S6) — the in-app knowledge map: the page shell + the
// empty state. Copy-as-data per the S1 convention. NOTE: the ported canvas engine
// (`graph-canvas.tsx`) keeps its own inline bilingual micro-copy (legend headings,
// tooltip kinds, the panel eyebrows/badges) — that text is part of the proven
// graph.js port and stays with the engine; only the page-frame + empty-state copy
// (which the React shell owns) lives here.

export const GRAPH = {
  /** Document <title> (the SITE template appends " · knowledge"). */
  title: "Graph",
  /** Mono eyebrow suffix on the page header, rendered as `{tenant} · {eyebrow}`. */
  eyebrow: "Workspace",
  /** Sub-line under the page title. */
  sub: "An interactive map of your documents — related links and shared tags.",
  /** Accessible name for the <canvas> (role=img). */
  canvasLabel: "Knowledge map · 지식 지도",

  /** The empty state, shown when the tenant has no documents yet. */
  empty: {
    title: "No documents yet",
    sub: "The map draws itself as documents land in your workspace. 문서가 추가되면 지도가 그려집니다.",
  },
} as const;

export type GraphCopy = typeof GRAPH;
