# P11.S3 — Usage read API (`/app/usage` + `/app/projects/{id}/usage`)

Plan for slice **P11.S3** (implementation, risk **medium** → `slice-executor-mid`). Exposes S1's
derive-on-read aggregate as two session-guarded, tenant-scoped read endpoints that **P12's dashboard
consumes**. This is a thin route layer over S1's `UsageService` + the existing accounts service — no
new persistence. Shared context: `works/phases/active/P11/phase.md`.

## Context

S1 built `UsageService.get_usage_metrics(*, tenant_id, project_id, start, end) -> UsageMetrics`
(half-open window, per-type conditional counts, zero-filled UTC-day series, totals summed). S2 records
the events. S3 serves the metrics to the authenticated web app. The response shape is a **contract P12
codes against**, so pin it. Mirror vocky's proven `usage_api.py` read shape, but in **our FastAPI
style** (like `server/app_api.py`), and scope by `tenant_id` directly (our aggregate already does — no
empty-tenant short-circuit needed, unlike vocky's project-ids-IN approach).

## Deliverables

### 1. `server/usage_api.py` (new) — a FastAPI `APIRouter`, session-guarded

Mirror `server/app_api.py`'s style exactly: `router = APIRouter()`, `Depends(require_user)`, UUID path
params, and **reuse** its helpers — `from server.app_api import _load_scoped_project, serialize_project, serialize_credential`
(vocky reuses the same three). Imports: `require_user`, `AuthContext` from `server.accounts.auth`;
`get_accounts_service`; `get_usage_service`, `UsageReadError`, `UsageMetrics` from `server.usage`.

**Window resolution** — a single dashboard-friendly `days` param (no inverted-window risk, so no manual
validation; FastAPI validates the bound):
```python
def _resolve_window(days: int) -> tuple[datetime, datetime]:
    # last `days` UTC calendar days ending today (inclusive), half-open [start, end)
    today = datetime.now(UTC).date()
    end = datetime(today.year, today.month, today.day, tzinfo=UTC) + timedelta(days=1)  # start of tomorrow
    start = datetime(today.year, today.month, today.day, tzinfo=UTC) - timedelta(days=days - 1)
    return start, end
```
(This yields exactly `days` days from `today-(days-1)` through `today` under S1's `_iter_days`.)

**`serialize_usage_metrics(metrics: UsageMetrics) -> dict`** — the shared shape:
```python
{
  "window": {"start": metrics.window_start.isoformat(), "end": metrics.window_end.isoformat()},
  "totals": {"total", "documents_created", "documents_deleted", "searches"},   # from metrics.totals
  "daily_counts": [{"day": d.day.isoformat(), "total", "documents_created", "documents_deleted", "searches"} …],
}
```

**Endpoints** (both `async def`, `days: int = Query(30, ge=1, le=365)`, `ctx: AuthContext = Depends(require_user)`):

- `GET /app/usage` — whole-tenant. `start, end = _resolve_window(days)`;
  `metrics = await get_usage_service().get_usage_metrics(tenant_id=ctx.tenant.id, project_id=None, start=start, end=end)`
  (scopes by `tenant_id`, so tenant-level NULL-project events are included and a zero-event tenant returns
  the zero-filled series — no short-circuit). Payload = `serialize_usage_metrics(metrics)` +
  `"projects": [serialize_project(p) for p in await get_accounts_service().list_projects_for_tenant(ctx.tenant.id)]`.

- `GET /app/projects/{project_id}/usage` — one project (drill-down).
  `project = await _load_scoped_project(project_id, ctx)` (returns **404** for missing *and* cross-tenant —
  existence never leaks); `metrics = get_usage_metrics(tenant_id=ctx.tenant.id, project_id=project.id, …)`.
  Payload = `serialize_usage_metrics(metrics)` + `"project": serialize_project(project)` +
  `"credentials": [serialize_credential(c) for c in await get_accounts_service().list_project_credentials(project.id)]`
  (surfaces each key's `last_used_at`).

- Wrap the `get_usage_metrics` call in `try/except UsageReadError → HTTPException(500, "usage read failed")`
  (matches vocky's read-failure handling; keeps a clean 500 rather than a bare traceback).

### 2. `server/main.py` — mount the router

Add `from server import usage_api` and `app.include_router(usage_api.router)` alongside the existing
`app.include_router(app_api.router)` / `auth_api.router` lines. No other `main.py` change.

## Response contract (pin for P12)

- `GET /app/usage` → `{window:{start,end}, totals:{total,documents_created,documents_deleted,searches}, daily_counts:[{day,…}], projects:[{id,name,tenant_id,created_at}]}`.
- `GET /app/projects/{id}/usage` → same `window/totals/daily_counts` + `project:{…}` + `credentials:[{id,project_id,name,token_prefix,created_at,last_used_at,revoked_at}]`.
- `daily_counts` is contiguous & zero-filled (length = `days`); `day` is `YYYY-MM-DD`; window bounds are ISO datetimes.
- Cross-tenant / missing project → **404**; bad `days` → **422** (FastAPI).

## Out of scope (do not touch)

`server/usage/{types,repository,service,metering}.py` internals (only use them); `server/api_auth.py`,
the content handlers, the metering middleware (all S2, done); `scripts/onboarding_smoke.py` (S4); `docs/`.
No `/api/project/usage` (vk_-scoped self-usage) in P11 — the dashboard uses the session `/app/*` surface;
a `vk_` self-usage endpoint is a clean future addition (note it, don't build it).

## Validation (executor runs; orchestrator re-runs only `validate`)

- **Mandatory:** `python3 -c "import server.usage_api, server.main"` imports clean (via `.venv/bin/python`);
  the router mounts.
- **Mandatory:** `python3 -m pytest -q` → **65 passed**. The new endpoints are session-guarded `/app/*`
  (only functional in tenant mode); the legacy content suite doesn't exercise them, so it must stay green.
- **Live behavioral validation DEFERRED to S4 + REVIEW** (needs Postgres): the two endpoints return the
  right aggregate + projects/credentials, cross-tenant 404, and `last_used_at` surfacing. Do **not**
  fabricate DB results — S4 asserts the meter→read chain end-to-end.

## On completion (executor writes)

- `result.md` — the new module + endpoints, the pinned response contract, the `days` window semantics,
  and which validation ran vs was deferred.
- Append to `phase.md` **Findings & Notes**: the two endpoints + their exact response shapes (so S4 asserts
  against them) and the `days`-window semantics. Confirm the **Doc impact** `api.md` line
  (`GET /app/usage` + `GET /app/projects/{id}/usage`).
