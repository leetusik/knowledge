"use client";

import type { ReactNode } from "react";

import { useBox } from "./scroll-box";

/**
 * P39-hk.S8 — the display formula's own box (`10-reading-aids` round 01, *Display formula
 * block*; frame F7): a row wider than the column scrolls inside it, never the page. Whether
 * it scrolls is MEASURED, the way the prose kit's boxes are (`scroll-box.tsx` `useBox`):
 * while it can, the box is a focusable `role="region"` named "Formula, scrolls sideways"
 * and the side with more fades over 2.5rem (`is-more-start` / `is-more-end`, the mask in
 * `reader-aids.css`). Server render and first client render agree: no region, no fade.
 * The MathML arrives as `children`, rendered on the server; nothing here reads or builds it.
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
  );
}
