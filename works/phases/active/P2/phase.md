# Phase P2: Track 2 — DB-backed document API

_Intent: see [intent.md](intent.md)._

## Objective

Build the DB track of the two-track knowledge store: SQLite (FTS5) document store + FastAPI service with read/list/search/reindex endpoints and an API-owned write path (docs/-convention file + Recent-marker update + DB upsert + scoped git commit), containerized as compose service 'api' on port 8766 beside the mkdocs viewer, so the /explain skill can POST documents instead of writing files. docs/ stays canonical; reindex rebuilds the DB from files.

## Context

The repo today is a **pure MkDocs Material viewer** — no app code, no DB, no CI yet.

- **Viewer**: compose service `kb`, image `squidfunk/mkdocs-material:9.7.6` (exact pin — upgrades are deliberate and diff-visible), host port `8765`, whole repo bind-mounted at `/docs`, `restart: unless-stopped`. Command is `serve --dev-addr=0.0.0.0:8000 --livereload` — **`--livereload` is explicit and load-bearing**: the flag never arms by default in this image, so without it new pages don't appear until the container restarts. P2's `api` service (port 8766) lives beside `kb`; the shared bind mount is what lets livereload pick up API-written files.
- **Auto-nav**: `mkdocs.yml` has **no `nav:` key and no `strict:`** — the sidebar builds itself from the `docs/` tree so the skill adds pages with zero config. The comment block in `mkdocs.yml` explaining this is load-bearing; a `nav:` key would orphan every new page and `strict` would turn the warning into a serve failure. Do not touch it in P2.
- **Content today**: one real explainer, `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md`, with convention frontmatter (`title` double-quoted, bare `date`, `tags` YAML list, `source:` map of `project`+`repo`). `docs/index.md` holds the Recent list with marker `<!-- explain:recent -->` (bullet format `- <YYYY-MM-DD> · [<Title>](<project>/<date>-<slug>.md) — <project>`); `docs/tags.md` holds the `<!-- material/tags -->` marker.
- **`.gitignore` today**: only `.DS_Store`, `site/`, `.cache/`. S1 adds `data/`, `__pycache__/`, `*.py[co]`, `.venv/`.
- **Host tooling (verified by the orchestrator)**: uv at `/opt/homebrew/bin/uv`, Python 3.12.6, Docker Compose v2.40.3, host SQLite has FTS5. The approved plan's verify steps run as-is on this machine.
- **Full detail**: the operator-approved implementation plan at `~/.claude/plans/make-up-phases-for-precious-fairy.md` — its **Phases 1–4 are P2's scope** (Phase 5, GitHub Pages CI, is P3). It carries the SQLite DDL sketch, the exact API contract with JSON examples, Dockerfile/compose details, an edge-case table, and the verification steps, plus the self-contained `/explain` handover prompt (that skill edit happens in the *other* repo — never edited here).

## Decomposition

Four implementation slices, sequenced disk-formats → reads → writes → container so each layer is unit-tested before the next wraps it. Risk drives the executor's effort later (`low` → high-effort variant; else xhigh); `S3` is the critical slice.

| ID | Name | Kind | Risk | Order | Depends on |
|---|---|---|---|---|---|
| P2.S1 | Scaffold, conventions library, DB + reindex (no HTTP) | implementation | medium | 1 | — |
| P2.S2 | Read/search API: healthz, list/get/by-path, BM25 search, reindex endpoint | implementation | medium | 2 | P2.S1 |
| P2.S3 | Write path: POST /api/documents + Recent marker + scoped git commit | implementation | high | 3 | P2.S2 |
| P2.S4 | Dockerize: Dockerfile, compose `api` service, README API section | implementation | low | 4 | P2.S3 |

**Seam rationale** (from the approved plan's Phase boundaries):
- **S1** owns everything that touches disk formats — `pyproject.toml`/`uv.lock`, `server/{__init__,config,db,documents,reindex}.py`, the two unit-test files, and the `.gitignore` bump — with **no HTTP**, so the byte-exact frontmatter, slugify/validators, path computation, Recent-marker fallbacks, DDL/triggers, and reindex library fn are all unit-tested before a server exists.
- **S2** adds the read surface (`server/main.py` FastAPI app, `server/search.py`) over the S1 library: `GET /healthz`, list/get/by-path, `GET /api/search`, `POST /api/reindex`, bearer dependency (no-op when token unset), TestClient tests over a temp KB tree. Reads before writes so the query path and DB access are proven before the mutating path lands.
- **S3** is the critical slice — the write path: `server/gitops.py`, the `POST /api/documents` endpoint (validation, 409/overwrite, the process lock, orchestration), the write-file + update-index composition in `server/documents.py`, and write tests over a temp git repo. It carries the phase's hardest correctness: the single-writer lock, 409/overwrite semantics, scoped-commit (exactly the 2 touched paths), and the failure modes (`committed:false` on commit error, never rolls back). Hence **high** risk.
- **S4** containerizes last, when everything it wraps is already tested: `Dockerfile`, `.dockerignore`, the compose `api` service, and the README API section. It changes no server logic, only packaging + docs — hence **low** risk (runs on the high-effort executor variant). End-to-end livereload proof (POST on 8766 → page renders on 8765) belongs here.

**Risk rationale**: S1/S2 are medium (real logic, but unit-testable in isolation with well-specified contracts); S3 is high (concurrency + git side effects + irreversible file writes, the phase's genuine risk concentration); S4 is low (packaging/docs over already-green code).

Slice count/naming follow the approved plan's four seams verbatim; no refinements were needed.

## Findings & Notes

_Distilled from `~/.claude/plans/make-up-phases-for-precious-fairy.md` — read that file for full detail (DDL, JSON examples, edge-case table)._

- **Stack**: Python 3.12, FastAPI + uvicorn, uv-managed `pyproject.toml`, package `server/`. Deps: `fastapi`, `uvicorn`, `pyyaml`; dev: `pytest`, `httpx`. Deps installed in the container with `uv pip install --system` (a `/repo` venv is shadowed by the bind mount).
- **DB**: `data/kb.sqlite3` (gitignored — disposable, rebuilt from files), WAL mode, idempotent DDL. `documents` table (id, project, slug, date [GLOB-checked `YYYY-MM-DD`], title, tags JSON, `tags_text` space-joined for FTS, source_repo, `rel_path` = `<project>/<date>-<slug>.md` relative to `docs/`, markdown [body WITHOUT frontmatter], created_at, updated_at; `UNIQUE(rel_path)`, `UNIQUE(project,date,slug)`) + **external-content** FTS5 table `documents_fts(title, tags_text, markdown, content='documents', content_rowid='id', tokenize='porter unicode61')` kept in sync by AFTER INSERT/DELETE/UPDATE triggers. External-content (not contentless) so `snippet()`/`highlight()` work. **Future extension point** (not this phase): a `sqlite-vec` `document_chunks_vec` table + RRF fusion in `server/search.py` — leave the seam clean, no embeddings now.
- **Search**: `bm25(documents_fts, 8.0, 4.0, 1.0)` (title 8×, tags 4×, body 1×); expose `score = -bm25` (higher-is-better, ready for hybrid fusion) and a `signals:{bm25}` block; `snippet()` wraps hits in `<mark>`. **Query tokens are individually double-quoted before `MATCH`** so raw FTS5 operator syntax (`NEAR/AND(`, etc.) can never 500 the endpoint; `raw=true` opts into raw FTS5 syntax deliberately.
- **Write-path invariants** (S3): frontmatter is **hand-rolled byte-exact**, never PyYAML-dumped — a template fn guarantees the convention; title emitted via `json.dumps(title, ensure_ascii=False)` (a JSON string is a valid YAML double-quoted scalar → colons/quotes/em-dashes safe); parsing uses `yaml.safe_load` only. **Single uvicorn worker + one process-wide `threading.Lock`** around the whole file+index+DB+commit critical section (documented invariant: never scale to multiple workers; WAL gives read concurrency). **Git**: the API makes the commit itself — message `docs(<project>): add <slug>`, optional `Co-Authored-By` trailer from the request — staging **only the touched paths** (`git add docs/<rel_path> docs/index.md`, **never `-A`**), **never pushes**. A **failed commit never rolls back** the file/DB → `201` with `"committed": false, "commit_error": "..."`. Recent-marker insertion replicates the skill's **fallback ladder**: insert directly after `<!-- explain:recent -->`, else after a `## Recent` heading, else append a Recent section; duplicate bullet suppressed on overwrite.
- **Config env** (`server/config.py`): `KB_ROOT`, `KB_DB_PATH`, `KB_PUBLIC_BASE_URL` (default `http://localhost:8765` — the *viewer* origin used to build response `url`s), `KB_API_TOKEN` (when set, `Authorization: Bearer` required on the **two mutating endpoints only** — POST documents + reindex; unset by default = localhost open), `KB_GIT_COMMIT`.
- **Docker** (S4): `python:3.12-slim` + apt `git` + uv binary from `ghcr.io/astral-sh/uv`; deps via `uv export --frozen --no-dev --no-emit-project | uv pip install --system -r -`; `git config --system safe.directory /repo` + **system-level** git identity `kb-api` (system level so the bind mount can't shadow it); repo bind-mounted at `/repo`; `WORKDIR /repo`; CMD `uvicorn server.main:app --host 0.0.0.0 --port 8000` single worker; `TZ=Asia/Seoul`. compose `api` service: `build: .`, `ports: ["8766:8000"]`, `volumes: [".:/repo"]`, `environment: {KB_ROOT: /repo, TZ: Asia/Seoul}` (+ commented `KB_API_TOKEN`), `restart: unless-stopped`. `.dockerignore`: `.git`, `data/`, `docs/`, `site/`, `.cache/`, `.venv/`.
- **API contract** (base `http://localhost:8766`):
  - `GET /healthz` → `{status:"ok", docs_root, db:"ok", documents:N}`.
  - `POST /api/documents` — request: `title`, `markdown` (body WITHOUT frontmatter, starts at H1), `project` (`^[A-Za-z0-9][A-Za-z0-9._-]*$`, no `..`/`/`), `tags` (2–5, each `^[a-z0-9]+(-[a-z0-9]+)*$`), `source_repo`; optional `date` (default today), `slug` (default slugified title), `overwrite` (default false), `commit` (default true), `co_authored_by`. → `201 {id, rel_path, url, title, project, slug, date, tags, recent_updated, committed, commit_sha}`. `409` if rel_path exists (disk **or** DB) and not `overwrite` — **body names the existing doc**. `422` on validation error. Failed commit → still `201` with `committed:false`+`commit_error`.
  - `GET /api/documents?project=&tag=&limit=&offset=` → newest-first, no bodies: `{total, items:[...]}`.
  - `GET /api/documents/{id}` and `GET /api/documents/by-path/{rel_path:path}` → single doc incl. `markdown`, `source_repo`.
  - `GET /api/search?q=&project=&tag=&limit=` (+`raw=true`) → `{query, mode:"bm25", results:[{..., score, snippet, signals:{bm25}}]}`.
  - `POST /api/reindex` — walk `docs/*/**/*.md`, parse frontmatter, upsert by rel_path, delete rows for vanished files, **never commits** → `{indexed, removed, skipped:[{rel_path, reason}], duration_ms}`.

### S1 landed — interfaces & gotchas for S2/S3

- **DB API surface** (`server/db.py`): `connect(path=None)` (WAL + `sqlite3.Row` factory + idempotent DDL, creates parent dirs), `upsert_document(conn, *, project, slug, date, title, tags:list, source_repo, rel_path, markdown, now=None) -> id` (ON CONFLICT(rel_path); preserves `created_at`, refreshes `updated_at`), `get_document(conn, id)`, `get_document_by_path(conn, rel_path)`, `list_documents(conn, project=None, tag=None, limit=50, offset=0)` (newest-first; tag via `json_each`), `count_documents(conn, project=None, tag=None)`, `delete_document_by_path(conn, rel_path)`. Reads return dicts with `tags` already JSON-decoded to a list.
- **Conventions** (`server/documents.py`): `slugify`, `validate_project/tags/slug/date` (raise `ConventionError`; `FrontmatterError` is a subclass — map both to 422 in S3), `rel_path(project, date, slug)`, `serialize_frontmatter(*, title, date, tags, project, source_repo) -> str` (ends with `---\n`; compose a file as `serialize_frontmatter(...) + "\n" + body`), `parse_frontmatter(text) -> (meta, body)`, `insert_recent_bullet(index_text, *, date, title, rel_path, project) -> (new_text, mechanism)` (pure, no I/O — S3 reads/writes `docs/index.md` around it). `format_recent_bullet` uses ` · ` (U+00B7) and ` — ` (U+2014) separators — byte-exact to the ground-truth bullet.
- **Search prep for S2**: FTS columns are ordered `(title, tags_text, markdown)`, so `bm25(documents_fts, 8.0, 4.0, 1.0)` weights map title/tags/body respectively. External-content means `snippet()/highlight()` over `markdown` work.
- **Config reads env at call time** (no import-time caching) — S2/S3 tests override `KB_ROOT`/`KB_DB_PATH` via `monkeypatch.setenv` (see `tests/test_reindex.py`). No FastAPI/uvicorn wiring exists yet — S2 adds `server/main.py`.
- **Tooling gotchas**: virtual project (`[tool.uv] package=false`, no `[build-system]`); `[tool.pytest.ini_options] pythonpath=["."]` puts the repo root on `sys.path` so `import server` resolves without installing the package — keep this when adding test files. Reindex stores `markdown` as the body with leading newlines stripped (starts at H1). `date:` parses back from YAML as a `datetime.date`; reindex normalizes via `.isoformat()`.

## Discovered consideration — non-explainer files now inside `docs/`

The approved plan predates the agentic-workspace install and assumed `docs/` held only explainers. It now **also** holds workspace internals inside the MkDocs content root:

- `docs/current/*.md` (11 generated fullstack docs), `docs/versions/**/*.md` (versioned durable docs), `docs/README.md`, `docs/index.json` — none of these carry explainer frontmatter (title/date/tags/source).

**Reindex must handle them deliberately** so its output stays clean. The plan's reindex already skips top-level `index.md`/`tags.md`; **S1 decides** the mechanism for the rest — either explicitly skip the `current/` and `versions/` directories (and top-level non-explainer files like `README.md`, `index.json`), or let frontmatter validation route them into the `skipped[]` list with a reason. Either is acceptable; the requirement is that `indexed` counts only real explainers and `skipped[]` is not noisy garbage. Record the chosen mechanism in this notebook when S1 lands.

**S1 decision (landed):** chose the **hybrid** — (a) the walk only descends into `docs/<subdir>/` directories, so all top-level files (`index.md`, `tags.md`, `README.md`, `index.json`) never enter it; (b) a module constant `RESERVED_DIRS = {"current", "versions"}` in `server/reindex.py` silently excludes those two subtrees entirely (never walked, never skipped); (c) files that ARE walked but malformed land in `skipped: [{rel_path, reason}]` (reasons `filename not <YYYY-MM-DD>-<slug>.md` / `missing/invalid frontmatter: …` / `bad date`). Real-repo reindex confirms `indexed: 1, removed: 0, skipped: 0` — clean. Removal is keyed on **file presence on disk** (a DB row whose rel_path no longer exists under a non-reserved subdir is removed), so deleting a doc → `removed: 1`.

**Separately** — whether these workspace-internal files appear in the *published GitHub Pages site nav* is a **P3-scope** question (P3 owns Track 1 / publishing), not P2's. Filed as deferred **D1** (`Decide whether works/docs internals appear on the public site`, trigger: P3 planning, source P2.DECOMP). Do not expand P2 to solve it.

## Constraints

- **Never edit the bootstrap_agentic_workspace repo.** The `/explain` skill change is delivered as the self-contained handover prompt at the tail of the approved plan; it happens in that other repo, not here.
- **Keep `mkdocs.yml` auto-nav untouched** — no `nav:` key, no `strict:`; the explanatory comment stays.
- **Single-writer invariant is documented truth**: one uvicorn worker + one process lock; never scale to multiple workers.
- **Keep test files terse** (workspace hard rule) — minimal high-value cases per the plan's per-phase test lists; no fixture/scaffolding sprawl.
- **Durable-doc versions only at P2.REVIEW** — implementation slices append one-line **Doc impact** notes below instead of running `doc-new-version`. The review consolidates them into new versions (likely `architecture`, `api`, `backend`, `data`, `operations`) on a passing review.
- `data/kb.sqlite3` is gitignored and disposable; `docs/` stays canonical; reindex reconciles drift (manual edits, API-down fallback writes, git resets).

## Doc impact

_Running list of durable-truth changes; the P2.REVIEW slice consolidates these into doc versions. Implementation slices append one-liners here — do not version docs per slice._

- `data` (S1) — `documents` table (id, project, slug, date [GLOB `YYYY-MM-DD`], title, tags JSON, `tags_text`, source_repo, `rel_path` UNIQUE, markdown, created_at/updated_at, `UNIQUE(project,date,slug)`) + external-content FTS5 `documents_fts(title, tags_text, markdown, tokenize='porter unicode61')` synced by the AFTER INSERT/DELETE/UPDATE trigger trio; WAL mode; disposable `data/kb.sqlite3` (gitignored, rebuilt from docs/); clean `sqlite-vec` extension point noted in the schema.
- `backend` (S1) — `server/` package landed: `config` (env-at-call-time settings: KB_ROOT/KB_DB_PATH/KB_PUBLIC_BASE_URL/KB_API_TOKEN/KB_GIT_COMMIT), `db` (WAL connect + idempotent DDL + upsert/get/get-by-path/list/count/delete), `documents` (slugify, validators, `rel_path`, hand-rolled byte-exact frontmatter serialize via `json.dumps` title + `yaml.safe_load` parse, Recent-marker insertion with the marker→heading→append fallback ladder), `reindex` (library fn). uv-managed `pyproject.toml` (`kb-api`, py>=3.12, fastapi/uvicorn/pyyaml + dev pytest/httpx), virtual project (`[tool.uv] package=false`, no build-system).
- `operations` (S1) — reindex CLI `python -m server.reindex` is the drift-repair tool (manual edits / API-down fallback writes / `git reset` all cured by a full rebuild from docs/); prints `indexed:/removed:/skipped:/duration_ms:` per line; never runs git.

## Open Questions

- None. The implementation plan is operator-approved and fully specified. (The `docs/` internals reindex mechanism is an S1 decision, and the published-nav question is deferred as D1 — neither is an open blocker.)
