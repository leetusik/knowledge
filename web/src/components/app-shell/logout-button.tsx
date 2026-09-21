"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { appButtonClass, type AppButtonVariant } from "@/components/ui";
import { APP_SHELL } from "@/content";
import { cn } from "@/lib/utils";

/**
 * Logout control (P12.S2, re-skinned P12.S2R) — the console `.kb-appbtn--ghost
 * --sm` in the topbar. POSTs the same-origin BFF logout route (which revokes the
 * token at knowledge and clears the sealed cookie), then replaces to /login and
 * refreshes so the now-unauthenticated server tree re-runs.
 *
 * Best-effort by design: we navigate even if the POST throws, because the `(app)`
 * server guard — not this button — is the real gate. The same-origin fetch
 * satisfies the route's CSRF check with no custom header.
 *
 * Round 03 §4.2 gives it two placements in the same topbar: the wide `--ghost`
 * button carrying `.kb-topbar__signout` (the class the phone rule hides), and a
 * full-width `--secondary` copy inside the phone account disclosure. One island,
 * two renders — the logout behaviour is written once.
 */
export function LogoutButton({
  variant = "ghost",
  className,
}: {
  variant?: AppButtonVariant;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore — navigate anyway; the server guard re-checks on the next load
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={cn(appButtonClass(variant, "sm"), className)}
    >
      {pending ? APP_SHELL.logoutPendingLabel : APP_SHELL.logoutLabel}
    </button>
  );
}
