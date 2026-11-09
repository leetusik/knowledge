/**
 * P39-hk.S8 — the √ correction (R1 §3; `10-reading-aids` frame-G1: "√ with no trailing
 * space"). Chromium sizes a stretchy radical at the widest glyph of STIX Two Math's √
 * assembly (1.212em) but draws the narrower variant it picked, so an empty advance follows
 * the radicand: 0.418em after √n, less over a tall radicand, none in WebKit or Firefox. The
 * gap is MEASURED per instance, never a fixed margin (the canvas's `-0.38em` is canvas-only:
 * it would overlap the next glyph in Safari and Firefox): after the fonts load, for each
 * `msqrt` / `mroot`, `gap = radical.right − radicand.right`; past 0.01em the radical gets
 * `margin-inline-end: −gap` in em, so it holds at any text size and on paper (same DOM).
 *
 * A radical with no box (inside a hidden term window, `display: none`) is skipped: whoever
 * shows it calls `fitRadicals` on it then (S9's term layer, when a window opens). Without
 * script the gap stays: the safe failure.
 */

const SELECTOR = "msqrt, mroot";

/** Correct every radical under `root` that has a box (innermost first). */
export function fitRadicals(root: ParentNode): void {
  const all = Array.from(root.querySelectorAll<HTMLElement>(SELECTOR));
  if (!all.length) return;
  // Measure from scratch: a previous correction would hide the gap it closed.
  for (const el of all) el.style.marginInlineEnd = "";
  // Innermost first: an inner correction narrows the outer radicand before it is measured.
  for (let i = all.length - 1; i >= 0; i -= 1) fitRadical(all[i]);
}

/** Correct one radical; returns the gap it closed, in em (0 when none or when hidden). */
export function fitRadical(el: HTMLElement): number {
  if (!el.getClientRects().length) return 0;
  const parts = Array.from(el.children);
  const radicand = el.localName === "mroot" ? parts.slice(0, 1) : parts;
  let right = -Infinity;
  for (const part of radicand) {
    const box = part.getBoundingClientRect();
    if (box.width || box.height) right = Math.max(right, box.right);
  }
  if (!Number.isFinite(right)) return 0;
  const size = parseFloat(getComputedStyle(el).fontSize);
  if (!size) return 0;
  const gap = (el.getBoundingClientRect().right - right) / size;
  if (gap <= 0.01) return 0;
  el.style.marginInlineEnd = `${-Math.round(gap * 1000) / 1000}em`;
  return gap;
}
