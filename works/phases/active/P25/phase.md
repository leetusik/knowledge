# Phase P25: Pretty public share URLs

_Intent: see [intent.md](intent.md)._

## Objective

Human-readable, durable slug-based public URLs for shared documents and the public graph (org slug + project + doc slug), replacing numeric-ID/UUID links while keeping old links working

## Context

P19 shipped project-level public visibility; the URLs it hands out are the problem.
Today a shared document is `https://knowledge.hi2vi.com/documents/25` (a **disposable**
content-plane SQLite rowid) and the public graph is `/graph/{tenant-uuid}`. This phase
adds the missing durable public identity — an **org slug** in the Postgres accounts
plane — and builds slug-addressed public URLs on top of it, without changing any
visibility semantics.

Two planes matter here and the split is load-bearing:

- **Accounts plane (Postgres, durable):** tenants, projects, visibility. The org slug
  belongs here — it must survive a full content reindex.
- **Content plane (SQLite, disposable):** `documents` rows. `documents.id` is
  re-derived by reindex and **nothing durable may key off it**. Its durable identity is
  `(tenant_id, rel_path)` where `rel_path = "<project>/<date>-<slug>.<ext>"`.

The pretty URL is therefore built from durable parts only: org slug (Postgres) +
project name (both planes) + doc slug (content plane, part of `rel_path`).

## Decomposition

Single-pass decomposition — no product visual design in this phase (the new pages reuse
`PublicShell` / `AppShell` / `DocumentView` / `GraphCanvas` verbatim), so there is no
`co-work` slice and no `DECOMP2`. Backend lands before web, exactly as the plan asks:
S1 gives the org slug a durable home, S2 makes documents resolvable by slug and teaches
the API to emit the canonical path, and only then do the web surfaces (S3, S4, S5)
consume it.

| Slice | Name | Kind | Risk | Order | Depends on |
|---|---|---|---|---|---|
| `P25.S1` | org slug: postgres column, validation, and the `/app/tenant` set surface | implementation | high | 1 | — |
| `P25.S2` | slug-based public document resolver and canonical share path | implementation | high | 2 | P25.S1 |
| `P25.S3` | web pretty document route and legacy `/documents/{id}` redirect | implementation | high | 3 | P25.S2 |
| `P25.S4` | **(D19 — orchestrator creates via `promote-deferred D19`)** org-slug public graph URL and legacy `/graph/{uuid}` redirect | implementation | high | 4 | P25.S1 |
| `P25.S5` | share affordances: copy-link, save URL, and the org-slug settings field | implementation | high | 5 | P25.S3 |

**Every middle slice is `risk: high`.** None of them is a one-/few-line edit: S1 adds a
migration + model + repository/service/API layers, S2 adds a route plus a resolution
helper, S3/S4 add Next routes and change redirect behavior, and S5 spans three web
surfaces plus copy. Nothing here qualifies for the `mid` tier.

### P25.S1 — org slug: Postgres column, validation, and the `/app/tenant` set surface

Give a tenant a durable, unique, human public identity.

- `tenants.slug` — `Text`, **nullable**, `unique`, on `TenantModel`; alembic revision
  `0005_tenant_slug` (down_revision `0004_project_visibility`). Nullable and **no
  backfill**: a tenant without a slug simply has no pretty URL yet and every existing
  link keeps working, so the migration is a pure add with zero behavior change.
- Slug validation + a **reserved-word guard** (see Constraints for the reserved list and
  the charset). Validation is app-layer, matching the `projects.visibility` /
  `usage_events.event_type` precedent — no DB `CHECK`.
- Accounts repository + service: `get_tenant_by_slug(slug)` and
  `set_tenant_slug(tenant_id, slug)` (the latter mapping the `UNIQUE` violation to a
  clean conflict rather than a 500, mirroring `get_or_create_project`'s `IntegrityError`
  handling).
- `serialize_tenant` (in `server/auth_api.py` — the canonical tenant serializer) gains
  an additive `slug` key, so `GET /app/tenant`, login and signup all expose it.
- `PATCH /app/tenant` (session-guarded, `require_user`) sets it: `{"slug": "..."}` →
  422 on a malformed/reserved slug, 409 on one already taken.

Files: `server/persistence/models.py`, `alembic/versions/0005_tenant_slug.py`,
`server/accounts/{repository,service,types}.py`, `server/auth_api.py`,
`server/app_api.py`, tests.

### P25.S2 — slug-based public document resolver and canonical share path

Make a document addressable by `(org slug, project, doc slug)`, and teach the API to
tell callers what a document's pretty URL *is*.

- A resolver route on the `/app` plane taking org slug + project + doc slug, with
  **exactly** the `_resolve_readable_doc` trust semantics: optional-identity, member
  fast-path, public-project fallback, legacy-mode guard, and **404-never-403** for every
  miss (unknown org slug, private project, unknown doc slug are all indistinguishable).
  Resolution: org slug → tenant UUID (Postgres) → `db.find_latest_document_by_slug(conn,
  project, slug, tenant_id=<owner>)` → the P19 visibility gate. The response is the
  existing `_app_doc(..., include_markdown=True)` projection, so it carries `id` — which
  lets the `/versions*` and `/raw` reads stay id-keyed and unchanged.
- An additive, nullable **`canonical_path`** on the document read shape
  (`/app/documents/{id}` and the new resolver) — `"/@{org}/{project}/{doc-slug}"`, or
  `null` when the owner tenant has no slug. This is the single source of the pretty URL
  for every consumer (the S3 redirect, the S5 copy-link), so the web never has to
  assemble it or look up an org slug itself.
- The 201 save URL in `server/main.py` (~line 887) emits the pretty URL when the owner
  tenant has a slug, and keeps `{origin}/documents/{id}` otherwise. Legacy/single-tenant
  mode (`ctx.tenant_id is None`) keeps its mkdocs URL untouched.

Files: `server/documents_api.py`, `server/main.py`, `server/accounts/service.py`
(a tenant-slug lookup), tests (`tests/test_public_read.py` harness).

### P25.S3 — web pretty document route and legacy `/documents/{id}` redirect

- New route `web/src/app/(public)/[org]/[project]/[slug]/page.tsx` rendering the
  existing `<DocumentView>` / `<VersionHistory>` in the same member/anonymous branch
  split the current `(public)/documents/[id]/page.tsx` uses. The `[org]` param must
  start with `@` (validated before any session read or upstream call) — anything else is
  an immediate `notFound()`.
- **First task of this slice: verify Next.js route precedence** (see Open Questions Q1)
  before writing the page — a root-level `[org]` segment must not shadow `/documents/*`,
  `/graph/*`, `/dashboard`, `/login`, `/projects/*` or any `/api/*` handler.
- Legacy `/documents/{id}`: on the **anonymous** branch only, redirect to
  `canonical_path` when the response carries one. The member branch keeps the id URL
  (per intent: internal navigation may keep ids).
- BFF client helper for the resolver in `web/src/lib/knowledge/app.ts`; `canonical_path`
  added to `KbDocument` in `web/src/lib/knowledge/types.ts`.

### P25.S4 — (D19) org-slug public graph URL and legacy `/graph/{uuid}` redirect

**Not created by this decomposition** — the orchestrator creates it with
`promote-deferred D19 --phase P25 --slice P25.S4 --name "org-slug public graph URL and
legacy /graph/{uuid} redirect" --kind implementation --risk high --order 4 --depends-on
P25.S1`. D19 ("Org slug vanity URLs for the public graph") is exactly this slice's job
and its trigger ("Operator wants pretty share URLs") has fired.

Scope: `/@{org}/graph` as the public graph URL — a new
`web/src/app/(public)/[org]/graph/page.tsx` (2 segments; it does **not** collide with
the 3-segment doc route). `GET /app/graph?org=` accepts an org **slug** in addition to a
tenant UUID (`server/graph_api.py`, ~line 189 — resolve slug → tenant, then the existing
public-projects path, 404 unchanged for an org with no public projects). The existing
`(public)/graph/[org]` route keeps accepting a UUID and redirects to `/@{org}/graph`
when the tenant has a slug, otherwise serves as today. Doc-node `url`s in the graph
payload stay `/documents/{id}` (they resolve through the S3 redirect) — changing them
is not required and is out of scope.

### P25.S5 — share affordances: copy-link, save URL, and the org-slug settings field

The surfaces that hand a URL to a human.

- `<CopyLinkButton>` on the document read view copies `canonical_path` when present,
  falling back to `/documents/{id}`. The member graph header (`(app)/graph/page.tsx`)
  copies `/@{slug}/graph` when the session tenant has a slug, else `/graph/{orgId}`.
- An org-slug field on the **dashboard** (the existing org-level surface — it already
  hosts `create-project-form` and `mint-org-key-form`), wired to `PATCH /app/tenant`
  through a `"use server"` action in the dashboard's `actions.ts`, following the
  `visibility-toggle` + `set-project-visibility` precedent. This is how tenant #1 gets
  its slug: **the operator sets it through the UI after deploy — no hardcoded value and
  no migration backfill anywhere.**
- Copy strings go in `web/src/content/share.ts` / `dashboard.ts` per the repo's
  copy-as-data convention (no inline strings in pages).

## Findings & Notes

### Established by research (verified in the code, not assumed)

- **Project names are already URL-safe — no project slug is needed.**
  `server/documents.py::validate_project` enforces `^[A-Za-z0-9][A-Za-z0-9._-]*$` (no
  spaces, no slashes, no `..`) because the project name is a directory name in
  `rel_path`. `projects.name` (Postgres) and `documents.project` (SQLite) hold the same
  string. So the URL's project segment is the project name **verbatim**. Doc slugs are
  stricter still: `validate_slug` uses the tag charset `^[a-z0-9]+(-[a-z0-9]+)*$`.
- **`find_latest_document_by_slug(conn, project, slug, tenant_id=...)`
  (`server/db.py:294`) is the resolver primitive, and it already scopes by tenant.**
  Ordering is `date DESC, id DESC` — "newest wins", the exact semantics the dateless
  pretty URL wants.
- **`_resolve_readable_doc` (`server/documents_api.py:137`) is the trust boundary to
  reuse, not re-derive.** Member fast-path → legacy-mode guard (`DATABASE_URL` unset ⇒
  never public) → registry-less-owner guard (`''`/unparseable tenant ⇒ never public) →
  `get_project_by_name(owner, doc["project"]).visibility == "public"`. Every miss is
  `None` ⇒ an indistinguishable 404. The new slug route must land on the *same* gate,
  ideally by resolving to a doc row and then calling the same predicate.
- **`documents.id` is disposable and already documented as such** (`_VERSION_DROP` in
  `documents_api.py` drops the version rowid for exactly this reason;
  `server/documents.py:592` notes the doc's identity is `rel_path`). This is the
  durability half of the phase's motivation, and it is real.
- **The version/raw reads can stay id-keyed.** `/app/documents/{id}/versions*` and
  `/raw` resolve the current document first and then read the archive by `rel_path`; the
  resolver response carries `id`, so the pretty page passes it to those routes and
  nothing else changes. The `next.config.ts` `X-Frame-Options: SAMEORIGIN` exemptions
  are keyed on `/api/documents/:id/raw` and `/api/documents/:id/versions/:v/raw` — **do
  not touch them**; the sandboxed explainer iframe still uses the id-keyed BFF path.
- **nginx needs no change for the new page routes.** `deploy/knowledge.conf` sends
  `location /` to `knowledge-web:3000` (so `/@org/...` is already routed) and `/app/` to
  the API. The only regex location is `~ ^/api/documents/[0-9]+/raw$`; leave it alone.
  A backend route added under `/app/` is likewise already proxied.
- **`GET /app/tenant` + `serialize_tenant` (`server/auth_api.py:195`) is the natural
  read surface for the org slug**, and `PATCH /app/projects/{id}` (visibility, plus its
  `visibility-toggle.tsx` + `actions.ts` web pair) is the pattern to copy for the write.
- **The dashboard is the org-level web surface** (`create-project-form`,
  `mint-org-key-form`); there is no settings page and this phase should not invent one.
- **Test harness:** `tests/test_public_read.py` reuses `tests/test_documents_api.py`'s
  Postgres-gated client fixture + `_signup` / `_project` helpers and seeds docs straight
  into the throwaway SQLite. New slug tests belong there. The suite **skips** without
  `KB_TEST_DATABASE_URL` / `DATABASE_URL` — so a green local run may have proved
  nothing; every slice must state whether Postgres was actually available.
- Web: Next **16.2.9**, React 19, App Router, **no `middleware.ts` exists today**.
  Validation commands: `npm run lint`, `npm run typecheck`, `npm run build`,
  `npm run test` (vitest) in `web/`; `pytest` at the repo root.

### Design decisions settled here

**D1 — URL shape: `/@{org}/{project}/{doc-slug}` for documents, `/@{org}/graph` for the
graph.** The `@` prefix marks the whole public namespace explicitly, so no
reserved-top-level-name list is needed for *routing* (only for slug provisioning), and
new top-level app routes can be added forever without collision risk. The Next.js
parallel-route hazard the plan flags does **not** apply: a folder literally named `@x`
is a slot, but our folder is a plain dynamic `[org]` whose *param value* happens to
start with `@` — `@` is a legal, unencoded path character. The graph lives **under the
org namespace** (`/@{org}/graph`, 2 segments) rather than `/graph/@{org}`: it keeps one
consistent rule ("everything public hangs off `/@{org}`") and does not collide with the
3-segment doc route, since Next matches full-path route regexes, not a greedy tree walk.
Fallback, if Q1's precedence check fails: keep the same URLs but route them through a
`next.config` rewrite or a new `middleware.ts` onto an internal prefix — the *user-facing
shape does not change* in the fallback, only the wiring.

**D2 — doc-slug collision semantics: the pretty URL omits the date and resolves to the
newest.** `/@{org}/{project}/{doc-slug}` → `find_latest_document_by_slug` (`date DESC,
id DESC`) scoped to the owner tenant. **No dated form is introduced in this phase.**
Rationale: "the latest doc under this title" is what a shared link should mean, it
matches the P23 versioning story (a re-publish under the same slug *is* the new
version), and the exact-row addressing already exists and keeps working
(`/documents/{id}`, plus `/documents/{id}/versions/{v}` for a specific body). Accepted
tradeoff: re-publishing the same slug on a later date moves the pretty URL's target —
which is the intended behavior, not a bug.

**D3 — org slug provisioning: nullable unique `tenants.slug`, set by the operator via
`PATCH /app/tenant` + a dashboard field.** No backfill, no derived-from-name default, no
hardcoded value for tenant #1 — a tenant without a slug keeps exactly today's URLs, and
the operator sets `hi2vi` (or whatever they choose) through the UI after deploy. Charset
`^[a-z0-9]+(-[a-z0-9]+)*$`, 2–40 chars, lowercased on write, plus the reserved-word
guard in Constraints. Slugs are **mutable** (the operator is the only user today) and
there is **no slug-history / old-slug redirect** — see Q3.

**D4 — old links: redirect on the anonymous surface, dual-serve for members.**
`/documents/{id}` keeps working for everyone; an **anonymous** visitor is redirected to
`canonical_path` when there is one, while a signed-in member stays on the id URL (it
carries member-only affordances — back-link, delete — and intent explicitly allows
internal navigation to keep ids). `/graph/{uuid}` redirects to `/@{org}/graph` when the
tenant has a slug, else serves as today. Redirects are **temporary (307 via
`next/navigation`'s `redirect()`), not permanent**, precisely because D3 leaves slugs
mutable — a 308 would be cached by browsers past a slug change. Nothing 404s that used
to work: every redirect path has a "serve as today" fallback when no slug exists.

### Notes for later slices

- The additive `canonical_path` is what keeps the web dumb: build it **once**, in the
  backend, and let S3/S5 consume it. Do not re-derive the pretty URL in TypeScript.
- Computing `canonical_path` costs a tenant→slug lookup. The member fast-path in
  `_resolve_readable_doc` deliberately never touches the accounts service today; keep
  that read cheap (skip/cache the lookup rather than adding a per-read round trip on the
  hot member path), and do not disturb the existing member-behavior-preserved contract.
- Respect **404-never-403** on every new anonymous surface, including an unknown org
  slug — an org slug that exists but has no public projects and one that was never
  registered must be indistinguishable.
- Do **not** touch `web/src/app/robots.ts` or `sitemap.ts` (explicitly out of scope), and
  do not change per-document visibility or add share tokens.
- `depends_on` for `P25.S5` intentionally names only `P25.S3`: `P25.S4` does not exist
  yet at decomposition time and `validate` checks dependency existence. The orchestrator
  may add `P25.S4` to S5's `depends_on` after promoting D19.

### Landed by P25.S1 (bind these — later slices build on them)

- **`server/accounts/slugs.py` is the one place the org-slug rules live.** It exports
  `normalize_org_slug()` (trim + lowercase, then validate — raises
  `InvalidOrgSlugError`), `is_valid_org_slug()`, `ORG_SLUG_PATTERN`,
  `ORG_SLUG_MIN/MAX_LENGTH`, `RESERVED_ORG_SLUGS` (38 words) and
  `ORG_SLUG_CONSTRAINT` (the human string every 422 cites). Also re-exported from
  `server.accounts`. **S2/S4 must not re-derive the charset** — import it.
- **Slugs are stored lowercase and matched exactly.** Mixed case in, lowercase
  stored: `Hi2Vi` and `hi2vi` are the same slug and collide. So an S3/S4 URL segment
  should be normalized (via `normalize_org_slug`) before lookup, not compared raw.
- **`AccountsService.get_tenant_by_slug(slug)` is the resolver primitive for S2/S4**
  and is deliberately forgiving-then-silent: it normalizes first and returns `None`
  (no DB round trip) for anything malformed/reserved rather than raising. That is
  what lets an unknown org slug be the *same* indistinguishable 404 as a private
  project — 404-never-403 comes for free if you just treat `None` as "not found".
- **`AccountsService.set_tenant_slug(tenant_id, slug)`** validates before opening a
  session and raises the new **`DuplicateOrgSlugError`** (an `AccountsPersistenceError`
  subclass) on the `UNIQUE` violation — 409, never a 500. Re-setting a tenant's own
  current slug is a no-op success, not a conflict.
- **`serialize_tenant` (`server/auth_api.py`) now emits `"slug"` (nullable).** One
  edit covers signup, login, `/auth/me` **and** `GET /app/tenant`, so S5's dashboard
  field can read the current slug straight off the session tenant with no new call.
- **`PATCH /app/tenant`** is the write surface: `{"slug": "..."}` → 200 `{tenant}`,
  422 malformed/reserved (message cites the constraint), 409 taken. It takes **no
  tenant id in the path** — it is implicitly scoped to the caller's own tenant, so
  S5's server action just posts the body.
- **`documents.id` note stands:** nothing here keys off it. `tenants.slug` is
  Postgres-side and survives a full content reindex, which is the whole point.

### Gotchas found while doing S1 (they will bite S2–S5)

- **Plugin template parity is a CI gate this phase must honor on every backend
  slice.** `server/**` and `tests/**` are `shipped_dirs` in
  `plugin/templates/manifest.json`; `scripts/plugin_parity.py`
  (`.github/workflows/plugin-ci.yml`) fails on any file in the repo but not in
  `plugin/templates/kb/`, and byte-compares the rest. So **every** `server/` or
  `tests/` edit must be copied to `plugin/templates/kb/<same path>`, and a **new**
  file must additionally be added to the manifest's `files.identical` list. `web/` is
  **not** shipped, so S3/S5's web-only work mirrors nothing. Precedent: P19.S1's
  commit has exactly this doubled file list and no `plugin.json` bump.
- **`tenants.slug` is GLOBALLY unique — unlike every other assertion in the gated
  suites, which are tenant-scoped.** A test that claims a hardcoded slug passes once
  and then 409s forever after against a re-used database. Generate the slug per run
  (`f"org-{uuid4().hex[:10]}"`). I hit this exactly.
- **The `/auth` throttle is process-global across the whole pytest session** (per
  (IP, path), default 20 / 15 min), so adding seed signups to one suite can push a
  *later* suite into 429s. `test_documents_api.py`'s fixture already sets
  `KB_AUTH_RATE_LIMIT=0`; S1 added the same line to `test_accounts_provisioning.py`'s
  `accounts_client`. Any new gated suite should do the same.
- **How to actually run the gated suite** (it silently skips otherwise, so a green
  local run can prove nothing): `docker run -d --rm --name kb-pg -e
  POSTGRES_PASSWORD=kb -e POSTGRES_USER=kb -e POSTGRES_DB=kb -p 55439:5432
  postgres:17`, then `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb
  .venv/bin/python -m pytest -q`. Note **55432 was already in use** on this machine.
  Use the repo `.venv` (`.venv/bin/python`) — the system `python3` has no sqlalchemy.
  Baseline after S1: **119 passed** with Postgres, **83 passed / 36 skipped** without.
- Migrations are **not** shipped in the plugin payload (`alembic/` is not a
  `shipped_dir`), so `0005` needed no mirror. It was verified for real:
  `upgrade head` on a fresh DB, then `downgrade 0004_project_visibility`, then
  `upgrade head` again — all clean.

### Landed by P25.S2 (bind these — S3/S4/S5 build on them)

- **`GET /app/orgs/{org}/{project}/{slug}` is the resolver, and it takes the BARE
  slug** (no `@`). The `@` is a web-plane convention: S3's BFF strips it before
  calling, and should still reject an `[org]` segment that does not start with `@`
  (an un-prefixed URL is not our namespace). Project is matched **exactly**
  (case-sensitive — Q2's default); doc slug resolves newest-first via
  `find_latest_document_by_slug`. The response is the ordinary detail projection, so
  it carries `id` and `/versions*` + `/raw` stay id-keyed and unchanged.
- **Every resolver miss is one constant 404 detail** (`"no document at that path"`,
  `documents_api._no_such_path()`) — legacy mode, unknown/malformed/reserved org
  slug, unknown project, unknown doc slug and a private project are literally
  indistinguishable. It deliberately does **not** match the id route's detail
  (`f"no document with id {doc_id}"`), which cannot exist on a route that never sees
  an id; what the 404-never-403 constraint protects is that misses on the *same*
  surface look alike, and a test asserts exactly that.
- **`_is_publicly_readable(doc)` (`server/documents_api.py`) is now the single
  public-read gate**, extracted from `_resolve_readable_doc`. Anything that needs
  "may a non-owner see this row?" — including S4's graph work if it grows one —
  must call it, never re-derive the legacy-mode / registry-less-owner / visibility
  triple.
- **`canonical_path` is on the DETAIL shape only** (`GET /app/documents/{id}` and the
  resolver), injected at those two call sites and deliberately **not** inside
  `_app_doc` — that projector is shared with the LIST route, and injecting there
  would add a per-row Postgres lookup to every list page. So **`GET /app/documents`
  list rows have no `canonical_path`**; a web surface that wants a pretty link from a
  list must fetch the detail or fall back to `/documents/{id}`.
- **`canonical_path` is `null` until the operator claims a slug** (S5's dashboard
  field is what sets it). Every consumer therefore needs the `/documents/{id}`
  fallback — including S3's legacy redirect, which must serve as today when the key
  is null rather than redirect.
- **The member detail read stays Postgres-free.** `_document_canonical_path` reads
  the slug straight off `AuthContext.tenant` when the caller owns the row; only the
  anonymous/cross-org branch pays a `get_tenant` lookup (on top of the visibility
  gate it already paid — so that path is now **two** round trips). If that ever
  matters, the fix is to have `_resolve_readable_doc` hand back the owner tenant, not
  to cache in the web layer.
- **The 201 save `url` is pretty whenever the writing tenant has a slug** —
  `{origin}/@{slug}/{project}/{doc-slug}`, built by the new async dependency
  `server/main.py::resolve_org_slug` (the `ensure_registry_project` pattern: the
  handler is sync under `WRITE_LOCK` and cannot await). Slug-less ⇒ unchanged
  `/documents/{id}`; legacy ⇒ untouched mkdocs shape. On a `new_version` bump the
  URL uses the **target's** project/slug, so a document's pretty URL never moves
  across a version chain.
- **`KbDocument.canonical_path: string | null` exists in
  `web/src/lib/knowledge/types.ts`** already (detail only, not
  `KbDocumentListItem`) — S3 does not need to add it, only to consume it. Do not
  re-derive the pretty URL in TypeScript.

### Gotchas found while doing S2

- **`tests/test_public_read.py`'s `documents_client` fixture sets `KB_DB_PATH` but
  NOT `KB_ROOT`.** A `POST /api/documents` under it would write real files into the
  repo's own `docs/` tree and take the git commit path. Only `test_org_credentials.py`'s
  `org_client` (and `test_api_write.py`) isolate `KB_ROOT` to a `tmp_path` — so any
  future **write-path** test belongs there, not in the public-read suite. That is why
  S2's 201-URL case sits in `test_org_credentials.py`.
- S1's globally-unique-slug warning is real and bit nothing this time only because
  every new test generates `org-{uuid4().hex[:10]}` per call (`_set_slug` in
  `test_public_read.py`). Both gated runs against the *same* database passed.
- New gated baselines: **123 passed** with Postgres (was 119), **83 passed / 40
  skipped** without (was 83/36).

## Doc impact

_Running list; the `P25.REVIEW` slice consolidates these into doc versions on a pass._

- (expected) `docs/current/api.md` — new slug resolver route, `PATCH /app/tenant`, the
  additive `canonical_path` / tenant `slug` fields, and the changed 201 save `url`.
- (expected) `docs/current/data.md` + `architecture.md` — `tenants.slug` as the durable
  public org identity, and why the pretty URL is built only from durable parts.
- (expected) `docs/current/frontend.md` / `experience.md` — the `/@{org}/…` public route
  shape, the legacy redirects, and the share affordances.
- (expected) `docs/current/decisions.md` — D1–D4 above.

Implementation slices append the **actual** notes here as they land; the expectations
above are hints, not a substitute.

**Actual (P25.S1):**

- `docs/current/api.md` — new `PATCH /app/tenant` (session-guarded, body
  `{"slug"}` → 200 tenant / 422 malformed-or-reserved with the constraint cited /
  409 already taken), and the additive nullable `slug` key on the canonical tenant
  shape, which appears on `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`
  and `GET /app/tenant` at once.
- `docs/current/data.md` — `tenants.slug` (`Text NULL UNIQUE`, alembic
  `0005_tenant_slug` ← `0004_project_visibility`): the durable public org identity,
  added with **no backfill** and **no DB `CHECK`** (charset/length/reserved-word
  validation is app-layer in `server/accounts/slugs.py`, per the `0004` precedent);
  NULL means "no pretty URL yet", and Postgres's distinct-NULLs rule lets any number
  of tenants stay slug-less.
- `docs/current/backend.md` — the accounts layer gained `server/accounts/slugs.py`
  (the single source of the org-slug rules), `get_tenant_by_slug` /
  `set_tenant_slug` on the repository + service, and `DuplicateOrgSlugError`
  (`UNIQUE` → 409, never a 500). `get_tenant_by_slug` returns `None` for a malformed
  slug instead of raising, so the anonymous surface's 404-never-403 rule holds
  without caller-side special-casing.
- `docs/current/architecture.md` — why the public identity lives in the Postgres
  accounts plane and not the disposable SQLite content plane: a shared link must
  survive a full reindex, and `documents.id` does not.
- `docs/current/qa.md` — the gated suite is now **119 passed** with Postgres (83
  passed / 36 skipped without); the recipe for standing one up, and the rule that a
  test claiming an org slug must generate it per run because `tenants.slug` is
  globally unique.

**Actual (P25.S2):**

- `docs/current/api.md` — (a) the new read route `GET /app/orgs/{org}/{project}/{slug}`:
  optional-identity, **bare** org slug (no `@`), exact project match, newest doc under
  the slug, member fast-path then the public-visibility gate, and **one constant 404
  detail for every miss** (unknown/malformed/reserved org, unknown project, unknown doc
  slug, private project, legacy mode) so nonexistent and forbidden stay
  indistinguishable; the response is the normal detail projection, so `id` is present
  and `/versions*` + `/raw` remain id-keyed. (b) the additive nullable
  **`canonical_path`** (`/@{org}/{project}/{slug}`) on the **detail** reads only — `GET
  /app/documents/{id}` and the resolver — explicitly **not** on `GET /app/documents`
  list rows, and `null` whenever the owner tenant has no slug or the deployment is in
  legacy mode. (c) the changed `POST /api/documents` 201 `url`: pretty
  (`{origin}/@{slug}/{project}/{doc-slug}`) once the writing tenant has an org slug,
  `{origin}/documents/{id}` when it has none, and the legacy mkdocs shape unchanged in
  single-tenant mode — pretty regardless of the project's visibility, and built from the
  **version target's** project/slug on a `new_version` bump so the URL never moves
  across a version chain.
- `docs/current/backend.md` — the P19 public-read gate is now the named predicate
  `_is_publicly_readable(doc)` in `server/documents_api.py` (legacy-mode guard →
  registry-less-owner guard → owner project's `visibility == "public"`), shared by
  `_resolve_readable_doc` and the slug resolver so there is one trust boundary rather
  than two kept in sync. `canonical_path` is injected at the two detail call sites and
  never inside the shared `_app_doc` projector (which the list route also uses), and
  `_document_canonical_path` reads the owner slug off `AuthContext.tenant` on the member
  path — keeping a member's detail read Postgres-free, while the anonymous path pays one
  `get_tenant` lookup on top of the visibility gate. `server/main.py::resolve_org_slug`
  is a new async FastAPI dependency following the `ensure_registry_project` precedent:
  it feeds Postgres-resolved state into the **sync** `create_document` handler, which
  holds `WRITE_LOCK` and cannot await.
- `docs/current/frontend.md` — `KbDocument` (the detail shape) gained
  `canonical_path: string | null`; `KbDocumentListItem` deliberately did not. The pretty
  URL is assembled **once, in the backend** — the web plane consumes `canonical_path` and
  never re-derives it in TypeScript, and falls back to `/documents/{id}` when it is null.
- `docs/current/qa.md` — gated baseline moves to **123 passed** with Postgres (**83
  passed / 40 skipped** without). Also: the public-read suite's `documents_client`
  fixture isolates `KB_DB_PATH` but **not `KB_ROOT`**, so write-path tests must use a
  `KB_ROOT`-isolating fixture (`org_client`) or they write into the repo's real `docs/`
  tree.

## Constraints

- **Backend before web.** S1 → S2 → (S3, S4) → S5. No web slice may invent the pretty
  URL locally instead of consuming `canonical_path` / the tenant `slug`.
- **404-never-403 everywhere on the anonymous surface**, including unknown org slugs.
  Private and nonexistent must stay indistinguishable.
- **Nothing durable may key off `documents.id`.** It is a disposable SQLite rowid; the
  pretty URL must be derivable from `(tenant slug, project, doc slug)` alone.
- **No link may break.** `/documents/{id}` and `/graph/{uuid}` keep resolving forever;
  redirecting is allowed, 404ing is not. A slug-less tenant must see today's behavior
  exactly.
- **Org slug charset:** `^[a-z0-9]+(-[a-z0-9]+)*$`, 2–40 chars, stored lowercase,
  `UNIQUE`. **Reserved words** (rejected with a 422, app-layer, in one shared constant):
  `api`, `app`, `auth`, `admin`, `login`, `logout`, `signup`, `dashboard`, `documents`,
  `document`, `graph`, `projects`, `project`, `search`, `settings`, `account`,
  `healthz`, `mcp`, `static`, `assets`, `public`, `www`, `robots`, `sitemap`,
  `manifest`, `favicon`, `_next`, `new`, `edit`, `null`, `undefined`, `me`, `docs`,
  `help`, `support`, `status`, `about`, `blog`. Keep the list in one place and cite it
  from the API error message.
- **Migration hygiene:** one alembic revision (`0005_tenant_slug`, down_revision
  `0004_project_visibility`), pure additive, no backfill, no DB `CHECK` (validation is
  app-layer per the `0004` precedent), and a `downgrade` that drops the column.
- **Do not touch** `web/src/app/robots.ts`, `sitemap.ts`, the `next.config.ts` raw-HTML
  header exemptions, or `deploy/knowledge.conf`'s `/api/documents/[0-9]+/raw` regex.
- **Out of scope** (from `intent.md`): per-document visibility, secret share-link
  tokens, sitemap/SEO expansion. Also out of scope: project *slugs* (project names are
  already URL-safe), org landing (`/@{org}`) and project index (`/@{org}/{project}`)
  pages, and slug-change history.
- **Tests stay small** per the workspace contract: extend
  `tests/test_public_read.py` / `tests/test_documents_api.py` with a handful of
  high-value cases (resolve happy path, private ⇒ 404, unknown org slug ⇒ 404, reserved
  slug ⇒ 422, duplicate slug ⇒ 409). No new fixture scaffolding. Note in every
  `result.md` whether the Postgres-gated suite actually ran or skipped.

## Open Questions

- **Q1 (S3, blocking that slice's first task): does a root-level `[org]` dynamic segment
  shadow any existing route in Next 16?** Expectation is no — Next orders route regexes
  static-first, so `/documents/25`, `/api/documents/25/raw`, `/api/auth/login`,
  `/graph/{uuid}`, `/dashboard`, `/login`, `/projects/{id}` should all keep winning over
  `/[org]/[project]/[slug]`. **Verify empirically** (`npm run build` route manifest plus
  a live check of `/api/documents/{id}/raw` and `/documents/{id}/versions/{v}`) before
  building the page. If it does shadow, fall back to a `next.config` rewrite or
  `middleware.ts` onto an internal prefix — the user-facing URL shape stays the same.
- **Q2 (S2): is the project segment matched case-sensitively?** Project names may
  contain uppercase (`^[A-Za-z0-9][A-Za-z0-9._-]*$`). Default answer: **exact match**,
  simplest and unambiguous. A case-insensitive lookup that canonical-redirects is a
  nicety — defer it rather than build it.
- **Q3 (operator-facing, not blocking): may an org slug be changed after it is set, and
  do old slugs need to keep redirecting?** Decided for this phase: **mutable, with no
  slug-history redirects** — changing a slug breaks previously shared links. Acceptable
  today (one operator, no slug set yet). If the operator disagrees, the fix is a
  `tenant_slug_history` table in a later phase, not a change to this phase's shape.
- **Q4 (S5): should the 201 save `url` be pretty even for a *private* project?**
  Decided yes — the resolver is optional-identity, so the pretty URL resolves for the
  author regardless of visibility, and consulting visibility on the write path would add
  a lookup for no gain. Flagged here so the review notices if it feels wrong: the URL is
  shareable only once the project is public, exactly like `/documents/{id}` today.
