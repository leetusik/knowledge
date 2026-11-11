import { useSyncExternalStore } from "react";

import { chapterN } from "./book";
import type { Listen, ListenKept, ListenSeed } from "./types";

// P41-sr.W1 — the one Listen of the page (`11-listen` F19, F33): a module store read with
// `useSyncExternalStore`, so it outlives every client-side move between reader pages (the
// root layout never remounts) and needs no state library. The reader's parts (the head,
// the bottom slot, the dock, follow along) read it; the persistent host (`ListenHost`, in
// the root layout) owns the one `<audio>` element and registers the engine that carries
// out the presses. Nothing here touches the media: the engine does.

let current: Listen | null = null;
const listeners = new Set<() => void>();

export function getListen(): Listen | null {
  return current;
}

export function setListen(next: Listen | null): void {
  if (next === current) return;
  current = next;
  for (const fn of listeners) fn();
}

/** A partial change to the docked Listen (none docked: nothing happens). */
export function patchListen(patch: Partial<Listen>): void {
  if (!current) return;
  let changed = false;
  for (const k of Object.keys(patch) as (keyof Listen)[]) {
    if (current[k] !== patch[k]) {
      changed = true;
      break;
    }
  }
  if (changed) setListen({ ...current, ...patch });
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The docked Listen, or null. The server never has one (a full page load stops audio, R3). */
export function useListen(): Listen | null {
  return useSyncExternalStore(subscribe, getListen, () => null);
}

/** What the presses ask of the player; the host's engine implements it. */
export interface ListenEngine {
  /** Listen / Continue listening / Start over in the head or the pill: a new Listen at `from` seconds. */
  start(seed: ListenSeed, from: number): void;
  play(): void;
  pause(): void;
  /** Try again: replay after a dropped connection, or remake after a failure on our side. */
  retry(): void;
  startOver(): void;
  /** Update audio (F10 `outdated`). */
  update(): void;
  seek(seconds: number): void;
  /** P41-sr.W2: a chapter seek (the player's Previous / Next chapter and Chapters, F30). */
  seekChapter(chapter: string): void;
  /** P41-sr.W2: the listener's speed and follow along (F3), saved and kept for the next Listen. */
  setSpeed(speed: number): void;
  setFollow(follow: boolean): void;
  /** P41-sr.W2: Stop listening (F17, F33): save the place as kept, end the Listen. */
  stop(): void;
}

let engine: ListenEngine | null = null;
let queued: ((e: ListenEngine) => void) | null = null;

/** The host registers its engine on mount (and null on unmount). A press made before it ran waits for it. */
export function setEngine(next: ListenEngine | null): void {
  engine = next;
  if (next && queued) {
    const run = queued;
    queued = null;
    run(next);
  }
}

function run(fn: (e: ListenEngine) => void): void {
  if (engine) fn(engine);
  else queued = fn;
}

/**
 * Open the player (F8): the dock's chevron calls it. The page that shows the dock (the
 * reader, the book landing) registers its opened player's sheet here (`setOpenPlayer`)
 * and unregisters it when it leaves (P41-sr.W2).
 */
let openPlayerImpl: () => void = () => {};

/** Register the page's opened player; the returned function unregisters it (if still this one). */
export function setOpenPlayer(fn: () => void): () => void {
  openPlayerImpl = fn;
  return () => {
    if (openPlayerImpl === fn) openPlayerImpl = () => {};
  };
}

// ---- P41-sr.W2: the kept place, the listener's preferences, Go to the text -------------

/** The place Stop listening keeps (F17), until a Listen starts. */
let kept: ListenKept | null = null;
const keptListeners = new Set<() => void>();

export function getKept(): ListenKept | null {
  return kept;
}

export function setKept(next: ListenKept | null): void {
  if (next === kept) return;
  kept = next;
  for (const fn of keptListeners) fn();
}

export function useKept(): ListenKept | null {
  return useSyncExternalStore(
    (fn) => {
      keptListeners.add(fn);
      return () => keptListeners.delete(fn);
    },
    getKept,
    () => null,
  );
}

/** The place a Listen leaves when it stops: its chapter and the position in it. */
export function keptOf(l: Listen): ListenKept {
  return {
    unit: l.unit,
    ch: l.ch,
    n: chapterN(l, l.ch),
    pos: l.chPos,
    len: l.chLen,
    lang: l.lang,
  };
}

/**
 * The listener's speed and follow along as last set on this page (F3): a new Listen takes
 * them wherever it starts, before the server's preference read at load catches up.
 */
let prefs: { speed: number; follow: boolean } | null = null;

export function getPrefs(): { speed: number; follow: boolean } | null {
  return prefs;
}

export function setPrefs(next: { speed: number; follow: boolean }): void {
  prefs = next;
}

/** Go to the text (F33): the reader scrolls once to the block being read, on the page of `unit` (and chapter). */
let scrollAsk: { unit: string; ch: string | null } | null = null;

export function askScroll(unit: string, ch: string | null): void {
  scrollAsk = { unit, ch };
}

/** The page of `unit` (and chapter) takes the request, once. */
export function takeScroll(unit: string, ch: string | null): boolean {
  if (!scrollAsk || scrollAsk.unit !== unit || scrollAsk.ch !== ch)
    return false;
  scrollAsk = null;
  return true;
}

/** The presses, for every part of the page that offers one. */
export const listenActions = {
  start: (seed: ListenSeed, from: number) => {
    // A Listen that starts clears the kept place (F17).
    setKept(null);
    run((e) => e.start(seed, from));
  },
  play: () => run((e) => e.play()),
  pause: () => run((e) => e.pause()),
  retry: () => run((e) => e.retry()),
  startOver: () => run((e) => e.startOver()),
  update: () => run((e) => e.update()),
  seek: (seconds: number) => run((e) => e.seek(seconds)),
  seekChapter: (chapter: string) => run((e) => e.seekChapter(chapter)),
  setSpeed: (speed: number) => run((e) => e.setSpeed(speed)),
  setFollow: (follow: boolean) => run((e) => e.setFollow(follow)),
  /** Stop listening (F17, F33): no confirm; the place is kept. */
  stop: () => {
    const l = getListen();
    if (!l) return;
    const place = keptOf(l);
    run((e) => e.stop());
    setKept(place);
  },
  openPlayer: () => openPlayerImpl(),
};
