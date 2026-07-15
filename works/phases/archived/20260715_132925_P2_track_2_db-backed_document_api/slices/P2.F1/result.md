# Result — P2.F1 (anchor the .gitignore data/ rule to /data/)

- Phase ID: P2
- Slice ID: P2.F1 (kind `fix`, risk `low`)
- Status: fix applied, all verification green.

## Outcome

`.gitignore` line 4 changed `data/` → `/data/`, anchoring the ignore to the
repo-root disposable SQLite dir (`/data/kb.sqlite3`) only, so the
`docs/versions/data/` durable-doc subtree is no longer silently git-ignored.
This closes the P2.REVIEW round-1 blocker (a new `data` doc version would have
been dropped from commits). No other rule was touched.

## Deviations from Plan

None.

## Validation Run — all 5 steps passed

| # | Command | Expected | Result |
|---|---|---|---|
| 1 | `git check-ignore -v docs/versions/data/v0002_probe.md` | NO match (exit 1) | **PASS** — no output, exit 1 |
| 2 | `git check-ignore -v data/kb.sqlite3` | still matched (now by `/data/`) | **PASS** — `.gitignore:4:/data/	data/kb.sqlite3`, exit 0 |
| 3 | `git status --short` | only `.gitignore` + usual works/ slice state | **PASS** — ` M .gitignore` plus expected works/ churn (backlog/deferred/events/index/state + P2.F1 slice.json/plan.md); nothing previously-hidden floods in |
| 4 | `uv run pytest -q` | 25/25 | **PASS** — 25 passed, 1 warning (starlette httpx deprecation, pre-existing/harmless) |
| 5 | `python3 scripts/workflow.py validate` | passes | **PASS** — "Workflow validation passed." |

## Files Changed

- `.gitignore` (line 4 `data/` → `/data/`)
- `works/phases/active/P2/phase.md` (F1 note appended to Findings & Notes)
- `works/phases/active/P2/slices/P2.F1/result.md` (this file)

## Doc Versions Created

- None. Durable-doc versioning happens at the P2.REVIEW re-run. This slice added
  **no** new Doc impact entry — a packaging correction, no durable-truth change
  beyond what the existing `operations` note covers. The re-review can now
  consolidate the ten existing Doc impact notes into the five v0002 versions
  (`api`, `backend`, `data`, `operations`, `architecture`) without the `data`
  version being git-ignored.

## Roadmap Updates

- None new. Orchestrator should re-run P2.REVIEW to consolidate docs and pass.

## Retrospective

- Root-anchoring (`/data/`) is the correct fix: unanchored directory ignores are
  dangerous when a same-named directory legitimately lives elsewhere in the tree
  (here `docs/versions/data/`). One-line change, fully verified.
