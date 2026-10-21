# P31.S1 result — `knowledge check`: dry-run validation endpoint and CLI

## Verdict

- status: done
- tier: high
- model: opus
- effort: high
- summary: Added `POST /api/documents/check`, a dry run that shares one validation function (`_check_document`) with `POST /api/documents` and writes, locks, registers and meters nothing. Added `knowledge check FILE` (CLI 0.2.0, `save`'s shared flags, exit 0/1/2). Covered by two core server tests and one CLI exit-code test, and verified live on a scratch stack.
- files_changed: server/main.py; plugin/templates/kb/server/main.py; tests/test_document_check.py; plugin/templates/kb/tests/test_document_check.py; cli/src/knowledge_cli/{client.py,knowledge.py,native.py,guide.py,__init__.py}; cli/pyproject.toml; cli/uv.lock; cli/tests/test_knowledge.py; works/phases/active/P31/phase.md; this file
- validation:
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: PASS, 231 (229 + 2 new)
  - `cd cli && uv run pytest -q`: PASS, 56 (55 + 1 new)
  - `python3 scripts/plugin_parity.py`: PASS (it failed until the template mirror described below was added)
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/workflow.py validate`: PASS (only the existing stale-docs and oversized-section warnings)
  - live scratch stack on `:8791`: PASS (below)
- deviations:
  - The plugin template mirror (`plugin/templates/kb/server/main.py`, `plugin/templates/kb/tests/test_document_check.py`) was required by the `plugin_parity` gate. `plugin/skills/explain/` is untouched.
  - The check's 200 carries more than the plan's minimum: `previous_version`, `project`, `slug`, `date`, plus native `warnings`/`migrated_from`. These are additive (OQ2).
  - The check also runs `_place_variant` (read-only) so it reports the chapter-binding 409s a publish meets under its lock (OQ2).
  - `knowledge guide` gained one bullet on `check`. The guide is the agent contract, and its own docstring says edits to `save` must update it.
  - `save`'s FILE help now reads "the file to publish" because the argparse setup is shared. `save`'s behaviour is unchanged.
- doc_impact: two lines appended to `## Doc impact` (architecture/api: the route; operations: `knowledge check` + CLI 0.2.0)

## What was built

**Server (`server/main.py`).** I moved everything in `create_document` before `with WRITE_LOCK` verbatim into `_check_document(body, ctx, conn) -> _CheckedWrite`, using a scripted cut so nothing was retyped. This covers the string 422s, the body-limit/asset list, placement/version target, format/project 422s, the migration 409, the exists/stem 409s and the native-parse list 422. `create_document` calls it and unpacks the same 23 locals, so everything from the lock onward is byte-for-byte the old code. `create_document`'s dependencies (`ensure_registry_project`, `resolve_org_slug`) and its usage hint are unchanged.

`check_document` (`POST /api/documents/check`) depends only on `resolve_api_write` and `get_conn`. It never touches `ensure_registry_project`, `resolve_org_slug`, `WRITE_LOCK` or `request.state.usage`. It calls `_check_document`, then for a placed chapter calls `_place_variant`, which only builds the manifest, to surface the binding 409s and `book_created`/`chapter_created`.

Route list and rate limits: there is nothing to add. `deploy/knowledge.conf` sends every `/api/` prefix to the API, with no per-route list and no `limit_req_zone`. Auth is the same `resolve_api_write` dependency. There is no path collision because the only other `/api/documents/{x}` routes are GET/DELETE.

The one thing a check touches is `db.connect()`, which ensures the SQLite schema, as every GET does. It adds no data and makes no file under the content root.

**CLI.**
- `client._document_body` is now shared by `document_create` and the new `document_check`.
- `knowledge._publish_fields` builds the request once for `save` and `check`, keeping `save`'s validation order (title, tags, project, native fields).
- `_add_publish_args` holds `save`'s argparse flags, shared by both subparsers.
- `native.rejected_message(detail, dry_run=True)` reads "the server would reject this publish (N problems):".
- 409s print the server's `message` plus `hint`.
- Exit codes: 0 ok; 1 for a 422, a 409 or a local refusal; 2 for 401/403, a 404/405 (a server without the route), any other status, a transport failure, or no token.
- Version is now 0.2.0 in `pyproject.toml`, `__init__.py` and `uv.lock`.

## Tests

- `tests/test_document_check.py::test_a_check_writes_nothing` (Postgres-gated, uses the existing `documents_client` fixture). Setup: a fresh signed-up tenant, `KB_ROOT` set to a seeded git repo, and a check of a native chapter that would create a new project, a book/chapter and an image asset.
  - After the check, all of these are unchanged: the content files, git HEAD, the tenant's `projects` and `usage_events` counts, and its SQLite document count.
  - A real POST of the same body then gets 201 at the same rel_path, v1.
  - Mutation check: temporarily adding `Depends(ensure_registry_project)` to the check route made this test fail. I then restored the file.
- `tests/test_document_check.py::test_check_and_publish_agree` (legacy mode, public root with git). Cases: every `err-*.md` fixture (header stripped, as the CLI sends it), a bad-tags string 422, and an existing-document 409.
  - For each case, check first, then publish. A refusal must match on status and JSON body; a 201 must match the check's 200 on `rel_path` and `version`.
  - HEAD never moves on a check.
  - Statuses seen: {201, 409, 422}. `err-header` publishes fine through the API, because the server writes the header.
- `cli/tests/test_knowledge.py::test_check_exit_codes_are_the_verdict`: a mocked transport returning 200 → 0 (exact OK line), a 422 list → 1, a 409 → 1, a 401 → 2, ConnectError → 2.

## Live verification (scratch stack)

Setup:
- API: `uv run uvicorn server.main:app --host 127.0.0.1 --port 8791` with `KB_ROOT=<scratchpad>/kb` (a fresh git repo, seed commit `25bf936`), `KB_API_TOKEN=scratch-token`, no `DATABASE_URL` (legacy), no Gemini key, `KB_STARTUP_REINDEX=0`.
- CLI: installed from source into a scratch venv (`uv pip install ./cli`; `knowledge --version` → `knowledge-cli 0.2.0`), with an isolated HOME.
- Never `:8766`/`:3030`. Only my own uvicorn PID was killed at the end, and port 8791 was confirmed free.

| command | result |
|---|---|
| `check chapter.md --project scratch --book guide --book-kind codebase --chapter ch1 --asset fig=fig.png` | exit 0, `OK — would publish scratch/2026-10-21-why-lanterns-glow.md (v1)`, plus `note: warning: line 3: [ref-unresolved] …` |
| same with `--json` | exit 0, the 200 (`book_created: true`, `chapter_created: true`, `warnings`) |
| `check err-refs.md --title Refs --tag a,b` | exit 1, `the server would reject this publish (10 problems):` then 10 `line N: [code] …` lines |
| `check … --tag Bad_Tag,x` | exit 1, local tag refusal |
| `KB_API_TOKEN=wrong … check` | exit 2, API key rejected |
| `--base-url http://127.0.0.1:8799 check` | exit 2, `cannot reach …` |
| after those checks | git log only `25bf936 seed`; files only `docs/index.md` (+ the SQLite created at boot); 0 documents, 0 versions, 0 books |
| `save` chapter, then `save` a loose note (real publishes) | ids 1, 2 |
| `check note.md` (duplicate) | exit 1, `a publish would be refused: document already exists at scratch/2026-10-21-a-loose-note.md` + the new_version hint |
| `check chapter.md … --chapter ch1` again | `OK — would publish … (v2)` |
| `check chapter.md --chapter ch9 --new-version --rel-path …` | exit 1, `… is already chapter 'ch1' (en) of book 'guide'; a document belongs to at most one chapter` |
| snapshot before vs after those three checks | identical: HEAD `4c66268`, file-list hash `e38b64fb812b`, 2 docs / 0 versions / 1 book |
| `curl -X POST …/api/documents/check` (duplicate body), and with no auth | 409; 401 |

## Notebook

`phase.md` updates:
- `## Doc impact`: two lines.
- `## Operator Questions`: OQ2 and OQ3, both `decided:` (unattended choices).
- `## Notes for later slices`: consumed the DECOMP→S1 note and added the S1→S2 note (version gate, exit codes, curl form).
- `## Now`: rewritten.

For a later server-changing slice: `plugin_parity` requires mirroring `server/*` and `tests/*` into `plugin/templates/kb/`.
