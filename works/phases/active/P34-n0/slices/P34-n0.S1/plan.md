# P34-n0.S1 — Gate publishing on project visibility

## Goal

A tenant #1 write publishes (commit, `docs/index.md` bullet, project landing) only when its registry project is `public`. A private project's write never stages, never commits, never touches `docs/index.md` or `docs/<project>/index.md`, and a guard in `gitops` refuses private paths whatever a caller passes. Legacy mode (no `DATABASE_URL`, `ctx.tenant_id is None`) stays byte-for-byte. Code and tests here, in this checkout; no server step, no push.

Read first: `topics/publish-paths.md` (the code map), `## Decisions` (Publish rule, Footprint, Decided as drawn), `## Notes for later slices` entries tagged for S1. Re-read each line number at its path; they are from 16d92a8.

## The approach (pinned)

1. **One shared rule, one new module** (`server/publish_gate.py`, or a better name you record in Decisions). `async def project_publishes(ctx, project) -> bool`:
   - legacy mode (`ctx.tenant_id is None`) → `ctx.is_public` (today's behaviour);
   - not tenant #1 (`not ctx.is_public`) → `False`;
   - tenant #1 → `get_accounts_service().get_project_by_name(ctx.tenant_id, project)`; `True` only when the record exists and `.visibility == "public"`; a missing row or **any** exception → `False` (fail closed, logged).
   - A sync wrapper for the sync handlers, via `reader_state.run_from_worker` (FastAPI runs sync handlers on a worker thread). Never import `server.main` from the new module.
2. **Save** (`create_document`, `server/main.py` ~L1303): carry visibility in from the async dependency side. Widen `ensure_registry_project` (it already loads the record) to also yield whether the project publishes, by the rule above, or add a sibling async dependency; the handler keeps using the registry id where it does today. Then gate on `publishes` (not `ctx.is_public` alone): `ensure_project_landing`, `replace_recent_link`, `update_recent_index` (~L1497) and the commit block (~L1566). `_tenant_root` and the DB write stay as they are (private files still land in `docs/<project>/`). A lookup failure on a would-be public project leaves the write saved, `committed: false`, and `commit_error` saying publishing was skipped because visibility could not be read; a deliberate private skip reports `committed: false` with no error, like `commit: false`. The push is queued only after a commit (confirm at ~L1620).
3. **Delete** (`_delete_document` ~L1796, callers: the two `/api` handlers ~L1914/~L1939 and the app delete in `server/documents_api.py` ~L819): the callers pass `publishes` (the app delete is async: await the rule there; the `/api` handlers use the sync wrapper or an async dependency, your choice). Commit only when `publishes`. `remove_from_recent_index` keeps running for tenant #1 whatever the visibility: removing a bullet never leaks, and a private bullet already in the index should go.
4. **Book manifest** (`put_book` ~L2024, commit ~L2120): commit only when `publishes`.
5. **The guard in `gitops`** (no DB; file and git only). A managed block in the checkout's `info/exclude`, located with `git rev-parse --git-path info/exclude` (never a hard-coded `.git/` path), delimited by fixed marker lines, holding each private project's footprint as `/docs/<p>/`, `/docs/.versions/<p>/` and `/docs/.books/<p>/`:
   - `gitops.mark_private(project, *, root)`: idempotent add of a project's three lines. `gitops.private_projects(root)` reads the block back. (S2 adds the unmark and the full re-sync; leave the block format easy to rewrite whole.)
   - `add` and `remove` **raise `GitError`** (fail closed: the write stays, `committed: false`, `commit_error`) when any path falls in a marked private footprint, and when `docs/index.md` is among the paths and its text links into a marked private project (`](<p>/`). Keep the `.assets` drop as it is.
   - The save path calls `mark_private` on every private tenant #1 write when `config.git_commit_enabled()` (the checkout is a repo); a failure to write the exclude file is logged, never fails the write.
   - The block lives only in the server checkout's `info/exclude`, never in a tracked file: a tracked `.gitignore` would publish the names.
6. **Commit messages** stay as they are: only public projects commit now.

## Tests (tiny, core rule only)

One new file, `tests/test_private_publish.py`, with invented project names (never a real `docs/` project name):
- the rule: legacy → publishes; tenant #1 + public → publishes; private, missing row, lookup raising → does not (a fake accounts service, no Postgres);
- the guard, in a temp git repo: after `mark_private`, `add` of a footprint path raises; `add` of `docs/index.md` holding a private bullet raises; a public path stages; the exclude block round-trips.

Then run the existing suite (`python3 -m pytest -q tests`) and report pass/skip counts. The Postgres-backed tests skip without `KB_TEST_DATABASE_URL`. Tenant #1 save/delete tests that assert a commit will now need their project set public (`tests/test_public_read.py`'s `_set_public` pattern). To run them, start a throwaway Postgres container on a free port (`docker run --rm -d -e POSTGRES_PASSWORD=… -p <free port>:5432 postgres:16`), point `KB_TEST_DATABASE_URL` at it, run the affected files, and stop it. Leave the other running containers on this machine untouched. If Docker cannot run it, say which tests skipped.

## Shipped payload

Copy every changed or new file under `server/` and `tests/` byte-identical to `plugin/templates/kb/`, list a new file in `plugin/templates/manifest.json`, and run `python3 scripts/plugin_parity.py` (must print PASS).

## Set (edit nothing outside it)

`server/main.py`, `server/gitops.py`, `server/documents_api.py`, `server/documents.py` (only if a helper lands there), the new rule module, `tests/test_private_publish.py`, existing test files you must adjust for the new rule, their copies under `plugin/templates/kb/`, `plugin/templates/manifest.json`.

## Hygiene

This repo is public: no private project name, document title, tenant id or secret in code, tests, `result.md` or the notebook.

## Notebook at the end

- `## Decisions`: the module name and the guard's fail-closed behaviour and block format, one gist line each.
- Remove the S1-tagged notes you consumed; add notes for S2 (the block helpers it extends, the lock and module facts) and S3 (the response fields an operator sees on a private probe write).
- `## Doc impact`: a line for `architecture.md` / `operations.md` on the publish rule and the exclude block.
- Rewrite `## Now`.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
