# P41-sr.F2 — Speed and follow along kept per listener, not per document

## Goal

Fix review round 1's **F2**. The signed design's F3 says speed and follow along are "remembered per listener (not per
document)", and F33 says they "carry from one Listen to the next, wherever it starts". Today, after a full page load,
a document heard before reopens at **its own** old speed and follow along, not the listener's latest choice.

**Read first:**
- `slices/P41-sr.REVIEW/result.md` § Findings → *F2*: the rule, the cause and the case table;
- `server/listen_api.py`:
  - the state route, where `preference = position or latest_position(user)` sits at `:446` and is used at `:481-482`;
  - the position PUT, `:602-610`, whose default stays as it is;
- `server/listen_jobs.py`: `latest_position` (`:727`, the newest row by `updated_at`) and `get_position`;
- `slices/P41-sr.W2/result.md`: how the player sheet's Speed and Follow along write `speed` and `follow`, and when a
  position save is sent;
- `docs/reference/design/jobs/11-listen/rounds/01-listen/frame.md` F3.

## The rule (the review's simplest rule, pinned)

- **In the state route,** speed and follow come from `latest_position(user)` always: the listener's newest row,
  whatever the item.
- **The position's seconds and chapter** still come from this Listen's own row. Only the preference changes.
- **The save on change.** A change to Speed or Follow along must reach the server as a save, even while paused, so
  that the newest row really is the newest choice. Check whether W2 already saves on such a change.
  - If it does not, add the save in `web/src/lib/listen/`, through the existing throttled position save. Never add a
    new request type.
  - Say which is true.

## The acceptance matrix

| Case | Expected |
|---|---|
| a. the next Listen in the same page session | carries (unchanged) |
| b. a full load, then a fresh Listen on a never-heard document | the listener's latest |
| c. a full load, then a document heard before at another speed | **the listener's latest**, not its own old speed |
| d. follow along, as c | the listener's latest |
| e. a book chapter with a saved position at another speed | the listener's latest |
| f. another device | as b and c (server-backed) |
| g. a Speed or Follow change while paused, then a full load | the change is kept |

## Files (the set)

- `server/listen_api.py` and its plugin template mirror (byte-identical);
- `tests/test_listen.py` and its mirror: **one** assertion added to an existing Postgres test for case c. Two rows at
  different speeds; the state of the older one reads the newer speed;
- `web/src/lib/listen/**`, only if the save-on-change in the rule is missing;
- `web/tests/listen-player.test.ts`, only if web code changes, with at most one case.

## Verification (no browser in this slice)

The operator has not yet answered whether the agent's Chrome may stay signed in on production (OQ5). So this slice
**does not drive Chrome**. Prove the cases on a scratch stack through the API instead:
1. Postgres in a container named **`p41-f2-pg`** on **127.0.0.1:55451**, then `alembic upgrade head`.
2. The API on a free port that is **not** `:8766`, `:3030` or `:3041`, with a scratch `KB_ROOT`.
3. A throwaway account and session through the scratch API's own signup. Never print a token.
4. Two synthetic native documents and one small synthetic book.
5. PUT positions with different speeds and follows, then GET the state to show cases b–f.
6. For case g, show from the code or a Vitest test that a change while paused sends a save.

Tear it all down at the end: the container with its volume, the API and the scratch files. If a delete is refused,
list it.

## Validation

- `uv run pytest -q tests/test_listen.py tests/test_listen_play.py` with the scratch DSN; then the full
  `uv run pytest -q` once;
- `uv run python scripts/plugin_parity.py`: exit 0;
- if web changed: `cd web && pnpm vitest run tests/listen-player.test.ts`, plus `pnpm exec tsc --noEmit` and eslint
  on the changed files;
- `git status --porcelain --untracked-files=all`: only the set, plus this slice folder.

**Never:**
- touch production or the installed runner;
- push, deploy or commit;
- read `.env` files;
- restart `:3030`;
- touch other containers.

## Return

`result.md`, with the verdict block first, then **§ Cases**: the matrix with each case's evidence.

The `notebook` field holds:
- **Doc impact:** an `api.md` line on the state's `speed`/`follow` coming from the listener's newest row;
- **Now:** one line.

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
