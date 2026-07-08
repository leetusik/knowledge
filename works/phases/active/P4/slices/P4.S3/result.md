# P4.S3 Result — Reindex robustness: incremental single-path reindex + startup drift self-heal

Executor: `slice-executor-low`. Executed literally per plan.md specifications.

## Implementation Summary

### 1. `reindex_path(rel_path, conn=None, docs_root=None) -> dict` (server/reindex.py)

Incremental single-path reindex function:
- Validates `rel_path` (raises ValueError on: absolute paths, `..` parts, <2 parts, reserved top dirs, non-.md extension)
- File exists → indexes via `_index_file()`, returns action "indexed" or "skipped" with reason
- File missing → deletes from DB via `db.delete_document_by_path()`, returns "removed" if rowcount ≥ 1, else "skipped" with reason "no such document"
- Runs `_sync_embeddings(conn)` after (content-hash cached, best-effort, never fails)
- Returns `{rel_path, action, reason?, embeddings:{...}, duration_ms}`

### 2. `POST /api/reindex` optional body (server/main.py)

- Added `ReindexIn(BaseModel)` with `rel_path: Optional[str] = None`
- Optional `body` parameter, defaults None
- No body or `rel_path` null → full `reindex()` unchanged (backward compatible)
- With `rel_path` → calls `reindex_path(rel_path)`, catches ValueError → 422

### 3. Startup drift self-heal (server/config.py + server/main.py)

- Added `config.startup_reindex_enabled()` reading `KB_STARTUP_REINDEX` env (default true, falsy parsing: "0"/"false"/"no"/"off")
- Added FastAPI `lifespan` context manager:
  - Runs at startup if enabled
  - Calls `reindex_mod.reindex()` (full walk)
  - Prints exact format: `[kb-api] startup reindex: indexed=... removed=... skipped=... embedded=...`

### 4. CLI (server/reindex.py `_main()`)

- `python -m server.reindex` (no args) → full walk, unchanged output
- `python -m server.reindex <rel_path>` → single-path, prints `rel_path:` / `action:` / optional `reason:` / `embeddings:` / `duration_ms:`
- ValueError → exit 1 + stderr message

### 5. Tests

- **conftest.py:** Added `KB_STARTUP_REINDEX=0` to autouse env guard
- **test_reindex_path_edits_file:** Edits file, `reindex_path` updates row
- **test_reindex_path_removes_file:** Deletes file, `reindex_path` removes DB row
- **test_reindex_path_vanished_no_row:** Vanished file with no DB row → "skipped" / "no such document"
- **test_reindex_path_invalid_rel_paths:** All validation errors (absolute, `..`, <2 parts, reserved, non-.md)
- **test_reindex_path_api_endpoint:** `POST /api/reindex {"rel_path": "..."}` returns incremental report
- **test_reindex_path_api_invalid:** Invalid rel_path → 422
- **test_startup_reindex_self_heal:** Doc on disk, no DB row, `KB_STARTUP_REINDEX=1`, `with TestClient(app)` → startup runs reindex, `GET /api/documents` shows doc

## Validation

**Full test suite:** `uv run pytest -q` → 41 passed
```
.........................................                                [100%]
41 passed, 1 warning in 1.12s
```

**Live smoke tests:**
1. Full reindex CLI: `uv run python -m server.reindex` outputs indexed/removed/skipped + embeddings
2. Single-path CLI: `KB_ROOT=<temp> uv run python -m server.reindex proj/2026-07-02-test.md` → indexed successfully
3. CLI error: `python -m server.reindex /absolute/path.md` → exit 1, stderr error
4. API incremental: `POST /api/reindex {"rel_path": "..."}` returns report (verified in test suite)
5. Startup self-heal: `KB_STARTUP_REINDEX=1 with TestClient(app)` heals drift (verified in test)

## Files Changed

- `server/reindex.py`: added `reindex_path()` function, updated `_main()` for CLI arg
- `server/config.py`: added `startup_reindex_enabled()`
- `server/main.py`: added `lifespan` context manager, `ReindexIn` model, updated POST /api/reindex endpoint
- `tests/conftest.py`: added `KB_STARTUP_REINDEX=0` to autouse guard
- `tests/test_reindex.py`: added 7 new tests (edited file, removed file, vanished, invalid, API endpoint, API error, startup self-heal)

## Deviations from Plan

None. Executed literally per plan.md.

## Notes for S4/S5/P5

- Single-path reindex enables future incremental indexing workflows (e.g., watch-mode)
- Embedding sync is preserved and runs on both full and incremental reindex (content-hash cache makes incremental cheap if docs unchanged)
- `KB_STARTUP_REINDEX=0` in production if drift self-heal is not desired (currently enabled by default for safety)
- Startup print goes to stdout with flush=True for reliable logging in containers
