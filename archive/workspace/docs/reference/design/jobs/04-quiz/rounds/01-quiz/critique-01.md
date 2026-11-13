# Critique 01: 04-quiz/01-quiz

- pass: 01
- mode: critic
- verdict: revise
- confidence: high
- must_fix: 8 (part 1: 6, part 2a: 2)
- gaps: 1
- advisory: 5
- wave: none
- escalate: C05
- preview: 377.4s, 141 states
- standard: .claude/agents/design-drafter.md

Evidence named below (probe scripts and PNGs) is in the pass's scratch directory `critic-04-quiz-01/`; the render is its `pass-01/`. Line numbers for `reader.js`, `flow.js`, `quiz.css` and `Quiz.dc.html` are the canvas's own (`canvas/project/`); `handoff.md` and `design-drafter.md` lines are cited as "handoff L" and "craft L".

## Findings

### C01 · must-fix · part 1 · open
- board: Main.dc.html (Widths.dc.html runs the same flow) · view: frame · state: 00, then the reader's own clicks
- finding: An answer the block has just saved never comes back: leaving the chapter and returning, or switching language and back, shows the question unanswered, so "Saved for review" is not carried to the return that the handoff says shows the saved answer.
- evidence: Driven on Main at 1440 (probe35, probe36, probe35-returned.png, probe36-ko-after-live-answer.png). Tapped option A on question 1: the block read "Incorrect · Saved for review". Next, then Previous: question 1 has no selection and no status. Same after 한국어 and back to English. Cause: `reader.js` L576 pushes the attempt with `session: true`, and `savedState()` (L528) drops `session` attempts, so once `openDoc`, `lang` or `version` clears the live state nothing is read back. Only the seeded history ("On return · saved answers", board 09) shows a return, so the operator cannot make one by clicking. Handoff L229-230 ("the block shows that saved answer and its grade, and the reader can try again"), open question 3 (answers across languages), bar line 2 (a choice carries).
- confidence: high · found_by: critic

### C02 · must-fix · part 1 · open
- board: Main.dc.html · view: frame · state: 45 ("Answer not saved"), then Try again and answer
- finding: After a first attempt fails to save, the retry that does save reads "Saved · review keeps your first answer", which is untrue: the first answer never reached the server, so review keeps the retry.
- evidence: Preset "Answer not saved" reads "Correct · Not saved · check your connection". Try again, then option B: it reads "Correct · Saved · review keeps your first answer" (probe38, probe38-not-saved.png, probe38-retry-after-failed.png). `reader.js` L570-571 sets `st.later = before.length > 0` from every attempt in the history, and the attempt is pushed (L575-577) before its send settles; `settle` (L584) only changes the live state, so a failed attempt still counts as the first. Handoff L111 (the first attempt is the one that counts for review) and open question 4. The "Not saved" state is the drafter's own addition (departure 4), so its follow-on copy has to be true too.
- confidence: medium · found_by: critic

### C03 · must-fix · part 1 · open
- board: Main.dc.html (the same hint is on 02, 05, 08, 09, 10 and 13) · view: frame · state: 41 ("Cloze · typed, not checked")
- finding: The cloze hint promises "Capitals and extra spaces don't count." but the grader trims only the ends, so "write  lock" with two inner spaces is graded wrong, and the feedback then prints "You wrote “write lock”. Accepted: write lock", with the double space collapsed: two strings that look identical under a wrong verdict.
- evidence: probe8-inner-space.png: blank 1 struck through in red, "Incorrect · 3 of 4 blanks right", "1 You wrote “write lock”. Accepted: write lock or WRITE_LOCK." The hint is `reader.js` L628 and prints on every cloze; `build-prompt.md` L247 says "Inner spaces count (“write  lock” with two spaces is wrong)", so the copy contradicts the drafter's own grading. Handoff L214-215 checks that an answer differing "only in case or spaces" grades correct; handoff L107 specifies trimming, so the grading rule stays and the copy moves. Fix: say what is trimmed ("Capitals and spaces around the answer don't count.") and show the typed spacing in "You wrote" (`white-space: pre-wrap`).
- confidence: high · found_by: critic

### C04 · must-fix · part 1 · open
- board: Main.dc.html (same component on 02, 05 and 10) · view: frame · state: 00, then the first answer
- finding: The quiz head grows 3 px when the first answer is given (the "N of 7 answered" line appears), so the title and every question shift down 2-3 px under the pointer, and the head is not the same before and after; the handoff says nothing on the page moves when an item grades.
- evidence: Driven on Main at 1440 (probe14): `.qz__head` 26 px tall before and 29 px after option B on question 1; `.qz__title` top 10,247 -> 10,250 and `.qz__items` top 10,285 -> 10,287 (page y). The line is rendered only when `answered > 0` (`reader.js` L744 `hasCount`, `Quiz.dc.html` L16) and goes again when Try again brings the count back to 0. Board 05 draws a 26 px head and 29 px heads in different cells. The shift is under the engine's 4 px threshold, so no `layout-shift` line names it, and departure 7 states "nothing moves when an item grades". Handoff L249-250 and L376-377; craft L125 (reserve an indicator's space: always render it, toggle `visibility`); bar line 6 (the page holds still) and line 7 (the same header in every state). Fix: always render the count line, empty before the first answer, so the head keeps its height.
- confidence: high · found_by: critic

### C05 · must-fix · part 1 · escalated
- board: Main.dc.html, Widths.dc.html · view: frame and phone · state: 00 and after every preset
- finding: The state bar is about 10,000 px above the view when each board opens and again after every preset, so a first look at the canvas shows no bar, and each next preset needs a scroll up a 14,600 px page.
- evidence: Driven (probe39, probe40). Main at 1440x900 opens with scrollTop 10,136 of 14,602 and the 114 px bar at y -10,136; at 390x844, scrollTop 12,284 of 17,903 and the 396 px bar at -12,284. After a preset (the bar scrolled into view to press it) the page re-scrolls to the quiz (scrollTop 10,139; 12,284), so the bar is out of reach again. Widths: three bars at y -12,045, -9,904 and -9,953 above their three frames. `pass-01/Main.frame.png` shows the quiz and no bar. The group "Reader · a chapter" holds 23 states plus 4 theme and 3 size buttons. Departure 3 logs it and offers `initial('qopen')` as a one-line switch. Bar line 4; the operator's words in craft L64 ("Canvase only show state nav just very good. I Want it from every mockup") and "Prototype first" (craft L47). Operator rule 1 (never pinned) rules out pinning, so what is left to change is the distance between the bar and what it controls: open at the top so the bar is the first thing seen, and put less page between the bar and the quiz (a shorter chapter, or the loose document as the default view). Standoff with departure 3: its reason (bar rule 1) explains why the bar scrolls away, not why this much page sits between the bar and the quiz. Unsure: rule 1 itself (the operator, 2026-10-19: "prototype state too big. which is fine. but just make it doesn't follow scroll.") accepts a big bar that scrolls away, and opening at the top still leaves the same distance to the quiz.
- confidence: medium · found_by: critic

### C06 · must-fix · part 1 · open
- board: Main.dc.html, Widths.dc.html · view: frame · state: - (the three presets sit past the engine's 47-state cap)
- finding: Three presets land correctly but the bar then shows none pressed ("한국어 · cloze, Korean answer", "20 questions · 7 answered", "Quiz in a document"), so the bar reads as if the press failed; the recipe says the pressed preset is the one matching the current state.
- evidence: Pressed one by one after a fresh load at 1440 (the two chapter presets also at 390 and on Widths) (probe43, probe44, probe48, probe49). The other 22 of the 25 chapter and document presets read pressed; these three leave only the theme and size buttons pressed, and stay so after 3 s. Each landed as labelled (the Korean chapter with one graded cloze; the 20-item Tidewater quiz with 7 answered; the loose document's quiz). Cause for the first two (probe47): `pressedKey` (`flow.js` L117) compares the live scene with the preset's own scene, and the live one has moved on: for "20 questions" the live `sec` is null against "twenty" (at the top against in the text); for the Korean cloze the reading state is "finished" against "started". The pressed marker does follow the reader's own clicks correctly elsewhere (probe42). Craft L69 (the bar recipe: "the pressed preset is the one matching the current state"); bar line 4.
- confidence: high · found_by: critic

### C07 · must-fix · part 2a · open
- board: Reader.dc.html · view: frame · state: 00
- finding: Board 03, titled "Chapter screen alone (the signed reader, carrying the quiz)", shows only the chapter's opening in its frame, so the board meant to show the screen this job made shows no quiz, and what the eye lands on is the chapter title.
- evidence: `pass-01/Reader.frame.png`: "Chapter 2 of 5", the chapter title, the standfirst, "In this chapter" and the bottom bar. The quiz is in the page 10,100 px lower (probe50: scrollHeight 14,488, quiz top 10,100), behind a fixed 1440x900 frame that does not scroll (departure 6 keeps the signed non-interactive flags). Craft L96 (one focal point: the intended thing is what you see first). The flags can stay as signed: show the quiz inside the frame (a chapter whose quiz sits in the first 900 px), or retitle the board to say what it shows.
- confidence: high · found_by: critic

### C08 · must-fix · part 2a · open
- board: Main.dc.html (the same `.qz-blank` is on 02, 08, 10 and 13) · view: frame and phone · state: 41, then a long value and Check
- finding: A graded blank clips a long typed answer mid-glyph with no ellipsis ("postgresql dat", "the write lock" with half a glyph), a crop by accident; the full text is only in the "You wrote" line below.
- evidence: probe11-d-long-wrong.png (1440) and probe11-p-long-wrong.png (390): typed "postgresql database" in blank 4 and "the write lock of the content database" in blank 1, then Check; the struck text is cut by the blank's edge. The blank is `min(7.5em,100%)` wide on purpose so its length gives nothing away (`quiz.css` L125-128), and the graded blank is read-only with no `text-overflow`. No board as drawn shows it (none of the 29 graded blanks on 08, 09 and 13 overflows); it needs a long typed value, which the handoff allows ("any text"). Craft L149 (deliberate crops: long text cut on purpose, with an ellipsis or a fade, never by accident). Fix: `text-overflow: ellipsis` on the graded blank; the width stays, so nothing moves.
- confidence: medium · found_by: critic

### C09 · gap · part 1 · open
- board: ChoiceStates.dc.html (every option on 01, 02, 05, 06, 09 and 10) · view: frame · state: all
- finding: The signed `.rd-opt` border (`kb-border-strong` on `kb-surface`) is 1.58:1 in light and 1.56:1 in dark, under the 3:1 the standard asks for the border of a UI part; each option is still identified by its key ring (7.48:1 light, 7.32:1 dark) and its text.
- evidence: Computed from `ds/kb/tokens.css`: #d8ccb3 on #fffefa = 1.58; #453f34 on #232019 = 1.56 (the drafter's table gives the light value only). Logged by the drafter (departure 8 and "Component and token gaps") and left as signed. Craft L113. For the operator and the system: a stronger border token for options, or a hover and selected ring, would meet 3:1; it is not the drafter's to fix.
- confidence: high · found_by: critic

### C10 · advisory · part 2b · open
- board: ChoiceStates.dc.html (every graded choice) · view: frame · state: 00
- finding: Option tags ("Your answer · correct", "Correct answer") sit on the option's top border and clear the option above by about 3 px at every text size, because the gap between options is the fixed 9.6 px step and half the 15 px tag rises into it.
- evidence: probe16-tag-clearance.png: 3.1 px between the tag's top and the previous option's bottom border at sizes 1, 3 and 5. The tag reads as its own option's because it breaks that option's border; a larger gap would calm the stack at the cost of a longer list. Against the system's "well-set page first".
- confidence: medium · found_by: critic

### C11 · advisory · part 2b · open
- board: QuizStates.dc.html, ChoiceStates.dc.html · view: frame · state: a wrong answer
- finding: A wrong choice speaks four ways at once (the struck numeral, the tinted red row, the filled red key, the word and tag "Incorrect" and "Your answer · incorrect"); against "good.", "kindle like" and the system's "well-set page first and an app second", the strike and the words would carry it alone, and the tint is the loudest thing on the page.
- evidence: `pass-01/QuizStates.frame.png` question 2, ChoiceStates "Tapped a wrong option": the right option is also marked with a teal border and a tag, so one wrong tap shows two outlined rows and a tinted one. Taste, against the handoff's taste words; the marks are the drafter's one bold move and state is never told by colour alone, which is why this is not a defect.
- confidence: medium · found_by: critic

### C12 · advisory · part 2b · open
- board: Main.dc.html, Quiz.dc.html · view: frame · state: any graded question
- finding: The explanation opens inline and pushes every later question down by its height (about 260 px for question 1 at 1440), so a reader who goes straight to the next option has to re-aim; the answered item's own rows hold still, as the handoff asks. A drawer would hold the page still but lose the continuity of a printed workbook.
- evidence: probe14: `.qz__items` 3,059 -> 3,318 px after answering question 1. Handoff L249 ("a reader can keep their place"). A trade-off, not a miss.
- confidence: medium · found_by: critic

### C13 · advisory · part 2b · open
- board: ClozeStates.dc.html, Main.dc.html · view: frame and phone · state: any cloze
- finding: A cloze line is about 55 px at the default text size (the 44 px blank plus air) against 30 px for prose, so a two-sentence cloze takes three lines at 1440 and five or six at 390; a denser paragraph would need a smaller blank target.
- evidence: probe24-390-all.png (sizes 1, 3 and 5 at 390), `pass-01/Main.frame.png` after "Cloze · typed, not checked". The cost of the 44 px target the handoff asks for; it reads airy beside the prose, which is the trade.
- confidence: medium · found_by: critic

### C14 · advisory · part 2b · open
- board: ReturnStates.dc.html, Main.dc.html · view: frame · state: 44 ("Second attempt, after Try again")
- finding: The rule that review keeps the first answer is told only after a second attempt has saved ("Saved · review keeps your first answer"); a reader who retries to correct a miss learns it afterwards. Saying it at Try again would trade a calmer block for no surprise.
- evidence: `reader.js` L606 (`LONGSUB` only when `st.later`); no text at "Try again" before the second answer. The drafter's call on open question 4, left to the operator.
- confidence: medium · found_by: critic

## For the judge

- C05 · standoff: a must-fix against departure 3 (the board opens on the quiz, the bar about 10,000 px above the view). The reason logged explains why the bar scrolls away, not the distance to what it controls. Under `critic` alone this goes to the operator as it is, marked unsure.

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| 01 · Page — Quiz in a chapter (Main) | C01 C02 C03 C04 C05 C06 | C08 |
| 02 · Page — The quiz at 390, 820 and 1440 (Widths) | C03 C04 C05 C06 | ok |
| 03 · Page — Chapter screen alone (Reader) | ok | C07 |
| 04 · Page — Stand-in (Elsewhere) | ok | ok |
| 05 · Component — Quiz block (QuizStates) | C03 C04 | ok |
| 06 · Component — Choice question (ChoiceStates) | ok | ok |
| 07 · Component — Recall question (RecallStates) | ok | ok |
| 08 · Component — Cloze question (ClozeStates) | C03 | ok |
| 09 · Component — Saved answers, retry, signed out (ReturnStates) | C03 | ok |
| 10 · Mounted part — Quiz block (Quiz) | C03 C04 | ok |
| 11 · Mounted part — Choice question (QuizChoice) | ok | ok |
| 12 · Mounted part — Recall question (QuizRecall) | ok | ok |
| 13 · Mounted part — Cloze question (QuizCloze) | C03 | ok |
| 14 · Signed reader, copied — Top bar | ok | ok |
| 15 · Signed reader, copied — Chapter bar | ok | ok |
| 16 · Signed reader, copied — Chapter opening | ok | ok |
| 17 · Signed reader, copied — Prose | ok | ok |
| 18 · Signed reader, copied — Callout | ok | ok |
| 19 · Signed reader, copied — Code block | ok | ok |
| 20 · Signed reader, copied — Table | ok | ok |
| 21 · Signed reader, copied — Chapter list | ok | ok |
| 22 · Signed reader, copied — Chapter end | ok | ok |
| 23 · Signed reader, copied — Sign in to save | ok | ok |
| 24 · Signed reader, copied — Display panel | ok | ok |
| 25 · Signed reader, copied — Version history | ok | ok |
| 26 · Signed reader, copied — Loading, not found, failed | ok | ok |

**Component gaps:** C09, the signed `.rd-opt` border at 1.58:1 light and 1.56:1 dark, logged by the drafter (departure 8). No other gap: the design system carries tokens only, and every part is a canvas component mounted with `dc-import`.

**2b notes for the operator:**
- Option tags ("Your answer · correct", "Correct answer") sit on the option's top border and clear the option above by about 3 px; they read as their own option's, and a larger gap would calm the stack at the cost of a longer list (C10).
- A wrong choice speaks four ways at once (struck numeral, tinted red row, filled red key, the word and tag); against "good.", "kindle like" and "well-set page first", the strike and the words would carry it alone, and the tint is the loudest thing on the page (C11).
- The explanation opens inline and pushes every later question down by about 260 px, so a reader who goes straight to the next option has to re-aim; a drawer would hold still but lose the printed-workbook continuity (C12).
- A cloze line is about 55 px against 30 px for prose, the cost of the 44 px blank: a two-sentence cloze takes three lines at 1440 and five or six at 390 (C13).
- "Review keeps your first answer" is told only after a second attempt has saved; saying it at Try again would trade a calmer block for no surprise (C14).

**The bar:**
1. Every list item opens its own item: holds. The engine's `same-target` check is clean across 141 states; the chapter rows and the "In this chapter" rows each go to their own place; each question grades alone (answering question 1 leaves question 2 untouched).
2. A choice carries: C01 (a saved answer does not come back), C02 (a failed save counted as the first).
3. Search and filters change the data, and the counts are true: holds. This job has no search or filter; the counts it shows ("N of 7 answered", "k of N blanks right", "7 questions", "20 questions · 7 answered") match what is on the page in each state read.
4. The state bar: C05 (about 10,000 px above the view on open and after every preset), C06 (three presets land with none pressed). Otherwise it is on both interactive Pages, named by page, lists only that page's presets, lands each one, clears the pressed marker after the reader's own click (probe42), and is sunken, dashed and free of the brand accent.
5. No link leaves the prototype: holds. `design-check` is OK (no `leaves-canvas`, no `same-target-list`); the render has no `dead-link` or `unreachable` line; the NOAA link in a graded explanation opens the in-canvas "External link — outside the canvas" stand-in (probe51); the in-chapter links are real `#the-two-planes` and `#the-publish-worker` anchors, and the others carry `href="#top"` under click handlers that resolve, the signed reader's own mechanism (as the 01-reader critique found).
6. Controls keep their size and the page holds still: C04 (the head grows 3 px). Weighed, not filed: the render's 66 `check=layout-shift` lines, all `header.rd-top` (Main frame 30, Main phone 26, Widths 10). The signed reader's absolutely positioned header sits at y 3 once the page's bar has scrolled out of view and at the bar's height plus 3 (117 px desktop, 399 px phone, 159, 299 and 476 on Widths) while the bar is in view, and a preset or a chapter change scrolls the page between the two (probe37). That is the bar's own mechanics under operator rule 1 and the signed header's `top: 3px`; the 01-reader/02-revise critique weighed 80 such lines the same way (its bar line 6) and that round was signed. The orchestrator can overrule. Departure 7 counts 15 lines on 02; this render shows 10 on 02 and 56 on 01, so the log undercounts.
7. The same list header in every state: C04 (the count line is absent before the first answer and present after).
8. Hover: holds. An option's border turns `kb-accent` and the label stays readable (probe2-hover-opt.png); the engine's hover contrast re-measure found no line across 141 states.
9. Back links, logo, centred column, aligned figures, decisive primary: holds. "‹ The knowledge maintainer guide" and "‹ Previous" carry the chevron; the signed top bar's book mark is the library link; the 36rem column is centred; Check sits at the end of the content it acts on.
10. One direction, no decorative SVG: holds. The handoff asked for no options; there is no `<svg>` anywhere in this job's boards, and the numeral's circle and slash are CSS.
11. The Toss-level lines: holds. A single choice grades on tap, an empty Check says why ("Nothing to check yet · Choose at least one answer first"), the send shows "Saving…" then "Saved for review" or "Not saved · check your connection", and long options, two-line labels and sizes 1, 3 and 5 hold at 390. The copy-truth misses are filed as C02 and C03.

**Holds:**
- The engine and the record: 26 boards, 27 board PNGs and 141 state PNGs, no click error, and no contrast, target, clipped, overflow, unmounted, runtime-error, page-clip, hover-contrast or same-target line; 0 contrast, target and clipped items across all 141 states; `design-check 04-quiz` is OK on 26 boards with no warning.
- The handoff's state checks hold on the canvas: single and multi choice (unanswered, right, wrong with the right answer shown, selecting, empty Check, "Incorrect · partly right"); recall (hidden, shown, got, missed); cloze (empty, typed, right with case, end spaces and an alternative, partly right with what each blank accepted, five blanks, decomposed Hangul typed and accepted); saving and not saved; retry; on return (this version, an older version unchanged, an item changed since starts fresh, 한국어 from an English answer, a cloze answered in English starts fresh in Korean); signed out (answers and grades, nothing claims to save, Sign in to save opens once under the first answer, Not now keeps the next answer quiet); two and six options, a long option, inline code, a prompt with a link; one item untitled; twenty items; the loose document's quiz (reached from the chapter link "SQLite's write-ahead log, in practice").
- At 390 in text sizes 1, 3 and 5 the blanks are 44 px tall with a font of at least 16 px, nothing scrolls sideways, and the cloze wraps cleanly (probe24-390-all.png).
- State is never told by colour alone: the numeral's circle or slash, the words and the option tags carry it (craft L112).
- Sign in to save is reused as signed with `what` = "quiz answers"; "Sign in" goes to the stand-in, which says where the reader comes back to, and "Finish signing in" returns to the same chapter with the quiz in view, signed in and the saved history showing (probe5, probe52).
- Real data: the maintainer-guide quiz text matches the chapters on `origin/main` for chapters 1 and 2; Tidewater and the money notes are invented and labelled so; no secrets, emails or personal data anywhere in the job's canvas or round folder (scanned).
- `quiz.css` uses tokens only: no raw colour, spacing from the scale (the reader's own `--rd-k` scaling), one deliberate bold move (the grading margin) and quiet everything else (craft L91).
- Retry for recall and cloze is reachable by clicking Try again on Main (it returns the item to Hidden or Empty); board 09 draws the retry states for the choice type only.

**Not seen:**
- Hover, focus and pressed looks on Check, Try again, Show answer and the Sign in card's buttons: only an option's hover and focus were screenshotted (probe2), plus the engine's hover contrast re-measure.
- What a screen reader announces (the per-item polite live region): the markup is in `build-prompt.md`, not heard.
- The engine's click walk stopped at 47 of 48 states on Main frame, Main phone and Widths, so presets past the 47th were driven by my own probes (every chapter and document preset pressed once at 1440, four of them also at 390); the 66 `layout-shift` lines come from the walked states only.
- Phone views of the static Pages 03 and 04 and of the Components boards (no `--phone` run); 390 was judged on Main.phone, the Widths 390 frame and my 390 probes.
- C01 and C02 were driven on Main only; Widths runs the same `flow.js` and `reader.js`, so they reproduce there by the same code path, not re-driven.
- The twenty-item quiz's rows were sampled by the engine (first, second, last), not each clicked.
- The mid-send race ("a preset pressed mid-send never receives the result") was not held open and tested.
