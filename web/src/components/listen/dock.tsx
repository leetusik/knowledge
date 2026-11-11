"use client";

import { LISTEN } from "@/content";
import type { Listen } from "@/lib/listen/types";
import { dockView } from "@/lib/listen/view";

import { Icon } from "./icons";

/**
 * P41-sr.W1 — the dock (`11-listen` F7; the `Dock` board): a capsule on the reader's bottom
 * slot, the column's two edges, from the first press until Stop listening. Grid: the lead
 * (a 44 px round button whose action follows the state; a disabled Play while nothing can
 * play), the text (the title on one line, the status with its state word in ink), the end
 * (the `open` chevron, whose hit area covers the capsule, or the one text action, Sign
 * in). A polite live region says the state and chapter changes, never the position.
 */
export function Dock({
  listen,
  onPlay,
  onPause,
  onStartOver,
  onRetry,
  onOpen,
  onSignIn,
}: {
  listen: Listen;
  onPlay: () => void;
  onPause: () => void;
  onStartOver: () => void;
  onRetry: () => void;
  onOpen: () => void;
  onSignIn: () => void;
}) {
  const D = LISTEN.dock;
  const v = dockView(listen);
  return (
    <section
      className="lx-dock"
      aria-label={D.region}
      data-state={listen.state}
    >
      {v.lead === "play" ? (
        <button
          type="button"
          className="lx-round lx-round--primary lx-dock__lead"
          aria-label={D.play}
          onClick={onPlay}
        >
          <Icon name="play" />
        </button>
      ) : null}
      {v.lead === "pause" ? (
        <button
          type="button"
          className="lx-round lx-round--primary lx-dock__lead"
          aria-label={D.pause}
          onClick={onPause}
        >
          <Icon name="pause" />
        </button>
      ) : null}
      {v.lead === "again" ? (
        <button
          type="button"
          className="lx-round lx-round--primary lx-dock__lead"
          aria-label={D.startOver}
          onClick={onStartOver}
        >
          <Icon name="again" />
        </button>
      ) : null}
      {v.lead === "retry" ? (
        <button
          type="button"
          className="lx-round lx-round--primary lx-dock__lead"
          aria-label={D.tryAgain}
          onClick={onRetry}
        >
          <Icon name="retry" />
        </button>
      ) : null}
      {v.lead === "off" ? (
        <button
          type="button"
          className="lx-round lx-dock__lead"
          aria-label={D.play}
          disabled
        >
          <Icon name="play" />
        </button>
      ) : null}
      <div className="lx-dock__text">
        <p className="lx-dock__title" lang={listen.lang}>
          {listen.title}
        </p>
        <p className="lx-dock__status">
          {v.busy ? <span className="lx-spin" aria-hidden="true" /> : null}
          <span className="lx-dock__line">
            <span
              className={
                v.revoked
                  ? "lx-dock__word lx-dock__word--revoked"
                  : "lx-dock__word"
              }
            >
              {v.word}
            </span>
            {v.rest ? ` · ${v.rest}` : null}
          </span>
        </p>
      </div>
      {v.open ? (
        <button
          type="button"
          className="lx-round lx-dock__open"
          aria-label={D.open}
          aria-haspopup="dialog"
          onClick={onOpen}
        >
          <Icon name="open" />
        </button>
      ) : null}
      {v.signIn ? (
        <button
          type="button"
          className="rd-btn rd-btn--primary lx-dock__act"
          onClick={onSignIn}
        >
          {D.signIn}
        </button>
      ) : null}
      <span className="lx-sr" role="status">
        {v.say}
      </span>
    </section>
  );
}
