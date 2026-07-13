# P6.REVIEW — Phase review result

**Verdict: PASS.** The whole phase re-validated green from a clean build in a pinned
venv, the shipped artifacts demonstrably satisfy the objective/intent, every
cross-cutting constraint holds, and the seven durable-doc versions were consolidated.
No source was touched (review slice); docs + this report + a `phase.md` note are the
only writes.

## 1. Validation matrix (re-run from scratch — not trusting per-slice greens)

Pinned venv: `mkdocs-material==9.7.6` → mkdocs 1.6.1 (scratchpad `p6venv`). Build ran
at repo root; mkdocs cleaned `site/` itself ("Cleaning site directory") so the build
is clean. `node v24.3.0`.

| # | Command | Outcome |
|---|---------|---------|
| 1 | `mkdocs build` (pinned venv) | **built in 0.32s**; `site/graph.json` (11518 B), `site/graph/index.html` (26501 B), `site/javascripts/graph.js` (35268 B) all present. Red "MkDocs 2.0" banner = Material advisory, not an error. |
| 2 | `python3 scripts/site_smoke.py` | **PASS — all site invariants hold**, exit 0 (carries S1+S2+S3's full assertion set + all P5 invariants). |
| 3 | Determinism: build ×2, `cmp` the two `graph.json` | **byte-identical** across two builds. |
| 4 | `node --check docs/javascripts/graph.js` | **SYNTAX OK**, exit 0. |
| 5 | `--root` negative (copied tree, drop `extra_javascript:`) | baseline copy PASS; doctored copy → **FAIL, exactly 1 violation** (`extra_javascript: missing (must list exactly javascripts/graph.js)`), exit 1. Guard has teeth. |
| 6 | Serve parity (already-running compose `kb`, `http://localhost:8765/knowledge/`) | `GET /graph.json` → **200**, version 1, **6 doc + 26 tag** nodes, 30 edges, projects `[changple5:4, bootstrap…:1, hi2vi_web:1]`, **no `/Users/`**; `GET /graph/` → **200**, `.kb-graph` mount + `data-graph-src="../graph.json"` + `<script src="../javascripts/graph.js">`. Server was up — not started/stopped by me. |
| 7 | Sanity-read built `site/graph.json` vs corpus | **6 doc + 26 tag = 32 nodes**, 0 ghost; **3 related (0 broken) + 27 tag = 30 edges**; projects `[changple5:4, bootstrap:1, hi2vi_web:1]`; all endpoints resolve; ids unique; no `/Users/`; no leading-slash urls. Matches the plan exactly. |
| 8 | `python3 scripts/workflow.py validate` | **Workflow validation passed**, exit 0. |

All eight green. Environment note: `rm -rf site/` was sandbox-blocked, so I relied on
mkdocs' own site-dir cleaning (equivalent clean build) rather than a manual delete —
does not affect the result.

## 2. Conformance review (objective / intent / constraints)

**Objective/intent — each element demonstrably present in the shipped artifacts:**

- *Interactive Obsidian-like map, docs as nodes, links/tags as edges* — `docs/graph.md`
  full-bleed page + `docs/javascripts/graph.js` renderer; `graph.json` carries 6 doc +
  26 tag nodes, 3 `related` + 27 doc–tag edges. ✔
- *Client-side on the static Pages site, hosting unchanged* — browser-only: the map
  fetches a build-time static `graph.json`, never the API; `pages.yml`, `compose.yml`,
  and the `9.7.6` pins are untouched. ✔
- *Design per the locked P6.S0 guide* — `extra.css` §10a is `tokens/graph.css` verbatim;
  drawing grammar ported 1:1; project inks data-viz-only, teal-only interactive accents.
  Pixel-level fidelity is the deliberately-owed browser QA. ✔

**Cross-cutting checks (git range `15d1768..HEAD`; `15d1768` = P6.DECOMP, the parent of
the first P6 code commit):**

- `mkdocs.yml` gained **exactly** the `hooks:` + `extra_javascript:` blocks; **no**
  `nav:`/`strict:`; `font: false` intact; pins untouched. ✔
- `docs/stylesheets/extra.css` diff = **351 added, 0 removed** — a pure append (§10 +
  a 2-line addition to the header's section index). §1–§9 untouched. ✔
- **No CDN / no new webfonts / no `/Users/` in shipped artifacts.** No external
  `<script src>` in any built page; zero third-party imports in `graph.js`. The only
  Google-Fonts `@import` is the **pre-existing P5 line** (absent from the P6 diff — zero
  new webfonts). The only `/Users/` hit is a **docstring in `scripts/graph_hook.py:37`**
  documenting the invariant ("`/Users/` must never appear"); the hook is a build-time
  script never copied into `site/`, and the published `graph.json` + built HTML are
  clean. ✔
- `docs/current/` + `docs/versions/` **untouched by S0–S3** (absent from the range
  diff). ✔  Corpus explainer docs untouched — the P4 `related:` convention is consumed
  read-only (`fm.get("related")`). ✔
- **P7 / SaaS not precluded** — the machinery is self-contained in `scripts/graph_hook.py`
  + `docs/javascripts/graph.js` with zero third-party/server coupling. ✔

**Known deliberately-open items (confirmed NOT defects):** browser visual QA owed to
the operator (no browser in harness); graph-page footer below the viewport-height map
(flagged, operator to opine); Strategy-C label ladder deferred past ~50 docs;
`docs/current` nodes excluded from v1 by design.

**Benign observations (not defects):** the S1/S2 result writeups undercount lines
(`graph_hook.py` is 183, not "~135"; `graph.js` is 810, not "~640") — a wording slip in
the notes only; the code is present, correct, and validated. The S3 "container
teardown" deviation (left the operator's already-running `kb` server up rather than kill
it) is correct behavior and already flagged for the operator.

## 3. Durable-doc consolidation (7 new versions, source `P6.REVIEW`)

Consolidated the phase's "Doc impact" notes into one new version per affected area via
`doc-new-version` (edited the returned `edit_path` only, then `rebuild-docs`; never
patched an old version or hand-edited `docs/current`). `validate` + `docs` confirm the
index picked all seven up as latest.

| Doc | New version | What it now records |
|-----|-------------|---------------------|
| architecture | `v0005` | Knowledge-graph as a build-time static asset (mkdocs hook → `graph.json`) + browser-only client-side rendering seam; roadmap P6 marked delivered; P7/SaaS non-preclusion. |
| data | `v0004` | Build-time graph data contract: node-selection rule (`source`-mapping discriminator; `docs/current`+`versions` excluded), `{version,projects,nodes,edges}` schema, tags-as-nodes, ghost/broken edges, deterministic + publish-safe. |
| frontend | `v0003` | The renderer (first custom JS, vendored hand-rolled force sim, no CDN), `docs/graph.md` full-bleed page, `extra.css` §10; theme-config `hooks:` + `extra_javascript` allowlist; updated the stale "no custom JS / no extra_javascript" statements. |
| experience | `v0003` | The knowledge-map journey: `/graph/` route, settle-then-still, Label Strategy A + zoom ladder, info panel, legend project-filter + tag switch, landing + nav entry, reduced-motion; owed visual QA + footer flag in Open Questions. |
| operations | `v0006` | The mkdocs `hooks:` graph emitter (runs under build *and* serve, zero `pages.yml`), serve-parity confirmed, extended smoke guard, README knowledge-map mention. |
| qa | `v0003` | Extended `site_smoke`: `check_graph` data-contract, `extra_javascript` allowlist flip + `hooks:`/`graph.md`/`graph.js` presence, built `/graph/` + landing-card assertions, `--root` graph negatives, new fragile areas + browser QA mission. |
| decisions | `v0006` | Four ADRs — hooks-module data-generation mechanism, node/edge model (tags-as-nodes, project-as-color, dead-link ghosts, `docs/current` exclusion), project-ink data-viz-only accent extension, hand-rolled vendored renderer over d3-force. |

## 4. Verdict + reasoning

**PASS.** Every validation command re-ran green from a clean pinned build; the shipped
feature meets the objective and the confirmed intent; every binding constraint
(no `nav:`/`strict:`, `font: false`, pin parity, append-only §10, no CDN/new-webfonts/
`/Users/`, `docs/current`+`versions` untouched, single-slice guard flip) holds; and the
only open items are the four deliberately-deferred/owed ones the plan pre-cleared as
non-defects. No code defect surfaced, so the phase's durable docs were consolidated into
seven new versions. The one owed follow-up is **operator browser visual QA** of the map.

### Verification commands the orchestrator can re-run
- `.../p6venv/bin/mkdocs build -f mkdocs.yml` then `.../p6venv/bin/python3 scripts/site_smoke.py` → PASS
- `python3 scripts/workflow.py validate` → passed
- `python3 scripts/workflow.py docs` → seven P6 versions latest
