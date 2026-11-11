import "server-only";

import {
  getListenState,
  type KbListenPosition,
  type KbListenState,
} from "@/lib/knowledge/listen";
import type { ReaderView } from "@/lib/reader/types";

import { ownChapters } from "./book";
import type {
  ListenBook,
  ListenBookKey,
  ListenDocKey,
  ListenSeed,
  ListenUnitKey,
} from "./types";

/**
 * P41-sr.W1 — the Listen state a reader page reads at load (beside the page's own load),
 * so the head's Listen renders with the page and never pops in under the reader: its
 * length when made (F6), Continue listening when left part-way. Signed in only: Listen's
 * routes are session-only (P41-sr.B1). Any miss or fault reads as "no Listen here" (null),
 * so the reader never fails over it; `unavailable` (a legacy format) is null too.
 */
export async function readListenState(
  token: string,
  key: ListenUnitKey,
): Promise<KbListenState | null> {
  try {
    const state = await getListenState(token, key);
    return state.state === "unavailable" ? null : state;
  } catch {
    return null;
  }
}

/**
 * A document page's seed: the state read at load, on the version Listen plays (the
 * current one; an older version's text would not be the audio's), else none.
 */
export function docSeed(
  view: Pick<ReaderView, "title" | "lang" | "version" | "newest">,
  state: KbListenState | null,
  key: ListenDocKey,
  href: string,
): ListenSeed | null {
  if (!state || view.version < view.newest) return null;
  return {
    key,
    title: view.title,
    lang: view.lang,
    state,
    href,
    book: null,
    chapter: null,
  };
}

/**
 * P41-sr.W2 — a chapter page's seed: the book from this chapter (B1's book key, in the
 * variant on screen), on the current version, when this chapter can be read aloud (the
 * state's first entry is this chapter, and listenable). Any miss: no Listen here.
 */
export function chapterSeed(
  view: ReaderView,
  state: KbListenState | null,
  key: ListenBookKey,
): ListenSeed | null {
  if (!state || !view.book || view.version < view.newest) return null;
  const first = state.entries[0];
  if (!first || first.chapter !== key.from_chapter) return null;
  if (first.state === "unavailable") return null;
  const chapters = view.book.chapters.map((c) => ({
    key: c.key,
    n: c.n,
    title: c.title,
    lang: c.lang,
    href: c.href,
  }));
  return {
    key,
    title: view.title,
    lang: view.lang,
    state,
    href: chapters.find((c) => c.key === key.from_chapter)?.href ?? "",
    book: { title: view.book.title, href: view.book.backHref, chapters },
    chapter: key.from_chapter ?? null,
  };
}

/** The book landing's Listen: the book from its first chapter, and the place left part-way. */
export interface BookListenSeed {
  /** Listen: the book from chapter 1, in the language the server reads it by default. */
  start: ListenSeed;
  /**
   * P41-sr.F3: the book from chapter 1 in each language its chapters have, by language
   * (`start`'s among them): Start over restarts the kept place's own language (rule 5).
   */
  langs: Record<string, ListenSeed>;
  /** The newest place left part-way, across the languages, in its own language; null when none. */
  place: KbListenPosition | null;
  /** Continue listening: the book from the place's chapter, in its language; null when none. */
  resume: ListenSeed | null;
}

/**
 * The book from chapter 1 in one language, as the landing shows it. The rows show each
 * chapter in the variant its reader last opened; the Listen reads each chapter in the
 * language B1 names for it (the entry's `lang`), so its pages open on that variant: the
 * follow along is on the text that is heard (W2). A row's title stays in its own language
 * (`lang`), so the player never shows it over another language's audio (P41-sr.F3).
 */
function seedIn(
  key: ListenBookKey,
  state: KbListenState,
  shown: ListenBook,
  variants: Record<string, Record<string, string>>,
): ListenSeed {
  const book: ListenBook = {
    ...shown,
    chapters: shown.chapters.map((c) => {
      const lang = state.entries.find((e) => e.chapter === c.key)?.lang;
      const href =
        lang && lang !== c.lang ? variants[c.key]?.[lang] : undefined;
      return href ? { ...c, href } : c;
    }),
  };
  const firstKey = ownChapters(state.entries)[0];
  const first =
    book.chapters.find((c) => c.key === firstKey) ?? book.chapters[0];
  return {
    key,
    title: first?.title ?? book.title,
    lang: state.listen.lang,
    state,
    href: first?.href ?? book.href,
    book,
    chapter: null,
  };
}

/**
 * P41-sr.W2 — the book landing's seeds, read beside its load (signed in only): the book
 * from its first chapter (Listen, Start over, the rows' audio), and, when the newest
 * place (`resume`) is in another chapter, the book from that chapter, so Continue
 * listening sounds inside the press (R3). Any miss is "no Listen here".
 *
 * P41-sr.F3 — a place belongs to its language: each language's Listen is read for its own
 * place (B1's `resume`, in that language only), and the newest of them is the landing's
 * Continue listening, which resumes that language's audio and opens its pages.
 */
export async function readBookSeed(
  token: string,
  key: { org: string; project: string; book: string },
  shown: ListenBook,
  variants: Record<string, Record<string, string>> = {},
): Promise<BookListenSeed | null> {
  const state = await readListenState(token, key);
  if (!state) return null;
  const home = state.listen.lang;
  const others = [
    ...new Set(Object.values(variants).flatMap((v) => Object.keys(v))),
  ].filter((lang) => lang !== home && /^[a-z]{2,3}$/.test(lang));
  const read = await Promise.all(
    others.map((lang) => readListenState(token, { ...key, lang })),
  );
  const start = seedIn(key, state, shown, variants);
  const langs: Record<string, ListenSeed> = { [home]: start };
  others.forEach((lang, i) => {
    const s = read[i];
    if (s) langs[lang] = seedIn({ ...key, lang }, s, shown, variants);
  });
  const place =
    Object.values(langs)
      .map((s) => s.state?.resume ?? null)
      .filter((r): r is KbListenPosition => !!r && !!r.chapter)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;
  if (!place || !place.chapter)
    return { start, langs, place: null, resume: null };
  const of = langs[place.lang] ?? start;
  const at = of.book?.chapters.find((c) => c.key === place.chapter);
  if (!at) return { start, langs, place, resume: null };
  const rkey: ListenBookKey = {
    ...key,
    from_chapter: place.chapter,
    lang: place.lang,
  };
  // From chapter 1 it is the language's own Listen, already read.
  const rstate =
    place.chapter === shown.chapters[0]?.key && of.state
      ? of.state
      : await readListenState(token, rkey);
  return {
    start,
    langs,
    place,
    resume: rstate
      ? {
          key: rkey,
          title: at.title,
          lang: place.lang,
          state: rstate,
          href: at.href,
          book: of.book,
          chapter: place.chapter,
        }
      : null,
  };
}
