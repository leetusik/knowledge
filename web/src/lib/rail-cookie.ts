// The rail-fold preference cookie — a UI preference, NOT a session artifact. It is
// WRITTEN by the browser (the topbar toggle in `app-frame.tsx`) and READ by the server
// (`AppShell`) so the FIRST PAINT already carries the right grid: no flash of an
// expanded rail, no localStorage, no post-hydration layout jump.
//
// Deliberately the inverse of `session.ts` on every axis: no `server-only` (BOTH sides
// import this module — that shared contract is the whole point), no `next/headers` (it
// would poison the client bundle), no crypto, and no `httpOnly` (JS must be able to
// write it). `SameSite=Lax` rather than the session cookie's `Strict`: a visitor
// arriving from an external link to a shared `/documents/{id}` must still get their own
// chrome on that first navigation. Nothing here is sensitive — the worst a forged value
// can do is fold a nav rail.

/** Cookie name holding the rail-fold preference. */
export const RAIL_COOKIE = "kb_rail";

/** The only two values ever written. Anything else parses as "expanded". */
export const RAIL_COLLAPSED = "collapsed";
export const RAIL_EXPANDED = "expanded";

/** One year — this is chrome, not a session (which tracks the 30d token instead). */
const RAIL_TTL_SECONDS = 60 * 60 * 24 * 365;

/**
 * `true` only for the exact collapsed sentinel. Absent, unknown, or tampered ⇒
 * EXPANDED: the safe default is the rail VISIBLE, because a hidden rail reached through
 * a value nothing in this app wrote would be a dead end.
 */
export function isRailCollapsed(value: string | undefined | null): boolean {
  return value === RAIL_COLLAPSED;
}

/**
 * The `document.cookie` assignment string. `Secure` only on https — dev serves plain
 * http on 127.0.0.1, exactly as `sessionCookieOptions()` accounts for.
 */
export function railCookieString(collapsed: boolean, secure: boolean): string {
  const value = collapsed ? RAIL_COLLAPSED : RAIL_EXPANDED;
  return `${RAIL_COOKIE}=${value}; Path=/; Max-Age=${RAIL_TTL_SECONDS}; SameSite=Lax${
    secure ? "; Secure" : ""
  }`;
}

/**
 * Read the preference out of a raw `document.cookie` jar (client side only — the server
 * reads the parsed store instead). `null` means "no opinion stored", and the caller
 * falls back to whatever the server rendered.
 *
 * Scans rather than regexes because the jar also holds `knowledge_session`, whose sealed
 * value is arbitrary base64url — a loose pattern could match inside it.
 */
export function readRailCookie(jar: string): boolean | null {
  for (const part of jar.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== RAIL_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    if (value === RAIL_COLLAPSED) return true;
    if (value === RAIL_EXPANDED) return false;
    return null;
  }
  return null;
}
