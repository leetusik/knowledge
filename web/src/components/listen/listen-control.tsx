"use client";

import { useId } from "react";

import { LISTEN } from "@/content";

import { Icon } from "./icons";

/**
 * P41-sr.W1 — the Listen control (`11-listen` F6, F27; the `Listen` board): in the head, a
 * secondary button (the play mark in accent and the word) with its qualifier in meta type
 * beside it as its description; pressed, it reads "Starting…" in its rest width until the
 * dock answers. Left part-way it is "Continue listening" with Start over as a text action
 * on its own row. In the bottom slot (`slot`) it is the pill, one 44 px button:
 * "▶ Listen · 42 min", or "▶ Continue listening · 18:05".
 */
export function ListenControl({
  form,
  q,
  busy = false,
  slot = false,
  onListen,
  onStartOver,
}: {
  form: "doc" | "chapter" | "book" | "resume";
  /** The qualifier; empty for none (a document not made yet shows no length, F2). */
  q: string;
  busy?: boolean;
  slot?: boolean;
  onListen: () => void;
  onStartOver?: () => void;
}) {
  const qId = useId();
  const resume = form === "resume";
  const C = LISTEN.control;
  if (slot) {
    return (
      <button type="button" className="lx-pill" onClick={onListen}>
        <Icon name="play" size="s" />
        <span>{resume ? C.continue : C.listen}</span>
        {q ? <span className="lx-pill__q">{C.pillQ(q)}</span> : null}
      </button>
    );
  }
  const press = () => {
    if (!busy) onListen();
  };
  return (
    <div className="lx-listen">
      {resume ? (
        <button
          type="button"
          className="rd-btn rd-btn--secondary"
          aria-describedby={q ? qId : undefined}
          onClick={press}
        >
          <Icon name="play" size="s" />
          {C.continue}
        </button>
      ) : (
        <button
          type="button"
          className="rd-btn rd-btn--secondary"
          aria-busy={busy}
          aria-describedby={q ? qId : undefined}
          onClick={press}
        >
          <span className="lx-labels">
            <span className={busy ? "is-off" : undefined}>
              <Icon name="play" size="s" />
              {C.listen}
            </span>
            <span className={busy ? undefined : "is-off"} aria-hidden={!busy}>
              <span className="lx-spin" aria-hidden="true" />
              {C.starting}
            </span>
          </span>
        </button>
      )}
      {q ? (
        <span className="lx-listen__q" id={qId}>
          {q}
        </span>
      ) : null}
      {resume ? (
        <span className="lx-listen__over">
          <button type="button" className="lx-over" onClick={onStartOver}>
            {C.startOver}
          </button>
        </span>
      ) : null}
    </div>
  );
}
