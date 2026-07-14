# Plan — P7.S3: Template payload, renderer, parity guard

Orchestrator plan (auto run). Executor: slice-executor-high — this is the phase's crux slice; you own the detailed design within this architecture. Read `phase.md` first (Decomposition P7.S3 entry, Findings §1 — the site_smoke coupling — and the 3-file-class mapping in Findings; Constraints) and `slices/P7.DECOMP/plan.md` for the pinned plugin-format facts. S1 (portable smoke guard, pinned Dockerfile) and S2 (plugin skeleton) are done and committed. No commits, no status transitions.

## Goal

Everything a new user's KB is scaffolded FROM, plus the machinery that keeps it honest:

1. `plugin/templates/kb/` — the complete scaffold tree (mirrors the target repo layout path-for-path).
2. `plugin/setup/render.py` — ONE stdlib renderer (argparse/json/pathlib/shutil only) used by the S5 setup skill AND the parity guard.
3. `plugin/templates/params.operator.json` — the operator's real values; feeds parity AND doubles as the reference example (all values are already public in this repo — deliberate).
4. `plugin/templates/manifest.json` (or equivalent single manifest) — the ONE declaration of file classes that renderer + parity both read.
5. `scripts/plugin_parity.py` — root-only drift guard: proves the templates and the live repo cannot silently diverge.
6. `.github/workflows/plugin-ci.yml` — root-only CI gate running the parity guard (NOT `pages.yml`, which itself ships as a template and must stay portable).

Acceptance (the phase's crux): a scaffold rendered with NON-operator test params builds with mkdocs and passes its own `site_smoke.py` deploy gate; the parity guard is green against this repo.

## File classes (baseline from phase.md Findings — you own the final call per file; record changes)

- **identical** (copied byte-for-byte, NO substitution; parity = direct byte-compare template↔root): `server/*` (8 modules), `scripts/graph_hook.py`, `scripts/site_smoke.py`, `Dockerfile`, `pyproject.toml`, `uv.lock`, `.dockerignore`, `.github/workflows/pages.yml`, `docs/graph.md`, `docs/tags.md`, `docs/assets/*`, `docs/stylesheets/extra.css`, `docs/javascripts/graph.js`, `tests/*`.
  - Verify `pyproject.toml` really is operator-agnostic before classifying it identical (if it carries personal fields, genericize→reclassify and note it).
  - `.dockerignore` now ends with `plugin/` (S2) — harmless no-op in a scaffold; keep identical.
- **parameterized** (contain `{{KB_*}}` tokens; parity = render with `params.operator.json` → byte-compare vs root): `mkdocs.yml` (site_name, site_url, copyright), `compose.yml` (TZ, published ports). The operator values must round-trip BYTE-EXACTLY (mind YAML quoting around the Korean copyright string).
- **template-only** (ship + render, but NOT parity-compared — the root counterparts are operator-specific or don't exist): generic `docs/index.md` (hero + `<!-- explain:recent -->` marker + ONE seed Recent bullet + a Browse/landing card grid that includes the `.kb-card` link to `graph/`), seed project `docs/<seed-project>/index.md` + one seed welcome explainer `docs/<seed-project>/{{KB_DATE}}-<slug>.md`, generic `Makefile` (no Tailscale/macOS paths; dev targets: compose up, test, build-site, smoke; correct localhost URLs from the port tokens), generic `.gitignore` (derive from root's: `/data/`, `site/`, `__pycache__/`, `.DS_Store`, plus `.env`).

Placeholder set (final list is yours; keep `KB_` prefix): `{{KB_SITE_NAME}}`, `{{KB_SITE_URL}}`, `{{KB_COPYRIGHT}}`, `{{KB_TZ}}`, `{{KB_VIEWER_PORT}}`, `{{KB_API_PORT}}`, `{{KB_DATE}}`.

## The site_smoke coupling (phase.md Findings §1 — the scaffold MUST pass its own gate)

The seed content has to satisfy the (now-dynamic, S1) guard on a fresh scaffold:
- `check_source`: marker line present in `docs/index.md` with ≥1 `BULLET_RE`-matching bullet DIRECTLY under it (`- YYYY-MM-DD · [Title](path) — project`).
- `check_built`: rendered Recent `<li>`; the `.kb-card` anchor to `graph/`; `site/<project>/index.html` for every discovered project (⇒ the seed project dir needs its own `index.md`); zero-projects fails (⇒ exactly one seed project dir with ≥1 dated doc).
- `check_graph`: doc-node count == fs count (⇒ seed explainer has frontmatter with `source:` as a MAPPING containing `project:`, per `graph_hook.py`; give it 2–5 lowercase-kebab tags; `title` double-quoted; date matches `{{KB_DATE}}`); per-project sums must hold; publish-safety (no `/Users/` anywhere — use a repo-basename `source.repo`).
- No-CDN and the other invariants come free from the byte-identical assets.

Write the seed explainer as a REAL house-style micro-explainer about the KB itself (e.g. "How your knowledge base works") — it's the new user's first page; keep it short but convention-true.

## render.py spec

- CLI: `python3 render.py --dest <dir> (--params <file.json> | --set KEY=VALUE ...)`, `--force` to allow writing into an existing dir (default: refuse if dest exists and is non-empty). `--set` overrides file params.
- Copies the manifest's tree: identical files byte-for-byte; parameterized/template-only files with token substitution.
- Hard failures (non-zero + clear message): unknown token found in a file after substitution (leftover `{{KB_` scan over the rendered tree), missing param key, param key that matches no token anywhere (typo guard), manifest path missing from `templates/kb/`.
- Stdlib only; no third-party imports; runnable from any CWD (paths relative to the script's own location).

## plugin_parity.py spec (root-only; NOT part of the payload)

- Reads the same manifest. identical → byte-compare `plugin/templates/kb/<path>` vs `<repo>/<path>`; parameterized → render (reuse render.py via import, e.g. `importlib` from `plugin/setup/`) with `params.operator.json` into a temp dir, byte-compare vs root; template-only → skipped.
- **Completeness rule** (closes the silent-drift hole): for directories the manifest declares fully-shipped (at minimum `server/`, `tests/`, `docs/assets/`, `docs/stylesheets/`, `docs/javascripts/`), glob BOTH sides and fail on any file present in root but missing from templates, or vice versa (so a new `server/foo.py` can't silently miss the scaffold). Exclude `__pycache__`/`.pyc`.
- Output: per-file drift list; exit 0 only when fully green.

## plugin-ci.yml spec

Root-only workflow: on push to `main` + `workflow_dispatch`; checkout, setup-python 3.12, `python3 scripts/plugin_parity.py`. Keep it that lean — no claude CLI on runners, no mkdocs build here (`pages.yml` already gates deploys). Name it clearly (e.g. "plugin parity").

## Validation (run all; record outcomes)

1. `python3 scripts/plugin_parity.py` → green on this repo.
2. Render a scaffold with NON-operator test params (different site name/URL/TZ/ports) to a temp dir; then `docker run --rm -v <tmp>:/docs squidfunk/mkdocs-material:9.7.6 build` and `python3 <tmp>/scripts/site_smoke.py --root <tmp>` → PASS. (This is the phase's crux acceptance.)
3. Negative parity: perturb one byte in a template copy of an identical-class file → parity fails naming it → restore (git checkout) → green again.
4. Negative completeness: create a throwaway file in a fully-shipped root dir (e.g. `server/_tmp_parity_probe.py`) → parity fails on it → delete → green again.
5. Renderer guards: render with a params file missing one key → fails naming the token; `--set TYPO_KEY=x` → fails as unused.
6. `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/plugin-ci.yml'))"` → OK (PyYAML is available to the repo tooling).
7. `python3 -m json.tool` on the manifest and `params.operator.json` → OK.
8. `python3 scripts/workflow.py validate` → passed.

Docker note: the daemon was up for S1 (compose build + material image runs green). The `COMPOSE_BAKE=false` quirk applies only to compose builds, not `docker run`.

## Wrap-up

- Append to `phase.md` Findings: the FINAL manifest/class decisions (any reclassifications vs the baseline), the placeholder set, the seed project name, and anything S5 (setup skill) and S6 (E2E) must know to drive `render.py`.
- Append Doc impact one-liners: `architecture` (template-sync model live: manifest-declared classes, one renderer, parity completeness rule) and `operations` (plugin-ci parity gate; scaffold passes its own deploy gate) `[S3]`.
- Keep `plugin.json` version at 0.1.0 (release-time bumps are S6's checklist concern, not per-slice).
- Write `result.md` from scratch; return the structured verdict.
