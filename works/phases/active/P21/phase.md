# Phase P21: Web document deletion

_Intent: see [intent.md](intent.md)._

## Objective

Let logged-in members hard-delete documents from the web app (confirm dialog on the documents pages), reusing the server's existing _delete_document path so the doc is removed from file, DB, FTS, and embeddings.

## Context

Today the web app has **no** delete capability. Delete exists only on the machine plane
(`DELETE /api/documents/{doc_id}` and `.../by-path/{rel_path}`), both of which meter
`EVENT_DOCUMENT_DELETED`. The web `/app` plane is read-only and unmetered by construction.
P21 adds a member-only, unmetered delete to the `/app` plane and wires a two-step confirm UI
into the documents list page and the detail page's member branch.

Mode note (operator-set): `DECOMP` was gated; the rest of the phase runs `auto`.

## Decomposition

Two slices, backend first — the web slice codes against the new endpoint's contract, so it
cannot land before S1. Both are `risk: high` (real code, multiple files each).

**P21.S1 — Backend: member `DELETE /app/documents/{doc_id}`** (`implementation`, `high`,
order 2, depends on `P21.DECOMP`)
Add an unmetered, session-guarded delete route to `server/documents_api.py`:
`Depends(require_user)`, member-scoped lookup only (**no public fallback** — unlike the GET
routes, see Findings), reusing `_delete_document`'s logic under the same `WRITE_LOCK`, and
stamping **no** `request.state.usage`. Terse tests appended to `tests/test_documents_api.py`:
happy path (file gone + DB/FTS row gone → subsequent GET 404s), tenant isolation (another
tenant's id → 404, doc survives), auth required (401), and unmetered (no usage row).

**P21.S2 — Web: delete action + confirm UI on the documents pages** (`implementation`,
`high`, order 3, depends on `P21.S1`)
`deleteDocument` wrapper in `web/src/lib/knowledge/app.ts` over `sendJson<void>(..., "DELETE")`;
a `"use server"` action following `revokeCredentialAction`; a `"use client"` two-step inline
confirm island following `revoke-credential-button.tsx`; wired into the list page rows and the
detail page's member branch (next to the copy-link row). Status-keyed copy in
`web/src/content/documents.ts`. `revalidatePath` in route-pattern form; `redirect("/documents")`
after a successful delete from the detail page.

### Design decision — metered `/api` vs. unmetered `/app` (why `/app` won)

`resolve_api_write` accepts a **session** token, so the web app could technically call the
existing metered `DELETE /api/documents/{id}` with the user's session bearer and ship zero
backend code. Rejected: that would meter a UI click as a billable agent event
(`EVENT_DOCUMENT_DELETED`), breaking the standing invariant that **every web-UI feature is
free** (`server/documents_api.py` module docstring; the `/app/dashboard` precedent). It would
also route the web app through the machine plane's auth resolver, blurring the two planes'
trust boundaries. So: a new unmetered `/app` route that reuses the *logic*, not the route.

## Findings & Notes

Verified against the code at decomposition time (line numbers as of this commit).

- **`_delete_document`** — `server/main.py:639`, signature
  `_delete_document(conn, doc, ctx: ApiAuthContext, *, commit: bool, co_authored_by: Optional[str]) -> dict`.
  Under `WRITE_LOCK` (`server/main.py:150` — the plan said 149) it: unlinks `root/rel`
  (`missing_ok=True`), updates the public Recent index **only when `ctx.is_public`**, then
  `db.delete_document_by_path(conn, rel, tenant_id=_tenant_filter(ctx))` — FTS row removed by an
  AFTER DELETE trigger, `document_embeddings` cascade via `ON DELETE CASCADE`
  (`server/db.py:337` `delete_document_by_path`, cascade documented in its docstring) — then an
  optional scoped git commit/push for the public root. Returns a dict:
  `{deleted, id, rel_path, title, project, slug, recent_removed, committed, commit_sha, pushed}`
  (+ `commit_error` / `push_error` when they occur).
- **Metering lives in the routes, not the helper.** `DELETE /api/documents/by-path/{rel_path}`
  is declared at `server/main.py:717` and `DELETE /api/documents/{doc_id}` at `:742`; each sets
  `request.state.usage = UsageHint(... EVENT_DOCUMENT_DELETED ...)` at `:732` / `:757`. Reusing
  the helper therefore inherits **no** metering — exactly what the `/app` plane needs.
- **Circular import is real.** `server/main.py:32` imports `server.documents_api` at module load
  (mounted at `:137`), so `documents_api` **cannot** import `main` at module level — it already
  keeps a local `get_conn` for this reason (`server/documents_api.py:50`, with the rationale in
  its docstring). S1 must either (a) extract `_delete_document` + `_tenant_root` /
  `_tenant_filter` (+ the single shared `WRITE_LOCK`) into a new shared module that both import,
  keeping `main`'s names as aliases so existing call sites keep working, or (b) do a
  function-level deferred `from server.main import ...` inside the handler (safe at request time;
  `main` is fully loaded). Either way there must remain **exactly one** `WRITE_LOCK` object — it
  is currently defined only in `server/main.py:150` and referenced from the POST path (`:474`)
  and the delete path (`:655`); no test references it.
- **`AuthContext` → `ApiAuthContext` bridging.** `/app` handlers get
  `AuthContext(user, tenant)` (`server/accounts/auth.py:31`); `_delete_document` wants
  `ApiAuthContext` (`server/api_auth.py:41`) — a 4-field dataclass
  (`tenant_id, project_id, credential_id, is_public`), constructible directly. The `is_public`
  rule to mirror is `resolve_api_write`'s (`server/api_auth.py:213`):
  `is_public = (tenant_id is None) or (tenant_id == await get_tenant_one_id())`. On the `/app`
  plane the accounts plane is always configured, so `tenant_id` is never `None`; `project_id` and
  `credential_id` stay `None` (session callers have neither). Getting `is_public` right matters:
  it selects the content root (`docs/` vs `tenants/<uuid>/`) and whether the Recent index + git
  commit run.
- **No public fallback on delete.** `GET /app/documents/{doc_id}` uses `optional_user` +
  `_resolve_readable_doc` (P19 anonymous/public reads, `server/documents_api.py:103,191`). The
  DELETE must **not** reuse that path: `require_user` plus a tenant-scoped
  `db.get_document(conn, doc_id, tenant_id=str(ctx.tenant.id))`, 404 on miss (404-never-403).
- **Async/threading caution (S1).** `documents_api`'s handlers are `async def` with an **async**
  `get_conn` (a sync `def` handler would run in the threadpool and get a connection created on
  another thread, which SQLite forbids). `_delete_document` is sync, blocking, and takes a
  `threading.Lock` — calling it directly from an `async def` handler blocks the event loop for
  the duration (and waits on the lock there). S1 should either accept that (deletes are short —
  this is what the metered `/api` sync handlers effectively do too) or offload via
  `starlette.concurrency.run_in_threadpool` with a connection opened inside that thread. Decide
  explicitly; do not silently mix a sync handler with the async `get_conn`.
- **Web mutation convention (S2).** Authed mutations are `"use server"` server actions (built-in
  CSRF), never route handlers. Canonical example: `revokeCredentialAction` at
  `web/src/app/(app)/projects/[projectId]/actions.ts:156` — zod-validate the form inputs →
  `await requireIdentity()` **outside** the `try` → typed client call → map `ApiError.status`
  (400/401/404 → status-keyed copy, else generic) → `revalidatePath(<pattern>, "page")` → return
  `{ error: null, ok: Date.now() }`.
- **Confirm UI convention (S2).** `web/src/app/(app)/projects/[projectId]/revoke-credential-button.tsx`
  — a `"use client"` island: `useActionState`, hidden inputs for the ids, a `useState`
  two-step inline confirm (deliberately **not** `window.confirm`), `appButtonClass("danger","sm")`
  for the destructive button and `("ghost","sm")` for cancel, `role="alert"` error paragraph
  wired via `aria-describedby`. Copy comes from `@/content` as status-keyed data
  (`REVOKE_CREDENTIAL_ERRORS` in `web/src/content/project.ts:29` is the model) — for documents
  that means `web/src/content/documents.ts`.
- **Client seam (S2).** `web/src/lib/knowledge/client.ts:119` already exposes
  `sendJson<T>(path, method: "POST"|"PATCH"|"PUT"|"DELETE", ...)`; `revokeCredential`
  (`web/src/lib/knowledge/app.ts:193`) is the `sendJson<void>` / 204 idiom to copy for a new
  `deleteDocument(token, id)`.
- **Surfaces (S2).** List page `web/src/app/(app)/documents/page.tsx` — rows already carry
  `row.id` (`:159`, `:170`, `rowKey` at `:355`); the delete control belongs in the `columns(...)`
  definition in that same server file (rendering the client island inside a cell is fine). Detail
  page `web/src/app/(public)/documents/[id]/page.tsx` — the **member branch is lines 76–96** (the
  plan said 77–97), with the back-link + `CopyLinkButton` row at `:82–91`; put delete there.
  **Never** touch `document-view.tsx` — it is deliberately auth-free and shared with the
  anonymous branch.
- **Tests (S1).** `tests/test_documents_api.py` — fixture `documents_client` (`:40`), seed helpers
  `_signup` (`:84`), `_project` (`:91`), `_seed_doc` (`:97`); existing models to mirror:
  `test_documents_tenant_isolation` (`:182`), `test_documents_are_unmetered` (`:240`),
  `test_documents_require_auth` (`:258`). Server-side delete behavior on the `/api` plane is
  already covered by `tests/test_api_write.py:249` (`test_delete_happy_path`), `:280`
  (`test_delete_404`), `:285` (`test_delete_requires_bearer`) — don't duplicate it; the new tests
  cover the `/app` route's own guarantees. Keep the suite terse (Hard Rules).

## Constraints

- `WRITE_LOCK` (`server/main.py:150`) is process-local and load-bearing (single worker); the new
  delete path must hold it — and must not introduce a second lock object.
- The `/app` plane stays **unmetered**: no `UsageHint`, no `EVENT_DOCUMENT_DELETED` from the web
  path.
- `_delete_document` is **not transactional** (the file unlink precedes the DB delete; a git
  failure never rolls back the removal, it just reports `committed: false`). Accept as-is —
  identical to the `/api` plane's behavior.
- A public-root delete by a tenant-#1 member produces a real git commit
  (`docs(<project>): remove <slug>`) and updates the Recent index. Keep that behavior; do not
  special-case the web path.
- Deleting a public document breaks its shared URL and its graph edges. The graph and sitemap are
  derived and self-heal on the next render/rebuild — acceptable for a hard delete, but the confirm
  copy should not promise otherwise.
- Hard delete only — no trash, no undo (confirmed intent).

## Doc impact

_Durable-truth changes, one line per note, appended by each slice; consolidated into doc
versions once at `P21.REVIEW` — never per slice._

- (`P21.DECOMP`: none — decomposition changed no durable truth.) Anticipated for the middle
  slices: `api.md` (new unmetered member `DELETE /app/documents/{doc_id}`), `frontend.md` /
  `experience.md` (delete action + two-step confirm on the documents surfaces), possibly
  `backend.md` / `architecture.md` if S1 extracts the shared delete path into a new module, and
  `security.md` if the member-only/no-public-fallback boundary is worth stating there.

## Open Questions

- None open at decomposition. Two decisions are explicitly delegated to `P21.S1`: the
  extraction-vs-deferred-import mechanic for reaching `_delete_document`, and whether the handler
  offloads to a threadpool or blocks briefly on the event loop.
