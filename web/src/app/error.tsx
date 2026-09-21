"use client";

import Link from "next/link";

import { Editorial, ErrorRef } from "@/components/states";
import { AppButton, appButtonClass } from "@/components/ui";
import { STATES } from "@/content";

/**
 * The ROOT error boundary — a deviation from round 03 §5, recorded as such in
 * this slice's result.md and as an `## Operator Questions` entry in phase.md.
 *
 * §5.1 designs one 500 page, `app/(app)/error.tsx`, and says the shell stays.
 * But the likeliest real 500 in this app escapes that boundary entirely:
 * `(app)/layout.tsx` awaits `requireIdentity()` (an `/auth/me` round trip to the
 * API), a throw there is a LAYOUT throw, and a segment's `error.tsx` never
 * catches its own layout. With no boundary above it the visitor would get Next's
 * default full-page error — the precise outcome §5.1 exists to prevent. Every
 * `(public)` page is in the same position: that group has no layout at all, so
 * its pages have no boundary of their own either.
 *
 * So this renders the SAME designed `.kb-editorial` block, without the console
 * shell. Shell-less is the minimal choice rather than a new decision: when
 * identity itself is what failed there is no org and no email to build a topbar
 * from, so "the shell stays" cannot apply, and rendering the designed block bare
 * invents no visual. `.kb-app` + `.kb-app-main` are kept purely as the frame
 * they are — the paper, the gutters, the `data-kb-scheme` dark adoption (§6),
 * and the `kbmain` container the editorial's own phone rule queries — not as
 * chrome: there is no topbar, navbar or rail here.
 *
 * `global-error.tsx` is deliberately NOT used. It replaces `<html>`/`<body>`,
 * loses the fonts and the token sheet, and only catches ROOT-layout throws,
 * which is a much bigger hammer than the gap being closed.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="kb-app" data-md-color-scheme="default" data-kb-scheme="auto">
      <main className="kb-app-main">
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
          detail={error.digest ? <ErrorRef digest={error.digest} /> : undefined}
        />
      </main>
    </div>
  );
}
