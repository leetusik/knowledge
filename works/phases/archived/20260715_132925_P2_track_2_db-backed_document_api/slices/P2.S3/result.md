# Result — P2.S3 (write path: POST /api/documents + Recent marker + scoped git commit)

**Status: done.** The API now owns the whole write path — one `POST /api/documents`
→ convention-exact `docs/` file + Recent bullet + DB upsert + scoped git commit,
all inside a single process-wide lock. `docs/` stays canonical; a failed commit
never rolls back the write.

## Outcome — what landed

- **`server/gitops.py`** (new): `GitError(command, stderr)`; `add(paths, *, root)` =
  `git -C <root> add -- <paths…>` (only the given paths — never `-A`);
  `commit(msg, *, root, co_authored_by=None)` = `git -C <root> commit -m <msg>`
  (+ a second `-m "Co-Authored-By: …"` when given) → `rev-parse HEAD`. Every
  failure (incl. "nothing to commit", missing identity, unsafe dir) raises
  `GitError`, never crashes; never pushes.
- **`server/documents.py`** (extended): `write_document_file(...)` writes
  `serialize_frontmatter(...) + "\n" + normalized_body` (leading blank lines
  stripped, single trailing newline) and returns the body **exactly as reindex
  stores it** (re-parses its own output so a POST-written doc and a later reindex
  produce identical `markdown` — no drift). `update_recent_index(...)` reads
  `docs/index.md`, inserts the bullet via the marker→heading→append ladder, and
  **suppresses the duplicate** (returns `recent_updated=False`, index untouched)
  when `rel_path` already appears.
- **`server/main.py`** (extended): `DocumentIn` Pydantic model; module-level
  `WRITE_LOCK = threading.Lock()`; `POST /api/documents` (status 201,
  `Depends(require_bearer)`): S1 validators (`ConventionError` → 422; defaults
  `date`=today, `slug`=`slugify(title)`); 409 when target exists on disk **or** in
  the DB and not `overwrite` (detail names the doc: `rel_path`, `id`,
  `existing_title`); the locked file→index→DB-upsert→git critical section; git
  only when `commit` **and** `git_commit_enabled()`; `GitError` → `201`
  `committed:false` + `commit_error` (**never rolls back**); flag-skip →
  `committed:false`, no `commit_error`; response includes
  `url = <public_base_url>/<project>/<date>-<slug>/`.
- **`tests/test_api_write.py`** (new, 4 terse cases over a temp git repo): happy
  path (201 shape, byte-exact frontmatter head, bullet after marker, commit
  touches exactly the 2 paths, subject + trailer); repeat→409→overwrite (no dup
  bullet, DB row updated); `commit:false` skips git; invalid tags → 422.

## Deviations from Plan

- None substantive. The 409 `detail` is a small structured object
  (`{message, rel_path, id, existing_title}`) — it "names the existing doc" as the
  plan requires; `id`/`existing_title` are included only when a DB row exists.
- Baseline/end `git status --porcelain` (smoke steps 1 & 6) legitimately also list
  this slice's own new/modified source (`server/{gitops,documents,main}.py`,
  `tests/test_api_write.py`) alongside the `works/` state files and untracked
  `plan.md` — the slice's work product, constant across the smoke. The load-bearing
  invariant holds: `docs/` byte-identical, `works/` state untouched by the smoke,
  HEAD unchanged, and step 6 matches step 1 exactly.

## Validation Run

| Command | Result |
|---|---|
| `uv run pytest tests/test_api_write.py -q` | **pass** — 4/4 (run first, in isolation) |
| `uv run pytest -q` | **pass** — 25/25 (21 prior + 4 new) |
| `python3 scripts/workflow.py validate` | **pass** — "Workflow validation passed." |

### Real-repo smoke — STRICT ORDER (docs/ ended byte-identical; works/ protected)

1. Baseline `git status --porcelain` recorded; `docs/` had **no** tracked changes;
   HEAD = `978d7bc` (S2 boundary).
2. `uv run uvicorn server.main:app --port 8766` (real repo defaults); healthz →
   `documents:1`. POST throwaway doc (`test-project` / `api-smoke-test`, tags
   `["testing","api"]`) → **201, `committed:true`**, sha `1fa09ab…`.
3. File head = byte-exact frontmatter; `docs/index.md` bullet directly after
   `<!-- explain:recent -->`; `git log -1 --stat` = `docs(test-project): add
   api-smoke-test` + `Co-Authored-By` trailer, **exactly 2 files** (index.md +
   the doc); repeat POST → **409** naming the existing doc.
4. Surgical cleanup — `git reset HEAD~1` (mixed), `git checkout -- docs/index.md`,
   `rm docs/test-project/2026-07-02-api-smoke-test.md`, `rmdir docs/test-project`.
   **No `reset --hard`, no `add -A`** (either would revert tracked `works/` state).
5. Server still up: `POST /api/reindex` → `{"indexed":1,"removed":1,"skipped":[]}`;
   `GET /api/search?q=smoke` → `[]`. Killed uvicorn.
6. End state: HEAD = `978d7bc`; `git status --porcelain` **matches step 1
   byte-for-byte**; `docs/` byte-identical (no tracked or untracked changes).
7. `uv run pytest -q` (25 green) + `validate` (passed).

## Files Changed

- `server/gitops.py` (new)
- `server/documents.py` (extended — write composition)
- `server/main.py` (extended — POST /api/documents + WRITE_LOCK)
- `tests/test_api_write.py` (new)
- `works/phases/active/P2/phase.md` (S3-landed notes + Doc impact one-liners)
- `works/phases/active/P2/slices/P2.S3/result.md` (this file)

## Doc Versions Created

- None (per workspace rule, implementation slices do not version docs). Doc impact
  appended to `phase.md` for the P2 review to consolidate: `api`, `backend`,
  `operations` (S3 one-liners).

## Retrospective

- `data/kb.sqlite3` (gitignored, disposable) was touched by the smoke's POST +
  reindex; the tests use `KB_DB_PATH` in tmp dirs and never touch it.
- The in-process `WRITE_LOCK` makes the single-uvicorn-worker invariant load-bearing
  in code — S4's container CMD must stay single-worker, and must supply system-level
  `safe.directory /repo` + git identity (else commits return `committed:false`).
