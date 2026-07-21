# P11.REVIEW — Phase review + durable-doc consolidation

Plan for the **P11.REVIEW** slice, executed by **`slice-executor-high`** (review slices always go to
the top tier). It validates the whole phase together, reviews S1–S4 against the objective / `intent.md` /
resolved decisions, and — **only on a passing review** — consolidates the six Doc-impact entries in
`phase.md` into new durable-doc versions. It returns a `review_verdict`; the orchestrator records it with
`review-phase` (do **not** run `review-phase`, `finish-slice`, or commit — those are the orchestrator's).

## Context

P11 added per-tenant/per-project usage monitoring: a durable `usage_events` event log (S1), best-effort
metering of writes/deletes/searches + `last_used_at` (S2), two session-guarded read endpoints (S3), and
an extended E2E smoke (S4). All four slices deferred their **live** Postgres validation to this review /
post-deploy. Read `works/phases/active/P11/phase.md` in full first — it carries every slice's contract,
the resolved decisions, and the Doc-impact list.

## Step 1 — Validate the whole phase together

- **Offline (mandatory, must all pass):**
  - `.venv/bin/python -m pytest -q` → **65 passed** (legacy regression byte-for-byte intact — the load-bearing guard that metering stayed inert with `DATABASE_URL` unset).
  - `.venv/bin/python -c "import server.main, server.usage_api, server.usage.metering"` → clean (app + router + metering all import).
  - `.venv/bin/python -m py_compile scripts/onboarding_smoke.py` → clean.
  - `python3 scripts/workflow.py validate` → state integrity.
- **Live meter→read E2E (strongly attempt; this is the one thing S1–S4 never exercised):** try to bring up
  a disposable local **tenant-mode** stack and run the extended smoke — e.g. `docker compose up -d db` (or
  the repo's Postgres service), `alembic upgrade head`, seed the operator/tenant #1
  (`python -m server.seed` with `DATABASE_URL` + `KB_OPERATOR_EMAIL`/`KB_OPERATOR_PASSWORD` + `KB_API_TOKEN`),
  start `uvicorn server.main:app` in tenant mode, then
  `python scripts/onboarding_smoke.py --base-url <local> --master-token "$KB_API_TOKEN"` expecting **PASS**.
  **Tear the stack down cleanly afterward** (`docker compose down`, stop uvicorn). If the environment
  cannot support it (no docker daemon, image pull blocked, ports unavailable), that is **acceptable and
  not a blocker**: `scripts/onboarding_smoke.py` is the committed **post-deploy verifier** (exactly as it
  was for P10 — it is not part of pytest), so the live meter→read acceptance runs at the operator's next
  deploy. **State explicitly** in `result.md` whether the live run was executed (and its result) or is
  pending post-deploy — do **not** fabricate a PASS.

## Step 2 — Review S1–S4 against the objective / intent / decisions

Read the phase diff (the S1–S4 commits) and confirm, citing file:line where relevant:

- **Meets the objective & intent:** meters per-tenant/per-project usage (API writes, documents saved,
  search activity), exposes it via API for P12's dashboard, **observability only** — no quotas/billing/
  entitlements crept in; the paid retriever stays deferred (D6).
- **Resolved decisions honored:** event-log grain; **meter writes+searches only** (open reads stay
  unmetered → no hot-path write on reads); retention deferred (D8 filed); vocky read shape.
- **Correctness of the load-bearing pieces:** the `get_usage_metrics` aggregate (half-open window,
  per-`event_type` `func.count().filter(...)`, zero-filled `_iter_days`, Python-summed totals); the
  metering middleware (records only on 2xx with a hint and `tenant_id` set; best-effort broad-catch never
  fails a request); project attribution (name→UUID, nullable fallback); the `0002` migration
  (FK actions CASCADE/SET NULL, constraint-name parity, `down_revision`).
- **Invariants intact:** legacy/dormant parity (metering inert with `DATABASE_URL` unset — the 65-test
  suite proves it); the **frozen `/api/*` consumer contract** (metering is a `request.state` side effect;
  no request/response field changed); cross-tenant scoping on the usage reads (404 for missing *and*
  cross-tenant); single-worker + `WRITE_LOCK` untouched.
- **The S2 `last_used_at`-on-metered-events refinement** is sound and documented.

If the review finds a real defect, verdict = **`changes_requested`** with a specific, actionable list
(the orchestrator will create `P11.Fn` fix slices); do **not** version docs in that case.

## Step 3 — On a PASS only: consolidate the six durable docs

For each doc, `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "<one line>" --source P11.REVIEW`,
then author the new version's content (read the current `docs/current/<doc>.md` first; keep the house
style; **additive** — extend, don't rewrite history), then `python3 scripts/workflow.py rebuild-docs`.
What each must capture (from `phase.md` Doc impact + the shipped code):

- **`data.md`** — `usage_events`: the **7th** control-plane Postgres table; columns (UUID PK; `tenant_id`
  FK CASCADE; `project_id` nullable FK **SET NULL**; free-text `event_type` — `document.created`/
  `document.deleted`/`search`; tz-aware `occurred_at`); two composite `(…, occurred_at)` indexes;
  **event-log grain**, durable; retention deferred (D8); read via GROUP-BY-day derive-on-read.
- **`api.md`** — additive control-plane reads `GET /app/usage` and `GET /app/projects/{id}/usage`
  (`require_user`, `days` param default 30, the pinned `window/totals/daily_counts` + `projects` |
  `project`+`credentials` shapes, cross-tenant → 404). Note the **frozen `/api/*` contract is untouched**
  (metering is side-effect only).
- **`backend.md`** — the `server/usage/` package (`types`/`repository`/`service`/`metering`) +
  `server/usage_api.py`; the **stash + async `usage_metering` middleware** seam and why (sync handlers →
  async Postgres write); `ApiAuthContext.credential_id`; `get_project_by_name`; best-effort semantics;
  `last_used_at` stamped on metered events only.
- **`operations.md`** — `0002_usage_events` is now a second Alembic migration (`alembic upgrade head`
  applies both); `onboarding_smoke.py` extended with the usage meter→read assertions as part of the
  post-deploy verification.
- **`decisions.md`** — ADRs: event-log over rollup (retention deferred); meter writes+searches only
  (hot-path avoidance, honoring vocky's warning); derive-on-read aggregates; `last_used_at` on metered
  events (the reads-stay-fast refinement); project attribution by name→UUID with nullable fallback;
  free-text `event_type`.
- **`security.md`** — per-tenant usage isolation (scoped by `tenant_id`; usage reads 404 for missing/
  cross-tenant, existence never leaks); metering best-effort and never alters a request outcome; usage
  rows carry only tenant/project/event-type/timestamp (no new PII).

## Step 4 — Return the verdict

Return `review_verdict` = `pass` | `changes_requested` | `blocked` with a concise note (what was
validated — including whether the live smoke ran or is pending post-deploy — and the doc versions
consolidated on a pass). Write `result.md`. The **orchestrator** then records it:
`python3 scripts/workflow.py review-phase P11 --verdict <v> --reviewer slice-executor-high --note "…"`,
runs `validate`, and commits.

## Boundaries

The review executor may run `doc-new-version` and `rebuild-docs` (review-slice privileges) but **must not**
`review-phase`, `finish-slice`, transition phase/slice status, `git commit`, or touch `server/` source
(docs only; a defect → `changes_requested`, not a hand-fix). Leave all state transitions + the commit to
the orchestrator.
