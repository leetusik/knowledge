/**
 * Reference syntax (mirrors `server/native/refs.py`, P29 *References*).
 *
 * Every link or image URL in a native chapter must be one of:
 *   `#<id>` (in-chapter) · `http(s)://host…` (links only) · `asset:<name>`
 *   (images only) · `chapter:[<project>/]<book>/<key>[?lang=<xx>][#<id>]` ·
 *   `doc:[<project>/]<slug>`.
 * Anything else (`mailto:`, `javascript:`, `data:`, relative paths …) is refused.
 */
import { isValidId } from "./ids";
import { pyFullMatch, pyRepr } from "./pyutil";

const ASSET_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const CHAPTER_RE = /^chapter:([^?#]+)(?:\?lang=([^#]*))?(?:#(.*))?$/;
const DOC_RE = /^doc:([^?#]+)$/;
// The server's convention validators (server/documents.py, server/books.py).
const PROJECT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const KEY_MAX = 80;
const LANG_RE = /^[a-z]{2,3}$/;

export type Ref =
  | { kind: "id"; id: string }
  | { kind: "asset"; name: string }
  | {
      kind: "chapter";
      project: string | null;
      book: string;
      key: string;
      lang: string | null;
      id: string | null;
    }
  | { kind: "doc"; project: string | null; slug: string }
  | { kind: "external"; url: string };

export class RefError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function isAssetName(value: unknown): value is string {
  return (
    typeof value === "string" && pyFullMatch(ASSET_NAME_RE, value) !== null
  );
}

const validProject = (v: string) =>
  pyFullMatch(PROJECT_RE, v) !== null && !v.includes("..") && !v.includes("/");
const validSlug = (v: string) => pyFullMatch(KEBAB_RE, v) !== null;
const validKey = (v: string) =>
  v.length <= KEY_MAX && pyFullMatch(KEBAB_RE, v) !== null;
const validLang = (v: string) => pyFullMatch(LANG_RE, v) !== null;

/**
 * `urllib.parse.urlsplit`'s scheme and netloc, enough to tell an external
 * http(s) URL. Returns null where Python would raise (an unbalanced IPv6 bracket).
 */
function splitUrl(href: string): { scheme: string; netloc: string } | null {
  // urlsplit drops ASCII tab/CR/LF and strips leading C0 controls and spaces.
  const url = href.replace(/[\t\r\n]/g, "").replace(/^[\x00-\x20]+/, "");
  const m = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(url);
  const scheme = m ? m[1].toLowerCase() : "";
  let rest = m ? url.slice(m[0].length) : url;
  let netloc = "";
  if (rest.startsWith("//")) {
    rest = rest.slice(2);
    const end = rest.search(/[/?#]/);
    netloc = end === -1 ? rest : rest.slice(0, end);
    const open = netloc.includes("[");
    const close = netloc.includes("]");
    if (open !== close) return null;
  }
  return { scheme, netloc };
}

/** Classify `href`; throw `RefError` when it is outside the contract. */
export function parseRef(href: string, image = false): Ref {
  const notImage = () =>
    new RefError(
      "ref-scheme",
      `an image must be asset:<name>, not ${pyRepr(href)}`,
    );
  if (href.startsWith("#")) {
    if (image) throw notImage();
    const target = href.slice(1);
    if (!isValidId(target))
      throw new RefError(
        "ref-malformed",
        `malformed in-chapter reference ${pyRepr(href)}`,
      );
    return { kind: "id", id: target };
  }
  if (href.startsWith("asset:")) {
    const name = href.slice("asset:".length);
    if (!isAssetName(name))
      throw new RefError(
        "ref-malformed",
        `malformed asset name in ${pyRepr(href)}`,
      );
    if (!image)
      throw new RefError(
        "ref-asset-link",
        `asset:${name} may only be an image, not a link`,
      );
    return { kind: "asset", name };
  }
  if (href.startsWith("chapter:")) {
    if (image) throw notImage();
    const bad = () =>
      new RefError(
        "ref-malformed",
        `malformed chapter reference ${pyRepr(href)}`,
      );
    const m = pyFullMatch(CHAPTER_RE, href);
    if (!m) throw bad();
    const parts = m[1].split("/");
    const lang = m[2] ?? null;
    const frag = m[3] ?? null;
    let project: string | null = null;
    let book: string;
    let key: string;
    if (parts.length === 3) [project, book, key] = parts;
    else if (parts.length === 2) [book, key] = parts;
    else throw bad();
    if (
      (project !== null && !validProject(project)) ||
      !validKey(book) ||
      !validKey(key) ||
      (lang !== null && !validLang(lang)) ||
      (frag !== null && !isValidId(frag))
    )
      throw bad();
    return { kind: "chapter", project, book, key, lang, id: frag };
  }
  if (href.startsWith("doc:")) {
    if (image) throw notImage();
    const m = pyFullMatch(DOC_RE, href);
    const parts = m ? m[1].split("/") : [];
    let project: string | null;
    let slug: string;
    if (parts.length === 2) [project, slug] = parts;
    else if (parts.length === 1) [project, slug] = [null, parts[0]];
    else
      throw new RefError(
        "ref-malformed",
        `malformed doc reference ${pyRepr(href)}`,
      );
    if ((project !== null && !validProject(project)) || !validSlug(slug))
      throw new RefError(
        "ref-malformed",
        `malformed doc reference ${pyRepr(href)}`,
      );
    return { kind: "doc", project, slug };
  }
  const split = splitUrl(href);
  if (
    split !== null &&
    (split.scheme === "http" || split.scheme === "https") &&
    split.netloc
  ) {
    if (image)
      throw new RefError(
        "ref-external-image",
        `external images are not allowed (${pyRepr(href)})`,
      );
    return { kind: "external", url: href };
  }
  if (image) throw notImage();
  throw new RefError(
    "ref-scheme",
    `links must be #id, http(s):, chapter: or doc:, not ${pyRepr(href)}`,
  );
}
