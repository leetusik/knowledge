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

/**
 * Wordmark split into three parts so the middle `accent` glyph renders in signal
 * green (the brand mark), matching hi2vi_web's operator wordmark treatment (which
 * accents its `2`). knowledge has no digit, so the leading `k` is the mark —
 * "knowledge" with a green initial. The dark login gate accents in `text-green`;
 * the light app-shell topbar accents in `text-green-deep` (readable on white).
 */
export const BRAND = {
  prefix: "",
  accent: "k",
  suffix: "nowledge",
} as const;
