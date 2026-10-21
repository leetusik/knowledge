/**
 * P28.S5 (D18) — the `?next=` return-address guard for `/login`.
 *
 * **An open redirect on a login page is a real vulnerability**, not a cosmetic one:
 * a link like `/login?next=https://evil.example/knowledge` renders OUR gate, takes
 * the user's password, and then hands the browser to the attacker's page with our
 * origin in the referrer and the user primed to trust whatever it says. So this
 * guard is written to **fail closed**: anything it does not positively recognise as
 * an in-app path becomes the default landing (`/library`), and it never throws.
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
 * REJECTED (→ the default landing), each for a reason:
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
 *   - (P30.S11) a value longer than `MAX_NEXT_PATH_LENGTH` — nothing the app emits
 *     comes near it, and an unbounded value is a free amplifier for log and header
 *     abuse;
 *   - (P30.S11) a path whose PERCENT-DECODED form carries `//`, `\` or a control
 *     character anywhere — `/%2F%2Fevil.example`, `/%5Cevil`, `/%252F%252Fevil`
 *     (decoded up to three times). The raw string is same-origin, but any layer
 *     that decodes the path before it redirects (a proxy, a framework, a future
 *     refactor) would turn it into a protocol-relative URL. No real path of ours
 *     ever contains an empty segment, so nothing legitimate is lost;
 *   - `/login` and `/signup` themselves, which are not an attack but a LOOP: the
 *     gate would bounce an authenticated visitor back to the gate forever.
 *
 * Deliberately NOT `server-only`: the guard runs on the server (`login/page.tsx`,
 * `redirectIfAuthenticated`) and in the browser (the post-login navigation), and it
 * must be the SAME function in both places — two copies would drift.
 */

/**
 * Where a missing or rejected `next` lands. P30.S22 (`06-library` open question 3): the
 * library, for every member; it was `/dashboard`. A safe `next` still wins.
 */
export const DEFAULT_NEXT_PATH = "/library";

/** The sign-in gate. */
export const LOGIN_PATH = "/login";

/**
 * P30.S11 — the longest `next` honoured. Generous for any real reader URL (org,
 * project, book, chapter, `?lang=&v=` and a block id run well under 300).
 */
export const MAX_NEXT_PATH_LENGTH = 2048;

/**
 * P30.S11 (D32) — the request header the proxy (`src/proxy.ts`) stamps with the
 * path + query of every page request, so a server guard can build `/login?next=`
 * for the page it is refusing. The proxy always OVERWRITES it, so a client cannot
 * plant one on a proxied route, and its value is laundered by `safeNextPath`
 * before use regardless.
 */
export const REQUEST_PATH_HEADER = "x-kb-request-path";

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
  if (raw.length > MAX_NEXT_PATH_LENGTH) return DEFAULT_NEXT_PATH;

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

  // Encoded bypasses: judge the path as a decoding layer would see it.
  if (!decodedPathIsSafe(url.pathname)) return DEFAULT_NEXT_PATH;

  const segment = url.pathname;
  if (
    LOOP_PATHS.some((p) => segment === p || segment.startsWith(`${p}/`))
  ) {
    return DEFAULT_NEXT_PATH;
  }

  return path;
}

/** Unsafe in a path at any decoding depth: an empty segment, a backslash, a control character. */
const UNSAFE_DECODED = /\/\/|\\|[\x00-\x1f\x7f]/;

/**
 * Percent-decode `pathname` up to three times and refuse it if any stage carries
 * `//`, `\` or a control character, or if a stage is not valid percent-encoding.
 * Three rounds covers double- and triple-encoding; a value still changing after
 * that is refused outright rather than trusted.
 */
function decodedPathIsSafe(pathname: string): boolean {
  let current = pathname;
  for (let round = 0; round < 3; round += 1) {
    if (UNSAFE_DECODED.test(current)) return false;
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return false;
    }
    if (decoded === current) return true;
    current = decoded;
  }
  return !UNSAFE_DECODED.test(current) && decodeOnce(current) === current;
}

function decodeOnce(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * P30.S11 — the sign-in URL that returns to `next`: `/login?next=<encoded>`, or a
 * bare `/login` when `next` is missing, unsafe, or already the default landing.
 * `next` is laundered HERE as well as at the gate, so a caller can never emit a
 * link that names an off-site return address. The value is the full path, query
 * and `#hash`; the browser keeps the hash inside the encoded parameter, so the
 * gate hands it back intact (the reader's "Sign in to save" relies on that to
 * return to the same block).
 */
export function loginHref(next?: string | null): string {
  const safe = safeNextPath(next);
  return safe === DEFAULT_NEXT_PATH
    ? LOGIN_PATH
    : `${LOGIN_PATH}?next=${encodeURIComponent(safe)}`;
}
