# P41-sr.F3 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** A book Listen now keeps to its own language. Its titles come from the timeline's entries, the audio's own: the dock, the player and its chapter rows, the lock screen and the live region. Until the timeline is read, it uses the page's title only when that title is in the Listen's language; otherwise it shows `Chapter n`. A place saved in another language counts as none, on the server (`position`, `kept`, `resume`, filtered by `lang`, with no schema change) and in the client (the chapter head, the pill, the landing). The finished copy and the landing's count use the Listen's own chapters. The landing's Start over restarts the kept Listen's language. Cases a–k all pass, live in headless Chrome over CDP on `:3030` against a scratch API.
- **files_changed:**
  - `server/listen_api.py`, `server/listen_jobs.py`
  - `plugin/templates/kb/server/listen_api.py`, `plugin/templates/kb/server/listen_jobs.py` (byte-identical mirrors)
  - `tests/test_listen.py`, `plugin/templates/kb/tests/test_listen.py` (byte-identical mirror)
  - `web/src/lib/listen/{types,book,engine,view,seed}.ts`
  - `web/src/content/listen.ts`
  - `web/src/components/listen/{dock,player,listen-page}.tsx`
  - `web/src/components/book/book-listen.tsx`
  - `web/tests/listen-player.test.ts`
  - `works/phases/active/P41-sr/slices/P41-sr.F3/result.md`
- **validation:**
  - `cd web && pnpm vitest run tests/listen-player.test.ts tests/listen-relay.test.ts`: **pass**, 15 tests (2 new).
  - The full `pnpm vitest run`, once: **pass**, 604 tests in 43 files.
  - `pnpm exec tsc --noEmit`: **pass**, 0 errors.
  - `eslint` and `prettier --check` on the 11 changed TS/TSX files: **pass**.
  - `alembic upgrade head` on the scratch `p41-f3-pg`: **pass**, head `0007_listen`.
  - `KB_TEST_DATABASE_URL=<scratch> uv run pytest -q tests/test_listen.py tests/test_listen_play.py`: **pass**, 6 passed.
  - The same test with the filter removed temporarily: the new assertion **fails**. It read `({…'lang': 'ko', 'kept': True…}, True, 1.25)` where `(None, False, 1.25)` was expected. The file was then restored from its mirror, and `cmp` confirmed the two are byte-identical.
  - `uv run pytest -q`, the full suite on the scratch DSN: **pass**, 252 passed.
  - `uv run python scripts/plugin_parity.py`: **pass**, exit 0.
  - `python3 scripts/workflow.py validate`: **pass**, with only the earlier warnings.
  - Live cases a–k: **all pass**, headless (§ Cases).
  - `git status --porcelain --untracked-files=all`: only the set and this slice folder. `works/backlog.md`, `works/events.jsonl`, `phase.md`, `slice.json`, `plan.md` and `UPDATE_REQUIRED.md` were already modified or untracked by the orchestrator.
- **deviations:**
  1. **`phase.md` is not written here.** The plan's Return sends the entries through the `notebook` field (below).
  2. **The landing reads one more state per other language.** The server's `resume` is now one language's own. So the landing reads the book's Listen in each language its chapters have, and offers the newest place among them in its own language (`readBookSeed`). That is one extra state read per other language, plus the resume read W2 already made. Without it, after a full load the landing could never show a Korean place, and case i could not occur.
  3. **`ListenChapter.lang` now always names the language of its `title`.** W2's landing mapping changed `lang` to the Listen's language together with the href, but kept the row's title. That let a Korean title pass as English. Only the href is mapped now.
  4. **The live region drops the title while it is unknown.** It reads `Playing: chapter 1`, which is the canvas's sentence without its title, until the timeline names the chapter. `playingChapter` takes `title: string | null`.
  5. **The engine reads a book's timeline at the press.** It no longer waits for the start's answer, so the fallback `Chapter n` shows only briefly.
  6. **The landing's Listen and Start over are now two actions.** The Listen control starts the landing's own language. Start over, beside Continue listening and in the finished note, restarts the place's language (rule 5). In W2 both called the same function.
  7. **The cleanup delete was refused.** The `rm` of the scratch secrets, the headless profile, the KB root and the parts was denied, and I did not retry it (§ Teardown).
- **doc_impact:** returned in `notebook` (below), not written to `phase.md`.
- **notebook:**
  - **Decisions:** `Book Listen language (F3): titles from the timeline entries; a place in another language is none; no schema change; one kept place per book and start chapter → slices/P41-sr.F3/result.md`
  - **Doc impact** (one line each, verbatim):
    - api.md: GET /app/listen/state (and /start, /update) reads position and kept only from a row saved in the Listen's own lang, and a book's resume is the newest row of that book in that language. A row of another language reads as none. Positions stay one row per Listen and start chapter, with no schema change (P41-sr.F3).
    - experience.md: a book Listen's titles (the dock, the player and its chapter list, the lock screen, the live region) come from the audio's own language, else read "Chapter n" until it is known. Continue listening is offered only in its own language: the chapter head, the pill, and the landing, which offers the newest place across languages and opens that language's pages. The landing's Start over restarts that language. "all n chapters" and the landing's "n chapters" count the Listen's own chapters (P41-sr.F3).
  - **Notes for later slices** (verbatim): **(from P41-sr.F3, for P41-sr.REVIEW round 2)** F3's cases a–k ran in headless Chrome over CDP only (OQ5 open). The Claude in Chrome run of a–k is owed to round 2, along with four unfixed observations → slices/P41-sr.F3/result.md § Owed to round 2, § Observations.
  - **Operator Questions** (verbatim): - **OQ6 (P41-sr.F3):** A book Listen now counts its own chapters (rule 4), so a Listen started on a book's last chapter finishes with "You've listened to all 1 chapters." / "Finished · all 1 chapters". Should a one-chapter Listen use the canvas's document copy ("You've listened to the end." / "Finished · 31:15"), or keep the wording as drawn? Recommendation: use the document copy.
  - **Now** (verbatim): F3 landed: a book Listen keeps to its own language. Titles come from the timeline, a place in another language is none (server and client, no schema change), counts are the Listen's own, and the landing's Start over restarts the kept language. Cases a–k pass headless on :3030 (slices/P41-sr.F3/result.md § Cases). The Claude in Chrome run is owed to round 2. Next: F4.

## The change

**Server** (`_state`, and its mirror):

- `position` is set to `None` when `position.lang != listen.lang`. `kept` derives from it.
- `resume` is `latest_position(..., item=book, lang=listen.lang)`. `latest_position` gains an optional `lang` filter.
- Unchanged:
  - the preference, which is still the listener's newest row (F2);
  - the position PUT;
  - `clear_kept`;
  - the `0007` key.

**Client:**

- **`lib/listen/book.ts`:**
  - `spansOf` carries each timeline entry's `title` and `lang`.
  - `chapterTitle(l, key)` is rule 1. It returns the timeline's title, else the page's title only when it is in `l.lang`, else null.
  - `placeIn(place, lang)` is rule 2.
  - `ownChapters(entries)` is rule 4.
- **`types.ts`:**
  - `Listen.lang` is now the Listen's language, the state's `listen.lang`.
  - A new `Listen.titleLang` holds the title's language, or null while `Chapter n` stands in.
  - `ListenSpan` gains `title` and `lang`.
- **`engine.ts`:**
  - `placeAt` titles every chapter through `chapterTitle`.
  - `absorb` takes the state's `listen.lang`.
  - A title change refreshes Media Session (`retitle`).
  - The press reads a book's timeline at once.
- **`view.ts`:** `bookNums.own` feeds `allChapters` and `finishedBook`. "Chapter n of N", the making note and the progress line still count the book, as W2 decided.
- **`dock.tsx`, `player.tsx`:**
  - The title's `lang` comes from `titleLang`.
  - The player's chapter rows use `chapterTitle`, else `Chapter n`.
- **`listen-page.tsx`:** `resumeOf` filters the kept place, `resume` and `position` through `placeIn`, using the page's Listen language. This covers both the head and the pill.
- **`seed.ts`, `book-listen.tsx`:** the landing gets a seed per language (`langs`) and the newest `place` across languages.
  - The place's language picks the chapters, the hrefs, the chapter length, the last chapter and Start over.
  - Listen starts the landing's own language.
  - The "n chapters" count is the start Listen's own.

## § Cases

**Where they ran:**

- **The browser:** headless Google Chrome 157, a throwaway profile (`scratchpad/f3/cdp-profile`), driven over CDP by a small Node step daemon (`scratchpad/f3/cdp/`). This is **not** the Claude in Chrome run: OQ5 is open, so the plan rules that out.
- **The runtime:** the operator's dev `:3030` (`127.0.0.1:3030`, not restarted), whose upstream is the scratch API.
- **The API:** uvicorn on `:8766`, under `env -i` with only `DATABASE_URL`, `KB_ROOT`, `KB_DB_PATH`, `KB_STARTUP_REINDEX=0`, `KB_GIT_COMMIT/PUSH=false`, `KB_AUTH_RATE_LIMIT=0` and `KB_LISTEN_PART_CAP_S=12`. No Gemini key was set, so nothing was spent.
- **The database:** Postgres 17 in `p41-f3-pg` on `127.0.0.1:55451`, at `alembic upgrade head`.
- **The account:** a throwaway `@example.test` account, signed up through `:3030`'s own signup form in the headless profile. Its token, key and password stayed in 0600 scratch files and were never printed.
- **The content:** synthetic only. The book is W2's made-up `listening-lab`: 4 English chapters, with Korean variants of chapters 1 and 2. There is also one loose note. The parts were made with macOS `say` in B2's pinned packaging (`aac_at` CBR 48k fMP4): 15 English parts, 5 Korean and 2 for the note.
- **Width:** 1280 unless noted.
- **Evidence:** the screenshots are in `scratchpad/f3/shots/`. Each title trail below is an in-page recorder, a MutationObserver plus a 50 ms poll that logs every distinct dock title, player title, Media Session title / album, live-region text and head text from before the press.

| Case | Expected | Evidence | Result |
|---|---|---|---|
| a. the dock's title | the audio's language | The review's own setup: the landing's chapter 1 row shows `등대지기의 아침` (Korean, the variant last opened), with no saved place. **Listen** started the English Listen. The trail: `dock: Chapter 1 @en` → `dock: The lighthouse keeper's morning @en`; the Korean title **never** appears (`a-landing-listen-before`, `a-landing-listen-en`). The same holds from the landing's **Continue listening** on an English place (`a-landing-continue-en`). Korean Listens show `등대지기의 아침 @ko` / `보급선 @ko`. | **pass** |
| b. the player's title | the same | English Listen started from the Korean row: `player: The lighthouse keeper's morning @en`, with rows `1 The lighthouse keeper's morning · 2 The supply boat · 3 The storm · 4 The calm after` (`b-player-en-from-ko-row`). Korean Listen: title `등대지기의 아침 @ko`, rows `1 등대지기의 아침 · 2 보급선 · 3 Chapter 3 Not prepared yet · 4 Chapter 4 Not prepared yet`. Chapters 3 and 4 have no Korean variant, so their place stands in (`b-player-ko-chapters`). | **pass** |
| c. the Media Session title and album | the same | `navigator.mediaSession.metadata` read `The lighthouse keeper's morning / Listening lab: a field guide` on English audio and `등대지기의 아침 / Listening lab: a field guide` on Korean audio. It followed each chapter change: `The storm`, `보급선`, `The calm after`. The album is the book's one title. | **pass** |
| d. the live region | the same | The dock's `.lx-sr` read `Playing: chapter 1, The lighthouse keeper's morning` on English audio and `Playing: chapter 1, 등대지기의 아침` / `Playing: chapter 2, 보급선` on Korean audio. While the title was unknown it read only `Loading…`; the trail shows no other-language title. | **pass** |
| e. later chapters of the same Listen | each title from its timeline entry | English: a player chapter seek to 3 → dock, player, Media Session and live region all read `The storm` (`e-en-ch3`). Korean: a seek to 2 → `보급선` everywhere (`e-ko-ch2`). An English Listen from chapter 2 played into chapter 4 → `The calm after`. | **pass** |
| f. an English kept place on the Korean chapter page | not offered; the Korean page offers its own place or a fresh Listen | **Server path.** The English Listen was paused at chapter 1 · 0:09 (row `(book, ch1)` en, 9.29 s). A full load of `/ch1?lang=ko` → head `Listen · Chapters 1–2` (`f-ko-ch1-after-en-place`); the state route read `position: null, resume: null` for ko. **Client path.** Stop listening at English chapter 1 · 0:08; the English head read `Continue listening 0:08 of 0:32` (`f-en-stopped`). A client-side switch to 한국어 → head `Listen · Chapters 1–2` (`f-ko-ch1-client-kept`), and the pill `Listen · Chapters 1–2` (`f-ko-ch1-pill`). | **pass** |
| g. a Listen in one language, then the other, from the same chapter | no page offers the other language's place (rule 3) | A Korean Listen from chapter 1, stopped at 0:07, overwrote the one `(book, ch1)` row (ko, kept). English chapter 1: `Listen · Chapters 1–4 · about 2 min`, both client-side (`g-en-ch1-client`) and on a full load (`g-en-ch1-load`); the en state read `position: null, resume: null`. Korean chapter 1: `Continue listening 0:07 of 0:24` (`g-ko-ch1-load`). The scratch database then held exactly one book row: the single kept place is the newest Listen's, in its own language. | **pass** (interpretation, rule 3) |
| h. a Korean Listen covering 2 of 4 chapters | "You've listened to all 2 chapters" | Played to its end: head `Finished · You’ve listened to all 2 chapters.`, dock `Finished · all 2 chapters` (`h-ko-finished`). The landing after a full load: `Finished · You’ve listened to all 2 chapters. · Start over` (`h-landing-ko-finished`). An English Listen from chapter 2 of 4 finishes with `all 3 chapters` (`h-en-from-ch2-finished`). | **pass** |
| i. the landing's Start over while Continue listening is the Korean Listen | starts the Korean Listen at chapter 1 · 0:00 | The landing on a full load showed `Continue listening · Chapter 1 · 0:07 · Start over`, with the place in Korean (`i-landing-ko-place`). **Start over** → `/ch1?lang=ko` with the Korean playlist, head `Playing Chapter 1 · 0:00` → `0:04`, dock `등대지기의 아침 @ko` (`i-startover-ko`). It also passes from the finished note (`i-landing-finished-startover`), and in-session: a Korean Listen stopped on the landing, then Start over → `/ch1?lang=ko`, Korean (`i-landing-client-kept-ko`, `i-landing-client-startover`). | **pass** |
| j. the landing → reader link opens the chapter in the Listen's language | stays a pass (W2) | The English place → `/ch1`, although the row's own link is `?lang=ko` (`a-landing-continue-en`). The Korean place → `/ch1?lang=ko`, resumed at 0:13 on the Korean playlist (`j-continue-ko`). Listen on an English Listen from the Korean row → `/ch1`. | **pass** |
| k. document Listens (one language) | unchanged: guard | `/documents/7` (the loose note): Listen → `Preparing… Part 1 of 2` → Ready → Playing. The dock title `Listening lab: a loose note @en`; Media Session `title / album` is the note's title, as W1 built it; the live region `Playing` (no chapter). Stop at 0:04 → reload → `Continue listening 0:05 of 0:12` (`k-doc-reload-continue`). (`k-doc-listen.png` is a 404 from a wrong first URL, not evidence.) | **pass** |

**Phone width (390):**

- A Korean Continue listening from the landing: dock `등대지기의 아침` and player title `등대지기의 아침 @ko` (`p390-landing`, `p390-dock`, `p390-player`).
- An English Listen from chapter 2: dock `The supply boat`, with player title and rows in English (`p390-en-dock`, `p390-en-player`).
- Nothing overflows in either shot.

**Before the fix:** the review recorded a, b, c, d and f–i failing live, and e failing by code (`slices/P41-sr.REVIEW/result.md` § F3). The server half's pre-fix failure was reproduced here through the test above.

## § Owed to round 2

- **The Claude in Chrome run of cases a–k.** It belongs in the agent's Chrome (`select_browser` on the recorded `deviceId`) on the manifest runtime, once OQ5 is answered. This slice ran headless only, as the plan says. Do not count the headless run as the Chrome run.
- **The production build** (the review saw a on it) was not exercised here. The engine path is the same.
- **iOS** still needs the lock-screen title on WebKit's native HLS. It is part of the operator's iPhone checks.

## Observations (not fixed here)

1. **The lock screen keeps the last title after Stop.** After Stop listening, `navigator.mediaSession.metadata` keeps the stopped Listen's title, with `playbackState: none`, until the next Listen plays. This was there before F3 and is not a language mix. A clean Stop would clear it.
2. **The landing's rows can pair a manifest title with a variant's `lang`.** The rows' title prefers the book manifest's chapter title over the variant's (`lib/book/load.ts`, `title: c.title || s.variant.title`), while `lang` is the shown variant's. For a book whose manifest names chapter titles, the landing's seed may pair such a title with the wrong `lang`, and rule 1's page fallback could show it until the timeline loads. That file is outside this set. The server's state entries carry the same preference (`_resolve`); the web does not read it.
3. **Follow along does not check the language.** It compares the unit and the chapter, not the language (`onThisPage`). A Listen in one language, docked while the other language's page of the same chapter is open, follows its own segments over the other text. This was not exercised.
4. **A Listen that starts mid-book now counts only its own chapters in the finished copy** (rule 4: "all 3 chapters" from chapter 2 of 4). For a Listen of one chapter this gives "all 1 chapters" (OQ6).

## Teardown

- **The headless Chrome and the CDP daemon:** stopped. Ports 9333 and 9334 are free.
- **The scratch API on :8766:** stopped. Nothing listens there.
- **`p41-f3-pg`:** removed with `docker rm -f -v`, so the container, its volume, the throwaway account, its sessions and its key are gone with it.
- **Not touched:**
  - `:3030` (PID 8452), left running and never restarted;
  - every other container;
  - production and the installed runner;
  - every `.env` file.
- **Refused delete:** the `rm` of the scratch leftovers was denied, and I did not retry it. Please delete:
  - `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/f3/cdp-profile`, the headless profile (189 MB, holding the dead scratch session's cookie);
  - in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/f3/`, the secret files `acct-email.txt`, `acct-pw.txt`, `session.txt`, `vk.txt`, `pgpw.txt` and `dsn.txt`. They are credentials for the removed scratch database only;
  - `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/f3/parts`, the rendered `say` parts (28 MB, synthetic);
  - `/tmp/p41f3-kbroot-Xg0a`, the scratch `KB_ROOT` with the synthetic documents and their stored parts.
- **Kept for round 2 on purpose:** the rest of `scratchpad/f3/`: `shots/` (the evidence), `cdp/` and `tools/` (the scripts, with no secrets in them) and the logs.
