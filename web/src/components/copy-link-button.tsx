"use client";

import { useState } from "react";

import { Check, Link2 } from "lucide-react";

import { AppButton } from "@/components/ui";
import { SHARE } from "@/content";

/**
 * The copy-link island (P19) — a small ghost button that copies an absolute share
 * URL to the clipboard. It reuses the mint-form's clipboard idiom (three states via
 * `navigator.clipboard.writeText`, no new chrome): idle → "Copy link", success →
 * "Link copied", and a failure fallback (clipboard denied on an insecure origin /
 * without permission) → "Copy failed".
 *
 * The absolute URL is built CLIENT-SIDE from `window.location.origin` + `path`, so
 * the same island serves the doc read view (`/documents/{id}`) and the member graph
 * header (`/graph/{org}`) without the server needing to know its own public origin.
 * The value is never logged (not even in the catch).
 */
export function CopyLinkButton({ path }: { path: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  const label =
    state === "copied"
      ? SHARE.copiedLabel
      : state === "failed"
        ? SHARE.failedLabel
        : SHARE.copyLabel;

  return (
    <AppButton variant="ghost" size="sm" onClick={handleCopy}>
      {state === "copied" ? (
        <Check size={15} aria-hidden />
      ) : (
        <Link2 size={15} aria-hidden />
      )}
      {label}
    </AppButton>
  );
}
