/**
 * The render-time gate (P29 *Render model*: "a Next server component parses it,
 * validates it again, and maps the result to React").
 *
 * Ingest already refused anything outside the contract, so on a stored chapter
 * this normally finds nothing. It exists for defence in depth: a file edited on
 * disk, a parser drift, an older version. Its rule is to refuse the smallest
 * thing that breaks the contract and never to show raw source:
 *  - a violation inside a top-level block refuses that block, which renders as
 *    an inline "this block couldn't be shown" placeholder;
 *  - a violation outside every block (the header, the size, the typed-block
 *    count, a nesting bomb) refuses the whole chapter.
 * `md` is never validated (P29 *Format flag and md*: "no ingest validation").
 */
import type { Violation } from "./errors";
import { parseChapter, type ChapterFormat, type ParseResult } from "./parse";
import type { Block, Tree } from "./tree";

export interface CheckedBlock {
  /** The block, or null where the source held nothing renderable (a definition, a raw HTML block). */
  block: Block | null;
  /** True when a violation falls inside it: render the placeholder instead. */
  refused: boolean;
  violations: Violation[];
}

export interface CheckedChapter {
  format: ChapterFormat;
  tree: Tree;
  /** The whole chapter is refused: render only the chapter placeholder. */
  refused: boolean;
  blocks: CheckedBlock[];
  violations: Violation[];
  parse: ParseResult;
}

export function validateChapter(
  source: string,
  format: ChapterFormat = "native",
): CheckedChapter {
  const parse = parseChapter(source, { format });
  const blocks: CheckedBlock[] = parse.topLevel.map((t) => ({
    block: t.block,
    refused: false,
    violations: [],
  }));
  let refused = parse.fatal;
  for (const v of parse.violations) {
    const i = parse.topLevel.findIndex(
      (t) => t.start <= v.line && v.line <= t.end,
    );
    if (i === -1) {
      refused = true;
      continue;
    }
    blocks[i].refused = true;
    blocks[i].violations.push(v);
  }
  return {
    format,
    tree: parse.tree,
    refused,
    blocks,
    violations: parse.violations,
    parse,
  };
}
