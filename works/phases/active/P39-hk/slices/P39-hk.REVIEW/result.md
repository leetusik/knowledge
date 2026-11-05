# P39-hk.REVIEW result (round 1)

## Verdict

- **status:** done
- **review_verdict:** changes_requested (one finding, F1; fix slice `P39-hk.F1`)
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** The phase shipped what it set out to do. The explain skill is codebase-only and works from the phases' records. It suggests a reader and a shape, and it offers a research phase when no phase covers the subject. The four research agents are gone, and the v92 handshake matches S5's package. The grammar, the reader and paper match the signed `10-reading-aids` record in every state I opened. Every validation command passes. One defect blocks a pass. The phase added no-wrap runs (`.ra-keep` keeps, inline `math.ra-m`) with no width bound. At 200% text on a 390 phone the Korean chapter now scrolls sideways, so P30's text-size checklist line fails, and a valid long inline formula overflows any phone.
- **validation** (all run in this worktree; counts in § Validation):
  - `uv run pytest -q`: 183 passed, 60 skipped. With a disposable Postgres (`KB_TEST_DATABASE_URL`, dropped after): 243 passed.
  - `pnpm --dir web typecheck`: exit 0.
  - `pnpm --dir web lint`: exit 0.
  - `pnpm --dir web test`: 40 files, 583 tests.
  - Scratch standalone `next build`: exit 0, 13 static pages.
  - `scripts/skills_parity.py` and `scripts/plugin_parity.py`: PASS.
  - `uv run pytest tests/test_explain_resolver.py -q`: 2 passed.
  - `package/checks/cites.py`: citations 113, bold 15, missing=0.
  - `package/checks/finds.py` (18 of 18 exactly once): at `bb525b9`, at `510f112` and at `bb2b141`.
  - `package/checks/apply.py`: pass at `bb525b9`. At `510f112` the explain block passes, but the check's pinned skill count (19) meets 20 skills.
  - `wc -l plugin/skills/explain/SKILL.md` = 2492 = `content.ts` "2,492".
  - The v86 grep is empty.
  - `git status --porcelain .claude/` is empty.
  - `python3 scripts/workflow.py validate`: passed, pre-existing warnings only, no dangling pointer.
- **findings:**
  1. **F1, the class "a no-wrap run the phase adds has no width bound".**
     - **Failing cases:**
       - ko `reading-aids` at 390 with 200% root text: page 401 wide (P30's line);
       - ko at 320 with 200%: 401;
       - en at 320 with 200%: 390;
       - en at 390 with 200%: "CONDITIONAL-GO’s" runs 34 px past the column into the gutter;
       - ko at 320 with 150%: 8 px past the column;
       - a valid inline formula about 176 TeX characters long (the limit is 300) at 390: page 937 wide (DOM probe).
     - **Passing cases:** 100% at every width; 150% at 390 en and ko; the legend `dt` column; the term sheet itself; paper.
     - Detail in § Findings.
- **proposed fix slices:** `P39-hk.F1`: bound the reading aids' no-wrap runs to their line. `kind: fix`, `risk: high` (open design: how an inline formula wider than its line shows). Acceptance matrix in § Findings.
- **doc_impact_added:** none this round. Appending is pass-only. The lines are drafted in § Drafts for the pass round.
- **doc_versions:** none, deferred to post-merge consolidation (parallel mode). None were drafted as notes this round (changes_requested).
- **walkthrough:** not opened (changes_requested). A draft for the re-review round to return is in § Walkthrough draft. OQ7–OQ17 are routed in § Operator Questions.
- **deferred_jobs:** 10 to file, plus close/drop calls on 9 existing ones (§ Deferred jobs).
- **team-rules check:** n/a (at-root install; `nested-repos` refuses).
- **explain:** not written. Run `/knowledge:explain P39-hk` for a document, or ask it for a book.
- **operator_need:** none for this verdict. OQ12 (the invisible focus ring) is a natural sibling of F1 in `reader-aids.css`. If the orchestrator asks it now and the operator says "fix", cut it as its own slice beside F1.
- **deviations:**
  1. **The pass-only writes are drafted here, not appended.** These are the stage-4 `(gate section — written at merge)` notes and two `doc_impact_added` lines. The verdict is changes_requested, and review-phase makes both doc duties pass-only.
  2. **The walkthrough is a draft.** The gate opens only on a pass.
  3. **Checks beyond the plan:**
     - the Postgres-gated pytest;
     - finds and apply at the bootstrap's newer commits;
     - two throwaway "Review probe" loose documents on the scratch stack, to prove OQ9's card path (the fixture book has no quiz with math);
     - CDP text-size and no-wrap probes;
     - one DOM-only probe, reloaded.
  4. **Not run:** the `claude -p` front-door lines. This worktree is a v91 workspace and a phase worktree, so 0.10.0 can only refuse here, and a headless model session is not in the plan.

## The boundary

`phase-scope P39-hk` gives `b38ab84..7951f34`: 22 commits and 100 product files (49 added, 47 modified, 4 deleted).

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
| `pnpm --dir web test` | 40 files, 583 tests passed |
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
- **The v92 handshake:**
  - Step 2 tests v92 and a create-phase route listing `**phases**`; the package's `explain-route.md` L16 lists it.
  - Both refusals name v92.
  - `handoff-explain.md` sets the bootstrap-first order.

**B, the reader and paper:**
- The formulas, their reading, the "where" legend, the term marker, the window and phone sheet, the glossary section and its way back, and the paper appendix all match the signed `## Build` (RESPECT THE DESIGN) in every state I opened (§ Gate stage 2).
- They read easily: a plain sentence and a legend under every display formula, and a definition one hover or tap away.

**The grammar's invariants:**
- **Parity:** the four places stay in parity (`plugin_parity` PASS; the manifest lists `tex.py`, the TSV and the new fixtures; conformance tests pass).
- **The anchor invariant:** `reader-anchor.test.ts` passes inside the 583.
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
  - At 320×568 ko: `poisson` is a "수식, 옆으로 스크롤됩니다" region (306/286) and the page is 320. `:focus-visible` with a 2 px outline is set but not visible (OQ12 confirmed).
- **Paper (headless Chrome 156 over CDP):** en and ko at A4 and Letter, 6 pages each, every page looked at. The order is body → quiz → Glossary → Sources → Answers → colophon. Markers are 1 px dotted `#6d665a`; the glossary is 552 px with 8 px entries and `break-inside: avoid`; no windows or spacer print; no console error.
- **Reduced motion (CDP):** the window fades (`ra-in`) and the sheet does not; under `reduce`, nothing animates.
- **Write-lock (no terms or math):** no `.ra-float`, no glossary, and the STIX face stays `unloaded`.

**3. Fresh eyes, inside the boundary** (library → Fixture guide → chapter 4, then use it). These go to the walkthrough and are not fixed here:
- the Glossary is not in "In this chapter" or the Contents sheet, where I looked for it first (OQ16);
- selecting text across an inline formula paints around the formula but not on it (`mark.an-pending` skips the atom), so the formula looks left out;
- at 320 the scrolling `poisson` shows "rate × tim" with only a fade as the hint, and its focus is invisible (OQ12);
- in a Korean chapter the window's controls are English (as signed, F1);
- the single-letter term "K" is a 15×30 px target;
- the old-version page shows formulas unstyled and legends as stacked lines (OQ13);
- the landing lede still says "a native chapter with real diagrams and a quiz", though a quiz is now only suggested when earned.

**4. The checklist** (§ Checklist table): 46 lines, 34 inside and 12 outside. One inside line fails because of this phase (F1); the rest are listed there.

**5. Operator Questions:** all routed (§ Operator Questions).

**6. The walkthrough:** a draft for the re-review round (§ Walkthrough draft).

## Findings

### F1. The no-wrap runs the phase adds have no width bound

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
| 6 | `?view=full` on the past version (P28/P30) | inside (native render) | pass (CiC: rail, topbar and docbar hidden; exit pill; Esc back) |
| 7 | Past-version print masthead and colophon; Export PDF control (P28) | inside (`kb-print.css`) | paper pass (CDP: masthead and colophon); the control's Preparing…/afterprint not run (it opens the print dialog) |
| 8 | Console at 390, no horizontal scroll (P28/P30) | inside (past version) | past version pass (harness 390 = 390, signed out); dashboard, documents and project not run (member) |
| 9 | `/login?next=` (P28) | outside | not run |
| 10 | Reader chapter KO at 390, Contents sheet fits (P30) | inside | pass signed out (harness: 390; sheet 0–390 × 286–844; quiz answered); signed-in half not run |
| 11 | Quiz shows exactly one foot sentence, light/dark/sepia (P30) | inside (`render.tsx` quiz) | pass (CiC: "Correct" only; "Incorrect" `is-off`, in all three themes) |
| 12 | No inner vertical scroller, DPR 2, classic scrollbars (P30) | inside | pass (CDP: reading-aids en/ko, write-lock, loose note × 12 widths 320–1920: none) |
| 13 | Legacy reader frame the only scroller (P30) | outside (`legacy-reader.tsx`, `reader-frame.tsx` and `reader.css` untouched; the font file only declares a face) | not run |
| 14 | Deep link `#section` under the top bar (P30) | inside (`reader-article.tsx`) | pass on a fresh load (CiC: section 72 px, bar 59 px); the sign-in round trip not run |
| 15 | Old links redirect (P30) | outside | not run |
| 16 | Library grouping (P30) | outside (`library-view.tsx` untouched; font face only) | not run; seen incidentally: By project / By subject |
| 17 | Resume (P30) | inside (`MathLayer` refits after load) | not run (member) → walkthrough |
| 18 | Quiz save (P30) | inside | signed-out half pass ("Sign in to save"); signed-in half not run |
| 19 | Annotations persist (P30) | inside (`notes-load.ts`) | not run (member) → walkthrough |
| 20 | Review cards (P30) | inside (`review/actions.ts`, `inline.tsx`) | the card path passes (HTTP as the scratch member: a wrong answer on `review-probe-2` made a due card; `/review` shows `t = s × √n` and `√4`, no TeX); rate, suspend, Undo and Clear not run |
| 21 | Visibility not-found (P30) | outside | not run |
| 22 | ⌘P native chapter A4/Letter; legacy notice (P30) | inside | pass (CDP: en and ko, A4 and Letter; legacy prints one notice sheet) |
| 23 | Text size 150%/200% at 390 and 820 (P30) | inside | **FAIL**: ko chapter 390 @ 200% is 401 (F1). Also failing, but pre-existing and outside the diff: book page 448, write-lock ko 397. 820 passes. Review not run (member) |
| 24 | Reader chrome hide/show (P30) | inside (`TermLayer` pointerdown) | pass at 1728 (CiC: scroll hides; tap shows and hides; a term tap and the outside close leave the chrome alone); 390/820, slow scroll-up and the Tab part not run |
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
| 37 | P33-n3 citation check `missing=0` | inside | expected fail until v92 (85 of 200 against vendored v91); the package's texts 113/0 |
| 38 | Reader wide step ≥1600 (P-8jbf) | inside | pass at 1728 (CiC: 44rem, 20 px; inline math 1em, display 1.5×); ≤1599 not re-run |
| 39 | Reader wide table (P-8jbf) | inside (`render.tsx`) | not re-run: no 8+ column table in the fixture book; no table hunk in the diff, and `reader.css` untouched |
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
| OQ8 release order: bootstrap v92 first | walkthrough decision 1 |
| OQ9 Review card shows a formula as linear text | decided as drawn, proven live over HTTP (row 20) |
| OQ10 raw TeX on text-only surfaces | deferred job 5 |
| OQ11 the open choices S8 built | decided as drawn (its "rounded up" line superseded: nearest ¼, 5.25) |
| OQ12 the scrolling formula box's focus ring is invisible | walkthrough decision 4 (recommended: fix, beside F1) |
| OQ13 old-version page math unstyled | decided as drawn (as is) |
| OQ14 Korean particle wraps from its formula | deferred job 6 |
| OQ15 keep hyphenated words in prose and readings | deferred job 7 (needs F1's bound first) |
| OQ16 Glossary missing from contents | deferred job 8 |
| OQ17 the glossary takes no highlight | decided as drawn (as is for 0.10.0) |

## Walkthrough draft (for the re-review round, after F1)

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
> 1. **OQ8, the release order:** bootstrap v92 pushed first, then this merge and push (plugin 0.10.0), then `/update-workspace` here. The bootstrap is at `bb2b141`, still v91. The package's 18 find blocks still match once there, but `apply.py` pins 19 skills and the bootstrap now has 20; bump that pin when you apply. Recommended: confirm.
> 2. **OQ7:** an inline formula is spoken from its derived linear text, with no written alt per formula. Changing this later is a grammar change. Recommended: accept, after the VoiceOver check.
> 3. **Delete the design canvas** https://claude.ai/artifact/PndCPgBnCYWMR88qw7eApt (job `10-reading-aids`, built and signed in the repo). You said "delete after the phase over". Confirm at the delete.
> 4. **OQ12:** a scrolling formula's keyboard focus ring is hidden by its fade. Recommended: fix it.
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

## Deferred jobs (for the orchestrator to file; title · reason · trigger)

1. **design-preview crashes writing `preview.json` on a split math italic character** · D1 hit it, and the workaround is `PYTHONIOENCODING=utf-8:backslashreplace` · the next design round with math, or the next engine change in the bootstrap repo.
2. **design-sign mis-parses a multi-line `open_items:` in `SIGNOFF.md`** · D1's SIGNOFF lists its first item word by word (the true list is in the round's `result.md`) · the next `design-close` with a multi-line list.
3. **`phase-section --to-topic` leaves relative links stale** · a link written relative to `phase.md` points one level off from `topics/` (DECOMP2 fixed one by hand) · the next `--to-topic` move of an entry with a relative link.
4. **Re-sync the `kb` Design System from code after S8 and S9** · the reader-aids components and STIX Two Math are not in the system, and this login cannot open it · a session that can open the `kb` system, before the next reader design job.
5. **(OQ10) Linear text for inline math on text-only surfaces** · raw TeX shows in the Contents sheet, library Continue, notes place names, a citation's way back and the Review highlight card's quote · the first chapter with math in a heading or a highlight, or the next reader-chrome phase.
6. **(OQ14) Bind a Korean particle to the inline formula before it** · "…∑e²" | "를 계산하며" wraps at 390 · the next Korean math chapter, or the next reader-aids change.
7. **(OQ15) Keep hyphenated words whole in native prose and readings, with a length bound** · "t-" | "statistic" still breaks in a reading · after F1 lands (F1 adds the bound).
8. **(OQ16) List the generated Glossary in "In this chapter" and the Contents sheet** · a reader looks there for it · the next reader contents change.
9. **P30's text-size line fails outside this phase** · at 390 with 200% text, the book page's "Older translation" tag (448 px) and write-lock ko's quiz "Show answer" button (397 px) push the page sideways, and no file this phase changed renders them · the next book-page or quiz change, or a QA sweep.
10. **Re-run the explain front-door checklist lines in a v92 workspace** · 0.10.0 refuses this v91 workspace, so lines 28, 29, 31, 33 and 34 were not re-run, and their replacement line is drafted below · after `/update-workspace` to v92.

**Existing deferred items, from what the phase shipped:**
- **D67, narrow:** drop its research-verifier half (no verifier remains). Keep it, retitled, as a cross-vendor *critic* job; that is still paid vendor use and the operator's call.
- **D72, drop:** there are no searches, no `plan.md` and no `run.md`.
- **D73, drop:** there are no verifier batches or waves, and the critic already runs in the foreground (§4.10).
- **D75, drop:** `run.md` and `report.md` are gone (S2), and `pagetext.py` only builds the payload.
- **D76, close:** B5 names "the same family (Opus, Sonnet or Haiku)" (SKILL.md L1983, S2), and the verifier half is retired.
- **D84-8s, drop:** the 0.9.0 cost table and team sizing it would meter are gone. A metered 0.10.0 run would be a new job, on the operator's word.
- **D80-ch, keep, narrowed, now ready:** its setup-L49 general-mode half is moot. But the KB template page still says "explainer can still be written straight to a file" (L40), while §7 says there is no project copy. Its trigger ("the next touch") fired in S4 and S11.
- **D86-sd, narrow:** (a), (c), (d), (e) and (f) are settled or moot (S1, S2, S4); (b), (g) and (h) remain.
- **D85-qk:** (a)–(d) are settled in S5's package; close them when the bootstrap applies it. (e) and (f) stay open.
- **D69** is untouched and stays.

**An observation for the orchestrator (workspace state, outside the product):** this worktree's `phase.json` reads `status: planned`, `started_at: null`, while its slices ran.

## Drafts for the pass round (to append through `phase-section P39-hk "Doc impact" --append` when the verdict is pass)

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
- **Production build:** `:3978`, PID **68294** (`node server.js` from `review/webbuild/.next/standalone`, `standalone.sh`, `nohup`), with a throwaway `SESSION_SECRET` in `review/session-secret.txt`.
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
