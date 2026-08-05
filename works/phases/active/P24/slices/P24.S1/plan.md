# Plan — P24.S1 (server: fast, bounded write response — push + embed off the response path)

## Read first

`../../phase.md` — the confirmed failure mode and the "Fix shape decided at
decomposition" section ARE this slice's design. This plan scopes; it does not repeat.

## Scope

1. **Move the two unbounded network stages after the response** in
   `POST /api/documents` (`server/main.py`):
   - `gitops.push` (fetch → rebase → push) — currently in-request inside `WRITE_LOCK`.
   - The Gemini embed (`server/main.py:803-819`) — its result never appears in the
     response.
   The in-request path keeps: file write, index update, DB upsert, local `gitops.add`
   + `gitops.commit` (fast, keeps `committed`/`commit_sha` truthful).
2. **Mechanism is your call** (phase.md names two candidates). Requirements either way:
   - A background push re-takes `WRITE_LOCK` (non-reentrant — never call it from inside
     the lock) and never runs concurrently with a write's tree mutation.
   - If you pick Starlette `BackgroundTasks`, PROVE the 201 reaches the client before
     the background work runs despite the `BaseHTTPMiddleware` metering in the stack —
     a test or a documented trace; getting this wrong reproduces the bug. A
     module-level single worker thread + queue is the safer default; tests need a way
     to drain it deterministically.
   - Same treatment for the other write-path callers of push, if any (check DELETE and
     any other route calling `gitops.push` — keep behavior consistent).
3. **Bound every git subprocess**: `gitops._run` gains a `timeout=` (pick a sane
   default, e.g. 60s, configurable via env if the codebase has a config pattern for
   it), surfaced as `GitError` — so the background worker can never wedge holding
   `WRITE_LOCK`.
4. **Response stays additive** (frozen consumer contract): no field removed/retyped;
   add `push_pending: true` (or equivalent) when a push was queued; `pushed: false`
   keeps its documented "saved, publishes on the next successful push" meaning.
   Flag for the review: `commit_sha` is no longer the post-rebase published HEAD.
5. **Tests** (`tests/test_api_push.py` — extend, don't fork a new suite): the five
   response-body `pushed` assertions change to assert the side effect after draining
   the background work; add a case proving the 201 returns promptly when the push is
   slow/hung (bounded), and one for the timeout → `GitError` surfacing. Terse.
6. **Mirrors**: every changed `server/**` and `tests/**` file byte-mirrored into
   `plugin/templates/kb/` in this slice.

## Out of scope

Skill (S2), CLI (S3), push coalescing (noted open question — keep one-push-per-write
serialized), any second uvicorn worker, changple5 code.

## Validation

- `.venv/bin/python -m pytest` (repo root; venv interpreter has pytest)
- `python3 scripts/plugin_parity.py`
- `python3 scripts/workflow.py validate`

## Wrap-up

Write `result.md` (mechanism chosen and why, the ordering proof if BackgroundTasks,
timeout default); append cross-slice notes (the exact additive response field S2/S3
describe) + a one-line Doc impact entry to `phase.md`.
