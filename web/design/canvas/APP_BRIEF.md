# APP_BRIEF — extending Knowledge Base to the authenticated console (P12)

The design handback for the **signed-in web app** (Next.js 16 · Tailwind v4 CSS-first
`@theme` · CVA primitives · self-hosted fonts). It re-skins the app's placeholder
hi2vi_web green into the Knowledge Base **"calm editorial library"** identity while
keeping hi2vi's dashboard *structure and density*. Nothing functional changes — this
is **tokens + component styling only**.

The visual source of truth is this design system: `tokens/*.css` (both schemes) and
`components/console/console.css` (portable `.kb-*` classes), rendered as canvas
specimens under the **Console** and **Console Pages** groups. This file is the
apply-map onto the fixed component set.

---

## The three decisions (resolved)

**① Stat-tile numerals → Fraunces (serif), `tabular-nums`.** The headline figure is
the one place to assert identity, so it wears the editorial serif — the dashboard
reads as *this product*, not stock SaaS. JetBrains Mono carries the instrument
texture: deltas, units, table figures, timestamps, `vk_…` tokens. (Fraunces variable
supports `font-feature-settings:"tnum"` for column alignment.) See
`components/console/foundations.card.html`, `usage.card.html`.

**② Status colors → teal + two restrained semantic tones, encoded in FORM.** Teal
stays the only *interactive* accent (primary, active, focus, links, hover, trend).
State needs more than one hue, so — following the graph's documented precedent (a
muted categorical set scoped to data-viz only, README → P6 Graph) — the console adds
**amber-bronze (idle)** and **terracotta (revoked)** as *dots/chips only*, never
surfaces/buttons/links/focus. State is also encoded in **form** (active = filled dot ·
idle = hollow ring · revoked = struck dot + line-through) so it survives greyscale
(WCAG 1.4.1). See `status.card.html`.

**③ Login → dark "quiet threshold".** The login/signup commit to the **dark slate
scheme** (a secure gate), then the app opens **light** — hi2vi's dark-gate→light-
console rhythm, in our palette, and a hero moment for the dark scheme. See
`pages/app-login.card.html`.

---

## Tokens — both schemes, CSS custom properties

**Source of truth = `tokens/*.css`.** They are already per-scheme CSS-custom-property
blocks under `[data-md-color-scheme="default"]` (light) and `["slate"]` (dark) —
exactly the "one block per scheme" the app wants, and they drop into `@theme`
unchanged in *name*. The app currently has no scheme toggle (explicit dark surface
tokens); to ship both schemes as a **token swap**, adopt the two scheme blocks (a
`data-*`/`.dark` selector, or `light-dark()`), pointing the app's `@theme` at the
`--kb-*` source tokens.

**New console tokens (additive — `tokens/app.css`), both schemes:**

```css
/* status — dots/chips only; active=teal, idle=amber-bronze, revoked=terracotta */
--kb-status-active / -active-soft / -active-ink
--kb-status-idle   / -idle-soft   / -idle-ink
--kb-status-revoked/ -revoked-soft/ -revoked-ink
/* usage trend (teal) + stat-tile deltas */
--kb-trend-line / -point / -fill-from / -fill-to / -grid
--kb-delta-up (teal) / -down (terracotta) / -flat (hint)
```

**Apply-map — repoint the app's `@theme` values (keep the names) at `--kb-*`:**

| app `@theme` name | → light | → dark | note |
|---|---|---|---|
| `--color-canvas` (page bg) | `#f6f2e8` paper | `#1a1815` | body / `--background` |
| card surface (`--card`, raised) | `#fffefa` | `#232019` | `= --kb-surface` |
| `--color-surface` / band | `#efe9db` | `#2a261e` | table headers, topbar band `= --kb-surface-sunken` |
| `--color-ink` / `--color-charcoal` | `#26211c` | `#ece4d7` | primary text |
| `--color-slate` / `--color-steel` | `#5c5347` | `#b6ad9d` | secondary text |
| `--color-muted` | `#8f8676` | `#7e7566` | hints, captions |
| `--color-hairline` | `#e5dcc8` | `#38332a` | default border |
| `--color-hairline-strong` (input) | `#d8ccb3` | `#453f34` | input border |
| `--color-green` → **primary/CTA/active** | `#0f6f66` | `#62bdb2` | `= --kb-accent` (teal) |
| `--color-green-deep` → hover/focus ring | `#0a544e` | `#86d4ca` | `= --kb-accent-strong` |
| `--color-green-soft`/accent wash | `rgba(15,111,102,.15)` | `rgba(98,189,178,.20)` | `= --kb-accent-soft` |
| `--color-danger` / destructive | `#a8503f` | `#d68a76` | `= --kb-status-revoked` |
| `--color-caution` | `#8a6a2a` | `#c8a15e` | `= --kb-status-idle` |
| `--radius` (base) | `0.55rem` | — | `= --kb-radius` (`-sm 0.35rem`, pill `2rem`) |

> **The whole `--color-green*` ramp collapses to the single teal accent** — the
> bright signal-green is gone. Keep `green` as the token *name* if you like (it now
> means teal), or alias `--color-green: var(--kb-accent)`.

---

## Fonts — self-hostable woff2

Three families, self-hosted via `next/font/local` (replaces Inter; keep Pretendard):

- **Fraunces** — display / all headings + **stat numerals** (`opsz`, `wght`).
  Variable woff2: Fontsource `@fontsource-variable/fraunces`, or google-webfonts-helper.
- **Source Sans 3** — body/UI (`wght`). `@fontsource-variable/source-sans-3`.
- **JetBrains Mono** — data/eyebrows/tokens (`wght`). `@fontsource-variable/jetbrains-mono`.

```css
@font-face{font-family:"Fraunces";src:url(/fonts/Fraunces.woff2) format("woff2");
  font-weight:400 700;font-display:swap;font-optical-sizing:auto}
/* + Source Sans 3, JetBrains Mono the same way */
```

```ts
// src/lib/fonts.ts — variable stacks, each ending in a Hangul fallback
--font-sans:  "Source Sans 3", var(--font-pretendard), "Apple SD Gothic Neo","Noto Sans KR", system-ui, sans-serif;
--font-display:"Fraunces", "Nanum Myeongjo", var(--font-pretendard), Georgia, serif;
--font-mono:  "JetBrains Mono", var(--font-pretendard), ui-monospace, "SF Mono", Menlo, monospace;
```

**Korean:** per the reading-room budget, Korean is **not** a Latin webfont — but the
app already self-hosts **Pretendard**, so keep it as the Korean fallback in every
stack (zero new budget; guarantees identical Hangul rendering for the app's unbounded
operator/agent Korean). Display Korean falls back to serif *Nanum Myeongjo* to stay
in character; if you need it guaranteed everywhere, add it as a webfont (flagged — it
exceeds the stated 2-text budget).

---

## Component apply-map (the skin targets these)

| fixed component | KB class / spec (in `components/console/console.css`) |
|---|---|
| `app-shell/app-shell.tsx` `<header>` | `.kb-topbar` — sunken paper band, ink wordmark + logo mark, hairline-bottom, **no colored bar** |
| `app-shell/rail-nav.tsx` | `.kb-rail__link` — active = teal text + 2px teal left-rail + soft wash; `.kb-rail__soon` + `.kb-rail__pill` for "Soon" |
| `ui/app-button.tsx` (primary/secondary/ghost/danger, md/sm) | `.kb-appbtn--*` — flat, `rounded-sm`, no translate/glow; teal primary; danger = terracotta. `Tag` → `.kb-chip` |
| `ui/button.tsx` (marketing pill) | **unchanged** — stays reserved for the public landing (P14) |
| `ui/data-table.tsx` | `.kb-dtable` — mono uppercase headers on a sunken band, hairline rows, teal-soft hover, `tabular-nums` `.num`, `.kb-dtable__empty` |
| `ui/badge.tsx` → status | `.kb-status--active/idle/revoked` (bare dot in tables · `--chip` for emphasis) |
| `ui/field.tsx` (Label/Input/Textarea/Checkbox/FieldError) | `.kb-field*` — hairline-strong border, teal focus ring (`0 0 0 3px accent-soft`), `aria-invalid` → terracotta; `.kb-check` accent teal; console search `.kb-appsearch` |
| `ui/card.tsx` | `.kb-panel` (static section) / `.kb-tile` (stat tile) — surface + hairline + `--kb-radius`, no resting shadow |
| stat tiles + `TrendChart` | `.kb-tile` (Fraunces `.kb-tile__num`, mono `.kb-tile__delta--up/down`) + `.kb-trend__*` (see `console-trend.js` drawing spec) |
| `ui/reveal.tsx` (show-once key) | `.kb-reveal*` — dimmed overlay, amber warning, mono key panel + copy, one soft shadow |
| `ui/endpoint-card.tsx` | dark code panel → `--kb-surface-sunken` + hairline + `--kb-font-mono` (drop the forest-green plate) |
| toast / loading / empty | `.kb-toast--success/error`, `.kb-skel` (reduced-motion aware), `.kb-empty` |

**Specimens:** Console — `foundations · shell · buttons · usage · table · status ·
fields · reveal · states`. Console Pages — `login (dark) · dashboard (light + dark) ·
project detail · documents`. Real content throughout (창플 / hi2vi_web / docs,
`vk_live_…`, EN/KR). Both schemes on every component; the dark scheme is designed, not
recolored.

---

## Invariants carried forward

Teal is the only interactive accent · warm paper, never pure white/black · depth from
tone + hairline, one soft shadow (`--kb-shadow-hover`, plus the reveal/toast float) ·
no emoji · every text stack keeps a Hangul fallback · existing `--kb-*` token names
are stable.
