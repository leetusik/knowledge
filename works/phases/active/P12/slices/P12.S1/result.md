# P12.S1 — Result (App scaffold + design-system foundation)

## What was built

A new **Next.js 16 / React 19 / TS** app at `web/`, purely presentational
(no backend calls), carrying the **adopted hi2vi_web design system** in a
dashboard-shaped scaffold. File set (S1 only — nothing from S2–S6):

- **Toolchain / config** (from vocky, renamed `knowledge-web`): `package.json`
  (S1 deps only — no `server-only`/`zod`/`vitest`, no `test` script),
  `next.config.ts` (`output: "standalone"` + security headers), `tsconfig.json`
  (`@/* → ./src/*`), `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc`,
  `.prettierignore`, `components.json`, `.nvmrc` (22), `.gitignore`. No
  `tailwind.config.*` (Tailwind v4 CSS-first). Dev port `3030`.
- **`src/app/globals.css`** — vocky's dashboard-appropriate structure (`@theme` +
  `:root` shadcn layer + `@theme inline` + `@layer base` with `[data-reveal]`)
  with **hi2vi_web's REAL values**: the bright-green-on-near-black-green palette
  (`--color-green #2ff28f`, `--color-ink #061512`, forest ramp, terracotta/amber
  signals), the 3 real font families, the 14-step type scale, radius/spacing/
  containers/breakpoints. No `.dark` block. Stopped before hi2vi's ~2,500 lines
  of marketing hero/section animation CSS.
- **`src/lib/fonts.ts`** — self-hosted via `next/font/local`: **full**
  `PretendardVariable.woff2` → `--font-pretendard`/`font-sans`, Inter →
  `--font-inter`/`font-en`, JetBrains → `--font-jetbrains`/`font-mono`. Dropped
  hi2vi's 4 hero-clipping display faces + the subset/`pretendardFull` split.
- **`src/lib/utils.ts`** — `cn()` with the extended tailwind-merge registering the
  14 custom `text-*` sizes (load-bearing; ported verbatim).
- **`src/components/ui/*`** — hi2vi's real-styled primitives (`button` with the
  real green shadow `rgba(0,182,106,…)`, `card`/`badge` with real ink/green rgba +
  one-off values, `section`, `grid`, `field`, `endpoint-card`, `reveal`) **plus**
  vocky's net-new `data-table.tsx`; barrel `index.ts`. `section.tsx`'s `SectionId`
  is typed to knowledge's own `content/section-ids.ts`.
- **`src/content/*`** — S1 copy-as-data only: `section-ids.ts`, `site.ts`
  (knowledge brand; `url` from `NEXT_PUBLIC_APP_URL` + localhost fallback),
  `nav.ts`, `types.ts`, `index.ts` (barrel exports **only** the S1 symbols).
- **`src/app/layout.tsx`** — root layout, `lang="ko"` (Korean-first), 3 font
  `.variable` classes on `<html>`, `Metadata` from `SITE`, no backend calls.
- **`src/app/page.tsx`** — authored **fresh** (not vocky's S2 auth redirect): a
  polished presentational preview exercising Section/Card/Button/Badge/Field/
  DataTable + the type scale + EndpointCard in the real green design language.
- **`public/fonts/`** — 3 vendored woff2 (full Pretendard, Inter, JetBrains) +
  adapted `README.md`.
- **`design/canvas/`** — vocky's minimal shape with **hi2vi's real token values**:
  `tokens.css` + `_ds_manifest.json` (knowledge namespace
  `KnowledgeDesignSystem_89826d`, `brandFonts` status `adopted`),
  `foundations/{colors,type,spacing-radius}.html`,
  `components/{button,card,badge,field,grid,section}.html`,
  `sections/dashboard-placeholder.html`, `README.md`. No `SIGNOFF` file.

## Port decisions

- **Two-source reconciliation** per the plan: vocky = structure (file layout,
  config, `cn()` architecture, copy-as-data content, `data-table`, canvas shape);
  hi2vi_web = design (colors, fonts, type-scale weights, primitive hardcoded rgba).
  Where they differ, hi2vi values won; vocky's scaffold shape won.
- **Full Pretendard** (not hi2vi's marketing content-derived `.subset`) because
  knowledge renders unbounded operator/agent-authored Korean; documented in the
  fonts README + `fonts.ts`.
- **Dropped** hi2vi's 4 hero-clipping display faces and `pretendardFull` split
  (marketing-only). `layout.tsx` is `lang="ko"` matching hi2vi (vocky used `en`).
- Rename checklist applied: `name: knowledge-web`, `content/site.ts` brand,
  every ported `P4.S1/P4.S2/P6` header comment → `P12.S1/P12.S2/P14`, manifest
  namespace + notes → knowledge/P14. Env `KB_API_BASE_URL` + the
  `lib/vocky/`→`lib/knowledge/` rename are deferred to S2 (per plan).

## Verification (all green)

| Command (in `web/`) | Result |
|---|---|
| `pnpm install` | ok (pnpm 10.28.2, node 24.3.0 ≥ 22.13.0) |
| `pnpm typecheck` (`tsc --noEmit`) | pass, 0 errors |
| `pnpm lint` (`eslint .`) | pass (fixed one `react/no-unescaped-entities` in `page.tsx`) |
| `pnpm build` (`next build`) | pass — `/` prerendered **○ Static** (proves no server fetch), `.next/standalone/server.js` emitted |
| `pnpm dev` → `http://127.0.0.1:3030/` | HTTP 200; served CSS contains `#2ff28f` + `#061512`; preview renders primitives + DataTable. Server stopped, port 3030 clear. |

Grep confirmations:
- Real green in `src/app/globals.css` (`#2ff28f`, `#061512`, `#00b66a`, `#0b2a22`)
  and `design/canvas/tokens.css`; **zero** neutralized indigo/slate values leaked
  (`#6366f1`/`#4f46e5`/`#0f172a`/`rgba(79,70,229…)` → 0 in all S1 files).
- Fonts self-hosted in `web/public/fonts/*.woff2` (no third-party/network face).
- **Zero** backend calls / `fetch(` / `server-only` / `/auth/` / `Bearer` /
  `cookies()` / `lib/{session,bff,…}` imports anywhere in `web/src/`.
- No files outside `web/`; no new `docs/versions/*`; `python3 scripts/workflow.py
  validate` passes.

## Deviations from plan

- **`page.tsx` copy**: reworded one sentence to avoid a JSX unescaped-apostrophe
  ESLint error (`hi2vi_web's` → `the adopted hi2vi_web brand`). No behavioral
  change.
- **Canvas fonts**: `tokens.css` pulls Pretendard from the jsDelivr CDN and
  Inter/JetBrains from Google Fonts (the canvas is a standalone artifact outside
  the app CSP; the app itself self-hosts via `next/font`). vocky used Google Fonts
  for its placeholder faces; Pretendard isn't on Google Fonts, hence jsDelivr.
- Otherwise followed the plan's file-by-file port exactly.
