# P41-sr.F3 — A book Listen keeps to its own language: titles, kept place, counts

## Goal

Fix review round 1's **F3**: everything a book Listen shows or resumes belongs to **that Listen's own language**.
Today an English Listen shows a Korean chapter title in the dock, the player, the lock screen and the live region. An
English kept place is offered on a Korean chapter page, and pressing it plays the Korean audio from the English
seconds. A Korean Listen of 2 chapters reports all 4. The landing's Start over starts the other language.

**Read first:**
- `slices/P41-sr.REVIEW/result.md` § Findings → *F3*: the rule, the causes and the case table a–k;
- `slices/P41-sr.W2/result.md`: book Listen, the landing slot, the kept place;
- `slices/P41-sr.B2/result.md` § Contract: the timeline's entries carry the audio's own `title` and `lang`;
- the code the review cites:
  - `web/src/lib/listen/engine.ts:137-143` and `:576`: titles from the page's seed `l.book.chapters`;
  - `server/listen_jobs.py:718`: positions keyed without `lang`;
  - `server/listen_api.py`: the state's `position`, `kept` and `resume`;
- F2's change (`slices/P41-sr.F2/result.md`): speed and follow now come from the listener's newest row, whatever the
  item. Keep that.
- the signed design: `frame.md` F17 (the kept position) and F31 (the landing's Listen); `result.md` § Build, *The
  wiring*.

## The rules (pinned)

1. **Titles come from the audio.** Every title a book Listen shows comes from the **timeline entries**: the dock,
   the player, Media Session (title = the chapter, album = the book), the live region, and the chapter rows inside
   the player. These carry the audio's own `title` and `lang`, never the page seed's variant. While the timeline is
   not loaded yet, fall back to the seed only if its language matches the Listen's `lang`. Otherwise show the
   chapter's position, as the canvas's copy allows, and never another language's title.
2. **A place in another language is no place.**
   - The state route, the chapter head's `Continue listening · … of …`, the landing's Continue listening and the
     bottom pill treat a saved position whose `lang` differs from the page's or Listen's language as **none**.
   - Speed and follow stay the listener's (F2).
   - Never resume one language's seconds in another language's audio.
3. **No schema change.** `0007_listen` is applied on production, so filter by `lang`; never key positions by it. One
   kept place per book and start chapter remains: the newest Listen's, in its own language. The design's F17 draws one
   kept position. So case g passes when **no page offers a place in a language other than its own**. Record that as
   the interpretation.
4. **Counts belong to the Listen.** The finished copy, and every "n chapters" count, use this Listen's own listenable
   entries, never the book's whole chapter count.
5. **The landing's Start over** restarts the **kept Listen's** language from chapter 1 · 0:00. It is the counterpart
   of the Continue listening shown beside it. With no kept Listen, it uses the landing's current language, as today.

## The acceptance matrix (prove every case)

| Case | Expected |
|---|---|
| a. the dock's title | the audio's language |
| b. the player's title | the same |
| c. the Media Session title and album | the same |
| d. the live region | the same |
| e. later chapters of the same Listen | each title from its timeline entry |
| f. an English kept place on the Korean chapter page | not offered; the Korean page offers its own place or a fresh Listen |
| g. a Listen in one language, then the other, from the same chapter | no page offers the other language's place (rule 3) |
| h. a Korean Listen covering 2 of 4 chapters | "You've listened to all 2 chapters", in the canvas's own wording for the count |
| i. the landing's Start over while Continue listening is the Korean Listen | starts the Korean Listen at chapter 1 · 0:00 |
| j. the landing → reader link opens the chapter in the Listen's language | stays a pass (W2) |
| k. document Listens (one language) | unchanged: guard |

## Files (the set)

- `web/src/lib/listen/**`, `web/src/components/listen/**`, `web/src/components/book/book-listen.tsx`, and the book
  route files under `web/src/app/(public)/[org]/[project]/books/[book]/**` only if a seed must carry `lang`;
- `web/src/content/listen.ts`, for the finished count;
- `web/tests/listen-player.test.ts`: at most **two** cases. One for rule 1, the title source; one for rule 2, a
  position in another language read as none;
- `server/listen_api.py` and `server/listen_jobs.py` (the `lang` filter on `position`, `kept` and `resume`), with their
  plugin template mirrors byte-identical;
- `tests/test_listen.py` and its mirror: at most **one** assertion, for the server filter.

**Not:** alembic, `server/persistence/models.py`, `package.json` or the lock file.

## Verification

**The browser.** The operator has not yet answered whether the agent's Chrome may stay signed in on production
(OQ5). So this slice **does not drive Claude in Chrome**. The live cases run in **headless Chrome over CDP with a
throwaway profile**, as W1 did for phone widths. The Claude in Chrome run of these cases is owed to review round 2.
Say so in `result.md`, and never call the headless run the Chrome run.

**The stack:** rebuild W2's by its `result.md`. Its scripts are in the scratchpad's `w2/tools/` if still there;
otherwise rewrite them.
- Postgres in a container named **`p41-f3-pg`** on **127.0.0.1:55451**, then `alembic upgrade head`;
- the API on **:8766**, with a scratch `KB_ROOT` and a small `KB_LISTEN_PART_CAP_S`;
- dev `:3030`, the operator's: drive it, **never restart it**, never read or edit `web/.env.local`;
- the headless profile signs up a throwaway account on `:3030`. Mind the limiter;
- content: one **synthetic** book of 4 short chapters in English, with a Korean variant of 2 chapters; macOS `say`
  parts in B2's pinned packaging.

**Prove a–k live,** with screenshots in the scratch directory and synthetic content only. For c, read
`navigator.mediaSession.metadata`. For d, read the live region's text.

**Phone width:** spot-check the dock and player titles at 390.

**Tear down:** the container with its volume, the API, and the headless profile. If a delete is refused, list it.

## Validation

- `cd web && pnpm vitest run tests/listen-player.test.ts tests/listen-relay.test.ts`, `pnpm exec tsc --noEmit`, and
  eslint and prettier `--check` on the changed TypeScript files;
- `uv run pytest -q tests/test_listen.py tests/test_listen_play.py` with the scratch DSN; then the full
  `uv run pytest -q` once;
- `uv run python scripts/plugin_parity.py`: exit 0;
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
- **§ Cases:** the matrix with each case's evidence;
- **§ Owed to round 2:** the Claude in Chrome run of a–k.

The `notebook` field holds:
- **Decisions:** one gist, `Book Listen language (F3): titles from the timeline entries; a place in another
  language is none; no schema change; one kept place per book and start chapter → slices/P41-sr.F3/result.md`;
- **Doc impact:** `api.md` (the `lang` filter) and `experience.md` (titles and places follow the audio's language),
  one line each;
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
