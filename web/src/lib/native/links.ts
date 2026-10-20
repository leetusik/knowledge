/**
 * Links and images at render (P29 *References* → "At render").
 *
 * Native: only the README's schemes reach a link, and every one resolves here:
 *  - `#id` → the in-chapter anchor (ingest proved the id exists);
 *  - `http(s)://…` → an external link, opened in a new tab with
 *    `rel="noopener noreferrer"`;
 *  - `chapter:` / `doc:` → through `resolveRef`, the caller's lookup of a target
 *    the READER can open; no answer is a missing link;
 *  - anything else → a missing link.
 * A missing link renders as plain text with a "missing link" hook. It never
 * carries the target's URL, path or title, so a private or nonexistent target
 * leaks nothing (404-never-403), and it is never a dead link.
 *
 * Images: native images are `asset:<name>` only, resolved through `assetUrl`
 * (the version's asset map → the same-origin BFF relay). `md` (no ingest
 * validation) allows `#…`, http(s), `mailto:` and relative links; every other
 * scheme (`javascript:`, `data:`, `vbscript:`, `file:` …) is a missing link.
 */
import { parseRef, RefError, type Ref } from "./refs";
import type { ChapterFormat } from "./parse";

export type ChapterRef = Extract<Ref, { kind: "chapter" }>;
export type DocRef = Extract<Ref, { kind: "doc" }>;

export interface LinkContext {
  format: ChapterFormat;
  /** asset name → a same-origin URL, or null when this version holds no such asset. */
  assetUrl?: (name: string) => string | null;
  /**
   * asset name → its URL AND its size from the version's asset map (P30.S16): what the image box
   * reserves its ratio from, and the still frame of an animated GIF. Preferred over `assetUrl`.
   */
  assetInfo?: (name: string) => AssetInfo | null;
  /** A `chapter:` / `doc:` target → the href the reader can open, or null (missing). */
  resolveRef?: (ref: ChapterRef | DocRef) => string | null;
  /** `md` only: the document's absolute URL, which a relative link resolves against. */
  baseUrl?: string;
}

/** One image of a version as the image box needs it (`02-figures` §1; the asset map's entry). */
export interface AssetInfo {
  url: string;
  /** Pixels, as displayed; null when the map is not at hand (the box then falls back to 16:9). */
  width: number | null;
  height: number | null;
  animated: boolean;
  /** The first frame of an animated GIF (a same-origin URL). */
  stillUrl: string | null;
}

export type ResolvedLink =
  | { kind: "anchor"; href: string }
  | { kind: "internal"; href: string }
  | { kind: "external"; href: string }
  | { kind: "missing" };

const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;

function resolveMdLink(href: string, ctx: LinkContext): ResolvedLink {
  const value = href.trim();
  if (value === "") return { kind: "missing" };
  if (value.startsWith("#")) return { kind: "anchor", href: value };
  const scheme = SCHEME_RE.exec(value)?.[1].toLowerCase();
  if (scheme === "http" || scheme === "https")
    return { kind: "external", href: value };
  if (scheme === "mailto") return { kind: "external", href: value };
  if (scheme !== undefined) return { kind: "missing" };
  if (value.startsWith("//"))
    return { kind: "external", href: `https:${value}` };
  if (!ctx.baseUrl) return { kind: "internal", href: value };
  try {
    const url = new URL(value, ctx.baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      return { kind: "missing" };
    return { kind: "internal", href: url.href };
  } catch {
    return { kind: "missing" };
  }
}

export function resolveLink(href: string, ctx: LinkContext): ResolvedLink {
  if (ctx.format === "md") return resolveMdLink(href, ctx);
  let ref: Ref;
  try {
    ref = parseRef(href, false);
  } catch (exc) {
    if (exc instanceof RefError) return { kind: "missing" };
    throw exc;
  }
  switch (ref.kind) {
    case "id":
      return { kind: "anchor", href: `#${ref.id}` };
    case "external":
      return { kind: "external", href: ref.url };
    case "chapter":
    case "doc": {
      const target = ctx.resolveRef?.(ref) ?? null;
      return target ? { kind: "internal", href: target } : { kind: "missing" };
    }
    default:
      return { kind: "missing" };
  }
}

/** An image's same-origin URL, or null (render the alt text as a missing image). */
export function resolveImage(src: string, ctx: LinkContext): string | null {
  if (ctx.format === "md") {
    const value = src.trim();
    // Only same-origin relative images: the CSP's img-src is 'self', and a
    // third-party image would leak the reader's visit.
    if (!value || SCHEME_RE.test(value) || value.startsWith("//")) return null;
    if (!ctx.baseUrl) return value.startsWith("/") ? value : null;
    try {
      const url = new URL(value, ctx.baseUrl);
      const base = new URL(ctx.baseUrl);
      return url.origin === base.origin ? `${url.pathname}${url.search}` : null;
    } catch {
      return null;
    }
  }
  let ref: Ref;
  try {
    ref = parseRef(src, true);
  } catch (exc) {
    if (exc instanceof RefError) return null;
    throw exc;
  }
  return ref.kind === "asset" ? assetHref(ref.name, ctx) : null;
}

/** A bare asset name (a figure's `src`, a row item's `image`) → URL or null. */
export function assetHref(
  name: string | null | undefined,
  ctx: LinkContext,
): string | null {
  if (!name) return null;
  const url = ctx.assetUrl?.(name) ?? null;
  // Defence in depth: only a same-origin path may reach an <img>.
  return url && url.startsWith("/") && !url.startsWith("//") ? url : null;
}

/**
 * A bare asset name → its URL and size (P30.S16), through `assetInfo` when the caller has the
 * map, else through `assetUrl` (size unknown). Only a same-origin path may reach an `<img>`.
 */
export function resolveAsset(
  name: string | null | undefined,
  ctx: LinkContext,
): AssetInfo | null {
  if (!name) return null;
  const sameOrigin = (u: string | null | undefined): string | null =>
    u && u.startsWith("/") && !u.startsWith("//") ? u : null;
  if (ctx.assetInfo) {
    const info = ctx.assetInfo(name);
    const url = sameOrigin(info?.url);
    if (!info || !url) return null;
    return { ...info, url, stillUrl: sameOrigin(info.stillUrl) };
  }
  const url = assetHref(name, ctx);
  return url
    ? { url, width: null, height: null, animated: false, stillUrl: null }
    : null;
}

const ASSET_FILE_RE = /^[0-9a-f]{64}\.(png|jpg|webp|gif)$/;

/**
 * The `assetUrl` for a document read: an asset NAME → the same-origin BFF image
 * relay (`/api/documents/{id}/assets/{file}`, P30.S4), or null when the
 * version's map does not hold it (the figure then renders its alt text).
 */
export function documentAssetUrl(
  docId: number,
  assets: Record<string, { file: string }> | null | undefined,
): (name: string) => string | null {
  return (name) => {
    if (!assets || !Object.prototype.hasOwnProperty.call(assets, name))
      return null;
    const file = assets[name]?.file;
    return typeof file === "string" && ASSET_FILE_RE.test(file)
      ? `/api/documents/${docId}/assets/${file}`
      : null;
  };
}

/**
 * The `assetInfo` for a document read (P30.S16): a name → the relay URL, the pixel size, and
 * for an animated GIF the relay URL of its still frame; null when the version's map does not
 * hold it (or holds a malformed entry).
 */
export function documentAssets(
  docId: number,
  assets:
    | Record<
        string,
        {
          file: string;
          width?: number;
          height?: number;
          animated?: boolean;
          still?: string;
        }
      >
    | null
    | undefined,
): (name: string) => AssetInfo | null {
  const url = (file: unknown): string | null =>
    typeof file === "string" && ASSET_FILE_RE.test(file)
      ? `/api/documents/${docId}/assets/${file}`
      : null;
  const size = (n: unknown): number | null =>
    typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
  return (name) => {
    if (!assets || !Object.prototype.hasOwnProperty.call(assets, name))
      return null;
    const entry = assets[name];
    const href = url(entry?.file);
    if (!entry || !href) return null;
    const w = size(entry.width);
    const h = size(entry.height);
    const animated = entry.animated === true;
    return {
      url: href,
      // Both or neither: half a size would give a wrong ratio.
      width: w && h ? w : null,
      height: w && h ? h : null,
      animated,
      stillUrl: animated ? url(entry.still) : null,
    };
  };
}
