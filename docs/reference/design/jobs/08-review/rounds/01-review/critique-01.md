# Critique 01: 08-review/01-review

- pass: 01
- mode: critic
- verdict: revise
- confidence: high
- must_fix: 7 (part 1: 5, part 2a: 2)
- gaps: 2
- advisory: 4
- wave: 07-book-page, 3 choices
- escalate: C10, C11, C12
- preview: 373s, 141 states
- standard: .claude/agents/design-drafter.md

Scratch (all evidence images live under it): `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01`.
Render: `design-preview 08-review --phone-click` gave `pngs=21 failed=0 issues=34 states=141 seconds=372.9`; `design-check 08-review` gave `OK`. All 34 measured lines are `layout-shift` (C08). The engine hit its state cap (48) on Main and Widths and could not open the native Time zone picker, so I also drove all 34 presets at 390 (and at 820 and 1440 for the interaction checks), every Components board and every mounted part, in light, dark and sepia and at text sizes 1, 3 and 5. `state: n=` below is the preview's own numbering (`00` is the default "Cards due" state; n=1 is the first preset click, "Choice · right").

## Findings

### C01 · must-fix · part 1 · open
- board: Main.dc.html (the same parts, so also Widths.dc.html's 390 frame once a preset is pressed) · view: phone · state: n=7 "Recall · long answer" (n=6 "Recall · prompt" shows it too after Show answer; worse with "Size 5", n=37, applied)
- finding: On a recall card at phone width the two rating buttons ("I got it" and "I missed it") are wider than their column, so they touch each other at the default text size, overlap at the largest, and the right one sticks out past the column's right edge.
- evidence: Measured at 390 × 844 (the preview's phone PNGs show only the first screen of a page, so `Main.phone.state-07.png` does not show it; the pair sits 1021 px down). The recall card keeps the question-number gutter, so the pair's column is 309.6 px wide at Size 3 and 301.4 px at Size 5. Each `.rd-btn.rv-rate` has `min-width: 9.75rem` (156 px), so two buttons and the 5.6 px gap need 317.6 px. Button rects: Size 3 → x 63.5–219.5 and 221.2–377.2 (1.7 px apart instead of 5.6; right edge 4.0 px past the column edge at 373.2). Size 5 → x 71.8–227.8 and 225.3–381.3 (the buttons overlap by 2.5 px; right edge 8.1 px past the column). The highlight pair, which has no gutter, fits at both sizes (16.8–192.2, 197.8–373.2); at 820 and 1440 the recall pair fits too (380.4–536.4, 542–698). Picture, top Size 3 and bottom Size 5: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01/crops/pair-390.png`. Standard: L143 (phone width: nothing overflows sideways), L139 (larger text still holds), L102 (edges align; nothing off by a few pixels). Handoff: "Recall … each shows its interval preview" and "The interval previews … readable at 390".
- confidence: high · found_by: critic

### C02 · must-fix · part 1 · open
- board: Main.dc.html (and Widths.dc.html; the same Settings part) · view: frame, and the same CSS at phone · state: n=24 "Settings open", then type 2000 into "Reviews a day" and press "Save settings"
- finding: The invalid-field error is inserted into the form instead of having its space reserved, so every field below it jumps down when it appears and back up when it clears. The "not saved" line (n=25) reserves its space; this one does not.
- evidence: Measured at 1440 × 935. Before Save: "New highlights a day" label y 501, its field y 524, "Save settings" and "Cancel" y 739. After Save with 2000, "Enter a whole number from 1 to 999." appears at y 482 (h 19) and the label moves to y 525 (+24), its field to y 548 (+24), Save and Cancel to y 762 (+23). Retyping 150 moves them all back. The preview did not reach it: it types one valid sample per field (the phone pass typed into "Reviews a day"), so the invalid state is never entered. Pictures: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01/h-settings-typed-2000.png` and `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01/h-settings-invalid.png`. Standard: L125 (reserve an indicator's space); the operator's bar line 6 (the page holds still across states).
- confidence: high · found_by: critic

### C03 · must-fix · part 1 · open
- board: Main.dc.html (and Widths.dc.html) · view: frame and phone · state: n=30 "Limit · 200 reviews", then open "By book"
- finding: The limit state says nothing is due and that 37 cards are due on the same screen.
- evidence: Header: "0 due · 0 new highlights · 200 done today". End card: "You reached today's limit of 200 reviews. 37 more cards and 3 new highlights are due, and they wait for tomorrow." Open By book and its panel says "Nothing is due today in any book." That sentence is false in this state: `byBook()` lists no rows because the queue is held, and the empty text in `QueueHead.dc.html` does not know about the held cards. The header's zeroes also read as the day's total rather than what is available now. Picture: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01/h-bb-after-Limi.png`. The bar's line 3 (the counts are true). Handoff: "Done because a daily limit was reached … Check: it says why, and what is left for tomorrow": the end card does; the screen around it contradicts it. The same panel text is true in "Done for today" and "No cards yet".
- confidence: high · found_by: critic

### C04 · must-fix · part 1 · open
- board: Main.dc.html (and Widths.dc.html) · view: frame · state: n=24 "Settings open", save a limit, then review cards
- finding: Settings accepts a daily limit and says it is saved, but the queue never applies it, so a choice made on the page does not carry to the next screen.
- evidence: At 1440, "Reviews a day" set to 7 and saved ("Settings saved · 7 reviews and 20 new highlights a day") with "14 due · 3 new highlights · 6 done today" on screen. After one rating the header reads "13 due · 3 new highlights · 7 done today" (the limit just reached) and another card follows; after the next rating it reads "8 done today", over the limit just saved. The Limit states (n=30, n=31) exist but, as `result.md` says ("Only by the state bar: … the two limits"), no click path reaches them. The state bar satisfies reachability; this is about the bar's line 2 (a choice carries: the next screen shows that choice). Medium, because a prototype may reasonably treat the limit as a stand-in; it is a small change in `applyRating`, and the operator can overrule it.
- confidence: medium · found_by: critic

### C05 · must-fix · part 1 · open
- board: Main.dc.html (Widths.dc.html's 390 frame and Review.dc.html share it) · view: phone · state: n=2 "Choice · wrong", n=3 "Select all · partly right", n=5 "Cloze · three blanks, wrong", n=14 "Long card · document"
- finding: A visually hidden live announcement is 1 px wide with `white-space: nowrap` and no overflow clip, so its long sentence widens the page scroller to 436–598 px at 390. Nothing is visible, but the page can be shifted sideways.
- evidence: `.rd-scroll` scrollWidth / clientWidth at 390: n=2 436 / 390, n=3 547 / 390, n=5 598 / 390, n=14 436 / 390 (the right-answer and one-blank states stay at 390 / 390); at 820 and 1440 the scroller is not wider. The offenders are the two `p.qz-vh` lines (position absolute, nowrap, overflow visible), e.g. "Incorrect · 1 of 3 blanks right. Next rates it Again · in 10 minutes", which `footModel` writes. The stage clips it with `overflow-x: hidden`, so the preview's `overflow` check stays silent, but `scrollLeft = 300` moves the whole page 208 px sideways: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01/h-hscroll-shifted.png`. Standard: L143 (nothing overflows sideways). Medium because no one sees it today; the cost is one rule in `review.css` or a shorter string, and a build that scrolls the document instead of the stage would show it.
- confidence: medium · found_by: critic

### C06 · must-fix · part 2a · open
- board: Main.dc.html (also HighlightCardStates.dc.html, Widths.dc.html) · view: frame and phone · state: n=10 "Highlight · new, no note"
- finding: A new highlight says "new" twice on one row: the kind label reads "HIGHLIGHT · NEW" and a "NEW" pill sits at the right end of the same row.
- evidence: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01/sheets/ph390-sys-hl-none.png` (first screen): "HIGHLIGHT · NEW" at the left, the tag "NEW" at the right. `cardModel` sets `kindLabel = "Highlight · new"` and `tagFor` returns "New" for the same card. L131 (cut every word that adds nothing), L93 (labels say something about the content; the second "new" adds nothing).
- confidence: high · found_by: critic

### C07 · must-fix · part 2a · open
- board: Main.dc.html (also HighlightCardStates.dc.html, QueueStates.dc.html, Widths.dc.html) · view: frame at 820 and 1440 · state: n=11 "Highlight · long note", n=32 "No cards yet", n=30 "Limit · 200 reviews"
- finding: Three of the drafter's paragraphs run 80–90 characters a line at 820 and 1440, over the standard's 45–75: the highlight note, the empty-state body and the limit body.
- evidence: Each is 15 px (`0.9375rem`) with `max-width: 34rem` (544 px), which at this face is about 85 characters. Counted per rendered line, spaces included: highlight note `.rv-hl__notet` 89, 84, 80, 85, 90, 75 (6 lines); empty body `.rv-empty__body` 87 then 47; limit body `.rv-end__body` 82 then 27; the one-line bodies of "Done for today" and "Limit · new highlights" are 79 and 78. At 390 the same blocks are 50–58 and hold. The signed blocks stay within it (`rd-ed__sub` 75). L104 (body text runs 45–75 characters per line; wider gets a `max-width`): the cap is there but set too wide for 15 px text.
- confidence: high · found_by: critic

### C08 · gap · part 1 · open
- board: Main.dc.html (18 lines) and Widths.dc.html (16 lines) · view: frame · state: 00 (32 lines) and n=20 (the two Undo lines on Main)
- finding: The preview's 34 `layout-shift` lines are the matcher pairing different controls, not a control resizing while it shows its state. The signed quiz option button cannot be told apart by the matcher, and the drafter logged this (departure 10).
- evidence: Every line is `clicking '<preset>' resizes 'button.qz-opt__hit[button]' 529.3x72 -> 529.3x45.5px` (or 99 → 45.5, 99 → 72, 45.5 → 72 on Undo), or the reader's own text size ("Size 1": 529.3x72 → 535.4x63; "Size 5": → 521x84), which resizes every control on purpose. The signed option hit button is named by `aria-labelledby`, which the matcher does not read, so every option collapses into one control and "option k of this card" is compared with "option k of the next card" after a preset or Undo swaps the card. Same-card test (my harness, 1440 and 390): picking an option and grading leaves all four options at 72 / 99 / 72 / 72 px (99 / 153 / 99 / 99 at 390), the main button at 93.1 × 44, the header at 148.1 px, and the title column where it was. I could not make a real resize happen by clicking a control in place; the one real shift is C02. Listed as a gap (a signed part and the preview tool), not a must-fix: if the operator wants the lines closed, the change lives in the signed `qz-opt__hit` markup (an `aria-label` the matcher reads) or in the matcher, not in this round.
- confidence: high · found_by: measured

### C09 · gap · part 1 · open
- board: Main.dc.html (RatingStates.dc.html, Rating.dc.html) · view: frame and phone · state: any card with the rating pair (n=7, n=8)
- finding: The rating buttons' border (the signed `rd-btn--secondary` hairline) is 1.6:1 against the page, under the standard's 3:1 for UI parts. The drafter logged it (open question 12 and its gap list).
- evidence: Computed in all three themes: border rgb(216, 204, 179) on rgb(255, 254, 250) = 1.58:1 (light); rgb(69, 63, 52) on rgb(35, 32, 25) = 1.56:1 (dark); rgb(207, 184, 140) on rgb(246, 236, 214) = 1.64:1 (sepia). The label is readable and each button is 44 px or more, so the buttons are identifiable by their text. Not restyled in this round because the component is signed. L113 (3:1 for borders of inputs and other UI parts).
- confidence: high · found_by: critic

### C10 · choice · part 2a · escalated
- board: Elsewhere.dc.html and Main.dc.html (the "Open at this question →" link) · view: frame · state: n=2 "Choice · wrong", then "Open at this question →"
- wave: 07-book-page/Elsewhere.dc.html (the reader stand-in) and BookPage.dc.html
- finding: The two canvases draw the signed reader's way back differently: Review says the reader returns to Review and keeps its place, the book page says the reader's back link returns to the book page.
- evidence: Version A (this job): the reader stand-in reads "Review keeps its place: back from the chapter, the same card is waiting", with a canvas-only "‹ Back to review"; `result.md` repeats "Review keeps its place on return". Version B (07-book-page): "Its back link and “Back to the book →” return to this book page", with "‹ Back to the book" (its handoff L36–37: the signed reader's back link, "‹" and the book title from 40rem, "‹ Book" below, goes to the book page). The signed reader's own back link is "‹ <book title>" ("‹ Book" on a phone, "‹ Library" for a loose document, `ReaderTop.dc.html`), so a reader who opens a card from Review sees a back link that leads to the book page or the library, not to Review, unless the product's back follows history. Neither draft contradicts the signed reader, and this job's handoff already flags the return as open question 8. Options: (a) the reader's back link returns to where it was opened from, so Review keeps its place; (b) the signed "‹ Book" stays and the browser's Back is the way back to Review; (c) Review's link carries a visible way back. Pictures: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01/wave/07-book-page/Elsewhere.frame.png` and `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01/pass-01/Elsewhere.frame.png`.
- confidence: medium · found_by: critic

### C11 · choice · part 2a · escalated
- board: Main.dc.html (By book panel) and QueueHeadStates.dc.html · view: frame · state: n=23 "By book open"
- wave: 07-book-page/BookPage.dc.html (the book head)
- finding: The same book gets two different secondary lines: the book page shows its kind and project ("CODEBASE knowledge"), Review's By book list shows its project and the word "book" ("knowledge · book").
- evidence: Version A (07): the book head renders the manifest's `kind` as a mono caps label ("Codebase" or "Subject") and then the project, "CODEBASE knowledge" (`/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01/wave/07-book-page/Main.frame.png`). Version B (this job): the By book rows read "The knowledge maintainer guide / knowledge · book", "Tidewater, from the inside / tidewater · book" and, for the loose project, "field-notes / Documents not in a book" (`BOOKS` in `review.js`). S3's `by_book` is `{org, project, book?, book_title, due, new}`: it carries no `kind`, so Review cannot draw "Codebase" without a contract addition, and the literal "book" tells the reader nothing the row does not already say. Options: (a) Review shows only the project; (b) both show kind and project, with `kind` added to `by_book` (a P30 contract addition); (c) leave both: two surfaces, two jobs.
- confidence: medium · found_by: critic

### C12 · choice · part 2a · escalated
- board: Elsewhere.dc.html · view: frame · state: 00
- wave: 07-book-page/Elsewhere.dc.html
- finding: The two reader stand-ins label the same signed job differently: "Signed · 01-reader" and "Reader — signed" in 07, "Signed job · 01-reader" and "Reader — signed (01-reader)" in this job.
- evidence: The two `Elsewhere.dc.html` frames (paths under C10): eyebrow, title and back-link wording. For jobs that are not signed both canvases already agree ("Another job · 06-library" appears in each); for the sign-in stand-in this job writes "Another surface · auth, unchanged". This is canvas-only text with no product effect; either wording works, and one convention across the wave is the only gain.
- confidence: high · found_by: critic

### C13 · advisory · part 2b · open
- board: Main.dc.html · view: frame and phone · state: 00
- finding: Every card sits under a page title, a three-count line and a By book control, so the page reads as a work queue for a moment before it reads as a card; the operator's reference for the reading feel is "kindle like".
- evidence: The default state shows "Review", "14 due · 3 new highlights · 6 done today", "By book" and a progress line above the top bar before the card begins (`/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-08-01/pass-01/Main.frame.png`). The counts are what S3 returns and they make the day's size legible, which is the handoff's first check; the trade is orientation against calm. A header that recedes (smaller, or only on the done page) is the other end. Taste, judged against "good." and "kindle like".
- confidence: medium · found_by: critic

### C14 · advisory · part 2b · open
- board: Main.dc.html · view: frame and phone · state: n=2 "Choice · wrong", n=7 "Recall · long answer", n=8 "Highlight · with note"
- finding: The same two ratings are named three ways, and each also prints the scheduler's own words: recall says "I got it / I missed it" (signed), a highlight says "Got it / Show sooner", a quiz card says "Next" and rates silently from the grade.
- evidence: Each button's sub-line reads "Good · in 5 days" and "Again · in 10 minutes"; under a graded quiz verdict, "Next rates it Again · in 10 minutes". "Good" and "Again" are the scheduler's names (the handoff's open question 3 asks for the words). The trade is one consistent vocabulary against keeping the signed recall labels, and whether the reader needs the scheduler's words at all.
- confidence: medium · found_by: critic

### C15 · advisory · part 2b · open
- board: Main.dc.html · view: phone · state: n=2, n=7, n=14
- finding: At 390 the action that moves on (Next, or the two ratings) sits below the first screen once the answer is in; at 820 and 1440 it sits inside the first screen except on the long card.
- evidence: Measured from the top of the page (state bar excluded) against an 844 px viewport: "Choice · wrong" Next at 1016 px, "Recall · long answer" ratings at 1021 px, "Long card · document" Next at 1271 px, "Six options" at 854 px. At 1440 × 900 Next is at 822 px on "Choice · wrong" and 966 px on the long card. The foot is in flow as the signed quiz placed it; a pinned foot would stay in reach and cover the explanation, and the rating stays reachable by scrolling, which is what the handoff asks. A trade of reach against reading order, not a defect.
- confidence: medium · found_by: critic

### C16 · advisory · part 2b · open
- board: Main.dc.html · view: frame · state: n=23 "By book open"
- finding: The By book panel lists three books with their counts and does nothing when a row is tapped; a first-time reviewer will try one.
- evidence: The rows are `li.rv-book` with the default cursor and no tab stop, and clicking one changes nothing (text length and pressed preset unchanged). The rows do not look like links, so there is no broken promise, and the drafter logged it as open question 7 (a row could narrow the queue, which needs a queue-route parameter, a P30 contract addition). A product choice for the operator.
- confidence: medium · found_by: critic

## For the judge

The round's critique level is `critic`: no judge rules, so each line below goes to the operator as it is, marked unsure.

- C10: wave choice (unsure): the reader's way back to Review or to the book page.
- C11: wave choice (unsure): kind and project against project and "book" for the same book.
- C12: wave choice (unsure): the stand-in's eyebrow and title wording (canvas-only text).

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| 01 Main.dc.html (the flow) | C01, C02, C03, C04, C05 (gaps C08, C09) | C06, C07 (choices C10, C11) |
| 02 Widths.dc.html | C01, C02, C03, C04, C05 (the same parts; gap C08) | C06, C07 |
| 03 Review.dc.html (alone) | ok | ok |
| 04 Elsewhere.dc.html | ok | ok (choices C10, C12) |
| 05 QueueHeadStates.dc.html | ok | ok (choice C11) |
| 06 ChoiceCardStates.dc.html | ok | ok |
| 07 ClozeCardStates.dc.html | ok | ok |
| 08 RecallCardStates.dc.html | ok | ok |
| 09 HighlightCardStates.dc.html | ok | C06, C07 |
| 10 RatingStates.dc.html | ok (gap C09) | ok |
| 11 QueueStates.dc.html | ok | C07 |
| 12 SuspendStates.dc.html | ok | ok |
| 13 SettingsStates.dc.html | ok | ok |
| 14–20 mounted parts (Card, Rating, QueueHead, ReviewEnd, ReviewSettings, DisplayPanel, Toast) | ok | ok |

**Component gaps:** C08 (the signed quiz option button the preview's matcher cannot tell apart: 34 `layout-shift` lines, logged as departure 10) and C09 (the rating buttons' border at 1.6:1, logged as open question 12).

**2b notes for the operator:**
- The page opens with a title, a three-count line and a By book control above every card, which suits a work queue more than the "kindle like" calm the operator named (C13).
- The same two ratings carry three vocabularies (recall "I got it / I missed it", highlight "Got it / Show sooner", quiz "Next"), each printing the scheduler's "Good" and "Again" (C14).
- On a phone the action that moves on sits 170 to 430 px below the first screen once an answer is in; it is in flow as the signed quiz placed it (C15).
- By book lists the books and does nothing when a row is tapped; narrowing the queue by book needs a queue-route parameter (C16, open question 7).

**Wave look (07-book-page; 06-library and 09-legacy-and-print not yet returned, so not seen):** three choices (C10, C11, C12). The same in both: the top bar (56 px, the same side padding), the mono eyebrow (11 px, 700, 0.88 px tracking) and the tag pill, the date style ("14 Oct", "23 Oct"), the "Another job · <job>" stand-in wording, the page-level failure (the same eyebrow "ERROR · 500", the same title, one action, a ref line), the book and chapter names, and what "Clear this book's reading data" removes (07's confirm lists "your quiz answers, and the review cards from its chapters", which matches this job's note that Review's counts simply drop them). Not a finding (canvas chrome, exempt): the state bar's theme group is in three orders across the wave and the signed jobs: Light, Dark, Sepia, System (signed 02, 03, 04); System, Light, Dark, Sepia (this job); Light, Dark, Sepia (07).

**The bar:**
1. Every list item opens its own item: holds. The lists are the quiz options, the cards and By book; By book rows are read-only by open question 7 and do not look like links (C16, advisory).
2. A choice carries: C04. Everything else carries: pick, grade, Next rates, the saved line and the counts move; Display theme and size; Suspend and Undo; the where link names the right book and chapter, or document and project (checked for a chapter quiz, a highlight and a loose document).
3. Search and filters change the data, and the counts are true: C03. No search or filter exists; the counts stay true through a full walk to "Done for today".
4. The state bar: holds. 34 presets, each landing on its state; it sits above the product, scrolls away with it (neither it nor the foot strip is pinned), is sunken, dashed and system-ui with no brand accent, and "Back to the state bar" returns to it at 390 and 1440. Pressed presets follow hand interaction where one matches (Cards due, then "Choice · right" after picking B, then "Saved, next card" once the save lands). "Signed out" shows the Sign in stand-in inside the board (logged departure 9), and "Finish signing in" returns to Review at the first card; no preset leaves the board.
5. No link leaves the prototype, no `#` placeholder without a reason: holds. Every `#top` link has a handler that goes somewhere; `design-check` OK; no `dead-link`, `leaves-canvas` or `same-target-list` line.
6. Controls keep their size and the page holds still: C02. The 34 measured lines are C08 (a gap, triaged).
7. The same list header in every filter and search state: holds. Title, count line and By book stay; Loading and Failed hide the counts with `visibility`, so nothing moves.
8. Hover on primary and secondary controls: holds. A border or tint on every button and link, the label stays readable, no `hover-contrast` line; focus is a solid 2 px teal ring.
9. Back links, logo, centred column, figures, the primary action: holds. "‹ Library" and the logo go to the library stand-in; the column is centred; the action is at the end of the card or in the verdict row beside the facts it depends on (the signed quiz's own placement, L121 met).
10. One direction, no decorative SVG: holds (the logo and 24 px icons only).
11. The Toss-level lines: C01 fails L139 (larger text still holds). The rest hold: Check says "Nothing to check yet" and why; the skeleton mirrors the card; "Saving…" keeps the label width; long names, six options, a code prompt and Size 5 hold (apart from C01).

**Holds** (must survive the fixes):
- All 34 presets land and read correctly; Loading, Failed, Done for today, Limit, No cards yet and Signed out follow their handoff checks, and Failed matches the signed error rule.
- Counts and the saved line move true as cards are rated; Again returns the card to the end of the queue; Try again reuses the card's review id and sends once (`a.rate`, `a.retry`); a rating in flight blocks a second send.
- Suspend with Undo restores the same card and state; Settings keeps its value across Close, Cancel and Escape; Display changes theme and size.
- Targets: no control under 44 px at 390 in any preset; the cloze blank is 18 px and the Settings fields 16 px; Korean cards carry `lang="ko"`, `word-break: keep-all` and the Hangul face.
- Dark, sepia and Size 5 phone sheets (11 dark, 5 sepia, 8 at Size 5) show no theme-specific defect; the card body scales with the text size and the chrome does not (the signed reader's behaviour).
- All nine Components boards show every state in light, dark and sepia; the seven mounted parts render alone; the canvas rows and 80/120 px gaps are right; Widths shows 390, 820 and 1440; iPad landscape is not drawn and the logged reason (the column is the same as at 820) holds.
- No contrast, target, clipped, dead-link, image, name, unreachable or click-error line in `preview.json`.

**Not seen:**
- 06-library and 09-legacy-and-print (their drafters had not returned), so the wave look covers 07-book-page only; 07's canvas is the draft I rendered during this pass, and its own answer pass may change the wording C10 to C12 quote.
- The Time zone picker's option list (a native select the harness cannot open); only its closed state and its 16 px size.
- Pressed and active looks: I compared before and after hover pairs and measured hover contrast and the focus ring, but did not capture a pressed state.
- `prefers-reduced-motion` was read from the signed rule (`.rd-skel { animation: none }`), not run.
- Beyond the engine's 48-state cap on Main and Widths I covered the remaining states by my own preset sweep; a device keyboard rising over the cloze blank, and real iOS Safari behaviour for C05, were not run.
- 1024 × 768 and phones narrower than 390 (C01's arithmetic says a 375 px phone is worse; not measured).
