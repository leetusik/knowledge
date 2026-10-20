/**
 * Parse and validate a native chapter into the normalized block tree (mirrors
 * `server/native/parse.py`; the spec is `server/native/README.md`).
 *
 * `parseChapter(source)` takes the whole stored file (the `---` YAML header
 * plus the body) and returns the tree, every violation (never thrown), and
 * the line span of every top-level block so the renderer can refuse exactly
 * the blocks a violation falls in. With `format: "md"` the same pipeline runs
 * with the three native extensions and every native check turned off.
 *
 * Remark builds the CommonMark/GFM tree; the extensions are lifted the way
 * `parse.py` lifts them from markdown-it's tokens, before inline parsing:
 *  - a callout's `[!TYPE]` first line is cut out of its first paragraph (a
 *    sentinel takes its place, so the rest of the paragraph parses on its own);
 *  - a heading's trailing `{#id}` is cut from the raw heading content, which is
 *    then parsed as inline Markdown;
 *  - a fence whose language is a typed-block name is a typed block with a YAML
 *    body, checked by `schema.ts`.
 */
import type {
  Blockquote,
  Code,
  Heading,
  List,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Table,
} from "mdast";

import { Collector, type Violation, type ViolationExtra } from "./errors";
import { headingSlug, IdRegistry, isValidId } from "./ids";
import {
  collectDefinitions,
  parseInlineMdast,
  parseMarkdown,
  restoreLineEndWhitespace,
  type Def,
} from "./markdown";
import { pyRepr, pyStrip } from "./pyutil";
import { parseRef, RefError, type Ref } from "./refs";
import {
  BlockContext,
  CALLOUT_TYPES,
  CHECKS,
  MAX_BODY_BYTES,
  MAX_TYPED_BLOCKS,
  TYPED_BLOCKS,
} from "./schema";
import type { Block, Inline, Tree, TypedBlock } from "./tree";
import { load as loadYaml, pathKey, YamlError } from "./yamlcore";

export const SYNTAX_VERSION = 1;
export const MAX_INLINE_DEPTH = 32;

const HEADING_ID_RE = /[ \t]*\{#([^{}]*)\}[ \t]*$/;
const ALERT_RE = /^\[!([A-Za-z]+)\](-?)(?:[ \t]+(.*?))?[ \t]*$/;
const INFO_TOKEN_RE = /\s*(title="[^"]*"|\S+)/g;
const CALLOUT_SENTINEL = "\ue003";

export type ChapterFormat = "native" | "md";

export interface RefRecord {
  ref: Ref;
  href: string;
  line: number;
  image: boolean;
}

/** One top-level node of the body: its block (null when dropped) and file lines. */
export interface TopLevel {
  block: Block | null;
  start: number;
  end: number;
}

export interface ParseResult {
  format: ChapterFormat;
  tree: Tree;
  /** Every violation, sorted (line, col, code). Always empty for `md`. */
  violations: Violation[];
  /** True when the whole chapter is refused (header, size, nesting). */
  fatal: boolean;
  /** One entry per top-level block, in order (`tree.blocks` is the non-null ones). */
  topLevel: TopLevel[];
  refs: RefRecord[];
  /** The document id namespace, authored + assigned. */
  ids: string[];
}

export interface ParseOptions {
  format?: ChapterFormat;
  reservedIds?: Iterable<string>;
}

interface Alert {
  type: string;
  collapsed: boolean;
  title: string | null;
  /** The leading whitespace markdown-it keeps on the first line after the marker. */
  restLead: string;
}

interface Pending {
  block: { id: string | null };
  kind: string;
  slug: string | null;
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

function lineEnd(text: string, offset: number): number {
  const i = text.indexOf("\n", offset);
  return i === -1 ? text.length : i;
}

/** Plain text of inline nodes (parse.py `_plain`): the heading slug basis. */
export function plainText(nodes: readonly Inline[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "text" || node.type === "code") out += node.text;
    else if (node.type === "break") out += "\n";
    else if ("children" in node) out += plainText(node.children);
  }
  return out;
}

class Parser {
  readonly errors = new Collector();
  readonly ids: IdRegistry;
  readonly refs: RefRecord[] = [];
  readonly idRefs: [string, number, string | null][] = [];
  readonly pending: Pending[] = [];
  headerLines = 0;
  bodyLines: string[] = [];
  body = "";
  typedCount = 0;
  defs = new Map<string, Def>();
  callouts = new Map<string, Alert>();
  readonly native: boolean;

  constructor(
    private readonly source: string,
    readonly format: ChapterFormat,
    reserved: Iterable<string>,
  ) {
    this.ids = new IdRegistry(reserved);
    this.native = format === "native";
  }

  report(
    line: number,
    code: string,
    message: string,
    extra: ViolationExtra = {},
  ): void {
    this.errors.add(line, code, message, extra);
  }

  result(tree: Tree, topLevel: TopLevel[], fatal: boolean): ParseResult {
    return {
      format: this.format,
      tree,
      violations: this.errors.sorted(),
      fatal,
      topLevel,
      refs: this.refs,
      ids: [...this.ids.document],
    };
  }

  run(): ParseResult {
    const empty: Tree = { syntax: SYNTAX_VERSION, summary: null, blocks: [] };
    const text = this.source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (this.native) {
      if (text.includes("\x00")) {
        const line = text.slice(0, text.indexOf("\x00")).split("\n").length;
        this.report(
          line,
          "control-char",
          "the source contains a NUL character",
        );
        return this.result(empty, [], true);
      }
      if (utf8Length(text) > MAX_BODY_BYTES) {
        this.report(
          1,
          "body-too-large",
          `a native chapter is at most ${MAX_BODY_BYTES / 1024} KB`,
        );
        return this.result(empty, [], true);
      }
    }
    const lines = text.split("\n");
    const summary = this.native ? this.header(lines) : null;
    if (this.errors.any) return this.result(empty, [], true);
    this.bodyLines = lines.slice(this.headerLines);
    this.body = this.bodyLines.join("\n");

    let root = parseMarkdown(this.body);
    if (this.native) root = this.liftCallouts(root);
    this.defs = collectDefinitions(root);
    this.restoreWhitespace(root);

    if (this.native) {
      for (const [line, depth] of this.inlineDepths(root)) {
        if (depth > MAX_INLINE_DEPTH) {
          this.report(
            line,
            "limit",
            `inline markup nests deeper than ${MAX_INLINE_DEPTH} levels`,
          );
        }
      }
      if (this.errors.any) return this.result(empty, [], true); // never build over a nesting bomb
    }

    const topLevel: TopLevel[] = [];
    for (const node of root.children) {
      const block = this.block(node, 0);
      const pos = node.position;
      topLevel.push({
        block,
        start: pos ? this.fileLine(pos.start.line - 1) : this.headerLines + 1,
        end: pos ? this.fileLine(pos.end.line - 1) : this.headerLines + 1,
      });
    }
    const blocks = topLevel
      .map((t) => t.block)
      .filter((b): b is Block => b !== null);
    let fatal = false;
    if (this.native) {
      if (this.typedCount > MAX_TYPED_BLOCKS) {
        this.report(
          1,
          "limit",
          `a chapter holds at most ${MAX_TYPED_BLOCKS} typed blocks, has ${this.typedCount}`,
        );
        fatal = true;
      }
      this.assign();
      for (const [target, line, block] of this.idRefs) {
        if (!this.ids.has(target)) {
          this.report(
            line,
            "ref-missing-id",
            `#${target} names no id in this chapter`,
            { block },
          );
        }
      }
    }
    return this.result(
      { syntax: SYNTAX_VERSION, summary, blocks },
      topLevel,
      fatal,
    );
  }

  header(lines: string[]): string | null {
    if (!lines.length || lines[0].trimEnd() !== "---") {
      this.report(
        1,
        "header-missing",
        "a native chapter starts with a --- YAML header",
      );
      return null;
    }
    let end = -1;
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].trimEnd() === "---") {
        end = i;
        break;
      }
    }
    if (end === -1) {
      this.report(1, "header-missing", "the --- YAML header is not closed");
      return null;
    }
    this.headerLines = end + 1;
    let meta: unknown;
    let mlines: Map<string, number>;
    try {
      ({ data: meta, lines: mlines } = loadYaml(
        lines.slice(1, end).join("\n"),
      ));
    } catch (exc) {
      if (!(exc instanceof YamlError)) throw exc;
      this.report(exc.line + 2, "header-yaml", exc.message);
      return null;
    }
    if (typeof meta !== "object" || meta === null || Array.isArray(meta)) {
      this.report(1, "header-yaml", "the header must be a YAML mapping");
      return null;
    }
    const m = meta as Record<string, unknown>;
    const lineOf = (key: string) => (mlines.get(pathKey([key])) ?? 0) + 2;
    const hasKey = (key: string) =>
      Object.prototype.hasOwnProperty.call(m, key);
    if (!hasKey("format") || m.format !== "native") {
      this.report(
        lineOf("format"),
        "header-format",
        "the header must say format: native",
      );
    }
    if (!hasKey("syntax")) {
      this.report(
        1,
        "header-syntax",
        `the header must say syntax: ${SYNTAX_VERSION}`,
      );
    } else if (m.syntax !== SYNTAX_VERSION || typeof m.syntax === "boolean") {
      this.report(
        lineOf("syntax"),
        "header-syntax",
        `unsupported syntax ${pyRepr(m.syntax)} (this server reads syntax: ${SYNTAX_VERSION})`,
      );
    }
    let summary = hasKey("summary") ? m.summary : null;
    if (
      summary !== null &&
      summary !== undefined &&
      (typeof summary !== "string" || !pyStrip(summary))
    ) {
      this.report(
        lineOf("summary"),
        "header-field",
        "summary must be a non-empty string",
      );
      summary = null;
    }
    return (summary as string | null | undefined) ?? null;
  }

  fileLine(bodyLine: number): number {
    return this.headerLines + bodyLine + 1;
  }

  nodeLine(node: { position?: { start: { line: number } } }): number {
    return node.position
      ? this.fileLine(node.position.start.line - 1)
      : this.headerLines + 1;
  }

  // --- the callout lift (parse.py `_native_extensions`, the alert half) --------

  /**
   * Find every blockquote whose first child is a paragraph opening with a
   * `[!TYPE]` line, put a sentinel in place of that line and parse again. The
   * rest of the paragraph then parses on its own, exactly as markdown-it parses
   * `rest` after the Python side cut the marker line off.
   */
  liftCallouts(root: Root): Root {
    const cuts: [number, number][] = [];
    const visit = (nodes: readonly RootContent[]) => {
      for (const node of nodes) {
        if (node.type === "blockquote") {
          const first = (node as Blockquote).children[0];
          if (
            first &&
            first.type === "paragraph" &&
            first.position?.start.offset !== undefined
          ) {
            const start = first.position.start.offset;
            const line = this.body.slice(start, lineEnd(this.body, start));
            const m = ALERT_RE.exec(line);
            if (m) {
              this.callouts.set(
                `${first.position.start.line}:${first.position.start.column}`,
                {
                  type: m[1],
                  collapsed: m[2] === "-",
                  title: m[3] ? m[3] : null,
                  restLead: this.restLead(node as Blockquote, first),
                },
              );
              cuts.push([start, lineEnd(this.body, start)]);
            }
          }
        }
        if ("children" in node && Array.isArray(node.children))
          visit(node.children as RootContent[]);
      }
    };
    visit(root.children);
    if (!cuts.length) return root;
    let body = this.body;
    for (const [start, end] of cuts.sort((a, b) => b[0] - a[0])) {
      body = body.slice(0, start) + CALLOUT_SENTINEL + body.slice(end);
    }
    this.body = body;
    return parseMarkdown(body);
  }

  /**
   * markdown-it's `rest` (the paragraph after the marker line) keeps the next
   * line's leading whitespace after the `>` and its one optional space; the
   * remark tree has already dropped it as continuation indentation.
   */
  restLead(quote: Blockquote, para: Paragraph): string {
    const pos = para.position;
    const quoteCol = quote.position?.start.column;
    if (!pos || quoteCol === undefined || pos.end.line <= pos.start.line)
      return "";
    const lines = this.body.split("\n");
    const raw = lines[pos.start.line] ?? ""; // the 0-based index of the paragraph's second line
    let at = quoteCol - 1;
    if (raw[at] === ">") {
      at += 1;
      if (raw[at] === " ") at += 1;
    } else {
      at = 0; // a lazy continuation line keeps its own indentation
    }
    return /^[ \t]*/.exec(raw.slice(at))?.[0] ?? "";
  }

  calloutOf(node: Blockquote): Alert | null {
    const first = node.children[0];
    if (!first || first.type !== "paragraph" || !first.position) return null;
    return (
      this.callouts.get(
        `${first.position.start.line}:${first.position.start.column}`,
      ) ?? null
    );
  }

  /** Put back the line-end whitespace markdown-it keeps (see `restoreLineEndWhitespace`). */
  restoreWhitespace(root: Root): void {
    const visit = (nodes: readonly RootContent[]) => {
      for (const node of nodes) {
        if (
          node.type === "paragraph" ||
          node.type === "heading" ||
          node.type === "tableCell"
        ) {
          restoreLineEndWhitespace(
            node.children as PhrasingContent[],
            this.body,
          );
        } else if ("children" in node && Array.isArray(node.children)) {
          visit(node.children as RootContent[]);
        }
      }
    };
    visit(root.children);
  }

  /** `[line, depth]` of every inline run in the body (parse.py `_too_deep`). */
  inlineDepths(root: Root): [number, number][] {
    const out: [number, number][] = [];
    const depthOf = (nodes: readonly PhrasingContent[]): number => {
      let max = 0;
      for (const node of nodes) {
        if ("children" in node && Array.isArray(node.children)) {
          const nests =
            node.type === "emphasis" ||
            node.type === "strong" ||
            node.type === "delete" ||
            node.type === "link" ||
            node.type === "linkReference";
          max = Math.max(
            max,
            (nests ? 1 : 0) + depthOf(node.children as PhrasingContent[]),
          );
        }
      }
      return max;
    };
    const visit = (nodes: readonly RootContent[]) => {
      for (const node of nodes) {
        if (
          node.type === "paragraph" ||
          node.type === "heading" ||
          node.type === "tableCell"
        ) {
          out.push([
            this.nodeLine(node),
            depthOf(node.children as PhrasingContent[]),
          ]);
        } else if ("children" in node && Array.isArray(node.children)) {
          visit(node.children as RootContent[]);
        }
      }
    };
    visit(root.children);
    return out;
  }

  // --- blocks ------------------------------------------------------------------

  block(node: RootContent, depth: number): Block | null {
    const line = this.nodeLine(node);
    switch (node.type) {
      case "html":
        if (this.native)
          this.report(
            line,
            "raw-html",
            "raw HTML is not allowed in a native chapter",
          );
        return null;
      case "definition":
        return null;
      case "paragraph":
        return {
          type: "paragraph",
          id: null,
          content: this.inlineNode(node.children, line),
        };
      case "heading":
        return this.heading(node, depth, line);
      case "code":
        return this.fence(node, depth, line);
      case "blockquote":
        return this.blockquote(node, depth, line);
      case "list":
        return this.list(node, depth);
      case "table":
        return this.table(node);
      case "thematicBreak":
        return { type: "hr", id: null };
      default:
        if (this.native)
          this.report(
            line,
            "unsupported",
            `unsupported markdown construct ${pyRepr(node.type)}`,
          );
        return null;
    }
  }

  blockquote(node: Blockquote, depth: number, line: number): Block {
    const alert = this.native ? this.calloutOf(node) : null;
    let children = node.children;
    const blocks: Block[] = [];
    if (alert) {
      // The first paragraph starts with the sentinel standing in for the
      // `[!TYPE]` line: drop it, and the paragraph when nothing else is left.
      const [first, ...rest] = children;
      children = rest;
      const para = first as Paragraph;
      const inner = stripCalloutSentinel(para.children, alert.restLead);
      if (inner.length) {
        blocks.push({
          type: "paragraph",
          id: null,
          content: this.inlineNode(inner, this.nodeLine(para) + 1),
        });
      }
    }
    for (const child of children) {
      const b = this.block(child, depth + 1);
      if (b !== null) blocks.push(b);
    }
    if (!alert) return { type: "blockquote", id: null, blocks };
    let kind: string | null = alert.type.toUpperCase();
    if (!(CALLOUT_TYPES as readonly string[]).includes(kind)) {
      this.report(
        line,
        "callout-type",
        `unknown callout type [!${alert.type}] (use ${CALLOUT_TYPES.join(", ")})`,
      );
      kind = null;
    }
    const title = alert.title ? this.inlineText(alert.title, line) : null;
    return {
      type: "callout",
      id: null,
      kind,
      collapsed: alert.collapsed,
      title,
      blocks,
    };
  }

  list(node: List, depth: number): Block {
    const items = node.children.map((item) => ({
      blocks: item.children
        .map((c) => this.block(c, depth + 1))
        .filter((b): b is Block => b !== null),
    }));
    const loose =
      Boolean(node.spread) ||
      node.children.some((item) => Boolean(item.spread));
    const hasParagraph = node.children.some((item) =>
      item.children.some((c) => c.type === "paragraph"),
    );
    return {
      type: "list",
      id: null,
      ordered: Boolean(node.ordered),
      start: node.ordered ? (node.start ?? 1) : null,
      tight: !(loose && hasParagraph),
      items,
    };
  }

  heading(node: Heading, depth: number, line: number): Block | null {
    const level = node.depth;
    let content: Inline[];
    let rawId: string | null = null;
    const kids = node.children;
    const first = kids[0]?.position?.start.offset;
    const last = kids[kids.length - 1]?.position?.end.offset;
    const raw =
      first !== undefined && last !== undefined
        ? this.body.slice(first, last)
        : "";
    const m = this.native ? HEADING_ID_RE.exec(raw) : null;
    if (m) {
      rawId = m[1];
      content = this.inlineText(raw.slice(0, m.index), line, null, false);
    } else {
      content = this.inlineNode(kids, line);
    }
    if (!this.native) return { type: "heading", id: null, level, content };
    if (level < 2 || level > 4) {
      this.report(
        line,
        "heading-level",
        `h${level} is not allowed: the title comes from the header, and sections use h2-h4`,
      );
      return null;
    }
    if (depth > 0) {
      this.report(
        line,
        "heading-nested",
        "headings must not sit inside a list, quote or callout",
      );
      return null;
    }
    const block: Block = { type: "heading", id: null, level, content };
    if (rawId !== null) this.claimAuthored(block, rawId, line);
    else
      this.pending.push({
        block,
        kind: "heading",
        slug: headingSlug(plainText(content)),
      });
    return block;
  }

  claimAuthored(block: { id: string | null }, raw: string, line: number): void {
    if (!isValidId(raw)) {
      this.report(
        line,
        "id-malformed",
        `malformed id ${pyRepr(raw)} (expected [a-z0-9][a-z0-9-]{0,63})`,
      );
      return;
    }
    if (!this.ids.claim(raw))
      this.report(line, "id-duplicate", `duplicate id ${pyRepr(raw)}`);
    block.id = raw;
  }

  fence(node: Code, depth: number, line: number): Block | null {
    const text = node.value;
    const start = node.position?.start.offset;
    const fenced =
      start !== undefined &&
      (this.body[start] === "`" || this.body[start] === "~");
    if (!fenced)
      return { type: "code", id: null, lang: null, title: null, text };
    const info = `${node.lang ?? ""}${node.meta ? ` ${node.meta}` : ""}`.trim();
    if (!this.native)
      return {
        type: "code",
        id: null,
        lang: node.lang ?? null,
        title: null,
        text,
      };
    const tokens = [...info.matchAll(INFO_TOKEN_RE)].map((mm) => mm[1]);
    const head =
      tokens.length &&
      !tokens[0].startsWith("#") &&
      !tokens[0].startsWith('title="')
        ? tokens[0]
        : null;
    const rest = head !== null ? tokens.slice(1) : tokens;
    if (head !== null && (TYPED_BLOCKS as readonly string[]).includes(head)) {
      return this.typed(node, head, rest, depth, line);
    }
    let title: string | null = null;
    let rawId: string | null = null;
    for (const tok of rest) {
      if (tok.startsWith('title="') && title === null)
        title = tok.slice('title="'.length, -1);
      else if (tok.startsWith("#") && rawId === null) rawId = tok.slice(1);
      else
        this.report(
          line,
          "fence-info",
          `unexpected ${pyRepr(tok)} in a code fence's info (expected: lang title="..." #id)`,
        );
    }
    const block: Block = {
      type: "code",
      id: null,
      lang: head,
      title: title || null,
      text,
    };
    if (rawId !== null) {
      if (depth > 0)
        this.report(
          line,
          "id-nested",
          "an id'd code block must not sit inside a list, quote or callout",
        );
      else this.claimAuthored(block, rawId, line);
    }
    return block;
  }

  typed(
    node: Code,
    kind: string,
    rest: string[],
    depth: number,
    line: number,
  ): Block | null {
    this.typedCount += 1;
    if (depth > 0) {
      this.report(
        line,
        "typed-block-nested",
        `a ${kind} block must not sit inside a list, quote or callout`,
      );
      return null;
    }
    let rawId: string | null = null;
    for (const tok of rest) {
      if (tok.startsWith("#") && rawId === null) rawId = tok.slice(1);
      else
        this.report(
          line,
          "fence-info",
          `unexpected ${pyRepr(tok)} after \`\`\`${kind} (expected: \`\`\`${kind} #id)`,
        );
    }
    const block: TypedBlock = { type: kind as TypedBlock["type"], id: null };
    if (rawId !== null) this.claimAuthored(block, rawId, line);
    else this.pending.push({ block, kind, slug: null });
    const yamlText = node.value === "" ? "" : `${node.value}\n`;
    let data;
    let ylines: Map<string, number>;
    try {
      ({ data, lines: ylines } = loadYaml(yamlText));
    } catch (exc) {
      if (!(exc instanceof YamlError)) throw exc;
      this.report(line + 1 + exc.line, exc.code, exc.message, { block: rawId });
      return block as Block;
    }
    const fenceLine = (node.position?.start.line ?? 1) - 1;
    const cx = new BlockContext({
      baseLine: line + 1,
      lines: ylines,
      blockId: rawId,
      bodyLines: this.bodyLines.slice(fenceLine + 1),
      report: (l, code, message, extra) => this.report(l, code, message, extra),
      inline: (t, at) => this.inlineText(t, at, rawId),
      claim: (value) => this.ids.claim(value),
    });
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      this.report(
        line + 1,
        "field-type",
        `a ${kind} block's body must be a YAML mapping`,
        { block: rawId },
      );
      return block as Block;
    }
    Object.assign(block, CHECKS[kind](data, cx));
    return block as Block;
  }

  table(node: Table): Block {
    const [headRow, ...bodyRows] = node.children;
    const width = headRow ? headRow.children.length : 0;
    const align = Array.from(
      { length: width },
      (_, i) => node.align?.[i] ?? null,
    );
    const cellsOf = (row: (typeof node.children)[number]) =>
      Array.from({ length: width }, (_, i) => {
        const cell = row.children[i];
        return cell ? this.inlineNode(cell.children, this.nodeLine(cell)) : [];
      });
    return {
      type: "table",
      id: null,
      align,
      head: headRow ? cellsOf(headRow) : [],
      rows: bodyRows.map(cellsOf),
    };
  }

  // --- ids ---------------------------------------------------------------------

  assign(): void {
    for (const { block, kind, slug } of this.pending) {
      if (kind === "heading")
        block.id = slug
          ? this.ids.assignSlug(slug)
          : this.ids.assignNumbered("s");
      else block.id = this.ids.assignNumbered(kind);
    }
  }

  // --- inline ------------------------------------------------------------------

  /** Parse an *(md)* string (a YAML field, a callout title) as inline Markdown. */
  inlineText(
    text: string,
    line: number,
    block: string | null = null,
    checkDepth = true,
  ): Inline[] {
    const nodes = parseInlineMdast(text, this.defs);
    if (checkDepth && this.native) {
      const probe: [number, number][] = [];
      const depthOf = (ns: readonly PhrasingContent[]): number =>
        ns.reduce((max, n) => {
          if (!("children" in n) || !Array.isArray(n.children)) return max;
          const nests = [
            "emphasis",
            "strong",
            "delete",
            "link",
            "linkReference",
          ].includes(n.type);
          return Math.max(
            max,
            (nests ? 1 : 0) + depthOf(n.children as PhrasingContent[]),
          );
        }, 0);
      probe.push([line, depthOf(nodes)]);
      if (probe[0][1] > MAX_INLINE_DEPTH) {
        this.report(
          line,
          "limit",
          `inline markup nests deeper than ${MAX_INLINE_DEPTH} levels`,
          { block },
        );
        return [];
      }
    }
    return this.inlineChildren(nodes, line, block, 0);
  }

  inlineNode(
    children: readonly PhrasingContent[],
    line: number,
    block: string | null = null,
  ): Inline[] {
    return this.inlineChildren(children, line, block, 0);
  }

  inlineChildren(
    children: readonly PhrasingContent[],
    startLine: number,
    block: string | null,
    depth: number,
  ): Inline[] {
    if (depth > MAX_INLINE_DEPTH) {
      if (this.native)
        this.report(
          startLine,
          "limit",
          `inline markup nests deeper than ${MAX_INLINE_DEPTH} levels`,
          { block },
        );
      return [];
    }
    const out: Inline[] = [];
    let line = startLine;
    const addText = (value: string) => {
      if (!value) return;
      const last = out[out.length - 1];
      if (last && last.type === "text") last.text += value;
      else out.push({ type: "text", text: value });
    };
    for (const child of children) {
      switch (child.type) {
        case "text":
          addText(child.value);
          // A soft break is the "\n" inside a text node: parse.py counts a line per softbreak.
          line += (child.value.match(/\n/g) ?? []).length;
          break;
        case "break":
          out.push({ type: "break" });
          line += 1;
          break;
        case "inlineCode":
          out.push({ type: "code", text: child.value });
          break;
        case "emphasis":
        case "strong":
        case "delete": {
          const name =
            child.type === "emphasis"
              ? "em"
              : child.type === "strong"
                ? "strong"
                : "del";
          out.push({
            type: name,
            children: this.inlineChildren(
              child.children,
              line,
              block,
              depth + 1,
            ),
          });
          break;
        }
        case "link":
        case "linkReference": {
          let href: string;
          let title: string | null;
          if (child.type === "link") {
            href = child.url;
            title = child.title ? child.title : null;
          } else {
            const def = this.defs.get(child.identifier);
            href = def?.url ?? "";
            title = def?.title ? def.title : null;
          }
          this.reference(href, line, block, false);
          out.push({
            type: "link",
            href,
            title,
            children: this.inlineChildren(
              child.children,
              line,
              block,
              depth + 1,
            ),
          });
          break;
        }
        case "image":
        case "imageReference": {
          let src: string;
          let title: string | null;
          if (child.type === "image") {
            src = child.url;
            title = child.title ? child.title : null;
          } else {
            const def = this.defs.get(child.identifier);
            src = def?.url ?? "";
            title = def?.title ? def.title : null;
          }
          this.reference(src, line, block, true);
          out.push({ type: "image", src, alt: child.alt ?? "", title });
          break;
        }
        case "html":
          if (this.native)
            this.report(
              line,
              "raw-html",
              `raw HTML is not allowed (${pyRepr(child.value)})`,
              { block },
            );
          break;
        default:
          if (this.native)
            this.report(
              line,
              "unsupported",
              `unsupported inline construct ${pyRepr(child.type)}`,
            );
      }
    }
    return out;
  }

  reference(
    href: string,
    line: number,
    block: string | null,
    image: boolean,
  ): void {
    if (!this.native) return;
    let ref: Ref;
    try {
      ref = parseRef(href, image);
    } catch (exc) {
      if (exc instanceof RefError) {
        this.report(line, exc.code, exc.message, { block });
        return;
      }
      throw exc;
    }
    if (ref.kind === "id") this.idRefs.push([ref.id, line, block]);
    this.refs.push({ ref, href, line, image });
  }
}

/** Drop the callout sentinel (and the line break after it) from a paragraph's start. */
function stripCalloutSentinel(
  children: readonly PhrasingContent[],
  lead: string,
): PhrasingContent[] {
  const out = [...children];
  const head = out[0];
  if (head && head.type === "text" && head.value.startsWith(CALLOUT_SENTINEL)) {
    let value = head.value.slice(CALLOUT_SENTINEL.length);
    if (value.startsWith("\n")) value = value.slice(1);
    if (value) out[0] = { ...head, value };
    else out.shift();
  }
  if (out.length && lead) {
    const first = out[0];
    if (first.type === "text") out[0] = { ...first, value: lead + first.value };
    else out.unshift({ type: "text", value: lead });
  }
  return out;
}

/**
 * Parse (and, for native, validate) a whole chapter. Never throws on a
 * violation; an unexpected internal error is reported as one fatal `limit`
 * violation, so a hostile source can never take a page down.
 */
export function parseChapter(
  source: string,
  options: ParseOptions = {},
): ParseResult {
  const format = options.format ?? "native";
  const parser = new Parser(source, format, options.reservedIds ?? []);
  try {
    return parser.run();
  } catch {
    return {
      format,
      tree: { syntax: SYNTAX_VERSION, summary: null, blocks: [] },
      violations: [
        {
          line: 1,
          col: 1,
          code: "limit",
          message: "the chapter could not be parsed",
        },
      ],
      fatal: true,
      topLevel: [],
      refs: [],
      ids: [],
    };
  }
}
