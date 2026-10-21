"use server";

import { z } from "zod";

import { ApiError } from "@/lib/knowledge/client";
import {
  getReviewQueue,
  patchReaderProfile,
  patchReviewCard,
  postCardReview,
} from "@/lib/knowledge/reader";
import { loadContinue } from "@/lib/library/continue";
import { getSession } from "@/lib/session";

import type {
  ActionResult,
  Profile,
  RateReply,
  ReviewQueue,
  StatusReply,
} from "./types";

/**
 * P30.S24 — the review surface's calls, as SERVER ACTIONS (the pattern of `lib/reader/
 * actions.ts`): the knowledge token is unsealed from the httpOnly cookie here, the body is
 * strict, and nothing throws — a fault is `{ok: false, ref}`, with a short reference the
 * failed state shows ("ref · …") and the server log carries. A card the server no longer
 * knows (a 404, or a 409 for one suspended elsewhere) is `gone`: the page drops it.
 *
 * NOTE: this file may export ONLY async functions (a `"use server"` module registers every
 * export as an action); types are erased and fine.
 */

/** Page size of one queue read; the page asks again when it has rated its way to the end. */
const QUEUE_LIMIT = 50;

function reference(): string {
  return `rv-${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
}

function failure(
  error: unknown,
  label: string,
): { ok: false; gone?: boolean; ref: string } {
  const ref = reference();
  const status = error instanceof ApiError ? error.status : undefined;
  console.error(`[review] ${label} failed (${status ?? "network"}) ref=${ref}`);
  return {
    ok: false,
    gone: status === 404 || status === 409 ? true : undefined,
    ref,
  };
}

export async function loadReviewQueue(): Promise<ActionResult<ReviewQueue>> {
  const token = await getSession();
  if (!token) return { ok: false, ref: reference() };
  try {
    return { ok: true, data: await getReviewQueue(token, QUEUE_LIMIT) };
  } catch (error) {
    return failure(error, "queue");
  }
}

const idPart = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/);

const rateSchema = z
  .object({
    cardId: z.string().uuid(),
    rating: z.enum(["again", "good"]),
    reviewId: z.string().uuid(),
    response: z
      .union([
        z.object({ selected: z.array(idPart).max(6) }).strict(),
        z.object({ blanks: z.array(z.string().max(1000)).max(5) }).strict(),
        z.object({ self_grade: z.enum(["got", "missed"]) }).strict(),
      ])
      .optional(),
  })
  .strict();

export type RateInput = z.input<typeof rateSchema>;

/** Rate one card. A repeated `reviewId` is a no-op on the server: Try again sends the same one. */
export async function rateReviewCard(
  input: RateInput,
): Promise<ActionResult<RateReply>> {
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, ref: reference() };
  const token = await getSession();
  if (!token) return { ok: false, ref: reference() };
  try {
    const { cardId, rating, reviewId, response } = parsed.data;
    const data = await postCardReview(token, cardId, {
      rating,
      review_id: reviewId,
      ...(response ? { response } : {}),
    });
    return { ok: true, data };
  } catch (error) {
    return failure(error, "rating");
  }
}

const statusSchema = z
  .object({
    cardId: z.string().uuid(),
    status: z.enum(["active", "suspended"]),
  })
  .strict();

export type StatusInput = z.input<typeof statusSchema>;

/** Suspend a card, or undo that. */
export async function setReviewCardStatus(
  input: StatusInput,
): Promise<ActionResult<StatusReply>> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, ref: reference() };
  const token = await getSession();
  if (!token) return { ok: false, ref: reference() };
  try {
    return {
      ok: true,
      data: await patchReviewCard(
        token,
        parsed.data.cardId,
        parsed.data.status,
      ),
    };
  } catch (error) {
    return failure(error, "suspend");
  }
}

const settingsSchema = z
  .object({
    time_zone: z.string().min(1).max(64).optional(),
    max_reviews_per_day: z.number().int().min(1).max(999).optional(),
    new_highlights_per_day: z.number().int().min(0).max(999).optional(),
  })
  .strict();

export type SettingsInput = z.input<typeof settingsSchema>;

/** `PATCH /app/reader/profile`: the time zone and the two daily limits (the signed ranges). */
export async function saveReviewSettings(
  input: SettingsInput,
): Promise<ActionResult<Profile>> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, ref: reference() };
  const token = await getSession();
  if (!token) return { ok: false, ref: reference() };
  try {
    return {
      ok: true,
      data: (await patchReaderProfile(token, parsed.data)).profile,
    };
  } catch (error) {
    return failure(error, "settings");
  }
}

/** The end state's "Continue reading" block (Q9): the reader's most recent place, or nothing. */
export interface ContinueView {
  title: string;
  lede: string;
  href: string;
  lang: string;
}

export async function loadReviewContinue(): Promise<ContinueView | null> {
  const token = await getSession();
  if (!token) return null;
  try {
    const first = (await loadContinue(token, []))[0];
    if (!first) return null;
    const where =
      first.kind === "doc"
        ? `${first.project} · Document`
        : `${first.bookTitle} · Chapter ${first.n} of ${first.total}`;
    return {
      title: first.title,
      lede: first.next ? where : `${where} · ${first.pct}% read`,
      href: first.href,
      lang: first.lang,
    };
  } catch {
    return null;
  }
}
