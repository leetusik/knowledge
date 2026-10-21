/**
 * P30.S20 — the paint (`05-annotations` round 01 *The paint*; round 02 §1 the keyboard
 * stop). Client-side DOM work over the server-rendered chapter, after hydration:
 *
 *  - every highlighted run is a `<mark class="an-m" data-an="<ids>">` around exactly the
 *    highlighted characters, split where highlights start and end; `an-m--2` where two or
 *    more meet, `an-m--note` when one has a note, `is-active` while its popover is open;
 *  - the pending selection is `<mark class="an-pending" data-an="pending">`;
 *  - each painted highlight's first piece outside a link (and not under the pending tint)
 *    is its tab stop: `tabindex="0" role="button" aria-haspopup="dialog"
 *    aria-describedby` and `data-an-key` (the highlights that start there).
 *
 * The offsets are the shared projection's (`anchor.ts`); only containers that pass the
 * self-check are painted. Painting only splits text nodes and wraps them, and `unpaint`
 * puts every original text node back whole, so React's server-rendered nodes are left as
 * they were (the chapter is static markup; the paint is redone from scratch each time).
 * The CSS Custom Highlight API cannot take a tab stop or a click, so the signed markup is
 * built as drawn (P30.S20, decided).
 */
import { segments, units, verified, type ANode } from "./anchor";

export interface PaintRange {
  id: string;
  sec: string;
  s: number;
  e: number;
  note: boolean;
}

export interface PaintInput {
  ranges: readonly PaintRange[];
  pending: { sec: string; s: number; e: number } | null;
  active: string | null;
  /** The ids of the three hidden descriptions (round 02). */
  desc: { one: string; note: string; many: string };
}

/** What a paint did, so `unpaint` can put the text back exactly. */
export interface Painted {
  marks: HTMLElement[];
  splits: { head: Text; rest: Text[] }[];
}

export const EMPTY_PAINT: Painted = { marks: [], splits: [] };

interface Piece {
  node: Text;
  /** The section offset of the node's first character. */
  s0: number;
  /** Section offsets of the piece. */
  x: number;
  y: number;
  ids: string[];
  pending: boolean;
  link: boolean;
}

/** Remove a paint: unwrap every mark, then join each split text node back into its head. */
export function unpaint(p: Painted): void {
  for (let i = p.marks.length - 1; i >= 0; i -= 1) {
    const mark = p.marks[i];
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  }
  for (const { head, rest } of p.splits) {
    let text = head.nodeValue ?? "";
    for (const n of rest) {
      text += n.nodeValue ?? "";
      n.parentNode?.removeChild(n);
    }
    head.nodeValue = text;
  }
}

/** Paint `input` into the chapter body `root` (the `.kb-ch` element). */
export function paint(
  root: HTMLElement,
  sections: ReadonlyMap<string, readonly string[]>,
  input: PaintInput,
): Painted {
  const done: Painted = { marks: [], splits: [] };
  const { ranges, pending } = input;
  if (!ranges.length && !pending) return done;
  const segs = verified(segments(root as unknown as ANode), sections);
  const pieces: Piece[] = [];
  for (const seg of segs) {
    const mine = ranges.filter((r) => r.sec === seg.sec);
    const pend = pending && pending.sec === seg.sec ? pending : null;
    if (!mine.length && !pend) continue;
    const list: Piece[] = [];
    for (const u of units(seg.el)) {
      if (u.kind !== "text") continue;
      const s0 = seg.base + u.at;
      const s1 = s0 + u.len;
      const cuts = new Set<number>([s0, s1]);
      for (const r of [...mine, ...(pend ? [pend] : [])]) {
        if (r.s > s0 && r.s < s1) cuts.add(r.s);
        if (r.e > s0 && r.e < s1) cuts.add(r.e);
      }
      const pts = [...cuts].sort((a, b) => a - b);
      const node = u.node as unknown as Text;
      const link = !!(node.parentElement && node.parentElement.closest("a"));
      for (let k = 0; k + 1 < pts.length; k += 1) {
        const x = pts[k];
        const y = pts[k + 1];
        const ids = mine.filter((r) => r.s <= x && r.e >= y).map((r) => r.id);
        const inPending = !!pend && pend.s <= x && pend.e >= y;
        if (!ids.length && !inPending) continue;
        list.push({ node, s0, x, y, ids, pending: inPending, link });
      }
    }
    pieces.push(...list);
  }

  // Round 02: the stop. A highlight's first piece outside a link and not pending.
  const stopIds = new Map<Piece, string[]>();
  const placed = new Set<string>();
  const waiting = new Set<string>();
  for (const p of pieces) {
    for (const id of p.ids) if (!placed.has(id)) waiting.add(id);
    if (p.link || p.pending) continue;
    const here = p.ids.filter((id) => waiting.has(id));
    if (here.length) {
      stopIds.set(p, here);
      here.forEach((id) => {
        placed.add(id);
        waiting.delete(id);
      });
    }
    // A highlight that ended inside a link takes no stop.
    for (const id of [...waiting]) if (!p.ids.includes(id)) waiting.delete(id);
  }

  const noted = new Set(ranges.filter((r) => r.note).map((r) => r.id));
  // Wrap, one text node at a time (its pieces are in order; split it once at every edge).
  const byNode = new Map<Text, Piece[]>();
  for (const p of pieces)
    byNode.set(p.node, [...(byNode.get(p.node) ?? []), p]);
  for (const [node, list] of byNode) {
    const text = node.nodeValue ?? "";
    const chars = Array.from(text);
    const s0 = list[0].s0;
    const utf16 = (k: number) => chars.slice(0, k).join("").length;
    const edges = new Set<number>();
    for (const p of list) {
      edges.add(p.x - s0);
      edges.add(p.y - s0);
    }
    const cuts = [...edges]
      .filter((k) => k > 0 && k < chars.length)
      .sort((a, b) => a - b);
    const parts: { node: Text; from: number }[] = [{ node, from: 0 }];
    let cur = node;
    let prev = 0;
    const rest: Text[] = [];
    for (const k of cuts) {
      const right = cur.splitText(utf16(k) - utf16(prev));
      rest.push(right);
      parts.push({ node: right, from: k });
      cur = right;
      prev = k;
    }
    if (rest.length) done.splits.push({ head: node, rest });
    for (const p of list) {
      const part = parts.find((q) => q.from === p.x - s0);
      if (!part) continue;
      const mark = document.createElement("mark");
      if (p.pending) {
        mark.className = "an-pending";
        mark.setAttribute("data-an", "pending");
      } else {
        const cls = ["an-m"];
        if (p.ids.length > 1) cls.push("an-m--2");
        if (p.ids.some((id) => noted.has(id))) cls.push("an-m--note");
        if (input.active && p.ids.includes(input.active)) cls.push("is-active");
        mark.className = cls.join(" ");
        mark.setAttribute("data-an", p.ids.join(" "));
        const stop = stopIds.get(p);
        if (stop) {
          mark.setAttribute("data-an-key", stop.join(" "));
          mark.tabIndex = 0;
          mark.setAttribute("role", "button");
          mark.setAttribute("aria-haspopup", "dialog");
          mark.setAttribute(
            "aria-describedby",
            p.ids.length > 1
              ? input.desc.many
              : p.ids.some((id) => noted.has(id))
                ? input.desc.note
                : input.desc.one,
          );
        }
      }
      part.node.parentNode?.insertBefore(mark, part.node);
      mark.appendChild(part.node);
      done.marks.push(mark);
    }
  }
  return done;
}
