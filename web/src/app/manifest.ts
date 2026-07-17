import type { MetadataRoute } from "next";

import { SITE } from "@/content";

// P14.S2 — web app manifest for the public marketing surface. Minimal: brand +
// the warm-paper / teal scheme + the book-spark logo. No OG image is generated
// (optional per the build prompt); screenshot slots stay empty until assets land.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "knowledge",
    short_name: "knowledge",
    description:
      "Durable knowledge for developers and their coding agents.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f2e8",
    theme_color: "#0f6f66",
    icons: [
      {
        src: "/logo.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
