// P12.S2 — the authenticated app's flat chrome button language, ported from
// hi2vi_web's console `ui.tsx` `btnClass`. This is a DIFFERENT visual language from
// the marketing pill `Button` (rounded-full, hover-translate, green glow shadow),
// which stays reserved for P14's public landing: the in-app chrome uses flat
// `rounded-md` buttons with no translate/marketing-shadow. The shell, auth, and
// S3–S6 app pages compose on these so the workspace reads as one flat console.
//
// Green is reserved for primary / active / focus only. `Tag` is the mono chip used
// for surface markers; the run/status-pill vocabulary lands when a slice has status
// data to show (S3+).

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AppButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type AppButtonSize = "md" | "sm";

const VARIANT: Record<AppButtonVariant, string> = {
  primary: "bg-green text-on-primary hover:bg-green-deep",
  secondary:
    "bg-canvas border-hairline-strong text-ink hover:border-green-deep hover:text-green-dark",
  ghost:
    "text-steel border-hairline-soft hover:text-charcoal hover:border-hairline-strong",
  danger: "bg-danger text-white hover:bg-danger-deep",
};

/** The flat `.btn` class string for a variant/size (also usable on anchors/links). */
export function appButtonClass(
  variant: AppButtonVariant = "secondary",
  size: AppButtonSize = "md",
): string {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent font-bold leading-[1.3] whitespace-nowrap transition focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
    size === "sm"
      ? "px-[11px] py-1.5 text-caption"
      : "px-[15px] py-[9px] text-button-md",
    VARIANT[variant],
  );
}

export interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
}

/** A real `<button type="button">` styled as the flat console `.btn`. */
export function AppButton({
  variant,
  size,
  className,
  type = "button",
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      className={cn(appButtonClass(variant, size), className)}
      {...props}
    />
  );
}

/** The mono uppercase chip used for in-app surface markers (green, positive). */
export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-xs border border-green-soft bg-surface-green px-1.5 py-0.5 font-mono text-[9px] leading-[1.4] font-bold tracking-[0.6px] text-green-dark uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
