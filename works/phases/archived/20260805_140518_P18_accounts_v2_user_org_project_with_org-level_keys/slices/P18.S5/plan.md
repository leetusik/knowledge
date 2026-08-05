# Plan — P18.S5: Prod migration (0003) + deploy + extended onboarding E2E (operator-gated)

Operator-approved orchestrator plan (2026-07-22). Executor: `slice-executor-high` (risk: high). Two stages around one operator `pending` gate — P17.S5's shape. Read `../../phase.md` (all S1–S4 notes) and `../../intent.md`; verify every command form against `deploy/deploy.sh`, `compose.prod.yml`, and `docs/current/operations.md` — do not trust memory. P17.S5's `result.md` is the reference choreography.

## Ordering constraint (this cutover HAS a migration, unlike P17.S5)

New resolver reads `project_credentials.tenant_id` → deploying new code before 0003 breaks every `vk_` auth. Old code + new schema is the safe overlap (caveat: an old-code project-key mint in the window violates the new NOT NULL — keep the window seconds-short, note it). Runbook order: **reconcile box clone → one-shot `alembic upgrade head` → deploy/restart new code**, back-to-back.

## Stage A (this dispatch): smoke extension + local proof + prod pre-flight + runbook → `needs_operator`

1. **Extend `scripts/onboarding_smoke.py`** (keep style: argparse, collect-all-failures, HTTP-level, unique throwaway email):
   - Signup: assert the additive `project` field; `"default"` project visible via `/app/projects`.
   - Org-key journey: `POST /app/credentials` (session) mint → ONE org key writes docs to TWO project names → both appear in `/app/projects` (get-or-create) → usage metered per named project → `DELETE /app/credentials/{id}` revoke → subsequent write 401.
   - Regression: project-bound mint + write still works.
   - Keep all existing isolation/usage checks intact.
2. **Prove the extension locally**: disposable `postgres:17` + app in tenant mode (uvicorn + `DATABASE_URL` + operator env + `alembic upgrade head` + `python -m server.seed`) → extended smoke green against it. Tear down after.
3. **Prod pre-flight (read-only, throttle-aware)**: `/healthz`, P17.S5-style discriminator probes; establish deployed-code era and that 0003 is not applied — by inference from probe shapes + git state only (mint nothing, write nothing).
4. **Customized operator runbook** → `result.md` + the `operator_need` field. Exact commands, in order: push `main` (or ask the orchestrator's operator to say "push"); box clone reconcile; one-shot 0003 migration (`docker compose ... run --rm api alembic upgrade head` form — verify exact service/flags); optional idempotent seed; `deploy/deploy.sh` (P17.F1 freshness self-assert); post-conditions to eyeball. Note: smoke leftovers in prod are namespaced under `tenants/<uuid>/` (same as P17 runs); the old-code mint window caveat.
5. Parity: smoke lives in `scripts/` (not a shipped_dir — confirm; no template mirror expected); run both parity scripts as no-op checks; `python3 scripts/workflow.py validate`.
6. Write `result.md` (Stage A section: what changed, local-proof outcomes, probe table, runbook), append phase.md notes + Doc impact one-liners (expect: operations, qa). Return **`needs_operator`** with the runbook in `operator_need`.

## Stage B (a later dispatch, after the operator clears the gate)

Run the extended smoke against `https://knowledge.hi2vi.com` (`--master-token` only if the operator provides it); `/healthz` + freshness asserts; **append** a Stage B section to `result.md` with outcomes; any remaining Doc impact notes. Return `done` (or `blocked` with exact failure evidence).

## Never (both stages)

No prod mutations by the executor beyond the smoke run in Stage B (Stage A probes are read-only; the smoke's own writes are its purpose and land in a throwaway tenant). No commits, no status transitions, no doc versioning, no pushes.
