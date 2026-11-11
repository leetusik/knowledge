import type {
  KbListenPlay,
  KbListenState,
  KbListenTimelineSegment,
} from "@/lib/knowledge/listen";

import type { ListenKey } from "./machine";

// P41-sr.W1 — the carried Listen (`11-listen` F19 + F23) as the client holds it. Types
// only: `@/lib/knowledge/listen` is server-only, and a type import is erased.

/** A document Listen's key (P41-sr.B1 § The Listen key). W2 adds the book form. */
export interface ListenDocKey {
  /** The org slug, or the tenant id for a tenant without one. */
  org: string;
  project: string;
  /** The document stem `<date>-<slug>`. */
  doc: string;
}

/** What a reader page hands the player: its key, its words and the state read at load. */
export interface ListenSeed {
  key: ListenDocKey;
  title: string;
  lang: string;
  state: KbListenState;
}

/** The one Listen of the page (null when nothing is docked). */
export interface Listen {
  /** `org/project/doc`: what the head compares to tell "this unit's Listen" (F27). */
  unit: string;
  key: ListenDocKey;
  /** W2 adds `"book"`. */
  kind: "doc";
  title: string;
  lang: string;
  /** F19's key. */
  state: ListenKey;
  /** Where `offline-start` returns to. */
  back: ListenKey | null;
  /** An earlier version plays (F10 "Earlier version"). */
  old: boolean;
  /** Update audio was pressed, or the current version is being made under an earlier one. */
  updating: boolean;
  /** Not everything is made: `len` is the playable prefix (`2:10 of 9:40 so far`). */
  soFar: boolean;
  /** The playable length in seconds; null while nothing is made (F2: no length). */
  len: number | null;
  /** The position in seconds (audio time, F3). */
  pos: number;
  /** The part being made, or where the voice stopped. */
  part: { n: number; of: number } | null;
  /** The parts of the playing unit, and how many are made (F9's line). */
  parts: number;
  partsMade: number;
  /** About how long the making still takes, in seconds. */
  left: number | null;
  /** When the runner last called (members only), ISO. */
  seen: string | null;
  /** Seconds buffered ahead of the position (F10 "Offline · 2:40 loaded"). */
  loaded: number;
  /** Where playback stopped (offline, a dropped connection). */
  stoppedAt: number | null;
  /** The listener's own, kept from one Listen to the next (F3). */
  speed: number;
  follow: boolean;
  /** Where it plays (BFF paths); null before the unit exists. */
  play: KbListenPlay | null;
  /** Follow along: the playing unit's spoken segments, and the one being read (-1: none). */
  segs: KbListenTimelineSegment[];
  seg: number;
}
