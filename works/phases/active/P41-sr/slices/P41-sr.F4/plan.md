# P41-sr.F4 — The press that replaces a stale unit plays the new unit, not a false stop

## Goal

Found by F1. The first Listen press on a unit made under an older spoken rule goes like this:
1. The press attaches the **old** unit's play URL from the page's state, inside the gesture (`engine.start`).
2. It then calls `listenStart`.
3. B1's `ensure_unit` sees the stale manifest and **replaces** the unit. It reuses every part whose key matches, and
   queues jobs only for the changed parts.
4. Start's answer carries the new unit's `play`. Because audio is attached, the engine holds it as `pending`
   (`switchList` → `later`, `engine.ts:384-387`).
5. The old unit's playlist and part URLs now answer **404** (B2's constant 404 once a unit is gone).
6. The player faults and shows **"The connection dropped, so playback stopped at …"**. Try again then plays the new
   unit.

This happens once per pre-F1 unit, including the operator's one document on production at acceptance. It would hit
**every** made document if part grouping ever changes, for example with a short first part (OQ4). Fix it so that
press plays the new unit with no false stop.

**Read first:**
- `slices/P41-sr.F1/result.md` § Made units (case h): the mechanism, the scratch run and how to reproduce it;
- `slices/P41-sr.W1/result.md` § Architecture, the engine: R3's "never swap `src` at `ended`", `pending` and
  `switchList`, the press inside the gesture, the faults;
- `web/src/lib/listen/engine.ts`, as F3 left it, with `listenStart`'s handling and `absorb`;
- `server/listen_jobs.py` `ensure_unit` and `_made_by_key`, and `server/listen_play.py`'s 404 rule (B2 § Contract:
  the playlist identity and its growth rule).

## Yours to decide (keep it small; record the choice)

Pick the simplest correct fix. Two directions to weigh:
- **Client, preferred if it holds.** When start's answer replaces the unit the press just attached, attach the new
  `play` at once, at the current position, instead of holding it as `pending`. Tell this apart from the cases that
  must keep waiting: a new version's list while sounding (W1's rule), and Update audio's R3 rule. For example, the
  answer's unit list may no longer contain the attached one. Alternatively, a 404 on the attached list while a
  `pending` list exists switches to it silently. Either way:
  - the position is kept;
  - on WebKit, if `play()` is refused outside the gesture, the state reads `tap` and never a fault.
- **Server.** Keep a replaced unit's playlist and parts answering until … Only if the client cannot do it cleanly,
  and only with **no schema change**: `uq_listen_units_identity` allows one unit per identity, and `0007` is applied
  on production.

## The acceptance matrix

| Case | Expected |
|---|---|
| a. the first press on a stale unit whose parts are all reusable | plays the new unit at once, with no fault message |
| b. the first press on a stale unit whose tail part must render again | plays the made prefix; reaching the unmade part reads preparing or buffering, never a fault |
| c. a real dropped connection (the API stopped mid-play) | the fault or offline states, as W1 verified (guard) |
| d. a new document version while sounding | still waits for the next press (W1's rule, guard) |
| e. Update audio on an outdated Listen | unchanged (guard) |
| f. WebKit's gesture rule | a refused `play()` after the async answer reads `tap`, never a fault (by code, and a Vitest case if practical) |
| g. book Listens | the same as a and b when a chapter's unit is replaced |

## Files (the set)

- `web/src/lib/listen/engine.ts` (and `store.ts` or `machine.ts` only if needed);
- `web/tests/listen-player.test.ts`: at most **one** case, for the swap rule;
- `server/listen_api.py`, `server/listen_jobs.py` and `server/listen_play.py`, with their mirrors, **only if** the
  server direction is chosen.

## Verification

- **The browser.** OQ5 is still open, so this slice **does not drive Claude in Chrome**. Run the live cases in
  **headless Chrome over CDP with a throwaway profile**, as F3 did. The Claude in Chrome run is owed to review
  round 2.
- **The stack,** as F3's `result.md` describes:
  - `p41-f4-pg` on **127.0.0.1:55451**;
  - the API on **:8766**, with a scratch `KB_ROOT`;
  - dev `:3030`, driven and never restarted;
  - synthetic content, with parts from macOS `say` in B2's pinned packaging.
- **Making a stale unit:** as F1's scratch run did. Make a unit under one `KB_LISTEN_PART_CAP_S`, then restart the
  API with another cap (or the pre-F1 `spoken.py` from git), so that the next press's `ensure_unit` replaces it.
  - Case a uses a regrouping where every part is reused.
  - Case b uses one where the tail renders again.
- **Tear down:** the container with its volume, the API and the headless profile. If a delete is refused, list it.

## Validation

- `cd web && pnpm vitest run tests/listen-player.test.ts tests/listen-relay.test.ts`, `pnpm exec tsc --noEmit`, and
  eslint and prettier `--check` on the changed files;
- if server code changed: `uv run pytest -q` with the scratch DSN, and `uv run python scripts/plugin_parity.py`;
- `git status --porcelain --untracked-files=all`: only the set, plus this slice folder.

**Never:**
- touch production or the installed runner;
- push, deploy or commit;
- read `.env` files;
- print a token or key;
- restart `:3030`;
- touch other containers;
- work around a permission denial.

## Return

`result.md`, with the verdict block first, then:
- **§ The choice:** what was chosen and why;
- **§ Cases:** the matrix with each case's evidence;
- **§ Owed to round 2:** the Claude in Chrome run.

The `notebook` field holds:
- **Decisions:** one gist, `Stale-unit press (F4): … → slices/P41-sr.F4/result.md`;
- **Doc impact:** a `frontend.md` line;
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
