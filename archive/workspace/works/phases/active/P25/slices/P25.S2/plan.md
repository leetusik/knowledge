# Plan — P25.S2: slug-based public document resolver and canonical share path

## Goal

Make a document addressable by `(org slug, project, doc slug)` on the `/app` plane, and teach the API to emit each document's pretty URL as an additive `canonical_path`. Read `phase.md` § "P25.S2", Findings, and Constraints first — they bind this slice. S1 has landed: `TenantRecord.slug`, `get_tenant_by_slug` (normalizes first; returns `None` with no DB round trip for malformed/reserved input — exactly the 404-never-403 collapse we want), `set_tenant_slug`, and `server/accounts/slugs.py` all exist now.

## Decisions fixed by this plan

- **Backend resolver path: `GET /app/orgs/{org}/{project}/{slug}`.** The backend accepts the **bare** slug (no `@`); the `@` prefix is a web-plane convention the BFF strips before calling. Malformed org input → `get_tenant_by_slug` → `None` → the same 404 as everything else.
- **Project segment matches exactly** (case-sensitive) — phase.md Q2's default. No canonicalizing redirect.
- **`canonical_path` appears on the detail shape only** — injected at the two detail call sites (`GET /app/documents/{doc_id}` and the new resolver), **never inside `_app_doc`** (it is a pass-through key-filter also used by the list route; injecting there would silently add a per-row Postgres lookup to lists).

## Work

1. **Extract the public-read gate.** In `server/documents_api.py`, `_resolve_readable_doc` (line ~137) fuses doc-id lookup + trust gate. Extract the gate half (~lines 170–185: legacy-mode guard `config.database_url() is None`, owner-tenant empty/unparseable guard, `get_project_by_name(owner, doc["project"]).visibility == "public"`) into an async predicate (e.g. `_is_publicly_readable(doc) -> bool`) and call it from both `_resolve_readable_doc` and the new resolver. Reuse, don't re-derive; behavior of every existing route unchanged.

2. **Resolver route** `GET /app/orgs/{org}/{project}/{slug}` in `documents_api.py` (bare `router`, full path, module-local async `get_conn` dependency — NOT `main.get_conn`):
   - Optional identity (same dependency the other `/app/documents` routes use).
   - Legacy mode (`config.database_url() is None`) → 404 before touching the accounts service.
   - `get_tenant_by_slug(org)` → `None` ⇒ 404. Then `db.find_latest_document_by_slug(conn, project, slug, tenant_id=str(tenant.id))` (server/db.py:294, `date DESC, id DESC`) ⇒ miss = 404.
   - Trust: if requester is a member of the owner tenant → readable (member fast-path); else `_is_publicly_readable(doc)` must pass; every miss is the **identical** 404 detail string used by `GET /app/documents/{id}`.
   - Response: `{**_app_doc(doc, include_markdown=True), "canonical_path": f"/@{org}/{project}/{slug}"}` — always non-null here (resolution came via the slug). Carries `id`, so `/versions*` and `/raw` stay id-keyed and untouched.

3. **`canonical_path` on `GET /app/documents/{doc_id}`** (detail call site, line ~243):
   - Member fast-path: use `ctx.tenant.slug` (already loaded on `AuthContext.tenant` — zero extra round trip; keep the member path Postgres-free as today). Slug `None` ⇒ `canonical_path: null`.
   - Anonymous/public path: that branch already makes a Postgres call for the visibility gate; add `get_tenant(owner_uuid)` → slug (or restructure so one lookup serves both). Slug-less owner ⇒ `null`. Legacy mode ⇒ `null`.
   - Path is built from `doc["project"]` and `doc["slug"]` — never from `documents.id`.

4. **201 save URL** in `server/main.py` (~886): `create_document` is a **sync** handler under `WRITE_LOCK` and cannot await. Copy the `ensure_registry_project` async-dependency pattern (main.py:546): a dependency that resolves the authed tenant's slug (via the cached `resolve_api_write` context; `None` in legacy mode) and injects it. Then:
   - tenant with slug → `url = f"{public_base_url()}/@{slug}/{project}/{doc_slug}"`
   - tenant without slug → unchanged `{public_base_url()}/documents/{doc_id}`
   - legacy branch (`ctx.tenant_id is None`) → untouched mkdocs shape.
   - Per phase.md Q4: the URL is pretty regardless of project visibility.

5. **Web type mirror** (contract doc only — no UI work): add `canonical_path: string | null` to `KbDocument` in `web/src/lib/knowledge/types.ts` (detail shape only, NOT `KbDocumentListItem`), with the additive-field doc comment style of `format`/`version`.

6. **Tests** — minimal, in `tests/test_public_read.py` (reuses the gated `documents_client` harness; add a `_set_slug` helper mirroring `_set_public`, claiming **uuid-unique slugs** — `tenants.slug` is globally unique and hardcoded slugs 409 on suite re-runs against one database):
   - resolve happy path (public project, anonymous) → 200, `canonical_path` correct;
   - private project via resolver, unknown org slug, unknown doc slug → all 404, identical detail;
   - member resolves own private doc → 200;
   - `GET /app/documents/{id}` carries `canonical_path` when the owner has a slug, `null` when not;
   - one gated test that the 201 save `url` is pretty once the tenant has a slug (write path + slug set).
   Keep it to a handful; no new fixture scaffolding.

7. **Plugin template parity** (S1 flagged this — mandatory): mirror every changed `server/**` and `tests/**` file into `plugin/templates/kb/` and update `plugin/templates/manifest.json` if a new file appears. `scripts/plugin_parity.py` must pass. No `plugin.json` bump.

## Out of scope

No web routes/pages (S3), no graph (S4), no share affordances (S5). Do not touch `robots.ts`, `sitemap.ts`, `next.config.ts` header exemptions, or nginx.

## Validation

- Gated suite against a disposable Postgres (S1's recipe, port 55439; baseline 119 passed) — run twice to prove re-runnability; plus the no-DSN run for the clean skip path. **State run-vs-skip in `result.md`.**
- `web/`: `npm run typecheck` (types.ts change).
- `scripts/plugin_parity.py` → PASS.
- `python3 scripts/workflow.py validate`.
- Append actual "Doc impact" lines to `phase.md` (api.md: resolver route + `canonical_path` + changed 201 url; backend.md: gate extraction; frontend.md: the `KbDocument` field).
