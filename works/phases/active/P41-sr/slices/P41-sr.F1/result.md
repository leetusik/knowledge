# P41-sr.F1 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Listen no longer reads the source list. A heading id'd `sources-list` opens a section that is skipped whole: the heading, its paragraphs, lists and subheadings, up to the next heading of its level or higher. The id decides, so an assigned id and a translated heading are skipped too. A heading whose section says nothing ("Check yourself" over a quiz, or a heading over only code or a glossary) is dropped. Units made before the fix need no schema, profile or setting change. B1's existing stale-unit replacement rebuilds them at the next Listen press or Update audio, and only the parts whose text changed render again.
- **files_changed:**
  - `server/spoken.py`
  - `tests/test_spoken.py`
  - `tests/fixtures/spoken/chapter.md`
  - `plugin/templates/kb/server/spoken.py`
  - `plugin/templates/kb/tests/test_spoken.py`
  - `plugin/templates/kb/tests/fixtures/spoken/chapter.md`
  - this `result.md`
- **validation:**
  - `uv run pytest -q tests/test_spoken.py tests/test_listen.py tests/test_listen_play.py` on `p41-f1-pg` (`KB_TEST_DATABASE_URL`, 127.0.0.1:55451): **9 passed**, none skipped.
  - The full `uv run pytest -q` with that DSN: **252 passed**. It was 250; this slice added 2 tests. Without a DSN: 188 passed, 64 skipped.
  - The 3 spoken tests run against the pre-fix `spoken.py` (`git show HEAD:server/spoken.py`): **all 3 fail**, so the tests discriminate.
  - `uv run python scripts/plugin_parity.py`: **PASS**, exit 0.
  - `spoken_script` on SKILL.md §4.6's own two examples, on §4.5's quiz under its own heading, on a Korean translation and on the fixture: the Sources and "Check yourself" lines are gone and the guard lines stay (§ Cases).
  - The case h scratch run, on `p41-f1-pg` at part caps of 15 s and 40 s: **2 passed** (§ Made units).
  - `web/ vitest run tests/listen-player.test.ts`: **9 passed** (`switchList`'s "later" under a sounding element).
  - `python3 scripts/workflow.py validate`: **passed**. Only the standing warnings remain: notebook budget, consolidation owed, stale docs, oversized sections.
  - `git status --porcelain --untracked-files=all` shows only the set, plus this slice folder. The orchestrator's own uncommitted changes were already there at dispatch: `works/backlog.md`, `works/events.jsonl`, `phase.md`, `P41-sr.F1/slice.json` and `UPDATE_REQUIRED.md`.
  - `p41-f1-pg` was removed with `docker rm -f -v`. Its anonymous volume is confirmed gone.
- **deviations:**
  - `server/listen.py` and `server/config.py` are unchanged. Case h needs no code: the "manifest check" the plan suggests already exists (§ Made units).
  - I did not add a `tests/test_listen.py` assertion. The mechanism is B1's existing, documented behaviour, so I verified it on a scratch run, as the plan allows.
  - The fixture's code block and quiz moved under their own `###` headings, and the typed `sources` block moved into "The mean". This lets each case be proven on its own. No other expected segment changed.
- **doc_impact:** listed under `notebook` below. As the plan's Return directs, I wrote no `phase.md` entry myself.
- **notebook** (for the orchestrator to write):
  - **Decisions:** `Spoken skip (F1): a heading id'd sources-list opens the source list, skipped whole (heading, text, lists, subheadings) up to the next heading of its level or higher, by id not words (assigned ids and translations too; a ## Sources with another id is read); a heading whose section says nothing is dropped; units made before the fix are rebuilt by B1's stale-unit replacement at the next Listen press or Update audio, with no schema, profile or setting change, and only changed parts render → slices/P41-sr.F1/result.md`
  - **Doc impact:**
    - `backend.md: the spoken script skips the sources-list section whole (heading included; by its id, so an assigned id and a translation's heading too; a ## Sources with another id, and the word in prose, are read) and drops a heading whose section says nothing (a quiz, code or a glossary under its own heading); a unit made under an older rule is replaced at the next start/update with its unchanged parts reused (P41-sr.F1)`
    - `qa.md: tests/test_spoken.py has 3 tests; the full Python suite is 252 passed with a DSN, 188 passed / 64 skipped without (P41-sr.F1)`
  - **Now:** `F1 landed: Listen skips the sources-list section and headings that lead to nothing; production's made document rebuilds at its next Listen press (only changed parts render; that press stops once with "The connection dropped", then Try again plays the new unit). Next: F2, F3, then REVIEW round 2.`
  - **Notes for later slices** (suggested; the plan's Return did not ask for it): `(from P41-sr.F1, for P41-sr.REVIEW round 2) The first Listen press on a unit made before F1 replaces it. The press has already attached the old unit's playlist, which 404s once the unit is replaced. Playback stops once with "The connection dropped, so playback stopped at …", and Try again plays the new unit from there. Expect this once per pre-F1 unit, e.g. production's one document at acceptance → slices/P41-sr.F1/result.md § Made units`

## Cases

Proof comes from the fixture tests (`tests/test_spoken.py`), the §4.6 run (`spoken_script` on SKILL.md's own
example text) and the code path.

| Case | Expected | Result | Evidence |
|---|---|---|---|
| a. a typed `sources` block | skipped | **pass** | The fixture's typed `sources #sources` block now sits inside "The mean", outside any source list. `test_spoken_script`'s full order shows that it says nothing, so the skip by type alone holds. |
| b. a plain `## Sources {#sources-list}` section: its paragraphs and lists | skipped | **pass** | Fixture: `test_the_source_list_is_skipped_whole` asserts that "The code, at commit 88d2e95:", the file line, "What the work recorded:", the phase line, and the `### Outside works` subheading with its list item are all absent. §4.6 example 1 (old → new): 7 segments → 0. §4.6 example 2: 5 → 0. |
| c. the Sources heading itself, either form | skipped | **pass** | Authored `{#sources-list}`: the fixture. Assigned: `## Sources` with no id gets `sources-list` from `ids.heading_slug`; the test checks the assigned id and an identical script. Over a typed block, the old fixture's form: the heading goes with its section. |
| d. a Korean translation's Sources (heading translated, id kept) | skipped | **pass** | The test's `## 출처 {#sources-list}` variant gives the same script as the original. In the §4.6 Korean run, `heading 출처` plus 4 lines → 0. |
| e. a book chapter's Sources | skipped (same path) | **pass, by code** | A book chapter is a document: `listen_api._resolve` → `gate.doc(...)` per chapter variant. `_make` → `_current_source` → `listen.manifest_for_source` → `spoken_script`. The path is the same as a document's, with no chapter-specific branch. |
| f. a heading whose section then says nothing | dropped | **pass** | `test_a_heading_that_says_nothing_is_dropped` covers "In code" (over code), "Check yourself" (over a quiz) and "Terms" (over a glossary): all three are absent. `## Sources {#origins}` holds only a `###` with text and is kept, said just before it. With that text removed, both headings drop. In the §4.6 run, "Check yourself" over §4.5's quiz is gone. |
| g. "sources" in prose; a `## Sources` with no `sources-list` id | read | **pass** | `## Sources {#origins}` is read: `texts.count("Sources") == 1`. "Two sources feed every mean here: a survey and a census." is read. The section after the source list (`## After the sources`) is read, so the skip ends at the next heading of its level. |
| h. units already made before the fix | rebuilt, only changed parts render | **pass (scratch run)** | § Made units. |

**The fixture's new reading order** (`spoken_script` on `tests/fixtures/spoken/chapter.md`, abridged): the S1 segments
are unchanged through `n: the sample size`. Then come `heading Sources` (`#origins`), `heading Where the numbers come
from` and the guard's prose, then `heading After the sources` with its text. "In code", "Check yourself", the whole
`sources-list` section and "Terms" are gone.

**The §4.6 run** used SKILL.md §4.6's two `markdown` examples and §4.5's quiz, extracted verbatim. Each sits behind a
one-section preamble ("How it works"). In every variant, the new script is exactly `heading How it works`, then
`text The cache answers first.`. The old script read, for example 1:

```
heading   Check yourself
heading   Sources
text      The code, at commit 88d2e95:
list-item web/src/lib/native/project.ts: the text a highlight's offsets are counted in
list-item web/src/components/reader/paint.ts: painting a saved highlight back onto the page
text      What the work recorded:
list-item Highlights and notes in the reader (P30): …
```

**The rule as built** (`server/spoken.py`, `spoken_script`):
- Headings are held, not said at once. A held heading is said just before the first segment of its section. It is
  dropped when a heading of the same or a higher level arrives first.
- A heading whose id is `sources-list` starts a skip, which runs until a heading of its level or higher.
- `section` is still tracked through skipped blocks, so S1's section notion is unchanged.

One consequence: a native document whose only text is headings over code or quizzes now has nothing to read aloud.
`manifest_for_source` returns `None`, and the reader shows "Can't be read aloud". Before the fix, those headings would
have been read alone.

## Made units (case h)

**The choice: order 2, with no code.**
- No schema change; `0007` is untouched.
- No profile or voice change, so no segment or part key moves.
- No setting change.

`listen_jobs.ensure_unit` already re-verifies a unit on every `POST /start` and `POST /update`. It builds the
manifest from the current script and compares its part keys with the unit's stored keys. On a mismatch it replaces
the unit:
- `_made_by_key` collects every already-made part with a matching key and its file on disk, before the old unit is
  deleted;
- the new unit's matching parts are made at once;
- only the parts with new keys get jobs.

B1 built this for exactly this case (B1 `result.md` § Deviations 7: "after an S1 rule change"). It compares keys,
not a version stamp. Any script change that moves a key is caught, and a change that moves none leaves the unit alone.
So a spoken-script version would add nothing.

**The scratch run** proves it end to end:
- a disposable Postgres (`p41-f1-pg`);
- an explain-shaped document: four sections, then `## Check yourself` over a quiz, then a plain
  `## Sources {#sources-list}`;
- the unit made under the pre-fix script, with every part rendered through claim, upload and finish;
- the script swapped for the fixed one, as the deploy would;
- the scratch file is `scratchpad/h/test_case_h.py` in the session scratchpad, not committed.

| Step | cap 15 s | cap 40 s |
|---|---|---|
| Made under the old script | 6 parts. Part 6 is "Check yourself" plus the Sources lines | 2 parts. Part 2 is the last section, "Check yourself" and the Sources lines |
| After the deploy, before any press (`GET /state`) | the same unit, `made`, same play URL | the same |
| The next Listen press (`POST /start`) | a new unit with 5 parts, all reused, **made at once**. 0 rendered, no job | a new unit: part 1 reused, part 2 **new** (the last section alone). 1 job. State `making` with `len` = part 1's length, so the made prefix plays at once |
| The old unit's playlist and part URLs | 404, 404 | 404, 404 |
| After the runner renders the changed parts | — | `made`, 2 parts |
| A second press | the same unit, `made` | the same |

In both runs every reused part kept its file, and the live jobs were exactly the parts with new keys.

**How an existing Listen picks it up:** at the **next Listen press** (start) or **Update audio** (update) on that
document. `GET /state` never rebuilds a manifest, so until someone presses, the page shows the old unit as made, with
the Sources still in its audio.

**Which form the W1 and W2 UI handles:** the second form, "the next Listen builds the new unit".
- The first form, an `outdated` note with "Update audio", is not reachable for the same version. The `outdated` note
  is the UI's form of `old: true`, which means an earlier version's unit is playing (`_pick`). Two units for one
  version would need a second row on `uq_listen_units_identity`, which is a schema change, so I ruled it out.
- What the engine does at that press, by code:
  1. The press attaches the stale unit's play URL from the page's state, inside the gesture (`engine.start`). Then it
     calls `listenStart`.
  2. The answer carries the new unit's `play`. Because an element is attached, `absorb` holds it as `pending`:
     `switchList(…, "sounding")` returns "later", per the vitest.
  3. The old unit's URLs 404 once it is replaced (scratch run). The element faults at its next playlist or fragment
     request: `onHlsError`, or the element's `error` → `fault()` → `fail-play`. The note reads "The connection
     dropped, so playback stopped at …".
  4. **Try again** (`retry()`) attaches `pending`, the new unit, at the stopped position.
- So the UI recovers in one press, but it shows one misleading "connection dropped" stop per pre-fix unit. A later
  press plays cleanly.

**Production's one document after the deploy** (I neither read nor touched it):
- It keeps playing its old audio, Sources included, until the first Listen press.
- That press replaces the unit. Explain chapters put the quiz, glossary and Sources last (SKILL.md §4.2), so only the
  tail changes:
  - the part holding "Check yourself" and the Sources lines gets a new key and renders again, which is at most about
    one 10-minute part, roughly 4–5 min on the Mac at RTF 0.45;
  - if those lines formed a trailing part of their own, nothing renders, and the new unit is made at once and is
    shorter;
  - every earlier part is reused unchanged;
  - a regrouping can reach further only if dropping the roughly 1-second "Check yourself" heading moves a 10-minute
    cap boundary, which is unlikely.
- That first press also shows the one "connection dropped" stop described above.
- A clean acceptance path: press Listen on that document once and stop it, wait a few minutes for the changed part,
  then listen.

**Rejected alternatives:**
- A profile bump, through `KB_LISTEN_PROFILE` or `config.listen_profile`'s default. It changes every segment and part
  key, so all 6 parts (about 25 min of rendering) would render again, and the old unit would only be left behind,
  not replaced. That is order 3's full remake, and it is not needed.
- Leaving made units until their document's next version. It is not needed either, since the next press already
  rebuilds them.

## Observations (outside this slice's set; for the orchestrator)

- **A deferred-job candidate:** "Listen: the press that replaces a stale unit stops once with a false 'connection
  dropped'".
  - **Reason:** B1's replacement deletes the unit that the press attached a moment earlier from the page's state.
    B2's play routes then 404 its URLs, and the W1 engine reads that fault as a dropped connection.
  - **Where a fix would live:** `web/src/lib/listen/engine.ts` (attach only after start's answer when the seed's
    unit may be stale), or `server/listen_api.py` (let the state report a stale unit). Both are outside this slice's
    set.
  - **Trigger:** the next spoken-rule change, or a phase that touches the press path.
- `manifest_for_source` now answers `None` ("Can't be read aloud") for a native document whose headings stand only
  over code, quizzes or glossaries. That is the rule's intended consequence, and it is listed here so that REVIEW
  round 2 is not surprised by it.

## Scratch artefacts

All of these are in the session scratchpad, not in the repo:
- `old/spoken_old.py`, the pre-fix script from `git show HEAD`;
- `demo_46.py`, the §4.6 run;
- `h/test_case_h.py`, the case h run.

Every document in them is synthetic. `p41-f1-pg` and its volume are removed.
