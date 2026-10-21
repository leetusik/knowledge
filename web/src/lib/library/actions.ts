"use server";

import { ApiError } from "@/lib/knowledge/client";
import { clearAllReaderState } from "@/lib/knowledge/reader";
import { getSession } from "@/lib/session";

/**
 * P30.S22 — "Clear all reading data" (`06-library` §8), the library's one write:
 * `DELETE /app/reader/state?scope=all`. It removes every position, bookmark, highlight,
 * note, quiz answer and review card of the caller, in every library; it keeps the books,
 * the review settings and the device's display settings.
 *
 * `ref` is a short reference that is also written to the server log with the status, so
 * "the reference below tells us where it stopped" is true: there is no request id on the
 * wire to quote, and Next's own digest only exists for a thrown error. The result is data,
 * never a throw: the panel stays open on `{ok: false}` and a retry sends it again.
 *
 * NOTE: this file may export ONLY async functions (a `"use server"` module registers
 * every export as an action).
 */
export async function clearAllReadingData(): Promise<
  { ok: true } | { ok: false; ref: string }
> {
  const ref = Math.random().toString(36).slice(2, 10);
  const token = await getSession();
  if (!token) {
    console.error(`library clear-all ${ref}: no session`);
    return { ok: false, ref };
  }
  try {
    await clearAllReaderState(token);
    return { ok: true };
  } catch (error) {
    const status = error instanceof ApiError ? error.status : "network";
    console.error(`library clear-all ${ref}: ${status}`);
    return { ok: false, ref };
  }
}
