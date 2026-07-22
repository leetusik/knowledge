"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";

// Copy control (P20.S3) — a small mono ghost pill that copies the FULL artifact to the
// clipboard, reusing the copy-link-button.tsx three-state idiom (idle → copied → failed)
// with no new chrome system. Two ways to supply the payload:
//   • `text`     — a literal string resolved at build time (the snippet blocks: the two
//                  locked export lines, the whole health-check curl line).
//   • `fetchUrl` — fetch the served file and copy its whole body (the skill at /SKILL.md;
//                  never a pasted fork of the 486-line canonical).
// States (build-prompt §(c)): idle "Copy" (double-sheet icon) → success "Copied" (check,
// teal accent + accent border, reverts after 2 s) → failure "Copy failed" (dashed border,
// hint text; clipboard denied / insecure origin / fetch fail). The value is NEVER logged,
// not even in the catch. Focus ring = the global teal :focus-visible; reduced-motion drops
// the pill transition (marketing.css / the global reduced-motion killswitch). The idle
// label is configurable ("Copy" for snippet blocks, "Copy the skill" for the skill action).

export type CopyState = "idle" | "copied" | "failed";

export const COPIED_LABEL = "Copied";
export const FAILED_LABEL = "Copy failed";

/**
 * Resolve one copy attempt. Pure + testable (no React, no DOM): given a text provider
 * and a clipboard writer, it writes whatever `getText` yields — the FULL artifact — and
 * returns the next state, NEVER logging the value (the catch is valueless). A rejected
 * `getText` (e.g. a non-ok fetch) is a failure, same as a rejected write.
 */
export async function attemptCopy(
  getText: () => string | Promise<string>,
  write: (text: string) => Promise<void>,
): Promise<CopyState> {
  try {
    await write(await getText());
    return "copied";
  } catch {
    return "failed";
  }
}

export function CopyButton({
  text,
  fetchUrl,
  idleLabel = "Copy",
  scale = "default",
  className,
}: {
  /** A literal payload resolved at build time (the snippet blocks). */
  text?: string;
  /** Fetch the served file and copy its whole body (the skill at /SKILL.md). */
  fetchUrl?: string;
  /** Idle label — "Copy" for snippet blocks, "Copy the skill" for the skill action. */
  idleLabel?: string;
  /** "section" = the 44px section-scale pill beside the CVA primary; "default" = 30px. */
  scale?: "default" | "section";
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function handleCopy() {
    if (timer.current) clearTimeout(timer.current);
    const next = await attemptCopy(
      async () => {
        if (typeof text === "string") return text;
        if (fetchUrl) {
          const res = await fetch(fetchUrl);
          if (!res.ok) throw new Error(); // valueless — never logs the payload
          return res.text();
        }
        return "";
      },
      (value) => navigator.clipboard.writeText(value),
    );
    setState(next);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  const label =
    state === "copied"
      ? COPIED_LABEL
      : state === "failed"
        ? FAILED_LABEL
        : idleLabel;

  return (
    <button
      type="button"
      onClick={handleCopy}
      data-state={state}
      className={cn("mkt-copy", scale === "section" && "mkt-copy--section", className)}
    >
      {state === "copied" ? (
        <Check size={14} aria-hidden />
      ) : (
        <Copy size={14} aria-hidden />
      )}
      {label}
    </button>
  );
}
