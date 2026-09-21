import { cookies } from "next/headers";
import Link from "next/link";

import { ToastRegion } from "@/components/states";
import { APP_SHELL, BRAND, SKIP_TO_CONTENT } from "@/content";
import type { KbIdentity } from "@/lib/knowledge/types";
import { isRailCollapsed, RAIL_COOKIE } from "@/lib/rail-cookie";

import { AppFrame } from "./app-frame";
import { LogoutButton } from "./logout-button";

/**
 * The authenticated app shell (P12.S2, re-skinned P12.S2R) — the chrome S3–S6
 * render inside, wearing the Knowledge Base light "workspace" console: the `.kb-app`
 * frame carries `data-md-color-scheme="default"` (the light scheme; the login gate
 * is dark), a sticky `.kb-topbar` sunken paper band (fold toggle · logo mark + serif
 * "knowledge" wordmark · divider · workspace crumb · spacer · user email · ghost Sign
 * out) over a `.kb-app-layout` [rail | main] grid.
 *
 * A SERVER component: the identity is server-fetched by the caller and rendered here,
 * so a live session token's surroundings never cross a client boundary. The topbar
 * band and the grid are structurally owned by the `<AppFrame>` client island — they
 * share the rail-fold bit — but everything INSIDE them is passed down as already-
 * rendered server nodes, so the identity OBJECT still never becomes a client prop and
 * nothing here joins the client bundle. Only the genuinely-interactive bits — the fold
 * toggle, the logout button, and the pathname-aware rail — are islands.
 *
 * The fold preference is read SERVER-side from the `kb_rail` cookie so the first paint
 * already carries the right grid (no flash of an expanded rail). That read costs no new
 * dynamic surface: every consumer of this shell has already read the session cookie via
 * `requireIdentity()` / `optionalIdentity()`, so the subtree was dynamic regardless.
 */
export async function AppShell({
  identity,
  children,
}: {
  identity: KbIdentity;
  children: React.ReactNode;
}) {
  const tenantName = identity.tenant?.name ?? APP_SHELL.noTenant;
  const store = await cookies();
  const collapsed = isRailCollapsed(store.get(RAIL_COOKIE)?.value);
  // Round 03 §4.2 — the phone account disclosure's avatar: the first character of
  // the email's local part, uppercased. An empty local part can't happen for a
  // signed-in identity, but `[0]` on "" is `undefined`, so fall back to the label.
  const initial = (identity.user.email.split("@")[0]?.[0] ?? "?").toUpperCase();

  return (
    // A FRAGMENT, not a single root: round 03 §5.5's `.kb-toast-region` has to be
    // a root-level SIBLING of `.kb-app`, never a child. `.kb-app` declares
    // `container: kbapp / inline-size`, and a container is a containing block for
    // `position: fixed` descendants — a toast inside it would pin to the bottom of
    // the document instead of the bottom of the screen. This shell renders
    // straight into the root layout's `<body>` (the `(app)` layout adds no wrapper
    // and `(public)` has no layout at all), so the sibling here really is at the
    // layout root. See `components/states/toast-region.tsx`: the region is empty
    // and nothing emits a toast yet.
    <>
      {/* `data-kb-scheme="auto"` (§6) means "nobody has chosen a scheme yet", and
          is the whole switch for the `prefers-color-scheme: dark` block in
          kb-console-responsive.css. `data-md-color-scheme` is unchanged and still
          the real switch; the auth gate keeps `slate` and carries NO
          `data-kb-scheme`, so it stays dark in both OS schemes, and the landing
          page is untouched because the block is scoped to `.kb-app`. */}
      <div
        className="kb-app"
        data-md-color-scheme="default"
        data-kb-scheme="auto"
      >
        {/* Skip link (§4.1), reusing the marketing header's one `SKIP_TO_CONTENT`
            constant — its href is `#main-content`, which is the id this shell's
            `<main>` has always carried, so the two surfaces keep ONE target and one
            copy string. (The record writes `main#content`; same link, same
            behaviour, no forked constant — see P28.S2's result.md.) */}
        <a className="kb-skip" href={SKIP_TO_CONTENT.href}>
          {SKIP_TO_CONTENT.label}
        </a>
        <AppFrame
          defaultCollapsed={collapsed}
          topbar={
            <>
              <Link className="kb-topbar__brand" href="/dashboard">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={BRAND.logo} alt="" width={22} height={22} />
                <span className="kb-topbar__word">{BRAND.wordmark}</span>
              </Link>
              <span className="kb-topbar__divider" />
              <span className="kb-topbar__crumb">
                {APP_SHELL.workspaceLabel} <b>{tenantName}</b>
              </span>
              <span className="kb-topbar__spacer" />
              <span className="kb-topbar__user">{identity.user.email}</span>
              {/* `.kb-topbar__signout` is the class the phone rule hides — the wide
                  sign-out and the one inside the disclosure are the same island. */}
              <LogoutButton className="kb-topbar__signout" />
              {/* The phone account disclosure (§4.2): a native <details>, so it works
                  with no JS, is keyboard-operable and needs no focus trap or scrim.
                  Rendered at EVERY width — `display: none` above 40rem decides. */}
              <details className="kb-account">
                <summary aria-label={APP_SHELL.accountMenuLabel}>
                  {initial}
                </summary>
                <div className="kb-account__menu">
                  <div className="kb-account__email">{identity.user.email}</div>
                  <div className="kb-account__org">
                    {APP_SHELL.workspaceLabel} <b>{tenantName}</b>
                  </div>
                  <LogoutButton variant="secondary" />
                </div>
              </details>
            </>
          }
        >
          {children}
        </AppFrame>
      </div>

      {/* §5.5 — outside `.kb-app` on purpose (see the note above the fragment).
          Empty, and always mounted: an `aria-live` region has to exist before
          the message arrives or the announcement is lost. */}
      <ToastRegion />
    </>
  );
}
