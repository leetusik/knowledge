# P11.S2 — Metering hook (record writes/deletes/search + stamp last_used_at)

Plan for slice **P11.S2** (implementation, risk **medium** → `slice-executor-mid`). This is the crux
slice: it records usage events for the metered content operations and stamps credential recency,
solving the sync-handler → async-Postgres-write wrinkle. Reuses S1's `server/usage/` service
(`record_event` raises; S2 wraps it best-effort). Shared context: `works/phases/active/P11/phase.md`.

## Context

P11 meters **writes + searches only** (operator-approved); open reads stay fast (no added DB write).
S1 built the `usage_events` store + `UsageService`. S2 wires the metering in: on a successful
`POST /api/documents` (201), `DELETE /api/documents/*` (2xx), and `GET /api/search` (2xx), record a
`usage_events` row (best-effort, never fails the request), and stamp the caller's `vk_` credential
`last_used_at`. All inert in legacy mode (`DATABASE_URL` unset) — the 65-test legacy regression must
stay green.

## Mechanism (the sync→async resolution)

The content handlers are **sync `def`** (`server/main.py`: `create_document:313`, `search:241`,
`_delete_document:493` via `delete_document:586`/`delete_document_by_path:572`) — they cannot `await`
a Postgres write. So split responsibilities:

1. **Sync handler → stash a hint** (no `await`): on each success path, set `request.state.usage` to a
   small `UsageHint`. The handler is the authority on *what happened* and *for which project*.
2. **Async HTTP middleware → do the write**: `@app.middleware("http")` runs in the event loop; after
   `call_next` returns, if a hint is present, the response is 2xx, and `tenant_id` is set, it performs
   the best-effort Postgres writes (record event + stamp last_used). Awaiting before returning the
   response keeps it **synchronous** w.r.t. the client (the operator's choice), while the sync handler
   never blocks on Postgres.

This is inert in legacy mode: `resolve_api_*` return `_LEGACY` (`tenant_id=None`), so the middleware's
`tenant_id is not None` guard skips all Postgres access — reads and writes behave byte-for-byte as
pre-S2, and no engine is ever created.

## Deliverables

### 1. `server/api_auth.py` — expose the credential id on the context

- Add `credential_id: UUID | None = None` to `ApiAuthContext` (`api_auth.py:38`).
- In `_resolve_tenant_bearer` (`:147`), the `vk_` branch already has `cred` — return
  `ApiAuthContext(tenant_id=project.tenant_id, project_id=project.id, credential_id=cred.id)`. Master
  and session branches leave it `None` (master has no DB row; session `/api/*` usage is out of scope
  for credential recency). **Do not** stamp `last_used_at` here — that would write on every read; the
  stamp happens in the middleware on metered events only.

### 2. `server/usage/metering.py` (new) — the hint + the best-effort recorder

- `@dataclass(slots=True) UsageHint{tenant_id: UUID|None, event_type: str, project_name: str|None, project_id: UUID|None, credential_id: UUID|None}`.
- `async def record_usage(hint: UsageHint) -> None` — **swallows all exceptions** (broad
  `try/except Exception` + `logging.getLogger(__name__).warning(..., exc_info=True)`), so metering can
  never surface an error into the response:
  - Resolve project attribution: `pid = hint.project_id`; if `hint.project_name`, best-effort
    `proj = await get_accounts_service().get_project_by_name(hint.tenant_id, hint.project_name)` and
    use `proj.id` when found (the doc's actual project; falls back to `hint.project_id`, else `None`
    → tenant-level). This is what attributes tenant #1's master-bearer writes per project.
  - `await get_usage_service().record_event(RecordUsageEvent(tenant_id=hint.tenant_id, project_id=pid, event_type=hint.event_type))` (S1's `record_event` raises; the broad catch here is what makes it best-effort).
  - If `hint.credential_id`: `await get_accounts_service().touch_credential_last_used(hint.credential_id)` (best-effort, same catch). This is the **only** place `last_used_at` is stamped — on metered events, never on plain reads.

### 3. `server/main.py` — stash hints + register the middleware

- Import `Request` (from fastapi) and the metering helpers + S1's `EVENT_*` constants.
- Add `request: Request` to `create_document`, `search`, `delete_document`, `delete_document_by_path`
  (FastAPI injects it into sync handlers; response shapes unchanged → frozen contract intact).
- Stash on each **success** path (only reached on 2xx; 422/409/400/404 raise earlier so they are never
  metered):
  - `create_document`, right before `return resp`: `request.state.usage = UsageHint(tenant_id=ctx.tenant_id, event_type=EVENT_DOCUMENT_CREATED, project_name=project, project_id=ctx.project_id, credential_id=ctx.credential_id)`.
  - `search`, right before `return {...}`: `EVENT_SEARCH`, `project_name=project` (may be `None`).
  - both delete handlers, after `_delete_document(...)` returns (only reached when the doc was found):
    `EVENT_DOCUMENT_DELETED`, `project_name=doc["project"]`.
- Register the middleware after `app = FastAPI(...)`:
  ```python
  @app.middleware("http")
  async def usage_metering(request: Request, call_next):
      response = await call_next(request)
      hint = getattr(request.state, "usage", None)
      if hint is not None and hint.tenant_id is not None and 200 <= response.status_code < 300:
          await record_usage(hint)   # best-effort; never raises
      return response
  ```

### 4. `server/accounts/repository.py` + `service.py` — `get_project_by_name`

Add a small tenant-scoped read (mirrors existing `get_project`/`list_projects_for_tenant`): repository
`get_project_by_name(tenant_id, name) -> ProjectRecord | None` =
`select(ProjectModel).where(tenant_id==, name==).order_by(created_at).limit(1)` → first match or None
(names aren't unique per tenant; oldest wins, deterministic). Service wrapper in the standard
`async with … try/except SQLAlchemyError → AccountsReadError` shape.

## Key decisions (state in the plan; note in phase.md)

- **`last_used_at` on metered events only, not on reads** — a deliberate refinement of the DECOMP note
  ("wire in the resolver"): stamping in the resolver would write on every read, contradicting the
  operator's "open reads stay fast." Consequence: a `vk_` key used *only* for reads won't refresh its
  `last_used_at`; it reflects last write/search. Acceptable for an ingest key; revisit if read-recency
  is later wanted (a throttled read stamp).
- **Project attribution** = resolve the operation's project *name* → tenant's project UUID, best-effort,
  nullable fallback (tenant-level). Correct for tenant #1's master-bearer writes and for `vk_` callers.
- **Best-effort everywhere**: metering never changes a status code, body, or timing-visible failure.
  A metering error is logged and swallowed.

## Out of scope (do not touch)

S1's `server/usage/{types,repository,service}.py` internals (S2 only *uses* them); the read API
(`server/usage_api.py` is S3); `scripts/onboarding_smoke.py` (S4); `docs/`. No new event types beyond
S1's three. `POST /api/reindex` stays unmetered (operator-global, `require_bearer`).

## Validation (executor runs; orchestrator re-runs only `validate`)

- **Mandatory:** `python3 -c "import server.main"` imports clean (app builds with the middleware).
- **Mandatory (key regression guard):** `python3 -m pytest -q` → **65 passed**. In legacy mode the
  hints carry `tenant_id=None` and the middleware skips, so every read/write must behave exactly as
  before; response shapes are unchanged. If any legacy test changes, the metering leaked into the
  legacy path — fix before returning.
- **Live behavioral validation is DEFERRED to S4 + REVIEW** (needs Postgres): that a write/delete/search
  records the right `event_type`, that project attribution resolves, that `last_used_at` updates, and
  that a metering failure never fails a request. The Postgres plane has no pytest fixture; do **not**
  fabricate DB results — S4 extends `onboarding_smoke.py` to assert the meter→read chain end-to-end.

## On completion (executor writes)

- `result.md` — files changed, the middleware/stash mechanism, the last_used-on-metered-events decision,
  and which validation ran vs was deferred.
- Append to `phase.md` **Findings & Notes**: the final metering mechanism (middleware + `request.state.usage`
  hint + `record_usage`), the `ApiAuthContext.credential_id` addition, `get_project_by_name` now on the
  accounts service, and the last_used-on-metered-events refinement — so S3 (read API) and S4 (smoke) plan
  against the real behavior. No new Doc-impact lines needed (backend/decisions already listed); confirm them.
