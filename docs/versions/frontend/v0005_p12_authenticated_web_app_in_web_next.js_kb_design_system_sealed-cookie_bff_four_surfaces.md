---
doc_id: frontend
version: v0005
created_at: 2026-07-17T15:00:38+09:00
source: P12.REVIEW
summary: P12 authenticated web app in web/ (Next.js, KB design system, sealed-cookie BFF, four surfaces)
previous: v0004_p6.s1_renderer_revision_live-model_port_persistent_raf_4_tokens_is-on_lens_retuned_sim_smarter_seeding_sessionstorage_restore_docs_describe_publish-safety_without_the_literal_path_token
---

# Frontend

## Status

The public Track 1 site (GitHub Pages, mkdocs-material `9.7.6`) carries a real
front end as of P5: an operator-designed "calm editorial library" design system
delivered as a single stylesheet + branding assets, a redesigned landing page,
per-project section pages, tuned Material navigation, and Korean/CJK-capable
browser-only search. There is no SPA framework and no custom build step — the
front end is mkdocs-material's theme plus one `extra_css` file, one `@import`,
two SVG assets, and hand-authored markup in `docs/`. **P6 added the repo's first
custom JS** — a single vendored file (`docs/javascripts/graph.js`) that renders the
interactive knowledge map — so `extra_javascript` is now wired (allowlisted to
exactly that one entry) and a build-time `hooks:` module emits the map's `graph.json`.
Still no `overrides/` `custom_dir`, still **no CDN scripts** and no third-party JS —
the renderer is entirely self-contained.

**As of P12 the repo contains a second, separate front end: an authenticated Next.js
app in `web/`** — knowledge's first SPA-framework surface, wholly independent of the
mkdocs site above. It ships the **Knowledge Base design system** as CSS-first Tailwind
v4 `@theme` tokens + a portable `.kb-*` console layer, a **sealed-cookie server-side
BFF**, and four authenticated surfaces (tenant dashboard, project detail, documents
browse/search/read, in-app knowledge graph). See *The authenticated web app (`web/`,
P12)* below.

## Stack

- **Engine:** mkdocs-material `9.7.6` (exact pin; see operations for pin parity).
- **Styling:** one stylesheet, `docs/stylesheets/extra.css` (wired via
  `mkdocs.yml` `extra_css:`), loaded *after* Material's own CSS so its
  `:root`/scheme overrides win. All design lives here — there is no second CSS
  file and no inline `<style>` in templates.
- **Fonts:** three families loaded from a single Google-Fonts `@import` at the
  top of `extra.css` (see Fonts below). `theme.font: false` — Material makes no
  webfont request of its own (no Roboto).
- **Branding:** `docs/assets/logo.svg` + `docs/assets/favicon.svg` (wired via
  `theme.logo`/`theme.favicon`).
- **Search:** Material's bundled lunr search plugin, configured
  `lang: [en, ko]` — zero custom search JS.
- **Custom JS (P6):** one vendored file, `docs/javascripts/graph.js` (the knowledge
  map's force sim + canvas renderer) — wired via `extra_javascript`, no build step, no
  third-party code, no CDN. A build-time `hooks:` module (`scripts/graph_hook.py`) emits
  the `graph.json` it consumes. See "The knowledge map" below.
- **State / data / auth:** none. The published site is fully static; it never
  calls the local FastAPI API (that boundary is in architecture). The knowledge map is
  no exception — it fetches a build-time static `graph.json`, not the API.

## Theme configuration (`mkdocs.yml`)

The theme block is the only Material-side surface P5 touched. Load-bearing keys:

- `theme.logo: assets/logo.svg`, `theme.favicon: assets/favicon.svg`.
- `theme.font: false` — no Material webfont request (the design's exact weights,
  incl. 500/600, come from the `extra.css` `@import` instead).
- **Two palette schemes** (`default` light, `slate` dark), each
  `primary: custom` / `accent: custom` — the actual colors are defined per scheme
  in `extra.css` §1. The `prefers-color-scheme` media + manual toggle is
  preserved from bootstrap.
- `extra_css: [stylesheets/extra.css]`.
- **`features:`** — `content.code.copy`, `search.suggest`, `search.highlight`,
  `toc.follow` (bootstrap) plus P5.S2's four navigation features:
  `navigation.tabs` (top tab row: Home / per-project folders / Tags),
  `navigation.indexes` (section-index click-through to `docs/<project>/index.md`),
  `navigation.top` (back-to-top), `navigation.footer` (prev/next reading links).
  Deliberately **not** added: `toc.integrate` (the design skins the separate
  right-hand TOC in §4/§5) and `navigation.instant` (a zero-JS search approach
  has no instant-nav ↔ search-worker interplay to manage).
- `copyright:` site key (renders in Material's footer; no plugin needed).
- **Never `nav:` / `strict:`** — auto-nav from the `docs/` tree is load-bearing
  (it lets `/explain` add pages with zero config). `exclude_docs` (`/versions/`,
  `/README.md`) is the only exclusion mechanism.
- `plugins:` — `search` (object form, `lang: [en, ko]`) + `tags`.
- **`hooks:` (P6)** — `- scripts/graph_hook.py`: the build-time knowledge-graph data
  emitter (writes `site/graph.json`; runs under both build and serve). See operations.
- **`extra_javascript:` (P6)** — `- javascripts/graph.js`, and **exactly** that one
  entry: this is the repo's first custom JS, and the smoke guard allowlists precisely
  this vendored file while still failing on any external `<script src="http…">` (the
  no-CDN invariant is preserved). See qa.
- Pin `9.7.6` is held in `mkdocs.yml`'s image (via `compose.yml`) and the CI pip
  pin together (pin parity — see operations).

## The design system: `extra.css` §1–§9

`extra.css` is organized in strict load order — fonts → tokens → component hooks
→ page treatments — so cascade and specificity read top-to-bottom. It is the
operator's Claude Design deliverable ("Knowledge Base Design System", all 10
targets), integrated over the P5.S1 interim baseline at P5.S5:

- **Fonts `@import` (top of file):** one Google-Fonts request loading **Fraunces**
  (variable serif display), **Source Sans 3** (body, incl. weights 500/600), and
  **JetBrains Mono** (code, incl. 500) at the exact weights the design uses. This
  is the site's only webfont request.
- **§1 Color tokens (Target 1, LOCKED — verbatim):** the operator-locked palette
  1a Teal, both schemes. `--kb-*` are the source of truth, mapped onto Material's
  `--md-*`. Light: paper `#f6f2e8`, surface `#fffefa`, accent `#0f6f66`. Dark
  (`slate`): accent `#62bdb2`, `--md-hue: 34` (warms Material's derived slate
  tiers). Header wears the paper (not a colored bar); footer is a warm dark band.
  Extra tiers over S1: `--kb-surface-sunken`, `--kb-border-strong`,
  `--kb-ink/-secondary/-hint`. **This section is locked — never hand-tune it.**
- **§2 Typography tokens (verbatim `:root`):** `--kb-font-body/-mono`, the
  `--kb-font-display` Fraunces stack, h1–h6 scale, `--kb-leading-*`,
  `--kb-weight-*`, `--kb-tracking-*`, `42rem` measure — all with Hangul fallback
  stacks (`Apple SD Gothic Neo`, `Noto Sans KR`, `Nanum Myeongjo`) for mixed
  EN/KR content. `--md-text-font-family`/`--md-code-font-family` point Material
  at these families.
- **§3 Shape/motion tokens (verbatim `:root`):** `--kb-radius*`, `--kb-space-*`
  spacing rhythm, `--kb-ease` (0.15s), the single `--kb-shadow-hover`.
- **§4–§8 Component hooks** (mkdocs-material class overrides):
  §4 site chrome (`.md-header`/`.md-tabs`/`.md-nav`/`.md-search__form`),
  §5 content typography (`.md-typeset …`; also S1-retained permalink accent +
  `::selection`), §6 cards & grid utility (`.kb-grid`/`.kb-card`), §7 tag pills
  (`.md-tag`), §8 search results (`.md-search-result*`).
- **§9 Page treatments (Targets 8 & 9):** portable `.kb-*` classes scoped under
  `.md-typeset` for the landing (`.kb-hero`, `.kb-sec`, `.kb-recent`) and a
  future custom article layout (`.kb-meta`, `.kb-related`, `.kb-toc`). These do
  **not** auto-apply — they are wired into markup by the page author (P5.S2/S3).

**Token discipline:** consumers never hard-code colors/fonts — they consume the
`--kb-*` / `--md-*` tokens. Teal is the *only* accent (links, hover, focus rings,
active nav/TOC, permalinks, tags, cards, `::selection`, match highlights); neutrals
carry everything else.

## Fonts wiring (`theme.font: false` + single `@import`)

The design uses Source Sans 3 at weights **500/600** and JetBrains Mono at **500**.
Material's `theme.font` Google-Fonts request does not include those weights, so it
would synthesize (faux-bold) them. Instead `theme.font: false` suppresses
Material's request entirely and the single `@import` in `extra.css` loads all three
families at their exact weights; the `--md-*-font-family` tokens (with Hangul
fallbacks) point Material's typography at them. The font budget (2 text + 1 code)
is fully spent — do not add webfonts.

## Landing page (`docs/index.md`) — markup wiring

`docs/index.md` interleaves hand-authored raw HTML (the design's §6/§9 classes)
with a machinery-managed markdown list:

- `frontmatter: title: Home`, `hide: [navigation, toc]`.
- A `.kb-hero` block: eyebrow, bilingual `<h1>`, a grounded lede, and (from
  P5.S3) a `<label class="kb-hero__search" for="__search">` — see below.
- A Recent section head `<div class="kb-sec" id="recent"><h2>Recent · 최근</h2></div>`
  immediately followed by the **byte-intact** `<!-- explain:recent -->` marker
  and its `- <date> · [<title>](<rel_path>) — <project>` bullets.
- A Browse section: a raw-HTML `.kb-grid` of `.kb-card`s (3 projects + Tags),
  each `<a class="kb-card">` with title + grounded description. `.kb-card__meta`
  (explainer counts) is deliberately omitted everywhere — the machinery never
  updates counts, so a rendered count would silently go stale.

**The `#recent + ul` alias (§9):** attr_list cannot put a class on a `<ul>`, so
the machinery-managed Recent list cannot literally carry `{ .kb-recent }`. Instead
the section head gets `id="recent"`, and each `.kb-recent` rule's selector list is
extended (additively — no property changed) with a `#recent + ul` alias. The
marker+bullets render as that div's very next `<ul>` sibling; HTML comments between
them create no DOM node, so the `+` adjacency combinator still matches. Any future
markup change that inserts an element between the `#recent` head and the `<ul>`
would silently break Recent styling with no build error — asserted by the smoke
guard (see qa).

**Marker contract (load-bearing):** the `<!-- explain:recent -->` marker and the
exact bullet format must stay byte-intact — they are parsed by `server/documents.py`
(the API write/delete path) and the `/explain` skill's API-down fallback. Every P5
landing edit kept them byte-identical (verified by round-tripping the pure
`insert_recent_bullet`/`remove_recent_bullet` functions against the live file).

## Per-project & tags pages

- `docs/<project>/index.md` (new in P5) — minimal h1 + a 2–3 sentence grounded
  description per project (`changple5`, `hi2vi_web`, `bootstrap_agentic_workspace.sh`);
  no hand-maintained doc lists (the sidebar/section nav lists them, and a manual
  list would rot as `/explain` auto-adds pages). **Finding:** under plain auto-nav
  a section's tab/nav title is derived from its *folder name* (auto-prettified),
  **not** from the index page's frontmatter `title:` or `<h1>` — so
  `bootstrap_agentic_workspace.sh`'s tab reads literally as
  "Bootstrap agentic workspace.sh". Not fixable without renaming the directory
  (breaks doc URLs + the `/explain` per-project path convention) or a `nav:`
  override (forbidden). Left for the operator to accept.
- `docs/tags.md` — bilingual `# Tags · 태그` + a one-line lede; the
  `<!-- material/tags -->` insertion point is untouched.

## Search (client-side, CJK-capable)

Search is browser-only — the published site never calls the local FastAPI hybrid
search (that boundary is in architecture). Implementation:

- `plugins.search` in object form with `lang: [en, ko]`. The pinned 9.7.6 image
  bundles `lunr.ko.min.js` (Korean trimmer + stopword filter) and
  `lunr.multi.min.js`; the search worker loads both automatically.
- **How the CJK gap closes:** Korean is agglutinative — the eojeol `관련해` is one
  indexed token, so a bare `관련` query would never match under `lang: ["en"]`.
  `lunr.ko` is only a trimmer/stopword filter (no segmenter), so it does not solve
  agglutination alone. What closes the gap: Korean text is space-separated into
  eojeol **and** Material's typeahead (`search.suggest`) appends a trailing
  wildcard, so index token `관련해` ← query `관련` + `*` prefix-matches. Prefix
  direction matches Korean suffixation exactly.
- `separator` stays the default `[\s\-]+` (no custom regex — prefix-matching
  alone passes every acceptance query; kept minimal). `theme.language` stays `en`
  (mixed-language site).
- **Known limits:** no mid-compound substring match (the wildcard is prefix-only,
  lunr.ko has no segmenter); Korean particles/conjunctions are stopword-filtered.

**Zero-JS hero search affordance (P5.S3):** the built home HTML carries exactly
one `<input id="__search">` toggle. A styled `<label class="kb-hero__search"
for="__search">` inside `.kb-hero` toggles that checkbox; Material's own JS focuses
the search input. No custom JS — no `extra_javascript`, no script asset. Styled
additively in §9 (bordered rounded field, inline SVG magnifier, bilingual
"Search the knowledge base · 검색", `/` `<kbd>` hint) reusing only §1–§3 tokens.

## The knowledge map: page, renderer, `extra.css` §10 (P6)

The interactive knowledge map is the front end's first custom-JS feature. Three
pieces, all consuming `--kb-*` design tokens for automatic light/dark parity; the
visual language is the operator's locked P6.S0 Claude Design guide (mark grammar,
draw order, page anatomy). The user journey lives in **experience**; the design
provenance ADR in **decisions**.

- **`docs/graph.md` (the page).** `title: Graph`, `hide: [navigation, toc]` → the
  page gets an auto-nav top tab for free (no `nav:`). The body is a `.kb-graph`
  mount carrying `data-graph-src="../graph.json"`, a `<canvas>`, the JS-populated
  legend/zoom/tooltip/panel containers, an empty/loading state, and a `<noscript>`
  fallback. Material auto-injects an `<h1>Graph</h1>` above the mount — §10b
  visually-hides it (kept in the a11y tree) so the map truly *is* the page.
- **`docs/javascripts/graph.js` (the renderer).** ~1130 lines, strict IIFE, **zero
  third-party code / zero CDN** — the force sim and the canvas drawing are all
  hand-rolled in this one vendored file. A no-op guard returns unless a `.kb-graph`
  mount exists, so every page but `/graph/` pays nothing. It `fetch()`es the mount's
  `data-graph-src` (relative → resolves under CI's `/knowledge/` base *and* local
  serve), builds the model from `graph.json`'s `{version,projects,nodes,edges}`,
  deterministically hash-seeds a smarter starting layout (degree-aware doc placement
  + owner-anchored even-slot tag spokes), runs the force sim that **settles in
  ~600ms**, and draws with the design's grammar (draw order dimmed edges → live edges
  → halo → dimmed nodes → live nodes → selection ring → labels; doc = filled
  project-ink circle r 6→14px by degree + plate cutout rim; tag = hollow ring; ghost =
  dashed ring; 3px plate-colored label halo). Scheme changes repaint via a
  `data-md-color-scheme` `MutationObserver`; icons are inline SVG / text glyphs (no
  Iconify).
    - **P6.S1 live-model revision (operator-directed, ported from the design's
      `kbGraph.mount()`).** After the settle the renderer runs an **idle mingle** —
      one persistent `requestAnimationFrame` loop, guarded by `document.hidden`,
      drifts each node ≤ `--kb-graph-drift` from rest; under `prefers-reduced-motion`
      there is **no loop** (rendering is event-driven and holds still). Labels are
      **quiet (Strategy A′)**: marks-only at idle, revealed on hover/selection and
      above ~110% zoom (ladder relative to fit). The pointer **zooms toward the
      cursor** (wheel / ctrl-or-⌘-wheel pinch, clamped to `--kb-graph-zoom-min/max` ×
      fit) and pans the plate 1:1; **nodes are sticky** — a drag re-places a node and
      it stays, its tag spokes following on a spring. The legend is a **lens**
      (`.is-on` active row highlights a project's docs + spokes and dims the rest —
      never a filter); the tag-visibility switch remains.
    - **Reload-restore (F3).** Placement + camera + lens are persisted per corpus
      signature to `sessionStorage` (key `kb-graph:v1:<hash>`), debounced and flushed
      on `pagehide`, every access wrapped in try/catch (a disabled / private-mode
      store is a silent no-op). On a matching reload the stored rest positions are
      restored and the settle is **skipped**; a fresh tab or a changed corpus falls
      back to the default layout.
- **`extra.css` §10 (the styling).** Appended as a new section (§1–§9 untouched).
  §10a = the design mirror's `tokens/graph.css` **verbatim** (additive `--kb-graph-*`
  only, both schemes); the P6.S1 revision added **four tokens**
  (`--kb-graph-drift`, `--kb-graph-drift-period`, `--kb-graph-zoom-min`,
  `--kb-graph-zoom-max` — none changed). §10b = the full-bleed page — scoped
  **entirely via `:has(.kb-graph)`** so nothing else on the site is affected: zeroes
  the content margins, hides the injected `<h1>`, and breaks `.kb-graph` out to
  `width:100vw`, `height:calc(100dvh − var(--kb-graph-chrome))` (chrome `4.8rem` =
  header 2.4 + tabs 2.4, the one knob to retune if chrome height moves). Its breakout
  `margin-left: calc(50% − 50vw)` is carried on the higher-specificity
  `.md-typeset > .kb-graph` rule (F4) so a later `margin` declaration cannot zero it
  back out — a CSS-specificity fix, see qa. §10c = the overlay layer (legend / switch
  / zoom / tooltip / info panel / empty), scoped under `.kb-graph` so `.md-typeset`
  element styles don't bleed in, plus a `.kb-tag` panel pill mirroring §7 and the
  P6.S1 `.is-on` legend-lens row; its `[hidden]` helpers are raised to
  class+attribute specificity so the JS `hidden` attribute can actually hide the
  overlays (F2, see qa). §10d = reduced-motion (paint at rest, hold still, no fades).

**Project inks are a documented data-viz-only accent extension:** the map's node
fills + legend chips use a small muted categorical set (teal / bronze / plum), but
every *interactive* accent (hover, selection ring, halo, active edges, links) stays
**teal** — the one-accent rule holds where it is UI (ADR in decisions).

**Landing + nav entry:** `docs/index.md`'s `.kb-grid` gained a fifth `.kb-card`
(`Graph · 지식 지도` → `graph/`), matching the sibling cards; the page is also on the
auto-nav top tab. The hero/`#recent`/single-`#__search` landing invariants were kept
byte-intact.

## Conventions & constraints

- One stylesheet; consume `--kb-*`/`--md-*` tokens, never hard-code colors/fonts.
- Font budget (2 text + 1 code) is spent — add no webfonts; keep `theme.font: false`.
- **Custom JS stays vendored + CDN-free (P6):** `extra_javascript` is allowlisted to
  exactly `javascripts/graph.js`; keep the renderer self-contained (no third-party
  code, no CDN `<script src>`), and extend `extra.css` §10 additively without touching
  §1–§9. `graph.json` must stay repo-relative — no user-home absolute path may leak
  into it (guard-asserted).
- Never add `nav:`/`strict:`; keep `exclude_docs` as the only exclusion mechanism.
- Keep the `<!-- explain:recent -->` marker + bullet format byte-intact, and
  `<!-- material/tags -->` in `docs/tags.md`.
- No `overrides/` `custom_dir` today (the bi-scheme logo is solved by a
  mid-lightness teal that clears ~3:1 on both headers; the first real need — e.g.
  a font `<link rel=preload>` — would justify adding one). The §9 article classes
  (`.kb-meta`/`.kb-related`) await a per-page template / `overrides/` before they
  can be wired.
- Social cards deliberately skipped (needs the `social` plugin + cairosvg/Pillow
  CI deps, no design payoff now).

## Open Questions

- None blocking. Visual acceptance stays with the operator (deploys are
  manual-push-only; the dev server at `http://localhost:8765/knowledge/` is for
  eyeballing before any push). The awkward
  "Bootstrap agentic workspace.sh" tab label is a known, accepted auto-nav
  constraint. The article metadata/related treatments (§9) remain staged until a
  per-page template or `overrides/` exists.

## The authenticated web app (`web/`, P12)

P12 stands up knowledge's first **authenticated browser app** — a Next.js 16 / React 19
/ TypeScript application in a `web/` subdir, wholly separate from the public mkdocs site
(Track 1). It is the tenant-facing console: sign in, see the tenant dashboard, drill into
a project, browse/search/read that tenant's documents, and explore the tenant's knowledge
graph. All web-UI features are free. The app is a session-token client of `/auth/*` +
`/app/*` only — never the `vk_`-keyed `/api/*` machine surface from its own flow.

### Stack + build

- Next.js 16 App Router (Turbopack), React 19, TypeScript, pnpm; Tailwind v4 CSS-first
  `@theme`; ESLint/Prettier; `next.config.ts` `output: "standalone"`. Local dev:
  `pnpm --dir web dev` on `127.0.0.1:3030`. `next build` needs **no** env (server-only keys
  are lazy-read). Vitest covers the pure modules (54 tests at review). Production deploy
  (Dockerfile / compose / edge) is **P14**.
- **Load-bearing:** `src/lib/utils.ts` `cn()` registers the custom `text-*` scale in
  tailwind-merge — keep it in sync with the `--text-*` tokens, or a size + colour in one
  `cn()` call silently drops the size.

### The Knowledge Base design system (the app's real design)

- **The KB "calm editorial library" system is the app's final design** (S2R) — warm paper +
  one deep-teal accent, both light and dark schemes, token-driven. It **supersedes** the
  S1/S2 hi2vi-green placeholder; hi2vi contributes dashboard **structure/vibe** only, not
  its palette (the whole `--color-green*` ramp collapses to the single teal accent).
- `src/app/kb-tokens.css` defines the `--kb-*` tokens per `data-md-color-scheme` (`default`
  light / `slate` dark): paper/surface/border, teal `--kb-accent`/`-strong`/`-soft`,
  ink/secondary/hint, the type scale, radii/spacing/motion, and additive status/trend/delta
  inks (active = teal, idle = amber-bronze, revoked = terracotta — encoded in **form** for
  greyscale legibility). `src/app/kb-console.css` is the portable `.kb-*` console layer
  (topbar, rail, panels, tiles, `.kb-dtable`, status pills, `.kb-field`, flat
  `.kb-appbtn--*`, `.kb-appsearch`, the `.kb-reveal` show-once modal, `.kb-trend`).
  `globals.css` `@import`s both and repoints `@theme --color-*` at `--kb-*` (an auto-recolor
  safety net). **NOTE: `.kb-*` CSS is *unlayered***, so it beats Tailwind's layered utilities
  — override a `.kb-*` property with an inline `style`, not a Tailwind class.
- Per-route scheme: the `(auth)` gate = dark `slate`; the `(app)` console = light `default`
  (carried on `.kb-app`). Fonts self-hosted via `next/font/local`: Fraunces (display + stat
  numerals) + Source Sans 3 (body), JetBrains Mono, and full Pretendard as the Hangul
  fallback ending every stack. Icons: `lucide-react`. The KB design handback lives in
  `web/design/canvas/` (`APP_BRIEF.md` apply-map, tokens, console components, specimens) —
  the source of truth the app adopted.

### The sealed-cookie BFF + server client seam

- **`src/lib/knowledge/{client,auth,app,types}.ts`** is the one place Next talks to the
  backend server-to-server: `getJson`/`getRaw`/`sendJson`, `ApiError{status,detail}`, bearer
  injection, **`cache:"no-store"` on every call** (per-user data must never hit Next's fetch
  cache). `app.ts` holds the `/app/*` calls (dashboard, projects, credentials, usage,
  documents, search, graph); `types.ts` the serializer shapes.
- **Session** (`src/lib/session.ts`): the backend token is sealed into a `knowledge_session`
  **AES-256-GCM httpOnly** cookie (key `sha256(SESSION_SECRET)`, `SameSite=Strict`, `Secure`
  in prod, 30-day TTL), never exposed to browser JS. Two server-only env keys
  (`src/lib/env.ts`, `import "server-only"`): `KB_API_BASE_URL` (dev default
  `http://127.0.0.1:8766`) + `SESSION_SECRET`; neither `NEXT_PUBLIC_`.
- **Guards** (`src/lib/auth-guards.ts`): `requireIdentity = cache(async …)` verifies live via
  `GET /auth/me`, catches **only** `ApiError` 401 → `redirect("/login")`, rethrows everything
  else; `redirectIfAuthenticated` re-verifies to break the revoked-cookie ping-pong. The
  **BFF pipeline** (`src/lib/bff.ts`) for the public mutations is
  `415 → 403 same-origin → 429 per-IP → 400/422 zod → backend → seal → {ok}`; the backend
  `detail` is never echoed (preserving enumeration-safety). Routes at
  `/api/auth/{login,signup,logout}` (`nodejs` + `force-dynamic`).

### The app shell + four surfaces

- **App shell:** a dark login/signup gate (`(auth)`) and a light console (`(app)`) — a sticky
  paper topbar (brand · tenant crumb · email · logout) over `[rail | main]`. Two button
  languages kept distinct: the flat `.kb-appbtn--*` app chrome (shell + all app pages) and the
  marketing pill `Button` reserved for the P14 public landing. Rail items link only to shipped
  routes; the whole rail (Dashboard · Documents · Graph) is live at end of P12.
- **Dashboard** (`app/(app)/dashboard`): `GET /app/dashboard` + `GET /app/usage` → four
  Fraunces stat tiles, a teal 30-day search TrendChart (a faithful `console-trend.js` geometry
  port, unit-locked), a projects DataTable, a recent-activity feed, and a create-project
  **server action**.
- **Project detail** (`app/(app)/projects/[projectId]`): `GET /app/projects/{id}/usage`
  (bundles project + credentials) → header, a credentials table with a derived **3-state
  status** (`credential-status.ts`: active/idle/revoked), per-project usage. Mint/revoke are
  **server actions**; the minted `vk_` key rides back only in the mint action-state and is
  rendered exactly once by the `<ShowOnceKey>` `.kb-reveal` portal modal (viewport-fixed,
  focus-trapped, Escape/Dismiss only, copy-once) — never logged/persisted/cached.
- **Documents** (`app/(app)/documents` + `[id]`): a `.kb-appsearch` GET form → browse
  newest-first / project-filtered / full-text search (highlighted snippets, XSS-safe `<mark>`
  rebuild) → an offset pager; a read view renders markdown via `react-markdown` + `remark-gfm`
  with **no `rehype-raw`** (XSS-safe by construction), styled by a minimal on-token `.kb-prose`
  block. Pure `documents-query.ts` (searchParams round-trip + pager math) is unit-locked.
- **Knowledge graph** (`app/(app)/graph`): `GraphCanvas`, the app's first `"use client"` canvas
  + rAF component — a faithful port of the ~1130-line zero-dependency `<canvas>` force-sim
  renderer (`docs/javascripts/graph.js`): the deterministic sim and the full interaction model
  (drag/pan, wheel zoom, hover-highlight, legend project-lens + tag toggle, node-tap → panel,
  sessionStorage persistence), reading every colour/geometry token live via `getComputedStyle`
  of the **`--kb-graph-*`** token layer (mapped onto the KB palette for both schemes). The
  critical React work is the `useEffect` teardown (cancel rAF, disconnect observers, remove
  listeners, a `disposed` guard) — the model for any future canvas/rAF client component.

### Conventions

- The app is a session-token client of `/auth/*` + `/app/*` only; the sealed cookie is the
  only place the backend token lives; **no browser-JS token, no backend CORS change, no
  web-side DB.**
- Two on-token design extensions were added where the KB handback shipped no specimen — the
  `.kb-prose` reader block (S5) and the `--kb-graph-*` token layer (S6); both compose only on
  the KB `--kb-*` palette. A future design pass (P14 or a design round) may formalize a reader
  spec + a graph spec.
