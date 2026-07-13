# P6.S1 — Graph data pipeline + data-contract guard (orchestrator plan, auto mode)

## Context

First implementation slice of the P6 knowledge graph. S1 ships the **build-time graph data**: a mkdocs hook that emits `graph.json` into the built site, plus additive `site_smoke.py` assertions locking that data contract. No JS, no `extra_javascript`, no page — the tree stays green exactly as today (the JS guard-flip is S2; landing/serve-parity is S3). Risk `medium` → `slice-executor-mid`.

The design co-work (P6.S0) is closed and locked — see `phase.md` → "Design guide (P6.S0, locked)". Its only data-contract impact here: `graph.json` carries a top-level **`projects` list** (legend counts + deterministic project→ink assignment). The planned node fields already cover the info panel, legend, and degree-sizing needs.

## Decisions (finalized here)

1. **Mechanism**: mkdocs `hooks:` module at **`scripts/graph_hook.py`** (path relative to `mkdocs.yml`; resolves in CI, a local venv, and the compose image at `/docs`). Runs inside both `mkdocs build` and `mkdocs serve` → **zero `pages.yml` changes** (CI already runs `mkdocs build` then `site_smoke.py`).
2. **Where the JSON lands**: written in `on_post_build` to `Path(config["site_dir"]) / "graph.json"` → `site/graph.json` in CI, the temp `site_dir` under serve. **Never write into `docs/`** (serve watch-rebuild loop). Fetchable at `<site>/graph.json`, like `site/search/search_index.json`.
3. **Node selection rule** (discriminator, no hard-coded project list): a doc node is any `docs/**/*.md` whose YAML frontmatter has `source` as a **mapping containing `project`** (the /explain contract — `docs/current/*` and `docs/versions/*` carry `source` as a plain string, so they're excluded naturally). Belt-and-braces: skip reserved dirs `current/`, `versions/`, and `index.md`/`tags.md`/`README.md`. Today → exactly the 6 explainers.
4. **Schema** (top-level `{version: 1, projects, nodes, edges}`):
   - `projects`: `[{name, docs}]` ordered by **(doc count desc, name asc)** — deterministic; the S2 renderer assigns ink `i % 3` in this order and the legend reads counts from it.
   - Doc node: `{id, type: "doc", title, url, date, project, tags, degree}` — `id` = repo-relative path under `docs/` exactly as `related:` entries write it (e.g. `changple5/2026-07-07-….md`); `url` = the mkdocs-computed `File.url` collected in `on_files` (`use_directory_urls` default → `changple5/…/`), site-root-relative, no leading slash; `date` stringified ISO (**PyYAML parses unquoted dates to `datetime.date` — `str()` it**).
   - Tag node: `{id: "tag:<tag>", type: "tag", title: <tag>, degree}` — no `url` (design: tag nodes are hubs, not links).
   - Missing node (dead `related:` target — the design's ghost): `{id: <raw target path>, type: "missing", title: <raw target path>, degree}` — no `url`.
   - Edge: `{source, target, kind: "related"|"tag"}`; `related` directed as authored, `broken: true` when the target didn't resolve (a ghost node is emitted so every endpoint always resolves). Self-references and duplicate `related:` entries dropped. Doc–tag edges connect doc ↔ `tag:<t>`.
   - `degree` = incident edge count over the emitted edge list (drives node sizing per the design's r 6→14px ramp).
   - Expected today: `projects` = [changple5:4, bootstrap_agentic_workspace.sh:1, hi2vi_web:1] (count desc, name asc), 6 doc + 26 tag nodes, 3 `related` edges (all resolve — 0 broken, 0 ghosts), ~27 tag edges.
5. **Determinism & publish-safety**: nodes sorted by `(type, id)`, edges by `(kind, source, target)`; `json.dumps(..., ensure_ascii=False, indent=2, sort_keys=True)` + trailing newline; **no timestamps**; two consecutive builds → byte-identical `graph.json`. All ids/urls repo-relative — `/Users/` must never appear.

## Implementation

**NEW `scripts/graph_hook.py`** (~120 lines; PyYAML via mkdocs — do **not** import the `server` package):
- `on_files(files, config)`: REASSIGN (never append — serve rebuilds reuse the module) a module-level `{src_uri: file.url}` map for `.md` files; return files unchanged.
- `on_post_build(config)`: walk `config["docs_dir"]`, apply the node-selection rule, parse frontmatter with `yaml.safe_load` (frontmatter = the block between leading `---` fences; skip files with malformed/missing frontmatter), build projects/nodes/edges per the schema, write `graph.json` to `config["site_dir"]`.
- Docstring states the contract: what it emits, determinism, publish-safety, and that `site_smoke.py` asserts the shape.

**EDIT `mkdocs.yml`**: add `hooks: [scripts/graph_hook.py]` with a load-bearing comment in the file's established style (P6.S1: emits the knowledge-graph data at build time, serve + CI; no `extra_javascript` here — that's P6.S2's flip). Must not touch `nav:`/`strict:`/`font:`/search/`exclude_docs`.

**EDIT `scripts/site_smoke.py`** (additive only; stays stdlib-only — the doc-count check is a filesystem heuristic, not YAML):
- `check_source`: assert `hooks:` lists `scripts/graph_hook.py` and that the file exists. The existing `extra_javascript:`-forbidden assertion stays untouched.
- New `check_graph(root, failures)` called from `main`: `site/graph.json` exists; valid JSON; `version == 1`; `projects`/`nodes`/`edges` lists; node ids unique; every node has `id/type/title`, `type` in `{doc, tag, missing}`; every doc node has `url/date/project/tags/degree`; every edge has `kind` in `{related, tag}` and both endpoints resolve to node ids; `projects` doc counts sum == doc-node count; raw file contains no `/Users/` (the existing leak scan covers only `*.html`); **doc-node count == filesystem count** of `docs/*/*.md` at depth 2, excluding `index.md` and reserved dirs `{current, versions, stylesheets, assets, javascripts}` (self-adapts to new docs and new projects; `javascripts` future-proofs S2's vendored dir). Today = 6.
- All checks respect `--root` (doctored-copy negative-test support).

**`phase.md`** (at slice end): append cross-slice notes (the final emitted schema for S2, the hook's serve behavior) and Doc-impact one-liners — `operations` (mkdocs hooks mechanism in the build), `qa` (graph.json smoke assertions), `data` or `architecture` (build-time graph data contract), `decisions` (ADR: hooks-module mechanism + node/edge model). No `doc-new-version` (REVIEW consolidates).

## Verification (lean — the guard is the durable test)

1. Build exactly as CI does: throwaway venv in the scratchpad (`python3 -m venv … && pip install mkdocs-material==9.7.6`) → `mkdocs build` at repo root. Fallback if venv/network unavailable: `docker compose run --rm kb build`.
2. `python3 scripts/site_smoke.py` → PASS.
3. Determinism: copy `site/graph.json`, rebuild, `cmp` → byte-identical.
4. Sanity-read `site/graph.json`: projects [changple5:4, bootstrap…:1, hi2vi_web:1]; 6 doc + 26 tag nodes; 3 `related` edges, 0 `broken`; the P35 doc shows `related` to the P39 + P26 docs and 5 tag edges; URLs directory-style, no leading slash; Korean readable (ensure_ascii=False).
5. One negative check (copy tree + `--root`): delete `graph.json` from the copy → guard FAILs on the new assertion; also doctor one `related:` entry to a nonexistent path in the copy, rebuild against it (or hand-edit the copied graph.json consistently) → ghost node + `broken: true` edge appear. Keep it small — two focused negatives, no suite.
6. `python3 scripts/workflow.py validate`.

## Executor contract (slice-executor-mid)

- Allowed: create `scripts/graph_hook.py`; edit `mkdocs.yml` (hooks key + comment only) and `scripts/site_smoke.py` (additive); scratchpad venv/build artifacts (`site/` is untracked); write this slice's `result.md`; append to `phase.md`.
- Not allowed: `extra_javascript`, any `docs/` content changes, `docs/graph.md`, landing edits, `pages.yml`/`compose.yml` changes, importing `server/*` in the hook, `doc-new-version`, commits, status transitions, other slices' files.
- If the hooks mechanism fundamentally can't work as specced (e.g. hooks don't fire in the pinned image/CI), return `escalate` with findings rather than switching mechanisms unilaterally.
- Before returning: verification steps 1–6 green; return the structured verdict (`done`/`needs_operator`/`blocked`/`escalate` + summary + notes).
