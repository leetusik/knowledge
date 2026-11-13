# Judge 01: 06-library/01-library

- pass: 01
- mode: judge
- verdict: revise
- confidence: medium
- must_fix: 1 (part 1: 1, part 2a: 0)
- gaps: 0
- advisory: 0
- wave: 07-book-page, 08-review, 5 choices ruled (2 upheld, 3 dropped)
- escalate: none
- preview: reused the critique's render (`critic-06-01/pass-01`, 324.5s, 141 states) and its `wave/` renders; no new run
- standard: .claude/agents/design-drafter.md

Ruled on the six ids `critique-01.md` escalated: C05 (low-confidence must-fix) and the five wave choices C12–C16.
Nothing else on the canvas was judged; the other open must-fixes (C01–C04, C06–C10) stay with the drafter's answer
pass as the critique wrote them. Evidence paths under `pass-01/`, `hx/` and `wave/` are in the critique's scratch
directory `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-06-01/`.

### C05 · upheld
- reason: Upheld, narrowed to the fix the critic named. The four 'Clear all' presets set the state and leave the
  operator at the top of the page with nothing on screen changed but the pressed button; in Play that is a preset
  that does not visibly reach its state (drafter line 64: the bar "reaches the states no click can"; line 69: it
  "lands exactly where clicking would", and clicking the trigger lands with the panel in view). The drafter is
  **not** asked to scroll: the engine's anchors are page-relative (`r.top + scrollY`, `workflow.py` line 6173), the
  shell's topbar is `position: sticky`, so any scroll reads as `header.kb-topbar y 88->1978`, a measured
  `check=layout-shift`; and a dialog is against the REFERENCE's inline two-step rule. Bar line 6 therefore yields
  nothing. The fix inside both lines is canvas chrome: while a 'Clear all' preset is pressed, the bar's group shows a
  short note ("the confirmation is at the foot of the page", or the like), as the bar already carries an "only
  state" note on the stand-ins (line 71). The operator's standing rule (the bar scrolls away, never pinned) means
  they scroll anyway; the note tells them where to. The same holds on Widths' four bars.
- evidence: `hx/inter/preset-clear-confirm-1440.png` and `-390.png` (page top unchanged but for the pressed
  button; the panel at y 2462–2801 and 3030–3459); the critic's `hx/scrollshift.py` run and the engine's
  `design_preview_shifts` (line 6699, a moved header is a shift); 07-book-page chose the same no-scroll answer
  (its result, "these show only in Play"), so the family is consistent either way.
- confidence: medium

### C12 · dropped
- reason: Both frames are each drafter's drawn answer to a question the handoff flags for the operator and says
  "reaches the operator as a wave choice" (handoff lines 165–167 and open question 2; 07's and 08's results say the
  same). Neither side contradicts the system or a signed job: the system's README calls the product "a reading room
  ... plus a quiet console around it" and the signed reader's logo calls the library home, which leans to the
  reader's chrome; but the shell must carry Library and Review as entry points anyway (scope item 3, this job's),
  and the handoff's own check (console and library one step apart each way) holds either way. A redraw of the
  library's frame is not a short answer-pass fix and would settle a flagged operator question on a judge's reading.
  So this job keeps its frame **and no change is carried to 07 or 08**: the orchestrator shows the two frames side by
  side at PENDING (`pass-01/Main.frame.png` against `wave/07-book-page/Main.frame.png` and
  `wave/08-review/Main.frame.png`) and the operator's words settle it for all three jobs.
- evidence: handoff lines 32–36, 142–143, 165–167, 261–262, 544–546; `pass-01/Main.frame.png` (app shell: topbar,
  rail with Reading and Org groups); `wave/07-book-page/Main.frame.png` and `wave/08-review/Main.frame.png` (slim
  reader bar with '‹ Library').
- confidence: medium

### C13 · dropped
- reason: The theme rule follows the frame, so this rides with C12: a page inside the app shell follows the app's
  rule (the OS, no sepia), a page in the reader's chrome follows the reader's Display setting. On the record this
  job's side has the system behind it (the README names two themes; the handoff's inventory lists "no sepia outside
  the reader" as a known gap; the signed reader's build prompt scopes sepia to the reader), while 07 and 08 extend a
  reader-scoped value, which each logged. Open question 1 is flagged to the operator by every handoff in the wave;
  no drafter changes a theme rule before the operator speaks, and nothing is carried to 07 or 08. The operator
  decides C12 and C13 together.
- evidence: handoff lines 92–94, 394–396, 422, 539–543; this job's result open question 1; 07's result lines
  265–270; 08's result lines 219–223; the `kb` README's "Themes" (two themes).
- confidence: medium

### C14 · dropped
- reason: The wave keeps this job's confirmation, so 07-book-page takes its form (the orchestrator carries it). The
  product's own destructive pattern, quoted as REFERENCE, is "Delete permanently? This can't be undone." / Cancel /
  "Yes, delete" / "Deleting…", inline, the trigger replaced by the prompt, Cancel focused; this job's "Clear all
  reading data?" / "It can't be undone." / "Yes, clear all reading data" / "Clearing…" is that pattern, and 07's
  drops the "Yes," and rewords the keep line. Beyond the words: this job keeps Cancel in place, dimmed and disabled,
  while clearing, where 07 removes it and leaves the danger button alone (drafter line 125, a control's state never
  changes what is around it); this job's failure carries the system's mono reference line ("ref · clr-5e81b0d4",
  the README's error rule and the product's `ErrorRef`), 07's has none; and this job's trigger is a neutral
  secondary button with the danger colour reserved for the second press (the system's one-accent rule), where 07's
  is red at rest. What 07 keeps: its own nouns ("this book", "3 chapters", its cleared line naming the book), the
  neutral title form "Clear this book's reading data?" is fine, but the confirm reads "Yes, clear this book's
  reading data", the keep line ends "It can't be undone.", Cancel stays disabled while clearing, and the failure
  gets a ref line. Neither side contradicts a signed board; the REFERENCE and the system's states rule decide it.
- evidence: `pass-01/ClearStates.frame.png` against `wave/07-book-page/ClearStates.frame.png`; handoff lines
  388–391 (REFERENCE) and 384–387 (`ErrorRef`); `ClearAll.dc.html` lines 17–33 and 07's `ClearData.dc.html` lines
  17–26.
- confidence: medium

### C15 · upheld
- reason: Upheld for the zero-state wording only. The handoff asks the card to match the reader's "X of M finished"
  for the same book, and the signed reader produces a zero for a member who has finished nothing: its Contents head
  reads "Chapter N of M · X of M finished" (build prompt line 521), and "X of M finished" is the member's form at
  the chapter end (line 424). In the signed words "Not started" is a chapter's state (`unopened`, line 441) and
  "M chapters" is the signed-out form (line 424), so a member's unopened book on the card mixes a chapter word with
  the signed-out word. The card reads "0 of 4 finished" (the bar empty) for a member's unopened book, as 07's head
  does; the signed-out card keeps "4 chapters". The bar's position (above the label on the card, below it on the
  book head) is not a defect on either side: the signed reader draws no book bar, the two sit in different objects
  (a card's foot, a page head), and the words agree once the zero is fixed; neither drafter changes it.
- evidence: `pass-01/BookCardStates.frame.png` ("Not started · 4 chapters", the first cell in each theme);
  `wave/07-book-page/Main.frame.png` ("2 of 5 finished" over its bar) and 07's `BookHead.dc.html` line 21 /
  `book.js` line 225 (`done + " of " + M + " finished"`); reader build prompt lines 424, 441, 448, 521.
- confidence: medium

### C16 · upheld
- reason: Upheld on both words. The handoff names "Continue reading" as the contract's and the signed reader's word
  (line 333); 07 and 08 both draw "Continue reading →" as the action, and this job shortens it to "Continue →" under
  a "Continue reading" heading, so the action changes its name inside the family (drafter line 131, keep the same
  action name through the flow). The next-chapter offer is signed: the reader's chapter end's one primary button is
  "Read next →" (build prompt lines 421 and 761), which 07 keeps and this job renames "Start chapter 3 →". This job
  takes "Continue reading →" on the lead and "Read next →" after a finished chapter (its "Up next · you finished
  chapter 2" eyebrow and the chapter's title already say which chapter). The place line stays as drawn: the signed
  resume line is "Picked up where you left off" (line 237), closer to this job's "Left off at" than to 07's "You
  stopped at", which is 07's critic's to carry. Both labels fit at 390 (07's phone view shows "Continue reading →"
  in a narrower column).
- evidence: `pass-01/ContinueStates.frame.png` ("Continue →", "Start chapter 3 →"); `ContinueReading.dc.html` line
  40; 07's `Continue.dc.html` lines 41–42 ("Continue reading", "Read next"); 08's `review.js` line 424 ("Continue
  reading →"); reader build prompt lines 237, 421, 761.
- confidence: high

## What this leaves open

- Must-fix from the escalated set: C05 (part 1), narrowed to the bar note. The drafter also takes the two upheld
  wave choices, C15 (the zero wording) and C16 (the two labels), in the same short pass.
- Carried to the other jobs by the orchestrator: C14 only (07-book-page takes this job's confirmation form). C12 and
  C13 are carried to the operator, not to a drafter.
- The verdict is `revise` because C05 stays upheld; the critique's other must-fixes are untouched by this ruling.
