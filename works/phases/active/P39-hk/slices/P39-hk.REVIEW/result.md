# P39-hk.REVIEW result (rounds 1 and 2)

## Verdict (round 2)

- **status:** done
- **review_verdict:** changes_requested (two findings, R2-F1 and R2-F2; fix slices `P39-hk.F5` and `P39-hk.F6`)
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** F1–F4 each pass their own case lists on a fresh production build of the final tree (`0162fb65`), and every validation command passes. Two defects block a pass. First, the plugin and S5's package still name bootstrap v92 as the release that carries the package, but the bootstrap released v92 and v93 without it, so a v93 workspace is told it needs "v92 or later" (R2-F1). Second, the Glossary is now a contents entry like every other h2, but it is the one section with no place name: the place bar, the bookmark and note rows, and a new mark's stored snapshot are all blank there (R2-F2).
- **validation** (all run in this worktree at `0162fb65`; detail in § Round 2 › Validation):
  - `uv run pytest -q`: 183 passed, 60 skipped. With a disposable Postgres: 243 passed.
  - `pnpm --dir web typecheck` / `lint`: exit 0 / exit 0.
  - `pnpm --dir web test`: 41 files, 588 tests.
  - scratch standalone `next build` of the final tree: exit 0, 13/13 static pages.
  - `scripts/skills_parity.py`, `scripts/plugin_parity.py`: PASS.
  - `uv run pytest tests/test_explain_resolver.py -q`: 2 passed.
  - `package/checks/cites.py`: citations 113, bold 15, missing=0.
  - `package/checks/finds.py`: 18 checked, not-exactly-once=0, at `bb525b9` and at the bootstrap's head `f72fb9f` (v93).
  - `package/checks/apply.py`: pass at `bb525b9`. At `f72fb9f` the explain block passes, but the pinned skill count (19) meets 20 skills (an R2-F1 case).
  - `wc -l plugin/skills/explain/SKILL.md`: 2492, equal to `content.ts` "2,492".
  - The v86 grep: empty. `git status --porcelain .claude/`: empty.
  - `python3 scripts/workflow.py validate`: passed, pre-existing warnings only, no dangling pointer.
  - P33-n3 citation check against the vendored `.claude/`: 200 checked, 85 missing. That is expected until this workspace updates to the release that carries the package.
- **findings:**
  1. **R2-F1, the class "the plugin and S5's package name a bootstrap release that went to other work".**
     - **Failing cases:**
       - A v93 workspace without the package (the bootstrap's `main` today) passes "92 or later", fails the `**phases**` test, and is told "This workspace (v93) … need v92 or later". `/update-workspace` cannot fix it until the package ships.
       - A v92 workspace: the same.
       - Once the package releases as v94 or later, every refusal still names v92.
       - 21 sites in 9 product files name v92: the three explain SKILL copies (4 each), `plugin/README.md` (3), `plugin/skills/setup/SKILL.md` (2), `plugin.json`, `marketplace.json`, `README.md`, and the KB template's getting-started page. Also `package/README.md`, `package/PATCHES.md` and `handoff-explain.md` L54–56.
       - The `## Doc impact` lines of S5 and S11 name v92, and so does round 1's drafted front-door checklist line.
       - `apply.py` pins 19 skills; the bootstrap's head has 20.
     - **Passing cases:**
       - `finds.py` at `f72fb9f`: 18 of 18 exactly once.
       - `apply.py`'s explain block at `f72fb9f`.
       - The `**phases**` conjunct still refuses every workspace without the package, so nothing runs wrongly.
  2. **R2-F2, the class "the Glossary section has no place name in the annotation layer".**
     - **Failing cases** (live, on the rebuilt `:3978`):
       - the place bar at the Glossary, reached through In this chapter, the Contents sheet, or a tap on the text (`.an-place__where` empty; en and ko);
       - the Bookmark row in the Notes sheet;
       - the per-book notes page's row;
       - the bookmark's stored snapshot (`block_title ""`);
       - a section note opened there (its place would be stored blank).
     - **Passing cases:** every other section and block, on `all-blocks` and `reading-aids`.
     - **The cause:** `nameOf` (`web/src/lib/reader/notes-load.ts`) has no `glossary` case. The block falls to `default: { word: "Section", title: "" }`.
- **proposed fix slices:**
  - **`P39-hk.F5`:** re-pin the explain front door to the bootstrap release that carries S5's package. `kind: fix`, `risk: high`, for two reasons. It repairs S11's release, a `route: mid` slice. And the approach is an operator choice (decision 1 below). Acceptance matrix in § Round 2 › Findings.
  - **`P39-hk.F6`:** name the Glossary section in the annotation layer. `kind: fix`, `risk: low`. There is no trigger: it is one `nameOf` case, and S6, S9 and F4 all ran high. Acceptance matrix in § Round 2 › Findings.
- **operator decisions for the orchestrator to raise now** (F5 cannot be planned without the first). Prose and tradeoffs are in § Round 2 › Decisions to raise.
  1. **F5's approach, with OQ8's order** (its "v92" premise is gone). Recommended: the bootstrap goes first, then F5 re-pins to the number it stamps.
  2. **OQ23** (deferring may contradict "fix everything now."). Recommended: fold its two exact cases into F6, and defer the stored quotes' TeX as one job.
- **doc_impact_added:** none this round. Appending is pass-only. Updated drafts are in § Round 2 › Drafts for the pass round.
- **doc_versions:** none — deferred to post-merge consolidation (parallel mode). The gate-section notes are drafted, not appended (changes_requested).
- **walkthrough:** not opened (changes_requested). Round 2's draft, for the round after F5 and F6, is in § Round 2 › Walkthrough draft. OQ7–OQ23 are all routed (§ Round 2 › Operator Questions).
- **deferred_jobs:** 9 to file (§ Round 2 › Deferred jobs; one depends on decision 2). Round 1's dispositions of existing items stand, and D80-ch is now closed.
- **team-rules check:** n/a (at-root install).
- **explain:** not written — run /knowledge:explain P39-hk for a document, or ask it for a book.
- **instruments** (§ Round 2 › Instruments):
  - Claude in Chrome on the agent profile (`deviceId c14e5b18-…`), selected after `list_connected_browsers` in every session;
  - the viewport harness and a signed-in proxy, inside Claude in Chrome;
  - headless Chrome 156 over CDP;
  - HTTP fetches, and read-only queries of the scratch DB.
  - Not available: WebKit, a real device, a screen reader.
- **stack:** API `:8977`, PID 68284 (kept). Production build of `0162fb65` on `:3978`, PID 3131 (replaced the old 68294). Cleanup commands are in § Round 2 › Stack left running.
- **deviations:**
  1. **The pass-only writes are drafted, not appended.** The verdict is changes_requested.
  2. **Checks beyond the plan:**
     - throwaway publishes to `:8977`: the `math-check` chapter (en and ko, inline math in an h2), its v2 and v3 for P30's annotations line, and a private project `p39private` for the visibility line;
     - the bootstrap's `CHANGELOG.md` and git, read only;
     - a dev-runtime spot-check on `:3977`, started and stopped.
  3. **Round 1's sections are kept** below the round 2 section, as they were. Each line a fix made stale carries **[R2: …]**.
  4. **Not run:**
     - the `claude -p` front-door lines (a v91 workspace and a phase worktree; R2-F1 also makes their pinned text wrong);
     - Review's Undo and Clear (Undo follows a Suspend only);
     - the console's member pages;
     - chrome hide and show at 390 and 820.

## Round 2

Round 2 is a bounded re-review after F1–F4 (`plan.md` § *Round 2*). It re-judges each fix against its case list, re-runs the checklist lines the fixes reach, and re-runs the whole validation. Round 1's sections below stand for everything else.

### The boundary, round 2

`phase-scope P39-hk` gives `b38ab84..0162fb6`: 32 commits and 111 product files (51 added, 56 modified, 4 deleted). The fixes added 11 files to the boundary:
- `web/src/app/book.css`, `kb-docview.css` and `reader.css`;
- `web/src/components/reader/annotations.tsx` and `scroll-box.tsx`;
- `web/src/lib/library/continue.ts`;
- `web/src/lib/native/cites.ts` and `display-text.ts`;
- `web/src/lib/reader/load.ts` and `note-list.ts`;
- `web/tests/display-text.test.ts`.

They pull three round-1 "outside" lines inside: 13 (legacy frame, through `reader.css`), 15 (old links, through `load.ts`) and 16 (library, through `continue.ts`). Line 39 (wide table) now has a changed file under it (`scroll-box.tsx`, `reader.css`). Totals: 37 inside, 9 outside.

### Validation

| Command | Result |
|---|---|
| `uv run pytest -q` | 183 passed, 60 skipped |
| the same with `KB_TEST_DATABASE_URL` → a disposable Postgres DB (dropped after) | 243 passed |
| `pnpm --dir web typecheck` / `lint` | exit 0 / exit 0 |
| `pnpm --dir web test` | 41 files, 588 tests passed |
| standalone `next build` of `0162fb65` in an APFS clone (`scratchpad/review/webbuild-r2`) | exit 0, 13/13 static pages |
| `skills_parity.py` / `plugin_parity.py` | PASS / PASS |
| `uv run pytest tests/test_explain_resolver.py -q` | 2 passed |
| `package/checks/cites.py` (same inputs as round 1) | citations 113, bold 15, missing=0 |
| `package/checks/finds.py` at `bb525b9` and `f72fb9f` (the bootstrap's `main`, v93) | 18 checked, not-exactly-once=0 at both |
| `package/checks/apply.py` on `git archive` snapshots | `bb525b9`: pass. `f72fb9f`: the explain block passes; `assert len(skills) == 19` fails on 20 |
| `wc -l plugin/skills/explain/SKILL.md` | 2492 = `content.ts` "2,492" |
| v86 grep (round 1's paths) | no hits |
| `git status --porcelain .claude/` | empty |
| `python3 scripts/workflow.py validate` | passed; pre-existing warnings; no dangling pointer |
| P33-n3 citation check (vendored `.claude/`) | 200 checked, 85 missing (expected; see R2-F1) |

The bootstrap repo was only read: `CHANGELOG.md`, `git log`, `git show` and `git archive`. It now carries **v92** (2026-11-05, "The PR rule") and **v93** (2026-11-06, "The close", `f72fb9f` = `origin/main`). Neither carries S5's package. Round 1 recorded the bootstrap at `bb2b141`, still v91, before either release.

### Each fix against its case list

**F1 (`d9831598`): bound the kept runs and the inline formulas.** Headless Chrome over CDP: mobile emulation, DPR 2, root font as each case says, `reading-aids` on the rebuilt `:3978`.

| # | Case | Round 2 |
|---|---|---|
| 1 | ko 390, 200% | pass: page 390. `CONDITIONAL-GO의` (368 px) breaks inside on a 323 px line |
| 2 | ko 320, 200% | pass: page 320 |
| 3 | en 320, 200% | pass: page 320 |
| 4 | en 390, 200% | pass: page 390. The keep breaks inside, so nothing runs into the gutter |
| 5 | ko 320, 150% | pass: page 320. No keep is past its column |
| 6 | long inline formula (about 176 TeX characters) at 390, 320, 1440; and ko | pass: page = viewport. At 390 it scrolls in its own 356 px box |
| 7 | 100% at 320 and 390; 150% at 320 and 390 (en, ko) | pass |
| 8 | legend `dt`, term window and sheet, paper | pass |
| 9 | 820 at 150% and 200% (en, ko) | pass (805/820) |

- **OQ19, the legend symbol box:**
  - The CDP crops at 320, 390 and 1440, en and ko, light and dark, at rest and on focus (`scratchpad/rv2/f1r2/sym-*`), match F1 round 2's.
  - A symbol wider than its column scrolls in its own box, with the ring on focus.
- **OQ12, the ring:**
  - Claude in Chrome at 320×568 ko, through the harness.
  - `poisson`'s box is `role="region"`, named "수식, 옆으로 스크롤됩니다". It scrolls inside (306/286) while the page stays 320.
  - On keyboard focus it draws a visible 2 px solid teal ring (`rgb(98, 189, 178)`), with the fades still in place.

**F2 (`5bcd1c55`): hyphenated words kept in all prose, and a particle bound to its formula.**
- **Hyphenated words:** CDP at 1440, 820, 390 and 320, at 100%, 150% and 200%, en and ko.
  - No hyphenated word that fits its line breaks at its hyphen: in the text, the legends or the readings.
  - The reading's "t-statistic" and "t-통계량은" stay on one line everywhere.
- **OQ14:** `s = mean ÷ sd와`, `t = s × √n을` and `∑e²를` stay with their particle at 390 and 320.
- **The one exception is OQ18's rule:** at 320 with 200%, `s=mean÷sd와` is wider than its 253 px line and breaks inside.
- **Diffs against F2's final outputs:** F3's two intended deltas only. The 320/200% page went 348 → 320. The y values moved +44/+88 px because F4 added the Glossary entry to In this chapter.

**F3 (`126f1b85`): P30's controls, the book tag and the past version's formula.**
- **Cases 1–3, the chapter end and quiz buttons:** at 390 with 200%, write-lock ko is 390, where round 1 measured 397.
- **The book tag (OQ20):**
  - At 150% and 200% at 320 and 390, "Older translation" drops onto its own line under its link, and the link stays whole. At 820 it stays beside the link.
  - The page equals the viewport in all 9 cases: 320/390/820 × 100/150/200%.
- **Case 4 and OQ22, the past version `/documents/5/versions/1`:**
  - The display formula scrolls in its own box (`role="region"`, "Formula, scrolls sideways", only while it scrolls).
  - The page is still 446 at 390/200% (447 at 320/200%, 335 at 320/150%). The cause is `a.fg-src__link`, the source URL. That is the console job OQ22 deferred, not F3's.
- **Paper:** unaffected.

**F4 (`28a90ed3`): the Glossary in the contents, and linear text on text-only surfaces.**
- **The Glossary in the contents:**
  - "Glossary" is in In this chapter and the Contents sheet, en and ko, on the standalone build and on dev.
  - Choosing it lands the h2 under the top bar: top 72, bar 59 (CDP; Claude in Chrome).
- **Linear text:**
  - The math-check chapter's h2 reads "When e^(−λ) is near one", or "e^(−λ)가 1에 가까울 때", in In this chapter, the Contents sheet, library Continue, the notes' place names and "Was in …", and a citation's way back.
  - The Review card shows `t = s × √n`.
- **Ids are unchanged:** the TOC hrefs and `data-block` ids are the same as before F4.
- **The residues F4 listed (OQ23) are as F4 described:**
  - the per-book notes list shows a highlight's stored quote as TeX (`Poisson with mean \lambda = \mathrm{rate} \times \mathrm{time}`);
  - the resume pill reads "When e−λ is near one".
- **One more OQ23 case:** the Notes sheet's same-language Unanchored row also shows the stored quote's TeX (seen after v2 orphaned that mark).
- **What F4 did not cover is R2-F2:** the Glossary has no place name in the annotation layer.

### The checklist, rows re-run

Only the rows a fix reaches, or whose result changed. Every other row stands as round 1's table records it.

| # | Line | Round 2 |
|---|---|---|
| 6 | `?view=full`, past version | pass (Claude in Chrome: rail, topbar and docbar hidden; "Exit full width Esc"; Esc returns to the page) |
| 7 | past-version print | pass (CDP A4, 5 pages: masthead, superseded notice, colophon) |
| 8 / 45 | console at 390; one grid track | pass at 100% (390). At 200%, 446: OQ22's deferred console job |
| 10 | KO 390, Contents sheet fits | pass, signed in now too (harness through the member proxy: sheet 0–390 × 182–844, page 390, quiz answered "Incorrect · Saved for review") |
| 11 | one foot sentence | pass in dark (en, signed in: one visible `.qz-st`, the other `is-off`, `visibility: hidden`). Light and sepia passed in round 1; F3 changed only the buttons' wrap |
| 12 | no inner scroller | pass (CDP: `reading-aids` en and ko, write-lock, the loose note, × 12 widths; none) |
| 13 | legacy frame the only scroller | **now inside**; pass (CDP × 12 widths: page `scrollHeight` = `innerHeight`; no inner scroller) |
| 14 | deep link under the top bar | pass (CDP fresh loads: `#counting-the-trials` at 1440 and 390, `#glossary` at 1440; h2 at 72, bar 59) |
| 15 | old links redirect | **now inside**; pass |
| 16 | library grouping | **now inside**; pass (By project / By subject; Continue shows linear math) |
| 17 | resume | pass, signed in |
| 18 | quiz save | pass, signed in ("Correct · Saved for review"; in a new tab after reload: "Your answer from 6 Nov 2026") |
| 19 | annotations persist | pass. Highlights survive a reload. On v2, a sentence added before a highlight re-anchors it (`anchored_version` 2). On v3, rewriting its sentence turns it into "Text changed · Made on English v1 · this version no longer says it", in the Notes sheet and the per-book list. A mark in a heading with no authored id went Unanchored on v2: deferred job 9, outside the boundary |
| 20 | review cards | card path, rating and "Done for today" pass. Undo follows only a Suspend: not run |
| 21 | visibility not-found | outside; run anyway, pass. A private project's chapter and book show the same "Chapter not found" / "Book not found" card as ones that do not exist; `/documents/12` and `/documents/9999` both redirect to login |
| 22 | ⌘P A4/Letter | pass (CDP en and ko, A4 and Letter: the glossary after the quiz and before Sources; the stale-state PDFs are pixel-identical to clean ones) |
| 23 | text size 150/200% at 390 and 820 | **pass** on the chapter (en and ko, plus 320), the book page, write-lock and Review's end state (page = viewport everywhere; CDP light and dark) |
| 24 | chrome hide/show | pass at 1728. A tap on the text hides, a second tap shows (screenshots). With the chrome hidden, Tab reaches "Show reading controls". 390 and 820 not run |
| 25 | Next at the top | pass (write-lock → the bottom bar's Next → legacy at y 0; all-blocks' "Read next →" → write-lock at y 0) |
| 38 | wide step | pass (CDP: 1728 and 1600 at 44rem, 20 px; 1599 and 1440 at 36rem, 18 px; inline math 1em, display 1.5×) |
| 39 | wide table | **now under a changed file**; pass (math-check's wide table scrolls in its own box; page = viewport) |

The outside lines' proof: 9 lines (1, 2, 5, 9, 21, 40, 41, 42, 43). The round-2 file list adds none of their surfaces' files.

### Fresh eyes, round 2

`reading-aids` and `math-check`, en and ko, light and dark, at 1440, 820, 390 and 320: library → book → chapter, then use it. These go to the walkthrough or a job. None is fixed here.

- **The Glossary's blank place (R2-F2).** At the Glossary, the place bar shows only "Add note · Bookmark" and names nothing. Every other section is named.
- **The TeX that still shows (OQ23):**
  - the stored quote, in the book's notes list and the Notes sheet's Unanchored row;
  - "e−λ" on the resume pill.
- **P30's chrome at 390/200%** (into OQ21's design job):
  - the top bar's language switch sits over the logo and back link;
  - the chapter bar's Contents sits over Previous and Next;
  - the Contents sheet's Notes tab sits over Close;
  - the place bar squeezes the section name to 0 and pushes Bookmark past the edge.
- **The contents' mark stays on "Glossary" at the chapter's end** (F4's nit). The short last section can't reach the top. Decided as drawn.
- **A highlight still leaves an inline formula unpainted.** Decided as drawn in round 1.
- **Dev runtime** (`next dev` on `:3977`, then stopped):
  - the ko math-check chapter renders, with Glossary and the linear h2 in its contents;
  - a term window opens with focus inside;
  - no console error, and a clean dev log.

### Findings

**R2-F1. The plugin and S5's package name a bootstrap release that went to other work.**
- **The rule:**
  - The front door's refusals must name the release a reader can update to.
  - `handoff-explain.md` L54–56 already says so: "if it stamps another, that number is the one the plugin's test below names".
- **What happened:**
  - S5 pinned v92 "when nothing else lands first", and S11 released plugin 0.10.0 with it.
  - Then the bootstrap released v92 (the PR rule) and v93 (the close), both without the package.
  - Round 1 read the bootstrap at v91 and could not see this.
- **Cases:** in the verdict block.
- **Proposed fix slice, `P39-hk.F5`:** re-pin the explain front door to the release that carries S5's package. `kind: fix`, `risk: high`.
  - **The triggers:**
    - it repairs S11 (`route: mid`);
    - the approach is the operator's choice (decision 1);
    - it is the plugin's front-door contract.
- **Its set:**
  - the 21 product sites in 9 files (the three explain SKILL copies, `plugin/README.md`, `plugin/skills/setup/SKILL.md`, `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `README.md`, and the KB template's getting-started page);
  - `package/README.md`, `package/PATCHES.md`, `handoff-explain.md`;
  - `package/checks/apply.py`'s skill count;
  - `web/public/SKILL.md`'s line count, if it moves;
  - one `## Doc impact` line that supersedes S5's and S11's v92.
- **Acceptance matrix:**
  - no site names v92, unless decision 1 picks the field-only form, in which case no site names a number;
  - the refusal names the release that carries the package;
  - `skills_parity`, `plugin_parity`, the landing count and `content.ts` all agree;
  - `finds.py` and `apply.py` pass against the bootstrap's head at F5's time;
  - `cites.py` missing=0;
  - the v86 grep stays empty.

**R2-F2. The Glossary section has no place name in the annotation layer.**
- **The rule:**
  - `05-annotations` *Every string* names a section "{title}" (Section) or "{Word} · {title}".
  - F4 made the Glossary a contents entry that "behaves like every other h2 entry".
- **What breaks it:** `noteSections` lists the glossary block, because it has an id in the projection. But `nameOf` has no `glossary` case, so it returns `{ word: "Section", title: "" }`, and `sectionLabel` renders "".
- **Cases:** in the verdict block.
- **Proposed fix slice, `P39-hk.F6`:** name the Glossary section in the annotation layer. `kind: fix`, `risk: low`.
  - **The fix:** a `glossary` case in `nameOf` returning `{ word: "Section", title: CHAPTER.terms.glossary }`. That is the h2's own label, English in every chapter, as S9 signed.
- **Its set:**
  - `web/src/lib/reader/notes-load.ts`;
  - if decision 2 folds them in: `web/src/lib/reader/use-reading.ts` (the resume pill through `displayText`) and the Glossary entry's `lang` (`types.ts`, `chapter-head.tsx`, `chapter-list.tsx`).
- **Acceptance matrix:**
  - each failing case reads "Glossary": the place bar at 1728 and 390 (en, ko), the Bookmark row, the per-book row, and a new mark's `block_title`;
  - a Glossary bookmark made before F6 reads "Glossary" in the live rows (`where?.label` wins over the snapshot);
  - every other section's name is unchanged;
  - vitest stays green.

### Decisions to raise (for the orchestrator, before planning F5 and F6)

1. **F5's approach, and OQ8's order.**
   - **(a), recommended: bootstrap first, then re-pin.**
     - The bootstrap session applies S5's package (raising `apply.py`'s skill count 19 → 20 as it goes) and releases. `installer/build.py --release` stamps the number: v94 if nothing else lands first.
     - F5 then writes that number into every site, and this branch merges and ships plugin 0.10.0.
     - Then `/update-workspace` here.
     - Why: it keeps S5's handshake and its clear refusal, and it is what `handoff-explain.md` already prescribes.
     - The cost: the merge waits on the bootstrap release.
   - **(b): gate on the `**phases**` field alone and name no number.**
     - The merge no longer waits.
     - But it changes S5's front-door contract, and the refusal can no longer say which release to update to.
2. **OQ23, the TeX that still shows.** You said "fix everything now."
   - **Recommended:** fold its two exact cases into F6:
     - the resume pill, read through `displayText`;
     - the Glossary entry's `lang` in a Korean chapter.
   - **Defer as one job** (deferred job 8): the stored quotes' TeX, in the book's notes list, the other-language group and the Notes sheet's Unanchored rows.
     - A stored quote is projection text, and it can cut through a formula. There is no exact linear form for half a formula, so showing it is a design question, not a mapping.
   - **The alternative:** fix all of it now with an approximate mapping, accepting a garbled half-formula now and then.

### Operator Questions (OQ7–OQ23), routed

| OQ | Route |
|---|---|
| OQ7 inline formula spoken from its derived linear text | walkthrough decision 2 |
| OQ8 release order | decision 1 now (with R2-F1); walkthrough decision 1 restates it after F5 |
| OQ9, OQ11, OQ13, OQ17 | decided as drawn |
| OQ10, OQ16 | F4: built; re-verified above. Residues → OQ23 |
| OQ12, OQ19 | F1: built; re-verified above |
| OQ14, OQ15 | F2: built; re-verified above |
| OQ18 the no-wrap fallback | decided as drawn: the walk found it exactly as listed |
| OQ20 | F3: built; re-verified above |
| OQ21 | deferred job 6 (widened with the 390/200% chrome overlaps) |
| OQ22 | F3 (the formula box) + deferred job 7 (the console at 200% text) |
| OQ23 | decision 2 now; walkthrough decision 3 if it is still open at the gate |

None is unrouted.

### Deferred jobs (round 2's list; title · reason · trigger)

1. **design-preview crashes writing `preview.json` on a split math italic character.** As round 1.
2. **design-sign mis-parses a multi-line `open_items:` in `SIGNOFF.md`.** As round 1.
3. **`phase-section --to-topic` leaves relative links stale.** As round 1.
4. **Re-sync the `kb` Design System from code after S8 and S9.** As round 1.
5. **Re-run the explain front-door checklist lines in a workspace on the package's release.**
   - Reason: 0.10.0 refuses this v91 workspace, so lines 28, 29, 31, 33 and 34 were not re-run, and their replacement line is drafted below.
   - Trigger: after F5 and `/update-workspace` to the release F5 pins.
   - (Was round 1's job 10; its "v92" is replaced.)
6. **(OQ21) P30's chrome and the quiz at large text on a phone.**
   - Reason:
     - at 320/200% the quiz body is 108 px, with a 37 px option column, and the Korean "Show answer" breaks mid-word;
     - at 390/200% the top bar's language switch sits over the logo and back link, the chapter bar's Contents over Previous and Next, and the Contents sheet's Notes tab over Close;
     - the place bar squeezes the section name to 0 and pushes Bookmark past the edge.
     - The record draws none of these states.
   - Trigger: the next reader-chrome design job, or a QA sweep at large text.
7. **(OQ22) The console at 200% text.**
   - Reason:
     - the past version is 446 at 390/200% (447 at 320/200%, 335 at 320/150%), because of the source URL `a.fg-src__link`;
     - the console top bar's signed-out "Sign in";
     - "Full width" at 320.
   - Trigger: the next P28-console change, or a QA sweep.
8. **(OQ23, if decision 2 defers it) Show a stored quote with math as text.**
   - Reason: the book's notes list, the other-language group and the Notes sheet's Unanchored rows show the stored quote's TeX. A quote can cut through a formula.
   - Trigger: the next notes-list change, or the first chapter whose highlights cross formulas.
9. **A heading with no authored id takes a new id in each version, so its marks go Unanchored.**
   - Reason:
     - `retired_ids` (`server/native_ingest.py`, P30.S5, unchanged by this phase) reserves every id that the current row and earlier versions used.
     - So `IdRegistry.assign_slug` re-mints an unchanged heading's slug as `-2`. Throwaway math-check v1 → v2: `when-e-lambda-is-near-one` became `when-e-lambda-is-near-one-2`, and the highlight there went Unanchored.
     - `ids.py`'s docstring says only *retired* ids are reserved.
     - The explain skill authors every heading's id (SKILL.md L1264), so only hand-written chapters hit this.
   - Trigger: the next native-ingest change, or the first report of a lost highlight.
   - Outside the boundary: an observation, not a finding.

**Existing deferred items:** round 1's dispositions stand: D67 narrow; D72, D73, D75 and D84-8s drop; D76 close; D86-sd narrow; D85-qk (a)–(d) close when the bootstrap applies the package; D69 stays. **D80-ch: close.** F4 fixed the template line it named.

**An observation, not a job:** the past version's printed masthead and colophon read `127.0.0.1:3030/...`. That is the app URL baked into the scratch build by default; production sets its own.

### Drafts for the pass round (update of round 1's; append through `phase-section P39-hk "Doc impact" --append` on a pass)

**`doc_impact_added`:**
- `- **(P39-hk.REVIEW)** qa.md: ## Regression Checklist: retire or rewrite the lines this phase made obsolete: P32's parity line (five agents → the one explain-critic), P32's verifier same-model guard (the verifier is retired), and the P33-n3/P38-e1 front-door lines (quick, the cost table, the seventeen-line block, run: full, "delta of v<N>", the full-v1 pricing, the v85/v86 and **unit** refusals) → the release F5 pins and **phases**; P33-n3's citation check holds only in a workspace on that release`
- `- **(P39-hk.REVIEW)** qa.md: ## Test Commands: PASS counts at P39-hk's end: pytest 183 passed, 60 skipped (243 with a disposable Postgres), vitest 588 tests in 41 files` (update after F5 and F6 if they move)

**The gate section, `(gate section — written at merge)`:** round 1's seven lines, with two edits:
- In the front-door line, "v92" becomes the release F5 pins, in both places.
- Three lines are added:
  - `- [ ] Reader keeps: a hyphenated word (t-statistic, CONDITIONAL-GO’s) and a Korean particle after a formula never break while they fit their line; a run wider than its line breaks inside, at its hyphen first; an inline formula wider than its line scrolls in a line-wide box of its own; at 320 and 390 with 200% text the page never scrolls sideways (P39-hk)`
  - `- [ ] Reader contents: a chapter with a glossary lists "Glossary" in In this chapter and the Contents sheet; choosing it lands the h2 under the top bar, and the place bar there reads "Glossary" (P39-hk)`
  - `- [ ] Text-only math: a heading or a highlight with inline math reads as linear text (e^(−λ), t = s × √n) in the Contents sheet, library Continue, the notes' place names, a citation's way back and the Review card, never TeX (P39-hk)`
- `## Operator Runtime`: unchanged, so no note.

### Walkthrough draft (for the round after F5 and F6)

> **Gate: P39-hk.** This runs on this branch's stack (production build :3978, API :8977), never on :3030 or production. Open http://127.0.0.1:3978/@p39rv → Fixture guide → 4 "Our bar: performance rule v1".
>
> 1. "Scoring a run": read the inline formulas, then the formula block with its reading and "where" legend. Click "t-statistic", then Read more, In the glossary →, ‹ Back to the text. Esc closes. Open Contents: "Glossary" is listed; choose it.
> 2. Switch to 한국어 and Display → Dark, and open 워크포워드 백테스트. Set Display back to System.
> 3. ⌘P at A4 and Letter: the glossary comes after the quiz and before Sources.
> 4. Open http://127.0.0.1:3978/@p39rv/fixtures/books/math-check/math-check, then the same with `?lang=ko`. The h2 "When e^(−λ) is near one" reads as text in In this chapter and in Contents.
> 5. With a throwaway account you sign up for at http://127.0.0.1:3978/signup:
>    - highlight across a formula and across a term;
>    - add a note while a term window is open;
>    - Bookmark at the Glossary: its row reads "Glossary";
>    - answer the quiz wrongly at http://127.0.0.1:3978/@p39rv/fixture-finance/review-probe-2, then open /review: the card shows t = s × √n;
>    - scroll chapter 4 to about 45%, wait 3 s and reload: it resumes there.
> 6. Real devices (the device-walk command is in result.md § Stack; anonymous only):
>    - Safari on the iPhone and the iPad: a term's sheet, the √ and stepped formulas, `poisson` scrolling in its own box;
>    - with aA at 200%, the Korean chapter never scrolls sideways;
>    - VoiceOver on a display formula, an inline formula and a term sheet.
>
> On the pass, the design canvas (job `10-reading-aids`) is deleted, as you asked.
>
> **Decisions:**
> 1. **The release (OQ8, F5):** the bootstrap released the package as v<N>; this merge ships plugin 0.10.0 naming v<N>; then run `/update-workspace` here. Recommended: confirm.
> 2. **OQ7:** an inline formula is spoken from its derived linear text, with no written alt per formula. Changing this later is a grammar change. Recommended: accept, after the VoiceOver check.
> 3. **OQ23** (only if it is still open): as in decision 2 of the review.
>
> **Decided as drawn:**
> - OQ9 (Review cards show linear text);
> - OQ11's choices;
> - OQ13 (the old-version page stays as is);
> - OQ17 (the glossary takes no highlight);
> - OQ18's fallback, as built;
> - the window's controls in English in a Korean chapter;
> - a window can grow under the bottom bar on Read more;
> - a highlight leaves the formula unpainted;
> - the small "K" target;
> - the landing still says "and a quiz";
> - the contents' mark stays on Glossary at the chapter's end.
>
> One word ("accept") signs all of it. Deferred jobs are filed for the large-text chrome (OQ21) and the console at 200% text (OQ22), and for OQ23's stored quotes if you defer them.

### Stack left running (round 2)

Everything is under `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/review/`, written `<review>` below.

- **API:** `:8977`, PID **68284**: unchanged from round 1 (F1–F4 changed no server code). Database `kb_p39review` in `kb-p28s2-pg`.
- **Production build of `0162fb65`:** `:3978`, PID **3131**.
  - It runs `node server.js` from `<review>/webbuild-r2/.next/standalone`, started with `nohup zsh <review>/standalone-r2.sh`.
  - It uses the same `SESSION_SECRET` file and `KB_API_BASE_URL=http://127.0.0.1:8977`.
  - It replaced PID 68294, which is stopped.
- **Round 2's throwaway data**, added to round 1's:
  - the book `math-check`: en document 10 at v3 (v1 → v2 → v3 for the annotations line), ko document 11;
  - the private project `p39private`, with the book `private-guide` and document 12;
  - the scratch member's quiz answers, highlights and a Glossary bookmark.
- **Stopped (I started each in this round):**
  - the harness proxy `:3976` (4860);
  - the signed-in proxy `:3975` (4864, then 6725);
  - headless Chrome `:9335` (3663);
  - dev `:3977` (5999, 6006, 6012).
- **`:3030` (8452) and `:8766` (80074)** were never touched, and were still listening at the end.
- **Restart the build:** `nohup zsh <review>/standalone-r2.sh > <review>/standalone-r2.log 2>&1 &`.
- **Device walk:** the same command with `HOSTNAME=0.0.0.0` in `standalone-r2.sh`. Then browse `http://<the Mac's LAN or tailnet address>:3978/@p39rv`, anonymous only.
- **Stop and clean up** after the gate:

  ```
  kill 68284 3131
  docker exec kb-p28s2-pg dropdb -U kb kb_p39review
  rm -rf <review>/webbuild <review>/webbuild-r2 <review>/root
  ```

- **Agent profile:**
  - Display is reset to System, size 3.
  - The `kb_reader` cookie on 127.0.0.1 is deleted, as round 1 left it.
  - `:3978` holds no localStorage.
  - The `kb_rail` cookie and any session cookie I did not set were left alone.
  - Every tab I opened is closed, and the MCP group was removed.

### Instruments (round 2)

- **Claude in Chrome** on the agent profile.
  - In each session I called `list_connected_browsers` (one browser, `deviceId c14e5b18-f250-45f1-b92e-4a08a31197b5`) and `select_browser` on that id before any other browser tool.
  - It drove the screen states with real clicks, keys and a drag. Page JS only measured and read.
  - Window 1728×963, DPR 1.
- **The viewport harness** (`vp_proxy.py 3976 → 3978`) and **the signed-in proxy** (`member_proxy.py 3975 → 3978`), both inside Claude in Chrome.
  - The signed-in proxy signs the throwaway member in by script and adds the session cookie on the server side. The browser never saw a credential or the cookie.
- **Headless Chrome 156 over CDP** (a throwaway profile, classic scrollbars) ran:
  - the F1–F3 width probes, at DPR 2 with mobile emulation;
  - the 12-width scroller sweep;
  - the legacy, wide-step and deep-link checks;
  - `Page.printToPDF`, read with `pdfinfo`, `pdftotext` and `pdftoppm`.
- **HTTP fetches** and **read-only `psql` queries** of `kb_p39review`, for the anchor statuses.
- **Not available:** WebKit, a real iPhone or iPad, a screen reader. Those checks are the walkthrough's.

---

*Round 1's sections follow as they were (its verdict block is replaced by round 2's, above). A line a fix made stale carries **[R2: …]**.*

## The boundary

`phase-scope P39-hk` gives `b38ab84..7951f34`: 22 commits and 100 product files (49 added, 47 modified, 4 deleted). **[R2: now `b38ab84..0162fb6`, 32 commits, 111 files; § Round 2 › The boundary.]**

Three shared files widen it, each no further than the native reader and paper, which are inside anyway:
- **`web/package.json` and `pnpm-lock.yaml`:** purely additive. They pin one package, `temml@0.14.0`, with 9 lock lines, no transitive dependency and no version moved. Its only importer is `web/src/lib/native/mathml.ts`.
- **`kb-print.css`** (imported globally by `globals.css`): +45 lines, every rule scoped `html .rd-root .kb-ch …` to the new `.ra-*` classes.
- **`reader-fonts.css`:** +16 lines, one `@font-face` for STIX Two Math. It loads nothing until a math element uses `--font-math`.

## Validation

| Command | Result |
|---|---|
| `uv run pytest -q` | 183 passed, 60 skipped, 1 warning |
| the same with `KB_TEST_DATABASE_URL` → scratch `kb_p39review_test` (dropped after) | 243 passed |
| `pnpm --dir web typecheck` / `lint` | exit 0 / exit 0 |
| `pnpm --dir web test` | 40 files, 583 tests passed **[R2: 41 files, 588 in round 2.]** |
| standalone `next build` in an APFS clone (`scratchpad/review/webbuild`) | exit 0, 13/13 static pages |
| `python3 scripts/skills_parity.py` | PASS: "…the plugin agent matches Part B" |
| `python3 scripts/plugin_parity.py` | PASS |
| `uv run pytest tests/test_explain_resolver.py -q` | 2 passed |
| `package/checks/cites.py plugin/skills/explain/SKILL.md <five package texts> handoff-explain.md` | citations 113, bold parts 15, missing=0 |
| `package/checks/finds.py <bootstrap> bb525b9` / `HEAD` (`510f112`) / `bb2b141` | 18 checked, not-exactly-once=0 at all three |
| `package/checks/apply.py` on `git archive` snapshots | `bb525b9`: smoke explain block L206–L297 and the other pins pass, 19 skills. `510f112`: the explain block passes; `assert len(skills) == 19` fails on 20 (the bootstrap added `pr`) |
| `wc -l plugin/skills/explain/SKILL.md` | 2492, equal to `content.ts` L251 and L261 "2,492" |
| `grep -rn "v86" plugin README.md .claude-plugin web/public/SKILL.md` | no hits |
| `git status --porcelain .claude/` | empty |
| `python3 scripts/workflow.py validate` | passed; warnings pre-existing (P22/P26 kinds, consolidation owed, stale docs, oversized sections); no dangling pointer |
| P33-n3 citation check (vendored `.claude/`) | checked=200, missing=85: expected until `/update-workspace` to v92 (S4, S10, S11 recorded the same) |

The bootstrap repo was read only, through `git show`, `git log`, `git archive` and `git status`. While I ran, its HEAD moved from `510f112` to `bb2b141` (still `WORKSPACE_VERSION = 91`), and its working tree gained uncommitted PR-rule work: 6 modified files and `changelog.d/pr-rule-v1.md`. None of that is mine; another session is working there.

## Judgment

**A and C, the skill (`plugin/skills/explain/SKILL.md`, read as its writer and its critic would).**
- **The reader:** §1 *The reader* is a concrete guess (who they are, what they know, what they are new to, what they will do). It is never a stock reader.
- **The shape:** §1 *The shape* drafts the reader's questions in order, with one or two *Other shapes*. The Quiz is offered only when earned, Next steps only when something is open, and there are no Best practices.
- **Codebase-only:**
  - The frontmatter, the *No code behind it* decline and *The run, in one card* say it.
  - The writer's rules say "no web search or fetch, no research agent".
  - `allowed-tools` holds no WebSearch or WebFetch.
- **The research agents are gone:**
  - `plugin/agents/` holds only `explain-critic.md` (tools: Read, Grep, Glob, Bash, Write).
  - `git grep` finds no research-agent name in plugin, `.agents`, web, the READMEs, the manifests, scripts, server or tests.
- **The research-phase offer:** §1 *The phases that cover the subject* and step 8's "research first" hand-off are both there.
- **The v92 handshake:** **[R2: stale: the bootstrap released v92 and v93 without the package; R2-F1.]**
  - Step 2 tests v92 and a create-phase route listing `**phases**`; the package's `explain-route.md` L16 lists it.
  - Both refusals name v92.
  - `handoff-explain.md` sets the bootstrap-first order.

**B, the reader and paper:**
- The formulas, their reading, the "where" legend, the term marker, the window and phone sheet, the glossary section and its way back, and the paper appendix all match the signed `## Build` (RESPECT THE DESIGN) in every state I opened (§ Gate stage 2).
- They read easily: a plain sentence and a legend under every display formula, and a definition one hover or tap away.

**The grammar's invariants:**
- **Parity:** the four places stay in parity (`plugin_parity` PASS; the manifest lists `tex.py`, the TSV and the new fixtures; conformance tests pass).
- **The anchor invariant:** `reader-anchor.test.ts` passes inside the 583. **[R2: inside the 588 in round 2.]**
- **No raw HTML:** `render.tsx`, `mathml.ts`, the three new reader components, `radicals.ts` and the review files contain no `dangerouslySetInnerHTML` or `innerHTML`; the only hit is the no-raw-HTML comment. The server pages carry no `style=` on any MathML element.
- **The translation 422s:** `translation-term-ids` and `translation-math` are in `native_ingest.py`, with 4 cases in `test_native_ingest.py`.

**Notebook against the logs:**
- Every decision a `result.md` records has its gist in `## Decisions`, with its detail in `topics/` or the slice log. That includes OQ11's "rounded up", superseded by Math CSS (S8).
- `validate` shows no dangling pointer.
- OQ7–OQ17 are all routed (below).

**Other checks:**
- **Mockup:** none was requested (`Mockup: on request`; signed on the canvas), so there is no orphaned route.
- **Job `10-reading-aids`:** its `job.json` status is `implemented`, so its canvas deletion goes to the operator (decision 3).

## Gate stages

**1. The manifest.** `## Operator Runtime` is filled. The instrument is Claude in Chrome on the "sugang" profile, `deviceId c14e5b18-f250-45f1-b92e-4a08a31197b5`.

**2. The spot-check (me, on this branch's own stack; `:3030` and `:8766` never touched).**
- **The browser:** `list_connected_browsers` listed one browser with exactly that `deviceId`, and I called `select_browser` on it before any other browser tool. I drove one tab of my own and closed it. The window is fixed at 1728×963, DPR 1 (`innerWidth` read first).
- **Desktop, direct (standalone :3978):**
  - inline formulas;
  - the `tstat`, `worked`, `participation` and `poisson` blocks with their reading, "where" and legend;
  - the t-statistic window by click (focus in it), Read more (grows, then the body scrolls), Esc (focus back on the term), Enter, Tab Close → Read more → In the glossary → (the entry marked, focused, under the bar), and ‹ Back (the term centred and focused, the mark cleared);
  - hover on a legend term (opens with focus left in the text; leaving closes it);
  - the K window shifted to end on the column, and a window placed above a bottom-edge term;
  - ko and Dark through the Display panel.
- **Desktop on dev (:3977):** the same page and a window; no console message, clean dev log.
- **Phone, through the viewport harness against the standalone build:**
  - At 390×844: the t-statistic sheet is fixed, 390 wide, 294 px, with the term 16 px above it; the spacer matches; focus is in the sheet; Close returns focus to the term.
  - A legend term's sheet: Read more (471 px, spacer 472), In the glossary → (the entry at 75 px, marked), then Back (the term focused, the mark cleared).
  - At 320×568 ko: `poisson` is a "수식, 옆으로 스크롤됩니다" region (306/286) and the page is 320. `:focus-visible` with a 2 px outline is set but not visible (OQ12 confirmed). **[R2: F1 built the ring; visible in round 2.]**
- **Paper (headless Chrome 156 over CDP):** en and ko at A4 and Letter, 6 pages each, every page looked at. The order is body → quiz → Glossary → Sources → Answers → colophon. Markers are 1 px dotted `#6d665a`; the glossary is 552 px with 8 px entries and `break-inside: avoid`; no windows or spacer print; no console error.
- **Reduced motion (CDP):** the window fades (`ra-in`) and the sheet does not; under `reduce`, nothing animates.
- **Write-lock (no terms or math):** no `.ra-float`, no glossary, and the STIX face stays `unloaded`.

**3. Fresh eyes, inside the boundary** (library → Fixture guide → chapter 4, then use it). These go to the walkthrough and are not fixed here:
- the Glossary is not in "In this chapter" or the Contents sheet, where I looked for it first (OQ16); **[R2: fixed by F4.]**
- selecting text across an inline formula paints around the formula but not on it (`mark.an-pending` skips the atom), so the formula looks left out;
- at 320 the scrolling `poisson` shows "rate × tim" with only a fade as the hint, and its focus is invisible (OQ12); **[R2: the ring is built (F1).]**
- in a Korean chapter the window's controls are English (as signed, F1);
- the single-letter term "K" is a 15×30 px target;
- the old-version page shows formulas unstyled and legends as stacked lines (OQ13);
- the landing lede still says "a native chapter with real diagrams and a quiz", though a quiz is now only suggested when earned.

**4. The checklist** (§ Checklist table): 46 lines, 34 inside and 12 outside. One inside line fails because of this phase (F1); the rest are listed there. **[R2: round 2: 37 inside, 9 outside, none failing; § Round 2 › The checklist.]**

**5. Operator Questions:** all routed (§ Operator Questions).

**6. The walkthrough:** a draft for the re-review round (§ Walkthrough draft).

## Findings

### F1. The no-wrap runs the phase adds have no width bound **[R2: fixed by P39-hk.F1 (`d9831598`); cases 1–9 re-run on `0162fb65`, all pass.]**

- **The rule:** the reader never scrolls sideways. That is P30's line "Text size 150% and 200% (root font) at 390 and 820: no horizontal page scroll on the chapter…", and a run inside a column stays inside it.
- **What breaks it:** S9's `keepText` (`render.tsx` L419) wraps every whitespace-free run holding a hyphen in `span.ra-keep { white-space: nowrap }` (`reader-aids.css` L140). In Korean that run includes the attached particle ("CONDITIONAL-GO의"). S8's inline `math.ra-m` is `white-space: nowrap` (L41) with no box of its own, while the grammar allows 300 TeX characters inline. Neither has a bound when the run is wider than the line.
- **Cases, measured with headless Chrome over CDP** (mobile emulation, DPR 2, touch, the root font set as the line says) **and confirmed in Claude in Chrome through the harness:**

| # | Case | Result |
|---|---|---|
| 1 | ko `reading-aids`, 390, 200% | **fails:** page 401 (`CONDITIONAL-GO의` keep 368 px in a 323 px column; Claude in Chrome shows the scrollbar and an 11 px sideways scroll) |
| 2 | ko, 320, 200% | **fails:** page 401 |
| 3 | en, 320, 200% | **fails:** page 390 (`CONDITIONAL-GO’s` 357 px, `stitched-together` 295 px in 253 px) |
| 4 | en, 390, 200% | **fails:** the page holds 390, but the keep runs 34 px into the gutter |
| 5 | ko, 320, 150% | **fails:** 8 px past the column |
| 6 | inline formula wider than the line (the `λ = rate × time` atom cloned to about 176 TeX characters, under the 300 limit), 390 | **fails:** page 937 (DOM probe, reloaded) |
| 7 | en and ko at 100% (320, 390); 150% at 390 | pass |
| 8 | legend `dt` column, the term window and sheet, paper (552 px) | pass |
| 9 | 820 at 150% and 200% (en, ko) | pass (805/820) |

- **Not this phase's, outside the diff:** two pre-existing P30 overflows fail the same line at 390 with 200% text: the book page's "Older translation" tag (448) and write-lock ko's quiz "Show answer" button (397). No changed file renders or styles them (`quiz.tsx`, `reader.css` and the book page are untouched). They are a deferred job, not F1.

**Proposed fix slice, `P39-hk.F1`:** bound the reading aids' no-wrap runs to their line. `kind: fix`, `risk: high`.
- **The trigger:** open design. How an inline formula wider than its line shows (a box of its own like `FormulaBox`, or a publish-time bound twinned in both validators) is a choice the record never drew. S8 and S9 ran on the high row, so the rating follows the usual triggers.
- **The family:** `web/src/app/reader-aids.css` (`.kb-ch .ra-keep`, `math.ra-m`), `web/src/lib/native/render.tsx` (`keepText`, the inline `math` case), `web/src/app/kb-print.css` (paper keeps), and, if the bound goes into the grammar, `server/native/tex.py` with `web/src/lib/native/tex.ts`, the TSV and the template copies.
- **The simplest rule:** a keep or an inline formula that fits stays whole, as F22 and F7 draw. Only one wider than its line may break or scroll in its own box, and the page never does.
- **Acceptance matrix:**
  - cases 1–6 pass (page width equals the viewport; the run stays inside its column);
  - cases 7–9 stay passing;
  - at 1440 and 1728, `t-statistic`, `walk-forward` and `CONDITIONAL-GO’s` stay unbroken at the hyphen where they fit;
  - the anchor round trip (`reader-anchor.test.ts`) stays green, since `keepText` must keep the text's characters;
  - CDP's 12-width no-inner-scroller sweep stays clean;
  - P30's text-size line re-run on the chapter.

## Checklist table

The lines are numbered in the order of `docs/current/qa.md` `## Regression Checklist`.
- **Instruments:** "CiC" is Claude in Chrome (standalone unless marked), "harness" the iframe proxy against the standalone build, "CDP" headless Chrome over CDP, "HTTP" a server fetch.
- **Inside** means a changed file feeds the surface.

| # | Line (origin) | Inside / outside | Result |
|---|---|---|---|
| 1 | `kb build` no conflict (P-) | outside | not run |
| 2 | `site_smoke.py` | outside | not run |
| 3 | `<!-- explain:recent -->` round trip | inside (`native_ingest.py` writes it) | pass (pytest 243 with Postgres; `test_native_ingest.py`, `test_documents.py`) |
| 4 | `workflow.py validate` | inside | pass |
| 5 | Project page Documents panel (P28) | outside | not run |
| 6 | `?view=full` on the past version (P28/P30) | inside (native render) | pass (CiC: rail, topbar and docbar hidden; exit pill; Esc back) **[R2: re-run, pass.]** |
| 7 | Past-version print masthead and colophon; Export PDF control (P28) | inside (`kb-print.css`) | paper pass (CDP: masthead and colophon); the control's Preparing…/afterprint not run (it opens the print dialog) |
| 8 | Console at 390, no horizontal scroll (P28/P30) | inside (past version) | past version pass (harness 390 = 390, signed out); dashboard, documents and project not run (member) |
| 9 | `/login?next=` (P28) | outside | not run |
| 10 | Reader chapter KO at 390, Contents sheet fits (P30) | inside | pass signed out (harness: 390; sheet 0–390 × 286–844; quiz answered); signed-in half not run **[R2: the signed-in half passes now.]** |
| 11 | Quiz shows exactly one foot sentence, light/dark/sepia (P30) | inside (`render.tsx` quiz) | pass (CiC: "Correct" only; "Incorrect" `is-off`, in all three themes) |
| 12 | No inner vertical scroller, DPR 2, classic scrollbars (P30) | inside | pass (CDP: reading-aids en/ko, write-lock, loose note × 12 widths 320–1920: none) |
| 13 | Legacy reader frame the only scroller (P30) | outside (`legacy-reader.tsx`, `reader-frame.tsx` and `reader.css` untouched; the font file only declares a face) | not run **[R2: now inside (`reader.css`); pass.]** |
| 14 | Deep link `#section` under the top bar (P30) | inside (`reader-article.tsx`) | pass on a fresh load (CiC: section 72 px, bar 59 px); the sign-in round trip not run |
| 15 | Old links redirect (P30) | outside | not run **[R2: now inside (`load.ts`); pass.]** |
| 16 | Library grouping (P30) | outside (`library-view.tsx` untouched; font face only) | not run; seen incidentally: By project / By subject **[R2: now inside (`continue.ts`); pass.]** |
| 17 | Resume (P30) | inside (`MathLayer` refits after load) | not run (member) → walkthrough **[R2: pass, signed in.]** |
| 18 | Quiz save (P30) | inside | signed-out half pass ("Sign in to save"); signed-in half not run **[R2: the signed-in half passes now.]** |
| 19 | Annotations persist (P30) | inside (`notes-load.ts`) | not run (member) → walkthrough **[R2: pass, with re-anchor and Text changed.]** |
| 20 | Review cards (P30) | inside (`review/actions.ts`, `inline.tsx`) | the card path passes (HTTP as the scratch member: a wrong answer on `review-probe-2` made a due card; `/review` shows `t = s × √n` and `√4`, no TeX); rate, suspend, Undo and Clear not run **[R2: rating and Done for today pass now.]** |
| 21 | Visibility not-found (P30) | outside | not run **[R2: run anyway, pass.]** |
| 22 | ⌘P native chapter A4/Letter; legacy notice (P30) | inside | pass (CDP: en and ko, A4 and Letter; legacy prints one notice sheet) |
| 23 | Text size 150%/200% at 390 and 820 (P30) | inside | **FAIL**: ko chapter 390 @ 200% is 401 (F1). Also failing, but pre-existing and outside the diff: book page 448, write-lock ko 397. 820 passes. Review not run (member) **[R2: pass now (F1, F3).]** |
| 24 | Reader chrome hide/show (P30) | inside (`TermLayer` pointerdown) | pass at 1728 (CiC: scroll hides; tap shows and hides; a term tap and the outside close leave the chrome alone); 390/820, slow scroll-up and the Tab part not run **[R2: the Tab part passes now.]** |
| 25 | Next opens the next chapter at its top (P30) | inside | pass (CiC: legacy → Next → reading-aids at y 0); signed-in half not run |
| 26 | `knowledge check` dry run (P31) | inside | pass (valid exit 0; err-math, err-formula, err-glossary, err-terms exit 1 with `line N: [code]`; scratch `KB_ROOT` unchanged) |
| 27 | Explain skill parity (P32) | inside | pass; the line's "five agents" wording is obsolete (one agent) → draft Doc impact |
| 28 | Front door, headless (P33-n3/P38-e1) | inside | superseded; not re-run (v91 workspace and phase worktree) → replacement line drafted, deferred job |
| 29 | Front door, a repeat (P33-n3) | inside | not re-run (v91 refuses at step 2 first) |
| 30 | The verifier's same-model guard (P32) | inside | retired: the verifier is deleted (S4) → draft Doc impact |
| 31 | Front door, refusals (P33-n3) | inside | superseded (v92, `**phases**`); static check: both refusal texts name v92 (SKILL.md L286–L291) |
| 32 | Landing line count = `wc -l web/public/SKILL.md` (P32) | inside | pass (2,492) |
| 33 | Front door, a book (P33-n3/P38-e1) | inside | superseded (`run: full` gone); not re-run |
| 34 | Front door, a v2 (P38-e1) | inside | superseded ("delta"/"research saved" gone); not re-run |
| 35 | Front door, a full v1 priced (P38-e1) | inside | retired (no cost table, no research agents) → draft Doc impact |
| 36 | Explain KB key (P38-e1) | inside | pytest half pass (2 passed); headless half not run |
| 37 | P33-n3 citation check `missing=0` | inside | expected fail until v92 (85 of 200 against vendored v91); the package's texts 113/0 **[R2: until the release F5 pins (R2-F1).]** |
| 38 | Reader wide step ≥1600 (P-8jbf) | inside | pass at 1728 (CiC: 44rem, 20 px; inline math 1em, display 1.5×); ≤1599 not re-run **[R2: ≤1599 re-run, pass.]** |
| 39 | Reader wide table (P-8jbf) | inside (`render.tsx`) | not re-run: no 8+ column table in the fixture book; no table hunk in the diff, and `reader.css` untouched **[R2: now under a changed file; pass.]** |
| 40 | Private publish gate (P34-n0) | outside | not run |
| 41 | Visibility toggle (P34-n0) | outside | not run |
| 42 | Public repo tree (P34-n0) | outside | not run |
| 43 | Old graph links (P37-1p) | outside | not run |
| 44 | Landing: no graph, bands alternate (P37-1p) | inside (`content.ts`) | pass at 390 and 1024 (harness) and 1728 (CiC): no word "graph" outside the skill pane, no `#graph`, bands alternate |
| 45 | Public shell grid one track (P37-1p) | inside (past version) | pass (CiC 1728: `/documents/5/versions/1` and `/@p39rv` one 1728 px track) |
| 46 | Graph API gone, template graph kept (P37-1p) | inside (`plugin/templates/manifest.json`) | pass (`GET /app/graph` 404; the three template files and the `mkdocs.yml` hook present) |

**The outside lines' proof:** 12 lines (1, 2, 5, 9, 13, 15, 16, 21, 40, 41, 42, 43). The `phase-scope` list holds none of their surfaces' files: this repo's MkDocs site (`docs/` and `server/documents.py`), the console project page, auth routes, `legacy-reader.tsx` and `reader-frame.tsx`, the redirects, `library-view.tsx`, visibility, the publish gate and git, and the graph routes. The three shared files widen only as § The boundary shows.

## Operator Questions (OQ7–OQ17), routed

| OQ | Route |
|---|---|
| OQ7 inline formula spoken from its derived linear text | walkthrough decision 2 (a grammar contract; VoiceOver confirms) |
| OQ8 release order: bootstrap v92 first | walkthrough decision 1 **[R2: v92 went to other work; decision 1 and R2-F1.]** |
| OQ9 Review card shows a formula as linear text | decided as drawn, proven live over HTTP (row 20) |
| OQ10 raw TeX on text-only surfaces | deferred job 5 **[R2: built in F4; residues are OQ23.]** |
| OQ11 the open choices S8 built | decided as drawn (its "rounded up" line superseded: nearest ¼, 5.25) |
| OQ12 the scrolling formula box's focus ring is invisible | walkthrough decision 4 (recommended: fix, beside F1) **[R2: built in F1.]** |
| OQ13 old-version page math unstyled | decided as drawn (as is) |
| OQ14 Korean particle wraps from its formula | deferred job 6 **[R2: built in F2.]** |
| OQ15 keep hyphenated words in prose and readings | deferred job 7 (needs F1's bound first) **[R2: built in F2.]** |
| OQ16 Glossary missing from contents | deferred job 8 **[R2: built in F4.]** |
| OQ17 the glossary takes no highlight | decided as drawn (as is for 0.10.0) |

## Walkthrough draft (for the re-review round, after F1) **[R2: superseded by § Round 2 › Walkthrough draft.]**

> **Gate: P39-hk.** This runs on this branch's stack (production build :3978, API :8977), not on `:3030` or production. Open http://127.0.0.1:3978/@p39rv → Fixture guide → 4 "Our bar: performance rule v1".
>
> 1. Read "Scoring a run": the inline formulas, then the formula block with its plain reading and "where" legend. Hover "Sharpe ratio" in the legend. Click "t-statistic", then Read more, In the glossary →, ‹ Back to the text. Esc closes.
> 2. Switch to 한국어 and Display → Dark, and open 워크포워드 백테스트. Set the theme back to System.
> 3. ⌘P at A4 and Letter: the glossary appendix comes after the quiz and before Sources.
> 4. On the Mac, with a throwaway account you sign up for at http://127.0.0.1:3978/signup:
>    - highlight across an inline formula and across a term;
>    - add a note while a term window is open (one floating thing at a time);
>    - answer the quiz wrongly at http://127.0.0.1:3978/@p39rv/fixture-finance/review-probe-2, then open /review: the card shows `t = s × √n` as text;
>    - scroll chapter 4 to about 45%, wait 3 s and reload: it resumes there.
> 5. Real devices (result.md § Stack has the rebind command; anonymous only):
>    - Safari on the iPhone and the iPad: the phone sheet (tap a term, then Read more, In the glossary →, Back), the √ and the stepped formulas, `poisson` scrolling in its own box;
>    - with Safari's aA text at 200%, the Korean chapter's glossary never scrolls sideways (F1);
>    - VoiceOver on one display formula, one inline formula and a term sheet.
>
> **Decisions:**
> 1. **OQ8, the release order:** **[R2: stale: v92 and v93 went to other work; R2-F1.]** bootstrap v92 pushed first, then this merge and push (plugin 0.10.0), then `/update-workspace` here. The bootstrap is at `bb2b141`, still v91. The package's 18 find blocks still match once there, but `apply.py` pins 19 skills and the bootstrap now has 20; bump that pin when you apply. Recommended: confirm.
> 2. **OQ7:** an inline formula is spoken from its derived linear text, with no written alt per formula. Changing this later is a grammar change. Recommended: accept, after the VoiceOver check.
> 3. **Delete the design canvas** **[R2: no longer a decision: deleted on the pass, as the operator said.]** https://claude.ai/artifact/PndCPgBnCYWMR88qw7eApt (job `10-reading-aids`, built and signed in the repo). You said "delete after the phase over". Confirm at the delete.
> 4. **OQ12:** **[R2: built in F1.]** a scrolling formula's keyboard focus ring is hidden by its fade. Recommended: fix it.
>
> **Decided as drawn:**
> - OQ9 (Review cards show linear text);
> - OQ11's choices;
> - OQ13 (the old-version page stays as is);
> - OQ17 (the glossary takes no highlight);
> - the window's controls in English in a Korean chapter;
> - a window can grow under the bottom bar on Read more;
> - a highlight leaves the formula unpainted;
> - the small "K" target;
> - the landing still says "and a quiz".
>
> One word ("accept") signs all of it. Deferred jobs are filed for OQ10, OQ14, OQ15 and OQ16.

## Deferred jobs (for the orchestrator to file; title · reason · trigger) **[R2: superseded by § Round 2 › Deferred jobs.]**

1. **design-preview crashes writing `preview.json` on a split math italic character** · D1 hit it, and the workaround is `PYTHONIOENCODING=utf-8:backslashreplace` · the next design round with math, or the next engine change in the bootstrap repo.
2. **design-sign mis-parses a multi-line `open_items:` in `SIGNOFF.md`** · D1's SIGNOFF lists its first item word by word (the true list is in the round's `result.md`) · the next `design-close` with a multi-line list.
3. **`phase-section --to-topic` leaves relative links stale** · a link written relative to `phase.md` points one level off from `topics/` (DECOMP2 fixed one by hand) · the next `--to-topic` move of an entry with a relative link.
4. **Re-sync the `kb` Design System from code after S8 and S9** · the reader-aids components and STIX Two Math are not in the system, and this login cannot open it · a session that can open the `kb` system, before the next reader design job.
5. **(OQ10) Linear text for inline math on text-only surfaces** **[R2: fixed by F4; removed.]** · raw TeX shows in the Contents sheet, library Continue, notes place names, a citation's way back and the Review highlight card's quote · the first chapter with math in a heading or a highlight, or the next reader-chrome phase.
6. **(OQ14) Bind a Korean particle to the inline formula before it** **[R2: fixed by F2; removed.]** · "…∑e²" | "를 계산하며" wraps at 390 · the next Korean math chapter, or the next reader-aids change.
7. **(OQ15) Keep hyphenated words whole in native prose and readings, with a length bound** **[R2: fixed by F2; removed.]** · "t-" | "statistic" still breaks in a reading · after F1 lands (F1 adds the bound).
8. **(OQ16) List the generated Glossary in "In this chapter" and the Contents sheet** **[R2: fixed by F4; removed.]** · a reader looks there for it · the next reader contents change.
9. **P30's text-size line fails outside this phase** **[R2: fixed by F3; removed.]** · at 390 with 200% text, the book page's "Older translation" tag (448 px) and write-lock ko's quiz "Show answer" button (397 px) push the page sideways, and no file this phase changed renders them · the next book-page or quiz change, or a QA sweep.
10. **Re-run the explain front-door checklist lines in a v92 workspace** **[R2: now job 5, on the release F5 pins.]** · 0.10.0 refuses this v91 workspace, so lines 28, 29, 31, 33 and 34 were not re-run, and their replacement line is drafted below · after `/update-workspace` to v92.

**Existing deferred items, from what the phase shipped:**
- **D67, narrow:** drop its research-verifier half (no verifier remains). Keep it, retitled, as a cross-vendor *critic* job; that is still paid vendor use and the operator's call.
- **D72, drop:** there are no searches, no `plan.md` and no `run.md`.
- **D73, drop:** there are no verifier batches or waves, and the critic already runs in the foreground (§4.10).
- **D75, drop:** `run.md` and `report.md` are gone (S2), and `pagetext.py` only builds the payload.
- **D76, close:** B5 names "the same family (Opus, Sonnet or Haiku)" (SKILL.md L1983, S2), and the verifier half is retired.
- **D84-8s, drop:** the 0.9.0 cost table and team sizing it would meter are gone. A metered 0.10.0 run would be a new job, on the operator's word.
- **D80-ch, keep, narrowed, now ready:** **[R2: F4 fixed the template line: close it.]** its setup-L49 general-mode half is moot. But the KB template page still says "explainer can still be written straight to a file" (L40), while §7 says there is no project copy. Its trigger ("the next touch") fired in S4 and S11.
- **D86-sd, narrow:** (a), (c), (d), (e) and (f) are settled or moot (S1, S2, S4); (b), (g) and (h) remain.
- **D85-qk:** (a)–(d) are settled in S5's package; close them when the bootstrap applies it. (e) and (f) stay open.
- **D69** is untouched and stays.

**An observation for the orchestrator (workspace state, outside the product):** this worktree's `phase.json` reads `status: planned`, `started_at: null`, while its slices ran.

## Drafts for the pass round (to append through `phase-section P39-hk "Doc impact" --append` when the verdict is pass) **[R2: superseded by § Round 2 › Drafts for the pass round.]**

**`doc_impact_added`** (missing durable-truth lines):
- `- **(P39-hk.REVIEW)** qa.md: ## Regression Checklist: retire or rewrite the lines this phase made obsolete: P32's parity line (five agents → the one explain-critic), P32's verifier same-model guard (the verifier is retired), and the P33-n3/P38-e1 front-door lines (quick, the cost table, the seventeen-line block, run: full, "delta of v<N>", the full-v1 pricing, the v85/v86 and **unit** refusals) → the v92 and **phases** forms; P33-n3's citation check holds only in a v92 workspace`
- `- **(P39-hk.REVIEW)** qa.md: ## Test Commands: PASS counts at P39-hk's end: pytest 183 passed, 60 skipped (243 with a disposable Postgres), vitest 583 tests in 40 files`

**The gate section, `(gate section — written at merge)`:**
- `- qa.md: ## Regression Checklist append: the lines below (P39-hk.REVIEW) (gate section — written at merge)`
  - `- [ ] Reader math: a native chapter's inline $`…`$ and formula blocks render as STIX Two Math MathML, never raw TeX, each display formula with its reading, "where" and one legend column; a formula too wide for a 320 phone scrolls in its own box, never the page (P39-hk)`
  - `- [ ] Reader terms: a term: link opens its definition window on click, Enter, Space or a 250 ms hover; Esc and Close return focus to the term; "In the glossary →" marks the entry and "‹ Back to the text" returns to that occurrence; under 40rem it is a fixed bottom sheet (P39-hk)`
  - `- [ ] Glossary section: a chapter with a glossary shows "Glossary" (h2, A to Z by the chapter's language) where the author placed it; a chapter with no terms or math shows none and loads no math face (P39-hk)`
  - `- [ ] Reading aids on paper: ⌘P at A4 and Letter prints markers as dotted ink, formulas with their reading and legend, and the glossary appendix after the quiz and before Sources, with no windows (P39-hk)`
  - `- [ ] Review card: a quiz prompt with inline math shows the formula as linear text (t = s × √n) on /review, never TeX (P39-hk)`
  - `- [ ] Publish: an unknown term: link, bad TeX or a legend symbol the formula lacks is a 422 (ref-missing-term, math-syntax / math-command, formula-legend); a translation that changes a term id or any math is a 422 (translation-term-ids, translation-math) (P39-hk)`
  - `- [ ] Explain front door: in a v92 workspace, /knowledge:explain <subject> under claude -p --plugin-dir plugin prints one confirmation with a guessed Reader, subject-shaped Sections and one or two Other shapes, a Built by: line (or the research-first offer), the one-writer, one-critic Cost: line and the sixteen-line ## Explain block with phases:, and creates nothing; in a v91 workspace it refuses, naming v92 (P39-hk)`
- `## Operator Runtime`: unchanged by this phase, so no note.

## Stack left running (for the operator's walk)

Everything is under `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/review/`.

- **API:** `:8977`, PID **68284** (uvicorn, `api.sh`, started with `nohup`).
  - Scratch Postgres database **`kb_p39review`** in `kb-p28s2-pg` (:55432), migrated with alembic.
  - Scratch `KB_ROOT` at `review/root`; no Google or Gemini keys.
- **Production build:** `:3978`, PID **68294** **[R2: stopped; replaced by PID 3131 from `review/webbuild-r2`; § Round 2 › Stack left running.]** (`node server.js` from `review/webbuild/.next/standalone`, `standalone.sh`, `nohup`), with a throwaway `SESSION_SECRET` in `review/session-secret.txt`.
- **Data:** `scripts/publish_fixture_book.py` on fresh state, then:
  - `reading-aids` en saved a second time (v2, so `/documents/5/versions/1` is an old version);
  - two throwaway loose documents, `/@p39rv/fixture-finance/review-probe` and `review-probe-2` (ids 8 and 9);
  - projects `fixtures` and `fixture-finance` made public;
  - org slug `p39rv`;
  - a throwaway member, `p39review-member@example.com`, whose credentials are only in `review/setup.json` and were never printed.
- **Stopped:** dev `:3977` (68296, 68308, 68314, 68341), the harness proxy `:3976` (68560) and headless Chrome `:9335` (70007 and its helpers).
- **`:3030` (8452) and `:8766` (80074)** were never touched and were still listening at the end.
- **Restart one piece:** `zsh <review>/launch.sh api` or `zsh <review>/launch.sh standalone`.
- **Device walk (anonymous; a `Secure` session cookie will not set over plain http on an IP):**

  ```
  kill 68294; cd <review>/webbuild/.next/standalone && NODE_ENV=production PORT=3978 HOSTNAME=0.0.0.0 KB_API_BASE_URL=http://127.0.0.1:8977 SESSION_SECRET="$(cat <review>/session-secret.txt)" nohup node server.js > <review>/standalone.log 2>&1 &
  ```

  Then browse `http://<the Mac's LAN or tailnet address>:3978/@p39rv`.
- **Stop and clean up** after the gate:

  ```
  kill 68284 68294
  docker exec kb-p28s2-pg dropdb -U kb kb_p39review
  rm -rf <review>/webbuild <review>/root
  ```

  The paper PDFs and PNGs, the CDP scripts and reports, and the bootstrap snapshots (`bs-bb525b9`, `bs-HEAD`) are scratch files and can go with the scratchpad.
- **Agent profile:**
  - The `kb_reader` cookie I set on 127.0.0.1 is deleted; the Display panel reads System, size 3.
  - My scratch origins (:3976–:3978) hold no localStorage.
  - I closed my one tab, and the MCP group was removed.
  - Host-wide cookies I did not set were left alone.

## Instruments

- **Claude in Chrome** on the agent profile, selected by `deviceId c14e5b18-…` after `list_connected_browsers` (one browser listed, with that id). It drove every screen state, with real clicks, keys, hovers and a drag; page JS was used only to measure and read. Window 1728×963, DPR 1.
- **The same-origin viewport harness** (`vp_proxy.py 3976 → 3978`, copied from S8/S9) in Claude in Chrome, for true 320, 390 and 1024 viewports on the standalone build (React hydrates there).
- **Headless Chrome 156 over CDP** (throwaway profile, `--disable-features=OverlayScrollbar`). It ran what the extension cannot:
  - `Page.printToPDF` (A4 and Letter, en and ko; the past version; the legacy notice), with PNGs from `pdftoppm`;
  - DPR-2 mobile emulation for the 12-width scroller sweep and the text-size and no-wrap probes;
  - reduced-motion emulation.
- **HTTP fetches** for the server-rendered counts on dev and standalone, and for the member `/review` (a BFF sign-in by script; the cookie was never printed).
- **Not available:** no WebKit, no real iPhone or iPad, no screen reader. Those checks are the walkthrough's.
