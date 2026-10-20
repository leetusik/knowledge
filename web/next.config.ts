import type { NextConfig } from "next";

import { APP_CSP } from "./src/lib/csp";

/**
 * knowledge web app — Next.js config (P12.S1 scaffold).
 *
 * `output: "standalone"` emits `.next/standalone/server.js` so a later deploy
 * (P14) can run the lean traced Node server in a container. It is build-only:
 * `next dev` / `next start` ignore it, so local dev is unaffected.
 *
 * Only the generic, everywhere-safe security headers ship here, plus (P30.S12)
 * the app-wide CSP from `src/lib/csp.ts`. HSTS and the production edge/nginx
 * wiring are a deploy concern. The BFF proxy + auth boundary land in P12.S2.
 */
const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          // P30.S12 — the app-wide CSP (defense in depth; `src/lib/csp.ts`). The
          // reader routes get a stricter per-request superset with a script nonce
          // from `src/proxy.ts`; the two raw relays below override this key.
          { key: "Content-Security-Policy", value: APP_CSP },
        ],
      },
      // P16.S2 — the sandboxed-iframe explainer relay exemption. The global
      // `X-Frame-Options: DENY` above blocks even SAME-ORIGIN framing, so the raw
      // HTML route (which the app frames in a sandboxed opaque-origin iframe) must
      // relax it to SAMEORIGIN and gate framing on CSP `frame-ancestors 'self'`
      // instead — only the app can frame it. This entry is LATER + more specific
      // than the global `/:path*`, so for this exact path Next's "last matching
      // entry wins per key" rule resolves `X-Frame-Options` to SAMEORIGIN. The
      // values match the route handler's own headers verbatim, so no layering order
      // can ever produce a wrong value. The parent document page keeps `DENY`.
      {
        source: "/api/documents/:id/raw",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: "sandbox allow-scripts; frame-ancestors 'self'",
          },
        ],
      },
      // P23.S3 — the same exemption for the VERSION-aware relay
      // (`/api/documents/{id}/versions/{v}/raw`), which the past-version view frames
      // identically. This entry is NOT optional and nothing in lint/typecheck/test
      // catches its absence: without it the global `X-Frame-Options: DENY` above
      // wins for that path and the archived explainer fails to frame at RUNTIME
      // only. Values are byte-identical to the entry above and to the route
      // handler's own headers.
      {
        source: "/api/documents/:id/versions/:v/raw",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: "sandbox allow-scripts; frame-ancestors 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
