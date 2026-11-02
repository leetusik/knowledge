# P37-1p.S4: remove the graph API on both sides of the plugin template

## Goal

Delete `GET /app/graph` from the hosted server and from the plugin template's identical copy, per the parity decision signed at the DECOMP gate (`phase-section P37-1p Decisions`, "Plugin template parity"). The template's mkdocs graph stays, untouched:

- `scripts/graph_hook.py`;
- `docs/javascripts/graph.js`;
- `docs/graph.md`;
- the `mkdocs.yml` hook;
- and the root's copies of all of these.

The operator said "just continue w/o my involve. skip everything not necessary". So this slice is trimmed to what the API's removal needs. **Out of scope, skipped:** the breakdown's `db.py` `projects`-kwarg cleanup, and the docstring rewording in `reader_api.py`, `books_api.py` and `reader_state.py`. Touch none of those files.

## Steps

1. **`server/graph_api.py`:** delete it. In `server/main.py`, delete its import, the `app.include_router(graph_api.router)` line and the comment block above it (around lines 38 and 162–167).
2. **Tests:**
   - Delete `tests/test_graph_api.py`.
   - In `tests/test_public_read.py`, delete `test_public_graph_is_org_scoped` and the graph clause in the module docstring.
   - Any other test there that calls `/app/graph` goes too; list each one in `result.md`.
3. **The template:** apply exactly the same edits under `plugin/templates/kb/`, so every file stays byte-identical to the root:
   - `server/graph_api.py`
   - `server/main.py`
   - `tests/test_graph_api.py`
   - `tests/test_public_read.py`
4. **The manifest:** remove `server/graph_api.py` and `tests/test_graph_api.py` from `plugin/templates/manifest.json`'s `identical` list. Keep `scripts/graph_hook.py`, `docs/graph.md` and `docs/javascripts/graph.js`.
5. **`scripts/onboarding_smoke.py`** is root-only and run post-deploy:
   - drop its `/app/graph` legs and their docstring lines;
   - the `/graph/{tenant}` web-page leg: reshape it to expect S1's 307 to `/@{…}` if that is a small change, otherwise drop it.
   - Check it with `python3 -m py_compile` only; never run it live.
6. **The plugin version:** bump `plugin/.claude-plugin/plugin.json` from 0.9.0 to 0.9.1, per the release rule that any `plugin/**` change pairs with a version bump. If the plugin carries a changelog or a second version field that the rule pairs with this one, find it and update it too, adding it to your set in `result.md`.

## Verification

1. `uv run pytest -q`: record the PASS count before and after (the drop equals the deleted tests). pytest never reads S3's set (web CSS), so it runs here despite the wave.
2. `python3 scripts/plugin_parity.py` and `python3 scripts/skills_parity.py`: both green.
3. `grep -rn "graph_api\|/app/graph" server tests plugin/templates/kb/server plugin/templates/kb/tests scripts/onboarding_smoke.py web/src` returns nothing live.
4. `claude plugin validate plugin` (or the path the repo uses), if the CLI is present; otherwise say so.
5. The live API on `:8766` keeps serving old code until a restart. **Never restart it.** The deletion is proven by the tests.
6. `python3 scripts/workflow.py validate` passes.

## Wave

- **Your set:**
  - `server/graph_api.py` and `server/main.py`
  - `tests/test_graph_api.py` and `tests/test_public_read.py`
  - `plugin/templates/kb/server/graph_api.py`, `plugin/templates/kb/server/main.py`, `plugin/templates/kb/tests/test_graph_api.py` and `plugin/templates/kb/tests/test_public_read.py`
  - `plugin/templates/manifest.json`
  - `plugin/.claude-plugin/plugin.json`
  - `scripts/onboarding_smoke.py`
  - plus a changelog file only if step 6 finds the release rule pairs one
  - `plugin/skills/setup/SKILL.md` (added at return: its paired `plugin_version` marker, per step 6)
- **Running beside you: P37-1p.S3** (the graph CSS). Its set is web only:
  - `web/src/app/(app)/graph/*.css`
  - `web/src/app/globals.css`, `kb-record-fixes.css`, `kb-console-r4.css` and `kb-docview.css`
  - `web/src/components/app-shell/app-frame.css`
  - `web/src/components/public-shell.tsx`
- **Waiting commits:** none.
- **Join-rebuilt artifact:** none.
- **Your notebook:** write no `phase.md`. Return your entries in the verdict's `notebook` field:
  - **Now;**
  - **Notes** for REVIEW: the pytest count, and the fact that the live `:8766` still runs pre-S4 code;
  - **Doc impact:** `GET /app/graph` and `graph_api.py` are gone; the template drops them and keeps its mkdocs graph; plugin 0.9.1.
- **Engine commands:** run none that write.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
