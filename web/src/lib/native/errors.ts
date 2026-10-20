/**
 * Violations and the one error the native parser reports (mirrors
 * `server/native/errors.py`).
 *
 * P29 *Ingest*: every failure lists EVERY violation. The TS side never raises
 * on a violation: `parseChapter` returns the list beside the tree, so the
 * renderer (`validate.ts`) can refuse exactly the blocks that break the
 * contract and still show the rest.
 */

export interface Violation {
  /** 1-based line in the whole chapter source, header included. */
  line: number;
  /** 1-based column; best effort (1 when only the line is known). */
  col: number;
  /** A stable machine code, listed in `server/native/README.md`. */
  code: string;
  message: string;
  /** The typed block's authored id, when inside one. */
  block?: string;
  /** svg: the offending element. */
  element?: string;
  /** svg: the offending attribute. */
  attribute?: string;
}

export interface ViolationExtra {
  block?: string | null;
  element?: string | null;
  attribute?: string | null;
}

export class Collector {
  readonly violations: Violation[] = [];

  add(
    line: number,
    code: string,
    message: string,
    extra: ViolationExtra = {},
    col = 1,
  ): void {
    const v: Violation = { line, col, code, message };
    if (extra.block != null) v.block = extra.block;
    if (extra.element != null) v.element = extra.element;
    if (extra.attribute != null) v.attribute = extra.attribute;
    this.violations.push(v);
  }

  get any(): boolean {
    return this.violations.length > 0;
  }

  /** Sorted by line, then column, then code — `NativeFormatError`'s order. */
  sorted(): Violation[] {
    return [...this.violations].sort(
      (a, b) =>
        a.line - b.line ||
        a.col - b.col ||
        (a.code < b.code ? -1 : a.code > b.code ? 1 : 0),
    );
  }
}

/**
 * The `.err` fixture form (`fixtures_util.format_errors`): one `<line> <code>`
 * row per distinct pair, sorted by line then code.
 */
export function formatErrors(violations: readonly Violation[]): string {
  const rows = new Map<string, [number, string]>();
  for (const v of violations) rows.set(`${v.line} ${v.code}`, [v.line, v.code]);
  return [...rows.values()]
    .sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
    .map(([line, code]) => `${line} ${code}\n`)
    .join("");
}
