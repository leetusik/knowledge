# P4.S4 — Cross-link convention: related-docs metadata, API exposure, backfill

Operator-approved plan (2026-07-08). Executor: `slice-executor-mid`.

## Context

Per DECOMP: zero inter-doc links exist across the 6 explainer docs, so the P6 knowledge graph has no edges. This slice introduces the related-docs representation, stores/exposes it, and backfills the existing docs. Must be optional & backward-compatible — the unchanged `/explain` skill's `POST /api/documents` payload keeps working (new field optional). Read `phase.md` (Constraints + cross-slice notes) first.

**Design decisions (resolved at the plan gate, operator-approved):**

- **Representation: `related:` frontmatter only** — an optional list of rel_paths (`<project>/<date>-<slug>.md`), the same identifier `rel_path` already is everywhere. No `## Related` body-section parsing (fragile, duplicative; the site/UI renders relations from the API later). Emitted after `tags:`, before `source:`; omitted entirely when empty → byte-exact backward compatibility for docs and payloads without it.
- **Dead links tolerated:** entries are shape-validated (same rules as S3's `reindex_path`: relative, no `..`, ≥2 parts, `.md`) but existence is NOT required — a related doc may be written later; P6 can surface broken edges.
- **Forward links only.** Backlinks are derivable by P6 from the full corpus (list API carries `related`); no reverse index now.
- **Search results deliberately unchanged** — `related` rides on list/get only; a search hit navigates to the doc anyway. Keeps the S6-tuned `search.py` untouched.

## What to build

### 1. Schema + storage (server/db.py)

- Add `related TEXT NOT NULL DEFAULT '[]'` to the `documents` CREATE TABLE in `_SCHEMA` (fresh DBs), and an idempotent migration in `init_db`: `PRAGMA table_info(documents)` → if `related` column absent, `ALTER TABLE documents ADD COLUMN related TEXT NOT NULL DEFAULT '[]'`. Not added to FTS (rel_paths aren't search terms; triggers name explicit columns, unaffected).
- `upsert_document` gains keyword `related: Optional[list[str]] = None` (stored as JSON, `None` → `[]`).
- `_row_to_dict` parses `related` JSON like it parses `tags` → list/get API responses carry `related` automatically.

### 2. Convention library (server/documents.py)

- `validate_related(related) -> list[str]` — must be a list (ConventionError otherwise); each entry a non-empty string, relative (not absolute), no `..` parts, ≥2 path parts, endswith `.md`. Duplicates removed order-preserving. Empty list OK.
- `serialize_frontmatter(..., related: Optional[list[str]] = None)` — when non-empty, emit between `tags` and `source`:
  ```
  related:
    - <rel_path>
  ```
  (two-space indent, matching tags). None/empty → nothing emitted (byte-exact today's output).
- `write_document_file` threads `related` through.

### 3. Write path (server/main.py)

- `DocumentIn` gains `related: list[str] = []`; validated via `validate_related` in the existing try/except (→ 422). Threaded into `write_document_file` and `db.upsert_document`; echoed in the 201 response. Self-reference (`related` containing the doc's own rel_path) → dropped silently during validation.

### 4. Reindex (server/reindex.py)

- `_index_file`: read `meta.get("related")` leniently like tags (`[str(x) for x in raw] if isinstance(raw, list) else []`) and pass to `upsert_document`. (Files hand-edited with bad shapes still index; reindex is lenient by design.)

### 5. Backfill (docs/<project>/*.md — canonical sources, NEVER docs/current or docs/versions)

- Read all 6 explainer docs; add `related:` frontmatter **only where genuinely meaningful** — the 4 changple5 docs are a natural cluster (cross-link the ones that actually reference shared subsystems; not necessarily a full clique). The bootstrap and hi2vi_web docs likely stay untouched unless a real relation exists. Keep frontmatter formatting byte-convention (placement after tags, before source).
- Verify by running `uv run python -m server.reindex` (never runs git; local DB is disposable) — backfilled docs index with their `related` lists.

### 6. Tests (small, per Hard Rules)

- `tests/test_documents.py`: serialize+parse roundtrip with related (and that empty related emits byte-identical output to today); `validate_related` accept/reject cases (one test each).
- `tests/test_api_write.py`: POST with `related` → frontmatter contains the block, 201 echoes it, GET by id returns it; POST without `related` → unchanged behavior (existing tests already cover).
- One reindex test: file with `related:` frontmatter → row carries it.
- Full suite green: `uv run pytest -q`.

### 7. Wrap-up

Write free-form `result.md`; append to `phase.md`: Doc-impact one-liners (`data.md`: related column + frontmatter convention + migration; `api.md`: optional `related` in POST + exposure on list/get; `backend.md`: validate_related/serialize changes; `decisions.md`: the representation ADR — frontmatter-only, dead-links-tolerated, forward-only) and a "From S4" cross-slice note for S5 (both backfills touch the same 6 files' frontmatter) and P6 (edge source = `related` on list API; backlinks derivable). No commits, no status transitions.

## Verification

Full suite + live smoke (POST a doc with `related` against a temp KB root → file frontmatter correct, GET echoes; `uv run python -m server.reindex` on the real repo → 6 docs indexed, related lists present via a quick sqlite query or GET). Do NOT commit — the orchestrator commits.
