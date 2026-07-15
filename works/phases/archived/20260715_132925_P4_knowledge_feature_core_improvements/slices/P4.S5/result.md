# P4.S5 — Result

Completed 2026-07-08. Publish hygiene fully implemented: source metadata sanitization + docs/versions exclusion + README updates.

## Implementation Summary

### 1. Sanitizer function (`server/documents.py`)
Added `sanitize_source_repo(value)` that collapses local paths to basenames (e.g., `/Users/sugang/projects/personal/changple5` → `changple5`), passes through URLs unchanged, and returns empty string for null/empty input. Handles trailing slashes and home-directory expansion (`~/x/y` → `y`). Known quirk (documented): bare `org/repo` shorthand collapses to `repo` — intended to avoid filesystem leakage.

### 2. Applied at both ingestion seams
- **`server/main.py` `create_document`**: Added `source_repo = documents_mod.sanitize_source_repo(body.source_repo)` before the write path begins. Both `write_document_file` and `db.upsert_document` now receive the sanitized value.
- **`server/reindex.py` `_index_file`**: Wrapped the parsed frontmatter value with `source_repo = documents.sanitize_source_repo(str(source.get("repo"))) or None`, defense-in-depth for hand-added docs.

### 3. Backfill: 6 explainer docs
Replaced absolute paths with basenames (touch only the `repo:` frontmatter line):
- `docs/bootstrap_agentic_workspace.sh/2026-07-02-how-explain-saves-documents-now-the-p6-api-rewire-explained.md`
- `docs/changple5/2026-07-07-measure-first-then-cache-the-p39-performance-phase-explained-for-beginners.md`
- `docs/changple5/2026-07-07-the-daily-ingestion-job-that-kept-getting-stuck-explained-for-beginners.md`
- `docs/changple5/2026-07-07-the-p35-agent-refactor-explained-for-beginners.md`
- `docs/changple5/2026-07-07-the-prompt-injection-defense-p26-explained-for-beginners.md`
- `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md`

Then `uv run python -m server.reindex` synced the DB (indexed: 6, removed: 0, skipped: 0). Post-check: `grep -rn "/Users/" docs/` → empty (verified).

### 4. mkdocs.yml: exclude_docs
Appended after `plugins:` block with comment explaining D1 resolution and never using `nav:`/`strict:`.

### 5. README.md touch-up
Updated the "Publish path" section to clarify that workspace internals are excluded, docs/versions is history in git, and source.repo is sanitized at write time.

### 6. Tests
- **`tests/test_documents.py`**: Added `test_sanitize_source_repo()` covering 12 cases (absolute paths, trailing slashes, home expansion, URL pass-through, plain names, empty/None, bare `org/repo` quirk).
- **`tests/test_api_write.py`**: Updated expected frontmatter fixture to expect sanitized basename. Added `test_post_absolute_source_repo_sanitized()` verifying POST with absolute `source_repo` is sanitized in both the written file and DB.

## Verification

### Test Suite
```
uv run pytest -q
54 passed, 1 warning
```

All tests green, including the new sanitization tests.

### Reindex Run
```
indexed: 6
removed: 0
skipped: 0
embeddings: embedded=0 cached=0 removed=0 skipped_reason=no api key
duration_ms: 12
```

All 6 explainer docs reindexed successfully, DB synced.

### No /Users/ Paths in Docs
```
grep -rn "/Users/" docs/
(no output — verified)
```

All absolute paths successfully replaced with basenames.

### Local Site Build (mkdocs)
```
uvx --from mkdocs-material==9.7.6 mkdocs build --site-dir /tmp/site
INFO - Documentation built in 0.35 seconds
```

Build assertions (all passed):
- ✅ `site/versions/` does NOT exist (excluded from the built site)
- ✅ `site/current/` exists (published, latest docs accessible)
- ✅ `grep -r "/Users/" site/` → empty (no filesystem paths in the public site)

## Files Changed

- `server/documents.py`: Added `sanitize_source_repo()` function with PurePosixPath import
- `server/main.py`: Added sanitization in `create_document` before write path
- `server/reindex.py`: Added sanitization in `_index_file` for frontmatter parsing
- `mkdocs.yml`: Appended `exclude_docs: /versions/` block after plugins
- `README.md`: Updated publish-path bullets with docs/versions and source.repo details
- `tests/test_documents.py`: Added `test_sanitize_source_repo()` (12 test cases)
- `tests/test_api_write.py`: Updated `_EXPECTED_FM` fixture; added `test_post_absolute_source_repo_sanitized()`
- 6 explainer docs: Updated `repo:` line in frontmatter (basenames only)

## Doc Impact (to be consolidated at P4.REVIEW)

- **`security.md`**: No local filesystem paths on the public surface; write-time sanitizer keeps `source.repo` publish-safe (basenames, URLs pass through).
- **`data.md`/`api.md`**: Publish-safe `source.repo` convention (repo basename, URLs pass through, sanitized at write time).
- **`operations.md`**: `exclude_docs: /versions/` in mkdocs.yml hides workspace internals from the built site; `docs/current/` stays published.
- **`decisions.md`**: ADR — basename representation for `source.repo` + mkdocs `exclude_docs` for versioned-docs exclusion (never `nav:`/`strict:`).

## Cross-Slice Note (for phase.md)

**D1 fully resolved**: workspace internals (docs/versions history, build artifacts) are now excluded from the published site via mkdocs `exclude_docs` (never adding `nav:`/`strict:`, preserving auto-nav), and source metadata is sanitized at write time (local paths → basenames, URLs preserved) so filesystem details never leak to the public site. Future phases (P5 web UI, P7 plugin) can assume a clean, publish-safe KB foundation.
