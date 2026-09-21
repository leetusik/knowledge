/**
 * P28.S5 (D18) — the `?next=` return-address guard for `/login`.
 *
 * **An open redirect on a login page is a real vulnerability**, not a cosmetic one:
 * a link like `/login?next=https://evil.example/knowledge` renders OUR gate, takes
 * the user's password, and then hands the browser to the attacker's page with our
 * origin in the referrer and the user primed to trust whatever it says. So this
 * guard is written to **fail closed**: anything it does not positively recognise as
 * an in-app path becomes `/dashboard`, and it never throws.
 *
 * THE ACCEPTED SHAPE — the contract `P28.S6`'s public-graph gate line must match
 * (it emits `/login?next={publicBase}/documents/{id}` with `publicBase = "/@{org}"`,
 * which is exactly this shape):
 *
 *   - a **same-origin relative path**: one leading `/`, then anything a URL allows,
 *     with an optional `?query` and `#hash` — e.g. `/@acme/handbook/onboarding`,
 *     `/documents/41?view=full`, `/graph`;
 *   - the value is what `URLSearchParams`/`searchParams` already decoded, so the
 *     caller passes it through untouched;
 *   - it is re-serialised through `URL`, so `/a/../b` normalises to `/b` before it
 *     is ever handed to `redirect()` or `router.replace()`.
 *
 * REJECTED (→ `/dashboard`), each for a reason:
 *
 *   - anything not starting with `/` — `https://evil.example`, `evil.example`,
 *     `javascript:alert(1)`, `mailto:…`: a different origin, or not a location;
 *   - `//host` and `/\host` — **protocol-relative**, the classic bypass: they look
 *     relative and are not. (Browsers and URL parsers both treat a backslash here
 *     as a slash, so backslashes are rejected outright.);
 *   - anything carrying a control character or whitespace — `/\tevil`, `/%0A/x`:
 *     URL parsers STRIP tab/newline before resolving, so a string that looks
 *     path-like can resolve elsewhere;
 *   - a repeated `?next=` (the caller hands us `string[]`) or an empty value;
 *   - `/login` and `/signup` themselves, which are not an attack but a LOOP: the
 *     gate would bounce an authenticated visitor back to the gate forever.
 *
 * Deliberately NOT `server-only`: the guard runs on the server (`login/page.tsx`,
 * `redirectIfAuthenticated`) and in the browser (the post-login navigation), and it
 * must be the SAME function in both places — two copies would drift.
 */

/** Where a missing or rejected `next` lands. */
export const DEFAULT_NEXT_PATH = "/dashboard";

/**
 * Paths that would bounce the visitor straight back to the gate. Matched as whole
 * path segments (`/login`, `/login/x`), never as a prefix of `/loginsomething`.
 */
const LOOP_PATHS = ["/login", "/signup"];

/**
 * A base whose origin nothing in the app can be, used only so `URL` will normalise
 * a relative path for us. If parsing a candidate ever yields a different origin,
 * the candidate was not relative and is rejected.
 */
const PARSE_BASE = "https://next-path.invalid";

/**
 * Normalise a `?next=` value to a safe in-app path, or fall back to
 * `DEFAULT_NEXT_PATH`. Never throws; never returns anything but a path beginning
 * with a single `/`.
 */
export function safeNextPath(
  raw: string | string[] | null | undefined,
): string {
  // A repeated key arrives as an array — ambiguous input on a security boundary is
  // rejected rather than resolved.
  if (typeof raw !== "string" || raw.length === 0) return DEFAULT_NEXT_PATH;

  // Relative, and not protocol-relative. `/\` is `//` to a URL parser.
  if (!raw.startsWith("/")) return DEFAULT_NEXT_PATH;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_NEXT_PATH;
  if (raw.includes("\\")) return DEFAULT_NEXT_PATH;

  // Control characters and whitespace: parsers strip some of these before
  // resolving, so `/\t/evil.example` is not the path it looks like.
  if (/[\x00-\x20\x7f]/.test(raw)) return DEFAULT_NEXT_PATH;

  let url: URL;
  try {
    url = new URL(raw, PARSE_BASE);
  } catch {
    return DEFAULT_NEXT_PATH;
  }
  // A relative path can never change the origin. If it did, it was not relative.
  if (url.origin !== PARSE_BASE) return DEFAULT_NEXT_PATH;

  const path = `${url.pathname}${url.search}${url.hash}`;
  // Belt and braces: `new URL("/..//evil", base).pathname` normalises, but re-check
  // rather than trust the shape of the output.
  if (!path.startsWith("/") || path.startsWith("//")) return DEFAULT_NEXT_PATH;

  const segment = url.pathname;
  if (
    LOOP_PATHS.some((p) => segment === p || segment.startsWith(`${p}/`))
  ) {
    return DEFAULT_NEXT_PATH;
  }

  return path;
}
