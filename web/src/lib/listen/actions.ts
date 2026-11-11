"use server";

import { z } from "zod";

import { ApiError } from "@/lib/knowledge/client";
import {
  getListenState,
  putListenPosition,
  startListen,
  updateListen,
  type KbListenKey,
  type KbListenState,
} from "@/lib/knowledge/listen";
import { getSession } from "@/lib/session";

/**
 * P41-sr.W1 — the player's calls to knowledge's session-only Listen routes (P41-sr.B1), as
 * SERVER ACTIONS on the reader's pattern (`lib/reader/actions.ts`): start, the state
 * (polled while the making moves), Update audio and the position. Only the `pagehide`
 * beacon is a route handler (`/api/listen/position`, P41-sr.B2), because a beacon cannot
 * call an action.
 *
 * The bearer is unsealed from the httpOnly cookie here; the browser never sees it. A
 * missing session is `{ok: false, status: 401}` (the player shows "Signed out", F10), and
 * knowledge's own status passes through (404 a private or deleted document, 422 a bad
 * key); an outage is 502. The state comes back with `play` already in the BFF's paths.
 *
 * NOTE: a `"use server"` module may export ONLY async functions; types are erased.
 */

const segment = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^/\s][^/]*$/);

// P41-sr.W2: B1's two key forms, a document or a book from a chapter, strict either way.
const docKey = z
  .object({
    org: z.string().min(1).max(200),
    project: segment,
    doc: segment,
  })
  .strict();

const bookKey = z
  .object({
    org: z.string().min(1).max(200),
    project: segment,
    book: segment,
    from_chapter: segment.optional(),
    lang: z
      .string()
      .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
      .optional(),
  })
  .strict();

const keySchema = z.union([docKey, bookKey]);

const where = {
  seconds: z.number().min(0).max(14400),
  speed: z.number().min(0.5).max(3).optional(),
  follow: z.boolean().optional(),
  kept: z.boolean().optional(),
};

const positionSchema = z.union([
  docKey.extend(where).strict(),
  bookKey.extend({ ...where, chapter: segment.optional() }).strict(),
]);

export type ListenResult =
  { ok: true; state: KbListenState } | { ok: false; status: number };

function statusOf(error: unknown): number {
  return error instanceof ApiError ? error.status : 502;
}

async function withKey(
  input: unknown,
  call: (token: string, key: KbListenKey) => Promise<KbListenState>,
): Promise<ListenResult> {
  const parsed = keySchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 422 };
  const token = await getSession();
  if (!token) return { ok: false, status: 401 };
  try {
    return { ok: true, state: await call(token, parsed.data) };
  } catch (error) {
    return { ok: false, status: statusOf(error) };
  }
}

/** `POST /app/listen/start`: attach to the audio there is, or make it (and Try again after a failure). */
export async function listenStart(key: unknown): Promise<ListenResult> {
  return withKey(key, (token, k) => startListen(token, k));
}

/** `GET /app/listen/state`: read only, polled while the making moves. */
export async function listenRead(key: unknown): Promise<ListenResult> {
  return withKey(key, (token, k) => getListenState(token, k));
}

/** `POST /app/listen/update`: Update audio (only the changed parts are made). */
export async function listenUpdate(key: unknown): Promise<ListenResult> {
  return withKey(key, (token, k) => updateListen(token, k));
}

/** `PUT /app/listen/position`: where the listener is; last write wins. */
export async function listenSave(
  input: unknown,
): Promise<{ ok: boolean; status: number }> {
  const parsed = positionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, status: 422 };
  const token = await getSession();
  if (!token) return { ok: false, status: 401 };
  try {
    await putListenPosition(token, parsed.data);
    return { ok: true, status: 200 };
  } catch (error) {
    return { ok: false, status: statusOf(error) };
  }
}
