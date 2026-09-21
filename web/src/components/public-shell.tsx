import Link from "next/link";

import { FullWidthExit } from "@/app/(public)/documents/[id]/full-width-exit";
import { appButtonClass } from "@/components/ui";
import { BRAND, PUBLIC_SHELL, SKIP_TO_CONTENT } from "@/content";

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
 * Round 04 §4.2 gives this shell its own three pieces, all of them additive:
 *
 *  - **`.kb-app--public`** — with no rail, main would otherwise run to the window
 *    edge at any width, so the modifier caps it at the same 88rem the member console
 *    caps at above 90rem and centres it: a visitor never gets a wider column than a
 *    member.
 *  - **`.kb-app-layout`** — the wrapper the member shell has always had and this one
 *    never did. It is `flex: 1 1 auto` inside round 03's `min-height: 100dvh` column,
 *    so it is what stops ~250-370px of paper-coloured dead space sitting below a
 *    short public document (P28.S2 measured it and called it unpolished-not-broken;
 *    this closes it). Round 05's `graph-r5.css` collapses its rail track here —
 *    `.kb-app--public .kb-app-layout { grid-template-columns: minmax(0, 1fr) }` —
 *    because round 03's `.kb-app-layout` still declares a 15rem rail track that this
 *    shell has nothing to put in.
 *  - **the skip link**, reusing the ONE `SKIP_TO_CONTENT` constant the member shell
 *    and the marketing header already share. Its href is `#main-content`, which is
 *    the id `<main>` has always carried here; the record writes `#content`, same link
 *    and same behaviour, and forking the constant for one surface would be worse.
 *
 * `.kb-topbar__signin` (never `__signout`, the class round 03's phone rule hides) is
 * `flex: none` so the action is never squeezed out. The Tailwind `sticky top-0 z-20`
 * utilities are GONE: round 03 makes `.kb-topbar` sticky at `z-index: 40` itself, and
 * §4.2 is explicit that this shell must not add a second sticky context.
 *
 * NO `data-kb-scheme`: the public surfaces stay light in OS dark mode, because the
 * graph engine reads the scheme attribute and rounds 05/06 designed no dark graph.
 * NO toast region either — `AppShell` mounts one as a sibling of `.kb-app`, but round
 * 04 gives the public surfaces nothing to announce.
 *
 * P28.S7: round 06 §4.4's chrome-less document view is offered to the anonymous
 * reader too (the same URL must read the same signed in or out), so this shell now
 * takes the same `fullWidth` prop and, when it is set, returns a FRAGMENT — the exit
 * pill has to be a sibling of `.kb-app`, never a child, because a container is the
 * containing block for its `position: fixed` descendants.
 *
 * A SERVER component: it holds no session and makes no fetch, so there is no client
 * boundary to cross. The brand links to `/` (the marketing home) rather than
 * `/dashboard`, because a public visitor has no dashboard.
 */
export function PublicShell({
  fullWidth,
  children,
}: {
  /** Round 06 §4.4 — see `AppShell`; the CSS hides the chrome, nothing unmounts. */
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
    <div
      className="kb-app kb-app--public"
      data-md-color-scheme="default"
      data-kb-view={fullWidth ? "full" : undefined}
    >
      <a className="kb-skip" href={SKIP_TO_CONTENT.href}>
        {SKIP_TO_CONTENT.label}
      </a>
      <header className="kb-topbar">
        <Link className="kb-topbar__brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logo} alt="" width={22} height={22} />
          <span className="kb-topbar__word">{BRAND.wordmark}</span>
        </Link>
        <span className="kb-topbar__spacer" />
        <Link
          href="/login"
          className={`${appButtonClass("ghost", "sm")} kb-topbar__signin`}
        >
          {PUBLIC_SHELL.signIn}
        </Link>
      </header>

      <div className="kb-app-layout">
        <main id="main-content" className="kb-app-main">
          {children}
        </main>
      </div>
    </div>
    {fullWidth ? <FullWidthExit /> : null}
    </>
  );
}
