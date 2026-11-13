# P34-n0.S2 — Make the published tree mirror project visibility: result

## Verdict

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: One idempotent routine, `server/reconcile.py` `reconcile()`, now makes tenant #1's git tree mirror the registry. A private project is untracked (its files stay on disk), unlisted from `docs/index.md` and marked. A public one is unmarked and gets its landing and its bullets back from the documents DB. Each run makes at most one commit, and an unpublish commit names no project. It runs from the tenant #1 visibility toggle (under `WRITE_LOCK`, now in `server/write_lock.py`, then the push is queued) and from the CLI `python -m server.reconcile [--dry-run] [--push]`.
- files_changed: server/reconcile.py (new), server/write_lock.py (new), server/app_api.py, server/gitops.py, server/documents.py, server/main.py, tests/test_reconcile.py (new), plugin/templates/kb/server/reconcile.py (new), plugin/templates/kb/server/write_lock.py (new), plugin/templates/kb/server/app_api.py, plugin/templates/kb/server/gitops.py, plugin/templates/kb/server/documents.py, plugin/templates/kb/server/main.py, plugin/templates/kb/tests/test_reconcile.py (new), plugin/templates/manifest.json, works/phases/active/P34-n0/topics/reconcile.md (new), works/phases/active/P34-n0/phase.md (through `phase-section`)
- validation:
  - `.venv/bin/python -m pytest -q tests/test_reconcile.py`: PASS, 3 passed, 1 skipped (the Postgres-gated toggle test).
  - `.venv/bin/python -m pytest -q tests` without Postgres: PASS, 170 passed, 69 skipped. The baseline was 167 passed and 68 skipped. The extra skip is the new toggle test; the other 68 are the Postgres-gated tests S1 listed.
  - `KB_TEST_DATABASE_URL=<throwaway postgres:17 on 127.0.0.1:65353> .venv/bin/python -m pytest -q tests`: PASS, 239 passed, 0 skipped (baseline 235). The new toggle test ran there.
  - The new tests carry weight. A throwaway mutation file in the scratchpad (never in the repo) caught 5 of 5 breakages: a no-op `untrack`, no index strip, no DB bullets, a dry run that writes, and an unreadable registry treated as empty.
  - A throwaway failure-path file (scratchpad, 5 passed) checked the paths the shipped tests skip:
    - A publish staging failure re-marks the project and strips its lines, the unpublish still commits, and a re-run publishes it.
    - A commit failure re-marks, and a re-run converges to one commit (it still sees `HEAD`'s copy as tracked).
    - `gitops.untrack` refuses anything but footprint directories.
    - Never-project names (for example `assets`, a top-level page, an invalid name) are skipped.
    - Out-of-scope marked lines no longer block a toggle's publish.
  - A throwaway end-to-end CLI probe used the real `python -m server.reconcile` in a subprocess, with an invented operator, tenant #1 and projects seeded into the throwaway Postgres, a scratch repo and a local bare remote. The runs:
    - `--dry-run --verbose`: no change.
    - A real run: one commit, `docs: unpublish private projects (1), publish public projects (1)`.
    - A second run: `nothing to commit`.
    - `--push` with nothing to push: `push: nothing to push`.
    - A re-tracked private file, then `--push`: committed and pushed to the bare remote.
    The non-registry `docs/stylesheets/` stayed tracked throughout.
  - `python3 scripts/plugin_parity.py`: PASS.
  - `python3 scripts/workflow.py validate`: passed (its warnings were there before this slice).
  - Safety: this checkout's `.git/info/exclude` sha256 and `HEAD` were the same before and after every run, and `docs/` stayed clean, so no test or probe reconciled the real tree. The throwaway container `p34s2-reconcile-test-pg` was stopped (`--rm` removed it). The 15 other running containers were not touched.
- deviations:
  1. **Block-write order.** The first write marks the full private set, as the plan says. The public projects about to publish are unmarked just before the index strip, not one by one right before staging. That way the index line of a project that is marked but now public never blocks the index from staging. Every failure re-marks.
  2. **Out-of-scope marked projects.** Every run removes index lines that link into any marked project, in scope or not. The guard refuses an index that links into any marked project, so without this a toggle's publish could fail on another project's leftover lines. These are counted, never named, and they make the run's message the unpublish form.
  3. **To-public trigger.** Widened from "files untracked" to "files `git add` would stage": untracked files (honoring `.gitignore`, not `info/exclude`) or tracked files that were modified. The staged list comes from `git diff --cached`, so a stray modified file of a public project is committed, never left staged without a commit. The landing is created only when `docs/<p>/` exists.
  4. **Bullets.** They are read for both stamps (tenant #1's uuid and `''`). A row whose file is gone from disk gets no bullet, to avoid dead links.
  5. **Defense in depth.** A registry name is skipped when it is not a valid project-dir name, is a never-project dir (`.versions .books .assets current versions reference assets stylesheets javascripts`) or is a top-level page. `gitops.untrack` raises `ValueError` for anything but a project's three footprint dirs. `--literal-pathspecs` sits before the subcommand, where git requires it.
  6. **CLI.** `--push` also pushes when `HEAD` is already ahead of `origin/main` with nothing else to change, as the retry for an owed push. `--verbose` lists paths. The dry run opens the documents DB read-only (`mode=ro`), so it writes nothing at all.
  7. **Toggle.** It reconciles only when `KB_GIT_COMMIT` is on. Its `"publish"` field is `{action, committed, commit_sha, push_pending, error}`. The error names only a stage (`read`, `exclude`, `untrack`, `index`, `publish`, `commit`, `reconcile`), never a project or path. An unresolvable tenant #1 returns that error rather than skipping silently.
  8. **Tests.** The CLI-refusal check (legacy mode, unreadable registry, no change) is folded into the dry-run test as a fourth core case. `server/publish_gate.py` did not need a change, and no existing test needed adjusting: the toggle of a fresh project in `test_private_publish.py` and `test_migrate_books.py` reconciles to `none`.
- doc_impact: two `## Doc impact` lines, one for operations.md (the reconcile command and the toggle's behaviour) and one for architecture.md (the lock move, the reconcile module and its `gitops` primitives, the optional `"publish"` field).

## What changed

**`server/reconcile.py` (new).**

*Classify (read-only).* For each in-scope registry name:
- private → `unpublish` when its footprint is tracked (index or `HEAD`) or `docs/index.md` (work tree, index or `HEAD`) links into it; else `mark` when it is not marked; else `none`;
- public → `publish` when it is marked or has stageable files; else `none`.

*Real run, in order:*
1. The block is rewritten with the full private set (`gitops.write_private_projects`).
2. `gitops.untrack` runs for each unpublishing project.
3. The publishing projects are unmarked. The index lines that link into any still-marked project are stripped (`documents.remove_project_bullets`), and the index is staged.
4. Each public project gets its landing and its bullets (`update_recent_index`, oldest first), then its existing footprint dirs (plus the index if bullets were added) are staged.
5. There is one commit, when this run staged something and `git diff --cached` is non-empty.

The `Report` carries each project's action, its untracked or staged paths, the bullets removed or added, and the commit sha. `format_report` prints it on the terminal; nothing writes it to a file. The CLI `main()` works like this:
- It refuses with no `DATABASE_URL` (exit 2).
- It resolves tenant #1 and reads `list_projects_for_tenant` asynchronously in its own event loop (the oldest row wins on a duplicate name). It disposes the engine afterwards.
- On a registry failure or an unresolved tenant it exits 3 with no change.
- It waits up to 10 s for `index.lock`, else exits 4.
- After the run it prints the report, then pushes only with `--push`.

**`server/gitops.py`.** New: `unmark_private`, `footprint_dirs`, `tracked_paths` (index ∪ `HEAD`), `pending_paths`, `staged_paths`, `untrack` (the guard bypass, footprint dirs only, `--cached`), `has_staged_changes`, `show` and `index_lock_path`. The existing guard is untouched.

**`server/documents.py`.** New pure helper `remove_project_bullets(index_text, project) -> (text, count)`, beside `remove_recent_bullet`. It matches exactly what the guard matches (`](<p>/`, `](./<p>/`).

**`server/write_lock.py` (new) and `server/main.py`.** `WRITE_LOCK` and `push_task` now live in `write_lock.py`. `main` keeps `WRITE_LOCK = write_lock.WRITE_LOCK` and `_push_task = write_lock.push_task`, so it is the same object and every caller is unchanged. Its unused `threading` import was dropped. Neither `app_api` nor `reconcile` imports `server.main`.

**`server/app_api.py`.** `set_project_visibility` updates Postgres first. Then, for a tenant #1 project with git commits on, `_mirror_visibility` runs:
- `reconcile({name: visibility}, only=name)` in `run_in_threadpool`, under `WRITE_LOCK`, with its own SQLite connection opened in the worker thread;
- then, when the run committed and `KB_GIT_PUSH` is on, it queues `push_task` on the publish worker, outside the lock.

The response keeps `"project"` and adds `"publish"`. Log lines name only the stage.

## For S4: the exact invocation

`docker exec knowledge-api python -m server.reconcile --dry-run`, then, after the operator confirms, `docker exec knowledge-api python -m server.reconcile --push`.

`compose.prod.yml` confirms the setup: container `knowledge-api`, `KB_ROOT: /repo`, workdir `/repo`, with `DATABASE_URL`, `KB_OPERATOR_EMAIL` and `GIT_SSH_COMMAND` in the container env. The output shape, the exit codes and the toggle contract are in `works/phases/active/P34-n0/topics/reconcile.md`.

## Notebook

All writes went through `phase-section`. `## Decisions` gained three gist lines: the reconcile contract, the CLI, and the toggle with the lock move. The six consumed S2 notes were removed (the DECOMP note tagged for S2 and S4 was folded into the new S4 notes). Two notes for S3 and two for S4 were added. `## Doc impact` gained the operations.md and architecture.md lines. `## Now` was rewritten. Long material is in `topics/reconcile.md`.

## Observations (not acted on)

- Rebuilt bullets go in at the Recent marker, oldest first, as the plan pins. A republished project's bullets therefore sit at the top of Recent whatever their dates. This is recorded in the topic so the review can weigh it.
- A public project marked by an S1 lookup failure stays marked until a toggle or a CLI run, and while its lines are in the index every public write that stages the index is refused. That is unchanged from S1 and fails closed; re-toggling is now the fix.
