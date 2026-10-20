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
