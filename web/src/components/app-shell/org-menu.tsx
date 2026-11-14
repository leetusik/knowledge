import { Check } from "lucide-react";

import { appButtonClass } from "@/components/ui/app-button";
import { APP_SHELL } from "@/content";
import type { KbTenant } from "@/lib/knowledge/types";
import { ORG_ROUTE } from "@/lib/session";

/**
 * The org menu (multi-org sessions; OQ2: a plain menu built from the shell's existing
 * pieces, redesigned later). A SERVER component, rendered by `AppShell` only for a
 * user in more than one org and handed to the client frame as an already-rendered
 * slot, so the identity never crosses a client boundary.
 *
 * A native `<details>` like the account disclosure: it works with no JS, is
 * keyboard-operable and needs no focus trap. The summary wears the row it sits among
 * (`.kb-rail__link` in the rail, `.kb-navbar__link` in the navbar) and shows the
 * active org's name; the panel is the account menu's `.kb-account__menu`, holding ONE
 * plain form post with a ghost button per org. Posting it sets the active-org cookie
 * (`POST /api/auth/org`, which confirms the membership with the API first) and lands
 * on `/dashboard`. `app-frame.css` only places the panel (down in the rail and the
 * tablet strip, up from the phone's bottom bar).
 */
export function OrgMenu({
  tenants,
  active,
  placement,
}: {
  tenants: readonly KbTenant[];
  active: KbTenant | null;
  placement: "rail" | "navbar";
}) {
  const activeName = active?.name ?? APP_SHELL.noTenant;
  return (
    <details className={`kb-orgmenu kb-orgmenu--${placement}`}>
      <summary
        className={placement === "rail" ? "kb-rail__link" : "kb-navbar__link"}
      >
        <span className="sr-only">{APP_SHELL.orgMenuLabel}: </span>
        <span>{activeName}</span>
      </summary>
      <form
        method="post"
        action={ORG_ROUTE}
        className="kb-account__menu"
        aria-label={APP_SHELL.orgMenuLabel}
      >
        {tenants.map((tenant) => {
          const current = tenant.id === active?.id;
          return (
            <button
              key={tenant.id}
              type="submit"
              name="org"
              value={tenant.id}
              aria-current={current ? "true" : undefined}
              className={appButtonClass("ghost")}
            >
              {current ? <Check size={16} aria-hidden /> : null}
              <span>{tenant.name}</span>
            </button>
          );
        })}
      </form>
    </details>
  );
}
