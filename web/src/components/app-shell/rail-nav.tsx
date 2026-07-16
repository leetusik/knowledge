"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV, APP_SHELL } from "@/content";
import { cn } from "@/lib/utils";

/**
 * The shell's rail navigation (P12.S2), skinned as hi2vi_web's light console rail
 * (operator/(console)): a white `bg-canvas` column with a mono-uppercase eyebrow
 * section heading and flat nav rows whose active state is `border-green-deep
 * bg-surface-green` + `aria-current`. A client island only because the active item
 * is derived from `usePathname()`; the rest of the shell stays server-rendered.
 *
 * Items flagged `soon` (a route announced before it exists — Documents/S5,
 * Graph/S6) render as muted, non-interactive text with a "Soon" tag rather than
 * links that would 404. Below 900px the rail collapses to a horizontal strip above
 * the main column.
 */
export function RailNav() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-hairline bg-canvas px-4 py-[18px] min-[900px]:border-r min-[900px]:border-b-0">
      <nav aria-label={APP_SHELL.navLabel}>
        <h2 className="mb-2.5 font-mono text-micro font-bold tracking-[0.9px] text-steel uppercase">
          {APP_SHELL.railHeading}
        </h2>
        <ul className="flex flex-wrap gap-1.5 min-[900px]:flex-col">
          {APP_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                {item.soon ? (
                  <span
                    aria-disabled="true"
                    className="flex items-center justify-between gap-2 rounded-md border border-hairline-soft px-[11px] py-[9px] text-body-sm text-muted"
                  >
                    {item.label}
                    <span className="rounded-full border border-hairline bg-surface px-2 py-0.5 font-mono text-[9px] font-bold tracking-[0.3px] text-steel uppercase">
                      {APP_SHELL.soonTag}
                    </span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-md border px-[11px] py-[9px] text-body-sm transition",
                      active
                        ? "border-green-deep bg-surface-green font-medium text-green-dark"
                        : "border-hairline-soft bg-canvas text-slate hover:border-hairline-strong hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
