import { APP_SHELL, BRAND } from "@/content";
import type { KbIdentity } from "@/lib/knowledge/types";

import { LogoutButton } from "./logout-button";
import { RailNav } from "./rail-nav";

/**
 * The authenticated app shell (P12.S2) — the chrome S3–S6 render inside, skinned as
 * hi2vi_web's light "workspace" console (operator/(console)): a sticky white topbar
 * (brand · workspace/tenant breadcrumb · `flex-1` spacer · user email · logout)
 * over a `[rail | main]` grid that collapses to a single column below 900px.
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
    <>
      <header className="sticky top-0 z-20 flex items-center gap-3.5 border-b border-hairline bg-canvas px-6 py-3">
        <span className="text-[18px] font-extrabold tracking-[-0.3px] text-ink">
          {BRAND.prefix}
          <span className="text-green-deep">{BRAND.accent}</span>
          {BRAND.suffix}
        </span>
        <span className="h-5 w-px bg-hairline" />
        <span className="hidden text-body-sm text-steel sm:inline">
          {APP_SHELL.workspaceLabel}{" "}
          <b className="font-semibold text-charcoal">{tenantName}</b>
        </span>
        <span className="flex-1" />
        <span className="hidden text-caption text-steel md:inline">
          {identity.user.email}
        </span>
        <LogoutButton />
      </header>

      <div className="grid min-h-[calc(100dvh-57px)] grid-cols-1 min-[900px]:grid-cols-[248px_minmax(0,1fr)]">
        <RailNav />
        <main
          id="main-content"
          className="relative px-4 pt-[22px] pb-10 min-[900px]:px-[26px]"
        >
          {children}
        </main>
      </div>
    </>
  );
}
