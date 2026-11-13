# P34-n0: the publish paths (read 2026-10-28 at 16d92a8, by P34-n0.DECOMP)

Line numbers are from that commit. Read each one at its path before relying on it.

## Where a write publishes

- **The tenant gate.** `ctx.is_public` is set in `server/api_auth.py` (L213 and L243): `tenant_id is None` (legacy) or tenant #1. It selects the root (`_tenant_root`, `server/main.py` L323: `docs/` for public callers, `tenants/<uuid>/` otherwise) and gates the three publish-side effects below. Project visibility plays no part in any of them today.
- **Save** (`create_document`, `server/main.py` L1303, a **sync** handler holding `WRITE_LOCK`):
  - `ensure_project_landing` and `update_recent_index`, plus `replace_recent_link` on an html→native migration, all gated by `ctx.is_public` alone (~L1497).
  - The commit at ~L1566: `body.commit and git_commit_enabled() and ctx.is_public`. It stages `docs/<rel>`, `docs/index.md`, the landing (only when created), the `.versions` archive and a book manifest, and runs `gitops.remove` for a migrated `.html`.
  - The push is queued on the publish worker (~L1620).
- **Delete** (`_delete_document`, L1796, sync):
  - `remove_from_recent_index` is gated by `ctx.is_public` (~L1846); the commit by `commit and ... and ctx.is_public` (~L1859); the push at ~L1882.
  - Callers: the two `/api` delete handlers (L1914 and L1939, sync, `Depends(resolve_api_write)`) and the app-side delete in `server/documents_api.py` (~L819 / ~L846-866). The app-side delete builds an `ApiAuthContext` with `is_public = tenant is tenant #1` and always passes `commit=True`.
- **Book manifest** (`PUT /api/books/{project}/{book}`, `server/main.py` L2023-2154): commit at ~L2120, push at ~L2138.
- **Commit messages name the project:** `docs(<project>): add <slug>` / `update <slug> to vN` / `remove <slug>` / `update book <book>`. The slug comes from the title, so the message alone leaks a private project.

## Visibility, and how to get it into a sync handler

- The registry is Postgres, async: `get_accounts_service().get_project_by_name(tenant_uuid, name)` returns a record with `.visibility` (`"private"` or `"public"`). `server/documents_api.py` `_is_publicly_readable` (~L160) is the reader's rule: missing registry row or legacy mode means not public.
- **New projects default to `private`** (`server/accounts/types.py` L63-69). `ensure_registry_project` (`server/main.py` L815) already get-or-creates the record before the save handler runs, but returns only `record.id`. That is the natural place to carry visibility into the save path.
- Sync code can call async code from the handler's worker thread with `anyio.from_thread.run` (`reader_state.run_from_worker`, `server/reader_state.py` L846). It raises outside a worker thread (a script, a CLI).
- The toggle: `PATCH /app/projects/{id}` (`server/app_api.py` L221, async, session-only) calls `service.set_project_visibility`. Tests drive it with `_set_public` in `tests/test_public_read.py`.

## A project's footprint in `docs/` (tenant #1)

- `docs/<project>/` (documents plus the auto landing `index.md`), `docs/.versions/<project>/` (superseded bodies, `server/documents.py` L750-772), `docs/.books/<project>/` (book manifests, `server/books.py` L10 / L270), and its bullets in `docs/index.md` (links of the form `<project>/<date>-<slug>.<ext>`).
- `docs/.assets/<project>/` is never tracked: it is gitignored, and `gitops.add` drops `.assets` paths (L54-63).
- `docs/` also holds directories that are **not** registry projects: site assets (`assets/`, `stylesheets/`, `javascripts/`), the workspace docs (`current/`, `versions/`, `reference/`) and top-level pages (`index.md`, `tags.md`, `graph.md`, `README.md`, `index.json`). A reconcile or purge driven by "everything not public" would wreck them. Drive it only from the registry's private set.

## Git mechanics that bite

- `gitops` (`server/gitops.py`) has no DB access. `add` / `remove` take explicit paths, never `-A`. `push` runs fetch, then `rebase origin/main`, then a non-force push, on the publish worker under `WRITE_LOCK`.
- `.git/info/exclude` hides **untracked** paths only. A tracked file under an excluded directory is still staged by `git add`, so only an explicit guard stops a tracked private file before S4 untracks it.
- `WRITE_LOCK` is a `threading.Lock` in `server/main.py` (L183). `server/app_api.py` is imported by `main`, so importing the lock from `main` would be a cycle. A one-shot CLI runs in another process and cannot hold it at all.
- **The deploy** (`deploy/deploy.sh` L224-288) refuses a dirty tracked tree and prints `git status --short` into the public Actions log when it refuses. It reconciles by fast-forward or **rebase** of local commits onto the fetched `origin/main`, never a reset. `deploy/oracle-production-deploy-remote.sh` L110-144 captures `git status --short --branch` before and after, uploaded as a run artifact (14-day retention). Untracked paths that are not excluded show up there.
- **After a history rewrite**, both `gitops.push` (every write) and `deploy.sh` would rebase the server's old-history commits onto the new origin and push them back. The server checkout must be reset before any write or deploy.
- **Startup reindex** (`KB_STARTUP_REINDEX`, default on) rebuilds the database from disk and never writes `index.md` or git. Keeping private files on disk keeps them readable. Removing a file from disk drops its row.

## Repo facts (read-only checks, 2026-10-28)

- The repo is public, with 0 forks, 0 stars, no tags, no releases, no pull requests and no GitHub Pages. Local `main` is one commit ahead of `origin/main` (the phase-creation commit, unpushed).
- The operator's local plugin marketplace is a **shallow** clone of this repo (`~/.claude/plugins/marketplaces/knowledge`).
- `git-filter-repo` is not installed on this machine.
- `server/*` and `tests/*` are shipped payload: every changed or new file must be copied byte-identical into `plugin/templates/kb/`, a new file listed in `plugin/templates/manifest.json`, and `python3 scripts/plugin_parity.py` must print PASS. It does today.
- Postgres-backed tests run only with `KB_TEST_DATABASE_URL` (or `DATABASE_URL`) set and skip otherwise (`tests/test_documents_api.py` L26).
