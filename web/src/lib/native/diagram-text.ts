/**
 * Text measuring and wrapping for the drawn diagram kinds (P30.S17; `03-diagrams` build prompt, "Faces and sizes
 * inside a drawing" and "Measuring on the server"). A port of the signed canvas's `dg.js` text rules, except that the
 * width of a string is the sum of the faces' advance widths (`diagram-metrics.ts`, read from the font files) instead
 * of `canvas.measureText`. Pure: no DOM, no React.
 *
 * Units are px at the reader's default text size, where a node label is 15 px and small text 13 px.
 */

import { FACES, type FaceMetrics } from "./diagram-metrics";

export interface Font {
  /** The primary face (`FACES` key). */
  face: "sans400" | "sans600" | "mono400";
  size: number;
  /** Line height. */
  lh: number;
}

/** A node or actor label, an entity name: 15 px / 19, 600. */
export const LABEL: Font = { face: "sans600", size: 15, lh: 19 };
/** A sub line, edge label, step label, note: 13 px / 17, 400. */
export const SMALL: Font = { face: "sans400", size: 13, lh: 17 };
/** A group, lane or layer name: 13 px / 17, 600. */
export const SMALL_B: Font = { face: "sans600", size: 13, lh: 17 };
/** An entity field: 13 px / 18, mono. */
export const MONO: Font = { face: "mono400", size: 13, lh: 18 };

/** The Hangul face that sits behind each primary face in the stack. */
const KO_OF: Record<Font["face"], string> = {
  sans400: "ko400",
  sans600: "ko600",
  mono400: "ko400",
};

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
export const isKo = (s: string): boolean => HANGUL.test(s);

interface Parsed {
  upm: number;
  syllable: number | null;
  widths: Map<number, number>;
}
const parsed = new Map<string, Parsed>();
function face(key: string): Parsed {
  let p = parsed.get(key);
  if (!p) {
    const f: FaceMetrics = FACES[key];
    const widths = new Map<number, number>();
    for (const pair of f.table.split(" ")) {
      const i = pair.indexOf(":");
      widths.set(Number(pair.slice(0, i)), Number(pair.slice(i + 1)));
    }
    p = { upm: f.upm, syllable: f.syllable, widths };
    parsed.set(key, p);
  }
  return p;
}

/** A codepoint with no width of its own (combining marks, zero-width, variation selectors). */
function zeroWidth(cp: number): boolean {
  return (
    (cp >= 0x300 && cp <= 0x36f) ||
    (cp >= 0x200b && cp <= 0x200f) ||
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    cp === 0x2060 ||
    cp === 0xfeff
  );
}

/** The advance of one codepoint, in em: the primary face, then Pretendard, then a fallback by script. */
function advance(cp: number, f: Font): number {
  if (zeroWidth(cp)) return 0;
  const ko = face(KO_OF[f.face]);
  if (cp >= 0xac00 && cp <= 0xd7a3 && ko.syllable !== null)
    return ko.syllable / ko.upm;
  const own = face(f.face);
  const a = own.widths.get(cp);
  if (a !== undefined) return a / own.upm;
  const b = ko.widths.get(cp);
  if (b !== undefined) return b / ko.upm;
  // Not in either face: a full-width script (Jamo, CJK, kana, fullwidth forms) is one em; anything else is
  // measured as an average letter, so the node errs wide rather than clipping.
  if (
    (cp >= 0x1100 && cp <= 0x11ff) ||
    (cp >= 0x2e80 && cp <= 0xd7ff) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xff00 && cp <= 0xffef)
  )
    return 1;
  return f.face === "mono400" ? 0.6 : 0.56;
}

const cache = new Map<string, number>();
/** The width of `text` set in `f`, in px. */
export function measure(text: string, f: Font): number {
  const key = `${f.face}|${f.size}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let em = 0;
  for (const ch of text) em += advance(ch.codePointAt(0) ?? 0, f);
  const w = em * f.size;
  if (cache.size > 20000) cache.clear();
  cache.set(key, w);
  return w;
}

/**
 * Break opportunities: spaces, and inside a word wider than the line, after / - _ . · and ( (a Hangul word has no
 * such place unless it holds one of those: it moves whole to the next line, as keep-all does, and its node grows).
 */
function splitLong(word: string, f: Font, maxW: number): string[] {
  if (measure(word, f) <= maxW) return [word];
  let parts = word.split(/(?<=[/\-_.·(])/u);
  if (parts.length === 1 && !HANGUL.test(word)) parts = Array.from(word);
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if (cur && measure(cur + p, f) > maxW) {
      out.push(cur);
      cur = p;
    } else cur += p;
  }
  if (cur) out.push(cur);
  return out;
}

/** A greedy wrap at `maxW`. A lone `·` stays with the word before it, so no line starts with one. */
export function wrap(text: string, f: Font, maxW: number): string[] {
  const words = String(text)
    .split(/\s+/)
    .filter(Boolean)
    .reduce<string[]>((a, w) => {
      if (w === "·" && a.length) a[a.length - 1] += " ·";
      else a.push(w);
      return a;
    }, []);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    splitLong(w, f, maxW).forEach((piece, k) => {
      const joint = k === 0 ? " " : "";
      const cand = cur ? cur + joint + piece : piece;
      if (cur && measure(cand, f) > maxW) {
        lines.push(cur);
        cur = piece;
      } else cur = cand;
    });
  }
  if (cur || !lines.length) lines.push(cur);
  return lines;
}

export function widest(lines: readonly string[], f: Font): number {
  return lines.reduce((m, l) => Math.max(m, measure(l, f)), 0);
}

/** A balanced wrap: the narrowest width that keeps the line count of a greedy wrap at `maxW`. */
export function wrapBalanced(text: string, f: Font, maxW: number): string[] {
  const lines = wrap(text, f, maxW);
  if (lines.length < 2) return lines;
  // never narrower than a word that fits whole at maxW, so the balance never breaks inside a word
  let lo = String(text)
    .split(/\s+/)
    .reduce((m, w) => {
      const ww = measure(w, f);
      return ww <= maxW ? Math.max(m, ww) : m;
    }, 24);
  let hi = maxW;
  let best = lines;
  for (let k = 0; k < 7; k++) {
    const mid = (lo + hi) / 2;
    const t = wrap(text, f, mid);
    if (t.length <= lines.length && widest(t, f) <= mid + 0.5) {
      best = t;
      hi = mid;
    } else lo = mid;
  }
  return best;
}
