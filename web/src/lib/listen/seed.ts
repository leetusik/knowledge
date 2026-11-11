import "server-only";

import { getListenState, type KbListenState } from "@/lib/knowledge/listen";
import type { ReaderView } from "@/lib/reader/types";

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
  /** Listen and Start over: the book from chapter 1. */
  start: ListenSeed;
  /** Continue listening (B1's `resume`, read for its own start chapter); null when there is none. */
  resume: ListenSeed | null;
}

/**
 * P41-sr.W2 — the book landing's seeds, read beside its load (signed in only): the book
 * from its first chapter (Listen, Start over, the rows' audio), and, when the newest
 * place (`resume`) is in another chapter, the book from that chapter, so Continue
 * listening sounds inside the press (R3). Any miss is "no Listen here".
 */
export async function readBookSeed(
  token: string,
  key: { org: string; project: string; book: string },
  shown: ListenBook,
  variants: Record<string, Record<string, string>> = {},
): Promise<BookListenSeed | null> {
  const state = await readListenState(token, key);
  if (!state) return null;
  // The landing's rows show each chapter in the variant its reader last opened; the Listen
  // reads each chapter in the language B1 names for it (the entry's `lang`), so its pages
  // open on that variant: the follow along is on the text that is heard.
  const book: ListenBook = {
    ...shown,
    chapters: shown.chapters.map((c) => {
      const lang = state.entries.find((e) => e.chapter === c.key)?.lang;
      const href = lang ? variants[c.key]?.[lang] : undefined;
      return lang && href && lang !== c.lang ? { ...c, lang, href } : c;
    }),
  };
  const first = book.chapters[0];
  const start: ListenSeed = {
    key,
    title: first?.title ?? book.title,
    lang: first?.lang ?? "en",
    state,
    href: first?.href ?? book.href,
    book,
    chapter: null,
  };
  const r = state.resume;
  if (!r || !r.chapter) return { start, resume: null };
  const at = book.chapters.find((c) => c.key === r.chapter);
  if (!at) return { start, resume: null };
  const rkey: ListenBookKey = {
    ...key,
    from_chapter: r.chapter,
    ...(r.lang ? { lang: r.lang } : {}),
  };
  const rstate =
    at === first && !r.lang ? state : await readListenState(token, rkey);
  return {
    start,
    resume: rstate
      ? {
          key: rkey,
          title: at.title,
          lang: r.lang || at.lang,
          state: rstate,
          href: at.href,
          book,
          chapter: r.chapter,
        }
      : null,
  };
}
