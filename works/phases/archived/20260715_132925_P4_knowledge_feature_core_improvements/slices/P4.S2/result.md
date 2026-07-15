# P4.S2 result — API completeness: DELETE document, GET /api/tags, GET /api/projects

## What was built

**1. `DELETE /api/documents/{doc_id}` + `DELETE /api/documents/by-path/{rel_path:path}`** (`server/main.py`)

Both resolve the document row first (404 if absent), then call a shared
`_delete_document(conn, doc, *, commit, co_authored_by)` helper — the `POST
/api/documents` write path in reverse, run entirely under `WRITE_LOCK` and
guarded by `require_bearer`:

1. `(config.docs_root() / rel).unlink(missing_ok=True)` — a DB row without a
   file is drift, cleaned up without erroring.
2. `documents_mod.remove_from_recent_index(...)` removes the doc's Recent
   bullet from `docs/index.md` (new symmetric library function, below).
3. `db.delete_document_by_path(conn, rel)` — the `documents_ad` AFTER DELETE
   trigger cleans the FTS row; any `document_embeddings` row cascades via the
   existing `ON DELETE CASCADE` (verified live in the smoke check — no extra
   code needed).
4. Scoped commit when `commit=true` (query param, default `True`) and
   `config.git_commit_enabled()`: `gitops.add(["docs/<rel>", "docs/index.md"])`
   + `gitops.commit(f"docs({project}): remove {slug}")`, optional
   `co_authored_by` query param. A failed commit surfaces as
   `committed: false` + `commit_error`, never a rollback (matches the POST
   contract exactly).

Response shape: `{deleted, id, rel_path, title, project, slug, recent_removed,
committed, commit_sha, commit_error?}`.

The by-path route is declared before the `{doc_id}` route in source, same
collision-avoidance convention as the existing GET pair.

**2. Recent-bullet removal** (`server/documents.py`)

- `remove_recent_bullet(index_text, rel_path) -> tuple[str, bool]` — pure,
  drops any line containing the markdown-link suffix `](<rel_path>)` (the
  exact shape `format_recent_bullet` emits), so it cleans up a bullet however
  it was inserted (marker/heading/appended). Returns `(text, False)` unchanged
  when nothing matched.
- `remove_from_recent_index(docs_root, rel_path) -> bool` — I/O wrapper;
  `False` when the index is missing or nothing matched (no write in that
  case), symmetric to `update_recent_index`'s no-op case.

**3. Aggregations** (`server/db.py` + `server/main.py`)

- `db.list_tags(conn, project=None)` — `SELECT je.value AS tag, COUNT(*) AS
  count FROM documents JOIN json_each(documents.tags) je [WHERE
  project=?] GROUP BY je.value ORDER BY count DESC, tag ASC`.
- `db.list_projects(conn)` — `SELECT project, COUNT(*) AS count, MAX(date) AS
  latest_date FROM documents GROUP BY project ORDER BY project ASC`.
- Open (unauthenticated) `GET /api/tags` (optional `project` filter) →
  `{"tags": [{tag, count}, ...]}` and `GET /api/projects` →
  `{"projects": [{project, count, latest_date}, ...]}`, placed with the other
  open read endpoints (no `require_bearer`).

## Deviations from plan.md

None. Implemented exactly as specified — same shared-routine structure as
`POST /api/documents`, same route-ordering rule, same commit-failure
contract, same aggregation SQL and response shapes.

## Verification

**Full suite** (repo convention per `docs/current/operations.md` is `uv run
pytest -q`; a bare `python3 -m pytest -q` fails in this environment because
pytest lives only in the project's `.venv`, not the system `python3`):

```
$ uv run pytest -q
..................................                                       [100%]
34 passed, 1 warning in 1.06s
```

(also cross-checked with `.venv/bin/python -m pytest -q` — identical result;
the 1 warning is the pre-existing `httpx`/`starlette.testclient` deprecation
notice, unrelated to this slice.)

New tests added (5): `tests/test_api_write.py::test_delete_happy_path`,
`::test_delete_404`, `::test_delete_requires_bearer`;
`tests/test_api_read.py::test_list_tags_and_projects` (covers both `/api/tags`
— unscoped + `project`-scoped — and `/api/projects`, checking full ordering).

**Smoke check** (temp KB root outside the repo, real git init, via
`fastapi.testclient.TestClient` against a `KB_ROOT`/`KB_DB_PATH`-scoped app,
mirroring the test fixtures):

1. `POST /api/documents` → 201, file + Recent bullet + DB row + commit
   `docs(smoke): add smoke-delete-test`.
2. `GET /api/documents/{id}` → 200.
3. `DELETE /api/documents/{id}` → 200,
   `{"deleted": true, "recent_removed": true, "committed": true, "commit_sha": "..."}`.
4. `GET /api/documents/{id}` → 404; `GET /api/documents/by-path/<rel>` → 404.
5. File is gone from disk (git even pruned the now-empty `docs/smoke/` dir on
   commit); `docs/index.md` is back to its pre-create text (bullet cleanly
   removed).
6. `git log --oneline`: `docs(smoke): remove smoke-delete-test` on top of the
   add commit — a clean, scoped two-path commit each time.
7. `GET /api/tags` → `{"tags": []}`, `GET /api/projects` → `{"projects": []}`
   after the only doc was deleted — aggregations reflect the empty state
   correctly.

All matches expected behavior; no code changes were needed after the smoke
run.

## Files changed

- `server/main.py` — `GET /api/tags`, `GET /api/projects`, shared
  `_delete_document` helper, `DELETE /api/documents/by-path/{rel_path:path}`,
  `DELETE /api/documents/{doc_id}`.
- `server/documents.py` — `remove_recent_bullet`, `remove_from_recent_index`.
- `server/db.py` — `list_tags`, `list_projects`; doc-comment tweak on
  `delete_document_by_path` noting the embedding FK cascade.
- `tests/test_api_write.py` — 3 new delete tests.
- `tests/test_api_read.py` — 1 new tags/projects test.

No commits made and no workflow status transitions run — that is the
orchestrator's job.
