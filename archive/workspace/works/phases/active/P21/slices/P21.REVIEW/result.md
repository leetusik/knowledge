# Result — P21.REVIEW: Phase review, Web document deletion

Verdict: **pass**. Both slices land the objective as `intent.md` states it, every check in the
plan passes, and the three behavioral checks S2 flagged as unautomated were exercised **live**
(plus three more the plan did not ask for). Six durable docs were consolidated.

## 1. Validation

Run from the repo root unless noted. Backend recipe per `P21.S1/result.md`: disposable
`postgres:17` in docker on `127.0.0.1:55433`, `KB_TEST_DATABASE_URL` set, `.venv/bin/python`.

| Command | Result |
| --- | --- |
| `KB_TEST_DATABASE_URL=… .venv/bin/python -m pytest tests/ -q` | **1 failed, 99 passed** — exactly S1's recorded number; the single failure is the pre-existing `test_documents_list_detail_and_project_bridge` `format`-key case (`docs/current/qa.md`, recorded from the P18 review). **No new failure.** |
| `pnpm vitest run` (from `web/`) | **PASS** — 10 files, **69 passed**, 0 failed |
| `pnpm lint` (from `web/`) | **PASS** — clean |
| `pnpm typecheck` (from `web/`) | **PASS** — clean |
| `python3 scripts/plugin_parity.py` | **PASS** (re-run again after the doc versions landed: still PASS) |
| `python3 scripts/workflow.py validate` | **Workflow validation passed** |

`pnpm build` was not re-run — nothing found here casts doubt on S2's green build, and the
review independently ran the **built standalone server** (below), which is stronger evidence
than a rebuild. `pnpm format:check` fails repo-wide at a clean HEAD (51 files) — pre-existing,
not a finding of this phase.

## 2. The live end-to-end exercise

A live exercise **was** practical, so it was done rather than replaced by a code read. Stack:
the disposable postgres, `uvicorn server.main:app` on `:8766`, and the Next **standalone**
server (`node .next/standalone/server.js` on `:3222` — `next start` refuses an
`output: standalone` build). Two members were signed up through the real `/auth/signup`, three
documents seeded (two mine, one another org's), files materialized on disk.

Three mechanics made this possible without a browser driver (none is installed), and they are
worth reusing:

1. The delete island's `<form>` is **fully progressive-enhancement capable**, so its rendered
   hidden inputs (`$ACTION_REF_n`, `$ACTION_n:0`, `$ACTION_n:1`, `$ACTION_KEY`) can be replayed
   with `curl -F` to invoke the **real** server action.
2. The session cookie is `Secure`, so curl will not store or resend it over http — capture the
   `Set-Cookie` value and pass it back with `-H "Cookie: …"`.
3. The BFF requires an `Origin` header matching `Host` (`assertSameOrigin`), else 403.

Rendering first, as a member vs anonymous:

| Surface | Observed |
| --- | --- |
| `GET /documents` (member) | 2 delete islands, `documentId` 1 and 2, `aria-label="Delete document <title>"`, **no** `redirectTo` input |
| `GET /documents/1` (member) | 1 delete island, `documentId=1`, `redirectTo="/documents"` |
| `GET /documents/1` (anonymous) | **0** delete controls |

Then the action itself. The plan's three checks are 1–3; 4–6 are extra:

| # | Check | Observed |
| --- | --- | --- |
| 1 | detail delete | **303 `Location: /documents`**; file unlinked, backend `GET` → 404, FTS search for the body term drops from 2 hits to 1 |
| 2 | repeat delete of the same id | **200, no `Location`**, response carries `notFound` copy — "That document no longer exists, or it isn't part of your org." |
| 3 | list delete | **200, no `Location`**, no error copy; the row is absent from the revalidated list, which falls to the branded empty state |
| 4 | cross-tenant delete (another org's doc id) | `notFound` copy; the target still reads **200** for its own owner |
| 5 | tampered non-integer `documentId` | `invalidRequest` copy — "Could not delete that document. Reload the page and try again." |
| 6 | unauthenticated action call | **303 `Location: /login`** (`requireIdentity`), nothing deleted |

Unmetered, measured live: `SELECT count(*) FROM usage_events` = **0** after three successful
deletes.

**The `is_public=True` branch — S1's one untested branch — was also exercised**, because it is
exactly where S1's deviation matters. A second API instance was started with
`KB_OPERATOR_EMAIL` pointing at the member (so their tenant resolves as tenant #1) and a
`KB_ROOT` holding the *same* document at **both** `docs/<rel>` and `tenants/<uuid>/<rel>`.
`DELETE /app/documents/4` → **204**, and:

- `docs/alpha/2026-02-02-public.md` → **UNLINKED**
- `tenants/<uuid>/alpha/2026-02-02-public.md` → **still there**

So the public branch is selected correctly. With the plan's original `str(ctx.tenant.id)` the
comparison against `get_tenant_one_id()`'s `UUID` would never be equal, `is_public` would be
`False`, and the wrong file would have been unlinked — S1's deviation 1 is **confirmed correct
by observation**, not just by reading. (The route answered 204 in a non-git root; the helper
swallows the commit failure, matching the documented contract. No git command was run by me.)

All live processes and the postgres container were torn down; `git status` shows no stray files.

## 3. Judgment against the objective and intent

The objective — "logged-in members hard-delete documents from the web app (confirm step),
reusing `_delete_document` so the doc is gone from file, DB, FTS, and embeddings" — is met, and
each specific point the plan named checks out:

- **`/app` stays unmetered; `server/main.py` untouched; one `WRITE_LOCK`.** `git diff
  822b0d7..HEAD -- server/main.py plugin/templates/kb/server/main.py` is **empty**.
  `WRITE_LOCK = threading.Lock()` appears exactly once in `server/` (`main.py:150`; the two
  hits in `documents_api.py` are docstring prose). `documents_api.py` never sets
  `request.state.usage` — the only `UsageHint`/`EVENT_DOCUMENT_DELETED` mentions there are
  docstrings explaining the absence. Confirmed live: 0 usage events.
- **No public fallback; anonymous branch clean.** The DELETE is `Depends(require_user)` with a
  tenant-scoped `db.get_document(..., tenant_id=str(api_ctx.tenant_id))` and a bare 404 on a
  miss — it does not touch `_resolve_readable_doc`. `document-view.tsx` is not in the phase's
  diff at all, and the anonymous read page rendered zero delete controls live.
- **The `is_public` UUID bridge is correct against `server/api_auth.py:213.`** The shipped rule
  is `is_public = ctx.tenant.id == tenant_one_id` against `resolve_api_write`'s
  `(tenant_id is None) or (tenant_id == await get_tenant_one_id())`. `ApiAuthContext.tenant_id`
  is declared `UUID | None` and `get_tenant_one_id() -> UUID | None`, so the UUID form is the
  correct one; dropping the `is None` disjunct is right because the `/app` plane only exists
  when the accounts plane is configured. The handler's comment says exactly that. Verified live.
- **The new precedents hold up.** The guarded `redirect()` is well-founded: `z.literal("/documents")`
  makes an open redirect impossible by construction, the call sits **outside** the try/catch
  (so `NEXT_REDIRECT` is not swallowed) and **after** both `revalidatePath` calls with route
  patterns + the `"page"` type arg. The cross-route-group import is legal and now proven twice —
  `next build` at S2, and the built `server-reference-manifest.json` registers the single action
  id `6017…52e7` against **both** `app/(app)/documents/page` and
  `app/(public)/documents/[id]/page`. The rewritten header comments on both pages are now
  accurate.
- **Accepted gaps are documented, not silent.** The empty-page-after-last-row-delete gap and
  the cross-org public-doc 404-copy gap are recorded in `phase.md`, in `P21.S2/result.md`, and
  (the second) in a JSX comment at the call site. Both are now also in the consolidated
  **experience** and **security** docs, so they survive the phase folder.
- **Intent fidelity.** `intent.md` asked for a hard delete for logged-in members with a
  confirmation step, reusing the existing server delete logic. Shipped exactly: two-step inline
  confirm (not `window.confirm`), hard delete via the existing helper, no trash and no undo,
  copy that promises no recovery.
- **Scope discipline.** The phase touched 12 files and nothing outside its remit — no
  `server/main.py`, no `document-view.tsx`, no anonymous-branch change, no repo-wide
  reformat. The one out-of-plan repair (the `KB_AUTH_RATE_LIMIT=0` fixture line) was made in a
  file S1 already owned and left the suite strictly greener (89/8 → 99/1).

Deviations recorded by the slices — S1's UUID bridge and the throttle fix; S2's detail-page
comment correction, the `ml-auto` wrapper `<div>`, and two prettier reflows — are all
improvements or neutral, and all are documented in the slices' `result.md`. Nothing needs a fix
slice.

## 4. Doc consolidation (pass-only; P21 is not in parallel mode)

Six versions created from the `phase.md` "Doc impact" list, then `rebuild-docs`:

| Doc | New version |
| --- | --- |
| `api` | `v0015_p21_unmetered_member_delete_app_documents_doc_id_…` — new *Member document delete (P21)* section (statuses, no-public-fallback contrast with the P19 GETs, unmetered rationale, the bridge), a Status paragraph, and a pointer added to the P12 read-routes section (the plane is no longer read-only) |
| `backend` | `v0010_p21_first_mutating_app_route_…` — new *Member delete on the `/app` plane (P21)* section (deferred import vs extraction, the non-reentrant-lock trap, worker-owned SQLite connection, the UUID bridge), plus the single-writer invariant restated to cover the new caller |
| `security` | `v0013_p21_member-only_web_delete_boundary_…` — new *Member-only delete on the web plane (P21)* section (read fallback deliberately **not** inherited, 404-never-403, CSRF via server action, `z.literal` closing open redirect, blast radius, accepted gap), plus an Authorization-Rules bullet |
| `qa` | `v0011_p21_delete_acceptance_…` — new *Web document-delete acceptance (P21)* section: the process-global `/auth` throttle explanation and the 89/8 → 99/1 shift, the four backend tests, the web numbers, **the no-browser server-action E2E recipe**, how to re-test the `is_public` branch, and the still-pre-existing `format` failure |
| `frontend` | `v0011_p21_documents_surfaces_gain_their_first_write_…` — new *The documents surfaces' first write (P21)* section (one island / one action / two surfaces, the guarded-redirect precedent, the cross-route-group import, the rewritten contract comments, copy-as-data), plus a clause on the P12 Documents surface bullet |
| `experience` | `v0012_p21_members_can_hard-delete_a_document_…` — new *Deleting a document from the web app (P21)* section (two places, two-step confirm, honest permanence copy, the single not-found string, anonymous sees nothing, still free, the two rough edges), plus a clause on the P12 Documents bullet |

`rebuild-docs` regenerated all six `docs/current/*.md`; `validate` and `plugin_parity.py` both
re-run **PASS** afterwards (`docs/*` is a shipped path, so parity matters here).

## 5. Notes

- No source code was modified by this slice. No commit, no status transition, no workflow
  command beyond `doc-new-version` ×6 and `rebuild-docs`.
- `explain: not written — run /explain for this phase`.
- Two things worth a **deferred job**, neither a finding of this phase: the pre-existing
  `format`-key test failure (one-line fix either way), and the repo-wide prettier drift if
  `format:check` should become a real gate.
