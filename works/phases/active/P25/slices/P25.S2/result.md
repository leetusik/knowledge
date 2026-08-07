# Result — P25.S2: slug-based public document resolver and canonical share path

**Status: done.** A document is now addressable by `(org slug, project, doc slug)`, the
API tells every caller what a document's pretty URL *is* (`canonical_path`), and the 201
save `url` is pretty the moment the writing tenant has an org slug. All additive: a
slug-less tenant sees byte-identical behavior to before, and no existing route changed
shape beyond gaining one nullable key on the two **detail** reads.

## What landed

**1. The public-read gate is now a named predicate.**
`server/documents_api.py::_is_publicly_readable(doc) -> bool` holds the three ordered
guards previously fused into `_resolve_readable_doc`'s tail: the legacy-mode guard
(`config.database_url() is None`), the registry-less-owner guard (`''` sentinel /
unparseable UUID), and `get_project_by_name(owner, doc["project"]).visibility ==
"public"`. `_resolve_readable_doc` now ends in `return doc if await
_is_publicly_readable(doc) else None` — same order, same short-circuits, same
round-trip count, so every existing route behaves exactly as it did. The new resolver
calls the *same* predicate rather than re-deriving the gate, which is the whole point of
the extraction: there is one trust boundary, not two that must be kept in sync.

**2. `GET /app/orgs/{org}/{project}/{slug}`** (`resolve_document_by_slug`) — the bare
slug, no `@` (the prefix is a web-plane convention S3's BFF strips). Order:

1. legacy mode ⇒ 404 before the accounts service is touched;
2. `get_tenant_by_slug(org)` ⇒ `None` ⇒ 404 — and because S1 made that call normalize
   first and answer `None` with **no DB round trip** for malformed/reserved input, a
   garbage org segment collapses into the identical 404 for free;
3. `db.find_latest_document_by_slug(conn, project, slug, tenant_id=str(tenant.id))`
   (`date DESC, id DESC`) ⇒ miss ⇒ 404 — project matched **exactly** (case-sensitive,
   phase.md Q2's default), no canonicalizing redirect;
4. trust: member fast-path (`ctx.tenant.id == tenant.id`) else `_is_publicly_readable`.

Every one of those six misses raises `_no_such_path()` — one constant detail, echoing
nothing back, so "no such org", "no such project", "no such doc" and "that project is
private" are literally indistinguishable. The response is the ordinary detail projection
plus `canonical_path` (always non-null here — resolution came *through* the slug), so it
carries `id` and the `/versions*` + `/raw` reads stay id-keyed and completely untouched.

**3. `canonical_path` on the detail shape** — injected at the two detail call sites,
never inside `_app_doc`. That was load-bearing: `_app_doc` is a pass-through key filter
the **list** route uses too, so injecting there would have added a per-row Postgres
lookup to every list page. `_document_canonical_path(doc, ctx)` keeps the member path
**Postgres-free**: when the caller owns the row, the slug is already on
`AuthContext.tenant` (S1's `serialize_tenant` work loads it per request), so it costs
zero round trips; only the anonymous/cross-org branch — which already pays a Postgres
call for the visibility gate — adds a `get_tenant(owner_uuid)`. Legacy mode, a
registry-less owner and a slug-less owner all answer `null`. The path is built from
`doc["project"]` / `doc["slug"]`, never from `documents.id`.

**4. The 201 save URL** (`server/main.py`). `create_document` is sync under `WRITE_LOCK`
and cannot await, so the tenant's slug arrives through a new **async dependency**
`resolve_org_slug`, copied from the `ensure_registry_project` pattern (FastAPI caches
`resolve_api_write` per request, so this is one extra read, not a second auth
resolution). Tenant with a slug ⇒ `{public_base_url()}/@{slug}/{project}/{doc-slug}`;
tenant without ⇒ the unchanged `/documents/{id}`; legacy branch (`ctx.tenant_id is
None`) ⇒ the mkdocs shape, untouched. Note `project`/`slug` at that point are the
**version target's** on a `new_version` bump, so the pretty URL never moves across a
version chain — which is exactly the P23 story. Pretty regardless of project visibility,
per phase.md Q4.

**5. `KbDocument.canonical_path: string | null`** in `web/src/lib/knowledge/types.ts` —
detail shape only, **not** `KbDocumentListItem`, documented in the additive-field style
of `format` / `version`. Contract mirror only; no UI work (that is S3/S5).

**6. Plugin template parity** — all four changed `server/**` + `tests/**` files mirrored
into `plugin/templates/kb/`. No new file, so `plugin/templates/manifest.json` is
unchanged; no `plugin.json` bump (release-time step). `web/` is not shipped.

## Validation

**The Postgres-gated suite ACTUALLY RAN — it did not skip.** Disposable `postgres:17`
on host port 55439 (55432 is taken on this machine, per S1's note), `KB_TEST_DATABASE_URL`
pointed at it, container removed afterwards. Repo `.venv` (the system `python3` has no
sqlalchemy).

| Command | Result |
|---|---|
| `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb .venv/bin/python -m pytest -q` | **123 passed** (S1 baseline 119 + 4 new) — gated suite **RAN** |
| same command, immediately re-run against the **same** database | **123 passed** — re-runnable (uuid-unique slugs hold) |
| `.venv/bin/python -m pytest -q` (no DSN) | 83 passed, **40 skipped** (was 36) — the 4 new gated cases skip cleanly |
| `cd web && npm run typecheck` | passed (`tsc --noEmit`, no output) |
| `.venv/bin/python scripts/plugin_parity.py` | **PASS** |
| `.venv/bin/python scripts/skills_parity.py` | PASS |
| `python3 scripts/workflow.py validate` | passed |

New tests (4 — no new fixture scaffolding, no new file):

*`tests/test_public_read.py`* (+ a `_set_slug` helper that generates
`org-{uuid4().hex[:10]}` per call, mirroring `_set_public`):

1. `test_slug_resolver_serves_public_and_hides_everything_else` — anonymous 200 on a
   public doc with the right `canonical_path`, `id` present, `tenant_id` absent; then
   six misses (private project, unknown doc slug, unknown project, unclaimed org slug,
   **malformed** org slug, **reserved** org slug) asserted to be 404 *and* to share one
   identical detail string.
2. `test_member_resolves_own_private_doc_by_slug` — the owner resolves their own
   **private** doc through the pretty URL (the save URL is handed out before the project
   is ever made public), and the same URL 404s anonymously.
3. `test_document_detail_carries_canonical_path` — `null` before a slug is claimed (both
   member and anonymous), the correct path after, and the member path and the anonymous
   path agree (they resolve the slug by different routes, so this is the real assertion).

*`tests/test_org_credentials.py`*:

4. `test_save_url_is_pretty_once_the_tenant_has_an_org_slug` — same tenant writes twice
   through a real org key: `/documents/{id}` before the slug is claimed,
   `/@{slug}/{project}/{doc-slug}` after.

## Deviations from `plan.md`

1. **The 201-URL test lives in `tests/test_org_credentials.py`, not
   `tests/test_public_read.py`.** The plan put all six cases in `test_public_read.py`,
   but that file's `documents_client` fixture sets `KB_DB_PATH` and **not `KB_ROOT`** —
   a `POST /api/documents` under it would write real files into the repo's own `docs/`
   tree and take the git commit path. `org_client` (`test_org_credentials.py`) sets
   `KB_ROOT` to a `tmp_path` and already owns the *existing* assertion on the tenant-mode
   201 `url` (line ~110, P19.S4), so the before/after pair belongs beside it. The other
   five cases went to `test_public_read.py` as planned.
2. **The resolver's 404 detail is its own constant (`"no document at that path"`), not
   the id route's string.** The plan asked for "the identical 404 detail string used by
   `GET /app/documents/{id}`" — but that string is `f"no document with id {doc_id}"`,
   which cannot exist on a route that never sees an id. What the constraint actually
   protects (404-never-403: every miss indistinguishable **from every other miss on the
   same surface**) is preserved and now asserted in test 1. Flagging it because a
   reviewer comparing the two literals will notice they differ.
3. **`_resolve_readable_doc` keeps its own legacy-mode early return** even though
   `_is_publicly_readable` re-checks it. Deliberate: the early return skips the unscoped
   `db.get_document` too, so the legacy path stays exactly as cheap as before the
   extraction. The duplicate check is one env read.
4. **Plugin template mirroring** — not in the plan's numbered work but item 7 requires
   it; done, no manifest change (no new files).

Not touched, as scoped: no web routes/pages, no graph, no share affordances,
`robots.ts` / `sitemap.ts` / `next.config.ts` / nginx all untouched.

## Notes for S3/S4/S5

- The resolver takes the **bare** slug. S3's BFF must strip the `@` from the `[org]`
  segment before calling `/app/orgs/{org}/{project}/{slug}`, and should still validate
  that the incoming segment starts with `@` (an un-prefixed URL is not our namespace).
- `canonical_path` is `null` until the operator claims a slug (S5's dashboard field), so
  **every consumer needs the `/documents/{id}` fallback** — including S3's legacy
  redirect, which must serve as today rather than redirect when the key is null.
- The anonymous detail read now costs **two** Postgres round trips (visibility gate +
  owner tenant lookup). If that ever matters, the fix is to have `_resolve_readable_doc`
  return the owner tenant alongside the doc, not to cache in the web layer.
