import { useSyncExternalStore } from "react";

import type { Listen, ListenSeed } from "./types";

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
 * Open the player (F8): the dock's chevron calls it. The seam W2 fills with the opened
 * player's sheet (`setOpenPlayer`); until then it opens nothing.
 */
let openPlayerImpl: () => void = () => {};

export function setOpenPlayer(fn: () => void): void {
  openPlayerImpl = fn;
}

/** The presses, for every part of the page that offers one. */
export const listenActions = {
  start: (seed: ListenSeed, from: number) => run((e) => e.start(seed, from)),
  play: () => run((e) => e.play()),
  pause: () => run((e) => e.pause()),
  retry: () => run((e) => e.retry()),
  startOver: () => run((e) => e.startOver()),
  update: () => run((e) => e.update()),
  seek: (seconds: number) => run((e) => e.seek(seconds)),
  openPlayer: () => openPlayerImpl(),
};
