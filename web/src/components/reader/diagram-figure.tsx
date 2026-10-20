"use client";

import type { ReactNode } from "react";

import { useBox } from "./scroll-box";

/**
 * The diagram block's frame in the reader's slot (`03-diagrams` round 01, build prompt "The frame in the slot").
 *
 * Title, then the drawing in its box, then the hint, the visually hidden text alternative and the caption. No plate,
 * no frame: the drawing sits on the page. The box measures its own overflow (the same `useBox` that measures a table
 * and a wide figure): while the drawing is wider than the column the figure is `is-over` (the hint shows, a fade
 * shows on each side that has more) and the box is a focusable, labelled region the arrow keys scroll. The server
 * render and the first client render agree (not over); the measure runs after hydration. Everything inside arrives
 * as `children` props rendered on the server.
 */
export function DiagramFigure({
  id,
  kind,
  tag,
  titleId,
  title,
  drawing,
  alt,
  caption,
  ariaLabel,
  hint,
}: {
  id: string | undefined;
  kind: string;
  /** A standalone block is a `figure`; a figure-row item's diagram sits inside the item's own figure. */
  tag: "figure" | "div";
  titleId: string;
  title: ReactNode;
  drawing: ReactNode;
  /** The visually hidden text alternative. */
  alt: ReactNode;
  caption: ReactNode;
  /** "Drawing, scrolls sideways", used while it scrolls. */
  ariaLabel: string;
  hint: string;
}) {
  const { m, ref } = useBox("self");
  const cls = [
    "kb-ch-diagram",
    "dg",
    `dg--${kind}`,
    m.over ? "is-over" : "",
    m.over && m.l ? "is-more-l" : "",
    m.over && m.r ? "is-more-r" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const Root = tag;
  return (
    <Root
      className={cls}
      id={id}
      data-block={id}
      data-kind={kind}
      aria-labelledby={titleId}
      role={tag === "div" ? "group" : undefined}
    >
      <p className="dg__title" id={titleId}>
        {title}
      </p>
      <div className="dg__box">
        <div
          className="dg__scroll"
          ref={(el) => {
            ref.current = el;
          }}
          tabIndex={m.over ? 0 : undefined}
          role={m.over ? "region" : undefined}
          aria-label={m.over ? ariaLabel : undefined}
        >
          {drawing}
        </div>
        <span className="dg__fade dg__fade--l" aria-hidden="true" />
        <span className="dg__fade dg__fade--r" aria-hidden="true" />
      </div>
      <p className="dg__hint">{hint}</p>
      {alt}
      {caption}
    </Root>
  );
}
