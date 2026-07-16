# Prompt — Knowledge Base design-system agent (extend the system to the authenticated web app)

> Hand this to the **Knowledge Base design system** Claude design project. It already owns the *public reading* surfaces (landing, article, graph) — the calm editorial library: warm ivory & slate paper, one deep-teal accent, Fraunces / Source Sans / JetBrains Mono, hairline borders, the single soft shadow. This asks it to **extend** that identity to the product's **authenticated console** — the tenant's back-office — without breaking the reading-room identity.

---

## The ask, in one line

Extend the Knowledge Base design system to cover an **authenticated web app** (the signed-in tenant's dashboard + project pages) — an *editorial dashboard*: the reading-room's calm identity carrying real dashboard information-density. Think **"a reading room's back office, not a SaaS dashboard."**

## What the app is

A personal / multi-tenant knowledge base. The public side is the mkdocs reading site you already dress. The **new** surface is a Next.js console where a signed-in owner operates their library: sees usage, manages projects, mints API keys, browses their own documents, and views their knowledge graph. It consumes the tenancy + usage APIs; it is calm, dense, and operated (scanned, not read top-to-bottom).

**Vibe reference:** hi2vi_web's operator console — its *structure* and information-density (a paper topbar, a table-of-contents rail, stat tiles, data tables, status encoding). Keep **our** editorial identity (Fraunces, teal, hairlines, ivory/slate); borrow **hi2vi's** dashboard energy. The synthesis is the whole point: editorial calm + console density.

## Surfaces to design (real screens, real content — no lorem)

1. **Sign in / Sign up** — the entry. A composed, considered threshold (see open call #3 on warm vs. dark).
2. **Dashboard** — the post-login home: a usage overview (stat tiles + a 30-day trend) and the tenant's projects list, plus a recent-activity list.
3. **Project detail** — a single project: its info, its **API credentials** (mint → *show the `vk_…` key exactly once* → list with status → revoke), and per-project usage (each key's last-used).
4. **Documents browse + search** — the per-tenant knowledge viewer: a document list per project, a document read view, and search — all scoped to the signed-in tenant.
5. **Knowledge graph** — you have already designed this (the "library map" — project inks teal/bronze/plum, quiet labels, mingle motion). Confirm it works as an **in-app, per-tenant** view (dark plate inside the light console, or its own treatment); no re-mock needed unless it needs an in-console frame.

## Component vocabulary to add (console-grade, beyond the reading-room set)

- **App shell** — a sticky topbar that *wears the paper* (sunken band, ink text, hairline border-bottom, no colored bar) + a left **rail nav** (TOC-style: active = teal left-rail + soft-teal wash, hover, and a muted **"Soon"** pill for not-yet-shipped routes) + the main content column.
- **Stat tiles** — usage metrics (documents, searches, deleted, total), each a quiet bordered card with an eyebrow label, a big number, and a small delta. *(See open call #1 — serif vs. mono numerals.)*
- **Data tables** — projects / credentials / documents: mono uppercase headers, hairline rows, subtle teal hover, `tabular-nums`, and an **empty state**.
- **Status encoding** — pills / dots for credential state: **active**, **revoked**, **idle** — state legible in *form*, not just words. *(See open call #2 — status colors.)*
- **Form fields** — auth (email / password) and create-project: label, input, focus ring, inline error (`role="alert"`).
- **App buttons** — flat console buttons: **primary / secondary / ghost / danger** (distinct from any marketing pill button — that stays reserved for the public landing). Teal reserved for primary / active / focus only.
- **Search field** — the console search (header + documents).
- **Trend chart / sparkline** — usage over time: an area fill, a faint grid, an emphasized endpoint. Calm and teal.
- **Show-once secret reveal** — the `vk_…` key modal shown once at mint (copy, then it's gone).
- **Small states** — toast, inline validation, empty & loading states, the "New project" affordance.

## Identity & constraints (do not break these)

- **Both light (ivory) and dark (slate) schemes**, token-driven — the app ships both; a scheme is a token swap, not a repaint. Give the dark scheme equal care.
- **Editorial identity intact:** Fraunces (display), Source Sans 3 (body), JetBrains Mono (data/eyebrows/tokens); **teal accent reserved for interactive / active / focus**; hairline borders; the single soft shadow; generous, calm density. Keep the existing KB token *names*.
- **Bilingual EN / KR.** Korean via system fallback (Nanum Myeongjo / Apple SD Gothic Neo) — no Korean webfont. Titles, project names, and document titles can be Korean or mixed.
- **It's a UI, so information design leads.** Summary before detail; state encoded in form; semantic status color (if any) is separate from the teal accent.

## Three decisions to make explicit (call them out in the deliverable)

1. **Stat-tile numerals — serif or mono?** Fraunces figures read as the editorial signature (calm, "this product"); JetBrains Mono figures read more instrument-like. Pick one and show it.
2. **Status colors — teal-only, or restrained semantics?** The system is teal-only for UI. Dashboards need state. Either stay strictly **teal + neutral** (active = teal dot, revoked = struck neutral) or introduce **two restrained semantic tones** beyond teal — warm amber (idle / caution) and muted terracotta (danger / revoked) — used only as small chips/dots. Choose and justify.
3. **Login — warm or dark threshold?** Either a **warm ivory "front desk"** (the library entry, on-brand with the light identity) or commit the login to the **dark slate scheme** as a "quiet threshold," after which the app opens light (echoing hi2vi's dark-gate → light-console rhythm in our palette). Choose one.

## The returnable — a design brief (this is the co-work handback)

Conclude the co-work with a **brief** back to the engineering side — the artifact I apply. The app is **Next.js 16 + Tailwind v4 (CSS-first `@theme`) + CVA primitives**, self-hosted fonts. To apply your design with zero guesswork, the brief should carry:

- **Tokens as CSS custom properties, both schemes** — colors, type scale, shape/spacing, motion — reusing the existing KB token names (they already fit `@theme`). One block per scheme (light `:root`, dark under the scheme selector).
- **The three font families as self-hostable woff2** (Fraunces, Source Sans 3, JetBrains Mono) — variable if possible; Korean stays system-fallback.
- **Canvas specimens (HTML) the way the KB system already ships** — foundations + each new component above + the key pages (login, dashboard, project detail, documents), rendered in **both** themes, mapping cleanly to CVA components. Real content throughout.
- A short note on the **three decisions** (above), so I can wire them without another round-trip.

## Grounding data (use these real shapes, not placeholders)

- **Dashboard usage:** totals `{ documents_created, documents_deleted, searches, total }`; a 30-day daily trend (zero-filled); the projects list.
- **Project:** `name`, document count, key count, `created_at`, `last_used_at`.
- **Credential:** `vk_…` prefix, label (e.g. `production`, `ci-pipeline`), status (`active` / `revoked` / `idle`), `created_at`, `last_used_at`. Plaintext key shown **once** at mint.
- **Document:** title, project, `updated_at`; plus search.
- **Identity:** user email, workspace/tenant name, member-since. Example projects: `changple` (창플), `hi2vi_web`, `docs`.

## Fixed component inventory (the skin targets these)

The app's structure is already built (in a placeholder skin); your design is the **skin** applied to a fixed component set — so target these directly:

- `components/app-shell/*` (topbar + rail nav + logout), the `(auth)` login/signup card + form, `components/ui/*` (buttons, card, badge, field, data-table, status pill), the usage `stat-tiles` + `trend-chart`, and the documents/graph views.
- No functional rework will follow from the design — it's tokens + component styling only.

---

*Optional:* one interpretation of this direction (KB editorial + hi2vi structure, both themes, with the three open calls surfaced) exists as a viewable mockup the operator can share if useful — treat it as a reference point, not a spec.
