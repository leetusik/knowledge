# Result — P2.REVIEW (phase review + durable-doc consolidation)

- Phase ID: P2
- Slice ID: P2.REVIEW
- Review status: **pass** (round 2, after P2.F1)
- Next action: orchestrator records the pass via `review-phase P2 --verdict pass`,
  commits the consolidated docs, then optionally archives (`archive-phase P2` /
  `rotate-backlog` / `archive-all`). Operator follow-ups below.

## Two-round summary

- **Round 1 (`changes_requested`)**: the phase's behavioral work validated fully
  green (25/25 pytest, both containers Up, all read endpoints + TZ, a `commit:false`
  write smoke with byte-identical `docs/`, `workflow validate`), and every
  objective/intent element checked out. But consolidating docs surfaced a **blocking
  packaging defect**: S1's unanchored `.gitignore` `data/` rule also matched the
  `docs/versions/data/` doc-version subtree, so a new `data` doc version would be
  git-ignored and silently dropped from the commit (a doc-index integrity break).
  The five draft v0002 versions were rolled back and **P2.F1** was proposed.
- **P2.F1 (fix, applied & committed `6bcf898`)**: anchored `.gitignore` line 4
  `data/` → `/data/`, so only the repo-root disposable DB dir is ignored and
  `docs/versions/data/` is trackable again. Verified both ways.
- **Round 2 (this pass)**: re-ran the full validation matrix (still green), confirmed
  the F1 fix via `check-ignore` both ways, and — with the blocker gone — consolidated
  the ten Doc impact notes into **five fresh v0002 doc versions**. The new `data`
  version is now git-visible (untracked, not ignored). **Review verdict: `pass`.**

## Round-2 validation matrix — phase as a whole

| # | Check | Result |
|---|---|---|
| 0a | `git check-ignore docs/versions/data/v0002_probe.md` (F1 probe) | **PASS** — no match, exit 1 (trackable) |
| 0b | `git check-ignore data/kb.sqlite3` (F1 probe) | **PASS** — matched by `.gitignore:4:/data/`, exit 0 (still ignored) |
| 1 | `uv run pytest -q` | **PASS** — 25 passed, 1 warning (starlette httpx deprecation, harmless) |
| 2 | `docker compose ps` — both services `Up` | **PASS** — `knowledge-kb-1` Up (8765), `knowledge-api-1` Up (8766) |
| 3 | `curl localhost:8766/healthz` | **PASS** — `{status:ok, docs_root:/repo/docs, db:ok, documents:1}` |
| 4 | `curl 'localhost:8766/api/search?q=nginx'` | **PASS** — 1 result, `<mark>nginx</mark>` snippet, `signals.bm25`; `score:0.0` (single-doc IDF collapse — documented, not a regression) |
| 5 | `curl localhost:8766/api/documents` | **PASS** — `total:1`, item sans markdown/tags_text |
| 6 | `by-path` spot-check (hi2vi_web doc) | **PASS** — returns the doc incl. markdown, no tags_text |
| 7 | TZ sanity: `docker compose exec -T api python -c "…date.today()"` | **PASS** — `2026-07-02` (KST, matches host) |
| 8 | **`commit:false` write smoke through 8766** | **PASS** — see below |
| 9 | `python3 scripts/workflow.py validate` | **PASS** — "Workflow validation passed." |

**Write smoke (step 8) detail** — proves validate→lock→file→bullet→DB with no git
side effects: POST `/api/documents` (`test-project` / `review-smoke`, tags
`["review","smoke"]`, tiny H1 body, `commit:false`) → **201** `committed:false`,
**no** `commit_error`, `commit_sha:null`, `recent_updated:true`, `id:2`; file written
byte-exact at `docs/test-project/2026-07-02-review-smoke.md` (double-quoted title,
bare date, tag list, `source:` map); bullet inserted directly after
`<!-- explain:recent -->`; `by-path` returned it. HEAD unchanged (`6bcf898`)
throughout. Surgical cleanup (`rm` the doc, `rmdir` the dir, `git checkout --
docs/index.md` — **no `reset --hard`, no `add -A`**) → `POST /api/reindex`
`{"indexed":1,"removed":1}`; `docs/` ended **byte-identical** (`git status --porcelain
-- docs/` empty), healthz back to `documents:1`.

## Objective / intent review (re-confirmed)

| Objective element | Finding |
|---|---|
| SQLite + FTS5 store (S1) | **Met** — `documents` (all cols, `UNIQUE(rel_path)`, `UNIQUE(project,date,slug)`, GLOB date CHECK) + external-content `documents_fts` + AFTER INSERT/DELETE/UPDATE trigger trio; WAL; disposable `data/kb.sqlite3`; clean sqlite-vec seam |
| Read/list/search/reindex endpoints (S2) | **Met** — healthz, list (+project/tag/limit/offset), get-by-id/by-path, BM25 search (8/4/1, `score=-bm25`, `<mark>`, `signals`, quoted-token safety, `raw`→400), reindex |
| API-owned write path (S3) | **Met** — POST `/api/documents`: convention file + Recent bullet + DB upsert + scoped commit under one `WRITE_LOCK`; 409 (disk **or** DB, names the doc) / 422; never-rollback; never-push. Verified live via the write smoke |
| Compose `api` on 8766 beside untouched `kb` (S4) | **Met** — both containers Up; compose.yml gained **only** the `api` service; `kb` block untouched |
| `docs/` canonical, reindex reconciles | **Met** — reindex `removed:1` after the smoke's file deletion; `docs/` byte-identical |
| `mkdocs.yml` auto-nav untouched | **Met** — no `nav:`/`strict:` |
| bootstrap repo untouched | **Met** — only this repo changed; `/explain` update is the handover-prompt follow-up |
| Single-writer + optional bearer | **Met** — in-process `WRITE_LOCK` + single-worker CMD; `require_bearer` on the two mutating endpoints only |

Behavioral objective: **fully met.** Packaging blocker from round 1: **resolved by P2.F1.**

## Doc Versions Created (5, consolidated from the ten Doc impact notes)

Each via `doc-new-version --source P2.REVIEW`, body edited, one `rebuild-docs`; all
five `docs/current/*` now read `version: v0002 | source: P2.REVIEW`, `docs/index.json`
latest pointers updated (2 versions each), `validate` green. All five new version
files are git-visible (untracked `??`, none ignored — `check-ignore` sweep exit 1).

- `api` — `v0002_db-backed_document_api_read_list_search_reindex_api-owned_write_path.md`
- `backend` — `v0002_server_fastapi_package_config_db_documents_search_gitops_main.md`
- `data` — `v0002_sqlite_fts5_document_store_documents_table_external-content_fts_index.md` (git-visible — the F1 fix's payoff)
- `operations` — `v0002_two-service_compose_viewer_api_reindex_drift_repair_bearer_auth.md`
- `architecture` — `v0002_track_2_two-container_shape_over_shared_bind-mounted_repo.md`

`decisions` (v0002, P1.REVIEW) and `product` (v0002, P1.REVIEW) left as-is — no new
durable decision (the `COMPOSE_BAKE=false` rebuild quirk is operations detail, now
captured in the `operations` v0002, not a decision).

## Files Changed

- `docs/versions/api/v0002_*.md`, `docs/versions/backend/v0002_*.md`,
  `docs/versions/data/v0002_*.md`, `docs/versions/operations/v0002_*.md`,
  `docs/versions/architecture/v0002_*.md` (five new version files)
- `docs/current/{api,backend,data,operations,architecture}.md` (regenerated by `rebuild-docs`)
- `docs/index.json` (regenerated latest pointers)
- `works/phases/active/P2/slices/P2.REVIEW/result.md` (this file)
- `works/phases/active/P2/phase.md` (round-2 close-out line)

## Roadmap Updates — operator follow-ups (carry to phase close / P3)

- **a. `/explain` handover.** Paste the self-contained `/explain` handover prompt
  (tail of `~/.claude/plans/make-up-phases-for-precious-fairy.md`) into a
  `bootstrap_agentic_workspace` session when ready, so `/explain` POSTs to the API
  instead of writing files. Other-repo action — never edited here; not a P2 defect.
- **b. P3 (GitHub Pages / Track 1)** is the remaining track; deferred **D1**
  (works/docs internals on the public site nav) waits on P3 planning.
- **c. Archiving stays manual** (`rotate-backlog` / `archive-all` / `archive-phase P2`
  once desired) — and only after the review pass is recorded.

## Deviations from Plan

- None in round 2. (Round 1's only deviation — consolidation withheld pending the
  gitignore fix — is now resolved; the ten Doc impact notes are consolidated here.)

## Retrospective

- The behavioral phase was solid from round 1 and matches the approved plan
  slice-for-slice. The single gap was a packaging seam invisible until a *new* `data`
  doc version was minted: an unanchored `data/` gitignore rule silently swallowing the
  `docs/versions/data/` subtree. P2.F1's root-anchoring (`/data/`) closed it; the
  general lesson is that unanchored directory ignores are dangerous when a same-named
  directory legitimately lives elsewhere in the tree. Two-round review caught and
  fixed it before any broken doc-index state could be committed.
