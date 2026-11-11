"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { LISTEN, READER } from "@/content";
import {
  chapterN,
  chapterTitle,
  nextChapter,
  prevChapter,
  spanAt,
} from "@/lib/listen/book";
import { clockPos, lengthWords } from "@/lib/listen/format";
import { noteKey, type ListenKey, type NoteKey } from "@/lib/listen/machine";
import {
  askScroll,
  listenActions,
  setOpenPlayer,
  useListen,
} from "@/lib/listen/store";
import type { Listen } from "@/lib/listen/types";
import { noteView } from "@/lib/listen/view";

import { Icon } from "./icons";
import { ListenNote } from "./listen-note";

/**
 * P41-sr.W2 — the opened player (`11-listen` page `player`, F8, F28–F30, F33; the
 * `PlayerPanel` board): the reader's sheet over the page the dock sits on (the chapter,
 * the document or the book landing), dimmed by the scrim. The dock's chevron opens it
 * (`setOpenPlayer`); focus goes to Close and stays in the sheet; Close, Escape and a tap
 * on the scrim reveal the page unchanged and return focus to the dock. Go to the text goes
 * to the reader at the Listen's chapter (or document), scrolled once to the block being
 * read. Stop listening ends the Listen and keeps the place (F17).
 *
 * Its body: the meta line (a book), the title, the zone (the trio word for the four live
 * states, else the note without the action the round button carries, F25), the position
 * in 34 px Fraunces with the seek bar, the transport, the Speed, Follow along and Chapters
 * rows, and Stop listening at the foot. No live region of its own: the dock's, under the
 * sheet, announces (player-G8).
 */

type Lead = "play" | "pause" | "again" | "retry" | "off";
type Zone = "note" | "status" | "act";

/** Per state: the round button, the zone, whether a position shows (the `PlayerPanel` board's table). */
const PL_T: Record<ListenKey, [Lead, Zone, boolean]> = {
  waiting: ["off", "note", false],
  making: ["off", "note", false],
  ready: ["play", "note", true],
  tap: ["play", "note", true],
  loading: ["pause", "status", true],
  playing: ["pause", "status", true],
  paused: ["play", "status", true],
  buffering: ["pause", "status", true],
  "next-waiting": ["pause", "note", false],
  finished: ["again", "note", true],
  "fail-voice": ["retry", "note", false],
  "fail-limit": ["play", "note", true],
  "fail-play": ["retry", "note", true],
  "fail-session": ["off", "act", true],
  "fail-unreadable": ["retry", "note", false],
  "offline-start": ["off", "note", false],
  "offline-play": ["pause", "note", true],
  "offline-stopped": ["off", "note", true],
};

const P = LISTEN.player;

/** The trio word alone for the four live states (player-G2): [trio, word, busy]. */
const PL_WORD: Partial<
  Record<ListenKey, ["active" | "idle", string, boolean]>
> = {
  playing: ["active", P.playing, false],
  paused: ["idle", P.paused, false],
  loading: ["idle", P.loading, true],
  buffering: ["idle", P.buffering, true],
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focus the dock's chevron (or, with no dock, the page's own Listen, else its main). */
function focusBack(): void {
  window.setTimeout(() => {
    const el =
      document.querySelector<HTMLElement>(".lx-dock__open, .lx-dock__act") ??
      document.querySelector<HTMLElement>(
        ".rx-listen button, .bk-listen button",
      ) ??
      document.getElementById("main-content");
    if (el) {
      if (el.id === "main-content" && !el.hasAttribute("tabindex")) {
        el.setAttribute("tabindex", "-1");
      }
      el.focus({ preventScroll: true });
    }
  }, 0);
}

/** The page of the Listen's chapter (or document) in the reader. */
function textHref(l: Listen): string {
  if (l.kind === "book" && l.book) {
    const c = l.book.chapters.find((x) => x.key === l.ch) ?? l.book.chapters[0];
    return c?.href ?? l.href;
  }
  return l.href;
}

function samePage(href: string, pathname: string | null): boolean {
  try {
    return new URL(href, window.location.origin).pathname === pathname;
  } catch {
    return false;
  }
}

export function ListenPlayer({ signInHref }: { signInHref: string }) {
  const [open, setOpen] = useState(false);
  const listen = useListen();
  useEffect(() => setOpenPlayer(() => setOpen(true)), []);
  // Only Stop listening ends a Listen, and it closes the sheet itself (`onLeave`).
  if (!open || !listen) return null;
  return (
    <PlayerSheet
      listen={listen}
      signInHref={signInHref}
      onClose={() => {
        setOpen(false);
        focusBack();
      }}
      onLeave={() => setOpen(false)}
    />
  );
}

function PlayerSheet({
  listen: l,
  signInHref,
  onClose,
  onLeave,
}: {
  listen: Listen;
  signInHref: string;
  onClose: () => void;
  /** The sheet closes without returning focus (Go to the text, Stop listening). */
  onLeave: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const uid = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<"speed" | "chapters" | null>(null);
  const [drag, setDrag] = useState<number | null>(null);

  // Opening the sheet moves focus to Close (F33).
  useEffect(() => {
    rootRef.current
      ?.querySelector<HTMLElement>(".rd-sheet__close")
      ?.focus({ preventScroll: true });
  }, []);

  const focusRow = useCallback((row: string) => {
    window.setTimeout(() => {
      rootRef.current
        ?.querySelector<HTMLElement>(`[data-row="${row}"]`)
        ?.focus({ preventScroll: true });
    }, 0);
  }, []);

  const closePanel = (row: "speed" | "chapters") => {
    setPanel(null);
    focusRow(row);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (panel) closePanel(panel);
      else onClose();
      return;
    }
    if (e.key !== "Tab") return;
    // aria-modal: focus stays in the sheet.
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(
      root.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!root.contains(active)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const goToText = () => {
    const href = textHref(l);
    askScroll(l.unit, l.kind === "book" ? l.ch : null);
    onLeave();
    if (samePage(href, pathname)) {
      window.dispatchEvent(new Event("listen:text"));
    } else {
      router.push(href);
    }
  };

  const stop = () => {
    listenActions.stop();
    onLeave();
    focusBack();
  };

  const book = l.kind === "book" && l.book ? l.book : null;
  const total = book?.chapters.length ?? 1;
  const n = chapterN(l, l.ch) ?? 1;
  const fromN = chapterN(l, l.from) ?? 1;
  const st = l.state;
  const [lead, baseZone, hasPos] = PL_T[st];
  const liveState =
    st === "playing" ||
    st === "paused" ||
    st === "loading" ||
    st === "buffering";
  const zone: Zone | "outdated" = l.old && liveState ? "outdated" : baseZone;
  const word = PL_WORD[st] ?? PL_WORD.playing!;
  const playable = lead === "play" || lead === "pause" || lead === "again";
  const noteId = `${uid}-note`;
  const speedId = `${uid}-speed`;
  const chId = `${uid}-chapters`;

  // The position: the chapter's (a book) or the document's, in audio time (F2, F3).
  const spanI = book ? spanAt(l.spans, l.pos) : -1;
  const spanStart = spanI >= 0 ? l.spans[spanI].start : 0;
  const lenS = Math.max(0, l.chLen ?? l.len ?? 0);
  const posS = Math.min(Math.max(0, l.chPos), lenS || l.chPos);
  const shown = drag ?? posS;
  const soFar = book ? l.chSoFar : l.soFar;
  const seekTo = (v: number) => listenActions.seek(spanStart + v);
  const commit = () => {
    if (drag === null) return;
    seekTo(drag);
    setDrag(null);
  };
  const pct = lenS ? Math.round((shown / lenS) * 1000) / 10 : 0;

  const prev = prevChapter(l, l.ch);
  const next = nextChapter(l, l.ch);
  const onPrev = () => {
    if (prev && prev.n >= fromN && l.chPos < 5)
      listenActions.seekChapter(prev.key);
    else listenActions.seek(spanStart);
  };
  const onNext = () => {
    if (next) listenActions.seekChapter(next.key);
  };

  const noteState: NoteKey = zone === "outdated" ? noteKey(st, true) : st;
  const nowWord =
    st === "paused"
      ? P.paused
      : st === "playing"
        ? P.playing
        : (PL_WORD[st]?.[1] ?? READER.chapterList.readingNow);

  const toggleChapters = () => {
    const opening = panel !== "chapters";
    setPanel(opening ? "chapters" : null);
    // Opening the list brings its row to the top of the sheet (a scroll inside the player, on request).
    if (opening) {
      window.setTimeout(() => {
        const root = rootRef.current;
        const body = root?.querySelector<HTMLElement>(".rd-sheet__body");
        const row = root?.querySelector<HTMLElement>('[data-row="chapters"]');
        if (body && row && body.scrollHeight > body.clientHeight) {
          body.scrollTop +=
            row.getBoundingClientRect().top - body.getBoundingClientRect().top;
        }
      }, 0);
    }
  };

  return (
    <>
      <div className="rd-scrim pl-scrim" aria-hidden="true" onClick={onClose} />
      <div
        ref={rootRef}
        className="rd-sheet rd-sheet--right pl-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={P.title}
        onKeyDown={onKeyDown}
      >
        <div className="rd-sheet__head">
          <h2 className="rd-sheet__title">{P.title}</h2>
          <div className="pl-head__end">
            <button
              type="button"
              className="rd-btn rd-btn--quiet"
              onClick={goToText}
            >
              {P.goToText}
            </button>
            <button
              type="button"
              className="rd-btn rd-btn--quiet rd-sheet__close"
              onClick={onClose}
            >
              {P.close}
            </button>
          </div>
        </div>
        <div className="rd-sheet__body pl-body">
          <div className="pl">
            <div className="pl-id">
              {book ? (
                <p className="pl-meta">{P.meta(book.title, n, total)}</p>
              ) : null}
              <h3 className="pl-title" lang={l.titleLang ?? "en"}>
                {l.title}
              </h3>
            </div>

            {zone === "status" ? (
              <div className="pl-zone">
                <p
                  className={`lx-status lx-status--${word[0]}${word[2] ? "lx-status--busy" : ""}`}
                >
                  {word[2] ? (
                    <span className="lx-spin" aria-hidden="true" />
                  ) : null}
                  {word[1]}
                </p>
              </div>
            ) : (
              <div
                className={`pl-zone${zone === "note" ? "pl-zone--noact" : ""}`}
                id={noteId}
              >
                <ListenNote
                  state={noteState}
                  view={noteView(l, noteState)}
                  act={zone !== "note"}
                  tone={zone === "outdated" ? "secondary" : "primary"}
                  updating={l.updating}
                  onSignIn={() => window.location.assign(signInHref)}
                  onUpdate={listenActions.update}
                />
              </div>
            )}

            {hasPos ? (
              <div className="pl-where">
                <p className="pl-pos">
                  <span className="pl-pos__now">{clockPos(shown)}</span>
                  <span className="pl-pos__of">
                    {P.of(clockPos(lenS), soFar)}
                  </span>
                </p>
                <input
                  type="range"
                  className="pl-seek"
                  aria-label={P.position}
                  min={0}
                  max={lenS}
                  step={5}
                  value={Math.min(shown, lenS)}
                  aria-valuetext={P.posText(
                    clockPos(shown),
                    clockPos(lenS),
                    soFar,
                  )}
                  style={{ "--p": `${pct}%` } as CSSProperties}
                  disabled={!playable}
                  onChange={(e) => setDrag(Number(e.currentTarget.value))}
                  onPointerUp={commit}
                  onKeyUp={commit}
                  onBlur={commit}
                />
              </div>
            ) : null}

            <div className="pl-transport">
              <div>
                {book ? (
                  <button
                    type="button"
                    className="lx-round"
                    aria-label={P.previous}
                    disabled={!playable}
                    onClick={onPrev}
                  >
                    <Icon name="prev" />
                  </button>
                ) : null}
              </div>
              <div className="pl-transport__mid">
                <button
                  type="button"
                  className="lx-round"
                  aria-label={P.back}
                  disabled={!playable}
                  onClick={() => listenActions.seek(Math.max(0, l.pos - 15))}
                >
                  <Icon name="back" />
                  <span className="lx-skip__n" aria-hidden="true">
                    15
                  </span>
                </button>
                {lead === "play" ? (
                  <button
                    type="button"
                    className="lx-round lx-round--primary lx-round--l pl-lead"
                    aria-label={P.play}
                    onClick={listenActions.play}
                  >
                    <Icon name="play" size="l" />
                  </button>
                ) : null}
                {lead === "pause" ? (
                  <button
                    type="button"
                    className="lx-round lx-round--primary lx-round--l pl-lead"
                    aria-label={P.pause}
                    onClick={listenActions.pause}
                  >
                    <Icon name="pause" size="l" />
                  </button>
                ) : null}
                {lead === "again" ? (
                  <button
                    type="button"
                    className="lx-round lx-round--primary lx-round--l pl-lead"
                    aria-label={P.startOver}
                    onClick={listenActions.startOver}
                  >
                    <Icon name="again" size="l" />
                  </button>
                ) : null}
                {lead === "retry" ? (
                  <button
                    type="button"
                    className="lx-round lx-round--primary lx-round--l pl-lead"
                    aria-label={P.tryAgain}
                    onClick={listenActions.retry}
                  >
                    <Icon name="retry" size="l" />
                  </button>
                ) : null}
                {lead === "off" ? (
                  <button
                    type="button"
                    className="lx-round lx-round--l pl-lead"
                    aria-label={P.play}
                    aria-describedby={zone !== "status" ? noteId : undefined}
                    disabled
                  >
                    <Icon name="play" size="l" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="lx-round"
                  aria-label={P.fwd}
                  disabled={!playable}
                  onClick={() => listenActions.seek(l.pos + 15)}
                >
                  <Icon name="fwd" />
                  <span className="lx-skip__n" aria-hidden="true">
                    15
                  </span>
                </button>
              </div>
              <div className="pl-transport__end">
                {book ? (
                  <button
                    type="button"
                    className="lx-round"
                    aria-label={P.next}
                    disabled={!playable || !next}
                    onClick={onNext}
                  >
                    <Icon name="next" />
                  </button>
                ) : null}
              </div>
            </div>

            <ul className="pl-rows">
              <li>
                <button
                  type="button"
                  className="pl-row"
                  data-row="speed"
                  aria-expanded={panel === "speed"}
                  aria-controls={speedId}
                  onClick={() => setPanel(panel === "speed" ? null : "speed")}
                >
                  <span className="pl-row__label">{P.speed}</span>
                  <span className="pl-row__val">
                    {P.speedValue(l.speed)}
                    <span className="pl-chev">
                      <Icon name="open" size="s" />
                    </span>
                  </span>
                </button>
                {panel === "speed" ? (
                  <div className="pl-drop" id={speedId}>
                    <div
                      className="pl-speeds"
                      role="group"
                      aria-label={P.speed}
                    >
                      {P.speeds.map((v) => (
                        <button
                          key={v}
                          type="button"
                          className="pl-opt"
                          aria-pressed={v === l.speed}
                          onClick={() => {
                            listenActions.setSpeed(v);
                            closePanel("speed");
                          }}
                        >
                          {P.speedValue(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </li>
              <li>
                <button
                  type="button"
                  className="pl-row"
                  role="switch"
                  aria-checked={l.follow}
                  onClick={() => listenActions.setFollow(!l.follow)}
                >
                  <span className="pl-row__label">{P.follow}</span>
                  <span className="pl-row__val">
                    {l.follow ? P.on : P.off}
                    <span className="pl-switch" aria-hidden="true" />
                  </span>
                </button>
              </li>
              {book ? (
                <li>
                  <button
                    type="button"
                    className="pl-row"
                    data-row="chapters"
                    aria-expanded={panel === "chapters"}
                    aria-controls={chId}
                    onClick={toggleChapters}
                  >
                    <span className="pl-row__label">{P.chapters}</span>
                    <span className="pl-row__val">
                      {P.where(n, total)}
                      <span className="pl-chev">
                        <Icon name="open" size="s" />
                      </span>
                    </span>
                  </button>
                  {panel === "chapters" ? (
                    <div className="pl-drop" id={chId}>
                      <ol className="rd-chs" aria-label={P.chapters}>
                        {book.chapters.map((c) => {
                          const e = l.entries.find((x) => x.chapter === c.key);
                          const made =
                            c.n >= fromN && e?.state === "made" && !!e.len;
                          const cur = c.key === l.ch;
                          const now = cur ? (
                            <span className="rd-ch__now">{nowWord}</span>
                          ) : null;
                          // The audio's title (P41-sr.F3), else the chapter's place.
                          const named = chapterTitle(l, c.key);
                          const title = (
                            <span
                              className="rd-ch__title"
                              lang={named?.lang ?? "en"}
                            >
                              {named?.title ?? LISTEN.dock.chapter(c.n)}
                            </span>
                          );
                          return (
                            <li key={c.key} className="rd-chs__item">
                              {made ? (
                                <button
                                  type="button"
                                  className="rd-ch pl-ch"
                                  aria-current={cur ? "true" : undefined}
                                  onClick={() => {
                                    listenActions.seekChapter(c.key);
                                    closePanel("chapters");
                                  }}
                                >
                                  <span className="rd-ch__n">{c.n}</span>
                                  <span className="rd-ch__body">
                                    {title}
                                    <span className="rd-ch__meta">
                                      {now}
                                      <span>{lengthWords(e?.len ?? 0)}</span>
                                    </span>
                                  </span>
                                </button>
                              ) : (
                                <div
                                  className="rd-ch pl-ch pl-ch--off"
                                  aria-current={cur ? "true" : undefined}
                                >
                                  <span className="rd-ch__n">{c.n}</span>
                                  <span className="rd-ch__body">
                                    {title}
                                    <span className="rd-ch__meta">
                                      {now}
                                      <span>
                                        {c.n >= fromN &&
                                        e?.state === "making" &&
                                        c.key === l.making
                                          ? P.preparing(
                                              e.part
                                                ? LISTEN.dock.part(
                                                    e.part.n,
                                                    e.part.of,
                                                  )
                                                : null,
                                            )
                                          : P.notPrepared}
                                      </span>
                                    </span>
                                  </span>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  ) : null}
                </li>
              ) : null}
            </ul>

            <div className="pl-foot">
              <button type="button" className="lx-over" onClick={stop}>
                {P.stop}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
