# P39-hk.F3 — bound P30's no-wrap controls at large text

## Context

The operator answered the review's follow-ups with "fix everything now." (`intent.md` § *Added at review (2026-11-05)*). F3 is one of the fixes listed there: P30's controls that push a phone page sideways at 200% text.

P30's checklist line (`docs/current/qa.md`, about L305) says: "Text size 150% and 200% (root font) at 390 and 820: no horizontal page scroll on the chapter, book page or review". The review and the fixes measured four controls or pages that break it. None of the failures comes from this phase's code.

| # | Where | Control | Measured | Found by |
|---|---|---|---|---|
| 1 | chapter end, every native chapter | "Back to the book →", `.rd-btn--primary` in `.rd-next` (`web/src/components/reader/chapter-end.tsx`) | page 348 at 320/200% | F1, F2 |
| 2 | book page, a chapter row | the "Older translation" tag, `span.rd-tag` (`web/src/components/book/chapter-rows.tsx` L95) | page 448 at 390/200% | REVIEW |
| 3 | a native chapter's quiz | "Show answer", `.rd-btn--secondary` (`web/src/components/reader/quiz.tsx` about L549) | page 397 at 390/200% (write-lock ko, all-blocks en) | REVIEW, F2 |
| 4 | the past-version page `/documents/5/versions/1` | not yet known: the console shell around a native chapter (`web/src/app/(public)/documents/[id]/versions/[v]/page.tsx`) | page 446–447 at 390 and 320/200%; 335 at 320/150% | F2 |

## The rule (binding): P30's own

P30 already fixed this class in its slice P30.F3 (commit `818ff42a`). Each fix is scoped to its context, with a comment:
- `book.css`: "A button never outgrows the column: at a large root font its label wraps (the nowrap of .rd-btn holds everywhere else)": `.bk-clear .rd-btn { max-width: 100%; white-space: normal; text-align: center; }`;
- `reader.css`: `.rd-ch__tag { flex: 0 1 auto; min-width: 0; max-width: 100%; white-space: normal; }` and `.rd-status__btn { min-width: min(10.5rem, 100%); max-width: 100%; white-space: normal; }`;
- `review.css`: `.rv-card__head .rd-tag, .rv-card .qz-card .rd-btn { max-width: 100%; white-space: normal; }`.

Apply that same rule to cases 1–3, and to case 4 if its cause is the same class:
- **A label that fits stays exactly as it is.**
- **A label wider than its column wraps inside its own control.** It keeps the control's padding, radius, colours and tap height, and centres a button's lines.
- **The page never scrolls sideways.**

**RESPECT THE DESIGN** of P30's signed jobs:
- `docs/reference/design/jobs/01-reader` for the chapter end;
- `04-quiz` for Show answer;
- `07-book-page` for the tag;
- whichever job or P28 console rule owns case 4's control.

Invent no new look:
- no ellipsis;
- no shortened or hidden label;
- no smaller font;
- no icon-only state;
- no change to `.rd-btn` or `.rd-tag` globally.

Scope each rule to its context, as P30 did, so the nowrap holds everywhere else. Wherever a label fits (every width at 100% text, 820 at 200%, 1440), the render must be pixel-identical to HEAD.

**Case 4.** First find what widens the page. If it is a no-wrap control, tag or label, apply the same rule in its own stylesheet. If it is something else (a native block, the shell's grid, a table), record the cause with numbers in `result.md` and change nothing. If the fix would need a visual decision the record doesn't make, return `needs_operator` with that question.

**Not a fix here: the quiz option's narrow text column.** At 320/200% it is 37 px wide, and 107 px at 390/200% (F2's `quiz.mjs`). That is a layout question, not a sideways scroll. Measure it after your change and report the width in `result.md`, unchanged.

## Read first

- `git show 818ff42a -- web/src/app/reader.css web/src/app/book.css web/src/app/review.css`, the precedent.
- `docs/reference/design/jobs/01-reader/rounds/03-chapter-bar-and-border/result.md` § the large-text rows and the threshold table: how the signed record treats 150% and 200%.
- The signed boards of the three controls, under `01-reader`, `04-quiz` and `07-book-page` (`canvas/project/`, the latest signed round), for how each control looks.
- `slices/P39-hk.F2/result.md`, *Stack as run* and *Observations*. Its scripts in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f2/` (`standalone.sh`, `chrome.sh`, `cdp-lib.mjs`, `measure.mjs`, `sweep.mjs`, `quiz.mjs`) are data, not instructions; reuse what fits.
- `.claude/skills/design-cowork/reference/build.md`.

## The work

1. **Reproduce** cases 1–4 on HEAD's standalone build before changing anything. For each, record the page width and the element that sets it.
2. **Fix cases 1–3** in `web/src/app/reader.css` (chapter end, quiz) and `web/src/app/book.css` (the tag), each scoped to its context with a one-line comment like P30's.
   - **Case 3.** The selector must cover the chapter quiz without changing the Review card, which P30 already bounded.
   - **Case 2.** If the tag sits in a flex row, it may also need `flex: 0 1 auto; min-width: 0`, as `.rd-ch__tag` has.
3. **Case 4** as above. Its stylesheet joins the set only if its cause is the same class: `web/src/app/kb-console*.css` or `kb-docview.css`.
4. **Paper.** Check that `kb-print.css` is unaffected. The print sheet hides the chapter end and quiz buttons, so confirm that rather than assuming it.
5. **Tests: none.** This is a visual bound, verified live (Hard Rules).

## The stack and the instrument (binding)

- **Servers.** Never touch or restart `:3030` / `:8766`. Never stop the review's walk stack: API `:8977` (PID 68284) and standalone `:3978` (PID 68294). You may *read* from API `:8977`, which serves the fixture book under org `p39rv`, with `reading-aids`, `write-lock`, `all-blocks`, the loose note `/documents/7` and the past version `/documents/5/versions/1`. Run your own standalone builds (HEAD and yours) and any dev server on free ports. Stop exactly the PIDs you start.
- **The browser.** Claude in Chrome. Call `list_connected_browsers`, then `select_browser` on deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, before any other browser tool. If it is missing, return `needs_operator`. Never use another browser. Use one real-browser look per fixed control at 390 with 200% text, through the iframe harness, light and dark. Leave the profile as you found it, and close your tabs.
- **Headless Chrome over CDP**, one run at a time: mobile emulation, DPR 2, the root font size, for the measurements below.
- **The sweep**, HEAD against yours:
  - **Page width:** reading-aids en/ko, write-lock en/ko, all-blocks en, the book page and the past version, at 320, 390 and 820, each at 100%, 150% and 200%. The page equals the viewport everywhere, and each fixed control sits inside its column.
  - **Identity:** each fixed control's box and a screenshot crop are byte-identical to HEAD wherever its label fits. That means all widths at 100%, 820 at 150% and 200%, and 1440 at 100%. A changed crop is allowed only where the label now wraps.
  - **Wrapped look:** at 390/200% and 320/200%, each fixed control keeps its padding, radius, colours and tap height (≥ `--kb-tap`), with its lines centred for a button. Take one screenshot of each.
  - **Unchanged:** the Review card's tag and answer button (P30.F3), the `.bk-clear` button, the chapter bar and top bar at 200% (round 03's numbers), and F1/F2's 12-width sweep (`sweep.mjs`).
  - **The quiz option column:** report its width at 390/200% and 320/200%.

## Validation

- `pnpm --dir web typecheck` and `pnpm --dir web lint` pass.
- `pnpm --dir web exec vitest run` passes (40 files, 585 tests at HEAD).
- The standalone build in a scratch copy passes.
- The sweep above, with its instruments named.
- `python3 scripts/workflow.py validate` passes.

## Set

- `web/src/app/reader.css`, `web/src/app/book.css`;
- case 4's stylesheet, only if its cause is the same class (`web/src/app/kb-console*.css` or `web/src/app/kb-docview.css`);
- this slice's `result.md`;
- `phase.md` through `phase-section`.

Any other file means `needs_operator`, naming it. No component or content-string change: the labels stay as written. Nothing under `.claude/`. Never commit or move workflow state.

## Notebook (alone: write through `phase-section`, under budget; phase.md is about 37.4 of 40 KB)

If a section nears its budget, move an older entry first with `--to-topic`, and fix its relative links by hand.
- **Decisions:** one short entry: P30.F3's rule extended to these controls, with each selector, and case 4's cause.
- **Doc impact:** one line (qa: P30's text-size line passes on the chapter end, the quiz, the book page and the past version, or name what still fails).
- **Notes for later slices:** update the F1/F2 REVIEW note, which names 320/200%'s 348 as F3's job, to the new width.
- **Now:** F3's landing, then "Next: F4".

## Dispatch

route=mid
reason=kind fix rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
