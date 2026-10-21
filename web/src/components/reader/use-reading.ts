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
  LANDING_MAX_MS,
  LANDING_SETTLE_MS,
  landingFor,
  landingSettled,
  onLook,
  onMark,
  onSample,
  resumePercent,
  touchCadence,
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
 *
 * P30.F6: the page lands once, when it opens (`landingFor`: a `#section`, then `?note=`,
 * then the resume, then the top), and nothing is written (no position, no beacon, no
 * finish) until that landing has settled (`landingSettled`).
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

/**
 * Was this page opened by a navigation inside the app? The first reader page at the
 * address the browser itself loaded is the document's own load (`owner` claims it, so a
 * page's effects run twice in development without changing the answer); every later
 * page, or one at another address, came by a link, the router or the history.
 */
let firstPage: object | null | undefined;
function openedByNavigation(owner: object): boolean {
  if (firstPage === undefined) {
    let loaded: URL | null = null;
    try {
      const nav = performance.getEntriesByType?.("navigation")[0];
      loaded = nav ? new URL(nav.name) : null;
    } catch {
      loaded = null;
    }
    const here = window.location;
    firstPage =
      loaded &&
      loaded.pathname === here.pathname &&
      loaded.search === here.search
        ? owner
        : null;
  }
  return firstPage !== owner;
}

/** The element the address's `#id` names on this page, or null. */
function hashTarget(root: HTMLElement): HTMLElement | null {
  const raw = window.location.hash.slice(1);
  if (!raw) return null;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // keep the raw text
  }
  const el = document.getElementById(id);
  return el && root.contains(el) ? el : null;
}

const INPUT = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

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

  // ---- the landing (P30.F6): decided once, when the page opens -----------------------
  // A `#section` in the address (F4's `useHashLanding` lands it), then a mark asked for
  // by `?note=` (S21's annotation layer lands it), then the member's saved place (here,
  // with the pill), and otherwise the top. A page opened by a navigation inside the app
  // starts from the top before its owner lands: Next does not reset the scroll between
  // chapters (its handler meets the hoisted reader stylesheet and gives up). The
  // document's own first load keeps what the browser does (the top, or a reload's place).
  const owner = useRef({});
  const decided = useRef(false);
  /** The landing has settled: from here on, places are written. */
  const settled = useRef(false);
  const onSettled = useRef<() => void>(() => {});

  useEffect(() => {
    if (!ready || decided.current) return;
    const root = rootRef.current;
    if (!root) return;
    decided.current = true;

    const hashEl = hashTarget(root);
    const hash = window.location.hash.length > 1;
    const note = new URLSearchParams(window.location.search).has("note");
    // S15's resume: a member on the newest version, coming back to a chapter they have
    // started; or a link whose section does not exist here (the mapped resume is then the
    // nearest place, without the pill).
    const r = saves && progress ? progress.resume : null;
    const block =
      r?.block && view.version === view.newest
        ? root.querySelector(
            `.rd-article [data-block="${CSS.escape(r.block)}"]`,
          )
        : null;
    const resume =
      !!r &&
      view.version === view.newest &&
      (hash || progress?.state === "started") &&
      (!!block || r.fraction > 0);
    const navigated = openedByNavigation(owner.current);
    const landing = landingFor({
      hash: !!hashEl,
      note,
      resume,
      navigated,
    });

    if (navigated) {
      // A clean start for every landing; the reader's own scroll, not a gesture (F5).
      quiet();
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    if (landing !== "resume" || !r) return;

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
    goTo();
    const landed = window.scrollY;
    // A late font shifts the layout: land again once, if the reader has not moved yet.
    document.fonts?.ready
      .then(() => {
        if (Math.abs(window.scrollY - landed) <= 2) goTo();
      })
      .catch(() => {});
    // The pill is for a reader coming back to a chapter they have started.
    if (!hash && progress?.state === "started") {
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

  // ---- the landing settles: the reader's first input, or the fonts and the retries ---
  useEffect(() => {
    if (!ready || settled.current) return;
    const start = Date.now();
    let fonts = !document.fonts;
    let input = false;
    let done = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stop = () => {
      done = true;
      timers.forEach(clearTimeout);
      INPUT.forEach((t) => window.removeEventListener(t, onInput, true));
    };
    const check = () => {
      if (done) return;
      if (
        !landingSettled({
          elapsed: Date.now() - start,
          fontsReady: fonts,
          input,
        })
      )
        return;
      stop();
      settled.current = true;
      onSettled.current();
    };
    function onInput() {
      input = true;
      check();
    }
    INPUT.forEach((t) =>
      window.addEventListener(t, onInput, { passive: true, capture: true }),
    );
    timers.push(
      setTimeout(check, LANDING_SETTLE_MS),
      setTimeout(check, LANDING_MAX_MS),
    );
    document.fonts?.ready
      .catch(() => {})
      .then(() => {
        fonts = true;
        check();
      });
    return stop;
  }, [ready]);

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
      const next = touchCadence(cad, {
        settled: settled.current,
        allowed: allowed(),
        now: Date.now(),
      });
      if (next === cad) return;
      cad.pendingSince = next.pendingSince;
      cad.lastScroll = next.lastScroll;
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
      // Before the landing has settled the place is not the reader's (P30.F6).
      if (!settled.current || !rootRef.current?.isConnected) return;
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
        const r = onLook(ref.current, {
          settled: settled.current,
          seen,
          version: view.version,
          allowed: allowed(),
        });
        if (r.state !== ref.current) commit(r.state);
        // The hold lifted on this very scroll: the reader's place counts from here.
        if (r.lifted) touch();
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
      // A scroll while the page is being swapped for the next one belongs to no place,
      // and nor does one before the landing has settled (the previous chapter's place,
      // or the landing itself).
      if (!settled.current || !rootRef.current?.isConnected) return;
      touch();
      if (!raf) raf = requestAnimationFrame(measure);
    };

    const beacon = (torn = false) => {
      if (!settled.current || cad.pendingSince === null || !allowed()) return;
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
    // Opening a chapter is a first position (and "started"); the end may already be in
    // view. Both are judged where the page landed, once the landing has settled.
    const open = () => {
      touch();
      measure();
    };
    if (settled.current) open();
    else onSettled.current = open;
    return () => {
      onSettled.current = () => {};
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
