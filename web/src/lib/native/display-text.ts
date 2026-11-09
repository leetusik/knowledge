/**
 * P39-hk.F4 (OQ10) — the text the reader's text-only surfaces show for inline nodes, server-only:
 * the Contents list and "In this chapter", library Continue, a note's place name, a citation's
 * way back, the Review highlight card. Those surfaces draw no MathML, so an inline formula there
 * is its linear text (`linearTex`: S8's, the one the Review quiz card shows, OQ9) and never its
 * TeX. A formula Temml refuses (which publish never lets through) keeps its TeX.
 *
 * Display only. `plainText` (`parse.ts`) stays the heading slug's basis and `omitTitle`'s, and
 * the anchor projection (`project.ts`) still counts a formula's TeX verbatim: nothing here is
 * ever stored, sent to the API or used to find a place.
 *
 * A highlight's stored quote is a slice of that projection, so its formulas are bare TeX with no
 * delimiters. `displayQuote` rebuilds the shown quote from the section's own inline nodes and the
 * highlight's own offsets (`shownQuote`, which the reader runs on the page's math atoms), never
 * by searching the string: a one-letter formula "n" is also the word "n".
 */
import "server-only";

import { shownQuote, type QuoteAtom } from "@/lib/reader/note-list";

import { linearTex } from "./mathml";
import { codePoints, sections } from "./project";
import type { Block, Inline, Tree } from "./tree";

/** An inline formula's display text: its linear text, or its TeX where Temml refuses it. */
function shown(tex: string): string {
  return linearTex(tex) ?? tex;
}

/** `plainText`'s walk, with each inline formula as its linear text: a heading's or a caption's display text. */
export function displayText(nodes: readonly Inline[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text" || node.type === "code") out += node.text;
    else if (node.type === "math") out += shown(node.tex);
    else if (node.type === "break") out += "\n";
    else if ("children" in node) out += displayText(node.children);
  }
  return out;
}

/** One passage container's projected text, with the inline formulas in it (offsets in it). */
interface Run {
  text: string;
  atoms: QuoteAtom[];
}

/** `project.ts` `inlineText`, recording where each formula's TeX sits. */
function runOf(nodes: readonly Inline[], run: Run = { text: "", atoms: [] }): Run {
  for (const node of nodes) {
    if (node.type === "text" || node.type === "code") run.text += node.text;
    else if (node.type === "math") {
      run.atoms.push({
        at: codePoints(run.text).length,
        len: codePoints(node.tex).length,
        alt: shown(node.tex),
      });
      run.text += node.tex;
    } else if (node.type === "break") run.text += "\n";
    else if (
      node.type === "em" ||
      node.type === "strong" ||
      node.type === "del" ||
      node.type === "link"
    )
      runOf(node.children, run);
    // image, blank: nothing
  }
  return run;
}

/** `project.ts` `containers`, as runs. */
function runs(block: Block): Run[] {
  switch (block.type) {
    case "paragraph":
      return [runOf(block.content)];
    case "code":
      return [{ text: block.text, atoms: [] }];
    case "table":
      return [
        ...block.head.map((cell) => runOf(cell)),
        ...block.rows.flatMap((row) => row.map((cell) => runOf(cell))),
      ];
    case "list":
      return block.items.flatMap((item) => item.blocks.flatMap(runs));
    case "blockquote":
      return block.blocks.flatMap(runs);
    case "callout":
      return [
        ...(block.title && block.title.length ? [runOf(block.title)] : []),
        ...block.blocks.flatMap(runs),
      ];
    default:
      return [];
  }
}

/** A chapter's sections that hold an inline formula: each one's projected text and its formulas. */
export type QuoteBasis = ReadonlyMap<
  string,
  { text: readonly string[]; atoms: readonly QuoteAtom[] }
>;

/**
 * Each section's inline formulas, at their offsets (code points) in the section's projected text
 * (`project.ts` `sections`, the text the anchors count). A section whose rebuilt text is not the
 * projection's exactly is left out, so a drift here can only ever leave a quote as stored.
 */
export function quoteBasis(tree: Tree): QuoteBasis {
  const built: { id: string; parts: Run[] }[] = [];
  let current: { id: string; parts: Run[] } | null = null;
  for (const block of tree.blocks) {
    if (block.id) {
      current = { id: block.id, parts: [] };
      built.push(current);
    }
    if (current !== null) current.parts.push(...runs(block));
  }
  const canon = new Map(sections(tree).map((s) => [s.id, s.text]));
  const out = new Map<
    string,
    { text: readonly string[]; atoms: readonly QuoteAtom[] }
  >();
  for (const s of built) {
    const atoms: QuoteAtom[] = [];
    let at = 0;
    s.parts.forEach((part, i) => {
      if (i > 0) at += 1; // the "\n" between containers
      for (const a of part.atoms) atoms.push({ ...a, at: at + a.at });
      at += codePoints(part.text).length;
    });
    const text = canon.get(s.id);
    if (!atoms.length || text !== s.parts.map((p) => p.text).join("\n"))
      continue;
    out.set(s.id, { text: codePoints(text), atoms });
  }
  return out;
}

/**
 * The quote a highlight card shows: the stored quote with each formula in it as its linear text,
 * mapped from the section's own inline nodes and the highlight's own offsets. Null (show the
 * stored quote) when the section holds no formula, when its text at those offsets is not the
 * stored quote, when an offset falls inside a formula, or when no formula is in the quote.
 */
export function displayQuote(
  basis: QuoteBasis,
  sec: string,
  start: number,
  end: number,
  exact: string,
): string | null {
  const s = basis.get(sec);
  return s ? shownQuote(s.text, start, end, exact, s.atoms) : null;
}
