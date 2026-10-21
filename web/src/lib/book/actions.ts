"use server";

import { z } from "zod";

import { ApiError } from "@/lib/knowledge/client";
import { clearBookReaderState } from "@/lib/knowledge/reader";
import { getSession } from "@/lib/session";

/**
 * P30.S23 — "Clear this book's reading data" (`07-book-page` §7), the book page's one
 * write: `DELETE /app/reader/state?scope=book`. It removes, for this reader and this book's
 * chapters only, the positions, bookmarks, highlights and notes, quiz answers, and the
 * review cards and their logs; every other book, the chapters and the profile stay.
 *
 * The result is data, never a throw: the confirmation stays open on `{ok: false}` and the
 * danger button is the retry (the failure is also written to the server log with the
 * status). A book the caller cannot read is a 404 from the server, which is `{ok: false}`
 * here, like every other fault.
 *
 * NOTE: this file may export ONLY async functions (a `"use server"` module registers
 * every export as an action).
 */

const segment = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^/\s][^/]*$/);

const schema = z
  .object({ org: segment, project: segment, book: segment })
  .strict();

export async function clearBookReadingData(
  input: z.input<typeof schema>,
): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const token = await getSession();
  if (!token) return { ok: false };
  try {
    await clearBookReaderState(token, parsed.data);
    return { ok: true };
  } catch (error) {
    const status = error instanceof ApiError ? error.status : "network";
    console.error(`book clear ${parsed.data.book}: ${status}`);
    return { ok: false };
  }
}
