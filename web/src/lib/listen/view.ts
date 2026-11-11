import { LISTEN } from "@/content/listen";

import { chapterN, nextChapter, ownChapters } from "./book";
import { aboutLeft, clockAt, clockPos, lengthWords } from "./format";
import type { ListenKey, NoteKey } from "./machine";
import type { Listen } from "./types";

// P41-sr.W1 — what the dock and the note say for a Listen, transcribed from the signed
// `Dock` and `ListenNote` boards' tables (`11-listen` F7, F9, F10, F23). Pure: the
// components only render these, so one state reads one way everywhere.

export type Lead = "play" | "pause" | "again" | "retry" | "off";

export interface DockView {
  lead: Lead;
  word: string;
  rest: string;
  busy: boolean;
  revoked: boolean;
  /** The chevron (Open the player); a signed-out dock carries Sign in instead. */
  open: boolean;
  signIn: boolean;
  /** The polite live region's words: state and chapter changes, never the position. */
  say: string;
}

/** `12:30 of 42:10`, `2:10 of 9:40 so far` (F2, F23); a book's `Chapter 2 · 12:30` (F2). */
function where(l: Listen): string {
  if (l.kind === "book") {
    return LISTEN.dock.whereBook(chapterN(l, l.ch) ?? 1, clockPos(l.chPos));
  }
  return LISTEN.dock.where(clockPos(l.pos), clockPos(l.len ?? 0), l.soFar);
}

/**
 * A book's chapter count, and the chapters it names (P41-sr.W2). `total` is the book's
 * (a chapter's place, "Chapter 2 of 5"); `own` is this Listen's own listenable chapters,
 * in its language, for every "n chapters" count (P41-sr.F3: "all 2 chapters").
 */
function bookNums(l: Listen): {
  total: number;
  own: number;
  n: number;
  next: number;
  making: number;
} {
  const total = l.book?.chapters.length ?? 1;
  const own = ownChapters(l.entries).length || total;
  const n = chapterN(l, l.ch) ?? 1;
  const next = nextChapter(l, l.ch)?.n ?? n + 1;
  const making = chapterN(l, l.making) ?? n;
  return { total, own, n, next, making };
}

/** The next chapter's own time left preparing, else the Listen's (F10 next-waiting). */
function nextLeft(l: Listen): number | null {
  const nx = nextChapter(l, l.ch);
  const e = nx ? l.entries.find((x) => x.chapter === nx.key) : undefined;
  return e?.left ?? l.left;
}

function seenAt(l: Listen): string | null {
  return clockAt(l.seen);
}

/** The dock's lead, word and rest per state (the `Dock` board's table, F7, F10). */
export function dockView(l: Listen): DockView {
  const D = LISTEN.dock;
  const part = l.part?.n ?? 1;
  const parts = l.part?.of ?? l.parts;
  const seen = seenAt(l);
  const book = l.kind === "book";
  const B = bookNums(l);
  const rows: Record<ListenKey, [Lead, string, string, boolean, boolean]> = {
    waiting: [
      "off",
      D.waiting(LISTEN.runner),
      seen ? D.lastSeen(seen) : "",
      false,
      false,
    ],
    making: ["off", D.preparing, D.part(part, parts), true, false],
    ready: ["play", D.readyToPlay, D.restPreparing, false, false],
    tap: ["play", D.readyToPlay, "", false, false],
    loading: ["pause", D.loading, "", true, false],
    playing: ["pause", l.old ? D.earlier : D.playing, where(l), false, false],
    paused: ["play", l.old ? D.earlier : D.paused, where(l), false, false],
    buffering: ["pause", D.buffering, where(l), true, false],
    "next-waiting": ["pause", D.preparing, D.chapter(B.next), true, false],
    finished: [
      "again",
      D.finished,
      book ? D.allChapters(B.own) : clockPos(l.len ?? l.pos),
      false,
      false,
    ],
    "fail-voice": ["retry", D.preparingStopped, D.tryAgainLower, false, true],
    "fail-limit": ["off", D.dailyLimit, D.resumes("09:00"), false, false],
    "fail-play": ["retry", D.playbackStopped, D.connectionLost, false, true],
    "fail-session": ["off", D.signedOut, "", false, true],
    "fail-unreadable": ["retry", D.unreadable, D.tryAgainLower, false, true],
    "offline-start": ["off", D.offline, D.offlineStart, false, false],
    "offline-play": [
      "pause",
      D.offline,
      D.loaded(clockPos(l.loaded)),
      false,
      false,
    ],
    "offline-stopped": [
      "off",
      D.offline,
      D.stoppedAt(clockPos(l.stoppedAt ?? l.pos)),
      false,
      false,
    ],
  };
  const [lead, word, rest, busy, revoked] = rows[l.state];
  const say =
    l.state === "fail-session"
      ? D.say.signedOut
      : l.state === "fail-limit"
        ? D.say.dailyLimit("09:00")
        : l.state === "next-waiting" && book
          ? D.say.nextWaiting(B.next)
          : l.state === "playing" && book
            ? D.say.playingChapter(
                word,
                B.n,
                // The chapter's own title only (P41-sr.F3); its place is already said.
                l.titleLang !== null ? l.title : null,
              )
            : word;
  return {
    lead,
    word,
    rest,
    busy,
    revoked,
    open: l.state !== "fail-session",
    signIn: l.state === "fail-session",
    say,
  };
}

export type Trio = "active" | "idle" | "revoked";
export type NoteAction = "play" | "retry" | "again" | "signin" | "update" | "";

export interface NoteView {
  trio: Trio;
  word: string;
  text: string;
  busy: boolean;
  /** The progress line's percent (F9), or null where it does not apply. */
  line: number | null;
  lineLabel: string;
  /** The reference line in mono for the two failures on our side. */
  ref: string;
  action: NoteAction;
}

/** Overrides for the head's held copies (a state that is not the Listen's own). */
export interface NoteOptions {
  /** The daily limit's ready part ("14 min"); null for none. */
  ready?: string | null;
  /** The daily limit's reset ("09:00 tomorrow"). */
  reset?: string;
}

/** The note's word, sentence, line and action per state (the `ListenNote` board's table, F9, F10). */
export function noteView(
  l: Listen,
  key: NoteKey,
  opts: NoteOptions = {},
): NoteView {
  const N = LISTEN.note;
  const part = l.part?.n ?? 1;
  const parts = l.part?.of ?? l.parts;
  const left = l.left !== null ? aboutLeft(l.left) : null;
  const made = l.len !== null && l.len > 0 ? lengthWords(l.len) : null;
  const book = l.kind === "book";
  const B = bookNums(l);
  // F9: a book's step names the chapter being made (fill: chapters done / chapters, F31).
  const done = book
    ? (B.making - 1) / B.total
    : parts > 0
      ? l.partsMade / parts
      : 0;
  const making = book
    ? N.makingBook(B.making, B.total, left ?? LISTEN.time.under5)
    : part <= 1 || left === null
      ? N.makingFirst(parts)
      : N.makingPart(part, parts, left);
  const nl = nextLeft(l);
  const limitReady = opts.ready === undefined ? made : opts.ready;
  const rows: Record<
    NoteKey,
    [Trio, string, string, NoteAction, number | null, boolean, string]
  > = {
    waiting: [
      "idle",
      N.waiting,
      N.waitingText(LISTEN.runner, seenAt(l)),
      "",
      null,
      false,
      "",
    ],
    making: ["idle", N.preparing, making, "", done, false, ""],
    ready: [
      "active",
      N.ready,
      N.readyText(made ?? lengthWords(0)),
      "play",
      done,
      false,
      "",
    ],
    tap: ["active", N.ready, N.tapText, "play", null, false, ""],
    loading: ["idle", N.loading, "", "", null, true, ""],
    buffering: ["idle", N.buffering, where(l), "", null, true, ""],
    playing: ["active", N.playing, where(l), "", null, false, ""],
    paused: ["idle", N.paused, where(l), "", null, false, ""],
    "next-waiting": [
      "idle",
      N.preparing,
      N.nextWaitingText(
        B.next,
        nl !== null ? aboutLeft(nl) : LISTEN.time.under5,
      ),
      "",
      null,
      false,
      "",
    ],
    finished: [
      "active",
      N.finished,
      book ? N.finishedBook(B.own) : N.finishedDoc,
      "again",
      null,
      false,
      "",
    ],
    "fail-voice": [
      "revoked",
      N.stopped,
      N.voiceText(part, parts),
      "retry",
      null,
      false,
      N.voiceRef,
    ],
    "fail-limit": [
      "idle",
      N.dailyLimit,
      N.limitText(opts.reset ?? LISTEN.time.tomorrow("09:00"), limitReady),
      limitReady ? "play" : "",
      null,
      false,
      "",
    ],
    "fail-play": [
      "revoked",
      N.stopped,
      N.playText(clockPos(l.stoppedAt ?? l.pos)),
      "retry",
      null,
      false,
      "",
    ],
    "fail-session": [
      "revoked",
      N.signedOut,
      N.sessionText,
      "signin",
      null,
      false,
      "",
    ],
    "fail-unreadable": [
      "revoked",
      N.unreadable,
      N.unreadableText(book ? "chapter" : "document"),
      "retry",
      null,
      false,
      N.unreadableRef,
    ],
    "offline-start": [
      "idle",
      N.offline,
      N.offlineStartText,
      "",
      null,
      false,
      "",
    ],
    "offline-play": [
      "idle",
      N.offline,
      N.offlinePlayText(clockPos(l.loaded)),
      "",
      null,
      false,
      "",
    ],
    "offline-stopped": [
      "idle",
      N.offline,
      N.offlineStoppedText(clockPos(l.stoppedAt ?? l.pos)),
      "",
      null,
      false,
      "",
    ],
    outdated: ["idle", N.earlier, N.outdatedText, "update", null, false, ""],
  };
  const [trio, word, text, action, frac, busy, ref] = rows[key];
  return {
    trio,
    word,
    text,
    busy,
    line: frac === null ? null : Math.round(Math.max(0.02, frac) * 100),
    lineLabel: book ? N.lineBook : N.lineDoc,
    ref,
    action,
  };
}
