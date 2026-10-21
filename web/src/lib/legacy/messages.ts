/**
 * P30.S25 — the legacy reader's side of the cross-frame boundary (`09-legacy-and-print`
 * round 01, *The bridge (S2)*; P29 *Legacy path*). Pure and shared: the client island
 * (`components/reader/legacy-reader.tsx`) checks every message with it, and the very-core
 * tests pin it (`web/tests/legacy-bridge.test.ts`).
 *
 * Explainer html is UNTRUSTED. It runs in a sandboxed opaque-origin frame
 * (`LEGACY_SANDBOX`: scripts and popups, never `allow-same-origin`, never top
 * navigation), so the only thing it can hand the parent is a `postMessage`. The parent
 * therefore trusts nothing it is sent:
 *  - the sender must BE this frame's `contentWindow` (an opaque origin has no origin to
 *    check, so the window's identity is the check; any other window is ignored);
 *  - the data must be a small plain object of exactly the drawn shape
 *    (`{kb: "legacy", v: 1, type, …}`), under a size cap, or it is ignored whole;
 *  - a `navigate` names a path the parent itself routes, laundered by `safeNextPath`
 *    (same origin, no protocol-relative or encoded bypass) and then allowed only when it
 *    is a reader address: a document, a chapter, a book page. Anything else is refused.
 */
import { DEFAULT_NEXT_PATH, safeNextPath } from "@/lib/next-path";

/**
 * The frame's `sandbox` tokens (S2). The relays' CSP `sandbox` directive carries the same
 * tokens, so a top-level visit to the relay (Print · new tab) is held to the same box.
 * Never `allow-same-origin`: with it the document would share the app's origin.
 */
export const LEGACY_SANDBOX =
  "allow-scripts allow-popups allow-popups-to-escape-sandbox";

/** The most characters one message may serialise to; the drawn messages are well under 400. */
export const MAX_MESSAGE_CHARS = 4096;
/** The longest anchor (an element id in the document) the parent keeps. */
export const MAX_ANCHOR = 200;
/** The longest `navigate` href (the login gate's own cap). */
export const MAX_HREF = 2048;

export interface ScrollMessage {
  type: "scroll";
  /** How far through the document, 0..1 (1 when it cannot scroll). */
  fraction: number;
  /** The id of the nearest preceding heading, or null. */
  anchor: string | null;
}

export interface NavigateMessage {
  type: "navigate";
  /** The laundered in-app path to route to. */
  path: string;
}

export type BridgeMessage = ScrollMessage | NavigateMessage;

/** The parent → frame message: land by anchor when the document has it, else by fraction. */
export interface RestoreMessage {
  kb: "legacy";
  v: 1;
  type: "restore";
  anchor?: string;
  fraction?: number;
}

export function restoreMessage(place: {
  anchor?: string | null;
  fraction?: number | null;
}): RestoreMessage {
  const msg: RestoreMessage = { kb: "legacy", v: 1, type: "restore" };
  if (typeof place.anchor === "string" && validAnchor(place.anchor)) {
    msg.anchor = place.anchor;
  }
  if (
    typeof place.fraction === "number" &&
    Number.isFinite(place.fraction) &&
    place.fraction >= 0 &&
    place.fraction <= 1
  ) {
    msg.fraction = place.fraction;
  }
  return msg;
}

function validAnchor(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_ANCHOR &&
    !/[\x00-\x1f\x7f]/.test(value)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const SCROLL_KEYS = new Set(["kb", "v", "type", "fraction", "anchor"]);
const NAVIGATE_KEYS = new Set(["kb", "v", "type", "href"]);

/** The reader addresses a link inside a legacy document may open (everything else is refused). */
const READER_PATHS: readonly RegExp[] = [
  // a document by id, or one of its archived versions
  /^\/documents\/\d{1,12}(?:\/versions\/\d{1,6})?$/,
  // a pretty document `/@{org}/{project}/{slug}`
  /^\/@[^/]+\/[^/]+\/[^/]+$/,
  // a book page, or a chapter of it
  /^\/@[^/]+\/[^/]+\/books\/[^/]+(?:\/[^/]+)?$/,
];

/**
 * The path a `navigate` may route to, or null (refused). `safeNextPath` launders it (it
 * falls back to the default landing for anything it does not recognise, so that answer
 * is a refusal here unless it was literally asked for), then the pathname must be a
 * reader address. The query and the hash are kept (`?lang=`, `?v=`, `#section`).
 */
export function navigatePath(href: unknown): string | null {
  if (typeof href !== "string" || href.length === 0 || href.length > MAX_HREF) {
    return null;
  }
  const safe = safeNextPath(href);
  if (safe === DEFAULT_NEXT_PATH && href !== DEFAULT_NEXT_PATH) return null;
  const pathname = safe.split(/[?#]/, 1)[0];
  if (!READER_PATHS.some((re) => re.test(pathname))) return null;
  return safe;
}

/**
 * One `message` event, judged. `source` is `event.source`, `frame` this frame's
 * `contentWindow` (null when there is no frame now), `data` is `event.data`. Returns the
 * message, or null when anything about it is wrong: then the parent ignores it.
 */
export function readBridgeMessage(
  source: unknown,
  frame: unknown,
  data: unknown,
): BridgeMessage | null {
  if (frame === null || frame === undefined || source !== frame) return null;
  if (!isPlainObject(data)) return null;
  const keys = Object.keys(data);
  if (keys.length > 5) return null;
  let size: number;
  try {
    size = JSON.stringify(data).length;
  } catch {
    return null;
  }
  if (size > MAX_MESSAGE_CHARS) return null;
  if (data.kb !== "legacy" || data.v !== 1) return null;

  if (data.type === "scroll") {
    if (!keys.every((k) => SCROLL_KEYS.has(k))) return null;
    const f = data.fraction;
    if (typeof f !== "number" || !Number.isFinite(f) || f < 0 || f > 1) {
      return null;
    }
    const a = data.anchor;
    if (a !== undefined && a !== null) {
      if (typeof a !== "string" || !validAnchor(a)) return null;
    }
    return {
      type: "scroll",
      fraction: f,
      anchor: typeof a === "string" ? a : null,
    };
  }

  if (data.type === "navigate") {
    if (!keys.every((k) => NAVIGATE_KEYS.has(k))) return null;
    const path = navigatePath(data.href);
    return path === null ? null : { type: "navigate", path };
  }

  return null;
}

/**
 * A document's `look` (`09-legacy-and-print` *Data the page needs*): `"auto"` when it
 * switches to its own dark scheme with the system (a `prefers-color-scheme: dark` rule,
 * `color-scheme: light dark`, or the `color-scheme` meta naming dark), else `"light"`.
 * Read on the server from the relayed bytes; never from the frame.
 */
export function lookOf(html: string): "auto" | "light" {
  if (/prefers-color-scheme\s*:\s*dark/i.test(html)) return "auto";
  if (/color-scheme\s*:\s*(?:light\s+dark|dark\s+light|dark)\b/i.test(html)) {
    return "auto";
  }
  if (
    /<meta[^>]+name\s*=\s*["']?color-scheme["']?[^>]*content\s*=\s*["'][^"']*dark/i.test(
      html,
    )
  ) {
    return "auto";
  }
  return "light";
}
