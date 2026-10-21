"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { cx } from "@/lib/cx";
import { useBox } from "./scroll-box";

/**
 * The client parts of the figures (`02-figures` round 01, build prompt §1, §2 and §6).
 *
 * Everything else a figure is — the row, the card, the sources list, the citation — is
 * markup and CSS only (§4: "no client script"). Two things need the browser:
 *
 * - the image box's own state (§1): the sheen goes when the image has loaded, and an image
 *   that fails after the page rendered is swapped for the "Image not available" box;
 * - a scroll box (a `wide` figure, an `svg` block): the overflow is MEASURED, never guessed
 *   (the fades, the hint, the region role and the arrow keys follow it) — the same `useBox`
 *   that measures a table.
 *
 * The server render and the first client render agree (loading; not over); the effects run
 * after hydration. The content arrives as `children`, rendered on the server.
 */

/** The pixel size a box reserves when the asset map is not at hand (16:9; `md` has none). */
const FALLBACK = { w: 1600, h: 900 };

function sizeVars(w: number | null, h: number | null): CSSProperties {
  return {
    "--fg-w": w ?? FALLBACK.w,
    "--fg-h": h ?? FALLBACK.h,
  } as CSSProperties;
}

/**
 * The missing box (§1): an asset the version does not hold, a file not in storage, or an image
 * that failed to load. The label is mono, the alt is the body face; it grows past the reserved
 * ratio when the alt needs more room.
 *
 * Both boxes carry `data-an-skip` (P30.S20): an alt or a label is not passage text, so a
 * selection's offsets and the highlight paint step over them.
 */
export function MissingBox({
  w,
  h,
  label,
  children,
}: {
  w: number | null;
  h: number | null;
  label: string;
  /** The alt text, with its Hangul runs wrapped. */
  children: ReactNode;
}) {
  return (
    <span
      className="fg-media fg-media--missing"
      style={sizeVars(w, h)}
      data-an-skip=""
    >
      <span className="fg-miss__label">{label}</span>
      <span className="fg-miss__alt">{children}</span>
    </span>
  );
}

/**
 * The image box (§1). The reserved box is there from the first paint (`--fg-w`/`--fg-h` from the
 * asset map), so nothing below it moves when the image arrives. `is-loaded` is added on the
 * image's `load`, or on hydrating when it is already complete; `error` swaps the box for the
 * missing one.
 */
export function ImageBox({
  src,
  still,
  alt,
  title,
  w,
  h,
  label,
  missingAlt,
}: {
  src: string;
  /** An animated GIF's first frame, shown under `prefers-reduced-motion: reduce`. */
  still: string | null;
  alt: string;
  title?: string;
  w: number | null;
  h: number | null;
  /** "Image not available". */
  label: string;
  missingAlt: ReactNode;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );
  const img = useRef<HTMLImageElement | null>(null);

  const settle = useCallback((el: HTMLImageElement) => {
    if (!el.complete) return;
    setState(el.naturalWidth > 0 ? "loaded" : "failed");
  }, []);

  useEffect(() => {
    // An image that finished before this component hydrated fired its events unheard.
    if (img.current) settle(img.current);
  }, [settle]);

  if (state === "failed")
    return (
      <MissingBox w={w} h={h} label={label}>
        {missingAlt}
      </MissingBox>
    );
  return (
    <span
      className={cx("fg-media fg-media--loading", state === "loaded" && "is-loaded")}
      style={sizeVars(w, h)}
      data-an-skip=""
    >
      <span className="rd-skel fg-media__skel" aria-hidden="true" />
      <picture className="fg-media__pic">
        {still ? (
          <source media="(prefers-reduced-motion: reduce)" srcSet={still} />
        ) : null}
        <img
          ref={img}
          className="fg-media__img"
          src={src}
          alt={alt}
          title={title}
          width={w ?? undefined}
          height={h ?? undefined}
          loading="lazy"
          decoding="async"
          onLoad={(e) => settle(e.currentTarget)}
          onError={() => setState("failed")}
        />
      </picture>
    </span>
  );
}

/**
 * A figure whose box can scroll sideways (§2 `width: wide`, §6 the `svg` block): the box
 * measures its own overflow; while it overflows the figure is `is-over` (the hint shows, the
 * fades show on the side where more remains) and the box is a focusable, labelled region the
 * arrow keys scroll.
 */
export function ScrollFigure({
  id,
  kind,
  wide,
  ariaLabel,
  hint,
  caption,
  children,
}: {
  id: string | undefined;
  kind: "image" | "svg";
  wide: boolean;
  /** "Image, scrolls sideways" / "Drawing, scrolls sideways", used while it scrolls. */
  ariaLabel: string;
  hint: string;
  caption: ReactNode;
  children: ReactNode;
}) {
  const { m, ref } = useBox("self", true);
  const cls = [
    "fg-fig",
    wide ? "fg-fig--wide" : "",
    kind === "svg" ? "fg-svg" : "",
    m.over ? "is-over" : "",
    m.over && m.l ? "is-more-l" : "",
    m.over && m.r ? "is-more-r" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <figure className={cls} id={id} data-block={id}>
      <div className="fg-box">
        <div
          className="fg-box__scroll"
          ref={(el) => {
            ref.current = el;
          }}
          tabIndex={m.over ? 0 : undefined}
          role={m.over ? "region" : undefined}
          aria-label={m.over ? ariaLabel : undefined}
        >
          {children}
        </div>
        <span className="fg-fade fg-fade--l" aria-hidden="true" />
        <span className="fg-fade fg-fade--r" aria-hidden="true" />
      </div>
      <p className="fg-hint">{hint}</p>
      {caption}
    </figure>
  );
}
