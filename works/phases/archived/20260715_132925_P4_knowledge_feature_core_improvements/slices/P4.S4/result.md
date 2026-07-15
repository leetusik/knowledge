# P4.S4 result — Cross-link convention: related-docs metadata, API exposure, backfill

## What was built

Introduced the `related:` frontmatter representation exactly as scoped in `plan.md` — forward-links-only, dead-links-tolerated, optional/backward-compatible everywhere.

1. **`server/db.py`**
   - `_SCHEMA`: `documents` gains `related TEXT NOT NULL DEFAULT '[]'` (fresh DBs).
   - `init_db`: idempotent migration — `PRAGMA table_info(documents)` → if `related` absent, `ALTER TABLE documents ADD COLUMN related TEXT NOT NULL DEFAULT '[]'`. Verified live against a hand-built pre-S4 `documents` table (no `related` column): after `db.connect()`, `PRAGMA table_info` shows `related` present.
   - `upsert_document(..., related: Optional[list[str]] = None)` — stored as JSON (`None` → `[]`), threaded into both the INSERT column list and the `ON CONFLICT ... DO UPDATE SET`.
   - `_row_to_dict` parses `related` JSON exactly like `tags` (defensive `except` on bad/missing JSON → `[]`).
   - Not added to `documents_fts` — rel_paths aren't search terms; the FTS trigger trio names its columns explicitly (`title, tags_text, markdown`) so it's untouched by the new base-table column.

2. **`server/documents.py`**
   - `validate_related(related) -> list[str]`: must be a list; each entry a non-empty string, relative (`Path.is_absolute()` false), no `..` part, ≥2 path parts, `endswith(".md")`; else `ConventionError`. Duplicates removed, order preserved. Empty list OK. Mirrors the shape rules S3's `reindex_path` already uses for `rel_path`.
   - `serialize_frontmatter(..., related: Optional[list[str]] = None)`: emits a two-space-indented `related:` block between `tags:` and `source:` only when `related` is truthy (non-empty); `None`/`[]` emits nothing. Verified byte-identical output to pre-S4 when `related` is omitted (`test_serialize_frontmatter_related_roundtrip_and_omission`, plus every pre-existing byte-exact test in `test_documents.py`/`test_api_write.py` still passes unmodified).
   - `write_document_file(..., related: Optional[list[str]] = None)` threads it into `serialize_frontmatter`.

3. **`server/main.py`**
   - `DocumentIn.related: list[str] = []`.
   - `create_document`: `validate_related(body.related)` runs in the existing try/except (`ConventionError` → 422, same as tags/project/slug/date). After `rel` is computed, a self-reference (`related` containing the doc's own `rel_path`) is dropped silently (not an error) — `related = [r for r in related if r != rel]`. Threaded into `write_document_file` and `db.upsert_document`; echoed in the 201 response as `"related": related`.
   - GET-by-id / GET-by-path already return the full DB row minus `_INTERNAL` (`tags_text`), so `related` is exposed there automatically via `_row_to_dict` — no route change needed.

4. **`server/reindex.py`**
   - `_index_file`: `raw_related = meta.get("related"); related = [str(x) for x in raw_related] if isinstance(raw_related, list) else []` — same leniency pattern as `tags` (bad/missing shape never fails indexing). Passed to `db.upsert_document(..., related=related)`.

## Backfill (docs/changple5, docs/hi2vi_web, docs/bootstrap_agentic_workspace.sh — 6 explainers total)

Read the full body of all 6 explainer docs and grepped for genuine cross-references (phase numbers, subsystem names) rather than assuming a full clique. Findings:

- **P35 (agent refactor) doc** explicitly discusses **P39**: "The team found six other things that might be slow ... and wrote them all down as 'P39 후보' (candidates for a later performance-only phase)" — this is the origin of P39's own "three earlier phases ... deferred candidates" narrative. P35 also explicitly discusses **P26**: the freeze list "protecting invariants proven correct in earlier phases (the P17 latency work, the P26 security work)", and slice S5 extracted the prompt-injection guard (P26's subject) into its own module. Both are genuine, textually-grounded relations → `P35.related = [P39, P26]`.
- **P39 (performance/caching) doc** explicitly names **P34, P35, P36** as the three predecessor cleanup phases whose deferred candidates converged into P39; only P35 exists in this corpus → `P39.related = [P35]`.
- **P26 (prompt-injection) doc**: grepped for P35/P39/agent-refactor/redis/cache/ingestion — no hits. P26 itself doesn't reference the later docs (written before them, in-universe). Per the design decision (forward links only; backlinks derivable by P6 from the full corpus), P35 → P26 is sufficient; P26 need not link back. Left unlinked.
- **Ingestion job (P32) doc**: grepped for redis/celery-queue/cache/agent-refactor/prompt-injection/P26/P35/P39 — no genuine subsystem overlap in the body (its "celery" tag is its own job scheduler, not the P39 Redis cache/queue). Left unlinked, consistent with plan guidance ("not necessarily a full clique").
- **hi2vi_web nginx doc** and **bootstrap_agentic_workspace.sh (P6 API rewire) doc**: different projects entirely, no textual relation to anything else in the corpus. Left unlinked.

Net: 2 of the 6 docs carry `related:` — `P35 → [P39, P26]` and `P39 → [P35]` — a small, textually-justified subgraph; the other 4 stay untouched. Frontmatter placement is byte-convention: `related:` immediately after `tags:`, before `source:`.

## Verification

- `uv run pytest -q` → **52 passed** (41 pre-existing + 11 new: 4 in `test_documents.py`, 3 in `test_api_write.py`, 1 in `test_reindex.py`; the `test_validate_related_reject` parametrization covers 5 reject cases under one test id).
- Live smoke via `TestClient` (in `test_api_write.py`): POST with `related` (incl. a duplicate + a dead link) → frontmatter file contains the `related:` block in the right position, 201 echoes the deduped list, GET-by-path echoes it too. POST with `related` containing the doc's own rel_path → 201, `related: []` (self-ref dropped). POST without `related` → byte-identical frontmatter to pre-S4 (`_EXPECTED_FM`).
- Migration smoke (ad hoc, not a committed test): hand-built a `documents` table without the `related` column, then called `db.connect()` on it — `PRAGMA table_info(documents)` afterward shows `related` present. Confirms the idempotent `ALTER TABLE` path works on a genuinely pre-S4 DB.
- Real-repo reindex: `uv run python -m server.reindex` → `indexed: 6, removed: 0, skipped: 0` (the local `data/kb.sqlite3` is git-ignored and disposable — reindex never runs git). Verified via `sqlite3 data/kb.sqlite3 "SELECT rel_path, related FROM documents"` that the two backfilled docs carry their intended `related` JSON arrays and the other four carry `[]`.
- `python3 scripts/workflow.py validate` → passed.

## Deviations from plan.md

None. Design decisions (frontmatter-only representation, dead-links-tolerated, forward-only, search unchanged) were already resolved in the plan and implemented as specified. The backfill judgment call — *which* of the 4 changple5 docs to cross-link — was made per the plan's explicit delegation ("cross-link what actually relates, not necessarily a full clique"), grounded in textual evidence (grep + full read of each doc), not assumption.

## Doc impact

Appended to `phase.md` "Actual notes": one-liners for `data.md` (related column + frontmatter convention + migration), `api.md` (optional `related` in POST + exposure on list/get), `backend.md` (validate_related/serialize/reindex changes), `decisions.md` (the representation ADR — frontmatter-only, dead-links-tolerated, forward-only).

## Files changed

- `server/db.py`
- `server/documents.py`
- `server/main.py`
- `server/reindex.py`
- `tests/test_documents.py`
- `tests/test_api_write.py`
- `tests/test_reindex.py`
- `docs/changple5/2026-07-07-the-p35-agent-refactor-explained-for-beginners.md`
- `docs/changple5/2026-07-07-measure-first-then-cache-the-p39-performance-phase-explained-for-beginners.md`
- `works/phases/active/P4/slices/P4.S4/result.md` (this file)
- `works/phases/active/P4/phase.md`

## Hard-rule compliance

- No `git add`/`git commit` run.
- No `workflow.py` status-transition command run (the `todo` → `in_progress` transition on `P4.S4` visible in `git diff` was already made by the orchestrator's `start-slice` before this slice was dispatched — confirmed by its timestamp in `works/events.jsonl` preceding this session's work).
- Touched only `server/`, `tests/`, the two `docs/changple5/*.md` explainers, this slice folder, and `phase.md`.
- Never touched `docs/current/`, `docs/versions/`, or `docs/index.md`/`docs/tags.md`/`docs/README.md`.
