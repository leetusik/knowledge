"use client";

import "@/app/reader-aids.css";

import { useEffect } from "react";

import { fitRadicals } from "@/lib/reader/radicals";

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
      }
    };
    if (!roots().some((r) => r.querySelector("math"))) return;
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
    return () => {
      alive = false;
      document.fonts?.removeEventListener("loadingdone", run);
      mo?.disconnect();
    };
  }, [chapter]);
  return null;
}

/** The room after the widest symbol, in symbol sizes (the record's 5.25 − 4.9). */
const ROOM = 0.35;

function fitLegends(root: HTMLElement): void {
  let widest = 0;
  for (const dt of root.querySelectorAll<HTMLElement>(".ra-legend > dt")) {
    const sym = dt.firstElementChild;
    const size = parseFloat(getComputedStyle(dt).fontSize);
    if (!sym || !size || !dt.getClientRects().length) continue;
    widest = Math.max(widest, sym.getBoundingClientRect().width / size);
  }
  if (!widest) return;
  const k = Math.round((widest + ROOM) * 4) / 4;
  root.style.setProperty("--ra-sym-k", String(k));
}
