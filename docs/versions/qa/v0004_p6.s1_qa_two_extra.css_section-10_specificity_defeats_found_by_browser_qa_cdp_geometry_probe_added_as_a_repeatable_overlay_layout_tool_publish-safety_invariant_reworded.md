---
doc_id: qa
version: v0004
created_at: 2026-07-14T12:56:35+09:00
source: P6.REVIEW
summary: P6.S1 QA: two extra.css section-10 specificity defeats found by browser QA, CDP geometry probe added as a repeatable overlay/layout tool, publish-safety invariant reworded
previous: v0003_p6_site_smoke_graph.json_data-contract_custom-js_allowlist_built-graph-page_landing_graph-card_invariants_root_negatives
---

# QA

## Status

The public site (Track 1) has a mechanical acceptance gate as of P5:
`python3 scripts/site_smoke.py`, run after a `docker compose run --rm kb build`.
It is both the CI deploy gate and the local pre-push check for any change in the
P5 area (design CSS, landing markup, `mkdocs.yml`, search config). As of P6 the
same guard also covers the **knowledge-graph** feature: the `graph.json` data
contract, the first vendored custom JS (an `extra_javascript` allowlist replacing
the old "must be absent" assertion), the built `/graph/` page, and the landing
graph card. Server-side QA for Track 2 (the FastAPI store) stays as the P4
pytest/reindex checks in operations; this doc records the site-build acceptance
strategy.

## Test Commands

- **Site-build acceptance (Track 1):**
  `docker compose run --rm kb build && python3 scripts/site_smoke.py`
  — builds with the pinned 9.7.6 image (same as CI), then asserts the load-bearing
  invariants. A clean build **and** a `PASS` predict a clean, gate-passing deploy.
- **State integrity (workspace):** `python3 scripts/workflow.py validate`.
- **API / store (Track 2):** `uv run pytest -q`; drift repair via
  `uv run python -m server.reindex` (see operations).

## Acceptance Criteria Style

- **Named invariants, not `--strict`.** Acceptance is a fixed list of load-bearing
  invariants the guard asserts by name — never `mkdocs build --strict`. `--strict`
  turns any build warning into a hard failure, which would block future `/explain`
  zero-config page adds on warning-level noise. The guard is deliberately silent on
  build *warnings*; only the `README.md`/`index.md` conflict is fixed (via
  `exclude_docs`), not asserted.
- Acceptance is **mechanical** for structure/contract invariants; **visual**
  acceptance (does the design read right?) stays with the operator, done on the
  local dev server before any push (deploys are manual-push-only).

## Site-Build Invariants (asserted by `scripts/site_smoke.py`)

Stdlib-only, optional `--root` (default = repo root). Two groups, collected and
reported together; exits non-zero naming every violation.

- **Source invariants** (parsed from `docs/`, `mkdocs.yml`, `compose.yml`,
  `.github/workflows/pages.yml`):
  - `docs/index.md` has the `<!-- explain:recent -->` marker with ≥1 correctly
    formatted bullet directly under it (`format_recent_bullet`'s shape);
    `docs/tags.md` has `<!-- material/tags -->`.
  - `mkdocs.yml` has no top-level `nav:`/`strict:`, has `font: false`,
    `plugins.search.lang` includes both `en` and `ko`.
  - **(P6)** `mkdocs.yml` `extra_javascript` is present and its entries are
    **exactly** `["javascripts/graph.js"]` (the flipped custom-JS allowlist,
    replacing the old "must be absent" assertion); `hooks:` references
    `scripts/graph_hook.py` and the file exists; `docs/javascripts/graph.js` exists;
    `docs/graph.md` exists with `hide:` frontmatter.
  - Pin parity: `mkdocs-material==X` (CI) equals `squidfunk/mkdocs-material:X`
    (compose).
- **Built-site invariants** (against `site/`; a clear "run mkdocs build first"
  error if `site/` is missing):
  - `site/search/search_index.json` `config.lang` includes `en`+`ko`;
    `lunr.ko.min.js` + `lunr.multi.min.js` shipped under
    `site/assets/javascripts/lunr/min/`.
  - `site/index.html` has `kb-hero`, `kb-grid`, exactly one `id="__search"` and
    ≥1 `for="__search"` (the zero-JS hero toggle), the `<ul>` element-adjacent to
    `<div … id="recent">` (HTML comments tolerated between — the `#recent + ul`
    styling depends on this DOM shape), and the marker comment + a rendered bullet.
  - The three per-project `site/<project>/index.html` pages built.
  - `site/versions/` absent; no leaked absolute local home-directory path (the
    guard scans built HTML for an operator home-path prefix) and no
    `<script src="http…">` CDN tag in any built HTML.
  - **(P6)** `site/javascripts/graph.js` shipped; `site/graph/index.html` exists,
    mounts `.kb-graph` with `data-graph-src`, and references `javascripts/graph.js`;
    the built `site/index.html` carries the landing `.kb-card` link to `graph/`
    (keyed on the card *class*, distinct from the auto-nav tab / footer / `rel=next`
    links to `graph/` that exist regardless of the card).

- **Graph data-contract invariants (P6, `check_graph` over `site/graph.json`):**
  the file exists and carries **no user-home absolute path** in its raw text (the
  guard matches the operator home-path prefix literally, so a real leak still fails);
  it is valid JSON with
  `version == 1`; `projects`/`nodes`/`edges` are lists; node ids are unique; every
  node has `id`/`type`/`title` with `type` ∈ `{doc, tag, missing}`; every doc node
  has `url`/`date`/`project`/`tags`/`degree`; every edge has `kind` ∈ `{related,
  tag}` and **both endpoints resolve** to node ids; the `projects` doc counts **sum
  to** the doc-node count; and the **doc-node count equals the filesystem count** of
  `docs/*/*.md` at depth 2 (excluding `index.md` + reserved dirs — self-adapts to new
  docs/projects). A dead `related:` is tolerated as data (a `broken` edge + a `missing`
  ghost node), never a failure.

## Manual QA Missions

### Korean/CJK search (browser — authoritative)

- **Route / entry:** `http://localhost:8765/knowledge/` → hero search field or `/`.
- **What a real user would try:** `미라클`, `관련` (should match **while typing** —
  prefix-matches the agglutinated `관련해`; the core CJK win), `창플`; `nginx` /
  `cache` (English regression); `블록체인` (absent term → no results, cleanly).
- **What would feel wrong:** `관련` only matching after the full `관련해` is typed
  (typeahead wildcard not firing); an absent term flooding results; English
  results changing.
- **Evidence:** the smoke guard's Node lunr approximation predicts these, but only
  the browser exercises Material's real worker — eyeball it.

### Design eyeball (both schemes)

- **Route / entry:** the dev server, before any push.
- **What to check:** hero, Recent list, Browse cards, tag pills, code blocks,
  admonitions, and the search field in **both** light and dark (toggle the header
  brightness icon); teal is the only accent in both.
- **What would feel wrong:** a second hue creeping in; faux-bold weights; the logo
  vanishing on one header; the awkward "Bootstrap agentic workspace.sh" tab (known
  and accepted — not a defect).

### Knowledge map (browser — authoritative, P6, revised at P6.S1)

- **Route / entry:** `http://localhost:8765/knowledge/graph/` (Graph top tab or the
  landing Graph card). This is **owed operator QA** — no full browser ran in the build
  harness; a re-review headless-Chrome CDP probe confirmed the *geometry/behavior*
  (full-bleed layout, overlay-hide, reload-restore) but the *feel* is un-eyeballed.
- **What to check (revised behaviors):** the **settle-then-mingle** motion (~600ms
  settle, then a barely-there idle wander — never fast enough to fight the pointer);
  **quiet labels (A′)** — marks-only at idle, titles revealing on hover/selection and
  doc titles fading up past ~110% zoom; **pointer/pinch zoom toward the cursor** + 1:1
  plate pan; **sticky node re-placement** (drag a node — it stays; its tag spokes
  follow on a spring); the **legend lens** (clicking a project highlights it and dims
  the rest, `.is-on`, click again to clear — nothing is removed) + the tag-visibility
  switch; the **reload-restore** round-trip (drag/zoom, then trigger a same-tab reload
  — the map returns as left, no fresh settle); both color schemes (toggle header
  brightness — the map repaints); and the reduced-motion path (paints at rest, holds
  still, snaps).
- **What would feel wrong:** a second hue appearing in an interactive accent (hover/
  selection must be teal — project inks are node fills only); the mingle fast enough to
  fight the pointer, or no mingle at all under normal motion; always-on labels (A′ is
  quiet); the loading overlay never disappearing or the canvas ignoring the pointer
  (the F2 `[hidden]` defeat); the map box offset from the left edge with the info panel
  / zoom stack clipped off-screen (the F4 full-bleed defeat); a fresh settle on every
  same-tab reload; a CDN request in the network panel.
- **Flagged, not a defect:** with `navigation.footer` on, the footer sits just below
  the viewport-height map (a small scroll reveals it).

## Regression Checklist

- [ ] `docker compose run --rm kb build` exits 0 with no `README.md`/`index.md`
      conflict warning.
- [ ] `python3 scripts/site_smoke.py` → `PASS`.
- [ ] The `<!-- explain:recent -->` marker + bullet format is byte-intact
      (`server.documents` insert/remove round-trips the live `docs/index.md`).
- [ ] `python3 scripts/workflow.py validate` passes.

## Verifying the Guard Itself (negative-test pattern)

The guard must be proven to actually guard. The pattern (from P5.S4): **doctor a
scratchpad copy, never the repo.** Copy `mkdocs.yml`, `docs/index.md`,
`docs/tags.md`, `compose.yml`, `.github/workflows/pages.yml`, and the built
`site/` tree into a scratch dir; break exactly one invariant per group (e.g.
malform the first Recent bullet's date prefix; drop `"ko"` from the copied
`search_index.json` `config.lang`); run `python3 scripts/site_smoke.py --root
<scratch>` and confirm it exits non-zero and **names both failures by group**.
Confirm the repo's own files were untouched throughout. This is the template for
re-proving the guard after any change to `check_source`/`check_built`.

**P6 graph negatives (also add `docs/graph.md`, `docs/javascripts/graph.js`,
`scripts/graph_hook.py`, and `site/graph.json`/`site/graph/` to the copied tree):**
drop the `extra_javascript:` block from the copied `mkdocs.yml` → the allowlist
assertion FAILs with exactly one violation; delete `site/graph.json` → the graph
guard FAILs; inject a CDN `<script src="http…">` into the copied
`site/graph/index.html` → the all-pages CDN scan FAILs; remove the graph `.kb-card`
from the copied `site/index.html` → the landing-link assertion FAILs (the remaining
nav/footer/`rel=next` `href="graph/"` links do **not** satisfy it); doctor a
`related:` target to a nonexistent path and rebuild → a `broken` edge + a `missing`
ghost node appear and the guard still **PASSes** (a dead link is data, not an error).
All of these were exercised during P6 and re-confirmed at review.

## Browser-QA layout/overlay checks (P6.S1) — the CDP geometry probe

The build/smoke guard cannot see rendered geometry, so two **CSS-specificity defeats**
in the graph page's `:has(.kb-graph)`-scoped `extra.css` §10 rule stack slipped past it
and were only caught by the operator's live browser QA:

- **F2 — overlays could never hide.** Overlays toggle visibility via the JS `hidden`
  attribute, but `.kb-graph [hidden] { display:none }` at specificity (0,1,1) lost to
  each overlay's own `display` rule at (0,2,0) (`.kb-graph .kb-graph-empty` grid, zoom
  flex, tooltip inline-flex). The loading/empty overlay stayed up and swallowed all
  canvas pointer events. Fixed by raising the `[hidden]` helpers to class+attribute
  selectors at (0,2,1).
- **F4 — full-bleed defeated.** `.kb-graph`'s `margin-left: calc(50% − 50vw)` breakout
  at (0,1,0) was zeroed by `.md-typeset > .kb-graph { margin: 0 }` at (0,2,0), so the
  100vw map box started at the article's left edge and pushed the info panel + zoom
  stack off-screen on wide viewports. Fixed by carrying the breakout margin on the
  higher-specificity rule itself.

**Lesson (a QA invariant now):** whenever a declaration is meant to be overridden or
extended by a later, more-specific selector, verify the *value* carries forward
everything the earlier rule needed — a plain `[hidden] { display:none }` or a
`margin: 0` reset can silently win a specificity race.

**The CDP geometry probe (repeatable tool).** These bugs are invisible to a static
guard but trivial to assert with **headless Chrome + the Chrome DevTools Protocol**:
launch an own Chrome instance on a private debug port against the running dev server,
navigate `/graph/` at several viewport widths, and read `getBoundingClientRect()` +
computed styles via `Runtime.evaluate`. The re-review's probe asserted, at 1440×900 and
1280×720, `graph.x ≈ 0` and `graph.right ≈ viewport` (F4 full-bleed), the empty overlay
computed `display:none` with the canvas receiving pointer events at center (F2), and a
same-tab reload preserving the `sessionStorage` `kb-graph:v1:` blob + node positions
(F3, max Δ 0). Tear the Chrome instance down when done; never start/stop the operator's
compose `kb` server. This is the template for the overlay/layout class of bug the smoke
guard cannot see.

## Known Fragile Areas

- **The `#recent + ul` DOM adjacency** — a future markup change that inserts an
  element between the `#recent` head and the Recent `<ul>` silently breaks Recent
  styling with no build error (guarded).
- **`plugins.search` config** — reverting to the bare `- search` drops `lang` back
  to `["en"]` and breaks all Korean search with zero build error (guarded — the
  single most important search invariant).
- **Pin `9.7.6`** — a bump could change/remove the bundled `lunr.ko`/`lunr.multi`
  packs or rename the `#__search` toggle the hero label depends on (guarded, tied
  to pin parity).
- **The marker/bullet contract** — parsed by `server/documents.py` and the
  `/explain` API-down fallback; any landing edit must keep it byte-intact (guarded).
- **The `graph.json` data contract (P6)** — a schema/id/endpoint/publish-safety
  change (or a `graph_hook.py` regression that stops emitting, leaks a user-home
  absolute path, or breaks the projects-sum / doc-count identities) silently breaks
  the map with no build error (guarded by `check_graph`).
- **The `extra_javascript` allowlist (P6)** — it must stay exactly
  `["javascripts/graph.js"]`; adding a second entry or a CDN script is a guard
  failure, protecting the no-CDN invariant now that the site ships custom JS.

## Open Questions

- None blocking. Behavioral search correctness is empirically verified by the smoke
  guard's index checks plus the operator's browser mission; visual acceptance stays
  with the operator on the dev server before each push.
