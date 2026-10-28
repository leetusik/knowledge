# P34-n0.S1 — Gate publishing on project visibility: result

## Verdict

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: Tenant #1 writes now publish (commit, `docs/index.md` bullet, project landing) only when the registry project is `public`. The rule lives in the new `server/publish_gate.py` and is applied on every commit path: save, both `/api` deletes, the app delete and the book PUT. A private write still lands in `docs/<p>/` but never commits, and it marks the project in a managed block in the checkout's `info/exclude`. `gitops.add`/`remove` refuse any staging that would publish a marked project (fail closed). Legacy mode is unchanged.
- files_changed: server/publish_gate.py (new), server/main.py, server/gitops.py, server/documents_api.py, tests/test_private_publish.py (new), tests/test_migrate_books.py, plugin/templates/kb/server/publish_gate.py (new), plugin/templates/kb/server/main.py, plugin/templates/kb/server/gitops.py, plugin/templates/kb/server/documents_api.py, plugin/templates/kb/tests/test_private_publish.py (new), plugin/templates/manifest.json
- validation:
  - `.venv/bin/python -m pytest -q tests` without Postgres: PASS, 167 passed, 68 skipped (baseline before the change: 164 passed, 67 skipped). The 68 skips are the Postgres-gated tests, by file: accounts_provisioning 10, documents_api 9, public_read 9, graph_api 8, review 7, org_credentials 5, reader_state 5, books 4, dashboard_api 3, anchors 2, and one each in assets, document_check, html_documents, migrate_books, native_ingest and private_publish (the end-to-end tenant #1 case).
  - `KB_TEST_DATABASE_URL=<throwaway postgres:17 container> .venv/bin/python -m pytest -q tests`: PASS, 235 passed, 0 skipped (baseline 231 passed). The run before the `test_migrate_books.py` fix failed exactly that one test, as predicted (it asserted that a tenant #1 book PUT commits).
  - The new tests carry real weight. With `gitops._refuse_private` stubbed out, `test_the_guard` fails. With `publish_gate.decide` forced to publish, the end-to-end tenant #1 test fails.
  - A throwaway probe, deleted afterwards and never in the repo, confirmed the paths the shipped tests do not cover. A private book PUT returns `committed:false` with no error, and its manifest stays out of `git status`. A private app delete returns 204 with HEAD unchanged. A public book PUT and a public app delete commit. With the registry down, a save gets `committed:false` plus a `commit_error` starting `publishing skipped:` (and the project is marked), and so does an `/api` delete.
  - `python3 scripts/plugin_parity.py`: PASS.
  - `python3 scripts/workflow.py validate`: passed (its warnings were there before this slice).
  - This repo's own `.git/info/exclude` has the same checksum before and after every test run, so no test wrote outside its temp root. The throwaway container was stopped (`--rm` removed it), and the 15 other running containers were not touched.
- deviations:
  1. App delete: the rule runs in its worker thread through `publish_decision_from_worker`, not awaited in the async handler. The document's project is only known after the worker's tenant-scoped lookup. This is the same bridge `_delete_document`'s reader-state purge already uses on that path.
  2. The `commit_error` for an unreadable visibility is reported on the deletes and the book PUT too, not only on the save. The book PUT also calls `mark_private` for a private project, because a new manifest of an unmarked private project would otherwise show in `git status`.
  3. `gitops.add`/`remove` now run with `--literal-pathspecs`. Without it a glob pathspec could stage more than the guard checked; for the literal paths every caller passes, the behaviour is identical. Ancestors of the footprint (`docs`, `docs/.versions`, `docs/.books`, the repo root) are refused too.
  4. For tenant #1 only, a failed registry get-or-create no longer 500s the save. The write lands unpublished with `commit_error` (the plan's "saved, committed false" outcome). Other tenants keep the old behaviour.
  5. `tests/test_private_publish.py` has one Postgres-gated end-to-end case (tenant #1 private save and delete do not commit, public ones do) beside the rule and guard cases. `tests/test_migrate_books.py` now sets its two projects public first; it is a root-only file, so it has no template copy.
  6. The throwaway Postgres was the local `postgres:17` image, not `postgres:16`, to avoid pulling an image.
- doc_impact: three `## Doc impact` lines, for architecture.md, operations.md and decisions.md (see the notebook).

## What changed

**`server/publish_gate.py` (new).** It holds the one rule and returns a `PublishDecision(publishes, error)`:
- `decide(ctx, record)` is the pure rule;
- `publish_decision` / `project_publishes` are the async callers;
- `publish_decision_from_worker` / `project_publishes_from_worker` are the sync wrappers over `reader_state.run_from_worker`;
- `hide_private_project` calls `gitops.mark_private` for a tenant #1 write that does not publish, only when `git_commit_enabled()`, logged and never fatal.

The constants are `PUBLISHES`, `PRIVATE` and `UNREADABLE`, the last carrying `VISIBILITY_UNREADABLE`. The module never imports `server.main` and never names a project in a log line.

**Save (`create_document`).** `ensure_registry_project` now returns `RegistryProject(id, publish)`, computing `publish` with `publish_gate.decide` from the record it already loads, so there is no extra round trip. The handler then:
- calls `hide_private_project` first inside `WRITE_LOCK`, before any file lands;
- gates `ensure_project_landing`, `replace_recent_link` and `update_recent_index` on `publishes`;
- commits only when `publishes`. A deliberate private skip reports `committed:false` with no error; an unreadable visibility reports `commit_error`.

The push is queued only after a commit (`if committed and git_push_enabled()`, unchanged). `_tenant_root` and the DB write are untouched.

**Deletes.** `_delete_document` takes a required `publish_decision=` and commits only when it publishes. `remove_from_recent_index` still runs for every public-root caller. Both `/api` handlers compute the decision through the worker bridge, and so does the app delete in `documents_api._delete_owned_document`.

**Book PUT.** The decision comes through the worker bridge. `hide_private_project` runs before the manifest is written, and the manifest commits only when the project publishes.

**`gitops`.** The private-projects block in the file `git rev-parse --git-path info/exclude` returns:
- Its markers are `# >>> knowledge server: private projects (managed; rewritten whole) >>>` and `# <<< knowledge server: private projects <<<`, with three sorted lines per project: `/docs/<p>/`, `/docs/.versions/<p>/` and `/docs/.books/<p>/`.
- `write_private_projects(names, root=)` rewrites the block whole (an empty set removes it), keeps every line outside the markers, and writes atomically.
- `mark_private`, `private_projects` and `exclude_path` are built on it.
- `add` and `remove` call `_refuse_private` before staging. It raises `GitError` for a path in a marked footprint or an ancestor of one, and for `docs/index.md` while it links `](<p>/` (or `](./<p>/`) into a marked project. The messages name no project and no path.

## Notebook

Decisions (module, block, guard), notes for S2/S3/S4 and Doc impact lines are in `phase.md`; `## Now` rewritten. The two S1-only notes were removed and the shipped-payload note re-tagged for S2.

## Notes on behaviour the next slices inherit

- A project marked by a private write (or by a lookup failure) stays marked after a toggle to public. Its writes then fail closed with `commit_error` "refused: a path is inside a private project's footprint" until S2's unmark/re-sync runs.
- `gitops.remove` refuses marked footprints, so S2's untrack needs its own primitive.
- While `docs/index.md` still links into any marked project, every public write that stages it is refused. S2's reconcile must strip a project's bullets when it marks it.
- A private write or delete on an already-tracked private file leaves an unstaged change in the tracked tree, because excludes never cover tracked files. That stays until S4 untracks the file.
