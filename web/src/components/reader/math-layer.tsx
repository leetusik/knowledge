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
 *   definition window, its sheet or its longer definition shows.
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
 */
function fitKeeps(root: HTMLElement): void {
  const keeps = Array.from(root.querySelectorAll<HTMLElement>(".ra-keep"));
  for (const k of keeps)
    if (k.classList.contains("is-wide")) k.classList.remove("is-wide");
  const wide = keeps.filter(
    (k) =>
      k.getClientRects().length > 0 &&
      k.getBoundingClientRect().width > lineWidth(lineOf(k)) + 0.5,
  );
  for (const k of wide) k.classList.add("is-wide");
}
