"use server";

import { z } from "zod";

import { postQuizAttempt, putReaderPosition } from "@/lib/knowledge/reader";
import { getSession } from "@/lib/session";

/**
 * P30.S15 — the reader's progress writes, as SERVER ACTIONS (P29 *Routes and writes*:
 * "the position is written through a server action"; only the `pagehide` beacon is a
 * route handler, `/api/reader/position`, because a beacon cannot call an action).
 *
 *  - the cadence write (2 s after scrolling stops, at most 15 s apart while reading);
 *  - the immediate `finished` write, when the end of the chapter comes into view;
 *  - Mark as finished and Mark as unread (`unread: true`, the one write the beacon
 *    route does not accept).
 *
 * The knowledge token is unsealed from the httpOnly cookie here; nothing is stored for
 * the signed-out (a missing session is `ok: false` and the page never calls us then).
 * The conflict rules (last-write-wins position, grow-only `max_fraction`, set-only
 * `finished`, the unread reset) live in knowledge's `PUT /app/reader/positions`.
 *
 * NOTE: this file may export ONLY async functions (a `"use server"` module registers
 * every export as an action); types are erased and fine.
 */

const segment = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^/\s][^/]*$/);

const writeSchema = z
  .object({
    org: z.string().min(1).max(200),
    project: segment,
    doc: segment,
    version: z.number().int().min(1).optional(),
    anchor_id: z.string().min(1).max(200).nullable().optional(),
    fraction: z.number().min(0).max(1),
    max_fraction: z.number().min(0).max(1).optional(),
    finished: z.boolean().optional(),
    unread: z.boolean().optional(),
  })
  .strict();

export type PositionWrite = z.input<typeof writeSchema>;

export interface PositionResult {
  ok: boolean;
}

export async function saveReaderPosition(
  input: PositionWrite,
): Promise<PositionResult> {
  const parsed = writeSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const token = await getSession();
  if (!token) return { ok: false };
  try {
    await putReaderPosition(token, parsed.data);
    return { ok: true };
  } catch {
    // 401 (session gone), 404 (private or deleted), 422, or an outage: nothing to
    // retry here. The next sample writes again, and the page never fails over a save.
    return { ok: false };
  }
}

/**
 * P30.S19 — one graded quiz attempt (`04-quiz` round 01, *Saving*), as a server action
 * (the same pattern as the position write: the session is unsealed here, the body is
 * strict, nothing throws). Every graded attempt is sent; the SERVER numbers it, and
 * only the first of an item seeds its review card (P29 *Quiz results*), so the page
 * keeps no count: it words its save line from the `attempt` in the reply. The client
 * generates the `id`, so a repeated send is a no-op on the server.
 */
const idPart = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/);

const attemptSchema = z
  .object({
    org: z.string().min(1).max(200),
    project: segment,
    doc: segment,
    id: z.string().uuid(),
    version: z.number().int().min(1).optional(),
    block_id: idPart,
    item_id: idPart,
    item_type: z.enum(["choice", "recall", "cloze"]),
    response: z.union([
      z.object({ selected: z.array(idPart).max(6) }).strict(),
      z.object({ blanks: z.array(z.string().max(1000)).max(5) }).strict(),
      z.object({ self_grade: z.enum(["got", "missed"]) }).strict(),
    ]),
    correct: z.boolean(),
    answered_at: z.string().max(40).optional(),
  })
  .strict();

export type QuizAttemptWrite = z.input<typeof attemptSchema>;

export interface QuizAttemptResult {
  ok: boolean;
  /** The server's number for this attempt (1 = the first, the one review keeps). */
  attempt?: number;
}

export async function saveQuizAttempt(
  input: QuizAttemptWrite,
): Promise<QuizAttemptResult> {
  const parsed = attemptSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const token = await getSession();
  if (!token) return { ok: false };
  try {
    const reply = await postQuizAttempt(token, parsed.data);
    return { ok: true, attempt: reply.attempt };
  } catch {
    // 401 (session gone), 404 (private or deleted), 422 or an outage: the grade
    // stands on the page and the line says it was not saved.
    return { ok: false };
  }
}
