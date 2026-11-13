# Result — P25.S1: org slug — Postgres column, validation, and the `/app/tenant` set surface

**Status: done.** `tenants.slug` exists in the accounts plane, is validated in one
shared place, is claimable through `PATCH /app/tenant`, and appears on every tenant
serialization. Pure additive: a slug-less tenant behaves exactly as before, and
`serialize_tenant` only gained a key.

## What landed

**Model + migration.** `TenantModel.slug` — `Text`, nullable, `unique=True`
(`server/persistence/models.py`). Alembic `0005_tenant_slug` (down_revision
`0004_project_visibility`) adds the column plus `uq_tenants_slug`; `downgrade` drops
both. No backfill, no derived default, no DB `CHECK` — validation is app-layer per
the `0004` precedent. Postgres treats NULLs as distinct under a unique constraint, so
any number of slug-less tenants coexist.

**Shared rules — `server/accounts/slugs.py` (new).** The single home for the charset
(`^[a-z0-9]+(-[a-z0-9]+)*$`), the 2–40 length bound, the 38-word reserved list
(verbatim from `phase.md` § Constraints), the human-readable `ORG_SLUG_CONSTRAINT`
string that every 422 cites, `InvalidOrgSlugError`, `normalize_org_slug()` (trim +
lowercase then validate) and `is_valid_org_slug()`. Mixed case and surrounding
whitespace are accepted on input and normalized, so `Hi2Vi` and `hi2vi` are the same
slug and cannot both be claimed. Re-exported from `server/accounts/__init__.py`.

**Repository** (`server/accounts/repository.py`): `get_tenant_by_slug(slug)` (exact
match on the stored lowercase form) and `set_tenant_slug(tenant_id, slug)` —
load-mutate-flush-refresh, the `set_project_visibility` idiom, never commits.
`_to_tenant_record` now carries `slug`; `TenantRecord` gained `slug: str | None`
(`types.py`).

**Service** (`server/accounts/service.py`):

- `get_tenant_by_slug` normalizes first and **short-circuits to `None` without a DB
  round trip** for anything that could never be a stored slug. Returning `None`
  rather than raising is deliberate and load-bearing for S2: on the anonymous
  surface "malformed", "unclaimed" and "private" must all be one indistinguishable
  404 (`phase.md` § Constraints, 404-never-403).
- `set_tenant_slug` validates before opening a session, stores the normalized form,
  and translates the `UNIQUE` violation into a new `DuplicateOrgSlugError`
  (mirroring `get_or_create_project`'s `IntegrityError` handling) so a taken slug is
  a 409 and never a 500. Re-setting a tenant's own current slug is a no-op update,
  not a conflict.

**API.** `serialize_tenant` (`server/auth_api.py`) gained the additive nullable
`slug` key — one edit covers signup, login, `/auth/me` and `GET /app/tenant`.
`PATCH /app/tenant` (`server/app_api.py`, `Depends(require_user)`, following the
`PATCH /app/projects/{id}` pattern): body `{"slug": "..."}` → 200 with the serialized
tenant; **422** malformed/reserved (from `SetTenantSlugInput`'s `field_validator`,
message citing the constraint, before any DB work); **409** already taken. The route
takes no tenant id in the path — it is scoped implicitly to the caller's own tenant,
so no cross-tenant surface exists.

## Validation

The Postgres-gated suite **actually ran** — it did not skip. I stood up a disposable
`postgres:17` container (host port 55439) and pointed `KB_TEST_DATABASE_URL` at it;
the container was removed afterwards.

| Command | Result |
|---|---|
| `KB_TEST_DATABASE_URL=... .venv/bin/python -m pytest -q` | **119 passed** (was 115 before this slice + 4 new) — gated suite RAN |
| same command, immediately re-run against the **same** database | **119 passed** — proves the new cases are re-runnable |
| `.venv/bin/python -m pytest -q` (no DSN) | 83 passed, **36 skipped** — the gated suite skips cleanly, as designed |
| `DATABASE_URL=... alembic upgrade head` on a **fresh** database | 0001 → 0005 clean; `\d tenants` shows `slug text` + `uq_tenants_slug UNIQUE` |
| `alembic downgrade 0004_project_visibility` then `upgrade head` | clean round-trip; the column and constraint disappear and come back |
| `python3 scripts/workflow.py validate` | passed |
| `.venv/bin/python scripts/plugin_parity.py` | PASS |
| `.venv/bin/python scripts/skills_parity.py` | PASS |

New tests (4, appended to the existing `tests/test_accounts_provisioning.py` — no new
fixture scaffolding, no new file):

1. `test_tenant_slug_starts_null_and_round_trips` — signup returns `slug: None`;
   `PATCH` with `"  ORG-XXXX  "` stores/returns the lowercase form and `GET
   /app/tenant` reads it back.
2. `test_tenant_slug_reserved_is_422` — `dashboard` → 422 and the tenant's slug is
   still `None` (nothing written).
3. `test_tenant_slug_malformed_is_422` — `Not Valid`, `-lead`, `trail-`,
   `double--hyphen`, `a`, `under_score` all 422.
4. `test_tenant_slug_duplicate_across_tenants_is_409` — tenant A claims a slug,
   tenant B claiming its **uppercase** form gets 409 (proving the collision is on the
   normalized value), A re-claiming its own slug still 200s, and B still has `None`.

**A real bug the double-run caught.** My first draft claimed a hardcoded slug
(`hi2vi-labs`), which passed once and then failed on a re-run against the same
database — `tenants.slug` is *globally* unique, unlike every other assertion in that
file, which is tenant-scoped. The slug is now uuid-unique per run. Worth knowing for
S2/S4: any test that claims an org slug must generate it.

## Deviations from `plan.md`

Three, all additive and none changing the plan's shape:

1. **Plugin template mirroring (not in the plan, required by CI).** `server/**` and
   `tests/**` are `shipped_dirs` in `plugin/templates/manifest.json`, and
   `scripts/plugin_parity.py` (run by `.github/workflows/plugin-ci.yml`) fails on any
   file present in the repo but missing from `plugin/templates/kb/`. So all 8 changed
   `server/`+`tests/` files were byte-mirrored and the new `server/accounts/slugs.py`
   was added to the manifest's `identical` list. This matches P19.S1's commit exactly
   (same file set, no `plugin.json` version bump — that is a release-time step).
2. **Tests went in `tests/test_accounts_provisioning.py`, not
   `tests/test_documents_api.py`.** The plan said "wherever tenant API tests live";
   that file is the accounts-plane suite and already owns the `PATCH
   /app/projects/{id}` visibility cases this endpoint is modeled on. Its
   `accounts_client` fixture is the same Postgres-gated shape.
3. **`monkeypatch.setenv("KB_AUTH_RATE_LIMIT", "0")` added to that fixture.** The
   `/auth` throttle counts per (IP, path) in a **process-global** dict shared by every
   suite in the session (default 20 / 15 min). My 6 extra seed signups would have
   pushed later suites over the edge. `documents_client` already does exactly this for
   exactly this reason; no pytest test asserts on throttling.

Also worth flagging (no action taken): `docs/index.json` shows a
`last_rebuilt_at`-only diff that predates my edits — a timestamp touch, not content.

## Out of scope, untouched

No resolver, no `canonical_path`, no `documents_api.py`, no `main.py`, nothing under
`web/`. Those are S2–S5.
