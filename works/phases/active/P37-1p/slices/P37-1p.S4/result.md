# P37-1p.S4 result: the graph API removed on both sides of the plugin template

## Verdict

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Deleted `GET /app/graph` (`server/graph_api.py`, its router wiring in `server/main.py`, `tests/test_graph_api.py`, and `test_public_graph_is_org_scoped`) from the root and the plugin template in byte parity, and dropped both files from the manifest. Also dropped the smoke's `/app/graph` legs, reshaped its `/graph/{tenant}` leg to expect S1's 307 to `/@…`, and bumped the plugin to 0.9.1 (`plugin.json` plus the setup skill's paired `plugin_version`).
- files_changed: server/graph_api.py (deleted), server/main.py, tests/test_graph_api.py (deleted), tests/test_public_read.py, plugin/templates/kb/server/graph_api.py (deleted), plugin/templates/kb/server/main.py, plugin/templates/kb/tests/test_graph_api.py (deleted), plugin/templates/kb/tests/test_public_read.py, plugin/templates/manifest.json, plugin/.claude-plugin/plugin.json, plugin/skills/setup/SKILL.md, scripts/onboarding_smoke.py, works/phases/active/P37-1p/slices/P37-1p.S4/result.md
- validation: `uv run pytest -q` PASS (before: 172 passed, 69 skipped; after: 172 passed, 60 skipped, so the 9 deleted tests were all Postgres-gated skips); `python3 scripts/plugin_parity.py` PASS; `python3 scripts/skills_parity.py` PASS; `python3 -m py_compile scripts/onboarding_smoke.py` PASS (not run live); `claude plugin validate plugin` PASS and `claude plugin validate .` (marketplace) PASS; the plan's grep shows no live hit (see below); `python3 scripts/workflow.py validate` PASS (only the standing stale-docs and oversized-section warnings); deferred: whole-tree: none
- deviations: (1) Added `plugin/skills/setup/SKILL.md` to the set, as step 6 allows. Its scaffold marker's `plugin_version` ("the current plugin version") has moved with `plugin.json` at every release (0.8.0, 0.9.0), so it went to 0.9.1 too. There is no changelog. (2) The plan's grep still finds the docstrings in `server/reader_api.py:76` and `server/books_api.py:72` and their template twins. These are comments that mention `/app/graph` as the precedent for the UUID-or-slug rule. The plan explicitly leaves them out of scope, so they are untouched.
- notebook:
  - Now: "S4 landed: `GET /app/graph` and `graph_api.py` are gone from root and template (parity green), the smoke's `/graph/{tenant}` leg expects S1's 307, and plugin is 0.9.1. Open: docstring mentions of `/app/graph` in reader_api.py/books_api.py were left by the trimmed scope. The live `:8766` still serves the pre-S4 code until someone restarts it."
  - Notes for later slices: "**(from P37-1p.S4, for P37-1p.REVIEW)** pytest went from 172 passed / 69 skipped to 172 passed / 60 skipped. The 9 deleted graph tests were all Postgres-gated skips. The live API on `:8766` was not restarted, so it still serves `/app/graph` (pre-S4 code). The deletion is proven by the tests and the grep, not live."
  - Doc impact: "- architecture.md / product.md: `GET /app/graph` and `server/graph_api.py` are removed. The plugin template drops both (and `tests/test_graph_api.py`) but keeps its mkdocs graph (`scripts/graph_hook.py`, `docs/graph.md`, `docs/javascripts/graph.js`, the mkdocs hook). The knowledge plugin is now 0.9.1 (S4)."
  - Doc impact: "- qa.md / operations.md: `scripts/onboarding_smoke.py` no longer probes `/app/graph`. Its public-link leg now expects `/graph/{tenant}` to 307 to `/@{org}` (S4)."
  - Decisions: none. Operator Questions: none.

## What changed

- `server/main.py` (and its byte-identical template copy): removed `from server import graph_api`, the P12.S6 comment block and `app.include_router(graph_api.router)`.
- `tests/test_public_read.py` (and its template copy):
  - Deleted `test_public_graph_is_org_scoped`. It was the only test in the file that called `/app/graph`.
  - Dropped the graph clause from the module docstring. `_set_slug` is still used by other tests.
- Deleted `server/graph_api.py` and `tests/test_graph_api.py` in both trees, and removed both from `manifest.json`'s `identical` list. `scripts/graph_hook.py`, `docs/graph.md` and `docs/javascripts/graph.js` stay.
- `scripts/onboarding_smoke.py`:
  - Removed the two `/app/graph?org=` legs and the now-unused `rel_path` local.
  - Rewrote the docstring lines.
  - Reshaped the web-page leg: `GET /graph/{tenant}` must now return 307 with a `location` starting `/@`. The client already runs with `follow_redirects=False`.
- `plugin/.claude-plugin/plugin.json` and the setup `SKILL.md` marker: 0.9.0 to 0.9.1.

## Grep (plan verification 3)

`grep -rn "graph_api\|/app/graph" server tests plugin/templates/kb/server plugin/templates/kb/tests scripts/onboarding_smoke.py web/src` returns only docstrings:

- `server/reader_api.py:76`
- `server/books_api.py:72`
- the template twins of those two lines

They are out of scope per the plan. There are no imports, routes, calls or web hits.

## Live

No live run was made. Per the plan, `:8766` was not restarted, and `:3030` was not touched.
