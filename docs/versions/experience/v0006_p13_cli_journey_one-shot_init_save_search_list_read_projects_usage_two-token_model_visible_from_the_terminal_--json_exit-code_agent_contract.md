---
doc_id: experience
version: v0006
created_at: 2026-07-18T03:16:59+09:00
source: P13.REVIEW
summary: P13 CLI journey: one-shot init; save/search/list/read/projects/usage; two-token model visible from the terminal; --json/exit-code agent contract
previous: v0005_p12_authenticated_web_app_ux_login_gate_dashboard_project_detail_documents_in-app_graph
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
language follows the same operator-locked Claude Design guide (P6.S0). Its
**interaction was revised at P6.S1** (operator-directed, via Claude Design): quiet
on-demand labels, a barely-there idle mingle, pointer/pinch zoom toward the cursor,
sticky node re-placement, and a legend that highlights rather than filters — plus a
roomier default layout that survives an in-tab reload (see the map journey below).
Browser *feel* QA is still owed to the operator (no browser in the build harness; a
CDP geometry/behavior probe covered the structural parts — see Open Questions).

**As of P12 there is a second experience entirely: an authenticated web app** (Next.js,
`web/`), separate from the public mkdocs site. Signed-in tenants move from a dark "quiet
threshold" login gate into a light editorial workspace console and reach four surfaces —
a tenant dashboard, project detail, per-tenant documents (browse/search/read), and the
in-app knowledge graph — all free, all on the Knowledge Base design system. See *The
authenticated web app (P12)* below.

**As of P13 there is a third experience: the terminal.** A standalone `knowledge` CLI lets a
user (or their coding agent) run the whole lifecycle from inside Claude Code or Codex — a
one-shot `knowledge init` onboards them to the hosted SaaS, then `save`/`search`/`list`/`read`/
`projects`/`usage` do the day-to-day work, all with a `--json`/exit-code contract for agents and
a bundled `knowledge guide`. No browser, no website. See *The CLI journey (P13)* below.

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

### Explore the knowledge map (P6, interaction revised at P6.S1)

- **Entry:** the Graph top tab or the landing Graph card → `/graph/`.
- **Arrival (settle-then-mingle):** the map lays itself out with a brief
  force-directed settle (~600ms) and then keeps a **barely-there idle mingle** —
  each node strays ≤ 3px from rest over ~9s (tags wander a touch more) — so the map
  feels alive while it waits, never fast enough to fight the pointer. Under
  `prefers-reduced-motion` it paints at rest and **holds still**: no animated settle,
  no mingle, no label fades; pan/zoom snap. (This supersedes P6.S0's
  "settle-then-still / no idle drift".)
- **Read the map (quiet labels, Strategy A′):** the idle map is **quiet — marks
  only, no labels**. The mark grammar reads at a glance: doc nodes are filled circles
  sized 6→14px by degree in a project ink (teal / bronze / plum), tag nodes are small
  hollow rings, and a dead `related:` reference shows as a dashed "ghost" ring.
  `related:` edges carry an arrowhead ("reads on to"); tag edges are hairlines.
  **Hover or selection reveals** the node's title plus its neighborhood's; **doc
  titles also fade up past ~110% zoom** (fully on by ~135%); tag labels stay
  on-demand. At very low zoom a pointer tooltip carries the hovered title. (This
  supersedes P6.S0's "doc titles always on".)
- **Focus a neighborhood:** hover or click a doc → its neighborhood keeps its ink,
  incident edges turn teal with a soft halo, and everything else dims. A click also
  opens a **top-right info panel** (project chip, title, `date · N tags · N links`,
  tag pills, and a "read the explainer →" link) plus an offset teal selection ring. A
  ghost node's panel says "no document yet · 문서 없음" with no read-through. Clicking
  a tag highlights only.
- **Interact — the pointer does the real work:** **wheel / trackpad-pinch zooms
  toward the pointer** (0.5–2.5× of the fit view), dragging the empty plate pans 1:1,
  and a bottom-right zoom stack (+ / − / fit) remains. **Any node can be grabbed and
  re-placed — it stays where dropped** (sticky); a doc's tag spokes follow it on a
  soft spring, and a dropped tag keeps its new offset.
- **Legend is a lens, not a filter (revised):** the **bottom-left legend** lists
  projects with ink chips + doc counts; clicking a project **highlights** it — its
  docs + spokes keep full ink and titles while everything else dims (`.is-on` marks
  the active row), click again to clear. Nothing is removed from the map. A separate
  **tag-visibility switch** collapses the tag spokes when the map feels busy (today's
  corpus is tag-heavy, so this matters for legibility).
- **Roomier layout that survives reloads (P6.S1 / F3):** the default layout is
  deliberately spacious — docs seed degree-aware (hubs pulled in, leaves pushed out)
  and tags seed on even angular slots around their owner doc, for a cleaner first
  read. Placement, camera, and the legend lens **survive a page reload within the
  same tab** (persisted per-corpus to `sessionStorage`; the settle is skipped on
  restore), so leaving to read an explainer and coming back — or the dev server's
  live-reload firing — returns the map exactly as left. A fresh tab, or a changed
  corpus, gets the default layout.
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
  reduced-motion paints at rest and holds still (no idle mingle). On a same-tab
  reload the previously-explored placement/camera/lens are restored instead of a
  fresh settle.

## Copy and tone

- Bilingual where it counts (hero title, section heads "Recent · 최근",
  "Tags · 태그", the search label) — reflecting the mixed EN/KR corpus.
- Grounded, concrete lede/descriptions drawn from the actual documents, not
  marketing filler.
- Calm and library-like: restrained type, generous space, one accent.

## The authenticated web app (P12)

P12 delivers knowledge's tenant-facing console — a separate authenticated experience from the public mkdocs library. It wears the **Knowledge Base "calm editorial library"** design system (warm paper + one deep-teal accent, both schemes), carrying hi2vi's dashboard structure/vibe. Status is encoded in *form* (not colour alone) for greyscale legibility.

- **Sign in → console.** The signup/login gate is a dark "quiet threshold" (`slate` scheme); on success the tenant lands in the light editorial console — a paper topbar (brand · tenant crumb · email · logout) over a teal-active TOC rail (Dashboard · Documents · Graph, all live at end of P12).
- **Dashboard.** Four Fraunces stat tiles, a 30-day search trend, a projects table (Open → project detail), a recent-activity feed, and inline create-project.
- **Project detail.** Project info, a credentials table with a 3-state key status (active / idle / revoked, encoded in form), and per-project usage. **Mint a `vk_` key → it is shown exactly once** in a focus-trapped reveal modal (copy-once, unrecoverable; Escape or Dismiss only — a scrim click won't destroy it); revoke is a terracotta danger action with an inline confirm.
- **Documents.** Browse newest-first, filter by project, full-text search with highlighted snippets, and read the rendered markdown in a calm on-token reader.
- **Knowledge graph.** The corpus as a per-tenant force-directed map: settle→mingle motion, drag/pan, wheel/pinch zoom, hover-neighbor-highlight + tooltip, a legend project-lens + tag toggle, and node-tap → an info panel → read the document / filter by tag. (The public mkdocs `/graph/` stays tenant #1's public map; this is the per-tenant in-app view.)
- **Free.** Every web-UI feature — dashboard, project detail, documents, graph — is free; nothing is plan-gated. Web-UI search is deliberately unmetered.

Final visual acceptance of the live app (a real browser render of login → surfaces, mint/revoke, search, graph drag/zoom/click-through) is owed to the operator at the **P14 deploy** — the phase could not stand up the live BFF + backend + browser stack; route behavior is covered by the backend `TestClient` suites and the frontend by typecheck/lint/build.

## The CLI journey (P13)

P13 adds a terminal experience for a user living inside Claude Code or Codex: the standalone `knowledge` CLI (`uv tool install`, console script `knowledge`). It is deliberately **agent-first** — designed to be driven unattended by a coding agent — and the journey has two halves.

- **Onboard — one shot.** `knowledge init` runs the entire sequence in one command: signup-or-login → create the project → mint a `vk_` ingest key → write the config seam (`~/.config/knowledge-kb/config.json`, `0600`, `api.base_url` + `api.token=vk_…`) → verify it resolves as configured. It is **idempotent** (proven server-side: one project, one credential after two runs — a re-run reports "reusing the one in your config"). The password never comes from an interactive flag: `--password-stdin` > `$KNOWLEDGE_PASSWORD` > a TTY prompt. Signup `409` (duplicate email) offers login; a wrong login is the generic, enumeration-safe "invalid email or password". After `init`, `/knowledge:explain` itself starts writing to the hosted SaaS with **zero plugin change** — that is the payoff.
- **Day to day — six commands.** `save` (H1-first markdown body, 2–5 tags, `409` → `--overwrite`; project defaults to the git repo's basename so the CLI and the plugin partition one corpus identically; prints `id`/`rel_path`/a `knowledge read <id>` hint — paths that always work — never the mkdocs `url` that 404s for a non-#1 tenant), `search` (any query is safe to type — no "malformed query" error exists from the CLI), `list`, `read` (by id or rel_path, round-trips the body byte-for-byte), `projects` (a GROUP BY over documents — a just-created project is absent until its first save), and `usage`.
- **The two-token model, visible from the terminal.** After `knowledge logout`, `save`/`search`/`list`/`read` **keep working** on the non-expiring `vk_` while `usage` reports the session expired (your API key is unaffected) — the two tokens have two lifetimes and the terminal shows it. `logout` revokes the 30-day session but deliberately leaves `api.token` alive.
- **The agent contract — `--json` and exit codes.** All six commands take `--json`, which emits the server's payload **verbatim**; text is the opinionated default. Errors are **never** a JSON envelope — they are `error: …` on stderr with exit 1, so stdout is always "valid JSON or nothing" and an agent branches on the **exit code**, not on parsing an error shape. A `knowledge guide` command prints the full machine-readable lifecycle contract (bundled, offline) for an agent to read before driving the flow.

Onboarding + the full lifecycle + logout-survival + the 429 throttle are proven live on a local stack by `scripts/cli_smoke.py` (see qa). Hosted end-to-end awaits the operator's one-time accounts-plane cutover (see operations); the terminal experience itself is complete and proven.

## Open Questions

- None blocking. Final visual acceptance stays with the operator (deploys are
  manual-push-only; eyeball at `http://localhost:8765/knowledge/` before a push).
  The awkward "Bootstrap agentic workspace.sh" tab label is a known, accepted
  auto-nav constraint. Article-page metadata/related treatments (the §9
  `.kb-meta`/`.kb-related` design classes) await a per-page template before they
  enrich individual explainer pages.
- **Owed graph visual QA (P6):** a headless-Chrome CDP probe at the re-review
  confirmed the *geometry/behavior* (full-bleed layout at multiple widths, the
  loading overlay actually hiding, and the reload-restore round-trip), but the
  *feel* still needs the operator's eye in **both** color schemes: the idle mingle,
  the quiet → hover/selection label reveal + the >110% doc-title fade-up,
  trackpad-pinch / wheel zoom toward the pointer + 1:1 pan, sticky node re-placement
  with spring-following tag spokes, the legend lens (highlight, not filter), and the
  reduced-motion path (paint at rest, hold still, snap).
- **Graph-page footer (P6, flagged, not a defect):** with `navigation.footer` on,
  the footer sits just below the viewport-height map (a small scroll reveals it) —
  expected for a full-bleed map; the operator to opine whether to change it.
- **Label ladder at scale (P6):** the Strategy-C label ladder is deferred past
  ~50 docs; today's tiny corpus doesn't need it.
