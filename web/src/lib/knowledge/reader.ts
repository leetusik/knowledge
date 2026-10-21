import "server-only";

import { getJson, sendJson } from "./client";

// P30.S8 — typed server-side calls against knowledge's user-scoped `/app/reader/*`
// surface (P29.S3 *Routes and writes*). Same seam as `app.ts`: the caller passes the
// knowledge bearer unsealed from the httpOnly cookie, every call is `no-store`, and
// errors are `ApiError` carrying the STATUS. The reader surfaces (S13+) add their
// reads and writes here; S8 ships the one the position beacon relays.

/** The `PUT /app/reader/positions` body (P29 *Resume and progress*). */
export interface KbPositionWrite {
  /** The org slug, or the tenant id for a tenant without one. */
  org: string;
  project: string;
  /** The document stem `<date>-<slug>`. */
  doc: string;
  /** The version on screen; omitted = the current one. */
  version?: number;
  /** The topmost visible id'd heading or block (native) or the bridge's anchor (legacy). */
  anchor_id?: string | null;
  fraction: number;
  max_fraction?: number;
  /** The end-of-chapter sentinel entered the viewport, or Mark as finished. */
  finished?: boolean;
  /** Mark as unread: the one write that resets progress. */
  unread?: boolean;
}

/** A stored position, as the server returns it. */
export interface KbPosition {
  org: string;
  project: string;
  doc: string;
  unit: string;
  lang: string;
  version: number;
  format: "md" | "html" | "native";
  anchor_id: string | null;
  fraction: number;
  max_fraction: number;
  state: "started" | "finished";
  finished_version: number | null;
  started_at: string;
  finished_at: string | null;
  updated_at: string;
  /** Finished on a version older than the current one ("Updated"). */
  updated: boolean;
}

/**
 * `PUT /app/reader/positions` (bearer) → 200 `{position}`. Last write wins on the
 * position; `max_fraction` only grows and `finished` only sets, except `unread`.
 * A private or deleted document is a 404, an anonymous caller a 401.
 */
export async function putReaderPosition(
  token: string,
  body: KbPositionWrite,
  signal?: AbortSignal,
): Promise<{ position: KbPosition }> {
  return sendJson<{ position: KbPosition }>(
    "/app/reader/positions",
    "PUT",
    body,
    {
      token,
      signal,
    },
  );
}

/** One chapter's state in `GET /app/reader/books/…` (`reader_api._book_progress`). */
export interface KbReaderChapterState {
  key: string;
  state: "unopened" | "started" | "finished";
  finished_version: number | null;
  /** Finished on a version older than the newest ("Updated"). */
  updated: boolean;
  /** The latest-read variant's position, or null when none was opened. */
  position: {
    doc: string;
    lang: string;
    version: number;
    anchor_id: string | null;
    fraction: number;
    max_fraction: number;
  } | null;
}

/** `GET /app/reader/books/{org}/{project}/{book}` (bearer): the caller's book state. */
export interface KbReaderBook {
  progress: { finished: number; started: number; total: number };
  chapters: KbReaderChapterState[];
}

/**
 * `GET /app/reader/books/{org}/{project}/{book}` (bearer) → per-chapter state and book
 * progress for the Contents sheet. A private or missing book is a 404, an anonymous
 * caller a 401 (an anonymous reader keeps no state; the page never calls it).
 */
export async function getReaderBook(
  token: string,
  org: string,
  project: string,
  book: string,
  signal?: AbortSignal,
): Promise<KbReaderBook> {
  return getJson<KbReaderBook>(
    `/app/reader/books/${encodeURIComponent(org)}/${encodeURIComponent(project)}/${encodeURIComponent(book)}`,
    { token, signal },
  );
}

// P30.S15 — one variant's state in a single read (`GET /app/reader/chapters/…` and
// `GET /app/reader/docs/…`, S8 + S9): this variant's own position, the chapter's
// state across its variants, and `resume`, the unit's latest position in ANY
// variant mapped onto this one by id (nearest preceding id as the fallback).

/** The unit's latest position, mapped onto the variant read (`anchors.resume`). */
export interface KbResume {
  doc: string;
  lang: string;
  version: number;
  /** The mapped section id; null = no id to land on (use `fraction`). */
  block_id: string | null;
  exact: boolean;
  fraction: number;
}

/**
 * One saved quiz attempt, as a variant read returns it under `quiz` (P30.S19): the
 * LATEST attempt per (block, item) of the chapter's unit, in any language and version.
 */
export interface KbQuizAttempt {
  id: string;
  doc: string;
  lang: string;
  version: number;
  block_id: string;
  item_id: string;
  item_type: "choice" | "recall" | "cloze";
  response: {
    selected?: string[];
    blanks?: string[];
    self_grade?: "got" | "missed";
  };
  correct: boolean;
  attempt: number;
  answered_at: string;
}

/** The slice of a variant read the reader's progress needs. */
export interface KbVariantState {
  position: KbPosition | null;
  resume: KbResume | null;
  chapter: {
    state: "unopened" | "started" | "finished";
    finished_version: number | null;
    updated: boolean;
  };
  /** The latest saved quiz attempt per item (empty when none). */
  quiz?: KbQuizAttempt[];
}

/**
 * `GET /app/reader/chapters/{org}/{project}/{book}/{key}?lang=` (bearer): this
 * chapter variant's state for the caller. A private or missing target is a 404, an
 * anonymous caller a 401 (the page never calls it for them).
 */
export async function getReaderChapter(
  token: string,
  target: { org: string; project: string; book: string; key: string },
  lang: string,
  signal?: AbortSignal,
): Promise<KbVariantState> {
  const e = encodeURIComponent;
  return getJson<KbVariantState>(
    `/app/reader/chapters/${e(target.org)}/${e(target.project)}/${e(target.book)}/${e(target.key)}?lang=${e(lang)}`,
    { token, signal },
  );
}

/**
 * `GET /app/reader/docs/{org}/{project}/{doc}` (bearer): a loose document's state.
 * `doc` is the document stem (`<date>-<slug>`).
 */
export async function getReaderDoc(
  token: string,
  target: { org: string; project: string; doc: string },
  signal?: AbortSignal,
): Promise<KbVariantState> {
  const e = encodeURIComponent;
  return getJson<KbVariantState>(
    `/app/reader/docs/${e(target.org)}/${e(target.project)}/${e(target.doc)}`,
    { token, signal },
  );
}

/** The `POST /app/reader/quiz-attempts` body (P29 *Quiz results*). */
export interface KbQuizAttemptWrite {
  org: string;
  project: string;
  /** The document stem `<date>-<slug>`. */
  doc: string;
  /** A client-generated UUID: a repeat of the same id is a no-op on the server. */
  id: string;
  version?: number;
  block_id: string;
  item_id: string;
  item_type: "choice" | "recall" | "cloze";
  response:
    | { selected: string[] }
    | { blanks: string[] }
    | { self_grade: "got" | "missed" };
  correct: boolean;
  answered_at?: string;
}

/**
 * `POST /app/reader/quiz-attempts` (bearer) → 201 (200 on a repeated `id`)
 * `{attempt, card, result}`. The server numbers `attempt` (first = 1, per unit and item,
 * any language or version); the FIRST attempt seeds the item's review card, later ones
 * leave it untouched. A private or deleted document is a 404, a bad shape a 422.
 */
export async function postQuizAttempt(
  token: string,
  body: KbQuizAttemptWrite,
  signal?: AbortSignal,
): Promise<{ attempt: number; card: unknown }> {
  return sendJson<{ attempt: number; card: unknown }>(
    "/app/reader/quiz-attempts",
    "POST",
    body,
    { token, signal },
  );
}

/**
 * The document stem `<date>-<slug>` of a `rel_path` in `project` (the server's
 * `reader_state.doc_of`): the path without its extension and its `<project>/` prefix.
 */
export function docStem(project: string, relPath: string): string {
  const stem = relPath.replace(/\.(md|html)$/, "");
  const prefix = `${project}/`;
  return stem.startsWith(prefix)
    ? stem.slice(prefix.length)
    : (stem.split("/").pop() ?? stem);
}
