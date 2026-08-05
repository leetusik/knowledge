# Result — P21.DECOMP (Web document deletion: decomposition)

## What I created

Two middle slices, bare folders (each holds only `slice.json`; no `plan.md` pre-filled):

| Slice | Name | kind / risk | order | depends_on |
| --- | --- | --- | --- | --- |
| `P21.S1` | Backend: member `DELETE /app/documents/{doc_id}` | implementation / high | 2 | `P21.DECOMP` |
| `P21.S2` | Web: delete action + confirm UI on documents pages | implementation / high | 3 | `P21.S1` |

Both are `high` on purpose: each writes real code across several files (S1: a route module +
tests, plus either an extraction or a bridging shim; S2: client seam + server action + client
island + two page surfaces + copy). Neither fits the `mid` tier's one-line/docs envelope.

`phase.md` seeded: Context, Decomposition (both slices + rationale + the metered-vs-unmetered
decision), Findings & Notes (verified research), Constraints, a `Doc impact` section (empty for
this slice, with the anticipated docs listed for the middle slices), and Open Questions.

## Validation

| Command | Outcome |
| --- | --- |
| `python3 scripts/workflow.py new-slice --phase P21 --slice P21.S1 ...` | pass — `created slice P21.S1` |
| `python3 scripts/workflow.py new-slice --phase P21 --slice P21.S2 ...` | pass — `created slice P21.S2` |
| `ls -a works/phases/active/P21/slices/P21.S{1,2}` | pass — each contains only `slice.json` (bare folders) |
| `python3 scripts/workflow.py validate` | pass — `Workflow validation passed.` |

No source code was touched by this slice.

## Research verification — corrections to `plan.md`

I spot-checked every cited file/line. The plan's substance held up; four small corrections and
three additions, all reflected in `phase.md`:

**Corrections**

1. `WRITE_LOCK` is `server/main.py:150`, not `:149`.
2. The detail page's member branch is `web/src/app/(public)/documents/[id]/page.tsx:76–96`
   (plan said 77–97); the back-link + `CopyLinkButton` row inside it is `:82–91`.
3. The `documents_api.py` "unmetered by design" statement spans roughly lines 16–21 of the module
   docstring, not 14–21 — and the docstring's "Three session-guarded … read routes" is itself
   stale: there are now four (`/app/documents`, `/app/documents/{id}`, `/app/documents/{id}/raw`,
   `/app/search`). Worth fixing while S1 is in that docstring anyway (it will need updating for
   the new DELETE regardless).
4. Metering line refs: `:717` and `:742` are the two DELETE **route decorators**; the
   `request.state.usage` stamps are at `:732` and `:757`. `server/db.py:337` is
   `delete_document_by_path` (the cascade is documented in its docstring, not at `:337–352`
   literally). Everything else — `_delete_document` at `:639`, the `documents_client` fixture and
   seed helpers at `tests/test_documents_api.py:40/84/91/97`, `revokeCredentialAction` at
   `actions.ts:156`, `sendJson` at `client.ts:119` — was exact.

**Additions the implementation slices need**

5. **The circular import is confirmed and unavoidable at module level.** `server/main.py:32`
   imports `server.documents_api` (mounted at `:137`), so `documents_api` cannot
   `from server.main import _delete_document` at import time — the module already carries a local
   `get_conn` for exactly this reason. S1 must pick: extract into a shared module (keeping
   `main`'s names as aliases, and keeping **one** `WRITE_LOCK` object) or use a function-level
   deferred import. Helpfully, nothing in `tests/` references `WRITE_LOCK`, `_delete_document`, or
   `_tenant_root`, so an extraction has no test-side fallout.
6. **The `AuthContext` → `ApiAuthContext` bridge is a 4-field construction**, and `is_public` is
   the load-bearing field — it decides `docs/` vs `tenants/<uuid>/`, the Recent-index update, and
   the git commit. Mirror `server/api_auth.py:213`:
   `is_public = (tenant_id is None) or (tenant_id == await get_tenant_one_id())`. Getting this
   wrong silently deletes from (or fails to delete from) the wrong root.
7. **Sync/async hazard.** `documents_api` handlers are `async def` with an **async** `get_conn`
   (a sync handler would receive a cross-thread SQLite connection). `_delete_document` is sync,
   blocking, and grabs a `threading.Lock` — called straight from an `async def` handler it blocks
   the event loop while it holds/awaits the lock. S1 must make this an explicit decision (accept
   the short block, or `run_in_threadpool` with a connection opened in that thread) rather than
   mixing a sync handler with the async dependency.

## Design decision recorded

Reusing the metered `/api` delete with the user's session bearer would work (`resolve_api_write`
accepts session tokens) and costs zero backend code — rejected because it would meter web-UI
clicks as billable `EVENT_DOCUMENT_DELETED` events and route the web app through the machine
plane's resolver. The new `/app` route reuses the *logic*, not the route. Rationale is in
`phase.md` so S1 doesn't relitigate it.

## Watch-outs for S1 / S2

- **No public fallback on delete.** `GET /app/documents/{id}` is `optional_user` +
  `_resolve_readable_doc` (P19 anonymous public reads). DELETE must be `require_user` + a
  tenant-scoped `db.get_document(..., tenant_id=str(ctx.tenant.id))`, 404 on any miss.
- **Never touch `document-view.tsx`** — it is deliberately auth-free and shared with the anonymous
  branch. The detail-page delete belongs in the member branch of `page.tsx` only.
- Detail-page delete needs `redirect("/documents")` after success (the page it lives on is gone),
  and every `revalidatePath` must use the route-pattern form (`"/documents/[id]", "page"`).
- The list page renders via `DataTable` with a `columns(searchMode)` definition in the same server
  file; the confirm island drops into a cell there.
- Keep the new test suite terse (Hard Rules): the `/api` plane's delete behavior is already covered
  by `tests/test_api_write.py:249–288`; the new tests should cover only the `/app` route's own
  guarantees (auth, tenant isolation, unmetered, doc actually gone).

## Deviations from `plan.md`

None in substance. I added a `## Doc impact` section to `phase.md` (matching the archived-phase
convention) so the middle slices have a defined place to append; this slice recorded no doc
impact of its own.
