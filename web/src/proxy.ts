import { NextResponse, type NextRequest } from "next/server";

import { isReaderPath, newNonce, readerCsp } from "@/lib/csp";
import { REQUEST_PATH_HEADER } from "@/lib/next-path";

/**
 * P30.S11 (D32) — the request-path stamp (Next 16's `proxy`, formerly middleware).
 *
 * A server component cannot read its own URL, so the member guard
 * (`requireSession` / `requireIdentity`) had no way to say where a refused visitor
 * was going and bounced them to a bare `/login`. This proxy copies each page
 * request's path + query into `REQUEST_PATH_HEADER`, and the guard turns it into
 * `/login?next=…` through `loginHref`, which launders it with `safeNextPath`.
 *
 * It only ever SETS headers (overwriting any value a client sent) and never
 * redirects, rewrites or reads a cookie: auth stays in the guards, anonymous
 * public reads stay anonymous. Next strips its internal query (`_rsc`) from
 * `nextUrl` before the proxy sees it. API routes, Next's own assets and the
 * metadata files are skipped: none of them render a guarded page.
 */
export function proxy(request: NextRequest) {
  const forwarded = new Headers(request.headers);
  forwarded.set(
    REQUEST_PATH_HEADER,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  if (!isReaderPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request: { headers: forwarded } });
  }
  // P30.S12 — the reader routes' nonce CSP (`@/lib/csp`). Next reads the nonce
  // from the REQUEST's CSP header and stamps it on its own scripts; the same
  // policy goes on the response. A client-sent CSP header is overwritten.
  const policy = readerCsp(newNonce(), process.env.NODE_ENV === "development");
  forwarded.set("content-security-policy", policy);
  const response = NextResponse.next({ request: { headers: forwarded } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)",
  ],
};
