import { cva, type VariantProps } from "class-variance-authority";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Form-field primitives (P12.S2 auth forms, S3/S4 create/mint), re-skinned to the
 * Knowledge Base console `.kb-field*` classes (P12.S2R). Native
 * `<input>/<textarea>/<input type=checkbox>` — fully accessible. Styling is
 * token-only: hairline-strong border, a teal focus ring (`0 0 0 3px accent-soft`),
 * and the terracotta error state driven off `aria-invalid` (so the caller flips
 * one attribute; `.kb-field__input[aria-invalid="true"]` recolors border + ring).
 *
 * A11y wiring is the caller's job: pair `<Label htmlFor>` with the control `id`,
 * point `aria-describedby` at the `<FieldError id>`, and set `aria-invalid` when
 * the field has an error. `<FieldError>` is `aria-live` so messages are announced.
 */

export const labelVariants = cva("kb-field__label");

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, ...props }: LabelProps) {
  return <label className={cn(labelVariants(), className)} {...props} />;
}

export const inputVariants = cva("kb-field__input");
export const textareaVariants = cva("kb-field__input");

export interface InputProps
  extends
    InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input type={type} className={cn(inputVariants(), className)} {...props} />
  );
}

export interface TextareaProps
  extends
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

/**
 * Round 03 §4.7: the inline `minHeight` / `resize` pair is GONE — the responsive
 * layer's `textarea.kb-field__input` rule owns the box now (min-height 7rem,
 * vertical resize, its own padding and leading), so there is one source instead
 * of an inline style that would out-rank it. A caller's `style` still passes
 * through untouched.
 */
export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(textareaVariants(), className)} {...props} />;
}

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {}

/**
 * Native checkbox, tinted teal (the one interactive accent) via `accent-color`.
 * The label/consent copy is rendered by the caller alongside it — compose it
 * inside a `.kb-check` label for the full field styling.
 */
export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cn(
        "mt-0.5 size-[1.1rem] shrink-0 rounded-[var(--kb-radius-sm)] border border-[var(--kb-border-strong)] accent-[var(--kb-accent)] focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export interface FieldErrorProps {
  id: string;
  children?: string;
  className?: string;
}

/**
 * Inline validation message. Renders nothing visible (but stays in the tree as an
 * `aria-live` region) until `children` is set, so newly-shown errors are
 * announced. Pair its `id` with the control's `aria-describedby`.
 */
export function FieldError({ id, children, className }: FieldErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn("kb-field__error", className)}
    >
      {children}
    </p>
  );
}
