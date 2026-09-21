"use client";

import { useState, useSyncExternalStore } from "react";

import { STATES } from "@/content";

/** Never fires — the "have we hydrated yet?" store has exactly one transition,
 *  and React performs it itself by swapping the server snapshot for the client
 *  one right after hydration. */
const subscribeNever = () => () => {};
const hydrated = () => true;
const notHydratedYet = () => false;

/**
 * Round 03 §5.1's `.kb-editorial__detail` line — `ref {id} · {timestamp}`,
 * selectable, mono, errors only.
 *
 * Two constraints shape it, both recorded in phase.md `## Decisions`:
 *
 * 1. It renders ONLY when the boundary actually has a `digest` (the caller
 *    decides that; this component is not mounted otherwise). Next omits the
 *    digest in development, and a `ref ·` with nothing to look up is worse than
 *    no line.
 * 2. The timestamp is written AFTER hydration. A server-rendered clock is a
 *    guaranteed hydration mismatch — and on a 500 page, which is exactly where
 *    a second failure is least welcome.
 *
 * `useSyncExternalStore` with a differing server snapshot is how React sanctions
 * "render one thing in the HTML, another in the browser": it re-renders after
 * hydration with no mismatch and, unlike a mounted flag in an effect, needs no
 * `setState` in an effect (which this repo's React Compiler lint forbids).
 */
export function ErrorRef({ digest }: { digest: string }) {
  // The instant the boundary first rendered, frozen so later re-renders do not
  // slide the clock. Computed on the server too, but never rendered there.
  const [at] = useState(() => new Date());
  const isHydrated = useSyncExternalStore(
    subscribeNever,
    hydrated,
    notHydratedYet,
  );

  // UTC, seconds precision, no locale — this is a support reference someone
  // greps a log with, not a date the reader is meant to parse socially.
  const stamp = `${at.toISOString().slice(0, 19).replace("T", " ")}Z`;

  return (
    <>
      {STATES.error.refPrefix} {digest}
      {isHydrated ? ` · ${stamp}` : null}
    </>
  );
}
