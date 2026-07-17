import type { Metadata } from "next";

import { SITE, SKIP_TO_CONTENT } from "@/content";

import "@/components/marketing/marketing.css";

// P14.S2 — the public marketing route group. It takes over `/` (see
// `(marketing)/page.tsx`); it is public, no auth gate, and SHOULD index (unlike
// the `(auth)` subtree, which sets robots noindex). The authenticated app stays
// at its current paths (/dashboard, /login, …) — this group adds only the
// landing.
//
// The landing is a light page that drops into scheme-independent charcoal bands
// (hero / connect / footer). The light bands follow the reading-room scheme: a
// pre-paint inline script points `#mkt-root`'s `data-md-color-scheme` at the OS
// preference (there is no in-page toggle), so both schemes render for real
// visitors; SSR / no-JS default to the light `default` scheme, and
// `suppressHydrationWarning` keeps React from reverting the script's attribute.
export const metadata: Metadata = {
  title:
    "knowledge — Durable knowledge for developers and their coding agents",
  description:
    "A durable, searchable home for what you and your coding agents figure out — saved from the terminal, browsed as a living graph, read like a book.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "knowledge — Knowledge that outlives the conversation",
    description:
      "Durable knowledge for developers and their coding agents. Free web app, hybrid search, the knowledge graph, and the Claude Code connection.",
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
  },
};

const SCHEME_SCRIPT = `(function(){try{var m=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)');document.getElementById('mkt-root').setAttribute('data-md-color-scheme', m&&m.matches?'slate':'default');}catch(e){}})();`;

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      id="mkt-root"
      className="mkt-root bg-canvas text-ink"
      data-md-color-scheme="default"
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: SCHEME_SCRIPT }} />
      <a
        href={SKIP_TO_CONTENT.href}
        className="sr-only rounded-full bg-green px-4 py-2 text-on-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]"
      >
        {SKIP_TO_CONTENT.label}
      </a>
      {children}
    </div>
  );
}
