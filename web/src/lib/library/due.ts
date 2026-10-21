import "server-only";

import { cache } from "react";

import { getReviewDue } from "@/lib/knowledge/reader";
import { getSession } from "@/lib/session";

/**
 * P30.S22 — the Review pill's count (`06-library` §1, open question 11): `counts.due` of
 * the signed-in reader. Read once per request. The shell never fails over it: a fault, a
 * missing session or an older server is 0, which draws no number.
 */
export const reviewDue = cache(async (): Promise<number> => {
  const token = await getSession();
  if (!token) return 0;
  try {
    return await getReviewDue(token);
  } catch {
    return 0;
  }
});
