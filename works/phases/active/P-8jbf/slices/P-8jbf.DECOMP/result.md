# P-8jbf.DECOMP — result

- status: done
- route: high
- model: opus
- effort: xhigh
- summary: Cut P-8jbf into one mid-row implementation slice, P-8jbf.S1, then the review. S1 builds the wide-screen reader rule in `web/src/app/reader.css`, scoped to `.rd-article`: above 1600px, the column goes from 36 to 44rem and the text one step larger. This re-run follows pass 1's OQ1 halt, which the operator resolved with "as your recommendation".
- files_changed: works/phases/active/P-8jbf/slices/P-8jbf.S1/slice.json (new, via `new-slice`), works/phases/active/P-8jbf/topics/breakdown.md (rewritten), works/phases/active/P-8jbf/topics/reader-surface.md (pass 1, new; one heading now points at the breakdown), works/phases/active/P-8jbf/phase.md (Decisions, Notes for later slices, Now and pass 1's OQ1, all through `phase-section`), works/phases/active/P-8jbf/slices/P-8jbf.DECOMP/result.md
- validation: `python3 scripts/workflow.py validate` passed (pre-existing warnings only); `python3 scripts/workflow.py parallel-plan P-8jbf` ran; `python3 scripts/workflow.py executor-route P-8jbf.S1` printed route=mid
- deviations: none in the re-run. Pass 1 halted `needs_operator` on OQ1 before cutting; the orchestrator re-targeted intent.md and re-planned.
- doc_impact: none. S1 owes its own note: the reader's wide-screen measure and text sizes, in product and qa.
- parallel: `parallel_plan=P-8jbf: DECOMP -> S1 -> REVIEW` / `parallel_rounds=3 rounds for 3 open slices; a chain: no two slices run together`. The chain exists because there is a single middle slice. One file, one rule: splitting it would only put two slices on the same file.
- deferred-job candidate (for the orchestrator to file): title "Retire or redirect the orphaned document archive page". Reason: `/documents/{id}/versions/{v}` still renders the old console `.kb-doc` view and its `?view=full` full view, but nothing links to it now that the reader reads old versions with `?v=N`, so it is a second document surface. Trigger: the next reader or documents phase.

## Pass 1 (halted, `needs_operator`)

The first confirmed rule (text 42→50rem, article 64→88rem, body text 16→18px, full view) described the console
`.kb-doc` view in `kb-docview.css`. Since P30.S13 that view renders only the unlinked archive page. Documents and chapters open
in the signed `01-reader` (`reader.css`): one 36rem column for every block, and 18px Literata text in five sizes. A live check
in headless Chrome at 1920 on dev `:3030` showed a 576px column. I created no slices and asked OQ1. The evidence, the
recommendation the operator accepted, the alternatives and the observation are in
`works/phases/active/P-8jbf/topics/reader-surface.md`.

## The re-run (this cut)

Re-checked against the code only for what the cut needs:

- **Scope.** `.rd-article` is rendered only by `ReaderFrame` (`reader-frame.tsx:592`). That covers loose documents, chapters,
  and the chapter loading, not-found and failed states (`ReaderStateBlock` inside `ReaderFrame`).
  - `.rd-root` and `.rd-size-N` also sit on the review root (`review-app.tsx:723`, `review-static.tsx:33`), the book root
    (`book-frame.tsx:27`), the book-notes root (`book-notes.tsx:213`) and the legacy root (`legacy-reader.tsx:769`).
  - `.rd-page` also appears on the review page (`rd-page rd-flow rv-page`). The rule therefore scopes to `.rd-article`.
  - The top bar, the chapter bar, the sheets and the Display panel all sit outside `.rd-article`, so they stay unchanged by
    construction.
- **Rail.** `.an-rail` is placed from `--rd-measure` (`reader.css:1663-1666`) and lives inside `.rd-article`
  (`annotations.tsx:330, 541, 2698`), so it follows the column. At 1600px it runs from 1176px to 1432px.
- **Calc chain.**
  - `--rd-fs-s` is declared on `.rd-root` (`reader.css:141`). A custom property is computed where it is declared, so
    `--rd-fs-s` must be re-declared in the scope.
  - `--qz-nfs` is declared on `.kb-ch .qz`, inside the article, so it follows by itself.
  - `--rd-fs` cannot reference itself, so S1 restates the five steps ×10/9 per `.rd-size-N .rd-article`. `--rd-k` gets the
    same treatment.
- **Step.** `@media screen and (min-width: 100rem)`. It measures the window, as the intent says, and has the same form as the
  reader's other steps (`reader.css:172-173`). 1599px is unchanged and 1600px is wide. `screen` keeps print out.
- **Room.** At every step the column holds 10% more em than it does today (44/36 × 9/10), so no em-based layout gets less
  room than at today's same size.
- **Gates.** There are no CSS tests in `web/tests`. The web gates are `lint`, `typecheck` and `build`; CLAUDE.md forbids style
  tests.

Risk is `low` (the mid row; `executor-route` prints route=mid). There is no named trigger: the change is CSS only, in one
file, with pinned values. The shared `.rd-root` is not a wide blast radius once the rule is scoped to `.rd-article`.

## Notebook writes (by path, not restated)

- `## Decisions`:
  - Entry 1 replaced with `Breakdown (DECOMP): …` (pass 1 halted, re-run cut S1).
  - Appended `Wide rule's scope and step: …`.
- `## Notes for later slices`:
  - Removed the pass-1 note for this re-run (consumed).
  - Appended one note for P-8jbf.S1 (calc-chain gotchas, instrument).
- `## Now`: rewritten.
- `topics/breakdown.md`: rewritten in place, with `## Passes`, `## Estimate`, `## Join-rebuilt artifact` (none) and a
  `## P-8jbf.S1` block.

## Estimate (from `dispatch-summary` means)

- S1 (implementation): 28.9 span-minutes per slice. The mid row's mean is 20.6 minutes per span.
- REVIEW: 369.5 span-minutes per slice. That mean is skewed by large phases.
- Total: about 400 span-minutes. Spends money: no.

## Not done (deliberately)

No `plan.md` for S1, no `accept-gate` (the orchestrator declares `--require`), no commit, no status moves, no `defer-job`.
