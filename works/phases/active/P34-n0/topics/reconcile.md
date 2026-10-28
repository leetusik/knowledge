# P34-n0: the reconcile (written by P34-n0.S2, 2026-10-28)

`server/reconcile.py` makes tenant #1's git tree mirror project visibility. Its module docstring is the full contract; this topic is what S3, S4 and the review need without reading the code.

## Contract

- `reconcile(projects, *, kb_root, db_conn, tenant_db_id=None, only=None, dry_run=False) -> Report`. `projects` maps tenant #1's registry names to visibility (read by the caller); `only` narrows to one name (the toggle). It acts only on those names, never on a `docs/` dir the registry does not name. A registry name that is not a valid project-dir name, or is one of the never-project dirs (`.versions .books .assets current versions reference assets stylesheets javascripts`), or is a top-level page, is `skipped` and never touched.
- **Private** (non-`public`): `unpublish` when its footprint is tracked (index or `HEAD`) or `docs/index.md` (work tree, index or `HEAD`) links into it; else `mark` when it is not marked; else `none`. Order: the exclude block is rewritten first with the full private set; `gitops.untrack` (`git rm -r --cached`, files stay on disk); every index line linking into a still-marked project is removed; the index is staged.
- **Public**: `publish` when it is marked or has files `git add` would stage (untracked, honoring `.gitignore` but not `info/exclude`, or tracked and modified); else `none`. Order: unmark; landing (only when `docs/<p>/` exists); bullets rebuilt from the documents DB (rows stamped with tenant #1's uuid **or** `''`, oldest first through `update_recent_index`, rows whose file is gone skipped); stage the existing footprint dirs plus the index when bullets were added. A staging or commit failure re-marks the project and removes its index lines; re-running is the retry.
- **Out-of-scope marked names:** every run removes index lines linking into any marked project, in scope or not, because the guard refuses an index that links into one. These are counted (`other_projects_stripped`), never named, and count as unpublished in the commit message.
- **One commit per run**, only when this run staged something and the index differs from `HEAD`. Messages: `docs: unpublish private projects (N)`; mixed `docs: unpublish private projects (N), publish public projects (M)`; publish-only `docs: publish <a>, <b>` (names only when at most 3, else a count). A second run with nothing to change commits nothing.
- **Bullet order:** a republished project's rebuilt bullets are inserted at the Recent marker oldest first, so they sit at the top of Recent, newest first, regardless of other projects' dates (the plan's pinned approach).

## The CLI

`python -m server.reconcile [--dry-run] [--push] [--verbose]`, on the server: `docker exec knowledge-api python -m server.reconcile --dry-run` (container `knowledge-api`, `KB_ROOT=/repo`, workdir `/repo`; `DATABASE_URL`, `KB_OPERATOR_EMAIL` and the push key's `GIT_SSH_COMMAND` come from the container env, per `compose.prod.yml`).

Exit codes: `0` done (or dry run); `1` the run stopped on an error, or the push failed (the local commit stays); `2` refused, no `DATABASE_URL`; `3` refused, tenant #1 unresolved or the registry unreadable (nothing changed); `4` refused, `index.lock` still held after ~10 s, or `KB_ROOT` is not a git checkout.

Output shape (invented names; real output names private projects, so it stays on the terminal and never goes into a repo file, the notebook, a commit or an Actions log):

```
reconcile (dry run: nothing written): 3 registry project(s) in scope
  mark      private  default
  unpublish private  priv-fixture  (would untrack 1 file(s); index lines -1)
  publish   public   pub-fixture  (would stage 3 path(s); index bullets +1; landing would be created)
  exclude block: would change
  would commit: docs: unpublish private projects (1), publish public projects (1)
```

`--verbose` lists each path under its project. A real run prints `untracked` / `staged` / `committed <sha>: <message>` and then either `pushed: origin/main is now <sha>` (`--push`) or `push still owed: nothing was pushed (re-run with --push)`. `--push` pushes once after a commit, or when `HEAD` is already ahead of `origin/main` with nothing else to change (the retry for an owed push).

## The toggle

`PATCH /app/projects/{id}` keeps its `"project"` key and, for a tenant #1 project with git commits on, adds `"publish": {"action", "committed", "commit_sha", "push_pending", "error"}`. Postgres first, git second: a git failure keeps the new visibility and returns a generic `error` naming the stage only (`read`, `exclude`, `untrack`, `index`, `publish`, `commit`, `reconcile`), never a project or path. A commit queues the push on the publish worker (`KB_GIT_PUSH`-gated, task name `push visibility reconcile`). Other tenants get no `"publish"` key.
