import { NextResponse, type NextRequest } from "next/server";

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
 * It only ever SETS the header (overwriting any value a client sent) and never
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
  return NextResponse.next({ request: { headers: forwarded } });
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)",
  ],
};
