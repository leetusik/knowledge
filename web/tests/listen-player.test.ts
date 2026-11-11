import { describe, expect, it } from "vitest";

import type { KbListenState } from "@/lib/knowledge/listen";
import {
  initial,
  serverKey,
  step,
  switchList,
  type Machine,
  type MachineEvent,
} from "@/lib/listen/machine";

// P41-sr.W1 — the F19 state machine (`11-listen` frame.md F19; P41-sr.B1's F19 mapping).
// The transitions only: the element, the network and the server are the engine's.

type S = Pick<KbListenState, "state" | "waiting" | "len" | "failure">;
const server = (s: Partial<S>): S => ({
  state: "making",
  waiting: false,
  len: null,
  failure: null,
  ...s,
});

const run = (m: Machine, ...events: MachineEvent[]): Machine =>
  events.reduce(step, m);

describe("the server's state → F19 (B1's mapping)", () => {
  it("maps each making state to its key", () => {
    expect(serverKey(server({ waiting: true }))).toBe("waiting");
    expect(serverKey(server({}))).toBe("making");
    expect(serverKey(server({ len: 185 }))).toBe("ready");
    expect(serverKey(server({ state: "made", len: 2530 }))).toBe("made");
    expect(
      serverKey(
        server({
          state: "failed",
          failure: { kind: "voice", part: { n: 4, of: 12 } },
        }),
      ),
    ).toBe("fail-voice");
    expect(
      serverKey(
        server({
          state: "failed",
          failure: { kind: "unreadable", part: null },
        }),
      ),
    ).toBe("fail-unreadable");
    expect(serverKey(server({ state: "none" }))).toBe("none");
    expect(serverKey(server({ state: "unavailable" }))).toBe("unavailable");
  });

  it("moves an unmade Listen waiting → making → ready, and never plays before", () => {
    let m = run(initial("loading"), {
      t: "started",
      key: "waiting",
      attached: false,
    });
    expect(m.key).toBe("waiting");
    m = run(m, { t: "server", key: "making" });
    expect(m.key).toBe("making");
    m = run(m, { t: "server", key: "ready" });
    expect(m.key).toBe("ready");
    // A playing Listen is not the making's to move.
    expect(run(initial("playing"), { t: "server", key: "making" }).key).toBe(
      "playing",
    );
  });
});

describe("playback", () => {
  it("moves loading → playing → paused → finished", () => {
    let m = initial("loading");
    m = step(m, { t: "playing" });
    expect(m.key).toBe("playing");
    m = step(m, { t: "pause" });
    expect(m.key).toBe("paused");
    m = step(m, { t: "press" });
    expect(m.key).toBe("loading");
    m = run(m, { t: "playing" }, { t: "stall" });
    expect(m.key).toBe("buffering");
    m = run(m, { t: "playing" }, { t: "ended" });
    expect(m.key).toBe("finished");
  });

  it("reads a refused play() as tap, and a 401 as signed out", () => {
    expect(step(initial("loading"), { t: "rejected" }).key).toBe("tap");
    expect(step(initial("playing"), { t: "session" }).key).toBe("fail-session");
    expect(step(initial("playing"), { t: "error" }).key).toBe("fail-play");
  });

  it("reaches offline before, while and after playing", () => {
    expect(step(initial("making"), { t: "offline", loaded: 0 }).key).toBe(
      "offline-start",
    );
    const mid = step(initial("playing"), { t: "offline", loaded: 160 });
    expect(mid.key).toBe("offline-play");
    expect(step(mid, { t: "stall" }).key).toBe("offline-stopped");
    expect(step(initial("playing"), { t: "offline", loaded: 0 }).key).toBe(
      "offline-stopped",
    );
    expect(run(mid, { t: "online" }).key).toBe("playing");
    expect(
      run(initial("playing"), { t: "offline", loaded: 0 }, { t: "online" }).key,
    ).toBe("paused");
    expect(
      run(initial("making"), { t: "offline", loaded: 0 }, { t: "online" }).key,
    ).toBe("making");
  });
});

describe("a new play.list (the audio changed)", () => {
  it("never takes the source at ended or while sounding, only at a press", () => {
    expect(switchList("A", "B", "sounding")).toBe("later");
    // The stream ends with B pending: the machine finishes, the source stays A.
    expect(step(initial("playing"), { t: "ended" }).key).toBe("finished");
    expect(switchList("A", "B", "ended")).toBe("later");
    // Start over (a press) is where B takes it.
    expect(switchList("A", "B", "press")).toBe("now");
    expect(switchList("A", "A", "press")).toBe("same");
    expect(switchList(null, "B", "sounding")).toBe("now");
  });
});
