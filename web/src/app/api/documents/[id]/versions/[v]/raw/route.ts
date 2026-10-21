import { json } from "@/lib/bff";
import { injectLegacyBridge } from "@/lib/legacy/bridge";
import { getDocumentVersionRaw } from "@/lib/knowledge/app";
import { ApiError } from "@/lib/knowledge/client";
import { openSession, readSessionCookie } from "@/lib/session";

// P23.S3 — the version-aware twin of the P16.S2 raw-HTML relay: the same BFF route,
// pointed at an ARCHIVED explainer body instead of the current one. The past-version
// view's `format === "html"` branch frames this URL in the same sandboxed
// opaque-origin iframe.
//
// It is a deliberate COPY of `../../../raw/route.ts` rather than a shared helper:
// this is the security-critical seam (phase P16 pinned decision 1), and the two
// routes' headers must be readable in full at each call site — a superseded
// explainer is exactly as untrusted as a live one, so nothing here may be softened
// by refactoring. The properties it upholds are identical:
//   - OPTIONAL-IDENTITY (P19): the sealed cookie is read but NOT required. A valid
//     session forwards its bearer; a missing/tampered/expired cookie relays
//     TOKENLESS so an anonymous visitor's iframe on a PUBLIC document's history
//     loads. knowledge's `optional_user` is the boundary — a private/nonexistent
//     document, a missing version, a NON-HTML version and an empty stored body are
//     all the same indistinguishable 404, with or without a token.
//   - The sandbox headers are re-asserted EXPLICITLY, never copied from upstream.
//
// node:crypto (cookie unseal) + a per-request session read ⇒ nodejs runtime, never
// statically cached — the auth-route idiom.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The pinned sandbox headers, set EXPLICITLY on every 200 — byte-identical to the
 * current-document relay's, because the containment contract does not vary by
 * version. They also match the next.config `/api/documents/:id/versions/:v/raw`
 * entry verbatim, so header precedence can never resolve to a wrong value.
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
  { params }: { params: Promise<{ id: string; v: string }> },
): Promise<Response> {
  // 1. Validate both segments first: a non-integer / non-positive id or version is
  //    effectively not-found — a 404 before any session read or upstream call, and
  //    it leaks nothing (a bad segment is always 404 regardless of auth).
  //    `isSafeInteger` also rejects `1e21`-style values that would otherwise be
  //    interpolated into the upstream URL in exponent notation.
  const { id: idParam, v: versionParam } = await params;
  const id = Number(idParam);
  const version = Number(versionParam);
  if (!Number.isSafeInteger(id) || id < 1) return json(404, { ok: false });
  if (!Number.isSafeInteger(version) || version < 1) {
    return json(404, { ok: false });
  }

  // 2. OPTIONAL-IDENTITY: read + open the sealed cookie, but do NOT require it. An
  //    anonymous browser sends no cookie, so `token` is `undefined` and
  //    `authHeaders(undefined)` sends no `Authorization` — we never fetch-with-token
  //    on an anonymous visitor's behalf.
  const token = openSession(readSessionCookie(req)) ?? undefined;

  // 3. Relay the archived HTML. A 404 (missing/unreadable document, missing version,
  //    non-HTML version, empty body) passes through as a 404; any other upstream
  //    fault is a 502 — an outage is never reported as if it were the user's mistake.
  let upstream: Response;
  try {
    upstream = await getDocumentVersionRaw(token, id, version);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return json(404, { ok: false });
    }
    // P30.S25: the legacy reader's "Relay failed" state shows this reference
    // ("ref · lg-…"), and the same value is logged here, so a report can be traced.
    const ref = `lg-${crypto.randomUUID().slice(0, 8)}`;
    console.error(
      `[raw relay] %s: upstream failed (ref %s)`,
      `document ${id} v${version}`,
      ref,
      error instanceof ApiError ? error.status : error,
    );
    return json(502, { ok: false, ref });
  }

  // 4. Buffer the body, splice in the legacy bridge (P30.S25: scroll, restore and link
  //    interception for the legacy reader; an opaque origin cannot be read from
  //    outside), and return it under the pinned sandbox headers.
  const html = injectLegacyBridge(await upstream.text());
  return new Response(html, { status: 200, headers: RAW_HTML_HEADERS });
}
