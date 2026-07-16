# Self-hosted fonts

Vendored woff2 (committed to the repo). Wired via `src/lib/fonts.ts`
(`next/font/local`). Do **not** hotlink — these are self-hosted on purpose (no
CLS, no third-party request, CSP-safe).

knowledge adopts hi2vi_web's three **base** faces only. Unlike hi2vi_web's
marketing site, knowledge serves the **full** Pretendard face (not a
content-derived subset) — it renders unbounded operator/agent-authored Korean
(doc titles, project names) that no fixed subset could cover — and drops
hi2vi_web's four marketing-only hero clipping display faces entirely.

| File | Source (npm) | Version | Weight axis | Role |
|---|---|---|---|---|
| `PretendardVariable.woff2` | `pretendard` | 1.3.9 | `45 920` | **Served** Korean-first primary → `--font-pretendard` / `font-sans` (full face, ~2.0 MB) |
| `InterVariable.woff2` | `@fontsource-variable/inter` (`inter-latin-wght-normal`) | 5.2.8 | `100 900` | English accent → `--font-inter` / `font-en` (`preload: false` — on demand) |
| `JetBrainsMono.woff2` | `@fontsource-variable/jetbrains-mono` (`jetbrains-mono-latin-wght-normal`) | 5.2.8 | `100 800` | Code / mono → `--font-jetbrains` / `font-mono` |

All are OFL-licensed and free to self-host. The unusual design weights
(650/550/450) are covered by Pretendard's continuous `45 920` axis.

## Why the full Pretendard face (not a subset)

hi2vi_web serves a ~115 KB **content-derived** subset of Pretendard because its
marketing copy is a fixed, known glyph set. knowledge is different: it renders
**unbounded** Korean authored by operators and agents (document titles, project
names, search text), so any fixed subset would drop to the system fallback the
moment new syllables appear. We therefore serve the full `PretendardVariable.woff2`
(~2.0 MB, full `45 920` weight axis). If a page's LCP later needs a lighter
critical path, a runtime subset can be revisited at the P14 design/deploy gate.

## Re-vendoring / updating

```bash
pnpm add -D pretendard @fontsource-variable/inter @fontsource-variable/jetbrains-mono
# copy the files (see paths in node_modules/.pnpm/...) into this folder, then:
pnpm remove pretendard @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```
