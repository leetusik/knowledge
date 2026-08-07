# Result — P25.F1: `canonical_path` round-trip guard

**Done.** `canonical_path` (and the 201 save `url`) are now emitted only when the dateless
pretty path resolves back to the *same* row. REVIEW Finding 1 is closed: an old
`/documents/{id}` share link can no longer redirect to a different document, because the
superseded duplicate stops advertising a pretty path at all. Backend-only — **no `web/**`
file was touched**, exactly as the plan predicted, since `null` is a state every consumer
already handles.

## What changed

### 1. `server/documents_api.py` — the emitter

`_document_canonical_path` was split and given the guard:

- `_owner_org_slug(doc, ctx)` — the previous body, now answering just the owner's org slug
  (free off `AuthContext.tenant` on the member path; one `get_tenant` read otherwise;
  `None` in legacy mode / registry-less owner / unclaimed slug).
- `_owns_its_canonical_path(conn, doc)` — **new**: `db.find_latest_document_by_slug(conn,
  doc["project"], doc["slug"], tenant_id=<owner>)` and `latest["id"] == doc["id"]`. One
  SQLite read on the connection already in hand; the same primitive the resolver route
  uses, so the check *is* the resolution.
- `_document_canonical_path(conn, doc, ctx)` — composes them **slug-first on purpose**:
  a slug-less deployment (tenant #1 today) short-circuits before the SQLite read, so the
  guard costs literally nothing until a slug is claimed. The signature gained `conn`; the
  single call site (`GET /app/documents/{doc_id}`) passes the request connection.

The **resolver route was not touched** (plan item 3): it resolved *through* the slug, so
the guard would be a tautology there and its `canonical_path` stays unconditionally set.
Its docstring now says so explicitly. The member detail read remains **Postgres-free** —
the guard is content-plane only and adds no accounts-plane call anywhere.

### 2. `server/main.py` — the 201 save URL

Same guard in the `resolve_org_slug`-fed branch of `create_document` step 5: the pretty
URL is built only when `find_latest_document_by_slug(conn, project, slug,
tenant_id=_tenant_filter(ctx))` returns the row just written, otherwise
`{origin}/documents/{doc_id}`. Legacy/single-tenant mode's mkdocs URL is untouched. No
accounts-plane work was added (`resolve_org_slug` is unchanged). The read runs on the
handler's own connection after `upsert_document` committed; it is outside `WRITE_LOCK`,
and a race that inserts a newer duplicate in between can only downgrade the answer to the
id URL — the safe direction.

### 3. Tests (two, both gated)

- `tests/test_public_read.py::test_superseded_duplicate_slug_has_no_canonical_path` —
  two rows under one `(project, slug)` at `2026-01-01` / `2026-06-01`; the older's
  `canonical_path` is `null` and the newest's is the path, **on both the member and the
  anonymous branch**; the resolver then returns the newest id with that same path.
  `_seed` gained a `date=` keyword (default unchanged; `rel_path` interpolates it) — that
  is the whole harness change, no new fixture scaffolding.
- `tests/test_org_credentials.py::test_save_url_is_pretty_once_the_tenant_has_an_org_slug`
  — extended (the plan's "if cheap" option; it was) with a **backdated** publish of the
  same title/project and no `new_version`: a second, older row whose 201 `url` falls back
  to `/documents/{id}`. That suite is the one with `KB_ROOT` isolated (S2's gotcha), so
  the write-path case belongs there.

Both assertions were **proved to fail without the fix**: `git stash push -- server/
documents_api.py server/main.py`, re-run the two tests → both FAILED, then `git stash pop`
(clean). They are real regression guards.

### 4. Plugin parity

`server/documents_api.py`, `server/main.py`, `tests/test_public_read.py`,
`tests/test_org_credentials.py` mirrored into `plugin/templates/kb/<same path>`. No new
file, so `plugin/templates/manifest.json` needed no edit.

## Validation

| # | Command | Result |
|---|---|---|
| 1 | `docker run -d --rm --name kb-pg-f1 … -p 55439:5432 postgres:17` | up (55432 still occupied on this machine) |
| 2 | `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55439/kb .venv/bin/python -m pytest -q` (run 1) | **125 passed** — the gated suite **RAN**, it did not skip (was 124) |
| 3 | same, run 2 against the **same** database | **125 passed** — globally-unique-slug re-runnability holds |
| 4 | same, run 3 after the post-tidy re-mirror | **125 passed** |
| 5 | `.venv/bin/python -m pytest -q` (no DSN) | **83 passed / 42 skipped** — clean skip path (was 83/41) |
| 6 | negative control: two server files stashed, the two new cases re-run | **2 failed** — then restored, `plugin_parity` re-PASSed |
| 7 | `.venv/bin/python scripts/plugin_parity.py` | **PASS** |
| 8 | `python3 scripts/workflow.py validate` | **Workflow validation passed** |

**Postgres-gated suite: RAN** (disposable `postgres:17` on host port 55439, torn down
afterwards). Repo `.venv` throughout — the system `python3` has no sqlalchemy.

**No web gate was run and none is needed:** this slice changed no `web/**` file, adds no
route and alters no TypeScript type (`KbDocument.canonical_path` is already
`string | null`). The web behavior change is entirely "the value is sometimes null now",
which S3/S5 already handle on every surface.

## Deviations from `plan.md`

- **`_document_canonical_path` was refactored into two helpers** rather than guarded
  in-place. Reason: the guard must run *after* the slug check, or a slug-less deployment
  (today's production state) would pay an SQLite read on every detail read for an answer
  that is `None` regardless. Same behavior, ordered for cost.
- **The optional 201 assertion was taken** (plan item 4 left it to judgment) — it was six
  lines inside the existing test and it pins the write half of the same rule.
- Nothing else. No accounts-plane work, no resolver-route change, no web change.

## Doc impact

Appended to `phase.md` § Doc impact as **Actual (P25.F1)** — four notes: `api.md` (the
round-trip rule and the invariant "a non-null `canonical_path` always resolves back to the
document that advertised it", plus the backdated-201 fallback), `experience.md` (an old id
link never silently changes target), `backend.md` (the emitter split and the slug-first
ordering that keeps the guard free for slug-less tenants), `qa.md` (new gated baseline
**125 / 83+42**, and what the two new cases pin). This closes the review's "after P25.F1
lands" gap in that list; the `decisions.md` and `product.md` gaps it also flagged remain
for the consolidating review pass.
