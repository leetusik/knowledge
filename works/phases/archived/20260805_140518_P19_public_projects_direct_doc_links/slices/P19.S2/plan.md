# Plan — P19.S2 "Backend public read surface: anon doc/raw read + org-scoped public graph"

Operator-approved 2026-07-22 (do-whole-phase, manual gate). Executor tier: `slice-executor-high` (risk `high` — the phase's security-critical slice: the product's first anonymous read path).

Read `works/phases/active/P19/phase.md` first (design stances, S1 cross-slice notes, constraints). This slice settles the phase's open question as: **query param `?org=` on the existing graph route** (not a path segment) — least routing churn, the bare call stays byte-compatible for the logged-in app, and the graph payload already carries no tenant identifier.

## Grounded facts (verified; spot-check as you go)

- `require_user` (`server/accounts/auth.py:65-97`) raises `AuthError` on 4 miss paths; app-wide handler renders a generic 401 (`main.py:115`). `extract_bearer_token` (:46-62) returns `str | None`. No optional-auth pattern exists anywhere.
- Routers have no router/app-level guards — `require_user` is enforced only per-handler (`documents_api.py:141,159`, `graph_api.py:160`); swapping the dependency on exactly three handlers touches nothing else.
- `db.get_document(conn, id, tenant_id=None)` is an **unscoped** lookup (`db.py:224-236`); SQLite `documents.id` is a global autoincrement PK; rows carry `tenant_id` (`''` = legacy sentinel) + `project` name. `_filtered` (:256-282) backs `list_documents`/`count_documents`.
- Post-S1 visibility reads: `get_project_by_name(tenant_id, name).visibility` (single doc); `list_projects_for_tenant(tenant_id)` filtered in Python for the public-name set (projects per tenant are few — no new repo method).
- `build_tenant_graph` (`graph_api.py:62-154`) reads doc keys `rel_path,id,title,date,project,tags,related`; payload `{version, projects:[{name,docs}], nodes, edges}` + `truncated` — no tenant UUID in it. `_app_doc` (`documents_api.py:74-83`) drops `tenant_id`.
- Tests: Postgres-gated fixture in `test_documents_api.py:39-81` with `_signup`/`_project` helpers; `test_graph_api.py` imports them cross-file; docs seeded via `db.upsert_document`. **D15**: `test_documents_list_detail_and_project_bridge` fails on any Postgres run (pre-existing — list projection gained `format` in P16) — do not absorb.
- Parity: `server/{db,documents_api,graph_api}.py` and `server/accounts/auth.py` are in `manifest.json` `files.identical`; a new test file needs BOTH a `plugin/templates/kb/tests/` copy AND a manifest entry (completeness is set-for-set).

## Changes (trust-boundary rules pinned)

1. **`optional_user` — `server/accounts/auth.py`.** `async def optional_user(request) -> AuthContext | None`: `extract_bearer_token` → None ⇒ None; otherwise resolve exactly as `require_user` (including the best-effort `touch_auth_token_last_used` on success) but **return None instead of raising** on every miss path. Never raises. (Deliberate consequence: for a private doc an unresolvable token now yields 404 — anonymous treatment — not 401; leaks less, and the BFF pre-verifies sessions.)

2. **Doc reads — `server/documents_api.py`.** `GET /app/documents/{doc_id}` and `/raw` switch to `Depends(optional_user)`, sharing a small module-level resolution helper:
   - `ctx` present: **first** try today's scoped fetch `db.get_document(conn, doc_id, tenant_id=str(ctx.tenant.id))` — found ⇒ serve exactly as today (member behavior byte-preserved, including legacy `''`-row semantics).
   - Else (no ctx, or scoped miss — covers anonymous AND cross-org users): unscoped `db.get_document(conn, doc_id)`; row missing ⇒ 404. **Legacy-mode guard**: if `config.database_url()` is unset ⇒ 404 before touching the accounts service (template stack must never 500). Owner = `row["tenant_id"]` — empty/unparseable as UUID ⇒ 404 (registry-less rows are never public). `get_project_by_name(owner_uuid, row["project"])` — None or `.visibility != "public"` ⇒ 404. Public ⇒ serve.
   - `/raw` keeps its `format=="html" and raw_html` 404 branch and the exact P16 header dict **byte-identical** (`Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`). JSON route keeps `_app_doc(include_markdown=True)` (drops `tenant_id`).
   - 404 detail strings unchanged — private and nonexistent indistinguishable (404-never-403 extended).

3. **Graph — `server/graph_api.py`.** Route gains `org: UUID | None = None` and switches to `Depends(optional_user)`:
   - `org` absent: ctx required — if None, `raise AuthError("missing bearer token")` (same generic 401 as today ⇒ bare-call behavior preserved). With ctx: member path unchanged (incl. `project` param).
   - `org` present, ctx matches (`ctx.tenant.id == org`): member view, identical to the bare call.
   - `org` present otherwise (anonymous or non-member): **public view** — legacy-mode guard (no `DATABASE_URL` ⇒ 404); `public_names = [p.name for p in list_projects_for_tenant(org) if p.visibility == "public"]`; empty (also covers nonexistent org) ⇒ 404 `"graph not found"` (no existence leak). Else count/list with a **new allowlist predicate**: extend `db._filtered` (+ `list_documents`/`count_documents` signatures) with optional `projects: Sequence[str] | None` → `project IN (?,…)`; default None so existing callers are untouched. Build via `build_tenant_graph` as-is; `truncated` as today. The `project` query param is ignored on the public path (note it in the docstring; the UI never sends it).
   - Response shape unchanged; only public-project nodes/edges/tag-hubs; no org echo.

4. **Out of scope (state in result.md):** `/api/*` untouched (frozen contract); `/app/documents` list + `/app/search` stay session-only; no rate limiting on the anonymous surface (add a defer-note to `phase.md`); web/BFF is S3.

5. **Tests — new `tests/test_public_read.py`** (Postgres-gated; import `documents_client`, `_signup`, `_project` from `test_documents_api` like `test_graph_api` does; seed via `db.upsert_document`; ~4 terse test functions, no fixture sprawl):
   - Anonymous: public-project doc → 200 JSON (assert no `tenant_id` key) and raw HTML → 200 with the 4 sandbox headers; private doc → 404; nonexistent → 404 (same shape).
   - Cross-org user (second `_signup`): org A's public doc → 200; org A's private doc → 404.
   - Graph: anonymous `?org=A` → only public-project nodes (assert a private rel_path absent; projects array lists only public names); `?org=<random uuid>` → 404; org with zero public projects → 404; bare `/app/graph` unauthenticated → 401 (preserved); member bare call → full graph.
   - Toggle interplay: flip the project public→private via `PATCH /app/projects/{id}`, anonymous doc read flips 200→404 (instant-effect bridge proof).

6. **Parity** — byte-mirror `server/accounts/auth.py`, `server/documents_api.py`, `server/graph_api.py`, `server/db.py` to `plugin/templates/kb/`; add `tests/test_public_read.py` to **both** `plugin/templates/kb/tests/` and `manifest.json` `files.identical`.

## Validation (run, report honestly in result.md)

- `python3 scripts/plugin_parity.py` → must print the PASS line.
- `pytest tests/test_public_read.py tests/test_graph_api.py tests/test_html_documents.py` with a disposable Postgres (per the S1 gotcha in `phase.md`: use a FRESH database or drop/recreate the schema — `create_all(checkfirst=True)` will not add new columns to pre-existing tables). Report exact pass/skip counts. If you also run `test_documents_api.py`, call out D15's one failure as pre-existing — nothing else may fail.
- If Postgres is genuinely unavailable: import smoke (`python3 -c "import server.documents_api, server.graph_api, server.accounts.auth"`) and report suites as SKIPPED — never claim green.
- Do not run alembic against any live database.

## Wrap-up

- Append to `phase.md`: cross-slice note — the org-param decision and the S3-facing contract (public doc read = same `GET /app/documents/{id}` + `/raw` shapes, anonymous-capable; public graph = `GET /app/graph?org={tenant_uuid}`; a member's org UUID is available to the web via `/auth/me` tenant id); defer-note (no anonymous rate limiting — future candidate); Doc impact line (api.md / backend.md / **security.md**: optional-identity reads, org-scoped public graph, first anonymous surface).
- Write `works/phases/active/P19/slices/P19.S2/result.md` from scratch.
- Return the structured verdict (verdict, summary, files_changed, validation with exact counts, deviations, doc_impact). Never commit; never transition slice/phase status; never touch `docs/`.
