# Result — P2.S1 (scaffold, conventions library, DB + reindex — no HTTP)

**Status:** done. All five verification steps pass. No HTTP in this slice.

## What was built

- **`pyproject.toml`** (+ **`uv.lock`** via `uv sync`) — project `kb-api`, `requires-python = ">=3.12"`, deps `fastapi`/`uvicorn`/`pyyaml`, dev group `pytest`/`httpx`. No `[build-system]`; `[tool.uv] package = false` makes it a **virtual project** (deps only, project never built/installed — matches the container's later `--no-emit-project`). `[tool.pytest.ini_options] pythonpath = ["."]` so `import server` resolves without installing the package.
- **`server/__init__.py`** — package docstring.
- **`server/config.py`** — env-at-call-time settings (no import caching): `KB_ROOT` (default cwd), `docs_root` = `KB_ROOT/docs`, `KB_DB_PATH` (default `KB_ROOT/data/kb.sqlite3`), `KB_PUBLIC_BASE_URL` (default `http://localhost:8765`, the viewer origin), `KB_API_TOKEN` (unset), `KB_GIT_COMMIT` (default true).
- **`server/db.py`** — `connect()` (WAL + `sqlite3.Row` + idempotent DDL, creates parent dirs), the DDL from the approved sketch verbatim (`documents` with GLOB date CHECK, `UNIQUE(rel_path)`, `UNIQUE(project,date,slug)`) + external-content FTS5 `documents_fts(title, tags_text, markdown, content='documents', content_rowid='id', tokenize='porter unicode61')` + the AFTER INSERT/DELETE/UPDATE trigger trio (delete uses the external-content `'delete'` protocol). Ops: `upsert_document` (ON CONFLICT(rel_path), preserves `created_at`, refreshes `updated_at`), `get_document`, `get_document_by_path`, `list_documents` (newest-first `date DESC, id DESC`; tag via `json_each`), `count_documents`, `delete_document_by_path`. Reads JSON-decode `tags` to a list. `sqlite-vec` extension point marked in a comment (no embeddings now).
- **`server/documents.py`** — conventions library: `slugify` (lowercase-kebab, non-alnum runs → single `-`, trim/collapse, cap 80, `"untitled"` fallback), validators `validate_project`/`validate_tags` (2–5, tag charset)/`validate_slug`/`validate_date` (`YYYY-MM-DD` format regex + `datetime.date.fromisoformat` — rejects `2026-13-45` and `20260702`), `rel_path`, hand-rolled **byte-exact** `serialize_frontmatter` (title via `json.dumps(ensure_ascii=False)`, bare date, `  - ` tag list, `source:` map), `parse_frontmatter` (`yaml.safe_load` header only, typed `FrontmatterError`), and `insert_recent_bullet` — pure function with the marker → `## Recent` heading → append-section fallback ladder, returning `(new_text, mechanism)`. `ConventionError` base, `FrontmatterError` subclass.
- **`server/reindex.py`** — `reindex(conn=None, docs_root=None) -> {indexed, removed, skipped, duration_ms}` + `python -m server.reindex` CLI (one key per line). Walks only `docs/<subdir>/**/*.md`; `RESERVED_DIRS = {"current", "versions"}` excluded entirely; top-level files never walked; malformed walked files → `skipped:[{rel_path, reason}]`. Body stored without frontmatter (leading newlines stripped); `tags_text` space-joined; removal keyed on file presence. Never runs git.
- **`tests/test_documents.py`**, **`tests/test_reindex.py`** — terse; 14 cases total.
- **`.gitignore`** — appended `data/`, `__pycache__/`, `*.py[co]`, `.venv/`.

## Validation

Commands a reviewer should run (from repo root):

1. `uv sync && uv run pytest -q` → **14 passed**.
2. `uv run python -m server.reindex` → `indexed: 1`, `removed: 0`, `skipped: 0`, `duration_ms: ~5` (hi2vi_web explainer is the only doc; `current/` + `versions/` silently excluded).
3. `sqlite3 data/kb.sqlite3 "SELECT title FROM documents_fts WHERE documents_fts MATCH 'nginx';"` → `The Shared nginx Problem — Explained for Beginners`.
4. `git status --short` → **nothing changed under `docs/`**; `data/` and `.venv/` do not appear (`git check-ignore` confirms `data/kb.sqlite3`, `.venv`, `server/__pycache__` all ignored).
5. `python3 scripts/workflow.py validate` → `Workflow validation passed.`

## Decisions

- **Reserved-dirs mechanism (the `docs/` internals question from phase.md):** hybrid — the walk only descends into `docs/<subdir>/` (so top-level `index.md`/`tags.md`/`README.md`/`index.json` never enter it), `RESERVED_DIRS = {"current","versions"}` excludes those subtrees silently, and malformed *walked* files go to `skipped[]` with a reason. Result: `indexed` counts only real explainers, `skipped[]` stays signal.
- **Removal semantics:** a DB row is removed when its `rel_path` is absent from disk under a non-reserved subdir (drift repair) — deleting a doc → `removed: 1`; a present-but-malformed file keeps its (stale) row rather than being removed.
- **Virtual project + pytest pythonpath** so `server/` runs from the repo root with no build backend (as the plan requires) yet `import server` still resolves in tests.
- **Timestamps** use local tz-aware ISO 8601 (`datetime.now().astimezone().isoformat(timespec="seconds")`).

## Deviations from Plan

None material. Two spec-consistent hardenings worth noting: (1) `validate_date` adds an explicit `^\d{4}-\d{2}-\d{2}$` format guard alongside `fromisoformat` so `20260702` is also rejected (fromisoformat alone is lenient in 3.12) — the plan asked for strict `YYYY-MM-DD`; (2) reindex wraps the upsert in a `sqlite3.Error` guard so a would-be DB failure routes to `skipped[]` rather than crashing the walk.

## Files Changed

- `pyproject.toml` (new), `uv.lock` (new, via `uv sync`)
- `server/__init__.py`, `server/config.py`, `server/db.py`, `server/documents.py`, `server/reindex.py` (new)
- `tests/test_documents.py`, `tests/test_reindex.py` (new)
- `.gitignore` (appended 4 lines)
- `works/phases/active/P2/phase.md` (Discovered consideration + Doc impact + Findings notes)
- `works/phases/active/P2/slices/P2.S1/result.md` (this file)

## Doc Versions Created

None — implementation slice. Durable-doc versions are consolidated at P2.REVIEW from the "Doc impact" one-liners appended to `phase.md` (`data`, `backend`, `operations`).

## phase.md updates

- *Discovered consideration* — recorded the landed reserved-dirs + `skipped[]` mechanism and removal semantics.
- *Doc impact* — three one-liners: `data`, `backend`, `operations`.
- *Findings & Notes* — added an "S1 landed" subsection documenting the db/documents interfaces, search prep, config, and tooling gotchas for S2/S3.
