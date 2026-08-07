# Result — P25.S4: (D19) org-slug public graph URL and legacy `/graph/{uuid}` redirect

**Status: done.** `/@{org}/graph` is the pretty public graph URL; `GET /app/graph?org=`
now accepts a tenant UUID **or** an org slug; the graph response carries the additive
nullable `canonical_path`; and the legacy `/graph/{uuid}` page 307-forwards to the pretty
URL on **both** identity branches once the org has a slug, serving exactly as today when
it has none.

## 1. Backend — `server/graph_api.py`

- **`org: UUID | None` → `org: str | None`.** Resolution is **UUID-parse-first** (a
  canonical UUID string is charset-legal as a slug, so the other order would send every
  UUID through a pointless slug lookup), falling back to
  `AccountsService.get_tenant_by_slug(org)`. That primitive normalizes internally and
  answers `None` for malformed / reserved / unclaimed, so all three collapse into the
  existing single `404 "graph not found"` — no charset re-derivation anywhere in this
  module (S1's rule) and 404-never-403 comes for free.
- **The legacy-mode guard runs BEFORE the slug lookup.** With `config.database_url()`
  unset, a non-UUID `org` is a plain 404 and the accounts service is never touched. A
  UUID `org` still never touches accounts before the existing guard either, so
  legacy-mode behavior is byte-identical to before.
- **The member fast-path compares RESOLVED UUIDs** (`ctx.tenant.id == org_id`), so a
  member addressing their own org **by slug** gets the whole-corpus member path, not the
  public subset. This was the slice's sharpest regression risk; two tests pin it (one per
  identity form).
- **`canonical_path` (`/@{slug}/graph`, else `null`) added to the response**, via a
  `_graph_canonical_path()` helper that mirrors `documents_api._canonical_path`. The
  member path reads the slug straight off `ctx.tenant` (**free — the member path stays
  Postgres-free beyond what it already did**); the public path reuses the `TenantRecord`
  the slug lookup already loaded and only pays a `get_tenant` read when the org came in as
  a UUID — one read alongside the `list_projects_for_tenant` call that path already makes.
- **Docstrings updated**: the module header now documents `truncated` + `canonical_path`
  as the two additive keys on the four-key contract, and the handler's "carries no org
  echo" sentence is gone — echoing the canonical path of the org the caller explicitly
  named leaks nothing. The UUID-or-slug rule, the parse order, and the 422→404 change are
  written into the handler docstring.

**Behavior change worth flagging:** a malformed `?org=` value used to be a FastAPI
**422**; it is now a **404**. Deliberate (the plan calls it out): on an anonymous surface
a 422 would confirm "this is not even a well-formed org identifier", and one
indistinguishable 404 is both friendlier and stricter about leaking. No existing test
asserted the 422.

## 2. Web

- **`KbGraph.canonical_path: string | null`** (`web/src/lib/knowledge/types.ts`),
  documented in the same additive-field style as `KbDocument.canonical_path`. No object
  literal constructs a `KbGraph` anywhere, so a required key is safe; `getGraph`'s
  signature is unchanged (`options.org` was already `string`) and only its JSDoc contract
  note grew the slug-acceptance paragraph.
- **New page `web/src/app/(public)/[org]/graph/page.tsx`** — clones S3's idioms exactly:
  `safeDecode` → `@`-prefix guard (before `optionalIdentity()` and before any upstream
  call) → `optionalIdentity()` → `loadGraph(ctx?.token, orgSlug)` with the ApiError-404 →
  `notFound()` mapping **outside** the component, then `<PublicShell>` + the same
  `.mainhead` block + `<GraphCanvas data={graph} />`. Static `export const metadata`
  (S3's rule: the knowledge client is `cache: "no-store"`, so `generateMetadata` would
  double the upstream fetch). The `@` is stripped — the backend selector takes the bare
  slug. A UUID is **not** accepted here; UUIDs stay on the legacy route, which forwards.
- **Co-located `not-found.tsx`** reusing the existing `GRAPH.notFound` copy (whose CTA
  already points at `/`, the anonymous-safe target) — no new content keys were needed.
- **Legacy redirect** in `(public)/graph/[org]/page.tsx`: after `loadGraph` resolves,
  `if (graph.canonical_path) redirect(graph.canonical_path)` at page top level, outside
  any `try`. 307 (not 308 — D3 leaves slugs mutable), one-way, and on **both** identity
  branches: unlike the document page this surface has no member-only affordance to
  preserve. The UUID guard, the 404 behavior and slug-less serving are untouched.

## 3. Tests

- `tests/test_public_read.py::test_public_graph_is_org_scoped` extended (reusing the
  existing per-run `_set_slug`, because `tenants.slug` is **globally** unique): the
  pre-slug anonymous read asserts `canonical_path is None`; after claiming a slug,
  `?org=<slug>` returns the same node set with `canonical_path == "/@{slug}/graph"`, the
  UUID form reports the same path, an unclaimed + a reserved (`dashboard`) + a malformed
  (`NOT A SLUG`) org are all **404** (not 422), and a member passing their **own slug**
  still sees the whole corpus (`{pub, secret}`).
- `tests/test_graph_api.py::test_member_addressing_own_org_uuid_keeps_member_path` — the
  retype guard for the UUID form: the tenant has **no** public project, so a 200 carrying
  the private doc proves the member path was taken (the public path would 404, as the
  same call anonymously does).
- No new web test scaffolding (there are no web graph tests today; "tests stay small").

## 4. Plugin parity

`server/graph_api.py`, `tests/test_public_read.py`, `tests/test_graph_api.py` mirrored to
`plugin/templates/kb/<same path>`. No new files ⇒ no `manifest.json` change. `web/` is not
a shipped dir, so the three web files mirror nothing.

## 5. Validation

| Command | Result |
|---|---|
| `KB_TEST_DATABASE_URL=… .venv/bin/python -m pytest -q` (disposable Postgres, **run #1**) | **124 passed** (S2 baseline 123 + 1 new) — the gated suite **RAN**, it did not skip |
| same, **run #2** against the *same* database | **124 passed** — globally-unique-slug hazard re-checked on a reused DB |
| `.venv/bin/python -m pytest -q` (no DSN) | **83 passed / 41 skipped** (was 83/40) — the skip path |
| `cd web && npm run lint` | passed (eslint, no output) |
| `cd web && npm run typecheck` | passed (`tsc --noEmit`) |
| `cd web && npm run build` | passed — `ƒ /[org]/graph` added, **nothing reordered** |
| `cd web && npm run test` | **14 files / 83 tests passed** (baseline held; no web tests added) |
| `npx prettier --check` on the 4 touched/added web files | clean |
| `.venv/bin/python scripts/plugin_parity.py` | **PASS** |
| `python3 scripts/workflow.py validate` | passed |

**Postgres was really available** (`docker run … -p 55439:5432 postgres:17`, per S1's
recipe — 55432 is in use on this machine): 124/83+41 is the run/skip discriminator.

**Route precedence** re-verified two ways, as S3 did:

`.next/routes-manifest.json` dynamic order (static routes are all tried first):

```
/api/documents/[id]/raw
/api/documents/[id]/versions/[v]/raw
/documents/[id]
/documents/[id]/versions/[v]
/graph/[org]                 ^/graph/([^/]+?)/?$
/projects/[projectId]
/[org]/graph                 ^/([^/]+?)/graph/?$      ← new, after /graph/[org]
/[org]/[project]/[slug]      ← still last
```

`/graph/[org]` sorts **before** `/[org]/graph`, so `/graph/{anything}` (including the
pathological `/graph/graph`) keeps hitting the legacy route; `/documents/graph` still hits
`/documents/[id]`.

Live `next start -p 3132` probe with the backend deliberately down (a non-404 upstream
error is rethrown, so a 500 means "reached the right page"):

| URL | status | reached |
|---|---|---|
| `/graph/abc` | 404 | legacy page's UUID guard |
| `/graph/{uuid}` | 500 | legacy page (not shadowed) |
| `/@hi2vi/graph` | 500 | **the new pretty page** (guard passed) |
| `/foo/graph` | 404 | **the new page's `@` guard** → branded graph not-found |
| `/documents/25` | 500 | the id page (not shadowed) |
| `/dashboard`, `/graph` | 307 | the `(app)` auth gate |
| `/@hi2vi/kb/hello` | 500 | the S3 pretty document page |

(Note for a future prober: a Next 500 body still embeds the segment's not-found flight
payload, so grepping for the branded copy only discriminates on **404s**; the status code
does the rest.)

## 6. Deviations from `plan.md`

1. **The `@` guard also rejects a bare `@`** (`org.length < 2`), matching S3's slightly
   wider guard. Same spirit, costs nothing.
2. **No new copy keys.** The plan allowed adding to `@/content` "if needed"; `GRAPH.title`
   / `eyebrow` / `sub` / `notFound` covered the page and its not-found verbatim, including
   the anonymous-safe `/` CTA, so `graph.ts` is untouched.
3. **`AttributeError` added to the `UUID(org)` except clause** alongside
   `ValueError`/`TypeError` — belt-and-braces on a value that now arrives as an arbitrary
   query string.
4. The 422→404 change for malformed `?org=` is recorded above as required (§1) — it is a
   plan decision, not a deviation.

Untouched as scoped: the member graph page's `CopyLinkButton` (S5), doc-node `url`s
(still `/documents/{id}`), `robots.ts`, `sitemap.ts`, `next.config.ts`,
`deploy/knowledge.conf`, and `plugin/templates/manifest.json`.

## 7. Notes for S5 / REVIEW

- The member `/graph` page can now read `canonical_path` **straight off its existing
  `getGraph` response** — S5's member copy-link needs no `KbTenant.slug` plumbing and no
  second call.
- A member visiting `/graph/{their-uuid}` is now redirected to `/@{slug}/graph`; the
  member-gated `(app)/graph` page (no `org` param) is a different route and is unaffected.
