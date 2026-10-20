import { json } from "@/lib/bff";
import { getDocumentAsset } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import { openSession, readSessionCookie } from "@/lib/session";

// P30.S4 — the BFF relay for one stored chapter image, what the native reader's
// <img> tags load (same origin, so the app CSP's `img-src 'self'` covers it). It
// relays knowledge's optional-identity `GET /app/documents/{id}/assets/{file}`,
// modelled on the raw-HTML relay beside it:
//   - OPTIONAL-IDENTITY: a valid session forwards its bearer, anything else relays
//     TOKENLESS, and knowledge decides — an image is readable exactly when its
//     document is, and every miss is one indistinguishable 404 (404-never-403).
//   - The headers are re-asserted EXPLICITLY, never copied from upstream: the
//     content type comes from the validated file extension, `nosniff` pins it, and
//     `default-src 'none'; sandbox` means nothing in the response can run even on a
//     direct visit. Only the cache scope is taken from upstream, and only as one of
//     the two values it may be (public only for a public project).
// node:crypto (cookie unseal) + a per-request session read ⇒ nodejs runtime, never
// statically cached — the auth-route idiom.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE_RE = /^[0-9a-f]{64}\.(png|jpg|webp|gif)$/;

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

const CACHE_PRIVATE = "private, max-age=300";
const CACHE_PUBLIC = "public, max-age=300";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; file: string }> },
): Promise<Response> {
  // 1. Validate both segments first: a bad id or file name is a 404 before any
  //    session read or upstream call, and it leaks nothing.
  const { id: idParam, file } = await params;
  const id = Number(idParam);
  const match = FILE_RE.exec(file);
  if (!Number.isInteger(id) || id < 1 || !match) {
    return json(404, { ok: false });
  }

  // 2. OPTIONAL-IDENTITY (P19): forward the bearer when there is a session.
  const token = openSession(readSessionCookie(req)) ?? undefined;

  // 3. Relay. An upstream 404 stays a 404; any other fault is a 502.
  let upstream: Response;
  try {
    upstream = await getDocumentAsset(token, id, file);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return json(404, { ok: false });
    }
    return json(502, { ok: false });
  }

  const cacheScope = (upstream.headers.get("cache-control") ?? "").startsWith(
    "public",
  )
    ? CACHE_PUBLIC
    : CACHE_PRIVATE;
  return new Response(await upstream.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[match[1]],
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": cacheScope,
    },
  });
}
