import { json } from "@/lib/bff";
import { injectLegacyBridge } from "@/lib/legacy/bridge";
import { getDocumentRaw } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import { openSession, readSessionCookie } from "@/lib/session";

// P16.S2 — the BFF raw-HTML relay for an HTML explainer document, and the app's
// FIRST non-auth route handler. The document viewer's `format === "html"` branch
// points a sandboxed opaque-origin <iframe> at this same-origin route; the route
// relays the raw HTML (with the pinned sandbox headers) from knowledge's
// session-guarded `GET /app/documents/{id}/raw` to the browser.
//
// It relays the document's own bytes VERBATIM but does not stream them: the body is
// buffered so the legacy bridge can be injected (`@/lib/legacy/bridge`, P30.S25). An
// opaque origin cannot be read from outside, so that injected script is the only way the
// legacy reader learns where the reader is in the document (scroll, restore, links).
// Injecting here rather than in the `explain` template is deliberate — it reaches every
// explainer already saved. Explainers are single self-contained files, so buffering them
// costs nothing. (It replaced P25's height reporter: the frame is now the page's only
// scroller, so nothing measures the document's height.)
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
//     `Content-Security-Policy: sandbox allow-scripts allow-popups
//     allow-popups-to-escape-sandbox; frame-ancestors 'self'` privilege-strips even a
//     direct top-level visit to this URL (defense in depth; Print · new tab opens it
//     top-level). P30.S25 added the two popup tokens (S2: an external link opens a new
//     tab); `allow-same-origin` is NEVER among them, so the document keeps an opaque
//     origin,
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
  "Content-Security-Policy":
    "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox; frame-ancestors 'self'",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  // P30.S25 (D37): `no-transform` stops an edge (Cloudflare) rewriting the relayed
  // document: its analytics beacon and email obfuscation would otherwise run inside the
  // sandbox. `no-store` stays: a member's private document is never cached.
  "Cache-Control": "no-store, no-transform",
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
    // P30.S25: the legacy reader's "Relay failed" state shows this reference
    // ("ref · lg-…"), and the same value is logged here, so a report can be traced.
    const ref = `lg-${crypto.randomUUID().slice(0, 8)}`;
    console.error(
      `[raw relay] %s: upstream failed (ref %s)`,
      `document ${id}`,
      ref,
      error instanceof ApiError ? error.status : error,
    );
    return json(502, { ok: false, ref });
  }

  // 4. Buffer the body, splice in the legacy bridge, and return it under the pinned
  //    sandbox headers. The bridge grants the framed document nothing — it posts scroll
  //    places and link requests outward, and the legacy reader validates the sender and
  //    every message (`@/lib/legacy/messages`) — and the CSP carries no `script-src`, so
  //    an inline script is as permitted here as the document's own quiz JS already is.
  const html = injectLegacyBridge(await upstream.text());
  return new Response(html, { status: 200, headers: RAW_HTML_HEADERS });
}
