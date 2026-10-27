# P-8jbf.DECOMP — result

- status: needs_operator
- route: high
- model: opus
- effort: xhigh
- summary: Halted before cutting. The confirmed rule describes the console `.kb-doc` view (`kb-docview.css`: 42rem text, 64rem article, 16px body, `?view=full`), which since P30.S13 renders only the unlinked archive page `/documents/{id}/versions/{v}`. Every document and book chapter opens in the signed `01-reader` (`reader.css`: one 36rem column for text, code and tables, 18px Literata in 5 sizes), so the rule as written would change nothing the operator reads. OQ1 asks the operator to re-target it; the recommendation is in `topics/reader-surface.md`.
- files_changed: works/phases/active/P-8jbf/topics/reader-surface.md (new), works/phases/active/P-8jbf/topics/breakdown.md (new), works/phases/active/P-8jbf/phase.md (Operator Questions, Decisions, Notes for later slices, Now, through `phase-section`), works/phases/active/P-8jbf/slices/P-8jbf.DECOMP/result.md (new)
- validation: `python3 scripts/workflow.py validate` passed (pre-existing warnings only); `python3 scripts/workflow.py parallel-plan P-8jbf` ran (DECOMP -> REVIEW, nothing cut)
- deviations: no slices cut and no breakdown written, as the plan expected. The plan's pinned values target a surface no reading link opens, and moving them onto the reader takes visual decisions only the operator can make.
- doc_impact: none
- parallel: `parallel_plan=P-8jbf: DECOMP -> REVIEW`, `parallel_rounds=2 rounds for 2 open slices; a chain`. Nothing to run together yet because no middle slices are cut; the expected re-cut is one slice, which is a chain by nature.
- operator_need: Answer OQ1. The phase's rule was written for the console `.kb-doc` view, but documents and chapters open in the signed `01-reader`. Should the phase re-target that reader? Recommended: above 1600px of window width, one wider column (36rem → 44rem, 576 → 704px), every text size one step larger (default 18px → 20px; spacing, headings and code/table text follow), code/tables/figures/diagrams staying in the column; below 1600px, print, the Display panel UI, and the review, book, book-notes, legacy and archive pages unchanged. Alternatives: B, wide blocks breaking out to ~64rem, reverses the signed one-column rule and collides with the margin-notes rail, so it needs a design round; C, widen only, gives ~79 characters per line; D, literal, changes only the archive page. On the answer the orchestrator refines intent.md's Confirmed Intent and re-runs DECOMP.

## What I found

1. **The routes.** `web/src/app/(public)/documents/[id]/page.tsx` renders `ReaderPage` (native/md) or
   `LegacyReaderPage` (html explainer) since P30.S13/S25. The comments say: "opens in the READER (`01-reader`, the loose-document
   variant: no book navigation, no app shell)". The pretty URL and the chapter URL use the same reader.
2. **Where `.kb-doc` still renders.** `.kb-doc` / `.kb-prose` / `?view=full` appear only in
   `documents/[id]/versions/[v]/page.tsx` (grep for `kb-doc`, `kb-prose`, `fullWidthHref`). Nothing links to
   `/documents/{id}/versions/{v}`; the reader's version history uses `?v=N` (`reader-href.ts`).
3. **The reader's widths** (`web/src/app/reader.css`):
   - `--rd-measure: 36rem` (:142) and one `.rd-flow` track (:359-366) for every block. This is signed in `01-reader` round
     02-revise (result.md:80-83, departure 2 at :360: "One column for every block … `--rd-wide` is gone").
   - Text is `--rd-fs` 18px by default, in five sizes via `.rd-size-1..5` (:165-169).
   - Gutters use viewport media at 40/90rem (:172-173).
   - The margin-notes rail `.an-rail` is placed from `--rd-measure` (:1663-1666).
   - `.rd-root` / `.rd-flow` / `--rd-measure` are shared with the review page (`review-app.tsx`, `review-static.tsx`), the book page
     (`book-frame.tsx`), book notes (`book-notes.tsx`, `.an-page__main` :1761) and the legacy reader.
4. **The legacy reader** (`legacy.css`) is a full-window iframe (`width: 100%`), so it already uses the width.
5. **Live check.** Instrument: headless Google Chrome (`--headless=new --window-size=1920,1080 --screenshot`) on dev
   `http://127.0.0.1:3030` (up, HTTP 200). I checked the public fixture `/documents/20`, which redirects with 307 to
   `/@p28s2/research/focus-ring-floor-and-touch-targets`. At 1920 the column runs x=672 to x=1248 (576px = 36rem),
   and the rest of the screen is empty. Screenshot (scratch, not in the repo):
   `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/64d8f545-b28e-4809-a0d4-9d2aac06f311/scratchpad/reader-1920.png`.
   I did not use Aside: it is fixed at 1440×900, and this check needed 1920.

The recommendation, the alternatives with their numbers (characters per line, the rail collision at 1920), the provisional S1
set with its build gotchas, and an out-of-phase observation are all in
`works/phases/active/P-8jbf/topics/reader-surface.md`. The gotchas: the shared `.rd-root` scope, and that a custom property
cannot reference itself. The observation is the orphaned archive page, a deferred-job candidate. I do not restate them here.

## Notebook writes (by path, not restated)

- `## Operator Questions`: OQ1.
- `## Decisions`: `Breakdown (DECOMP): not cut, halted on OQ1 …` → `topics/breakdown.md`.
- `## Notes for later slices`: one note for the DECOMP re-run (the reader's sheet, shared scope, wide-viewport instrument).
- `## Now`: rewritten.

## Not done (deliberately)

- I ran no `new-slice`, wrote no slice `plan.md`, ran no `accept-gate`, made no commit and moved no status.
- I did not edit `intent.md`: re-confirming intent is the orchestrator's job, with the operator.
- No estimate: nothing is cut. `topics/breakdown.md` § Estimate gives the `dispatch-summary` means for the provisional
  shape: decomposition 7.4, implementation 28.9 and review 369.5 span-minutes per slice. Spends money: no.
