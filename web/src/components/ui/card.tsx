import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Surface card. Renders a `<div>`; children-only — the caller supplies the inner
 * heading/body structure. Re-skinned to the Knowledge Base console (P12.S2R): the
 * app-used surfaces map to the console `.kb-panel` (static section) / `.kb-tile`
 * (stat tile). The remaining marketing/legacy variants are rebuilt from `--kb-*`
 * tokens (warm surfaces, hairline borders, `--kb-radius`, the one soft shadow) —
 * no hardcoded hex, no dark-green plate; they auto-recolor per scheme.
 */
export const cardVariants = cva("", {
  variants: {
    variant: {
      /* Console surfaces (the apply-map targets) */
      panel: "kb-panel",
      tile: "kb-tile",
      /* Generic surface (alias of panel) + marketing/legacy, token-repointed */
      base: "kb-panel",
      feature: "kb-panel shadow-[var(--kb-shadow-hover)]",
      featureMuted:
        "rounded-[var(--kb-radius)] border border-[var(--kb-border)] bg-[var(--kb-surface-sunken)] p-6",
      dark: "rounded-[var(--kb-radius)] border border-[var(--kb-border)] bg-[var(--kb-surface-sunken)] p-8",
      archive:
        "rounded-[var(--kb-radius)] border border-[var(--kb-border)] bg-[var(--kb-surface-sunken)] p-8",
      security:
        "rounded-[var(--kb-radius)] border border-[var(--kb-border)] bg-[var(--kb-surface)] p-8",
      pricing:
        "rounded-[var(--kb-radius)] border border-[var(--kb-border)] bg-[var(--kb-surface)] p-8 shadow-[var(--kb-shadow-hover)]",
      pricingFeatured:
        "rounded-[var(--kb-radius)] border border-[var(--kb-accent)] bg-[var(--kb-surface)] p-8 shadow-[var(--kb-shadow-hover)]",
    },
  },
  defaultVariants: {
    variant: "base",
  },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} {...props} />
  );
}
