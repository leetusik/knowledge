import Link from "next/link";

import { APP_SHELL, BRAND } from "@/content";
import type { KbIdentity } from "@/lib/knowledge/types";

import { LogoutButton } from "./logout-button";
import { RailNav } from "./rail-nav";

/**
 * The authenticated app shell (P12.S2, re-skinned P12.S2R) — the chrome S3–S6
 * render inside, wearing the Knowledge Base light "workspace" console: the `.kb-app`
 * frame carries `data-md-color-scheme="default"` (the light scheme; the login gate
 * is dark), a sticky `.kb-topbar` sunken paper band (logo mark + serif "knowledge"
 * wordmark · divider · workspace crumb · spacer · user email · ghost Sign out) over
 * a `.kb-app-layout` [rail | main] grid.
 *
 * A SERVER component: the identity is server-fetched by the `(app)` layout and
 * rendered here, so a live session token's surroundings never cross a client
 * boundary. Only the two genuinely-interactive bits — the logout button and the
 * pathname-aware rail — are client islands.
 */
export function AppShell({
  identity,
  children,
}: {
  identity: KbIdentity;
  children: React.ReactNode;
}) {
  const tenantName = identity.tenant?.name ?? APP_SHELL.noTenant;

  return (
    <div className="kb-app" data-md-color-scheme="default">
      <header className="kb-topbar sticky top-0 z-20">
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
      </header>

      <div
        className="kb-app-layout"
        style={{ minHeight: "calc(100dvh - var(--kb-app-topbar-h))" }}
      >
        <RailNav />
        <main id="main-content" className="kb-app-main">
          {children}
        </main>
      </div>
    </div>
  );
}
