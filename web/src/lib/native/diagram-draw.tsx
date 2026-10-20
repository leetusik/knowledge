/**
 * The drawn kinds as React SVG (P30.S17; `03-diagrams` round 01, build prompt "The frame in the slot" and "Size").
 *
 * `diagram-layout.ts` computes the geometry; this file turns it into React elements, through the same safe mapping
 * as every other block: elements and attributes written here, never a string from the author set as markup. Every
 * author string reaches the page as a React text child (`<text>` content) and is escaped by React. Pure: it runs
 * wherever the renderer runs (the server), and ships nothing to the client.
 */

import type { CSSProperties, ReactNode } from "react";

import { CHAPTER } from "@/content";

import {
  layoutGraph,
  type GEdge,
  type GGroup,
  type GNode,
  type GraphSpec,
  type Layout,
} from "./diagram-layout";

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const recs = (v: unknown): Rec[] => arr(v).filter(isRec);

/** A flow or state block's data, read for the layout (ingest validated it; this stays defensive). */
export function graphSpec(d: Rec): GraphSpec {
  const nodes: GNode[] = recs(d.nodes).map((n) => {
    const at = arr(n.at);
    return {
      id: str(n.id) ?? "",
      label: str(n.label) ?? "",
      sub: str(n.sub),
      at:
        at.length === 2 && at.every((v) => typeof v === "number")
          ? [at[0] as number, at[1] as number]
          : null,
      shape: str(n.shape),
      fields: Array.isArray(n.fields)
        ? n.fields.filter((f): f is string => typeof f === "string")
        : null,
      tone: str(n.tone),
    };
  });
  const groups: GGroup[] | null = Array.isArray(d.groups)
    ? recs(d.groups).map((g) => ({
        id: str(g.id) ?? "",
        label: str(g.label) ?? "",
        nodes: arr(g.nodes).filter((v): v is string => typeof v === "string"),
      }))
    : null;
  const edges: GEdge[] = recs(d.edges).map((e) => ({
    from: str(e.from) ?? "",
    to: str(e.to) ?? "",
    label: str(e.label),
    style: str(e.style),
    tone: str(e.tone),
  }));
  return {
    direction: str(d.direction),
    nodes,
    groups,
    edges,
    initial: str(d.initial),
    final: Array.isArray(d.final)
      ? d.final.filter((v): v is string => typeof v === "string")
      : null,
  };
}

/** Lay out a flow or state block. */
export function layoutFor(d: Rec, kind: "flow" | "state"): Layout {
  return layoutGraph(graphSpec(d), kind);
}

/**
 * The drawing. `--dg-vbw` is the natural width W (px at the default size) and `--dg-floor` the width where its 13 px
 * text has become 11 px (`ceil(W × 11 / 13)`): the CSS sizes it `clamp(floor, 100%, W/15 em)` (build prompt "Size").
 * Both are numbers from the layout, never author strings.
 */
export function Drawing({
  layout,
}: {
  layout: Pick<Layout, "W" | "H" | "prims">;
}): ReactNode {
  const { W, H, prims } = layout;
  const style = {
    "--dg-vbw": W,
    "--dg-floor": Math.ceil((W * 11) / 13),
  } as CSSProperties;
  return (
    <svg
      className="dg__svg"
      viewBox={`0 0 ${W} ${H}`}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {prims.regions.map((p, i) => (
        <path key={`r${i}`} className={p.cls} d={p.d} />
      ))}
      {prims.edges.map((p, i) => (
        <path key={`e${i}`} className={p.cls} d={p.d} />
      ))}
      {prims.heads.map((p, i) => (
        <path key={`h${i}`} className={p.cls} d={p.d} />
      ))}
      {prims.shapes.map((p, i) => (
        <path key={`s${i}`} className={p.cls} d={p.d} />
      ))}
      {prims.rules.map((p, i) => (
        <path key={`u${i}`} className={p.cls} d={p.d} />
      ))}
      {prims.knocks.map((k, i) => (
        <rect
          key={`k${i}`}
          className={k.cls}
          x={k.x}
          y={k.y}
          width={k.w}
          height={k.h}
          rx={2}
        />
      ))}
      {prims.texts.map((t, i) => (
        <text key={`t${i}`} className={t.cls} x={t.x} y={t.y}>
          {t.t}
        </text>
      ))}
    </svg>
  );
}

/**
 * The text alternative of a flow or state drawing: one line per node in reading order (row by row, left to right),
 * "Starts at …" first for a state diagram (build prompt "The text alternative").
 */
export function graphAlt(layout: Layout, d: Rec): string[] {
  const A = CHAPTER.diagram.alt;
  const groupLabel = new Map<string, string>();
  for (const g of recs(d.groups)) {
    const id = str(g.id);
    if (id !== null) groupLabel.set(id, str(g.label) ?? "");
  }
  const lines: string[] = [];
  if (layout.init) lines.push(A.starts(layout.init.src.label));
  const ordered = layout.nodes.slice().sort((a, b) => a.r - b.r || a.c - b.c);
  for (const n of ordered) {
    const out = layout.edges
      .filter((e) => e.s === n)
      .map(
        (e) =>
          (e.s === e.t ? A.itself : A.to(e.t.src.label)) +
          (e.label ? `, ${e.label}` : ""),
      );
    let t = n.src.label + (n.src.sub ? ` (${n.src.sub})` : "");
    if (n.group) t += A.inGroup(groupLabel.get(n.group.id) ?? "");
    if (n.isFinal) t += A.endState;
    if (n.src.fields && n.src.fields.length)
      t += A.fields(n.src.fields.join(", "));
    if (out.length) t += A.goes(out.join("; "));
    lines.push(t);
  }
  return lines;
}
