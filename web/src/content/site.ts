// Site-level brand + metadata. Single source for the wordmark and the
// title/description used by the Metadata API (wired in layout.tsx). The app is
// Korean-first (root lang="ko", matching hi2vi_web), rendered in the full
// Pretendard face. `url` reads the deploy env var and falls back to a local-dev
// origin (production origin is a P14 deploy concern).
import type { SiteMeta } from "./types";

export const SITE: SiteMeta = {
  name: "knowledge",
  title: "knowledge",
  titleTemplate: "%s · knowledge",
  description:
    "knowledge — the tenant dashboard for your projects, credentials, documents, and usage.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3030",
};
