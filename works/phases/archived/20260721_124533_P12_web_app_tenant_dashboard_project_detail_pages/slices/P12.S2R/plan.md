# P12.S2R — Plan (Re-skin the app to the Knowledge Base design system)

Orchestrator's native plan for **`P12.S2R`** (`medium` risk), executed by **`slice-executor-mid`**. The executor implements against the **staged design source on disk** (below), writes `result.md`, appends a `phase.md` cross-slice note, returns a verdict. It **never commits** and **never transitions slice/phase status**.

## Context

S1/S2 built the web app in a **placeholder "hi2vi green" skin** (bright `#2ff28f` on near-black-green). The operator ran a Claude design co-work; the returned **APP_BRIEF.md** re-skins the app to the Knowledge Base **"calm editorial library"** identity — warm ivory/charcoal paper, one deep-teal accent, Fraunces / Source Sans 3 / JetBrains Mono, hairline borders, the single soft shadow — carrying **hi2vi's dashboard structure** (paper topbar + TOC rail + stat tiles + data tables + status encoding). **Apply that brief: tokens + component styling + fonts ONLY, NO functional change.** This re-skins what S1/S2 built and lays the design foundation S3–S6 render on.

**Decisions the brief resolved:** ① stat-tile numerals = **Fraunces serif** (`tabular-nums`); ② status = **teal (active) + amber-bronze (idle) + terracotta (revoked)**, dots/chips only, encoded in **form** (filled dot / hollow ring / struck dot) so it survives greyscale; ③ **login = dark slate "threshold," the app opens light**.

## Staged inputs — READY on disk (do NOT look for DesignSync; you can't reach it)

The orchestrator already fetched the design source and vendored fonts. Read from these:

- **`web/design/canvas/tokens/{colors,type,shape,app}.css`** — the `--kb-*` token blocks (both schemes: `[data-md-color-scheme="default"]` light / `["slate"]` dark; type/shape/structure on `:root`).
- **`web/design/canvas/components/console/console.css`** — the portable `.kb-*` component classes (the skin's source of truth).
- **`web/design/canvas/components/console/console-trend.js`** — usage-trend SVG drawing spec (reference for S3; not built here).
- **`web/design/canvas/pages/app-{login,dashboard}.card.html`** — the dark-gate + light-shell structure specimens.
- **`web/design/canvas/APP_BRIEF.md`** — the apply-map (token table + component→`.kb-*` table). **Read this first.**
- **`web/public/{logo,favicon}.svg`** — the book-spark mark (teal), already vendored for the app to serve.
- **`web/public/fonts/Fraunces.woff2`** (variable, opsz+wght) + **`SourceSans3.woff2`** (variable) — already vendored. `JetBrainsMono.woff2` + `PretendardVariable.woff2` stay; **`InterVariable.woff2` must be deleted** (below).

Also read for the current state: `web/src/app/globals.css` (`@theme` 21–178 / `:root` shadcn 186–216 / `@theme inline` 218–237 / `@layer base` 247–306; single palette, **no scheme system today** — `<body>` hardwires `bg-canvas text-ink`), `web/src/lib/fonts.ts`, `web/src/lib/utils.ts` (the 14 `--text-*` names — **keep them; do not rename tokens**).

## Approach — adopt the design system's CSS, rewrite components to `.kb-*`

`console.css` is a complete, portable, token-driven stylesheet, and APP_BRIEF maps each fixed component → a `.kb-*` class. **Adopt it** (don't re-derive Tailwind strings). The token repoint below is an **auto-recolor safety net**: any Tailwind utility you don't explicitly rewrite (marketing `button.tsx`, `section.tsx`, `card.tsx` pricing/archive variants — all P14/legacy, unused in the app) recolors for free because its `--color-*` now resolves to a `--kb-*` value.

### 1 · Foundation — tokens, schemes, fonts
- **Tokens:** copy the four token files' `--kb-*` bodies into **`web/src/app/kb-tokens.css`** and `@import` it from `globals.css` (Tailwind v4 allows `@import` of plain CSS). **Drop the mkdocs-only `--md-*` mappings** — the app doesn't use them; keep only the `--kb-*` (+ `--md-hue` is harmless to drop).
- **Console classes:** copy `console.css` → **`web/src/app/kb-console.css`**, `@import` from `globals.css` (references `--kb-*` only → works once tokens exist).
- **Repoint `@theme` + the shadcn `:root` layer** per APP_BRIEF's table, so lingering Tailwind utilities render in KB colors: `--color-canvas→--kb-paper`, `--color-surface*→--kb-surface(-sunken)`, `--color-ink/charcoal→--kb-ink`, `--color-slate/steel→--kb-secondary`, `--color-muted→--kb-hint`, **the whole `--color-green*` ramp → `--kb-accent`/`-strong`/`-soft` (teal; signal-green gone)**, `--color-hairline(-strong)→--kb-border(-strong)`, `--color-danger*→--kb-status-revoked*`, `--color-caution*→--kb-status-idle*`, `--radius→--kb-radius`. Values must be **per-scheme** (follow the scheme attribute). The `@layer base` `:focus-visible` ring becomes teal automatically via the green→teal repoint.
- **Scheme wiring (decision ③):** introduce a per-route-group scheme (the app has none today):
  - Root `layout.tsx`: base `data-md-color-scheme="default"` on `<html>`; make `<body>` **scheme-neutral** (`bg-canvas text-ink` now resolve to `--kb-*`, so keeping them is fine — just ensure they no longer hardwire a scheme-independent light look).
  - `(app)/layout.tsx` has no wrapper → carry `data-md-color-scheme="default"` on the app-shell's root `.kb-app` element.
  - `(auth)/layout.tsx` already wraps children in one `<div>` (currently `bg-ink` + glow/grid decor) → set `data-md-color-scheme="slate"` on it + a `min-h-dvh` grid-centered stage (`background: var(--kb-paper)`); replace the hi2vi glow/grid with the calm dark threshold.
- **Fonts (`lib/fonts.ts` + `layout.tsx` + `@theme`):** `next/font/local` — add **Fraunces** (`--font-fraunces`→display) + **Source Sans 3** (`--font-source`→sans/body), keep JetBrains (mono) + Pretendard (Korean fallback), **remove Inter**. Point `@theme --font-sans`→Source-Sans-led KB body stack, add **`--font-display`**→Fraunces-led KB display stack, `--font-mono`→JetBrains KB mono stack (each ending in Pretendard/Hangul fallback, from `type.css`). **`--font-en` (used by P14 marketing `button.tsx`) → repoint to the Source Sans stack** so nothing references the removed Inter. Apply the new `.variable` classes in `layout.tsx` (drop `inter.variable`); **delete `web/public/fonts/InterVariable.woff2`**.

### 2 · Re-skin components → `.kb-*` (apply-map; behavior unchanged; icons via **lucide-react**, NOT the specimens' iconify CDN)
- `app-shell/app-shell.tsx` → `.kb-app` (carries `data-md-color-scheme="default"`) + `.kb-topbar` (logo.svg + lowercase **"knowledge"** wordmark · divider · workspace crumb · spacer · user email · ghost Sign out) over `.kb-app-layout` (`.kb-rail` | `.kb-app-main`).
- `app-shell/rail-nav.tsx` → `.kb-rail__head` eyebrow + `.kb-rail__list`; active = `.kb-rail__link.is-active[aria-current="page"]`; Soon = `.kb-rail__soon` + `.kb-rail__pill`.
- `app-shell/logout-button.tsx` → `.kb-appbtn--ghost --sm` (POST logout unchanged).
- `ui/app-button.tsx` → `.kb-appbtn--{primary,secondary,ghost,danger}` (+`--sm`); `Tag` → `.kb-chip`. **`ui/button.tsx` (marketing pill) UNCHANGED — reserved for P14; auto-recolors via the repoint.**
- `ui/data-table.tsx` → `.kb-dtable` (mono uppercase headers on sunken band · hairline rows · teal-soft hover · `.num`/`.mono`/`.right` · `.kb-dtable__empty`).
- `ui/badge.tsx` → status vocabulary `.kb-status--{active,idle,revoked}` bare dot + `.kb-status--chip` form (drop the hardcoded `#586422`).
- `ui/field.tsx` → `.kb-field/__label/__input/__error/__hint`, `.kb-check`, console search `.kb-appsearch` (teal focus ring; `aria-invalid`→terracotta).
- `ui/card.tsx` → app-used variants map to `.kb-panel` / `.kb-tile` (Fraunces `.kb-tile__num`); marketing-only variants (pricing/archive) ride the repoint or trim — no new hardcoded hex.
- `ui/reveal.tsx` (show-once key) → `.kb-reveal*` (overlay · amber warn · mono key panel · copy · one soft shadow). (Leave its separate `[data-reveal]` scroll-reveal role.)
- `ui/endpoint-card.tsx` → `--kb-surface-sunken` + hairline + mono (drop the forest-green plate).
- **(auth) dark gate:** `(auth)/layout.tsx` = slate stage; `auth-card.tsx` = the gate card (gradient bg + inset top-light + brand row + "Secure" pill + trust chips, per `app-login` specimen) using `.kb-field`/`.kb-appbtn` — replacing all its hardcoded hi2vi rgba; `credentials-form.tsx` (`login/login-form.tsx` + `signup/signup-form.tsx` are config-only, no styling) → `.kb-field` + full-width `.kb-appbtn--primary` + `.kb-field__error` (`role="alert"`), replacing its dark hardcoded rgba. **BFF fetch / status-only / no-enumeration behavior unchanged.**
- `(app)/dashboard/page.tsx` placeholder → render in the light shell with `.kb-app-title`/eyebrow (minimal; **S3 builds the real dashboard**).
- `content/site.ts` `BRAND` → lowercase **"knowledge"** wordmark + `logo.svg`.

### 3 · Leave as-is (no churn, no scope creep)
- The 14 `--text-*` scale + `cn()` registration in `utils.ts` — **do not rename tokens** (globals.css warns the CVA/`cn()`/pages depend on the names).
- All `lib/*` (session/bff/auth-guards/knowledge/*), API routes, guards, content copy — functional, untouched.
- Marketing/legacy primitives (`button.tsx`, `section.tsx`, `grid.tsx`) — ride the token repoint; explicit `.kb-*` rewrite only for the app-used console components above.
- **No new data components** (stat-tiles/TrendChart-with-data, status-in-tables) — S3/S4 build them on the console.css classes this slice makes available.

## Files
- **Edit:** `web/src/app/globals.css`, `layout.tsx`; `web/src/lib/fonts.ts`; `web/src/components/ui/{app-button,data-table,badge,field,card,reveal,endpoint-card}.tsx`; `web/src/components/app-shell/{app-shell,rail-nav,logout-button}.tsx`; `web/src/app/(auth)/{layout,auth-card,credentials-form}.tsx`; `web/src/app/(app)/{layout,dashboard/page}.tsx`; `web/src/content/site.ts`.
- **Add:** `web/src/app/kb-tokens.css`, `kb-console.css`.
- **Remove:** `web/public/fonts/InterVariable.woff2` + its `fonts.ts` declaration.
- **Already staged (do not re-create):** `web/design/canvas/*`, `web/public/{logo,favicon}.svg`, `web/public/fonts/{Fraunces,SourceSans3}.woff2`.

## Verification
- In `web/`: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test` — **all green** (styling-only; the S2 vitest suites must still pass unchanged).
- **Grep:** zero hi2vi green (`#2ff28f`/`#00b66a`/`#061512`, `forest`) in `web/src`; no iconify CDN ref; `--kb-*` present for both schemes; no `Inter`/`InterVariable` refs.
- **Visual (`pnpm dev` :3030):** `/login` = **dark** gate (slate, teal accent, Fraunces "Sign in"); `/dashboard` = **light** console (paper topbar, teal-active rail, Fraunces title); fonts self-hosted (no network font/icon requests). Live-auth E2E stays deferred to **P12.REVIEW** (per S2) — the skin needs no backend.

## Phase-notebook update (you write this)
Append a `phase.md` cross-slice note: **final design = the Knowledge Base design system; the S1 "adopt hi2vi green" note is superseded** (hi2vi = structure/vibe only). Record: the `.kb-*` `console.css` classes + `--kb-*` tokens (both schemes) now available for S3–S6; the per-route scheme wiring (auth=slate, app=default via `.kb-app`); iconify→lucide; font swap (Fraunces+Source Sans in, Inter out, Pretendard=Korean fallback); the `web/design/canvas/` KB mirror. **Doc impact:** `frontend.md` (KB design system replaces hi2vi green; dark-login/light-console; `.kb-*` console layer), `decisions.md` (D-P12-3 **final**: KB design system, hi2vi structure only), `experience.md` (dark threshold → light workspace).

## Boundary (not in S2R)
No new data pages, no `lib/knowledge/app.ts`, no backend routes (S3–S6). No commits, no doc-versions, no status transitions. If integration proves deeper than the apply-map implies (e.g. the scheme swap fights Tailwind v4 in a way the brief didn't anticipate), **return `escalate`** with findings rather than improvising a functional change.
