# Result — P8.S1: publish-on-write (server-side git push after the scoped commit)

Status: **done**. Implemented the flag-gated server-side push exactly per `plan.md`'s six fixed design decisions. Off by default → local/plugin behavior is byte-identical to before (aside from the new `pushed: false` response field).

## What changed

- **`server/config.py`** — added `git_push_enabled()`. Reads `KB_GIT_PUSH`, **default false** with an inverted truthy-parse (`{1,true,yes,on}` → enabled), mirroring the env-at-call-time idiom but opposite default to `git_commit_enabled()`.
- **`server/gitops.py`** — added net-new `push(*, root, remote="origin", branch="main") -> str` and updated the module docstring (was "never pushing" → now "pushes only when `KB_GIT_PUSH` is enabled"). Discipline: `git fetch <remote> <branch>` → `git rebase <remote>/<branch>` → `git push <remote> HEAD:<branch>`; returns the **final pushed HEAD** sha. Never `--force`, never `add -A`. On any step failing: best-effort `git rebase --abort` (raw `subprocess.run`, its own non-zero swallowed so it never masks the real `GitError`) then re-raise `GitError` — local commit preserved intact, repo never left mid-rebase.
- **`server/main.py`** — wired push into `create_document` (POST) and `_delete_document` (both DELETE handlers). Push runs **inside `WRITE_LOCK`**, right after the commit, only when `committed and config.git_push_enabled()`. On success `commit_sha` is reassigned to the pushed HEAD; on failure/disabled it keeps the local `commit()` sha. Both response bodies gained `pushed: bool` (always present) and `push_error` (only when a push was attempted and failed). A push failure is **never** a 5xx — still 201/200, mirroring `committed`/`commit_error`.
- **`tests/test_api_push.py`** — new, small (5 cases) against a **local filesystem bare remote** (no network/credentials).

## Validation

All run from the repo root.

| Command | Outcome |
|---|---|
| `uv run python -m pytest tests/test_api_push.py -q` | **5 passed** |
| `uv run python -m pytest -q` (full suite) | **62 passed** (57 existing stay green — they implicitly assert the flag-off default changes nothing; 5 new) |
| `python3 scripts/workflow.py validate` | **Workflow validation passed** |

### Test cases (all pass)
1. `test_push_disabled_by_default` — flag unset → 201, `pushed: false`, no `push_error`, bare remote HEAD unchanged.
2. `test_push_happy_path` — `KB_GIT_PUSH=true` → 201 `pushed: true`; bare `main` HEAD == response `commit_sha`.
3. `test_push_rebases_onto_diverged_remote` — operator advances the bare via a 2nd clone; write → `pushed: true`, our commit lands on top (operator commit is still an ancestor — no force), `commit_sha` == new bare HEAD.
4. `test_push_conflict_keeps_local_commit_no_rebase_state` — operator edits the same `docs/index.md` Recent region and pushes; write → **201**, `pushed: false`, non-empty `push_error`, local commit intact, no `.git/rebase-merge|rebase-apply`, working tree clean, doc file still present.
5. `test_delete_push_enabled` — DELETE with push enabled → 200 `pushed: true`, `commit_sha` == published bare HEAD (reverse-path parity).

Behavior was also verified empirically first in a throwaway bare-remote scratch script (fetch opportunistically updates `origin/main`; rebase-onto-remote + non-force push; conflict → abort restores state) before writing the module.

## Deviations from `plan.md`

- **DB path outside the work tree in the push fixture.** The plan says follow `tests/conftest.py`/`test_api_write.py` fixture conventions, which put `KB_DB_PATH` inside the repo root. For the conflict case that asserts a **clean working tree** after `rebase --abort`, an in-tree `data/` shows as untracked (`?? data/`) and would fail the assertion. Set `KB_DB_PATH` to a sibling dir outside the work repo (the DB is disposable, never committed) so the clean-tree check is meaningful. No product behavior affected.

Otherwise implemented exactly to plan. No source touched beyond the three server files + the new test file.

## Doc impact (appended to `phase.md` — versioned at P8.REVIEW, not here)

- **api.md** — 201/200 bodies now carry `pushed: bool` always + `push_error` on attempted-and-failed push; on successful push `commit_sha` is the final published HEAD (rebase may rewrite the commit), else the local HEAD.
- **operations.md** — `KB_GIT_PUSH` (default false, box-only true) publish-on-write: fetch → rebase → non-force push, best-effort.
- **security.md** — `KB_GIT_PUSH` is the deliberate flag-gated departure from "agent never pushes"; off by default, only the hosted box (deploy-key, S4) turns it on; never `--force`/`add -A`.

## Notes for later slices

- DELETE pushes too (settles the DECOMP open question on DELETE push scope) — parity with POST.
- Fixture gotcha carried into `phase.md`: a test/box bare remote must be created with `git init --bare -b main` or clones default to `master` and `push origin main` fails with "src refspec main does not match any".
