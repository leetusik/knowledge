# Plan — P25.S1: org slug — Postgres column, validation, and the /app/tenant set surface

## Goal

Give a tenant a durable, unique, human public identity: `tenants.slug` in the accounts plane, settable via `PATCH /app/tenant`, exposed everywhere the tenant is serialized. Pure additive — a slug-less tenant behaves exactly as today.

Read `phase.md` (§ "P25.S1", Findings, Constraints) first — the decomposition already settled the design; this plan binds it.

## Work

1. **Model + migration.**
   - `TenantModel` in `server/persistence/models.py`: add `slug` — `Text`, nullable, `unique=True`.
   - New alembic revision `alembic/versions/0005_tenant_slug.py`, `down_revision = "0004_project_visibility"` (match the file/revision naming of `0004`): `op.add_column` + unique constraint, `downgrade` drops it. Pure additive, **no backfill**, no DB `CHECK` (validation is app-layer, per the `0004` precedent).

2. **Validation + reserved words** — one shared constant module-level in the accounts layer (e.g. `server/accounts/` where the service can import it):
   - Charset `^[a-z0-9]+(-[a-z0-9]+)*$`, 2–40 chars, lowercase on write (accept mixed case input, store lowercased).
   - Reserved-word list exactly as `phase.md` § Constraints specifies (api, app, auth, admin, login, logout, signup, dashboard, documents, document, graph, projects, project, search, settings, account, healthz, mcp, static, assets, public, www, robots, sitemap, manifest, favicon, _next, new, edit, null, undefined, me, docs, help, support, status, about, blog). Keep it in ONE place; cite it from the API error message.

3. **Repository + service** (`server/accounts/repository.py`, `service.py`, `types.py` — follow the existing layering and typing conventions there):
   - `get_tenant_by_slug(slug)` → tenant or None.
   - `set_tenant_slug(tenant_id, slug)` — validate (charset + reserved) before write; map the `UNIQUE` `IntegrityError` to a clean conflict result (mirror `get_or_create_project`'s handling), never a 500.

4. **API surface:**
   - `serialize_tenant` in `server/auth_api.py` (~line 195): additive `slug` key (nullable) — this covers `GET /app/tenant`, login, signup.
   - `PATCH /app/tenant` in `server/app_api.py` (session-guarded, `require_user`; follow the `PATCH /app/projects/{id}` visibility pattern): body `{"slug": "..."}` → 200 with the serialized tenant; 422 malformed/reserved (message citing the constraint); 409 already taken.

5. **Tests** — minimal high-value, in the existing Postgres-gated harness (`tests/test_documents_api.py` fixtures / wherever tenant API tests live): set slug happy path (round-trips via `GET /app/tenant`), reserved → 422, malformed → 422, duplicate across two tenants → 409. No new fixture scaffolding. **State in `result.md` whether the Postgres-gated suite actually ran or skipped** (it skips silently without `KB_TEST_DATABASE_URL`/`DATABASE_URL`).

## Out of scope here

No resolver, no `canonical_path`, no web work, no graph work — those are S2–S5. Do not touch `documents_api.py`, `main.py`, or anything under `web/`.

## Validation

- `pytest` at the repo root (note run-vs-skip for the gated suite).
- `python3 scripts/workflow.py validate`.
- If durable truth changed (it does: new column + API), append the one-line "Doc impact" note(s) to `phase.md` § Doc impact (replace the matching "(expected)" hint with the actual note).

## Done means

Migration + model + validation + repo/service + serializer + PATCH endpoint in place, tests written, `result.md` written, `phase.md` notes appended.
