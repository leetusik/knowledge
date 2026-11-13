# Result — P19.S2 "Backend public read surface"

The phase's security-critical slice: the product's first anonymous read path. Delivered an
optional-identity read dependency, anonymous-capable single-doc/raw reads for public-project
docs, and an org-scoped public graph view — all failing closed (404-never-403) so private and
nonexistent are indistinguishable and no private doc/node leaks anonymously or cross-org.

## What changed

**`server/accounts/auth.py`** — new `optional_user(request) -> AuthContext | None`. Resolves a
bearer exactly as `require_user` (same token extraction, session/user/tenant lookup, best-effort
`last_used_at` stamp on success) but **returns `None` instead of raising** on every miss path.
Never raises. Deliberate consequence: an unresolvable token on a private doc now yields the
anonymous 404, not a 401 (leaks strictly less; the BFF pre-verifies sessions anyway).

**`server/documents_api.py`** — added a shared module-level helper `_resolve_readable_doc(conn,
doc_id, ctx)` and switched `GET /app/documents/{id}` and `.../raw` to `Depends(optional_user)`
(`ctx: AuthContext | None`). Resolution order:
1. **Member fast-path** — with a `ctx`, try today's scoped `db.get_document(conn, id,
   tenant_id=<caller>)`; a hit serves exactly as before (member behavior byte-preserved, incl.
   legacy `''`-row semantics), and the accounts service is never consulted.
2. **Public path** (no `ctx`, or a scoped miss — covers anonymous AND cross-org): legacy-mode
   guard (`config.database_url() is None` ⇒ 404 before touching the absent accounts service);
   unscoped lookup; missing row ⇒ 404; `owner = row["tenant_id"]` empty/`''`/unparseable-UUID ⇒
   404 (registry-less rows never public); `get_project_by_name(owner_uuid, row["project"])` None
   or `.visibility != "public"` ⇒ 404; public ⇒ serve.

   The `/raw` route keeps its `format=="html" and raw_html` 404 branch and the exact P16 header
   dict byte-identical (`Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`,
   `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`).
   The JSON route keeps `_app_doc(include_markdown=True)` (drops `tenant_id`). `/app/documents`
   list and `/app/search` stay session-only (`require_user`, unchanged).

**`server/graph_api.py`** — `GET /app/graph` gains `org: UUID | None = None`, switched to
`Depends(optional_user)`, with a shared `_build_graph` helper (count → single windowed
`list_documents` → `build_tenant_graph` → `truncated`). Branches:
- `org` absent ⇒ ctx required (anonymous ⇒ `raise AuthError` = same generic 401 as before);
  member sees the whole corpus. `project` symmetry param honored.
- `org` == caller's own tenant ⇒ identical to the bare member call.
- `org` otherwise (anonymous / non-member) ⇒ **public view**: legacy-mode guard ⇒ 404;
  `public_names = [p.name for p in list_projects_for_tenant(org) if p.visibility=="public"]`;
  empty (also covers a nonexistent org) ⇒ 404 `"graph not found"` (no existence leak); else build
  via the new allowlist predicate. `project` narrowing ignored on the public path. Response shape
  unchanged, no org echo.

**`server/db.py`** — `_filtered` / `list_documents` / `count_documents` gained an optional
`projects: Sequence[str] | None = None` allowlist → `project IN (?,…)`. Default `None` leaves every
existing caller byte-identical; an **empty** list fails closed (`AND 0`, matches nothing) — the
graph route already 404s before reaching it on an empty public set, but the predicate never opens
up on an empty allowlist.

**`tests/test_public_read.py`** (new, Postgres-gated; reuses `documents_client`/`_signup`/`_project`
from `test_documents_api`) — 4 terse tests: anonymous public doc JSON (no `tenant_id`) + raw (4
sandbox headers) + private/nonexistent 404; cross-org user reads A's public but not A's private
doc; org-scoped public graph (private rel_path/tag absent, `projects` lists only public names,
random org → 404, zero-public org → 404, bare unauth → 401, member bare → full corpus); and the
public→private toggle flipping an anonymous read 200→404 (instant-effect bridge proof).

**Parity** — byte-mirrored `server/{accounts/auth,documents_api,graph_api,db}.py` +
`tests/test_public_read.py` into `plugin/templates/kb/`, added `tests/test_public_read.py` to
`plugin/templates/manifest.json` `files.identical`.

## Validation (run for real against a disposable Docker Postgres 16, fresh DB)

- `python3 scripts/plugin_parity.py` → **PASS** ("plugin templates are in parity with the repo").
- Import smoke (`server.documents_api, server.graph_api, server.accounts.auth, server.db`) → **OK**.
- `pytest tests/test_public_read.py tests/test_graph_api.py tests/test_html_documents.py`
  (KB_TEST_DATABASE_URL=<fresh Postgres>) → **14 passed, 0 failed**.
- `pytest tests/test_documents_api.py` → **1 failed, 4 passed** — the one failure is **D15**
  (`test_documents_list_detail_and_project_bridge`, the pre-existing P16 `format` list-projection
  drift), flagged and NOT absorbed. My `optional_user` switch removed this file's second failure by
  updating `test_documents_require_auth` (see deviations).
- Full suite `pytest -q` at the default rate limit → 8 failed (all **429 Too Many Requests**), 89
  passed. Re-run with `KB_AUTH_RATE_LIMIT=0` → **1 failed (D15 only), 96 passed**, confirming no
  real regression. The 429s are the shared in-process auth rate-limiter (20 signups/IP/window)
  accumulating across every Postgres-gated suite in one process; `test_public_read.py`'s 6 signups
  tip the cumulative count over 20. Run the full gated suite with `KB_AUTH_RATE_LIMIT=0`. CI runs
  only the parity checks (no pytest, no Postgres), so this never affects CI.

## Deviations from plan.md

- **Updated two existing test assertions** (not spelled out in the plan, but a direct, necessary
  consequence of the slice's intended contract change). The plan switches `GET /app/documents/{id}`
  + `/raw` to `optional_user` (anonymous-capable, 404-never-403), which invalidates two assertions
  that codified the old "unauthenticated ⇒ 401" contract on those exact routes:
  - `tests/test_documents_api.py::test_documents_require_auth` — `/app/documents/1` unauth was 401,
    now **404** (missing/non-public id under optional-identity). List + search kept as 401 (still
    session-only), so the test still guards that boundary.
  - `tests/test_html_documents.py::test_raw_route_serves_html_and_404s_for_md` — the unauthenticated
    raw read was 401, now **404** (the doc's project is not public in that test).

  Both are byte-mirrored to the template. Without these two edits the plan's "nothing else may
  fail" could not hold — they were the plan author's likely-overlooked stale assertions, not a new
  regression. D15 left untouched as instructed. No source-behavior deviation otherwise.

## Doc impact (appended to phase.md for the P19 review to consolidate)

`api.md` + `backend.md` + `security.md` — the first anonymous read surface: `GET
/app/documents/{id}` + `/raw` are optional-identity (member-scoped **or** public-project reads,
404-never-403); `GET /app/graph?org={tenant_uuid}` adds an org-scoped **public** graph view (public
projects only; 404 on no-public/nonexistent org); the `optional_user` optional-identity dependency;
the Postgres→SQLite per-read visibility bridge; legacy-mode reads never expose a public path.
