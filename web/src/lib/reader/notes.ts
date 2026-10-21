/**
 * P30.S20 — the small rules of highlights and notes (`05-annotations` round 01): what the
 * popover and the undo line say for a given highlight, the note's length count, and the
 * client id. Pure, shared by the annotation layer and its tests.
 */
import { READER } from "@/content";

const T = READER.notes;

/** OQ17 as signed: a note holds at most 2,000 characters (the field and the server). */
export const NOTE_MAX = 2000;
/** From here the hint line ends with the count. */
export const NOTE_COUNT_FROM = 1800;
/** The undo line stays this long (open question 11, as signed). */
export const UNDO_MS = 10_000;

/** What a highlight carries that goes with it when it is deleted. */
export interface Hangers {
  note: string;
  /** Its review card exists: "Review this" is on, or was turned on (and is paused). */
  card: boolean;
}

/** The line beside Delete highlight (none when nothing else goes). */
export function deleteLine(h: Hangers): string | null {
  if (h.card && h.note) return T.pop.goesBoth;
  if (h.card) return T.pop.goesCard;
  if (h.note) return T.pop.goesNote;
  return null;
}

/** The undo line after a highlight is deleted. */
export function undoText(h: Hangers): string {
  if (h.card && h.note) return T.undo.all;
  if (h.card) return T.undo.cardOnly;
  if (h.note) return T.undo.note;
  return T.undo.plain;
}

/** The line under Review this: on, paused after being on, or never on. */
export function reviewLine(on: boolean, everOn: boolean): string {
  if (on) return T.pop.reviewOn;
  return everOn ? T.pop.reviewPaused : T.pop.reviewNever;
}

/**
 * The note's count at the end of the hint line: none under 1,800 characters, "1,850 /
 * 2,000" from there, and the full line at the cap. The field's `maxlength` counts UTF-16
 * units, so the count does too (a note under it is always within the server's 2,000 code
 * points).
 */
export function countLine(length: number): string | null {
  if (length < NOTE_COUNT_FROM) return null;
  if (length >= NOTE_MAX) return T.pop.countFull;
  return T.pop.count(length);
}

/** A note as it is saved: plain text, line breaks kept, the ends trimmed; "" = no note. */
export function cleanNote(text: string): string {
  return text.replace(/^\s+|\s+$/g, "").slice(0, NOTE_MAX);
}

/** The language a reader's own words are in, for `lang` (Hangul-heavy text is Korean). */
export function langOf(text: string, fallback: string): string {
  const ko = (text.match(/[가-힣]/g) ?? []).length;
  const la = (text.match(/[A-Za-z]/g) ?? []).length;
  if (!ko && !la) return fallback;
  return ko > la ? "ko" : "en";
}

/** Text cut at `n` characters on a word boundary, with "…". */
export function clip(text: string, n: number): string {
  const s = String(text ?? "");
  const cs = Array.from(s);
  if (cs.length <= n) return s;
  return (
    cs
      .slice(0, n - 1)
      .join("")
      .replace(/\s+\S*$/, "") + "…"
  );
}

/** A client-generated UUID v4: the write's idempotency key (a repeat is a no-op). */
export function newId(): string {
  const c = typeof crypto !== "undefined" ? crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // Not a secure context (plain http on a LAN name): build a v4 from random bytes.
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(b);
  else for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}
