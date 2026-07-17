// Knowledge-graph motif composition (P14.S2) — the data behind the feature-graph
// illustration. It is a FAITHFUL STATIC render of the live graph's drawing
// grammar (reuses graph-canvas.tsx's node/edge/halo/ring/label approach) posed to
// the designed composition: a focused teal neighborhood (halo + offset selection
// ring), bronze/plum dim nodes, a hollow tag ring, a dashed ghost, plus the
// floating info panel and the bottom-left legend (both rendered as JSX overlays).
// Positions are in an arbitrary world space (centered near origin); the canvas
// fits them to the plate.

export type MotifInk = "teal" | "bronze" | "plum";
export type MotifNodeType = "doc" | "tag" | "ghost";

export interface MotifNode {
  id: string;
  type: MotifNodeType;
  x: number;
  y: number;
  /** Node radius in world units. */
  r: number;
  ink?: MotifInk; // doc fill ink
  label?: string;
  /** The selected doc — draws the halo + offset focus ring. */
  focus?: boolean;
  /** Dimmed (outside the focused neighborhood). */
  dim?: boolean;
}

export interface MotifEdge {
  a: string;
  b: string;
  kind: "related" | "tag";
  /** In the focused neighborhood — teal, with an arrowhead. */
  active?: boolean;
  /** Unresolved target — dashed. */
  ghost?: boolean;
  dim?: boolean;
}

export interface GraphMotif {
  nodes: MotifNode[];
  edges: MotifEdge[];
  panel: {
    project: string;
    title: string;
    meta: string;
    tags: string[];
    read: string;
  };
  legend: {
    heading: string;
    projects: { name: string; ink: MotifInk; count: number }[];
    tagsRow: string;
    note: string;
  };
}

export const GRAPH_MOTIF: GraphMotif = {
  nodes: [
    // Focused teal neighborhood
    { id: "focus", type: "doc", x: -6, y: -4, r: 13, ink: "teal", label: "Reverse Proxy, Explained", focus: true },
    { id: "n1", type: "doc", x: -46, y: -30, r: 9, ink: "teal", label: "TLS termination" },
    { id: "n2", type: "doc", x: 26, y: -32, r: 9, ink: "teal", label: "location blocks" },
    { id: "n3", type: "doc", x: 34, y: 16, r: 8, ink: "teal", label: "upstream pool" },
    { id: "tag1", type: "tag", x: -28, y: 30, r: 5, label: "networking" },
    { id: "ghost1", type: "ghost", x: -54, y: 6, r: 6, label: "draining" },
    // Bronze dim neighborhood (project 2)
    { id: "b1", type: "doc", x: 62, y: -10, r: 8, ink: "bronze", dim: true },
    { id: "b2", type: "doc", x: 72, y: 22, r: 7, ink: "bronze", dim: true },
    { id: "b3", type: "doc", x: 50, y: 44, r: 6, ink: "bronze", dim: true },
    // Plum dim neighborhood (project 3)
    { id: "p1", type: "doc", x: -66, y: 36, r: 8, ink: "plum", dim: true },
    { id: "p2", type: "doc", x: -44, y: 54, r: 7, ink: "plum", dim: true },
    { id: "p3", type: "doc", x: -74, y: 8, r: 6, ink: "plum", dim: true },
  ],
  edges: [
    // Focused neighborhood — teal, arrowheads
    { a: "focus", b: "n1", kind: "related", active: true },
    { a: "focus", b: "n2", kind: "related", active: true },
    { a: "focus", b: "n3", kind: "related", active: true },
    { a: "focus", b: "tag1", kind: "tag", active: true },
    { a: "n2", b: "tag1", kind: "tag", active: true },
    { a: "focus", b: "ghost1", kind: "related", active: true, ghost: true },
    // Dim edges
    { a: "b1", b: "b2", kind: "related", dim: true },
    { a: "b1", b: "b3", kind: "related", dim: true },
    { a: "n3", b: "b1", kind: "related", dim: true },
    { a: "p1", b: "p2", kind: "related", dim: true },
    { a: "p1", b: "p3", kind: "related", dim: true },
    { a: "p1", b: "tag1", kind: "tag", dim: true },
  ],
  panel: {
    project: "reverse-proxy",
    title: "Reverse Proxy, Explained — 요청은 어디로 가는가",
    meta: "2026-02-14 · 3 tags · 4 links",
    tags: ["reverse-proxy", "nginx", "networking"],
    read: "Read the explainer →",
  },
  legend: {
    heading: "Projects · 프로젝트",
    projects: [
      { name: "reverse-proxy", ink: "teal", count: 8 },
      { name: "infra-notes", ink: "bronze", count: 5 },
      { name: "korean-drafts", ink: "plum", count: 4 },
    ],
    tagsRow: "Tags · 태그",
    note: "Size = connections · 크기=연결 수",
  },
};
