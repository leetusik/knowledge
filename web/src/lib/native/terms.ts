/**
 * P39-hk.S9 — terms (`10-reading-aids` round 01, *The term marker*, *Data shapes*; F2, F33):
 * a link `[x](term:<id>)` to a term of the chapter's glossary. The reader numbers each such
 * link per term in render order, across the text AND the formulas' legends, and gives it the
 * id `tm-<id>-<n>`, `n` from 1. The id is generated at render and never stored; the glossary's
 * way back ("‹ Back to the text") returns to that very occurrence.
 *
 * A pure pre-pass over the block tree, after `planCitations` and in its pattern (`cites.ts`):
 * the glossary may sit anywhere, so its entries are read first, and the plan is keyed by the
 * link NODE, so the renderer asks "is this link a term?" of the very object it draws. A link to
 * an id the glossary does not hold (the glossary refused, or none) gets no number: the renderer
 * draws it through the missing-link path, as plain text. `md` has no glossary.
 */
import { parseRef, RefError } from "./refs";
import type { Block, Inline } from "./tree";

/** One glossary entry as the reader draws it (the block's term, checked). */
export interface TermEntry {
  id: string;
  term: string;
  /** Empty when the entry has none. */
  aliases: string[];
  short: Inline[];
  long: Inline[] | null;
}

/** One occurrence of a term in the chapter. */
export interface TermUse {
  id: string;
  /** Its position among that term's occurrences, from 1, in render order. */
  n: number;
  /** The marker's id, `tm-<id>-<n>`. */
  anchor: string;
}

export interface TermPlan {
  /** The glossary's entries by term id, in the author's order; empty without a glossary. */
  terms: Map<string, TermEntry>;
  byLink: WeakMap<object, TermUse>;
  /** Each term's occurrences, in render order (a term never linked has none). */
  uses: Map<string, TermUse[]>;
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const inlines = (v: unknown): Inline[] | null =>
  Array.isArray(v) ? (v as Inline[]) : null;

/** The term id a `term:` href names, or null (any other href, or a malformed one). */
export function termId(href: unknown): string | null {
  if (typeof href !== "string" || !href.startsWith("term:")) return null;
  try {
    const ref = parseRef(href, false);
    return ref.kind === "term" ? ref.id : null;
  } catch (exc) {
    if (exc instanceof RefError) return null;
    throw exc;
  }
}

function entries(blocks: readonly Block[]): Map<string, TermEntry> {
  const out = new Map<string, TermEntry>();
  // A chapter holds at most one glossary (a second is refused at ingest and again here).
  const g = blocks.find((b) => b.type === "glossary");
  if (!g || !Array.isArray((g as Rec).terms)) return out;
  for (const t of (g as Rec).terms as unknown[]) {
    if (!isRec(t)) continue;
    const id = typeof t.id === "string" ? t.id : null;
    const term = typeof t.term === "string" ? t.term : null;
    const short = inlines(t.short);
    if (!id || !term || !short || out.has(id)) continue;
    out.set(id, {
      id,
      term,
      aliases: Array.isArray(t.aliases)
        ? t.aliases.filter((a): a is string => typeof a === "string")
        : [],
      short,
      long: inlines(t.long),
    });
  }
  return out;
}

export function planTerms(blocks: readonly Block[]): TermPlan {
  const plan: TermPlan = {
    terms: entries(blocks),
    byLink: new WeakMap(),
    uses: new Map(),
  };
  if (plan.terms.size === 0) return plan;

  const visit = (v: unknown): void => {
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    if (!isRec(v)) return;
    if (v.type === "link") {
      const id = termId(v.href);
      if (id !== null && plan.terms.has(id)) {
        const list = plan.uses.get(id) ?? [];
        const use: TermUse = { id, n: list.length + 1, anchor: "" };
        use.anchor = `tm-${id}-${use.n}`;
        list.push(use);
        plan.uses.set(id, list);
        plan.byLink.set(v, use);
      }
      return;
    }
    for (const [key, value] of Object.entries(v)) {
      if (key !== "svg") visit(value);
    }
  };
  // The renderer's order, field by field, where a typed block draws its fields in an order of
  // its own (a figure's caption before its credit; a formula's reading before its legend; a
  // quiz item's prompt, options, answer, explanation), whatever order the author wrote them in.
  const quizItem = (item: unknown) => {
    if (!isRec(item)) return;
    visit(item.prompt);
    visit(item.text);
    if (Array.isArray(item.options))
      for (const o of item.options) if (isRec(o)) visit(o.text);
    visit(item.answer);
    visit(item.explain);
  };
  for (const b of blocks) {
    const r = b as unknown as Rec;
    if (b.type === "figure") {
      visit(r.caption);
      visit(r.credit);
    } else if (b.type === "figures") {
      visit(r.caption);
      visit(r.items);
    } else if (b.type === "formula") {
      visit(r.reading);
      if (Array.isArray(r.where))
        for (const row of r.where) if (isRec(row)) visit(row.means);
    } else if (b.type === "quiz") {
      if (Array.isArray(r.items)) r.items.forEach(quizItem);
    } else if (b.type === "glossary" || b.type === "sources") {
      // A glossary's definitions never link a term (ingest refuses it); sources hold no prose.
    } else {
      visit(b);
    }
  }
  return plan;
}
