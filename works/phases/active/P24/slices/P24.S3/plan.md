# Plan — P24.S3 (CLI: honest write-timeout reporting on `knowledge save`)

## Read first

`../../phase.md` — the S3 decomposition row, S1's landed contract (`push_pending`,
`pushed:false` = "publishes in background", no `push_error` in responses), and S2's
notes (trap: the by-path read projection has NO `url` field — derive any view link
from the site base or report rel_path/id).

## Current behavior (verified)

- `cli/src/knowledge_cli/main.py:117-119` — the top-level catch-all maps **every**
  `httpx.HTTPError` (including `ReadTimeout` on a POST the server accepted) to
  `error: cannot reach <base_url>` — the lie this slice removes.
- `cli/src/knowledge_cli/client.py:44` — shared `DEFAULT_TIMEOUT = 15`, applied per
  request in the client wrapper.
- `cli/src/knowledge_cli/knowledge.py:364-435` — `cmd_save` builds the payload,
  posts via the `api_call` helper (line ~167), prints `saved: <title>` + url/read
  hint; `_conflict` (~415) explains 409s.
- Tests: `cli/tests/test_knowledge.py` (httpx-mocked `api` fixture, `run(...)`
  helper). `cli/` has NO plugin-template mirror gate.

## Scope

1. **Distinguish timeout-after-send from genuine unreachability for the save path.**
   A `httpx.TimeoutException` (or transport error after the request was sent) on the
   `save` POST must NOT print "cannot reach". Options (your call, keep it small and
   idiomatic to the codebase): catch narrowly inside `cmd_save`/its `api_call` use
   rather than widening the global handler. On such a failure:
   - Verify with the read API (`GET /api/documents/by-path/<rel_path>` — the CLI
     knows project/date/slug; mind the no-`url` trap) whether the save landed.
   - Landed → report honest success (title, rel_path/id, and that publishing
     completes in the background when `push_pending` applies — though note the
     verification read carries no push fields; keep the wording simple and truthful).
   - Absent / verification itself unreachable → an honest error that says the save
     may or may not have landed and how to check (`knowledge list`/`read`), never a
     bare "cannot reach" when the transport got as far as sending.
   - Genuine connect failure (nothing sent) keeps today's "cannot reach" message.
2. **Write timeout budget**: give the mutating save call a longer timeout than the
   shared `DEFAULT_TIMEOUT = 15` if the evidence warrants (post-S1 the response is
   fast; 15s is already generous — your call; document the reasoning either way; a
   per-call override beats changing the shared default for all reads).
3. **`save` output stays otherwise unchanged** (frozen consumer expectations:
   scripts may parse `saved:` lines — check `scripts/onboarding_smoke.py` per S1's
   notes before touching any printed line).
4. **Tests** (`cli/tests/test_knowledge.py`, terse): timeout-after-send + landed →
   exit 0 honest success; timeout + genuinely absent → honest uncertain error (non-
   zero); connect failure → unchanged "cannot reach". Use the existing fixture
   pattern.

## Out of scope

Server (done), skill (done), other CLI commands' error handling (only `save`'s
mutating path changes), changple5.

## Validation

- CLI tests: check for a `cli/`-local pytest config; likely
  `.venv/bin/python -m pytest cli/tests/` or `cd cli && ../.venv/bin/python -m pytest`
  — use what works, report what you ran.
- Repo suite still green: `.venv/bin/python -m pytest`
- `python3 scripts/workflow.py validate`

## Wrap-up

Write `result.md`; append cross-slice notes + a one-line Doc impact entry (CLI honest
timeout handling) to `phase.md`.
