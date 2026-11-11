import type HlsType from "hls.js";
import type { ErrorData } from "hls.js";

import type {
  KbListenPlay,
  KbListenState,
  KbListenTimeline,
} from "@/lib/knowledge/listen";

import { listenRead, listenSave, listenStart, listenUpdate } from "./actions";
import { segmentAt } from "./follow";
import {
  polls,
  serverKey,
  step,
  switchList,
  type ListenKey,
  type MachineEvent,
} from "./machine";
import { getListen, patchListen, setListen, type ListenEngine } from "./store";
import type { Listen, ListenSeed } from "./types";

// P41-sr.W1 — the player's engine: the one `<audio>` element of the page, created by the
// persistent host (`ListenHost`, mounted above the routes from the root layout), and
// everything that moves a Listen (`11-listen` F19, F33; P41-sr.R3).
//
//  - Native HLS where the element says it plays `application/vnd.apple.mpegurl`; else
//    hls.js (its light build, loaded only then, no worker: a blob worker would fall to
//    the reader's `script-src`). One source per Listen, `play.playlist`, attached once
//    `len` is set; its EVENT form grows under the same URL while the making goes on.
//  - The F19 machine (`./machine`): the server's keys from P41-sr.B1's mapping, every
//    playback key from the element's events and the presses.
//  - A new `play.list` (the audio changed) never takes the source at `ended` or under a
//    sounding element: it waits for a press (Play, Start over, Try again), R3's rule.
//  - The state is polled while the making moves (6 s visible, 30 s hidden); the timeline
//    is re-read while it is incomplete; Media Session carries the lock screen; the
//    position is saved about every 15 s while playing, on pause and on seek, and a
//    `pagehide` beacon posts the last one.

const HLS_TYPE = "application/vnd.apple.mpegurl";
const POLL_MS = 6000;
const POLL_HIDDEN_MS = 30000;
const SAVE_MS = 15000;
const SKIP = 15;
const MAX_SECONDS = 14400;

type HlsClass = typeof HlsType;

const SOUNDING: readonly ListenKey[] = [
  "loading",
  "playing",
  "buffering",
  "offline-play",
];

function unitOf(key: ListenSeed["key"]): string {
  return `${key.org}/${key.project}/${key.doc}`;
}

function clampSeconds(t: number): number {
  return Math.min(MAX_SECONDS, Math.max(0, Math.round(t * 1000) / 1000));
}

export function createEngine(
  audio: HTMLAudioElement,
): ListenEngine & { destroy(): void } {
  let Hls: HlsClass | null = null;
  let hlsLoading: Promise<HlsClass | null> | null = null;
  let hls: HlsType | null = null;
  let recovered = false;
  /** The list the element plays, and a newer one waiting for a press. */
  let attached: string | null = null;
  let pending: KbListenPlay | null = null;
  /** The element cannot simply resume (a fault, offline, the session): the next press re-attaches. */
  let broken = false;
  /** Where a native source starts once its metadata is in. */
  let startAt = 0;
  let timeline: KbListenTimeline | null = null;
  let timelineBusy = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let lastSave = 0;
  let lastPositionState = 0;
  /** A send id: an answer lands only if no newer press was made since. */
  let sid = 0;
  /** The last press's seed, for a press made offline. */
  let lastSeed: { seed: ListenSeed; from: number } | null = null;
  const offs: (() => void)[] = [];

  const native = (): boolean => audio.canPlayType(HLS_TYPE) !== "";
  const loadHls = (): Promise<HlsClass | null> => {
    hlsLoading ??= import("hls.js/light")
      .then((m) => (m.default.isSupported() ? (Hls = m.default) : null))
      .catch(() => null);
    return hlsLoading;
  };
  // Ready before the first press, so the press can attach and play inside its gesture.
  if (!native()) void loadHls();

  // ---- the machine -----------------------------------------------------------------
  function mach(e: MachineEvent): void {
    const l = getListen();
    if (!l) return;
    const next = step({ key: l.state, back: l.back }, e);
    if (next.key === l.state && next.back === l.back) return;
    const patch: Partial<Listen> = { state: next.key, back: next.back };
    const stops =
      next.key === "offline-stopped" ||
      next.key === "fail-play" ||
      next.key === "fail-session";
    if (stops) {
      patch.stoppedAt = attached ? audio.currentTime : l.pos;
      broken = true;
    }
    patchListen(patch);
    if (stops && !audio.paused) audio.pause();
    mediaState();
    schedule();
  }

  // ---- the source --------------------------------------------------------------------
  function ahead(): number {
    const t = audio.currentTime;
    const b = audio.buffered;
    for (let i = 0; i < b.length; i += 1) {
      if (b.start(i) <= t + 0.25 && t <= b.end(i)) return b.end(i) - t;
    }
    return 0;
  }

  function detach(): void {
    if (hls) {
      hls.destroy();
      hls = null;
    }
    if (audio.getAttribute("src") !== null) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    attached = null;
  }

  function hlsAttach(H: HlsClass, url: string, at: number): void {
    recovered = false;
    hls = new H({
      enableWorker: false,
      startPosition: at,
      lowLatencyMode: false,
      backBufferLength: 90,
    });
    hls.on(H.Events.ERROR, (_e, data) => onHlsError(data));
    hls.loadSource(url);
    hls.attachMedia(audio);
  }

  /** Attach a source at `at` seconds; with `sound`, play it (in the press's gesture when synchronous). */
  function attach(play: KbListenPlay, at: number, sound: boolean): void {
    detach();
    broken = false;
    attached = play.list;
    const speed = getListen()?.speed ?? 1;
    if (native()) {
      startAt = at;
      audio.src = play.playlist;
      audio.defaultPlaybackRate = speed;
      audio.playbackRate = speed;
      if (sound) playNow();
      return;
    }
    if (Hls) {
      hlsAttach(Hls, play.playlist, at);
      audio.defaultPlaybackRate = speed;
      audio.playbackRate = speed;
      if (sound) playNow();
      return;
    }
    // hls.js still loading (rare: the press came first). A refusal after it reads `tap`.
    void loadHls().then((H) => {
      if (attached !== play.list) return;
      if (!H) {
        mach({ t: "error" });
        return;
      }
      hlsAttach(H, play.playlist, at);
      audio.defaultPlaybackRate = speed;
      audio.playbackRate = speed;
      if (sound) playNow();
    });
  }

  function playNow(): void {
    const p = audio.play();
    if (!p) return;
    p.catch((err: unknown) => {
      const name = (err as { name?: string } | null)?.name;
      if (name === "NotAllowedError") mach({ t: "rejected" });
      else if (name === "AbortError") return;
      else void fault();
    });
  }

  /** A fault the element or hls.js could not get past: offline, the session, or a dropped connection. */
  async function fault(): Promise<void> {
    const l = getListen();
    if (!l) return;
    broken = true;
    if (!navigator.onLine) {
      offline();
      return;
    }
    const unit = l.unit;
    const res = await listenRead(l.key);
    if (getListen()?.unit !== unit) return;
    mach(!res.ok && res.status === 401 ? { t: "session" } : { t: "error" });
  }

  function onHlsError(data: ErrorData): void {
    if (!data.fatal) return;
    if (data.type === "mediaError" && !recovered && hls) {
      recovered = true;
      hls.recoverMediaError();
      return;
    }
    hls?.stopLoad();
    broken = true;
    const code = (data.response as { code?: number } | undefined)?.code;
    if (code === 401) mach({ t: "session" });
    else void fault();
  }

  function offline(): void {
    const l = getListen();
    if (!l) return;
    if (l.state === "offline-play") mach({ t: "stall" });
    else mach({ t: "offline", loaded: attached ? ahead() : 0 });
  }

  // ---- the server ----------------------------------------------------------------------
  /** A server answer's data (not the key): lengths, the making, where it plays. */
  function absorb(s: KbListenState): void {
    const l = getListen();
    if (!l) return;
    const fp = s.failure?.part ?? null;
    const part = fp
      ? { n: fp.n, of: fp.of }
      : s.part
        ? { n: s.part.n, of: s.part.of }
        : l.part;
    const patch: Partial<Listen> = {
      old: s.old,
      updating: s.updating || (l.updating && s.old),
      soFar: s.so_far,
      len: s.len,
      part,
      parts: s.made.of || l.parts,
      partsMade: s.made.parts,
      left: s.left_seconds,
      seen: s.runner_last_seen,
    };
    if (s.play) {
      const verdict = switchList(attached, s.play.list, "sounding");
      if (verdict === "now") patch.play = s.play;
      else if (verdict === "later") pending = s.play;
      else pending = null;
    }
    patchListen(patch);
    const now = getListen();
    if (now)
      void readTimeline(attached ? now.play : (s.play ?? now.play), s.len);
  }

  function schedule(): void {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
    const l = getListen();
    if (!l || !polls(l.state, l.soFar, l.updating)) return;
    pollTimer = setTimeout(
      () => void poll(),
      document.visibilityState === "hidden" ? POLL_HIDDEN_MS : POLL_MS,
    );
  }

  async function poll(): Promise<void> {
    const l = getListen();
    if (!l) return;
    const unit = l.unit;
    if (!navigator.onLine) {
      schedule();
      return;
    }
    const res = await listenRead(l.key);
    if (getListen()?.unit !== unit) return;
    if (res.ok) answer(res.state);
    else if (res.status === 401) mach({ t: "session" });
    schedule();
  }

  /** A poll's or an update's answer: the data, then the key; made in full while waiting starts it. */
  function answer(s: KbListenState): void {
    const before = getListen()?.state;
    absorb(s);
    mach({ t: "server", key: serverKey(s) });
    const l = getListen();
    if (l && before !== "loading" && l.state === "loading" && l.play) {
      attach(l.play, l.pos, true);
    }
  }

  async function readTimeline(
    play: KbListenPlay | null,
    len: number | null,
  ): Promise<void> {
    if (!play || timelineBusy) return;
    if (
      timeline &&
      timeline.list === play.list &&
      (timeline.complete || timeline.len >= (len ?? 0) - 0.01)
    ) {
      return;
    }
    timelineBusy = true;
    try {
      const res = await fetch(play.timeline, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const next = (await res.json()) as KbListenTimeline;
      timeline = next;
      const l = getListen();
      if (!l || l.play?.list !== next.list) return;
      const segs = next.entries[0]?.segments ?? [];
      patchListen({
        segs,
        seg: segmentAt(segs, attached ? audio.currentTime : l.pos),
      });
    } catch {
      // the next poll reads it again
    } finally {
      timelineBusy = false;
    }
  }

  // ---- the position ----------------------------------------------------------------------
  function save(force: boolean): void {
    const l = getListen();
    if (!l || !attached) return;
    const now = Date.now();
    if (!force && now - lastSave < SAVE_MS) return;
    lastSave = now;
    void listenSave({
      ...l.key,
      seconds: clampSeconds(audio.currentTime),
      speed: l.speed,
      follow: l.follow,
    })
      .then((res) => {
        // Made parts play on without the session (their keys are the capability), so
        // the save is where an expired session shows first: say it, rather than play on
        // with the position no longer kept (F19 fail-session).
        if (!res.ok && res.status === 401 && getListen()?.unit === l.unit) {
          mach({ t: "session" });
        }
      })
      .catch(() => {});
  }

  function beacon(): void {
    const l = getListen();
    if (!l || !attached) return;
    try {
      navigator.sendBeacon(
        "/api/listen/position",
        JSON.stringify({
          ...l.key,
          seconds: clampSeconds(audio.currentTime),
          speed: l.speed,
          follow: l.follow,
        }),
      );
    } catch {
      // a beacon is best effort
    }
  }

  function tick(): void {
    const l = getListen();
    if (!l || !attached) return;
    const t = audio.currentTime;
    const seg = segmentAt(l.segs, t);
    const loaded = ahead();
    if (
      Math.floor(t) !== Math.floor(l.pos) ||
      seg !== l.seg ||
      Math.floor(loaded) !== Math.floor(l.loaded)
    ) {
      patchListen({ pos: t, seg, loaded });
    }
    if (l.state === "playing") save(false);
    if (Date.now() - lastPositionState > 5000) positionState();
  }

  // ---- Media Session (the lock screen) ------------------------------------------------------
  function session(): void {
    const ms =
      typeof navigator !== "undefined" ? navigator.mediaSession : undefined;
    const l = getListen();
    if (!ms || !l) return;
    try {
      ms.metadata = new MediaMetadata({ title: l.title, album: l.title });
    } catch {
      // no metadata here
    }
    const set = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null,
    ) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // an action this browser does not know
      }
    };
    // ±15 s (F4), the lock screen's own skip; never previous/next beside it (R3).
    set("play", () => engine.play());
    set("pause", () => engine.pause());
    set("seekbackward", () => engine.seek(audio.currentTime - SKIP));
    set("seekforward", () => engine.seek(audio.currentTime + SKIP));
    set("seekto", (d) => {
      if (typeof d.seekTime === "number") engine.seek(d.seekTime);
    });
    set("previoustrack", null);
    set("nexttrack", null);
  }

  function positionState(): void {
    const ms = navigator.mediaSession;
    const l = getListen();
    if (!ms?.setPositionState || !l || !attached) return;
    lastPositionState = Date.now();
    const position = audio.currentTime;
    const duration = Math.max(l.len ?? 0, position);
    if (!(duration > 0)) return;
    try {
      ms.setPositionState({
        duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(position, duration),
      });
    } catch {
      // an inconsistent moment (a seek in flight); the next tick sets it
    }
  }

  function mediaState(): void {
    const ms = navigator.mediaSession;
    const l = getListen();
    if (!ms) return;
    ms.playbackState = !l
      ? "none"
      : l.state === "playing" ||
          l.state === "buffering" ||
          l.state === "offline-play"
        ? "playing"
        : attached
          ? "paused"
          : "none";
  }

  // ---- the element's events --------------------------------------------------------------
  const on = (name: string, fn: () => void, target: EventTarget = audio) => {
    target.addEventListener(name, fn);
    offs.push(() => target.removeEventListener(name, fn));
  };
  on("loadedmetadata", () => {
    if (startAt > 0 && !hls) {
      try {
        audio.currentTime = startAt;
      } catch {
        // seeked once seekable
      }
    }
    startAt = 0;
  });
  on("playing", () => {
    mach({ t: "playing" });
    // iOS forgets handlers registered before the element is Now Playing: set them on every `playing` (R3).
    session();
    positionState();
  });
  on("waiting", () => {
    if (!navigator.onLine) offline();
    else mach({ t: "stall" });
  });
  on("pause", () => {
    const l = getListen();
    if (!l || audio.ended || !attached) return;
    if (
      l.state === "playing" ||
      l.state === "buffering" ||
      l.state === "offline-play"
    ) {
      mach({ t: "pause" });
      save(true);
    }
    mediaState();
  });
  on("ended", () => {
    // The end of the stream: never a source swap here (R3), whatever is pending.
    const l = getListen();
    if (!l) return;
    patchListen({ pos: audio.currentTime });
    mach({ t: "ended" });
    save(true);
  });
  on("timeupdate", tick);
  on("progress", tick);
  on("seeked", () => {
    tick();
    save(true);
    positionState();
  });
  on("ratechange", positionState);
  on("error", () => {
    if (hls || !attached) return;
    void fault();
  });
  on("offline", offline, window);
  on(
    "online",
    () => {
      const l = getListen();
      if (!l) return;
      const was = l.state;
      mach({ t: "online" });
      if (was !== "offline-start") return;
      // "Listen can start once you're back online" (F10): a press made offline goes on now.
      const cur = getListen();
      if (
        cur?.state === "loading" &&
        !attached &&
        lastSeed &&
        unitOf(lastSeed.seed.key) === cur.unit
      ) {
        engine.start(lastSeed.seed, lastSeed.from);
      } else {
        void poll();
      }
    },
    window,
  );
  on("pagehide", beacon, window);
  on(
    "visibilitychange",
    () => {
      if (document.visibilityState === "hidden") beacon();
      schedule();
    },
    document,
  );

  // ---- the presses -----------------------------------------------------------------------
  const engine: ListenEngine & { destroy(): void } = {
    start(seed: ListenSeed, from: number) {
      sid += 1;
      const my = sid;
      lastSeed = { seed, from };
      const prev = getListen();
      if (prev && attached) save(true);
      detach();
      pending = null;
      timeline = null;
      const s = seed.state;
      const fp = s.failure?.part ?? null;
      const l: Listen = {
        unit: unitOf(seed.key),
        key: seed.key,
        kind: "doc",
        title: seed.title,
        lang: seed.lang,
        state: "loading",
        back: null,
        old: s.old,
        updating: s.updating,
        soFar: s.so_far,
        len: s.len,
        pos: from,
        part: fp
          ? { n: fp.n, of: fp.of }
          : s.part
            ? { n: s.part.n, of: s.part.of }
            : null,
        parts: s.made.of,
        partsMade: s.made.parts,
        left: s.left_seconds,
        seen: s.runner_last_seen,
        loaded: 0,
        stoppedAt: null,
        // F3: the listener's speed and follow along carry from one Listen to the next.
        speed: prev?.speed ?? s.speed,
        follow: prev?.follow ?? s.follow,
        play: s.play,
        segs: [],
        seg: -1,
      };
      setListen(l);
      mediaState();
      if (!navigator.onLine) {
        mach({ t: "offline", loaded: 0 });
        return;
      }
      // Playable now (made, or its first part): sound it inside the press (iOS, R3).
      if (s.play && s.len !== null && s.len > 0) attach(s.play, from, true);
      void listenStart(seed.key).then((res) => {
        if (my !== sid) return;
        if (!res.ok) {
          if (res.status === 401) mach({ t: "session" });
          else if (!attached) mach({ t: "error" });
          return;
        }
        absorb(res.state);
        mach({
          t: "started",
          key: serverKey(res.state),
          attached: attached !== null,
        });
        const cur = getListen();
        if (
          cur &&
          cur.state === "loading" &&
          !attached &&
          cur.play &&
          (cur.len ?? 0) > 0
        ) {
          attach(cur.play, cur.pos, true);
        }
        schedule();
      });
    },

    play() {
      const l = getListen();
      if (!l) return;
      if (l.state === "finished") {
        engine.startOver();
        return;
      }
      if (!navigator.onLine) {
        offline();
        return;
      }
      if (pending) {
        // The audio changed (Update audio landed): it takes the source now, at a press.
        const next = pending;
        pending = null;
        timeline = null;
        patchListen({ play: next, segs: [], seg: -1 });
        mach({ t: "press" });
        attach(next, l.pos, true);
        void readTimeline(next, l.len);
        return;
      }
      if (!l.play) return;
      if (!attached || broken) {
        mach({ t: "press" });
        attach(l.play, l.stoppedAt ?? l.pos, true);
        void readTimeline(l.play, l.len);
        return;
      }
      if (l.state === "ready" || l.state === "tap") mach({ t: "press" });
      playNow();
    },

    pause() {
      const l = getListen();
      if (!l) return;
      if (!audio.paused) audio.pause();
      if (SOUNDING.includes(l.state)) {
        mach({ t: "pause" });
        save(true);
      }
    },

    retry() {
      const l = getListen();
      if (!l) return;
      if (l.state === "fail-voice" || l.state === "fail-unreadable") {
        sid += 1;
        const my = sid;
        mach({ t: "remake" });
        void listenStart(l.key).then((res) => {
          if (my !== sid) return;
          if (res.ok) answer(res.state);
          else if (res.status === 401) mach({ t: "session" });
          schedule();
        });
        return;
      }
      const next = pending ?? l.play;
      if (!next) return;
      pending = null;
      if (next !== l.play) patchListen({ play: next, segs: [], seg: -1 });
      mach({ t: "press" });
      attach(next, l.stoppedAt ?? l.pos, true);
      void readTimeline(next, l.len);
    },

    startOver() {
      const l = getListen();
      if (!l) return;
      const next = pending ?? l.play;
      if (!next) return;
      pending = null;
      patchListen({ pos: 0, stoppedAt: null, play: next });
      mach({ t: "press" });
      if (attached === next.list && !broken) {
        audio.currentTime = 0;
        playNow();
      } else {
        attach(next, 0, true);
        void readTimeline(next, l.len);
      }
    },

    update() {
      const l = getListen();
      if (!l) return;
      patchListen({ updating: true });
      const unit = l.unit;
      void listenUpdate(l.key).then((res) => {
        if (getListen()?.unit !== unit) return;
        if (res.ok) answer(res.state);
        else if (res.status === 401) mach({ t: "session" });
        else patchListen({ updating: false });
        schedule();
      });
    },

    seek(seconds: number) {
      const l = getListen();
      if (!l) return;
      const max = l.len ?? Number.POSITIVE_INFINITY;
      const t = Math.max(0, Math.min(seconds, max));
      if (!attached || broken) {
        patchListen({ pos: t, stoppedAt: null });
        return;
      }
      audio.currentTime = t;
    },

    destroy() {
      for (const off of offs.splice(0)) off();
      if (pollTimer) clearTimeout(pollTimer);
      pollTimer = null;
      const l = getListen();
      if (l && attached) {
        save(true);
        beacon();
      }
      detach();
      // Off the reader's paths the element is gone: the Listen waits, paused, for the next press.
      if (l && SOUNDING.includes(l.state)) {
        setListen({ ...l, state: "paused", back: null, pos: l.pos });
      }
      broken = true;
      const ms = navigator.mediaSession;
      if (ms) {
        ms.playbackState = "none";
        for (const a of [
          "play",
          "pause",
          "seekbackward",
          "seekforward",
          "seekto",
        ] as MediaSessionAction[]) {
          try {
            ms.setActionHandler(a, null);
          } catch {
            // unknown action
          }
        }
      }
    },
  };

  // A Listen carried over from an earlier host (back on a reader path): poll if its making moves.
  if (getListen()) {
    broken = true;
    schedule();
  }
  return engine;
}
