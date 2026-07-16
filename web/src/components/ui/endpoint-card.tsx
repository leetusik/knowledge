import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Code/endpoint panel (P12.S2R). Renders its content as real, selectable text in
 * a `<pre>` (a11y: code is HTML text, not an image). Re-skinned to the Knowledge
 * Base console: a sunken warm panel (`--kb-surface-sunken`) with a hairline
 * border and mono text — no dark-green plate. The optional `label` shows as a
 * small teal `.kb-chip` above the code. Pass JSON/code as `children`.
 */
export interface EndpointCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  /** Small dark chip above the code panel (e.g. a method/endpoint name). */
  label?: ReactNode;
  /** Code/JSON to render verbatim inside the `<pre>`. */
  children: ReactNode;
}

export function EndpointCard({
  className,
  label,
  children,
  ...props
}: EndpointCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--kb-radius)] border border-[var(--kb-border)] bg-[var(--kb-surface-sunken)] p-6 text-[var(--kb-ink)]",
        className,
      )}
      {...props}
    >
      {label != null && <span className="kb-chip mb-3">{label}</span>}
      <pre className="overflow-x-auto font-mono text-code-md text-[var(--kb-ink)]">
        {children}
      </pre>
    </div>
  );
}
