# P10.S5 — result (Content tenant-scoping)

**Status: done.** The content plane is tenant-isolated. Legacy mode
(`DATABASE_URL` unset) is byte-identical — all 65 existing tests pass — and the
frozen `POST /api/documents` contract is unchanged for tenant #1. The
tenant-isolation smoke (real migrated Postgres + a throwaway KB_ROOT) passes
end-to-end, including cross-tenant 404s and reindex durability.

## Schema change + migration (`server/db.py`)

- `documents` gained `tenant_id TEXT NOT NULL DEFAULT ''` (`''` = legacy /
  tenant-#1 sentinel; else the tenant UUID string).
- `rel_path TEXT NOT NULL UNIQUE` → `rel_path TEXT NOT NULL` + table-level
  `UNIQUE (tenant_id, rel_path)`. Dropped `UNIQUE (project, date, slug)`. FTS
  table + trigger trio + `document_embeddings` unchanged (tenant is transitive
  via `id`/`doc_id`).
- **Disposable-DB rebuild** in `init_db`: after `executescript(_SCHEMA)`, read
  `PRAGMA table_info(documents)`; if `tenant_id` is absent the DB predates
  tenancy (its constraints can't be altered in place) → drop `documents_fts`,
  `document_embeddings`, `documents` and re-run `_SCHEMA`. Safe because the DB is
  disposable — the boot reindex repopulates from files. The pre-`related`
  back-fill is preserved (runs on the re-read column set). Verified with an
  ad-hoc pre-tenancy DB: column added, rows wiped, `UNIQUE(tenant_id, rel_path)`
  lets the same `rel_path` exist once per tenant while a same-tenant repeat is an
  in-place upsert.
- `upsert_document` gained `tenant_id: str = ''` (added to INSERT + params,
  omitted from `ON CONFLICT ... DO UPDATE SET` like `created_at`, conflict target
  `ON CONFLICT(tenant_id, rel_path)`, post-insert lookup scoped to
  `(tenant_id, rel_path)`).
- Every read/query gained an optional `tenant_id: Optional[str] = None` (None =
  no filter = legacy): `get_document`, `get_document_by_path`, `_filtered`
  (+`list_documents`/`count_documents`), `delete_document_by_path`, `list_tags`,
  `list_projects`, `get_all_embeddings`. `delete_orphan_embeddings`/embedding
  upsert/get/hashes stay tenant-agnostic.

## Per-tenant routing

- **`server/api_auth.py`** — `ApiAuthContext` gained `is_public: bool = True`
  (default True → legacy is public root). Added a **cache-on-success**
  module-level `get_tenant_one_id()` (`KB_OPERATOR_EMAIL` → `get_user_by_email` →
  `list_tenants_for_user()[0].id`; legacy/unset/unseeded → None; a None
  resolution is never cached, so the operator seeded after boot still resolves
  later). The pinned-master `KB_API_TOKEN` path now reuses `get_tenant_one_id()`.
  Both resolvers set `is_public = (ctx.tenant_id is None) or (ctx.tenant_id ==
  await get_tenant_one_id())`.
- **`server/main.py`** — three helpers derived from `ctx`: `_tenant_root` (public
  → `config.docs_root()`; else `KB_ROOT/tenants/<uuid>/`), `_tenant_db_id` (write
  stamp: `''` legacy, else uuid), `_tenant_filter` (read scope: `None` legacy,
  else uuid string — this is the helper the plan's "pass `tenant_id=ctx.tenant_id`"
  shorthand requires, since `ctx.tenant_id` is a `UUID|None` that can't bind to a
  TEXT column and legacy must stay unfiltered).
  - `create_document`: routes to `root`/`tid`; 409 check uses `(root/rel).exists()`
    + tenant-scoped DB lookup; `write_document_file(docs_root=root, ...)`;
    `ensure_project_landing`/`update_recent_index` only when `ctx.is_public`
    (else `landing_created=recent_updated=False`); `upsert_document(..., tenant_id=tid)`;
    the git commit+push block gated on `... and ctx.is_public`. Response shape
    unchanged.
  - `_delete_document` takes `ctx`: unlink under `root`; `remove_from_recent_index`
    only if public; `delete_document_by_path(..., tenant_id=_tenant_filter(ctx))`;
    git block gated on `ctx.is_public`. Both delete handlers scope their lookup.
  - Read handlers (`list`/`tags`/`projects`/`by-path`/`by-id`/`search`) all pass
    `tenant_id=_tenant_filter(ctx)`.
  - `POST /api/reindex` is now `async`, resolves `tenant_one_id = await
    get_tenant_one_id()` and forwards it to `reindex`/`reindex_path`; stays
    `require_bearer` (operator-only — a `vk_` key gets 401). `lifespan` boot
    reindex forwards the same.
- **`server/reindex.py`** — `_index_file` gained `tenant_id`, forwarded to
  `upsert_document`. The docs walk was factored into `_walk_root(conn, root,
  tenant_id, disk_by_tenant)`; `reindex(..., tenant_one_id=None)` walks the public
  root `docs/` (tenant_id = `str(tenant_one_id)` or `''`) then every
  `KB_ROOT/tenants/<uuid>/` sibling (tenant_id = the dir name — hard coupling #1:
  identity re-derived from the path). Vanished-row cleanup is now **tenant-scoped**
  (a row is stale only if its `(tenant_id, rel_path)` isn't on disk — never
  deletes another tenant's rows). `reindex_path` gained `tenant_one_id` and stays
  `docs/`-scoped.
- **`server/search.py`** — `search`/`_vector_ordering` gained `tenant_id`, threaded
  into the count/rows filter and `get_all_embeddings`, so BM25 and vector arms are
  both tenant-scoped.
- **`.gitignore`** — added `/tenants/` (non-published, on-box-only). `mkdocs.yml`
  unchanged (the `tenants/` sibling of `docs/` is never served).

## Verification

1. **Legacy regression (critical):** `DATABASE_URL` unset → `uv run pytest -q` →
   **65 passed** (baseline was 65). Ran twice — after the db/search/api_auth/reindex
   edits and again after the full main.py change set.
2. **Import sanity:** `import server.main, server.db, server.api_auth,
   server.reindex, server.search` → OK.
3. **Disposable-DB rebuild:** ad-hoc pre-tenancy DB → `init_db` rebuilt it,
   `tenant_id` present, `UNIQUE(tenant_id, rel_path)` enforced (same rel_path
   across two tenants = 2 rows; same tenant repeat = in-place upsert).
4. **Tenant-isolation smoke (real Postgres):** ephemeral `postgres:17` container +
   `alembic upgrade head` + in-process TestClient against a throwaway `KB_ROOT`
   (KB_GIT_COMMIT=false). **All checks passed:**
   - signup operator@test (T1) + other@test (T2); minted a `vk_` under a project
     of each.
   - T1 via `KB_API_TOKEN` → **201, frozen shape intact**, file lands in `docs/…`,
     `committed:false`, not under `tenants/`.
   - T2 via `vk_` → 201, file lands in `tenants/<uuid2>/…`, **not** in `docs/`,
     `committed:false`, `landing_created:false`, no `docs/proj2` landing.
   - Isolation: each tenant's list/search/get-by-id/get-by-path surfaces only its
     own docs; **cross-tenant get by id and by path → 404**; each tenant's unique
     search marker is invisible to the other.
   - **Cross-tenant delete → 404** (by id and by path); T1's doc survives the
     failed attempts.
   - **Reindex durability:** wiped the sqlite DB entirely, `POST /api/reindex`
     (operator) rebuilt from files (`indexed==2`), and **isolation still holds**
     (tenant_id re-derived purely from the path) — proves hard coupling #1. A
     `vk_` key on `/api/reindex` → 401.
5. `python3 scripts/workflow.py validate` → **passed**.

Working tree confirmed clean afterward: only the intended source edits, no
`docs/`/`tenants/` pollution, no git commit, ephemeral pg container torn down.

## Deviations from `plan.md`

- **Added a third helper `_tenant_filter(ctx)`** (read/lookup scoping) alongside
  the plan's `_tenant_root` + `_tenant_db_id`. The plan says reads "pass
  `tenant_id=ctx.tenant_id`", but `ctx.tenant_id` is a `UUID|None` that (a) can't
  bind to the SQLite TEXT column and (b) must stay `None` in legacy mode to add no
  filter (invariant #1). `_tenant_filter` returns `str(uuid)` in tenant mode and
  `None` in legacy — exactly that intent, SQL-safe. `_tenant_db_id` (write stamp)
  stays `''` in legacy per the plan.
- **Isolation smoke run in-process (TestClient) against a containerized Postgres +
  temp KB_ROOT, instead of a full `docker compose up`.** Rationale: `compose.yml`
  bind-mounts the real repo, so T1's public writes + default git commit would have
  mutated the live `docs/` tree and created real commits. The in-process form
  exercises the identical content-plane code paths (same `main`/`api_auth`/`db`/
  `reindex` against a real migrated Postgres) with zero repo/git side effects, and
  covers every assertion the plan enumerates (routing, cross-tenant 404, reindex
  durability, frozen 201). No behavioral gap.
- No other deviations. Docs are **not** versioned here (Doc-impact notes appended
  to `phase.md` for `P10.REVIEW` to consolidate).
