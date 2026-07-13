# P6.REVIEW — Phase review (orchestrator plan, auto mode)

## Context

Phase P6 shipped in four slices: **S0** design co-work (Claude Design guide, locked + mirrored), **S1** build-time `graph.json` pipeline + data-contract guard, **S2** vendored interactive renderer + full-bleed page + JS guard flip, **S3** landing entry + serve-parity proof + entry guard. Executed by `slice-executor-high`. The review validates the whole phase together, judges it against the objective/intent, and — only on a passing verdict — consolidates the phase's Doc-impact notes into new durable-doc versions. The orchestrator records the verdict with `review-phase` afterward (the executor never transitions status).

## 1. Validate all slices together (re-run, don't trust per-slice greens)

From a clean `site/` (delete it first), in a pinned venv (`pip install mkdocs-material==9.7.6`):
- `mkdocs build` → succeeds; `site/graph.json`, `site/graph/index.html`, `site/javascripts/graph.js` present.
- `python3 scripts/site_smoke.py` → PASS (this now carries S1+S2+S3's full assertion set: hooks wiring, graph.json contract, JS allowlist, built graph page, landing card link, plus all P5 invariants).
- Determinism: build twice, `cmp` the two `graph.json`s.
- `node --check docs/javascripts/graph.js` (node is available: v24).
- Spot the guard's teeth with one `--root` negative of your choice (e.g. drop `extra_javascript:` in a copied tree → FAIL).
- Serve parity: the operator's compose `kb` server is (likely still) up at `http://localhost:8765/knowledge/` — re-curl `graph.json` (200, version 1, 6 doc nodes) and `/graph/` (200, mount + script). If the server is down, skip with a note (S3's evidence stands); do not start/stop the operator's services for this.
- Sanity-read `site/graph.json` against the corpus: 6 doc + 26 tag nodes, 3 related (0 broken) + 27 tag edges, projects [changple5:4, bootstrap_agentic_workspace.sh:1, hi2vi_web:1].
- `python3 scripts/workflow.py validate`.

## 2. Review against objective, intent, and constraints

- `intent.md` / `phase.md` objective: interactive Obsidian-like knowledge map — docs as nodes, links/tags as edges — client-side on the static Pages site, hosting unchanged, design per the locked P6.S0 guide. Confirm each element demonstrably exists in the shipped artifacts.
- Cross-cutting checks: `git log --oneline` P6 range + `git diff 15d1768..HEAD` scoped sanity — `mkdocs.yml` gained exactly `hooks:` + `extra_javascript:` blocks (no `nav:`/`strict:`, `font: false` intact, pins untouched); `extra.css` change is append-only §10 (no §1–§9 token edits); no CDN URLs, no new webfonts, no `/Users/` in any shipped artifact; `docs/current/` + `docs/versions/` untouched by S0–S3; the P4 `related:` convention consumed unchanged; nothing precludes P7 plugin packaging (machinery self-contained in `scripts/` + `docs/javascripts/`) or SaaS-someday.
- Known, deliberately-open items (NOT defects): browser visual QA owed to the operator post-deploy (no browser in this harness); graph-page footer sits below the viewport-height map (flagged, operator to opine); Strategy-C label ladder deferred past ~50 docs; `docs/current` nodes excluded from v1 by design.

## 3. On a passing review only — consolidate durable docs

`phase.md` → "## Doc impact" lists the phase's durable-truth changes across S0–S3. Consolidate into **7 new doc versions** via `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source P6.REVIEW` (the review slice is the only slice allowed to run this): `architecture`, `data`, `frontend`, `experience`, `operations`, `qa`, `decisions`. Mechanics per the contract: never patch old files under `docs/versions/`; never hand-edit `docs/current/*` (regenerated); write each new version as the full updated doc (read the current version, integrate the phase's truths — the graph data pipeline + hooks mechanism, the graph.json contract, the renderer/page/§10 design integration, the map journey, the flipped+extended guard invariants, and the phase's ADRs: hooks-module mechanism, node/edge model incl. tags-as-nodes + docs/current exclusion + ghost semantics, project-ink data-viz accent extension, hand-rolled vendored renderer). Then `rebuild-docs` if the tooling requires it and `python3 scripts/workflow.py validate` + `python3 scripts/workflow.py docs` to confirm the index picked the new versions up.

## 4. Deliverables

- `works/phases/active/P6/slices/P6.REVIEW/result.md`: the review report — validation matrix (what ran, actual outcomes), objective/intent conformance, cross-cutting findings, the doc versions created, and the explicit review verdict with reasoning.
- `phase.md`: append a short review-summary note (verdict + owed operator follow-ups).
- Return `review_verdict: pass | changes_requested | blocked`. If `changes_requested`: do NOT create fix slices or run doc-new-version — list the concrete proposed fix slices (name, kind fix, what/why) for the orchestrator to create.

## Executor contract (slice-executor-high)

- Allowed: read everything; venv/scratchpad builds + `--root` doctored copies; curls against the already-running local server (no start/stop of operator services); `doc-new-version` + new version files under `docs/versions/` + `rebuild-docs` (docs only, never source); write this slice's `result.md`; append to `phase.md`.
- Not allowed: any change to source (`scripts/`, `docs/javascripts/`, `docs/graph.md`, `docs/index.md`, `docs/stylesheets/`, `mkdocs.yml`, `server/`, CI, compose); hand-editing `docs/current/*` or old `docs/versions/*`; creating slices; commits; status transitions (`review-phase` is the orchestrator's).
- A defect found during validation → verdict `changes_requested` with proposed fix slices; environmental impossibility → `blocked`.
