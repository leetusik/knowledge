---
doc_id: experience
version: v0003
created_at: 2026-07-14T05:08:17+09:00
source: P6.REVIEW
summary: P6: interactive knowledge-map journey settle-then-still label strategy A zoom ladder info panel legend filters landing and nav entry
previous: v0002_p5_calm-editorial_operator-designed_visual_language_landing_browse_journeys_per-project_pages_cjk_search_ux_hero_affordance
---

# Experience

## Status

The public knowledge site (Track 1, GitHub Pages) has a finalized experience as
of P5: an operator-designed "calm editorial library" visual language, a
redesigned landing page with real browse journeys, per-project section pages, and
Korean/CJK-capable in-browser search reached from a hero search affordance. The
design provenance is the operator's Claude Design project ("Knowledge Base Design
System") — the agent integrated it; the visual language is no longer agent taste.

**P6 adds a fourth journey: an interactive, Obsidian-like knowledge map** at
`/graph/` — the whole library as a force-directed graph (every explainer a node,
linked by shared tags and `related:` references), drawn client-side. Its visual
language follows the same operator-locked Claude Design guide (P6.S0). Browser
visual QA of the map is still owed to the operator (no browser in the build harness —
see Open Questions).

## Visual language — "calm editorial library"

- **Warm paper, one accent.** Light scheme: warm ivory paper (`#f6f2e8`) with a
  raised near-white surface (`#fffefa`) for cards/search/admonitions. Dark scheme
  (`slate`): warm charcoal paper (`--md-hue: 34` warms the derived slate tiers).
  A single **deep teal** accent (light `#0f6f66` / dark `#62bdb2`) is the *only*
  accent — links, hover, focus rings, active nav/TOC, permalinks, tag hover, card
  hover, `::selection`, and search-match highlights. Neutrals carry everything
  else; there is no second hue.
- **Paper header, not a colored bar.** The header wears the paper color with a
  hairline bottom rule (differentiates hardest from stock Material's colored bar);
  the footer is a warm dark editorial anchor band.
- **Serif display over clean sans.** Fraunces (variable serif) on a restrained
  h1–h6 ladder for headings/site-title; Source Sans 3 body at line-height ~1.72
  for a calm reading rhythm; JetBrains Mono for code. Mixed EN/KR is handled by
  Hangul fallback stacks on every family.
- **Soft, quiet surfaces.** Hairline borders, generous whitespace, `0.55rem`
  radii, and exactly one hover shadow (card lift) — no heavy drop shadows.
- **Teal-only admonition policy:** note = teal rail; warning/others = warm-neutral
  rail, differentiated by icon + label + weight (no second hue).
- **Both schemes** ship via `prefers-color-scheme` plus a manual header toggle.

## Route / screen map

- **`/` (Home, `docs/index.md`)** — the editorial landing: hero → Recent → Browse.
- **`/<project>/` (per-project index)** — `changple5`, `hi2vi_web`,
  `bootstrap_agentic_workspace.sh`: a short grounded description; the section nav
  lists the project's explainer docs.
- **`/<project>/<doc>/`** — an individual explainer page (auto-nav from the tree).
- **`/tags/`** — the tags index (`# Tags · 태그` + the tags-plugin listing).
- **`/graph/` (P6)** — the interactive knowledge map: a full-bleed force-directed
  graph of the corpus. Reached from the auto-nav top tab and a landing Browse card
  (`Graph · 지식 지도`).
- **Search overlay** — Material's search, reachable from the header, the `/`
  keyboard shortcut, or the hero search field.

## Core user journeys

### Land → orient → read

- **Entry:** the home page.
- **Hero:** a bilingual title ("Explained for beginners / 초보자를 위한 기술 설명")
  and a lede grounded in the real content (nginx, caching, agent refactor,
  prompt-injection defense), plus the hero search field.
- **Recent:** a styled plain list of the newest explainers (date · title ·
  project), machinery-managed — new docs appear here automatically via the
  `/explain` write path, with no experience regression (the styling rides an
  `id="recent"` + `#recent + ul` alias; the underlying list stays byte-intact).
- **Browse:** a card grid — one card per project, a Tags card, and (P6) a **Graph
  card** (`Graph · 지식 지도` → `/graph/`) — each with a grounded description and a
  real destination. Explainer *counts* are deliberately not shown (the machinery
  never updates them, so a count would go stale). The Browse row now closes the
  journey: hero/search → Recent → Browse (projects · Tags · Graph).
- **Success state:** the reader reaches a project page or an explainer and reads
  with prev/next footer links ("read like a book, not a manual").

### Browse by project or topic

- **By project:** the top tab row (Home / project folders / Tags) and the sidebar
  section indexes (click-through enabled) lead into a project; the section nav
  lists its docs.
- **By topic:** the Tags page lists every tag with its documents.
- **Finding (nav labels):** under plain auto-nav a section's tab/nav title comes
  from its *folder name* (auto-prettified), not from the index page's `title:` or
  `<h1>`. So `bootstrap_agentic_workspace.sh` reads as
  "Bootstrap agentic workspace.sh" — awkward but accepted, since renaming the
  directory would break every doc URL and the `/explain` per-project convention,
  and a `nav:` override is forbidden (auto-nav is load-bearing).

### Search (Korean/CJK-capable, in the browser)

- **Entry:** click the hero search field, press `/`, or use the header search
  icon — all open Material's search overlay.
- **Behavior:** English is unchanged (`nginx`, `cache`). Korean now works: a query
  like `관련` prefix-matches the agglutinated eojeol `관련해` **while you type**
  (Material typeahead), and `미라클` / `창플` match. An absent Hangul term (e.g.
  `블록체인`) returns cleanly — no false flood.
- **Known limits (recorded, not defects):** no mid-compound substring match (the
  typeahead wildcard is prefix-only and lunr.ko has no segmenter); Korean
  particles/conjunctions are stopword-filtered out of the index.
- **Hero affordance:** a bordered, rounded field showing "Search the knowledge
  base · 검색", an inline magnifier, and a `/` key hint. It is a zero-JS
  `<label>` that toggles Material's own search — no bespoke search UI.

### Explore the knowledge map (P6)

- **Entry:** the Graph top tab or the landing Graph card → `/graph/`.
- **Arrival (settle-then-still):** the map lays itself out with a brief
  force-directed settle (~600ms) and then **stops** — no idle drift, calm at rest.
  Under `prefers-reduced-motion` it paints at rest immediately (no animated settle,
  no label fades).
- **Read the map:** doc titles are always on; the mark grammar reads at a glance —
  doc nodes are filled circles sized 6→14px by degree in a project ink (teal /
  bronze / plum), tag nodes are small hollow rings, and a dead `related:` reference
  shows as a dashed "ghost" ring. `related:` edges carry an arrowhead ("reads on
  to"); tag edges are hairlines.
- **Zoom ladder (Label Strategy A):** zoomed out (<60% of fit) only hub doc labels
  show, with the rest in a pointer tooltip; at the idle/fit view (60–110%) all doc
  labels show; zooming in past 110% — or hovering/selecting — fades in the
  neighborhood's tag labels.
- **Focus a neighborhood:** hover or click a doc → its neighborhood keeps its ink,
  incident edges turn teal with a soft halo, and everything else dims. A click also
  opens a **top-right info panel** (project chip, title, `date · N tags · N links`,
  tag pills, and a "read the explainer →" link). A ghost node's panel says "no
  document yet · 문서 없음" with no read-through. Clicking a tag highlights only.
- **Interact:** pan by dragging the canvas, wheel-zoom toward the cursor, a
  bottom-right zoom stack (+ / − / fit), and drag a node to reposition it. The
  **bottom-left legend** lists projects with ink chips + doc counts (click a project
  to filter it out) and a **tag-visibility switch** (collapse the tag spokes when
  the map feels busy — today's corpus is tag-heavy, so this matters for legibility).
- **Accent discipline:** project inks color only the data-viz surfaces (nodes,
  legend chips); every interactive accent (hover, selection ring, halo, active
  edges, links) is **teal**, matching the site's one-accent rule. Both color schemes
  are supported; the map repaints on the Material light/dark toggle.

## UX states

- **Empty search:** an absent term returns no results cleanly (no error, no flood).
- **Recent (near-empty corpus):** the Recent list mirrors whatever the machinery
  has written; there is no separate empty-state copy.
- **Dark/light:** the manual toggle plus `prefers-color-scheme` — both schemes are
  fully skinned (the teal-only accent holds in both).
- **Loading:** none beyond a static page load; search runs client-side once the
  worker + language packs load from the static build.
- **Knowledge map (P6):** a loading state while `graph.json` is fetched; an empty
  state (bilingual EN/KR copy) if the fetch fails or there are zero doc nodes; a
  `<noscript>` fallback pointing Home for JS-disabled visitors. Both schemes skinned;
  reduced-motion paints at rest.

## Copy and tone

- Bilingual where it counts (hero title, section heads "Recent · 최근",
  "Tags · 태그", the search label) — reflecting the mixed EN/KR corpus.
- Grounded, concrete lede/descriptions drawn from the actual documents, not
  marketing filler.
- Calm and library-like: restrained type, generous space, one accent.

## Open Questions

- None blocking. Final visual acceptance stays with the operator (deploys are
  manual-push-only; eyeball at `http://localhost:8765/knowledge/` before a push).
  The awkward "Bootstrap agentic workspace.sh" tab label is a known, accepted
  auto-nav constraint. Article-page metadata/related treatments (the §9
  `.kb-meta`/`.kb-related` design classes) await a per-page template before they
  enrich individual explainer pages.
- **Owed graph visual QA (P6):** the knowledge map was built and validated
  structurally/at build-level, but no browser ran in the harness — the operator
  should eyeball both color schemes, the settle-then-still animation,
  hover/selection dimming + info panel, the zoom-ladder label transitions, the
  legend project-filter + tag-visibility switch, and the reduced-motion path.
- **Graph-page footer (P6, flagged, not a defect):** with `navigation.footer` on,
  the footer sits just below the viewport-height map (a small scroll reveals it) —
  expected for a full-bleed map; the operator to opine whether to change it.
- **Label ladder at scale (P6):** the Strategy-C label ladder is deferred past
  ~50 docs; today's tiny corpus doesn't need it.
