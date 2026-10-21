# P30.REVIEW: result

Round 3 (after P30.F6) is first. Round 2 (after P30.F5) and round 1 are kept unchanged below it.

## Verdict (round 3)

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **review_verdict:** **pass**. R3 is fixed, and F5 still holds.
- **summary:** All gates pass together. I checked F6 live on a fresh scratch production build, signed in and signed out, with CDP and Aside `u1`. Every chapter-to-chapter path lands at y 0, or at the saved place with its pill. Signed in, the opened chapter's DB row is `started` at fraction 0, never `finished`. Hash, `?note=`, the sign-in return and a reload keep their landing. F5's chrome gives the same table as round 2 on both readers at 1440, 820 and 390. I wrote the qa gate lines as v0019 and finalised the walkthrough.
- **files_changed:**
  - this file (round 3 added above round 2);
  - `docs/versions/qa/v0019_p30.review_round_3_regression_checklist_gains_f6_s_chapter-navigation_line_next_opens_the_next_chapter_at_its_top_not_finished_and_f5_s_reader-chrome_line.md`, plus `docs/current/qa.md` and `docs/index.json` through `rebuild-docs`;
  - `works/phases/active/P30/phase.md`: *Notes for later slices* (consumed F6's round-3 note) and *Now*.
- **validation:** every command passed (table below).
- **deviations:**
  1. No dev clone this round. The round-3 plan names the production build only, and F6 ran its matrix on a dev clone already.
  2. Two sign-ins, not one: one BFF sign-in over CDP (the cookie was reused for every signed-in CDP run) and one real form sign-in in Aside, which was the sign-in return check itself. The scratch API ran with `KB_AUTH_RATE_LIMIT=200`. No 429 was seen.
  3. I ran `uv run alembic upgrade head` on the scratch database too, since the stack needed a schema. It is not in round 3's gate list.
- **doc_versions:** qa **v0019**, `## Regression Checklist` only. It adds two lines: "Next opens the next chapter at its top, not Finished" (F6), and the reader chrome rules (F5; round 1's v0018 predates F5, so it lacked them). Operations is unchanged: the runtime did not change. Everything else is deferred to a docs phase.
- **walkthrough:** below, under *Walkthrough (round 3, for the gate)*.
- **explain:** not written — run /explain for this phase.

### Validation (round 3)

| Command | Result |
|---|---|
| `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q` | pass, 229 passed |
| `cd cli && uv run pytest -q` | pass, 55 passed |
| `pnpm --dir web typecheck` | pass |
| `pnpm --dir web lint` | pass |
| `pnpm --dir web test` | pass, 37 files, 395 tests |
| `NEXT_PUBLIC_APP_URL=https://knowledge.hi2vi.com pnpm --dir web build` | pass |
| `python3 scripts/plugin_parity.py` | PASS |
| `python3 scripts/skills_parity.py` | PASS |
| `python3 scripts/workflow.py validate` | passed, before and after the qa version (pre-existing warnings only: P22/P26 kinds, P28 debt, stale docs, oversized sections) |
| `uv run alembic upgrade head` on the scratch database `kb_rv3live` | pass, 0001 → 0006 |

### Stack and instruments (round 3)

**Stack** (session scratchpad `…/scratchpad/rv3/`):
- a scratch API `:8993` (PID 77379), with a scratch git `KB_ROOT`, the database `kb_rv3live` in `kb-p28s2-pg`, `KB_GIT_COMMIT=false`, `KB_STARTUP_REINDEX=false`, `KB_AUTH_RATE_LIMIT=200` and no Gemini keys;
- one member, `rv3-member@example.com` (org `rv3org`), with an org-level `vk_` key;
- the fixture book via `publish_fixture_book.py`, plus round 2's 12-part `long-legacy` html chapter at position 4;
- `fixtures` set public;
- a block note on `write-lock` / `lock-quiz`, for `?note=`;
- the production build (HEAD `9650654`, built by the gate run) with `next start :3996` (PID 77473).

**Cleanup:** I stopped exactly PIDs 77379 and 77473. The headless Chromes exited with their scripts, and Aside's tab closed with its call. Aside was signed out of the scratch BFF at the end (`POST /api/auth/logout` 200). I dropped `kb_rv3live`. Afterwards `:3030` (8452) and `:8766` (66506) were still listening. I never touched either.

**Instruments:**
- Headless Chrome over CDP (round 2's `cdp.mjs` driver), with a new matrix script (`rv3/nav.mjs`). It recorded the scroll position 150 ms and 3.6 s after each click, every position POST body, and the `reader_positions` rows via `psql`. The table was cleared before each row.
- Round 2's chrome script (`rv3/chrome.mjs`, `Input.synthesizeScrollGesture`, mouse at 1440 and touch at 820/390).
- Aside `aside repl --account u1` at 1440×900, with real `mouse.wheel`, clicks, the `End` key and a real form sign-in.
- **Not run:** real iPhone and iPad, Safari, Firefox. Those stay the operator's.

### F6 live (production build)

**Chapter to chapter, CDP 1440×900.** Each row is one navigation from `all-blocks` to `write-lock`. Signed-in "row after" is the `reader_positions` row for `write-lock`.

| From `all-blocks` | Via | Signed out lands | Signed in lands | Signed in: writes after the click | Signed in: row after |
|---|---|---|---|---|---|
| top (0) | bar Next / end Next / Contents | 0 / 0 / 0 | 0 / 0 / 0 | `fraction 0, max_fraction 0` | `0.000 / 0.000 started` |
| y 1500 | bar Next / end Next / Contents | 0 / 0 / 0 | 0 / 0 / 0 | the same | `0.000 / 0.000 started` |
| the end (9006 / 9066) | bar Next / end Next / Contents | 0 / 0 / 0 | 0 / 0 / 0 | the same | `0.000 / 0.000 started` |

- 150 ms after the click the page sometimes reads y 193 (the loading skeleton's clamp). It is at 0 once the chapter is in, and nothing is written before then.
- **Previous** from `write-lock` at 1500 and at its end: `all-blocks` at 0. Signed in, the `every-block-once` row is `0.000 started`.
- **Book page row** at 1440×420, from the book page's end (168/168 signed out, 348/348 signed in): `write-lock` at 0, row `0.000 started`.
- **A chapter with a saved place:** `write-lock` saved at `0.520 started how-it-works`, then Next from `all-blocks`' end. It lands at 1183 with the pill "Picked up where you left off · How it works". The row stays `started` (0.513 / 0.520). `every-block-once` is `1.000 finished`, which is right: that page really was read to its end.
- **No `finished: true`, and no inflated `max_fraction`, was sent for any opened chapter.**

**Landings that own the place** (CDP):

| Check | Signed out | Signed in |
|---|---|---|
| router push `write-lock#how-it-works` from `all-blocks` at 1500 | y 1186, block top 72 | y 1186, block top 72 |
| hard load `write-lock#how-it-works` | y 1186, top 72 | y 1186, top 72 |
| router push `write-lock?note=<id>` from `all-blocks` at 1500 | (members only) | y 1508, block top 91 |
| hard load `write-lock?note=<id>` | (members only) | y 1508, block top 91 |
| reload of `all-blocks` at 3000 | y 3000 (the browser keeps its place) | y 2960, with the resume pill (the saved place) |
| `write-lock` end → Contents → `long-legacy` (native → legacy) | window y 0 | y 0, row `long-legacy 0.000 started` |
| `long-legacy` → Contents → `write-lock` (legacy → native) | y 0 | y 0, row `write-lock 0.000 started` |

**Real browser: Aside `u1`, production build, 1440×900:**
- Signed out:
  - wheel to 1500, then bar Next: `write-lock` y 0;
  - `End` (2248), then bar Previous: `all-blocks` y 0;
  - `End` (8863), then the end section's Next: `write-lock` y 0;
  - wheel to 2100, a tap on the text, Contents, then `write-lock`: y 0.
- **Sign-in return:** on `write-lock` at 660, the top bar's Sign in links `/login?next=…/write-lock?lang=en#background`. After a real form sign-in it returned to `write-lock?lang=en#background` at y 547, with the heading at 72.
- Signed in, `End` on `all-blocks` (8923), then bar Next: `write-lock` opened at 544, its saved place (the landing just before saved it). The same from mid-chapter.
- The database afterwards: `every-block-once 0.134 / 1.000 finished` (really read to its end), **`write-lock 0.236 / 0.237 started background`, not finished**, and `legacy-explainer 1.000 finished`. The last is the short-chapter rule: its 1.8 KB explainer fits in the frame on opening. That is not R3, and F6 found the same.

**Code read of F6** (`position.ts`, `use-reading.ts`, the 7 new tests):
- the landing order and the settle rule are pure, and they are tested;
- every write path is gated on `settled`: the cadence, `measure`, the beacon and the end rule;
- Mark as finished / unread stay immediate;
- the landing is decided once per page (a `decided` ref), so a `router.refresh()` does not re-land.

It matches F6's plan and its `## Decisions` line.

### F5 still holds (production, CDP, signed out)

Round 2's chrome sequence gives **the same outcome at every step**, on native and legacy at 1440, 820 and 390:
- the top bar hides on a scroll down, desktop included (the legacy topbox goes from 59 px to 3 px);
- slow nudges of 12 and 30 px bring nothing back;
- a deliberate 150 px up brings only the top bar;
- a tap toggles both bars;
- at the end the bottom chrome shows (170, 190 and 276 px on legacy) and stays held on a scroll down and on a slow nudge up;
- a deliberate 400 up from the end shows both bars (OQ186);
- 300 down hides both.

The end positions were native 8863, 8541 and 10333, and legacy 6900, 6640 and 12641, as in round 2.

Keyboard: on a fresh load scrolled 600 down, both bars are hidden, and the first Tab lands on "Show reading controls" (opacity 1). Enter shows both bars.

**Console and CSP:**
- Signed out, every run was empty.
- Signed in, the run logged 7 `log.warning`s, all the same: the app layout's CSS chunk (`kb-app-layout` rules) "was preloaded using link preload but not used within a few seconds". This is a browser performance hint, not an error, and it has no CSP line. It is not a finding. Round 2's dev-clone run logged the same kind of warning.

### Notebook cross-check (round 3)

- `## Decisions` carries *The reader owns its landing (P30.F6)*.
- `## Doc impact` carries F6's `frontend.md, qa.md` line. Its qa half is paid by v0019. Its `frontend.md` half waits for the docs phase.
- F6 raised no operator question. OQ1–OQ190 are all decided and collapsed, so none is unrouted.
- F6's deferred-job candidate is filed as **D64**.
- No `result.md` decision is missing.
- I consumed F6's round-3 note in *Notes for later slices* and rewrote *Now*. `phase.md` is 38,972 B.

### Walkthrough (round 3, for the gate)

**First, on your word:** push `main`, then wait for a green Production Deploy carrying F5 and F6.

**Walk** https://knowledge.hi2vi.com on the Mac (Chrome and Safari), iPhone and iPad, on a native chapter and an ORIGINAL LAYOUT one:
1. Scroll down: both bars go, on the Mac too. A small or slow scroll up brings nothing. A deliberate one brings only the top bar.
2. Tap the text: both bars appear. Tap again: both go. At the end, the bottom bar appears and stays.
3. Signed in, press Next at the end of a chapter, and again from the middle of one, and use Contents. The next chapter opens at its top (or at your saved place, with "Picked up where you left off"), and it is not marked Finished (F6).
4. Still unconfirmed from your first walk:
   - Display;
   - resume after a reload;
   - a highlight with a note, then Notes in this book;
   - a quiz answer, then Review;
   - ORIGINAL LAYOUT momentum scrolling, external links and Print · new tab;
   - printing a chapter;
   - an old `/documents/{id}` link;
   - the device checks: diagram hairlines, Korean line breaks in Safari, Safari print.

**Decisions** ("accept" takes them as drawn):
1. **The chrome as built (F5).**
   - The "drawer" is a tap on the text, with no visible handle.
   - A scroll up never brings the bottom bar back, even from the end (OQ186).
   - On an ORIGINAL LAYOUT page, the top bar folds away, so the document moves up (OQ188).
   - A handle would need a new design round.
2. **S28:** `/explain` moves to the knowledge plugin as `/knowledge:explain`. Give `works/phases/active/P30/handoff-explain.md` to the bootstrap agent.
3. **OQ184:** on a tight page, the ORIGINAL LAYOUT bar scrolls. It is the one drawn inner scroller.
4. **OQ21 and OQ27:** the migration merges and never replaces. Deleting a document purges every reader's notes, and the delete fails (503) if the purge fails.
5. **Delete the nine P29 design canvases?** Their surfaces have shipped. The list is in round 1's walkthrough.

**Production note:** before F6, members who pressed Next may have chapters marked Finished that they never read. Mark as unread clears them. Nothing was written to production. D57 (the reindex) is due, on your word.

**Decided as drawn:**
- OQ1–OQ183;
- OQ185, OQ187, OQ189 and OQ190;
- D52–D64 filed.

**To clear the gate:** say "accept" (→ `accept-gate P30 --clear`), or list what failed.

---

# Round 2 (after P30.F5)

## Verdict (round 2)

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **review_verdict:** **changes_requested**, with one finding.
  - **R3:** chapter-to-chapter navigation keeps the previous chapter's scroll position. When signed in, it can open the next chapter at its end and record it as Finished without it being read.
  - Proposed fix slice: **P30.F6** (risk **high**).
  - F5 itself passes.
- **summary:** F5 does what the operator asked, on both readers at 1440, 820 and 390. I checked it live in a fresh scratch stack: the production build, CDP and Aside `u1`, and the dev clone. Nothing F5 touched regressed. All gates pass together. The reader's chapter-end check turned up a navigation defect that predates F5 (the pre-F5 build does the same). It corrupts persisted reading state, so it gets a fix slice before the gate reopens.
- **files_changed:**
  - this file (round 2 added above round 1);
  - `works/phases/active/P30/phase.md`: *Notes for later slices* (removed the consumed gate-prep and REVIEW-bookkeeping notes, added the F6 note) and *Now*.
- **validation:** every command passed (table below).
- **deviations:**
  1. One extra build: I built the pre-F5 commit (`git archive 63c161b web`, in the scratchpad) to prove R3 predates F5. Nothing in the repo changed.
  2. The single sign-in went through CDP, not Aside, so the member checks could reuse the cookie. Aside ran the 1440 chrome sequence and the Next navigation signed out, with real wheel and mouse input.
  3. The two F5 decisions folded into the walkthrough are my choice: OQ186 (scrolling up never brings the bottom back, even from the end) and OQ188 (the legacy top bar folds, so the document moves up). The plan said "the two F5 flagged" without naming them.
- **doc_versions:** none — deferred to a docs phase. Round 2 wrote no gate section. qa v0018 and operations v0025 from round 1 stand. F6 should add a qa line for chapter navigation; it would go in at the next pass.
- **walkthrough:** drafted below, for after F6. On `changes_requested` it is not yet the gate's.
- **explain:** not written — run /explain for this phase.

### Findings (round 2)

**R3: chapter-to-chapter navigation keeps the old scroll position.** It is inside the boundary: `reader-frame.tsx`, `use-reading.ts` and the `[chapter]` route, built by S13 and S15. It is not caused by F5.

Navigation results, all on the production build at 1440. A fresh load of `write-lock` opens at y 0.

| From (`all-blocks`) | Via | Lands on `write-lock` at |
|---|---|---|
| y 8863 (the end) | the chapter bar's Next | y 2248 (its max, the end) |
| y 1500 | the chapter bar's Next | y 1500 |
| the end | the end section's Next (`.rd-end` primary link) | y 2248 |
| y 1500 | the Contents sheet's chapter link | y 1500 |

- **Previous** from the end of `write-lock` opened `all-blocks` at y 50.
- **Signed in:** from y 4105, Next opened `write-lock` at its end (2307), and the reader posted `{fraction: 1, max_fraction: 1, finished: true}` for it. An unread chapter is recorded as finished. Mid-way, the saved `max_fraction` is inflated.
- **Same in a real browser:** Aside `u1`, production build. From y 1500, clicking Next landed at y 1500 out of 2248.
- **Predates F5:** the pre-F5 build (`63c161b`, `next start :3995` against the same API) gives the same numbers. The code that is already deployed has it, so production members who used Next may have chapters wrongly marked Finished.
- **Where it likely comes from:** `use-reading.ts` returns early for a chapter that is not `started`, so nothing scrolls to the top. Next's own scroll-to-top does not fire on the `[chapter]` param change. The suspects are the `loading.tsx` boundary, or `.rd-root`'s first children being fixed (`.rd-skip`, `.rd-line`), which Next skips. I did not root-cause it further.

**Proposed P30.F6** (`fix`, **risk high**: persisted reader state, which is a core invariant; it also repairs S13/S15, whose verdicts read `tier: mid`):
- On a chapter change, land at the top, with the quiet window, unless a hash, `?note=` or the resume landing owns the place.
- Make sure no position or finish write goes out before the landing settles.
- Keep F4's hash landing and S15's resume exactly as they are.
- Verify live, signed in and signed out: bar Next and Previous, the end section's Next, the Contents link, the book page, and the language switch (which carries the place by design).
- Add one core test, if the landing rule can be made pure.
- Add one qa checklist line.

### Validation (round 2)

| Command | Result |
|---|---|
| `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q` | pass, 229 passed |
| `cd cli && uv run pytest -q` | pass, 55 passed |
| `pnpm --dir web typecheck` | pass |
| `pnpm --dir web lint` | pass |
| `pnpm --dir web test` | pass, 37 files, 388 tests |
| `NEXT_PUBLIC_APP_URL=https://knowledge.hi2vi.com pnpm --dir web build` | pass |
| `python3 scripts/plugin_parity.py` | PASS |
| `python3 scripts/skills_parity.py` | PASS |
| `python3 scripts/workflow.py validate` | passed (pre-existing warnings only: P26 kinds, P28 debt, stale docs, oversized sections) |
| `uv run alembic upgrade head` on the scratch database `kb_rv2live` | pass, 0001 → 0006 |

### Stack and instruments (round 2)

**Stack** (session scratchpad `…/scratchpad/rv2/`):
- a scratch API `:8991` (PID 68801), with a scratch `KB_ROOT`, the database `kb_rv2live` in `kb-p28s2-pg`, and `KB_GIT_COMMIT=false`;
- one member, `rv2-member@example.com` (org `rv2org`);
- the fixture book via `publish_fixture_book.py` with the member's `vk_` key, plus F5's 12-part `long-legacy` html chapter as chapter 4 (the frame scrolls about 6,900 px at 1440);
- `fixtures` set public;
- the production build with `next start :3991` (PID 68913);
- the pre-F5 build with `next start :3995` (PID 69912);
- a dev clone with `next dev :3993` (PIDs 70509 and 70516).

**Cleanup:** I stopped exactly those PIDs, and the headless Chromes exited with their scripts. I dropped `kb_rv2live`. Afterwards `:3030` (8452) and `:8766` (66506) were still listening. I never touched either.

**Instruments:**
- Headless Chrome over CDP: the S27/F5 `cdp.mjs` driver, with `Input.synthesizeScrollGesture` (mouse at 1440, touch at 820 and 390), real mouse and touch taps, true viewports and console/CSP capture.
- Aside `aside repl --account u1` at 1440×900, signed out, with real `mouse.wheel` and clicks.
- `pdfinfo` and `pdftotext`.
- One sign-in in total (CDP `/api/auth/login`).
- **Not run:** real iPhone and iPad, Safari, Firefox. Those stay the operator's.

### F5 against the operator's words (live)

The rules from `slices/P30.F5/plan.md` and the operator's words: "invisible when scrolling down, shows up when only user tries to tab the screen or up scrolling"; "the bottom bar that comes up when I do even very slight scroll up… super annoying"; and "it's not hid when I see in pc".

**Production build, CDP, signed out.** Each value is the top bar / the bottom chrome. For legacy, the topbox height is 59 px when shown and 3 px when folded.

| Step | 1440 native | 1440 legacy | 820 native / legacy | 390 native / legacy |
|---|---|---|---|---|
| open (top) | shown / shown | shown / shown | shown / shown | shown / shown |
| scroll down 600 | hidden / hidden | hidden (h3) / hidden | hidden / hidden | hidden / hidden |
| slow nudge up 12, then 30 (60 px/s) | hidden / hidden | hidden / hidden | hidden / hidden | hidden / hidden |
| deliberate up 150 | **shown / hidden** | **shown (h59) / hidden** | shown / hidden | shown / hidden |
| scroll down 200 | hidden / hidden | hidden / hidden | hidden / hidden | hidden / hidden |
| tap on the text | **shown / shown** | **shown / shown** | shown / shown | shown / shown |
| tap again | hidden / hidden | hidden / hidden | hidden / hidden | hidden / hidden |
| scroll to the end | hidden / **shown** | hidden / **shown** | hidden / shown | hidden / shown |
| scroll down at the end | hidden / shown (held) | hidden / shown (held) | the same | the same |
| slow nudge up 30 from the end | hidden / shown | hidden / shown | the same | the same |
| deliberate up 400 | shown / shown (OQ186) | shown / shown | the same | the same |
| scroll down 300 | hidden / hidden | hidden / hidden | hidden / hidden | hidden / hidden |

- The end positions were native 8863, 8541 and 10333, and legacy 6900, 6640 and 12641, at 1440, 820 and 390 respectively. The legacy bottom chrome measured 170, 190 and 276 px tall at the three widths.
- **Aside `u1` (real wheel, 1440, production, signed out):** the same outcomes on both readers at every step (wheel 600 down, 12 up, a slow 30 up, 150 up, 200 down, click, click, the end, down at the end, a slow 30 up at the end).
- **The desktop top bar hides:** at 1440 the native `.rd-top` computes to hidden, and the legacy topbox folds from 59 px to 3 px. This was the operator's complaint 2.
- **Dev clone (CDP, 1440 and 390, both readers):** the same outcomes. The console shows only dev noise (React DevTools info, HMR and Fast Refresh, and "preloaded but not used" CSS). There were no exceptions, no CSP lines and no hydration warnings.
- **Production console:** empty across every run.

**Does this match the operator's words?** Yes.
- The top bar hides on a scroll down at every width, desktop included.
- It comes back only on a tap or a deliberate scroll up (64 px). Nudges of 12 and 30 px bring nothing.
- The bottom bar never rises on a scroll up. It sits at the end ("stick it to bottom"), and a tap brings it anywhere ("a drawer the user can bring").

The one reading the operator should confirm is that the "drawer" is a tap on the text, with no visible handle. That is walkthrough decision 1.

### No regression elsewhere in the reader (production, 1440, CDP)

| Check | Result |
|---|---|
| Display | Opens a dialog with focus on Close. A 500 px scroll with it open leaves the chrome alone. Escape closes it and returns focus to Display. |
| Contents sheet | Opens from the chapter bar (`rd-sheet--left`, 12 links) and closes on Escape. |
| Keyboard reach | With both bars hidden, the first Tab lands on "Show reading controls" (opacity 1), and Enter shows both. A hidden native bar is `visibility: hidden`, so it is not focusable, as S13 built it. On legacy, Tab from the skip link unfolds the folded top bar to 59 px. |
| Resume pill (signed in) | Scrolled to 4000, then reloaded: it landed at 3955 with "Picked up where you left off · Images · From the top", and both bars shown. A scroll down 300 hid the top bar and took the pill with it. A deliberate scroll up brought only the top bar back. |
| Chapter end | The bottom bar is held at the end ("Contents · Chapter 1 of 4 · 100% · Next → The write lock"). The end section shows "END OF CHAPTER … Mark as finished · NEXT · CHAPTER 2". **Next navigates, but lands wrongly: R3.** |
| Legacy member bar | On open: ORIGINAL LAYOUT, the version line, Print · new tab, Bookmark this position. At the end: "Finished · Saved to your progress · Mark as unread", and the bar stays held. |
| Print | The native chapter on A4 is 8 pages, with the masthead "KNOWLEDGE · FIXTURE GUIDE · CHAPTER 1 OF 4", the address and v2, and the printed date. I printed it with the chrome hidden. The legacy chapter prints 1 notice sheet, as S26 built it. |
| Legacy bridge: refused | A `tap` posted by the top window; a `tap` and a `navigate` from a second same-origin frame; and synthetic events whose source is the real frame but which carry an extra key, `v: 2`, `kb: "other"`, `y: -50`, no `y`, a `navigate` to another host, or a `navigate` to `/dashboard`. None changed the chrome or navigated. |
| Legacy bridge: accepted | A well-formed `{kb, v, type: "tap"}` from the frame's own window toggles both bars. The sandbox is still `allow-scripts allow-popups allow-popups-to-escape-sandbox`. F5's `legacy-bridge.test.ts` covers the same refusals. |

**Code read of F5** (`chrome.ts`, `reader-frame.tsx`, `legacy-reader.tsx`, `bridge.ts`, `messages.ts`, CSS): the rules are pure and match the plan; the sender check and the size cap are kept; the bridge is 1916 bytes.

Two observations, neither a finding:
- The bridge's tap exemptions skip `pre`, `table` and `details`, which the native `TAP_IGNORE` does skip. The plan's list did not include them. A tap on a legacy code block toggles the chrome.
- A legacy document's own click-handled `div` (not a control) will toggle the chrome too, because the bridge listens in the capture phase.

### Post-gate commits

| Commit(s) | What | Verdict |
|---|---|---|
| `e8f1fda` | merges `origin/main`'s `kb-api` documents before the push | fine; content only |
| `6dbe3a6`, `0e38cb7`, `f22e8d3`, `bd7a5ca` (kb-api) | S6's migration: four `docs/.books/*.json`, matching the apply report's 4 PUTs and their `commit_sha` | fine |
| `63c161b` | the production record: deploy run 39559011982, `topics/migration-run/` (dry run 167 checks / apply 4 PUTs created / rerun all unchanged; 4 raw-hash flags that are Cloudflare's per-response email obfuscation), and D60–D62 | fine; the reports hold no secrets; D60–D62 are sound and correctly sourced |
| `c3358cd`, `575c76c` (kb-api), the redaction republish | `/Users/sugang/…` → `~/…` in the changple5 reading guide (now v2) and the base onboarding doc (now v3) | it works for the current versions. **Observation:** the old text is still in `docs/.versions/…/v0001.html` and the base doc's `v0001.md` and `v0002.md`, which the past-version page serves. It is outside the boundary (content, not P30 product files), so it is a deferred-job candidate (N9 below), not a finding. |
| `0c425a5` | F5 | as above; the `## Doc impact` line is present (`frontend.md`, superseding the two signed hide/show tables); OQ185–OQ190 are collapsed as decided |

### Notebook cross-check (round 2)

- `## Decisions` carries the F5 line.
- `## Doc impact` carries F5.
- OQ185–OQ190 are routed: decided and collapsed. OQ186 and OQ188 are folded into the walkthrough.
- No question is unrouted, and no `result.md` decision is missing.
- Round 1's bookkeeping is done: the nine jobs are `implemented`; D18, D32, D37 and D38–D40 are dropped; N1–N8 were filed as D52–D59. I removed the two consumed notes (gate prep, REVIEW bookkeeping) from *Notes for later slices*.

### Deferred-job candidate (for the orchestrator; I ran nothing)

| # | Title | Reason | Trigger |
|---|---|---|---|
| N9 | Redaction reaches past versions | the `~/` republish left the absolute home path in the archived versions served by the past-version page (changple5 reading guide v1; base onboarding v1 and v2) | the next privacy or redaction request, or a version-delete feature |

Also due now that the deploy has happened: **D57**, the production reindex for chart search text, on the operator's word.

### Walkthrough (round 2, a draft for after F6 lands and F5 and F6 are deployed)

**First, on your word:** push and deploy F5 and F6 (a green Production Deploy).

**Re-walk the reader chrome** at https://knowledge.hi2vi.com, on the Mac (Chrome and Safari), iPhone and iPad, on a native chapter and an ORIGINAL LAYOUT one:
1. Scroll down: both bars go, on the Mac too.
2. A small or slow scroll up: nothing appears.
3. A deliberate scroll up: only the top bar appears.
4. Tap the text: both bars appear. Tap again: both go.
5. Reach the end: the bottom bar appears and stays there.
6. On the Mac, Tab once: "Show reading controls" appears.
7. Press Next at the end of a chapter: the next chapter opens at its top and is not marked Finished (F6).

**Still unconfirmed from your first walk:**
- Display (the column stays fixed);
- resume after a reload;
- a highlight with a note, then Notes in this book;
- a quiz answer, then Review;
- an ORIGINAL LAYOUT document's momentum scrolling, its external links and Print · new tab;
- printing a chapter;
- an old `/documents/{id}` link landing on its chapter;
- the device-only checks: diagram hairlines, Korean line breaks in Safari, Safari print.

**Decisions** ("accept" takes them as drawn):
1. **The chrome as built (F5).**
   - The "drawer" is a tap on the text, with no visible handle.
   - A scroll up never brings the bottom bar back, even from the end (OQ186).
   - On an ORIGINAL LAYOUT page, the top bar folds away, so the document moves up by its height (OQ188).
   - A visible handle would need a new design round.
2. **S28:** `/explain` moves to the knowledge plugin as `/knowledge:explain`. Give `works/phases/active/P30/handoff-explain.md` to the bootstrap agent.
3. **OQ184:** on a tight page, the ORIGINAL LAYOUT bar scrolls. It is the one drawn inner scroller.
4. **OQ21 and OQ27:** the migration merges and never replaces. A document delete purges every reader's notes, and fails (503) if the purge fails.
5. **Delete the nine P29 design canvases?** They are listed in round 1's walkthrough.

**Decided as drawn:**
- OQ1–OQ183;
- OQ185, OQ187, OQ189 and OQ190 (F5);
- D52–D62 filed.

Members who used Next on production before F6 may see chapters marked Finished that they never read. Mark as unread clears them.

**To clear the gate:** say "accept" (→ `accept-gate P30 --clear`), or list what failed.

---

# Round 1 (2026-10-21, before the operator's walkthrough)

## Verdict

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **review_verdict:** **pass**, with the gate required. Two conditions sit outside any fix slice. **R1:** before opening the gate, the orchestrator marks the nine signed design jobs implemented (`design-canvas <job> --implemented`). **R2:** a Decisions pointer was inaccurate; I corrected it in place.
- **summary:** Every gate passed together: server 229, cli 55, web typecheck, lint, 383 tests and the production build, both parity checks, alembic 0001→0006 with a downgrade and re-upgrade on a scratch database, and `validate`. I opened the running product myself in a fresh scratch stack, with Aside `u1` at 1440 and headless Chrome over CDP for phone and tablet viewports, DPR 2/3, classic scrollbars, print and the dev clone. I walked library → book → chapter, resume, highlight and note, quiz, review, the legacy reader, the sign-in return, deep links, print and visibility as a first-time reader. Everything works. The only inner scroller anywhere is the legacy document bar on a tight page, which is drawn that way (OQ184). Three read-only fidelity audits found no designed element missing.
- **files_changed:**
  - `docs/versions/qa/v0018_p30_gate_…_superseded.md` (new) and `docs/versions/operations/v0025_p30_gate_…_library_landing.md` (new);
  - `docs/current/qa.md`, `docs/current/operations.md` and `docs/index.json` (regenerated by `rebuild-docs`);
  - `works/phases/active/P30/phase.md`: Decisions (one line corrected), Doc impact (one line appended), Notes for later slices (consumed REVIEW notes removed) and Now;
  - this file.
- **validation:** see *Validation*. Every command passed.
- **deviations:**
  1. **Aside screenshots go out as JPEG at quality 25.** The repl truncates full PNG output.
  2. **Narrow viewports, print and console capture ran in headless Chrome over CDP, not Aside.** Aside is pinned at 1440×900, and the reader uses viewport `@media` rules.
  3. **I amended three P28 checklist lines inside the section I own, and replaced P28's two framed-explainer lines with the P30 legacy-reader line**, instead of only appending. The P30 build superseded those lines (see *Checklist*).
  4. **The web build gate ran in `web/`** with `NEXT_PUBLIC_APP_URL=https://knowledge.hi2vi.com`. Next 16's dev output lives in `.next/dev`, so `:3030` was not disturbed.
- **doc_versions:** `qa` v0018 (`## Regression Checklist`) and `operations` v0025 (`## Operator Runtime`). Every other `## Doc impact` note is deferred to a docs phase.
- **explain:** not written — run /explain for this phase.

## Validation

| Command | Result |
|---|---|
| `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q` | pass, 229 passed, 0 skipped |
| `cd cli && uv run pytest -q` | pass, 55 passed |
| `pnpm --dir web typecheck` | pass |
| `pnpm --dir web lint` | pass |
| `pnpm --dir web test` | pass, 37 files, 383 tests |
| `NEXT_PUBLIC_APP_URL=https://knowledge.hi2vi.com pnpm --dir web build` | pass; the routes include `/library`, `/review`, `/[org]/[project]/books/[book]/[chapter]`, `/[org]/[project]/notes/[book]`, `/api/reader/position` and `/api/documents/[id]/assets/[file]` |
| `python3 scripts/plugin_parity.py` | PASS |
| `python3 scripts/skills_parity.py` | PASS |
| `uv run alembic upgrade head` on the scratch database `kb_rvlive` | pass (0001 → 0006_reader_state; also `downgrade -1` then `upgrade head`) |
| `python3 scripts/workflow.py validate` | passed (pre-existing warnings only: P26.S5 kind, P28 debt, stale docs, oversized sections) |

Each slice's own validation commands are covered by this suite.

## Stack and instruments

**Stack** (all under the session scratchpad `…/scratchpad/rv/`; `:8766` and `:3030` were never used or stopped):
- scratch API `:8961` with a scratch `KB_ROOT` and database `kb_rvlive` in `kb-p28s2-pg`;
- accounts `rv-member@example.com` (org `rvorg`) and `rv-other@example.com`;
- content: the fixture book (`scripts/publish_fixture_book.py`), S27's seed (`knowledge/guide`, `tidewater`, private `lantern`, loose md) and a long loose legacy explainer;
- `fixtures`, `knowledge` and `tidewater` public;
- the production build with `next start :3961` (`KB_API_BASE_URL` pointed at the scratch API);
- a dev clone (`cp -Rc` of `web/` minus `.next`) with `next dev :3963`;
- a static server `:3969` for the canvases. Their `support.js` runtime is not in the repo, so the boards do not render locally.

**Cleanup:** I stopped only my own PIDs (45084 API, 45247 `next start`, 45307 `next dev`, 45523 canvas server) and my headless Chromes, and dropped `kb_rvlive`. Afterwards `:3030` (PID 8452) and `:8766` (PID 66506) were still listening.

**Instruments:**

| Instrument | Used for |
|---|---|
| Aside `aside repl --account u1` (production build, 1440×900) | The signed-in first-time walk: sign-in return from a chapter, library, book page, resume after a reload, select → Highlight → Add note → Save note, quiz answer and reload, Review this → `/review` → rating, the legacy chapter and loose legacy geometry, the old-link redirects |
| Headless Chrome over CDP (the `cdp.mjs` driver reused from S27/F4) | Width sweeps at DPR 2 with classic scrollbars (anonymous: 7 surfaces × 45 sizes; signed in: 9 surfaces × 30 sizes); phone emulation 390×844 at DPR 3 with touch; `Page.printToPDF` on A4 and Letter; hash landing; the login `next`; console/CSP capture; the dev-clone sweeps |
| `pdftotext`, `pdfinfo` | reading the PDFs |
| Not run | real iPhone and iPad, Safari, Firefox: these are the operator's (walkthrough) |

## Live walk (stage 2 and stage 3, first-time reader)

| Claim | Result |
|---|---|
| Library → book → chapter | pass. `/library` shows "4 books · 4 documents", Continue reading, By project / By subject and Your reading data. The book page shows its head, Continue, Notes in this book, Contents with versions and languages, an ORIGINAL LAYOUT tag and Clear. The chapter shows its opening, In this chapter, and the place bar. |
| Resume after a reload | pass. Scrolled to 4500 px, waited 3.5 s and reloaded: it landed at 4365 px with "Picked up where you left off · Diagrams · From the top", "49%". |
| Highlight and note | pass. Dragged over the first sentence, chose Highlight (mark painted) and Add note, typed, chose Save note; the popover shows NOTE, Edit note, Review this and Delete highlight. Marks persist across reloads. |
| Quiz | pass. Picking B gives "Correct · Saved for review". After a reload: "Your answer from 21 Oct 2026". Exactly one foot sentence (the X1 fix holds). "1 of 4 answered". |
| Review | pass. A correct first answer is due on 23 Oct (FSRS). Review this · On gives "1 new highlight"; the card shows the painted quote, YOUR NOTE, Got it / Show sooner with interval previews, Open at this highlight and Suspend card. Show sooner gives "Saved · Again · next review in 10 minutes". |
| Legacy explainer as the only scroller | pass. On the legacy chapter and on a long loose legacy document, one sandboxed frame (`allow-scripts allow-popups allow-popups-to-escape-sandbox`, `src=/api/documents/{id}/raw`) is the scroller, and page `scrollHeight` equals `innerHeight`; a wheel never moves the page. The relay sends `CSP: sandbox …` and `cache-control: no-store, no-transform` (D37). |
| Sign-in return | pass. The chapter's Sign in → `/login?next=…` → back on the chapter. With `next=/…/write-lock#quiz-section` it lands at the section (y 1441). A hostile `next=//evil.example.com` goes to `/library`. |
| Deep link (F4) | pass. `#diagrams` and `#quiz-section`, 3 runs each, fresh loads, each with the section 72 px from the top. |
| Old links (F4, OQ183) | pass. `/documents/1` of a bound chapter → `/@rvorg/fixtures/books/fixture-guide/all-blocks?lang=en`; a loose document keeps `/documents/23`. |
| Print | pass. Native chapter: 8 pages on A4 and 9 on Letter, with the masthead (`KNOWLEDGE · FIXTURE GUIDE · CHAPTER 1 OF 3`, the address, v2 and the printed date), the quiz, the answer key with reasons, sources with addresses and the colophon. A legacy document prints one notice sheet. A past-version page prints the P28 masthead and colophon. |
| Phone (390×844, DPR 3, touch, signed in with a quiz answered) | pass. `scrollWidth` is 390 on the chapter, library, book page, review, legacy and the KO chapter (the X2 fix holds). Only the designed horizontal figure and diagram boxes scroll. |
| Visibility | pass. A private loose doc gives a 404. A private chapter gives the same not-found view (HTTP 200, the known streaming note), with no content leaked. `/documents/22` signed out → 307 to login. |
| Console/CSP | Zero errors and zero CSP lines in production across every run. The only warnings are Next's "css preloaded … not used". The dev clone shows only Fast Refresh and HMR lines (no hydration warnings). |
| Dev clone | The same sweeps, anonymous and signed in, give the same results, including X6. |

**Fresh-eyes notes** (not judged against the record; none is a defect worth a fix slice):
1. A not-found chapter page's `<title>` reads "Documents · knowledge" and answers HTTP 200. This is part of deferred candidate N4.
2. On a revisit, the legacy chapter's bar shows the document identity rather than "Finished". The book page still says Finished. Plausibly the drawn status layers; I did not judge it.
3. The legacy print notice prints the raw relay address `knowledge.hi2vi.com/api/documents/{id}/raw`. That is S26's design, but a reader may find it odd.

## RESPECT THE DESIGN spot-check

I ran three read-only audits, through `Explore` on sonnet, against the latest signed rounds' `## Build`/build prompts and the canvas CSS, and I made the visual spot-checks above. **No designed element or state is missing.** The differences found:
- **Mechanism only:**
  - the reader's compact breakpoints are viewport `@media` where the canvas used `@container`, with identical numbers (the reader is full-width);
  - visually hidden labels clip, with no visible effect;
  - the cloze blank width is `min(7.5em, calc(100% - 2em))` against the drawn `min(7.5em, 100%)`.
- **Documented departures:**
  - the quiz option edge uses `--rd-control-edge` (C09, left open at signoff);
  - D48 still covers the 3:1 edge on annotations' and review's remaining controls;
  - a sources `note` renders as plain text (OQ79 → D49).
- **Minor state gaps** (deferred candidate N8):
  - review's loading and error shell shows a top bar without Settings and Display;
  - the failed states show "ref · …" only when Next supplies a digest. Production supplies one.

## Checklist (stage 4): inside and outside the boundary

`phase-scope P30` covers `26ae440..71ca2c1`, 66 commits and 640 product files.

| Block | Line | Inside / outside | Result |
|---|---|---|---|
| MkDocs | `docker compose run --rm kb build` | **outside**: `Dockerfile`, `compose.yml`, `mkdocs.yml` are not in the diff | not re-run |
| MkDocs | `site_smoke.py` → PASS | **outside**: `scripts/site_smoke.py` and `docs/<project>/` are not in the diff | not re-run as a gate. Run once as an observation: it FAILS ("no project dirs discovered", graph.json 7 vs 0) because the local `docs/` library is html-only and diverged from `origin/main`. The same tree was there at base. N7. |
| MkDocs | `explain:recent` marker round-trip | inside (`server/documents.py`) | pass (the server suite: `test_documents`, `test_api_write` and the others) |
| Workflow | `workflow.py validate` | inside (`scripts/workflow.py`) | pass |
| Graph | fits the plate at first paint | inside (`server/graph_api.py`, `globals.css`) | pass at 1440 (1121×658) and 390 (354×414), on a 23-node corpus (not ~130) |
| Graph | dock Tags toggle at `kbmain < 40rem` | inside | pass ("Toggle tag visibility" toggles off and back on at 390) |
| Project page | Documents panel and All documents | inside (`server/documents_api.py`) | pass. The panel-failure Retry was not re-run. |
| Document views | `?view=full` | inside | pass on the past-version route (exit pill). The member and anonymous current versions now open in the reader (no rail), so the line was updated. |
| Print / Export PDF | masthead and colophon | inside (`kb-print.css`, `export-pdf-button.tsx`) | pass (past-version PDF; reader sheet as above). The line was updated to name the past-version page. |
| Console at 390 | bottom navbar, no horizontal scroll | inside (`app-shell/*`) | pass on dashboard, documents, project, graph and past-version, all with `scrollWidth` 390. The line now names the past-version view. |
| Auth | `/login?next=` return, hostile falls closed | inside (`(auth)/*`, `proxy.ts`) | pass. The hostile case now goes to `/library`, not `/dashboard` (S22's landing); line updated. |
| Framed explainer | no inner scroll range | inside | superseded: the handshake is retired. Re-run as the legacy single-scroller check: pass apart from the drawn tight-page bar (OQ184). Replaced by the P30 legacy line. |
| Framed explainer print | prints whole | inside | superseded by S26's legacy notice sheet: pass. Replaced by the P30 print line. |

- **Count:** 13 lines, 11 inside and 2 outside.
- **Width sweep results:**
  - anonymous: 7 surfaces × 45 sizes, 2 flags, both `div.lg-bottom__bar` on the legacy chapter at 320×568 and 421×505;
  - signed in: 9 surfaces × 30 sizes, 1 flag, the same bar at 320×568.
- **Appended:** 12 P30 lines (S27's, plus Old links and Library). The tight-page bar is written into the legacy line as drawn.

## Operator Questions (stage 5)

- Every entry is routed. OQ1–OQ184 are decided, under the operator's unattended-run word. OQ183 is collapsed as resolved, and OQ184 is decided.
- They fold into the walkthrough as one "decided as drawn" list. Four of them sit with S28's ownership move as decisions for the operator's eye: OQ184, OQ21, OQ27 and the S28 move. OQ46 (fixed in F2) and OQ183 (built in F4) are named in the decided list.
- The contract observations OQ79, OQ139 and OQ178 already have D49, D50 and D51. OQ90 and the S8/S10/S15/S23 observations become N1–N6 below.

## Doc impact (verification)

- `## Doc impact` has a line for S2–S28 and F1, F2, F4. F3 recorded none, correctly: it restored the drawn design and its checks are S27's qa lines. S1 is the design wave, and its records are in `docs/reference/design/jobs/`.
- The durable changes I checked are named there:
  - the handshake retired (S25, frontend);
  - the `/library` landing (S22);
  - the login return (S11);
  - the CSP (S12, S13);
  - the nginx locations (S4, S25, operations);
  - the migration runbook (S6);
  - the plugin and `/explain` ownership (S28, operations and product);
  - `0006` (S8, data).
- The list is complete.
- I appended one line recording that qa v0018 pays S27's qa note and that operations v0025 is written, so the docs phase skips both.

## Notebook cross-check

- **R2 (corrected):** `## Decisions` said "one decision line per slice" for the client side. S17, S18, S19, S22 and S24 never wrote a line (I checked their commits); their decisions exist only as OQs (OQ83–OQ98, OQ125–OQ135, OQ147–OQ158). Nothing was lost, because the OQs carry the full text, but the pointer was wrong. I replaced it in place.
- No other decision recorded in a `result.md` is missing from the notebook or its topics. No OQ is unrouted.

## Findings

- **R1 (bookkeeping, before the gate opens):** all nine design jobs read `status: signed` in `job.json`, but their builds landed in this phase (S13–S26). The orchestrator runs `python3 scripts/workflow.py design-canvas <job> --implemented` for `01-reader`, `02-figures`, `03-diagrams`, `04-quiz`, `05-annotations`, `06-library`, `07-book-page`, `08-review` and `09-legacy-and-print`. Then their canvases may be deleted on the operator's yes (walkthrough decision 5).
- **R2:** corrected, as above.

No fix slices are proposed.

## Deferred-job actions (for the orchestrator; I ran none)

- **Close:** D18 and D32 (S11 shipped the login return address); D37 (S25 shipped `no-transform`, which I saw on the relay).
- **Drop:** D38, D39 and D40 (S25 retired the measured box, the frame print slicing and the reporter).
- **Already filed:** D49 (OQ79), D50 (OQ139), D51 (OQ178).
- **File:**

| # | Title | Reason | Trigger |
|---|---|---|---|
| N1 | Review: delete a single card | P29 *Privacy* says a reader can delete any card; S10 shipped suspend and clear only | the next review or privacy change |
| N2 | Mark as unread across a chapter's languages | it resets only the variant's own row, so a chapter finished in another language stays finished (S15, S23) | when KO/EN reading is used in earnest |
| N3 | Native format: a marks-only timeline lane without `bars: []` | the schema needs `bars` on every lane, and the canvas drew a lane with marks only (OQ90) | the next native-format or `/explain` change |
| N4 | Not-found and private book/chapter pages answer HTTP 200 titled "Documents · knowledge" | `loading.tsx` streams before `notFound()`; `noindex` is set (S13, S23, S27 O4, seen here) | SEO, monitoring, or a status-sensitive client |
| N5 | Re-write stored reader `unit` on a reindex-only manifest edit | a hand-edited `.books` file never re-writes units, so S10's quiz-card grouping lags until the next write (S8) | hand-edited manifests, or the next reader-state phase |
| N6 | Reindex after the P30 deploy so top-level charts carry search text | stored rows keep their old text until a reindex or re-ingest (F2) | right after the production deploy (could be a runbook step instead) |
| N7 | `site_smoke.py` and the MkDocs checklist lines fail on this checkout | the local `docs/` library is html-only and diverged from `origin/main`; pre-existing, outside P30 | the next QA-sweep or docs phase |
| N8 | Review's loading and error top bar without Settings and Display | the signed top bar has both (`review-static.tsx:60`) | the next review-surface change |

## Walkthrough (returned to the orchestrator)

**Do these first, each on your word:**
1. Integrate the `kb-api` commits from `origin/main`, then push `main`.
2. Wait for a green Production Deploy. It brings S4's and S25's nginx `knowledge.conf` changes and migration 0006.
3. The orchestrator runs S6's library migration on production (`topics/migration-runbook.md`).
4. Walk.

**Walk https://knowledge.hi2vi.com on iPhone and iPad (Safari and Chrome) and on the Mac (Chrome and Safari):**
1. Sign in; you land on `/library`. Open a book, then Continue reading.
2. Display: change the size and the theme. The column width stays fixed.
3. Scroll halfway and reload: "Picked up where you left off".
4. Select a sentence, then Highlight, then Add note. Reload, then open Notes in this book.
5. Answer a quiz question and reload: "Your answer from …". Turn on Review this, open Review and rate a card.
6. Open an old HTML explainer (ORIGINAL LAYOUT). Only the frame should scroll. Check:
   - momentum scrolling;
   - the URL bar showing and hiding;
   - an external link;
   - Print · new tab.
7. Print a chapter: the masthead, the answer key and the colophon should be there.
8. Open an old shared link (`/documents/{id}`) of a book chapter. It should land on the chapter.
9. Device-only checks: diagram hairlines, Korean line breaks in Safari, Safari print.

**Decisions** ("accept" takes them as drawn):
1. **S28:** `/explain` moves to the knowledge plugin as `/knowledge:explain` (0.4.0). The bootstrap deletes its copy and keeps a pointer. Give `works/phases/active/P30/handoff-explain.md` to the bootstrap agent.
2. **OQ184:** on a tight page (a small phone, or 200% text) the legacy document bar scrolls. It is the one drawn inner scroller; changing it means a new design round.
3. **OQ21:** the production migration merges into an existing book and never replaces it.
4. **OQ27:** deleting a document purges every reader's notes first. If the purge fails, the delete fails (503).
5. **Delete the nine P29 design canvases?** Their designs are built and kept in the repo:
   - [01-reader](https://claude.ai/artifact/MRzppHqkh5aCqpkBa8QCVY)
   - [02-figures](https://claude.ai/artifact/ATLFkU6eqggy8Z4qBF8BT7)
   - [03-diagrams](https://claude.ai/artifact/D2poE9aVsGxNZAdrNCvpav)
   - [04-quiz](https://claude.ai/artifact/75iqVgCcFXQFrkPyM6dDW2)
   - [05-annotations](https://claude.ai/artifact/FJTQP73ZHxMkDyKywJ3zmj)
   - [06-library](https://claude.ai/artifact/6MnT599Y3zvUfXwnWp7F8N)
   - [07-book-page](https://claude.ai/artifact/MdWsua1Ck3ppsbhmYhwUXT)
   - [08-review](https://claude.ai/artifact/3hv7LEEnr5cnLwHYZpBQ4N)
   - [09-legacy-and-print](https://claude.ai/artifact/JY3yBGAVC3z6TzcubwbvW5)

**Decided as drawn:** every other OQ, from OQ1 to OQ183 (`topics/operator-questions-decided.md`). This includes OQ46 (the chart key, fixed in F2) and OQ183 (bound chapters redirect, built in F4). Deferred jobs N1–N8 are being filed.

**To clear the gate:** say "accept" (→ `accept-gate P30 --clear`), or list what failed.
