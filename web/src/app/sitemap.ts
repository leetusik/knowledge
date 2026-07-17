import type { MetadataRoute } from "next";

import { SITE } from "@/content";

// P14.S2 — sitemap for the public marketing surface. Only the indexable landing
// at `/` is listed; the authenticated app (/dashboard, …) and the `(auth)` gate
// are private / noindex, so they are deliberately absent.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
