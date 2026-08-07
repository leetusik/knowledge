# Result — P25.REVIEW: phase review of "Pretty public share URLs"

**Verdict: `changes_requested`.** The phase is very nearly done and its architecture is
sound: every stated constraint holds except one, which no single slice was positioned to
see. All consolidated validation passes (nothing is red). The blocking issue is a
**cross-slice interaction** between S2's dateless `canonical_path` and S3's legacy
`/documents/{id}` redirect: when two documents share `(project, doc-slug)` at different
dates, an old shared id-link now silently serves a **different document**. Two findings
below, with proposed fix slices.

Per the review contract, validation and judgment were completed in full first, and
**no doc consolidation was performed** (`doc-new-version` is pass-only). The phase's
"Doc impact" list was audited instead — see § 5 — so the eventual consolidation has an
accurate inventory.

---

## 1. Consolidated validation — all green

Disposable `postgres:17` on host port 55439 (`docker run … -p 55439:5432`, per S1's
recipe; 55432 is occupied on this machine), torn down afterwards. Repo `.venv` throughout
(the system `python3` has no sqlalchemy).

| # | Command | Result |
|---|---|---|
| 1 | `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb .venv/bin/python -m pytest -q` (**run 1**) | **124 passed** — matches the S4 baseline; the gated suite **RAN**, it did not skip |
| 2 | same command, **run 2** against the *same* database | **124 passed** — globally-unique-slug re-runnability confirmed |
| 3 | `.venv/bin/python -m pytest -q` (no DSN) | **83 passed / 41 skipped** — clean skip path, matches baseline |
| 4 | `cd web && npm run lint` | passed (eslint, no output) |
| 5 | `cd web && npm run typecheck` | passed (`tsc --noEmit`) |
| 6 | `cd web && npm run build` | passed — both new routes present, ordering unchanged (§ 1.1) |
| 7 | `cd web && npm run test` | **15 files / 85 tests passed** — matches the S5 baseline |
| 8 | `.venv/bin/python scripts/plugin_parity.py` | **PASS** |
| 9 | `.venv/bin/python scripts/skills_parity.py` | **PASS** |
| 10 | `alembic upgrade head` on a **dropped-and-recreated** schema | 0001 → 0005 clean; `\d tenants` shows `slug text` (nullable) + `uq_tenants_slug UNIQUE` |
| 11 | `alembic downgrade 0004_project_visibility` → `\d tenants` → `upgrade head` | clean round-trip; column + constraint disappear and come back |
| 12 | `python3 scripts/workflow.py validate` | **Workflow validation passed** |
| 13 | live `next start` route probe on final HEAD, 14 URLs | no shadowing (§ 1.2) |

**Migration note for the record:** `alembic/env.py` requires the `postgresql+psycopg://`
scheme (a bare `postgresql://` picks the absent `psycopg2` driver and raises
`ModuleNotFoundError`). Not a defect — worth writing down because the *test* harness
accepts the bare form, so the two DSNs are not interchangeable.

### 1.1 Route precedence — re-verified on final HEAD

Built `routes-manifest.json` (manifest order *is* match order; all 14 static routes are
tried before any dynamic one):

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

### 1.2 Live probe (`next start -p 3137`, backend deliberately down)

A non-404 `ApiError` is rethrown by design, so **500 = "reached the right route"**; the
404s were discriminated by which page's branded copy rendered.

| URL | status | reached |
|---|---|---|
| `/documents/25`, `/documents/25/versions/1` | 500 | the id / past-version pages |
| `/api/documents/25/raw` | 502 | the BFF relay handler |
| `/graph/{uuid}` | 500 | the legacy graph page |
| `/graph/abc` | 404 | legacy page's UUID guard — *"No public graph here"* |
| `/@hi2vi/graph` | 500 | **the new pretty graph page** (guard passed) |
| `/foo/graph` | 404 | **new graph page's `@` guard** — *"No public graph here"* |
| `/@hi2vi/kb/hello` | 500 | **the new pretty document page** |
| `/foo/bar/baz` | 404 | **pretty doc page's `@` guard** — *"Document not found"* |
| `/documents/graph` | 404 | `/documents/[id]` — *"Document not found"*, not the catch-all |
| `/dashboard`, `/projects/9`, `/graph` | 307 | the `(app)` auth gate |
| `/login` | 200 | the login page |

Every row reproduces S3's and S4's recorded evidence on the *final* HEAD, so S5's
"route table byte-identical" claim holds.

### 1.3 End-to-end smoke — what I did instead

I did **not** stand up the full compose stack. Per the plan's allowance I stood on
(a) the 124-test gated API suite, which exercises the resolver, `canonical_path` on both
detail reads, the pretty 201 save URL, the graph slug selector and every 404-never-403
case against a real Postgres; (b) the live `next start` route probe above, re-run on
final HEAD; and (c) **a targeted API-level probe of my own** (§ 2, Finding 1) that
required exactly the disposable Postgres already running. The only behavior left
un-exercised end-to-end is the two `redirect()` calls themselves, each of which is a
literal `if (x) redirect(x)` on a value the gated suite already pins.

---

## 2. Findings

### Finding 1 — BLOCKING. An old `/documents/{id}` share link can now silently serve a **different document**

**Constraint violated:** *"No link may break … A slug-less tenant must see today's
behavior exactly"* (phase.md § Constraints) and intent.md's *"Old links keep working"*.
The link does not 404, so it passes the letter of "redirecting is allowed, 404ing is
not" — but it delivers different content than it did before P25, which is the failure
mode the constraint exists to prevent.

**Mechanism (a genuine cross-slice interaction — neither slice is wrong alone):**

- S2's `canonical_path` is **dateless** by D2: `/@{org}/{project}/{doc-slug}`.
- D2 accepted that the *pretty* URL means "the newest document under this title".
- S3 then made the **anonymous** `/documents/{id}` branch `redirect(doc.canonical_path)`.
- Composing the two redirects an **exact-row** address onto a **newest-wins** address.

Duplicate `(project, slug)` rows at different dates are reachable in ordinary use: a
publish **without** `new_version: true` computes a different `rel_path` (the date is part
of it), so step 2 of `create_document` finds no collision and inserts a second row.
`server/db.py::find_latest_document_by_slug`'s own docstring names this the situation
"versioning fixes" — i.e. it is the pre-existing, unguarded path, and recurring slugs
(`meeting-notes`, `weekly-update`) are natural in a knowledge base.

**Empirically confirmed** (throwaway probe against the gated harness, in the session
scratchpad — not added to the repo):

```
seed notes/meeting-notes @ 2026-01-01  -> id 13
seed notes/meeting-notes @ 2026-06-01  -> id 14

GET /app/documents/13  -> 200  canonical_path=/@org-…/notes/meeting-notes  title="… 2026-01-01"
GET /app/documents/14  -> 200  canonical_path=/@org-…/notes/meeting-notes  title="… 2026-06-01"
GET /app/orgs/org-…/notes/meeting-notes -> 200  id=14  title="… 2026-06-01"
```

Both ids advertise the **same** pretty path, and that path resolves to id 14.

**User-visible consequences (all new in P25):**

1. An anonymous visitor on the previously-shared `/documents/13` is **307**'d to
   `/@org/notes/meeting-notes` and reads document **14**. Before P25 they read 13.
2. The member copy-link on `/documents/13` (S5) copies a URL for document 14.
3. The 201 save `url` (S2) for a backdated publish points at whichever row is newest.

Not a security issue — both documents are the same tenant's and pass the same visibility
gate — but it is a correctness regression on precisely the sharing surface this phase
exists to improve.

**Proposed fix — `P25.F1`** (implementation, `risk: high`, backend + one gated test):
emit `canonical_path` only when the pretty path **round-trips to this same row**. In
`server/documents_api.py::_document_canonical_path`, after resolving the owner slug,
check `db.find_latest_document_by_slug(conn, doc["project"], doc["slug"],
tenant_id=<owner>)["id"] == doc["id"]` and answer `None` otherwise — one cheap SQLite
read on the connection already in hand. A `None` needs **no web change at all**: S3's
redirect, S5's three copy-link surfaces and the dashboard already fall back correctly,
which is exactly the slug-less contract. The resolver route (`resolve_document_by_slug`)
is unaffected — it resolved *through* the slug, so its answer is correct by construction.
Consider the same guard for `server/main.py::resolve_org_slug`'s 201 URL. Add one gated
case pinning "older duplicate ⇒ `canonical_path is null`, newest ⇒ the pretty path".

*(Alternative, if the operator prefers the durable-URL story over exactness: keep the
behavior and make it explicit in `experience.md`. I recommend the fix — a share link that
quietly changes what it shows is worse than one that stays on an id URL.)*

### Finding 2 — Minor. The dashboard lets the operator change a claimed slug with no warning that it breaks previously shared links

Q3 decided slugs are **mutable with no slug-history redirects**, explicitly accepting
that "changing a slug breaks previously shared links". S5 shipped the field
**always visible and prefilled** — correct for the claim case, but it makes an
irreversible link-breaking edit a one-keystroke action. `DASHBOARD.orgSlug.hint`
("2–40 characters: lowercase letters, numbers and single hyphens.") says nothing about
it, and the phase's headline promise to the operator is "no link breaks". This is the
one place in the product where that promise can be broken, and it is unlabelled.

**Proposed fix — `P25.F2`** (implementation, `risk: low`): extend the existing
`DASHBOARD.orgSlug.hint` string in `web/src/content/dashboard.ts` to note that changing
a claimed slug breaks links already shared under the old one. Copy-only, one file, one
line — the `mid` tier.

### Non-findings (checked, deliberately not raised)

- **404-never-403 holds on every new anonymous surface.** The resolver's six miss paths
  raise one constant `_no_such_path()` detail (asserted by a test); `?org=` collapses
  malformed/reserved/unclaimed into the pre-existing `404 "graph not found"`; both new
  pages' `@` guards `notFound()` before the session read and before any upstream call.
  S2's deviation (its own 404 string rather than the id route's `f"no document with id
  {doc_id}"`) is right — that literal cannot exist on a route that never sees an id, and
  the constraint protects indistinguishability *within* a surface.
- **Nothing durable keys off `documents.id`.** `_canonical_path` is built from
  `doc["project"]` / `doc["slug"]` plus the Postgres slug. Version links stay id-keyed by
  design (D2's exact-row addressing), and `/versions*` + `/raw` are untouched.
- **Slug-less tenants see today's behavior exactly.** Every consumer falls back:
  `canonical_path` null ⇒ no redirect on either route, id/UUID copy-links, the pre-P25
  201 URL, legacy mode never touches the accounts plane (both guards verified to run
  before any slug lookup).
- **No redirect loop.** Both pretty pages are terminal — neither ever redirects back.
- **No open redirect.** Both `redirect()` arguments are server-built root-relative paths
  over validated charsets.
- **Reserved list matches the constraint exactly** — 38 words, no additions, no
  omissions, verified by diffing `RESERVED_ORG_SLUGS` against phase.md's list.
- **Q4 (pretty 201 URL even for a private project) is fine.** It is parity with today's
  `/documents/{id}`, which is equally unshareable while the project is private.
- **The member read stays Postgres-free** (`_document_canonical_path` reads
  `ctx.tenant.slug`); only the anonymous/cross-org branch pays the second round trip S2
  flagged. Acceptable at this scale, and S2 already named the right fix if it ever bites.
- **S5's deviations are correct.** Reading `graph.canonical_path` instead of composing
  from `identity.tenant.slug` obeys phase.md's binding "build it once in the backend"
  rule; the dashboard panel's local composition is the one justified exception (that page
  loads no payload carrying a `canonical_path`).
- **A member landing on `/@{slug}/graph`** (via the both-branches legacy redirect) sees
  their whole corpus inside `PublicShell`. Not a leak — their own session, their own data
  — but it means the operator cannot preview what the public sees from that URL. Noted
  for a future slice, not raised as a finding.

---

## 3. Judgment against intent

Every bullet of `intent.md`'s confirmed intent landed: the durable Postgres org slug
(S1), slug-addressed documents (S2/S3), the slug-addressed public graph subsuming D19
(S4), old links redirecting rather than breaking (S3/S4 — subject to Finding 1), and
share affordances handing out the pretty URL (S5). Nothing out-of-scope was built: no
per-document visibility, no share tokens, no sitemap/SEO change; `robots.ts`,
`sitemap.ts`, the `next.config.ts` header exemptions and `deploy/knowledge.conf` are all
untouched. Backend-before-web ordering was honored, plugin-template parity was maintained
on every backend slice, and the migration is a pure additive round-trippable revision.

The architecture is the right one — one backend-built `canonical_path` consumed
everywhere, one extracted `_is_publicly_readable` trust boundary, one `slugs.py` rule
module. Finding 1 is a semantic gap in that architecture, not a flaw in it.

## 4. Verdict

`changes_requested` — Finding 1 blocks; Finding 2 is a one-line copy fix worth taking in
the same pass. Proposed slices:

| Slice | Name | Kind | Risk | Order |
|---|---|---|---|---|
| `P25.F1` | canonical_path only when the pretty path resolves back to the same document | implementation | high | 6 |
| `P25.F2` | dashboard slug hint: warn that changing a claimed slug breaks shared links | implementation | low | 7 |

## 5. Doc consolidation — NOT performed (pass-only), list audited

No `doc-new-version` was run and `docs/` is untouched. This phase is **not** in parallel
mode (`phase.json` carries no `execution` block), so consolidation belongs to the *next*
review pass. The "Doc impact" list was audited so that pass has a complete inventory:

- **Covered by "Actual" blocks:** `api` (S1/S2/S4), `data` (S1), `backend` (S1/S2),
  `architecture` (S1), `frontend` (S2/S3/S4/S5), `experience` (S3/S4/S5), `qa`
  (S1/S2/S3/S4/S5). Accurate against the code as landed.
- **Gap:** `decisions.md` has only the leftover "(expected)" hint — no slice appended an
  "Actual" note for it. D1–D4 are fully written up in phase.md § "Design decisions
  settled here" and must be consolidated from there; Q2/Q3/Q4's resolutions belong with
  them.
- **Judgment call for the consolidating pass:** `product.md` was not on anyone's list.
  "Shared documents have readable, durable URLs" is arguably product-visible truth
  (P19's visibility work reached `product.md`); worth a short paragraph.
- **After Finding 1 is fixed**, the `api` / `experience` notes need a sentence on the
  round-trip rule (`canonical_path` is null for a superseded duplicate slug), and `qa`
  needs the new gated baseline (125).

## 6. Deviations from `plan.md`

1. **The full compose end-to-end smoke was not run** — the plan makes it a judgment call
   and permits standing on the gated suite plus recorded live-probe evidence. I did that
   and added my own live route probe on final HEAD plus a targeted API probe (§ 1.3).
2. **A throwaway probe test was written and run** (session scratchpad only, never added
   to the repo, deleted afterwards) to confirm Finding 1 empirically rather than assert
   it from reading. The review wrote no repo source code.
3. **Step 5 (doc consolidation) was skipped entirely**, as the contract requires on a
   non-pass verdict. Audited instead (§ 5).
