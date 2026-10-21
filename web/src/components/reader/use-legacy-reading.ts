"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  canWritePosition,
  END_PERCENT,
  initialReading,
  isUpdated,
  onEndChange,
  onMark,
  onSample,
  writeDelay,
  type Cadence,
  type ReadingState,
} from "@/lib/reader/position";
import { saveReaderPosition, type PositionWrite } from "@/lib/reader/actions";
import type { ReaderView } from "@/lib/reader/types";

/**
 * P30.S25 — the legacy reader's memory (`09-legacy-and-print` *Resume, progress, finishing
 * and bookmarks (S3)*): the same rules as the native reader's `useReading` (the pure
 * decisions in `@/lib/reader/position`), fed by the bridge's `scroll` messages instead of
 * the window's scroll, because the parent cannot read the framed document.
 *
 *  - the position is the bridge's `{anchor, fraction}`; it is written on S3's cadence
 *    (2 s after the reader stops, at most every 15 s), for a member on the newest version
 *    only, and sent by beacon when the page is hidden or left;
 *  - `fraction >= 0.95` on the newest version finishes the chapter for a member, unless it
 *    is held after Mark as unread (the hold lifts when the reader leaves the end);
 *  - Mark as finished / Mark as unread are immediate and undone if the save fails.
 */

export interface LegacySample {
  fraction: number;
  anchor: string | null;
}

const END = END_PERCENT / 100;

export function useLegacyReading(view: ReaderView) {
  const progress = view.progress;
  const write = view.write;
  const saves = view.member && write !== null && progress !== null;

  const [reading, setReading] = useState<ReadingState>(() =>
    initialReading({
      finished: progress?.state === "finished",
      finishedVersion: progress?.finishedVersion ?? null,
      maxFraction: progress?.maxFraction ?? 0,
    }),
  );
  const ref = useRef(reading);
  const commit = useCallback((next: ReadingState) => {
    const prev = ref.current;
    ref.current = next;
    if (
      prev.finished !== next.finished ||
      prev.held !== next.held ||
      prev.finishedVersion !== next.finishedVersion ||
      (next.maxFraction === 0) !== (prev.maxFraction === 0) ||
      Math.round(prev.maxFraction * 100) !== Math.round(next.maxFraction * 100)
    ) {
      setReading(next);
    }
  }, []);

  const cadence = useRef<Cadence>({ pendingSince: null, lastScroll: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** The latest place the bridge reported; null until it has spoken. */
  const last = useRef<LegacySample | null>(null);

  const allowed = useCallback(
    () =>
      canWritePosition({
        member: view.member,
        hasTarget: write !== null,
        version: view.version,
        newest: view.newest,
        held: ref.current.held,
      }),
    [view.member, write, view.version, view.newest],
  );

  const body = useCallback(
    (s: LegacySample, extra: Partial<PositionWrite> = {}): PositionWrite => ({
      org: write!.org,
      project: write!.project,
      doc: write!.doc,
      anchor_id: s.anchor,
      fraction: s.fraction,
      max_fraction: Math.max(ref.current.maxFraction, s.fraction),
      ...extra,
    }),
    [write],
  );

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const flush = useCallback(async () => {
    clear();
    const cad = cadence.current;
    if (cad.pendingSince === null) return;
    cad.pendingSince = null;
    const s = last.current;
    if (!s || !allowed()) return;
    commit(onSample(ref.current, s.fraction));
    await saveReaderPosition(body(s));
  }, [allowed, body, clear, commit]);

  const touch = useCallback(() => {
    if (!allowed()) return;
    const cad = cadence.current;
    const now = Date.now();
    cad.lastScroll = now;
    if (cad.pendingSince === null) cad.pendingSince = now;
    clear();
    const d = writeDelay(cad, now);
    if (d !== null) timer.current = setTimeout(() => void flush(), d);
  }, [allowed, clear, flush]);

  /** One `scroll` message from the bridge. */
  const sample = useCallback(
    (s: LegacySample) => {
      last.current = s;
      if (!view.member) return;
      const r = onEndChange(
        ref.current,
        s.fraction >= END,
        view.version,
        allowed(),
      );
      if (r.state !== ref.current) commit(r.state);
      // After the end check, so a hold lifted by this very message lets it count.
      touch();
      if (r.finish) {
        cadence.current.pendingSince = null;
        clear();
        // "Saved to your progress" must be true: a refused write takes the finish back.
        void saveReaderPosition(body(s, { finished: true })).then((res) => {
          if (!res.ok && ref.current.finished) {
            commit({ ...ref.current, finished: false, finishedVersion: null });
          }
        });
      }
    },
    [view.member, view.version, allowed, commit, touch, clear, body],
  );

  // The beacon: the page hidden, or left by a link inside the app.
  useEffect(() => {
    if (!view.member) return;
    const cad = cadence.current;
    const beacon = () => {
      const s = last.current;
      if (cad.pendingSince === null || !s || !allowed()) return;
      commit(onSample(ref.current, s.fraction));
      cad.pendingSince = null;
      clear();
      try {
        navigator.sendBeacon("/api/reader/position", JSON.stringify(body(s)));
      } catch {
        // a beacon is best effort
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") beacon();
    };
    window.addEventListener("pagehide", beacon);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", beacon);
      document.removeEventListener("visibilitychange", onVisibility);
      beacon();
      clear();
    };
  }, [view.member, allowed, body, clear, commit]);

  const mark = useCallback(
    async (finished: boolean) => {
      if (!saves || !write) return;
      const prev = ref.current;
      cadence.current.pendingSince = null;
      clear();
      commit(onMark(prev, finished, view.version));
      const s = last.current ?? { fraction: 0, anchor: null };
      const result = await saveReaderPosition(
        finished
          ? body(s, { finished: true, version: view.version })
          : {
              org: write.org,
              project: write.project,
              doc: write.doc,
              version: view.version,
              anchor_id: null,
              fraction: 0,
              unread: true,
            },
      );
      if (!result.ok) commit(prev);
    },
    [saves, write, view.version, body, commit, clear],
  );

  const updated = isUpdated(reading, view.newest);
  const state = useMemo(
    () =>
      reading.finished
        ? updated
          ? ("updated" as const)
          : ("finished" as const)
        : reading.held
          ? ("unread" as const)
          : ("started" as const),
    [reading.finished, reading.held, updated],
  );

  return { saves, reading, state, updated, sample, flush, mark };
}
