# P11.S2 result — Metering hook (record writes/deletes/search + stamp last_used_at)

Status: **done**. Implemented exactly per `plan.md`, no deviations.

## What was built

The sync-handler → async-Postgres-write wrinkle is resolved with a **stash + async
middleware** split, as the plan specified:

- Each metered sync handler stashes a `UsageHint` on `request.state.usage` on its
  **success path only** (never on the 401/404/409/422/400 paths, which raise before
  the stash).
- A single `@app.middleware("http")` (`usage_metering`) runs in the event loop after
  `call_next`, and calls `record_usage(hint)` when — and only when — a hint is
  present, `hint.tenant_id is not None`, and the response is 2xx. Awaiting before
  returning keeps metering synchronous w.r.t. the client (the operator's choice)
  while the sync handler never blocks on Postgres.

**Best-effort invariant held:** `record_usage` wraps everything in a broad
`try/except Exception` + `logging.warning(..., exc_info=True)`. S1's
`record_event` raises `UsagePersistenceError`; the catch here is what makes metering
best-effort — it can never change a status code, response body, or timing-visible
failure of the observed request.

**Legacy inertness:** in legacy mode (`DATABASE_URL` unset) the resolvers return the
`_LEGACY` context (`tenant_id=None`), so every hint carries `tenant_id=None` and the
middleware's `hint.tenant_id is not None` guard skips all Postgres access — no engine
is ever created, and reads/writes behave byte-for-byte as pre-S2.

**`last_used_at` on metered events only** (a deliberate refinement of the DECOMP
"wire in the resolver" note): the stamp lives in `record_usage`, not in
`_resolve_tenant_bearer`. Stamping in the resolver would write on *every* read,
contradicting "open reads stay fast." Consequence: a `vk_` key used only for reads
won't refresh `last_used_at`; it reflects the last write/search. `credential_id` is
carried on `ApiAuthContext` (set only in the `vk_` branch) so the middleware can
stamp it; master/session callers leave it `None` (no stamp).

**Project attribution:** `record_usage` resolves the operation's project *name* →
tenant project UUID via the new `get_project_by_name` (best-effort); falls back to
the `vk_` caller's bound `project_id`, else tenant-level (NULL project). This is what
attributes tenant #1's master-bearer writes per project.

## Files changed

- `server/api_auth.py` — added `credential_id: UUID | None = None` to
  `ApiAuthContext`; set `credential_id=cred.id` in the `vk_` branch of
  `_resolve_tenant_bearer`. No `last_used_at` stamp in the resolver.
- `server/usage/metering.py` (**new**) — `UsageHint` dataclass + best-effort
  `async record_usage(hint)`.
- `server/main.py` — imported `Request` and the `EVENT_*` constants +
  `UsageHint`/`record_usage`; registered the `usage_metering` HTTP middleware; added
  `request: Request` to `create_document`, `search`, `delete_document`,
  `delete_document_by_path`; stashed a `UsageHint` on each success path.
- `server/accounts/repository.py` — added `get_project_by_name(tenant_id, name)`
  (tenant-scoped, oldest-wins, `LIMIT 1`, standard read pattern).
- `server/accounts/service.py` — added the `get_project_by_name` service wrapper
  (standard `async with … try/except SQLAlchemyError → AccountsReadError` shape).

## Validation

- **`.venv/bin/python -c "import server.main"`** → **clean** (`IMPORT_OK`); the app
  builds with the new middleware and handler signatures.
- **`.venv/bin/python -m pytest -q`** → **65 passed** (baseline was 65 passed before
  the change). The legacy path is byte-for-byte unchanged: hints carry
  `tenant_id=None`, the middleware skips. The metered endpoints are exercised by the
  passing suite (`tests/test_api_write.py` for create/delete,
  `tests/test_api_read.py` for search), confirming the `request: Request` injection
  and middleware are transparent in legacy mode.
- `server/usage/metering.py` imports standalone (`UsageHint`, `record_usage`).

### Deferred (needs Postgres — no pytest fixture for the accounts/usage plane)

Live behavioral validation is **DEFERRED to S4's onboarding smoke + REVIEW**: that a
write/delete/search records the right `event_type`, that project attribution resolves
name → UUID, that `last_used_at` updates on a `vk_` metered event, and that a metering
failure never fails a request. Not fabricated here — S4 extends
`scripts/onboarding_smoke.py` to assert the meter → read chain end-to-end.

## Deviations from plan

None. `request: Request` was placed as a non-default parameter ahead of the
default-valued params in each handler (Python argument-ordering requirement);
FastAPI injects it by type regardless of position, and the 65-test suite confirms the
route signatures build and behave unchanged.

## Doc impact

No new Doc-impact lines needed — the `backend.md` / `decisions.md` entries the review
consolidates are already in `phase.md`'s "Doc impact" list and remain accurate. The
last_used-on-metered-events refinement is captured in `phase.md` Findings & Notes for
S3/S4 to plan against and for REVIEW to reflect in the `decisions.md` version.
