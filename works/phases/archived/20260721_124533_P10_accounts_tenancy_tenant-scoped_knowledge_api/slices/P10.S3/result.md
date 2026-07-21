# P10.S3 — result

Control plane `/app/*` shipped: a faithful, mechanical port of vocky's `app_api.py` to a
FastAPI `APIRouter`, reusing S1's `AccountsService` + S2's `require_user` guard. One new
module (`server/app_api.py`) + one `include_router` wiring in `main.py`. No persistence,
security, `/auth`, `/api`, write-path, or lifespan code touched. No `documents.tenant_id`
(S5), no seed (S6).

## What was built

**`server/app_api.py` (NEW)** — seven `/app/*` routes, all `Depends(require_user)`-gated and
scoped to `ctx.tenant.id`; reuses the `AuthError` handler S2 already registered on the app:

1. `GET  /app/tenant` → `{"tenant": serialize_tenant(ctx.tenant)}`.
2. `GET  /app/projects` → `{"projects": [...]}` via `list_projects_for_tenant(ctx.tenant.id)` (oldest-first).
3. `POST /app/projects` (201) → `create_project(CreateProject(tenant_id=ctx.tenant.id, name=payload.name))`.
4. `GET  /app/projects/{project_id}` → `_load_scoped_project` → `{"project": ...}`.
5. `POST /app/projects/{project_id}/credentials` (201) → mints `key = f"vk_{generate_opaque_token()}"`,
   persists `token_prefix=key[:12]`, `token_hash=sha256_hex(key)`, `name=body.name`; returns
   `{"credential": serialize_credential(record), "key": key}` — the raw key **only here**.
6. `GET  /app/projects/{project_id}/credentials` → `{"credentials": [...]}` (metadata only; includes revoked).
7. `DELETE /app/projects/{project_id}/credentials/{credential_id}` (204) → 404 if the credential isn't
   in the scoped project, else `revoke_credential` (idempotent soft-revoke) → `Response(204)`.

- Body models `CreateProjectInput` / `CreateCredentialInput` ported verbatim (validators unchanged):
  project `name` required + stripped + non-blank; credential `name` optional, stripped → `None` if empty.
- `serialize_project` / `serialize_credential` ported verbatim — `serialize_credential` never emits
  `token_hash` (only `token_prefix` + metadata).
- `_load_scoped_project(project_id, ctx)` raises `HTTPException(404, "project not found")` for **both**
  missing and cross-tenant — the FastAPI-native shape of vocky's return-JSONResponse guard.

**`server/main.py` (MODIFY — one router)** — `from server import app_api` + one
`app.include_router(app_api.router)` after the existing `auth_api` include. Nothing else.

## Deviations from plan

**None functional.** The plan is followed exactly. Two mechanical notes:
- **Serializer type hints loosened to bare params** (`serialize_project(record)` / `serialize_credential(record)`
  return `dict[str, object]`) instead of importing `ProjectRecord` / `ProjectCredentialRecord` for annotations.
  The plan's serializer snippets are already annotation-free (`def serialize_project(p) -> dict:`); I only
  imported the two `Create*` types the handlers construct. Behavior identical; keeps the import list to exactly
  what the plan lists.
- **Optional credential body** realized as `body: CreateCredentialInput = CreateCredentialInput()` (the plan's
  literal signature). Verified against the running stack: an empty POST (no body) mints with `name=None` — the
  FastAPI-native equivalent of vocky's `_parse_optional_body`. No `Body(...)` wrapper needed.

## Verification

Docker **was** available, so every Postgres-dependent step ran against a real `postgres:17`.
**No verification gap.**

1. **Import / route / no-DB sanity** (`uv run python`, `DATABASE_URL` unset): all seven `/app/*` routes
   present in the OpenAPI schema (`GET /app/tenant`; `GET|POST /app/projects`; `GET /app/projects/{project_id}`;
   `POST|GET /app/projects/{project_id}/credentials`; `DELETE …/{credential_id}`); **app boots with
   `DATABASE_URL` unset** (engine stays lazy, content plane intact). **PASS**
   - Note: this FastAPI version wraps `include_router` in a lazy `_IncludedRouter`, so sub-routes are not
     flattened into `app.routes`; verified via `app.openapi()["paths"]` instead.
2. **`uv run pytest -q`** → **65 passed** (1 pre-existing Starlette/httpx deprecation warning). No regression;
   `/api` + `/auth` untouched. **PASS**
3. **Compose stack + `alembic upgrade head`** — `docker compose up -d --build postgres api` (postgres healthy,
   api `/healthz` 200), `alembic upgrade head` applied `0001_accounts_tenancy`. **PASS**
4. **Ephemeral `/app` HTTP smoke** (httpx script piped into the api container over stdin — not a committed
   test, mirrors S1/S2) — **29/29 checks PASS → `APP SMOKE PASSED`.** Covered:
   - unauth `/app/tenant` → **401** + `WWW-Authenticate: Bearer`; `GET /app/tenant` (auth) → **200** `{tenant}`.
   - create project → **201** (name stripped, `tenant_id` == caller's tenant); list contains it; get by id → **200**.
   - mint credential → **201**, `key` **startswith `vk_`**, `token_prefix == key[:12]`, serializer **omits
     `token_hash`**, `revoked_at is None`.
   - **empty-body POST credentials → 201, `name=None`, `vk_` still minted** (optional body).
   - list credentials → **200**, both rows carry `token_prefix`, **never** `token_hash`/`key`.
   - delete → **204**; delete same id again → **204** (idempotent soft-revoke); revoked row still listed with
     `revoked_at` set; delete unknown credential id → **404 "credential not found"**.
   - **Cross-tenant (tenant B on A's `project_id`):** get → **404 "project not found"**, list-creds → **404**,
     create-cred → **404**, delete-cred → **404**; B's own project list stays **empty** (no leak). Missing
     (never-existed) project id → **404** too — both cases answer identically.
   - FastAPI-native validation: malformed UUID path → **422**; missing project name → **422**; blank project
     name → **422**.
5. **`python3 scripts/workflow.py validate`** → "Workflow validation passed." **PASS**

Docker resources (postgres + api containers, `knowledge_pgdata` volume, `knowledge_default` network) were
torn down afterward (`docker compose down -v`); `docker compose ps` and `docker ps -a --filter name=knowledge-`
are empty. Nothing Postgres-dependent was committed to the repo.
