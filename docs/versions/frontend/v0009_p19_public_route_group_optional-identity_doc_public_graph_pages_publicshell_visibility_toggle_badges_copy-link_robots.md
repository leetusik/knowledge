---
doc_id: frontend
version: v0009
created_at: 2026-07-22T15:28:37+09:00
source: P19.REVIEW
summary: P19 public route group: optional-identity doc + public graph pages, PublicShell, visibility toggle+badges, copy-link, robots
previous: v0008_p18_org_api_keys_dashboard_panel_reusing_p12_components_at_org_scope_no_new_route_design_round_org_bff_helpers_project_id_string_null_workspace_to_org_copy
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

**As of P14 that same `web/` app also carries the public marketing landing at `/`** —
the product's first real landing page, designed through a **Claude Design gate** (round
01) and built AS-IS from the returned `build-prompt.md` contract. It reclaims `/` from
the old `page.tsx` redirect via a public, indexable `(marketing)` route group, renders
nine sections in a light/dark tonal-band rhythm reusing the KB design system, and adds
the SEO file routes (`sitemap`/`robots`/`manifest`). The mkdocs site above is being
**retired from the hosted edge** in P14 (see operations) — so `web/` becomes the single
front end on `knowledge.hi2vi.com`. See *The public marketing landing (`web/`, P14)*
below.

**As of P16 the `web/` document viewer renders a first-class HTML explainer document
type** — a `format === "html"` document renders as an **interactive** explainer (its
quiz JS runs) inside a **sandboxed opaque-origin `<iframe sandbox="allow-scripts">`**
(never `allow-same-origin`) pointing at a new **same-origin BFF raw-relay route**
(`GET /api/documents/{id}/raw`), while a markdown document renders **byte-identically**
via the existing `<MarkdownBody>`. No new visual design — the iframe chrome reuses the
existing KB `--kb-*` tokens. See *The HTML explainer render (`web/`, P16)* below.

**As of P18 the `web/` app grows an Org API keys panel and renames Workspace → Org copy** —
a full-width `kb-panel` on `/dashboard` (below the projects/activity grid, **no new route or
rail change**) that reuses the P12 keys-table + mint-modal + revoke components **at org scope**,
so it is the **same visual language at a different scope — no Claude Design round** (design
stance #6). It adds new BFF org-credential helpers + two dashboard server actions, widens
`KbCredential.project_id` to `string | null` (org keys serialize `null`), and renames the
user-facing "Workspace" strings to "Org" (labels only — no CSS class or code identifier
renamed). See *The Org API keys panel + Workspace→Org copy (`web/`, P18)* below.

**As of P19 the `web/` app grows a public/private boundary: a `(public)` route group outside the `(app)` auth gate.** A public project's doc renders at the **unchanged** `/documents/{id}` (moved into `(public)`, now an **optional-identity** page — a member gets the app shell, an anonymous visitor a lighter `PublicShell`), and its graph at a new **`/graph/{org}`** page; both compose 1:1 from the existing document-view render and `<GraphCanvas>` (no new visual design, no Claude Design round). A new `optionalIdentity()` guard + a **tokenless** raw-HTML relay let an anonymous visitor read a public doc without ever fetching-with-token; a project-detail **visibility toggle + badge**, a dashboard badge column, and a shared **copy-link** island round out the surface; `robots.ts` now allows `/documents` + `/graph`. See *The public route group + visibility surfaces (`web/`, P19)* below.

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

## The public marketing landing (`web/`, P14)

P14 ships the product's **public marketing landing at `/`** inside the same `web/` app,
designed through a **Claude Design gate** (round 01) and implemented AS-IS from the
returned contract. It is the third front-end surface (after the mkdocs site and the P12
authenticated console), and it reuses the KB design system rather than introducing a new
one — no new brand, no second button/token system.

### The design gate (round 01) — provenance

- The visual language is the operator's, produced in the *Knowledge Base Design System*
  Claude Design project (`marketing/` group, 12 cards: Foundations 2 · Landing 9 ·
  Components 1). The agent authored **only** `handoff.md`, held a hard `pending` gate,
  read the returned cards back with DesignSync, **landed the design AS-IS**, and built
  from it — no mockups, palettes, or type scales of its own (the design provenance ADR is
  in decisions).
- The design record is kept read-only under **`web/design/rounds/01-landing/`**:
  `handoff.md` (out), `SIGNOFF.md`, and `output/` (`result.md`, `build-prompt.md`,
  `tokens.css`, `marketing.css`). **`build-prompt.md` is the implementation contract**
  (verbatim copy, section specs, band order, a11y floor); the two `.css` files are
  read-only *reference*, rebuilt as Tailwind utilities in the app, **not** ported.

### Route takeover of `/` (the `(marketing)` route group)

- `/` now resolves to a public, indexable **`(marketing)` route group**
  (`src/app/(marketing)/{layout,page}.tsx`). The old `src/app/page.tsx` root redirect
  (`redirect(token ? /dashboard : /login)`) was **deleted** — two `page.tsx` cannot both
  resolve to `/` — so the landing owns `/` directly. `layout.tsx` carries the scheme
  root, a skip-to-content link, the indexable marketing metadata (title/description/OG,
  canonical `/`), and imports the marketing CSS; `page.tsx` composes the sections
  top→bottom.
- The **authenticated app is untouched** at `/dashboard`, `/graph`, `/documents`,
  `/projects`, `/login`, `/signup`; the BFF `/api/auth/*` and `KB_API_BASE_URL` are
  unchanged. CTAs point at the app's **real** paths — "Sign in"/"Open the app" →
  `/login`, "Get started (— free)" → `/signup` (the operator's routing resolution, not
  the design's `/app`; the visual design is unchanged, only the link targets shift). The
  guide/CLI/Claude-Code/waitlist CTAs point at the **live GitHub repo** (`…/leetusik/
  knowledge` — `cli` README = guide, `cli#install`, `plugin` README = connect, repo home
  = the deferred-API roadmap), because the mkdocs docs site that used to serve `/` is
  being retired.
- **SEO file routes** added (`src/app/{sitemap,robots,manifest}.ts`): the landing indexes;
  the app/auth/BFF paths are disallowed in `robots`. `NEXT_PUBLIC_APP_URL` supplies the
  canonical/OG origin (baked at build in prod; a dev fallback of the request host).

### The nine sections + content-as-data

- **Section components** live under `src/components/marketing/` (separate from
  `app-shell/`): `marketing-header` (sticky-scroll island), `hero`, `value-triad`
  (what-it-is), `how-it-works`, `feature-save`, `feature-connect`, `feature-graph`,
  `pricing`, `final-cta`, `footer`, plus shared `primitives.tsx` (Band/Container/Eyebrow/
  Ticks/Chip/CtaLink/RichText), `terminal.tsx`, `graph-motif.tsx`, and `marketing.css`.
  Sections are server components; the only client islands are the header (scroll state),
  the graph motif (canvas), and the existing `<Reveal>`.
- **Copy lives as data** under `src/content/marketing/` (`links.ts`, `content.ts`,
  `terminals.ts`, `graph-motif.ts`, `index.ts`), extending the app's `@/content` pattern.
  Copy is **verbatim** from `build-prompt.md §4` — never invented (see the copy-fidelity
  note below).
- **Band order (top→bottom):** hero (dark) → what-it-is (paper) → how-it-works (sunken) →
  save (paper) → connect (dark) → graph (paper, recessed plate) → pricing (paper) → final
  CTA (dark) → footer (deep). Pricing is a **Free ($0/forever)** card beside an **"Agent
  Retrieval API — Coming"** waitlist tier (honest free-only launch; the paid retriever is
  deferred to P15).

### Additive marketing/band tokens + the tonal-band mechanic

- The `build-prompt §1` band set landed **additive** in `globals.css @theme`:
  `--color-on-dark-hint`, `--kb-band-dark/-soft/-deep`, `--kb-border-on-dark(-strong)`,
  `--kb-accent-on-dark(/-strong/-soft)`, `--kb-shadow-card`, and the data-viz inks
  `--kb-ink-{teal,bronze,plum}(-dark)`. **No locked `--kb-*` token was renamed or
  revalued;** the already-staged marketing scale / `--color-on-dark(-muted)` /
  `--color-on-primary` / spacing / container / radius / `[data-reveal]` layer are reused
  as-is.
- The **tonal-band mechanic** is a scoped cascade, not a scheme flip: within
  `.mkt-band--dark`/`--deep` (`marketing.css`), the app's **semantic** accent aliases
  `--color-green*` (+ `--color-on-primary` → dark ink) are re-pointed to the
  `--kb-accent-on-dark*` tier and the `--mkt-*` text/border helpers to the on-dark tiers.
  So the **reused CVA pill button** (`components/ui/button.tsx`, `secondaryOnDark` on dark
  bands) and the global focus ring auto-step to the on-dark teal — no second button
  system.
- **Both schemes, no in-page toggle** (matching the app's per-route fixed-scheme
  pattern): the marketing root follows OS `prefers-color-scheme` via a pre-paint inline
  script (SSR default = light `default`); the dark bands are scheme-independent, so the
  light/dark rhythm holds for every visitor.

### The graph motif (static reuse of the app renderer)

- `components/marketing/graph-motif.tsx` is a **faithful static canvas** that reuses the
  drawing grammar of `(app)/graph/graph-canvas.tsx` (node + cutout-rim, hollow tag ring,
  dashed ghost, related edge with arrowhead, focus halo, offset selection ring, haloed
  label) and the same live token read (`getComputedStyle` of the scheme-resolved
  `--mkt-ink-*`/`--mkt-graph-*` inks) — but **posed to the one designed composition**
  rather than run through the live force sim. It does NOT import the live renderer or its
  `(app)` CSS/data types; it draws once and redraws on resize + scheme change (no rAF
  loop, no interaction, no persistence). The info panel + legend are JSX overlays on the
  recessed `--kb-surface-sunken` plate.

### Copy-fidelity note (a design-round gap, not a defect)

`build-prompt §4` quotes verbatim ledes for hero / what-it-is / pricing / final-CTA (which
ship as prose), but for the three mid-feature sections (save / connect / graph) and the
how-it-works steps it **names the topic without quoting lede text**. Honoring the "copy is
real, never invented" design rule, those sections render their heading + the verbatim §4
ticks/tokens + the visual, with **no fabricated lede** — every designed *structural*
element ships. This is a copy-round gap, not a dropped design element; the exact lede/step
text drops into `content/marketing/content.ts` when the operator or a copy round supplies
it (**deferred job D10**).

### Conventions (P14 landing)

- Reuse the KB design system; add **no new brand**, no second button/token system — new
  tokens are additive and no locked `--kb-*` value changes.
- Copy is **verbatim from the design contract** — never invent lede/marketing prose.
- Respect the design AS-IS — no dropped/simplified/"improved" designed element; the only
  non-visual deviation is the operator's CTA-target routing (`/login`/`/signup`).
- The design record under `web/design/rounds/01-landing/` is **read-only** provenance, not
  a live source; the app is the built truth.

## The HTML explainer render (`web/`, P16)

P16 adds the `web/` document viewer's second render path: a first-class **HTML explainer**
document type rendered **with its interactivity intact but XSS-contained**. Every change
is additive and markdown docs render byte-identically; no new visual design (existing
`--kb-*` tokens only). The XSS-containment rationale lives in **architecture**.

- **The render switch (`src/app/(app)/documents/[id]/page.tsx`).** Only the **body**
  render branches (the header/metadata strip is untouched): `doc.format === "html"` → a
  `.kb-explainer` container wrapping
  `<iframe src="/api/documents/{id}/raw" sandbox="allow-scripts" referrerPolicy="no-referrer" …>`;
  else the existing `.kb-panel` + `<MarkdownBody>` (`react-markdown` + `remark-gfm`, **no
  `rehype-raw`**), byte-identical. **`sandbox="allow-scripts"` only — never
  `allow-same-origin`** (the opaque-origin pin), and no allow-forms/popups/top-navigation/
  modals. `format` is added to `KbDocumentListItem` (covers `KbDocument`).
- **The same-origin BFF raw-relay route (`src/app/api/documents/[id]/raw/route.ts`).** The
  app's first non-auth Route Handler — it **self-guards** (the `(app)` layout guard does
  not cover `/api/*`): validates the id first (`Number.isInteger && >= 1`, else 404 before
  any session/upstream), reads the sealed session cookie (`openSession(readSessionCookie(req))`,
  null → 401 with no upstream call), then relays S1's `GET /app/documents/{id}/raw` via the
  previously-unused `client.ts::getRaw` byte-passthrough seam (`app.ts::getDocumentRaw`):
  upstream 404 → 404, any other failure → 502. Success streams `new Response(upstream.body, …)`
  with **five pinned headers set EXPLICITLY** (never copied from upstream):
  `Content-Type: text/html; charset=utf-8`,
  `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`,
  `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`.
- **The X-Frame-Options exemption (`next.config.ts`).** The global `/:path*` entry stays
  `X-Frame-Options: DENY` (the parent document page keeps DENY). A **second, later,
  more-specific** entry `source: "/api/documents/:id/raw"` sets `X-Frame-Options: SAMEORIGIN`
  + the same CSP — values **identical** to the handler's, so no layer precedence can resolve
  to a wrong value (confirmed at runtime: `/api/documents/1/raw` returns a single SAMEORIGIN
  + the sandbox CSP; `/` stays DENY).
- **iframe chrome (`explainer.css`, co-located).** `.kb-explainer` mirrors the `.kb-graph`
  sizing/border/radius/overflow; the baseline is a **fixed generous height with internal
  scroll** (`--kb-*` tokens only) — the framed opaque-origin doc can't be measured
  cross-origin, so no `postMessage` height handshake in P16 (that is a P17 explainer-template
  enhancement). `referrerPolicy="no-referrer"` keeps the relay URL out of any referer.
- **What the live check still owes the operator (not executor-verifiable).** The unit tests
  (`tests/raw-route.test.ts`) cover the handler's status/headers/body + id/auth guards, and
  the header layering is confirmed at runtime; what remains is the live **authenticated,
  in-browser** round-trip — open `/documents/{id}`, confirm the iframe renders and the quiz
  JS runs, a direct top-level visit to the raw URL is sandbox-stripped, and a markdown doc
  still renders byte-identically. No jsdom/browser tooling exists in this repo, so this is a
  recorded operator residual, not a defect.

## The Org API keys panel + Workspace→Org copy (`web/`, P18)

P18 adds an **org-level** API-keys surface to the authenticated app and renames the user-facing
"Workspace" copy to "Org." It is a web-only slice: no `server/**`, no new route, and **no new
visual design** — the panel reuses the P12 keys-table + mint-modal + revoke components at org
scope (design stance #6 → **no Claude Design round**; a genuinely new-design surface would have
had to flag and stop rather than invent one, which it did not need to).

- **Placement — a dashboard panel, not a new route.** A full-width **`Org API keys`** `kb-panel`
  renders on `/dashboard` (`app/(app)/dashboard/page.tsx`) below the projects/activity grid — no
  rail item, no new route. Project pages keep their per-project keys unchanged.
- **Reused components + page-local islands.** The panel is a `DataTable` of the reused key columns
  (name / mono `token_prefix` / derived status `Badge` / created / last-used / revoke) over a
  `MintOrgKeyForm` disclosure. `dashboard/mint-org-key-form.tsx` (`MintOrgKeyForm`, with
  `ShowOnceKey` inlined) and `dashboard/revoke-org-key-button.tsx` (`RevokeOrgKeyButton`,
  `credentialId`-only) are **page-local copies** of the project mint/revoke islands (the
  established P12 convention — no shared abstraction invented).
- **BFF org-credential helpers.** `web/src/lib/knowledge/app.ts` gains `listOrgCredentials` /
  `createOrgCredential` / `revokeOrgCredential`, mirroring the project helpers minus the path
  project id — they hit S2's `GET/POST/DELETE /app/credentials`. `mintOrgCredentialAction` /
  `revokeOrgCredentialAction` were **appended to the existing** `dashboard/actions.ts` (one
  `"use server"` module that already held `createProjectAction`) — same rules as the project
  mint/revoke (`requireIdentity()` outside the try, status-mapped errors, show-once key in the
  action state, `revalidatePath("/dashboard","page")`; mint has no `notFound` case since the org
  is the caller's own tenant).
- **`KbCredential.project_id` widened to `string | null`** (`lib/knowledge/types.ts`) — the honest
  shape of S2's NULL-safe `serialize_credential` (org keys serialize `null`). This forced one
  type-narrow on the project detail page's revoke cell (`credential.project_id !== null`; behavior
  identical — a project-detail credential is always project-bound). Any future consumer of
  `project_id` must treat it as nullable.
- **Workspace → Org copy is label-only.** The user-facing "Workspace" string *values* were renamed
  to "Org" across `content/{app,dashboard,auth,documents,graph,project}.ts` (signup line →
  "A default org and project are created for you automatically"), while the **code identifier**
  `APP_SHELL.workspaceLabel` (and all CSS classes) are **unchanged** — only the value moved. The
  only deliberately-surviving `workspace` string is the P20 marketing landing copy
  (`content/marketing/content.ts`), left for P20. New content exports: `DASHBOARD.orgKeys` +
  `MINT_ORG_CREDENTIAL_ERRORS` / `REVOKE_ORG_CREDENTIAL_ERRORS`.
- **Validation.** typecheck / lint / `next build` / `vitest` (58) all green; the live
  mint→show-once→revoke click-through is the same operator residual shape as P16's in-browser
  round-trip — the live org-key path is proven end-to-end by S5's extended `onboarding_smoke.py`
  against prod.

## The public route group + visibility surfaces (`web/`, P19)

P19 adds the web public/private boundary: a public project's doc + graph become anonymously readable, and a member can toggle visibility and copy a share link. Composed 1:1 from already-designed pieces — **no new CSS, no new tokens, no Claude Design round**.

- **The `(public)` route group (URLs unchanged).** `documents/[id]/` was **`git mv`d** from `(app)` to a new `(public)` group (page + not-found + explainer/prose CSS), so `/documents/{id}` is unchanged but now lives outside the auth gate; the `/documents` list stays in `(app)`. The doc render was extracted verbatim into a co-located `document-view.tsx` (zero visual change). The page branches on `optionalIdentity()`: a **member** → `getDocument(token, id)` + `<AppShell>` with back-link + copy-link (`ApiError` 404/400 → `notFound()`); an **anonymous** visitor → `getDocument(undefined, id)` + `<PublicShell>` (a miss → `redirect("/login")`). A malformed id short-circuits to `notFound()` **before** any session read. A new `(public)/graph/[org]/page.tsx` UUID-validates `org` (malformed → `notFound()`), calls `getGraph(token ?? undefined, { org })`, maps an `ApiError` 404 → `notFound()` (a branded not-found, never a login bounce), and renders `<PublicShell>` + `<GraphCanvas>` imported as-is from `(app)/graph`.
- **`PublicShell` (`components/public-shell.tsx`).** A server component reusing AppShell's exact `.kb-app`/`.kb-topbar` pieces — brand block (→ `/`) + spacer + a single "Sign in" ghost link — with no rail/crumb/user. Composition of existing classes only.
- **`optionalIdentity()` (`lib/auth-guards.ts`).** The anonymous-capable sibling of `requireIdentity` (`cache()`d): returns the member context for a live session, `null` for no-cookie **or** a dead cookie (knowledge 401), rethrows real outages. It **never redirects** — mirroring the server `optional_user`.
- **The raw-HTML relay is now optional-identity.** `/api/documents/{id}/raw` replaced its 401 short-circuit with `const token = openSession(readSessionCookie(req)) ?? undefined;` then `getDocumentRaw(token, id)` — an anonymous browser sends no cookie ⇒ tokenless relay ⇒ knowledge serves only public raw HTML (private/nonexistent = 404). The four `RAW_HTML_HEADERS` are **byte-identical**; `next.config.ts` matcher untouched. (Security detail in **security**.)
- **BFF plumbing (`lib/knowledge/app.ts`, `types.ts`).** `getDocument`/`getDocumentRaw` now take `token: string | undefined`; `getGraph(token, { org? })` appends `?org=` (the bare call byte-unchanged); new `setProjectVisibility(token, id, visibility)` → `PATCH /app/projects/{id}`. `KbProject.visibility` + `KbDashboardProject.visibility` (`"private" | "public"`) added.
- **Toggle + badges + copy-link.** The project-detail header carries a `Badge` (`active`=Public / `idle`=Private, `chip`) + a `visibility-toggle.tsx` island wired to `setProjectVisibilityAction` (the mint-action idiom + `revalidatePath`); the current visibility is read off the existing `getProjectUsage` bundle (no extra `getProject` round-trip). The **only server change** in the web slice: `dashboard_api.py` gained a `"visibility"` key (byte-mirrored to the plugin template) so the dashboard projects table shows a Public/Private badge column. `copy-link-button.tsx` (`navigator.clipboard`, idle/copied/failed states) builds `${origin}${path}` client-side, used on the member doc view and the member graph header.
- **`robots.ts`.** `/documents` + `/graph` removed from `disallow` (they now carry public surfaces); `/dashboard`, `/projects`, `/login`, `/signup`, `/api/` stay blocked. `sitemap.ts` unchanged.
- **Recorded edges (within scope).** The moved `(public)` not-found pages render **bare** (no `(public)` layout by design), so a member hitting a genuinely-missing doc id sees the centered empty-state without app-shell chrome (minor, rare). The ported `GraphCanvas` tag-hub links still target the session-gated `/documents?tag=`, so an anonymous visitor clicking a tag hub on a public graph lands on `/login` (the doc-node "Read" links work anonymously). Both are deferred niceties (login `returnTo`; anonymous tag browse).
- **Validation.** `pnpm lint` / `typecheck` / `test` (61) / `build` all green; `plugin_parity.py` PASS (the one dashboard server change is mirrored); the live anonymous same-origin pages (`GET {url}` 200, `GET /graph/{tenant}` 200 while public, `/login` redirect after toggle-back) are proven end-to-end by S5's extended `onboarding_smoke.py` against prod (web pages in scope).
