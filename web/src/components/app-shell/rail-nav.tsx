"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_GROUPS, APP_SHELL, dueText } from "@/content";
import { cn } from "@/lib/utils";

/** The rail's DOM id — the topbar fold toggle's `aria-controls` target. */
export const RAIL_ID = "kb-rail";

/**
 * The shell's rail navigation (P12.S2, re-skinned P12.S2R) — the Knowledge Base
 * console `.kb-rail`: a paper column that reads like a table of contents, with a
 * mono-uppercase eyebrow heading and nav rows whose active state is teal text + a
 * 2px teal left rail + a soft-teal wash (`.kb-rail__link.is-active` +
 * `aria-current="page"`). A client island only because the active item is derived
 * from `usePathname()`; the rest of the shell stays server-rendered.
 *
 * P30.S22 (`06-library` §1): two groups in the one `<nav>`, each a `.kb-rail__sec` with its
 * eyebrow — Reading (Library, Review) then Org (Dashboard, Documents, Graph). Review wears
 * the due count: a pill that is always laid out, so the link never changes width, and
 * hidden at 0; the link's name carries the count ("Review, 12 due").
 *
 * Items flagged `soon` (a route announced before it exists) render as muted
 * `.kb-rail__soon` text with a `.kb-rail__pill` "Soon" tag rather than links that would 404.
 */
export function RailNav({ due }: { due: number }) {
  const pathname = usePathname();
  const count = dueText(due);

  return (
    <aside id={RAIL_ID} className="kb-rail">
      {/* `railNavLabel` ("Sections"), NOT `navLabel` ("Primary") — round 03 §4.1
          gives the navbar the "Primary" name and the rail its own, because both
          landmarks are in the DOM at every width even though only one shows. */}
      <nav aria-label={APP_SHELL.railNavLabel}>
        {APP_NAV_GROUPS.map((group) => (
          <div key={group.heading} className="kb-rail__sec">
            <div className="kb-rail__head kb-app-eyebrow">{group.heading}</div>
            <ul className="kb-rail__list">
              {group.items.map((item) => {
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
                        aria-label={
                          item.count && count ? `${item.label}, ${count} due` : undefined
                        }
                        className={cn("kb-rail__link", active && "is-active")}
                      >
                        <span>{item.label}</span>
                        {item.count ? (
                          <span
                            className={cn("kb-count", !count && "is-zero")}
                            aria-hidden="true"
                          >
                            {count || "0"}
                          </span>
                        ) : null}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
