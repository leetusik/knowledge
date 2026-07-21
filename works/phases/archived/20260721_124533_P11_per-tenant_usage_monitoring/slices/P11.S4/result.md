# P11.S4 — Result

Fully mechanical slice, executed literally against `plan.md`. Only
`scripts/onboarding_smoke.py` was touched.

## Edits applied

1. **`import uuid`** added to the stdlib import group, after `import sys`
   (keeps `argparse, datetime, secrets, sys, uuid` alphabetical).
2. **Usage assertions block** inserted verbatim at the end of the
   `with httpx.Client(timeout=15, follow_redirects=False) as client:` body in
   `run(...)`, immediately after the tenant-#1 isolation checks (the
   `if t1_rel_path:` master-bearer by-path block) and before the block
   closes / the dedented `isolation = …` summary line, at 8-space indent —
   comment header `# --- 3. Usage metering: B's activity is metered +
   tenant-scoped ----`. Covers:
   - `GET /app/usage` (session auth) → `totals.documents_created == 1`
     (exact, doubling as a cross-tenant-isolation check), `totals.searches
     >= 1`, exactly 30 zero-filled `daily_counts`, B's project present in
     `projects`.
   - `GET /app/projects/{project_id}/usage` → same
     `totals.documents_created == 1`, and a credential with non-null
     `last_used_at`.
   - `GET /app/projects/{uuid.uuid4()}/usage` (random foreign id) → 404
     (tenant-scoped, no existence leak).
3. **Summary line** — `run(...)`'s `return` now ends
   `"; isolation}; usage metered"` (was `"; isolation}"`).
4. **Docstring** — added the "3. Usage — …" numbered item to the module
   overview, right after the "2. Isolation …" item, verbatim from the plan.

Diffed the edited file against the plan's exact text; matches
character-for-character (confirmed by reading the full file back after each
edit).

## Out of scope — untouched

Nothing under `server/`, `docs/`, or `tests/` was modified. `git status`
after the edits shows only `scripts/onboarding_smoke.py` changed by this
slice (other pre-existing `works/*` diffs are the orchestrator's own
slice-state bookkeeping from before dispatch, not edits made here).

## Validation

- `.venv/bin/python -m py_compile scripts/onboarding_smoke.py` → **passed**,
  no syntax error.
- `.venv/bin/python scripts/onboarding_smoke.py --help` → **passed**, prints
  usage and exits 0; the help text shows the new "3. Usage — …" docstring
  item, confirming `import uuid` and a clean module load.
- `.venv/bin/python -m pytest -q` → **65 passed**, 1 pre-existing unrelated
  warning (`StarletteDeprecationWarning` re: `httpx`/`starlette.testclient`).

## Deliberately NOT run

The **live E2E run** (`python scripts/onboarding_smoke.py --base-url <live>
--master-token "$KB_API_TOKEN"` against a running tenant-mode Postgres
instance, expecting `PASS`) was **not executed** — this executor's
environment has no tenant-mode Postgres instance available. Per the plan,
that live acceptance run is the phase REVIEW's job (or the operator/CI). No
live PASS is fabricated or claimed here.

## Doc impact

No new "Doc impact" line needed — this slice confirms (does not add to) the
existing `operations.md` line in `phase.md` ("onboarding smoke extended with
usage assertions"), which is now accurate as landed. See the "S4 built"
note appended to `works/phases/active/P11/phase.md` for the full detail
executor-to-REVIEW handoff (exact assertions added, and the reminder that
the live run is deferred to REVIEW).

## Deviations from plan.md

None. All four edits were applied exactly as specified (Edit 2 and Edit 3
were applied in a single `Edit` tool call since they are textually adjacent
in the file — same net result as doing them separately).
