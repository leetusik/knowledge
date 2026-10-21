import "server-only";

import { CHAPTER } from "@/content";
import type { KbAnnotation, KbVariantState } from "@/lib/knowledge/reader";
import type { CheckedChapter } from "@/lib/native";
import { plainText } from "@/lib/native/parse";
import { sections } from "@/lib/native/project";
import type { Block, Inline } from "@/lib/native/tree";

import type {
  NoteSection,
  ReaderNote,
  ReaderNotes,
  SectionWord,
} from "./types";

/**
 * P30.S20 — the annotation layer's data, read with the page: each section of a native
 * chapter (its name, and its text in the shared projection the offsets count), and the
 * member's own annotations resolved for the version on screen (S9). A plain Markdown
 * document or a refused chapter has none.
 */
export function loadNotes(
  checked: CheckedChapter,
  state: KbVariantState | null,
): ReaderNotes | null {
  if (checked.format !== "native" || checked.refused) return null;
  return {
    sections: noteSections(checked),
    items: (state?.annotations ?? []).map(noteOf),
    unanchored: (state?.unanchored ?? []).map(noteOf),
  };
}

const inl = (v: unknown): Inline[] | null =>
  Array.isArray(v) ? (v as Inline[]) : null;
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;
const words = (v: unknown): string | null => {
  const nodes = inl(v);
  const t = nodes ? plainText(nodes).replace(/\s+/g, " ").trim() : "";
  return t || null;
};

/**
 * A section's name (`05-annotations` *Every string*: "Section · {title}", "Diagram ·
 * {title}", "Quiz · {question}", "Figure · {caption}", "Sources · {heading}"). Where a
 * block names nothing (undrawn; P30.S20 decided): a quiz takes its first question, a
 * figure its alt or label, the sources list the heading above it, and a code block with
 * its own id its title, else its first line.
 */
function nameOf(
  block: Block,
  heading: string | null,
): { word: SectionWord; title: string } {
  const b = block as unknown as Record<string, unknown>;
  switch (block.type) {
    case "heading":
      return { word: "Section", title: plainText(block.content).trim() };
    case "diagram":
      return { word: "Diagram", title: str(b.title) ?? words(b.caption) ?? "" };
    case "quiz": {
      const items = Array.isArray(b.items)
        ? (b.items as Record<string, unknown>[])
        : [];
      return {
        word: "Quiz",
        title: str(b.title) ?? (items[0] ? (words(items[0].prompt) ?? "") : ""),
      };
    }
    case "figure":
      return { word: "Figure", title: words(b.caption) ?? str(b.alt) ?? "" };
    case "figures":
      return { word: "Figure", title: words(b.caption) ?? "" };
    case "svg":
      return { word: "Figure", title: words(b.caption) ?? str(b.label) ?? "" };
    case "sources":
      return { word: "Sources", title: heading ?? CHAPTER.sources.label };
    case "code":
      return {
        word: "Section",
        title: block.title ?? block.text.split("\n")[0].trim(),
      };
    default:
      return { word: "Section", title: "" };
  }
}

function noteSections(checked: CheckedChapter): NoteSection[] {
  const text = new Map(sections(checked.tree).map((s) => [s.id, s.text]));
  const out: NoteSection[] = [];
  let heading: string | null = null;
  for (const block of checked.tree.blocks) {
    if (block.type === "heading" && block.level === 2)
      heading = plainText(block.content).trim();
    if (!block.id || !text.has(block.id)) continue;
    const name = nameOf(block, heading);
    out.push({ id: block.id, ...name, text: text.get(block.id) ?? "" });
  }
  return out;
}

function noteOf(a: KbAnnotation): ReaderNote {
  const anchor = a.anchor;
  return {
    id: a.id,
    kind: a.kind === "bnote" || !a.quote ? "bnote" : "hl",
    block: a.block_id,
    sec: anchor?.block_id ?? null,
    start: anchor?.start ?? null,
    end: anchor?.end ?? null,
    status: anchor?.status ?? a.anchor_status ?? "anchored",
    method: anchor?.method ?? "stored",
    quote: a.quote
      ? {
          exact: a.quote.exact,
          prefix: a.quote.prefix ?? "",
          suffix: a.quote.suffix ?? "",
        }
      : null,
    note: a.note ?? "",
    review: !!a.review,
    lang: a.lang,
    version: a.version,
    created: a.created_at,
  };
}
