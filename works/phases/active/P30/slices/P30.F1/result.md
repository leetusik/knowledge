# P30.F1 result

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Mirrored the P30 server (S2-S7) into `plugin/templates/kb/` and the manifest; `plugin_parity.py` passes again. The migration tool's test and the book fixtures are classified root-only through a new manifest `root_only` list.
- validation:
  - `python3 scripts/plugin_parity.py`: PASS
  - `python3 scripts/skills_parity.py`: PASS
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: 197 passed (unchanged)
  - `python3 scripts/workflow.py validate`: passed
  - `plugin/setup/render.py` with `params.operator.json` into a scratch dir: wrote 144 files, no error
- deviations: one. The completeness check had no way to exclude a root-only file inside a shipped dir (`tests/` is fully shipped), so I added a ~10-line `root_only` filter to `scripts/plugin_parity.py` (the root-only CI gate script, not product code; it ships nowhere and changes no server/CLI/web behaviour). Without it, the only alternative was shipping `tests/test_migrate_books.py`, which imports the unshipped `scripts/migrate_books.py`.
- doc_impact: operations.md, template parity restored (phase.md `## Doc impact`).

## What changed

- Copied the 9 drifted `identical` files (`server/{db,documents,gitops,main,reindex,search,documents_api,graph_api}.py`, `tests/test_documents_api.py`) plus `pyproject.toml` and `uv.lock` from the repo to the template.
- Added 77 new files to the template and to the manifest's `identical` list: `server/{assets,books,books_api,native_ingest}.py`, `server/native/**` (11 files), `tests/test_{assets,books,native_format,native_ingest}.py`, `tests/fixtures/native/**`.
- Manifest `root_only`: `tests/test_migrate_books.py` and `tests/fixtures/book` (the operator's library-migration tool test and the fixture book; nothing shipped uses them). `scripts/migrate_books.py`, `scripts/migrations/` and `scripts/publish_fixture_book.py` sit in `scripts/`, which is not a shipped dir, so they needed no entry.
- `scripts/plugin_parity.py`: honors `root_only` on the repo side of the completeness check, and the docstring says so.
- `phase.md`: standing-gates note, one Doc impact line, `## Now`.

## Notes

- Files: `plugin/templates/kb/**`, `plugin/templates/manifest.json`, `scripts/plugin_parity.py`, `works/phases/active/P30/phase.md`.
- The manifest was rewritten with the same 2-space JSON style; the diff is only the added entries and the `root_only` key.
