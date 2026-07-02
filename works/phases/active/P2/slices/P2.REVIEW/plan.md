# Plan — P2.REVIEW (phase review + durable-doc consolidation)

## Situation

All four implementation slices (S1–S4) are done and committed. Both containers run (kb on 8765, api on 8766); the host suite is 25/25; each slice ran a real-repo smoke (S3/S4 proved the scoped-commit write path twice, with surgical cleanup). `works/phases/active/P2/phase.md` has accumulated ten **Doc impact** one-liners across five docs, plus per-slice "landed" sections with the durable detail.

You are the review slice: validate the phase as a whole, review it against the objective and `intent.md`, and — only on a passing review — consolidate the Doc impact notes into new durable-doc versions. You may run `doc-new-version` (review privilege). You write only docs + your slice/phase notes; never source code. You never commit and never transition status.

Read first: `phase.md` (whole file — Decomposition, all "landed" sections, Doc impact list), `intent.md`, each slice's `result.md` (S1–S4).

## 1) Validate the phase's slices together

- `uv run pytest -q` → expect 25 passed.
- Live containers: `docker compose ps` (both `Up`); `curl -s localhost:8766/healthz` → `status:ok, documents:1`; `curl -s 'localhost:8766/api/search?q=nginx'` → 1 hit with `<mark>` snippet; `curl -s localhost:8766/api/documents` → total 1; `by-path` spot-check on the hi2vi_web doc; TZ sanity: `docker compose exec -T api python -c "import datetime; print(datetime.date.today())"` → today (KST).
- **One `commit:false` write smoke through 8766** — proves validation→lock→file→bullet→DB with no git side effects: POST `/api/documents` (project `test-project`, slug `review-smoke`, 2 valid tags, tiny H1 body, `"commit": false`) → 201 with `committed:false` and no `commit_error`; file exists; bullet after the marker; `by-path` returns it. Cleanup: `rm docs/test-project/2*.md`, `rmdir docs/test-project`, `git checkout -- docs/index.md`, `curl -s -X POST localhost:8766/api/reindex` → `"removed": 1`. The commit path itself needs no re-proof (pytest temp-repo tests + S3/S4 real-repo smokes). **Never `git reset --hard`, never `git add -A`.** `docs/` must end byte-identical (`git status --porcelain` shows nothing under `docs/`).
- `python3 scripts/workflow.py validate` — passes.

## 2) Review against objective and intent

Check each objective element from `phase.md`/`intent.md` and record findings: SQLite+FTS5 store (S1); read/list/search/reindex endpoints (S2); API-owned write path — convention file + Recent marker + DB upsert + scoped git commit, 409/422 semantics, never-rollback, never push (S3); compose service `api` on 8766 beside the untouched `kb` viewer (S4); `docs/` canonical with reindex reconciliation; `mkdocs.yml` auto-nav untouched; bootstrap repo untouched. The `/explain` consumer update is an **operator follow-up** (the self-contained handover prompt sits at the tail of `~/.claude/plans/make-up-phases-for-precious-fairy.md`) — note it in `result.md`, it is not a P2 defect.

## 3) On pass — consolidate the Doc impact notes into doc versions

For each doc below: `python3 scripts/workflow.py doc-new-version --doc <X> --summary "<short>" --source P2.REVIEW`, then edit the printed `edit_path` (replace the placeholder body with tight, durable truth mined from the Doc impact lines + the "landed" sections + slice results). After ALL edits: `python3 scripts/workflow.py rebuild-docs` once, then spot-check `docs/current/<X>.md`. Never patch old versions; never hand-edit `docs/current/`.

- **`api`** — the endpoint contract: `GET /healthz`; `GET /api/documents` (+project/tag/limit/offset, no bodies); `GET /api/documents/{id}` / `by-path/{rel_path}`; `GET /api/search` (quoted-token BM25, weights 8/4/1, `score=-bm25`, `<mark>` snippet, `signals:{bm25}`, `raw=true` → 400 on bad syntax); `POST /api/reindex` (`{indexed, removed, skipped[], duration_ms}`); `POST /api/documents` (fields + defaults, 409 body `{message, rel_path, id, existing_title}`, 422 on convention errors, `committed:false` + optional `commit_error` semantics, `commit_sha`, `recent_updated`, url shape `<base>/<project>/<date>-<slug>/`); bearer auth on the two mutating endpoints only when `KB_API_TOKEN` set.
- **`backend`** — `server/` package: `config` (env-at-call-time), `db` (WAL connect, idempotent DDL, upsert/get/list/count/delete), `documents` (slugify, validators, byte-exact frontmatter serialize/parse, Recent-bullet ladder, write-file + index composition), `search` (quoted-token MATCH builder, sqlite-vec/RRF seam), `gitops` (scoped add/commit, GitError, never -A/push), `main` (FastAPI app, `WRITE_LOCK`, `require_bearer`, `get_conn`); uv virtual project (`package=false`, pytest `pythonpath=["."]`); single-writer invariant.
- **`data`** — `documents` schema (all columns + UNIQUE constraints), external-content FTS5 `documents_fts` + trigger trio, `porter unicode61`, WAL; `data/kb.sqlite3` disposable/gitignored, rebuilt via reindex; reserved-dirs walk rule (`current/`, `versions/` excluded; skipped[] for anomalies); sqlite-vec extension seam.
- **`operations`** — compose runs two services (kb 8765 viewer with explicit `--livereload`; api 8766, restart unless-stopped, TZ Asia/Seoul + tzdata-in-slim note, single worker); **rebuild quirk on this host: use `COMPOSE_BAKE=false docker compose up -d --build`**; reindex as the drift-repair tool (CLI `python -m server.reindex` + `POST /api/reindex`) for manual edits / API-down fallback writes / git resets; `KB_API_TOKEN` enable/rotate; publishing is the operator's manual `git push` (agents/API never push).
- **`architecture`** — Track 2's shape: two containers over the shared bind-mounted repo; API-owns-writes flow (validate → lock → file → Recent bullet → DB upsert → scoped commit); `docs/` canonical, DB disposable; extension points (sqlite-vec + RRF hybrid search, future personal web UI on the read API); Track 1 (GitHub Pages) pending as P3; `/explain` becomes the API client via the handover prompt (bootstrap repo, operator action).

`decisions`/`product` (v0002 from P1) stay as-is unless you find a genuinely new durable decision (the COMPOSE_BAKE quirk is operations detail, not a decision).

## 4) Wrap up

- `result.md`: the validation matrix with actual results, review findings per objective element, doc versions created, and **operator follow-ups**: (a) paste the `/explain` handover prompt (tail of the approved plan file) into a bootstrap_agentic_workspace session when ready; (b) P3 (GitHub Pages) is the remaining track, with D1 waiting on its planning; (c) archiving stays manual (`rotate-backlog` / `archive-all` once desired).
- One close-out line in `phase.md` (review passed; docs consolidated to v0002 × 5).
- Return your structured verdict with `review_verdict`.

## Constraints

- Never commit; never run `review-phase`/`start-slice`/`finish-slice`/status transitions — the orchestrator records your verdict.
- Write only: the five new `docs/versions/<doc>/v0002_*.md` files (+ regenerated `docs/current/` + `docs/index.json` via the engine), `result.md`, and the `phase.md` close-out line.
- If validation or the objective check fails: create NO doc versions; return `changes_requested` with proposed fix slices (id/name/reason) or `blocked` with the impediment.

---

## Round 2 addendum (after P2.F1)

Round 1 (see this slice's `result.md`) validated everything green but withheld the pass on one finding: the unanchored `.gitignore` `data/` rule would have silently dropped new `data` doc versions from commits. **P2.F1 fixed it** (`data/` → `/data/`, committed — read `../P2.F1/result.md`). Round 1's five draft doc versions were rolled back cleanly, so `doc-new-version` mints fresh `v0002` files. This is a re-review, not a fresh discovery pass:

1. **Add one validation step**: `git check-ignore docs/versions/data/v0002_probe.md` → NO match (exit 1); `git check-ignore data/kb.sqlite3` → still ignored (by `/data/`).
2. Re-run the round-1 validation matrix (§1) — same git-safety rules. End-state expectation changes: `docs/` is byte-identical **except** the five new version files + regenerated `docs/current/` + `docs/index.json`, which are the deliverable.
3. On pass, consolidate the five docs per §3. Confirm the new `docs/versions/data/v0002_*.md` is **visible to git** (`git status` shows it untracked — not ignored).
4. Wrap up per §4; in `result.md` record the round-2 pass and that F1 unblocked consolidation. Overwrite/extend `result.md` so it tells the full two-round story.
