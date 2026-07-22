# Plan — P19.S5 "Prod cutover: reconcile + alembic 0004 + deploy + public-link live smoke"

Operator-approved 2026-07-22 (do-whole-phase, manual gate). Executor tier: `slice-executor-high` (risk `high` — operator-gated prod migration). Two executor stages around one operator `pending` gate (the P18.S5 shape). This plan covers both stages; the dispatch prompt says which stage you are running.

Read `works/phases/active/P19/phase.md` first (S2/S3/S4 cross-slice notes = the contracts to verify live) and `works/phases/active/P18/slices/P18.S5/result.md` §4 (the runbook template).

## Grounded facts

- S1-S4 + migration `0004_project_visibility` are local commits, unpushed (`main` ahead of `origin/main`); the box deploys only `origin/main` → **operator push precedes reconcile**. The agent NEVER pushes.
- Cutover order is load-bearing: **schema before code** (safe overlap = old code + new schema). 0004 is purely additive (`visibility Text NOT NULL DEFAULT 'private'`) — old code ignores it; but S1-S4 code SELECTs `projects.visibility` on every project read, so code-before-0004 500s broadly. Expected alembic line: `Running upgrade 0003_org_level_credentials -> 0004_project_visibility`.
- Use `docker compose -f compose.prod.yml run --rm api alembic upgrade head` (the `run --rm` form — alembic instead of uvicorn, old api keeps serving), NOT `exec`.
- `deploy/deploy.sh`: reconcile → rebuild web/mcp → force-recreate bind-mounted api → health-gate ×3 → freshness self-assert (`api process is fresh`). The Production Deploy Action (workflow_dispatch, main-guarded) wraps the same chain + external curls; it runs no alembic. Either works for the deploy step.
- Prod env: `KB_PUBLIC_BASE_URL=https://knowledge.hi2vi.com` (= app origin), tenant mode, box at 0003. Login probes need ≥8-char passwords (422 short-circuits under 8).
- **Flip probe** (decisive, read-only, unauthenticated): `GET /app/graph?org=<random-uuid>` — pre-P19 **401**, post-P19 **404**.
- `scripts/onboarding_smoke.py`: httpx, argparse (`--base-url`, `--master-token`), fresh throwaway signups, collect-all-failures into `failures`, `FROZEN_201_KEYS`, `_run_org_journey` is the extension point, no cleanup (accepted residue pattern).
- Live contracts to verify (phase.md): tenant-mode 201 `url` = `{KB_PUBLIC_BASE_URL}/documents/{id}`; anonymous `GET /app/documents/{id}` / `/raw` (4 sandbox headers) / `GET /app/graph?org={tenant_uuid}` for public projects, 404-never-403; web `/documents/{id}` (anonymous private miss → `/login` redirect) and `/graph/{org_uuid}` (miss → branded 404).

## Stage A — smoke extension + local proof + pre-flight + runbook (NO prod mutation, NO push)

1. **Extend `_run_org_journey` in `scripts/onboarding_smoke.py`** with a P19 public-link leg (httpx style, terse, collect-all-failures):
   - Write one **html-format** doc via the org key (exercises `/raw`); assert the 201 `url` ends `/documents/{id}` (frozen keys — value assertion only).
   - Anonymous (no Authorization header): `GET /app/documents/{id}` → **404** (private default; negative first).
   - Session: find the project via `GET /app/projects`; `PATCH /app/projects/{id}` `{"visibility":"public"}` → 200.
   - Anonymous: `GET /app/documents/{id}` → 200 JSON, assert no `tenant_id` key; `GET /app/documents/{id}/raw` → 200 + `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`; `GET /app/graph?org={tenant_uuid}` → 200 with the doc's rel_path among nodes (tenant uuid from the signup payload / `/auth/me`); `GET /app/graph?org={random-uuid}` → 404.
   - **Web pages** (same origin on prod), guarded by a new `--skip-web-pages` flag (default: run them): anonymous `GET {the 201 url}` → 200 HTML; anonymous `GET /graph/{tenant_uuid}` → 200 HTML; and after toggle-back, anonymous `GET {the 201 url}` → redirect (302/307) toward `/login`.
   - `PATCH` back to private; anonymous `GET /app/documents/{id}` → 404 again (instant-toggle round-trip; leaves the throwaway tenant private).
2. **Local proof**: run the extended smoke against a local stack the way P18.S5 Stage A did (compose dev + disposable Postgres; pass `--skip-web-pages` if the Next app is not up locally). Record the exact PASS/FAIL output in result.md. Honest reporting over green-claiming; tear down anything disposable you started.
3. **Read-only prod pre-flight** (no mutations): `GET https://knowledge.hi2vi.com/healthz` → 200; flip probe `GET /app/graph?org=<random-uuid>` → expect **401** (P19 not live yet). Record baselines.
4. **Runbook** — write into `result.md` §Runbook, adapted from P18.S5 §4 with 0004 specifics: Step 1 operator push (`git push origin main`, with the publish-on-write reject → `git pull --rebase` caveat); Steps on box back-to-back: reconcile one-shot (P18.S5's exact container command) → `docker compose -f compose.prod.yml run --rm api alembic upgrade head` (expected upgrade line above) → optional `python -m server.seed` (no-op) → `deploy/deploy.sh` (or the Production Deploy Action); Step verify: `/healthz` 200, flip probe now **404**, deploy freshness tail, `docker compose ps` all healthy. Include the ultra-safe variant (`stop api` between reconcile and alembic — trades a short write outage for zero mint-window).
5. Return **`needs_operator`** with the runbook condensed in your verdict. Do NOT touch prod, do NOT push, do NOT run alembic anywhere but the local disposable stack (and only if your local proof needs it — tests normally get schema via create_all).

## Operator gate (orchestrator's job, not yours)

The orchestrator commits Stage A, sets the slice `pending`, reports the runbook, and stops. The operator runs push → reconcile → 0004 → deploy → verify, then clears the gate.

## Stage B — hosted verification (dispatched after the gate clears)

1. Probes: `GET /healthz` → 200; flip probe `GET /app/graph?org=<random-uuid>` → **404** (P19 live).
2. Hosted smoke, full: `python scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com` (web pages included) → expect the `PASS` line. On failures: report them verbatim, do not retry-loop prod.
3. Update `result.md` (§Stage B verification: probe outputs + smoke PASS line + any anomalies), append `phase.md` cross-slice note (cutover executed; what the smoke proved) + Doc impact line (`operations.md`: 0004 cutover executed via the P18.S5 runbook pattern; smoke gained the P19 public-link leg). Return `done`.

## Hard rules (both stages)

Never commit; never push; never transition slice/phase status; never touch `docs/versions` or `docs/current`; never run alembic against the production database (that is the operator's runbook step); prod interactions are read-only in Stage A and read-only + the smoke's own throwaway signup/write journey in Stage B.
