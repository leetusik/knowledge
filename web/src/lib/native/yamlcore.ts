/**
 * A YAML 1.2 *core schema* loader (mirrors `server/native/yamlcore.py`).
 *
 * The `yaml` package parses with the failsafe schema (every scalar a string),
 * and plain scalars are resolved here by the 1.2 core regexes, exactly as the
 * Python side resolves them on top of PyYAML. It refuses what the native format
 * forbids instead of ignoring it: anchors, aliases, explicit tags, `%YAML` /
 * `%TAG` directives, more than one document, duplicate keys, non-string keys,
 * the merge key `<<`, and `.inf` / `.nan`.
 *
 * `load(text)` returns `{data, lines}`, where `lines` maps a path key
 * (`pathKey(["items", 0, "id"])`) to the 0-based line of that node inside
 * `text`; a field's line is its key's line. Errors throw `YamlError`.
 */
import {
  isAlias,
  isMap,
  isScalar,
  isSeq,
  LineCounter,
  parseAllDocuments,
  type Node as YamlNode,
} from "yaml";

import { pyRepr } from "./pyutil";

export const MAX_DEPTH = 32;

export type YamlPath = readonly (string | number)[];
export type YamlValue =
  null | boolean | number | string | YamlValue[] | { [key: string]: YamlValue };

export class YamlError extends Error {
  constructor(
    /** 0-based line inside the YAML text. */
    readonly line: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** The stable key of a YAML path in the `lines` map. */
export function pathKey(path: YamlPath): string {
  return JSON.stringify(path);
}

const NULL_RE = /^(?:~|null|Null|NULL|)$/;
const TRUE_RE = /^(?:true|True|TRUE)$/;
const FALSE_RE = /^(?:false|False|FALSE)$/;
const INT10_RE = /^[-+]?[0-9]+$/;
const INT8_RE = /^0o[0-7]+$/;
const INT16_RE = /^0x[0-9a-fA-F]+$/;
const FLOAT_RE = /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+)?$/;
const SPECIAL_FLOAT_RE = /^(?:[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;

type Scalarish = {
  type?: string;
  value: unknown;
  range?: [number, number, number] | null;
};

export function load(text: string): {
  data: YamlValue;
  lines: Map<string, number>;
} {
  const counter = new LineCounter();
  const lineOf = (offset: number | undefined) =>
    offset === undefined ? 0 : counter.linePos(offset).line - 1;

  const parsed = parseAllDocuments(text, {
    schema: "failsafe",
    uniqueKeys: false,
    merge: false,
    lineCounter: counter,
    prettyErrors: false,
  });
  const docs = Array.isArray(parsed) ? parsed : [];
  const lines = new Map<string, number>();
  if (docs.length === 0) return { data: null, lines };
  const doc = docs[0];

  // PyYAML is a streaming parser: whichever comes first in the text — a
  // forbidden construct or a syntax error — is the one reported.
  const syntax = doc.errors[0];
  const syntaxAt = syntax ? (syntax.pos?.[0] ?? 0) : Number.POSITIVE_INFINITY;
  const forbidden = firstForbidden(doc, lineOf);
  if (forbidden && forbidden.offset <= syntaxAt) throw forbidden.error;
  if (syntax) {
    const line = syntax.linePos
      ? syntax.linePos[0].line - 1
      : lineOf(syntax.pos?.[0]);
    const problem = syntax.message
      .split("\n")[0]
      .replace(/ at line \d+, column \d+:?$/, "");
    throw new YamlError(line, "yaml", `invalid YAML: ${problem}`);
  }
  if (docs.length > 1) {
    const start = docs[1].range?.[0] ?? text.length;
    throw new YamlError(
      lineOf(start),
      "yaml",
      "invalid YAML: expected a single document in the stream",
    );
  }
  if (doc.contents === null) return { data: null, lines };
  return { data: convert(doc.contents as YamlNode, [], lines, lineOf), lines };
}

function firstForbidden(
  doc: ReturnType<typeof parseAllDocuments> extends infer D
    ? D extends readonly (infer E)[]
      ? E
      : never
    : never,
  lineOf: (offset: number | undefined) => number,
): { offset: number; error: YamlError } | null {
  const directives = doc.directives;
  const tagHandles = Object.keys(directives?.tags ?? {}).filter(
    (h) => !(h === "!!" && directives?.tags[h] === "tag:yaml.org,2002:"),
  );
  if (directives?.yaml?.explicit || tagHandles.length > 0) {
    return {
      offset: 0,
      error: new YamlError(
        0,
        "yaml-tag",
        "YAML directives (%YAML, %TAG) are not allowed",
      ),
    };
  }
  let best: { offset: number; error: YamlError } | null = null;
  const consider = (offset: number, error: YamlError) => {
    if (best === null || offset < best.offset) best = { offset, error };
  };
  let depthHit: { offset: number; error: YamlError } | null = null;
  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== "object") return;
    const n = node as {
      range?: [number, number, number] | null;
      anchor?: string;
      tag?: string;
    };
    const at = n.range?.[0] ?? 0;
    if (isAlias(node)) {
      consider(
        at,
        new YamlError(
          lineOf(at),
          "yaml-anchor",
          "YAML aliases (*name) are not allowed",
        ),
      );
      return;
    }
    if (n.anchor) {
      consider(
        at,
        new YamlError(
          lineOf(at),
          "yaml-anchor",
          "YAML anchors (&name) are not allowed",
        ),
      );
    }
    if (n.tag && n.tag !== "!") {
      consider(
        at,
        new YamlError(
          lineOf(at),
          "yaml-tag",
          `YAML tags are not allowed (${n.tag})`,
        ),
      );
    }
    if (isMap(node) || isSeq(node)) {
      if (depth + 1 > MAX_DEPTH && depthHit === null) {
        depthHit = {
          offset: at,
          error: new YamlError(
            lineOf(at),
            "limit",
            `YAML nests deeper than ${MAX_DEPTH} levels`,
          ),
        };
      }
      if (depth + 1 > MAX_DEPTH) return;
      if (isMap(node)) {
        for (const pair of node.items) {
          walk(pair.key, depth + 1);
          walk(pair.value, depth + 1);
        }
      } else {
        for (const item of node.items) walk(item, depth + 1);
      }
    }
  };
  walk(doc.contents, 0);
  const hit = depthHit as { offset: number; error: YamlError } | null;
  if (hit !== null) consider(hit.offset, hit.error);
  return best;
}

function resolveScalar(
  node: Scalarish,
  lineOf: (o: number | undefined) => number,
): YamlValue {
  const value = String(node.value ?? "");
  if (node.type !== "PLAIN") return value; // quoted or block scalar: always a string
  if (NULL_RE.test(value)) return null;
  if (TRUE_RE.test(value)) return true;
  if (FALSE_RE.test(value)) return false;
  if (INT10_RE.test(value)) return parseInt(value, 10);
  if (INT8_RE.test(value)) return parseInt(value.slice(2), 8);
  if (INT16_RE.test(value)) return parseInt(value.slice(2), 16);
  if (FLOAT_RE.test(value)) return parseFloat(value);
  if (SPECIAL_FLOAT_RE.test(value))
    throw new YamlError(
      lineOf(node.range?.[0]),
      "yaml-value",
      `${pyRepr(value)} is not a JSON number`,
    );
  return value;
}

function convert(
  node: YamlNode | null,
  path: (string | number)[],
  lines: Map<string, number>,
  lineOf: (offset: number | undefined) => number,
): YamlValue {
  if (node === null) {
    // An empty value (`key:`) is a null scalar.
    return null;
  }
  const start = lineOf(node.range?.[0]);
  lines.set(pathKey(path), start);
  if (path.length > MAX_DEPTH)
    throw new YamlError(
      start,
      "limit",
      `YAML nests deeper than ${MAX_DEPTH} levels`,
    );
  if (isScalar(node)) return resolveScalar(node as Scalarish, lineOf);
  if (isSeq(node)) {
    return node.items.map((child, i) =>
      convert(child as YamlNode | null, [...path, i], lines, lineOf),
    );
  }
  if (isMap(node)) {
    const out: { [key: string]: YamlValue } = {};
    const seen = new Set<string>();
    for (const pair of node.items) {
      const keyNode = pair.key as YamlNode | null;
      const keyAt = keyNode?.range?.[0] ?? node.range?.[0];
      const line = lineOf(keyAt);
      if (keyNode !== null && !isScalar(keyNode))
        throw new YamlError(line, "yaml-key", "mapping keys must be strings");
      const key =
        keyNode === null ? null : resolveScalar(keyNode as Scalarish, lineOf);
      if (typeof key !== "string") {
        const raw =
          keyNode === null ? "" : String((keyNode as Scalarish).value ?? "");
        throw new YamlError(
          line,
          "yaml-key",
          `mapping key ${pyRepr(raw)} must be a string`,
        );
      }
      if (key === "<<" && (keyNode as Scalarish).type === "PLAIN")
        throw new YamlError(
          line,
          "yaml-merge",
          "YAML merge keys (<<) are not allowed",
        );
      if (seen.has(key))
        throw new YamlError(
          line,
          "yaml-duplicate-key",
          `duplicate key ${pyRepr(key)}`,
        );
      seen.add(key);
      const value = pair.value as YamlNode | null;
      const converted =
        value === null ? null : convert(value, [...path, key], lines, lineOf);
      // defineProperty, never `out[key] =`: a `__proto__` key must stay data.
      Object.defineProperty(out, key, {
        value: converted,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      lines.set(pathKey([...path, key]), line); // a field's line is its key's line
    }
    return out;
  }
  throw new YamlError(start, "yaml", "unsupported YAML node");
}
