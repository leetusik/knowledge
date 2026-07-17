import type { MetadataRoute } from "next";

import { SITE } from "@/content";

// P14.S2 — robots for the public marketing surface. The landing indexes; the
// authenticated app + auth gate + BFF are kept out of crawls (they are also
// session-gated / noindex, this just states it for crawlers).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/graph",
        "/documents",
        "/projects",
        "/login",
        "/signup",
        "/api/",
      ],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
