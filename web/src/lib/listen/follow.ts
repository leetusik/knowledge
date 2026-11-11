import type { KbListenTimelineSegment } from "@/lib/knowledge/listen";

// P41-sr.W1 — follow along (`11-listen` F12): which rendered block the voice is reading.
//
// The timeline's segments carry S1's `block`: the top-level block's own id, or null. The
// native reader renders the same ids (`data-block`, from the TS mirror of the server's id
// rules), so an id'd block maps by id. Plain paragraphs, lists, tables and quotes have no
// id (headings h2–h4 and typed blocks do), and the title and the lede open the script with
// no block either. Those segments are placed by order: each run of id-less segments lies
// between two id'd anchors, and so do the id-less blocks it reads; a block's share of the
// run is how many segments S1 makes of it (a paragraph one, a list one per item, a table
// one per row, a quote one per paragraph). When the shares add up to the run, the mapping
// is exact; when they do not (an image split out of a paragraph, an empty caption), the
// run is spread over its blocks in proportion, so a miss stays inside its section.

/** One readable element of the page, in reading order. */
export interface Readable {
  /** The block's id (`data-block`), or null for an id-less block, the title and the lede. */
  id: string | null;
  /** How many spoken segments S1 makes of it (id-less blocks only; 0 = not read aloud). */
  weight: number;
}

/**
 * For each segment, the index of the readable it reads (-1: none found). Pure, so the
 * mapping is checked without a DOM.
 */
export function mapSegments(
  blocks: readonly (string | null)[],
  items: readonly Readable[],
): number[] {
  const at = new Map<string, number>();
  items.forEach((it, i) => {
    if (it.id !== null && !at.has(it.id)) at.set(it.id, i);
  });
  const out = new Array<number>(blocks.length).fill(-1);
  let prev = -1;
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b !== null) {
      const k = at.get(b) ?? -1;
      out[i] = k;
      if (k > prev) prev = k;
      i += 1;
      continue;
    }
    let j = i;
    while (j < blocks.length && blocks[j] === null) j += 1;
    let next = items.length;
    for (let s = j; s < blocks.length; s += 1) {
      const id = blocks[s];
      const k = id !== null ? at.get(id) : undefined;
      if (k !== undefined && k > prev) {
        next = k;
        break;
      }
    }
    const cands: number[] = [];
    for (let k = prev + 1; k < next; k += 1) {
      if (items[k].id === null && items[k].weight > 0) cands.push(k);
    }
    const n = j - i;
    if (cands.length === 0) {
      for (let s = i; s < j; s += 1) out[s] = prev;
    } else {
      const total = cands.reduce((a, k) => a + items[k].weight, 0);
      const bounds: number[] = [];
      let acc = 0;
      for (const k of cands) {
        acc += items[k].weight;
        bounds.push(acc);
      }
      for (let s = 0; s < n; s += 1) {
        const p = ((s + 0.5) * total) / n;
        let c = 0;
        while (c < cands.length - 1 && bounds[c] <= p) c += 1;
        out[i + s] = cands[c];
      }
      prev = cands[cands.length - 1];
    }
    i = j;
  }
  return out;
}

/** The segment being read at `t` seconds (the last one that has started), or -1. */
export function segmentAt(
  segs: readonly KbListenTimelineSegment[],
  t: number,
): number {
  if (segs.length === 0 || t < segs[0].start) return segs.length ? 0 : -1;
  let lo = 0;
  let hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segs[mid].start <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** S1's segment count for an id-less block, read from its rendered element. */
function weightOf(el: Element): number {
  const tag = el.tagName;
  if (tag === "HR" || tag === "PRE") return 0;
  if (el.matches(".kb-ch-code, .kb-ch-unshowable")) return 0;
  if (tag === "UL" || tag === "OL") {
    return Math.max(1, el.querySelectorAll("li").length);
  }
  if (tag === "BLOCKQUOTE") return Math.max(1, el.querySelectorAll("p").length);
  const table = tag === "TABLE" ? el : el.querySelector("table");
  if (table) {
    const rows = table.querySelectorAll("tbody tr").length;
    return rows || Math.max(0, table.querySelectorAll("tr").length - 1);
  }
  return 1;
}

/** One readable and its element. */
export interface ReadableEl extends Readable {
  el: HTMLElement;
}

/**
 * The page's readables in reading order: the title, the lede, then the body's top-level
 * blocks (the chapter view's children that show on screen).
 */
export function readablesOf(root: HTMLElement): ReadableEl[] {
  const out: ReadableEl[] = [];
  const title = root.querySelector<HTMLElement>(".rd-head__title");
  if (title) out.push({ el: title, id: null, weight: 1 });
  const lede = root.querySelector<HTMLElement>(".rd-head__lede");
  if (lede) out.push({ el: lede, id: null, weight: 1 });
  const body = root.querySelector<HTMLElement>(".rd-article .kb-ch");
  if (!body) return out;
  for (const child of Array.from(body.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (getComputedStyle(child).display === "none") continue;
    const id = child.getAttribute("data-block") || child.id || null;
    out.push({ el: child, id, weight: id ? 1 : weightOf(child) });
  }
  return out;
}
