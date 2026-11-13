# Plan — P7.F1: Write path auto-creates project landing index.md

Orchestrator plan (auto run). Executor: slice-executor-high. Fix slice for the gap P7.S6's E2E found (see `slices/P7.S6/plan.md` → "## Escalation 1" for the full evidence; `phase.md` Findings for the S1/S3 context). No commits, no status transitions.

## The bug (verified by S6's mid tier with a reproducer)

Neither the API write path (`server/documents.py` / the POST flow) nor the explain skill's fallback branch ever creates a project landing `docs/<project>/index.md` — they write only the dated doc + the top-level Recent bullet. But the shipped deploy gate `scripts/site_smoke.py::check_built` requires `site/<project>/index.html` for EVERY project `discover_projects()` finds, and mkdocs `navigation.indexes` doesn't synthesize a landing. Consequence: a scaffold user documents a second project → their next Pages deploy gate fails (`site/<project>/index.html missing`). The operator's repo passes today only because its `docs/*/index.md` landings are hand-written; the scaffold's seed project passes only because the template ships one.

Reproducer (S6's): render a scaffold, POST (or fallback-write) a doc into any project other than the seed, `docker run --rm -v <scaffold>:/docs squidfunk/mkdocs-material:9.7.6 build`, `python3 <scaffold>/scripts/site_smoke.py --root <scaffold>` → FAIL.

## The fix (decided: the API owns it — option 1 from the escalation)

1. **`server/documents.py` (+ its call site in the write flow):** when writing `docs/<project>/<date>-<slug>.md`, if `docs/<project>/index.md` does NOT exist, create a minimal project landing in the same locked write. NEVER overwrite or modify an existing `index.md`. Include the created landing in the scoped git commit's staged paths (it becomes a 3-path commit only when the landing was created; the scoped-commit invariant is "only touched paths, never -A" — honor it). Design the minimal landing after reading the operator's existing hand-written landings (e.g. `docs/changple5/index.md`) and the template seed (`plugin/templates/kb/docs/getting-started/index.md`): likely an H1 with the project name + a one-liner; it must carry NO frontmatter `source:` mapping (so it stays a non-doc for graph/count purposes — `index.md` is already excluded from `discover_projects` doc-counting and `check_graph` fs_count, keep it that way) and must render cleanly under the theme.
2. **DELETE path sanity:** check the delete flow — if deleting the last doc of a project leaves the auto-created landing behind, the project dir still has `index.md` but zero docs → `discover_projects` won't list it (needs ≥1 non-index .md) and mkdocs still builds the landing page → gate unaffected. Confirm this reasoning in code; do NOT add delete-side cleanup unless something actually breaks.
3. **Parity mirror:** copy the new `server/documents.py` bytes to `plugin/templates/kb/server/documents.py` (byte-identical class). Same for any `tests/*` file you touch — `tests/` is a fully-shipped completeness-checked dir; `scripts/plugin_parity.py` must stay green.
4. **Shipped explain skill (`plugin/skills/explain/SKILL.md`), fallback branch only:** add an ensure-landing step (if `<kb_root>/docs/<project>/index.md` missing → write the same minimal landing before/with the doc write; the fallback's `git add -A` picks it up). Body edit only — do not touch frontmatter. The API branch needs nothing (the server now does it).
5. **Workspace skill (`.claude/skills/explain/SKILL.md`) fallback branch:** same ensure-landing addition, and mirror the identical body edit to `.agents/skills/explain/SKILL.md` (the two are kept body-identical in this repo). Do NOT touch the bootstrap repo — that constraint stands; these are this repo's own copies.
6. **Tests (terse, per CLAUDE.md test hygiene):** extend the existing write-path test file with the minimal high-value cases — first doc of a new project creates the landing (and the commit includes it); second doc does not recreate/modify it; an existing hand-written landing is never touched. No new test files if an existing one fits.

## Validation (run all; record outcomes)

1. `uv run pytest -q` → green.
2. `python3 scripts/plugin_parity.py` → green (mirrors done right).
3. **The reproducer, now passing:** render a scaffold (test params, ports 9765/9766), get the API up against it — EITHER compose up in the scaffold OR the cheaper host route (`KB_ROOT=<scaffold> KB_STARTUP_REINDEX=1 uv run uvicorn server.main:app --port 9766` from the scaffold's own tree... careful: run the SCAFFOLD's server code, not the live repo's — simplest is compose, your call) — POST one doc into a NEW project → assert `docs/<project>/index.md` auto-created + in the commit → `docker run --rm -v <scaffold>:/docs squidfunk/mkdocs-material:9.7.6 build` → `python3 <scaffold>/scripts/site_smoke.py --root <scaffold>` → **PASS**. Tear everything down (containers, temp dirs; never touch the live KB on 8765/8766).
4. Operator-repo gate unchanged: `docker run --rm -v "$PWD":/docs squidfunk/mkdocs-material:9.7.6 build` + `python3 scripts/site_smoke.py` → PASS (no behavior change for existing projects).
5. `claude plugin validate ./plugin` + `--strict` → exit 0 (skill body edits parse).
6. `python3 scripts/workflow.py validate` → passed.

## Wrap-up

- Append to `phase.md` Findings: a "P7.F1 landed" block — the landing's exact minimal content, the 3-path scoped-commit behavior, delete-path reasoning, and the mirror set touched.
- Append Doc impact lines:
  - `backend — write path auto-creates a minimal docs/<project>/index.md for a project's first document (never overwrites; joins the scoped commit); keeps every project satisfying the per-project deploy-gate invariant. [F1]`
  - `api — POST /api/documents side effect documented: first doc of a new project also creates the project landing. [F1]`
  - `qa — deploy-gate invariant (site/<project>/index.html per project) now holds for API- and fallback-written projects, proven by the S6 reproducer. [F1]`
- Keep `plugin.json` at 0.1.0.
- Write `result.md` from scratch; return the structured verdict.
