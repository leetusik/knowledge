# P30.F1 — Resync the plugin template with the P30 server

## Why

`python3 scripts/plugin_parity.py` passed before P30 (checked at `f9f5cec`). It now fails with about 95
issues, because S2–S7 changed and added server files, tests, dependencies and scripts without mirroring
them into `plugin/templates/kb/`. The check is a CI gate (`.github/workflows/plugin-ci.yml`), and the
template is what `/knowledge:setup` scaffolds for a new user, so it must run the same code.

## Do

1. Read `scripts/plugin_parity.py` and `plugin/templates/manifest.json`, which defines the file classes
   (`identical`, `parameterized`, `template_only`) and `shipped_dirs`. Also read `plugin/setup/render.py`.
2. Run `python3 scripts/plugin_parity.py` and work through every issue:
   - **`identical` byte drift:** copy the repo file over the template copy.
   - **A new file in a shipped dir** (`server/books.py`, `server/books_api.py`, `server/assets.py`,
     `server/native_ingest.py`, `server/native/**`, new tests and fixtures, and so on): add it to the
     template. If the manifest lists files explicitly per class, add entries.
   - **Parameterized files** (for example `pyproject.toml`, `uv.lock` or `.gitignore`, if they are in that
     class): edit the template source so that rendering with `params.operator.json` reproduces the repo
     file byte for byte. Keep the parameter placeholders intact.
   - **Root-only files** that must never ship (`scripts/migrate_books.py`, `scripts/migrations/`,
     `scripts/publish_fixture_book.py`, `tests/fixtures/book/`, the test for the migration tool): if the
     completeness check flags them, classify them as root-only per the manifest's own convention, the way
     `scripts/plugin_parity.py` itself is. Decide per file. A file a new user's scaffold needs to run the
     server ships; a P30 operator tool doesn't.
3. Re-run until it prints PASS. Also run `python3 scripts/skills_parity.py`, which must still pass.
4. **Don't change any root (repo) file's behaviour.** This slice only edits `plugin/templates/` and the
   manifest. If parity can only pass by changing a root file, stop and say why in `result.md`.

## Validation

- `python3 scripts/plugin_parity.py`: **PASS**.
- `python3 scripts/skills_parity.py`: PASS.
- `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: unchanged, 197.
- `python3 scripts/workflow.py validate`.

## Notebook

- `phase.md`:
  - add to the standing-gates note: "`python3 scripts/plugin_parity.py` must pass after every server slice:
    mirror new and changed server files into `plugin/templates/kb/` in the same slice (from P30.F1)";
  - one Doc impact line: `operations.md`, template parity restored;
  - `## Now`.
- `result.md`: verdict block first.

## Dispatch

slice=P30.F1
phase=P30
kind=fix
risk=low
attempt=1
route=mid
reason=kind fix rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
