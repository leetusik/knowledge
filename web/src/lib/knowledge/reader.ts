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

/**
 * An annotation's anchor resolved for the version read (P30.S9, `server/anchors.py`):
 * paint only `status === "anchored"` with a `start` (a highlight); `block` is "Text
 * changed"; a block note is `method: "section"` with no offsets; `stored` = unresolved.
 */
export interface KbAnchor {
  status: "anchored" | "block" | "orphan";
  method: string;
  block_id: string | null;
  start: number | null;
  end: number | null;
  section_index: number | null;
}

/** One highlight (`kind: "hl"`) or block note (`kind: "bnote"`), as the reads return it. */
export interface KbAnnotation {
  id: string;
  kind: "hl" | "bnote";
  doc: string;
  lang: string;
  version: number;
  /** The section it was made in (never rewritten). */
  block_id: string;
  quote: {
    exact: string;
    prefix?: string;
    suffix?: string;
    start?: number;
    end?: number;
  } | null;
  note: string | null;
  snapshot?: { text?: string; block_title?: string; chapter_title?: string };
  created_at: string;
  updated_at: string;
  anchor_status?: string;
  anchor?: KbAnchor;
  /** "Review this" is on (an active card). */
  review?: boolean;
  /** The caller's own review card on it: `active`, `suspended` or `""` (P30.S21). */
  card?: "" | "active" | "suspended";
  /** The per-book list only: the chapter it sits in. */
  chapter_key?: string;
  /** Another language variant's annotation, shown on this one (never painted). */
  other_language?: boolean;
  /** Its section mapped onto the variant read (`null` = no mappable section). */
  section?: { block_id: string | null; exact: boolean; section_index: number | null };
}

/** One bookmark, as the reads return it (P30.S8 + S9 `place`). */
export interface KbBookmark {
  id: string;
  doc: string;
  lang: string;
  version: number;
  /** Native: `{block_id}`; a position: `{fraction, anchor?}`. */
  anchor: { block_id?: string; fraction?: number; anchor?: string };
  label: string | null;
  snippet: string;
  created_at: string;
  updated_at: string;
  /** A position (plain Markdown or a legacy chapter). */
  pos?: boolean;
  /** A position placed from an HTML version. */
  approx?: boolean;
  place?: {
    block_id: string | null;
    exact: boolean;
    fraction: number | null;
    section_index: number | null;
  };
  /** The per-book list only. */
  chapter_key?: string;
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
  /** P30.S20: the anchored and Text changed annotations, resolved for the version read. */
  annotations?: KbAnnotation[];
  /** The orphans (their section is gone): kept, never dropped. */
  unanchored?: KbAnnotation[];
  /** P30.S21: this variant's bookmarks, each with where it lands now. */
  bookmarks?: KbBookmark[];
  /** P30.S21: the chapter's other variants' marks, mapped onto this variant by id. */
  other_languages?: { annotations?: KbAnnotation[]; bookmarks?: KbBookmark[] };
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
  /** An older version on screen (`?v=`): the annotations resolve for it (P30.S20). */
  version?: number,
): Promise<KbVariantState> {
  const e = encodeURIComponent;
  const v = version ? `&v=${version}` : "";
  return getJson<KbVariantState>(
    `/app/reader/chapters/${e(target.org)}/${e(target.project)}/${e(target.book)}/${e(target.key)}?lang=${e(lang)}${v}`,
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
  /** An older version on screen (`?v=`): the annotations resolve for it (P30.S20). */
  version?: number,
): Promise<KbVariantState> {
  const e = encodeURIComponent;
  const v = version ? `?v=${version}` : "";
  return getJson<KbVariantState>(
    `/app/reader/docs/${e(target.org)}/${e(target.project)}/${e(target.doc)}${v}`,
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

// P30.S20 — highlights and notes (`05-annotations`; S8's routes, S10's "Review this").

/** The `POST /app/reader/annotations` body: a highlight (a quote) or a block note (a note). */
export interface KbAnnotationWrite {
  org: string;
  project: string;
  /** The document stem `<date>-<slug>`. */
  doc: string;
  /** A client-generated UUID: a repeat of the same id is a no-op (200) on the server. */
  id: string;
  /** The version on screen. */
  version?: number;
  block_id: string;
  quote?: {
    exact: string;
    prefix: string;
    suffix: string;
    start: number;
    end: number;
  };
  note?: string | null;
  snapshot?: { text: string; block_title: string; chapter_title: string };
}

/** `POST /app/reader/annotations` (bearer) → 201 (200 on a repeated `id`) `{annotation}`. */
export async function postAnnotation(
  token: string,
  body: KbAnnotationWrite,
  signal?: AbortSignal,
): Promise<{ annotation: KbAnnotation }> {
  return sendJson<{ annotation: KbAnnotation }>(
    "/app/reader/annotations",
    "POST",
    body,
    { token, signal },
  );
}

/**
 * `PATCH /app/reader/annotations/{id}` (bearer): `note` (null clears a highlight's note) and
 * `review` (a highlight's card on, or suspended) → `{annotation, card?}`.
 */
export async function patchAnnotation(
  token: string,
  id: string,
  body: { note?: string | null; review?: boolean },
  signal?: AbortSignal,
): Promise<{ annotation: KbAnnotation; card?: { status: string } }> {
  return sendJson<{ annotation: KbAnnotation; card?: { status: string } }>(
    `/app/reader/annotations/${encodeURIComponent(id)}`,
    "PATCH",
    body,
    { token, signal },
  );
}

/** `DELETE /app/reader/annotations/{id}` (bearer) → 204; its note and its card go with it. */
export async function deleteAnnotation(
  token: string,
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  await sendJson<unknown>(
    `/app/reader/annotations/${encodeURIComponent(id)}`,
    "DELETE",
    undefined,
    { token, signal },
  );
}

// P30.S21 — bookmarks (`05-annotations`; S8's routes) and the per-book list.

/** The `POST /app/reader/bookmarks` body: a section (native) or a position (plain Markdown). */
export interface KbBookmarkWrite {
  org: string;
  project: string;
  /** The document stem `<date>-<slug>`. */
  doc: string;
  /** A client-generated UUID: a repeat of the same id is a no-op (200) on the server. */
  id: string;
  version?: number;
  anchor: { block_id: string } | { fraction: number };
  label?: string | null;
  snippet?: string;
}

/** `POST /app/reader/bookmarks` (bearer) → 201 (200 on a repeated `id`) `{bookmark}`. */
export async function postBookmark(
  token: string,
  body: KbBookmarkWrite,
  signal?: AbortSignal,
): Promise<{ bookmark: KbBookmark }> {
  return sendJson<{ bookmark: KbBookmark }>(
    "/app/reader/bookmarks",
    "POST",
    body,
    { token, signal },
  );
}

/** `PATCH /app/reader/bookmarks/{id}` (bearer): `label` (null clears it) → `{bookmark}`. */
export async function patchBookmark(
  token: string,
  id: string,
  body: { label: string | null },
  signal?: AbortSignal,
): Promise<{ bookmark: KbBookmark }> {
  return sendJson<{ bookmark: KbBookmark }>(
    `/app/reader/bookmarks/${encodeURIComponent(id)}`,
    "PATCH",
    body,
    { token, signal },
  );
}

/** `DELETE /app/reader/bookmarks/{id}` (bearer) → 204. */
export async function deleteBookmark(
  token: string,
  id: string,
  signal?: AbortSignal,
): Promise<void> {
  await sendJson<unknown>(
    `/app/reader/bookmarks/${encodeURIComponent(id)}`,
    "DELETE",
    undefined,
    { token, signal },
  );
}

/** `GET /app/reader/annotations?org=&project=&book=`: every mark in a book, orphans apart. */
export interface KbBookNotes {
  annotations: KbAnnotation[];
  unanchored: KbAnnotation[];
  bookmarks: KbBookmark[];
}

export async function getReaderBookNotes(
  token: string,
  target: { org: string; project: string; book: string },
  signal?: AbortSignal,
): Promise<KbBookNotes> {
  const e = encodeURIComponent;
  return getJson<KbBookNotes>(
    `/app/reader/annotations?org=${e(target.org)}&project=${e(target.project)}&book=${e(target.book)}`,
    { token, signal },
  );
}
