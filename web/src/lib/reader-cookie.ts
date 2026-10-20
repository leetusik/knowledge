// The reader-settings cookie — P29 *S3 Who keeps state* ("Reader settings, every
// reader"): a per-device cookie `kb_reader`, WRITTEN by the browser (the Display
// sheet) and READ by the server for the first paint — the `kb_rail` pattern
// (`rail-cookie.ts`): `SameSite=Lax`, not `httpOnly`, one year, and a tampered value
// parses as the default. NOT synced to the account (a phone and a desktop want
// different text sizes), and never stored in `localStorage` or the content tree.
//
// No `server-only`, no `next/headers`: both sides import this module, and that shared
// contract is the point. Nothing here is sensitive — the worst a forged value can do is
// pick a text size.
//
// The value is a small query string — `size=3&theme=sepia[&libraryGroup=subject]` —
// parsed field by field, so a bad field falls back to its own default and never takes
// the others with it. `libraryGroup` is the library's (P30.S22, `06-library`); it is
// kept untouched when the reader writes its own two fields.

/** Cookie name holding the reader's device settings. */
export const READER_COOKIE = "kb_reader";

export type TextSize = 1 | 2 | 3 | 4 | 5;
export type ThemeChoice = "system" | "light" | "dark" | "sepia";
export type LibraryGroup = "project" | "subject";

/** `01-reader` §13: "DisplaySettings { size: 1|2|3|4|5; theme: … } // device only; default {3, "system"}". */
export interface ReaderSettings {
  size: TextSize;
  theme: ThemeChoice;
  /** The library's grouping, remembered here by `06-library`; the reader only carries it through. */
  libraryGroup?: LibraryGroup;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  size: 3,
  theme: "system",
};

const THEMES: readonly ThemeChoice[] = ["system", "light", "dark", "sepia"];
const GROUPS: readonly LibraryGroup[] = ["project", "subject"];

/** One year — this is chrome, not a session. */
const READER_TTL_SECONDS = 60 * 60 * 24 * 365;

/** The value is a few short fields; anything longer is not ours. */
const MAX_VALUE_LENGTH = 200;

/**
 * Parse a raw cookie VALUE. Absent, unknown or tampered fields fall back to the
 * default for that field; the result is always a complete, valid settings object.
 */
export function parseReaderCookie(
  value: string | undefined | null,
): ReaderSettings {
  const out: ReaderSettings = { ...DEFAULT_READER_SETTINGS };
  if (!value || value.length > MAX_VALUE_LENGTH) return out;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(value);
  } catch {
    return out;
  }
  const size = params.get("size");
  if (size !== null && /^[1-5]$/.test(size))
    out.size = Number(size) as TextSize;
  const theme = params.get("theme");
  if (theme !== null && (THEMES as readonly string[]).includes(theme)) {
    out.theme = theme as ThemeChoice;
  }
  const group = params.get("libraryGroup");
  if (group !== null && (GROUPS as readonly string[]).includes(group)) {
    out.libraryGroup = group as LibraryGroup;
  }
  return out;
}

/** The cookie VALUE for a settings object. */
export function serializeReaderCookie(settings: ReaderSettings): string {
  const params = new URLSearchParams();
  params.set("size", String(settings.size));
  params.set("theme", settings.theme);
  if (settings.libraryGroup) params.set("libraryGroup", settings.libraryGroup);
  return params.toString();
}

/**
 * The `document.cookie` assignment string. `Secure` only on https — dev serves plain
 * http on 127.0.0.1, as `railCookieString` accounts for.
 */
export function readerCookieString(
  settings: ReaderSettings,
  secure: boolean,
): string {
  return `${READER_COOKIE}=${serializeReaderCookie(settings)}; Path=/; Max-Age=${READER_TTL_SECONDS}; SameSite=Lax${
    secure ? "; Secure" : ""
  }`;
}

/**
 * Read the settings out of a raw `document.cookie` jar (client side only; the server
 * reads the parsed store). Scans rather than regexes: the jar also holds the sealed
 * session, whose value is arbitrary base64url.
 */
export function readReaderCookie(jar: string): ReaderSettings {
  for (const part of jar.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== READER_COOKIE) continue;
    return parseReaderCookie(part.slice(eq + 1).trim());
  }
  return { ...DEFAULT_READER_SETTINGS };
}

/**
 * The root's `data-md-color-scheme` for a theme choice (`01-reader` *Themes*): the
 * system's `default` (light) and `slate` (dark), and the reader's own `sepia`. System
 * renders `default`; the dark values then come from `prefers-color-scheme` in CSS.
 */
export function schemeFor(theme: ThemeChoice): "default" | "slate" | "sepia" {
  switch (theme) {
    case "dark":
      return "slate";
    case "sepia":
      return "sepia";
    default:
      return "default";
  }
}
