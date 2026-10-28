# P34-n0.S2 — Make the published tree mirror project visibility

## Goal

One idempotent reconcile routine makes tenant #1's git tree match the registry. A private project's footprint is untracked (the files stay on disk), its bullets leave `docs/index.md`, and it is marked in the `info/exclude` block. A public project's footprint is unmarked, its landing and bullets come back, and it is published. Two entry points share it: the visibility toggle, for one project, and a one-shot command, for every tenant #1 project, with `--dry-run`. Code and tests here, in this checkout. No server step, no push.

Read first: `## Now`, the S2-tagged entries in `## Notes for later slices`, `## Decisions` (Footprint, Publish gate module, Exclude block, Guard fails closed), `topics/publish-paths.md`, and S1's `result.md` (what landed in `server/publish_gate.py` and `server/gitops.py`).

## The approach (pinned)

1. **New module `server/reconcile.py`**, runnable as `python -m server.reconcile [--dry-run] [--push]`, the same way `server.seed` runs. Its core is a sync `reconcile(projects, *, kb_root, db_conn, tenant_db_id, only=None) -> Report`. `projects` maps tenant #1's registry project names to their visibility, taken from Postgres by the caller, and `only` narrows the run to one name for the toggle. The routine acts **only** on names in `projects`. It never touches a `docs/` dir that is not a registry project (site, workspace and top-level pages).
   - **To private** (any non-`public` project with a tracked or published footprint, or one not yet marked):
     1. Rewrite the exclude block **first**, with the full private set, using `gitops.write_private_projects`, so the guard holds even if a later git step fails.
     2. Untrack the footprint: `docs/<p>/`, `docs/.versions/<p>/`, `docs/.books/<p>/`. Use a new `gitops` primitive (`git rm -r --cached --quiet --ignore-unmatch --literal-pathspecs -- …`) that only the reconcile calls. It bypasses the guard on purpose and never deletes from disk.
     3. Strip every bullet that links into the project from `docs/index.md`. Add a pure helper beside `remove_recent_bullet` in `server/documents.py`.
     4. Stage `docs/index.md`. The guard passes once no marked link remains.
   - **To public** (a `public` project that is marked, or whose files are untracked):
     1. Unmark it.
     2. `ensure_project_landing`.
     3. Rebuild its bullets from the documents database: tenant #1's rows for that project (date, title, rel_path), inserted oldest first through `update_recent_index`, whose dedupe keeps existing bullets. Check which `tenant_id` stamp tenant #1's `docs/` rows carry (the reindex stamps them), and cover it.
     4. Stage the footprint dirs that exist, plus `docs/index.md`, through `gitops.add`. The `.assets` drop still applies.
     5. If staging or the commit fails, re-mark the project and report the failure.
   - **One commit per run**, made only when something is staged (check the index, never an empty commit). When anything was unpublished, the message names no project: `docs: unpublish private projects (N)`. Publish-only runs may name the public projects. A second run with nothing to change makes no commit.
   - The `Report` lists per project the action, the paths untracked or staged, the bullets removed or added, and the commit sha. Only the CLI prints it, on the terminal. It never goes into a repo file.
2. **The CLI** (`main()` in the module):
   - Refuse in legacy mode (no `DATABASE_URL`).
   - Resolve tenant #1 with `api_auth.get_tenant_one_id()` and read its registry projects through the accounts service (async, awaited in the CLI itself; the sync worker wrapper fails closed outside a worker thread).
   - If the registry cannot be read, exit non-zero with **no change**. Never treat "unknown" as "unpublish everything".
   - It is another process, so it cannot hold `WRITE_LOCK`. Its docstring and `--help` say it runs only while KB writes are paused. Before any git step it waits up to ~10 s for `.git/index.lock` to clear, then refuses.
   - `--dry-run` computes the report without writing a byte, the exclude file included.
   - `--push` runs `gitops.push` once after a commit. Without it, nothing is pushed. Print what was committed and that a push is still owed.
   - The S4 invocation will be `docker exec knowledge-api python -m server.reconcile --dry-run` (confirm the container name and `KB_ROOT` from `compose.prod.yml`, and record the exact line in `result.md` for S4).
3. **The toggle** (`set_project_visibility`, `server/app_api.py` ~L221):
   - After the registry update, and only when the project belongs to tenant #1 (compare with `get_tenant_one_id()`; other tenants keep today's behaviour, since their content is not in git), run `reconcile(..., only=<name>)` in a threadpool **under `WRITE_LOCK`**.
   - Then queue the push on the publish worker exactly as a write does (`publish.submit(..., _push_task(...))`, `KB_GIT_PUSH`-gated).
   - Postgres goes first and git second. A git failure keeps the new visibility, and the response carries it in an added optional field (for example `"publish": {"committed": …, "error": …}`). The existing `"project"` key is unchanged.
   - Move `WRITE_LOCK`, and `_push_task` if the toggle needs it, into a shared module that both `main` and `app_api` import. `main` keeps exporting the same names, so nothing else changes. Never import `server.main` from `app_api` or `reconcile`.
4. **Hygiene in the code itself:** no message, log line or commit message on the unpublish path names a project. The dry-run report prints names on the operator's terminal only.

## Tests (tiny, core behaviour only)

One new file, `tests/test_reconcile.py`, in a temp git repo with a temp documents DB, invented names (`priv-fixture`, `pub-fixture`, plus one non-registry `docs/` dir), and no Postgres for the core cases:
- A tracked private project: after `reconcile`, its footprint is untracked but still on disk, its bullets are gone, it is marked, there is exactly one commit, and the commit message holds no project name. A second run makes no commit. The non-registry dir is untouched.
- A marked project toggled public: after `reconcile`, it is unmarked, its landing exists, its bullets are rebuilt, and its files are tracked in one commit.
- `--dry-run` writes nothing (the tree, the index and the exclude file are byte-identical).

If cheap, add one Postgres-gated toggle test through the app route (the `_set_public` pattern in `tests/test_public_read.py`). Then run the whole suite without and with a throwaway Postgres container, as S1 did: `docker run --rm -d … postgres:17` on a free port, `KB_TEST_DATABASE_URL`, then stop and remove it, leaving every other container untouched. Report the counts.

## Shipped payload

Copy each changed or new `server/` and `tests/` file byte-identical to `plugin/templates/kb/` (repo-only test files excepted, as S1 found), list new files in `plugin/templates/manifest.json`, and run `python3 scripts/plugin_parity.py` (PASS).

## Set (edit nothing outside it)

`server/reconcile.py` (new), `server/app_api.py`, `server/gitops.py`, `server/documents.py`, `server/publish_gate.py`, `server/main.py` (lock and push-task move only), one new shared module for the lock if you create it, `tests/test_reconcile.py` (new), existing tests you must adjust, their `plugin/templates/kb/` copies, `plugin/templates/manifest.json`.

## Notebook at the end

- `## Decisions`: the reconcile contract (directions, one commit per run, unpublish messages name nothing, an unreadable registry means no change) and the CLI line, one gist line each.
- Consume the S2 notes. Add notes for S3, covering what the deploy must carry and the probe. Add notes for S4: the exact CLI invocation, the dry-run's output shape, the `--push` step, and that pulling into this laptop afterwards deletes the private files here.
- `## Doc impact`: an `operations.md` line (the reconcile command and toggle behaviour) and an `architecture.md` line (the lock move).
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
