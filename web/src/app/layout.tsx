import type { Metadata } from "next";

import { SITE } from "@/content";
import { inter, jetbrains, pretendard } from "@/lib/fonts";
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

// Root layout. Korean-first (`lang="ko"`, matching hi2vi_web) — the app renders
// unbounded operator/agent-authored Korean via the full Pretendard face. The
// three self-hosted next/font variables are applied to <html> so
// font-sans / font-en / font-mono resolve everywhere; body defaults to font-sans
// on the canvas surface. The authenticated app shell + nav land in P12.S2 (they
// wrap the `(app)` route group, not this root layout).
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="flex min-h-dvh flex-col bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
