# Plan — P25.F1: canonical_path round-trip guard — emit only when the slug resolves back to the same row

## Why (Review Finding 1, BLOCKING — read `works/phases/active/P25/slices/P25.REVIEW/result.md` § 2 first)

`canonical_path` is dateless ("newest under this title", D2). The anonymous `/documents/{id}` branch redirects to it (S3), and the id-page copy-link hands it out (S5). When two rows share `(project, slug)` — reachable by publishing the same slug on a different date without `new_version: true` — an **old id-link now redirects to a different, newer document**, violating "No link may break". Empirically confirmed in the review (ids 13/14 transcript in its result.md).

## The fix (backend-only; the review already scoped it)

1. **`server/documents_api.py::_document_canonical_path`** (the helper S2 added): before emitting, round-trip — `db.find_latest_document_by_slug(conn, doc["project"], doc["slug"], tenant_id=<owner tenant id>)` and emit the path **only when the resolved row's `id` equals `doc["id"]`**; otherwise return `None`. A `None` needs zero web changes: the S3 redirect and all three S5 copy-link surfaces already fall back to the id URL — exactly the slug-less contract. Keep the member path's cost profile in mind: the round-trip is a SQLite read (content plane, cheap, same connection), NOT a Postgres call — the Postgres-free member-path property is untouched.
2. **`server/main.py` 201 save URL** (the `resolve_org_slug`-fed branch): same guard — after a write, emit the pretty URL only if the just-written doc is what the slug resolves to (for a backdated publish it is not; fall back to `{origin}/documents/{doc_id}`). The write handler is sync and already holds the SQLite connection — the round-trip read is available there; do NOT add any accounts-plane work.
3. **The resolver route (`GET /app/orgs/...`) is correct as-is** — it IS newest-wins by definition; its own `canonical_path` stays always-set. Don't touch it.
4. **One gated test** (in `tests/test_public_read.py`, reusing `_seed` with two dates for one `(project, slug)` — uuid-unique slugs): older row's detail read has `canonical_path: null`, newest row's is set, resolver returns the newest id. If a 201-path assertion is cheap to add beside the existing one in `tests/test_org_credentials.py`, add the backdated case there too; otherwise the detail-read test suffices.
5. **Plugin parity**: mirror the changed `server/**` and `tests/**` files into `plugin/templates/kb/`; `scripts/plugin_parity.py` must pass.
6. **Doc impact**: append the round-trip rule to `phase.md` § Doc impact (api.md: canonical_path is emitted only when it round-trips to the same row; experience.md: old id-links never silently change target; qa.md: new gated baseline count).

## Validation

- Gated pytest (disposable Postgres, S1's recipe; current baseline 124 passed) run twice; ungated run (83 passed / 41 skipped baseline). **State run-vs-skip.**
- `scripts/plugin_parity.py` → PASS. `python3 scripts/workflow.py validate`.
- No web changes expected; if none are made, say so (no web gate needed beyond what CI covers).
