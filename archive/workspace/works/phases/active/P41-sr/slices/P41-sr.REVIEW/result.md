# P41-sr.REVIEW — result (round 1)

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **review_verdict:** changes_requested
- **summary:** Every validation gate passes across the whole phase, and Listen works end to end on a scratch stack in the
  agent's Chrome: dev `:3030` and a scratch production build `:3041`. Production's public probes flip as X1 recorded.
  The review found three problem classes:
  - **F1:** Listen reads every explain document's `## Sources` section aloud. The intent says it skips source lists.
  - **F2:** speed and follow along are kept per document. The signed design (F3) says per listener.
  - **F3:** a book Listen in one language shows the other language's chapter titles (in the dock, the player and on
    the lock screen) and resumes at the other language's place.

  It also found one record gap: design job `11-listen` is still `signed`, though W1 and W2 built it. Two operator
  questions are added: OQ4, the ~5 min first wait; OQ5, the agent's Chrome is signed in on production.
- **files_changed:**
  - this `result.md`;
  - `works/phases/active/P41-sr/phase.md`, through `phase-section` only:
    - `## Now` replaced;
    - `## Notes for later slices`: entries 3, 11, 12, 13 and 14 removed (consumed here), two added;
    - `## Operator Questions`: OQ4 and OQ5 appended.
  - No product file, no doc version.
- **validation** (all in this checkout, 2026-11-12, at `e3f2fa83`; the product tree is `4aba2544`'s):

  | Gate | Result |
  |---|---|
  | `uv run pytest -q`, Postgres live (`p41-rv-pg`, 127.0.0.1:55451, `KB_TEST_DATABASE_URL`) | **pass**: 250 passed, 0 skipped |
  | `alembic` on scratch `kb_mig`: `upgrade head` → `downgrade -1` → `upgrade head` | **pass**: 0001→0007; back to `0006_reader_state` with 0 `listen_%` tables; again `0007_listen` with the five tables |
  | `cd tools/listen-runner && uv run pytest -q` | **pass**: 3 passed |
  | `pnpm vitest run` (web) | **pass**: 43 files, 602 tests |
  | `pnpm lint` | **pass**: exit 0 |
  | `pnpm exec tsc --noEmit` | **pass**: exit 0 |
  | `pnpm exec next build` in a scratch APFS clone (never `web/.next`; `:3030` untouched) | **pass**: exit 0, 31 routes incl. `ƒ /api/listen/play/[...path]`, `ƒ /api/listen/position` |
  | `uv run python scripts/plugin_parity.py` | **pass** |
  | `python3 scripts/skills_parity.py` | **pass** |
  | `claude plugin validate plugin` | **pass** ("Validation passed") |
  | `python3 scripts/workflow.py validate` | **pass**: no new warning, no dangling pointer |
- **deviations:**
  1. **Partial Regression Checklist re-run.** Only part of the inside lines were re-run (§ Regression Checklist). The
     verdict is `changes_requested`, and every fix lands in the same reader files, so the rest are owed in round 2.
  2. **X1's two empty-body POST flip probes were not sent.** The dispatch allowed reads only. The GET probes prove the
     same two flips (§ Production, public).
  3. **No public reader page on production was loaded in Chrome.** The agent's Chrome turned out to be signed in on
     production as another account. I left at once and ran the signed-out checks with curl (OQ5). The operator's org
     has no public project, so there was no public reader page to load anyway.
  4. **Teardown delete refused** (§ Refused).
- **findings:** F1–F3 and the record gap, in § Findings, each with its case list.
- **proposed fix slices:**
  - `P41-sr.F1` (`risk: high`; origin S1, `route: mid`): skip the Sources section;
  - `P41-sr.F2` (`risk: high`; origin W2's F3 claim, `route: mid`, over B1's state route): speed and follow along
    per listener;
  - `P41-sr.F3` (`risk: high`; origin W2, `route: mid`, plus B1's position key, persisted state): one language per
    book Listen;
  - **the record gap** is an orchestrator command, not a slice: `design-canvas 11-listen --implemented`, after
    F1–F3.
  - **If the operator answers OQ4 "now":** also `P41-sr.F4`, a short first part (`risk: high`: it changes B1's part
    grouping, the parts' identity).
- **deferred-job candidates:** in § Deferred-job candidates (two jobs, one observation).
- **doc_impact_added:** none. Completing the list is pass-only, and this review changed no durable truth.
- **doc_versions:** none. The two gate sections are pass-only and were not written; W1's CSP-observer note and the
  `localhost:<port>` note wait for the passing round.
- **explain:** not written — run `/knowledge:explain P41-sr` for a document, or ask it for a book
- **walkthrough:** none. The gate does not open on `changes_requested`. A draft for the passing round is in
  § Walkthrough draft.
- **team-rules check:** n/a. This is an at-root install: `nested-repos` refuses, since there is no
  `.agentic-nested.json`.
- **instrument:** Claude in Chrome. `list_connected_browsers` showed one browser, and `select_browser` ran on
  deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5` before any other browser tool. All work was in my own tab
  (1503959305), which is now closed.
- **notebook** (written through `phase-section`):
  - **Now:** "REVIEW round 1: changes_requested … run REVIEW round 2". The full text is in `phase.md` `## Now`.
  - **Notes:** two new entries, for the fix slices and round 2.
  - **Operator Questions:** OQ4 and OQ5.

## The intent, item by item

| Intent | Evidence | Holds |
|---|---|---|
| A Listen control in the reader, on a document and on a book | `components/listen/listen-control.tsx` (the head), the slot pill and the dock; `components/book/book-listen.tsx` (the landing). Live: the document head reads `Listen`, then `Waiting`, `Ready`, `Playing`; the landing reads `Listen · 4 chapters`, then `Continue listening · Chapter 3 · 0:04` with Start over | yes |
| Plays a document start to end; a book chapter after chapter | Live: the harbour note ran to `Finished · You've listened to the end`. The book ran ch1 → ch2 → ch3 → ch4 on one source. At ch1's end with ch2 unmade it went `next-waiting` ("Chapter 2 is still preparing… plays by itself"), then went on by itself once ch2's part 1 was made. Media Session showed the chapter and album the book | yes |
| English and Korean | Live: a Korean chapter Listen played (dock title `lang=ko`, `keep-all`, follow along on Hangul, a Korean Media Session title). Production's voice is Ming-3.0 for both, with Korean pre-split into packs (B3). The operator has heard English on production (X1); **Korean on production is not yet heard** (walkthrough) | yes, with F3 |
| Plays on an iPhone with the screen off | WebKit keeps native HLS. `engine.ts:189-190`: `native = canPlayType(HLS) !== "" && !(chromium() && mse())`. Safari and every iOS browser expose no `userAgentData`, so the predicate is W1's unchanged (`git show 3477a8fb:…engine.ts:89`). One continuous source per Listen, never a `src` swap (R3). The device check is the operator's (R3 §10) | operator |
| Skips quizzes and code; reads alt text | `server/spoken.py:187` `_SKIPPED = {"code","hr","quiz","sources","glossary"}`. Live claim on the scratch stack: the code block and the quiz gave no segment; the diagram read its title and caption; the formula read its alt, its reading and each legend line | yes |
| Skips source lists | `spoken.py` skips only the **typed** `sources` block. The explain skill (§4.6, at the base commit and since) writes Sources as a **plain-Markdown** `## Sources {#sources-list}` section and never uses the typed block. That section is read aloud: file paths, commit hashes and phase ids | **no: F1** |
| Free | Ming-3.0 runs locally on the Mac (licences: the operator's 2026-11-11 word, any licence while unpaid); no paid API; no spend in any slice. D104-vm and D105-y8 are the operator's deferrals: context, not findings | yes |
| The Mac as the fallback runner (Scope Added A) | `tools/listen-runner`, installed by the operator (X1). The log (read only) shows 6 claimed/rendered/uploaded/finished, with no failed or refused line. The box never renders | yes |

## RESPECT THE DESIGN (`11-listen/01-listen`)

The signed round's § Build and F1–F33 were checked against the running product at `innerWidth` 1920, light and dark.
Everything below matches:
- **Dock (F7):** a capsule on the column's edges, lead by state, staying put while the bars hide.
- **Player (F8, F28–F30):**
  - the sheet is 416 px, `aria-modal`, with focus on Close;
  - the head holds Go to the text and Close;
  - the position is in Fraunces;
  - the transport is previous chapter, −15, play, +15, next;
  - Speed has six values, Follow along is a switch;
  - the current Chapters row has the accent edge and shows readiness words;
  - Stop listening.
- **Landing (F31):** Listen or Continue listening with Start over; the rows' `Audio 1 min` item.
- **Follow along (F12):** marks the block and **never scrolls**. `scrollY` stayed 0 across 17 samples while the mark
  moved past the fold. Go to the text scrolled once to the heard block, even across chapters.
- **Waiting, preparing and ready notes (F10):** as drawn.

No approved element was found dropped or restyled. **One designed behaviour is not built as drawn:** F3, "remembered
per listener (not per document)" (F2 below).

## Decisions cross-check

Every decision a `result.md` records is in `## Decisions`, with its topic or `result.md` pointer:
- S1: the spoken script;
- B1: the backend;
- B2: Packaging, Play identity;
- B3: the Mac runner;
- W1 and W2: **Player (W1, amended by W2)**;
- X1: **Ship order (X1)** and **Part upload cap (X1)**;
- the breakdowns, the design signoff, the licences, the voice and the runner.

`validate` reports no dangling pointer. One open item was never decided: S1's "a `## Sources` heading is still read
before its skipped list". It was recorded at `topics/notes-for-later-slices.md` § 7 as "Open for D1 or DECOMP2", and
no slice took it up. It is F1's root.

## The seven candidates, judged

1. **The first part's wait (~5 min):**
   - Not a defect against the intent or the design. The note says Preparing and Ready as drawn.
   - Fresh eyes: it is the worst first impression Listen has, every new document.
   - Routed as **OQ4** (an operator decision for the fix round). If deferred, it becomes a deferred job (below).
2. **Speed and follow along across Listens:**
   - Narrower than W2 wrote. After a full load, a fresh Listen on a never-heard document **does** carry the
     listener's latest speed (live: 1.5× carried to the loose note), because the state route falls back to
     `latest_position`.
   - What fails is a document **heard before**: it takes its own old speed (live: 1.5× while the listener's last
     choice was 1×), since `listen_api.py:446` is `preference = position or latest_position(...)`.
   - This is against F3's "not per document": a finding (**F2**).
3. **The dock or player title in the variant language:** confirmed live, on dev and the production build. It
   reaches the lock screen and the live region too, and it has a sibling defect: the kept place crosses languages.
   A finding (**F3**).
4. **A reload shows the last 15 s save:**
   - Accepted as built: it is at most 15 s back, and the next load is right.
   - A deferred-job candidate (below), and "decided as drawn" in the walkthrough draft.
5. **Chromium through hls.js, WebKit native:**
   - Confirmed: the WebKit path is W1's, unchanged (above).
   - Chromium playback was verified live: `blob:` source, parts over XHR, no CSP violation, on dev and on the
     production build.
   - The iPhone checks are the proof for WebKit. Check 9 of R3 §10 matters most: play while the playlist still grows,
     the case where Chrome's native HLS stalled.
6. **The part upload cap, 16 MiB.** Nothing in the chain caps lower:
   - the edge: `client_max_body_size 20m` at server level (`deploy/knowledge.conf:135`), with no location override;
   - the runner's routes stay on `location /api/` (FastAPI). Live on production: `GET /api/listen/jobs/claim` and
     `/api/listen/parts/abc` answer FastAPI's 405 with no `x-frame-options`, so the BFF is never in the upload path;
   - B2's validation (`listen_mp4.py`) has no byte cap: `MAX_FRAGMENTS` 4000, `MAX_PART_SECONDS` 4 h, a per-box
     payload limit of 1 MiB (trun 4 MiB) on metadata boxes only;
   - Starlette and uvicorn set no body limit; Cloudflare's per-request limit is 100 MB;
   - `_read_capped` refuses an over-cap `Content-Length` first (`listen_api.py:652-665`).
7. **The runner's inferred section pauses:**
   - Acceptable as shipped: a misfire only lengthens or shortens a pause.
   - The operator heard production audio ("Voice comes well", X1).
   - Already deferred as **D109-vn** ("Listen claim carries each segment's section and kind").

## Findings

### F1 — Listen reads the source list aloud

- **Rule:** the intent's skip list says source lists are not read. The skip is keyed on the typed `sources` block.
  The explain skill (`plugin/skills/explain/SKILL.md` §4.6, the same at `b1eb6484`) never writes that block. Every
  chapter closes with a plain-Markdown `## Sources {#sources-list}` section of paragraphs and lists. `spoken.py`
  reads it as text and list items.
- **Proof:**
  - `spoken_script` on §4.6's own example yields `heading Sources`, `text The code, at commit 88d2e95:`, then each
    file path as a `list-item`, then `What the work recorded:` and each phase line.
  - The live claim on the scratch stack read `Sources` and `Check yourself` alone, each heading before a block that
    says nothing.
- **Cases** (the acceptance matrix):

  | Case | Now |
  |---|---|
  | a. a typed `sources` block | skipped (S1 test, live): **pass** |
  | b. a plain `## Sources {#sources-list}` section: its paragraphs and lists | read: **fail** |
  | c. the `## Sources` heading itself, either form | read alone: **fail** |
  | d. a Korean translation's Sources (heading translated, id `sources-list` kept by the translation rule) | read: **fail** (by code) |
  | e. a book chapter's Sources (every explain chapter has one) | read: **fail** (same path) |
  | f. any heading whose section then says nothing (a quiz, code or glossary under its own heading, e.g. "Check yourself") | read alone: **fail** (live) |
  | g. "sources" as a word in prose, or a `## Sources` with no `sources-list` id | must stay read: guard |
  | h. units already made: production's one document, and every unit made before the fix | keep their audio, since the unit key (version, lang, voice, profile) does not change with the script. The fix states its choice: bump the profile so they remake, or leave them until the document's next version |

- **Files:**
  - `server/spoken.py` and its plugin template mirror;
  - `tests/test_spoken.py` and `tests/fixtures/spoken/chapter.md` (and their mirrors), with one plain Sources section
    added to the fixture;
  - `server/config.py`, only if case h bumps the profile;
  - `plugin/templates/manifest.json`, only if a file is added.
- **The simplest rule:** a `sources-list` section is skipped whole, heading included, and a heading whose section
  yields no other segment is dropped.

### F2 — Speed and follow along are kept per document

- **Rule:** F3, "remembered per listener (not per document)"; F33, "carry from one Listen to the next, wherever it
  starts".
- **Cause:** the state route (`server/listen_api.py:446`) takes speed and follow from the document's own position
  when one exists, and from the listener's latest only when none does.
- **Cases:**

  | Case | Now |
  |---|---|
  | a. the next Listen in the same page session | carries: **pass** (live) |
  | b. a full load, then a fresh Listen on a never-heard document | the listener's latest: **pass** (live, 1.5×) |
  | c. a full load, then a document heard before at another speed | its own old speed: **fail** (live: 1.5× against the listener's 1×) |
  | d. follow along, the same as c | **fail** (by code) |
  | e. a book chapter with a saved position at another speed | **fail** (same route) |
  | f. another device | as b and c (server-backed) |

- **Files:**
  - `server/listen_api.py` (the state route's preference; the PUT's default at :602 stays) and its mirror;
  - one assertion in `tests/test_listen.py` and its mirror, if the operator's test rule allows it. The cases are
    otherwise verified live.
- **The simplest rule:** speed and follow come from `latest_position(user)` always.

### F3 — A book Listen in one language borrows the other language's words and place

- **Rule:** everything a book Listen shows or resumes belongs to that Listen's own language.
- **Causes:**
  - titles come from the page's seed (`l.book.chapters`, the variant the reader last opened, `engine.ts:137-143`,
    `:576`), not from the timeline entries, which carry the audio's own `title` and `lang` (B2);
  - positions are keyed `(user, tenant, kind, project, item, from_chapter)`, without `lang` (`listen_jobs.py:718`,
    `0007_listen`).
- **Cases:**

  | Case | Now |
  |---|---|
  | a. the dock's title | `등대지기의 아침` over English audio: **fail** (live, dev and production build) |
  | b. the player's title | the same: **fail** (live) |
  | c. the Media Session (lock-screen) title | the same: **fail** (live) |
  | d. the live region ("Playing: chapter 1, 등대지기의 아침") | **fail** (live) |
  | e. later chapters of the same Listen | the row titles of each chapter's last-read variant: **fail** (by code) |
  | f. an English kept place offered on the Korean chapter page | `Continue listening · 0:08 of 0:24` (English seconds, Korean length); pressing it played the **Korean** audio from 0:08: **fail** (live) |
  | g. a Listen in one language overwrites the other's kept place from the same chapter | one row per book and start chapter: **fail** (live) |
  | h. the finished copy of a Korean Listen covering 2 of 4 chapters | "You've listened to all 4 chapters.": **fail** (live) |
  | i. the landing's Start over while its Continue listening is the Korean Listen | started an English Listen: **fail** (live, production build). Decide whether Start over restarts the kept Listen's language |
  | j. the landing → reader link opens the chapter in the Listen's language | **pass** (W2's fix) |
  | k. document Listens (loose documents carry one language) | n/a: guard |

- **Files:**
  - `web/src/lib/listen/{engine,book,seed,store}.ts`, `web/src/components/book/book-listen.tsx`,
    `web/src/content/listen.ts` (the finished count), `web/tests/listen-player.test.ts`;
  - server: `server/listen_api.py` and `server/listen_jobs.py` and their mirrors. Either filter a position whose
    `lang` differs, or key positions by `lang`. Keying needs `alembic/versions/0008_*.py` and the ORM model, a
    persisted-state change, hence `high`.
- **The simplest rule:** take titles from the timeline entries, and treat a position of another language as none
  (keeping its speed and follow as the preference).

### The record gap — `11-listen` is `signed`, not `implemented`

- `docs/reference/design/jobs/11-listen/job.json` is `status: signed`, while W1 and W2 built its every page
  (design-cowork `reference/build.md`: "When the build lands, run `design-canvas <job> --implemented`").
- **Fix:** the orchestrator runs `python3 scripts/workflow.py design-canvas 11-listen --implemented` after F1–F3.
  No executor slice is needed.
- **The walkthrough of the passing round** then carries the decision "delete canvas
  https://claude.ai/artifact/EKyuGvWVWFKmgFuk71xKaG: its design is built and signed in the repo". The operator's
  standing note asks for that, and for the samples page, after the gate clears.

## Gate stages

**1. The manifest.** `## Operator Runtime` is filled: dev `:3030`, the production build per the scratch-clone
recipe, the acceptance origin, the devices, and the deviceId.

**2. The independent spot-check, and 3. the fresh-eyes walk.** I opened the product myself.

The scratch stack:
- `p41-rv-pg` (`postgres:17`, 127.0.0.1:55451, migrated `kb_app`);
- the API on `:8766`, with a scratch `KB_ROOT`, `KB_GIT_COMMIT=0`, `KB_LISTEN_PART_CAP_S=20` and no Gemini keys;
- the scratch production standalone build on `localhost:3041`;
- the runner, played by a scratch script: macOS `say` (Samantha, Yuna) through B2's pinned `aac_at` command;
- synthetic content only: a loose note with code, a diagram, a formula, a quiz and a typed sources list; a 4-chapter
  book with Korean ch1–2; the plain loose note;
- signup in the agent's Chrome on `:3030` (a throwaway `@example.test` account), and one sign-in on `:3041`.

Checked live:
- Listen on a document: Waiting → Ready → Playing → Finished.
- Listen on a chapter: the book from there, `next-waiting`, and continuing by itself.
- The player sheet: Speed, Follow along, Chapters (a chapter seek), Go to the text (to `/ch2`, scrolled once),
  Stop listening, then Continue listening on the landing and on the chapter.
- The landing's Listen and the rows' audio item.
- Follow along never scrolls.
- Korean, and dark.
- Production build: Continue listening played via hls.js under `script-src 'self' 'nonce-…' 'strict-dynamic'`, the
  sheet opened at 416 px with focus on Close, and the landing rendered.
- CSP: a buffered `ReportingObserver` plus a `securitypolicyviolation` listener gave `[]` on every page checked,
  dev and production build. The positive control: an `img-src` violation reported `img-src`.

Fresh-eyes notes, beyond F1–F3:
- the ~5 min first wait (OQ4);
- after Go to the text, focus lands on `body`; nothing in the record says where it goes;
- a finished Listen that is stopped offers "Continue listening · Chapter 2 · 0:16", its very end. Pressing it was
  not tried; round 2 looks.

**Production, public** (`https://knowledge.hi2vi.com`, curl, signed out):

| Probe | Result |
|---|---|
| `GET /healthz` | `200`, `{"status":"ok",…"db":"ok"}` |
| `GET /api/listen/play/x/playlist.m3u8` | `401 xfo=DENY` (Next BFF) |
| `GET /app/listen/state?…` | `401 www-auth=Bearer` (FastAPI, new code) |
| `GET /api/listen/position` | `405 xfo=DENY` (the edge routes it to web) |
| `GET /api/listen/jobs/claim`, `/api/listen/parts/abc` | `405`, no `xfo` (FastAPI) |
| `/`, `/@leetusik`, `/@leetusik/x/y`, `/documents/1` | 200, 200, 404, 307; **no** `lx-` class, no Listen word, no `<audio>` |
| `/SKILL.md` | byte-identical to `plugin/skills/explain/SKILL.md`; the landing reads `2,759` lines |

The operator's signed-in results are theirs (X1 § Production check):
- "Voice comes well";
- the Range snippet: `206` / `416` / HEAD `200`, `accept-ranges: bytes`, no content-encoding on parts,
  `cf-cache-status: DYNAMIC`;
- 6 parts made, none refused, after the 16 MiB deploy.

**The agent's Chrome is signed in on production** as an account that is not the review's. One page (`/@leetusik`)
rendered as that member before I left; nothing was clicked or changed (OQ5).

## Regression Checklist (`docs/current/qa.md`, 59 lines)

**Boundary.** `phase-scope P41-sr` (103 product files). The root layout (`<ListenRoot/>`, inert off reader paths)
and `web/package.json` (hls.js) are shared, so they widen the boundary to every web surface. `server/main.py`,
`gitops.py` and `persistence/models.py` widen it to the API. P40-2t's own files are outside (`git log` per file); the
explain skill files are inside, because G1 changed them too.

- **Outside, 3 lines:**
  - 1 (`kb build`) and 2 (`site_smoke.py`): no mkdocs or site file is in the diff; already deferred as D35, D58 and
    D82-kq;
  - 30 (the verifier's same-model guard): `plugin/agents/verifier.md` is untouched, and `plugin.json` changed only
    its version.
- **Inside, 56 lines.**

| Lines | Result (round 1) |
|---|---|
| 3, 26, 36 (pytest half), 40, 41, 53 | **pass**: the full pytest (250) covers them (`test_api_write`/`test_api_push` for the recent marker, `test_document_check`, `test_explain_resolver`, the private-publish and visibility tests, `test_native_*`) |
| 4 | **pass**: `validate` |
| 6 | current version opens in the reader: **pass** (`/documents/8`). The `?view=full` past-version half: not re-run |
| 12 | no inner scroller on a chapter: **pass** at 1920 only |
| 14 | deep link `#the-letters`: **pass** (heading at 72, bar bottom 59) |
| 15 | old links: **pass** (`/documents/1` and `/@…/lab-ch3` → the chapter URL; loose `/documents/8` keeps its address) |
| 17 | resume: **partial**: "Picked up where you left off · 24%" seen on reload; the 45 % script not run |
| 21 | visibility, signed out on `:3041`: **pass** (a private chapter or book renders exactly as a non-existent one; a private document 404s as a non-existent one) |
| 24 | reader chrome at 1920: **partial** (a scroll down hid both bars; a scroll up brought the top bar and the resume pill); tap and Tab not run |
| 25 | Next at the top: **pass** (`/ch3`, `scrollY` 0) |
| 27 | **pass**: both parity scripts |
| 32, 58 | **pass**: 2,759 = `wc -l`; production `/SKILL.md` byte-identical |
| 37 | **fail, pre-existing**: the citation check gives `missing=85`, identical at `b1eb6484`, `07090944`, before and after G1, and at HEAD. The cause is the workspace's v89 install against the v96 skill (`UPDATE_REQUIRED.md`), not this phase |
| 38 | wide step: **pass** (704 px = 44rem, 20 px text at 1920) |
| 42 | **pass** for audio (GitHub `main`: 5,256 paths, no `.audio`; the store writes a self-ignoring `.audio/.gitignore`); the private-footprint half: not re-run |
| 43 | **pass** (`/@rvlab/graph` 307 → `/@rvlab`; unknown `/graph/{uuid}` and `/x/graph` 404; `/graph` → `/login?next=%2Fgraph`) |
| 44 | **partial**: no graph band, anchor or wording on `/`; the band alternation at four widths not run |
| 46 | **pass** (`GET /app/graph` 404; the template ships `graph_hook.py`, `graph.md`, `graph.js` and the mkdocs hook) |
| 47 | **partial**: a formula block rendered with its reading and legend, no raw TeX; the 320 scroll not run |
| 5, 7, 8, 9, 10, 11, 13, 16, 18, 19, 20, 22, 23, 39, 45, 48, 49, 50, 51, 52, 59 | **not re-run** in round 1; owed in round 2, after F1–F3 land in the same reader files |
| 28, 29, 31, 33, 34, 35, 36 (headless half), 54, 55, 56, 57 | **not re-run**: each needs a headless `claude -p` run in a v96 scratch workspace (this one is v89). G1's hunks in the skill are §4.4, Part B and the version strings. Owed in round 2, or the operator waives them |

**This phase's checklist lines** are appended at the passing round (pass-only). Draft:
- `- [ ] Listen, a document: Listen → Waiting/Preparing → Ready → plays to Finished; follow along marks the block read and never scrolls; the player's Speed, Follow along, Go to the text and Stop listening work, and Continue listening resumes (P41-sr)`
- `- [ ] Listen, a book: from the landing or a chapter it plays chapter after chapter on one source, waits as "Chapter n is still preparing" and goes on by itself; the landing shows Continue listening and each row's Audio item (P41-sr)`
- `- [ ] Listen skips code, quizzes, the glossary and the Sources section, and reads a figure's alt, a diagram's title and a formula's alt, reading and legend (P41-sr)`
- `- [ ] Listen in Korean: a Korean chapter's Listen reads Korean, with Korean titles on the dock, the player and the lock screen (P41-sr)`
- `- [ ] Listen, no CSP violation: a buffered ReportingObserver reports none on a reader page while it plays (hls.js on Chromium, native HLS on WebKit) (P41-sr)`

## Operator Questions

- OQ1–OQ3: each is resolved and collapsed with a pointer, so each counts as routed.
- OQ4 and OQ5: new from this round. Each is a decision for the operator before the fix round. Round 2 routes them.

## Deferred-job candidates (for the orchestrator to file)

1. **Listen: a short first part, so playback starts in under a minute.**
   - Reason: about 5 min passes before anything plays (X1: claim → upload 4 min 57 s), because part 1 is a full
     ~10 min part at RTF ≈ 0.46.
   - Trigger: file it only if the operator answers OQ4 "defer"; then the next Listen work.
2. **Listen: a reload shows the position the pagehide beacon saved.**
   - Reason: the route reads the seed before the beacon lands, so a reload can show up to 15 s back (W1 § Chrome run).
   - Trigger: a replayed stretch is noticed after a reload, or the next Listen position work.
3. **Observation, outside the boundary:** the P33-n3 citation check fails `missing=85` on this v89 install. Running
   `/update-workspace` to v96 is already pending (`UPDATE_REQUIRED.md`). Re-run the check after it. No new job
   unless it still fails then.

Already filed, not re-filed: D104-vm, D105-y8, D106-wd, D107-he, D108-5s, D109-vn; the site build: D35, D58, D82-kq.

## Walkthrough draft (for the passing round; not returned now)

On production, Mac Chrome, signed in:
1. Open a short native document → Listen → Preparing → plays. Open the player: Speed 1.5×, Follow along, Go to the
   text, Stop listening → Continue listening.
2. Open a document that ends in Sources and confirm the Sources section is not read (after F1).
3. A book from its landing: Listen → the chapter plays into the next by itself. Then a Korean chapter's Listen, with
   Korean titles on the dock and the lock screen (after F3).

On the iPhone, R3 §10's 13 checks (`topics/phone-playback.md` §10):
- screen off ≥ 5 min, the lock-screen controls, ≥ 2 chapter boundaries while locked;
- **9, play while preparing**;
- resume, sign-out;
- iOS Chrome and the home-screen app, and an iPad pass.

On the box: `df -h /opt/knowledge` (owed since X1).

Decisions:
- delete the Listen canvas and the samples page.

Decided as drawn:
- a reload can show the last 15 s save;
- the inferred section pauses (D109-vn);
- Chromium plays through hls.js;
- lengths read at least "1 min".

## Refused by the permission layer (not worked around)

- `rm -rf` of the review's scratch directory. These paths are left, all under
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/5d1a4fc9-9d70-403f-9f9d-a092c34a78a0/scratchpad/rv/`:
  - `webbuild/`, the scratch clone and its standalone build;
  - `kbroot/`, the scratch `KB_ROOT`, with synthetic content and its made audio;
  - `parts/`, the rendered synthetic audio;
  - `tools/`, the scratch scripts;
  - the logs;
  - `prod-SKILL.md`, `skill-*.md` and `cite*.py`;
  - `so-ch1.html`, `v.html` and `last-claim.json`;
  - the secret files `pgpw.txt`, `acct-email.txt`, `acct-pw.txt`, `session.txt`, `vk.txt` and
    `session-secret.txt`. Each belongs to the destroyed database or a stopped server, so each is inert.

**Torn down:**
- the API on `:8766` and the production build on `:3041` are stopped, and both ports are closed;
- `docker rm -f -v p41-rv-pg` ran; no such container remains;
- the test account was signed out on both origins;
- the Display theme was restored to System;
- my tab is closed.

**Left untouched:**
- `:3030` (still PID 8452, 200);
- `web/.env.local` and every `.env`;
- the installed runner (its log was only read);
- `changple5-*` and `p50-s12-db`;
- `UPDATE_REQUIRED.md`.

Nothing was pushed, deployed or committed, and no SSH ran.
