import type { MetadataRoute } from "next";

import { SITE } from "@/content";

// P14.S2 — robots for the public marketing surface. The landing indexes; the
// authenticated app + auth gate + BFF are kept out of crawls (they are also
// session-gated / noindex, this just states it for crawlers).
//
// P19 — `/documents` and `/graph` are NO LONGER disallowed: `/documents/{id}` carries a
// public project's anonymously-readable doc, and `/graph/{org}` (once the org graph,
// a redirect to the org's library since P37-1p retired the graph) forwards old shared
// links, so crawlers may reach them. Private/nonexistent reads still 404 (docs) or
// bounce to /login, so exposing the prefixes leaks nothing. `/dashboard`, `/projects`, the auth pages, and the BFF stay blocked.
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
