"use client";

import "@/app/reader-aids.css";

import { useEffect } from "react";

import { fitRadicals } from "@/lib/reader/radicals";

import { lineOf, lineWidth } from "./formula-box";

/**
 * P39-hk.S8 — the chapter's math, after hydration (`10-reading-aids` round 01). It renders
 * nothing; it measures the server's static MathML once the math face has loaded (and again
 * when another face loads or the text size changes):
 *
 * - **√** — Chromium's trailing gap after a radical, closed per instance (`radicals.ts`).
 * - **One symbol column per chapter** (F27) — every "where" legend sets its symbol column to
 *   one width, the chapter's widest legend symbol plus room. The record's chapter measures
 *   P(no event) at about 4.9 × the symbol size and sets 5.25; so the room is 0.35 and the
 *   width is rounded to the nearest quarter, which gives that chapter its 5.25 (P(no event)
 *   measures 4.904 in Chromium: rounding up gave 5.5, the S8 sweep's finding) and any other
 *   chapter its own (`--ra-sym-k` on the chapter; without script the CSS falls back to 5.25).
 * - **Kept runs** (P39-hk.F1; F22, F36) — a hyphenated run kept whole (`.ra-keep`) that is
 *   wider than its whole line gets `is-wide`, so it breaks inside instead of running past the
 *   screen. Also when the window changes size, the chapter reflows (a root font size) or a
 *   definition window, its sheet or its longer definition shows. Since P39-hk.F2 these are every
 *   hyphenated word of the prose and every inline formula held with its Korean particle.
 *
 * It also brings the reading aids' screen sheet (`reader-aids.css`).
 */
export function MathLayer({ chapter }: { chapter: string }) {
  // `chapter` (document, version, language) re-runs the measure when the reader moves to
  // another chapter and this layer stays mounted.
  useEffect(() => {
    const roots = () =>
      Array.from(document.querySelectorAll<HTMLElement>(".rd-prose > .kb-ch"));
    const run = () => {
      for (const root of roots()) {
        fitRadicals(root);
        fitLegends(root);
        fitKeeps(root);
      }
    };
    if (!roots().some((r) => r.querySelector("math, .ra-keep"))) return;
    run();
    let alive = true;
    document.fonts?.ready.then(() => alive && run()).catch(() => {});
    document.fonts?.addEventListener("loadingdone", run);
    const root = document.querySelector(".rd-root");
    const mo =
      root && typeof MutationObserver !== "undefined"
        ? new MutationObserver(run)
        : null;
    if (root)
      mo?.observe(root, { attributes: true, attributeFilter: ["class"] });
    // The kept runs' lines move without a text-size class: re-fit them a frame later on a
    // resize or a reflow (never inside the observer's own delivery), and at once when a
    // window, a sheet or a longer definition shows or hides.
    let frame = 0;
    const keeps = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => roots().forEach(fitKeeps));
    };
    window.addEventListener("resize", keeps);
    const ro =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(keeps);
    const shown =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver(() => roots().forEach(fitKeeps));
    for (const r of roots()) {
      ro?.observe(r);
      // P39-hk.F2: a formula held with its particle changes the pair's width when its own box
      // turns on or off (`InlineFormula`'s `is-over`), with no other change to see: fit again.
      for (const f of r.querySelectorAll<HTMLElement>(".ra-keep > .ra-mi"))
        ro?.observe(f);
      shown?.observe(r, {
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden"],
      });
    }
    return () => {
      alive = false;
      document.fonts?.removeEventListener("loadingdone", run);
      mo?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", keeps);
      ro?.disconnect();
      shown?.disconnect();
    };
  }, [chapter]);
  return null;
}

/** The room after the widest symbol, in symbol sizes (the record's 5.25 − 4.9). */
const ROOM = 0.35;

function fitLegends(root: HTMLElement): void {
  let widest = 0;
  for (const dt of root.querySelectorAll<HTMLElement>(".ra-legend > dt")) {
    // The formula itself, inside its box (P39-hk.F1 round 2): a box that scrolls is the column's width.
    const sym = dt.querySelector("math");
    const size = parseFloat(getComputedStyle(dt).fontSize);
    if (!sym || !size || !dt.getClientRects().length) continue;
    widest = Math.max(widest, sym.getBoundingClientRect().width / size);
  }
  if (!widest) return;
  const k = Math.round((widest + ROOM) * 4) / 4;
  root.style.setProperty("--ra-sym-k", String(k));
}

/**
 * P39-hk.F1 — a kept run wider than its whole line may break (F36: "a word longer than it
 * breaks inside rather than running past the screen"); one that fits stays one unbreakable
 * run, exactly as signed (F22), because it never gets the class. Measured unbroken: the class
 * comes off every run, all of them are read in one layout, and it goes back on the ones wider
 * than their line's content box. A hidden run (a closed window) is left without it.
 * P39-hk.F2 — the prose's runs too (every hyphenated word, a formula with its particle). One
 * write, one read pass (each box's style and rect read once), one write: no layout between reads.
 * While they are read unbroken the column clips sideways, so a run past the screen cannot widen
 * the page: on a phone a wider page widens the layout viewport, and with it the sheet (fixed)
 * whose runs are being read, which would then be read against a line the reader never sees.
 */
function fitKeeps(root: HTMLElement): void {
  const keeps = Array.from(root.querySelectorAll<HTMLElement>(".ra-keep"));
  if (keeps.length === 0) return;
  const styled = root.hasAttribute("style");
  const clip = root.style.overflowX;
  root.style.overflowX = "clip";
  for (const k of keeps)
    if (k.classList.contains("is-wide")) k.classList.remove("is-wide");
  const boxes = new Map<HTMLElement, Room>();
  const room = (el: HTMLElement): Room => {
    let r = boxes.get(el);
    if (!r) boxes.set(el, (r = roomOf(el)));
    return r;
  };
  let wide: HTMLElement[] = [];
  try {
    wide = keeps.filter(
      (k) => k.getClientRects().length > 0 && tooWide(k, root, room),
    );
  } finally {
    root.style.overflowX = clip;
    if (!styled) root.removeAttribute("style");
  }
  for (const k of wide) k.classList.add("is-wide");
}

/** A box's content edges, and whether it bounds what is inside it. */
interface Room {
  left: number;
  right: number;
  /** An inline (or `contents`) box: no edges of its own. */
  inline: boolean;
  /** It scrolls or clips sideways: what is inside may be wider by design (a table's frame). */
  frame: boolean;
  /** Placed out of the flow (a definition window): its edges are its own, not the column's. */
  placed: boolean;
}

function roomOf(el: HTMLElement): Room {
  const cs = getComputedStyle(el);
  const b = el.getBoundingClientRect();
  return {
    left: b.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
    right:
      b.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight),
    inline: cs.display === "inline" || cs.display === "contents",
    frame: cs.overflowX !== "visible",
    placed: cs.position === "absolute" || cs.position === "fixed",
  };
}

/**
 * Wider than the room it has: than its line's content box (F1), or, where that line grows with
 * the run (a flex item's automatic minimum width, such as a callout's title), past the edge of
 * any box it sits in, up to the chapter's column. Never past a box that scrolls: a table grows
 * to its words and scrolls in its own frame, as the prose kit draws (§9). The column itself
 * clips while it is read (`fitKeeps`), so it is a bound, never a frame.
 */
function tooWide(
  k: HTMLElement,
  root: HTMLElement,
  room: (el: HTMLElement) => Room,
): boolean {
  const r = k.getBoundingClientRect();
  const line = lineOf(k);
  if (r.width > lineWidth(line) + 0.5) return true;
  for (let a: HTMLElement | null = line; a; a = a.parentElement) {
    const box = room(a);
    if (a !== line && box.inline) continue;
    if (a !== line && a !== root && box.frame) return false;
    if (r.left < box.left - 0.5 || r.right > box.right + 0.5) return true;
    if (a === root || box.placed) return false;
  }
  return false;
}
