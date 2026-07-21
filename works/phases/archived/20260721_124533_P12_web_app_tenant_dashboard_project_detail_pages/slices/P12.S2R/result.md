# P12.S2R — Result (Re-skin the app to the Knowledge Base design system)

**Status: done.** The app (S1/S2 surfaces) is re-skinned from the placeholder
hi2vi_web bright-green to the **Knowledge Base "calm editorial library"** design
system — tokens + component styling + fonts only, **no functional change**. All
verification green.

## What I did

### Foundation — tokens, schemes, fonts
- **`src/app/kb-tokens.css` (new)** — consolidated the four staged token files
  (`web/design/canvas/tokens/{colors,type,shape,app}.css`) into one `--kb-*` block
  set. Dropped the mkdocs-only `--md-*` mappings + `--md-hue`. **Rebound the font
  families** (`--kb-font-display/body/mono`) to the self-hosted `next/font` vars so
  the `.kb-*` classes render Fraunces / Source Sans 3 / JetBrains Mono, each ending
  in a Pretendard Hangul fallback. Both schemes present: `[data-md-color-scheme=
  "default"]` (light) + `["slate"]` (dark) + scheme-independent structure on `:root`.
- **`src/app/kb-console.css` (new)** — copied `components/console/console.css`
  (the skin's source of truth) verbatim, with one adaptation: the two icon
  selectors target `svg` (icons render via `lucide-react`, not the specimens' icon
  custom element). Added `:disabled` rules for `.kb-appbtn`/`.kb-field__input`.
- **`src/app/globals.css`** — `@import`ed the two new stylesheets; **repointed every
  `@theme --color-*` at the `--kb-*` source tokens** (the whole `--color-green*`
  ramp → the single teal accent; security/history/danger/caution → status tones;
  surfaces/ink/hairlines → `--kb-*`). Repointed the shadcn `:root` layer's `--radius`
  → `--kb-radius`; the rest follow the `--color-*` repoint. Added `@theme
  --font-display` (Fraunces) and repointed `--font-sans`/`--font-mono`/`--font-en`
  to the KB stacks. The `@layer base :focus-visible` ring is now teal automatically.
  Kept the 14 `--text-*` scale + radius/spacing/container/breakpoint scales (the
  `cn()` registration depends on the names).
- **`src/lib/fonts.ts`** — replaced `inter` with `fraunces` (`--font-fraunces`,
  `400 700`) + `source` (`--font-source`, `200 900`); kept `pretendard` + `jetbrains`.
- **`src/app/layout.tsx`** — `data-md-color-scheme="default"` on `<html>`; applied
  the new `.variable` classes (dropped `inter.variable`).
- **`web/public/fonts/InterVariable.woff2` deleted**; README updated (Fraunces +
  Source Sans 3 + JetBrains + Pretendard, no Inter).

### Scheme wiring (decision ③ — dark login, light app)
- `(app)` → `AppShell`'s root `.kb-app` carries `data-md-color-scheme="default"`.
- `(auth)/layout.tsx` → the stage carries `data-md-color-scheme="slate"` +
  `min-h-dvh` grid-centered + `background: var(--kb-paper)`; removed the hi2vi
  glow/grid decor for the calm dark threshold.

### Components → `.kb-*` (behavior unchanged)
- `ui/app-button.tsx` → `.kb-appbtn--{primary,secondary,ghost,danger}` (+`--sm`);
  `Tag` → `.kb-chip`.
- `ui/data-table.tsx` → `.kb-dtable` (mono headers, hairline rows, teal hover,
  `.num`/`.mono`/`.right`, `.kb-dtable__empty`). Same `columns/rows/rowKey/empty` API.
- `ui/badge.tsx` → the status vocabulary `.kb-status--{active,idle,revoked}` (bare
  dot + `--chip` form; form-encoded for greyscale; dot `aria-hidden`). Dropped the
  hardcoded `#586422`.
- `ui/field.tsx` → `.kb-field__label/__input/__error/__hint`, `.kb-check` (teal
  accent checkbox).
- `ui/card.tsx` → `panel`/`tile` → `.kb-panel`/`.kb-tile`; legacy marketing variants
  rebuilt on `--kb-*` tokens (removed `bg-forest`, `#E5E1B8`, hi2vi shadow rgba).
- `ui/endpoint-card.tsx` → `--kb-surface-sunken` + hairline + mono; label → `.kb-chip`
  (dropped the forest-green plate).
- `app-shell/app-shell.tsx` → `.kb-app` + `.kb-topbar` (logo.svg + serif "knowledge"
  wordmark · divider · workspace crumb · spacer · user email · ghost Sign out) over
  `.kb-app-layout` [rail | main].
- `app-shell/rail-nav.tsx` → `.kb-rail__head` eyebrow + `.kb-rail__list`; active =
  `.kb-rail__link.is-active[aria-current="page"]`; Soon = `.kb-rail__soon` + pill.
- `app-shell/logout-button.tsx` → `.kb-appbtn--ghost --sm`.
- `(auth)/auth-card.tsx` → the dark gate card per the `app-login` specimen (warm dark
  gradient + inset top-light + brand row + mono "Secure" pill + serif lead/sub +
  trust chips), replacing all hi2vi rgba.
- `(auth)/credentials-form.tsx` → `.kb-field` inputs + full-width `.kb-appbtn--primary`
  + `.kb-field__error` (`role="alert"`). **BFF fetch / status-only / no-enumeration
  logic unchanged.**
- `(app)/dashboard/page.tsx` → minimal light-console render (`.kb-app-eyebrow`/title/
  sub + a `.kb-panel` with the signed-in identity). S3 builds the real dashboard.
- `content/site.ts` `BRAND` → `{ wordmark: "knowledge", logo: "/logo.svg" }`.

### Left as-is (per plan)
- The 14 `--text-*` scale + `cn()` registration in `utils.ts` — not renamed.
- All `lib/*`, API routes, guards, content copy — untouched.
- `ui/reveal.tsx` — the scroll-reveal wrapper has **no color refs**; nothing to
  re-skin. The `.kb-reveal*` show-once classes are now available (kb-console.css)
  for S4's credential-mint modal.
- `ui/button.tsx` (marketing pill) — colors ride the repoint (green → teal); see
  the one deviation below.
- `ui/grid.tsx` — layout-only, no colors.

## Verification (all green)

Run from `web/`:

| command | result |
|---|---|
| `pnpm install` | OK (no dep changes; `lucide-react` already present) |
| `pnpm typecheck` | **pass** (exit 0) |
| `pnpm lint` | **pass** (exit 0, no warnings) |
| `pnpm test` | **pass** — 4 files, 36 tests (the S2 vitest suites, unchanged) |
| `pnpm build` | **pass** (exit 0; routes `/`,`/login`,`/signup`,`/dashboard` dynamic) |

**Greps (`web/src`), all 0:** hi2vi green hex (`#2ff28f`/`#00b66a`/`#061512`) +
`forest`; the decimal-rgba forms of those greens; `iconify`; `InterVariable` /
`--font-inter`. `--kb-*` tokens present for both schemes (default + slate).

**Built CSS (`.next/static`):** 0 hi2vi green; teal accents present (`#0f6f66`
light, `#62bdb2` dark); both `data-md-color-scheme` blocks; all `.kb-*` console
classes compiled in.

**`pnpm dev` runtime check (`/login`, unguarded):** served HTML has
`data-md-color-scheme="default"` on `<html>` and `="slate"` on the auth stage
(dark gate); the "Secure" pill / serif "Sign in" / `.kb-field__input` /
`.kb-appbtn--primary` render; the four self-hosted fonts load from
`/_next/static/media/*.woff2` (Fraunces, SourceSans3, JetBrainsMono,
PretendardVariable — no Inter); **zero external font/icon requests** (no
googleapis / gstatic / iconify). `/dashboard` renders under `.kb-app` (light
`default` scheme) but requires a live session — **live-auth E2E stays deferred to
P12.REVIEW** (no backend needed to verify the skin, per S2).

## Deviations from `plan.md`

1. **`ui/button.tsx` shadow retuned (plan said "UNCHANGED, auto-recolors via the
   repoint").** The plan's assumption held for the button's *colors* (`bg-green`/
   `bg-green-deep` → teal via the repoint) but **not** for its primary/hover
   **box-shadow**, which hardcoded `rgba(0,182,106,…)` (hi2vi green-deep, compiled
   to `#00b66a80`/`#00b66a9e`) — a hardcoded rgba no token repoint can reach, so a
   hi2vi-green glow persisted in the built CSS. I replaced the two green glows with
   the KB single soft-shadow token `var(--kb-shadow-hover)` (honors the "one soft
   shadow" invariant + the no-hardcoded-hex rule) and updated the comment. This is
   a **non-functional re-skin of an app-unused, P14-reserved component**, fully
   within the slice's "tokens + component styling only" intent; it eliminates the
   last hi2vi green from source *and* compiled output.
2. **`ui/section.tsx` `forest` tone removed (not in the plan's Edit list).** The
   verification requires zero `forest` in `web/src`, but `section.tsx` carried a
   `forest: "bg-forest text-on-dark"` tone variant. Removed just that one line
   (the component is unused by the app; its other tones ride the repoint). Minimal,
   non-functional.
3. **`(app)/layout.tsx` not edited** (it was in the plan's Edit-file list). Per the
   plan's own approach, the app scheme is carried on `.kb-app` in `app-shell.tsx`,
   so `(app)/layout.tsx` needed no change — leaving it avoids needless churn.
4. **`web/public/fonts/README.md` updated** (not explicitly listed). It documented
   the deleted Inter face; refreshed it to the KB font set for consistency.

No functional/behavioral change anywhere: auth BFF flow, guards, session/cookie,
routes, and content copy are untouched (the 36 lib-level vitest tests pass
unchanged).
