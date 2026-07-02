# Plan — P2.DECOMP (decompose Track 2: DB-backed document API)

## Situation

P2 builds Track 2 of the two-track knowledge store (see `works/phases/active/P2/intent.md`): a SQLite+FTS5 document store behind a FastAPI service (compose service `api`, host port 8766) with an **API-owned write path**, so the `/explain` skill can POST documents instead of writing files. `docs/` stays canonical; `POST /api/reindex` rebuilds the DB from files.

A fully detailed, **operator-approved implementation plan** exists at `~/.claude/plans/make-up-phases-for-precious-fairy.md`. Its **Phases 1–4 are P2's scope** (Phase 5 belongs to P3). Read it in full — architecture summary, SQLite DDL sketch, exact API contract, Dockerfile/compose details, edge-case table, verification steps. P2's `intent.md` names the natural seams; your job is to turn them into slices and seed the phase notebook.

Host tooling (verified by the orchestrator): uv at /opt/homebrew/bin/uv, Python 3.12.6, Docker Compose v2.40.3, host SQLite has FTS5. The plan's verify steps run as-is on this machine.

## Your job (decomposition slice)

**1. Create the middle slices** with `new-slice` (bare folders — never pre-fill their `plan.md`):

| ID | Name | Kind | Risk | Order | Depends on |
|---|---|---|---|---|---|
| P2.S1 | Scaffold, conventions library, DB + reindex (no HTTP) | implementation | medium | 1 | — |
| P2.S2 | Read/search API: healthz, list/get/by-path, BM25 search, reindex endpoint | implementation | medium | 2 | P2.S1 |
| P2.S3 | Write path: POST /api/documents + Recent marker + scoped git commit | implementation | high | 3 | P2.S2 |
| P2.S4 | Dockerize: Dockerfile, compose `api` service, README API section | implementation | low | 4 | P2.S3 |

Example: `python3 scripts/workflow.py new-slice --phase P2 --slice P2.S1 --name "Scaffold, conventions library, DB + reindex (no HTTP)" --kind implementation --risk medium --order 1`

You may refine names/risks if you find good reason while mining the plan — record the rationale in `phase.md`. Risk is deliberate: it selects the implementing executor's effort later (`low` → high-effort variant; else xhigh). S3 is the critical slice (process lock, write orchestration, 409/overwrite, scoped-commit semantics, failure modes).

**2. Seed `works/phases/active/P2/phase.md`** (tight and durable — every later slice reads this notebook first):

- **Context**: the repo today — MkDocs Material viewer (`kb` service, squidfunk/mkdocs-material:9.7.6 pinned, port 8765, `--livereload` explicit and load-bearing), auto-nav from the `docs/` tree (no `nav:` key, no `strict:` — the mkdocs.yml comment is load-bearing), one real explainer doc (`docs/hi2vi_web/2026-07-02-shared-nginx-explained.md`), no app code / DB / CI yet.
- **Decomposition**: the slice table + rationale (disk formats before HTTP; reads before writes; container last so everything it wraps is already tested) + risk rationale.
- **Findings & Notes** — distill the approved plan's essentials (with a pointer to the file for full detail), at minimum:
  - Stack: Python 3.12, FastAPI + uvicorn, uv-managed `pyproject.toml`, package `server/`; deps `fastapi`, `uvicorn`, `pyyaml`; dev `pytest`, `httpx`.
  - DB: `data/kb.sqlite3` (gitignored, disposable), WAL; `documents` table + **external-content** FTS5 (`title`, `tags_text`, `markdown`, `tokenize='porter unicode61'`) synced by AFTER-triggers; `UNIQUE(rel_path)`, `UNIQUE(project,date,slug)`; future `sqlite-vec` extension point noted, no embeddings now.
  - Search: `bm25(documents_fts, 8.0, 4.0, 1.0)`; expose `score = -bm25`; `snippet()` with `<mark>`; query tokens individually double-quoted before MATCH (FTS5 operator syntax must not 500); `raw=true` opt-in.
  - Write-path invariants: hand-rolled byte-exact frontmatter (title via `json.dumps(..., ensure_ascii=False)`; parse with `yaml.safe_load` only); single uvicorn worker + one process-wide `threading.Lock` around file+index+DB+commit; `git add` only touched paths (never `-A`); commit failure never rolls back file/DB (`committed:false` + `commit_error`); never push. Recent-marker insertion replicates the skill's fallback ladder (marker → `## Recent` heading → append section).
  - Config env: `KB_ROOT`, `KB_DB_PATH`, `KB_PUBLIC_BASE_URL` (default `http://localhost:8765`), `KB_API_TOKEN` (bearer on the two mutating endpoints only, unset by default), `KB_GIT_COMMIT`.
  - Docker: `python:3.12-slim` + git + uv binary; `uv export --frozen --no-dev --no-emit-project | uv pip install --system -r -`; `git config --system safe.directory /repo` + system-level identity `kb-api` (system level so the bind mount can't shadow it); repo bind-mounted at `/repo`; ports `8766:8000`; `TZ=Asia/Seoul`; single worker.
  - API contract summary (endpoints + key request/response fields + error semantics: 409 names the existing doc; 422 validation; reindex returns `{indexed, removed, skipped[], duration_ms}`).
- **Discovered consideration** (the plan predates the agentic-workspace install): `docs/` now also holds `docs/current/*.md`, `docs/versions/**/*.md`, `docs/README.md`, `docs/index.json` — non-explainer files without explainer frontmatter. Reindex must handle them deliberately: explicitly skip the `current/` and `versions/` directories (and top-level non-explainer files), or let frontmatter validation route them to `skipped` — S1 decides; keep reindex output clean either way. Separately, these files appearing in the *published site nav* is a P3-scope question — file it with `defer-job` (e.g. `--title "Decide whether works/docs internals appear on the public site" --reason "agentic-workspace files now live inside the MkDocs content root" --trigger "P3 planning" --source P2.DECOMP`).
- **Constraints**: never edit the bootstrap_agentic_workspace repo; mkdocs.yml auto-nav stays untouched; single-writer invariant is documented truth; keep test files terse (workspace hard rule — minimal high-value cases); durable-doc versions only at P2.REVIEW — implementation slices append one-line **Doc impact** notes to `phase.md` instead.
- **Open Questions**: none expected (the plan is operator-approved). If you hit something genuinely new, record it as a note for the orchestrator — do not guess and do not expand scope.

**3. Write `result.md`** in this slice folder: the breakdown, rationale, any deviations from this plan.

**4. Run `python3 scripts/workflow.py validate`** and confirm it passes.

## Constraints

- `new-slice` is permitted for you (decomposition privilege). You never commit and never transition slice/phase status.
- Do not write source code, do not touch `docs/`, do not touch other phases' folders (reading P2's `intent.md` and the approved plan file is expected).
- Never pre-fill the created slices' `plan.md` — the orchestrator writes each at that slice's turn.

## Verification (for your verdict)

- `validate` passes; `works/backlog.md` lists P2 with DECOMP + S1–S4 + REVIEW in order.
- `phase.md` seeded per above; exactly one new deferred job exists (site-nav question).
