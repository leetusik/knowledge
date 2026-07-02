# Result — P2.REVIEW (phase review + durable-doc consolidation)

- Phase ID: P2
- Slice ID: P2.REVIEW
- Review status: **changes_requested**
- Next action: orchestrator records the verdict, runs the proposed fix slice
  **P2.F1** (anchor `.gitignore` `data/` → `/data/`), then re-runs P2.REVIEW to
  consolidate docs and pass.

## Outcome

**Review verdict: `changes_requested`.** The phase's behavioral work is complete
and fully validated (all four slices, live containers, write smoke, workflow
validate — all green) and every objective/intent element is met. But
consolidating docs surfaced a **blocking packaging defect**: S1's `.gitignore`
rule `data/` (unanchored) also matches `docs/versions/data/`, so any new `data`
doc version is git-ignored and cannot be committed. Docs were therefore **not
consolidated** (the five draft versions were rolled back); one fix slice is
proposed. See "Blocking finding" below.

## Validation Run — phase as a whole

| # | Check | Result |
|---|---|---|
| 1 | `uv run pytest -q` | **PASS** — 25 passed, 1 warning (starlette httpx deprecation, harmless) |
| 2 | `docker compose ps` — both services `Up` | **PASS** — `knowledge-kb-1` Up (8765), `knowledge-api-1` Up (8766) |
| 3 | `curl localhost:8766/healthz` | **PASS** — `{status:ok, docs_root:/repo/docs, db:ok, documents:1}` |
| 4 | `curl 'localhost:8766/api/search?q=nginx'` | **PASS** — 1 result, `<mark>nginx</mark>` snippet, `signals.bm25`; `score:0.0` (single-doc IDF collapse — documented, not a regression) |
| 5 | `curl localhost:8766/api/documents` | **PASS** — `total:1`, item sans markdown/tags_text |
| 6 | `by-path` spot-check (hi2vi_web doc) | **PASS** — returns the doc incl. markdown |
| 7 | TZ sanity: `docker compose exec -T api python -c "…date.today()"` | **PASS** — `2026-07-02` (KST, matches host) |
| 8 | **`commit:false` write smoke through 8766** | **PASS** — see below |
| 9 | `python3 scripts/workflow.py validate` | **PASS** — "Workflow validation passed." |

**Write smoke (step 8) detail** — proves validate→lock→file→bullet→DB with no git
side effects: POST `/api/documents` (`test-project`, tags `["review","smoke"]`,
tiny H1 body, `commit:false`) → **201** `committed:false`, **no** `commit_error`,
`commit_sha:null`, `recent_updated:true`; file written at
`docs/test-project/2026-07-02-review-smoke-doc.md` (slug defaulted from title);
bullet inserted directly after `<!-- explain:recent -->`; `by-path` returned the
doc. Surgical cleanup (`rm` the doc, `rmdir` the dir, `git checkout -- docs/index.md`
— **no `reset --hard`, no `add -A`**) → `POST /api/reindex` `{"indexed":1,"removed":1}`;
`docs/` ended **byte-identical** (`git status --porcelain -- docs/` empty), HEAD
unchanged (`9058fba`).

### Objective / intent review

| Objective element | Finding |
|---|---|
| SQLite + FTS5 store (S1) | **Met** — `documents` (all cols, `UNIQUE(rel_path)`, `UNIQUE(project,date,slug)`, GLOB date CHECK) + external-content `documents_fts` + AFTER INSERT/DELETE/UPDATE trigger trio; WAL; disposable `data/kb.sqlite3`; clean sqlite-vec seam |
| Read/list/search/reindex endpoints (S2) | **Met** — healthz, list (+project/tag/limit/offset), get-by-id/by-path, BM25 search (8/4/1, `score=-bm25`, `<mark>`, `signals`, quoted-token safety, `raw`→400), reindex |
| API-owned write path (S3) | **Met** — POST `/api/documents`: convention file + Recent bullet + DB upsert + scoped commit under one `WRITE_LOCK`; 409 (disk **or** DB, names the doc) / 422; never-rollback; never-push. Verified live via the write smoke |
| Compose `api` on 8766 beside untouched `kb` (S4) | **Met** — both containers Up; `git diff` across P2 commits shows compose.yml gained **only** the `api` service; `kb` block untouched |
| `docs/` canonical, reindex reconciles | **Met** — reindex `removed:1` after the smoke's file deletion; `docs/` byte-identical |
| `mkdocs.yml` auto-nav untouched | **Met** — no `nav:`/`strict:`; not modified across P2 |
| bootstrap repo untouched | **Met** — only this repo changed; `/explain` update is the handover-prompt follow-up |
| Single-writer + optional bearer | **Met** — in-process `WRITE_LOCK` + single-worker CMD; `require_bearer` on the two mutating endpoints only |

Behavioral objective: **fully met.**

## Blocking finding (why not `pass`)

**Issue 1 — `.gitignore` rule `data/` traps `docs/versions/data/` (S1 regression, blocking).**
`git check-ignore -v docs/versions/data/<any>.md` → `.gitignore:4:data/`. The
unanchored `data/` pattern (added by S1 for the root-level disposable
`data/kb.sqlite3` dir) also matches the `docs/versions/data/` doc-version
subtree. Consequence: the review's new `data` doc version is git-ignored and
would be **silently omitted** from the orchestrator's commit, leaving
`docs/index.json` + `docs/current/data.md` pointing at a version source file
absent from git — a doc-index integrity break. `docs/versions/data/v0001_bootstrap.md`
predates the ignore rule (committed at bootstrap) so it is tracked, which masked
the bug until this review created the first *new* `data` version. The other four
docs (api/backend/operations/architecture) are unaffected — only the `data`
category name collides with an ignored directory.

Because a review slice cannot edit config/source and must not consolidate docs on
a non-pass, the five draft doc versions I created (api/backend/data/operations/
architecture v0002) were **rolled back**: version files removed, `docs/index.json`
+ `docs/current/*` restored to committed state, `validate` re-run green. `docs/`
is back to the clean pre-consolidation baseline so the re-review consolidates
cleanly once the fix lands.

### Proposed fix slice

- **P2.F1** — *Anchor the `.gitignore` `data/` rule to `/data/`* (kind `fix`, risk
  `low`). Change line 4 `data/` → `/data/` so only the repo-root disposable DB dir
  is ignored, not `docs/versions/data/`. Verify: `git check-ignore
  docs/versions/data/<file>` returns nothing; `data/kb.sqlite3` still ignored
  (`git check-ignore data/kb.sqlite3` matches); `uv run pytest -q` (25) +
  `validate` green. After P2.F1, re-run P2.REVIEW to consolidate the ten Doc
  impact notes into the five v0002 versions and pass.

## Files Changed

- `works/phases/active/P2/slices/P2.REVIEW/result.md` (this file)
- `works/phases/active/P2/phase.md` (appended a review-findings note)
- No doc versions committed: the five drafts were created then rolled back;
  `docs/` is byte-identical to the pre-review baseline.

## Doc Versions Created

- **None** — rolled back pending P2.F1. The consolidation plan is ready: five
  v0002 versions (`api`, `backend`, `data`, `operations`, `architecture`) from the
  ten Doc impact notes + the "landed" sections.

## Roadmap Updates — operator follow-ups (carry to phase close / P3)

- **a. `/explain` handover.** Paste the self-contained `/explain` handover prompt
  (tail of `~/.claude/plans/make-up-phases-for-precious-fairy.md`) into a
  `bootstrap_agentic_workspace` session when ready, so `/explain` POSTs to the API
  instead of writing files. Other-repo action — never edited here; not a P2 defect.
- **b. P3 (GitHub Pages / Track 1)** is the remaining track; deferred **D1**
  (works/docs internals on the public site nav) waits on P3 planning.
- **c. Archiving stays manual** (`rotate-backlog` / `archive-all` / `archive-phase P2`
  once desired) — and only after the review passes.

## Retrospective

- The behavioral phase is solid and matches the approved plan slice-for-slice.
  The one gap is a packaging seam nobody could have hit until a *new* `data` doc
  version was created: the `data/` gitignore pattern silently swallows the
  `docs/versions/data/` subtree. Anchoring the pattern (`/data/`) closes it; the
  general lesson is that unanchored directory ignores are dangerous when a
  same-named directory legitimately lives elsewhere in the tree.
- Deviation from plan step 3: consolidation was **not** completed (review did not
  pass); drafts were rolled back and no "review passed" `phase.md` close-out line
  was written.
