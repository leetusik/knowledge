import { json } from "@/lib/bff";
import { getDocumentRaw } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import { openSession, readSessionCookie } from "@/lib/session";

// P16.S2 — the BFF raw-HTML relay for an HTML explainer document, and the app's
// FIRST non-auth route handler. The document viewer's `format === "html"` branch
// points a sandboxed opaque-origin <iframe> at this same-origin route; the route
// relays the raw HTML bytes (with the pinned sandbox headers) from knowledge's
// session-guarded `GET /app/documents/{id}/raw` straight to the browser.
//
// XSS-safety-critical (phase P16 pinned decision 1). Two properties it upholds:
//   - It is OPTIONAL-IDENTITY (P19). The `(app)` layout's `requireIdentity()` covers
//     server components, NOT `/api/*` route handlers, so this route reads the sealed
//     session cookie itself — but no longer REQUIRES it: a valid session forwards its
//     bearer (member read), while a missing/tampered/expired cookie relays TOKENLESS,
//     letting an anonymous visitor's iframe on a PUBLIC doc load. knowledge's
//     `optional_user` is the boundary: a private/nonexistent doc is an
//     indistinguishable 404 with or without a token (404-never-403).
//   - It re-asserts the sandbox headers EXPLICITLY (never trusts upstream drift):
//     `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`
//     privilege-strips even a direct top-level visit to this URL (defense in depth),
//     and `X-Frame-Options: SAMEORIGIN` (paired with the next.config exemption that
//     overrides the global `DENY` for this path) lets only the app itself frame it.
//
// node:crypto (cookie unseal) + a per-request session read ⇒ nodejs runtime, never
// statically cached — the auth-route idiom.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The pinned sandbox headers, set EXPLICITLY on every 200 (never copied from
 * upstream — the values are the security contract, so drift upstream must not leak
 * through). Identical to the values the next.config `/api/documents/:id/raw` entry
 * layers on, so header precedence can never resolve to a wrong value.
 */
const RAW_HTML_HEADERS: Record<string, string> = {
  "Content-Type": "text/html; charset=utf-8",
  "Content-Security-Policy": "sandbox allow-scripts; frame-ancestors 'self'",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  // 1. Validate the id first (like the read page): a non-integer / non-positive id
  //    is effectively not-found — a 404 before any session read or upstream call,
  //    and it leaks nothing (a bad id is always 404 regardless of auth).
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) {
    return json(404, { ok: false });
  }

  // 2. OPTIONAL-IDENTITY (P19): read + open the sealed cookie, but do NOT require it.
  //    A valid session forwards its bearer (member-scoped read); a missing/tampered/
  //    expired cookie relays TOKENLESS (`undefined`), so an anonymous visitor's
  //    sandboxed iframe on a public doc is served the public raw HTML. The
  //    public/private boundary is enforced UPSTREAM by knowledge's `optional_user`:
  //    a private/nonexistent doc is an indistinguishable 404 with or without a token,
  //    and a tokenless call never smuggles credentials (`authHeaders(undefined)` → no
  //    `Authorization` header). We never fetch-with-token on behalf of an anonymous
  //    visitor — an anonymous browser sends no cookie, so `token` is `undefined` here.
  const token = openSession(readSessionCookie(req)) ?? undefined;

  // 3. Relay the raw HTML from knowledge. A 404 (missing / cross-tenant / private /
  //    non-HTML doc / empty raw_html) passes through as a 404; any other upstream
  //    fault is a 502 — an outage is never reported as if it were the user's mistake.
  let upstream: Response;
  try {
    upstream = await getDocumentRaw(token, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return json(404, { ok: false });
    }
    return json(502, { ok: false });
  }

  // 4. Stream the body straight through, re-asserting the pinned sandbox headers.
  return new Response(upstream.body, { status: 200, headers: RAW_HTML_HEADERS });
}
