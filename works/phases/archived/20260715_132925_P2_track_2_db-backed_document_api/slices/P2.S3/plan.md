# Plan — P2.S3 (write path: POST /api/documents + Recent marker + scoped git commit)

## Situation

The phase's **critical slice**. Read `works/phases/active/P2/phase.md` first — especially **"S1 landed"** and **"S2 landed — interfaces & gotchas for S3"** (reuse `require_bearer`, `get_conn()` pattern, `_public_doc`; route-order note). Full spec: the approved plan at `~/.claude/plans/make-up-phases-for-precious-fairy.md`, "Phase 3" + the edge-case table.

S3 makes the API own the whole write path: one POST → convention-exact `docs/` file + Recent bullet + DB upsert + **scoped git commit**, all inside the single process-wide lock. `docs/` stays canonical; a failed commit never rolls back the write.

## Create / modify

- **`server/gitops.py`** (new):
  - `GitError(Exception)` carrying the command and stderr.
  - `add(paths, *, root)` → `git -C <root> add -- <paths...>` (only the given paths — **never `-A`**).
  - `commit(message, *, root, co_authored_by=None) -> sha` → `git -C <root> commit -m <message>` plus a second `-m "Co-Authored-By: <value>"` when given; return `git -C <root> rev-parse HEAD`. "Nothing to commit" is a `GitError` with that reason, not a crash. Never push.
- **`server/documents.py`** (extend) — the write-file + update-index composition:
  - Normalize the body: strip leading blank lines (body starts at the H1, matching what reindex stores); ensure single trailing newline.
  - Write `docs/<rel_path>` (mkdir parents) as `serialize_frontmatter(...) + "\n" + body`.
  - Index update: read `docs/index.md`; **if the rel_path already appears in the text, suppress the duplicate bullet** (→ `recent_updated=False`, index untouched); else `insert_recent_bullet(...)` and write back (→ `recent_updated=True`).
- **`server/main.py`** (extend):
  - Pydantic request model: `title`, `markdown`, `project`, `tags`, `source_repo`; optional `date`, `slug`, `overwrite: bool = False`, `commit: bool = True`, `co_authored_by`.
  - `POST /api/documents`, status 201, `Depends(require_bearer)`:
    1. Validate with the S1 validators (`validate_project/tags/slug/date`); map `ConventionError` → HTTP 422 with the message. Defaults: `date` = today (`datetime.date.today().isoformat()`), `slug` = `slugify(title)`.
    2. `rel_path(project, date, slug)`; **409** if the target exists on disk OR in the DB and not `overwrite` — response detail names the existing doc (rel_path + title/id when known).
    3. Take the module-level **`threading.Lock`** (define it once, e.g. `WRITE_LOCK`) around: file write → index update → `db.upsert_document(...)` → git.
    4. Git only when `body.commit` AND `config.git_commit_enabled()`: `gitops.add(["docs/<rel_path>", "docs/index.md"], root=config.kb_root())` then `gitops.commit(f"docs({project}): add {slug}", ...)`. On `GitError`: **do not roll back** — respond `201` with `committed: false, commit_error: "<reason>"`. Skipped by flag → `committed: false` and no `commit_error`. Success → `committed: true, commit_sha`.
    5. Response: `{id, rel_path, url, title, project, slug, date, tags, recent_updated, committed, commit_sha}` where `url = f"{config.public_base_url().rstrip('/')}/{project}/{date}-{slug}/"`.
- **`tests/test_api_write.py`** (new, terse — workspace hard rule):
  - Fixture: temp KB root; `git init`, local `user.name`/`user.email`, seeded `docs/index.md` with the marker, initial commit; env (`KB_ROOT`, `KB_DB_PATH`) set before TestClient creation.
  - (1) Happy path: 201 shape incl. `committed: true` + sha; file content **starts with the byte-exact frontmatter block**; bullet on the line directly after the marker; `git diff-tree --no-commit-id --name-only -r HEAD` == exactly the 2 paths; commit subject `docs(test-project): add <slug>`; trailer line present when `co_authored_by` sent.
  - (2) Repeat POST → 409 naming the existing doc; resend with `overwrite: true` → 201, `recent_updated: false`, index has no duplicate bullet, DB row updated.
  - (3) `commit: false` → 201 `committed: false`, `git log` count unchanged.
  - (4) Invalid tags (too few / uppercase) → 422.

## Real-repo smoke — STRICT ORDER (protect works/ state; docs/ must end byte-identical)

**Danger note:** `git reset --hard HEAD~1` (the approved plan's cleanup) would also revert the tracked `works/` files that `start-slice` just modified. **Never run `reset --hard` (or `git add -A`).** Follow exactly:

1. **Run this smoke BEFORE writing `result.md`/`phase.md`.** Record `git status --porcelain` (expected: untracked `works/.../P2.S3/plan.md`, modified `works/` state files; nothing else tracked-modified).
2. Start `uv run uvicorn server.main:app --port 8766` in the background. POST a throwaway doc (project `test-project`, title "API Smoke Test", slug `api-smoke-test`, tags `["testing","api"]`, small H1 body) → expect 201 `committed: true`.
3. Verify: file exists with exact frontmatter head; `docs/index.md` bullet directly after the marker; `git log -1 --stat` shows message `docs(test-project): add api-smoke-test` touching exactly 2 files; repeat the POST → 409.
4. Surgical cleanup (works/ mods survive): `git reset HEAD~1` (mixed), `git checkout -- docs/index.md`, `rm docs/test-project/2*.md`, `rmdir docs/test-project`.
5. Drift-repair proof while the server is still up: `curl -s -X POST localhost:8766/api/reindex` → `"removed": 1`; `curl -s 'localhost:8766/api/search?q=smoke'` → no hit. Kill uvicorn.
6. Confirm end state: `git log -1` is the S2-boundary commit (`feat(api): add read/search endpoints...`); `git status --porcelain` matches step 1; nothing changed under `docs/`.
7. `uv run pytest -q` (all suites green) and `python3 scripts/workflow.py validate`.

## Wrap-up (executor — only after the smoke)

- Append to `phase.md`:
  - **"S3 landed"** note for S4: gitops runs `git -C <config.kb_root()>` (container must provide **system-level** `safe.directory /repo` + git identity `kb-api`); the write lock is in-process → the single-uvicorn-worker invariant is load-bearing; `KB_GIT_COMMIT=false` is the env kill-switch; anything else S4 must know.
  - **Doc impact** one-liners: `api` (S3) — POST /api/documents contract (defaults, 409/422 semantics, `committed:false` never-rollback, bearer, url shape); `backend` (S3) — gitops module + single-lock write orchestration; `operations` (S3) — API-down fallback story: skill fallback writes reconciled by `POST /api/reindex`.
- Write `result.md` (decisions, deviations, smoke transcript summary).
- Never commit; never transition status. Write only `server/gitops.py`, `server/documents.py`, `server/main.py`, `tests/test_api_write.py`, your slice files, and `phase.md`. `docs/` is touched **only** by the smoke and must end byte-identical.
