# P4.S2 — API completeness: DELETE document, GET /api/tags, GET /api/projects

Operator-approved plan (2026-07-08). Executor: `slice-executor-mid`.

## Context

Per the P4 DECOMP audit (`phase.md`): there is no HTTP delete (today = hand-edit `docs/` + reindex, leaving a stale Recent bullet in `docs/index.md`), and the P5 web UI needs tag/project aggregations. `db.delete_document_by_path` exists but is unexposed (`server/db.py:219`). Read `phase.md` (Constraints section binds: docs/ canonical, single worker + `WRITE_LOCK`, scoped git add only, never push, backward-compatible API, small tests).

## What to build

### 1. `DELETE /api/documents/{doc_id}` and `DELETE /api/documents/by-path/{rel_path:path}` (server/main.py)

Mirror the GET pair; both resolve the document row (404 if absent in DB), then run one shared delete routine — the POST write path in reverse, under `WRITE_LOCK`, guarded by `require_bearer`:

1. Remove `docs/<rel_path>` (`missing_ok=True` — DB row without file is drift, still clean up).
2. Remove the doc's Recent bullet from `docs/index.md` (new library function, below).
3. `db.delete_document_by_path` — FTS trigger + embedding FK cascade do the rest.
4. Scoped commit when `commit=true` (query param, default true) and `config.git_commit_enabled()`: `gitops.add(["docs/<rel>", "docs/index.md"])` (git add stages deletions of tracked paths) + `gitops.commit(f"docs({project}): remove {slug}")`, optional `co_authored_by` query param. Failed commit → `committed: false` + `commit_error`, never a rollback (same contract as POST).

Response: `{deleted: true, id, rel_path, title, project, slug, recent_removed, committed, commit_sha, commit_error?}`.

By-path route must be declared before the `{doc_id}` route (same collision rule as the GETs, `server/main.py:94`).

### 2. Recent-bullet removal (server/documents.py)

Symmetric to insertion: pure `remove_recent_bullet(index_text, rel_path) -> tuple[str, bool]` dropping bullet lines containing `]({rel_path})`, plus I/O wrapper `remove_from_recent_index(docs_root, rel_path) -> bool` (False when index missing or no bullet found).

### 3. Aggregations (server/db.py + server/main.py)

- `db.list_tags(conn, project=None)` — `SELECT je.value AS tag, COUNT(*) AS count FROM documents JOIN json_each(documents.tags) je [WHERE project=?] GROUP BY je.value ORDER BY count DESC, tag ASC`.
- `db.list_projects(conn)` — `SELECT project, COUNT(*) AS count, MAX(date) AS latest_date FROM documents GROUP BY project ORDER BY project ASC`.
- Open (unauthenticated) read endpoints, matching the existing read surface:
  - `GET /api/tags` (optional `project` filter) → `{"tags": [{tag, count}, ...]}`
  - `GET /api/projects` → `{"projects": [{project, count, latest_date}, ...]}`

### 4. Tests + hygiene (small, per Hard Rules)

- `tests/test_api_write.py`: delete happy path (file gone, Recent bullet gone, DB row gone, 404 on re-GET), delete 404, bearer required when token set.
- `tests/test_api_read.py`: tags + projects aggregation shapes and ordering.
- Full suite run must pass.

### 5. Wrap-up (executor)

Write free-form `result.md`; append to `phase.md`: one-line Doc-impact notes (`api.md`: DELETE + /api/tags + /api/projects; `backend.md`: delete write path + aggregations; `decisions.md` only if a real decision emerges) and any cross-slice notes (e.g. for P5's UI consumption). No commits, no status transitions.

## Verification

Run the test suite (`python3 -m pytest -q`) and a smoke check against a temp KB root (create → delete → verify file/index/DB/404). Do NOT commit — the orchestrator commits.
