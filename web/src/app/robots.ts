import type { MetadataRoute } from "next";

import { SITE } from "@/content";

// P14.S2 — robots for the public marketing surface. The landing indexes; the
// authenticated app + auth gate + BFF are kept out of crawls (they are also
// session-gated / noindex, this just states it for crawlers).
//
// P19 — `/documents` and `/graph` are NO LONGER disallowed: those trees now carry
// public, anonymously-readable surfaces (a public project's doc at `/documents/{id}`
// and its org graph at `/graph/{org}`), so crawlers may reach them. Private/
// nonexistent reads still 404 (docs) or bounce to /login, so exposing the prefixes
// leaks nothing. `/dashboard`, `/projects`, the auth pages, and the BFF stay blocked.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/projects", "/login", "/signup", "/api/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
