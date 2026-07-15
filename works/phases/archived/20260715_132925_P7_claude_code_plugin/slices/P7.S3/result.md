# Result — P7.S3: Template payload, renderer, parity guard

Status: **done**. The phase's crux acceptance holds: a scaffold rendered with
NON-operator test params builds under `mkdocs-material:9.7.6` and passes its own
(now-portable, S1) `site_smoke.py` deploy gate; the parity guard is green against
this repo; both negative parity tests and all renderer guards fire as designed.

## What landed

### 1. `plugin/templates/kb/` — the scaffold tree (35 files)
Mirrors the target repo layout path-for-path. Populated per the 3 file classes
below. Byte-identical files copied verbatim from repo root; parameterized +
template-only carry `{{KB_*}}` tokens.

### 2. `plugin/templates/manifest.json` — the ONE class declaration
Single source of truth both `render.py` and `plugin_parity.py` read: the
`placeholders` catalogue, the three `files` classes, `shipped_dirs` (the
completeness set), and `seed_project: "getting-started"`.

### 3. `plugin/setup/render.py` — ONE stdlib renderer
`argparse/json/re/shutil/pathlib/sys` only. CLI:
`--dest <dir> (--params <file.json> | --set KEY=VALUE ...) [--force]`; `--set`
overrides `--params`. Resolves templates from its own location, so it runs from
any CWD. Exposes `render(dest, params, force)` + `RenderError` for import by the
parity guard. Validates BEFORE writing (missing token / typo'd param / missing
manifest source), then post-write scans the whole tree for a leftover `{{KB_`.

### 4. `plugin/templates/params.operator.json`
The operator's real, already-public values — feeds parity AND doubles as the
reference example. Round-trips the parameterized files byte-exactly vs root.

### 5. `scripts/plugin_parity.py` — root-only drift guard (NOT shipped)
Imports `render.py`, renders the whole tree with `params.operator.json` into a
temp dir. identical → byte-compare `templates/kb/<p>` vs `<repo>/<p>`;
parameterized → byte-compare rendered temp vs root; template-only → skipped.
Completeness rule globs both sides of every `shipped_dirs` entry (`server`,
`tests`, `docs/assets|stylesheets|javascripts`) and fails on any file in one side
but not the other (excludes `__pycache__`/`.pyc`) — closes the silent-drift hole.

### 6. `.github/workflows/plugin-ci.yml` — root-only "plugin parity" gate
`push:main` + `workflow_dispatch`; checkout, setup-python 3.12,
`python3 scripts/plugin_parity.py`. No mkdocs build (pages.yml already gates
deploys), no claude CLI. This is a NEW workflow — `pages.yml` is untouched and
stays a portable shipped template.

## Final file-class decisions

Baseline from `phase.md` Findings adopted with **no reclassifications**.

- **identical** (28 files, byte-copied, parity = direct byte-compare): all 9
  `server/*`, `scripts/graph_hook.py`, `scripts/site_smoke.py`, the 6 `tests/*`,
  `docs/graph.md`, `docs/tags.md`, `docs/assets/{favicon,logo}.svg`,
  `docs/stylesheets/extra.css`, `docs/javascripts/graph.js`, `Dockerfile`,
  `pyproject.toml`, `uv.lock`, `.dockerignore`, `.github/workflows/pages.yml`.
  - `pyproject.toml` verified operator-agnostic (`name = "kb-api"`, generic
    description, no personal fields) → classified identical as-is.
  - `.dockerignore` ships with its trailing `plugin/` line (S2) — a harmless
    no-op in a scaffold; kept identical.
  - `Dockerfile` ships with the S1 uv pin `0.8.14`.
- **parameterized** (2 files, `{{KB_*}}`; parity = render-with-operator →
  byte-compare vs root): `mkdocs.yml` (site_name/site_url/copyright, lines 1–3
  only) and `compose.yml` (viewer port, api port, TZ). Tokenized by exact
  full-line replacement so the operator values round-trip BYTE-EXACTLY — the
  unquoted Korean copyright line rebuilds identically because substitution is
  raw-string, not YAML re-serialization.
- **template-only** (5 files, rendered but NOT parity-compared): `docs/index.md`
  (generic hero + `<!-- explain:recent -->` marker + one seed bullet + Browse
  grid with the required `.kb-card href="graph/"`), `docs/getting-started/index.md`,
  `docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md` (seed
  welcome explainer — a real house-style micro-explainer about the KB itself),
  generic `Makefile` (no Tailscale/macOS; targets dev/down/logs/test/build-site/
  smoke; local URL is `localhost:{{KB_VIEWER_PORT}}/` at ROOT, fixing the operator
  Makefile's `/knowledge/` bug per Findings §2), generic `.gitignore` (root's +
  `.env`).

**Placeholder set (final, 7):** `KB_SITE_NAME`, `KB_SITE_URL`, `KB_COPYRIGHT`
(mkdocs.yml); `KB_TZ`, `KB_VIEWER_PORT`, `KB_API_PORT` (compose.yml + Makefile);
`KB_DATE` (index.md bullet + seed-doc filename + seed-doc frontmatter). All 7 are
referenced by ≥1 template, so the typo guard reports zero unused keys.

**Seed project name:** `getting-started`. Chosen so a brand-new KB satisfies the
S1 `discover_projects` rule (one non-reserved `docs/` subdir with ≥1 dated doc).

**Path-token design:** the dated seed explainer embeds `{{KB_DATE}}` in its
committed template filename; `render.py` substitutes tokens in the destination
relative path (for every class — a no-op for the token-free identical/parameterized
files), so the rendered filename, the frontmatter `date`, and the `index.md`
Recent-bullet link all carry the same date and the link resolves.

## Validation (all run; all green)

| # | Command | Outcome |
|---|---------|---------|
| 1 | `python3 scripts/plugin_parity.py` | PASS (green on this repo) |
| 2a | `docker run --rm -v <scaffold>:/docs squidfunk/mkdocs-material:9.7.6 build` (NON-operator params: site "Field Notes", TZ America/New_York, ports 9765/9766, date 2025-01-15) | built in 0.19s, exit 0 |
| 2b | `python3 <scaffold>/scripts/site_smoke.py --root <scaffold>` | **PASS — all site invariants hold** (crux acceptance); graph.json = 1 doc node + 4 tag nodes + 4 edges, no `/Users/` leak |
| 3 | Negative parity (byte-drift): append a byte to `templates/kb/server/config.py` | `FAIL … [identical] byte drift: server/config.py`; restored (cp from root) → PASS |
| 4 | Negative completeness: create `server/_tmp_parity_probe.py` | `FAIL … [completeness] in repo but not shipped: server/_tmp_parity_probe.py`; deleted → PASS |
| 5a | render with a params file missing `KB_TZ` | `error: missing value(s) for template token(s): KB_TZ` (exit 2) |
| 5b | `--set TYPO_KEY=x` | `error: param key(s) match no template token (typo?): TYPO_KEY` (exit 2) |
| 5c | `--set KB_SITE_NAME=Overridden` into empty dest | exit 0; `site_name: Overridden` (override wins) |
| 5d | re-render into the now non-empty dest without `--force` | `error: destination is not empty` (exit 2) |
| 6 | `uv run python -c "import yaml; yaml.safe_load(open('.github/workflows/plugin-ci.yml'))"` | OK (default host python3 lacks PyYAML; used the repo's uv env — see Deviations) |
| 7 | `python3 -m json.tool` on `manifest.json` + `params.operator.json` | both OK |
| 8 | `python3 scripts/workflow.py validate` | Workflow validation passed |

## Deviations from plan.md

- **Validation #6 (YAML load):** the plan said "PyYAML is available to the repo
  tooling", but the default host `python3` has no `yaml` module. Ran the exact
  check through the repo's uv environment (`uv run python -c "import yaml; …"`),
  where PyYAML (a `pyproject.toml` dependency) resolves — it loaded the workflow
  cleanly. No change to the deliverable; only the interpreter used for that one
  check. (`plugin_parity.py`, `site_smoke.py`, and `render.py` are all stdlib-only
  and run under the bare host `python3`.)
- No other deviations. `plugin.json` version left at `0.1.0` as instructed.

## Notes for downstream slices

- **S5 (setup skill)** drives `render.py` exactly as: `python3
  ${CLAUDE_PLUGIN_ROOT}/setup/render.py --dest <target> --set KB_SITE_NAME=… …`
  (or `--params <file>`). All 7 tokens are required together; `--force` re-renders
  an existing dir. `render()` is importable and raises `RenderError`. The manifest
  carries `seed_project` + a `placeholders` catalogue S5 can surface in its UX.
- **S6 (E2E)** can reuse this exact acceptance: render → `mkdocs build` →
  `site_smoke.py --root <scaffold>`. Any `plugin/**` change must keep
  `scripts/plugin_parity.py` green (and pairs with a `plugin.json` version bump).
