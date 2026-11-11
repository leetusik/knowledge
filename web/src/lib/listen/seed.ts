import "server-only";

import { getListenState, type KbListenState } from "@/lib/knowledge/listen";

import type { ListenDocKey } from "./types";

/**
 * P41-sr.W1 — the Listen state a reader page reads at load (beside the page's own load),
 * so the head's Listen renders with the page and never pops in under the reader: its
 * length when made (F6), Continue listening when left part-way. Signed in only: Listen's
 * routes are session-only (P41-sr.B1). Any miss or fault reads as "no Listen here" (null),
 * so the reader never fails over it; `unavailable` (a legacy format) is null too.
 */
export async function readListenState(
  token: string,
  key: ListenDocKey,
): Promise<KbListenState | null> {
  try {
    const state = await getListenState(token, key);
    return state.state === "unavailable" ? null : state;
  } catch {
    return null;
  }
}
