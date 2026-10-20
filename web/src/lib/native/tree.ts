/**
 * The normalized block tree (README → "The tree"). The Python parser and this
 * port build the same shape; the conformance fixtures compare them.
 */
import type { SvgElement } from "./svg";

export type Inline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "em" | "strong" | "del"; children: Inline[] }
  | { type: "link"; href: string; title: string | null; children: Inline[] }
  | { type: "image"; src: string; alt: string; title: string | null }
  | { type: "break" }
  | { type: "blank"; accept: string[] };

export type Block =
  | { type: "paragraph"; id: null; content: Inline[] }
  | { type: "heading"; id: string | null; level: number; content: Inline[] }
  | {
      type: "list";
      id: null;
      ordered: boolean;
      start: number | null;
      tight: boolean;
      items: { blocks: Block[] }[];
    }
  | { type: "blockquote"; id: null; blocks: Block[] }
  | {
      type: "callout";
      id: null;
      kind: string | null;
      collapsed: boolean;
      title: Inline[] | null;
      blocks: Block[];
    }
  | {
      type: "table";
      id: null;
      align: ("left" | "center" | "right" | null)[];
      head: Inline[][];
      rows: Inline[][][];
    }
  | {
      type: "code";
      id: string | null;
      lang: string | null;
      title: string | null;
      text: string;
    }
  | { type: "hr"; id: null }
  | TypedBlock;

/**
 * A typed block (`figure`, `figures`, `diagram`, `svg`, `quiz`, `sources`):
 * `type`, `id`, plus its schema's fields (README → "The tree"). The renderer
 * reads them defensively, because a refused field is `null`.
 */
export interface TypedBlock {
  /**
   * `"bar" | "line" | "interval"` is a top-level CHART diagram: the Python
   * parser's `block.update(check_diagram(...))` lets the chart's own `type`
   * overwrite the block's `"diagram"`, and the shared fixtures encode that, so
   * this port keeps it for parity (its `kind` is still `"chart"`). The renderer
   * reads such a block as a diagram. (P30.S12, OQ46.)
   */
  type:
    | "figure"
    | "figures"
    | "diagram"
    | "svg"
    | "quiz"
    | "sources"
    | "bar"
    | "line"
    | "interval";
  id: string | null;
  [field: string]: unknown;
}

export interface Tree {
  syntax: 1;
  summary: string | null;
  blocks: Block[];
}

export type { SvgElement };
