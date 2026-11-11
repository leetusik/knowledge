import "server-only";

import { getJson, getRaw, sendJson } from "./client";

// P41-sr.B2 — typed server-side calls against knowledge's Listen surfaces: the
// session-only `/app/listen/{start,state,position,update}` routes (P41-sr.B1) and
// the `/app/listen/play/…` delivery family (P41-sr.B2). Same seam as `reader.ts`:
// the caller passes the knowledge bearer unsealed from the httpOnly cookie, every
// call is `no-store`, and errors are `ApiError` carrying the STATUS.
//
// The shapes mirror P41-sr.B1's and P41-sr.B2's § Contract (`server/listen_api.py`,
// `server/listen_play.py`). The state's `play` arrives here as
// knowledge's own paths (`/app/listen/play/…`); the calls below hand it back as the
// BFF relay's paths (`/api/listen/play/…`, the same tail), so the player never
// builds a URL: it plays `play.playlist` and fetches `play.timeline` as given.

/** knowledge's play prefix, and the BFF relay's (`app/api/listen/play/[...path]`). */
const KB_PLAY = "/app/listen/play/";
export const LISTEN_PLAY_BFF = "/api/listen/play/";

/** A Listen: one document, or a book from a chapter to its end (B1 § The Listen key). */
export type KbListenKey =
  | {
      /** The org slug, or the tenant id for a tenant without one. */
      org: string;
      project: string;
      /** The document stem `<date>-<slug>`. */
      doc: string;
      book?: never;
      from_chapter?: never;
      lang?: string;
    }
  | {
      org: string;
      project: string;
      book: string;
      /** Defaults to the book's first chapter. */
      from_chapter?: string;
      doc?: never;
      /** Picks each chapter's variant; defaults to the start chapter's `en`, else its first. */
      lang?: string;
    };

export type KbListenStateName =
  "none" | "unavailable" | "making" | "made" | "failed";

export interface KbListenFailure {
  kind: "voice" | "unreadable";
  /** Where the voice stopped ("at part 4 of 12"). */
  part: { n: number; of: number } | null;
  /** Members of the owning tenant only. */
  message?: string;
  /** On the top-level failure only: the chapter it is in. */
  chapter?: string | null;
}

/** One unit's view: the playing unit's fields on an entry, or an update in progress. */
export interface KbListenUnitView {
  unit: string;
  version: number;
  state: "making" | "made" | "failed";
  parts: number;
  parts_made: number;
  /** Made: the real total; making: the playable prefix; null before part 1. */
  len: number | null;
  so_far: boolean;
  est_seconds: number | null;
  /** The part being made (1-based). */
  part: { n: number; of: number } | null;
  left_seconds: number | null;
  failure: KbListenFailure | null;
}

/** One document of a Listen, in reading order. */
export interface KbListenEntry extends Partial<
  Omit<KbListenUnitView, "unit" | "state">
> {
  chapter: string | null;
  title: string | null;
  doc: string | null;
  lang: string;
  current_version: number | null;
  state: KbListenStateName;
  /** On `unavailable` only. */
  reason?: "legacy" | "missing";
  /** Plays an earlier version than the document's current one. */
  old: boolean;
  /** ...and the current version's unit is being made. */
  updating: boolean;
  unit: string | null;
  /** The current version's unit while an earlier one plays. */
  update: KbListenUnitView | null;
}

/** A stored listening position. */
export interface KbListenPosition {
  from_chapter: string | null;
  chapter: string | null;
  seconds: number;
  lang: string;
  speed: number;
  follow: boolean;
  kept: boolean;
  updated_at: string;
}

/**
 * Where a Listen plays (P41-sr.B2), as BFF paths. `list` is the playlist id: the
 * units that play, in reading order. A new `list` means the audio changed (Update
 * audio landed, a unit was replaced); the old playlist keeps serving what it served.
 */
export interface KbListenPlay {
  list: string;
  /** The HLS playlist: `<audio src>` (native HLS) or hls.js's source. */
  playlist: string;
  /** The time axis (`KbListenTimeline`), same origin, JSON. */
  timeline: string;
}

/** `GET /app/listen/state` (and start/update's answer). */
export interface KbListenState {
  listen: {
    kind: "doc" | "book";
    org: string;
    project: string;
    doc: string | null;
    book: string | null;
    from_chapter: string | null;
    lang: string;
  };
  state: KbListenStateName;
  old: boolean;
  updating: boolean;
  so_far: boolean;
  /** The playable length from the start; null when nothing is made yet. */
  len: number | null;
  made: {
    parts: number;
    of: number;
    chapters: string[];
    through: string | null;
  };
  part: { n: number; of: number; chapter: string | null } | null;
  left_seconds: number | null;
  /** Work being made, and no runner call within 2 × the poll. */
  waiting: boolean;
  /** Members of the owning tenant only. */
  runner_last_seen: string | null;
  failure: KbListenFailure | null;
  entries: KbListenEntry[];
  position: KbListenPosition | null;
  /** Book only: the user's newest row for this book, whatever its start chapter. */
  resume: KbListenPosition | null;
  speed: number;
  follow: boolean;
  kept: boolean;
  /** null until a document of the Listen has a unit (before the first start). */
  play: KbListenPlay | null;
}

/** `PUT /app/listen/position`: the Listen key plus where the listener is. */
export type KbListenPositionWrite = KbListenKey & {
  /** Book only; defaults to `from_chapter`. */
  chapter?: string;
  /** Within 0..14400. */
  seconds: number;
  /** Within 0.5..3.0; omitted = keep. */
  speed?: number;
  follow?: boolean;
  kept?: boolean;
};

/** One part on the time axis. */
export interface KbListenTimelinePart {
  /** The part's index in its unit (0-based). */
  n: number;
  start: number;
  len: number;
  /** The runner's per-segment seconds were used (else the segments' characters). */
  timed: boolean;
}

/** One spoken segment on the time axis; `block` is the native block id, or null. */
export interface KbListenTimelineSegment {
  block: string | null;
  start: number;
  dur: number;
}

/** One unit of the playlist, in reading order, up to the first one not made. */
export interface KbListenTimelineEntry {
  unit: string;
  doc: string;
  /** The document's book chapter key, or null. */
  chapter: string | null;
  title: string;
  lang: string;
  version: number;
  start: number;
  len: number;
  complete: boolean;
  parts: KbListenTimelinePart[];
  segments: KbListenTimelineSegment[];
}

/**
 * `GET /app/listen/play/timeline?list=…`: seconds on the playlist's own axis (the
 * sum of its EXTINF lines), so a chapter seek is `entries[i].start` and follow
 * along maps `currentTime` to a segment's `block`.
 */
export interface KbListenTimeline {
  list: string;
  len: number;
  /** The playlist carries EXT-X-ENDLIST. */
  complete: boolean;
  entries: KbListenTimelineEntry[];
}

/** knowledge's play paths as the BFF relay's (the same tail). */
export function bffPlay(play: KbListenPlay | null): KbListenPlay | null {
  if (!play) return null;
  const swap = (path: string) =>
    path.startsWith(KB_PLAY)
      ? `${LISTEN_PLAY_BFF}${path.slice(KB_PLAY.length)}`
      : path;
  return {
    list: play.list,
    playlist: swap(play.playlist),
    timeline: swap(play.timeline),
  };
}

function withBffPlay(state: KbListenState): KbListenState {
  return { ...state, play: bffPlay(state.play) };
}

function keyQuery(key: KbListenKey): string {
  const query = new URLSearchParams();
  for (const name of [
    "org",
    "project",
    "doc",
    "book",
    "from_chapter",
    "lang",
  ] as const) {
    const value = (key as Record<string, string | undefined>)[name];
    if (value !== undefined) query.set(name, value);
  }
  return query.toString();
}

/** `POST /app/listen/start` → the state: attach to the audio there is, or make it. */
export async function startListen(
  token: string,
  key: KbListenKey,
  signal?: AbortSignal,
): Promise<KbListenState> {
  return withBffPlay(
    await sendJson<KbListenState>("/app/listen/start", "POST", key, {
      token,
      signal,
    }),
  );
}

/** `POST /app/listen/update` → the state: Update audio (only new parts get made). */
export async function updateListen(
  token: string,
  key: KbListenKey,
  signal?: AbortSignal,
): Promise<KbListenState> {
  return withBffPlay(
    await sendJson<KbListenState>("/app/listen/update", "POST", key, {
      token,
      signal,
    }),
  );
}

/** `GET /app/listen/state` → the state; reads only. */
export async function getListenState(
  token: string,
  key: KbListenKey,
  signal?: AbortSignal,
): Promise<KbListenState> {
  return withBffPlay(
    await getJson<KbListenState>(`/app/listen/state?${keyQuery(key)}`, {
      token,
      signal,
    }),
  );
}

/** `PUT /app/listen/position` → `{listen, position}`; last write wins. */
export async function putListenPosition(
  token: string,
  body: KbListenPositionWrite,
  signal?: AbortSignal,
): Promise<{ listen: KbListenState["listen"]; position: KbListenPosition }> {
  return sendJson("/app/listen/position", "PUT", body, { token, signal });
}

/**
 * `GET|HEAD /app/listen/play/<path><search>` as the UNREAD `Response`, for the BFF
 * relay: `Range`/`If-Range` forwarded, `206` and `416` returned rather than thrown.
 * The caller validates `path` and passes the query string it was given, verbatim.
 */
export async function getListenPlay(
  token: string,
  path: string,
  search: string,
  options: {
    method?: "GET" | "HEAD";
    headers?: Record<string, string>;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  return getRaw(`${KB_PLAY}${path}${search}`, {
    token,
    method: options.method,
    headers: options.headers,
    signal: options.signal,
    pass: [416],
  });
}
