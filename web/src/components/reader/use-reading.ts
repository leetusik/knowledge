"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import { progressPercent } from "@/lib/reader/chrome";
import {
  canWritePosition,
  endSeen,
  fractionOf,
  initialReading,
  isUpdated,
  onEndChange,
  onMark,
  onSample,
  resumePercent,
  writeDelay,
  type Cadence,
  type ReadingState,
} from "@/lib/reader/position";
import { saveReaderPosition, type PositionWrite } from "@/lib/reader/actions";
import type { ReaderView } from "@/lib/reader/types";

/**
 * P30.S15 — the reader's memory: the position cadence and beacon, the finish and
 * hold rules, the chapter's state as the end and the lists show it, and the resume
 * (`01-reader` *Behaviour → Progress, section and finished* and *Opening and moving*;
 * the decisions themselves are pure, in `@/lib/reader/position`).
 *
 * Nothing is sent for the signed-out, for a member with no place to save to, or on an
 * older version (`canWritePosition`). The position is a sample of the window scroll:
 * the topmost id'd block at the same line as the section being read, and the
 * fraction of the scrollable height.
 */

/** The resume pill: the section to name, or (no section to name) the place as a percent. */
export interface ResumePill {
  section: string | null;
  percent: number;
}

interface Sample {
  fraction: number;
  percent: number;
  anchor: string | null;
}

function sampleDom(root: HTMLElement | null, bar: HTMLElement | null): Sample {
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  const top = window.scrollY;
  const line = (bar?.getBoundingClientRect().bottom ?? 59) + 16 + 8;
  let anchor: string | null = null;
  root
    ?.querySelectorAll<HTMLElement>(".rd-article [data-block]")
    .forEach((el) => {
      if (el.getBoundingClientRect().top <= line) {
        anchor = el.getAttribute("data-block");
      }
    });
  return {
    fraction: fractionOf(top, max),
    percent: progressPercent(top, max),
    anchor,
  };
}

/** The heading a block sits under (or is): the section a reader would name. */
function sectionTitleOf(root: HTMLElement, el: Element): string | null {
  let found: string | null = null;
  root
    .querySelectorAll<HTMLElement>(".rd-article :is(h2, h3, h4)[id]")
    .forEach((h) => {
      if (
        h === el ||
        h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        found = h.textContent?.trim() || found;
      }
    });
  return found;
}

export function useReading({
  view,
  ready,
  rootRef,
  topRef,
  quiet,
}: {
  view: ReaderView;
  ready: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  topRef: RefObject<HTMLElement | null>;
  /** Tell the chrome that a scroll is the reader's own, not a gesture. */
  quiet: () => void;
}) {
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
  const [pill, setPill] = useState<ResumePill | null>(null);

  /** Only a change the screen shows re-renders; `maxFraction` grows in the ref alone. */
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

  // The cadence state lives across renders; the effect below owns its timers.
  const cadence = useRef<Cadence>({ pendingSince: null, lastScroll: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flushRef = useRef<() => Promise<void>>(async () => {});

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
    (s: Sample, extra: Partial<PositionWrite> = {}): PositionWrite => ({
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

  // ---- the resume: open at the saved section, with the pill -------------------------
  useEffect(() => {
    if (!ready || !saves || !progress) return;
    const r = progress.resume;
    if (!r || view.version !== view.newest) return;
    const root = rootRef.current;
    if (!root) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    // A link with a place in it (a contents entry, a language switch) owns the landing,
    // unless its section does not exist here: then the mapped resume is the nearest one.
    if (hash && document.getElementById(hash)) return;
    // A mark chosen in a list (`?note=`) owns the landing (P30.S21).
    if (new URLSearchParams(window.location.search).has("note")) return;
    // The pill is for a reader coming back to a chapter they have started.
    const showPill = !hash && progress.state === "started";
    if (!hash && progress.state !== "started") return;

    const block = r.block
      ? root.querySelector(`.rd-article [data-block="${CSS.escape(r.block)}"]`)
      : null;
    const goTo = () => {
      quiet();
      if (block) {
        const bottom = topRef.current?.getBoundingClientRect().bottom ?? 59;
        const y =
          block.getBoundingClientRect().top + window.scrollY - (bottom + 16);
        window.scrollTo(0, Math.max(0, y));
      } else if (r.fraction > 0) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, Math.max(0, r.fraction * max));
      }
    };
    if (!block && !(r.fraction > 0)) return;
    goTo();
    const landed = window.scrollY;
    // A late font shifts the layout: land again once, if the reader has not moved yet.
    document.fonts?.ready
      .then(() => {
        if (Math.abs(window.scrollY - landed) <= 2) goTo();
      })
      .catch(() => {});
    if (showPill) {
      setPill({
        section: block ? sectionTitleOf(root, block) : null,
        percent: resumePercent(r.fraction),
      });
    }
  }, [
    ready,
    saves,
    progress,
    view.version,
    view.newest,
    rootRef,
    topRef,
    quiet,
  ]);

  // ---- the cadence, the end of the chapter, and the beacon ---------------------------
  useEffect(() => {
    if (!ready || !view.member) return;
    const cad = cadence.current;
    cad.pendingSince = null;

    const clear = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = undefined;
    };
    const flush = async () => {
      clear();
      if (cad.pendingSince === null) return;
      cad.pendingSince = null;
      if (!allowed() || !rootRef.current?.isConnected) return;
      const s = sampleDom(rootRef.current, topRef.current);
      commit(onSample(ref.current, s.fraction));
      await saveReaderPosition(body(s));
    };
    flushRef.current = flush;
    const arm = () => {
      clear();
      const d = writeDelay(cad, Date.now());
      if (d !== null) timer.current = setTimeout(() => void flush(), d);
    };
    const touch = () => {
      if (!allowed()) return;
      const now = Date.now();
      cad.lastScroll = now;
      if (cad.pendingSince === null) cad.pendingSince = now;
      arm();
    };

    // The last sample of the reader's place, kept for the moment the page is torn down
    // by a link inside the app (the DOM is already the next page's then, and sampling
    // it would write the wrong place).
    let last: Sample | null = null;
    let lastAt = 0;

    // The end sentinel: finish when it comes into view, lift a hold when it leaves.
    let raf = 0;
    const measure = () => {
      raf = 0;
      if (!rootRef.current?.isConnected) return;
      if (Date.now() - lastAt > 250) {
        last = sampleDom(rootRef.current, topRef.current);
        lastAt = Date.now();
      }
      const end = rootRef.current?.querySelector("[data-end]");
      const doc = document.documentElement;
      const percent = progressPercent(
        window.scrollY,
        doc.scrollHeight - window.innerHeight,
      );
      if (end) {
        const seen = endSeen(
          end.getBoundingClientRect().top,
          window.innerHeight,
          percent,
        );
        const wasHeld = ref.current.held;
        const r = onEndChange(ref.current, seen, view.version, allowed());
        if (r.state !== ref.current) commit(r.state);
        // The hold lifted on this very scroll: the reader's place counts from here.
        if (wasHeld && !r.state.held) touch();
        if (r.finish) {
          const s = sampleDom(rootRef.current, topRef.current);
          cad.pendingSince = null;
          clear();
          // "Saved to your progress" must be true: if the write is refused, the end
          // goes back to "Not finished yet" (and tries again the next time it comes
          // into view).
          void saveReaderPosition(body(s, { finished: true })).then((res) => {
            if (!res.ok && ref.current.finished) {
              commit({
                ...ref.current,
                finished: false,
                finishedVersion: null,
              });
            }
          });
        }
      }
    };
    const onScroll = () => {
      // A scroll while the page is being swapped for the next one belongs to no place.
      if (!rootRef.current?.isConnected) return;
      touch();
      if (!raf) raf = requestAnimationFrame(measure);
    };

    const beacon = (torn = false) => {
      if (cad.pendingSince === null || !allowed()) return;
      const live = rootRef.current?.isConnected;
      const s =
        torn || !live ? last : sampleDom(rootRef.current, topRef.current);
      if (!s) return;
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

    window.addEventListener("scroll", onScroll, { passive: true });
    const onPageHide = () => beacon();
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    // Opening a chapter is a first position (and "started"); the end may already be in view.
    touch();
    measure();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      if (raf) cancelAnimationFrame(raf);
      clear();
      // Leaving the page by a link inside the app: send what is pending.
      beacon(true);
      flushRef.current = async () => {};
    };
  }, [
    ready,
    view.member,
    view.version,
    allowed,
    body,
    commit,
    rootRef,
    topRef,
  ]);

  /** Write what is pending now (the language switch calls this before it navigates). */
  const flush = useCallback(() => flushRef.current(), []);

  /** Mark as finished / Mark as unread: immediate, optimistic, undone if the save fails. */
  const mark = useCallback(
    async (finished: boolean) => {
      if (!saves || !write) return;
      const prev = ref.current;
      const cad = cadence.current;
      cad.pendingSince = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = undefined;
      commit(onMark(prev, finished, view.version));
      const s = sampleDom(rootRef.current, topRef.current);
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
    [saves, write, view.version, body, commit, rootRef, topRef],
  );

  const dismissPill = useCallback(() => setPill(null), []);

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

  return {
    saves,
    reading,
    state,
    updated,
    mark,
    flush,
    pill,
    dismissPill,
  };
}
