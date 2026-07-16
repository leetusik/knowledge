"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV, APP_SHELL } from "@/content";
import { cn } from "@/lib/utils";

/**
 * The shell's rail navigation (P12.S2, re-skinned P12.S2R) — the Knowledge Base
 * console `.kb-rail`: a paper column that reads like a table of contents, with a
 * mono-uppercase eyebrow heading and nav rows whose active state is teal text + a
 * 2px teal left rail + a soft-teal wash (`.kb-rail__link.is-active` +
 * `aria-current="page"`). A client island only because the active item is derived
 * from `usePathname()`; the rest of the shell stays server-rendered.
 *
 * Items flagged `soon` (a route announced before it exists — Documents/S5,
 * Graph/S6) render as muted `.kb-rail__soon` text with a `.kb-rail__pill` "Soon"
 * tag rather than links that would 404.
 */
export function RailNav() {
  const pathname = usePathname();

  return (
    <aside className="kb-rail">
      <nav aria-label={APP_SHELL.navLabel}>
        <div className="kb-rail__head kb-app-eyebrow">{APP_SHELL.railHeading}</div>
        <ul className="kb-rail__list">
          {APP_NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                {item.soon ? (
                  <span aria-disabled="true" className="kb-rail__soon">
                    {item.label}
                    <span className="kb-rail__pill">{APP_SHELL.soonTag}</span>
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("kb-rail__link", active && "is-active")}
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
