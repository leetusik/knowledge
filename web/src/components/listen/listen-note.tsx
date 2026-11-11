"use client";

import { LISTEN } from "@/content";
import type { NoteKey } from "@/lib/listen/machine";
import type { NoteView } from "@/lib/listen/view";

import { Icon } from "./icons";

/**
 * P41-sr.W1 — the note (`11-listen` F10, F24, F25; the `ListenNote` board): the state word
 * in the README's trio (dot and word; the ring in place of the dot while pending), one
 * sentence, the 3 px progress line where it applies (F9), the reference line in mono for
 * the two failures on our side, and its one action.
 *
 * `act` (F25): false where a carrier (the dock, the player's transport) has the action, so
 * the note shows its word and sentence alone. `tone` (F25): the action is the accent
 * button (`primary`), or `secondary` where another accent already carries the page (Update
 * audio in the player).
 */
export function ListenNote({
  state,
  view,
  act = true,
  tone = "primary",
  updating = false,
  onPlay,
  onRetry,
  onStartOver,
  onSignIn,
  onUpdate,
}: {
  state: NoteKey;
  view: NoteView;
  act?: boolean;
  tone?: "primary" | "secondary";
  updating?: boolean;
  onPlay?: () => void;
  onRetry?: () => void;
  onStartOver?: () => void;
  onSignIn?: () => void;
  onUpdate?: () => void;
}) {
  const N = LISTEN.note;
  const btn = `rd-btn rd-btn--${tone}`;
  const a = act ? view.action : "";
  const status = [
    "lx-status",
    `lx-status--${view.trio}`,
    view.busy ? "lx-status--busy" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="lx-note" data-state={state}>
      <p className={status}>
        {view.busy ? <span className="lx-spin" aria-hidden="true" /> : null}
        {view.word}
      </p>
      {view.text ? <p className="lx-note__text">{view.text}</p> : null}
      {view.line !== null ? (
        <span
          className="lx-prog"
          role="progressbar"
          aria-label={view.lineLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={view.line}
        >
          <span className="lx-prog__fill" style={{ width: `${view.line}%` }} />
        </span>
      ) : null}
      {view.ref ? <p className="lx-note__ref">{view.ref}</p> : null}
      {a === "play" ? (
        <button type="button" className={btn} onClick={onPlay}>
          <Icon name="play" size="s" />
          {N.play}
        </button>
      ) : null}
      {a === "retry" ? (
        <button type="button" className={btn} onClick={onRetry}>
          {N.tryAgain}
        </button>
      ) : null}
      {a === "again" ? (
        <button type="button" className={btn} onClick={onStartOver}>
          {N.startOver}
        </button>
      ) : null}
      {a === "signin" ? (
        <button type="button" className={btn} onClick={onSignIn}>
          {N.signIn}
        </button>
      ) : null}
      {a === "update" ? (
        <button
          type="button"
          className={btn}
          aria-busy={updating}
          onClick={updating ? undefined : onUpdate}
        >
          <span className="lx-labels">
            <span className={updating ? "is-off" : undefined}>{N.update}</span>
            <span className={updating ? undefined : "is-off"}>
              <span className="lx-spin" aria-hidden="true" />
              {N.updating}
            </span>
          </span>
        </button>
      ) : null}
    </div>
  );
}
