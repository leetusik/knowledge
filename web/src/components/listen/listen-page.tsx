"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type RefObject,
} from "react";

import { LISTEN } from "@/content";
import { mapSegments, readablesOf, type ReadableEl } from "@/lib/listen/follow";
import { clockPos, lengthWords } from "@/lib/listen/format";
import { noteKey, type ListenKey } from "@/lib/listen/machine";
import { listenActions, useListen } from "@/lib/listen/store";
import type { Listen, ListenSeed } from "@/lib/listen/types";
import { noteView } from "@/lib/listen/view";

import { Dock } from "./dock";
import { ListenControl } from "./listen-control";
import { ListenNote } from "./listen-note";

/**
 * P41-sr.W1 — Listen on a reader page (`11-listen` page `reader`): the head's slot under
 * the meta line, the bottom slot (the pill or the dock) and follow along. The page hands
 * its seed (key, words, the state read at load) down through `ListenPageContext`; the
 * docked Listen itself is the store's, so it outlives the page.
 */
export interface ListenPageValue {
  seed: ListenSeed;
  /** `org/project/doc`: the head compares it with the docked Listen's. */
  unit: string;
  /** Registers the head's slot with the frame, which measures it: the pill shows once it is under the top bar. */
  setHead: (el: HTMLDivElement | null) => void;
}

export const ListenPageContext = createContext<ListenPageValue | null>(null);

export function unitOfSeed(seed: ListenSeed): string {
  return `${seed.key.org}/${seed.key.project}/${seed.key.doc}`;
}

/** Left part-way (or kept by Stop listening, F17): where Continue listening goes on from. */
function resumeOf(seed: ListenSeed): { pos: number; len: number } | null {
  const s = seed.state;
  const p = s.position;
  if (!p || s.len === null || s.len <= 0) return null;
  if (p.seconds < 1 || p.seconds >= s.len - 1) return null;
  return { pos: p.seconds, len: s.len };
}

/** The head's (and the pill's) Listen for a page with no Listen of its own docked (F6, F27). */
function controlOf(seed: ListenSeed): {
  form: "doc" | "resume";
  q: string;
  pillQ: string;
  from: number;
} {
  const r = resumeOf(seed);
  if (r) {
    return {
      form: "resume",
      q: LISTEN.control.resumeQ(clockPos(r.pos), clockPos(r.len)),
      pillQ: clockPos(r.pos),
      from: r.pos,
    };
  }
  // A document's length only once made (F2: a unit not yet made shows no length).
  const made =
    seed.state.state === "made" && seed.state.len
      ? lengthWords(seed.state.len)
      : "";
  return { form: "doc", q: made, pillQ: made, from: 0 };
}

/**
 * The head's slot (`.rx-listen`), after the meta line. No Listen of this unit: the Listen
 * control. This unit's Listen loading: the control, busy. Any other state: the note, with
 * the dock's data and without its action (the dock carries it), Update audio excepted
 * (F25). From the press until Stop listening the slot holds the unit's tallest note
 * (hidden copies in one grid cell), so no change the reader did not ask for moves the
 * text under it (F27, reader-G4).
 */
export function ListenHead() {
  const page = useContext(ListenPageContext);
  const listen = useListen();
  if (!page) return null;
  const { seed, setHead } = page;
  const mine = !!listen && listen.unit === page.unit;
  const ctl = controlOf(seed);
  const press = (from: number) => listenActions.start(seed, from);
  if (!mine || !listen) {
    return (
      <div className="rx-listen" lang="en" ref={setHead}>
        <div className="rx-listen__live">
          <ListenControl
            form={ctl.form}
            q={ctl.q}
            onListen={() => press(ctl.from)}
            onStartOver={() => press(0)}
          />
        </div>
      </div>
    );
  }
  const key = noteKey(listen.state, listen.old);
  return (
    <div className="rx-listen rx-listen--held" lang="en" ref={setHead}>
      <div className="rx-listen__live">
        {listen.state === "loading" ? (
          <ListenControl
            form="doc"
            q={ctl.form === "doc" ? ctl.q : ""}
            busy
            onListen={() => {}}
          />
        ) : (
          <ListenNote
            state={key}
            view={noteView(listen, key)}
            act={key === "outdated" || key === "fail-limit"}
            updating={listen.updating}
            onPlay={listenActions.play}
            onRetry={listenActions.retry}
            onStartOver={listenActions.startOver}
            onUpdate={listenActions.update}
          />
        )}
      </div>
      <div className="rx-listen__hold" aria-hidden="true" inert>
        <ListenNote
          state="fail-voice"
          view={noteView(listen, "fail-voice")}
          act={false}
        />
        <ListenNote
          state="fail-limit"
          view={noteView(listen, "fail-limit", {
            ready: listen.len ? lengthWords(listen.len) : lengthWords(14 * 60),
          })}
        />
        <ListenNote
          state="offline-stopped"
          view={noteView(listen, "offline-stopped")}
          act={false}
        />
      </div>
    </div>
  );
}

/** The slot's classes; a chapter's slot sits above the chapter bar. */
function slotClass(base: string, chapter: boolean): string {
  return chapter ? `${base} lx-slot--chapter` : base;
}

/**
 * The bottom slot (F6, F7): a Listen docked → the dock, on the column's track (above the
 * chapter bar on a chapter); else, with the chrome up and the head's Listen under the top
 * bar, the pill (the frame decides `pill`).
 */
export function ListenSlot({
  chapter,
  pill,
  signInHref,
}: {
  chapter: boolean;
  pill: boolean;
  signInHref: string;
}) {
  const page = useContext(ListenPageContext);
  const listen = useListen();
  if (listen) {
    return (
      <div className={slotClass("lx-slot rd-flow", chapter)}>
        <Dock
          listen={listen}
          onPlay={listenActions.play}
          onPause={listenActions.pause}
          onStartOver={listenActions.startOver}
          onRetry={listenActions.retry}
          onOpen={listenActions.openPlayer}
          onSignIn={() => window.location.assign(signInHref)}
        />
      </div>
    );
  }
  if (!page || !pill) return null;
  const ctl = controlOf(page.seed);
  return (
    <div className={slotClass("lx-slot lx-slot--pill", chapter)}>
      <ListenControl
        slot
        form={ctl.form}
        q={ctl.pillQ}
        onListen={() => listenActions.start(page.seed, ctl.from)}
      />
    </div>
  );
}

/** The states in which the follow-along mark shows (F12: playing, paused, buffering, offline playing). */
const FOLLOWS: readonly ListenKey[] = [
  "playing",
  "paused",
  "buffering",
  "offline-play",
];

function marked(listen: Listen | null, unit: string | null): boolean {
  return (
    !!listen &&
    !!unit &&
    listen.unit === unit &&
    listen.follow &&
    listen.seg >= 0 &&
    FOLLOWS.includes(listen.state)
  );
}

/**
 * Follow along (F12): a 3 px accent rule in the column's start margin beside the block the
 * voice reads (`.lx-follow`): the title while the opening is read, then the block the
 * playing segment carries (`@/lib/listen/follow` maps the id-less ones). It moves nothing
 * and never scrolls the page.
 */
export function useFollowAlong(
  rootRef: RefObject<HTMLElement | null>,
  unit: string | null,
): void {
  const listen = useListen();
  const on = marked(listen, unit);
  const segs = on && listen ? listen.segs : null;
  const seg = on && listen ? listen.seg : -1;
  const cache = useRef<{
    segs: unknown;
    items: ReadableEl[];
    map: number[];
  } | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !segs || seg < 0) return;
    let c = cache.current;
    if (!c || c.segs !== segs) {
      const items = readablesOf(root);
      c = {
        segs,
        items,
        map: mapSegments(
          segs.map((s) => s.block),
          items,
        ),
      };
      cache.current = c;
    }
    const el = c.items[c.map[seg] ?? -1]?.el ?? null;
    if (!el) return;
    el.classList.add("lx-follow");
    return () => el.classList.remove("lx-follow");
  }, [rootRef, segs, seg]);
}
