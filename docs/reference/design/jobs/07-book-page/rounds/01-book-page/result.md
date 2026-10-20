# Result — job `07-book-page`, round `01-book-page` (P29.S6)

The drafter's account of the round's first draft: one direction, drawn on the job's working canvas
(`jobs/07-book-page/canvas/project/`). Nothing here is decided until the operator signs the round.

## Intent, one line per Page

The intent lines and the plan below were written before any board.

- **01 · Page — Book page (the flow).** The operator, back on a book days later on a phone, an iPad or the Mac,
  came to pick up where they stopped or to jump to another chapter; the first thing they must see is the book's
  title and the one "Continue reading" action naming the chapter and the section they stopped at.
- **02 · Page — Book page alone.** The same screen from its props alone, for the build and for direct edits.
- **03 · Page — The book page at 390, 820, 1024 and 1440.** The operator and the critic, checking that one state
  holds at every reference size and in light, dark and sepia; the first thing they must see is the same state in
  four frames.
- **04 · Page — Stand-in for another job's screen.** Whoever clicked out of the book page, seeing which screen and
  which chapter, language, version or section the click carried, and the way back.

## The plan

- **Boards.** Pages on the first row: 01 the flow (`Main`), 02 the book page alone (`BookPage`), 03 the four widths
  (`Widths`), 04 the stand-in (`Elsewhere`, copied from the signed reader and extended). Components on the row
  below, one board per component, each state side by side: the top bar, the book's head, Continue reading, the
  notes entry, the chapter row, the clear control and its confirmation, and loading / not found / failed. Each
  component is its own `.dc.html` that the page and its board both mount, so there is one source. No Directions.
- **The look.** The signed reader's, unchanged: `reader.css` is copied whole for its sepia theme, its buttons, its
  tags, its chapter-row values, its editorial states and the canvas chrome; `book.css` adds only this page's parts,
  on `kb-*` tokens. Ground `kb-surface` like the reader, so a chapter and its book page are one room.
- **Type steps** (six on a screen): the book title in Fraunces at the reader's chapter-title steps (31.5 / 37.8 /
  43.2 px by container width); the Continue title in Fraunces at 21.2 px (the reader's "next chapter" step); the
  description in Literata and the h2s in Fraunces at 18 px; titles, controls and body at 15 px; meta at 13 px;
  mono labels at 11 px.
- **Spacing and color roles.** `kb-space-*` only: `xs` inside a meta line, `sm` label to title, `md` inside a
  block, `lg`/`xl` between blocks, `2xl` before the reading-data foot. Ink for titles, secondary for meta and
  the description, accent for the one primary button, the progress fill and links, the reader's three tags
  (accent "Updated", plain "Original layout", idle "Older translation"), revoked only on the confirmation's
  danger button and its error line.
- **Layout.** One centred column of 40rem below 64rem; from 64rem two columns centred as a whole, the head,
  Continue reading and the notes entry on the left (24rem) and the chapters on the right (40rem), so a whole
  book is seen at once on an iPad in landscape and on the Mac.
- **The one bold move:** the Continue reading block, set like the reader's signed "Next" block at the chapter end:
  a mono label naming the chapter, the chapter's title in Fraunces, the section where you stopped in ink, and the
  page's only primary button. Everything else is hairlines and small type.

## The plan's review (against the handoff and the operator's bar)

- **Revised: the progress mark.** I first drew a segmented strip, one segment per chapter, as the head's bold move.
  It repeated the list right under it and told each chapter's state by fill colour, so I cut it for the signed
  reader's 3 px progress line under "X of M finished", and spent the boldness on Continue reading instead.
- **Revised: Sign in to save.** §12's sentence ends "you come back to this chapter, at this section", and a book
  page is neither, so it does not fit unchanged. The signed-out head carries the chapter end's own words
  ("Signed-out reading isn't saved.") and Sign in sits in the top bar at every width (departure, open question 10).
- **Kept: the two columns.** A "detail page" with two columns can be a default; here it serves the handoff's
  "where a book is seen whole": Continue reading and every chapter of a 5-chapter book in one screen at 1024 and
  1440, and the 20-chapter list beside a head that stays in view in the top bar once it scrolls away.
- **Kept: the reader's own list values** for the rows (number, title, meta, tags), in the same words, so the book
  page and the reader's Contents sheet say the same thing about the same data.
- **Bar rule 1** (the state bar scrolls away with the page): the bar is the page's first child on 01 and the
  board's first row on 03, never sticky. The product's top bar below it is sticky in the page; the bar is not.

## What was designed

One direction, extending the signed reader (`new visual direction: no`).

### Pages

- **01 · Page — Book page (the flow)** (`Main.dc.html`, PAGE, interactive, 1440×2210). One board's `state` holds the
  book, the viewer (member, another org, signed out), the progress set, the open versions panel, the clear phase, the
  load status, the theme and the screen. It mounts `BookPage` for the book and `Elsewhere` for every click that
  leaves. The page scrolls as a document, as in the product (critique pass 01): the frame is the tallest state a click
  reaches (Tidewater with chapter 10's versions and the confirmation open, 2203 px measured), so every state is whole
  in the frame.
  - **The state bar** (page "Book page", 20 presets plus a theme row Light / Dark / Sepia):
    - Guide · 2 of 5 finished; Guide · last read in 한국어; Guide · chapter 3 started at 0%;
      Guide · chapter 2's versions open; Guide · all finished, one Updated; Guide · never opened;
    - Tidewater · 20 chapters; lantern · phases book; lantern · per-slice book p24;
      orchard · all legacy, never opened;
    - Clear · confirming; Clear · clearing…; Clear · cleared; Clear · failed;
    - Signed out · public book; Signed in · reader from another org; Signed out · a private book's address;
    - Loading; Not found; Failed to load.
  - **In Play,** a preset that names a part below the first screen (the open versions, the four "Clear · …") scrolls
    that part into view by the least distance once it renders; any other preset starts at the top. Only the window
    scrolls.
  - **The stand-in pages** each have their own bar group, with one neutral preset that changes nothing (its "only
    state" is whatever the click carried): "The chapter you opened" (the reader, and the legacy reader), "The list
    you opened" (the per-book list), "The library", "Sign in".
  - **Every click lands on its own target:**
    - each row opens its own chapter in its shown language, at the saved place;
    - each language link opens that language;
    - each View opens that version (`?lang=`, `?v=`, both named on the stand-in with the address);
    - Continue reading, Read next, Read chapter 1 and Read chapter N again each open their chapter;
    - the logo and "‹ Library" open the library stand-in;
    - Sign in opens the Sign in stand-in, whose "Finish signing in" returns to the book signed in;
    - every stand-in's "‹ Back to the book" returns to the same book state.
  - **The clear flow is live:**
    - trigger, then the confirmation, with focus on Cancel;
    - Cancel or Escape returns to the trigger, with focus;
    - "Clear reading data" shows "Clearing…" for 1.4 s, then cleared: every row reads Not started, the progress
      reads 0 of 5, Continue becomes "Start · Chapter 1", and the notes entry goes.
  - **Try again** on Failed to load goes through Loading to the book. Each async result carries an id; a preset
    pressed mid-send drops it.
  - The foot strip links 02, 03 and 04.
- **02 · Page — Book page alone** (`BookPage.dc.html`, PAGE): the guide, member, 2 of 5 finished, from its props
  alone.
- **03 · Page — The book page at 390, 820, 1024 and 1440** (`Widths.dc.html`, interactive, a fixed board, 3858×3000):
  one state bar (the same presets and theme row) over four frames:
  - 390, 820, 1024 and 1440 wide, each the whole page from top to bottom and at least one screen tall (844, 1180, 768
    and 900); each caption names its screen height (critique pass 01);
  - a preset or a click in any frame moves all four.
- **04 · Page — Stand-in for another job's screen** (`Elsewhere.dc.html`): the signed reader's stand-in. It is
  copied, with the kinds this page needs added:
  - chapter → `01-reader` signed;
  - legacy-book → `09-legacy-and-print`;
  - notes → `05-annotations` signed;
  - library-book → `06-library`;
  - signin-book.

  Each names the chapter, language, version or section the click carried, the address it would open, and
  "‹ Back to the book".

### Components (each its own `.dc.html`, mounted by the page and by its board)

| Board | Part | States drawn |
|---|---|---|
| 05 · Component — Top bar | `BookTop` (mounted part 12) | member at the top; scrolled, the book's title and progress in the middle; signed out with Sign in; a long title ending in an ellipsis; at 1440, 820/1024 and 390; light, dark, sepia |
| 06 · Component — Book head | `BookHead` (13) | guide 2 of 5; Tidewater with a description, 10 of 20; phases book 1 of 4; per-slice 2 of 4; a subject book with its subject label, never opened; never opened 0 of 5; signed out (the org shows, "5 chapters", the sign-in line); another org, own progress only; phone 356 and iPad 640; dark and sepia |
| 07 · Component — Continue reading | `Continue` (14) | started at a section; started, last read in 한국어; started at 0% (just opened, or marked unread); started, legacy with no sections; the place on a finished chapter, the next one; never opened / cleared; signed out; every chapter finished with one Updated; every chapter finished, all on the newest; Tidewater chapter 11; all legacy, never opened; per-slice chapter 3; dark and sepia |
| 08 · Component — Notes in this book, the entry | `NotesEntry` (15) | with items; another org, their own items; opened, nothing marked yet; lantern; dark and sepia |
| 09 · Component — Chapter row | `ChapterRow` (16) | finished; started with two languages and an older translation; started at 0% ("Started" alone); versions open; finished on v2 now v3 (Updated); one language, three versions, open; legacy finished; legacy not started (orchard); phases book legacy pair; per-slice row with its slice id; signed out; a 한국어 title, the longest real title and a long legacy title at 356; dark and sepia |
| 10 · Component — Clear this book's reading data | `ClearData` (17) | idle; confirming; clearing…; failed; cleared; at 356 with and without a notes count; dark and sepia |
| 11 · Component — Loading, not found, failed | `BookState` (18) | loading (the page's two-column skeleton, and one column); not found (also a private book signed out); failed with Try again and its reference; at 1440, 390 and 820; dark and sepia |

Boards 12 to 18 are the mounted parts alone, one instance each (`<dc-import>`ed by the page and by 05 to 11, so not
counted by `design-check`'s board warning).

### Directions

None: the operator asked for no options.

## States reached only by interaction (never forced by a prop)

- **Scrolling past the head** (01 in Play) shows the book's title and progress in the top bar. Board 05 draws it
  with the `compact` prop. 03's frames are whole pages, so they never scroll.
- **Hover:**
  - rows and the notes entry: sunken fill, the title underlined;
  - the language links: accent-strong, underlined;
  - the buttons: the reader's own;
  - the clear trigger: a revoked-soft fill.
- **Focus rings** on every control (the system's ring).
- **Escape** closes the confirmation, and focus returns to the trigger. Cancel takes focus when the confirmation
  opens from the trigger, and the section scrolls into view by the least distance; once cleared, focus moves to the
  "Reading data cleared." line. In the canvas frames everything is already in view, so these show only in Play (or
  in a window shorter than the page).
- **The timers:** clearing… → cleared, and Try again → loading → the book.

## Data

- **Real:**
  - the knowledge guide's five chapter titles, as the handoff lists them;
  - its versions, dates and the 한국어 chapter 2, as the signed reader's `reader.js` holds them;
  - the twenty Tidewater titles, from the signed reader's `reader.js`;
  - the member's progress on the guide and Tidewater, as the handoff gives it: guide 2 of 5, chapter 2 at 38% in
    "The write path", chapter 5 finished on v2 and Updated; Tidewater 10 of 20, chapter 10 Updated, chapter 11 at
    46% in "Noticing a surge", chapter 12 at 12%.
- **Invented**, per the handoff's shared sample library:
  - the org Quillwork (`@quillwork`);
  - `lantern`'s phases book (P8 with English v2 and 한국어 v1, P9, P17 and P18 joint, P24) and its phase names;
  - the per-slice book `p24` (P24.S1, P24.S2, P24.S3, P24.F1) and its titles;
  - `orchard`'s four legacy titles;
  - the subject book "Phrasal verbs in technical writing", only on board 06, because the library has none;
  - the chapter summaries, except the guide's; the section names "The two planes", "The sealed cookie",
    "Noticing a surge" and "Counting the votes";
  - the progress sets other than the two above, among them `g-opened` (the guide with chapter 3 opened last, at 0%);
  - the notes counts (33 in 4 chapters, and so on);
  - the failure reference `bk-4c81d0e2`.
- **Not on the canvas:** a signed-in reader's name (the page needs none); emails, keys, glide-ilab and base
  material, arb_upbit_1 content.
- **Placeholders:** none.

## Files copied from a signed round

From the reader's snapshot `jobs/01-reader/rounds/02-revise/canvas/project/`:
- **`reader.css`**: unchanged, byte for byte (checked with `cmp`).
- **`assets/logo.svg`**: unchanged, byte for byte.
- **`Elsewhere.dc.html`**: copied, then extended (a departure, below):
  - its `reader.js` include is removed, since its text now comes from props;
  - an `url` prop and an "Address:" line are added;
  - five kinds are added;
  - its default kind is now `chapter`;
  - (critique pass 01) it links `book.css` and takes `fit="flow"`, which places it in the page's flow with its card
    near the top, for 01 and 03;
  - the reader's own kinds are kept unchanged.

Nothing was copied from wave 2. The per-book list itself is a stand-in, not a copy of `BookNotes`.

## The seams with the sibling jobs (what I assumed)

I did not read the siblings' live canvases (my contract forbids reading an open same-wave draft); these are
assumptions from the handoff alone.

- **`06-library`:**
  - its book card opens this page;
  - book progress reads "X of M finished" here, Updated counted as finished (S3), as I assume it does on the card;
  - the library's overall Continue reading is its own;
  - this page's is the book's pointer;
  - the logo and "‹ Library" lead to the library, drawn here as a stand-in.
  - **The two clears.** Mine is an inline two-step confirmation in the page, under its own heading, that names
    the book, lists what goes and what stays, and puts focus on Cancel. If the library's "clear all" uses another
    form or other words, that is a wave choice for the operator.
  - **The frame** (open question 2) is the same question there.
- **`08-review`:** this page shows no review cards (open question 9). The confirmation names "the review cards from
  its chapters" among what the clear removes, as S3 says.
- **`09-legacy-and-print`:** a legacy chapter, or a legacy variant, opens the legacy reader at the chapter's own
  address. I assume its back link returns here, to this book page.

## Departures from the handoff

1. **§12 (Sign in to save) is not used.**
   - Its sentence ends "at this section", and a book page has none.
   - The signed-out head says instead: "**5 chapters**", then "Signed-out reading isn't saved. Sign in to keep
     your place and progress in this book."
   - Sign in also sits in the top bar.
   - §12 itself is unchanged (open question 10).
2. **A list of my own, not the signed `ChapterList`.** The handoff leaves this choice to me (open question 5); I log
   it because the rows differ from §11 in four ways:
   - a languages-and-versions line under the title;
   - a slice id leading the meta line in a per-slice book;
   - no "Reading now", because nothing is open here;
   - a meta line that is always laid out, empty when a signed-out row has nothing to say.

   The values and words are §11's own (number, title in its `lang`, Not started, Started · 38%, Finished,
   UPDATED, ORIGINAL LAYOUT).
3. **The version panel's rows are §14's rows, but "Reading now" is not used**: no version is being read on this
   page.
4. **A stand-in for the per-book list**, not a copy of `05-annotations`' `BookNotes`. The handoff allows either.
   The stand-in names the list, the book and its count, and says its back link should read "‹ Back to the book"
   when opened from here (open question 7).
5. **The page's own slim top bar and frame** (the reader's chrome, open question 2): the logo and "‹ Library", a
   middle (the title and progress) that shows once the head scrolls away, and Sign in for the signed out. The
   reader's own top bar is not reused: its title, its Contents and Display buttons, and its chapter progress are a
   chapter's, not a book's.
6. **Sign in shows at every width.** The reader's top bar hides it below 40rem, and the reader carries it at the
   chapter's end instead. A book page has no chapter end, so the bar keeps it.
7. **`Elsewhere.dc.html` is extended:**
   - five kinds added;
   - the `reader.js` include removed;
   - an address line added;
   - the default kind changed;
   - a `flow` fit and a `book.css` link added (critique pass 01).

   It is canvas-only, and the handoff asks for exactly this ("copy it and add the kinds this job needs"). I list
   it because the file's default render differs from the snapshot's.
8. **During Clearing…, Cancel steps out of view (`visibility: hidden`) and keeps its place; it is not disabled.**
   - A disabled ghost Cancel measured 2.85:1 (light) and 2.77:1 (sepia).
   - The request has gone, so nothing is left to cancel.
   - Cancel comes back on a failure.
9. **The clear trigger is a ghost button in `kb-status-revoked-ink`**, not the product's danger fill. The fill is
   kept for the second, destructive press, so the everyday page carries no red block.
10. **The book page is fixed at the reader's text size 3** (the default). It does not follow the reader's text-size
    setting (open question 12, new).

## Open questions (the operator decides; my drawn answer in each)

1. **The theme rule.**
   - Drawn: the reader's Display setting, for every reader, signed out included. It is read from the
     reader-settings cookie: System (the default, never sepia unless chosen), Light, Dark or Sepia.
   - The page has no control of its own.
   - Trade-off: a chapter and its book page always match, but the book page follows a reader setting rather than
     the app's "OS only, no sepia" rule.
   - All three themes are drawn on every board.
2. **The frame.**
   - Drawn: the reader's chrome with this page's own slim top bar (logo, "‹ Library", Sign in). No app rail or
     app topbar, for members and the signed out alike.
   - Trade-off: the book reads as the front of the e-book, not as an app screen; the cost is one more step to
     reach the app's other places.
   - The same question stands for `06-library` and `08-review`.
3. **The preface at position 20.**
   - Drawn: kept in place, as chapter 20, with the model's order.
   - Promoting it would make the row numbers disagree with the reader's "Chapter N of M".
   - Trade-off: a first-time reader may miss it. A promoted "Start here" note would be a later, separate call.
4. **Numbering.**
   - Drawn: the ordinal in manifest order, 1 to M, as the reader counts ("Chapter 2 of 5").
   - A phases book's title carries its phase ("P8: …"), so the gaps 8, 9, 17, 24 never show as numbers.
   - A per-slice book's meta leads with the slice id ("P24.S3 · Started · 22%").
   - A shape note under the list head says what the book is ("One chapter for each phase that was explained, in
     phase order." / "One chapter for each slice of P24, in slice order.").
   - Trade-off: the phase number appears in the title, not the number column.
5. **Variants and versions.**
   - Drawn: a list of my own in the reader's words. Under a row's title, a line of language links ("English · v2",
     "한국어 · v1") with the reader's OLDER TRANSLATION tag.
   - One language with several versions shows "v3 · 14 Oct 2026" instead.
   - A "Versions" toggle opens a panel of §14's version rows with View. Choosing goes to the reader at `?lang=`
     (newest) or `?lang=&v=`, or to the legacy reader for a legacy variant.
   - Trade-off: every language is one tap away, and older versions are two; the list grows a line on rows with
     variants.
6. **Continue reading.** Drawn:
   - started → "Continue · Chapter N", the title, "You stopped at **section**, N% of the way in.", and
     **Continue reading**;
   - the place is on a finished chapter → "Next · Chapter N" and **Read next**;
   - never opened, cleared, or signed out → "Start · Chapter 1", its summary, and **Read chapter 1**;
   - every chapter finished → "Finished · You've finished all M chapters." It says when one has been updated
     since, and offers **Read chapter N again**, secondary when none is Updated.

   Per the S6 notes, Continue reading itself is absent for the anonymous and for a reader who has opened nothing;
   "Start" takes its place.
7. **The per-book list's entry.**
   - Drawn: a quiet link "Notes in this book →" under Continue reading, with its count line ("33 items in 4
     chapters"; "Nothing marked yet" once opened).
   - It is hidden for the signed out and for a book never opened.
   - Recommended: when the signed list is opened from here, its "‹ Back to the chapter" reads "‹ Back to the book"
     and returns here. The signed list is unchanged on this canvas; that change is the operator's.
8. **Clear this book's reading data.**
   - Drawn: a foot section "Your reading data" at the end of the Contents column, `2xl` below the last row, away
     from every everyday action.
   - The trigger opens an inline confirmation. It names the book and lists what goes: place and progress in N
     chapters, N bookmarks, highlights and notes, and quiz answers and review cards. It also says what stays and
     that it cannot be undone.
   - Cancel is focused. The danger button reads "Clear reading data", then "Clearing…"; a failure says nothing
     was cleared, and a cleared state says so.
   - Shown only to a member with reading data in the book, or while the flow runs.
9. **This book's review cards.**
   - Drawn: not shown. The page stays about reading; due cards are `08-review`'s.
   - The trade-off is a missed nudge. A small "N cards due from this book" line would be a seam to agree with
     `08-review`.
10. **The public view.**
    - Drawn: no progress, no clear and no notes entry.
    - The head reads "5 chapters" and "Signed-out reading isn't saved. Sign in to keep your place and progress in
      this book.", and Sign in sits in the top bar.
    - The place reads "@quillwork / knowledge", so the org shows.
    - Continue becomes "Start · Chapter 1".
    - §12 is not reused (departure 1).
11. **The description and subject label.**
    - Drawn: a kind line ("CODEBASE knowledge" or "SUBJECT English", mono label and place) over the title.
    - The description, in Literata, sits under the title only when the book has one (Tidewater).
    - A subject book is drawn only on board 06; the sample library has none.
12. **New: the book page's text size.**
    - Drawn: fixed at the reader's default size 3.
    - Should the page follow the reader's text-size setting as it follows its theme? Following it keeps one room;
      fixing it keeps the list's density.

## Component and token gaps

- **The system ships tokens and no components.** Every part here is markup, in its own `.dc.html`, and is logged as
  a component gap:
  - `BookTop`;
  - `BookHead`, with the book progress;
  - `Continue`, the reader's "Next" block reused for a book;
  - `NotesEntry`;
  - `ChapterRow`, with its languages-and-versions line and versions panel;
  - `ClearData`, the inline destructive confirmation;
  - `BookState`.

  The reader's own parts (buttons, tags, version rows, editorial states, skeletons) come from the copied
  `reader.css`, unchanged.
- **Tokens:**
  - **No sepia in the system.** It stays reader-scoped, in `reader.css`, as the reader signed it.
  - **No Hangul face in the cache.** The reader's Noto Serif KR / Pretendard rule is used as signed.
  - **No token changes,** and nothing added to `ds/`.

## Contrast (measured from the token values; every text and state colour this page adds)

Every pair is computed from the token values by the WCAG formula. Text needs 4.5:1; UI parts need 3:1.

| Pair | Light | Dark | Sepia | Needs |
|---|---|---|---|---|
| ink / surface | 15.80 | 12.88 | 11.81 | 4.5 |
| secondary / surface | 7.48 | 7.32 | 6.87 | 4.5 |
| secondary / sunken (hover rows, plain tag) | 6.23 | 6.78 | 5.96 | 4.5 |
| accent / surface (links, language links) | 5.97 | 7.31 | 6.23 | 4.5 |
| accent-strong / surface (link hover) | 8.70 | 9.51 | 8.90 | 4.5 |
| accent-strong / accent-soft (UPDATED, Versions open) | 7.02 | 6.49 | 7.11 | 4.5 |
| idle-ink / idle-soft (OLDER TRANSLATION) | 5.93 | 6.27 | 6.42 | 4.5 |
| on-accent / accent (primary button) | 5.76 | 8.32 | 7.00 | 4.5 |
| on-accent / accent-strong (primary hover) | 8.40 | 10.83 | 10.00 | 4.5 |
| revoked-ink / surface (trigger, error line) | 7.07 | 7.42 | 7.15 | 4.5 |
| revoked-ink / revoked-soft (trigger hover) | 5.62 | 5.68 | 6.08 | 4.5 |
| on-accent / revoked (danger button) | 5.17 | 6.84 | 6.13 | 4.5 |
| on-accent / revoked-ink (danger hover) | 6.83 | 8.45 | 8.03 | 4.5 |
| accent / border (progress fill against its track; UI) | 4.42 | 5.64 | 4.69 | 3.0 |
| accent / surface (focus ring; UI) | 5.97 | 7.31 | 6.23 | 3.0 |

## Render log

Both passes ran `design-preview 07-book-page --click` against the handoff's runtime, writing into the scratchpad.
Pass 2 had its own output folder.

### Pass 1 (all 18 boards; 20 PNGs, 94 click states)

I read every PNG. The run printed 41 `issue` lines, all fixed before pass 2:

- **`check=layout-shift`, the page moved.**
  - The cause: Cancel's focus scrolled the page. It happened on the "Clear · confirming" preset, on the trigger,
    and on Cancel and "Clear reading data" in scrolled states.
  - The fix: focus now moves only after a press inside the clear part (trigger, Cancel, Escape), never on a
    preset, and with `focus({ preventScroll: true })`.
- **`check=layout-shift`, the rows shrank.** The rows went from 64 to 44 px (84 to 63 on the phone) between signed
  in and signed out. The meta line is now always laid out, at least 1.125rem (one tag) high.
- **`check=contrast`.** The disabled Cancel during Clearing… measured 2.85:1 (light) and 2.77:1 (sepia). Cancel is
  now hidden in place (departure 8).
- **`check=frame-clip`.** Several boards were sized too small; I resized each from its `content=` line:
  - HeadStates, ContinueStates, RowStates, ClearStates and StateStates;
  - the mounted Continue, NotesEntry and ChapterRow.

  BookPage was 1100 tall against about 840 of content, and TopStates had blank space below, so both were
  trimmed.
- **What only the PNGs showed:**
  - "English· v2" lost its space around the hole. The link text is now built in script.
  - "Notes in this book→" lost its space. The label is now a hole followed by the arrow.
  - On a 356 phone, "Versions" wrapped to a line of its own, indented by its padding. It now has
    `margin-inline-start: -0.6rem`, and the language links and the button wrap as one row of items.
  - There was a 24 px gap between a row's meta line and its variants line. On rows with variants, the title
    link's padding-bottom is now `xs`.
  - Two lines were orphaned ("alone."). The leads, the confirmation's text, the notes and status lines, and the
    signed-out line now use `text-wrap: pretty`.

### Pass 2 (all 18 boards, `--click`)

The run printed `preview=done pngs=20 failed=0 issues=0 states=94`: no `issue` line on any board, frame or click
state, and nothing unmounted.
- **Link graph:** `Main` → `BookPage`, `Widths`, `Elsewhere`.
- **The PNGs I read:** all 20, and the click states that pass 1 had flagged:
  - Clear · confirming and Clear · clearing… on 01 and 03;
  - the trigger pressed on a scrolled page: the confirmation opens in place and the page does not move;
  - signed out, where rows keep their height;
  - versions open;
  - p24;
  - the phone views.
- **What is right now:**
  - "English · v2" and "한국어 · v1" have their spaces;
  - the rows with variants sit tighter;
  - the orphans are gone;
  - during Clearing… the Cancel slot is empty and "Clearing…" keeps the danger button's width;
  - dark and sepia render on every board.

**Changed after pass 2, not re-rendered** (no third pass is allowed; each change is CSS or a board size, and no
markup changed):
- **"Notes in this book→"** still had no space before its arrow. The runtime drops the whitespace between a hole
  and a following element, and the title is a plain span. The title is now `inline-flex` with a 0.3em gap.
- **"Versions" on a phone** wrapped to its own line with its label centred in the cell that "Hide versions"
  sets, so it sat about 15 px in from the links. Both labels now align to the start of the cell. The button keeps
  its width.
- **Four boards are trimmed** to their measured content, with 2 px to spare so `frame-clip` stays clear:
  - 02 BookPage alone, 1440×860 → 1440×834;
  - 17 ClearData, 640×420 → 640×184;
  - 13 BookHead, 384×300 → 384×210;
  - 18 BookState, 1440×620 → 1440×506.

  `$preview` is updated to match.

**What stays as drawn, for the critic and the operator:**
- **A signed-out row** keeps an empty meta line one tag high under its title, so rows are the same height signed in
  and out (the `layout-shift` fix). The signed-out list reads a little airier than the reader's own §11 list.
- **Open, "Hide versions"** takes its accent-soft fill. Its box starts about 6 px after the OLDER TRANSLATION tag,
  because the negative start margin that lines the label up on a phone also pulls the box toward the tag on one
  line.
- **On a 356 phone,** a two-language row's line wraps item by item: "English · v2", then "한국어 · v1" with its
  tag, then "Versions". Each item stays whole.
- **The state bar on 01 at 390** is about 360 px tall, with 20 presets and the theme row. It scrolls away with the
  page (bar rule 1).

## Critique pass 01

`critique-01.md` (critic, verdict revise): 7 must-fix, 0 gaps, 5 advisory. Every must-fix is fixed; none is rebutted.

- **C01** ("Started at 0%" drawn nowhere): fixed.
  - A progress set `g-opened` (the guide with chapter 3 opened last, at 0%) and a preset "Guide · chapter 3 started
    at 0%" on 01 and 03: row 3 reads "Started" alone, and Continue reads "Continue · Chapter 3" with "You've opened
    it, but not read far yet."
  - Board 07 gains the cell "Started at 0% · just opened, or marked unread" in its light row. The board is widened
    from 3400 to 3800 so the row stays one line, and board 08 moves to x 9600.
  - Board 09 gains the cell "Started at 0% (just opened, or marked unread): 'Started' alone".
  - The build prompt's state table lists the state.
- **C02** (the "Legacy · not started" cell drew a finished row): fixed. The Tidewater chapter 7 cell is now captioned
  "Legacy · finished", and a true "Legacy · not started (orchard, never opened)" cell (orchard's chapter 2) sits
  beside it.
- **C03** (presets left their part below the first screen): fixed, by a different route than the critic's suggested
  inner-scroller scroll.
  - **Why not that route:** the preview measures the header and `main` against the window's scroll only, so any
    scroll of an inner scroller is reported as `check=layout-shift`. The first draft's pass 1 flagged exactly that
    when focus scrolled the inner box.
  - **01 now scrolls as a document**, as the product does and as `format.md` describes a PAGE. Its frame is 1440×2210,
    the tallest state a click reaches (2203 px, measured), so every preset's part is whole in the frame: Main pass A
    states 03, 10, 11, 12 and 13 show the versions panel, the confirmation, "Clearing…", the cleared line and the
    failure line.
  - **In Play**, a preset that names a part below the first screen (the open versions, the four "Clear · …") scrolls
    the window to it by the least distance once it renders; any other preset starts at the top. A DOM probe in a
    1440×929 window measured: "Clear · confirming" scrolls 152 px and its actions sit at y 836–880; "Clear · failed"
    scrolls 183 px with the actions at 805–849; "Clear · cleared" has its line at 755–800. All are in view under the
    56 px top bar.
  - **03's frames are now whole pages** at 390, 820, 1024 and 1440 (at least one screen tall, each caption naming its
    screen height), so the confirmation, the versions panel and the failure line are in all four frames (pass A,
    Widths states 03 and 10 to 13). The board is now 3858×3000, its tallest reachable state being 2996 px, measured.
  - The rows below the first row move down to match (Components row at y 3120, the mounted parts at y 8180).
- **C04** (the stand-in preset's fixed label contradicted the screen): fixed. Each stand-in page's one preset is
  neutral and changes nothing when pressed: "The chapter you opened" (reader and legacy reader), "The list you opened",
  "The library", "Sign in". Each is pressed, with "only state" (pass A, Main state 46, over Tidewater's chapter 2).
- **C05** (focus on Cancel out of sight after the trigger): fixed.
  - Cancel still takes focus with `preventScroll`. The section ("Your reading data" with the group) is then scrolled
    into view by the least distance, with a scroll margin that clears the pinned top bar.
  - A DOM probe in a 1440×929 window, on Tidewater with chapter 10's versions open and the trigger pressed at the
    foot: the window moved to y 1205, the actions sit at y 836–880, and the focus is on Cancel.
  - Build prompt §7 states the reveal and its margins.
- **C06** (focus dropped to the body when clearing finished): fixed. The "Reading data cleared." line is
  `tabindex="-1"`. When a press of "Clear reading data" ends in cleared, focus moves to that line (`preventScroll`)
  and the line is kept in view. Probe: 1.7 s after the press, `document.activeElement` is the line, at y 791–836 in
  the 929 window. A failure leaves focus on the danger button, the retry. Build prompt §7 updated.
- **C07** (two dot spacings on a per-slice meta line): fixed. The slice id and the signed word are now one run of
  text, joined by the word's own " · ": "P24.S3 · Started · 22%". Probe on Main's p24 state: 2.6 px on each side of
  both dots. Signed out, the id stands alone with no dot. Build prompt §6 updated.
- **Advisory (2b notes):** the five taste notes are left as drawn for the operator. None is a question the handoff
  puts in play for the drafter beyond the open questions already logged:
  - the signed-out row's empty meta line;
  - a Continue link in the slim top bar;
  - "Versions" as a quiet button;
  - the busy ring on "Clearing…";
  - "ORIGINAL LAYOUT" on every row of an all-legacy book.

**What this pass changes on the canvas that the operator will notice:**
- 01 is a tall frame (2210 px). A short state, such as the guide at about 950 px, leaves page surface below its
  content, down to the foot strip.
- 03 shows whole pages in place of four scrolling device windows. The device's first screen is named in each caption,
  not drawn.

### Render log (answer pass)

A DOM probe, not a render, was used alongside the two passes. It is a script in the scratchpad that drives the
preview's own headless Chrome (`DesignBrowser` from `scripts/workflow.py`) to measure:
- each preset's page height, and the tallest state a click reaches;
- the reveal's scroll and the focus after the trigger and after clearing;
- the dot spacing;
- the theme fills.

It took no screenshots.

- **Pass A** (all 18 boards, `--click`): `preview=done pngs=20 failed=0 issues=0 states=89`.
  - **PNGs read:** Main frame and states 02, 13, 35, 46 and 47, Main phone, Widths state 10, RowStates,
    ContinueStates, ClearStates and Elsewhere.
  - **Seen and fixed:** on 01 the page stopped at its content, leaving white to the frame's foot, and 03's grey
    ground stopped short. `min-height: 100%` does not resolve against the runtime's host, so `.bk-proto` and
    `.bk-widths` now take `min-height: 100vh`. The heights were already measured by the probe.
  - **Trimmed:** RowStates from 3500 to 3120 (content 3113, measured), and the mounted parts' row moved up to y 8180.
- **Pass B** (Main, Widths and RowStates, `--click`): `preview=done pngs=4 failed=0 issues=0 states=89`.
  - **PNGs read:** Main state 12 (cleared), which now fills to the foot strip, and Widths state 06 (Tidewater, all 20
    rows in every frame, ground to the foot).
  - **Probe:** the dark, sepia and light surfaces fill 01's frame (2181 + 29 px strip).
- **Left open:** none. The click pass stopped at its caps on 01 (48 states) and 03 (300 steps), as before. The theme
  row and the clear flow's later presses were checked by the probe, not by the click pass.
