# Result — P8.F1: plugin template sync for S1/S2 changes

## What changed

Mechanical sync of `plugin/templates/kb/` to match the root files P8.S1/S2 changed,
plus one manifest entry and a plugin version bump. No behavior change to the
shipped code — it was already tested via the root files; this only makes the
plugin payload byte-identical to them again.

1. Copied byte-identically (overwrote stale template copies):
   - `server/config.py` → `plugin/templates/kb/server/config.py`
   - `server/gitops.py` → `plugin/templates/kb/server/gitops.py`
   - `server/main.py` → `plugin/templates/kb/server/main.py`
   - `tests/test_api_read.py` → `plugin/templates/kb/tests/test_api_read.py`
2. Copied the new file: `tests/test_api_push.py` → `plugin/templates/kb/tests/test_api_push.py`.
3. `plugin/templates/manifest.json`: added `"tests/test_api_push.py"` to the
   `files.identical` array, immediately before `"tests/test_api_read.py"`
   (alphabetical order within the tests group preserved).
4. Version bump (release-checklist rule 1, `plugin/README.md`): new backward-compatible
   server capability + response fields ⇒ minor bump.
   - `plugin/.claude-plugin/plugin.json`: `"version": "0.1.0"` → `"0.2.0"`.
   - Grepped `grep -rn '"0\.1\.0"' plugin/ .claude-plugin/` for other occurrences of the
     plugin's version string. Found and evaluated four hits:
     - `plugin/skills/setup/SKILL.md:157` — `"plugin_version": "0.1.0"` in the
       scaffold-marker JSON (`.kb-scaffold.json`) written into new KB projects,
       explicitly labeled as the plugin's version. **Bumped to `0.2.0`** (this file
       is not in the `files.identical` template-tree list; it's the setup skill's
       own source, edited directly).
     - `plugin/templates/kb/pyproject.toml:3`, `plugin/templates/kb/uv.lock:383`
       (the `kb-api` package entry), and `plugin/templates/kb/server/main.py:51`
       (`FastAPI(title="kb-api", version="0.1.0", ...)`) — all three are the
       **scaffolded kb-api application's own version**, a separate versioned
       product from the Claude plugin. Confirmed not ambiguous: root's
       `server/main.py` carries the identical `version="0.1.0"` for the FastAPI
       app object, untouched by S1/S2 and by this slice's byte-identical copy —
       it is the KB app's own semver, coincidentally starting at the same value
       as the plugin's, not the plugin's version. Left unchanged.
     - (Also checked `docs/current/operations.md`, `docs/current/decisions.md`,
       root `pyproject.toml`, and various `works/phases/active/P7/**` — all
       historical/generated doc text or the same kb-api version; out of scope
       per this slice's constraints, which forbid touching docs and root
       server/tests files.)

## Files touched

- `plugin/templates/kb/server/config.py` (overwritten, byte-identical to root)
- `plugin/templates/kb/server/gitops.py` (overwritten, byte-identical to root)
- `plugin/templates/kb/server/main.py` (overwritten, byte-identical to root)
- `plugin/templates/kb/tests/test_api_read.py` (overwritten, byte-identical to root)
- `plugin/templates/kb/tests/test_api_push.py` (new file, byte-identical to root)
- `plugin/templates/manifest.json` (added one entry to `files.identical`)
- `plugin/.claude-plugin/plugin.json` (version 0.1.0 → 0.2.0)
- `plugin/skills/setup/SKILL.md` (scaffold-marker `plugin_version` 0.1.0 → 0.2.0)
- `works/phases/active/P8/phase.md` (Findings & Notes `### P8.F1` entry + Doc impact note)
- `works/phases/active/P8/slices/P8.F1/result.md` (this file)

No root `server/*`, `tests/*`, `deploy/*`, compose files, or `docs/` files were modified.

## Validation

| Command | Result |
|---|---|
| `python3 scripts/plugin_parity.py` (before fix, orchestrator + re-verified) | FAIL — 5 issues (byte drift: `server/config.py`, `server/gitops.py`, `server/main.py`, `tests/test_api_read.py`; completeness: `tests/test_api_push.py` not shipped) |
| `python3 scripts/plugin_parity.py` (after fix) | **PASS** — 0 issues, exit 0 |
| `.venv/bin/python -m pytest -q` | **65 passed**, 1 warning (unchanged from pre-slice baseline; this slice does not touch test outcomes) |
| `python3 scripts/workflow.py validate` | **Workflow validation passed.** |

## Deviations from plan.md

None. All 7 steps executed as written, including the step-4 version-string grep,
which surfaced one additional file (`plugin/skills/setup/SKILL.md`) clearly
carrying the plugin's own version (`"plugin_version"`) — bumped identically per
the plan's instruction — and three files carrying the unrelated `kb-api`
scaffolded-application version, confirmed not ambiguous (identical, unchanged
value in the untouched root `server/main.py`) and left alone.

## Notes for the phase review

- `plugin_parity.py` is green again; the next push to `main` (including hosted-box
  publish-on-write pushes, P8.S5) will not fail `plugin-ci.yml` on this account.
- Process lesson recorded in `phase.md`: any slice editing `server/*`/`tests/*`
  payload files must run `scripts/plugin_parity.py` as part of its own local
  validation, not just pytest — parity only runs in CI on push.
- Doc impact note appended to `phase.md` for P8.REVIEW to fold into
  qa.md/operations.md: the parity-guard process lesson, and the plugin version
  bump (0.1.0 → 0.2.0) alongside the S1/S2 payload sync.
