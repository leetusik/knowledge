import localFont from "next/font/local";

/**
 * Self-hosted variable fonts (vendored woff2 in `public/fonts/`, see its
 * README). `next/font/local` self-hosts them — no CLS, no third-party request,
 * CSP-safe. Each exposes a CSS variable consumed by the `@theme` font families in
 * `globals.css`: `--font-pretendard` → `font-sans`, `--font-inter` → `font-en`,
 * `--font-jetbrains` → `font-mono`. Weight axes match the source files; the
 * design's 650/550/450 weights are covered by Pretendard's continuous 45–920.
 *
 * knowledge adopts hi2vi_web's three BASE faces only. Unlike hi2vi_web's
 * marketing site (which serves a content-derived Pretendard subset + four hero
 * clipping display faces), knowledge serves the FULL Pretendard face — it renders
 * unbounded operator/agent-authored Korean (doc titles, project names) that no
 * fixed subset could cover — and drops the marketing-only clipping faces entirely.
 */

export const pretendard = localFont({
  // FULL Pretendard variable face (~2.0 MB), NOT a content-derived subset:
  // knowledge renders unbounded Korean (operator/agent-authored doc titles,
  // project names), so every syllable must resolve to the brand face, not a
  // system fallback. The full `45 920` weight axis is intact.
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

// English-accent face — used by the Button primitive (`font-en`) and any
// English-first labels. `preload: false` so it does not contend with the
// preloaded Pretendard face in the critical window; it still self-hosts and
// loads on demand with `display: swap`.
export const inter = localFont({
  src: "../../public/fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  preload: false,
});

export const jetbrains = localFont({
  src: "../../public/fonts/JetBrainsMono.woff2",
  variable: "--font-jetbrains",
  weight: "100 800",
  display: "swap",
});
