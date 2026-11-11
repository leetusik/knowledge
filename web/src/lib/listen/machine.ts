import type { KbListenState } from "@/lib/knowledge/listen";

// P41-sr.W1 — the F19 state machine (`11-listen` frame.md F19, F23), pure so it is tested
// in node (`tests/listen-player.test.ts`). The server's state maps to the keys the making
// owns (P41-sr.B1 § State, its F19 mapping); every playback key is the client's, moved by
// the media element's events and the listener's presses. `fail-limit` has no source (the
// voice is local) and is never produced.

/** F19's state keys: one list for the dock, the note and every page. */
export type ListenKey =
  | "waiting"
  | "making"
  | "ready"
  | "tap"
  | "loading"
  | "playing"
  | "paused"
  | "buffering"
  | "next-waiting"
  | "finished"
  | "fail-voice"
  | "fail-limit"
  | "fail-play"
  | "fail-session"
  | "fail-unreadable"
  | "offline-start"
  | "offline-play"
  | "offline-stopped";

/** The note's keys: F19's plus `outdated`, the note's form of `old: true`. */
export type NoteKey = ListenKey | "outdated";

/** What the server's state says about the making, before anything plays. */
export type ServerKey =
  | "none"
  | "unavailable"
  | "waiting"
  | "making"
  | "ready"
  | "made"
  | "fail-voice"
  | "fail-unreadable";

/**
 * B1's F19 mapping. A failure wins; then `unavailable` / `none` / `made`; while making, a
 * playable prefix (`len` set) is `ready` (the first part plays) even when no runner has
 * called lately, so a made part is never behind a disabled Play; with nothing made, no
 * runner call within 2 × the poll is `waiting`, else `making`.
 */
export function serverKey(
  s: Pick<KbListenState, "state" | "waiting" | "len" | "failure">,
): ServerKey {
  if (s.failure?.kind === "unreadable") return "fail-unreadable";
  if (s.failure?.kind === "voice") return "fail-voice";
  switch (s.state) {
    case "unavailable":
      return "unavailable";
    case "none":
      return "none";
    case "made":
      return "made";
    case "failed":
      return "fail-voice";
    case "making":
      if (s.len !== null && s.len > 0) return "ready";
      return s.waiting ? "waiting" : "making";
  }
}

/** The keys the making drives: nothing is playing, and a server answer may move them. */
const SERVER_DRIVEN: readonly ListenKey[] = [
  "waiting",
  "making",
  "ready",
  "fail-voice",
  "fail-unreadable",
];

/** The keys in which the element is (or was asked to be) sounding. */
const SOUNDING: readonly ListenKey[] = [
  "loading",
  "playing",
  "buffering",
  "offline-play",
];

export interface Machine {
  key: ListenKey;
  /** Where `offline-start` returns to once the network is back. */
  back: ListenKey | null;
}

export type MachineEvent =
  /** A press that asks for sound (Listen, Play, Continue listening, Start over, Try again after a dropped connection). */
  | { t: "press" }
  /** A server answer (update, a poll). */
  | { t: "server"; key: ServerKey }
  /**
   * Start's answer to a press. With nothing sounding yet, a making the listener cannot
   * hear moves `loading` (the head's "Starting…") to what the making is; a playable answer
   * keeps `loading` while the engine attaches it.
   */
  | { t: "started"; key: ServerKey; attached: boolean }
  /** Try again after a failure on our side: start remakes the unit (P41-sr.B1). */
  | { t: "remake" }
  | { t: "playing" }
  /** The element waits for data (`waiting`). */
  | { t: "stall" }
  /** The listener paused (not the pause that ends the media). */
  | { t: "pause" }
  | { t: "ended" }
  /** A media or network fault that is neither offline nor the session. */
  | { t: "error" }
  /** `play()` was refused without a gesture (NotAllowedError). */
  | { t: "rejected" }
  /** A 401: the session is gone. */
  | { t: "session" }
  /** The network went away; `loaded` is the audio buffered ahead, in seconds. */
  | { t: "offline"; loaded: number }
  | { t: "online" };

export function initial(key: ListenKey): Machine {
  return { key, back: null };
}

/** One transition. Unknown pairs keep the state. */
export function step(m: Machine, e: MachineEvent): Machine {
  const k = m.key;
  switch (e.t) {
    case "press":
      return { key: "loading", back: null };
    case "server": {
      if (k === "offline-start") {
        const back = fromServer(m.back ?? "making", e.key);
        return { key: k, back };
      }
      if (!SERVER_DRIVEN.includes(k)) return m;
      return { key: fromServer(k, e.key), back: null };
    }
    case "started":
      if (k !== "loading" || e.attached) return m;
      switch (e.key) {
        case "waiting":
        case "making":
        case "fail-voice":
        case "fail-unreadable":
          return { key: e.key, back: null };
        default:
          return m;
      }
    case "remake":
      return k === "fail-voice" || k === "fail-unreadable"
        ? { key: "making", back: null }
        : m;
    case "playing":
      return { key: "playing", back: null };
    case "stall":
      if (k === "playing") return { key: "buffering", back: null };
      if (k === "offline-play") return { key: "offline-stopped", back: null };
      return m;
    case "pause":
      return SOUNDING.includes(k) ? { key: "paused", back: null } : m;
    case "ended":
      return { key: "finished", back: null };
    case "error":
      return { key: "fail-play", back: null };
    case "rejected":
      return { key: "tap", back: null };
    case "session":
      return { key: "fail-session", back: null };
    case "offline":
      if (k === "playing" || k === "buffering") {
        return {
          key: e.loaded > 1 ? "offline-play" : "offline-stopped",
          back: null,
        };
      }
      if (k === "loading" || k === "tap" || SERVER_DRIVEN.includes(k)) {
        return { key: "offline-start", back: k };
      }
      return m;
    case "online":
      if (k === "offline-play") return { key: "playing", back: null };
      if (k === "offline-stopped") return { key: "paused", back: null };
      if (k === "offline-start") return { key: m.back ?? "making", back: null };
      return m;
  }
}

/** A server-driven key moved by a server answer. Made in full: start it (the press asked for it). */
function fromServer(k: ListenKey, s: ServerKey): ListenKey {
  switch (s) {
    case "waiting":
    case "making":
    case "ready":
    case "fail-voice":
    case "fail-unreadable":
      return s;
    case "made":
      return "loading";
    default:
      return k;
  }
}

/** The note's key: `outdated` while an earlier version plays or waits paused (F10, F19). */
export function noteKey(key: ListenKey, old: boolean): NoteKey {
  return old && (key === "playing" || key === "paused") ? "outdated" : key;
}

/** Whether the making still moves: the client polls the state while this holds. */
export function polls(
  key: ListenKey,
  soFar: boolean,
  updating: boolean,
): boolean {
  return (
    soFar ||
    updating ||
    key === "waiting" ||
    key === "making" ||
    key === "ready" ||
    key === "offline-start"
  );
}

/**
 * When a new `play.list` (the audio changed: Update audio landed, a unit was replaced) may
 * take the element's source. Never at `ended` and never under a sounding element (R3: a
 * swap at `ended` makes no sound on a locked iPhone): only with nothing attached, or at a
 * press (a gesture: Play after a pause, Start over, Try again).
 */
export function switchList(
  attached: string | null,
  offered: string,
  at: "sounding" | "ended" | "press" | "idle",
): "same" | "now" | "later" {
  if (attached === offered) return "same";
  if (attached === null) return "now";
  return at === "press" || at === "idle" ? "now" : "later";
}
