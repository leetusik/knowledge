# P4.REVIEW — Phase review: validate all slices, consolidate durable docs

Operator-approved plan (2026-07-08). Executor: `slice-executor-high`.

## Context

All P4 middle slices are done and committed (S1 `a19ca25`, S6 `0138f72`, S2 `7c0754c`, S3 `552e7da`, S4 `bfa04a4`, S5 `2b63680`). This slice: behavioral validation of ALL slices together, review against objective/`intent.md`, and — only on a passing review — consolidation of the phase's "Doc impact" notes (in `phase.md`) into new durable doc versions. You return a `review_verdict`; the orchestrator records it with `review-phase` and commits. You never commit and never transition slice/phase status; you may run `doc-new-version` (review slice only).

## What to do

### 1. Gather

Read `works/phases/active/P4/phase.md` (objective, constraints, ALL Doc-impact notes, cross-slice notes), `intent.md`, and each slice's `plan.md` + `result.md` (DECOMP, S1, S6, S2, S3, S4, S5).

### 2. Validate the phase behaviorally (all slices at once)

- `uv run pytest -q` — full suite (currently 54 tests; covers S1 CJK/pagination/recency, S6 hybrid + BM25 degradation, S2 delete/tags/projects, S3 incremental reindex + startup self-heal, S4 related, S5 sanitizer).
- `python3 scripts/workflow.py validate` — state integrity.
- Real-repo checks: `uv run python -m server.reindex` → expect `indexed: 6, removed: 0, skipped: 0`; `grep -rn "/Users/" docs/` → empty; `uvx --from mkdocs-material==9.7.6 mkdocs build --site-dir <temp outside repo>/site` → `site/versions/` absent, `site/current/` present, `grep -r "/Users/" site/` empty.
- Read-only API smoke via TestClient against the real KB root (`KB_STARTUP_REINDEX=0`, no writes): `/api/search?q=<CJK term>` returns hits (mode `bm25` — no key locally, degradation path is the correct behavior); `/api/tags` + `/api/projects` non-empty and ordered; GET a backfilled doc shows `related` and sanitized `source_repo`.
- Spot-check each slice's `result.md` claims against the code where cheap (no re-implementation of their test runs beyond the suite above).

### 3. Review against intent

Objective: audit + improve the /explain+KB pipeline (search quality, API completeness, reindex robustness, cross-links, publish hygiene) + the operator's S6 semantic-search scope addition. Confirm the binding constraints held: `/explain` POST payload backward-compatible (all new write-contract fields optional), no skill/bootstrap edits, no `nav:`/`strict:` in mkdocs.yml, docs/ canonical, single-worker WRITE_LOCK invariant untouched, `docs/current`/`docs/versions` never hand-edited.

### 4. Consolidate durable docs — ONLY on a passing review

For each affected doc — **api, backend, data, architecture, operations, security, decisions** (per phase.md's Doc-impact notes; skip any whose notes turn out to be no-ops):

1. `python3 scripts/workflow.py doc-new-version --doc <name> --summary "<one-line P4 summary>" --source P4.REVIEW`.
2. Edit the printed `edit_path` file (`docs/versions/<doc>/vNNNN_*.md`) — fold in ALL of that doc's Doc-impact notes from S1/S6/S2/S3/S4/S5 as coherent doc prose (not a changelog paste). Never touch older versions.
3. After all docs are edited: `python3 scripts/workflow.py rebuild-docs`, then `python3 scripts/workflow.py validate`.

Writes docs only — never source code.

### 5. Wrap up

Write `works/phases/active/P4/slices/P4.REVIEW/result.md` (the review report: what was validated, evidence, doc versions created). Append a closing note to `phase.md` if useful. Return `review_verdict: pass | changes_requested | blocked` — with concrete proposed fix slices (name + scope) if `changes_requested`.

## Verification

The review IS the phase's verification. Do NOT commit; do NOT run `review-phase`/`finish-slice`/status transitions — the orchestrator records your verdict.
