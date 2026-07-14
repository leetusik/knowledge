# Plan — P8.F1: plugin template sync for S1/S2 changes (fix; fully mechanical)

Orchestrator plan (auto mode). Executor: `slice-executor-low` — follow these steps literally; if ANY step surprises you (a diff you didn't expect, a failing check other than the one being fixed, a version string in a place not listed), STOP and return `escalate` with what you saw.

## Why

`python3 scripts/plugin_parity.py` is red at HEAD with exactly these 5 issues (verified by the orchestrator just now):

- `[identical] byte drift: server/config.py`
- `[identical] byte drift: server/gitops.py`
- `[identical] byte drift: server/main.py`
- `[identical] byte drift: tests/test_api_read.py`
- `[completeness] in repo but not shipped: tests/test_api_push.py`

Cause: P8.S1/S2 changed those root files without mirroring them into `plugin/templates/kb/` (the parity gate only runs in CI on push, so local test runs missed it). `plugin-ci.yml` would fail on the next push to `main` — including the hosted box's publish-on-write pushes (P8.S5). The synced changes are safe to ship to plugin adopters: both new behaviors are flag-gated **off by default**.

## Steps (exact)

1. Copy these four files byte-identically from repo root into the template tree (overwrite the stale copies):
   - `server/config.py` → `plugin/templates/kb/server/config.py`
   - `server/gitops.py` → `plugin/templates/kb/server/gitops.py`
   - `server/main.py` → `plugin/templates/kb/server/main.py`
   - `tests/test_api_read.py` → `plugin/templates/kb/tests/test_api_read.py`
2. Copy the new file `tests/test_api_push.py` → `plugin/templates/kb/tests/test_api_push.py`.
3. In `plugin/templates/manifest.json`, add `"tests/test_api_push.py"` to the `files.identical` array, inserted immediately **before** `"tests/test_api_read.py"` (keeps the list's alphabetical order within the tests group).
4. Bump the plugin version for this payload change (release-checklist rule 1 in `plugin/README.md`): in `plugin/.claude-plugin/plugin.json`, change `"version": "0.1.0"` → `"version": "0.2.0"` (new backward-compatible server capability + response fields ⇒ minor bump). Then `grep -rn '"0\.1\.0"' plugin/ .claude-plugin/ 2>/dev/null` — if the plugin's version string appears anywhere else (e.g. a marketplace.json entry), bump it identically; if a hit is ambiguous (not clearly the plugin's version), escalate instead of guessing.
5. Validate — all must pass, record outputs in `result.md`:
   - `python3 scripts/plugin_parity.py` → exit 0, no issues.
   - `.venv/bin/python -m pytest -q` → 65 passed (this slice must not change test outcomes).
   - `python3 scripts/workflow.py validate` → passes.
6. Append to `works/phases/active/P8/phase.md`:
   - Under **Findings & Notes**, a short `### P8.F1` entry: parity restored, the 5 issues, the version bump, and the process lesson (a slice that edits `server/*`/`tests/*` must run `scripts/plugin_parity.py` locally, not just pytest).
   - Under **Doc impact**, one line: qa.md/operations.md — parity guard lesson: local slice validation for shipped-payload files must include `scripts/plugin_parity.py`; plugin version bumped 0.1.0 → 0.2.0 with the S1/S2 payload sync.
7. Write `result.md` in this slice folder (what changed, validation table) and return your structured verdict.

## Constraints

- Touch ONLY: the six template-tree/manifest/plugin.json paths listed above (+ any additional version-string file found in step 4), `phase.md`, and this slice's `result.md`.
- Do not modify root `server/*`, `tests/*`, `deploy/*`, compose files, or any doc under `docs/`.
- Never commit; never transition slice/phase status; never run `doc-new-version`.
