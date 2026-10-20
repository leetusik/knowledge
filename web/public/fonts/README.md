# Self-hosted fonts

Vendored woff2 (committed to the repo). Wired via `src/lib/fonts.ts`
(`next/font/local`). Do **not** hotlink — these are self-hosted on purpose (no
CLS, no third-party request, CSP-safe).

The app wears the **Knowledge Base "calm editorial library"** design system
(P12.S2R): a serif display face (Fraunces) over a clean sans body (Source Sans
3), with JetBrains Mono for data. The **full** Pretendard face (not a subset)
stays as the Korean (Hangul) fallback that ends every stack — knowledge renders
unbounded operator/agent-authored Korean (doc titles, project names) that no
fixed subset could cover.

| File | Source (npm) | Weight axis | Role |
|---|---|---|---|
| `SourceSans3.woff2` | `@fontsource-variable/source-sans-3` | `200 900` | Body / UI → `--font-source` / `font-sans` / `--kb-font-body` |
| `Fraunces.woff2` | `@fontsource-variable/fraunces` | `400 700` (opsz) | Display / headings + stat numerals → `--font-fraunces` / `font-display` / `--kb-font-display` |
| `JetBrainsMono.woff2` | `@fontsource-variable/jetbrains-mono` | `100 800` | Code / mono / eyebrows / tokens → `--font-jetbrains` / `font-mono` / `--kb-font-mono` |
| `PretendardVariable.woff2` | `pretendard` (1.3.9) | `45 920` | Korean (Hangul) fallback → `--font-pretendard` (full face, ~2.0 MB) |

All are OFL-licensed and free to self-host.

## Why the full Pretendard face (not a subset)

The public marketing pattern serves a content-derived subset because its copy is
a fixed, known glyph set. knowledge is different: it renders **unbounded** Korean
authored by operators and agents (document titles, project names, search text),
so any fixed subset would drop to the system fallback the moment new syllables
appear. We therefore serve the full `PretendardVariable.woff2` (~2.0 MB, full
`45 920` weight axis). If a page's LCP later needs a lighter critical path, a
runtime subset can be revisited at the P14 design/deploy gate.

## Re-vendoring / updating

```bash
pnpm add -D @fontsource-variable/source-sans-3 @fontsource-variable/fraunces @fontsource-variable/jetbrains-mono pretendard
# copy the files (see paths in node_modules/.pnpm/...) into this folder, then:
pnpm remove @fontsource-variable/source-sans-3 @fontsource-variable/fraunces @fontsource-variable/jetbrains-mono pretendard
```

## The reader's reading faces (`public/fonts/reader/`, P30.S13)

Two more OFL faces, vendored as Google Fonts' own woff2 **unicode-range subsets** (not wired through
`next/font`, which cannot carry `unicode-range`): `src/app/reader-fonts.css` declares them, and only the reader's
client frame imports it, so no other page pays for them. A page loads just the subsets its text uses.

| Files | Face | Axes | Role |
|---|---|---|---|
| `literata-{normal,italic}-sNNN.woff2` (14) | Literata (OFL) | `wght` 400–700, roman and italic | `--font-reading`: the chapter's body text |
| `notoserifkr-normal-sNNN.woff2` (124) | Noto Serif KR (OFL 1.1) | `wght` 200–900 | Hangul in the reading and display faces (`01-reader` round 02, *Faces*) |

The subset files are numbered in the order Google's CSS lists them; the `unicode-range` of each is in
`reader-fonts.css`. To refresh: fetch `https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400..700;1,7..72,400..700&display=swap`
and `…?family=Noto+Serif+KR:wght@200..900&display=swap` with a modern Chrome user agent, download each `woff2`, and
regenerate the CSS. Do not hotlink.
