import "server-only";

import { CHAPTER } from "@/content";
import type {
  KbAnnotation,
  KbBookmark,
  KbVariantState,
} from "@/lib/knowledge/reader";
import type { CheckedChapter } from "@/lib/native";
import { displayText } from "@/lib/native/display-text";
import { sections } from "@/lib/native/project";
import type { Block, Inline, Tree } from "@/lib/native/tree";

import { languageName } from "./language";
import type {
  CardStatus,
  NoteSection,
  ReaderBookmark,
  ReaderNote,
  ReaderNotes,
  ReaderOtherNote,
  SectionWord,
} from "./types";

/**
 * The language of the words the reader writes around a term, for a chapter in `lang`: the
 * renderer's `chromeLang` (`render.tsx`), "en" in every chapter that is not English, none
 * otherwise. The Glossary h2 carries it; so does its entry in the contents (P39-hk.F6) and its
 * place name in the annotation layer (P39-hk.F7).
 */
export function chromeLangOf(lang?: string | null): string | undefined {
  return lang && !/^en\b/i.test(lang) ? "en" : undefined;
}

/**
 * P30.S20/S21 — the annotation layer's data, read with the page: each section of a native
 * chapter (its name, and its text in the shared projection the offsets count), and the
 * member's own marks resolved for the version on screen (S9): highlights and notes, the
 * orphans (the Unanchored group), bookmarks, and the other languages' marks. A plain
 * Markdown document has no sections and no highlights, only position bookmarks; a refused
 * chapter has none of it.
 */
export function loadNotes(
  checked: CheckedChapter,
  state: KbVariantState | null,
  lang: string,
): ReaderNotes | null {
  if (checked.refused) return null;
  if (checked.format !== "native" && checked.format !== "md") return null;
  const plain = checked.format === "md";
  const other = state?.other_languages?.annotations ?? [];
  const otherBookmarks = state?.other_languages?.bookmarks ?? [];
  const langs = new Set<string>([lang]);
  for (const a of [
    ...(state?.annotations ?? []),
    ...(state?.unanchored ?? []),
    ...other,
    ...(state?.bookmarks ?? []),
    ...otherBookmarks,
  ])
    langs.add(a.lang);
  return {
    plain,
    sections: plain ? [] : noteSections(checked, lang),
    // A plain document has no highlights or section notes (the server refuses them).
    items: plain ? [] : (state?.annotations ?? []).map(noteOf),
    unanchored: plain ? [] : (state?.unanchored ?? []).map(noteOf),
    bookmarks: (state?.bookmarks ?? []).map(bookmarkOf),
    other: other.map(otherOf),
    otherBookmarks: otherBookmarks.map(bookmarkOf),
    langNames: Object.fromEntries([...langs].map((l) => [l, languageName(l)])),
  };
}

const inl = (v: unknown): Inline[] | null =>
  Array.isArray(v) ? (v as Inline[]) : null;
const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;

/** How a name reads inline text: `displayText` on screen; `plainText` for the label a snapshot stored before P39-hk.F4. */
export type Flatten = (nodes: readonly Inline[]) => string;

/**
 * A section's name (`05-annotations` *Every string*: "Section · {title}", "Diagram ·
 * {title}", "Quiz · {question}", "Figure · {caption}", "Sources · {heading}"). Where a
 * block names nothing (undrawn; P30.S20 decided): a quiz takes its first question, a
 * figure its alt or label, the sources list the heading above it, and a code block with
 * its own id its title, else its first line. P39-hk.F4 (OQ10): inline text is read through
 * `flat`, on screen `displayText` (a formula as its linear text, never its TeX).
 */
function nameOf(
  block: Block,
  heading: string | null,
  flat: Flatten,
): { word: SectionWord; title: string } {
  const b = block as unknown as Record<string, unknown>;
  const words = (v: unknown): string | null => {
    const nodes = inl(v);
    const t = nodes ? flat(nodes).replace(/\s+/g, " ").trim() : "";
    return t || null;
  };
  switch (block.type) {
    case "heading":
      return { word: "Section", title: flat(block.content).trim() };
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
    case "formula":
      // P39-hk.S8 (undrawn; built as a figure, `figure.ra-mb`): its spoken text names it,
      // else its reading. Never its TeX.
      return { word: "Figure", title: str(b.alt) ?? words(b.reading) ?? "" };
    case "sources":
      return { word: "Sources", title: heading ?? CHAPTER.sources.label };
    case "glossary":
      // P39-hk.F6 (R2-F2): the Glossary h2's own label (`render.tsx` `glossary`).
      return { word: "Section", title: CHAPTER.terms.glossary };
    case "code":
      return {
        word: "Section",
        title: block.title ?? block.text.split("\n")[0].trim(),
      };
    default:
      return { word: "Section", title: "" };
  }
}

function noteSections(checked: CheckedChapter, lang: string): NoteSection[] {
  // P39-hk.F7 (OQ25): the Glossary's place name carries the h2's own `lang`.
  const chrome = chromeLangOf(lang);
  const text = new Map(sections(checked.tree).map((s) => [s.id, s.text]));
  const out: NoteSection[] = [];
  let heading: string | null = null;
  for (const block of checked.tree.blocks) {
    if (block.type === "heading" && block.level === 2)
      heading = displayText(block.content).trim();
    if (!block.id || !text.has(block.id)) continue;
    const name = nameOf(block, heading, displayText);
    out.push({
      id: block.id,
      ...name,
      text: text.get(block.id) ?? "",
      ...(chrome && block.type === "glossary" ? { lang: chrome } : {}),
    });
  }
  return out;
}

/**
 * P39-hk.F4 — one section's place name as the reader labels it, the label a highlight's
 * snapshot stores (`annotations.tsx` `sectionLabel`): the title for a section, "{Word} ·
 * {title}" for anything else; inline text through `flat`. Null for an id that names no block.
 */
export function sectionLabel(
  tree: Tree,
  id: string,
  flat: Flatten,
): string | null {
  let heading: string | null = null;
  for (const block of tree.blocks) {
    if (block.type === "heading" && block.level === 2)
      heading = flat(block.content).trim();
    if (block.id !== id) continue;
    const { word, title } = nameOf(block, heading, flat);
    return word === "Section" ? title : `${word} · ${title}`;
  }
  return null;
}

export function noteOf(a: KbAnnotation): ReaderNote {
  const anchor = a.anchor;
  const card: CardStatus =
    a.card === "active" || a.card === "suspended"
      ? a.card
      : a.review
        ? "active"
        : "";
  const snap = a.snapshot;
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
    review: card === "active",
    card,
    lang: a.lang,
    version: a.version,
    created: a.created_at,
    snapshot: snap
      ? {
          text: snap.text ?? "",
          block: snap.block_title ?? "",
          chapter: snap.chapter_title ?? "",
        }
      : null,
  };
}

function otherOf(a: KbAnnotation): ReaderOtherNote {
  return { ...noteOf(a), at: a.section?.block_id ?? null };
}

export function bookmarkOf(b: KbBookmark): ReaderBookmark {
  const place = b.place;
  const block = b.anchor?.block_id ?? null;
  return {
    id: b.id,
    block,
    at: place?.block_id ?? null,
    exact: !!place?.exact,
    fraction: place?.fraction ?? b.anchor?.fraction ?? null,
    label: b.label ?? "",
    snippet: b.snippet ?? "",
    pos: block === null,
    approx: !!b.approx,
    lang: b.lang,
    version: b.version,
    created: b.created_at,
  };
}
