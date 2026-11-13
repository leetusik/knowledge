# P41-sr.F4 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** The press that replaces a stale unit now plays the new unit at once, with no false stop. Start's answer takes the replaced unit's list right away, from where the listener is. A replaced unit is the same document version under another unit id (`replaced` in `machine.ts`). A fault met while start is still out waits for that answer. Every other new list, a newer version's or Update audio's, still waits for a press (R3). The fix is client only: no server code and no schema change. Cases a–g pass live in headless Chrome over CDP on `:3030`, against a scratch API. The defect was first reproduced on the unfixed engine.
- **files_changed:**
  - `web/src/lib/listen/engine.ts`
  - `web/src/lib/listen/machine.ts`
  - `web/tests/listen-player.test.ts` (one new case)
  - `works/phases/active/P41-sr/slices/P41-sr.F4/result.md`
- **validation:**
  - `cd web && pnpm vitest run tests/listen-player.test.ts tests/listen-relay.test.ts`: **pass**, 16 tests (1 new).
  - The full `pnpm vitest run`, once: **pass**, 605 tests in 43 files.
  - The mutation check: with `replaced`'s version test removed, the new case **fails** ("expected true to be false"). The file was then restored from a saved copy, and `cmp` confirmed the match.
  - `pnpm exec tsc --noEmit`: **pass**, exit 0.
  - `eslint` on the 3 changed files: **pass**. `prettier --check` on the same files: **pass**.
  - No server code changed, so `uv run pytest` and `plugin_parity.py` were not run, as the plan allows.
  - `python3 scripts/workflow.py validate`: **pass**, with only the earlier warnings.
  - Live cases a–g: **all pass**, headless (§ Cases). The run also covered four extra checks: the native HLS path, a second press with the page's stale seed, a pause before start's answer, and a failed start call with a held fault.
  - `git status --porcelain --untracked-files=all`: only the set and this slice folder. `works/backlog.md`, `works/events.jsonl`, `phase.md`, `slice.json`, `plan.md` and `UPDATE_REQUIRED.md` were already modified or untracked by the orchestrator.
- **deviations:**
  1. **`machine.ts` gained `replaced`.** The plan allows this "only if needed". The swap rule's Vitest case needs a pure function, and `engine.ts` cannot be imported in node because of its server actions and hls.js.
  2. **The fix pairs the client swap with a narrow hold on faults.** A fault is held only while the press's own start is out, never later. The live native run showed why the hold is needed: the old part's 404 raised the element's `error` (code 4) **before** start's answer arrived (§ Cases, native).
  3. **The one Vitest case also asserts f.** It checks the machine's `press` → `rejected` → `tap`, inside the same case.
  4. **Extra live checks beyond the matrix**, all listed in § Cases.
  5. **Some screenshots were not saved.** The steps that read `wait <ms> <name>` passed the name in the wrong argument. Those states' evidence is the in-page state trail quoted in § Cases.
  6. **The cleanup delete was refused** (§ Teardown).
  7. **`phase.md` is not written here.** The plan's Return sends the entries through `notebook`.
- **doc_impact:** returned in `notebook`; nothing was written to `phase.md`.
- **notebook:**
  - **Decisions:** `Stale-unit press (F4): start's answer takes a replaced unit's list at once (same document version, another unit id: the attached list is gone, B2's 404), from where the listener is; a fault met while start is out waits for that answer; a newer version's list and Update audio still wait for a press (R3); client only, no server or schema change → slices/P41-sr.F4/result.md`
  - **Doc impact:** `frontend.md: the Listen engine (lib/listen/engine.ts) takes start's answer's list at once when it replaced a unit the press attached (machine.ts replaced(): the same document version under another unit id, whose playlist and parts answer 404), at the listener's place (the press's own place if nothing was heard yet); a paused Listen takes it at its next press; a media fault met while that start is out waits for its answer (and a failed start call releases it); every other new list (a newer version, Update audio) still waits for a press, R3 (P41-sr.F4).`
  - **Now:** `F4 landed: the press that replaces a stale unit plays the new unit at once, with no false "connection dropped" (cases a–g pass headless on :3030; client only, no server or schema change). The Claude in Chrome run of F1–F4 is owed to REVIEW round 2, once OQ5 is answered → slices/P41-sr.F4/result.md.`
  - **Notes for later slices (optional, for the orchestrator):** The note `(from P41-sr.F1, for P41-sr.F4, P41-sr.REVIEW round 2)` is consumed. Its last clause ("F4 fixes it; until then expect it once per pre-F1 unit") no longer holds. It can be removed, or replaced with: `(from P41-sr.F4, for P41-sr.REVIEW round 2) A stale unit's first press now plays the new unit at once (F4). Round 2's Claude in Chrome run owes F4's cases a–g, plus the production build → slices/P41-sr.F4/result.md § Owed to round 2.`

## § The choice

**The client direction.** Start's answer takes the replacement's list at once. A fault met while start is out waits for that answer. The server is untouched.

**How the press tells a replacement apart.** Start's answer is compared with the state whose list the press attached, the page's seed: `replaced(seed, answer)`. For each document of the Listen (each chapter of a book), the attached state names a unit id and its version. The answer replaced it when it names a **different unit id at the same version**, either as the unit that plays or as the update. B1's identity allows one unit per version, so the attached unit is gone and its URLs answer 404 (B2). The cases that must keep waiting are different:
- **A new version's list (W1's rule).** The unit that plays carries a newer version, and the earlier unit still exists and still plays, so it is not a replacement.
- **Update audio (R3).** The new list arrives through `update()` and the polls (`answer()` → `absorb` → `switchList(…, "sounding")`), never through start's answer, so it is untouched by construction.

**What the swap does** (start's answer, `replaced` true):
1. It drops the attached list (`detach`) and goes on exactly as if nothing had been attached at the press. The answer's list then takes the existing W1 path:
   - the made unit plays (case a);
   - or its made prefix plays and the rest shows its making (case b);
   - or, with nothing playable yet, the note shows the making.
2. The position is where the listener is. If nothing was heard yet (the state is still `loading`), that is the press's own place (`from`); otherwise it is the element's `currentTime`.
   - The reused prefix is the same audio, so the place holds.
   - A book's `from` is inside its start chapter (`resumeOf`), so the stream seconds hold too.
3. A Listen that sounds (`loading`, `playing`, `buffering`, `offline-play`) goes back to `loading` and plays. A Listen paused before the answer (or at `tap`) takes the new list at its next press, so no sound starts against the listener's will.
4. **WebKit.** The new list's `play()` runs outside the gesture. If it is refused (`NotAllowedError`), `playNow` reads it as `tap`, never a fault. The detach's `load()` drops the old source's queued `pause` and `error` events, per the HTML spec and WebKit's `cancelPendingEvents`, so they never reach the machine.

**The hold** (`starting`, `held`). While the press's own start is out, a fault from the element or hls.js waits for the answer:
- if the answer replaced the unit, the swap makes the fault moot;
- otherwise the held fault runs as before (offline, `fail-session` or `fail-play`);
- a start call that fails outright (the action rejects) releases the hold and runs the fault.

The hold covers only the press's own start: a later fault (case c) is untouched. It matters on WebKit's native HLS, whose 404 surfaces as an element `error` at once. hls.js retries a fragment for about 32 s, so in Chromium the answer always came first.

**The timeline.** `readTimeline` drops a read while another is out. Once a read ends, if the Listen has meanwhile taken another list, it reads that list's timeline. A made list is not polled again, so without this re-read a book could have kept the old list's spans, titles and chapter starts.

**Why not the server direction.** Serving a replaced unit's URLs for a while would need the replaced unit kept: a row or a tombstone. `uq_listen_units_identity` allows one unit per identity, and the client fix is complete without that.

**Why not only "a 404 with a pending list switches silently".** In Chromium, hls.js retries the dead fragment for about 32 s before it gives up (seen live, below). Waiting for the 404 would turn a false stop into 32 s of "Loading…". It would also make the switch happen whenever the 404 lands, possibly with the phone locked, which is R3's risk. Start's answer comes about 100 ms after the press, in the foreground.

**Decided as built:**
- A voice or profile change between the page's load and the press also reads as `replaced`, because it gives the same version under another id. In that case the old unit still exists, and the press simply plays the new voice at once. This is harmless.
- `Try again` and every other pending path are unchanged.

## § Cases

**Where they ran:**
- **The browser:** headless Google Chrome 157 with a throwaway profile (`scratchpad/f4/cdp-profile`), driven over CDP by F3's small step daemon, copied to `scratchpad/f4/cdp/`. Two additions:
  - the network log records the play URLs with their statuses;
  - a one-shot, delayed action failure, through the `Fetch` domain.

  This is **not** the Claude in Chrome run. OQ5 is open, so the plan rules that run out.
- **The runtime:** the operator's dev `:3030` (`127.0.0.1:3030`, PID 8452). It was never restarted, and it served the fixed engine: the engine chunk was checked for the new code before each run.
- **The API:** uvicorn on `:8766`, under `env -i` with only these variables: `DATABASE_URL`, `KB_ROOT`, `KB_DB_PATH`, `KB_STARTUP_REINDEX=0`, `KB_GIT_COMMIT=false`, `KB_GIT_PUSH=false`, `KB_AUTH_RATE_LIMIT=0` and `KB_LISTEN_PART_CAP_S` (12 or 15). No vendor key was set, so nothing was spent.
- **The database:** Postgres 17 in `p41-f4-pg` on `127.0.0.1:55451`, at `alembic upgrade head` (`0007_listen`).
- **The account:** a throwaway `@example.test` account. It signed up through `:3030`'s own signup form in the headless profile. Its password, session and runner key stayed in 0600 scratch files and were never printed.
- **The content:** synthetic only, made-up notes and one two-chapter book. The parts came from macOS `say` in B2's pinned packaging (`aac_at` CBR 48k fMP4) through F3's scratch runner.
- **Making the stale units** (the plan's method, a cap change):
  1. Each target was made under `KB_LISTEN_PART_CAP_S=12`, giving 3 parts each.
  2. The API was restarted under cap 15. Under cap 15 the same text regroups:
     - **Case a's shape:** `[lede][First,Second][Third]` becomes `[lede,First][Second,Third]`. A **twin** document with the same title and text was made under cap 15, so every new part already existed in the tenant: every part reusable.
     - **Case b's shape:** `[lede][bridge][bank,mill]` becomes `[lede][bridge,bank][mill]`. Part 1 is reused, and the tail renders again.
  3. The groupings were checked offline with `manifest_for_source` before the run.
- **Width:** 1280.
- **Evidence:**
  - The screenshots are in `scratchpad/f4/shots/`.
  - Each state trail below comes from an in-page recorder (`scratchpad/f4/cdp/rec2.js`). It is a MutationObserver plus a 50 ms poll, logging every distinct dock state, dock status, head text and element source, with ms since the press.
  - The network lines come from CDP, including each response's status.

**Before the fix (the unfixed engine, `f4-before`).** The press attached the old list, and the old playlist answered 200. The first part answered **404**, because start had replaced the unit by then. hls.js retried the part about every 1–8 s. The trail:
- `136ms loading · Loading…`;
- `31858ms fail-play · Playback stopped · connection lost`, head "The connection dropped, so playback stopped at 0:00." (`before-a-press`).

So the listener saw **32 s of "Loading…" and then a false stop**. Try again then played the new 2-part unit, `0:03 of 0:18` (`before-a-tryagain`). This matches F1's mechanism, with a longer wait than F1 described.

| Case | Expected | Evidence | Result |
|---|---|---|---|
| a. the first press on a stale unit whose parts are all reusable | plays the new unit at once, with no fault message | `f4-a`. The old playlist answered 200, then its part `0.m4a` answered **404**. Start's answer replaced the unit, and the new list `XN4g…` was requested and answered 200. Its timeline answered 200, and its parts answered 206. The trail: `130ms loading` → `201ms` (new source) → `284ms playing · 0:00 of 0:18` → … → `18871ms finished · 0:18`. It never left loading or playing for a fault. The server's unit: 2 parts, `made`, 18.44 s (`a-press`). The final code (with the rejection handler) was run again on `f4-q`: `251ms` new source, `275ms playing`, `19000ms finished`, 0 fail or tap lines (`a-final`). | **pass** |
| b. the first press on a stale unit whose tail part must render again | plays the made prefix; reaching the unmade part reads preparing or buffering, never a fault | `f4-b`. The swap went to the new list `TOM9…` at `203ms`, and `280ms playing · 0:00 of 0:06 so far`. At the prefix's end, `7261ms buffering · Buffering… · 0:06 of 0:06 so far` (`b-prefix-end`). The server read `making`, 1 of 3 made, `len` 6.944. The scratch runner then made the tail: `22204ms playing` → `28263ms Playing · 0:12 of 0:18` → `33558ms finished · 0:18`. | **pass** |
| c. a real dropped connection (the API stopped mid-play) | the fault or offline states, as W1 verified (guard) | `f4-c` (60 s, 9 parts, made under cap 15, so no replacement). It played to 0:02, then the scratch API was stopped. The parts answered **502** with hls.js's retries. The trail: `32340ms playing · 0:32` → `33178ms buffering` → `34883ms fail-play`, head "The connection dropped, so playback stopped at 0:32." Headless Chrome stays `onLine`, so the state is `fail-play` rather than offline. With the API back, Try again → `Playing · 0:35 of 1:00` (`c-tryagain`). | **pass** |
| d. a new document version while sounding | still waits for the next press (W1's rule, guard) | `f4-d`. Version 1 was made, version 2 was published, and the page loaded with its seed (`old: true`, the v1 list `godA…`). "Another device" (a scratch API call plus the runner) then made v2's unit, list `oHmG…`. The press attached `godA…`. Start's answer carried `oHmG…`: another version, so not a replacement. The trail stayed on `godA…`, `playing · 0:04 of 0:19`, and **no request for `oHmG…`** was made while it sounded (`d-sounding`). Pause at 0:11.8 → Play (a press) → `oHmG….m3u8` requested, `Playing · 0:14 of 0:19` (`d-next-press`). | **pass** |
| e. Update audio on an outdated Listen | unchanged (guard) | `f4-e`. v2 was published and the page loaded. Listen played v1: "Earlier version · 0:02 of 0:18", with Update audio (`e-outdated`). **Update audio** → "Updating…". The runner made v2, and the poll's answer brought the v2 list. The source stayed the v1 list to the end, `19133ms finished · 0:19`, with no swap while sounding or at `ended`. **Start over** → the v2 list `vvQH….m3u8`, `Playing · 0:02 of 0:19` (`e-startover`). This is W1's flow, unchanged. | **pass** |
| f. WebKit's gesture rule | a refused `play()` after the async answer reads `tap`, never a fault | **By code:** the swap's `attach(…, true)` → `playNow()` → `NotAllowedError` → `mach({t: "rejected"})` → `tap`. The detach's `load()` drops the old source's queued events, so no stale `error` reaches `fault()`. **Vitest:** the new case asserts `press` → `rejected` → `tap`. **Live, stubbed** (`f4-b2`): `HTMLMediaElement.prototype.play` was stubbed so that every call after the press's own rejects with `NotAllowedError`, which simulates WebKit refusing the async play. The old part answered 404, and the swap went to `LzGD…`. The trail: `243ms loading` → `313ms tap · Ready to play`, head "It's ready. Your phone needs one more tap to start playing." The plays were `1` (the press) and `2` (the swap, refused). No fault followed (`f-tap`). With the stub removed, **Play** → `Playing · 0:02 of 0:06 so far` (`f-tap-play`). Real WebKit is the iPhone's, owed to acceptance. | **pass** (by code, Vitest, stubbed live) |
| g. book Listens | the same as a and b when a chapter's unit is replaced | The book `f4-book` has two chapters, both made under cap 12. Chapter 1 has a's shape, with a twin made under cap 15. Chapter 2 has b's shape. Listen on chapter 1: the old book list answered 200 and its chapter 1 part answered **404**. The new book list `RzFj…` and its timeline answered 200. The trail: `401ms` new source → `444ms Playing Chapter 1 · 0:00` (`g-ch1`). The dock and the lock screen read "The yellow kite / Two short walks". Chapter 2 started at stream 19 s, the new timeline's chapter 1 length (19.04 s): the dock, the lock screen and the live region read "The swan's afternoon". Chapter 2's made prefix played to `26453ms Buffering… Chapter 2 · 0:06`. The runner made the tail, and the stream played on to `60609ms finished · all 2 chapters`. The server: `made`, 5 of 5. | **pass** |

**Beyond the matrix:**
- **WebKit's path, approximated: Chromium's native HLS** (`f4-n`, `MediaSource.isTypeSupported` stubbed to `false`, so `native()` held). The element events: `waiting`, then **`error code 4`** on the old list (the part's 404), **before** start's answer. Then `pause` (Chrome's own, ignored in `loading`), then `emptied` (the swap's detach), then `loadedmetadata` and `playing` on the new list. The state trail never left `loading`/`playing` and ended at `finished · 0:18`, with 0 fail, paused or tap lines (`native-a`). This exercises the **hold**: the element's fault came first and waited for the answer.
- **A second press with the page's stale seed** (`f4-b2`, the same tab, after Stop listening). The head offered "Continue listening 0:06 of 0:06". The seed still named the replaced list, so its **playlist** answered **404**. The swap went to the current list `LzGD…` at the kept place 0:06.7. Once the runner made the tail, it played to `finished · 0:17` (`stale-seed-second-press`). Before the fix, this press would also have stopped falsely.
- **A pause before start's answer** (`f4-p`). Listen, then Pause 15 ms later. The trail: `137ms loading` → `150ms paused · 0:00 of 0:18`. The element was detached (`src` none, `networkState` 0), and nothing played on its own (`paused-during-start`). **Play** → the new list `pWpj….m3u8`, `Playing · 0:03 of 0:18` (`paused-during-start-play`).
- **A failed start call with a held fault** (`f4-r`, native). The page's seed list was replaced before the press, and the start action was failed once, 1.5 s after it was sent, through CDP `Fetch`. The old playlist answered 404 and the element raised `error code 4`, which was held. The action failed, and the rejection handler ran the held fault: `1854ms fail-play`, "The connection dropped, so playback stopped at 0:00" (`reject-held`). That is correct, because no answer came. Without the handler it would have stayed "Loading…".

## § Owed to round 2

- **The Claude in Chrome run of cases a–g.** It belongs in the agent's Chrome (`select_browser` on the recorded `deviceId`) on the manifest runtime, once OQ5 is answered. This slice ran headless only, as the plan says. Do not count the headless run as the Chrome run.
- **The production build** was not exercised here, as in F3. The engine path is the same.
- **Real WebKit (iPhone):** the press on a stale unit, and the `tap` fallback if Safari refuses the swap's `play()` outside the gesture. This belongs with the operator's iPhone checks. f is proven here by code, by Vitest and by a stubbed live run only.
- **Production's one pre-F1 document** at acceptance: its first press should now play at once, with no "connection dropped". If its tail must render again, it plays the made prefix and then reads Buffering until the Mac renders the changed part.

## Observations (not fixed here; outside the slice or pre-existing)

1. **"0:07 of 0:06 so far".** While a made prefix grows, the shown length lags the stream until the next 6 s poll (case b, and the second press). This is W1's polling behavior. It is cosmetic.
2. **`fault()` hangs if its own state read is rejected.** If the `listenRead` call itself rejects (the action fails at the network level while `navigator.onLine` holds), `fault()` never decides, and the Listen stays "Loading…". This was seen only when the test interceptor failed **every** action. It is pre-existing and unrelated to the hold. The one-shot failure above resolves correctly.
3. **Try again can re-attach a dead list (by code).** After a start call that failed, `retry()` re-attaches `l.play`, which is still the seed's list. If the seed's unit was replaced, it 404s again. This occurs only when the start call fails. It is pre-existing.
4. **A doc comment overstates.** `KbListenPlay`'s comment in `web/src/lib/knowledge/listen.ts` says "the old playlist keeps serving what it served". That is not true of a **replaced** unit, which B2 404s. The file is outside this set.

## Teardown

- **The headless Chrome and the CDP daemon:** stopped. Ports 9333 and 9334 are free.
- **The scratch API on :8766:** stopped. Nothing listens there.
- **`p41-f4-pg`:** removed with `docker rm -f -v`, with its anonymous volume. Port 55451 is free. Every dangling volume left on the host dates from 2026-10-23 to 2026-11-10, so none is this run's. The throwaway account, its session and its runner key went with the database.
- **Not touched:**
  - `:3030` (PID 8452), never restarted and still answering 200;
  - every other container and volume;
  - production and the installed runner;
  - every `.env` file.
- **Refused delete:** the `rm` of the scratch leftovers was denied, and I did not retry it or work around it. Please delete:
  - `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/f4/cdp-profile`, the headless profile (192 MB). It holds the dead scratch session's cookie;
  - in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/f4/`, the secret files `acct-email.txt`, `acct-pw.txt`, `session.txt`, `vk.txt`, `pgpw.txt` and `dsn.txt`. They are credentials for the removed scratch database only. Also `last-claim.json` and `machine.ts.keep`, a copy of this slice's own `machine.ts`;
  - `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/f4/parts`, the rendered `say` parts (81 MB, synthetic);
  - `/tmp/p41f4-kbroot-BmpO`, the scratch `KB_ROOT` with the synthetic documents and their stored parts (3.2 MB).
- **Kept for round 2 on purpose:** the rest of `scratchpad/f4/`. That is `shots/` (the evidence), `cdp/` and `tools/` (the scripts, with no secrets in them; `tools/mkdocs.py` and `groups.py` rebuild the stale-unit setup) and the logs.
