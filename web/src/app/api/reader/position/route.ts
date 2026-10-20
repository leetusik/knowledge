import { z } from "zod";

import { json } from "@/lib/bff";
import { ApiError } from "@/lib/knowledge/client";
import { putReaderPosition } from "@/lib/knowledge/reader";
import {
  assertSameOrigin,
  openSession,
  readSessionCookie,
} from "@/lib/session";

// P30.S8 — the position beacon (P29 *Routes and writes*: the one route handler).
// The reader writes its position 2 s after scrolling stops and at most every 15 s
// through a server action; on `pagehide` / `visibilitychange: hidden` it calls
// `navigator.sendBeacon("/api/reader/position", JSON.stringify(position))`, which a
// server action cannot receive. This route unseals the session and relays to
// knowledge's `PUT /app/reader/positions`, where the conflict rules live
// (last-write-wins position, grow-only `max_fraction`, set-only `finished` except
// Mark as unread).
//   - Same-origin only (403): a beacon from our own page carries Origin /
//     Sec-Fetch-Site; nothing cross-site may write a reader's position.
//   - `sendBeacon` sends a string as `text/plain;charset=UTF-8`, so text/plain is
//     accepted beside application/json, and the body is parsed as JSON either way
//     (415 for anything else). The body is capped (413) before parsing.
//   - No session: 401 and nothing is stored (anonymous readers keep no state).
//   - knowledge's 404 (a private or deleted document) and 422 pass through; any
//     other fault is a 502. A beacon's response is never read, so the body is `{ok}`.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 4096;
const segment = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^/\s][^/]*$/);

const positionSchema = z
  .object({
    org: z.string().min(1).max(200),
    project: segment,
    doc: segment,
    version: z.number().int().min(1).optional(),
    anchor_id: z.string().min(1).max(200).nullable().optional(),
    fraction: z.number().min(0).max(1),
    max_fraction: z.number().min(0).max(1).optional(),
    finished: z.boolean().optional(),
  })
  .strict();

export async function POST(req: Request): Promise<Response> {
  if (!assertSameOrigin(req)) {
    return json(403, { ok: false });
  }
  const contentType = req.headers.get("content-type") ?? "";
  if (
    !contentType.includes("application/json") &&
    !contentType.includes("text/plain")
  ) {
    return json(415, { ok: false });
  }
  const token = openSession(readSessionCookie(req));
  if (!token) {
    return json(401, { ok: false });
  }

  const text = await req.text();
  if (text.length > MAX_BODY) {
    return json(413, { ok: false });
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return json(400, { ok: false });
  }
  const parsed = positionSchema.safeParse(raw);
  if (!parsed.success) {
    return json(422, { ok: false });
  }

  try {
    await putReaderPosition(token, parsed.data);
  } catch (error) {
    if (error instanceof ApiError && [401, 404, 422].includes(error.status)) {
      return json(error.status, { ok: false });
    }
    return json(502, { ok: false });
  }
  return json(200, { ok: true });
}
