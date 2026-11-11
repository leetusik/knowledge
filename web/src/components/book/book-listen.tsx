"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Dock } from "@/components/listen/dock";
import { ListenControl } from "@/components/listen/listen-control";
import { ListenNote } from "@/components/listen/listen-note";
import { BOOK, LISTEN } from "@/content";
import type { KbListenPosition, KbListenState } from "@/lib/knowledge/listen";
import { ownChapters, unitOfKey } from "@/lib/listen/book";
import { aboutSum, clockPos, lengthWords } from "@/lib/listen/format";
import { noteKey, type NoteKey } from "@/lib/listen/machine";
import { listenActions, useKept, useListen } from "@/lib/listen/store";
import type { Listen, ListenSeed } from "@/lib/listen/types";
import { noteView } from "@/lib/listen/view";

/**
 * P41-sr.W2 — Listen on the book landing (`11-listen` page `book`, F31; the `Book` and
 * `BookRow` boards). The landing is server-rendered (`book-page.tsx`); these are its
 * client parts: the head's `.bk-listen` slot, the rows' audio item, and the dock on the
 * landing's track.
 *
 * Landing → reader (F33): Listen (chapter 1), Continue listening (the saved chapter and
 * position) and Start over (chapter 1 · 0:00) start the Listen inside the press, then open
 * its chapter in the reader; the Listen lives above the routes, so it plays on there. A
 * book not yet made opens the reader on Preparing… (part 1), then Ready; nothing plays
 * before (F9, F31).
 */

/** What the server read for the landing (`readBookSeed`). */
export interface BookListenSeedView {
  /** The book from chapter 1, in the language the landing reads it (the server's default). */
  start: ListenSeed;
  /** P41-sr.F3: the book from chapter 1 in each language it has, by language (`start`'s too). */
  langs: Record<string, ListenSeed>;
  /** The newest place left part-way, in its own language (B1's `resume`); null when none. */
  place: KbListenPosition | null;
  /** Continue listening: the book from the place's chapter, in its language. */
  resume: ListenSeed | null;
}

/** The chapter entries' lengths, once every listenable chapter is made (the F2 sum). */
function madeSum(state: KbListenState | null): number | null {
  const entries = (state?.entries ?? []).filter(
    (e) => e.state !== "unavailable",
  );
  if (entries.length === 0) return null;
  if (!entries.every((e) => e.state === "made" && e.len)) return null;
  return entries.reduce((a, e) => a + (e.len ?? 0), 0);
}

/** A chapter's made length, from the landing's state. */
function lenOf(state: KbListenState | null, chapter: string): number | null {
  const e = state?.entries.find((x) => x.chapter === chapter);
  return e && e.state === "made" && e.len ? e.len : null;
}

function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}

/** The note a live Listen of this book shows on the landing (book `## Build`, in its order). */
function liveNote(l: Listen): NoteKey {
  if (l.state === "ready") return "ready";
  const sounding =
    l.state === "playing" ||
    l.state === "paused" ||
    l.state === "buffering" ||
    l.state === "next-waiting";
  // While chapters are still being made, the landing shows the making (F9, F31).
  if (sounding && l.soFar && l.making) return "making";
  return noteKey(l.state, l.old);
}

/**
 * The head's Listen slot (F6, F10, F31): the Listen control (`5 chapters · about 4 h`),
 * Continue listening (`Chapter 4 · 12:30`) with Start over, or, once a Listen of this book
 * lives or something stands in its way, its note.
 */
export function BookListen({
  seed,
  count,
}: {
  seed: BookListenSeedView;
  /** "5 chapters". */
  count: string;
}) {
  const router = useRouter();
  const listen = useListen();
  const kept = useKept();
  const online = useOnline();
  const [starting, setStarting] = useState(false);
  const start = seed.start;
  const unit = unitOfKey(start.key);
  const L = listen && listen.unit === unit ? listen : null;

  /** Start a Listen inside the press, then open its chapter in the reader. */
  const go = (s: ListenSeed, from: number, href: string) => {
    if (starting) return;
    setStarting(true);
    listenActions.start(s, from);
    router.push(href);
  };

  // The place to pick up from: the one Stop listening kept, else the newest saved one. Each
  // is in its own language, and plays only there (P41-sr.F3).
  const keptHere = kept && kept.unit === unit && kept.ch ? kept : null;
  const r = seed.place;
  const place = keptHere
    ? { ch: keptHere.ch as string, pos: keptHere.pos, lang: keptHere.lang }
    : r && r.chapter
      ? { ch: r.chapter, pos: r.seconds, lang: r.lang }
      : null;
  // The place's own Listen, the book from chapter 1 in its language: its chapters, its
  // pages, and the Start over beside its Continue listening (F3, rule 5). No place: the landing's.
  const home = (place && seed.langs[place.lang]) || start;
  const chapters = home.book?.chapters ?? [];
  const own = ownChapters(home.state?.entries ?? []);
  const lastKey = own[own.length - 1] ?? chapters[chapters.length - 1]?.key;
  const at = place ? chapters.find((c) => c.key === place.ch) : undefined;
  const atLen = at ? lenOf(home.state, at.key) : null;
  const atEnd = !!at && atLen !== null && place!.pos >= atLen - 1;
  const finished = !!at && at.key === lastKey && atEnd;
  const resumeOn = !!at && !atEnd && place!.pos >= 1;
  /** Start over (chapter 1 · 0:00): the kept Listen's language, else the landing's. */
  const startOver = () => go(home, 0, home.href);
  /** Listen: the book from chapter 1, in the landing's language. */
  const listenNew = () => go(start, 0, start.href);

  const resume = () => {
    if (!place || !at) return;
    const s =
      seed.resume &&
      seed.resume.chapter === place.ch &&
      seed.resume.lang === place.lang
        ? seed.resume
        : {
            ...home,
            key: {
              ...home.key,
              from_chapter: place.ch,
              ...(place.lang ? { lang: place.lang } : {}),
            },
            title: at.title,
            lang: place.lang || home.lang,
            // Read by the press itself: the landing has no state for this start chapter.
            state: null,
            href: at.href,
            chapter: place.ch,
          };
    go(s, place.pos, at.href);
  };

  let note: NoteKey | null = null;
  if (L) note = L.state === "loading" ? null : liveNote(L);
  else if (!online) note = "offline-start";
  else if (finished) note = "finished";

  let body;
  if (note && L) {
    const view = noteView(L, note);
    body = (
      <ListenNote
        state={note}
        view={view}
        act={note === "outdated" || note === "fail-limit"}
        updating={L.updating}
        onPlay={listenActions.play}
        onUpdate={listenActions.update}
      />
    );
  } else if (note) {
    // No live Listen: the note's own action (Start over when finished, F10), counting the
    // finished Listen's own chapters (F3).
    const shell = listenOf(home, lastKey ?? null);
    body = (
      <ListenNote
        state={note}
        view={noteView(shell, note)}
        onStartOver={startOver}
      />
    );
  } else if (resumeOn && at && place && !L) {
    body = (
      <ListenControl
        form="resume"
        q={LISTEN.control.resumeBook(at.n, clockPos(place.pos))}
        onListen={resume}
        onStartOver={startOver}
      />
    );
  } else {
    const sum = madeSum(start.state);
    // "4 chapters": this Listen's own chapters, in its language (F3), else the book's.
    const n = ownChapters(start.state?.entries ?? []).length;
    body = (
      <ListenControl
        form="book"
        q={LISTEN.control.book(
          n > 0 ? BOOK.head.chapters(n) : count,
          sum !== null ? aboutSum(sum) : null,
        )}
        busy={starting || L?.state === "loading"}
        onListen={listenNew}
      />
    );
  }
  return (
    <div className="bk-listen" aria-live="polite" lang="en">
      {body}
    </div>
  );
}

/**
 * A stand-in Listen for a note with no live Listen behind it (finished, offline on the
 * landing), on its last chapter, with its own chapters (F3: the finished count is theirs).
 */
function listenOf(seed: ListenSeed, last: string | null): Listen {
  return {
    unit: unitOfKey(seed.key),
    key: seed.key,
    kind: "book",
    title: seed.title,
    titleLang: null,
    lang: seed.lang,
    href: seed.href,
    book: seed.book,
    from: null,
    ch: last,
    chPos: 0,
    chLen: null,
    chSoFar: false,
    making: null,
    entries: (seed.state?.entries ?? []).map((e) => ({
      chapter: e.chapter,
      state: e.state,
      len: e.len ?? null,
      part: null,
      left: null,
    })),
    spans: [],
    state: "finished",
    back: null,
    old: false,
    updating: false,
    soFar: false,
    len: null,
    pos: 0,
    part: null,
    parts: 0,
    partsMade: 0,
    left: null,
    seen: null,
    loaded: 0,
    stoppedAt: null,
    speed: 1,
    follow: true,
    play: null,
    segs: [],
    seg: -1,
  };
}

/** A row's audio item and its playing word (F11, F28, F31; the `BookRow` board). */
export interface RowAudio {
  /** "Audio 38 min", "Audio preparing… · part 2 of 9", "Audio not prepared yet"; "" for none. */
  audio: string;
  /** "Playing" / "Paused" on the chapter a live Listen is on; "" else. */
  now: string;
}

/**
 * The rows' audio, by chapter key: the landing's state, with a live Listen of this book
 * over it (its making moves while the page is open). No audio item before a Listen exists
 * for the book.
 */
export function useRowAudio(
  seed: BookListenSeedView | null,
): Record<string, RowAudio> | null {
  const listen = useListen();
  if (!seed) return null;
  const start = seed.start;
  const unit = unitOfKey(start.key);
  const L = listen && listen.unit === unit ? listen : null;
  const base = start.state;
  if (!L && (!base || base.state === "none")) return null;
  const out: Record<string, RowAudio> = {};
  const B = LISTEN.book;
  // The chapter being made now (B1 `part.chapter`); the ones queued after it are not prepared yet (F11).
  const making = L ? L.making : (base?.part?.chapter ?? null);
  for (const c of start.book?.chapters ?? []) {
    const live = L?.entries.find((e) => e.chapter === c.key);
    const e = live ?? base?.entries.find((x) => x.chapter === c.key) ?? null;
    let audio = "";
    if (e) {
      if (e.state === "made" && e.len) audio = B.audioMade(lengthWords(e.len));
      else if (e.state === "making" && c.key === making) {
        audio = B.audioPreparing(
          e.part ? LISTEN.dock.part(e.part.n, e.part.of) : null,
        );
      } else if (e.state === "making" || e.state === "none") {
        audio = B.audioNone;
      }
    } else if (L) {
      audio = B.audioNone;
    }
    const now =
      L && L.ch === c.key
        ? L.state === "paused"
          ? B.paused
          : L.state === "playing"
            ? B.playing
            : ""
        : "";
    out[c.key] = { audio, now };
  }
  return out;
}

/**
 * The dock on the landing's track (F7, F31): fixed above the window's bottom, on the
 * layout column's two edges below 64rem and the side column's from 64rem (`book.css`).
 */
export function BookDock({ signInHref }: { signInHref: string }) {
  const listen = useListen();
  if (!listen) return null;
  return (
    <div className="lx-slot bk-dock">
      <Dock
        listen={listen}
        onPlay={listenActions.play}
        onPause={listenActions.pause}
        onStartOver={listenActions.startOver}
        onRetry={listenActions.retry}
        onOpen={listenActions.openPlayer}
        onSignIn={() => window.location.assign(signInHref)}
      />
    </div>
  );
}
