import Link from "next/link";

import { appButtonClass } from "@/components/ui";
import { BRAND, PUBLIC_SHELL } from "@/content";

/**
 * The anonymous public shell (P19) — the chrome the `(public)` doc + graph pages
 * render inside when the visitor has no session. It is COMPOSED 1:1 from the
 * authenticated `AppShell`'s already-designed pieces (no new CSS, no new tokens): the
 * same `.kb-app` light-scheme frame (carrying `data-md-color-scheme="default"`, which
 * the graph engine reads), the same sticky `.kb-topbar` sunken-paper band with the
 * same brand block, and the same `.kb-app-main` content padding. It drops everything
 * member-only — the workspace crumb, the user email, the rail, and Sign out — and
 * offers a single "Sign in" action in their place.
 *
 * A SERVER component: it holds no session and makes no fetch, so there is no client
 * boundary to cross. The brand links to `/` (the marketing home) rather than
 * `/dashboard`, because a public visitor has no dashboard.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="kb-app" data-md-color-scheme="default">
      <header className="kb-topbar sticky top-0 z-20">
        <Link className="kb-topbar__brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={22} height={22} />
          <span className="kb-topbar__word">{BRAND.wordmark}</span>
        </Link>
        <span className="kb-topbar__spacer" />
        <Link href="/login" className={appButtonClass("ghost", "sm")}>
          {PUBLIC_SHELL.signIn}
        </Link>
      </header>

      <main id="main-content" className="kb-app-main">
        {children}
      </main>
    </div>
  );
}
