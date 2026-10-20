/**
 * The per-block plain-text projection annotation offsets are measured against
 * (mirrors `server/native/project.py`; README → "The projection"). Core test 4
 * holds this and the Python side byte for byte on the shared fixtures.
 *
 * A section is an id'd top-level block (h2–h4, a typed block, or a code block
 * with an authored id) plus every block after it up to the next id'd block.
 * Its text is its passage containers' texts joined by "\n": paragraphs (any
 * depth), callout titles, table cells (head row first), code text verbatim.
 * Headings and all typed-block text contribute nothing. No whitespace is
 * collapsed. Offsets count Unicode code points: use `codePoints()`, never
 * `.length` (UTF-16 units).
 */
import type { Block, Inline, Tree } from "./tree";

export function inlineText(nodes: readonly Inline[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text" || node.type === "code") out += node.text;
    else if (node.type === "break") out += "\n";
    else if (
      node.type === "em" ||
      node.type === "strong" ||
      node.type === "del" ||
      node.type === "link"
    ) {
      out += inlineText(node.children);
    }
    // image, blank: nothing
  }
  return out;
}

export function containers(block: Block): string[] {
  switch (block.type) {
    case "paragraph":
      return [inlineText(block.content)];
    case "code":
      return [block.text];
    case "table":
      return [
        ...block.head.map(inlineText),
        ...block.rows.flatMap((row) => row.map(inlineText)),
      ];
    case "list":
      return block.items.flatMap((item) => item.blocks.flatMap(containers));
    case "blockquote":
      return block.blocks.flatMap(containers);
    case "callout":
      return [
        ...(block.title && block.title.length ? [inlineText(block.title)] : []),
        ...block.blocks.flatMap(containers),
      ];
    default:
      return []; // heading, hr, typed blocks
  }
}

export interface Section {
  id: string;
  text: string;
}

/** `[{id, text}]` in document order: the anchor basis (S9 resolves against it). */
export function sections(tree: Tree): Section[] {
  const out: { id: string; parts: string[] }[] = [];
  let current: { id: string; parts: string[] } | null = null;
  for (const block of tree.blocks) {
    if (block.id) {
      current = { id: block.id, parts: [] };
      out.push(current);
    }
    if (current !== null) current.parts.push(...containers(block));
  }
  return out.map((s) => ({ id: s.id, text: s.parts.join("\n") }));
}

/** The `.txt` fixture form: `=== <id>\n<text>\n` per section. */
export function formatSections(secs: readonly Section[]): string {
  return secs.map((s) => `=== ${s.id}\n${s.text}\n`).join("");
}

/** A string as Unicode code points: the unit annotation offsets count. */
export function codePoints(text: string): string[] {
  return Array.from(text);
}
