/**
 * Citations (`02-figures` round 01, §7 and §8): an inline link whose target is `#<id of a
 * sources item>` in the same document. The reader numbers it from the sources list and gives
 * it an id `cite-<source id>-<k>`, `k` counting that source's citations in document order from
 * 1. The id is generated at render and never stored; the sources list reads the same plan to
 * draw each item's way back (with the nearest preceding h2's text).
 *
 * A pure pre-pass over the block tree, so the list (which may sit anywhere in the chapter) knows
 * its citations before it renders. The plan is keyed by the link NODE, so the renderer asks
 * "is this link a citation?" of the very object it is drawing. `md` has no sources blocks.
 */
import { plainText } from "./parse";
import type { Block } from "./tree";

export interface Cite {
  sourceId: string;
  /** The source's number in the list, from 1. */
  n: number;
  /** This citation's position among that source's citations, from 1. */
  k: number;
  citeId: string;
}

export interface SourceCites {
  n: number;
  cites: { citeId: string; section: string | null }[];
}

export interface CitationPlan {
  byLink: WeakMap<object, Cite>;
  sources: Map<string, SourceCites>;
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** 1 → `a`, 26 → `z`, 27 → `aa`, 28 → `ab` … (the back links' letters). */
export function letters(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

export function planCitations(blocks: readonly Block[]): CitationPlan {
  const plan: CitationPlan = { byLink: new WeakMap(), sources: new Map() };
  for (const b of blocks) {
    if (b.type !== "sources" || !Array.isArray(b.items)) continue;
    b.items.forEach((item, i) => {
      const id = isRec(item) ? item.id : null;
      if (typeof id === "string" && !plan.sources.has(id))
        plan.sources.set(id, { n: i + 1, cites: [] });
    });
  }
  if (plan.sources.size === 0) return plan;

  let section: string | null = null;
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    if (!isRec(v)) return;
    if (v.type === "link" && typeof v.href === "string") {
      const source = v.href.startsWith("#")
        ? plan.sources.get(v.href.slice(1))
        : undefined;
      if (source) {
        const sourceId = v.href.slice(1);
        const k = source.cites.length + 1;
        const citeId = `cite-${sourceId}-${k}`;
        source.cites.push({ citeId, section });
        plan.byLink.set(v, { sourceId, n: source.n, k, citeId });
      }
      return;
    }
    for (const [key, value] of Object.entries(v)) {
      if (key !== "svg") visit(value);
    }
  };
  for (const b of blocks) {
    if (b.type === "heading" && b.level === 2) {
      section = plainText(b.content).trim() || null;
    } else if (b.type === "figure") {
      // Rendered caption first, then the credit, whatever order the author wrote them in.
      visit(b.caption);
      visit(b.credit);
    } else if (b.type === "figures") {
      visit(b.caption);
      visit(b.items);
    } else {
      visit(b);
    }
  }
  return plan;
}
