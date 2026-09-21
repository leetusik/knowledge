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
  eyebrow: "Org",
  /** Sub-line under the page title. */
  sub: "An interactive map of your documents — related links and shared tags.",
  /** Accessible name for the <canvas> (role=img). */
  canvasLabel: "Knowledge map · 지식 지도",

  /** The empty state, shown when the tenant has no documents yet. */
  empty: {
    title: "No documents yet",
    sub: "The map draws itself as documents land in your org. 문서가 추가되면 지도가 그려집니다.",
    /** Round 05 §4.8 / §5 — the one primary action the empty plate now carries. */
    action: "Add a document",
  },

  /**
   * Round 05 §4.8 / §5 — the plate's FAILED state. It renders inside the plate with
   * the page frame intact above it; the map never borrows the page-level editorial
   * state, because a failed map is a failed panel, not a failed page. The failing
   * request itself goes in `.kb-graph-empty__detail` as `GET /app/graph · {status}`,
   * which is engine-side formatting, not copy.
   */
  failed: {
    title: "The map didn't load",
    sub: "Something went wrong fetching the graph. Nothing was changed.",
    retry: "Try again",
    back: "Go to documents",
  },

  /**
   * Round 05 §4.4 / §5 — the panel's SECOND mode: a project lens lights the map and
   * fills the panel with that project's newest documents. `count` is a template —
   * `{docs}` and `{links}` are substituted by the engine.
   */
  project: {
    eyebrow: "Project",
    count: "{docs} documents · {links} links",
    all: "All documents →",
    /** Member only — a stranger has no `/projects/{id}` route to open. */
    open: "Open project →",
    empty: "No documents in this project yet.",
  },

  /**
   * The public-graph branded not-found (`(public)/graph/[org]/not-found.tsx`, P19),
   * on the `.kb-empty` classes — reached when the org id is malformed or resolves to
   * no public projects (404-never-403, so a nonexistent org is indistinguishable).
   */
  notFound: {
    title: "No public graph here",
    sub: "This org has no public projects, or it doesn't exist.",
    backLabel: "Back to knowledge",
  },
} as const;

export type GraphCopy = typeof GRAPH;
