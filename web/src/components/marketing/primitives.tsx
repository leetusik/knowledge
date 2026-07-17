import { Fragment } from "react";

import type { MktCta } from "@/content/marketing";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shared server-rendered primitives for the landing. No client state — the whole
// static page is the guaranteed baseline (Reveal + the header/graph islands are
// the only client code). Layout/spacing/type/color are Tailwind utilities on the
// @theme tokens; the pseudo-elements + band re-points live in marketing.css.

type BandTone = "paper" | "sunken" | "dark" | "deep";

const BAND_BG: Record<BandTone, string> = {
  paper: "bg-canvas",
  sunken: "bg-surface-soft",
  dark: "mkt-band--dark",
  deep: "mkt-band--deep",
};

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-page px-6 md:px-8", className)}>
      {children}
    </div>
  );
}

export function Band({
  tone,
  id,
  hairline,
  className,
  innerClassName,
  children,
}: {
  tone: BandTone;
  id?: string;
  /** Add a top hairline (used to seat a paper band under a paper band). */
  hairline?: boolean;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-24",
        BAND_BG[tone],
        hairline && "mkt-hairline-top",
        className,
      )}
    >
      <Container className={cn("py-section", innerClassName)}>
        {children}
      </Container>
    </section>
  );
}

/** Tracked mono-caps eyebrow with the short leading rule. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mkt-eyebrow mb-5 flex items-center gap-2 font-mono text-micro uppercase">
      {children}
    </p>
  );
}

/** Splits a copy string on backticks and renders the odd runs as inline code. */
export function RichText({ text }: { text: string }) {
  const parts = text.split("`");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="mkt-code">
            {part}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** A CTA anchor rendered with the reused CVA pill button (no second system). */
export function CtaLink({
  cta,
  size = "lg",
  className,
}: {
  cta: MktCta;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const external = cta.href.startsWith("http");
  return (
    <a
      href={cta.href}
      className={cn(buttonVariants({ variant: cta.variant, size }), className)}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {cta.label}
    </a>
  );
}

/** Feature tick list — a small teal dot per item; body copy may carry `code`. */
export function Ticks({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="mkt-tick text-body-md leading-snug">
          <RichText text={item} />
        </li>
      ))}
    </ul>
  );
}

/** Pill chip — a status marker (Free / Available now / Coming). */
export function Chip({
  label,
  coming,
}: {
  label: string;
  coming?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide",
        coming
          ? "border border-[color:var(--mkt-border-strong)] text-[color:var(--kb-hint)]"
          : "bg-[color:var(--kb-tag-bg)] text-[color:var(--kb-tag-fg)]",
      )}
    >
      {!coming && (
        <span className="size-1.5 rounded-full bg-green" aria-hidden />
      )}
      {label}
    </span>
  );
}
