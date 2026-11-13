# P29.REVIEW — result

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **review_verdict:** pass
- **summary:** Reviewed P29 as a whole. The three research contracts and the DECOMP2 cut are settled in `## Decisions`, with every amendment written in place. All nine design jobs are signed on the operator's literal words, and each signed snapshot is identical to its job's canvas. Every scope item and inventory line is drawn or explicitly left open, and the confirmed intent is honoured or routed. The canvas content sweep is clean. `## Doc impact` is correctly empty, and all 13 Operator Questions are routed below.
- **validation:**
  - `python3 scripts/workflow.py validate`: pass. The warnings all predate P29: legacy kinds in P22/P26, P28's `consolidation_owed`, `stale_docs` and `oversized_doc_sections`.
  - `python3 scripts/workflow.py next`: `current_slice=P29.REVIEW`, `next_slice=none`.
  - `python3 scripts/workflow.py phase-scope P29`: unchanged from the plan (19 commits, 21 product files).
  - `git log --format='%h %s' 26ae440..HEAD -- scripts/workflow.py CLAUDE.md .claude/`: only `a5cf56a chore(workspace): update to workspace v60`.
  - `python3 scripts/workflow.py design-check`: `OK -- 9 job(s), 10 round(s), 228 board(s), open rounds: none`.
  - `job.json` / `round.json` / `SIGNOFF.md` per job: all 10 rows match the plan's expected table.
  - `diff -r -x ds jobs/<job>/canvas/project jobs/<job>/rounds/<round>/canvas/project`: 9 of 9 identical.
  - `git diff --stat 26ae440..HEAD -- web/ server/ cli/ plugin/ mcp-server/`: empty.
  - `git status --porcelain docs/`: clean.
  - Canvas content sweep (check 7): no violation.
  - The research and decomposition slices' own validation was `validate` plus a workflow-only `git status`. It is re-covered by the `validate` run and the empty product diff above.
- **deviations:** none.
- **doc_versions:** none — deferred to a docs phase. P29 changed no durable product truth (check 4). The gate is waived, so the review wrote no `## Regression Checklist` or `## Operator Runtime` section.
- **explain:** not written — run /explain for this phase
- **walkthrough:** none — gate waived

---

## 1. Validate all slices together

**Commands.** All the commands are in the verdict block, and all pass.

**The boundary.** All 21 product files that `phase-scope` lists come from the operator's workspace update `a5cf56a`, which landed inside P29's range. They are outside P29's claims, and they were not reviewed (see Observations). P29's own work lives in `works/phases/active/P29/` and `docs/reference/design/`. No product surface changed, so no surface needed walking and no checklist line falls inside the boundary.

**The research and decomposition slices.** Each `result.md` opens with a verdict block reading `status: done` and `tier: high`, and each records the same validation: `validate` plus a workflow-only `git status`.
- P29.DECOMP, S1 and DECOMP2 recorded no deviations.
- S2 recorded three deviations, all explained: no Aside probe was run; the diagram classification was done inline; two S1 amendments were proposed rather than made.
- S3 recorded three, all explained: the row key is the document stem plus `unit`; the `(project, slug)` key was rejected; the quiz payload was amended from `doc_slug` to `doc`.
- DECOMP2 adopted the amendments that S2 and S3 proposed, in place.

**The co-work slices (P29.S4, S5, S6).** These slices have no `result.md` and no `plan.md`. That is by design: their record is the rounds, and each handoff is the plan. Every job checks out:

| Job | Round | Status | Words | `canvas_version` = `job.json` | Snapshot |
|---|---|---|---|---|---|
| `01-reader` | `01-reader` | superseded (`feedback.md` present) | — | `1792340688-1a72` (superseded) | n/a |
| `01-reader` | `02-revise` | signed | "everything looks good. moveon" | `1792405111-eccf` = yes | identical |
| `02-figures` | `01-figures` | signed | "accept" | `1792452701-0e01` = yes | identical |
| `03-diagrams` | `01-diagrams` | signed | "accept" | `1792452451-49c2` = yes | identical |
| `04-quiz` | `01-quiz` | signed | "accept" | `1792439109-f854` = yes | identical |
| `05-annotations` | `01-annotations` | signed | "accept" | `1792460312-003a` = yes | identical |
| `06-library` | `01-library` | signed | "accept" | `1792475416-ec5f` = yes | identical |
| `07-book-page` | `01-book-page` | signed | "accept" | `1792473864-cd81` = yes | identical |
| `08-review` | `01-review` | signed | "accept" | `1792475245-1994` = yes | identical |
| `09-legacy-and-print` | `01-legacy-and-print` | signed | "accept" | `1792481540-f122` = yes | identical |

- Every signed round has its `SIGNOFF.md`. Each one quotes the literal words and points at its Operator Questions entry.
- Every version above equals the one in `phase.md`'s signed sections in `## Decisions` (the reader line, and the S5 and S6 tables).
- The critique levels match the cut. `critic+judge` ran on `reader`, `diagrams` and `library`, and `judge-01.md` is present for `diagrams` and `library`. `critic` ran on the rest.

## 2. Did the objective ship?

**(a) The contracts are settled.** `## Decisions` holds S1 (book and chapter model), S2 (native format and legacy path) and S3 (reader state and review) as data contracts. All three sets of amendments are written in place, not stacked:
- **DECOMP2's four**, each marked "amended, accepted at P29.DECOMP2":
  - `md → native` (`phase.md` L497, L673);
  - MCP `format` gains `"native"` (L522, L686);
  - the quiz payload uses `doc` and gains `unit` (L632, L871);
  - the stem plus `unit` key (L827).
- **S4's Mark as unread reset**, inside S3's progress contract (L851–855) and its conflicts rule (L1002–1004).
- **S6's one-article subjects** (entry 12), marked "amended, accepted at P29.S6" in S1 *Entities*, *Book* and *Phase or slice → chapter*, and in S2 */explain* (L398, L415, L478, L481, L773).

**(b) Every job in the DECOMP2 cut is signed** on the operator's literal words (check 1).

**(c) Every job's scope is covered.** Two `Explore` lookups (sonnet) located every item of *What each job draws* in the signed round's `build-prompt.md` or `result.md`. I spot-checked the citations. None of the 9 jobs' items, about 80 in all, is missing. The 25 build-inventory lines map one-to-one onto those items, so all 25 are drawn. Three items are drawn differently from the scope's wording, and each difference is recorded and signed:
- **Legacy chrome:** three bars, not one slim bar. This is `legacy-and-print` departure 1 and OQ1, signed as drawn.
- **iPad landscape (1024):** not drawn as its own frame in `figures`, `diagrams`, `quiz` and `review`. Each records this as a departure: the layout equals the 820 frame, which is drawn. It is covered by P30's device checks.
- **The legacy note** "theme, text size and highlights don't apply" is split into two signed lines (OQ2).

**(d) The confirmed intent is honoured or routed.**

| Intent item | Where |
|---|---|
| Codebase books survive | S1 *Book* (`codebase` kind, the `phases` book, per-slice books); `book-page` draws both |
| Chapters are version-updated | S1 *Versions × variants* (each variant has its own P23 chain); reader version history; book-page Versions panel |
| Korean and English variants | S1 variants and `translated_from`; the reader's language switch and stale-translation flag |
| More refined diagrams | S2's six-kind vocabulary and SVG allowlist; `diagrams` job (critic+judge) |
| Phone and iPad | every job draws 390 and 820 (most also 1024) plus 1440; device checks noted for P30 |
| Images, multi-column image or diagram rows | S1 *Images*; S2 `figure` and `figures`; `figures` job |
| More quizzes | S2 quiz (choice, recall, cloze, saved results); `quiz` job; review built from quizzes |
| A bookmark of where you left off; easy moves to another chapter | S3 positions and Continue reading; the reader's chapter bar, previous/next and chapter list; the library's and book page's resume lines; the legacy reader's restored position |
| "Fixed column width" | the signed reader: one 36rem column, no width setting (build inventory 4) |
| The inline-scroll problem, solved differently | S2's full-screen legacy frame as the only scroller, with no height measurement; `legacy-and-print` draws it; D38/D39/D40 are obsolete once it ships |
| The `/explain` handoff note for the bootstrap repo | `## Notes for later slices` → *(from P29.S2, for P30's DECOMP and the bootstrap handoff note)*, updated by S6. P30 writes the note, as the intent says. |
| Out: page-turn mode, offline reading, product code, a mockup unless asked | honoured: none was drawn or built, and no mockup was requested |
| Console, auth and landing change only where forced | `library` 3 moves the post-sign-in landing to `/library` for every member. This is a proposal the operator signed ("accept"), recorded in `## Decisions` → contract details. |

## 3. The notebook against the logs

- **The slices' logs.** Every decision a slice's `result.md` records is in `## Decisions`:
  - DECOMP: the design tool and record; the gate; the deferred-job routing (D27's finding is acted on: D27 is already in `works/deferred/dropped/`).
  - S1–S3: their contract sections.
  - DECOMP2: the cut, visual direction, the content rule, setup, Q4–Q8 and the amendments.
- **The signed rounds.** Every SIGNOFF's and round result's binding items are in the three *signed …* sections, including the contract details P30 adds (asset map, `interval` shape, self-transitions, the Review this off/delete rule, the 2,000-character note cap, no top anchor, `sources-list`, `limit_reached`, the card's `where`, the landing, `look`).
- **The four notes S6 consumed at `83003df`.** Nothing P30 needs was lost:
  - **The v60 design facts:** process facts for drafting. The one P30-relevant rule (a differing Q4–Q8 answer means a superseding round) is still in `## Decisions` → *Q4–Q8*.
  - **The operator's words from rounds 01–06:** taste input for handoffs only. It is quoted in every handoff under `docs/reference/design/jobs/*/rounds/*/handoff.md`.
  - **The signed frame for wave 3:** now the three *signed …* sections in `## Decisions`.
  - **What the wave-3 jobs must draw:** each line survives elsewhere:
    - the per-chapter fields are in S1 *Versions × variants*;
    - book progress is in S3 (L858);
    - the legacy look (`#fbfbfa`, 18/41 self-theming) is at L735 and in the S2 log;
    - the unclean mappings (the reading-guide preface, the PR explainer, the series-like loose docs) are in `slices/P29.S1/result.md` L47 and L91, which P30 reads when it migrates the 42.
- **`## Notes for later slices`** keeps exactly what P30's DECOMP needs: the library on `origin/main`, the device checks, the reader-state build inputs, and the bootstrap `/explain` changes.

No finding.

## 4. Doc impact: `## Doc impact` is empty, and that is complete

**The rule applied:** a contract P30 has not built is not shipped truth, but a decision taken now may be. P29 changed no product file, so the only candidates are decisions that are true today.

- **The design record (`frontend.md`).**
  - The current doc says the console's design handback lives in `web/design/canvas/` (L395), and it names `web/design/rounds/…` as read-only provenance for the built landing and onboarding (L522, L620, L744). All of that is still true: P29 froze `web/design/` as read-only memory, which it already was in the doc.
  - The new root, `docs/reference/design/`, holds contracts only for surfaces nobody has built. Its `kb` system is a mirror synced from `web/src/app/kb-tokens.css`, which is unchanged.
  - The root itself is a workspace convention (v60, the `design-cowork` skill), not product truth.
  - So no frontend statement is wrong today. The pointer becomes product truth when P30 builds the reader from those rounds, and P30's own `## Doc impact` carries it.
- **The decision log (`decisions.md`).** The log records a decision once it is accepted and built, with its source slices (P14, P23 and P25 all did this). P27, the last design-only phase, passed with no decisions note.
  - P29's product decisions are: books and chapters; the native format (no raw HTML, no JS widgets, no math in v1); the full-screen legacy path; per-reader private state; FSRS review; the signed reader look.
  - They become log entries as P30 builds them, and P30 may still amend details while building. Writing them now would put unbuilt contracts into a doc that the stale-docs rule already treats as behind.
- **Anything else.** No `result.md` claims a durable-truth change; each records `doc_impact: none` with a reason. Q1's public-repo fact is pre-existing, not a P29 change, and Q1 routes it to the operator.

**What P30 owes when it builds** (recorded in `## Now` so P30's DECOMP sees it):
- a `frontend.md` note naming `docs/reference/design/jobs/<job>/rounds/<round>/` (each signed round's `build-prompt.md` and snapshot) as the reader surfaces' design record;
- `decisions.md` ADR notes for the P29 contracts it ships.

No finding.

## 5. Routing of `## Operator Questions` 1–13

| Entry / item | Route | Detail |
|---|---|---|
| 1. Tenant #1's content is public on GitHub | **A** (decision) | Report only; no repo action (the operator's instruction). Decide before P30 adds images and books to the content tree. Default (c): a separate private content remote. |
| 2. Chapter images in git | **A** | Follows Q1. Default: no, `.assets/` gitignored. |
| 3. The portable `/explain` copy | **A** | Blocks P30's standing gate (`skills_parity.py` fails today). Default (a): restore it. |
| 4–8. JS widgets, math, anonymous state, highlights in review, notes on deletion | **A** (one confirmation) | They run on the working assumptions in `## Decisions` → *Q4–Q8*. Confirm before P30's DECOMP. Q4, Q5 and Q8 change no drawing. A different Q6 answer reopens the signed reader §12 and every save action; a different Q7 answer reopens `annotations` (Review this) and `review`. |
| 9. Round 01-reader's ten questions and the taste notes | **C** settled | Answered 2026-10-19 (`phase.md` L1117–1135); bound at the `02-revise` signoff. |
| 10. Round 02-revise's six questions | **C** settled | Signed as drawn with "everything looks good. moveon" (L1154–1156). |
| 11. Wave 2's questions | **C** settled | "accept" (L1303–1310), except the items below. |
| 11 · `annotations` 10: two keyboard gaps | **A** (superseding-wave decision) | See decision A5. |
| 11 · `quiz` C09: option border about 1.6:1 | **A** (A5) | Grouped with `review` 12 and `library` C11. |
| 11 · `diagrams` C14–C16: no bundle; tone properties not in `kb`; no Hangul face | **B** | Deferred job B5. |
| 11 · the two clears | **C** settled | Entry 12 answered it, and S6 drew and signed both. |
| 12. One-article subjects; the two clears | **C** settled | "yes to both" (L1334–1336); amended in place and drawn. |
| 13. Wave 3's questions | **C** settled | "accept" (L1553–1569), except the items below. |
| 13 · `review` 5: no list of suspended cards | **B** | Deferred job B1. |
| 13 · `review` 10: an entry to Review from the signed quiz's save line | **B** | Deferred job B2. |
| 13 · `review` 12: rating-button border 1.58:1 | **A** (A5) | |
| 13 · `book-page` 7: "‹ Back to the book" in signed `05-annotations` | **A** (A5) | |
| 13 · `legacy-and-print` OQ10: bridge `restore` by pixels | **B** | Deferred job B3. |
| 13 · `legacy-and-print` C07: the signed reader's chapter bar overprints at 150–200% text on a phone, and "‹ Book" overprints "Display" below 320 px | **A** (A5) | |
| 13 · `library` C04: the locked shell's topbar scrolls sideways at 390 with 175–200% text; the rail fold re-flows the page | **B** | Deferred job B4 (P28's shell, not a P29 surface). |
| 13 · the gaps: no component bundle, `library` C11, no sepia outside the reader, no Hangul face, no on-fill token, dark focus ring and print palette not tokens | **B** (C11 → **A**, A5) | Deferred job B5; the border is in A5. |

**Every entry and every open item is routed.**

**Why A5 is a decision and not a deferral.** Under RESPECT THE DESIGN, P30 may not repair a signed part in code, so these must be settled before P30 builds the affected surfaces, or they ship as signed.
- Three are accessibility defects: C07 is text overprinting at large text sizes; annotations 10 leaves highlights unreachable by keyboard; the 1.58:1 border is under WCAG 1.4.11's 3:1.
- The fourth, book-page 7, is a one-string change in the same signed job family, so it is nearly free to fold in.
- Review 10 is different: it is a feature proposal, not a defect, and the signed quiz is complete without it. So it is deferred (B2).

### Decisions for the operator (`decisions_for_operator`)

- **A1 (Q1)** Tenant #1's "private" documents are world-readable on the public GitHub repo. Report only; there is no repo action. Choose (a) accept, (b) a private repo, or (c) a separate private content remote. Recommended: (c), before P30 adds images and books.
- **A2 (Q2)** Commit chapter images to git for tenant #1? Recommended: no (`.assets/` gitignored); revisit with Q1.
- **A3 (Q3)** The portable `/explain` copy: (a) restore it or (b) retire it. P30's standing gate (`skills_parity.py`) cannot pass until you answer. Recommended: (a).
- **A4 (Q4–Q8)** Confirm the five working assumptions before P30's DECOMP: no JS widgets in v1; no math in v1; an anonymous reader keeps only the settings cookie; highlights enter review only via "Review this"; deleting a document purges readers' notes. One "confirm" keeps all five. A different Q6 or Q7 answer means a superseding round of the affected signed jobs.
- **A5 (entries 11 and 13: the signed-job changes)** Should P30's DECOMP open with one small superseding design wave (co-work, `critic`) for:
  - (i) C07, the signed reader's chapter bar overprinting at 150–200% text and below 320 px;
  - (ii) `annotations` 10, keyboard reach to a highlight's popover, choosing between its two posed options;
  - (iii) the control and rating-button border at about 1.58:1 (`quiz` C09, `review` 12, `library` C11), raised to 3:1;
  - (iv) `book-page` 7, the per-book list's back link reading "‹ Back to the book" when opened from the book page?

  Recommended: yes to all four, in one wave before P30 builds the affected surfaces. If the answer is no, file each declined item as a deferred job triggered by "the first accessibility or QA pass on the reader".
- **Canvas deletion:** none to raise. No job is `implemented`; all nine are `signed`. Their canvases become deletable after P30 builds them.

### Deferred jobs to file (`deferred_jobs`; the orchestrator runs `defer-job`)

- **B1 · A list of suspended review cards.** Title: "Review: a way back for suspended cards". Reason: `review` 5. Suspend has only a short Undo, so a suspended quiz card has no way back. A highlight's card returns when Review this is turned back on. P30 keeps the suspended flag and its history (S3), so a later list can restore cards. Trigger: a reader asks to restore a suspended card, or the operator wants it in v1 at P30's DECOMP (a design round first).
- **B2 · An entry from a chapter's quiz into Review.** Title: "Review: an entry point from the quiz's save line". Reason: `review` 10 flagged it on the stand-in only. It would change signed `04-quiz`. Trigger: after P30 ships Review, the operator wants a direct path from a quiz into the queue.
- **B3 · Exact same-device legacy resume.** Title: "Legacy reader: a bridge `restore` by pixels". Reason: `legacy-and-print` OQ10, a P30 contract change that was not drawn. The signed resume is by anchor, else by fraction. Trigger: a report that the legacy reader resumes on the wrong screen on the same device.
- **B4 · App-shell overflow under large text.** Title: "App shell: the topbar scrolls sideways at 390 px with 175–200% text; the rail fold re-flows the page". Reason: `library` C04, logged against P28's locked shell, outside P29's surfaces. It is the same class of issue as D36's device rulings. Trigger: the next console or app-shell design round, or D36's device walk, whichever comes first.
- **B5 · Sync the `kb` design system after P30.** Title: "Sync the kb design system from code once P30 ships the reader values". Reason: the signed rounds add values reader-scoped, to reach `kb` "at the next sync from code". Gaps: no component bundle (`diagrams` C14); 39 tone properties not in `kb` (C15); no Hangul face (C16); no sepia outside the reader, no on-fill token, and the dark focus ring and print palette are not tokens. Trigger: P30's review passes, or the next design round needs these on a canvas.

## 6. The deferred jobs this phase disposes of

The `deferred.json` records were read directly.
- **Where the dispositions live.** D36, D37, D38, D39, D40, D25, D13 and D34 are all still open, unchanged, and none mentions P29. The dispositions are recorded in `phase.md` → `## Decisions`: *Deferred-job routing (P29.DECOMP)* and S2 *Deferred fates* (L753–758). P30's `intent.md` names D37–D40 and D25 (L145–146) and reads P29's `phase.md` (L47), so P30's DECOMP will act on them.
- **No record should change now.** None of the dispositions is true until P30 ships the legacy path. Recommended, for the orchestrator at P30's points:
  - **D37:** promote it into P30's raw-relay slice at P30's DECOMP (add `no-transform`).
  - **D38, D39, D40:** drop them as obsolete at P30's review, once the height reporter is deleted and the full-screen frame is live.
  - **D36:** stays open. Items (4), (6) and (9) are absorbed by the signed `reader`, `library` and `legacy-and-print` jobs; (7) is P30's device check; the rest are P28 console rulings.
  - **D25, D13, D34:** stay deferred; their triggers are unchanged.
  - **D27 and D31:** already dropped.

## 7. The canvas content rule (this repo is public)

- **Scope.** I swept all 715 committed files under `docs/reference/design/`, and separately the 303 files of the job canvases.
  - **Patterns:** `glide`, `ilab` as a word, `upbit`, `arb_`, an email-address pattern, key-like strings (`sk-`, `AKIA`, `ghp_`, `xox`, private-key headers), strategy terms, real project names (`changple`, `vocky`, `mijual`, `hi2vi`, `bootstrap_agentic`, `naver`), the owner's account names, and `base` as a word.
- **Canvases:** zero hits for any pattern. The `base` hits are "Knowledge Base" and JS offsets.
- **Every other hit is allowed:**
  - the rule itself, in the handoffs' content-rule lists;
  - the drafters' "never on the canvas" lines in round `result.md` files;
  - the operator's own intent quote ("image avail**able**" matches `ilab`).
- **Emails and keys:** none.
- **One near-miss, classified as not a violation.** The critique, judge and handoff files carry absolute scratchpad paths for screenshot evidence. These paths embed the machine's local account name; there are 41 in all, for example `jobs/01-reader/rounds/01-reader/critique-01.md:17`.
  - They are not canvas content.
  - The same identifier is already committed in more than 40 earlier files of this public repo (`works/`, `plugin/templates/`, `tests/`, a published library document), so this is no new exposure.
  - The paths are dead links. I list it as an observation for the tooling (O2).

No finding.

## 8. Design-phase specifics

- **No mockup route.** None was requested or added: `git diff --stat 26ae440..HEAD -- web/` is empty.
- **No canvas to delete.** No job is `implemented`, so there is none to raise. All nine are `signed` and await P30.

## 9. Observations (outside the boundary, not findings)

- **O1.** The workspace update `a5cf56a` (v60) supplies all 21 files in `phase-scope`. It was not reviewed, by the plan's instruction.
- **O2. A tooling tidy-up, deferred-job candidate.** Title: "Design records: no absolute scratchpad paths in committed critiques and handoffs". Reason: the critic and the handoffs commit `/private/tmp/...` evidence paths, which are dead links that carry the local account name (check 7). Trigger: the next workspace update that touches `design-critic` or `design-cowork`, which is a bootstrap-repo matter.
- **O3.** `phase.json` reads `status: planned`. `start-slice` moves only slices; `review-phase` sets the phase from the verdict. This is expected.
- **O4.** P28 still owes its docs consolidation, and seven docs are stale. This predates P29.
- **O5.** The `## Slices` Outcome cell for S2 says "7-kind". The signed vocabulary has six kinds, with `state` sharing `flow`'s layout. DECOMP2 recorded this as engine-owned text. It is cosmetic.

## Writes

- This file.
- `works/phases/active/P29/phase.md` → `## Now`, rewritten for the verdict. Nothing else in `phase.md` was touched.
- No other file was edited. No state, `defer-job`, `doc-new-version` or `design-*` command was run apart from `design-check`, and nothing was committed.
