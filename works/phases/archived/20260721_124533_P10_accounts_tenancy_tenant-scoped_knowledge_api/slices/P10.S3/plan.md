# P10.S3 — plan (orchestrator → slice-executor-mid)

Implement **P10.S3 — Control plane `/app/*` (tenant-scoped projects + `vk_` credentials)** in
`/Users/sugang/projects/personal/knowledge`. Read `works/phases/active/P10/phase.md` first. This is a
**mechanical, faithful port** of vocky's `app_api.py`
(`/Users/sugang/projects/personal/vocky/src/vocky/app_api.py`) to FastAPI, reusing S1's `AccountsService` and S2's
`require_user` guard. It adds one new module + one wiring line — no new patterns. This slice is medium-risk: the
plan is complete; if anything here is wrong or a needed `AccountsService` method is missing, **escalate** with
findings rather than improvising.

**Scope boundary:** ADD `server/app_api.py` (the seven `/app/*` routes) + `app.include_router` in `main.py`. Do
NOT touch content routes / write path / lifespan / `/auth` / `/api`. No `documents.tenant_id` (S5), no seed (S6).
Do NOT commit / transition status / `doc-new-version`. Write `result.md`, append `phase.md` notes, return a verdict.

## Settled adaptations (same policy as S2 — do not re-litigate)
- FastAPI-native body binding + **422** validation (not vocky's Starlette 400-string).
- `project_id: UUID` / `credential_id: UUID` path params → FastAPI **422** on malformed UUID; the **404-both-cases**
  (missing OR cross-tenant) stays a manual guard.
- Credential body is **optional** (empty POST still mints, `name=None`).
- DELETE → `Response(status_code=204)`. `require_user`/`AuthError` reused from S2 (handler already in `main.py`).

## `server/app_api.py` (NEW)

Imports: `from fastapi import APIRouter, Depends, HTTPException, Response`; `from pydantic import BaseModel,
Field, field_validator`; `from uuid import UUID`; `from server.accounts.auth import AuthContext, require_user`;
`from server.accounts.service import get_accounts_service`; `from server.accounts.security import
generate_opaque_token, sha256_hex`; `from server.accounts.types import CreateProject, CreateProjectCredential`;
`from server.auth_api import serialize_tenant`.

Body models (port verbatim; validators unchanged):
```python
class CreateProjectInput(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be blank")
        return stripped

class CreateCredentialInput(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    @field_validator("name")
    @classmethod
    def _strip_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None
```
Serializers:
```python
def serialize_project(p) -> dict:
    return {"id": str(p.id), "name": p.name, "tenant_id": str(p.tenant_id),
            "created_at": p.created_at.isoformat()}

def serialize_credential(c) -> dict:
    return {"id": str(c.id), "project_id": str(c.project_id), "name": c.name,
            "token_prefix": c.token_prefix, "created_at": c.created_at.isoformat(),
            "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None,
            "revoked_at": c.revoked_at.isoformat() if c.revoked_at else None}
```
Scoped-load helper (raises, unlike vocky's return-JSONResponse pattern — cleaner in FastAPI):
```python
async def _load_scoped_project(project_id: UUID, ctx: AuthContext):
    project = await get_accounts_service().get_project(project_id)
    if project is None or project.tenant_id != ctx.tenant.id:
        raise HTTPException(status_code=404, detail="project not found")
    return project
```
Router + handlers (`router = APIRouter()`; all `Depends(require_user)`):
- `@router.get("/app/tenant")` `async def get_tenant(ctx: AuthContext = Depends(require_user))` → `{"tenant":
  serialize_tenant(ctx.tenant)}`.
- `@router.get("/app/projects")` → `projects = await service.list_projects_for_tenant(ctx.tenant.id)`; `{"projects":
  [serialize_project(p) for p in projects]}` (oldest-first, from the service).
- `@router.post("/app/projects", status_code=201)` `async def create_project(payload: CreateProjectInput, ctx=...)`
  → `project = await service.create_project(CreateProject(tenant_id=ctx.tenant.id, name=payload.name))`;
  `{"project": serialize_project(project)}`.
- `@router.get("/app/projects/{project_id}")` `async def get_project(project_id: UUID, ctx=...)` → `project =
  await _load_scoped_project(project_id, ctx)`; `{"project": serialize_project(project)}`.
- `@router.post("/app/projects/{project_id}/credentials", status_code=201)` `async def create_credential(
  project_id: UUID, ctx=..., body: CreateCredentialInput = CreateCredentialInput())` → `project = await
  _load_scoped_project(project_id, ctx)`; `key = f"vk_{generate_opaque_token()}"`; `record = await
  service.create_project_credential(CreateProjectCredential(project_id=project.id, token_prefix=key[:12],
  token_hash=sha256_hex(key), name=body.name))`; return `{"credential": serialize_credential(record), "key": key}`
  — the raw key **only here**.
- `@router.get("/app/projects/{project_id}/credentials")` → `project = await _load_scoped_project(...)`;
  `credentials = await service.list_project_credentials(project.id)`; `{"credentials": [serialize_credential(c) for
  c in credentials]}` (metadata only; includes revoked).
- `@router.delete("/app/projects/{project_id}/credentials/{credential_id}", status_code=204)` `async def
  delete_credential(project_id: UUID, credential_id: UUID, ctx=...)` → `project = await _load_scoped_project(...)`;
  `credentials = await service.list_project_credentials(project.id)`; `if not any(c.id == credential_id for c in
  credentials): raise HTTPException(404, "credential not found")`; `await service.revoke_credential(credential_id)`;
  `return Response(status_code=204)`.

(`service = get_accounts_service()` at the top of each handler, as in vocky.)

## `server/main.py` (MODIFY — one router)
`from server import app_api` and `app.include_router(app_api.router)`. Nothing else.

## Verification (run; report in `result.md`)
1. **HTTP smoke against compose** (Postgres up + `alembic upgrade head`; ephemeral, piped into the api container
   like S1/S2): signup tenant A → create project (201) → list (200, contains it) → get (200) → mint credential
   (201, `key` startswith `vk_`) → list credentials (200, has `token_prefix`, **no** `token_hash`/`key`) → delete
   (204) → delete again (204, idempotent). **Cross-tenant:** signup tenant B → B gets **404** on A's `project_id`
   for get/list-creds/create-cred/delete. Malformed UUID path → 422; missing/blank project name → 422.
2. **No regression:** `uv run pytest -q` (existing 65 pass); app boots with `DATABASE_URL` unset.
3. `python3 scripts/workflow.py validate`.
If Docker is unavailable, don't block: import/route sanity + existing suite + clearly report the Postgres-dependent
smoke steps you couldn't run (as S1/S2 did).

## Finish
`result.md` (routes built, smoke output incl. the cross-tenant 404s + the `vk_` returned-once key, deviations).
Append `phase.md` notes: Doc-impact one-liners (api: `/app/*` control plane — tenant/project CRUD + `vk_`
credential mint/list/revoke, cross-tenant 404, empty-body mint; security: `vk_` keys sha256-hashed, only
`token_prefix` exposed) and **what S4 consumes** (the `projects` table is now the project→tenant source-of-truth;
`vk_` keys resolve via `get_active_credential_by_token_hash`; `credential.project_id → project.tenant_id` is the
resolution chain S4 threads onto `/api/*`). Return `done` when the seven routes work + verification passes; else
`escalate`/`blocked`/`needs_operator` with findings.
