# Intent — P2

- Captured at: 2026-07-02T13:26:48+09:00
- Origin: operator

## Original Input (verbatim)

> There will be two track knowledge store plan
> 1. in docs/ dir
> 2. In db
>
> 1 is used for github static page, 2 is used for personal webui(later search engine will be attached. Hybrid search retriver based).
> So this app should provide not only docs storing but db write/read endpoint to bootstrap_agentic_workspace's /explain skill.

(Framing from the same conversation: "make up phases for the below task. mind that no other repo editing." — and after the workspace was installed: "we now installed bootstrap agentic workspace. your job is to make only phases not code edit.")

## Confirmed Intent (refined + clarified)

Build track 2 of the two-track knowledge store: a database-backed document store with an HTTP API, living in this repo beside the existing MkDocs site.

- **Store**: SQLite at `data/kb.sqlite3` (gitignored — the DB is disposable and rebuilt from files). A `documents` table plus an external-content **FTS5** index gives real BM25 keyword search now; leave a clean extension point for `sqlite-vec` embeddings later (no embedding pipeline in this phase). This DB will later power a personal web UI with a hybrid-search retriever — the web UI itself is out of scope.
- **API** (FastAPI, compose service `api` on host port 8766, repo bind-mounted): `GET /healthz`, `GET /api/documents` (list/filter), `GET /api/documents/{id}` and `/by-path/{rel_path}`, `GET /api/search` (BM25, response shaped for future hybrid signals), `POST /api/reindex` (rebuild DB from `docs/`), and `POST /api/documents` — the write path.
- **The API owns writes**: a POST creates `docs/<project>/<YYYY-MM-DD>-<slug>.md` with convention-exact frontmatter (title always double-quoted, bare date, 2–5 lowercase-kebab tags, `source:` map), inserts the Recent bullet directly after `<!-- explain:recent -->` in `docs/index.md` (with the skill's existing fallback ladder), upserts the DB row, and makes the git commit itself (`docs(<project>): add <slug>`, staging only the files it touched — never `-A`; optional Co-Authored-By trailer from the request; never pushes). `docs/` stays canonical; reindex reconciles any drift (manual edits, API-down fallback writes, git resets).
- **Consumer**: the `/explain` skill (from the bootstrap_agentic_workspace repo) will POST documents instead of writing files. Updating that skill happens in the other repo via a prepared handover prompt — **this repo's phase must not edit the bootstrap repo**.
- **Hard constraints**: keep `mkdocs.yml` auto-nav intact (no `nav:`, no `strict:`); the whole repo stays bind-mounted so mkdocs livereload picks up API-written files; single-writer design (one uvicorn worker + process lock); optional `KB_API_TOKEN` bearer auth on mutating endpoints only.

## Clarifications Resolved

- Q: DB engine — SQLite+FTS5+sqlite-vec vs Postgres+pgvector? — A: SQLite + FTS5 now, sqlite-vec extension point later.
- Q: Who owns the write path for a new document? — A: The API (file + Recent marker + DB upsert + scoped git commit); docs/ stays canonical with `/api/reindex` as the rebuild/fallback mechanism.
- Q: Is the personal web UI part of this task? — A: No — endpoints only; web UI and hybrid search come later on top of the read API.
- Q: One phase or several? — A: Two phases, one per track: this phase (DB/API track) and P3 (GitHub Pages track). The previously approved 5-step implementation plan becomes slices at decomposition time.
- Q: Placeholder P1? — A: Leave untouched; real work starts at P2.

## Notes

- A fully detailed, operator-approved implementation plan exists at `~/.claude/plans/make-up-phases-for-precious-fairy.md`: SQLite DDL sketch, exact API contract with JSON examples, Dockerfile/compose details, edge-case handling, verification steps — plus the self-contained handover prompt for updating `/explain` in the bootstrap repo. The DECOMP slice should mine it.
- Natural slice seams from that plan: (1) scaffold + conventions library + DB + reindex (no HTTP), (2) read/search API, (3) write path + git, (4) Dockerize (Dockerfile, compose `api` service, README).
