import { cookies } from "next/headers";
import Link from "next/link";

import { APP_SHELL, BRAND } from "@/content";
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

  return (
    <div className="kb-app" data-md-color-scheme="default">
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
            <LogoutButton />
          </>
        }
      >
        {children}
      </AppFrame>
    </div>
  );
}
