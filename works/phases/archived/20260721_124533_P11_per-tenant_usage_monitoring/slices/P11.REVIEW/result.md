# P11.REVIEW — result

**Verdict: `pass`.** Per-Tenant Usage Monitoring meets the objective and confirmed intent
(observability only — no quotas/billing/entitlements; the paid retriever stays deferred D6),
honors every resolved decision, and holds every phase invariant. Offline validation is green,
and the **live meter→read E2E was executed and PASSED** against a disposable local
tenant-mode Postgres stack (details below).

Reviewer: slice-executor-high. Scope reviewed: P11.S1–S4 (commits `5f495e2`, `a3e7879`,
`c861d6b`, `2981232`).

## Step 1 — Validation

### Offline gate (all passed)

| Command | Result |
|---|---|
| `.venv/bin/python -m pytest -q` | **65 passed** (legacy regression intact — metering inert with `DATABASE_URL` unset) |
| `.venv/bin/python -c "import server.main, server.usage_api, server.usage.metering"` | clean (app + router + metering import) |
| `.venv/bin/python -m py_compile scripts/onboarding_smoke.py` | clean |
| `python3 scripts/workflow.py validate` | `Workflow validation passed.` |

### Live meter→read E2E — **EXECUTED, PASSED** (not deferred)

Brought up a disposable, isolated tenant-mode stack and ran the extended smoke end-to-end:

- Disposable `postgres:17` container (throwaway, no persistent volume, port 55441 to avoid a
  co-tenant Postgres already on 55432).
- Isolated `KB_ROOT` scratch dir with a minimal tenant-#1 `docs/demo/2026-07-16-hello.md`
  corpus (so the `--master-token` cross-tenant checks have real tenant-#1 data); `KB_GIT_COMMIT=false`.
- `alembic upgrade head` → applied **both** `0001_accounts_tenancy` and `0002_usage_events`
  cleanly; `alembic current` → `0002_usage_events (head)`. This is the first real proof the
  hand-written `0002` migration applies against live Postgres (constraint names, FK
  CASCADE/SET NULL, `down_revision`).
- `python -m server.seed` → created operator + tenant #1 + the `demo` project.
- `uvicorn server.main:app` (tenant mode); boot reindex stamped tenant #1's corpus.
- `python scripts/onboarding_smoke.py --base-url <local> --master-token "$KB_API_TOKEN"` →
  **`PASS`** ("tenant B onboarded …; isolation vs tenant #1 verified; usage metered").
- Stack torn down cleanly (uvicorn killed, container removed).

The uvicorn log confirmed the metered writes/searches returned 201/200 and `/app/usage`
returned 200 with **no `usage metering failed` warnings** — i.e. the real Postgres write path
(`insert_usage_event`, `get_project_by_name`, `touch_credential_last_used`) and the
`func.date(func.timezone("UTC", occurred_at))` GROUP-BY-day aggregate all executed correctly.
The smoke's assertions held live: B's `documents_created == 1` (also a cross-tenant isolation
signal), `searches >= 1`, exactly 30 zero-filled `daily_counts`, B's project listed, project
drill-down `documents_created == 1` + a credential with non-null `last_used_at`, and a foreign
project id → **404**.

## Step 2 — Review of S1–S4 against objective / intent / decisions

**Meets the objective & intent.** Meters per-tenant/per-project usage (document creates/deletes,
searches) and exposes it via `GET /app/usage` + `GET /app/projects/{id}/usage` for P12's
dashboard. **Observability only** — no quota/billing/entitlement logic exists anywhere
(`usage_api.py` only reports; the metering hook only records). The paid retriever stays out of
scope (D6). D8 (`usage_events` retention) is filed.

**Resolved decisions honored.**
- Event-log grain: `usage_events` is one durable row per event; aggregates derived on read
  (`repository.get_usage_metrics`).
- Meter writes + searches only: only `create_document`, `delete_document`/`_by_path`, and
  `search` stash a `UsageHint` (`server/main.py`); the open reads (`list_documents`,
  `get_document`, `list_tags`, `list_projects`, by-path) set no hint — the read path holds no
  hot-path write, as the operator required.
- Vocky read shape: `{window, totals, daily_counts, projects|credentials}`, 30-day default,
  zero-filled days (`usage_api.serialize_usage_metrics`).

**Correctness of the load-bearing pieces (code-verified + live-verified).**
- Aggregate (`server/usage/repository.py:67-149`): half-open `[start, end)`
  (`occurred_at >= start`, `< end`); per-`event_type` `func.count().filter(...)`;
  `_iter_days` (`:31-43`) zero-fills a contiguous UTC-day series and correctly excludes a
  trailing exactly-midnight `end` day; totals summed in Python.
- Metering middleware (`server/main.py:80-103`): records only when a hint is present,
  `hint.tenant_id is not None`, **and** the response is 2xx; the hint is stashed on the
  handler success path only, so error responses (which raise before the stash) are never
  metered — double-guarded.
- Best-effort (`server/usage/metering.py:50-98`): `record_usage` wraps S1's raising
  `record_event` in a broad `except Exception` + WARNING log — a metering failure can never
  fail the observed request. `record_event` runs on its own isolated transaction
  (`service.py:36-50`).
- Project attribution (`metering.py:69-83`): `project_name` → tenant project UUID
  (`get_project_by_name`, oldest-wins, tenant-scoped), fallback to the `vk_` caller's
  `project_id`, else tenant-level NULL via the `SET NULL` FK.
- `0002` migration (`alembic/versions/0002_usage_events.py`): FK actions CASCADE (tenant) /
  SET NULL (project); constraint names match the model's `NAMING_CONVENTION`
  (`pk_usage_events`, `fk_usage_events_tenant_id_tenants`, `fk_usage_events_project_id_projects`);
  `down_revision="0001_accounts_tenancy"`. Applied live with no autogenerate drift.

**Invariants intact.**
- Legacy/dormant parity: 65-test suite green; hints carry `tenant_id=None` in legacy mode, the
  middleware guard skips, no engine is created.
- Frozen `/api/*` consumer contract: metering is a `request.state` side effect recorded
  post-response; no request/response field changed (the smoke's `FROZEN_201_KEYS` check passed
  live).
- Cross-tenant scoping on the usage reads: `_load_scoped_project` → 404 for missing **and**
  cross-tenant (live-verified with a random UUID → 404).
- Single-worker + `WRITE_LOCK` untouched (the async middleware/accounts plane never touch the
  lock).

**S2 `last_used_at` refinement** (stamped on metered events only, not in the resolver — so open
reads stay fast) is sound and documented in `decisions.md` + `security.md`.

No defects found. `changes_requested` was considered and rejected — every load-bearing piece is
correct in code and confirmed live.

## Step 3 — Durable-doc consolidation (six versions, one per affected doc)

| Doc | New version | Captures |
|---|---|---|
| `data` | `v0007` | `usage_events` as the 7th control-plane table (event-log grain, columns/FKs/indexes), `0002` migration, retention deferred (D8) |
| `api` | `v0008` | additive `GET /app/usage` + `GET /app/projects/{id}/usage` (pinned shape, `days` window, cross-tenant 404); frozen `/api/*` contract untouched |
| `backend` | `v0006` | `server/usage/` package + `usage_api.py`; stash + async metering-middleware seam; `credential_id`; `get_project_by_name`; best-effort semantics; `last_used_at` on metered events only |
| `operations` | `v0012` | `0002_usage_events` as a second migration (`alembic upgrade head` applies both); `onboarding_smoke.py` extended with the usage meter→read assertions |
| `decisions` | `v0012` | six ADRs: event-log over rollup (D8), meter writes+searches only, `last_used_at` on metered events, derive-on-read aggregate, name→UUID nullable attribution, free-text `event_type` |
| `security` | `v0007` | per-tenant usage isolation (scoped by `tenant_id`, cross-tenant/missing → 404), metering best-effort never alters a request, no new PII; three checklist items |

Authored additively in house style (`(P11)` markers, additive sections), then
`rebuild-docs` regenerated `docs/current/*.md`; `validate` passed.

## Deviations

- **Live E2E was run** (the plan asked me to strongly attempt it and permitted deferral). It
  PASSED; not deferred to post-deploy.
- Ran the live smoke on an **isolated scratch `KB_ROOT`** with a minimal seeded tenant-#1
  `docs/` corpus and on **non-default ports** (Postgres 55441, api 8793) to avoid a co-tenant
  Postgres already bound to 55432 and to avoid touching the repo's `docs/`/git.
- Two `doc-new-version` summaries (originally longer) were **shortened** because the derived
  version **filename** exceeded the macOS 255-byte limit; the shorter summaries convey the same
  content. (The `decisions` version was created once with a too-long name, then reverted in
  `docs/index.json` and re-created shorter — net state is one clean `decisions/v0012`.) No other
  deviation.

## Handoff to the orchestrator

Record with:
`python3 scripts/workflow.py review-phase P11 --verdict pass --reviewer slice-executor-high --note "…"`,
then `validate` and commit. (I did not run `review-phase`/`finish-slice`, transition status, or
commit — those are the orchestrator's.)
