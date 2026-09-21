"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV, APP_SHELL } from "@/content";

/**
 * The shell's phone/tablet navigation (round 03 §4.3) — ONE element with two
 * placements, both owned by `kb-console-responsive.css`: pinned to the bottom of
 * the screen on a phone (thumb-reachable, `position: sticky` inside the `.kb-app`
 * flex column — no `fixed`, no safe-area guesswork) and a sticky strip under the
 * topbar on a tablet. At desktop width it is `display: none` and the rail is back.
 *
 * It renders at EVERY width and always sits immediately after the topbar in the
 * DOM, so the reading and tab order is brand → navigation → content everywhere;
 * CSS `order` is what moves it below the content visually on a phone. Nothing here
 * measures a width or writes `data-rail` — the responsive layer never does.
 *
 * Same three destinations and labels as `rail-nav.tsx` (one `APP_NAV` source), no
 * icons, and `aria-current="page"` is the single source of truth for the active
 * state. A client island for exactly the reason the rail is one: the active item
 * comes from `usePathname()`.
 */
export function NavbarNav() {
  const pathname = usePathname();

  return (
    <nav className="kb-navbar" aria-label={APP_SHELL.navLabel}>
      {APP_NAV.map((item) =>
        item.soon ? (
          // A route announced before it exists renders as muted text, never a
          // link that 404s — the rail's rule, kept identical here.
          <span
            key={item.href}
            aria-disabled="true"
            className="kb-navbar__link"
          >
            {item.label}
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            aria-current={
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "page"
                : undefined
            }
            className="kb-navbar__link"
          >
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}
