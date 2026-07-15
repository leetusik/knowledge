# P6.S1 result — Graph data pipeline + data-contract guard

Status: **done**. The build-time graph-data pipeline landed exactly per `plan.md`: a
mkdocs hooks module emits a deterministic, publish-safe `graph.json` into the built
site, and `site_smoke.py` now locks its shape. No JS, no `extra_javascript`, no page —
the tree is green exactly as before (guard PASS). The JS guard-flip is S2; landing +
serve-parity is S3.

## What landed

- **NEW `scripts/graph_hook.py`** (~135 lines, PyYAML-only — does **not** import `server/*`).
  - `on_files(files, config)`: **reassigns** (never mutates in place) a module-level
    `{src_uri: File.url}` map for every `.md` page, then returns `files` unchanged. The
    reassign is load-bearing under `mkdocs serve`: each rebuild starts from a clean map,
    so a renamed/removed page can't leave a stale URL behind.
  - `on_post_build(config)`: walks `config["docs_dir"]`, applies the node-selection rule,
    parses frontmatter itself (`yaml.safe_load` on the block between the leading `---`
    fences; malformed/missing frontmatter → skip), builds `{version, projects, nodes,
    edges}`, and writes `graph.json` to `config["site_dir"]` (never into `docs/` → no
    serve watch-rebuild loop). Fetchable at `<site>/graph.json`, like
    `site/search/search_index.json`.
  - **Node selection** (discriminator, no hard-coded project list): a doc node is any
    `docs/**/*.md` whose frontmatter carries `source` as a **mapping containing `project`**
    (the /explain contract). `docs/current/*` and `docs/versions/*` carry `source` as a
    plain string, so they're excluded naturally; reserved dirs
    `{current, versions, stylesheets, assets, javascripts}` and file names
    `{index.md, tags.md, README.md}` are skipped belt-and-braces. Today → exactly the 6 explainers.

- **EDIT `mkdocs.yml`**: added a top-level `hooks:` block-list (`- scripts/graph_hook.py`)
  with a load-bearing comment in the file's established block-comment style, placed right
  after `extra_css`. Used the block-list form (not the inline `[...]`) to match the file's
  established style (`extra_css`, `plugins`, `features` are all block lists) — `site_smoke`
  accepts either. Touched nothing else: `nav:`/`strict:` still absent, `theme.font: false`,
  search `lang: [en, ko]`, `exclude_docs`, pin all unchanged.

- **EDIT `scripts/site_smoke.py`** (additive only, still stdlib-only):
  - `check_source`: asserts `mkdocs.yml` has a `hooks:` key that references
    `scripts/graph_hook.py`, and that the file exists on disk. The pre-existing
    `extra_javascript:`-forbidden assertion is untouched.
  - New `check_graph(root, failures)`, called from `main` after `check_built`: `site/graph.json`
    exists; no `/Users/` in the raw file; valid JSON; `version == 1`; `projects`/`nodes`/`edges`
    are lists; node ids unique; every node has `id`/`type`/`title` and `type` ∈ `{doc, tag,
    missing}`; every doc node has `url`/`date`/`project`/`tags`/`degree`; every edge has
    `kind` ∈ `{related, tag}` and **both endpoints resolve to node ids**; `projects` doc
    counts sum == doc-node count; and **doc-node count == filesystem count** of `docs/*/*.md`
    at depth 2, excluding `index.md` and reserved dirs (self-adapts to new docs/projects).
  - All checks respect `--root` (doctored-copy negative-test support).

`site/graph.json` is untracked build output (gitignored) — not committed.

## Emitted schema (real, trimmed sample from `site/graph.json`)

Top level is `{version:1, projects, nodes, edges}`; serialized
`json.dumps(..., ensure_ascii=False, indent=2, sort_keys=True)` + trailing newline
(so keys sort alphabetically inside every object — field order below reflects that):

```json
{
  "version": 1,
  "projects": [
    { "docs": 4, "name": "changple5" },
    { "docs": 1, "name": "bootstrap_agentic_workspace.sh" },
    { "docs": 1, "name": "hi2vi_web" }
  ],
  "nodes": [
    {
      "date": "2026-07-07",
      "degree": 8,
      "id": "changple5/2026-07-07-the-p35-agent-refactor-explained-for-beginners.md",
      "project": "changple5",
      "tags": ["refactoring", "dead-code", "fastapi", "sse", "performance"],
      "title": "The P35 Agent Refactor — Explained for Beginners",
      "type": "doc",
      "url": "changple5/2026-07-07-the-p35-agent-refactor-explained-for-beginners/"
    },
    { "degree": 1, "id": "tag:agent-skills", "title": "agent-skills", "type": "tag" }
  ],
  "edges": [
    {
      "kind": "related",
      "source": "changple5/2026-07-07-the-p35-agent-refactor-explained-for-beginners.md",
      "target": "changple5/2026-07-07-the-prompt-injection-defense-p26-explained-for-beginners.md"
    },
    {
      "kind": "tag",
      "source": "bootstrap_agentic_workspace.sh/2026-07-02-how-explain-saves-documents-now-the-p6-api-rewire-explained.md",
      "target": "tag:agent-skills"
    }
  ]
}
```

Field reference (as emitted):
- **projects** `[{name, docs}]`, ordered (doc-count desc, name asc). The S2 renderer
  assigns ink `i % 3` in this exact order; the legend reads `docs` counts from here.
- **doc node** `{id, type:"doc", title, url, date, project, tags, degree}`. `id` = repo-
  relative path under `docs/` exactly as `related:` entries write it (e.g.
  `changple5/…-p35-….md`). `url` = mkdocs-computed `File.url` (directory-style, e.g.
  `changple5/…-p35-…/`, site-root-relative, **no leading slash**). `date` = ISO string
  (PyYAML parses unquoted dates to `datetime.date`; the hook `str()`s them).
- **tag node** `{id:"tag:<t>", type:"tag", title:<t>, degree}` — **no `url`** (hubs, not links).
- **missing/ghost node** `{id:<raw target path>, type:"missing", title:<raw target path>, degree}`
  — no `url`; emitted only for an unresolved `related:` target.
- **edge** `{source, target, kind}` (+ `"broken": true` on an unresolved `related` edge).
  `related` is directed as authored; `tag` connects doc ↔ `tag:<t>`. Self-refs and
  duplicate `related:` entries are dropped.
- **degree** = incident edge count over the emitted edge list (drives the S2 r 6→14px ramp).

## Verification evidence (steps 1–6, all green)

1. **CI-parity build** — throwaway venv in scratchpad, `pip install mkdocs-material==9.7.6`
   (→ mkdocs 1.6.1), `mkdocs build` at repo root: built in 0.33s, `site/graph.json` emitted
   (11518 bytes). (The red "MkDocs 2.0" banner is Material's own advisory, not a build error.)
2. **`python3 scripts/site_smoke.py`** → `PASS — all site invariants hold`. Exit 0.
3. **Determinism** — copied `graph.json`, rebuilt, `cmp` → **byte-identical**.
4. **Sanity read** — matches the plan's expected values exactly:
   `projects` = [changple5:4, bootstrap_agentic_workspace.sh:1, hi2vi_web:1] (count desc,
   name asc); **6 doc + 26 tag = 32 nodes**; **3 `related` + 27 `tag` = 30 edges**;
   0 broken, 0 ghost; the P35 doc has `related` → P39 (measure-first) + P26 (prompt-injection)
   and 5 tag edges (degree 8 = 2 out + 1 in + 5 tags); all doc URLs directory-style with no
   leading slash; the em-dash in titles is emitted literally (no `—`), confirming
   `ensure_ascii=False`; **no `/Users/`** anywhere in the file.
5. **Two negatives** (copied tree + `--root`, in scratchpad):
   - Delete `graph.json` from the copy → guard **FAILs** with exactly one violation:
     `site/graph.json missing (graph_hook.py did not emit it)` (the copy is otherwise green,
     so the new assertion is the one that fires).
   - Doctor one `related:` target to a nonexistent path and rebuild against the copy → a
     `"broken": true` `related` edge **and** a `type:"missing"` ghost node (id/title = the raw
     path, degree 1) appear; the ghost makes the broken edge's endpoint resolve, and
     `site_smoke --root` still **PASSes** — a dead link is data, never a build error.
6. **`python3 scripts/workflow.py validate`** → `Workflow validation passed`. Exit 0.

## Deviations from `plan.md`

- **`hooks:` written as a YAML block-list, not the inline `[scripts/graph_hook.py]` the plan
  shows.** The plan also says "in the file's established style"; every other list key in
  `mkdocs.yml` (`extra_css`, `plugins`, `features`) is a block list, so block form is the
  consistent choice. Functionally identical to mkdocs, and `check_source` accepts either
  form (`^hooks:` present + `scripts/graph_hook.py` referenced).
- **`check_graph` also scans the raw `graph.json` for `/Users/`** (plan lists this; noting it
  explicitly because the pre-existing leak scan in `check_built` covers only `*.html`).

Otherwise implemented as specified; no other deviations.

## Notes for S2 (renderer)

- **Data contract is locked and emitted** — the trimmed sample above is the real shape. S2
  builds the renderer against `<site>/graph.json` (fetch at runtime). The projects list
  order is the ink-assignment order (`i % 3`); the legend reads `docs` counts from it.
- **Today's corpus is sparse**: 3 `related` edges form one 3-doc changple5 cluster; the map's
  connective tissue is the 27 tag spokes to 26 tag nodes (`performance` is the only shared
  tag, P39+P35). Expect a hub-and-spoke look, not a dense mesh — the tag-visibility toggle
  (design bottom-left) matters for legibility.
- **`degree` is precomputed** over the emitted edge list — S2 can drive the r 6→14px ramp
  directly, no client-side counting.
- **Ghosts/broken are already modelled** but empty today (0 broken, 0 ghost). Negative-test
  proof shows the exact shape S2's info panel must handle: a `missing` node whose `title` is
  the raw path, reached by a `related` edge carrying `"broken": true`.
- **Serve behavior**: the hook emits under `mkdocs build` (verified). It is designed to also
  emit under `mkdocs serve` — writes to `site_dir` (a temp dir under serve, never `docs/` →
  no watch loop) and reassigns the URL map each `on_files` — but **live-`serve` parity was not
  exercised here** (that's S3's explicit job per the decomposition). If S2 needs a live server,
  confirm `graph.json` shows up under the serve `site_dir` before relying on it.
- **`extra_javascript` is still absent and guard-enforced** — S2 must add its vendored (no-CDN)
  entries *and* flip the `extra_javascript:`-forbidden assertion in `site_smoke.py` **in the
  same slice**, preserving no-CDN + no-`/Users/`-leak.
