# P10.S5 — plan (orchestrator → slice-executor-high)

Implement **P10.S5 — Content tenant-scoping** in `/Users/sugang/projects/personal/knowledge`. Read
`works/phases/active/P10/phase.md` first (the two hard couplings + S4's "what S5 consumes" note). This is the
**heaviest, high-risk** slice: it makes the content plane tenant-isolated by consuming S4's `ApiAuthContext`. It
touches the SQLite schema, every read query, the write/delete paths, reindex, and search. Follow this plan
exactly; verify each inlined line reference against the real file before editing.

**Scope:** content tenant-scoping only. Do NOT seed the operator tenant or migrate the live corpus or write the
E2E onboarding smoke — that's S6. Do NOT change `/auth`, `/app`, or the accounts plane. Do NOT commit / transition
status / `doc-new-version`. Write `result.md`, append `phase.md` notes, return a verdict.

## Invariants that must hold (do not break)
1. **Legacy mode unchanged:** `DATABASE_URL` unset → the 65 existing tests pass. Reads add **no** tenant filter
   when `ctx.tenant_id is None`; writes/reindex stamp the sentinel `''`. This is the critical regression surface.
2. **Frozen `POST /api/documents`:** request model + 201 response shape unchanged; tenant #1's on-disk `docs/`
   layout, `rel_path` (`<project>/<date>-<slug>.md`), and git publish unchanged.
3. A **DB is never mixed** (all-legacy XOR all-tenant), which is why the `''` sentinel + `UNIQUE(tenant_id,
   rel_path)` are safe.

## 1. `server/db.py`

**Schema** (`_SCHEMA`, L21–77):
- Add to `documents`: `tenant_id TEXT NOT NULL DEFAULT ''`.
- Replace inline `rel_path TEXT NOT NULL UNIQUE` (L31) with `rel_path TEXT NOT NULL` and add a table-level
  `UNIQUE (tenant_id, rel_path)`.
- **Remove** `UNIQUE (project, date, slug)` (L36).
- `documents_fts` + triggers + `document_embeddings`: **unchanged** (tenant is transitive via `id`/`doc_id`).

**Migration** (`init_db`, L84–97): keep the `related` back-fill. Add a disposable-DB rebuild: after
`executescript(_SCHEMA)`, read `PRAGMA table_info(documents)`; if `tenant_id` NOT in cols → the DB predates
tenancy and its constraints can't be altered in place, so **drop + recreate**: `DROP TABLE IF EXISTS
documents_fts; DROP TABLE IF EXISTS document_embeddings; DROP TABLE IF EXISTS documents;` then
`executescript(_SCHEMA)` again. (Safe: the DB is disposable; the startup reindex repopulates.) Commit.

**`upsert_document`** (L127–176): add a keyword param `tenant_id: str = ''`. Add `tenant_id` to the INSERT column
list + one more `?`; add its value to the params tuple; **omit it from the `ON CONFLICT ... DO UPDATE SET`** (like
`created_at`); change the conflict target to `ON CONFLICT(tenant_id, rel_path)`; change the post-insert lookup to
`SELECT id FROM documents WHERE tenant_id = ? AND rel_path = ?`.

**Query filters** — add an optional `tenant_id: Optional[str] = None` param; when not `None`, add `AND tenant_id =
?` (else no filter — legacy):
- `_filtered` (L193–210): append to its `where` list when `tenant_id is not None` (feeds `list_documents` L213 +
  `count_documents` L228 — add the param to both signatures and pass through).
- `get_document` (L179): `... WHERE id = ?` + `AND tenant_id = ?` when set.
- `get_document_by_path` (L184): `... WHERE rel_path = ?` + `AND tenant_id = ?` when set.
- `delete_document_by_path` (L238): `... WHERE rel_path = ?` + `AND tenant_id = ?` when set (so a delete can't
  cross tenants).
- `list_tags` (L249): restructure the single inline `WHERE` (L260) into a composed predicate list so the tenant
  filter + optional project filter both apply before `GROUP BY`.
- `list_projects` (L267): add its first `WHERE tenant_id = ?` (when set) between `FROM documents` and `GROUP BY`.
- `get_all_embeddings` (L330): add `AND d.tenant_id = ?` after the existing `AND d.project = ?` block (there's
  always a base `WHERE de.model = ?`).
- Leave `delete_orphan_embeddings`, `upsert_embedding`, `get_embedding`, `get_embedding_hashes` tenant-agnostic.

## 2. `server/api_auth.py`
- Add `is_public: bool = True` to `ApiAuthContext` (default True so legacy = public root).
- In `resolve_api_write`/`resolve_api_read`, set `is_public = (ctx.tenant_id is None) or (ctx.tenant_id ==
  await get_tenant_one_id())`.
- Add a cached `async def get_tenant_one_id() -> UUID | None` (module-level cache): tenant mode → resolve
  `KB_OPERATOR_EMAIL` → `get_user_by_email` → `list_tenants_for_user`[0].id; legacy / unset / unseeded → `None`.
  Reuse the operator-email resolution already in the pinned-master path (factor it out so both use it).

## 3. `server/main.py` — write/delete paths + read handlers + reindex

Helper (module-level): `def _tenant_root(ctx) -> Path: return config.docs_root() if ctx.is_public else
config.kb_root() / "tenants" / str(ctx.tenant_id)` and `def _tenant_db_id(ctx) -> str: return
str(ctx.tenant_id) if ctx.tenant_id is not None else ''`.

**`create_document`** (L263–427):
- Compute `root = _tenant_root(ctx)` and `tid = _tenant_db_id(ctx)` once.
- 409 existence check (L298): `(root / rel).exists()` instead of `config.docs_root()`; and
  `db.get_document_by_path(conn, rel, tenant_id=ctx.tenant_id)` (L297).
- `write_document_file(docs_root=root, ...)` (L308).
- `ensure_project_landing(root, project)` + `update_recent_index(root, ...)` — call **only if `ctx.is_public`**
  (non-#1 tenants don't need a public landing/Recent; skipping keeps their tree minimal). If skipped, set
  `landing_created=False`, `recent_updated=False`.
- `db.upsert_document(conn, ..., rel_path=rel, tenant_id=tid, ...)` (L331–342).
- **git commit + push block (L351–380): gate the whole block on `ctx.is_public`** (i.e. `if body.commit and
  config.git_commit_enabled() and ctx.is_public:`). Non-#1 → `committed=False, commit_sha=None, pushed=False`.
- Response (L404–427): shape unchanged; `url` may stay computed from `project/date/slug` (non-#1 urls aren't
  live yet — P12).

**`_delete_document`** (L430–494): same — `root = _tenant_root(ctx)`; `(root / rel).unlink(missing_ok=True)`
(L443); `remove_from_recent_index(root, rel)` only if `ctx.is_public` (L444); `db.delete_document_by_path(conn,
rel, tenant_id=ctx.tenant_id)` (L447); git block gated on `ctx.is_public` (L454). The two delete route handlers
(L498, L512) pass `ctx.tenant_id` to `db.get_document_by_path`/`db.get_document`.

**Read handlers** (L139–222): pass `tenant_id=ctx.tenant_id` into `db.count_documents`/`db.list_documents`
(L148–149), `db.list_tags` (L159), `db.list_projects` (L167), `db.get_document_by_path` (L178), `db.get_document`
(L190), and `search_mod.search(...)` (L208–210). The `ctx` params already exist on these handlers from S4.

**`POST /api/reindex`** (L230–243): make it `async def`; `tid = await get_tenant_one_id()`; call
`reindex_mod.reindex(tenant_one_id=tid)` / `reindex_mod.reindex_path(body.rel_path, tenant_one_id=tid)`. (It stays
`require_bearer` operator-only.) **lifespan** (L44–45): `tid = await get_tenant_one_id()` then
`reindex_mod.reindex(tenant_one_id=tid)`.

## 4. `server/reindex.py`
- `reindex(conn=None, docs_root=None, tenant_one_id=None) -> dict`: factor the L230–245 walk into
  `_walk_root(conn, root, tenant_id, disk_rel_paths_by_tenant)`. Call it for `config.docs_root()` with `tenant_id
  = str(tenant_one_id) if tenant_one_id else ''`, then for each `config.kb_root()/"tenants"/<uuid>` dir with
  `tenant_id = <uuid>` (compute `rel = path.relative_to(that root)` so `project = Path(rel).parts[0]` stays the
  project). `_index_file` gains a `tenant_id` param, forwarded to `upsert_document`.
- **Vanished-row cleanup (L249–252): make it tenant-scoped** — track the on-disk rel_paths **per tenant_id**, and
  delete only rows whose `(tenant_id, rel_path)` isn't on disk (a `SELECT tenant_id, rel_path FROM documents`,
  compare against the per-tenant disk sets). Do NOT delete other tenants' rows.
- `reindex_path(rel_path, ..., tenant_one_id=None)`: single-path reindex stays `docs/`-scoped (tenant #1 /
  legacy) — pass the derived tenant_id; that's sufficient for P10 (per-tenant single-path reindex isn't needed).

## 5. `.gitignore` — add `/tenants/`. `mkdocs.yml` — no change (the `tenants/` sibling of `docs/` is never served).

## Verification (run; report in `result.md`)
1. **Legacy regression (critical):** `DATABASE_URL` unset → `uv run pytest -q` all 65 pass. If the disposable-DB
   rebuild or the `''`-sentinel path regresses any test, fix until green.
2. **Tenant-isolation smoke** (compose + Postgres + `alembic upgrade head`; ephemeral; `KB_OPERATOR_EMAIL=
   operator@test` + a `KB_API_TOKEN`): signup operator@test (→ T1) + other@test (→ T2); mint `vk_` under a project
   of each. `POST /api/documents`: T1 via KB_API_TOKEN → lands in `docs/…`; T2 via `vk_` → lands in
   `tenants/<uuid2>/…`, **not** in `docs/`, no git commit. **Isolation:** T2's `GET /api/documents`,
   `/api/search`, `/api/documents/{id}`, `/api/documents/by-path/…` never surface T1's docs and vice-versa;
   cross-tenant get/delete by id or path → 404. **Reindex durability:** restart the api container (or call `POST
   /api/reindex` with KB_API_TOKEN) → every `tenant_id` is re-derived from the path and isolation still holds
   (proves hard-coupling #1). Frozen 201 shape intact for T1. Tear down (`docker compose down -v`).
3. `python3 scripts/workflow.py validate`.
If Docker is unavailable, don't block: run the legacy regression + import sanity and clearly report the tenant
smoke as a gap.

## Finish
`result.md` (the schema change + migration, the per-tenant routing, the isolation-smoke results incl. the
cross-tenant 404s and the reindex-durability check, deviations). Append `phase.md` notes: Doc-impact one-liners
(**data**: `documents.tenant_id` + `UNIQUE(tenant_id, rel_path)`, `''` legacy sentinel, `tenants/<id>/` namespaced
non-published root, reindex path-derived tenant_id survives the disposable-DB rebuild; **architecture/backend**:
per-tenant content root via `docs_root`, git publish + landing + Recent only for the public root, `is_public`/
`get_tenant_one_id` bridge; **api**: `/api/*` reads/writes tenant-scoped, cross-tenant 404, frozen shape intact;
**operations**: `/tenants/` gitignored on-box, mkdocs unchanged; **security**: content-plane tenant isolation now
enforced) **and the known limitation** (non-#1 content is gitignored/on-box-only — suggest a deferred backup job).
Also record **what S6 consumes**: `tenant_one_id` comes from `KB_OPERATOR_EMAIL`; tenant #1's corpus already lives
in `docs/` (S6 seeds the operator user/tenant/projects so `get_tenant_one_id()` resolves + the 4 live projects map
to T1). Return `done` when isolation holds + verification passes; else `escalate`/`blocked`/`needs_operator`.
