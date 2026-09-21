import type { ReactNode } from "react";

import { STATES } from "@/content";

/**
 * Round 03 §5.4 — the skeleton vocabulary the four `(app)` `loading.tsx` files
 * share. §3 already ships `.kb-skel` (the shimmer, reduced-motion-safe at
 * `kb-console.css:172`) plus `.kb-skel-line` / `-tile` / `-row` / `-stack`, so
 * these are compositions of landed classes, never new CSS.
 *
 * §5.4's principle is the contract: **the skeleton mirrors the layout it
 * replaces at the breakpoint it is standing in.** That is what decides the two
 * places the record's literal numbers cannot be transcribed directly:
 *
 *   - "four `.kb-skel-tile` on desktop, two on a phone" — a server-rendered
 *     `loading.tsx` cannot know the viewport, and §3 ships no rule hiding tiles
 *     3–4. It does not need one: the real tiles live in `.kb-tile-grid`, which
 *     is already 4-up on desktop and 2-up below 40rem, so rendering four tiles
 *     in that same grid IS the record's behaviour with no new rule.
 *   - "card-shaped `7rem` blocks where the stacked table will land" — NOT
 *     implemented, and reported instead as a round 03 record gap (phase.md
 *     `## Operator Questions`). The stacked-card table exists only below 40rem,
 *     but §3 ships no phone rule for `.kb-skel-stack` / `.kb-skel-row` and no
 *     7rem block class at all (`.kb-skel-tile` is 6.2rem, `.kb-skel-row`
 *     2.9rem). It cannot be reached from the markup either: every `.kb-*` rule
 *     is UNLAYERED (`globals.css` plain-imports the sheets) while Tailwind's
 *     utilities sit in `@layer utilities`, so an unlayered declaration wins —
 *     measured live at 390, where `@max-[40rem]:h-[7rem]` lost to
 *     `.kb-skel-row { height: 2.9rem }`. Closing it means either editing a
 *     verbatim signed stylesheet or an `!important` per overridden property;
 *     both are worse than reporting it, so the desktop row form stands at every
 *     width and the gap goes to the operator.
 */

/** The busy wrapper. §5.4: `aria-busy="true"` on the region, not on each block. */
export function LoadingRegion({ children }: { children: ReactNode }) {
  return (
    <div aria-busy="true">
      {/* §5's markup gives the region no accessible name, and `aria-busy` alone
          announces nothing. One visually-hidden string, per the §7 floor. */}
      <span className="sr-only">{STATES.loading.label}</span>
      {children}
    </div>
  );
}

/** One shimmer block at an explicit height — the escape hatch §3 has no class for. */
export function SkelBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`kb-skel ${className ?? ""}`} style={style} />;
}

/**
 * The `.kb-pageframe` head every console page opens with: mono eyebrow, the
 * fluid Fraunces title, the sub. Widths are the real strings' rough measure.
 */
export function SkelPageHead({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="kb-pageframe">
      <div className="kb-pageframe__title-wrap">
        <div className="kb-skel kb-skel-line w-[9rem]" />
        <div className="kb-skel mt-[0.55rem] h-[2rem] w-[14rem] max-w-full" />
        <div className="kb-skel kb-skel-line mt-[0.7rem] w-[22rem] max-w-full" />
      </div>
      {withAction ? (
        <div className="kb-pageframe__actions">
          {/* The real slot holds a control at the 44rem tap height on a phone. */}
          <div className="kb-skel h-[var(--kb-tap)] w-[10rem] max-w-full" />
        </div>
      ) : null}
    </div>
  );
}

/** §5.4's tiles — four, in the grid the real `<StatTiles>` uses (2-up on a phone). */
export function SkelTiles({ count = 4 }: { count?: number }) {
  return (
    <div className="kb-tile-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="kb-skel kb-skel-tile" />
      ))}
    </div>
  );
}

/** A `.kb-panel` shell with a heading line, standing in for a real panel. */
export function SkelPanel({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`kb-panel ${className ?? ""}`}>
      <div className="kb-panel__head">
        <div className="kb-skel kb-skel-line w-[8rem]" />
      </div>
      {children}
    </div>
  );
}

/**
 * The table stand-in — `.kb-skel-stack`'s bordered box of 2.9rem `.kb-skel-row`s,
 * the `.kb-dtable` shape. Round 03 §3 built exactly these two classes for this,
 * and they are used unmodified. The phone card form §5.4 also describes is the
 * record gap documented at the head of this file.
 */
export function SkelTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="kb-skel-stack">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="kb-skel kb-skel-row" />
      ))}
    </div>
  );
}
