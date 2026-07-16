# P11.S3 result — Usage read API (`/app/usage` + `/app/projects/{id}/usage`)

Thin, session-guarded read layer over S1's `UsageService.get_usage_metrics`
aggregate + the accounts service. No new persistence; no metering (S3 only
*reports*). Implemented exactly per `plan.md`.

## What changed

- **`server/usage_api.py` (new)** — a FastAPI `APIRouter` mirroring
  `server/app_api.py`. Reuses `_load_scoped_project`, `serialize_project`,
  `serialize_credential` from `server.app_api` (imported, not re-declared).
  - `_resolve_window(days) -> (start, end)` — last `days` UTC calendar days ending
    today (inclusive), returned as the half-open `[start, end)` S1 consumes:
    `end` = midnight tomorrow, `start` = midnight of `today-(days-1)`. Under S1's
    `_iter_days` (which drops a trailing exactly-midnight `end` day) this yields
    exactly `days` contiguous zero-filled days, `today-(days-1) .. today`.
  - `serialize_usage_metrics(metrics)` — the shared `{window, totals, daily_counts}`
    shape (explicit fields, no `**dataclass` splat, to keep the contract pinned).
  - `GET /app/usage` — whole-tenant (`project_id=None`, so tenant-level NULL-project
    events are included and a zero-event tenant still gets the zero-filled series);
    payload adds `projects: [serialize_project(...)]` from
    `list_projects_for_tenant(ctx.tenant.id)`.
  - `GET /app/projects/{project_id}/usage` — drill-down via
    `_load_scoped_project(project_id, ctx)` (404 for missing **and** cross-tenant);
    payload adds `project: {...}` + `credentials: [serialize_credential(...)]`
    from `list_project_credentials(project.id)` (surfaces each key's `last_used_at`).
  - Both `async`, `days: int = Query(30, ge=1, le=365)`,
    `ctx: AuthContext = Depends(require_user)`. The `get_usage_metrics` call is
    wrapped `try/except UsageReadError → HTTPException(500, "usage read failed")`.
- **`server/main.py`** — added `from server import usage_api` and
  `app.include_router(usage_api.router)` beside the `app_api` mount. No other change.

## Response contract (pinned — P12 codes against this)

- `GET /app/usage` →
  `{window:{start,end}, totals:{total,documents_created,documents_deleted,searches},
  daily_counts:[{day,total,documents_created,documents_deleted,searches}, …],
  projects:[{id,name,tenant_id,created_at}]}`.
- `GET /app/projects/{project_id}/usage` → same `window/totals/daily_counts` +
  `project:{id,name,tenant_id,created_at}` +
  `credentials:[{id,project_id,name,token_prefix,created_at,last_used_at,revoked_at}]`.
- `daily_counts` is contiguous & zero-filled, length `= days`; `day` is `YYYY-MM-DD`;
  window bounds are ISO datetimes (UTC).
- Cross-tenant / missing project → **404**; `days` out of `[1,365]` → **422** (FastAPI);
  a storage read failure → **500** (`{"detail":"usage read failed"}`).

## Validation

- **Mandatory — imports clean + router mounts:** PASS.
  `.venv/bin/python -c "import server.usage_api, server.main"` imports without error;
  route introspection confirms both `/app/usage` and `/app/projects/{project_id}/usage`
  are mounted on `app`. (FastAPI wraps `include_router` results in `_IncludedRouter`;
  the paths were confirmed via each wrapper's `original_router.routes`.)
- **Mandatory — full suite:** PASS — `.venv/bin/python -m pytest -q` → **65 passed**,
  1 warning (pre-existing Starlette/httpx deprecation, unrelated). The new endpoints
  are session-guarded `/app/*` and are not exercised by the legacy content suite, so
  it stays green as required.

## Deferred (NOT run here)

Live behavioral validation — correct aggregates, cross-tenant 404, and credential
`last_used_at` surfacing — is **DEFERRED to S4's onboarding smoke + REVIEW** (needs
Postgres; no DB in this env). No DB results were fabricated. Per S2's note, the
`last_used_at` a project-usage read surfaces reflects last *metered* use
(write/search), not last read — S4 should drive a write/search before asserting it
is non-null.

## Notes / future addition (not built)

No `/api/project/usage` (`vk_`-scoped self-usage) endpoint was added — the dashboard
uses the session `/app/*` surface. A `vk_` self-usage read is a clean future
addition; noted here only, not implemented.

## Deviations from plan

None. Implemented exactly as specified; the only judgment call was serializing
`UsageMetrics` field-by-field (rather than dataclass unpacking) to keep the pinned
wire shape independent of the dataclass definition — consistent with the plan's
explicit contract.
