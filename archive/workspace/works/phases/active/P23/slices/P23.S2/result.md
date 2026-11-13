# Result — P23.S2 (server: version history read API, `/api` + `/app` planes)

Five additive read routes landed, no write path touched, no schema change (S1's
`document_versions` + `db.list_document_versions` / `db.get_document_version` were
enough, exactly as the plan predicted). Mirrors and tests updated in the same slice.

## What landed

### `/api` plane — `server/main.py`

Two routes, declared **before** the bare `GET /api/documents/by-path/{rel_path:path}`
on purpose: the `:path` converter is greedy, so a later declaration would have
matched `/…/x.md/versions` as `rel_path="…/x.md/versions"` (Starlette matches in
declaration order). Both use `Depends(resolve_api_read)` + `_tenant_filter(ctx)`
like their by-path neighbor, and neither sets `request.state.usage` (F4 — reads
stay unmetered; no new event type).

* `GET /api/documents/by-path/{rel_path}/versions`
  → `200 {rel_path, current_version, total, versions[]}`, `versions` newest-first
  (`version DESC`), each row `{rel_path, version, archive_path, title, date, tags[],
  format, created_at}` — **no bodies** in the index.
  → `404` when the current document is missing/another tenant's.
* `GET /api/documents/by-path/{rel_path}/versions/{version}`
  → `200` the same row **plus `markdown`**, plus **`raw_html` when
  `format == "html"`**.
  → `404` for an unknown document *or* version — including the **current** version,
  which is the document itself (`GET /api/documents/by-path/{rel_path}`), never an
  archived row.

New projector `_public_version(row, *, include_body)` drops `id` (an internal
autoincrement on a table reindex rebuilds — nothing may key off it) and `tenant_id`.

### `/app` plane — `server/documents_api.py`

Three routes, all `Depends(optional_user)` → `_resolve_readable_doc` (member
fast-path → public-project fallback; every miss an indistinguishable 404, never a
403 — F5), all unmetered (F4). Each resolves the document **first**, then reads the
archive by that document's `rel_path` scoped to the **owning** document's
`tenant_id` (helper `_archive_tenant`) — `document_versions` is identity-keyed by
`(tenant_id, rel_path, version)`, so an id-keyed route must go through the row, and
scoping to the owner (not the caller, who may be anonymous) is what lets a public
document's history be read without ever crossing tenants.

* `GET /app/documents/{doc_id}/versions` → the same `{rel_path, current_version,
  total, versions[]}` envelope as `/api`; rows drop `id`/`tenant_id`/`raw_html`/
  `markdown`.
* `GET /app/documents/{doc_id}/versions/{version}` → the row **with `markdown`**,
  never `raw_html` (the /app plane's pinned rule: raw bytes leave only via `/raw`).
* `GET /app/documents/{doc_id}/versions/{version}/raw` → the archived HTML body as
  `text/html; charset=utf-8` with the four sandbox headers repeated **verbatim** from
  `GET /app/documents/{doc_id}/raw` (`Content-Security-Policy: sandbox allow-scripts;
  frame-ancestors 'self'`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options:
  nosniff`, `Cache-Control: no-store`); missing doc / missing version / non-html
  version / empty `raw_html` all answer the same 404.

An unversioned document answers `current_version: 1, total: 0, versions: []` — never
a 404 — so S3 can render "no history" from one call.

### Mirrors + tests

* Mirrored byte-exact into `plugin/templates/kb/` (F2): `server/main.py`,
  `server/documents_api.py`, `tests/test_api_write.py`, `tests/test_documents_api.py`,
  `tests/test_public_read.py`, `tests/test_html_documents.py`.
* `tests/test_api_write.py` — `test_version_history_reads` (list shape + light rows +
  fetch-with-body + the three 404s, incl. proving the greedy `:path` never swallows
  the `/versions` suffix) and `test_version_history_empty_for_unversioned_doc`.
* `tests/test_html_documents.py` — two assertions appended to the existing
  `test_html_new_version_keeps_comment_frontmatter_flavor`: the `/api` version fetch
  carries the archived `raw_html`, the index does not.
* `tests/test_documents_api.py` — new `_seed_version` helper (+ `version=` on
  `_seed_doc`) and `test_document_version_history` (member: list, fetch, the current
  version is not addressable, unknown doc, another tenant's doc, empty history).
* `tests/test_public_read.py` — `test_anonymous_reads_public_version_history`
  (anonymous list/fetch on a public project, the archived-HTML raw route with all four
  sandbox headers, private-doc and unknown-version 404s).

## Validation

| command | outcome |
| --- | --- |
| `.venv/bin/python -m pytest` (no DSN) | **81 passed, 32 skipped** (the accounts-plane suites skip without Postgres) |
| `KB_TEST_DATABASE_URL=… .venv/bin/python -m pytest` | **113 passed, 0 failed** — every gated suite actually exercised |
| `python3 scripts/plugin_parity.py` | **PASS** |
| `python3 scripts/workflow.py validate` | **Workflow validation passed** |

The `/app` routes are only reachable with a Postgres accounts plane, so a plain
`pytest` would have *skipped* every new `/app` test. To validate them for real I
started a disposable local cluster (recipe recorded in `phase.md` for `P23.REVIEW`):
`initdb -D <tmp>/pgdata -U kb --auth=trust`, `pg_ctl -D <tmp>/pgdata -o "-p 55432 -k
/tmp" start`, `createdb -h /tmp -p 55432 -U kb -w kbtest`, then
`KB_TEST_DATABASE_URL="postgresql://kb@/kbtest?host=/tmp&port=55432"`. **The
unix-socket form matters** — a `127.0.0.1` DSN fails `fe_sendauth: no password
supplied` in this sandbox despite `trust` in `pg_hba.conf`. The cluster was stopped
again afterwards; nothing outside the scratchpad was touched.

## Deviations from `plan.md`

1. **A pre-existing test failure, fixed.** Running the gated suite surfaced
   `test_documents_list_detail_and_project_bridge` failing on `set(item) ==
   _LIST_KEYS`: the set never gained `format` (html-explainer phase) or `version`
   (P23.S1), and **no CI workflow runs pytest at all**, so the drift was invisible.
   Fixed the constant (+ a comment saying it must track the documents table). It is a
   one-line assertion fix in a file this slice already edits; without it the phase's
   own validation could not go green.
2. **Test placement.** The plan named `test_api_write.py` + `test_documents_api.py`.
   The anonymous/public and archived-HTML-raw cases went to `tests/test_public_read.py`
   and `tests/test_html_documents.py` instead — both already own the exact fixtures
   (`_set_public`, the `_SANDBOX` header dict, the html payload), so this stayed terse
   rather than duplicating scaffolding into `test_documents_api.py`.
3. **`raw_html` on `/api`, deliberately.** The plan asked for it and it is worth
   flagging for the review: the document surface pins "`raw_html` never leaves /api
   JSON", and this is the one place it does. Rationale, recorded in the code comment: a
   superseded explainer body is otherwise unreadable by an agent — `.versions/` is never
   served by mkdocs and no other route exposes it — while the *current* raw HTML is
   still reachable only through the sandboxed `/app` route. The `/app` plane keeps the
   pinned rule intact (its version JSON never carries `raw_html`).

Out of scope and untouched, as planned: web UI (S3), the skill (S4), the write path,
metering, the CLI.
