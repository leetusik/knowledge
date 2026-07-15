# P6.DECOMP — Result

Decomposition slice for phase P6 ("Obsidian-like knowledge graph"), executed by `slice-executor-high`. Created the phase's three middle slices (bare folders only), verified the DECOMP plan's findings against the repo, and seeded `phase.md` (Decomposition, Findings & Notes, Constraints, Open Questions).

## What I created

Three bare middle-slice folders via `new-slice` (each contains only `slice.json`; no `plan.md` pre-filled):

| Slice | Name | kind | risk | order |
|-------|------|------|------|-------|
| P6.S1 | Graph data pipeline + data-contract guard | implementation | medium | 1 |
| P6.S2 | Interactive graph renderer, full-canvas page + JS guard flip | implementation | high | 2 |
| P6.S3 | Landing entry point + serve parity + ops hygiene | implementation | medium | 3 |

Rationale, per-slice risk reasoning, findings, constraints, and open decisions are all recorded in `works/phases/active/P6/phase.md`.

## Verification done (spot-checks, not re-derivation)

Every load-bearing claim in `plan.md` was confirmed against the repo:
- **Frontmatter shape**: read changple5 P39/P35 + hi2vi_web docs — `title`, `date`, `tags`, optional `related` (repo-relative `.md` paths), `source: {project, repo}`. Confirmed.
- **Edges**: exactly 3 directed `related:` edges (P39→P35; P35→P39 + P35→P26). The other 4 explainers have no `related:`. Confirmed.
- **Tags**: 26 distinct, only `performance` repeats (P39 + P35). Confirmed by inventory.
- **Projects**: 3 dir groupings, hard-coded as `PROJECTS` in `site_smoke.py`. Confirmed.
- **`docs/current/*.md`**: 11 durable docs with a different frontmatter class (`doc_id/version/...`, no tags/related). Confirmed.
- **`mkdocs.yml`**: no `nav:`/`strict:`/`hooks:`/`extra_javascript:`; `extra_css` present; `exclude_docs` = `/versions/` + `/README.md`; `theme.font: false`. Confirmed.
- **`site_smoke.py`**: fails on `extra_javascript:` present, CDN `<script src="http…">`, `/Users/` leak, hero/`#recent`/`#__search` DOM invariants, pin parity, `site/versions/` regression. Confirmed by reading the guard.
- **API groundwork**: `server/main.py` has `/api/tags` + `/api/projects` (DB-backed, local-only); `server/documents.py` has `parse_frontmatter` (PyYAML). Confirmed. Browser-only Pages site + CI-with-no-DB → graph data must be a build-time static asset, not from the API.
- **Tier mapping**: `executors.toml` all defaults → `flex` (low=sonnet, mid/high=opus). Confirmed.

## Key decisions recorded (direction-setting; each slice's plan finalizes)

- **Node/edge model**: docs + **tags as first-class nodes** (sparse `related:` alone → near-empty map), project as node color/group, `related:` directed + doc–tag undirected edges, build-time backlink inversion, dead-edge flagging as data. **`docs/current/*.md` excluded from v1** (isolated islands; different content class).
- **Graph-JSON mechanism**: lean **mkdocs `hooks:` module** (works in both `mkdocs serve` and CI) over a standalone `scripts/build_graph.py` CI step. Do **not** import `server/documents.py` into the build.
- **Renderer direction**: lean **`d3-force` (~25 KB, MIT) + custom canvas**, vendored (no CDN).

## Deviation from the plan's candidate breakdown

The plan's candidate pooled all guard/CI work into S3 ("Guard, CI & entry-point integration"). I reassigned the guard responsibilities to the slices that cause them, because `site_smoke.py` fails the build the instant `extra_javascript:` appears in `mkdocs.yml` — so the JS guard-flip must be in the same slice that adds `extra_javascript` (S2, per the phase constraint), and the cleanest seam puts the `graph.json` shape guard with its producer (S1). S3 is therefore pure integration: landing entry-point card + `mkdocs serve` parity + ops hygiene. This keeps each slice's committed state green (site_smoke passing). Slice count (3) and the S1/S2/S3 shape otherwise match the plan.

## For the orchestrator planning P6.S1

- S1 owns the data contract the whole phase rests on — worth planning tightly. Its deliverable is the build-time `graph.json` emitter (lean: mkdocs `hooks:` module) **plus** additive `graph.json` presence/shape assertions in `site_smoke.py` (no `extra_javascript` yet, so the tree stays green after S1).
- Finalize in S1's plan: (a) the hooks-module vs standalone-script mechanism; (b) exactly where `graph.json` is written so mkdocs copies it into `site/` verbatim (a `docs/`-tree path vs emitting in `on_post_build`); (c) the node/edge JSON schema (nodes: `title`, `url`, `date`, `tags`, `project`, `degree`; edges: `related` directed + doc–tag; backlinks via inversion; dead-edge marker); (d) determinism (stable ordering) + publish-safety (repo-relative only, no `/Users/`).
- Reuse the frontmatter *convention* but **not** the `server` package — parse with PyYAML inside the hook.
- Confirm the graph node set = 6 explainers only (exclude `docs/current/*.md` and the per-dir `index.md` section pages) unless the operator wants otherwise.

## Validation

`python3 scripts/workflow.py validate` — PASS (state integrity; the three new slices + existing DECOMP/REVIEW all consistent).
