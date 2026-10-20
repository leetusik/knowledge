"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * The two scrolling boxes of the prose kit (`01-reader` round 02, §8 ASCII drawings,
 * §9 tables and §9a the scroll fades). Both are the only places the page lets
 * something scroll: sideways, inside the block's own frame, never the page.
 *
 * Whether a box scrolls is MEASURED (the content's width against the box's),
 * re-measured on its own resize, on the content's resize, on a text-size or theme
 * change (the reader root's class) and when fonts load, never guessed from the column
 * count. The fade shows only on a side where more remains, read from the scroll
 * position: `max = scrollWidth - clientWidth`; right while `max > 1` and
 * `scrollLeft < max - 1`; left while `max > 1` and `scrollLeft > 1`. The fades are
 * overlays (`opacity` only), so nothing moves when one appears.
 *
 * Server render and first client render agree (not over, no fades); the measure runs
 * in an effect. The content arrives as `children`, rendered on the server.
 */

interface Measure {
  over: boolean;
  l: boolean;
  r: boolean;
}

const NONE: Measure = { over: false, l: false, r: false };

function useBox(content: "self" | "table") {
  const [m, setM] = useState<Measure>(NONE);
  const ref = useRef<HTMLElement | null>(null);

  const read = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const over =
      content === "table"
        ? (() => {
            const t = el.querySelector("table");
            return !!t && t.offsetWidth > el.clientWidth + 1;
          })()
        : el.scrollWidth > el.clientWidth + 1;
    const l = max > 1 && el.scrollLeft > 1;
    const r = max > 1 && el.scrollLeft < max - 1;
    setM((prev) =>
      prev.over === over && prev.l === l && prev.r === r
        ? prev
        : { over, l, r },
    );
  }, [content]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    read();
    el.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    const ro =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(read);
    ro?.observe(el);
    const table = el.querySelector("table");
    if (table) ro?.observe(table);
    // A text-size or theme change swaps the reader root's class: the content's width moves
    // with the font size, though the box itself does not.
    const root = el.closest(".rd-root");
    const mo =
      root && typeof MutationObserver !== "undefined"
        ? new MutationObserver(read)
        : null;
    if (root)
      mo?.observe(root, { attributes: true, attributeFilter: ["class"] });
    document.fonts?.ready.then(read).catch(() => {});
    return () => {
      el.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [read]);

  return { m, ref };
}

/** A table in its frame. `wide` (8+ columns) and `long` (more than 20 rows) are known from the data. */
export function TableBox({
  wide,
  long,
  ariaLabel,
  hint,
  children,
}: {
  wide: boolean;
  long: boolean;
  /** The region's accessible name, used whenever the box can scroll. */
  ariaLabel: string;
  hint: string;
  children: ReactNode;
}) {
  const { m, ref } = useBox("table");
  // A wide or long table is always a box; any other becomes one when measured wider.
  const box = wide || long || m.over;
  const cls = [
    "kb-ch-table",
    wide ? "kb-ch-table--wide" : "",
    long ? "kb-ch-table--long" : "",
    m.over ? "is-over" : "",
    box && m.l ? "is-more-l" : "",
    box && m.r ? "is-more-r" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      <div className="kb-ch-table__wrap">
        <div
          className="kb-ch-table__scroll"
          ref={(el) => {
            ref.current = el;
          }}
          tabIndex={box ? 0 : undefined}
          role={box ? "region" : undefined}
          aria-label={box ? ariaLabel : undefined}
        >
          {children}
        </div>
        {box ? (
          <>
            <span className="kb-ch-fade kb-ch-fade--l" aria-hidden="true" />
            <span className="kb-ch-fade kb-ch-fade--r" aria-hidden="true" />
          </>
        ) : null}
      </div>
      {box ? <p className="kb-ch-table__hint">{hint}</p> : null}
    </div>
  );
}

/** An ASCII drawing (a `text` fence): every character and column kept, scrolling inside its own box. */
export function ArtBox({
  id,
  lang,
  bar,
  ariaLabel,
  hint,
  children,
}: {
  id: string | undefined;
  lang: string | undefined;
  /** The title bar, when the block has a title. */
  bar: ReactNode;
  ariaLabel: string;
  hint: string;
  children: ReactNode;
}) {
  const { m, ref } = useBox("self");
  const cls = [
    "kb-ch-code",
    "kb-ch-code--art",
    m.over ? "is-over" : "",
    m.l ? "is-more-l" : "",
    m.r ? "is-more-r" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <figure className={cls} id={id} data-block={id} data-lang={lang}>
      {bar}
      <div className="kb-ch-code__wrap">
        <pre
          className="kb-ch-code__pre"
          ref={(el) => {
            ref.current = el;
          }}
          tabIndex={0}
          role="region"
          aria-label={ariaLabel}
        >
          <code>{children}</code>
        </pre>
        <span className="kb-ch-fade kb-ch-fade--l" aria-hidden="true" />
        <span className="kb-ch-fade kb-ch-fade--r" aria-hidden="true" />
      </div>
      <p className="kb-ch-code__hint">{hint}</p>
    </figure>
  );
}
