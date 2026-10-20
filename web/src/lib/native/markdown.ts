/**
 * The remark side of the native grammar: CommonMark + the three GFM pieces
 * the Python parser enables (tables, strikethrough with a single tilde,
 * autolink literals) — and nothing else. `remark-gfm` is deliberately NOT
 * used: it also turns on footnotes and task-list items, which markdown-it-py's
 * commonmark preset (the Python half) does not have, so the two parsers would
 * build different trees from the same source.
 *
 * The three native extensions (callouts, typed fences, `{#id}`) are lifted in
 * `parse.ts`, on top of this tree, the same way `parse.py` lifts them on top of
 * markdown-it's tokens.
 */
import type {
  Definition,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
} from "mdast";
import { gfmAutolinkLiteralFromMarkdown } from "mdast-util-gfm-autolink-literal";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmAutolinkLiteral } from "micromark-extension-gfm-autolink-literal";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmTable } from "micromark-extension-gfm-table";
import remarkParse from "remark-parse";
import { unified, type Processor } from "unified";

/** The unified plugin: the GFM subset the native grammar allows. */
function remarkNativeGrammar(this: Processor) {
  const data = this.data();
  data.micromarkExtensions = [
    ...(data.micromarkExtensions ?? []),
    gfmAutolinkLiteral(),
    gfmStrikethrough({ singleTilde: true }),
    gfmTable(),
  ];
  data.fromMarkdownExtensions = [
    ...(data.fromMarkdownExtensions ?? []),
    gfmAutolinkLiteralFromMarkdown(),
    gfmStrikethroughFromMarkdown(),
    gfmTableFromMarkdown(),
  ];
}

const processor = unified().use(remarkParse).use(remarkNativeGrammar).freeze();

export function parseMarkdown(text: string): Root {
  return processor.parse(text) as Root;
}

/** A link reference definition, kept to resolve references (also in YAML fields). */
export interface Def {
  label: string;
  url: string;
  title: string | null;
}

/** Every definition in a tree, first one per identifier wins (CommonMark). */
export function collectDefinitions(root: Root): Map<string, Def> {
  const out = new Map<string, Def>();
  const walk = (nodes: readonly RootContent[]) => {
    for (const node of nodes) {
      if (node.type === "definition") {
        const d = node as Definition;
        if (!out.has(d.identifier)) {
          out.set(d.identifier, {
            label: d.label ?? d.identifier,
            url: d.url,
            title: d.title ?? null,
          });
        }
      }
      if ("children" in node && Array.isArray(node.children))
        walk(node.children as RootContent[]);
    }
  };
  walk(root.children);
  return out;
}

function serializeDefinitions(defs: Map<string, Def>): string {
  const esc = (value: string, chars: RegExp) =>
    value.replace(chars, (c) => `\\${c}`);
  return [...defs.values()]
    .map((d) => {
      const title = d.title === null ? "" : ` "${esc(d.title, /["\\]/g)}"`;
      return `[${esc(d.label, /[[\]\\]/g)}]: <${esc(d.url, /[<>\\]/g)}>${title}`;
    })
    .join("\n\n");
}

// Sentinels: private-use characters that carry no Markdown meaning.
const LEAD = "\ue004";
const BLANK_LINE = "\ue002";

/**
 * Parse a string as INLINE Markdown only — markdown-it's `parseInline`, which
 * the Python side uses for callout titles, cut heading content and every
 * *(md)* YAML field. Block syntax (`- `, `1. `, `# `, `> `, fences) must stay
 * text, so the string is fed to remark as the continuation lines of a
 * one-sentinel paragraph, each indented four spaces: no line indented that far
 * can open a block, and continuation indentation is dropped just as
 * markdown-it drops it after a soft break. Whitespace-only lines would end the
 * paragraph, so they carry a sentinel that is removed afterwards.
 */
export function parseInlineMdast(
  text: string,
  defs: Map<string, Def>,
): PhrasingContent[] {
  const lines = text.split("\n");
  const leading = /^[ \t]*/.exec(lines[0])?.[0] ?? "";
  const body = lines
    .map((line) => (line.trim() === "" ? `    ${BLANK_LINE}` : `    ${line}`))
    .join("\n");
  const defsText = defs.size ? `\n\n${serializeDefinitions(defs)}` : "";
  const root = parseMarkdown(`${LEAD}\n${body}${defsText}`);
  const first = root.children[0];
  if (!first || first.type !== "paragraph")
    return text ? [{ type: "text", value: text }] : [];
  const source = `${LEAD}\n${body}${defsText}`;
  restoreLineEndWhitespace((first as Paragraph).children, source);
  const children = stripSentinels((first as Paragraph).children);
  if (leading) {
    const head = children[0];
    if (head && head.type === "text") head.value = leading + head.value;
    else children.unshift({ type: "text", value: leading });
  }
  return children;
}

function stripSentinels(nodes: PhrasingContent[]): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  nodes.forEach((node, i) => {
    if (node.type === "text") {
      let value = node.value;
      if (i === 0 && value.startsWith(`${LEAD}\n`))
        value = value.slice(LEAD.length + 1);
      else if (i === 0 && value.startsWith(LEAD))
        value = value.slice(LEAD.length);
      value = value.split(BLANK_LINE).join("");
      if (value) out.push({ ...node, value });
      return;
    }
    if ("children" in node && Array.isArray(node.children)) {
      out.push({
        ...node,
        children: stripSentinels(node.children as PhrasingContent[]),
      } as PhrasingContent);
      return;
    }
    out.push(node);
  });
  return out;
}

/**
 * markdown-it keeps a soft break's trailing whitespace except ONE final space
 * (so a trailing tab stays in the text); micromark drops all of it. Put back
 * what markdown-it keeps, so the text — and the offsets measured on it —
 * agree with the Python side. Mutates the text nodes in place.
 */
export function restoreLineEndWhitespace(
  nodes: readonly PhrasingContent[],
  source: string,
): void {
  for (const node of nodes) {
    if (node.type === "text") {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (
        start === undefined ||
        end === undefined ||
        !node.value.includes("\n")
      )
        continue;
      const raw = source.slice(start, end);
      const rawBreaks = raw.split("\n");
      const parts = node.value.split("\n");
      if (rawBreaks.length !== parts.length) continue; // a "\n" from a character reference: leave it
      for (let i = 0; i < parts.length - 1; i += 1) {
        const trailing = /[ \t]*$/.exec(rawBreaks[i])?.[0] ?? "";
        if (!trailing || / {2}$/.test(trailing)) continue;
        const kept = trailing.endsWith(" ") ? trailing.slice(0, -1) : trailing;
        if (kept && !parts[i].endsWith(kept)) parts[i] += kept;
      }
      node.value = parts.join("\n");
    } else if ("children" in node && Array.isArray(node.children)) {
      restoreLineEndWhitespace(node.children as PhrasingContent[], source);
    }
  }
}
