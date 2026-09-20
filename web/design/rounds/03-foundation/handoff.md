<!-- design-cowork handoff — OUT. Claude Design returns the card set + a record of what was designed + an implementation contract. -->
# Design handoff — Round 03: the Knowledge design system, re-established + made responsive

**Phase/slice:** P27.S2 · **Round:** 03-foundation · **Date:** 2026-09-21 · **Author:** Claude Code (orchestrator)

**You (the operator) + Claude Design make every visual decision here.** This document says *what* to design
and *what to return*; it decides no color, type, layout, breakpoint, or copy. Every design question is posed
back to you in §6 — I answer none of them.

---

## 0. Before the session — the project on the new account is ready

The earlier rounds (01-landing, 02-onboarding) live in a Design System project on your **previous** account.
This round re-establishes the system on the **new** account, from the real repo, so that rounds 04–06 can
build on it there. **The project already exists** — created on your instruction on 2026-09-21:

- **Knowledge Base Design System** · project id `623bb4ea-8fb7-4d31-9d58-5c6a42709bbe`
- It holds a **`shipped/` baseline**: 15 cards under `Shipped · Foundations / Components / Console Pages`
  that document the system **as implemented today** — verbatim copies of `kb-tokens.css`, `kb-console.css`
  and `app-frame.css`, the same vendored fonts, and markup mirroring each React primitive. They are data,
  not proposals: the "before" this round designs the "after" for. See `bootstrap.md` beside this file.

Steps:

1. Open the project in Claude Design (claude.ai/design) on the new account.
2. **Connect GitHub** → `leetusik/knowledge`, branch `main`, so the session reads current code (the branch is
   pushed by you — `git push origin main` — or use a local-directory connection to this checkout, which needs
   no push).
3. Give the session this file as its brief: `web/design/rounds/03-foundation/handoff.md`.
4. When the cards are in the pane and the outputs in §5 are returned, come back here and say **"done"**.
   Your "done" is what signs this round — unless you ask for a runnable mockup first, in which case say so
   and the round waits on that instead.

---

## 1. Product context — what this is, who it's for

**`knowledge`** (live at `knowledge.hi2vi.com`) is a knowledge base for developers and their coding agents: a
coding agent writes explainer documents into it; the developer reads, searches and shares them from an
authenticated web console, and anyone with a public link reads a shared document or an org's public graph
without signing in.

The **console** this round designs the foundation for: a paper topbar (brand · org crumb · email · sign out)
over a teal-active rail (**Dashboard · Documents · Graph**), and pages built from stat tiles, a 30-day trend,
data tables, panels, forms, badges and a search bar. The anonymous **public shell** is the same topbar with no
rail and one "Sign in". The auth pages are a dark "quiet threshold" before the light console.

**What is wrong today, in one line:** the console was designed at one width — `1280x940` — and has **no
responsive behaviour at all**. The rail is a fixed 15rem grid column, the topbar never wraps, the dashboard is
a hard two-column grid, tables only scroll sideways, graph overlays sit at fixed absolute sizes, and there is
no phone navigation of any kind. The one width media query in the whole app is a `min-[720px]:` on the
documents page. Error and loading pages do not exist; six `not-found.tsx` files are undesigned.

**What this round is for:** re-establish the system in the new account **and** give it the responsive
foundation everything after it needs — breakpoints, a phone navigation pattern, how each console primitive
behaves at phone / tablet / desktop, and the system-wide states. Rounds 04 (console pages), 05 (graph) and 06
(document views + print) will be designed *on* this foundation.

**Grounding (real substance — read these, never invent):** `works/phases/active/P27/intent.md` (the confirmed
operator intent), `works/phases/active/P27/phase.md` (the build inventory and decisions), `docs/current/
experience.md` (*Visual language — "calm editorial library"*, *The authenticated web app (P12)*),
`web/design/canvas/APP_BRIEF.md` (the P12 handback's three resolved decisions and invariants).

---

## 2. Scope — the reviewable units to design (one card each; paths in §5)

**Foundations**
- **Tokens** — the `--kb-*` palette in both schemes (light `default`, dark `slate`) as they exist, plus any
  the responsive foundation needs. Whether the console *uses* the dark scheme is a posed question (§6).
- **Type** — the app scale (`--kb-text-h1` … body … micro, Fraunces display / Source Sans 3 body / JetBrains
  Mono data, Korean fallbacks) and how it behaves across widths.
- **Spacing + shape** — the spacing scale, radii, the one shadow, the console sizes (`--kb-app-rail-w`,
  `--kb-app-topbar-h`, `--kb-app-read-w`).
- **Breakpoints + layout grid** — the named breakpoints for phone / tablet / desktop, the `[rail | main]`
  shell grid at each, reading width and gutters at each.

**Components (the console kit — each shown at the three widths where its behaviour differs)**
- **Page frame** — eyebrow · Fraunces title · sub, and the **action row** beside it (copy-link, buttons) that
  today collides with the title on narrow screens.
- **Topbar** — member (brand · org crumb · full email · sign out) and anonymous (brand · sign in) at three
  widths; what stays, what collapses.
- **Navigation** — the rail on desktop (with the operator's existing fold), and the **phone pattern** (posed
  question) and tablet behaviour.
- **Buttons** — `AppButton` variants `primary / secondary / ghost / danger`, sizes `md / sm`, and their states
  (hover, focus, disabled, busy).
- **Fields + forms** — label, input, textarea, checkbox, error message; a form at phone width (create project,
  org slug, mint key, login).
- **Tables** — `.kb-dtable` at three widths (posed question: scroll, stack, or column priority).
- **Panels + stat tiles** — `.kb-panel`, the stat tile with its Fraunces numeral and delta, the `auto-fit` tile
  grid at three widths, the 30-day trend chart's box.
- **Status** — badges `active / idle / revoked` (form-encoded, per APP_BRIEF ②), chips, tags.
- **Search** — the documents search bar with its project filter at three widths.

**States (system-wide)**
- **Empty · loading · error · not-found · toast** — the empty state, the skeleton, an **error page** and a
  **not-found page** designed within the system (neither exists as a design today), the toast.
- **Focus + motion** — the keyboard focus ring, the reduced-motion floor, the one-shot reveal.

Add cards beyond this list if the design needs them (numbered after the list — §5). Never a monolithic
"design system" page.

---

## 3. Locked vs. in-play

**In play** (design freely): every token *value*; the type scale and whether it is fluid; spacing and density
per width; the breakpoints themselves and what happens at each; the phone navigation pattern; the topbar's
narrow-width composition; the tables' small-screen strategy; the states' look; motion; whether the console
adopts the dark scheme; layout and expression throughout.

**Locked** (do not change): the **"calm editorial library"** brand spirit; **teal as the only interactive
accent** (`#0f6f66` light / `#62bdb2` dark); the three faces **Fraunces** (display) / **Source Sans 3** (body)
/ **JetBrains Mono** (data), each with a Korean fallback; **warm paper, never pure white/black**; **no emoji**;
the a11y / reduced-motion floor (settled state is the CSS default; loops only under `prefers-reduced-motion:
no-preference`; keyboard focus ring); the existing `--kb-*` / `--text-*` / `--color-*` token **names** (add,
never rename); the two-scheme hook `data-md-color-scheme="default" | "slate"`; all **copy** (every string
lives in `web/src/content/*` — content is data here, not in play); the **data contracts** (what a table's
columns are, what a tile shows); the status semantics (active teal · idle amber-bronze · revoked terracotta,
encoded in form); and the **landing page** (rounds 01/02 — untouched by this round).

---

## 4. Where to look (real paths + shapes — data, not proposals)

- **Tokens, both schemes:** `web/src/app/kb-tokens.css` (the `--kb-*` source: type scale, radii, spacing,
  `--kb-ease`, the console sizes at `:88-94`, light `default` at `:104-145`, dark `slate` at `:150-191`);
  `web/src/app/globals.css` (the Tailwind v4 `@theme` bridge `:23-215`, the shadcn semantic map `:223-274`,
  the `@layer base` floor `:284-343`; note `--breakpoint-xs: 30rem` is declared at `:182` and never used).
- **The console layer:** `web/src/app/kb-console.css` — every `.kb-*` class the kit is built from (topbar
  `:30`, app layout grid `:41`, main padding `:42`, tile grid `:82`, dtable `:100-102`, status, field,
  appsearch, reveal, toast, skel, empty). It is **unlayered** and beats Tailwind utilities — a fact for the
  implementation contract.
- **The shell:** `web/src/components/app-shell/app-shell.tsx`, `app-frame.tsx` (the `kb_rail` cookie fold —
  `PanelLeftClose/Open` toggle, `data-rail`), `app-frame.css`, `rail-nav.tsx`; the anonymous shell
  `web/src/components/public-shell.tsx` (composed 1:1 from the same pieces — one topbar decision lands on
  both).
- **Primitives:** `web/src/components/ui/` — `app-button.tsx` (variants/sizes), `badge.tsx`,
  `card.tsx` (`panel` / `tile`), `data-table.tsx` (headless typed table over `.kb-dtable`), `field.tsx`;
  `web/src/components/usage/stat-tiles.tsx`, `trend-chart.tsx` (server-rendered SVG, `viewBox 600×160`,
  `preserveAspectRatio="none"`).
- **Real data shapes the kit carries:** dashboard projects table columns `name · documents · keys ·
  visibility · created · last used · action`; org keys table; documents table `title · project · date · tags ·
  actions`; credentials table `key · status · created · last used`; stat tiles `documents / searches /
  projects / keys` with 30-day deltas. Copy source of truth: `web/src/content/app.ts`, `dashboard.ts`,
  `documents.ts`, `project.ts`, `auth.ts`.
- **The P12 handback this system descends from:** `web/design/canvas/APP_BRIEF.md`, `tokens/{colors,type,
  shape,app}.css`, `components/console/console.css`, `pages/app-dashboard.card.html`, `app-login.card.html`
  (both at `viewport="1280x940"` — the desktop-only specimens this round outgrows), `assets/logo.svg`,
  `favicon.svg`.
- **Earlier rounds, for continuity only (not to restyle):** `web/design/rounds/01-landing/`,
  `02-onboarding/` — their `output/build-prompt.md` is what the shipped landing was built from.
- **The live console, for what it looks like now:** `https://knowledge.hi2vi.com` (sign in) — desktop only;
  open it on your phone to see the unhandled state this round replaces.

---

## 5. Required outputs (a round is incomplete without all three)

Return these into the design project (I read them back with DesignSync; I copy nothing down by hand):

1. **The card set** — the design made visible in the Design System pane. **Line 1 of every card's preview
   HTML is the marker, exactly this shape** (a `group`, plus an optional `viewport`; nothing else):
   ```html
   <!-- @dsCard group="⏳ P27.S2 · Foundations" viewport="1440x900" -->
   ```
   Use the round's address in the group while the round is under review — `⏳ P27.S2 · Foundations`,
   `⏳ P27.S2 · Components`, `⏳ P27.S2 · States` — so the cards land together in reading order; at signoff I
   retire the address with a pure regroup (`Foundations`, `Components`, `States`). A card that shows a unit at
   three widths may compose them on one page (its own `viewport` wide enough) or split into per-width cards
   numbered **after** the list below. **Produce exactly these paths, numbered in reading order:**

   ```
   01-tokens.html
   02-type.html
   03-spacing-shape.html
   04-breakpoints-layout.html
   05-page-frame.html
   06-topbar.html
   07-navigation.html
   08-buttons.html
   09-fields-forms.html
   10-tables.html
   11-panels-tiles.html
   12-status.html
   13-search.html
   14-states.html
   15-focus-motion.html
   ```
   Cards the session adds take `16-…`, `17-…`, and so on. A card that supersedes one of these keeps its path,
   number included. **Definition of done = the cards appear in the pane**, not "the files exist".
2. **A `tokens.css`** the cards link — authored by Claude Design, carrying this round's real values in both
   schemes, including any breakpoint / layout tokens the foundation introduces. The palette *is* the design; I
   do not author it.
3. **A record of what was designed** — every departure from this handoff logged — **and an implementation
   contract** complete enough to build from without inventing anything: the breakpoints and what changes at
   each, the phone navigation pattern in full (open/closed states, where the toggle lives, focus order), the
   tables' small-screen rule, every component's per-width behaviour, the states' composition. The apply phase
   (P28) is dispatched to an implementer with **no DesignSync**, so this contract is the whole source of truth it
   gets. If the session produces Claude Design's own handoff bundle, that *is* the record and the contract —
   otherwise land them as `result.md` and `build-prompt.md`.

---

## 6. Open questions — posed back to you (I decide none of these)

Resolve these *in the design*, or tell me at your return:

1. **Phone navigation.** A drawer from the topbar, a bottom tab bar (Dashboard · Documents · Graph), or a menu
   under the topbar? And on tablet — the rail collapsed to icons, hidden behind the toggle, or kept?
2. **The rail fold.** Keep the operator's manual fold (the `kb_rail` cookie, desktop) alongside a
   breakpoint-driven collapse, or replace it?
3. **Topbar on phones.** What stays — brand only? the org crumb? the email as an initial/avatar? — and where
   does Sign out go?
4. **Dark scheme.** The `slate` scheme exists in the tokens and the auth gate uses it; does the console adopt it
   (system preference, a toggle) or stay light-only?
5. **Tables on phones.** Horizontal scroll (today), stacked card rows, or column priority (hide/collapse
   columns)? The projects, documents and credentials tables are the real cases.
6. **Type.** Fluid type across breakpoints, or fixed sizes per breakpoint? Does the Fraunces stat numeral scale
   down on phones?
7. **Density.** The desktop keeps hi2vi's dashboard density (APP_BRIEF); what changes on phone — spacing,
   tile size, table row height?
8. **Error and loading.** Neither exists as a design. What does an error page and a loading skeleton look like
   inside this system?

---

## 7. Attachments · Definition of done

- **Attach (optional):** screenshots from your phone of `knowledge.hi2vi.com` pages today (dashboard, a
  document, the graph) — as **REFERENCE — data, not a proposal**, showing the unhandled state. Nothing to
  attach is fine; I will not invent imagery.
- **Done when:** the 15 cards (plus any added) are visible in the pane under the `⏳ P27.S2 · …` groups, a
  linked `tokens.css` carries the round's values, and the record + implementation contract are returned. Then
  come back, say **"done"**, and give me the **project id**.

---

*This handoff is the OUT half of the round. The returned card set, record and contract are the IN half —
read-only data I land as-is, never edit.*
