"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { READER } from "@/content";
import { REVIEW } from "@/content/review";
import {
  readerCookieString,
  schemeFor,
  type ReaderSettings,
  type TextSize,
  type ThemeChoice,
} from "@/lib/reader-cookie";
import { LIBRARY_HREF } from "@/lib/reader-href";
import {
  fresh,
  reduce,
  responseOf,
  type ItemState,
  type QuizAction,
} from "@/lib/reader/quiz";
import {
  loadReviewContinue,
  loadReviewQueue,
  rateReviewCard,
  saveReviewSettings,
  setReviewCardStatus,
  type ContinueView,
} from "@/lib/review/actions";
import {
  adjustCounts,
  booksNote,
  browserZone,
  endKind,
  formatInterval,
  isNewHighlight,
  landRating,
  landSuspend,
  progressPct,
  reviewIdFor,
  settingsErrors,
  type SettingsDraft,
} from "@/lib/review/model";
import { freshFor, specFor } from "@/lib/review/spec";
import type {
  QueueMeta,
  Rating,
  ReviewCard,
  ReviewQueue,
} from "@/lib/review/types";

import { DisplayPanel } from "@/components/reader/display-panel";

import { ReviewCardView } from "./card";
import { ReviewEnd, ReviewFailed } from "./end";
import { QueueHead, type Saved } from "./queue-head";
import { ReviewSettingsForm, type SettingsPhase } from "./settings";
import { CardSkeleton } from "./skeleton";

import "@/app/reader-fonts.css";
import "@/app/reader.css";
import "@/app/review.css";

/**
 * P30.S24 — the review page (`08-review` round 01): a focused frame in the reader's family
 * (the progress line, the 3.5rem top bar, one centred 36rem column; no app shell), the one
 * client island of the session.
 *
 * It holds the local queue and rates against the server idempotently:
 *  - the page makes a `review_id` per rating of a card, and **Try again sends the same one**, so
 *    a rating that did reach the server is never counted twice (`lib/review/model.ts`
 *    `reviewIdFor`); a reply lands only on the rating that sent it;
 *  - the counts are the server's, replaced by every reply; nothing is counted here (suspend
 *    moves them by one, optimistically, until its reply);
 *  - a card due again today goes to the end of the local queue with the reply's previews; a
 *    daily limit reached ends the session; when the local queue runs out and cards are still
 *    due the page asks again.
 *
 * The device settings (theme, text size) are the reader's own Display sheet and `kb_reader`
 * cookie; Settings is the review's `PATCH /app/reader/profile`.
 */
type Panel = "settings" | "display" | null;

interface Toast {
  id: number;
  kind: "undo" | "retry";
  card: ReviewCard;
  text: string;
}

interface Sent {
  cardId: string;
  rating: Rating;
  reviewId: string;
}

interface AppState {
  status: "ready" | "loading" | "failed";
  ref: string | null;
  meta: QueueMeta;
  queue: ReviewCard[];
  states: Record<string, ItemState>;
  pending: (Sent & { seq: number }) | null;
  failed: Sent | null;
  saved: Saved | null;
  toast: Toast | null;
  bybook: boolean;
  panel: Panel;
  draft: SettingsDraft | null;
  phase: SettingsPhase;
  attempt: number;
  settings: ReaderSettings;
  next: ContinueView | null;
}

export type InitialQueue =
  { ok: true; data: ReviewQueue } | { ok: false; ref: string };

const EMPTY_META: QueueMeta = {
  now: "1970-01-01T00:00:00.000Z",
  day: {
    start: "1970-01-01T00:00:00.000Z",
    end: "1970-01-02T00:00:00.000Z",
    time_zone: "UTC",
  },
  profile: {
    time_zone: null,
    day_starts_at_hour: 4,
    max_reviews_per_day: 200,
    new_highlights_per_day: 20,
  },
  counts: { due: 0, new_highlights: 0, done_today: 0, by_book: [] },
  limit_reached: null,
  next_due_at: null,
};

/** The most cards one queue read returns (`lib/review/actions.ts`); a longer day is read again. */
const LOADED = 50;

function metaOf(q: ReviewQueue): QueueMeta {
  return {
    now: q.now,
    day: q.day,
    profile: q.profile,
    counts: q.counts,
    limit_reached: q.limit_reached,
    next_due_at: q.next_due_at,
  };
}

function init(
  initial: InitialQueue,
  settings: ReaderSettings,
  next: ContinueView | null,
): AppState {
  const base = {
    states: {},
    pending: null,
    failed: null,
    saved: null,
    toast: null,
    bybook: false,
    panel: null,
    draft: null,
    phase: "edit" as SettingsPhase,
    attempt: 0,
    settings,
    next,
  };
  return initial.ok
    ? {
        ...base,
        status: "ready",
        ref: null,
        meta: metaOf(initial.data),
        queue: initial.data.cards,
      }
    : {
        ...base,
        status: "failed",
        ref: initial.ref,
        meta: EMPTY_META,
        queue: [],
      };
}

export function ReviewApp({
  initial,
  settings,
  initialNext,
}: {
  initial: InitialQueue;
  settings: ReaderSettings;
  initialNext: ContinueView | null;
}) {
  const [s, setS] = useState<AppState>(() =>
    init(initial, settings, initialNext),
  );
  const ref = useRef(s);
  const set = useCallback((fn: (p: AppState) => AppState) => {
    ref.current = fn(ref.current);
    setS(ref.current);
  }, []);

  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const want = useRef<string | null>(null);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const loadSeq = useRef(0);
  const toastSeq = useRef(0);
  const titleId = useId();
  const [os, setOs] = useState<"light" | "dark">("light");
  const nextAsked = useRef(initialNext !== null);
  const zoneTaken = useRef(false);

  // What the device is now, for System's readout.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setOs(mq.matches ? "dark" : "light");
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ---- focus ---------------------------------------------------------------------------
  /** Move focus once the next render has the target (a card, an end state, Next, the answer). */
  const focusAfter = useCallback((sel: string) => {
    want.current = sel;
    setTick((t) => t + 1);
  }, []);
  useEffect(() => {
    const sel = want.current;
    if (!sel) return;
    const t0 = Date.now();
    let frame = 0;
    const go = () => {
      const el = rootRef.current?.querySelector<HTMLElement>(sel);
      if (
        el &&
        el.offsetParent !== null &&
        !(el as HTMLButtonElement).disabled
      ) {
        want.current = null;
        el.focus({ preventScroll: true });
        // A new card scrolls the page back only if the reader is below the card's head,
        // so the head sits under the top bar.
        if (el.matches("[data-rv-card], [data-rv-end]")) {
          const top =
            el.getBoundingClientRect().top + window.scrollY - (3 + 56 + 16);
          if (window.scrollY > top)
            window.scrollTo({
              top: Math.max(0, Math.round(top)),
              behavior: "instant",
            });
        }
        return;
      }
      if (Date.now() - t0 < 1500) frame = requestAnimationFrame(go);
    };
    frame = requestAnimationFrame(go);
    return () => cancelAnimationFrame(frame);
  }, [tick]);

  const CARD_OR_END = "[data-rv-card], [data-rv-end]";

  // ---- reading the queue -------------------------------------------------------------------
  const reload = useCallback(
    async (opts: { silent: boolean; focus?: boolean }) => {
      const mine = ++loadSeq.current;
      if (!opts.silent) set((p) => ({ ...p, status: "loading", ref: null }));
      const res = await loadReviewQueue();
      if (mine !== loadSeq.current) return;
      if (!res.ok) {
        if (opts.silent && ref.current.status === "ready") return;
        set((p) => ({ ...p, status: "failed", ref: res.ref }));
        focusAfter("[data-rv-end]");
        return;
      }
      set((p) => ({
        ...p,
        status: "ready",
        ref: null,
        meta: metaOf(res.data),
        queue: res.data.cards,
        pending: p.pending,
      }));
      if (!opts.silent && opts.focus !== false) focusAfter(CARD_OR_END);
    },
    [set, focusAfter],
  );

  // The first review takes the browser's time zone (the hint under Time zone says so).
  useEffect(() => {
    const p = ref.current;
    if (
      zoneTaken.current ||
      p.status !== "ready" ||
      p.meta.profile.time_zone !== null
    )
      return;
    zoneTaken.current = true;
    const tz = browserZone();
    if (!tz) return;
    void saveReviewSettings({ time_zone: tz }).then((res) => {
      if (res.ok) void reload({ silent: true });
    });
  }, [reload]);

  // Back from the reader (a restored page): the queue is read again, the same card first if
  // it is still due. The rating that was not yet sent is not kept.
  useEffect(() => {
    const on = (e: PageTransitionEvent) => {
      if (e.persisted && ref.current.pending === null)
        void reload({ silent: true });
    };
    window.addEventListener("pageshow", on);
    return () => window.removeEventListener("pageshow", on);
  }, [reload]);

  const head = s.queue[0] ?? null;
  const kind =
    s.status === "ready"
      ? endKind({
          cards: s.queue.length,
          counts: s.meta.counts,
          limit_reached: s.meta.limit_reached,
          profile: s.meta.profile,
          next_due_at: s.meta.next_due_at,
        })
      : null;

  // The continue-reading block (Q9) is read once, when the first end state shows.
  useEffect(() => {
    if (
      nextAsked.current ||
      kind === null ||
      kind === "card" ||
      kind === "empty"
    )
      return;
    nextAsked.current = true;
    void loadReviewContinue().then((next) => set((p) => ({ ...p, next })));
  }, [kind, set]);

  // ---- answering a quiz card ----------------------------------------------------------------
  const act = (a: QuizAction) => {
    const p = ref.current;
    const card = p.queue[0];
    if (!card || p.pending) return;
    const spec = specFor(card);
    if (!spec) return;
    const cur = p.states[card.card_id] ?? freshFor(card);
    const r = reduce(spec, cur, a);
    set((q) => ({ ...q, states: { ...q.states, [card.card_id]: r.st } }));
    // After grading, focus moves to Next; after Show answer, to the answer.
    if (r.graded && a.t !== "self") focusAfter("[data-rv-main]");
    else if (a.t === "reveal") focusAfter("[data-qz-answer]");
  };

  // ---- rating ---------------------------------------------------------------------------------
  const rate = (rating: Rating) => {
    const p = ref.current;
    const card = p.queue[0];
    if (!card || p.pending) return;
    const spec = specFor(card);
    let st = p.states[card.card_id] ?? fresh();
    // Pressing a rating on a recall card also records the quiz's self-grade, so the margin
    // marks it as the quiz does.
    if (spec && spec.type === "recall" && st.ph === "revealed") {
      st = reduce(spec, st, {
        t: "self",
        v: rating === "good" ? "got" : "missed",
      }).st;
    }
    const response =
      spec && st.ph === "graded" ? responseOf(spec, st) : undefined;
    const reviewId = reviewIdFor(p.failed, card.card_id, rating);
    const mine = ++seq.current;
    set((q) => ({
      ...q,
      states: spec ? { ...q.states, [card.card_id]: st } : q.states,
      pending: { cardId: card.card_id, rating, reviewId, seq: mine },
      failed: null,
      toast: null,
    }));
    void rateReviewCard({
      cardId: card.card_id,
      rating,
      reviewId,
      response,
    }).then((res) => {
      // A reply lands only on the rating that sent it.
      const cur = ref.current;
      if (!cur.pending || cur.pending.seq !== mine) return;
      if (!res.ok) {
        if (res.gone) {
          // The card is not there any more (suspended elsewhere, or its document is gone).
          set((q) => ({
            ...q,
            queue: q.queue.filter((c) => c.card_id !== card.card_id),
            pending: null,
          }));
          void reload({ silent: false });
          return;
        }
        set((q) => ({
          ...q,
          pending: null,
          failed: { cardId: card.card_id, rating, reviewId },
        }));
        return;
      }
      const reply = res.data;
      const landed = landRating(cur.queue, card, reply);
      set((q) => {
        const states = { ...q.states };
        delete states[card.card_id];
        return {
          ...q,
          queue: landed.queue,
          states,
          pending: null,
          failed: null,
          meta: {
            ...q.meta,
            now: new Date().toISOString(),
            day: reply.day,
            counts: reply.counts,
            limit_reached: reply.limit_reached,
            next_due_at: reply.next_due_at,
          },
          saved: {
            word: REVIEW.head.saved,
            rest: REVIEW.head.savedRest(
              rating,
              formatInterval(reply.card.interval),
            ),
          },
        };
      });
      if (landed.refetch) void reload({ silent: false });
      else focusAfter(CARD_OR_END);
    });
  };
  const retry = () => {
    const f = ref.current.failed;
    if (f) rate(f.rating);
  };

  // ---- suspend and undo --------------------------------------------------------------------------
  const showToast = (kindOf: Toast["kind"], card: ReviewCard, text: string) => {
    toastSeq.current += 1;
    return { id: toastSeq.current, kind: kindOf, card, text } satisfies Toast;
  };
  const suspendText = (card: ReviewCard) =>
    card.source === "highlight"
      ? REVIEW.suspend.highlight
      : REVIEW.suspend.done;

  const runSuspend = (card: ReviewCard) => {
    set((q) => ({
      ...q,
      queue: q.queue.filter((c) => c.card_id !== card.card_id),
      meta: { ...q.meta, counts: adjustCounts(q.meta.counts, card, -1) },
      toast: showToast("undo", card, suspendText(card)),
      failed: null,
    }));
    focusAfter(CARD_OR_END);
    void setReviewCardStatus({
      cardId: card.card_id,
      status: "suspended",
    }).then((res) => {
      if (res.ok) {
        const reply = res.data;
        const landed = landSuspend(ref.current.queue, reply);
        set((q) => ({
          ...q,
          queue: landed.queue,
          meta: {
            ...q.meta,
            day: reply.day,
            counts: reply.counts,
            limit_reached: reply.limit_reached,
            next_due_at: reply.next_due_at,
          },
        }));
        if (landed.refetch) void reload({ silent: false });
        return;
      }
      if (res.gone) {
        void reload({ silent: false });
        return;
      }
      // Not suspended: the card comes back, and the line says so.
      set((q) => ({
        ...q,
        queue: [card, ...q.queue.filter((c) => c.card_id !== card.card_id)],
        meta: { ...q.meta, counts: adjustCounts(q.meta.counts, card, 1) },
        toast: showToast("retry", card, REVIEW.suspend.failed),
      }));
      focusAfter(CARD_OR_END);
    });
  };
  const suspend = () => {
    const p = ref.current;
    const card = p.queue[0];
    if (card && !p.pending) runSuspend(card);
  };
  const undo = () => {
    const card = ref.current.toast?.card;
    if (!card) return;
    set((q) => ({
      ...q,
      queue: [card, ...q.queue.filter((c) => c.card_id !== card.card_id)],
      meta: { ...q.meta, counts: adjustCounts(q.meta.counts, card, 1) },
      toast: null,
    }));
    focusAfter(CARD_OR_END);
    void setReviewCardStatus({ cardId: card.card_id, status: "active" }).then(
      (res) => {
        if (res.ok) {
          const reply = res.data;
          set((q) => ({
            ...q,
            meta: {
              ...q.meta,
              day: reply.day,
              counts: reply.counts,
              limit_reached: reply.limit_reached,
              next_due_at: reply.next_due_at,
            },
          }));
          return;
        }
        if (res.gone) {
          void reload({ silent: false });
          return;
        }
        // Still suspended on the server: take the card out again, and keep the line.
        set((q) => ({
          ...q,
          queue: q.queue.filter((c) => c.card_id !== card.card_id),
          meta: { ...q.meta, counts: adjustCounts(q.meta.counts, card, -1) },
          toast: showToast("undo", card, suspendText(card)),
        }));
        focusAfter(CARD_OR_END);
      },
    );
  };
  const toastRetry = () => {
    const card = ref.current.toast?.card;
    if (card) runSuspend(card);
  };

  // ---- the sheets -------------------------------------------------------------------------------
  const openPanel = (name: Exclude<Panel, null>, from: HTMLElement | null) => {
    const p = ref.current;
    if (p.panel === name) {
      closePanel();
      return;
    }
    if (p.panel === null) opener.current = from;
    set((q) => ({
      ...q,
      panel: name,
      draft:
        name === "settings"
          ? {
              tz: q.meta.profile.time_zone ?? browserZone() ?? "UTC",
              max: String(q.meta.profile.max_reviews_per_day),
              maxNew: String(q.meta.profile.new_highlights_per_day),
            }
          : null,
      phase: "edit",
    }));
  };
  const closePanel = () => {
    set((q) => ({ ...q, panel: null, draft: null, phase: "edit" }));
  };

  // A sheet returns focus to its opener when it closes.
  const sheetOpen = s.panel !== null;
  useEffect(() => {
    if (!sheetOpen) return;
    return () => {
      const o = opener.current;
      opener.current = null;
      if (o && o.isConnected) o.focus({ preventScroll: true });
    };
  }, [sheetOpen]);
  useEffect(() => {
    if (s.panel === null) return;
    sheetRef.current
      ?.querySelector<HTMLElement>(".rd-sheet__close")
      ?.focus({ preventScroll: true });
  }, [s.panel]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (s.panel === null) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      closePanel();
      return;
    }
    if (e.key !== "Tab") return;
    // aria-modal: focus stays inside the sheet.
    const sheet = sheetRef.current;
    if (!sheet) return;
    const items = Array.from(
      sheet.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!sheet.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // ---- review settings ----------------------------------------------------------------------------
  const field = (key: keyof SettingsDraft, value: string) =>
    set((q) =>
      q.draft
        ? {
            ...q,
            draft: { ...q.draft, [key]: value },
            phase: q.phase === "failed" ? "invalid" : q.phase,
          }
        : q,
    );
  const saveSettings = () => {
    const p = ref.current;
    const draft = p.draft;
    if (!draft || p.phase === "saving") return;
    const errs = settingsErrors(draft);
    if (errs.max || errs.maxNew) {
      set((q) => ({ ...q, phase: "invalid", attempt: q.attempt + 1 }));
      return;
    }
    const mine = ++seq.current;
    set((q) => ({ ...q, phase: "saving" }));
    const max = Number(draft.max.trim());
    const nw = Number(draft.maxNew.trim());
    void saveReviewSettings({
      time_zone: draft.tz,
      max_reviews_per_day: max,
      new_highlights_per_day: nw,
    }).then((res) => {
      const cur = ref.current;
      if (cur.phase !== "saving" || mine !== seq.current) return;
      if (!res.ok) {
        set((q) => ({ ...q, phase: "failed" }));
        return;
      }
      set((q) => ({
        ...q,
        panel: null,
        draft: null,
        phase: "edit",
        meta: { ...q.meta, profile: res.data },
        saved: {
          word: REVIEW.head.settingsSaved,
          rest: REVIEW.head.settingsSavedRest(
            res.data.max_reviews_per_day,
            res.data.new_highlights_per_day,
          ),
        },
      }));
      // The limits change what is shown today: read the queue again.
      void reload({ silent: false, focus: false });
    });
  };

  // ---- the device settings (the reader's Display sheet) -------------------------------------------
  const apply = (next: ReaderSettings) => {
    set((q) => ({ ...q, settings: next }));
    document.cookie = readerCookieString(
      next,
      window.location.protocol === "https:",
    );
  };
  const onSize = (size: TextSize) => apply({ ...ref.current.settings, size });
  const onTheme = (theme: ThemeChoice) =>
    apply({ ...ref.current.settings, theme });

  // ---- the view -------------------------------------------------------------------------------------
  const { settings: dev } = s;
  const loading = s.status === "loading";
  const ready = s.status === "ready";
  const newInQueue = s.queue.filter(isNewHighlight).length;
  const heldNew =
    kind === "card" &&
    s.meta.limit_reached === null &&
    s.queue.length < LOADED &&
    s.meta.counts.new_highlights > newInQueue;
  const note = booksNote({
    kind: kind ?? "card",
    profile: s.meta.profile,
    heldNew,
  });
  const spec = head ? specFor(head) : null;
  const st = head && spec ? (s.states[head.card_id] ?? freshFor(head)) : null;
  const rootClass = `rd-root rd-size-${dev.size}`;

  return (
    <div
      ref={rootRef}
      className={rootClass}
      data-md-color-scheme={schemeFor(dev.theme)}
      data-theme-choice={dev.theme}
      lang="en"
      onKeyDown={onKeyDown}
    >
      <div className="rd-in">
        <div className="rd-line" aria-hidden="true">
          <span
            className="rd-line__fill"
            style={{ width: `${ready ? progressPct(s.meta.counts) : 0}%` }}
          />
        </div>

        <header className="rd-top">
          <div className="rd-top__start">
            <Link
              className="rd-logo"
              href={LIBRARY_HREF}
              prefetch={false}
              aria-label={READER.top.logoLabel}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a static 22px mark */}
              <img src="/logo.svg" alt="" width={22} height={22} />
            </Link>
            <Link className="rd-back" href={LIBRARY_HREF} prefetch={false}>
              <span className="rd-back__chev" aria-hidden="true">
                ‹
              </span>
              <span className="rd-back__long">{REVIEW.top.library}</span>
              <span className="rd-back__short">{REVIEW.top.library}</span>
            </Link>
          </div>
          <div className="rd-top__end">
            <button
              type="button"
              className="rd-tbtn"
              aria-haspopup="dialog"
              aria-expanded={s.panel === "settings"}
              onClick={(e) => openPanel("settings", e.currentTarget)}
            >
              {REVIEW.top.settings}
            </button>
            <button
              type="button"
              className="rd-tbtn"
              aria-haspopup="dialog"
              aria-expanded={s.panel === "display"}
              onClick={(e) => openPanel("display", e.currentTarget)}
            >
              {REVIEW.top.display}
            </button>
          </div>
        </header>

        <main
          className="rd-page rd-flow rv-page"
          id="main-content"
          aria-busy={loading ? "true" : undefined}
        >
          <QueueHead
            counts={s.meta.counts}
            loading={loading}
            ready={ready}
            saved={s.saved}
            open={s.bybook}
            note={note}
            onBooks={() => set((q) => ({ ...q, bybook: !q.bybook }))}
          />
          {loading ? <CardSkeleton /> : null}
          {s.status === "failed" ? (
            <ReviewFailed
              reference={s.ref}
              onRetry={() => void reload({ silent: false })}
            />
          ) : null}
          {ready && head && kind === "card" ? (
            <ReviewCardView
              key={head.card_id}
              card={head}
              spec={spec}
              meta={s.meta}
              st={st}
              pending={
                s.pending && s.pending.cardId === head.card_id
                  ? s.pending
                  : null
              }
              failed={
                s.failed && s.failed.cardId === head.card_id ? s.failed : null
              }
              onAct={act}
              onRate={rate}
              onRetry={retry}
              onSuspend={suspend}
            />
          ) : null}
          {ready && kind !== null && kind !== "card" ? (
            <ReviewEnd
              kind={kind}
              meta={s.meta}
              next={s.next}
              onSettings={(el) => openPanel("settings", el)}
            />
          ) : null}
        </main>

        {s.toast ? (
          <div className="an-slot an-slot--page an-slot--toast">
            <div className="an-toast" role="status">
              <span className="an-toast__text">{s.toast.text}</span>
              <button
                type="button"
                className="rd-btn rd-btn--quiet"
                onClick={s.toast.kind === "undo" ? undo : toastRetry}
              >
                {s.toast.kind === "undo"
                  ? REVIEW.suspend.undo
                  : REVIEW.suspend.tryAgain}
              </button>
            </div>
          </div>
        ) : null}

        {s.panel !== null ? (
          <>
            <button
              type="button"
              className="rd-scrim"
              tabIndex={-1}
              aria-label={REVIEW.closePanel}
              onClick={closePanel}
            />
            <div
              ref={sheetRef}
              className="rd-sheet rd-sheet--right"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="rd-sheet__head">
                <h2 className="rd-sheet__title" id={titleId}>
                  {s.panel === "settings"
                    ? REVIEW.settings.title
                    : READER.sheets.display}
                </h2>
                <button
                  type="button"
                  className="rd-btn rd-btn--quiet rd-sheet__close"
                  onClick={closePanel}
                >
                  {READER.sheets.close}
                </button>
              </div>
              <div className="rd-sheet__body">
                {s.panel === "settings" && s.draft ? (
                  <ReviewSettingsForm
                    draft={s.draft}
                    phase={s.phase}
                    attempt={s.attempt}
                    now={s.meta.now}
                    onField={field}
                    onSave={saveSettings}
                    onCancel={closePanel}
                  />
                ) : null}
                {s.panel === "display" ? (
                  <DisplayPanel
                    size={dev.size}
                    theme={dev.theme}
                    os={os}
                    onSize={onSize}
                    onTheme={onTheme}
                  />
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
