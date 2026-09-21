"use client";

import Link from "next/link";

import { Editorial, ErrorRef } from "@/components/states";
import { AppButton, appButtonClass } from "@/components/ui";
import { STATES } from "@/content";

/**
 * Round 03 §5.1 — the console's whole-page 500.
 *
 * **The shell stays**, and it stays for a structural reason rather than a
 * decorative one: a Next `error.tsx` renders INSIDE its own segment's layout, so
 * this boundary is a child of `(app)/layout.tsx`'s `<AppShell>`. Topbar, navbar
 * and rail are all still there, and the difference between "this page failed"
 * and "the app is gone" is preserved exactly as the record asks.
 *
 * Which is also why this file renders ONLY the `.kb-editorial` div and not
 * §5.1's `<main class="kb-app-main">` wrapper: `AppFrame` already renders that
 * landmark, and copying the snippet literally here would nest a second `<main>`.
 *
 * What it CANNOT catch is a throw from that same layout — `(app)/layout.tsx`
 * awaits `requireIdentity()`, an `/auth/me` round trip, and a boundary never
 * catches its own layout. That case is `app/error.tsx`'s (see the deviation
 * recorded in this slice's result.md).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Editorial
      code={STATES.error.code}
      title={STATES.error.title}
      sub={STATES.error.sub}
      actions={
        <>
          <AppButton variant="primary" onClick={reset}>
            {STATES.error.retryLabel}
          </AppButton>
          <Link href="/dashboard" className={appButtonClass("ghost")}>
            {STATES.error.homeLabel}
          </Link>
        </>
      }
      // §5.1 puts the mono ref line on errors only, and only when there is a
      // real reference: Next omits `digest` in development.
      detail={error.digest ? <ErrorRef digest={error.digest} /> : undefined}
    />
  );
}
