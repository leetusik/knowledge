"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Fades, useBox } from "./scroll-box";

/**
 * P39-hk.S8 — the display formula's own box (`10-reading-aids` round 01, *Display formula
 * block*; frame F7): a row wider than the column scrolls inside it, never the page. Whether
 * it scrolls is MEASURED, the way the prose kit's boxes are (`scroll-box.tsx` `useBox`):
 * while it can, the box is a focusable `role="region"` named "Formula, scrolls sideways"
 * and the side with more fades over 2.5rem (`is-more-start` / `is-more-end`). Server render
 * and first client render agree: no region, no fade. The MathML arrives as `children`,
 * rendered on the server; nothing here reads or builds it.
 *
 * P39-hk.F1 round 2 (OQ12): the fade is the tables' overlay (`Fades`, on the page's ground)
 * over the box, inside `.ra-mb__box`, instead of a mask on the box, which clipped the box's
 * focus ring. At rest it looks the same: a formula block sits only on the page's ground (a
 * typed block never sits inside a list, quote or callout).
 */
export function FormulaBox({
  label,
  children,
}: {
  /** The region's accessible name while the box scrolls. */
  label: string;
  children: ReactNode;
}) {
  const { m, ref } = useBox("self");
  const cls = [
    "ra-mb__eq",
    m.over ? "is-over" : "",
    m.over && m.l ? "is-more-start" : "",
    m.over && m.r ? "is-more-end" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="ra-mb__box">
      <div
        className={cls}
        ref={(el) => {
          ref.current = el;
        }}
        tabIndex={m.over ? 0 : undefined}
        role={m.over ? "region" : undefined}
        aria-label={m.over ? label : undefined}
      >
        {children}
      </div>
      {m.over ? <Fades /> : null}
    </div>
  );
}

interface Fit {
  /** The formula is wider than the room it has. */
  over: boolean;
  /** More remains to the start / to the end (only while `over`). */
  l: boolean;
  r: boolean;
}

const FITS: Fit = { over: false, l: false, r: false };

/**
 * P39-hk.F1 — the box whose lines a run sits on: its nearest ancestor that is not an inline
 * (or `contents`) box. Shared with `MathLayer`'s kept runs.
 */
export function lineOf(el: HTMLElement): HTMLElement {
  for (let a = el.parentElement; a; a = a.parentElement) {
    const d = getComputedStyle(a).display;
    if (d !== "inline" && d !== "contents") return a;
  }
  return document.body;
}

/** The width of a box's content: the room a whole line has in it. */
export function lineWidth(el: HTMLElement): number {
  const cs = getComputedStyle(el);
  return (
    el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  );
}

/** The legend a symbol sits in (its `dl.ra-legend`). */
function legendOf(box: HTMLElement): HTMLElement {
  return (box.closest(".ra-legend") as HTMLElement | null) ?? lineOf(box);
}

/** A symbol's whole line: the legend's row, less the gap before the meaning. */
function legendRoom(legend: HTMLElement): number {
  return (
    lineWidth(legend) - (parseFloat(getComputedStyle(legend).columnGap) || 0)
  );
}

/** What sets a formula's room: its line (`line`), or its legend's row (`legend`). */
type Within = "line" | "legend";

const AGAINST: Record<Within, (box: HTMLElement) => HTMLElement> = {
  line: lineOf,
  legend: legendOf,
};

const ROOM: Record<Within, (line: HTMLElement) => number> = {
  line: lineWidth,
  legend: legendRoom,
};

/**
 * P39-hk.F1 — whether a formula fits the room it has, MEASURED: the formula (the scroller's
 * first child) against its room (`within`), again whenever either changes size (a text size,
 * a font, the window, a definition window opening) and on the scroller's own scroll. A hidden
 * formula keeps what stands until it shows. Server render and first client render agree: it
 * fits.
 */
function useFit(within: Within) {
  const outer = useRef<HTMLSpanElement | null>(null);
  const inner = useRef<HTMLSpanElement | null>(null);
  const [m, setM] = useState<Fit>(FITS);

  const read = useCallback(() => {
    const box = outer.current;
    const sc = inner.current;
    const math = sc?.firstElementChild;
    if (!box || !sc || !math || !math.getClientRects().length) return;
    const over =
      math.getBoundingClientRect().width >
      ROOM[within](AGAINST[within](box)) + 0.5;
    const max = sc.scrollWidth - sc.clientWidth;
    const l = over && max > 1 && sc.scrollLeft > 1;
    const r = over && max > 1 && sc.scrollLeft < max - 1;
    setM((prev) =>
      prev.over === over && prev.l === l && prev.r === r
        ? prev
        : { over, l, r },
    );
  }, [within]);

  useEffect(() => {
    const box = outer.current;
    const sc = inner.current;
    const math = sc?.firstElementChild;
    if (!box || !sc || !math) return;
    read();
    sc.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    const ro =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(read);
    ro?.observe(math);
    ro?.observe(AGAINST[within](box));
    document.fonts?.ready.then(read).catch(() => {});
    return () => {
      sc.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
      ro?.disconnect();
    };
  }, [within, read]);

  // Turning the box on or off changes what it can scroll: read the sides again.
  useEffect(read, [m.over, read]);
  return { m, outer, inner };
}

/** The scroller's classes: the side with more takes a fade (only while it scrolls). */
function sides(base: string, m: Fit): string {
  return [
    base,
    m.over && m.l ? "is-more-start" : "",
    m.over && m.r ? "is-more-end" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * P39-hk.F1 — an inline formula's own box (`10-reading-aids` round 01, *Inline formula*,
 * with F7's display rule). A formula never breaks inside (MathML has no inline line breaking
 * in Chromium), so one wider than its whole line would push the page sideways. Where it
 * fits, the box is two plain inline spans: no box, no region, nothing changes. While it does
 * not fit its line (the nearest block's content box), the outer span is a box as wide as the
 * line (`is-over`), and the inner one scrolls inside it: the side with more fades over 2.5rem
 * and it is a focusable `role="region"` named "Formula, scrolls sideways". Its fade is a
 * mask, not the overlay the display box takes (round 2): an inline formula sits on any
 * ground (a callout's, a table header's, a window's), and an overlay paints the page's. So
 * its focus ring is drawn on the outer span, outside the mask, which never clips it.
 */
export function InlineFormula({
  label,
  children,
}: {
  /** The region's accessible name while the formula scrolls. */
  label: string;
  children: ReactNode;
}) {
  const { m, outer, inner } = useFit("line");
  return (
    <span className={m.over ? "ra-mi is-over" : "ra-mi"} ref={outer}>
      <span
        className={sides("ra-mi__s", m)}
        ref={inner}
        tabIndex={m.over ? 0 : undefined}
        role={m.over ? "region" : undefined}
        aria-label={m.over ? label : undefined}
      >
        {children}
      </span>
    </span>
  );
}

/**
 * P39-hk.F1 round 2 (OQ19) — a legend symbol's own box, by F7's display rule. A symbol that
 * fits keeps the signed column (F27: the chapter's widest plus room, `minmax(max-content,
 * …)`): two plain inline spans, nothing changes. A symbol wider than its whole line (the
 * legend's row, less the gap before the meaning) would push the page sideways; then it
 * gives up its claim on the column (`is-over`), so the column is what the other symbols and
 * the signed maximum, `min(5.25em, 28%)`, make it, and it scrolls inside a box that wide:
 * the tables' fades (a legend sits only on the page's ground), a focusable `role="region"`
 * named "Formula, scrolls sideways" with its ring on the scroller.
 */
export function LegendSymbol({
  label,
  children,
}: {
  /** The region's accessible name while the symbol scrolls. */
  label: string;
  children: ReactNode;
}) {
  const { m, outer, inner } = useFit("legend");
  return (
    <span className={m.over ? "ra-ms is-over" : "ra-ms"} ref={outer}>
      <span
        className={sides("ra-ms__s", m)}
        ref={inner}
        tabIndex={m.over ? 0 : undefined}
        role={m.over ? "region" : undefined}
        aria-label={m.over ? label : undefined}
      >
        {children}
      </span>
      {m.over ? <Fades /> : null}
    </span>
  );
}
