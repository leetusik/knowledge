/**
 * P30.S26 — the printed sheet's pure helpers (`09-legacy-and-print` round 01, *Print: the
 * native sheet*). Not `server-only`: the masthead, the colophon and the notice share them.
 */
import { SITE } from "@/content/site";

/** The site's host with no scheme, as an address reads on paper ("knowledge.hi2vi.com"). */
export function printHost(): string {
  return SITE.url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/**
 * The address a printed sheet carries for an in-app path: the host and the path, no
 * scheme ("a printed URL is typed by hand or read aloud"). An outside URL is kept as it is.
 */
export function printAddress(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${printHost()}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * Where a printed address may break: after each "/" (never inside "//") and before each
 * "?" and "&" (`<wbr>` in the markup), so a line ends between segments and a word is cut
 * only when one segment is longer than the line. Returns the address's pieces; the last
 * piece of every pair but the final one is followed by a break opportunity.
 */
export function addressPieces(address: string): string[] {
  const pieces: string[] = [];
  let cur = "";
  for (let i = 0; i < address.length; i += 1) {
    const ch = address[i];
    if (ch === "?" || ch === "&") {
      if (cur) pieces.push(cur);
      cur = ch;
    } else {
      cur += ch;
      if (ch === "/" && address[i + 1] !== "/") {
        pieces.push(cur);
        cur = "";
      }
    }
  }
  if (cur) pieces.push(cur);
  return pieces;
}

/** `2026-10-21`-style local date → `21 Oct 2026` (the reader's published-date form). */
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** A date as the sheet prints it: "21 Oct 2026". */
export function printDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** How many monospace cells a line of text takes: a wide (East Asian) character is two, a tab four. */
export function cellWidth(text: string): number {
  let n = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (ch === "\t") n += 4;
    else if (
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe6f) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6)
    )
      n += 2;
    else n += 1;
  }
  return n;
}

/** The widest line of a block of text, in monospace cells (an ASCII drawing's column count). */
export function widestLine(text: string): number {
  return text.split("\n").reduce((m, line) => Math.max(m, cellWidth(line)), 0);
}
