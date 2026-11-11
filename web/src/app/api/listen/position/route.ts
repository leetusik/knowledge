import { z } from "zod";

import { json } from "@/lib/bff";
import { ApiError } from "@/lib/knowledge/client";
import { putListenPosition } from "@/lib/knowledge/listen";
import {
  assertSameOrigin,
  openSession,
  readSessionCookie,
} from "@/lib/session";

// P41-sr.B2 — the Listen position beacon, on the reader beacon's pattern
// (`app/api/reader/position/route.ts`). The player saves its place through a
// server action while it runs; on `pagehide` / `visibilitychange: hidden` it calls
// `navigator.sendBeacon("/api/listen/position", JSON.stringify(body))`, which a
// server action cannot receive. This route unseals the session and relays to
// knowledge's `PUT /app/listen/position` (P41-sr.B1), where last write wins.
//   - Same-origin only (403): nothing cross-site may move a listener's place.
//   - `sendBeacon` sends a string as `text/plain;charset=UTF-8`, so text/plain is
//     accepted beside application/json and parsed as JSON either way (415 for
//     anything else). The body is capped (413) before parsing.
//   - No session: 401 and nothing is stored.
//   - knowledge's 401, 404 (a private or deleted document) and 422 pass through;
//     any other fault is a 502. A beacon's response is never read: the body is `{ok}`.
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
    doc: segment.optional(),
    book: segment.optional(),
    from_chapter: segment.optional(),
    lang: z
      .string()
      .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/)
      .optional(),
    chapter: segment.optional(),
    seconds: z.number().min(0).max(14400),
    speed: z.number().min(0.5).max(3).optional(),
    follow: z.boolean().optional(),
    kept: z.boolean().optional(),
  })
  .strict()
  .refine((v) => (v.doc === undefined) !== (v.book === undefined))
  .refine((v) => v.doc === undefined || v.from_chapter === undefined);

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
    await putListenPosition(
      token,
      parsed.data as Parameters<typeof putListenPosition>[1],
    );
  } catch (error) {
    if (error instanceof ApiError && [401, 404, 422].includes(error.status)) {
      return json(error.status, { ok: false });
    }
    return json(502, { ok: false });
  }
  return json(200, { ok: true });
}
