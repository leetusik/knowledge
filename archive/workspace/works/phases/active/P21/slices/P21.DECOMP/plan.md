# Plan — P21.DECOMP (Web document deletion: decomposition)

## Context

P21 lets logged-in members hard-delete documents from the web app (confirm step on the documents pages), reusing the server's existing delete path so the doc is removed from file, DB, FTS, and embeddings. Intent: `works/phases/active/P21/intent.md`. This slice is the phase decomposition: the `slice-executor-high` executor creates the middle slices (bare folders, no plan.md pre-fill) and seeds `phase.md` with the breakdown, findings, and constraints below.

**Mode note (operator-set):** DECOMP is gated (this plan); the remainder of the phase runs `auto` — inline plans, no approval pauses, safety halts still apply.

## Research findings (seed these into phase.md)

- **Existing delete is machine-plane only.** `server/main.py:639` `_delete_document(conn, doc, ctx, *, commit, co_authored_by)` under `WRITE_LOCK`: unlinks the file under the tenant root, updates the public Recent index, deletes the DB row (`db.delete_document_by_path`) — FTS row removed by an AFTER DELETE trigger, embeddings cascade (`server/db.py:337-352`) — then optional git commit/push for the public root. Metering (`EVENT_DOCUMENT_DELETED`) is stamped by the routes (`server/main.py:717`, `:742`), not the helper.
- **The web `/app` plane is read-only and unmetered by design** (`server/documents_api.py` header, lines 14-21): every web-UI feature stays off the billable counters. There is no `DELETE /app/documents/{id}` today.
- **Decision — add an unmetered `DELETE /app/documents/{doc_id}` to `documents_api.py`** (member-only, `Depends(require_user)`, tenant-scoped, never the public fallback), reusing `_delete_document`'s logic rather than calling the metered `/api` plane with the session token (which `resolve_api_write` would technically accept, but would meter UI clicks as billable agent events). This requires bridging `main.py` ↔ `documents_api.py` without a circular import: extract `_delete_document` (and whatever minimal helpers it needs) into a shared module, or add a thin shim translating `AuthContext` → the fields `_delete_document` reads. The implementation slice decides the exact mechanics; either way the new path must hold the same `WRITE_LOCK` and stamp **no** usage event.
- **Web mutation pattern is fixed by convention:** authed mutations are `"use server"` server actions (built-in CSRF), never route handlers — canonical example `web/src/app/(app)/projects/[projectId]/actions.ts` (`revokeCredentialAction`, line 156: zod-validate → `requireIdentity()` outside try → typed client call → `ApiError.status` mapping → `revalidatePath`). Confirm UI pattern: `revoke-credential-button.tsx` — a `"use client"` island with `useActionState` + two-step inline confirm (explicitly not `window.confirm`), `appButtonClass("danger", "sm")`. Client seam: `web/src/lib/knowledge/client.ts` already has `sendJson<T>(path, "DELETE", ...)`; add a `deleteDocument` wrapper in `web/src/lib/knowledge/app.ts`.
- **Surfaces to touch:** list page `web/src/app/(app)/documents/page.tsx` (has `row.id` already) and the **member branch** of detail page `web/src/app/(public)/documents/[id]/page.tsx` (lines 77-97, next to the copy-link row) — never `document-view.tsx` (deliberately auth-free). Detail-page delete needs `redirect("/documents")` after success; `revalidatePath` must use the route pattern form (`"/documents/[id]", "page"`).
- **Tests:** extend `tests/test_documents_api.py` (fixture `documents_client`, seed helpers at lines 84-97; tenant-isolation and unmetered tests exist as models). Server delete behavior is already covered on the `/api` plane (`tests/test_api_write.py:249-288`). Keep new suites terse per Hard Rules.

## Constraints (seed into phase.md)

- `WRITE_LOCK` (`server/main.py:149`) is process-local and load-bearing (single worker); the new delete path must hold it.
- `/app` plane stays unmetered — no `UsageHint`, no `EVENT_DOCUMENT_DELETED` from the web path.
- `_delete_document` is not transactional (file unlink precedes DB delete; git failure never rolls back) — accept as-is, same as `/api`.
- Public-root deletes by a tenant-#1 member produce a real git commit (existing behavior, keep).
- Deleting a public doc breaks its shared URL and graph edges; graph/sitemap are derived and self-heal — acceptable for hard delete, note it in phase.md.

## Slices for the executor to create (`new-slice`, bare folders)

1. **P21.S1 — Backend: member DELETE /app/documents/{doc_id}** — `--kind implementation --risk high --order 2 --depends-on P21.DECOMP`. Unmetered, `require_user`, member-scoped (no public fallback), reuse `_delete_document` logic via extraction or shim, same `WRITE_LOCK`; terse tests in `tests/test_documents_api.py` (happy path incl. file/DB/FTS gone, tenant isolation, auth required, unmetered).
2. **P21.S2 — Web: delete action + confirm UI on documents pages** — `--kind implementation --risk high --order 3 --depends-on P21.S1`. `deleteDocument` client wrapper, `"use server"` action per `revokeCredentialAction` pattern, two-step confirm island per `revoke-credential-button.tsx`, wired on the list page rows and the detail page's member branch; `revalidatePath` pattern-form + `redirect("/documents")` from detail; copy in `web/src/content/*`.

(REVIEW already exists; executor records the breakdown + rationale in `phase.md` and appends nothing to any slice's `plan.md`.)

## Verdict expectations

Executor returns `done` with the two slices created and `phase.md` seeded; orchestrator then runs `finish-slice P21.DECOMP`, `validate`, commits, and continues in `auto` mode.
