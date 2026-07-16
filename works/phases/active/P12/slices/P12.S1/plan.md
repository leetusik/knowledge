# P12.S1 — Plan (App scaffold + design-system foundation)

Orchestrator's native plan for **`P12.S1`**, executed by a `slice-executor`. The executor implements this slice against the sources below, writes `result.md`, appends a cross-slice note to `phase.md`, and returns a verdict. It **never commits** and **never transitions slice/phase status**.

## Context

P12.S1 stands up the knowledge web app — a **new Next.js 16 app in `web/`** — and ports its **design-system foundation**. It is purely presentational: **no backend calls, no auth/BFF/session code** (that is S2). Everything S2–S6 renders inherits this foundation.

**Operator design directive (course-correction at this slice's turn — supersedes the DECOMP "placeholder palette" framing in D-P12-3):** the design system is the **real thing** — knowledge **adopts hi2vi_web's actual design system** (its real palette, type scale, fonts, and component styling), and every page will be a **whole, polished page modeled on hi2vi_web**, not a functional stub on a neutral placeholder. The heavy Claude design gate is **no longer deferred** for the app's look; only **production deploy** stays deferred to P14. (P14 remains the separate public landing-page / product-webpage phase.)

## Design source-of-truth & reconciliation rule

Two template repos; a strict split so the port is unambiguous:

- **hi2vi_web (`~/projects/personal/hi2vi_web`) — wins on DESIGN.** The real `@theme` tokens, the CVA primitive *styling*, and the 3 base fonts come from here. It is a distinctive brand: bright signal-green `--color-green: #2ff28f` / links `--color-green-deep: #00b66a` on near-black-green `--color-ink: #061512` + dark-green surfaces (`forest #0b2a22`…), warm terracotta `--color-danger: #d4503c` / amber `--color-caution: #bd7b1c` signals, greenish light surfaces/hairlines, a 14-step type scale (heading weight 680, negative tracking), radius base 14px.
- **vocky (`~/projects/personal/vocky/web`) — wins on STRUCTURE.** vocky already extracted hi2vi_web's design system into a **dashboard-shaped scaffold** — it dropped hi2vi_web's ~2,500 lines of marketing hero/section animation CSS and marketing-only deps (genai/openai/nodemailer/sharp/marked/sanitize-html), kept hi2vi_web's exact token *names* + `cn()` extension + radius/spacing/container/breakpoint values, and **added the net-new `data-table` primitive**. Use its file layout, config, `cn()` architecture, copy-as-data `content/`, `data-table`, and `design/canvas/` convention.

**Where they differ, hi2vi_web wins on all design values (colors, fonts, type-scale weights, primitive hardcoded values like shadow rgba); vocky wins on scaffold/config/dashboard-shape.** Because vocky's token *names* and non-color scales are already hi2vi_web's, the port is largely: take vocky's scaffold, restore hi2vi_web's real color/font/type values + real primitive styling.

## The port, file by file

Create the app under `/Users/sugang/projects/personal/knowledge/web/`. S1 file set only (nothing from S2–S6).

**Toolchain / config — from vocky, renamed** (exact versions per vocky `web/package.json`): `package.json` (`name: "knowledge-web"`, `packageManager pnpm@10.28.2`, `engines node >=22.13.0`; **S1 deps only:** `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `tailwind-merge ^3.6.0`, `tw-animate-css ^1.4.0`, `next ^16.2.9`, `react ^19.2.7`, `react-dom ^19.2.7`, `lucide-react ^1.21.0`; **devDeps:** `@tailwindcss/postcss ^4.3.1`, `tailwindcss ^4.3.1`, `typescript ^6.0.3`, `@types/{node,react,react-dom}`, `eslint ^9.39.4`, `eslint-config-next ^16.2.9`, `prettier ^3.8.4`, `prettier-plugin-tailwindcss ^0.8.0`; **exclude S2+ deps** `server-only`/`zod`/`vitest`). Also: `next.config.ts` (`output: "standalone"` + the security headers; comments → P12/P14), `tsconfig.json` (`@/* → ./src/*`), `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc` (+ `.prettierignore` incl. `design/`), `components.json`, `.nvmrc` (`22`), `.gitignore`. **No `tailwind.config.*`** (Tailwind v4 CSS-first). Dev port `3030` (free vs the backend's `:8766/:8000`).

**`src/app/globals.css` — hi2vi_web's REAL tokens, dashboard subset.** Port hi2vi_web's `globals.css` **`@theme` block, the `:root` shadcn semantic layer, `@theme inline`, and `@layer base` verbatim (the real green palette, `--font-*` families, 14-step type scale, radius/spacing/containers/breakpoints, base resets, `[data-reveal]` start-state)** — roughly its first ~305 lines. **STOP before hi2vi_web's marketing hero/section animation CSS** (everything after `@layer base`, ~2,500 lines) — a dashboard does not need it. vocky's `globals.css` (306 lines) is exactly this dashboard-appropriate boundary with neutralized values — use it as the *structural* guide, but take **hi2vi_web's real values**. Keep the header `@import "tailwindcss"; @import "tw-animate-css";`. Adapt hi2vi-specific doc-section comments (§6/§7/§9…) to knowledge. **No `.dark` block** (explicit surface tokens).

**`src/lib/fonts.ts` + `public/fonts/` — hi2vi_web's real fonts, app-tuned.** Self-host via **`next/font/local`** the **3 base faces**, vendoring the woff2 from `hi2vi_web/public/fonts/` into `knowledge/web/public/fonts/`: **Pretendard → `--font-pretendard` → `font-sans`**, **Inter → `--font-inter` → `font-en`**, **JetBrains Mono → `--font-jetbrains` → `font-mono`** (variables consumed by the `@theme` font families). **App-specific adaptation:** use the **FULL `PretendardVariable.woff2`** (not hi2vi's marketing content-derived `.subset` — knowledge renders unbounded operator/agent-authored Korean: doc titles, project names). **Drop** hi2vi_web's 4 hero-clipping display faces (`clipNews/-Tech/-Marker/-Hanna`) and the `pretendardFull` split — marketing-only. Apply the 3 `.variable` classes on `<html>` in `layout.tsx`.

**`src/lib/utils.ts` — `cn()` with extended tailwind-merge (load-bearing).** Port verbatim (identical in both repos): `cn = twMerge(clsx(...))` where `twMerge = extendTailwindMerge({ extend: { classGroups: { "font-size": [{ text: [<the 14 --text-* names>] }] } } })` — `hero-display, display-lg, heading-1..4, body-lg, body-md, body-md-medium, body-sm, caption, micro, button-md, code-md`. Without it, tailwind-merge silently drops a custom `text-<size>` when it co-occurs with a `text-<color>` in one `cn()` call.

**`src/components/ui/*` — hi2vi_web's real primitives + vocky's data-table.** Port hi2vi_web's real-styled primitives: `button.tsx` (`buttonVariants` + `Button`; primary/secondary/…; `font-en`, `text-button-md`, real green shadow rgba), `card.tsx`, `badge.tsx`, `section.tsx`, `grid.tsx`, `field.tsx` (Label/Input/Textarea/Checkbox/FieldError), `endpoint-card.tsx` (dark code panel), `reveal.tsx` (`"use client"` IntersectionObserver). **Add `data-table.tsx` from vocky** (net-new generic headless table — projects/credentials/documents lists need it; token-based, so it renders in hi2vi_web's real palette automatically; retune any hardcoded value to hi2vi tokens). Barrel `index.ts` re-exporting all. `section.tsx`'s `SectionId` is typed to knowledge's own `content/section-ids.ts`.

**`src/content/*` — copy-as-data scaffold (trimmed, from vocky).** S1 files only: `section-ids.ts` (`SECTION_IDS` for the preview), `site.ts` (`SITE` brand meta → knowledge name/title/description; `url` from `NEXT_PUBLIC_APP_URL` with a localhost fallback), `nav.ts`, `types.ts`, `index.ts` (barrel exporting **only** the S1 symbols — not vocky's `auth/app/dashboard/project` content, which are S2–S4).

**`src/app/layout.tsx` + fresh `src/app/page.tsx`.** `layout.tsx`: root layout, no backend calls — `Metadata` from `SITE`, `<html lang="ko">` (Korean-first, matching hi2vi_web) with the 3 font `.variable` classes, `<body class="… bg-canvas font-sans text-ink …">`. **`page.tsx` must be authored fresh** (vocky's current one is its S2 auth redirect): a **purely presentational preview** exercising the primitives (Section/Card/Button/Badge/Field/DataTable + the type scale) with `@content` copy, in hi2vi_web's real green design language — proving the design system renders. S2 later replaces it with the auth redirect.

**`web/design/canvas/` — scaffold (vocky's minimal shape, hi2vi_web's real values).** Mirror vocky's minimal canvas (`README.md`, `tokens.css`, `_ds_manifest.json`, `foundations/{colors,type,spacing-radius}.html`, `components/{button,card,badge,field,grid,section}.html`, `sections/dashboard-placeholder.html`) — but `tokens.css` + `_ds_manifest.json` reflect **hi2vi_web's real token values** (this is the adopted design). Namespace → a knowledge id; comments → P12/P14. **No `SIGNOFF` file** (the P14 gate drops it). This canvas supports the P14 public-page gate; the app's own look is already the adopted hi2vi_web system.

## Rename / adaptation checklist

Token names, the `cn()` list, CVA variant names, type-scale names, radius/spacing, and canvas structure stay identical (that stability is the point). Change only identity: `package.json name` → `knowledge-web`; `content/site.ts` brand strings → knowledge; every ported header comment `P4.S1/P4.S2/P6` → `P12.S1/P12.S2/P14`; `_ds_manifest.json` namespace + "vocky/P6" notes → knowledge/P14; adapt hi2vi_web's `docs/design-hi2vi.md §…` comments. (Env `KB_API_BASE_URL` + the `lib/vocky/`→`lib/knowledge/` rename are **S2** — not this slice.)

## Phase-notebook update

The executor appends a cross-slice note to `phase.md` recording the **D-P12-3 revision**: *at S1 the operator directed adopting hi2vi_web's real design system now (whole polished pages), dropping the neutral-placeholder + deferred-design-gate framing; production deploy stays P14.* (P12.REVIEW consolidates this into `decisions.md`.)

## Boundary (do NOT do in S1)

No backend calls / fetches; none of `lib/{session,bff,auth-guards,env,client-ip,rate-limit}.ts`, `lib/knowledge/*` (API client), `app/(auth)/*`, `app/(app)/*`, `app/api/*`, `components/app-shell/*`, `components/usage/*`, `content/{auth,app,dashboard,project}.ts`, `tests/*`, `.env.example`, `vitest.config.ts`; no `server-only`/`zod`/`vitest` deps. No commits, no doc versions, no status transitions.

## Verification

- `pnpm install` (in `web/`), `pnpm typecheck`, `pnpm lint`, `pnpm build` — all green.
- `pnpm dev` serves `http://127.0.0.1:3030` and the preview page renders in **hi2vi_web's real green design** (bright green CTAs on near-black-green, the real type scale), fonts self-hosted (no third-party/network requests), primitives + `DataTable` visible.
- Grep confirms **zero** backend calls / `fetch` / `server-only` / auth imports in the S1 tree; `web/design/canvas/tokens.css` mirrors the real `@theme` values; no files outside `web/`; no new `docs/versions/*`; no commit.
