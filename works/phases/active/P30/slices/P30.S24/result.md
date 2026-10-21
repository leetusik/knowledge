## Verdict

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Built `/review` from the signed `08-review` round 01: the queue header and By book, quiz (single, multiple, cloze, recall) and highlight cards, the foot (Next, or the two ratings with interval previews), the way back into the chapter, suspend and undo, the done / limit / new-limit / paused / empty / failed states with Continue reading, review settings (`PATCH /app/reader/profile`) and Display. Wired to S10's API with an idempotent `review_id` (Try again re-sends the same id; proved once-only live). No server change.
- validation (all pass):
  - `pnpm --dir web typecheck`
  - `pnpm --dir web lint`
  - `pnpm --dir web test` (382 tests; 11 new in `web/tests/review-model.test.ts`)
  - `pnpm --dir web build`
  - `python3 scripts/plugin_parity.py`
  - `python3 scripts/skills_parity.py`
  - `python3 scripts/workflow.py validate`
  - the live check below
- deviations: none from the plan. One addition: `app/review/layout.tsx` carries the `requireIdentity` guard (a signed-out visit answered 200 from the loading shell before the page's own redirect).
- doc_impact: one line appended to `phase.md` (`frontend.md`: `08-review` round 01 is the design record of the review surface); full lines in `topics/doc-impact-detail.md` -> *P30.S24*.

## Files

Created:
- `web/src/content/review.ts`
- `web/src/lib/review/{types,model,foot,spec,actions,cx}.ts`
- `web/src/components/review/{inline,card,queue-head,skeleton,end,settings,review-static,review-app}.tsx`
- `web/src/app/review.css`
- `web/src/app/review/{layout,page,loading,error}.tsx`
- `web/tests/review-model.test.ts`

Modified: `web/src/lib/knowledge/reader.ts` (a type import and `getReviewQueue`, `postCardReview`, `patchReviewCard`, `patchReaderProfile`, appended). Notebook: `phase.md` (`## Now`, `## Decisions` range, `## Doc impact`, `## Operator Questions` OQ147-OQ158 collapsed, `## Notes for later slices`), `topics/operator-questions-decided.md`, `topics/doc-impact-detail.md`, `topics/notes-later.md`.

D22: prettier ran only on files this slice created.

## What the notebook holds (not restated here)

- Decided questions OQ147-OQ158: `topics/operator-questions-decided.md`.
- The surface as shipped, the gotchas and the live-check setup: `topics/notes-later.md` -> *The review surface as shipped*.

## Live check

Runtime: a fresh scratch API on `:8881` (database `kb_s24live` in `kb-p28s2-pg`, scratch `KB_ROOT`, the fixture book), a pass-through proxy `:8882` that fails, slows or loses the reply of the queue, rating, status, profile and continue calls on flag files, and `next start` on the production build, `:3881`. Never `:8766` or `:3030` (both still answer after the check). All three scratch processes were stopped by their own PIDs and `kb_s24live` was dropped.

Instruments:
- **Headless Chrome over CDP** with a throwaway profile: real mouse and keys, true device metrics for the viewports, `setEmulatedMedia` for dark, and the console and CSP capture (Aside's console capture records nothing, per the rules). Every scenario ended with a clean console and CSP section.
- **Aside `u1`** (`aside repl --account u1`) for a signed-in pass at 1440: grade a card, Next, suspend and Undo, the Settings sheet (focus on Close, Escape returns focus to Settings), Display > Dark, and the whole queue rated through to the done state with Continue reading.

Checked, with the result:
- **States:**
  - quiz: single (graded right and wrong), multiple, cloze (one and two blanks), recall (front, answer, saving);
  - highlight: with note, 500-character note, Korean, long quote;
  - Relearning and Learning tags, and a Korean card's language chip;
  - the end states: done (with next due), reviews limit, new-highlights limit, paused (new highlights 0), empty (all suspended) and failed to load (queue 500, then Try again recovers);
  - Continue reading on the end state links to the chapter.
- **Rating:**
  - the saved line and counts after a rating, and focus on the next card's article;
  - "Saving…" (slow flag) with the buttons disabled;
  - a failed rating: "Not saved" with Try again, answer kept;
  - **`review_id`:** with `lose-rate` the server processed the rating and the reply was lost; Try again sent the same `reviewId` (seen in the write log) and the database holds one review log row for that card.
- **Suspend and undo:** the toast, Undo returns the card to the head and restores the counts, a failed suspend keeps the card with "Not suspended" and Try again; a highlight card's toast names Review this.
- **Settings:** the select, the two limits, invalid values (nothing sent, `aria-invalid`, focus on the first), a failed save keeps the draft, "Saving…", saved closes the sheet and shows the saved line.
- **Display:** the sheet opens and closes by Escape (focus returns); sepia plus size 5 live.
- **By book:** the rows and the note, `aria-expanded`.
- **Keyboard:**
  - tab order: top bar, By book, options, Suspend; the where link only once revealed;
  - Enter and Space choose or toggle;
  - Enter in a blank is Check (empty blank: "Nothing to check yet");
  - after grading focus is on Next; after Show answer it is on the answer; after a save it is on the next card's article;
  - the focus ring is the reader's.
- **Viewports and themes:**
  - 390, 820, 1024 and 1440, for single, multiple, cloze, recall and highlight cards: no horizontal scroll, no inner scroller, every control at least 43 px;
  - dark, sepia and light at sizes 1, 3 and 5 on graded and highlight cards, and system plus dark.
- **Keyboard rising on a phone:** at 390×520 a focused blank scrolls into view with its Check below it.
- **Signed out:** 307 to `/login?next=%2Freview`.
- **Links:** the where link on a highlight card opens the reader at the block with the highlight painted.

Defect found and fixed during the check: the foot's status cells all showed at once because a class list built as `` `qz-st${on ? "" : "is-off"}` `` lacks its space (`qz-stis-off`). Every such list in the review files now uses `cx()`.

Not verified (named, not claimed): real iOS keyboard (a short viewport stands in), print, the end states in dark and sepia, a drifted card's "Starts over" (not seeded), the queue past one page of 50 and a late reply to an older rating (unit-tested only).
