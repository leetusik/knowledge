# Plan — P8.S1: publish-on-write — server-side git push after the scoped commit

Orchestrator plan (auto mode), per the operator-approved hosting proposal in `../../phase.md` §2 (sign-off recorded 2026-07-14). Executor: `slice-executor-high`.

## Job

Implement the phase's core new capability: after the write path's existing scoped commit, the server can push to `origin/main` — gated by a new flag that is **off by default** so local/plugin deployments never push. Best-effort semantics exactly like commits today: push failure never changes the HTTP outcome.

Read first: `works/phases/active/P8/phase.md` (§2 Publish-on-write, Findings, Constraints), `server/gitops.py` (52 lines — the module you extend), `server/config.py` (the flag idiom), the commit block + DELETE handlers in `server/main.py`, and `tests/test_api_write.py` + `tests/conftest.py` (fixture conventions).

## Fixed design decisions (approved — do not re-open)

1. **New `KB_GIT_PUSH` flag, default false.** Add `git_push_enabled()` to `server/config.py` following the file's env-at-call-time idiom (`git_commit_enabled()` is the model; note the inverted default — this one must default **false**, so truthy-parse accordingly).
2. **Scope: every commit-producing mutating endpoint** — `POST /api/documents` and both `DELETE /api/documents/...` handlers. (This settles phase.md's open question: DELETEs push too, for consistency.)
3. **Push discipline (net-new `push()` in `server/gitops.py`):** `git fetch origin main` → rebase onto `origin/main` (only meaningful when it moved; a plain rebase is fine either way) → `git push origin HEAD:main`. **Never `--force`**, never `add -A`. On any step failing: best-effort `git rebase --abort` (ignore its own failure if not mid-rebase), then raise `GitError` — the local commit must survive intact and the repo must not be left mid-rebase.
4. **Attempt order & gating:** push is attempted only when a commit was actually made in this request (`committed: true`) **and** `git_push_enabled()`. Run it immediately after the commit, inside the same `WRITE_LOCK` critical section (single worker — keeps a concurrent write from mutating the tree mid-rebase; a daily-write agent makes contention irrelevant).
5. **Response contract (mirrors `committed`/`commit_error` exactly):** add `pushed: bool` (always present) and `push_error` (only when a push was attempted and failed) to the 201 body and the DELETE response bodies. Disabled or commit-skipped/failed → `pushed: false`, no `push_error`. **Never a 5xx for a push failure** — still 201/200.
6. **`commit_sha` reflects what was actually published:** a rebase rewrites the commit, so on a successful push return the **final pushed HEAD** as `commit_sha` (have `push()` return it). On failed/disabled push, keep today's behavior (local HEAD from `commit()`). Note this semantic in the doc-impact line — it's part of the frozen contract.

## Tests (keep the file small — minimal high-value cases)

Use a **local filesystem bare remote** (no network/credentials): `git init --bare` a temp dir, add it as `origin` of the test repo fixture, seed `main`. Follow the existing fixture conventions in `tests/conftest.py`. Roughly five cases, one small file (or extend `test_api_write.py` if that matches conventions better):

1. Default (flag unset): write → 201, `pushed: false`, no `push_error`, bare remote unchanged.
2. `KB_GIT_PUSH=true` happy path: write → 201 `pushed: true`; bare `main` HEAD == response `commit_sha`.
3. Divergence: advance the bare's `main` via a second clone, then write → `pushed: true`, bare `main` contains both commits with ours on top (no force), `commit_sha` == new bare HEAD.
4. Conflict: second clone edits the same `docs/index.md` Recent region and pushes; then write → 201 with `pushed: false`, non-empty `push_error`, the local commit still exists, and the repo is **not** left mid-rebase (no `.git/rebase-merge`), working tree clean.
5. DELETE with push enabled → response carries `pushed: true` (parity for the reverse path).

Run the whole suite (existing tests must stay green — they implicitly assert the flag-off default changes nothing) and record the exact commands in `result.md`.

## Constraints

- Local behavior is sacrosanct: with `KB_GIT_PUSH` unset, byte-identical git behavior to today (aside from the new `pushed: false` response field).
- Do not touch `compose.yml`, the Dockerfile, or any deploy artifact — that's P8.S3. No credential/SSH handling in code: `push()` just runs git; the box's remote/deploy-key wiring is a deploy concern.
- Match `gitops.py`'s existing idiom (`_run`, `GitError`, docstrings state the invariants — update the module docstring: it currently says "never pushing", which becomes "pushes only when KB_GIT_PUSH is enabled").
- Append one-line **Doc impact** notes to `phase.md` (api.md: `pushed`/`push_error` + final-pushed-HEAD `commit_sha` semantics; security.md/operations.md: `KB_GIT_PUSH` box-only flag) and your cross-slice findings to Findings & Notes.
- Executor contract: never commit, never transition status; write free-form `result.md` in this slice folder; return the structured verdict.
