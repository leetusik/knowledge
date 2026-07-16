// P12.S2R — the authenticated console's flat button language, adopting the
// Knowledge Base `.kb-appbtn` classes (kb-console.css). This is a DIFFERENT
// visual language from the marketing pill `Button` (rounded-full, hover-translate,
// glow), which stays reserved for P14's public landing. The in-app chrome is flat,
// `rounded-sm`, no translate/glow; teal is reserved for primary / active / focus.
//
// Variants map straight onto the console classes: primary (teal), secondary
// (hairline), ghost, danger (terracotta), each with an optional `sm` size. `Tag`
// is the mono teal `.kb-chip` used for in-app surface markers.

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AppButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type AppButtonSize = "md" | "sm";

const VARIANT: Record<AppButtonVariant, string> = {
  primary: "kb-appbtn--primary",
  secondary: "kb-appbtn--secondary",
  ghost: "kb-appbtn--ghost",
  danger: "kb-appbtn--danger",
};

/** The flat `.kb-appbtn` class string for a variant/size (also usable on anchors). */
export function appButtonClass(
  variant: AppButtonVariant = "secondary",
  size: AppButtonSize = "md",
): string {
  return cn("kb-appbtn", VARIANT[variant], size === "sm" && "kb-appbtn--sm");
}

export interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
}

/** A real `<button type="button">` styled as the flat console `.kb-appbtn`. */
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

/** The mono uppercase chip used for in-app surface markers (teal, positive). */
export function Tag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("kb-chip", className)}>{children}</span>;
}
