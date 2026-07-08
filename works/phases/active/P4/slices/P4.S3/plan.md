# P4.S3 — Reindex robustness: incremental single-path reindex + startup drift self-heal

Operator-approved plan (2026-07-08). Executor: `slice-executor-low` — follow this plan literally; escalate on any surprise.

## Context

Per DECOMP: `reindex()` (`server/reindex.py`) is a full `docs/` walk, manual only; `_index_file` already indexes a single path, so an incremental variant is a small extension; there is no startup drift self-heal. Binding (S6 cross-slice note in `phase.md`): any reindex variant and the startup self-heal must run the content-hash-idempotent `_sync_embeddings` step, best-effort, never failing the reindex.

Scope note: the generic FTS drop/rebuild path mentioned in the S1 cross-slice note is **deliberately excluded** (no longer required by anything — the tokenizer never changed).

Read `phase.md` Constraints first (docs/ canonical, single worker, scoped git rules do not apply to you — you never commit; keep tests small).

## What to build

### 1. `reindex_path(rel_path, conn=None, docs_root=None) -> dict` (server/reindex.py)

Incremental single-path reindex mirroring `reindex()`'s conn/docs_root handling (own conn when None, close only if owned):

- **Validate** `rel_path` first; raise `ValueError` when: absolute path; any `..` part; fewer than 2 parts (must be `<project>/.../<file>.md`); top-level part in `RESERVED_DIRS`; not ending `.md`.
- File exists under `docs_root` → `_index_file(conn, root, path, rel)` → action `"indexed"` or `"skipped"` (+ `reason`).
- File missing → `db.delete_document_by_path(conn, rel_path)` → action `"removed"` if rowcount ≥ 1, else `"skipped"` with reason `"no such document"`.
- Then `_sync_embeddings(conn)` (content-hash incremental — only the changed doc embeds; delete needs nothing thanks to FK cascade).
- Return `{"rel_path", "action", "reason"?, "embeddings": {...}, "duration_ms"}`.

### 2. `POST /api/reindex` optional body (server/main.py)

`class ReindexIn(BaseModel): rel_path: Optional[str] = None` with an optional body param (`body: Optional[ReindexIn] = None`). No body or `rel_path` null → full `reindex()` exactly as today (backward compatible). With `rel_path` → `reindex_path(...)`; `ValueError` → 422. Still bearer-guarded.

### 3. Startup drift self-heal (server/config.py + server/main.py)

- `config.startup_reindex_enabled()` — env `KB_STARTUP_REINDEX`, default true, same falsy parsing as `git_commit_enabled` (`0/false/no/off` → disabled).
- FastAPI lifespan in main.py (there is none today):

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup drift self-heal: docs/ is canonical, the DB is disposable — a full
    # reindex on boot cures manual edits, fallback writes, and git resets. The
    # embedding sync inside is content-hash cached, so a clean boot is ~free.
    if config.startup_reindex_enabled():
        report = reindex_mod.reindex()
        emb = report.get("embeddings", {})
        print(
            f"[kb-api] startup reindex: indexed={report['indexed']} "
            f"removed={report['removed']} skipped={len(report['skipped'])} "
            f"embedded={emb.get('embedded', 0)}",
            flush=True,
        )
    yield

app = FastAPI(title="kb-api", version="0.1.0", lifespan=lifespan)
```

Blocking startup is fine: single worker, tiny corpus, embedding sync is cache-hit-free on a clean boot and best-effort otherwise.

### 4. CLI (server/reindex.py `_main`)

`python -m server.reindex [rel_path]` — with an argv[1], run `reindex_path` and print its report lines; without, unchanged full-walk output.

### 5. Tests (small, per Hard Rules)

- `tests/conftest.py`: add `KB_STARTUP_REINDEX=0` to the existing autouse env-guard fixture (tests never trigger the boot reindex implicitly; existing tests don't use `with TestClient`, this is belt-and-braces).
- `tests/test_reindex.py`: (a) `reindex_path` on an edited file updates just that row; (b) on a vanished file removes the row; (c) invalid rel_path → `ValueError` / API 422; (d) `POST /api/reindex` with `{"rel_path": ...}` returns the incremental report.
- One startup test: write a valid doc file on disk with no DB row, `monkeypatch.setenv("KB_STARTUP_REINDEX", "1")`, then `with TestClient(app) as client:` → `GET /api/documents` shows it (self-heal ran).
- Full suite green: `uv run pytest -q` (repo convention — bare `python3 -m pytest` has no pytest).

### 6. Wrap-up

Write free-form `result.md` in this slice folder; append to `phase.md`: Doc-impact one-liners (`operations.md`: startup self-heal + `KB_STARTUP_REINDEX` + CLI arg; `api.md`: optional `rel_path` body on POST /api/reindex; `backend.md`: `reindex_path`) and a "From S3" cross-slice note if anything matters for S4/S5/P5. No commits, no status transitions.

## Verification

Full test suite (`uv run pytest -q`) + a live smoke (temp KB root: edit a file → `reindex_path` picks it up; delete file → row removed; boot app with `with TestClient` → drift healed). Do NOT commit — the orchestrator commits.
