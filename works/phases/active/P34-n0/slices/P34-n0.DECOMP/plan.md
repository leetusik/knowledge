# P34-n0.DECOMP — plan (decomposition of "Keep private documents off the public repo")

## Context

The knowledge server publishes on write: tenant #1 (the owner account) writes land in `docs/`, are committed, and (`KB_GIT_PUSH: "true"`, `compose.prod.yml` L58) pushed to `github.com/leetusik/knowledge`, which is **PUBLIC**. The commit gate is the tenant, not the project: `body.commit and config.git_commit_enabled() and ctx.is_public` at `server/main.py` L1566 (save), L1859 (delete), L2120 (book manifest). `ctx.is_public` means tenant #1, whatever the project's visibility. The same `ctx.is_public` alone also gates the home index bullet (`documents.update_recent_index`, `server/documents.py` L643) and the project landing (`ensure_project_landing`, L687), so a private title lands in `docs/index.md` even with `commit: false`, and the next public commit pushes it. Private projects' documents are already in the tree and in history. The operator wants: no private document or title ever committed/pushed again, the existing exposure dealt with, private titles out of the home index (`intent.md`).

Verified for this plan (read-only, 2026-10-28):
- Visibility is already resolved elsewhere: `get_accounts_service().get_project_by_name(owner_uuid, project)` → `.visibility` (used by `_is_publicly_readable`, `server/documents_api.py` ~L178); toggled by `set_project_visibility` (`server/app_api.py` L222).
- `gitops.add` already drops a never-staged path class (`.assets`, `server/gitops.py` L54-63): the pattern for a defence-in-depth guard.
- The repo has 0 forks and 0 stars; GitHub Pages is not enabled (`pages.yml` is a build check only); deploy is the manual-dispatch `Production Deploy` Action (`deploy/README.md` §6); the plugin marketplace is `.claude-plugin/marketplace.json` at the repo root (`source: ./plugin`).

## The slice

`P34-n0.DECOMP`, kind decomposition, high row. The executor investigates the code paths above (and every other `ctx.is_public` / `gitops.*` call site, e.g. the app-side delete in `server/documents_api.py` ~L839), then cuts the phase: middle slices with `new-slice` (bare folders, no `plan.md`), each declared (`--depends-on`), rated with a named trigger, `spends money: no` (nothing here spends). It writes `topics/breakdown.md` (`## Passes`, `## Estimate` from `dispatch-summary` means, one `## <slice id>` block per slice: goal, set, risk + trigger, spends money, depends on), a `Breakdown (DECOMP): …` gist line in `## Decisions`, notes for later slices, `## Now`, and `result.md`. It returns `parallel:` (likely a chain).

### Suggested shape (the executor may re-cut, with reasons in the breakdown)

1. **Gate publishing on project visibility** (implementation, `high`: core invariant, what reaches a public repo). On every commit path, commit only when the owner's project is `public`. For a private project, never write its bullet into `docs/index.md` or create `docs/<project>/index.md`. Add a guard in `gitops.add` that refuses paths under private projects, whatever a caller passes. Keep a private project's files in `docs/<project>/`, untracked, and list those dirs in the server checkout's `.git/info/exclude`, which is local and never pushed. A tracked `.gitignore` would itself publish the project names. Legacy mode (no `DATABASE_URL`) stays byte-for-byte. Add tiny tests for the core rule only.
2. **Make the tree mirror visibility** (implementation, `high`: core invariant plus deletion). Add one reconcile routine, used by the toggle (`set_project_visibility`) and a one-shot command. Public → private: `git rm --cached` the project's files and drop its bullets from `docs/index.md`, in one commit. The files stay on disk. Private → public: publish them. Depends on 1.
3. **Deploy and verify on the server** (operator-action stop). Pushing `main` and dispatching `Production Deploy` need your word at that moment. Verify live afterwards: a private write with `commit: true` makes no commit, no index bullet and no push. A public write still publishes.
4. **Clean the current tree, on the server** (operator-action stop). Back up `docs/` first, then run the reconcile command in the server checkout (`ssh h`). **It must never run as a `git rm` from this laptop:** when the server pulls that deletion, git deletes the private files from the server's disk. The same step handles today's stray state: the uncommitted private document and the modified `docs/index.md`.
5. **Purge history** (only if you choose it, below; `high`: irreversible deletion). On a fresh mirror clone, `git filter-repo` drops the private projects' paths from all history and strips their bullets from every version of `docs/index.md`. Verify that `git log --all` and a grep of every blob find nothing. Force-push only on your literal word at that moment. Then re-sync the server checkout (back up the untracked private files, then reset to the new origin) and this clone. Commit SHAs cited in `works/` records go stale. This step runs only after 3, so no new private commits appear.
6. `REVIEW`, gated.

**Hygiene, binding on every slice:** this repo is public. No private project name, document title, tenant id or secret goes into `plan.md`, `result.md`, `topics/`, test fixtures or commit messages. Tests use invented names.

**Acceptance gate (main thread, after `finish-slice`):** `accept-gate P34-n0 --require`. You can see the result: what is on GitHub, and what the server does on write.

## Decisions for you (answer in your approval, or I proceed as recommended)

1. **What happens to the history?** I recommend **purging it (slice 5)**. Removing the files from the tree alone leaves every private document one `git log` away. The repo has no forks or stars, so a force-push breaks nothing anyone else holds. The cost: GitHub can still serve old commits by SHA until GitHub Support purges them (a request you send), and a plugin install cloned before the purge needs a re-clone. The alternative is making the repo private. That stops everything, bugs included, but breaks public plugin installs unless the plugin moves to its own public repo, which is a bigger phase. I don't recommend it now.
2. **What do we do until the fix is deployed?** The server is exposed today: the next public write commits `docs/index.md`, which already holds the private title from the `commit: false` write. I recommend **pausing all KB writes, public included, until slice 4**. That has nothing to undo. If a write can't wait, first run `git checkout -- docs/index.md` in the server checkout. I don't recommend `KB_GIT_PUSH=false` as the stopgap: the server keeps committing private writes locally, and those commits publish the moment you turn pushing back on.

**Decided as drawn** (say so to change it): the phase runs from this checkout (code and tests here; every server step stops for you, though your original words imagined running it on the server); private files stay in `docs/` untracked, not moved to `tenants/`; the tree mirrors visibility on every toggle; publish-on-write for public projects stays on.

## Verification (of the DECOMP itself)

`python3 scripts/workflow.py validate` passes; `parallel-plan P34-n0` prints the declared rounds; `finish-slice P34-n0.DECOMP` accepts (every middle slice declared); `topics/breakdown.md` has every required block; a grep of the phase folder finds no private name.

## Operator approval

Approved 2026-10-28 without amendment: decision 1 → purge history (cut slice 5, force-push only on the operator's literal word at that moment); decision 2 → pause all KB writes until the tree cleanup lands (an operator action, recorded in `## Notes for later slices` for the deploy/cleanup slices). Record both as gist lines in `## Decisions`.

## Dispatch

route=high
reason=kind decomposition
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
