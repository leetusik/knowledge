# Result — P25.REVIEW (re-review pass): phase review of "Pretty public share URLs"

**Verdict: `pass`.** Both findings from the first pass are closed — verified in the code and
by the regression tests that pin them, not by taking the fix slices' word for it. The full
consolidated validation was re-run on final HEAD against the updated baselines and is
green throughout. The phase's nine durable-doc areas were consolidated into nine new doc
versions (this phase is **not** in parallel mode, so consolidation belongs here).

This file **replaces** the first pass's `changes_requested` result; that pass's findings,
evidence and Doc-impact audit are summarized in § 2 and carried forward into § 4.

---

## 1. Consolidated validation — all green

Disposable `postgres:17` on host port 55439 (`docker run … -p 55439:5432`, per S1's recipe;
55432 is occupied on this machine), torn down afterwards. Repo `.venv` throughout (the
system `python3` has no sqlalchemy).

| # | Command | Result |
|---|---|---|
| 1 | `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb .venv/bin/python -m pytest -q` (**run 1**) | **125 passed** — matches the P25.F1 baseline; the gated suite **RAN**, it did not skip |
| 2 | same command, **run 2** against the *same* database | **125 passed** — globally-unique-slug re-runnability confirmed |
| 3 | `.venv/bin/python -m pytest -q` (no DSN) | **83 passed / 42 skipped** — clean skip path, matches baseline |
| 4 | targeted: `test_public_read.py::test_superseded_duplicate_slug_has_no_canonical_path` + `test_org_credentials.py::test_save_url_is_pretty_once_the_tenant_has_an_org_slug` | **2 passed** — the two Finding-1 guards |
| 5 | `cd web && npm run lint` | passed (eslint, no output) |
| 6 | `cd web && npm run typecheck` | passed (`tsc --noEmit`) |
| 7 | `cd web && npm run build` | passed — both new routes present, ordering unchanged (§ 1.1) |
| 8 | `cd web && npm run test` | **15 files / 85 tests passed** — matches the S5/F2 baseline |
| 9 | `.venv/bin/python scripts/plugin_parity.py` | **PASS** |
| 10 | `.venv/bin/python scripts/skills_parity.py` | **PASS** |
| 11 | `alembic upgrade head` on a **dropped-and-recreated** schema (`postgresql+psycopg://`) | `0001 → 0005` clean; `\d tenants` shows `slug text` (nullable) + `uq_tenants_slug UNIQUE` |
| 12 | `alembic downgrade 0004_project_visibility` → `\d tenants` → `upgrade head` | clean round-trip: 0 slug references after the downgrade, 2 (column + constraint) after the re-upgrade |
| 13 | live `next start` route probe on final HEAD, 11 URLs | no shadowing; identical to the first pass (§ 1.2) |
| 14 | `python3 scripts/workflow.py validate` | **Workflow validation passed** (re-run after the doc consolidation too) |

### 1.1 Route precedence — re-verified on final HEAD

Dynamic-route order read out of the built `.next/routes-manifest.json` (manifest order *is*
match order; all static routes precede every dynamic one):

```
/api/documents/[id]/raw
/api/documents/[id]/versions/[v]/raw
/documents/[id]
/documents/[id]/versions/[v]
/graph/[org]                  ^/graph/([^/]+?)(?:/)?$
/projects/[projectId]
/[org]/graph                  ^/([^/]+?)/graph(?:/)?$        ← after /graph/[org]
/[org]/[project]/[slug]       ^/([^/]+?)/([^/]+?)/([^/]+?)$  ← still LAST
```

Byte-identical to the first pass — as expected, since F1 is backend-only and F2 is a copy
string.

### 1.2 Live probe (`next start -p 3141`, backend deliberately down)

A non-404 `ApiError` is rethrown by design, so **500 = "reached the right route"**; the 404s
were discriminated by which page's branded copy rendered.

| URL | status | reached |
|---|---|---|
| `/documents/25`, `/documents/25/versions/1` | 500 | the id / past-version pages |
| `/api/documents/25/raw` | 502 | the BFF relay handler |
| `/graph/abc` | 404 | legacy page's UUID guard — *"No public graph here"* |
| `/@hi2vi/graph` | 500 | **the new pretty graph page** (guard passed) |
| `/foo/graph` | 404 | **new graph page's `@` guard** — *"No public graph here"* |
| `/@hi2vi/kb/hello` | 500 | **the new pretty document page** |
| `/foo/bar/baz` | 404 | **pretty doc page's `@` guard** — *"Document not found"* |
| `/documents/graph` | 404 | `/documents/[id]` — *"Document not found"*, not the catch-all |
| `/dashboard` | 307 | the `(app)` auth gate |
| `/login` | 200 | the login page |

### 1.3 End-to-end smoke — what I did instead

Same judgment call as the first pass, which the plan permits: no full compose stack. I stood
on (a) the 125-test gated API suite, which exercises the resolver, `canonical_path` on both
detail reads **including the round-trip guard on both the member and anonymous branches**,
the pretty and backdated 201 save URLs, the graph slug selector and every 404-never-403 case
against a real Postgres; (b) the live `next start` route probe above on final HEAD; (c) the
alembic round-trip on the same disposable Postgres. The only behavior left un-exercised
end-to-end is the two `redirect()` calls themselves, each a literal `if (x) redirect(x)` on a
value the gated suite pins.

---

## 2. Findings from the first pass — both CLOSED

### Finding 1 (BLOCKING) — an old `/documents/{id}` share link could 307 to a *different* document — **CLOSED by P25.F1**

Verified three ways, independently of `P25.F1/result.md`:

1. **The guard exists and its semantics are right.** `server/documents_api.py` splits the
   emitter into `_owner_org_slug(doc, ctx)` and `_owns_its_canonical_path(conn, doc)` — the
   latter calls `db.find_latest_document_by_slug(conn, doc["project"], doc["slug"],
   tenant_id=<owner>)` and returns `latest is not None and latest["id"] == doc["id"]`.
   `_document_canonical_path(conn, doc, ctx)` composes them **slug-first**, so a slug-less
   deployment short-circuits before the SQLite read. Tenant scoping uses the **document's
   own** `tenant_id`, which is the right owner on the anonymous/cross-org branch too.
2. **The same guard is on the 201 save URL** (`server/main.py`, step 5), scoped with
   `_tenant_filter(ctx)` to match, with `canonical or f"{origin}/documents/{doc_id}"` as the
   fallback — so a backdated publish gets the id URL.
3. **The Finding-1 transcript scenario is now a test.**
   `test_superseded_duplicate_slug_has_no_canonical_path` seeds `pub/notes` at `2026-01-01`
   and `2026-06-01`, asserts `old ⇒ canonical_path is None` and `new ⇒ the path` on **both**
   the member and the anonymous branch, and then asserts the resolver returns the *newest*
   id with that same path. That is precisely the transcript that produced the finding
   (ids 13/14 both advertising one path), inverted into a guard. It passes (§ 1, row 4);
   F1 recorded a negative control (server files stashed ⇒ both cases red, then restored),
   which I did not repeat because a review may not edit source.

The resolver route deliberately has no guard — it resolved *through* the slug, so the check
would be a tautology there. Correct, and now stated in its docstring.

**Zero web changes were needed, as predicted:** `null` is a state every consumer already
handles (the S3 anonymous redirect, S5's three copy-link surfaces, the dashboard), because
that is the slug-less contract. Superseded duplicates simply join it.

### Finding 2 (minor) — the dashboard let a claimed slug be changed with no warning — **CLOSED by P25.F2**

`web/src/content/dashboard.ts` line 171 now reads:

```
hint: "2–40 characters: lowercase letters, numbers and single hyphens. Changing an already-claimed name breaks links you've already shared.",
```

One string, one file, matching the surrounding copy's tone. It names exactly the cost Q3
accepted, at the one place in the product where the phase's "no link breaks" promise can be
broken by a person.

### Non-findings re-confirmed (unchanged from the first pass)

404-never-403 on every new anonymous surface; nothing durable keys off `documents.id`;
slug-less tenants see byte-identical pre-P25 behavior; no redirect loop; no open redirect
(both `redirect()` arguments are server-built root-relative paths over validated charsets);
the reserved list is exactly the 38 words the constraint names (`len(RESERVED_ORG_SLUGS)`
= 38, and `ORG_SLUG_CONSTRAINT` cites the rule); Q4's pretty-201-for-a-private-project is
parity with today's `/documents/{id}`; the member detail read stays Postgres-free (F1 added
no accounts-plane call — its read is content-plane only); S5's two deviations are correct
(the graph header consumes `graph.canonical_path`; the dashboard's local composition is the
one justified exception). The recorded non-finding stands: a member landing on
`/@{slug}/graph` sees their whole-corpus member view inside `PublicShell` — their own
session, their own data, no leak — so the operator cannot preview what the public sees from
the URL the dashboard tells them to share. A candidate for a later slice, not a P25 defect;
it is now written into `experience.md` as a recorded edge.

---

## 3. Judgment against intent

Every bullet of `intent.md`'s confirmed intent landed: the durable Postgres org slug (S1),
slug-addressed documents (S2/S3), the slug-addressed public graph subsuming **D19** (S4),
old links redirecting rather than breaking (S3/S4, now correct in content as well as in
status thanks to F1), and share affordances handing out the pretty URL (S5). The four
constraints that mattered most all hold:

- **No link breaks** — `/documents/{id}` and `/graph/{uuid}` still resolve on both identity
  branches, for slugged and slug-less tenants; redirects are 307 and one-way; and after F1
  the constraint covers *content identity*, not just the HTTP status.
- **404-never-403** — one constant detail across all six resolver miss paths, the graph's
  single `"graph not found"`, and both pages' `@` guards firing before any session read.
- **Nothing durable keys off `documents.id`** — the pretty path is built from
  `(tenant slug, project, doc slug)`; version links stay id-keyed by design (D2's exact-row
  addressing).
- **Slug-less tenants see today's behavior exactly** — every consumer falls back, and the
  migration is a nullable add with no backfill.

Nothing out of scope was built: no per-document visibility, no share tokens, no sitemap/SEO
change; `robots.ts`, `sitemap.ts`, the `next.config.ts` header exemptions and
`deploy/knowledge.conf` are untouched. Backend-before-web ordering was honored, plugin
template parity was maintained on every backend slice, and the migration is a pure additive
round-trippable revision. The architecture is the right one — one backend-built
`canonical_path` consumed everywhere, one extracted `_is_publicly_readable` trust boundary,
one `slugs.py` rules module — and F1 closed the one semantic gap in it without changing its
shape.

---

## 4. Doc consolidation — nine versions created

This phase carries **no `execution` block** in `phase.json`, so it is not in parallel mode
and consolidation happens here. Worked through `phase.md` § "Doc impact" (the **Actual**
blocks for S1–S5 + F1 + F2), plus the two gaps the first pass's audit flagged:
`decisions.md` (which had no Actual note — consolidated from § "Design decisions settled
here": D1–D4 plus Q2/Q3/Q4) and `product.md` (judged to owe a P25 paragraph, as P19's
visibility work reached it). One `doc-new-version` per doc, then a single `rebuild-docs`.

| Doc | New version | What it captures |
|---|---|---|
| `product` | `v0013` | Status sentence + a *Pretty public share URLs (P25)* section: claiming an org name, the two pretty address shapes, no-link-breaks (including content identity), share affordances, the slug-change cost, out-of-scope, D19 settled |
| `api` | `v0018` | Status paragraph + a full *Pretty share URLs* section: `slug` on the tenant shape, `PATCH /app/tenant` (422/409), the resolver route + its one constant 404, `canonical_path` on the detail reads only **with the round-trip rule and its invariant**, `?org=` widened (and the deliberate 422→404), the graph's `canonical_path`, the guarded pretty 201 `url` |
| `data` | `v0012` | Status paragraph, a *Tenant slug control-plane schema (P25)* section (`text NULL UNIQUE`, no backfill, no DB CHECK, **global** uniqueness, why this plane), and the `0005_tenant_slug` migration entry incl. the `postgresql+psycopg://` DSN note |
| `backend` | `v0013` | Status sentence + an *Org slug + slug-addressed public reads (P25)* section: `slugs.py`, the forgiving-then-silent `get_tenant_by_slug`, `DuplicateOrgSlugError`, the extracted `_is_publicly_readable`, the emitter split + slug-first ordering, why the resolver has no guard, `resolve_org_slug` and the safe-direction race note |
| `architecture` | `v0017` | Status sentence + a *Durable public identity: what a shared URL may be made of (P25)* section — the rule that a public URL is composed of durable parts only, why the slug lives in Postgres, composed-once-in-the-backend, trust boundary unchanged |
| `frontend` | `v0015` | Status paragraph + a *Pretty public share URLs: the `/@{org}` route namespace* section: the two routes, verified precedence + the catch-all consequence, the load-bearing `@` guard + `safeDecode`, the `resolveDocument` seam, consume-never-compose (with the dashboard exception), 307 redirects, static metadata, the Public URL panel, the 409-gets-its-own-copy rule, the prettier hazard |
| `experience` | `v0016` | Status paragraph + a *Pretty share URLs: claiming a public name (P25)* section: the always-visible prefilled panel, the mutability warning, error copy, one-way temporary forwards, branded not-found, **"no link breaks" now covers content identity**, the three copy-link surfaces, the member-previews-graph recorded edge |
| `qa` | `v0014` | Status update to the new baselines + a *Pretty share URL acceptance (P25)* section: the globally-unique-slug hazard and the run-twice rule, the gated-suite recipe, the two-DSN-forms trap, the route-precedence probe technique (500 = right route; only 404s discriminate on copy), the round-trip regression test + its negative control + the one-line reproducer, the `KB_ROOT` fixture hazard, the process-global `/auth` throttle, the `0005` validation, the no-CI-for-`web/` + prettier facts |
| `decisions` | `v0021` | Status sentence + five new ADR entries: the `/@{org}` namespace (D1), the dateless newest-wins address **and its P25.F1 round-trip amendment** (D2, written as an amended decision with the empirical finding as context), nullable/operator-set/mutable slugs with no history (D3 + Q3), redirect-vs-dual-serve at 307 (D4), and the two smaller resolutions (Q2 exact project match, Q4 pretty-201-for-private) |

`python3 scripts/workflow.py rebuild-docs` was run once at the end; `docs/current/*.md` and
`docs/index.json` are regenerated, never hand-edited. `validate` passed afterwards.

---

## 5. Verdict

**`pass`.** Both findings closed, all validation green on final HEAD, intent fully met, docs
consolidated.

`explain: not written — run /explain for this phase` (the review writes no phase explainer).

## 6. Deviations from `plan.md`

1. **The full compose end-to-end smoke was not run** — the plan makes it a judgment call and
   permits standing on the gated suite plus recorded live-probe evidence. I did that and
   added my own live route probe and alembic round-trip on final HEAD (§ 1.3).
2. **No negative control was re-run for the F1 guard.** F1 recorded one (both new cases red
   with the two server files stashed, then restored); repeating it would require editing
   source, which a review slice may not do. I verified the guard by reading the code and by
   running the two tests that pin the exact Finding-1 scenario.
3. **Nine docs were versioned, not the eight the plan's "expected" list named** — the ninth
   is `product.md`, which the plan's re-review addendum explicitly asked the consolidating
   pass to give a P25 paragraph.
4. No source code was edited on this slice; the only repo writes are `docs/versions/*`,
   the regenerated `docs/current/*` + `docs/index.json`, this `result.md`, and the
   `phase.md` notes.
