# Plan — P21.S1: Backend member `DELETE /app/documents/{doc_id}`

Context: read `../../phase.md` first — Findings & Notes and Constraints there are the verified ground truth for this slice (line refs checked at decomposition). This plan settles the two decisions phase.md delegated to S1.

## Goal

Add an **unmetered**, session-guarded `DELETE /app/documents/{doc_id}` route to `server/documents_api.py` that hard-deletes a member's document by reusing `server/main.py`'s `_delete_document` logic — file, DB row, FTS (trigger), embeddings (cascade), Recent index + git commit when public — with terse tests in `tests/test_documents_api.py`.

## Decisions (settled here)

1. **Reach `_delete_document` via a function-level deferred import**, not an extraction: inside the handler (or its worker fn), `from server.main import WRITE_LOCK, _delete_document` (+ whatever small helpers are needed, e.g. `_tenant_root`/`_tenant_filter` if used). Safe at request time (`main` is fully loaded; `main.py:32` imports `documents_api`, so no module-level import back). This keeps exactly one `WRITE_LOCK` object and zero churn in `main.py`. Only fall back to extracting a shared module if the deferred import proves genuinely unworkable — and if so, keep `main`'s names as aliases.
2. **Offload the sync delete with `starlette.concurrency.run_in_threadpool`** rather than blocking the event loop: a public-root delete runs a git commit and possibly a push (network — seconds). The worker function must open **its own DB connection inside the thread** (SQLite forbids cross-thread connections — mirror how the sync `/api` handlers in `main.py` acquire theirs; do not use the async `get_conn` dependency's connection inside the thread). Lookup + `_delete_document` both happen inside the worker, under `WRITE_LOCK`.

## Route contract

- `DELETE /app/documents/{doc_id}` in `server/documents_api.py`, `Depends(require_user)` — **no public fallback** (never `_resolve_readable_doc`): tenant-scoped `db.get_document(conn, doc_id, tenant_id=str(ctx.tenant.id))`, 404 on miss (404-never-403).
- Build the `ApiAuthContext` bridge per phase.md: `tenant_id=str(ctx.tenant.id)`, `project_id=None`, `credential_id=None`, `is_public = tenant_id == await get_tenant_one_id()` (resolve the tenant-one id before entering the worker thread; `tenant_id` is never None on this plane).
- Call `_delete_document(conn, doc, api_ctx, commit=True, co_authored_by=None)` — behavior identical to the `/api` plane (Recent index + scoped git commit for public root; not transactional; accept as-is).
- **No metering**: never set `request.state.usage`.
- Response: **204 No Content** on success (matches the web plane's `revokeCredential` idiom that S2 will copy; the helper's result dict is not needed by the UI).
- Update the module docstring's route inventory (it currently says "Three session-guarded read routes" and is already stale at four — make it accurate including the new DELETE).

## Tests (terse — append to `tests/test_documents_api.py`, mirror its existing helpers/models)

1. Happy path: seed a doc, DELETE → 204; file gone from disk; subsequent `GET /app/documents/{id}` → 404; FTS search no longer returns it.
2. Tenant isolation: tenant B deletes tenant A's doc id → 404, doc survives.
3. Auth required: no session → 401.
4. Unmetered: delete produces no usage event row (mirror `test_documents_are_unmetered`).

Don't duplicate `/api`-plane delete coverage (`tests/test_api_write.py`). Run the new tests plus `python3 -m pytest tests/test_documents_api.py` as validation.

## Out of scope

Anything under `web/` (that is P21.S2). No doc versioning — if durable truth changed (it does: new `/app` route), append a one-line "Doc impact" note to `phase.md`.
