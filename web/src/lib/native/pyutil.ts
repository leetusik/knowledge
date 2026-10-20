/**
 * Small Python-semantics helpers, so the TS port agrees with
 * `server/native/` on the edges where JS and Python differ.
 */

/** The characters Python's `str.isspace()` / `str.strip()` treat as whitespace. */
const PY_WS =
  "\\t\\n\\v\\f\\r\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const STRIP_RE = new RegExp(`^[${PY_WS}]+|[${PY_WS}]+$`, "g");

/** Python `str.strip()` with no argument. */
export function pyStrip(value: string): string {
  return value.replace(STRIP_RE, "");
}

/** Python `str.splitlines()` (no `keepends`). */
export function pySplitlines(value: string): string[] {
  if (value === "") return [];
  const parts = value.split(/\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/);
  // A trailing separator does not add an empty final line in Python.
  if (/(?:\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029])$/.test(value)) parts.pop();
  return parts;
}

/**
 * A full match the way Python's `re.match(r"^...$")` behaves: `$` also matches
 * right before ONE final newline. The native modules use `^…$` patterns, so a
 * value with a trailing `"\n"` passes there; this keeps the TS side agreeing.
 */
export function pyFullMatch(re: RegExp, value: string): RegExpExecArray | null {
  const m = re.exec(value);
  if (m) return m;
  if (value.endsWith("\n")) return re.exec(value.slice(0, -1));
  return null;
}

/** Python `str.isascii()`. */
export function isAscii(value: string): boolean {
  return /^[\x00-\x7f]*$/.test(value);
}

/** Python's `repr()` of a str, close enough for messages. */
export function pyRepr(value: unknown): string {
  if (typeof value === "string") {
    const q = value.includes("'") && !value.includes('"') ? '"' : "'";
    const body = value
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t")
      .replace(/\r/g, "\\r");
    return q + (q === "'" ? body.replace(/'/g, "\\'") : body) + q;
  }
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (Array.isArray(value)) return `[${value.map(pyRepr).join(", ")}]`;
  if (typeof value === "object") return "{...}";
  return String(value);
}
