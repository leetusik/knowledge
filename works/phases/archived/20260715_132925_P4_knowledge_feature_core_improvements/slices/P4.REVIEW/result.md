# P4.REVIEW — Phase review result

**Verdict: PASS.** All six middle slices (S1, S6, S2, S3, S4, S5) plus DECOMP validate together, hold every binding constraint, and match their `result.md` claims. The phase's Doc-impact notes are consolidated into seven new durable doc versions.

## What was reviewed

The whole of P4 — audit + hardening of the /explain + KB pipeline: search quality (S1 CJK query-side matching, recency ranking, pagination), the operator's semantic-search scope addition (S6 Gemini + SQLite BLOB vectors + RRF hybrid), API completeness (S2 DELETE + `/api/tags` + `/api/projects`), reindex robustness (S3 incremental single-path + startup drift self-heal), cross-link convention (S4 `related:` frontmatter + backfill), and publish hygiene (S5 `source.repo` sanitizer + `exclude_docs`). Reviewed against `intent.md`, `phase.md` (objective, constraints, all Doc-impact + cross-slice notes), and each slice's `plan.md`/`result.md`.

## Behavioral validation (all slices at once)

| Check | Command | Result |
|---|---|---|
| Full test suite | `uv run pytest -q` | **54 passed, 1 warning** (pre-existing httpx/starlette TestClient deprecation, unrelated) |
| State integrity | `python3 scripts/workflow.py validate` | **passed** |
| Real-repo reindex | `uv run python -m server.reindex` | **indexed: 6, removed: 0, skipped: 0** (embeddings skipped — no local key, correct degradation) |
| No local paths in docs | `grep -rn "/Users/" docs/` | **empty** (exit 1) |
| Site build (temp dir outside repo) | `uvx --from mkdocs-material==9.7.6 mkdocs build --site-dir …/site` | built clean; **`site/versions/` absent, `site/current/` present, no `/Users/` in site** |
| Read-only API smoke (TestClient, real KB root, `KB_STARTUP_REINDEX=0`, no writes) | see below | all pass |

Read-only API smoke evidence (TestClient against the real 6-doc KB, no key → BM25 degradation path):
- `/api/search?q=창플` → `mode:"bm25"`, `total:1`, hits the prompt-injection doc, `signals:{bm25:1.691, recency:0.9923}`; `/api/search?q=미라클` → `total:1`. CJK query-layer matching works in BM25 mode.
- `/api/tags` → 26 tags, ordered count DESC then tag ASC; `/api/tags?project=changple5` → 18 tags (scoped). `/api/projects` → 3 projects, ordered project ASC, each with `count` + `latest_date`.
- GET the backfilled P35 doc by-path → `related:[…p39…, …p26…]` and `source_repo:"changple5"` (sanitized basename, not an absolute path).

Spot-checks against code (cheap, no re-implementation): `mkdocs.yml` has **no `nav:`/`strict:`** and `exclude_docs: /versions/` present; `WRITE_LOCK` wraps both the create and delete write paths, with the S6 embed step explicitly outside the lock (single-worker invariant intact); `RRF_K=60`, `HALF_LIFE_DAYS=90`, `RECENCY_WEIGHT=0.5` in `server/search.py`; `server/embeddings.py`, `sanitize_source_repo`, `validate_related`, `remove_recent_bullet`/`remove_from_recent_index`, the `related` `ALTER TABLE` migration, `list_tags`/`list_projects`, and the `document_embeddings` table with `ON DELETE CASCADE` all present as claimed.

## Constraint compliance (all held)

- **Backward-compatible write contract:** `DocumentIn.related` is optional (default `[]`); `source_repo` unchanged (only sanitized at write time). The existing `/explain` POST payload keeps working.
- **No skill/bootstrap edits:** `git diff e754d6d..HEAD` touched none of `.claude/skills`, `installer/`, or the root bootstrap script.
- **`docs/current`/`docs/versions` never hand-edited by slices:** no P4 commit touched them (verified via diff); they are versioned here at REVIEW only.
- **No `nav:`/`strict:`; `exclude_docs` used; auto-nav preserved.** **`docs/` canonical / DB disposable.** **Single-worker `WRITE_LOCK` invariant untouched.**

## Doc Versions Created (consolidated Doc-impact → one version per affected doc)

| Doc | New version | Folds in |
|---|---|---|
| api | `v0003_p4_search_pagination_hybrid_signals_delete_tags_projects_incremental_reindex_related_links` | S1 search pagination/signals, S6 hybrid `mode`/signals, S2 DELETE + tags/projects, S3 reindex body, S4 `related` |
| backend | `v0003_p4_recency_rrf_hybrid_search_embeddings_module_delete_path_incremental_reindex_cross-links_sanitizer` | S1 recency/pagination, S6 embeddings module + RRF, S2 delete helper + aggregations, S3 `reindex_path`/lifespan, S4 `validate_related`, S5 sanitizer |
| data | `v0003_p4_document_embeddings_cache_related_column_cjk_query-layer_search_publish-safe_source` | S1 tokenizer-unchanged, S6 `document_embeddings` table, S2 FK cascade note, S4 `related` column + migration, S5 publish-safe source |
| architecture | `v0003_p4_sqlite-vec_rrf_seam_consumed_as_hybrid_semantic_search` | S6 seam-consumed hybrid search (upgrade-ready), aggregations/related groundwork |
| operations | `v0004_p4_gemini_embedding_env_startup_reindex_self-heal_mkdocs_exclude_docs` | S6 Gemini env + quota, S3 startup self-heal + single-path CLI, S5 `exclude_docs` |
| security | `v0002_p4_publish-safe_source_metadata_sanitizer_no_local_paths_on_public_surface` | S5 sanitizer + no-local-paths surface (also filled the prior bootstrap stub with the real auth/secret model) |
| decisions | `v0004_p4_cjk_query-side_search_hybrid_rrf_cross-link_convention_publish_hygiene_adrs` | S1/S6/S4/S5 ADRs |

`product.md` was an **anticipated** target in `phase.md` for S4 graph groundwork, but S4's actual Doc-impact notes named only data/api/backend/decisions — so product was a genuine no-op and correctly skipped. After editing, `rebuild-docs` + `validate` pass and `docs/` is free of `/Users/`; a final site build confirms versions excluded / current present / no leakage.

## Deviations from Plan

- Two doc examples initially reintroduced the literal `/Users/…` string in prose (api + security), which would have broken the phase's own publish-hygiene grep invariant. Caught during post-edit re-grep and reworded to a non-leaking illustrative path (`/home/<user>/projects/changple5`) and "absolute local (home-directory) paths". No other deviation from the plan.

## Files Changed

- Created + edited 7 durable doc versions under `docs/versions/{api,backend,data,architecture,operations,security,decisions}/` (see table); regenerated `docs/current/*.md` + `docs/index.json` via `rebuild-docs`.
- `works/phases/active/P4/slices/P4.REVIEW/result.md` (this file); closing note appended to `works/phases/active/P4/phase.md`.

## Roadmap Updates

- P4 complete on review: search quality, hybrid semantic search, API completeness, reindex robustness, cross-links, and publish hygiene all landed. Groundwork ready for P5 (web UI — consumes `/api/tags`, `/api/projects`, `related`), P6 (knowledge graph — derives backlinks from forward `related` edges), and P7 (plugin — server-side sanitize means the skill can change without re-hardening).

## Retrospective

- Clean phase: every slice's claims reproduced, all constraints held, no code issues. The only reviewer misstep was leaking the literal `/Users/` string into doc prose — a reminder that even documentation about publish hygiene must itself pass the hygiene grep. Handoff: orchestrator records this `pass` via `review-phase P4 --verdict pass` and commits (this review neither commits nor transitions status).
