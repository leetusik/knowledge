import type { Metadata } from "next";

import { SITE } from "@/content";
import { fraunces, jetbrains, pretendard, source } from "@/lib/fonts";
import "./globals.css";

// Base metadata. `metadataBase` resolves canonical/OG URLs from SITE.url
// (NEXT_PUBLIC_APP_URL → local-dev origin fallback). Icon / OG / robots /
// sitemap file-convention routes are a P14 concern, not this scaffold slice.
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: SITE.titleTemplate,
  },
  description: SITE.description,
  applicationName: SITE.name,
};

// Root layout. Korean-first (`lang="ko"`) — the app renders unbounded operator/
// agent-authored Korean via the full Pretendard Hangul fallback. The self-hosted
// next/font variables (Source Sans 3 / Fraunces / JetBrains Mono / Pretendard)
// are applied to <html> so font-sans / font-display / font-mono resolve
// everywhere. `data-md-color-scheme="default"` sets the light Knowledge Base
// scheme as the base; the `(auth)` group overrides it to the dark `slate` gate
// on its own stage, while the `(app)` shell carries `default` on its `.kb-app`
// root. The body is scheme-neutral (bg-canvas / text-ink resolve to --kb-* per
// the active scheme).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      data-md-color-scheme="default"
      className={`${pretendard.variable} ${source.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
