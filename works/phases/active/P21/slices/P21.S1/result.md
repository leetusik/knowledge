# Result — P21.S1: Backend member `DELETE /app/documents/{doc_id}`

Status: **done**. The route ships as planned; the two delegated decisions landed exactly as
the plan settled them (deferred import + `run_in_threadpool`). Two things the plan did not
anticipate came up — the plugin-template parity gate and a process-global `/auth` throttle
that the suite was already tripping — both handled inside this slice's own files (details
below).

## What landed

`server/documents_api.py`

- `_delete_owned_document(doc_id, api_ctx) -> bool` — the worker function, run off the event
  loop. Opens **its own** SQLite connection (`db.connect()`), does the tenant-scoped lookup,
  calls `_delete_document(conn, doc, api_ctx, commit=True, co_authored_by=None)`, closes the
  connection in a `finally`. Returns `False` on a lookup miss ⇒ the handler raises 404.
  `from server.main import _delete_document` is **function-level** (deferred) — `main.py`
  imports this module at load to mount the router, so a module-level import would be circular.
- `delete_document` — `@router.delete("/app/documents/{doc_id}", status_code=204,
  response_class=Response)`, `ctx: AuthContext = Depends(require_user)`, **no** `conn`
  dependency (the worker owns its connection), **no** `request.state.usage`. It resolves
  `get_tenant_one_id()` (an `await`) *before* entering the thread, builds the `ApiAuthContext`
  bridge, `await run_in_threadpool(_delete_owned_document, doc_id, api_ctx)`, and returns
  `Response(status_code=204)` (404 on a miss).
- New module-level imports: `starlette.concurrency.run_in_threadpool` and
  `server.api_auth.{ApiAuthContext, get_tenant_one_id}` — `api_auth` imports neither `main` nor
  this module, so no cycle.
- Module docstring: the stale "Three session-guarded read routes" inventory is now an accurate
  five-route list (four reads incl. `/raw`, plus the new DELETE), and the "unmetered by
  construction" paragraph now states *why* the delete stays free (it reuses the helper's
  **logic**, not the metered `/api` route).

`tests/test_documents_api.py` — four terse additions (plus one line in an existing test):

1. `test_delete_document_removes_file_row_and_index` — seeds a doc + materializes its file
   under `tenants/<uuid>/`, DELETE → 204, file gone, subsequent `GET` → 404, and the FTS search
   for its body term returns `total == 0` (proves the AFTER DELETE trigger fired).
2. `test_delete_document_tenant_isolation` — tenant A deleting B's id → 404, and B's doc still
   reads 200.
3. `test_delete_document_is_unmetered` — `usage_events` count unchanged across a successful
   delete.
4. `test_documents_require_auth` gained one line: `client.delete("/app/documents/1") == 401`
   (kept in the existing auth test rather than a fifth test — it is one assertion, and this is
   where the 401/404 split for this surface is already documented).

Small helper `_seeded_file(tmp_path, tenant, rel)` writes the file for (1).

## How the settled decisions played out

- **Deferred import (decision 1)** — worked with zero friction; no extraction was needed, so
  `server/main.py` is **untouched** and there is still exactly **one** `WRITE_LOCK` object.
- **`run_in_threadpool` (decision 2)** — worked; the SQLite connection is created and closed
  inside the worker thread, so `check_same_thread` never fires. The `TestClient` (sync) drives
  it fine.
- **One clarification on "lookup + delete under `WRITE_LOCK`"** (plan §Decisions 2): the lock is
  taken **inside** `_delete_document` and `threading.Lock` is *not* reentrant, so wrapping the
  worker's lookup+call in `with WRITE_LOCK:` would self-deadlock. The worker therefore mirrors
  the `/api` handlers exactly — unlocked lookup, then the helper takes the lock for the mutation.
  `WRITE_LOCK` is consequently never imported here.
- **`is_public` bridge — one deliberate type deviation.** The plan wrote
  `tenant_id=str(ctx.tenant.id)` with `is_public = tenant_id == await get_tenant_one_id()`.
  Passed as a **string** those two never compare equal (`get_tenant_one_id()` returns a `UUID`),
  so a tenant-#1 member's delete would silently take the non-public branch — wrong root
  (`tenants/<uuid>/` instead of `docs/`), no Recent-index update, no git commit. The context is
  therefore built with the **`UUID`** (`tenant_id=ctx.tenant.id`), which is also what
  `ApiAuthContext` declares and what `resolve_api_write` stores; `_tenant_root`/`_tenant_filter`
  both `str()` it themselves, and the worker's lookup uses `str(api_ctx.tenant_id)`.

## Validation

Disposable `postgres:17` (docker, `127.0.0.1:55433`), `KB_TEST_DATABASE_URL` set, database
dropped + recreated before each full run; interpreter `.venv/bin/python`.

| Command | Result |
| --- | --- |
| `KB_TEST_DATABASE_URL=… .venv/bin/python -m pytest tests/test_documents_api.py -v` | **1 failed, 7 passed** — all four new/extended delete cases PASS; the single failure is the pre-existing `test_documents_list_detail_and_project_bridge` (`format` key, see below) |
| `KB_TEST_DATABASE_URL=… .venv/bin/python -m pytest tests/test_documents_api.py tests/test_api_write.py tests/test_public_read.py -q` | **1 failed, 25 passed** — same single pre-existing failure |
| `KB_TEST_DATABASE_URL=… .venv/bin/python -m pytest tests/ -q` (fresh DB) | **1 failed, 99 passed** — same single pre-existing failure |
| baseline for comparison: same full-suite command on a `git archive HEAD` export (my changes absent), fresh DB | **8 failed, 89 passed** |
| `.venv/bin/python scripts/plugin_parity.py` | **PASS** |
| `python3 scripts/workflow.py validate` | **Workflow validation passed** |

Notes on the numbers:

- **The 1 remaining failure is pre-existing and unrelated.** `test_documents_list_detail_and_
  project_bridge` asserts `set(item) == _LIST_KEYS`, but the list projector also returns
  `format` (added in P16 — the module docstring even says "`format` does — additive"). It is the
  same failure the P18 review flagged and `docs/current/qa.md:394` records ("88 passed, 1 failed
  — the 1 failure is the pre-existing `documents_api` case"). Out of scope here; left untouched.
- **The other 7 baseline failures are gone** — see the throttle note below. The suite is strictly
  greener than before this slice.
- Not covered by tests: the `is_public=True` (tenant #1 ⇒ `docs/` + Recent index + git commit)
  branch. It needs `KB_OPERATOR_EMAIL` + a git work tree, and the identical helper call is
  already covered on the `/api` plane (`tests/test_api_write.py::test_delete_happy_path`). The
  bridge line that selects it is exercised in its `False` form by every new test.

## Two things the plan did not anticipate

1. **Plugin-template parity is a CI gate.** `plugin/templates/manifest.json` lists `server` and
   `tests` in `shipped_dirs`, and `scripts/plugin_parity.py` (run by `.github/workflows/
   plugin-ci.yml`) fails on any byte drift. Editing the two files turned it red
   (`FAIL — 2 issue(s)`), so both are byte-mirrored to `plugin/templates/kb/server/
   documents_api.py` and `plugin/templates/kb/tests/test_documents_api.py`. Gate green again.
   **This is a standing obligation for every `server/**` and `tests/**` edit** — S2 is web-only
   so it is unaffected, but it is worth REVIEW's attention.
2. **A process-global `/auth` throttle was already breaking the full suite.**
   `server/auth_api.py::_enforce_rate_limit` counts per `(IP, path)` in a **module-global** dict
   with `KB_AUTH_RATE_LIMIT` default 20 per 15 minutes — one window for the entire pytest
   session. HEAD was already ~7 signups past it (P19's `test_public_read.py` pushed it over), so
   the last suites 429'd during fixture setup; my four extra signups pushed four more tests over
   the same cliff. Fixed at the source in the fixture I own: `documents_client` now sets
   `KB_AUTH_RATE_LIMIT=0` (the limiter early-returns **without counting**, so this frees the
   budget for every suite that reuses this fixture — `test_graph_api`, `test_public_read`,
   `test_html_documents` — and no pytest test asserts on throttling anywhere). That single line
   is what turns 8 failures into 1. `tests/conftest.py` and the other suites were **not** touched.

## What S2 needs — the exact endpoint contract

- `DELETE /app/documents/{doc_id}` on the backend origin (the same origin the other `/app`
  routes use; call it through the BFF with the session bearer, exactly like `revokeCredential`).
- **204 No Content**, empty body, on success → `sendJson<void>(..., "DELETE")` is the right seam.
- **401** with no/invalid session (generic `{"detail":"Unauthorized"}` — no optional-identity
  fallback here, unlike the GETs).
- **404** `{"detail":"no document with id <id>"}` for a missing id **and** for another tenant's
  id — indistinguishable by design. Map both to one "not found / no longer exists" copy.
- No other status is produced by the handler; a git/push failure inside the helper is swallowed
  into its (discarded) result dict, so a failed publish still answers **204**.
- `doc_id` is the numeric content-plane document id — the same `row.id` already on the list rows
  and the detail page.
- The delete is **hard and immediate** (no trash, no undo) and can take a moment for a public
  document (git commit, and a push when enabled) — the request is offloaded to a worker thread
  server-side, but the client still waits for it. Copy should not promise recoverability.
- Not idempotent in the REST-purist sense: a second delete of the same id answers 404, not 204.
  After a successful delete from the detail page, `redirect("/documents")` (the plan's shape)
  avoids re-rendering a now-404 page.
