"use client";

import type { ReactNode } from "react";

import { READER } from "@/content";

const T = READER.notes;

/**
 * P30.S21 — the small parts of the annotation layer (`05-annotations` round 01): the
 * Bookmark toggle every bar shares, the place bar, one margin item and one row. Presentation
 * only; the layer owns what they do.
 */

/** "Bookmark" / "Bookmarked" (or the position's pair) in one grid cell, so the button never resizes. */
export function BookmarkButton({
  on,
  position,
  onClick,
}: {
  on: boolean;
  position?: boolean;
  onClick: () => void;
}) {
  const [off, yes] = position
    ? [T.bm.position, T.bm.positionOn]
    : [T.bm.bookmark, T.bm.bookmarked];
  return (
    <button
      type="button"
      className="rd-btn rd-btn--quiet an-bar__btn"
      aria-pressed={on}
      onClick={onClick}
    >
      <span className="an-btn-w">
        <span aria-hidden={!on}>{yes}</span>
        <span aria-hidden={on}>{off}</span>
      </span>
    </button>
  );
}

/** The place bar: the section being read (or the position), Add note, Bookmark. */
export function PlaceBar({
  kind,
  title,
  titleLang,
  on,
  onNote,
  onBookmark,
}: {
  kind: "block" | "pos";
  title: string;
  titleLang: string;
  on: boolean;
  onNote: () => void;
  onBookmark: () => void;
}) {
  return (
    <div
      className="an-place"
      role="group"
      aria-label={kind === "pos" ? T.place.groupPos : T.place.group}
    >
      {kind === "block" ? (
        <>
          <span className="an-place__where">
            <b lang={titleLang}>{title}</b>
          </span>
          <span className="an-place__sep" aria-hidden="true" />
          <button
            type="button"
            className="rd-btn rd-btn--quiet an-bar__btn"
            onClick={onNote}
          >
            {T.bar.addNote}
          </button>
          <BookmarkButton on={on} onClick={onBookmark} />
        </>
      ) : (
        <BookmarkButton on={on} position onClick={onBookmark} />
      )}
    </div>
  );
}

/** What one margin item or row says: a mono label, then the text. */
export interface MarkerLook {
  /** The mono label ("Note", "Bookmarked", "Text changed"); empty for the other language. */
  label: string;
  /** The label is the accent one (Bookmarked). */
  labelOn?: boolean;
  text: string;
  lang: string;
  /** The other language's endonym, in its own `lang`, after the text. */
  endonym?: { name: string; lang: string };
}

function MarkerBody({ m, rail }: { m: MarkerLook; rail: boolean }): ReactNode {
  const k = rail ? "an-mi__k" : "an-row__k";
  return (
    <>
      {m.label ? (
        <span className={m.labelOn ? `${k} ${k}--on` : k}>{m.label}</span>
      ) : null}
      {m.text || m.endonym ? (
        <span className={rail ? "an-mi__t" : "an-row__t"} lang={m.lang}>
          {m.text}
          {m.endonym ? (
            <span
              className={rail ? "an-mi__go" : "an-row__go"}
              lang={m.endonym.lang}
            >
              {m.endonym.name}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );
}

/** One item in the margin (from 64rem). */
export function MarginItem({
  m,
  current,
  onOpen,
}: {
  m: MarkerLook;
  current: boolean;
  onOpen: (el: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      className="an-mi"
      aria-current={current ? "true" : undefined}
      onClick={(e) => onOpen(e.currentTarget)}
    >
      <MarkerBody m={m} rail />
    </button>
  );
}

/** One row under a heading or a typed block (below 64rem). */
export function MarkerRow({
  m,
  onOpen,
}: {
  m: MarkerLook;
  onOpen: (el: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      className="an-row"
      onClick={(e) => onOpen(e.currentTarget)}
    >
      <MarkerBody m={m} rail={false} />
    </button>
  );
}
