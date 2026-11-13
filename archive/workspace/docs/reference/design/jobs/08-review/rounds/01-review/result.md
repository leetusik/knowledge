# Result — job `08-review`, round `01-review` (slice P29.S6)

This is the first draft of the review surface: one direction, extending the signed reader, the signed quiz and the
signed annotations. The canvas tree is `jobs/08-review/canvas/project/` (20 boards). The implementation contract is
`build-prompt.md`, beside this file.

## Intent, one line per Page

- **01 · Page — Review (the flow), and 03 · the screen alone.** The reader is back for today's reviews, on a phone, an
  iPad or a Mac, signed in. They came to clear what is due, one card at a time, without losing their place in the
  books. What they see first is how much is due (the counts line), and then the card in front of them: one question or
  one highlight, and the one thing to press.
- **02 · Page — Review at 390, 820 and 1440.** This is the same state shared by three frames, so the operator can play
  the flow at phone, iPad and desktop at once. The first thing to see is that the card, the ratings and the way back
  hold at every width.
- **04 · Page — Stand-in for another job's screen.** This is where a click leaves review: the signed reader at the
  card's block, the library, or sign-in. The first thing to see is where the reader would be, and how they come back.

## Plan (written before the first board)

- **The boards:**
  - **Pages:** 01 the flow (`Main`, PAGE, interactive), 02 the three widths (`Widths`, interactive), 03 the screen
    alone (`Review`), 04 the stand-in (`Elsewhere`, copied from the quiz snapshot and extended).
  - **Components:** 05 Queue header, 06 Choice card, 07 Cloze card, 08 Recall card, 09 Highlight card, 10 Ratings, Next
    and interval previews, 11 the queue's other states, 12 Suspended, with undo, 13 Review settings.
  - **Mounted parts:** 14 Card, 15 Ratings, 16 Queue header, 17 ReviewEnd, 18 ReviewSettings, plus the copied signed 19
    Display panel and 20 Undo line.
- **The look:**
  - **The frame:** the signed reader's frame and chrome. A 3 px progress line and a 3.5rem sticky top bar sit above one
    centred 36rem column, with no app shell (Q2).
  - **The card:** a page between two strong hairlines, never a box. The quiz's parts are used as signed. A highlight
    takes the signed paint.
  - **Type steps:**
    - the display face at `rd-fs × 1.45` (the page title), `× 1.18` (end titles) and `× 1` (section, empty);
    - the reading face at `rd-fs` (the question) and `rd-fs × 1.18` (the quote);
    - the interface at 15 and 13 px;
    - the 11 px mono label.
  - **Spacing:** the `kb-space` scale × `rd-k` in the column.
  - **Colour:** `kb-ink` and `kb-secondary` for every text, the status roles only for the quiz's own marks and words,
    and the accent only for the primary button (Next, Try again, Save settings, Continue reading), links and focus.
- **The one bold move:** the highlight card's quote is set at the lede step, in the reading face, with the signed paint,
  as the reader met it on the page. Everything around it is quiet: the mono kind label, 13 px sources, and the
  where-block in the interface face.
- **Plan review against the handoff and the operator's bar.** Two parts of the plan were held against "the default you
  would draw for any similar product" and kept only where they are this product's choice:
  - **The ratings' place.** The default a flashcard app draws is a sticky rating bar pinned to the foot of the window.
    It is rejected here: it would cover the quiz's explanation, and the signed quiz already puts its action at the foot
    of the item. The ratings sit in the card's own foot, in the quiz's status | action grid.
  - **The counts.** The default stats header is a row of three big numbers. It is rejected for one counts line in words
    and numbers (the handoff's check: "each count reads in words and numbers"), because the system's character is
    "hairlines instead of boxes".
  - The state bar is the first row of the scrolled page and scrolls away (bar rule 1).
- **States per Page:** every state the handoff's *Screens × states* names is reachable on 01 and 02. Each is reachable by
  a click, or by one of the state bar's 34 presets plus its theme and text-size rows (see *States reached only by
  interaction*).

## What was designed

- **01 · Page — Review (the flow)** (`Main.dc.html`, 1440 × 935, fill, interactive).
  - It is one state for the whole prototype (`RV.flow`).
  - It mounts `Review` while on review, and `Elsewhere` while away (the reader, the library, sign-in).
  - The state bar (34 presets, `· theme:` and `· text size:`) is the scroller's first row. The foot strip links the
    screens alone.
  - Answering, Check, Show answer, Next, the two ratings (with a 900 ms simulated save), Try again, Suspend and Undo,
    By book, Settings (validation and save), Display (theme and size), the way back into the chapter, Continue reading,
    Open the library, and Finish signing in all work.
- **02 · Page — Review at 390, 820 and 1440** (`Widths.dc.html`, interactive): the same flow in three frames that share
  one state. A click in any frame moves all three.
- **03 · Page — Review screen alone** (`Review.dc.html`): the screen with its default props (cards due, light). It is
  the board 01 and 02 mount.
- **04 · Page — Stand-in** (`Elsewhere.dc.html`): the quiz round's stand-in, copied, with three kinds added:
  - "Reader — signed (01-reader)", naming the chapter, the quiz or highlight, and the book line, with "‹ Back to
    review";
  - "Library — another job (06-library)";
  - "Sign in — another surface" for `/review` signed out, with "Finish signing in".

  It also gained a `proposal` prop: the grey canvas-only box for open question 10.
- **05–13 · Components.** Each board shows its states in light, dark and sepia, with each state captioned:
  - Queue header (9 states, with the daily limit's held cards since critique pass 01);
  - Choice card (9);
  - Cloze card (5);
  - Recall card (4);
  - Highlight card (5);
  - Ratings, Next and interval previews (12, including two phone-width cells and a years sample);
  - Done for today, the limits, no cards, loading and failed (8, including two phone cells);
  - Suspended, with undo (2);
  - Review settings (4).
- **14–18 · Mounted parts:** `Card`, `Rating`, `QueueHead`, `ReviewEnd` and `ReviewSettings`, each taking its view model
  as a prop and rendering a sensible default alone.
- **19–20:** the signed `DisplayPanel` (01-reader, via the quiz snapshot) and `Toast` (05-annotations), copied
  unchanged.

## Data

- **Real repo data:**
  - the knowledge maintainer guide's real chapter titles (via the signed `reader.js`), in English and 한국어;
  - the signed quiz's own items: the guide's `#check` (chapter 2, "Check what stuck", in English and Korean) and
    Tidewater's `#twenty`;
  - the signed annotations' seed highlights `a2`, `a3`, `a7`, `a8`, `k3` and `s1`, with their notes (via `annot.js`,
    `AN.seed`).
- **Invented for this canvas** (in `review.js`):
  - **The reader:** "Ari Han (invented; no email)", in Asia/Kolkata (UTC+05:30). The clock is the quiz canvas's `NOW`
    (2026-10-20T09:30:00Z), and the review day starts at 04:00.
  - **The SQLite document's quiz** `#wal-check` ("Check the log"):
    - `wal-one`, a cloze with one blank;
    - `wal-three`, a cloze with three blanks;
    - `wal-long`, a six-option choice with code and a long explanation;
    - `wal-why`, a recall with a long answer.

    They are written on the document's own text and injected into `doc/field-notes/sqlite-wal` v2 on the canvas only.
  - **The queue:** 14 due cards, 3 new highlights and 6 done today.
    - It includes an overdue relearning card first ("due 2 days ago"), a card reset by drift, a card made today, a
      Korean card, a loose-document card, a six-option card and a 500-character note.
    - Each card has its own interval previews: Again is 10 minutes; Good runs from 1 day to 3 months.
  - **The 200-due scene's by-book numbers:** 96 / 63 / 41.
  - **The limit states** (since critique pass 01) hold the real queue: at the reviews limit, its 14 due cards and 3
    new highlights with 200 done; at the new-highlights limit, the 3 new highlights with 20 new done and 31 done.
  - **The next due time:** "tomorrow at 07:15".
  - **The continue-reading pointer:** Tidewater chapter 11, "Storm surge: when the model is wrong", 46% read (from the
    signed reader's Tidewater sample).
  - **The error reference:** `rv-3c81f0a2`.
  - **The settings' validation bounds:** 1–999 and 0–999.
- **Placeholders:** none. Every value shown is a sample, labelled as such in the build prompt.
- **Never on the canvas:** no email, no secret, no glide-ilab or base material, and no arb_upbit_1 content.

## Files copied from the signed rounds (unchanged, byte-identical; checked with `cmp`)

| File | From |
|---|---|
| `reader.css`, `quiz.css`, `reader.js`, `assets/logo.svg`, `DisplayPanel.dc.html` | `04-quiz/rounds/01-quiz/canvas/project/` (the reader's files as the quiz round carried them) |
| `annot.css`, `annot.js`, `Toast.dc.html` | `05-annotations/rounds/01-annotations/canvas/project/` |
| `Elsewhere.dc.html` | `04-quiz/rounds/01-quiz/canvas/project/`, **copied and extended**: three kinds, the `proposal` prop and its box, `hasBack` and `hasDetail`, and `review.css` in its head. Every original kind is unchanged |

Review's own files are `review.css`, `review.js` and the 17 other boards. The signed snapshots were never written to.

## Where review's version of a signed part differs (each logged; the signed part stays as signed)

1. **The quiz's foot.**
   - In the reader, a wrong answer offers **Try again** (re-answer), and a right one shows the save line.
   - In review, the graded item's one button is **Next**, which rates it (right → Good, wrong → Again). The sub-line
     says so before it is pressed ("Next rates it Again · in 10 minutes").
   - "Try again" in review means only "resend a rating that failed".
   - The quiz's "Saved for review" line does not show on a card. The header's saved line says what was saved.
2. **Single choice before grading.** The signed item has no button until it is answered. Review keeps the Next button's
   place, unseen, so nothing moves when the grade appears.
3. **Recall's self-grade.**
   - The signed "I got it" / "I missed it" buttons gain an interval line under each ("Good · in 4 days", "Again · in 10
     minutes").
   - The pressed one shows "Saving…".
   - Pressing one records the quiz's self-grade (the margin circles or strikes the numeral, as signed) and rates the
     card in one step.
4. **The quiz block's head** (`QUIZ · 7 QUESTIONS` and the quiz title) is not shown on a card. The card head ("Question",
   the source) and the where-block's place line ("Quiz “Check what stuck” · question 1 of 7") carry it. The numeral
   keeps the item's number in its quiz.
5. **The highlight's paint on a card** keeps `cursor: auto` (`.rv-hl__quote mark.an-m`). The paint is not a control
   there and opens nothing. The look is unchanged.
6. **Links inside a quiz prompt** (for example "accounts plane" on the reset card) open the reader stand-in on the
   canvas. In the product they go where the chapter's link goes.
7. **The stand-in** gained three kinds and the proposal box (above).

## The seams with the wave

- **`06-library`.** The entry point to Review is theirs. If it shows a number, it reads `counts.due`.
  - Review's frame (Q2) is a focused frame in the reader's family: the logo and "‹ Library" lead to the library, and
    there is no app shell.
  - If `06-library` puts Review inside the app shell, that is the wave's frame question, and it goes to the operator as
    one choice.
  - "Clear all reading data" removes every card. Review then shows "No review cards yet".
- **`07-book-page`.** A book's cards due can read `counts.by_book[]` (`due`, `new`) for its book.
  - Review's By book is a read-only list, not a filter (Q7). The queue route takes only `limit`.
  - "Clear this book's reading data" removes that book's cards. Review's counts and by-book rows simply drop them; no
    special state.
- **`09-legacy-and-print`.** Legacy chapters make no cards. `lantern` and `orchard` never appear in the queue or by book.
- **The signed reader.** `where.href` opens the reader at the card's block (stand-in on the canvas). Review keeps its
  place: back from the reader, the same card is first if it is still due.
- **The signed annotations.**
  - Turning "Review this" off suspends a highlight's card (S3).
  - I drew the reverse as well: suspending a highlight card says "Card suspended, and Review this is off on its
    highlight."
  - This keeps one state in two places, and is part of Q5.

## Departures from the handoff

1. **iPad landscape (1024 × 768) is not drawn.** The handoff asks for it "where the layout changes there". The reading
   column and the foot are the same as at 820, so nothing changes.
2. **The limit states read the held cards from S3's own counts** (revised in critique pass 01). A card a limit holds
   back is still due today (S3: due = due by the end of today), so it stays in `counts.due` (or `new_highlights`) and
   in `by_book`, and the queue returns no card. The header, By book and the end card then agree ("14 due · 3 new
   highlights · 200 done today"; "14 more cards and 3 new highlights are due, and they wait for tomorrow"). The one
   addition proposed for P30 is `limit_reached` (which limit emptied the queue); without it the page infers it from
   the profile (`build-prompt.md` → *Data*). This assumes the server keeps held cards in its counts.
3. **The quiz card's place line** ("Quiz “Check what stuck” · question 1 of 7") needs the quiz's title and the item's
   index and count in `where`. S3's `where` does not carry them. This is a proposed addition too, or the server renders
   the line.
4. **Queue order: new highlights come after the due cards.** S3 orders by due, with overdue relearning first. A
   never-reviewed highlight has no due, so I placed new highlights last. The server decides.
5. **Again comes back today.** A card rated Again (10 minutes) goes to the end of the local queue and stays in `due`, as
   FSRS's learning step implies. The server's reply decides.
6. **The handoff's quiz sources.** The handoff names `#try-it` and `#twenty` as the guide's quizzes. In the signed
   `reader.js`:
   - `#try-it` is the money-notes document's quiz, and money-notes is not in the wave's sample library, so it is not
     used;
   - `#twenty` is Tidewater's ("Twenty questions on the model"), and its cards are drawn as Tidewater's.

   The guide's cards come from `#check` (English and Korean).
7. **"Years" appears only as a format sample** (board 10, "Intervals · a mature card, years (format sample)": "in 1.3
   years"). No card in the invented queue is mature enough for a years interval, so the flow never shows one.
8. **The settings' validation bounds** (1–999, 0–999) are invented. S3 names no bounds.
9. **Signed out** lands in the Review page's group of the state bar ("Signed out"). It shows the Sign in stand-in in
   the review frame, because `/review` signed out *is* the redirect. "Finish signing in" returns to review at the first
   card.
10. **The preview's `layout-shift` lines on 01 and 02 are left as they are.** Each pairs two different controls:
    - Option *k* of one card's quiz and option *k* of the next card, after a state-bar preset (or Undo) swaps the card.
      The signed quiz's option hit button (`button.qz-opt__hit`) is named by `aria-labelledby`, which the preview's
      matcher does not read, so it treats every option as one control. It is a signed part, so its markup stays.
    - The reader's own text size (`Size 1`, `Size 5`), which resizes every control on purpose.

    No control resizes while it shows its state, and no header, nav or main moves. See *Render log*.

## Open questions, for the operator (each drawn, none decided)

1. **Theme rule for review.**
   - **Drawn:** review follows the reader's own Display setting (System, Light, Dark, Sepia) and text size, per device,
     through the signed Display sheet. All three themes are drawn.
   - **Trade-off:** one reading look from chapter to card, against the signed-in app's rule (follow the OS, no sepia).
   - **Alternative:** OS-only, with no Display button.
2. **The page's frame.**
   - **Drawn:** a focused frame in the reader's family: the progress line, logo, "‹ Library", Settings and Display,
     and one centred 36rem column.
   - **Trade-off:** a calm session, and the card reads like the chapter it came from. Against that, it leaves the app
     shell's navigation one click away, and `06-library`'s and `07-book-page`'s frames may differ (a wave choice).
3. **The rating words per type.**
   - **Drawn:** the type's own words lead, with the contract's word and the interval under each.
     - Recall: "I got it" / "I missed it" over "Good · in …" / "Again · in …".
     - Highlight: "Got it" / "Show sooner".
     - Choice and cloze: **Next**, with "Next rates it Good · in …" beside it.
   - Good comes first, the signed quiz's order.
   - **Trade-off:** the words match what the reader just did. The contract's Again/Good are secondary text.
4. **The interval preview's form.**
   - **Drawn:** "in 10 minutes", "in 1 day", "in 23 days", "in 2 months", "in 1.3 years". Months are whole (days ÷
     30.4), and years have one decimal.
   - It sits under each rating's word, and in Next's sub-line.
   - **Trade-off:** plain words read at 390 without abbreviations, at the cost of a second line on each button.
5. **Suspend.**
   - **Drawn:** a quiet "Suspend card" at the right of the where-row on every card. It is optimistic, with the signed
     undo line and **Undo**. Suspending a highlight's card also turns its Review this off.
   - **Not drawn:** a list of suspended cards to resume. A highlight comes back by turning Review this on again. A
     suspended quiz card has no way back in this cut.
   - **The operator decides** whether one is needed (a P30 surface).
6. **The review settings.**
   - **Drawn:** a right-hand sheet from **Settings** in the top bar, with the time zone, Reviews a day and New
     highlights a day, plus the 04:00 day line (not editable in S3).
   - The limit states link to it: "Change your daily limits →".
   - **Trade-off:** the settings live where their effect is felt, against one place for all account settings.
7. **By book.**
   - **Drawn:** a read-only disclosure listing each book's due and new counts, with "The queue mixes every book, in the
     order the cards fell due."
   - Choosing a book does not narrow the queue: that needs a `book` parameter on the queue route, a P30 contract
     addition.
8. **The way back into the chapter.**
   - **Drawn:** on the back only for quiz cards, so the chapter never gives the answer away. A highlight (no back) shows
     it at once.
   - It names the chapter (or document) and the quiz and question, or the section.
   - Review keeps its place on return.
9. **What done for today offers.**
   - **Drawn:** the next card's time, in the reader's own time ("tomorrow at 07:15, your time"), and one way on:
     **Continue reading →** to the reader's continue pointer.
   - **Not offered:** "review more" (it would break FSRS's schedule) and statistics (out of the cut).
10. **An entry to review from the quiz.**
    - **Drawn only as a flagged proposal**, on the reader stand-in: the signed save line could end with "Review 13
      cards due today →".
    - The signed quiz is unchanged.

Also for the operator:

11. The two **contract additions** above (`limit_reached`, with held cards kept in S3's counts, and the quiz place
    fields in `where`) are proposals for P30.
12. **The rating buttons' 1 px border.** It is the signed `rd-btn--secondary`'s `kb-border-strong` (1.58:1 light), the
    same gap as the quiz's C09. The buttons are identified by their words, and the gap is logged, not restyled.

## Component and token gaps

- **No system components exist** (the system ships no bundle). Everything is drawn as markup and logged as a component
  gap:
  - the queue header;
  - the card frame;
  - the two-rating foot with interval previews;
  - the main button with four stacked labels;
  - the where-block and suspend;
  - the end states (done, the limits, empty) and the card skeleton;
  - the review settings form.
- **No new token.** Every value is a `kb-*` token or a signed `--rd-*` / `--an-*` value.
- **Carried gaps:**
  - sepia is reader-scoped (01-reader);
  - the highlight paint is reader-scoped (05-annotations);
  - the secondary button's border is under 3:1 (the quiz's C09);
  - there is no Hangul face in the system cache (Noto Serif KR comes from Google Fonts CSS, as in the reader).

## Measured contrast (WCAG ratio, computed from the token values; review's surface is `kb-surface`)

| What review adds | Light | Dark | Sepia | Needs |
|---|---|---|---|---|
| Title, the counts' numbers, card text, the note, the where-title, book rows (`ink` on `surface`) | 15.80 | 12.88 | 11.81 | 4.5 |
| Count words, the saved line, kind and source, interval previews, hints, the where-label and place, the end body (`secondary` on `surface`) | 7.48 | 7.32 | 6.87 | 4.5 |
| Interval line inside a rating button (`secondary` on the button's `surface`) | 7.48 | 7.32 | 6.87 | 4.5 |
| A field's error, "Not saved · check your connection" (`status-revoked-ink` on `surface`) | 7.07 | 7.42 | 7.15 | 4.5 |
| The quote on the highlight paint (`ink` on `--an-mark`) | 11.76 | 8.54 | 8.81 | 4.5 |
| UI: an invalid field's border (`status-revoked`) | 5.36 | 6.00 | 5.46 | 3 |
| UI: links ("Open at this … →", "Change your daily limits →"), the focus ring, the primary fill (`accent`) | 5.97 | 7.31 | 6.23 | 3 / 4.5 |
| UI: a settings field's border (signed `an-ed__field`, `secondary`) | 7.48 | 7.32 | 6.87 | 3 |
| UI: a rating button's border (signed `rd-btn--secondary`, `border-strong`; open question 12) | 1.58 | 1.56 | 1.64 | 3 |
| Canvas only: the proposal box (`#1d1d1d` on `#ececea`; its label `#444` on `#ececea`) | 14.25 / 8.23 | — | — | 4.5 |

The quiz's own colours (right, wrong, keys and tags) are the signed ones, measured in `04-quiz`'s result. `kb-hint` is
never used.

## States reached only by interaction

- **On 01 and 02, by clicking:**
  - answering (a pick, a toggle, typing in a blank, Enter in a blank);
  - Check, with "Nothing to check yet" when nothing is chosen;
  - Show answer;
  - Next and each rating, then "Saving…", then the next card with the saved line and moved counts;
  - Try again after a failure (the same `review_id`);
  - Suspend, then Undo;
  - By book open and closed;
  - Settings: typing an invalid number then Save (invalid), and a valid save (saving, then "Settings saved");
  - Display (theme and size);
  - "Open at this question / highlight →" (the reader stand-in) and "‹ Back to review";
  - "Continue reading →";
  - "Open the library →" and "‹ Library" (the library stand-in);
  - "Finish signing in".
- **Rating every card** walks the whole day to "Done for today" (6 done + 14 due + 3 new = 23).
- **The daily limits, by clicking** (since critique pass 01): open Settings, set Reviews a day to 7 (or any number at
  or under today's done count), save, and rate a card: the reviews limit ends the session. Set New highlights a day to
  0 and rate through the due cards: the new-highlights state, "paused". "Change your daily limits →" and a higher
  number bring the held cards back.
- **Only by the state bar:** loading, failed to load, a rating mid-send, a failed rating, a failed settings save, no
  cards yet, 200 due, one card left, a Korean quiz card, and signed out. No click can force these on the canvas.
- **Hover and focus.** They are reached by pointing at and tabbing through a Page: the hover border on a secondary
  button and an option, the fill on a top-bar button, and the focus ring (`kb-focus-w`, `kb-accent`). No Components
  board fakes them.

## Render log

**Pass 1 (all 20 boards, `--click`).**
- **Output:** 21 PNGs and 94 states, `failed=0`. No unmounted part, no script error. 53 `issue` lines:
  - 34 `layout-shift`;
  - 9 `contrast`;
  - 10 `frame-clip`.
- **What I saw and fixed:**
  - **Every stacked-label button was 4 lines tall** (Next, Check, Try again, Save settings). The labels came from an
    `<sc-for>`, whose wrapper broke the signed `.qz-swap > span` stacking. The labels are now written out, so they stack
    in one cell (`review.js` `f.lab`, `st.lab`).
  - **"By book", disabled while the queue loads or fails,** measured 4.26:1 (light) and 3.69:1 (sepia) through the
    signed `.rd-tbtn` at reduced opacity. It now keeps its place, unseen, as the counts do (`visibility: hidden`).
  - **"Saving…" on Save settings** measured 2.61–3.81:1 (the signed `.rd-btn:disabled` opacity). The busy button now
    stays opaque, as Next does.
  - **The failed-rating preset** landed on a long choice card, with the failure below the fold. It now lands on the
    short recall card that the saving preset uses.
  - **Frame clips:**
    - Ten boards clipped: Widths, Card and every Components board but Settings. Each was resized to its `content=`
      height.
    - Choice card (10,816 px tall at 4 cells a row, over the 8000 limit) is now 9 cells a row, one row per theme.
    - Cloze and Highlight are 5 a row.
- **Every board PNG and the key state PNGs were read.**
  - The queue, cards, ratings, highlight paint, Korean card, settings sheet, end states, skeleton, stand-ins and the
    three themes render as planned.
  - Nothing scrolls sideways at 390.
  - The state bar scrolls away.

**Pass 2 (all 20 boards, `--click`; the last render allowed).**
- **Output:** 21 PNGs and 94 states, `failed=0`. No unmounted part, no script error. 34 `issue` lines, all
  `layout-shift`. No `contrast`, `frame-clip`, `target`, `page-clip`, `same-target` or `hover-contrast` line remains.
- **The 34 `layout-shift` lines are the two kinds in departure 10:**
  - a state-bar preset (Suspended, Six options, Saved, next card, One card left, Card made today, Quiz card in
    한국어) or Undo swaps the card, and the preview pairs option *k* of the old card with option *k* of the new one;
  - Size 1 and Size 5 resize every control on purpose.
- **What I saw on the PNGs** (the Components and Pages board PNGs, the phone view, and the states Choice · right,
  Rating · failed, Suspended, Settings · not saved, Loading and Signed out):
  - The pass-1 fixes hold: By book is unseen while loading (not dimmed), Saving… on Save settings is opaque in all
    three themes, and the failed rating lands on the short recall card with "Not saved · check your connection" and
    Try again in view.
  - **One fault was left:** the main button (Check, Next, Saving…, Try again) on choice and cloze cards was about 100 px
    tall, with its label at the top. Its labels now stack correctly, but the button carried the page's class `rv-main`,
    whose rule gave it the page's bottom padding (4rem × `rd-k`). Fixed after the render: the page's class is now
    `rv-page` (`review.css`, the `<main>` in `Review.dc.html`), and `.rv-main` names only the button. **This fix is not
    rendered** (no third pass is allowed). It removes one padding rule from one button and touches nothing else.
  - Highlight, Cloze, Choice and Settings had empty space under their content. I measured each content bottom on its
    PNG and trimmed the frame to it.
- **Final board sizes (w × h):**
  - Main 1440 × 935;
  - Widths 2794 × 1424;
  - Review and Elsewhere 1440 × 900;
  - Queue header 3392 × 2828;
  - Choice 6140 × 4720;
  - Cloze 3440 × 2530;
  - Recall 3392 × 2636;
  - Highlight 3440 × 2210;
  - Ratings 3392 × 2184;
  - Queue states 3392 × 3238;
  - Suspend 1400 × 698;
  - Settings 1900 × 2390;
  - Card 640 × 1080;
  - Rating 640 × 140;
  - QueueHead 640 × 200;
  - ReviewEnd 640 × 520;
  - ReviewSettings 420 × 640;
  - DisplayPanel 420 × 363;
  - Toast 480 × 100.

  The main-button fix makes the Choice, Cloze, Ratings and Card boards a little shorter than their frames (about 50 px
  for each row of cells that holds a main button). Over-tall, never clipped.
- **What remains:** the 34 `layout-shift` lines (departure 10) and the unrendered main-button fix above.

## Critique pass 01

The critique (`critique-01.md`, level `critic`, 7 must-fix, 2 gaps, 3 escalated choices, 4 advisory) answered in one
pass. Nothing was held for a judge. Every must-fix is fixed; none is rebutted.

- **C01** (the recall rating pair overflows its column at 390): **fixed.** Below 40rem a rating button has no width
  floor (`min-width: 0`, padding-inline 0.75rem), so the two halves take the question's column; from 40rem each keeps
  its 9.75rem floor. Measured at 390 × 844 on "Recall · long answer", "Rating · saving" and "Rating · failed": Size 3,
  buttons x 63.5–215.6 and 221.2–373.2 (152 px each, the 5.6 px gap kept) in a column of 63.5–373.2; Size 5, 71.8–219.7
  and 225.3–373.2 in 71.8–373.2. "Again · in 10 minutes" still fits on one line. The highlight pair is unchanged
  (16.8–192.2, 197.8–373.2). `review.css`, `build-prompt.md` §1 and §3.
- **C02** (the settings error pushes every field down): **fixed.** A number field's hint and its error now share one
  grid cell (`.rv-msg`): the error takes the hint's place, and the cell keeps the taller one's height. Measured at
  1440 × 935, typing 2000 then Save: labels at y 251 / 386 / 501, fields at 274 / 409 / 524, Save and Cancel at 739,
  the same before, while invalid and after retyping 150. `ReviewSettings.dc.html`, `review.js` (`settingsModel`),
  `review.css`, `build-prompt.md` §7.
- **C03** (the limit state says nothing is due beside 37 cards due): **fixed.** A card a daily limit holds back stays
  due today (S3's own definition), so it stays in the counts and in By book, and only the queue leaves it out. The
  limit preset now holds the real queue: the header reads "14 due · 3 new highlights · 200 done today", By book lists
  the three books (7 due · 3 new highlights, 3 due, 4 due) under "You reached today’s limit of 200 reviews, so these
  wait for tomorrow.", and the end card says "14 more cards and 3 new highlights are due, and they wait for tomorrow."
  "Nothing is due today in any book." now shows only when nothing is due (done for today, no cards yet). The proposed
  contract addition shrinks to `limit_reached` (departure 2, open question 11). `review.js` (`byBook`, `headModel`,
  `endModel`, the two limit presets), `QueueHead.dc.html`, board 05 (a ninth cell: the limit with By book open),
  `build-prompt.md` §1, §6 and *Data*.
- **C04** (a saved daily limit never applies): **fixed.** The canvas now applies both limits as the server would
  (`applyLimits` in `review.js`): after every rating, suspend, undo and settings save. Measured at 1440: save Reviews a
  day = 7 (6 done), rate one card, and the page shows "You reached today’s limit of 7 reviews." with "14 more cards and
  3 new highlights are due" (the wrong pick rated Again, so the card stayed due); "Change your daily limits →", 200,
  Save brings the held cards back at the first one. New highlights a day = 0 holds the three new highlights and ends on
  "Your reviews are done. New highlights are paused." Both limits are now reachable by clicking.
- **C05** (the hidden live line widens the phone scroller to 436–598 px): **fixed.** Review's own live line is now
  `p.rv-vh` (a 1 px box with `overflow: hidden`, its sentence in an inner block, `.rv-vh__t`, so the preview's
  `clipped` check, which fired on a first try with the text directly in the clipped box, stays silent). The signed
  quiz's `.qz-vh` is untouched. `.rd-scroll` scrollWidth / clientWidth at 390: 390 / 390 on "Choice · wrong",
  "Select all · partly right", "Cloze · three blanks, wrong", "Long card · document", "Rating · saving" and
  "Rating · failed", at Size 3 and Size 5. `Card.dc.html`, `review.css`, `build-prompt.md` §3.
- **C06** ("HIGHLIGHT · NEW" beside a "NEW" tag): **fixed.** The kind label is "Highlight" for every highlight card; the
  tag alone says "New". Seen on "Highlight · new, no note" (pass 1, state 10). `review.js`, `build-prompt.md` §2 and
  the strings.
- **C07** (the note, empty and limit bodies run 80–90 characters a line): **fixed.** The three 15 px paragraphs share
  one measure, `--rv-measure: 28rem`. Counted per rendered line at 1440 and 820: the long note 71, 71, 70, 74, 68, 74,
  67, then "is down?" (`text-wrap: pretty` keeps a single word off the last line); the short note 68, 49; no cards
  yet 72, 62; the reviews limit 62, 47; the new-highlights limit 69, 9; done for today 69, 10. At 390: 50–58. The
  last lines of the two one-sentence-and-a-bit bodies are two words ("at 04:00.", "your time."), not one.
- **C08** (gap: the 34 `layout-shift` lines are the matcher pairing different quiz options): **logged, unchanged.** The
  change lives in the signed `qz-opt__hit` markup or in the preview's matcher (departure 10). Pass 2 still prints the
  same 34 lines, all `button.qz-opt__hit` after a preset, Undo, or Size 1 / Size 5, and no other.
- **C09** (gap: the signed secondary button's border at 1.6:1): **logged, unchanged** (open question 12). The signed
  `rd-btn--secondary` is not restyled.
- **C10** (wave choice, escalated: the reader's way back to Review or to the book page): **left for the operator.** It
  is open question 8; the canvas still draws "Review keeps its place".
- **C11** (wave choice, escalated: "knowledge · book" against 07's "CODEBASE knowledge"): **left for the operator.**
  S3's `by_book` carries no `kind`; open question 7.
- **C12** (wave choice, escalated: the stand-ins' wording): **left for the operator.** This job's reader stand-in title
  is the handoff's own ("Reader — signed (`01-reader`)", *Every link and where it goes*). Canvas-only text.
- **C13** (advisory: the header reads as a work queue before the card): **left for the operator** (taste, open
  question 2's frame). Unchanged.
- **C14** (advisory: three vocabularies for the same two ratings): **left for the operator** (open question 3).
  Unchanged.
- **C15** (advisory: on a phone the action that moves on sits below the first screen): **left for the operator.** The
  foot stays in flow, as the signed quiz placed it. Unchanged.
- **C16** (advisory: By book rows do nothing when tapped): **left for the operator** (open question 7). Unchanged.

**Frames.** The narrower measure made two boards taller, and the first draft's main-button fix (rendered for the first
time in this pass) had left four boards over-tall. Each frame is now its measured content height, with its `$preview`
in step: Highlight card 3440 × 2341, Queue states 3392 × 3306, Choice card 6140 × 4559, Cloze card 3440 × 2376, Ratings
3392 × 1894, Settings 1900 × 2308, Card 640 × 1031. The mounted-part row moved up to y 6223, 120 px under the tallest
Components board.

**Render log, critique pass 01** (two `design-preview` passes, both `--click`):
- **Pass 1** (12 boards: Main, Widths, the Queue header, Queue states, Highlight, Recall, Ratings and Settings boards,
  and Card, QueueHead, ReviewEnd, ReviewSettings): 13 PNGs, 94 states, `failed=0`, no unmounted part, no script error.
  70 issue lines: the 34 `layout-shift` lines of C08; 34 `clipped` lines on the new `p.rv-vh` (its sentence was the
  clipped box's own text); and 2 `frame-clip` lines (Highlight card 2341 in 2210, Queue states 3306 in 3238). Fixed:
  the sentence moved into an inner block, and the two frames set to their content. Seen on the PNGs: the limit state
  with By book open, the settings sheet invalid, the recall pair at 390 (Size 3 and 5), the new highlight's head, the
  Queue header board's new cell in three themes.
- **Pass 2** (all 20 boards): 21 PNGs, 94 states, `failed=0`, no unmounted part, no script error. 34 issue lines, all
  the C08 `layout-shift` lines; no `contrast`, `target`, `clipped`, `frame-clip`, `page-clip`, `same-target`,
  `hover-contrast` or `dead-link` line. Seen: Ratings (the phone cells' pair inside its column in three themes) and
  Settings (all four states aligned field for field). After it, the over-tall frames above were trimmed to their
  content, measured in the same headless browser (not a third render).
- **Measured outside the preview** (a headless Chrome on the same runtime, driving the state bar; the preview cannot
  type an invalid number or read line lengths): the C01 rectangles, the C02 positions, the C03 and C04 texts, the C05
  scroll widths and the C07 line counts above.
- **What remains:** the C08 lines (a gap in the signed part and the matcher) and the escalated and advisory items for
  the operator.

## Read-back pass

The orchestrator's read-back found that `build-prompt.md` named the Suspend control as the signed accent link
(`.rd-linkbtn`), while the canvas draws it as the signed quiet button. The canvas is the drawn, rendered and critiqued
truth, so only the build prompt changed; no board, finding or decision changed.

- **`build-prompt.md`, the where-block (Layout):** the row now names its layout (`.rv-where__acts`: flex,
  space-between, gap `0 md`, `xs` above) and its two controls exactly: "Open at this … →" is
  `.rd-linkbtn.rv-where__link`; "Suspend card" is `.rd-btn.rd-btn--quiet.rv-suspend`, never a `.rd-linkbtn`.
- **`build-prompt.md`, section 5 (Suspend):** the control is now a `<button type="button">` drawn as the signed quiet
  button, with what the canvas draws for each state: rest and hover (the signed quiet values), focus and press
  (signed), its place (`.rv-suspend { margin-right: -0.75rem; }` puts the label's right edge on the column's right
  edge), its staying at the right while the link is hidden on a quiz card's front (`visibility: hidden`, never
  `display: none`), and disabled while a rating sends (`.rv-suspend:disabled`: full opacity, `kb-secondary`, because
  the signed dimmed look computes to 2.77–3.54:1 across the three themes).
- **Checked:** the classes against `Card.dc.html` line 49, `review.js` (`linkCls`, `linkHidden`, `linkTab`,
  `suspendOff`), `review.css` lines 99–101 and the signed `reader.css` (`.rd-btn`, `.rd-btn--quiet`, `.rd-linkbtn`).
  One `design-preview` render of Card and Widths (no `--click`): 0 issues, 0 errors; on the Card PNG, "Suspend card"
  is the grey quiet button with its label ending on the column's right edge, under the Next button's right edge.
