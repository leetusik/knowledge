/**
 * Id syntax, assignment and uniqueness (mirrors `server/native/ids.py`,
 * P29 *Ids*). See that module's docstring for the namespace rules.
 */
import { isAscii, pyFullMatch } from "./pyutil";

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const ID_MAX = 64;

export function isValidId(value: unknown): value is string {
  return typeof value === "string" && pyFullMatch(ID_RE, value) !== null;
}

/** The assigned id of an ASCII heading, or null (non-ASCII or empty). */
export function headingSlug(text: string): string | null {
  if (!isAscii(text)) return null;
  let slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length > ID_MAX) slug = slug.slice(0, ID_MAX).replace(/-+$/, "");
  if (!slug) return null;
  if (slug === "sources") return "sources-list";
  return slug;
}

/**
 * Tracks the document namespace. Authored ids are claimed first, in source
 * order; ids are assigned afterwards, in source order, around them.
 */
export class IdRegistry {
  private readonly taken: Set<string>;
  private readonly members = new Set<string>();
  readonly document: string[] = [];

  constructor(reserved: Iterable<string> = []) {
    this.taken = new Set(reserved);
  }

  claim(value: string): boolean {
    if (this.members.has(value)) return false;
    this.take(value);
    return true;
  }

  has(value: string): boolean {
    return this.members.has(value);
  }

  assignSlug(slug: string): string {
    if (!this.taken.has(slug)) return this.take(slug);
    for (let n = 2; ; n += 1) {
      const suffix = `-${n}`;
      const candidate =
        slug.slice(0, ID_MAX - suffix.length).replace(/-+$/, "") + suffix;
      if (!this.taken.has(candidate)) return this.take(candidate);
    }
  }

  assignNumbered(prefix: string): string {
    let n = 1;
    while (this.taken.has(`${prefix}-${n}`)) n += 1;
    return this.take(`${prefix}-${n}`);
  }

  private take(value: string): string {
    this.taken.add(value);
    this.members.add(value);
    this.document.push(value);
    return value;
  }
}
