/**
 * P30.S12 — the app's Content-Security-Policy, defense in depth (P29 *Render
 * model*: "the format needs no CSP relaxation … P30 should add one").
 *
 * Two layers:
 *
 * - **`APP_CSP`, every response** (next.config.ts `headers()`, so it also covers
 *   prerendered marketing pages): no plugins, no `<base>` hijack, only
 *   same-origin frames (the legacy explainer iframe is `/api/documents/{id}/raw`),
 *   never framed by another site (it matches `X-Frame-Options: DENY`), and images
 *   only from this origin or `data:`. It sets no `script-src`: a prerendered page
 *   cannot carry a per-request nonce, and Next's inline bootstrap scripts would
 *   otherwise be blocked.
 *
 * - **`readerCsp(nonce)`, the reader routes** (`src/proxy.ts`, per request):
 *   `APP_CSP` plus `script-src 'self' 'nonce-…' 'strict-dynamic'`. Next reads the
 *   nonce from the request's CSP header and stamps it on every script it emits,
 *   so a script that did not come from Next — which the render pipeline could
 *   never produce anyway — does not run. Dev adds `'unsafe-eval'`, which React's
 *   development build needs; production never does.
 *
 * The two raw-HTML relays keep their own stricter `sandbox` policy (next.config).
 * `style-src` is left open: React's `style={…}` props are inline style attributes
 * on existing surfaces; the native pipeline itself emits none.
 */

const APP_DIRECTIVES = [
  "object-src 'none'",
  "base-uri 'none'",
  "frame-src 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
] as const;

export const APP_CSP = APP_DIRECTIVES.join("; ");

/** The pages that render document bodies: `/documents/…` and the `/@{org}/…` pretty and reader URLs. */
export function isReaderPath(pathname: string): boolean {
  return pathname.startsWith("/documents/") || pathname.startsWith("/@");
}

export function readerCsp(nonce: string, dev = false): string {
  const script = [
    "script-src 'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(dev ? ["'unsafe-eval'"] : []),
  ].join(" ");
  return [...APP_DIRECTIVES, script].join("; ");
}

/** A fresh per-request nonce: 128 random bits, base64. */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
