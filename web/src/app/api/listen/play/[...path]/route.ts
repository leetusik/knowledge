import { json } from "@/lib/bff";
import { ApiError } from "@/lib/knowledge/client";
import { getListenPlay } from "@/lib/knowledge/listen";
import { openSession, readSessionCookie } from "@/lib/session";

// P41-sr.B2 — the BFF relay for Listen's audio: the playlist, its parts and the
// timeline the player loads from `/api/listen/play/…`, relayed to knowledge's
// session-only `GET|HEAD /app/listen/play/<path>?<query>`. Modelled on the image
// relay (`app/api/documents/[id]/assets/[file]/route.ts`), with what media needs:
//   - SESSION ONLY: the sealed `knowledge_session` cookie is unsealed and its
//     bearer forwarded; without one the answer is 401 and nothing is called.
//     knowledge decides visibility (a part plays exactly when its document reads),
//     and every miss is its one 404.
//   - NOT AN OPEN PROXY: only paths under this prefix, of one or two plain segments
//     (`<list>.m3u8`, `timeline`, `<unit>/<n>.m4a`), are relayed, read from the raw
//     request path; `..`, `.`, an empty segment, an encoded slash or any other
//     escape is a 404 before any call. The query string is passed exactly as given.
//   - RANGE: `Range` and `If-Range` are forwarded; the status (200, 206, 416) and
//     `Content-Range`, `Content-Length`, `Accept-Ranges`, `ETag`, `Last-Modified`
//     pass through, and the body is STREAMED (`upstream.body`, never buffered), so
//     a media stack's open-ended ranges start at once.
//   - HEADERS: the content type passes only when it is one this family serves;
//     `nosniff` and `default-src 'none'; sandbox` are always set, and a cache scope
//     is never widened to `public`.
// node:crypto (cookie unseal) + a per-request session read ⇒ nodejs runtime, never
// statically cached — the auth-route idiom.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "/api/listen/play/";
const SEGMENT = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?$/;
const MAX_PATH = 8192;

const FORWARD = ["range", "if-range"] as const;
const PASS = [
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
] as const;
const TYPES = new Set([
  "audio/mp4",
  "application/vnd.apple.mpegurl",
  "application/json",
]);

/** The relayed tail (`a/b`), or null when the request path is not one of ours. */
function playPath(req: Request): string | null {
  const { pathname } = new URL(req.url);
  if (!pathname.startsWith(PREFIX) || pathname.length > MAX_PATH) return null;
  const segments = pathname.slice(PREFIX.length).split("/");
  if (segments.length > 2 || !segments.every((s) => SEGMENT.test(s))) {
    return null;
  }
  return segments.join("/");
}

async function relay(req: Request, method: "GET" | "HEAD"): Promise<Response> {
  // 1. The path first: anything outside the prefix is a 404 that calls nothing.
  const path = playPath(req);
  if (path === null) {
    return json(404, { ok: false });
  }

  // 2. Session only: Listen has no anonymous read.
  const token = openSession(readSessionCookie(req));
  if (!token) {
    return json(401, { ok: false });
  }

  // 3. Relay, forwarding the range headers. An upstream 401/404 keeps its status;
  //    any other fault is a 502.
  const headers: Record<string, string> = {};
  for (const name of FORWARD) {
    const value = req.headers.get(name);
    if (value !== null) headers[name] = value;
  }
  let upstream: Response;
  try {
    upstream = await getListenPlay(token, path, new URL(req.url).search, {
      method,
      headers,
      signal: req.signal,
    });
  } catch (error) {
    if (error instanceof ApiError && [401, 404].includes(error.status)) {
      return json(error.status, { ok: false });
    }
    return json(502, { ok: false });
  }

  const out = new Headers({
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  });
  const cache = upstream.headers.get("cache-control") ?? "";
  out.set(
    "Cache-Control",
    cache && !cache.includes("public") ? cache : "no-store",
  );
  if (upstream.status === 416) {
    const range = upstream.headers.get("content-range");
    if (range) out.set("Content-Range", range);
    await upstream.body?.cancel();
    return new Response(null, { status: 416, headers: out });
  }
  const type = (upstream.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!TYPES.has(type)) {
    await upstream.body?.cancel();
    return json(502, { ok: false });
  }
  out.set("Content-Type", type);
  for (const name of PASS) {
    const value = upstream.headers.get(name);
    if (value !== null) out.set(name, value);
  }
  return new Response(method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: out,
  });
}

export async function GET(req: Request): Promise<Response> {
  return relay(req, "GET");
}

export async function HEAD(req: Request): Promise<Response> {
  return relay(req, "HEAD");
}
