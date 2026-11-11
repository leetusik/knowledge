/**
 * P41-sr.W1 — the media icons (`11-listen` F5): one set, a 24 px box, stroke 1.75 with
 * round caps and joins in `currentColor`, play and pause solid. The paths are the
 * frame's (`frame.css` `.lx-i--*`), inlined as `<svg aria-hidden="true">`: every icon
 * sits inside a button that carries the name. Size by class: `lx-i` 24 px, `--s` 20 px,
 * `--l` 32 px.
 */

export type IconName =
  | "play"
  | "pause"
  | "back"
  | "fwd"
  | "prev"
  | "next"
  | "open"
  | "retry"
  | "again";

const LINE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const SOLID = {
  fill: "currentColor",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinejoin: "round",
} as const;

function paths(name: IconName) {
  switch (name) {
    case "play":
      return (
        <path
          {...SOLID}
          d="M8 5.6v12.8a.6.6 0 0 0 .9.5l10-6.4a.6.6 0 0 0 0-1L8.9 5.1a.6.6 0 0 0-.9.5z"
        />
      );
    case "pause":
      return (
        <>
          <rect {...SOLID} x="6.5" y="5.5" width="3.5" height="13" rx=".8" />
          <rect {...SOLID} x="14" y="5.5" width="3.5" height="13" rx=".8" />
        </>
      );
    case "back":
      return (
        <>
          <path {...LINE} d="M12 3.4A8.6 8.6 0 1 1 3.4 12" />
          <path {...LINE} d="M14.4 1.2L12 3.4l2.4 2.2" />
        </>
      );
    case "fwd":
      return (
        <>
          <path {...LINE} d="M12 3.4A8.6 8.6 0 1 0 20.6 12" />
          <path {...LINE} d="M9.6 1.2L12 3.4 9.6 5.6" />
        </>
      );
    case "prev":
      return (
        <>
          <path {...LINE} d="M6 5.5v13" />
          <path
            {...SOLID}
            d="M18 6.2v11.6a.5.5 0 0 1-.8.4l-8.4-5.8a.5.5 0 0 1 0-.8l8.4-5.8a.5.5 0 0 1 .8.4z"
          />
        </>
      );
    case "next":
      return (
        <>
          <path {...LINE} d="M18 5.5v13" />
          <path
            {...SOLID}
            d="M6 6.2v11.6a.5.5 0 0 0 .8.4l8.4-5.8a.5.5 0 0 0 0-.8L6.8 5.8a.5.5 0 0 0-.8.4z"
          />
        </>
      );
    case "open":
      return <path {...LINE} d="M6 14.5l6-6 6 6" />;
    case "retry":
      return (
        <>
          <path {...LINE} d="M19.2 12a7.2 7.2 0 1 1-2.1-5.1" />
          <path {...LINE} d="M19.2 4.6v4.6h-4.6" />
        </>
      );
    case "again":
      return (
        <>
          <path {...LINE} d="M4.8 12a7.2 7.2 0 1 0 2.1-5.1" />
          <path {...LINE} d="M4.8 4.6v4.6h4.6" />
          <path {...SOLID} d="M10.5 9.6v4.8l4-2.4z" />
        </>
      );
  }
}

export function Icon({
  name,
  size,
}: {
  name: IconName;
  /** `s` 20 px, `l` 32 px; default 24 px. */
  size?: "s" | "l";
}) {
  return (
    <svg
      className={`lx-i lx-i--${name}${size ? ` lx-i--${size}` : ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {paths(name)}
    </svg>
  );
}
