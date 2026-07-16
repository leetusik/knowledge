// Barrel for the token-driven UI primitives (P12.S1). Pages import components +
// their CVA fns from "@/components/ui". The palette is hi2vi_web's adopted brand
// green; token names are stable so later slices and the P14 gate compose on them.
export { Button, buttonVariants } from "./button";
export type { ButtonProps } from "./button";

export { Card, cardVariants } from "./card";
export type { CardProps } from "./card";

export { Badge, badgeVariants } from "./badge";
export type { BadgeProps } from "./badge";

export { Section, sectionVariants } from "./section";
export type { SectionProps } from "./section";

export { Grid } from "./grid";
export type { GridProps } from "./grid";

export { EndpointCard } from "./endpoint-card";
export type { EndpointCardProps } from "./endpoint-card";

// New primitive (P12.S1) — headless, token-styled table for the S3/S4/S5 lists.
export { DataTable } from "./data-table";
export type { DataTableColumn, DataTableProps } from "./data-table";

// Scroll-reveal wrapper — progressive-enhancement, reduced-motion-safe.
export { Reveal } from "./reveal";
export type { RevealProps } from "./reveal";

// Form-field primitives — hand-rolled on the locked tokens.
export {
  Checkbox,
  FieldError,
  Input,
  inputVariants,
  Label,
  labelVariants,
  Textarea,
  textareaVariants,
} from "./field";
export type {
  CheckboxProps,
  FieldErrorProps,
  InputProps,
  LabelProps,
  TextareaProps,
} from "./field";
