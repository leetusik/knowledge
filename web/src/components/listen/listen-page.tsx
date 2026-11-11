"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { LISTEN } from "@/content";
import { unitOfKey } from "@/lib/listen/book";
import { mapSegments, readablesOf, type ReadableEl } from "@/lib/listen/follow";
import { aboutSum, clockPos, lengthWords } from "@/lib/listen/format";
import { noteKey, type ListenKey, type NoteKey } from "@/lib/listen/machine";
import {
  listenActions,
  takeScroll,
  useKept,
  useListen,
} from "@/lib/listen/store";
import type { Listen, ListenKept, ListenSeed } from "@/lib/listen/types";
import { noteView } from "@/lib/listen/view";

import { Dock } from "./dock";
import { ListenControl } from "./listen-control";
import { ListenNote } from "./listen-note";

/**
 * P41-sr.W1 — Listen on a reader page (`11-listen` page `reader`): the head's slot under
 * the meta line, the bottom slot (the pill or the dock) and follow along. The page hands
 * its seed (key, words, the state read at load) down through `ListenPageContext`; the
 * docked Listen itself is the store's, so it outlives the page.
 */
export interface ListenPageValue {
  seed: ListenSeed;
  /** `org/project/doc` or `org/project/books/book`: the head compares it with the docked Listen's. */
  unit: string;
  /** Registers the head's slot with the frame, which measures it: the pill shows once it is under the top bar. */
  setHead: (el: HTMLDivElement | null) => void;
}

export const ListenPageContext = createContext<ListenPageValue | null>(null);

export function unitOfSeed(seed: ListenSeed): string {
  return unitOfKey(seed.key);
}

/** This chapter's made length, from the state read for it (its first entry). */
function chapterLen(seed: ListenSeed): number | null {
  const e = seed.state?.entries.find((x) => x.chapter === seed.chapter);
  return e && e.state === "made" && e.len ? e.len : null;
}

/**
 * Left part-way (or kept by Stop listening, F17): where Continue listening goes on from.
 * A document: its own position. A chapter: the book's newest place when it is in this
 * chapter (B1's `resume`), or the place Stop listening kept here (W2).
 */
function resumeOf(
  seed: ListenSeed,
  kept: ListenKept | null,
): { pos: number; len: number | null } | null {
  if (kept && kept.unit === unitOfSeed(seed) && kept.ch === seed.chapter) {
    return { pos: kept.pos, len: kept.len ?? chapterLen(seed) };
  }
  const s = seed.state;
  if (!s) return null;
  if (seed.book) {
    const r = s.resume;
    const len = chapterLen(seed);
    if (!r || r.chapter !== seed.chapter || len === null) return null;
    if (r.seconds < 1 || r.seconds >= len - 1) return null;
    return { pos: r.seconds, len };
  }
  const p = s.position;
  if (!p || s.len === null || s.len <= 0) return null;
  if (p.seconds < 1 || p.seconds >= s.len - 1) return null;
  return { pos: p.seconds, len: s.len };
}

/**
 * A chapter's scope (F6, OQ1): "Chapters 2–5", with the sum once every chapter in it is
 * made; the last chapter "Chapter 5 · 31 min".
 */
function chapterQ(seed: ListenSeed): string {
  const book = seed.book;
  const n = book?.chapters.find((c) => c.key === seed.chapter)?.n ?? 1;
  const total = book?.chapters.length ?? n;
  const entries = (seed.state?.entries ?? []).filter(
    (e) => e.state !== "unavailable",
  );
  const allMade =
    entries.length > 0 && entries.every((e) => e.state === "made" && e.len);
  const sum = allMade ? entries.reduce((a, e) => a + (e.len ?? 0), 0) : 0;
  // The scope ends at the last chapter the Listen can read (a language some chapters lack ends earlier).
  const lastKey = entries[entries.length - 1]?.chapter;
  const to = book?.chapters.find((c) => c.key === lastKey)?.n ?? total;
  if (n >= to) {
    return LISTEN.control.lastChapter(n, allMade ? lengthWords(sum) : null);
  }
  return LISTEN.control.chapters(n, to, allMade ? aboutSum(sum) : null);
}

/** The head's (and the pill's) Listen for a page with no Listen of its own docked (F6, F27). */
function controlOf(
  seed: ListenSeed,
  kept: ListenKept | null,
): {
  form: "doc" | "chapter" | "resume";
  q: string;
  pillQ: string;
  from: number;
} {
  const r = resumeOf(seed, kept);
  if (r) {
    return {
      form: "resume",
      q:
        r.len !== null
          ? LISTEN.control.resumeQ(clockPos(r.pos), clockPos(r.len))
          : clockPos(r.pos),
      pillQ: clockPos(r.pos),
      from: r.pos,
    };
  }
  if (seed.book) {
    const q = chapterQ(seed);
    return { form: "chapter", q, pillQ: q, from: 0 };
  }
  // A document's length only once made (F2: a unit not yet made shows no length).
  const made =
    seed.state?.state === "made" && seed.state.len
      ? lengthWords(seed.state.len)
      : "";
  return { form: "doc", q: made, pillQ: made, from: 0 };
}

/**
 * The head's slot (`.rx-listen`), after the meta line. No Listen of this unit: the Listen
 * control. This unit's Listen loading: the control, busy. Any other state: the note, with
 * the dock's data and without its action (the dock carries it), Update audio excepted
 * (F25). From the press until Stop listening the slot holds the unit's tallest note
 * (hidden copies in one grid cell), so no change the reader did not ask for moves the
 * text under it (F27, reader-G4).
 */
export function ListenHead() {
  const page = useContext(ListenPageContext);
  const listen = useListen();
  const kept = useKept();
  if (!page) return null;
  const { seed, setHead } = page;
  const mine = !!listen && listen.unit === page.unit;
  const ctl = controlOf(seed, kept);
  const press = (from: number) => listenActions.start(seed, from);
  if (!mine || !listen) {
    return (
      <div className="rx-listen" lang="en" ref={setHead}>
        <div className="rx-listen__live">
          <ListenControl
            form={ctl.form}
            q={ctl.q}
            onListen={() => press(ctl.from)}
            onStartOver={() => press(0)}
          />
        </div>
      </div>
    );
  }
  const key = noteKey(listen.state, listen.old);
  // The held slot's third copy: a book's next chapter preparing, a document's offline stop (reader-G4).
  const third: NoteKey =
    listen.kind === "book" ? "next-waiting" : "offline-stopped";
  return (
    <div className="rx-listen rx-listen--held" lang="en" ref={setHead}>
      <div className="rx-listen__live">
        {listen.state === "loading" ? (
          <ListenControl
            form={ctl.form === "resume" ? "doc" : ctl.form}
            q={ctl.form === "resume" ? "" : ctl.q}
            busy
            onListen={() => {}}
          />
        ) : (
          <ListenNote
            state={key}
            view={noteView(listen, key)}
            act={key === "outdated" || key === "fail-limit"}
            updating={listen.updating}
            onPlay={listenActions.play}
            onRetry={listenActions.retry}
            onStartOver={listenActions.startOver}
            onUpdate={listenActions.update}
          />
        )}
      </div>
      <div className="rx-listen__hold" aria-hidden="true" inert>
        <ListenNote
          state="fail-voice"
          view={noteView(listen, "fail-voice")}
          act={false}
        />
        <ListenNote
          state="fail-limit"
          view={noteView(listen, "fail-limit", {
            ready: listen.len ? lengthWords(listen.len) : lengthWords(14 * 60),
          })}
        />
        <ListenNote state={third} view={noteView(listen, third)} act={false} />
      </div>
    </div>
  );
}

/** The slot's classes; a chapter's slot sits above the chapter bar. */
function slotClass(base: string, chapter: boolean): string {
  return chapter ? `${base} lx-slot--chapter` : base;
}

/**
 * The bottom slot (F6, F7): a Listen docked → the dock, on the column's track (above the
 * chapter bar on a chapter); else, with the chrome up and the head's Listen under the top
 * bar, the pill (the frame decides `pill`).
 */
export function ListenSlot({
  chapter,
  pill,
  signInHref,
}: {
  chapter: boolean;
  pill: boolean;
  signInHref: string;
}) {
  const page = useContext(ListenPageContext);
  const listen = useListen();
  const kept = useKept();
  if (listen) {
    return (
      <div className={slotClass("lx-slot rd-flow", chapter)}>
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
  if (!page || !pill) return null;
  const ctl = controlOf(page.seed, kept);
  return (
    <div className={slotClass("lx-slot lx-slot--pill", chapter)}>
      <ListenControl
        slot
        form={ctl.form}
        q={ctl.pillQ}
        onListen={() => listenActions.start(page.seed, ctl.from)}
      />
    </div>
  );
}

/** The states in which the follow-along mark shows (F12: playing, paused, buffering, offline playing). */
const FOLLOWS: readonly ListenKey[] = [
  "playing",
  "paused",
  "buffering",
  "offline-play",
];

/** This page's Listen: the unit's, and (a book) heard on this page's chapter. */
function onThisPage(
  listen: Listen | null,
  unit: string | null,
  chapter: string | null,
): listen is Listen {
  return (
    !!listen &&
    !!unit &&
    listen.unit === unit &&
    (listen.kind !== "book" || listen.ch === chapter)
  );
}

/**
 * Follow along (F12): a 3 px accent rule in the column's start margin beside the block the
 * voice reads (`.lx-follow`): the title while the opening is read, then the block the
 * playing segment carries (`@/lib/listen/follow` maps the id-less ones). It moves nothing
 * and never scrolls the page. On a book it runs only on the page of the chapter being
 * heard (P41-sr.W2); another chapter's page marks nothing.
 *
 * Go to the text (F33) is the one scroll: the player asks for it (`askScroll`), and the
 * page of the Listen's chapter takes it once, to the block being read, or to the head at
 * the start.
 */
export function useFollowAlong(
  rootRef: RefObject<HTMLElement | null>,
  unit: string | null,
  chapter: string | null = null,
): void {
  const listen = useListen();
  const here = onThisPage(listen, unit, chapter);
  const on =
    here && listen.follow && listen.seg >= 0 && FOLLOWS.includes(listen.state);
  const segs = here ? listen.segs : null;
  const seg = here ? listen.seg : -1;
  const cache = useRef<{
    segs: unknown;
    items: ReadableEl[];
    map: number[];
  } | null>(null);
  // Go to the text on this very page: the player asks, and the page takes it now.
  const [asks, setAsks] = useState(0);
  useEffect(() => {
    const onAsk = () => setAsks((n) => n + 1);
    window.addEventListener("listen:text", onAsk);
    return () => window.removeEventListener("listen:text", onAsk);
  }, []);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !unit || !here) return;
    const asked = takeScroll(unit, chapter);
    let el: HTMLElement | null = null;
    if (segs && segs.length > 0 && seg >= 0) {
      let c = cache.current;
      if (!c || c.segs !== segs) {
        const items = readablesOf(root);
        c = {
          segs,
          items,
          map: mapSegments(
            segs.map((x) => x.block),
            items,
          ),
        };
        cache.current = c;
      }
      el = c.items[c.map[seg] ?? -1]?.el ?? null;
    }
    if (asked) {
      // The reader's own scroll, not a gesture: the chrome stays as it is.
      window.dispatchEvent(new Event("reader:quiet"));
      if (el && seg > 0) el.scrollIntoView({ block: "center" });
      else window.scrollTo(0, 0);
    }
    if (!on || !el) return;
    el.classList.add("lx-follow");
    return () => el?.classList.remove("lx-follow");
  }, [rootRef, unit, chapter, here, on, segs, seg, asks]);
}
