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
