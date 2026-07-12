---
doc_id: frontend
version: v0002
created_at: 2026-07-12T14:34:14+09:00
source: P5.REVIEW
summary: 'P5: MkDocs Material design system (extra.css token/hook architecture, theme.font false), landing wiring, CJK client-side search, zero-JS hero'
previous: v0001_bootstrap
---

# Frontend

## Status

The public Track 1 site (GitHub Pages, mkdocs-material `9.7.6`) carries a real
front end as of P5: an operator-designed "calm editorial library" design system
delivered as a single stylesheet + branding assets, a redesigned landing page,
per-project section pages, tuned Material navigation, and Korean/CJK-capable
browser-only search. There is no SPA framework and no custom build step — the
front end is mkdocs-material's theme plus one `extra_css` file, one `@import`,
two SVG assets, and hand-authored markup in `docs/`. No `overrides/` `custom_dir`,
no `extra_javascript`, no CDN scripts.

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
- **State / data / auth:** none. The published site is fully static; it never
  calls the local FastAPI API (that boundary is in architecture).

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

## Conventions & constraints

- One stylesheet; consume `--kb-*`/`--md-*` tokens, never hard-code colors/fonts.
- Font budget (2 text + 1 code) is spent — add no webfonts; keep `theme.font: false`.
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
