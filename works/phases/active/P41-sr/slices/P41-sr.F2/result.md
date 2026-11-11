# P41-sr.F2 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Speed and follow along now come from the listener's newest position row, whatever the item, so a document or book heard before reopens at the listener's latest choice instead of its own old one. The fix is one line in the state route, plus its mirror. The Listen's own seconds and chapter are unchanged. W2 already saved a Speed or Follow along change at once, even while paused (`save(true, true)`), so no web code changed. All seven cases (a–g) pass: a and g are proven from the code, b–g on a scratch API stack, and before the fix the same script failed c, d, e, f and g.
- **files_changed:**
  - `server/listen_api.py`
  - `plugin/templates/kb/server/listen_api.py` (byte-identical mirror)
  - `tests/test_listen.py`
  - `plugin/templates/kb/tests/test_listen.py` (byte-identical mirror)
  - `works/phases/active/P41-sr/slices/P41-sr.F2/result.md`
- **validation:**
  - `KB_TEST_DATABASE_URL=<scratch p41-f2-pg> uv run pytest -q tests/test_listen.py tests/test_listen_play.py`: **pass**, 6 passed.
  - The same run with the old line restored temporarily: the new assertion **fails**, `(1.5, True, 7.0) != (1.25, False, 7)`. The line was then put back and checked byte-identical to the mirror with `cmp`.
  - `uv run pytest -q`, the full suite on the scratch DSN: **pass**, 252 passed.
  - `uv run python scripts/plugin_parity.py`: **pass**, exit 0.
  - `python3 scripts/workflow.py validate`: **pass**, with only the earlier warnings: notebook long entries, consolidation owed, stale docs, oversized sections.
  - Scratch API case script: **14/14 pass** on the fix, and 6/14 on the pre-fix code (§ Cases).
  - `git status --porcelain --untracked-files=all`: only the set and this slice folder. `works/backlog.md`, `works/events.jsonl`, `phase.md`, `slice.json` and `UPDATE_REQUIRED.md` were already modified or untracked by the orchestrator before the run.
  - Web checks: not run, because no web code changed.
- **deviations:**
  - **The test's docstring.** I added item 4 to its list of guarantees and changed "1 and 2 are Postgres-gated" to "1, 2 and 4". The assertion is one statement. It needs two setup statements: a position PUT, and one SQL insert of a newer row for another item.
  - **A command was denied.** The check of which environment variables are set (names only) was refused by the built-in safety check. I did not retry it. The scratch API ran under `env -i`, with only the variables it needs. pytest ran with `env -u DATABASE_URL` and an explicit `KB_TEST_DATABASE_URL`. So no ambient variable mattered.
  - **The scratch folder was not deleted.** Its `rm -rf` was refused (§ Teardown).
  - **`phase.md` is not written here.** The plan's Return sends the entries through the `notebook` field.
- **doc_impact:** returned in `notebook` (below), not written to `phase.md`.
- **notebook:**
  - **Doc impact:** `- api.md: the Listen state's top-level speed and follow (GET /app/listen/state, and the same state from /start and /update) now always come from the listener's newest position row, whatever the item (F3, per listener). They never come from the Listen's own older row. position.speed and position.follow still echo that row's own values. This supersedes B1's § Contract line "this Listen's, else the user's newest row". The position PUT's default for an omitted speed or follow is unchanged (P41-sr.F2).`
  - **Now:** `F2 landed: speed and follow along come from the listener's newest row, whatever the item; the seconds and chapter stay the Listen's own. W2 already saved a change while paused, so the web is unchanged. Cases a–g pass (slices/P41-sr.F2/result.md § Cases). Next: F3.`

## § Cases

**Where the cases ran:**

- **The stack:** Postgres 17 in `p41-f2-pg` on 127.0.0.1:55451, migrated by `alembic upgrade head` (head `0007_listen`), and the API (uvicorn) on **:8781**.
- **The API's environment:** a clean `env -i` with only these variables: `DATABASE_URL` (scratch), `KB_ROOT` and `KB_DB_PATH` (scratch), `KB_STARTUP_REINDEX=0`, `KB_GIT_COMMIT=false`, `KB_GIT_PUSH=false` and `KB_AUTH_RATE_LIMIT=0`. There was no Gemini key, so no embedding was made and nothing was spent.
- **The account:** a throwaway `@example.test` signup on that API. A second login of the same account stood in for "another device". The session tokens and the org `vk_` key stayed in memory and were never printed.
- **The content:** two synthetic native documents, `doc-a` and `doc-b`, and a two-chapter synthetic native book `f2book` (`c1`, `c2`, en), all published through `POST /api/documents`.
- **The history before the checks:**
  - doc A was heard at 1.5× with follow along on, at 12 s;
  - the book was started from c1 and heard into c2 at 1.75×, 4 s in;
  - then the listener's newest choice, made on doc B: **1.25×, follow along off**.
- **No browser.** Chrome was not used, as the plan says.

| Case | Expected | Evidence | Result |
|---|---|---|---|
| a. the next Listen in the same page session | carries (unchanged) | **Code, unchanged by this slice:** `engine.start` takes `speed: prefs?.speed ?? prev?.speed ?? s.speed` (`web/src/lib/listen/engine.ts:779-781`), where `prefs` is the page session's last choice (`store.ts:143-154`, set by `setSpeed` and `setFollow`). Review round 1 passed this live. Now the server agrees too. | **pass** |
| b. a full load, then a fresh Listen on a never-heard document | the listener's latest | GET state on doc B, never heard, after the book's 1.75× row: `speed=1.75 follow=True position=None`. At the end, the book from c2 (never heard) read `1.25 / False`. | **pass** |
| c. a full load, then a document heard before at another speed | the listener's latest | GET state on doc A (its own row is 1.5×): `speed=1.25`. `position` stays its own: `{chapter: None, seconds: 12.0, own speed 1.5}`. **Before the fix:** `speed=1.5`. | **pass** |
| d. follow along, as c | the listener's latest | doc A's own row has follow on; the state reads `follow=False`. **Before the fix:** `follow=True`. | **pass** |
| e. a book chapter with a saved position at another speed | the listener's latest | GET state on the book from c1 (its own row is 1.75×, in c2): `speed=1.25 follow=False`. Its position stays its own: `chapter c2, 4.0 s`. **Before the fix:** `1.75 / True`. | **pass** |
| f. another device | as b and c (server-backed) | A second session of the same account read doc A as `1.25 / False`, the book from c1 as `1.25 / False`, and the never-heard book from c2 as `1.25 / False`. **Before the fix:** doc A read `1.5 / True` and the book `1.75 / True`. | **pass** |
| g. a Speed or Follow change while paused, then a full load | the change is kept | **Client (code):** see *Case g, from the code* below. **Server:** the save a paused change sends was replayed against the scratch API (*The server half* below). **Before the fix:** the change on A did not reach B's or the book's state (`1.25 / False`, `1.75 / True`). | **pass** |

**Case g, from the code.**

- `setSpeed` and `setFollow` (`engine.ts:948-964`) each run `setPrefs`, then `patchListen`, then `save(true, true)`.
- `save(force, always)` (`engine.ts:482-487`) returns early only under `!attached && !always`, or under `!force` within `SAVE_MS` (15 s). `(true, true)` skips both, so the save is sent while paused, or before the audio is attached.
- Its body is `where(l, …)`: the key, the seconds, `speed: l.speed` and `follow: l.follow` (`engine.ts:462-480`). `l` is read after `patchListen`, which writes the store synchronously (`store.ts:27-37`).
- It goes out through the existing `listenSave` → `PUT /app/listen/position` (`actions.ts:110-124`).
- W2's live table already recorded "saved to the position" for Speed 1.5× and Follow along off (`slices/P41-sr.W2/result.md`, its rows 81-82).
- **So the save-on-change already existed. No web code was added, and no new request type.**

**The server half of case g.** A Speed change to 2× while paused on doc A was replayed as the PUT the client sends (A, 12 s, 2.0, follow off). After it:

- doc B read `2.0 / False`.
- A Follow along change on A then made the book read `2.0 / True`.
- Device 2 then read doc B as `2.0 / True`.

**The run, twice.** The script ran 14 checks: the seven cases plus a fresh-account check of the defaults (`1.0 / True`).

- **On the fix:** 14/14 pass. The run was repeated on fresh content after the pre-fix check, to confirm the restored line.
- **Pre-fix:** the old line was put back temporarily and the scratch API restarted. Then 6/14 passed: the defaults, b, the kept seconds, chapter and position, and the never-heard book. c, d, e, both f checks on a heard item, and g failed.

## The change

`server/listen_api.py` `_state`, and its mirror:

```python
-    preference = position or await lj.latest_position(ctx.user.id)
+    preference = await lj.latest_position(ctx.user.id)
```

- `position` still drives `position`, `kept` and the seconds and chapter.
- `resume`, a book's newest row for that book, is unchanged.
- The position PUT's default at `:604` (`existing or latest`) is unchanged, as the plan pins.

`tests/test_listen.py` adds this to `test_claim_lease_and_requeue`, after the failure-state assertion:

- the setup: a PUT of the fixture document at 1.5×, then an SQL insert of a newer row (+1 minute) for another item at 1.25×, follow off;
- the one assertion: `(state["speed"], state["follow"], state["position"]["seconds"]) == (1.25, False, 7)`.

## Observations (not findings of this slice)

- **An omitted speed refreshes the old one.** The kept PUT default can still turn an old speed into the newest choice. A PUT that leaves out `speed` or `follow` on a heard Listen writes that row's own old value with a fresh `updated_at`, so the old value becomes the listener's newest. The web never sends such a PUT: every save, the beacon and Stop send `speed` and `follow` through `where()`. Only another API client could. The plan kept the default on purpose; I note it for review round 2.
- **Two devices: the last write wins.** A device still playing saves every 15 s with its own speed. A Speed change made on a second device lasts only until the first device's next save. This is inherent in "the newest row is the preference", and the matrix does not cover it.
- **W2's note is outdated.** `slices/P41-sr.W2/result.md:133` says "a fresh Listen starts at 1× with follow along on". The round-1 code already fell back to the listener's latest, so that was not accurate (the review's case b passed at 1.5×). After F2 the rule is the same everywhere.

## Teardown

- **The scratch API on :8781:** stopped. Nothing listens on :8781 any more.
- **`p41-f2-pg`:** removed with `docker rm -f -v`. The container and its anonymous volume are gone.
- **No other container was touched.** I did not restart `:3030`, touch production or the installed runner, or read any `.env`.
- **Refused delete:** `rm -rf` of the scratch folder `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/f2` was denied, and I did not retry it. It holds:
  - `cases.py`, the case script, with no credentials in it;
  - `listen_api.fixed.py`, a copy of the fixed file;
  - `api.log`, `api-old.log` and `api-new.log`, the uvicorn access logs, which hold request paths only;
  - `root/`, the scratch `KB_ROOT`, with the synthetic documents and their SQLite.

  It holds no secrets or private content. The operator can remove it.
