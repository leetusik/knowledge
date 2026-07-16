import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Status badge (P12.S2R) — the Knowledge Base console's state vocabulary
 * (`.kb-status`, kb-console.css). Renders a `<span>` — never a button/link.
 *
 * State is encoded in FORM as well as color, so it survives greyscale (WCAG
 * 1.4.1): active = filled teal dot · idle = hollow amber-bronze ring · revoked =
 * struck terracotta dot + line-through label. Teal stays the only interactive
 * accent; these tones appear ONLY as dots/chips. The dot is `aria-hidden` (the
 * label carries the meaning). `chip` switches to the soft-fill emphasis form
 * (e.g. on a project header); bare (default) is for inline table cells.
 */
export const badgeVariants = cva("kb-status", {
  variants: {
    status: {
      active: "kb-status--active",
      idle: "kb-status--idle",
      revoked: "kb-status--revoked",
    },
    chip: {
      true: "kb-status--chip",
      false: "",
    },
  },
  defaultVariants: {
    status: "active",
    chip: false,
  },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Visible label; falls back to `children`. */
  label?: ReactNode;
}

export function Badge({
  className,
  status,
  chip,
  label,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ status, chip }), className)} {...props}>
      <span className="kb-status__dot" aria-hidden />
      <span className="kb-status__label">{label ?? children}</span>
    </span>
  );
}
