# Plan — P2.S1 (scaffold, conventions library, DB + reindex — no HTTP)

## Situation

First implementation slice of P2. Read `works/phases/active/P2/phase.md` (the notebook — Context, Findings & Notes, Constraints) before anything else; the full spec is the operator-approved plan at `~/.claude/plans/make-up-phases-for-precious-fairy.md` (its "Phase 1" section is this slice, plus the DDL sketch + edge-case table).

S1 owns everything that touches **disk formats**, unit-tested before any server exists. No HTTP in this slice.

**Ground truth to match byte-for-byte** (verified by the orchestrator):

The real explainer `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md` starts:

```
---
title: "The Shared nginx Problem — Explained for Beginners"
date: 2026-07-02
tags:
  - docker
  - nginx
  - reverse-proxy
  - deployment
source:
  project: hi2vi_web
  repo: /Users/sugang/projects/personal/hi2vi_web
---
```

`docs/index.md` Recent bullet (directly after `<!-- explain:recent -->`):

```
- 2026-07-02 · [The Shared nginx Problem — Explained for Beginners](hi2vi_web/2026-07-02-shared-nginx-explained.md) — hi2vi_web
```

(Separators are ` · ` and ` — ` — em-dash, not hyphen.)

## Create

- **`pyproject.toml`** (+ `uv.lock` via `uv sync`): name `kb-api` (or similar), `requires-python = ">=3.12"`, dependencies `fastapi`, `uvicorn`, `pyyaml`; dev group `pytest`, `httpx`. Complete now so S2–S4 never touch it. No build-system table — `server/` runs from the repo root (Docker later installs deps only, `--no-emit-project`).
- **`server/__init__.py`**
- **`server/config.py`** — settings read from env at call time (so tests can override): `KB_ROOT` (default: cwd), docs root = `KB_ROOT/docs`, `KB_DB_PATH` (default `KB_ROOT/data/kb.sqlite3`), `KB_PUBLIC_BASE_URL` (default `http://localhost:8765` — the *viewer* origin for response URLs), `KB_API_TOKEN` (default unset), `KB_GIT_COMMIT` (default true).
- **`server/db.py`** — `connect()` (WAL, row factory), idempotent DDL exactly per the approved plan's sketch: `documents` (id INTEGER PK, project, slug, date GLOB-checked, title, tags JSON text default `'[]'`, tags_text default `''`, source_repo nullable, rel_path UNIQUE, markdown, created_at, updated_at, `UNIQUE(project, date, slug)`) + external-content FTS5 `documents_fts(title, tags_text, markdown, content='documents', content_rowid='id', tokenize='porter unicode61')` + the standard trigger trio (AFTER INSERT insert; AFTER DELETE `'delete'` form; AFTER UPDATE `'delete'` then insert). Ops: `upsert_document` by rel_path (`ON CONFLICT(rel_path) DO UPDATE`, preserve `created_at`, refresh `updated_at`), `get_document(id)`, `get_document_by_path(rel_path)`, `list_documents(project=None, tag=None, limit, offset)` newest-first (date DESC, id DESC; tag filter via `json_each(documents.tags)`), `delete_document_by_path`, `count_documents`. Add a short comment marking the future `sqlite-vec` extension point (no embeddings now).
- **`server/documents.py`** — the conventions library:
  - `slugify(title)`: lowercase-kebab (non-alnum runs → single `-`, trim, collapse), cap ~80 chars, fallback for empty.
  - Validators: project `^[A-Za-z0-9][A-Za-z0-9._-]*$` and no `..`/`/`; tags list of 2–5, each `^[a-z0-9]+(-[a-z0-9]+)*$`; slug same tag charset; date `YYYY-MM-DD` validated with `datetime.date.fromisoformat` (stricter than the DB GLOB — rejects 2026-13-45).
  - `rel_path(project, date, slug)` → `f"{project}/{date}-{slug}.md"`.
  - **Frontmatter serializer**: hand-rolled template producing exactly the ground-truth block above — title line via `json.dumps(title, ensure_ascii=False)` (valid YAML double-quoted scalar; colons/quotes/em-dashes safe), bare date, `tags:` as a block list with `  - `, `source:` map with `  project: ` and `  repo: `. Never PyYAML-dumped.
  - **Frontmatter parser**: split the leading `---` fences, `yaml.safe_load` the header only; return (meta, body). Tolerant of non-explainer files (return None / raise a typed error the caller maps to a skip reason).
  - **Recent-marker insertion**: given index.md text + bullet fields, insert the bullet on a new line directly after `<!-- explain:recent -->`; fallback ladder: no marker → directly after a `## Recent` heading; neither → append a `## Recent` section with the marker + bullet. Return (new_text, mechanism_used). Pure function — no I/O — so it's trivially testable and S3 composes it.
- **`server/reindex.py`** — library `reindex(...)` returning `{indexed, removed, skipped, duration_ms}` + `python -m server.reindex` CLI printing that summary one key per line (`indexed: N` …). Walk only `docs/<subdir>/**/*.md` (top-level files never enter the walk). **Reserved top-level dirs `current/` and `versions/` are excluded entirely** — a module constant `RESERVED_DIRS = {"current", "versions"}` with a comment (generated agentic-workspace internals; silently excluded so reindex output stays clean). Files that ARE walked but malformed go to `skipped: [{rel_path, reason}]` — reasons like `filename not <YYYY-MM-DD>-<slug>.md` or `missing/invalid frontmatter`. Project = first path segment; title/tags/source from frontmatter; body stored WITHOUT frontmatter; `tags_text` = space-joined tags. Upsert by rel_path; after the walk, delete DB rows whose rel_path vanished from disk (count as `removed`). Never runs git.
- **`tests/test_documents.py`**, **`tests/test_reindex.py`** — **terse** (workspace hard rule: minimal high-value cases, no fixture sprawl):
  - documents: serializer output == byte-exact expected block for a colon-and-quotes title; parse(serialize(x)) round-trip; slugify + validator accept/reject spot checks; marker ladder (marker present / `## Recent` only / neither).
  - reindex: temp docs tree with one valid explainer + one file under `current/` (must not appear anywhere in the result) + one malformed file (lands in `skipped` with a reason) → `indexed == 1`; delete the explainer, rerun → `removed == 1`; FTS smoke: MATCH finds the indexed title. Use `tmp_path` + env vars (`KB_ROOT`, `KB_DB_PATH`) — never the real repo DB.
- **`.gitignore`** — append `data/`, `__pycache__/`, `*.py[co]`, `.venv/`.

## Verification (run all; report results in your verdict)

1. `uv sync` && `uv run pytest` — green.
2. `uv run python -m server.reindex` (repo root) → `indexed: 1`, `removed: 0`, `skipped` empty — the hi2vi_web doc is the only explainer; `current/`+`versions/` silently excluded.
3. `sqlite3 data/kb.sqlite3 "SELECT title FROM documents_fts WHERE documents_fts MATCH 'nginx';"` → the shared-nginx title.
4. `git status --short` — nothing changed under `docs/`; `data/` and `.venv/` do not appear (ignored).
5. `python3 scripts/workflow.py validate` — passes.

## Wrap-up (executor)

- Append to `phase.md`: under *Discovered consideration*, one line recording the chosen mechanism (reserved-dirs exclusion + skipped[] for anomalies); under *Doc impact*, one-liners: `data` — documents schema + external-content FTS5 + disposable `data/kb.sqlite3`; `backend` — `server/` package (config/db/documents/reindex conventions library); `operations` — reindex CLI (`python -m server.reindex`) as the drift-repair tool.
- Write `result.md` (what you built, decisions, deviations, verification output).
- Never commit; never transition status; touch nothing outside `pyproject.toml`/`uv.lock`/`.gitignore`/`server/`/`tests/` + your slice files and `phase.md`. Do not modify anything under `docs/`.
