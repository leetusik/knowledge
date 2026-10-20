# Result — job `06-library`, round `01-library` (slice P29.S6)

Drafted by `design-drafter` on 2026-10-20. This file grows as the round is built; the verdict block is at the end.

## Intent, one line per Page

- **The member's library, `/library`.** Mira, a member of Quillwork, back after a few days on her phone, iPad or Mac,
  came to pick up the chapter she left or to choose another book; the one thing she must see first is where she left
  off (the lead Continue reading item) and its Continue button.
- **The public org library, `/@quillwork`.** A visitor, usually signed out, who followed a link to Quillwork's public
  books, came to pick something to read; the one thing they must see first is whose library this is and its books.
- **The app shell's entry points.** A member moving between reading and running the org; the one thing they must see
  first is Library and Review at the head of the navigation, and which page they are on.
- **Clear all reading data** (at the foot of `/library`). A reader who wants a clean slate; the one thing they must see
  first, before the second press, is what goes and what stays.

## The plan (written before the first board)

**Boards.**

| # | Board | What it is |
|---|---|---|
| 01 | `Main.dc.html` | Page, the flow: `/library`, `/@quillwork` and the stand-ins, one state; state bar with a theme row |
| 02 | `Library.dc.html` | Page, the screen alone (the member's library, by project, light); also mounted for `/@{org}` with `route="public"` |
| 03 | `PublicLibrary.dc.html` | Page, the public org library alone (signed out) |
| 04 | `Widths.dc.html` | The flow at 390 × 844, 820 × 1180, 1024 × 768 and 1440 × 900, one state, one theme row |
| 05 | `Elsewhere.dc.html` | The stand-ins for other jobs' screens (copied from the reader and extended) |
| 06 | `ShellStates.dc.html` | Component: the shell's entry points (rail unfolded and folded, the 40–64rem strip, the phone bar, the Review count) |
| 07 | `BookCardStates.dc.html` | Component: book card, every state, three themes |
| 08 | `DocRowStates.dc.html` | Component: loose document row, every state, three themes |
| 09 | `ContinueStates.dc.html` | Component: Continue reading, every shape, three themes |
| 10 | `GroupingStates.dc.html` | Component: the grouping control |
| 11 | `ClearStates.dc.html` | Component: clear all reading data, every phase, three themes |
| 12 | `StateStates.dc.html` | Component: loading (each width), failed, empty, the public misses |
| 13–18 | `BookCard`, `DocRow`, `ContinueReading`, `Grouping`, `ClearAll`, `LibraryState` | Mounted parts, one instance each |

No Directions: the operator asked for none.

This table and the look below are the plan as written before the first board. The boards as built, renumbered
after critique pass 01 (19 boards, the public library its own flow board and width sheet, five type steps), are
under *What was designed* and *Critique pass 01*.

**The look (extends the system and the signed reader; `new visual direction: no`).**

- **Type, six steps on a screen:** the lead Continue title, Fraunces semibold, fluid 22–30 px; the page title, Fraunces
  1.65rem (the console's `kb-app-title`); section titles and book titles, Fraunces 1.15rem; controls, row titles and body
  15 px Source Sans 3; meta 13 px; mono labels 11 px uppercase (the system's eyebrow; shelf labels at 12 px).
- **Space:** the `kb-space-*` steps only: `xl` between sections, `lg` inside a card's padding, `md` between a group's
  parts and between cards, `sm` / `xs` inside an item. Gaps by flex and grid `gap` throughout.
- **Colour roles:** `kb-paper` ground; `kb-surface` for cards and the lead; `kb-surface-sunken` for hover and skeletons;
  `kb-border` hairlines; `kb-ink` and `kb-secondary` text (never `kb-hint` for text); one accent for progress fills, the
  one primary button, the current nav item, the pressed grouping and links; `kb-status-revoked` only on the confirm
  button of the clear. The reader's tags (`UPDATED` accent, `ORIGINAL LAYOUT` plain) unchanged.
- **The one bold move:** the lead Continue reading item. Its chapter title is the largest type on the page, and its top
  edge is the reader's own 3 px progress line, filled to where Mira left off, so the library's first sight is the
  reader's own mark. Everything around it stays quiet: books as calm title cards, loose documents as plain rows.

**Review of the plan against the handoff and the operator's bar (what changed before building).**

- *Revised:* the first sketch drew every book and document as the same card in one grid, the library any product
  would draw. That makes a one-article subject read as a one-chapter book, which the handoff's check forbids. Now books
  are title cards (with progress) and loose documents are rows (with a state line), in every grouping.
- *Revised:* project names as group headings were first set as Fraunces headings the size of the card titles below
  them, so the squint test gave no shelves. Now each group heading is a shelf label (mono, uppercase, ink) with a plain
  count line, on a hairline: structure that says "a shelf", not decoration.
- *Revised:* the lead was first a panel with its own heading over a list; that is two focal points beside the page
  title. Now the lead is one link (one target, one primary-looking "Continue →", "Continue reading →" since the
  judge's C16), and the other items are quiet rows.
- *Kept, after checking the bar:* the state bar is the page's first row and scrolls away (`bar.md` rule 1); the bar is
  never pinned on any board, the Widths board included.
- *Kept:* the library sits inside the app shell (open question 2), because the shell must carry Library and Review
  anyway, and one frame keeps the console one step away.

## What was designed

One direction (the handoff asked for no options), built out as a working canvas: 19 boards, 6 of them Pages
(18 and 5 in the first draft; critique pass 01 split the public library into its own flow board and width sheet,
see that section).

**Pages (first row).**

- **01 · Page — Library (the flow)** (`Main.dc.html`, interactive, fills the window). One state holds the page,
  who is looking, the data, the reading state, the grouping, the folded rail, the unfolded lists, the clear's
  phase and where a stand-in came from. It shows `/library` and the six stand-ins a click on it reaches, one at
  a time. The state bar holds only the page on screen: 20 presets and a theme row (Light, Dark, Sepia) for the
  library, one preset with its "only state" note for each stand-in; every page's group sits in one grid cell so
  the product header never moves. The foot strip links the other boards.
- **02 · Page — The member's library alone** (`Library.dc.html`): the screen, by project, light; takes every
  state as props (`route`, `viewer`, `theme`, `data`, `prog`, `group`, `status`, `pub`, `clear`, `folded`,
  `expanded`, `due`, `fit`, `bar`, and the handlers `onGo`, `onGroup`, `onFold`, `onMore`, `onClear`,
  `onRetry`).
- **03 · Page — Public library, /@quillwork (the flow)** (`PublicLibrary.dc.html`, interactive, fills the
  window): `/@quillwork` for a visitor signed out, a reader signed in from another org, and a member when nothing
  is public, plus the three 404s, loading and failed (9 presets and the theme row), and the ten stand-ins a click
  on it reaches (book page public view, reader, legacy reader, sign in, home, Larkspur's library, review,
  console, sign out, and "Library — drawn on board 01" for a member's Library link).
- **04 · Page — The member's library at 390, 820, 1024 and 1440** (`Widths.dc.html`, interactive): board 01's
  flow drawn in four frames (phone, iPad portrait, iPad landscape, desktop), each with the state bar at the top
  of its page, listing only the page on screen.
- **05 · Page — The public library at 390, 820, 1024 and 1440** (`PublicWidths.dc.html`, interactive): board
  03's flow in the same four frames.
- **06 · Page — Stand-ins for other jobs' screens** (`Elsewhere.dc.html`): the reader's stand-in, copied and
  extended to the kinds this job links to (book page, its public view, the reader, the legacy reader, review,
  the console, sign in, sign out, home, a visitor's own library, and the member's library seen from the public
  flow). Each names what it opens ("Opens chapter 2 of 5, … at “The write path” (38%)"), so the clicked item is
  the item shown.

**Components (second row)**, each state side by side under a caption, every Components board in three
themes (all states in light; the key states again in dark and sepia where the board is wide):

- **07 · App shell entry points** (`ShellStates`): the rail with Library current, folded, the iPad strip, the
  phone bar, Review at 0 and over 99 (phone and rail), a signed-in visitor on `/@quillwork` (nothing current),
  and the public topbar. Each frame is the live page, cropped.
- **08 · Book card** (`BookCardStates`): not started; started; every chapter finished; Updated with a KO/EN
  pair; every chapter legacy; mixed (20 chapters); signed out; the two `maintainer-guide` books outside their
  project shelves.
- **09 · Loose document row** (`DocRowStates`): native started at a section; plain `md` finished; legacy not
  started; legacy at v3 finished on v2 (Updated); English with Korean terms; a Korean title; outside its
  project shelf; signed out.
- **10 · Continue reading** (`ContinueStates`): several; one; 한국어 first; up next; a loose document first; a
  legacy chapter first; the longest real title with no section yet; several at phone width.
- **11 · Grouping control** (`GroupingStates`): by project, by subject, phone width.
- **12 · Clear all reading data** (`ClearStates`): rest, confirming, clearing, cleared, failed, confirming at
  phone width.
- **13 · Loading, failed, empty and not found** (`StateStates`): loading at desktop, iPad and phone and on the
  public page; failed; empty; the 404 signed out and signed in; a member's "nothing public yet".

**Mounted parts (third row, boards 14–19)**, one instance each, the files the Pages and Components boards mount:
`BookCard`, `DocRow`, `ContinueReading`, `Grouping`, `ClearAll`, `LibraryState`.

**States reached only by interaction** (no prop forces them): hover on the lead, cards, rows, nav links, the
grouping options and buttons; the focus ring on each; the phone account menu open (a native `details`);
Escape closing the clear's confirmation; "Show all 20 documents" unfolded by project ("Long and many", then the
button; by subject the preset "Long · by subject, all 26 shown" sets it); Try again's loading then ready;
Clearing… then cleared (1.4 s); Back from a stand-in to the same scroll position. A preset never scrolls: it
lands at the page's top, so the clear's presets leave the clear at the foot of the page, and while the clear is
in any phase but rest the library's bar group says so ("Shown at the foot of the page, under “Your reading
data”: scroll down.", judge C05).

## The data used

- **Real:** only the `knowledge` project and its book's five chapter titles (the canvas content rule), and the
  signed reader's names: Tidewater's twenty chapter titles, the two `field-notes` documents, the knowledge
  guide's chapter 2 Korean title, "The write path" / "쓰기 경로", and the member's progress on the knowledge
  guide and Tidewater (2 of 5 with chapter 5 Updated and chapter 2 at 38%; 10 of 20 with chapter 10 Updated,
  11 and 12 started; the WAL document at 20% in "Checkpoints").
- **Invented, from the handoff's shared shape:** the org Quillwork (`@quillwork`); the member Mira Castell and a
  visitor from another org, Tomas Reyes of Larkspur (names only, no email); `lantern, phase by phase` (keys
  `p8`, `p9`, `p17-p18`, `p24`, all legacy, P8 a KO/EN pair) with two legacy documents, one at v2; `The orchard
  maintainer guide` (4 legacy chapters, the second `maintainer-guide`); three `quayside` legacy documents that
  read like a series and declare none, one at v3; one `helpdesk` legacy document in English with Korean terms
  ("Reading 존댓말 and 반말 in support tickets"); three projects with nothing to read (`kiln`, `marrow`,
  `spindle`); the subjects AI (a book of 6), English (a book of 8 and two loose articles) and Finance (one loose
  article, no book); 18 more `field-notes` documents for "a project with 20 loose documents", one with a Korean
  title; public projects `knowledge`, `lantern`, `field-notes`.
- **Placeholders:** none. Request ids on the error states are invented ("ref · lib-4c1e92a7", "ref ·
  clr-5e81b0d4").
- Never on the canvas: glide-ilab or base material, arb_upbit_1 content, any email, key or personal data.

## Files copied from signed rounds (unchanged in look and behaviour)

- `assets/logo.svg` from `jobs/01-reader/rounds/02-revise/canvas/project/assets/logo.svg`.
- From the reader's `reader.css` (into `library.css`, marked there): the sepia block; the tag rules `.rd-tag`,
  `--accent`, `--plain`; the state bar and foot strip rules; the stand-in rules `.rd-away*`.
- From the reader's `Elsewhere.dc.html`: the stand-in's structure, extended with this job's kinds.
- From the reader's `reader.js`: Tidewater's twenty titles and the member's progress (into `library.js`).
- From the reader's `flow.js`: the pattern of the flow controller (scenes, presets, the pressed signature, the
  dropped late result), rewritten for this job in `libflow.js`.
- The reader's button values (`rd-btn`: 15px semibold, 44px), its language switch (as the grouping control),
  its editorial error and not-found values and its skeleton timing, restated in `library.css` with this job's
  class names.

## What I assumed at each seam with the sibling jobs

- **`07-book-page`:** a book card opens `/@{org}/{project}/books/{book}`; its progress words are the reader's
  ("X of M finished", "0 of M finished" for an unopened book since the judge's C15, signed out "M chapters") and
  the card shows the same numbers
  the book page shows for the same book. The overall Continue reading is mine; each book's is theirs. **The two
  clears:** mine is an inline two-step confirmation at the foot of the library with a secondary trigger, a
  "Clear all reading data?" title, a list of what goes, a keep line, Cancel first with the focus and a danger
  "Yes, clear all reading data"; I assumed the per-book clear uses the same form with "this book" in place of
  "every library you read". If theirs differs, the critic reports it as a wave choice.
- **The frame:** I put the library in the app shell (open question 2). I assumed `07-book-page` and `08-review`
  decide their own frame; a conflict reaches the operator as a wave choice.
- **`08-review`:** the Review entry is mine, with the count of S3 `counts.due`; the page behind it is theirs (a
  stand-in here).
- **`09-legacy-and-print`:** a legacy chapter or document opens their legacy reader (a stand-in here); the
  library marks it with the reader's `ORIGINAL LAYOUT` tag and never says more.
- **The shared sample library:** the handoff's names, so the four canvases agree. I did not read the siblings'
  live drafts.

## Departures from the handoff

1. **Shell values changed on the canvas, logged as proposals.** The shell's structure is locked; these values
   are drawn because the accessibility floor needs them, and `build-prompt.md` → *Proposed shell values* lists
   them for the operator:
   - every nav target 44 px at every width (rail and strip links, the fold toggle, Sign out, the phone account
     summary); some are 36–40 px today above 40rem;
   - the topbar user line and the rail eyebrow in `kb-secondary`, since `kb-hint` is 3.0–3.4:1 on the band;
   - the current rail item's text in `kb-accent-strong` (6.37:1 light), since `kb-accent` on its wash measures
     4.37:1 in light (the render measured it at 4.36:1 in pass 1);
   - the danger button's label in dark is `#16130f`, the README's rule; the product's `.kb-appbtn--danger`
     hardcodes `#fbfaf5`;
   - for a member, the wordmark goes to `/library` (open question 3).
2. **The topbar shows a name where the product shows the email.** It reads "Mira Castell", because the handoff
   allows no email on the canvas. `build-prompt.md` says the product keeps the email.
3. **Sign in to save (§12) is not reused on `/@{org}`.** Its sentence, "you come back to this {place}, at this
   section", does not fit a library page. Instead, signed out, a one-line note under the head reads "Signed out,
   nothing you read here is saved. **Sign in** to keep your place in each book; you come back to this page." §12
   is unchanged, and this is open question 12.
4. **Page buttons take the reader's `rd-btn` values**, not `kb-appbtn`'s (`app-button.tsx`, 0.85rem). The page
   buttons are Continue, Try again, Clear all, the confirmation's buttons and Show all, at 15 px semibold, 44 px.
   The shell's own buttons, such as Sign out, keep `kb-appbtn`. Two reasons: the library is the reader's
   doorway, and these values hold 44 px at every width.
5. **Card grids use `repeat(auto-fill, minmax(min(17rem, 100%), 1fr))`**, not the bar's `auto-fit`. With
   `auto-fit`, a shelf with one book would stretch that card across the whole shelf; `auto-fill` keeps a lone
   card at the column width. At 390 px it is still one column.
6. **Two of the reader's values appear outside the reader:**
   - the reader's display stack (Fraunces, then Noto Serif KR), so a Korean chapter title sets in a serif Hangul
     face;
   - sepia, on every board. The cut asks for three themes, and the system's gap is "no sepia outside the reader".
     Under the drawn answer to open question 1, the built library never shows sepia.
7. **A third canvas row, "Mounted part — … (one instance)"** (boards 14–19), holds the six part files the
   Components boards mount, each in its own frame. The drafter's layout names two rows.
8. **Six Pages, where the handoff's sizing says "about 5 Pages or fewer"** (critique pass 01, C06). The public
   library became its own flow board (03) with its own width sheet (05), so each state bar lists only its own
   page; a member's library never links to `/@quillwork`, so one flow board could not reach it by a click.
   `design-check` warns only past 6.

## Open questions (my drawn answer, then the trade-off; only the operator's words settle them)

1. **Theme rule.** *Drawn:*
   - `/library`, and `/@{org}` for a signed-in reader, follow the app's rule: the operating system's light or
     dark, with no toggle and no sepia;
   - `/@{org}` signed out stays light, like every public page;
   - every board is also drawn in dark and sepia, so the operator can pick the reader's rule instead.

   *Trade-off:* someone reading in sepia or dark comes back from the reader to a library in the OS theme, a
   visible jump. Carrying the reader's setting into the library avoids the jump, but brings a reader-scoped
   theme, and its fourth option, into the app.
2. **Page frame.** *Drawn:* inside the app shell, like the console, so the console and the library are one step
   from each other. *Trade-off:* the shell's chrome is denser than the reader's calm frame, and the reader's
   logo already calls the library home. A chrome of its own would read more like a library, but would need its
   own way back to the console. The same question stands for `07-book-page` and `08-review`.
3. **Entry points.** *Drawn:*
   - a "Reading" group (Library, Review) above the console's "Org" group in the rail;
   - in the 40–64rem strip, all five links in one row, with a separator before Dashboard;
   - on the phone, five equal columns, none of them cut at 390;
   - the wordmark and the post-sign-in landing go to `/library` (proposed).

   *Trade-off:*
   - five items make a crowded phone bar, with 78 px columns;
   - moving the landing changes where every member arrives, admins included.
4. **By subject with nothing labelled.** *Drawn:* one last shelf, "Without a subject". When no subject exists at
   all (today), a note sits above it: "Nothing has a subject yet. A book or document gets one when it's
   published with a subject." *Trade-off:* today the by-subject view is one long shelf. Hiding the control until
   a subject exists would be quieter, but then the control would appear later with no explanation.
5. **Grouping memory.** *Drawn:* the URL (`?by=subject`) and the device (the `kb_reader` cookie); the URL wins.
   *Trade-off:* the cookie is per device, so the phone and the Mac can differ; a per-account setting would need
   a new field.
6. **Projects in the member's view.** *Drawn:*
   - projects with nothing to read are not shelves; one line under the shelves counts them and links to the
     dashboard;
   - a plain `PUBLIC` tag marks public projects, by project only;
   - private projects carry nothing.

   *Trade-off:* an empty project is invisible here. The tag is console vocabulary inside a reading page.
7. **Continue reading.** *Drawn:*
   - up to 4 items, one per book and one per loose document, most recent first;
   - each shows the section and percentage, and the language only when it is not English;
   - after a finished chapter, the book offers the next one ("Up next · you finished chapter 2", the signed
     reader's "Read next →", judge C16);
   - a finished book or document leaves the list.

   *Trade-off:* four items keep the lead dominant but hide a fifth book in progress. Offering the next chapter
   keeps a book in the list that the reader may have meant to stop.
8. **Another org's public books.** *Drawn:*
   - `/library` lists only the viewer's own org;
   - a public book from another org appears only in Continue reading, with its org in the book line (described,
     not drawn);
   - on `/@{org}`, a signed-in non-member sees the public books with their own progress and the note "Your
     progress in these books is private to you."

   *Trade-off:* the only ways back to another org's book are Continue reading and that org's address. A "From
   other libraries" shelf would help, but would mix tenants on one page.
9. **`/@{org}` with nothing public.** *Drawn:* the constant 404 for anyone who is not a member. A member sees the
   org heading with a panel, "Nothing here is public yet", and a link to make a project public. *Trade-off:* a
   visitor cannot tell "not yet" from "never", which is the point of 404-never-403. The member's panel is the
   one place the page tells the truth.
10. **Clear all reading data.** *Drawn:*
    - it sits at the foot of `/library` only, as an inline two-step confirmation;
    - it removes positions, bookmarks, highlights and notes, quiz answers, and review cards with their schedule;
    - it keeps the books, the review settings (time zone, daily limits) and the display cookie.

    *Trade-off:* no account page, so it lives only in the library. Keeping the review settings means a clean
    slate still has your limits.
11. **The Review count.** *Drawn:* the cards due (`counts.due`) in a small pill, hidden at 0, "99+" above 99.
    *Trade-off:* a count pulls attention to review from every page of the app. Without it, Review is just a
    word.
12. **New: the signed-out line on `/@{org}`** (departure 3). *Drawn:* a one-line note with a "Sign in" link,
    in place of §12's Sign in to save. *Trade-off:* the line says what is lost but is not the reusable pattern.
    Changing §12 to accept a `place` = "library" would make it one pattern, but §12 is signed.

## Component and token gaps (drawn as markup, never added to the system)

The system ships no component bundle, so there is no `x-import`, as the handoff says. Each part below is
markup in its own file, with its states on a Components board:

- **The shell's entry points:**
  - the "Reading" group;
  - the Review count pill (`.kb-count`), with a 3-character minimum width and a hidden zero.
- **Book card** (`BookCard`), with the book's 3 px progress bar.
- **Loose document row** (`DocRow`).
- **Continue reading** (`ContinueReading`): the lead with its progress edge, and the rows.
- **Grouping control** (`Grouping`): the reader's language switch, as signed.
- **Clear all reading data** (`ClearAll`): the inline confirmation, and the busy button with both labels in one
  cell.
- **Library states** (`LibraryState`):
  - the skeleton at each width;
  - the reader's editorial failed and not-found states;
  - the empty and nothing-public panels.

- **The shell's fold re-flows this page** (critique pass 01, C04). Folding the rail moves main's left edge (x
  240 → 16 at 1440) and widens `kbmain`, so the column re-centres and the head, the lead and the rows move left;
  at 1024 the wider `kbmain` crosses 60rem and Continue re-flows from stacked (lead 729.6px) to two columns (lead
  572px, rows 381.5px). The fold is the locked shell's own behaviour, so it is logged here and in
  `build-prompt.md` (*The fold*), not redesigned. The render measures it as `check=layout-shift` on 'Rail
  folded' and 'Navigation'.

**Token gaps:**

- **`kb-border-strong` fails 3:1 as a control border** (critique pass 01, C11): 1.58:1 light, 1.56 dark, 1.64
  sepia on `kb-surface`. It is the system's own value for input and control borders (the README), drawn on the
  grouping control, the secondary buttons, the count pill and the confirmation panel. No control is told apart by
  that border alone (each has its label; the pressed grouping option adds a fill and a 4.8:1 inset ring). For the
  operator and the system, never restyled here.
- no sepia outside the reader;
- no Hangul face in the cache (Noto Serif KR loads from Google Fonts CSS, as in the reader);
- no on-fill token (`--lib-on-fill` restates the README's rule).

**System components that miss the bar:** none mounted, so none measured.

## Measured contrast (every text and state colour this job adds or reuses, from the token values)

| Pair | Light | Dark | Sepia |
|---|---|---|---|
| Ink on paper (titles, shelf labels) | 14.27 | 14.04 | 10.79 |
| Ink on surface (card and row titles, the count pill) | 15.80 | 12.88 | 11.81 |
| Secondary on paper (counts, meta, state lines, rail eyebrow) | 6.75 | 7.97 | 6.28 |
| Secondary on surface (card meta) | 7.48 | 7.32 | 6.87 |
| Secondary on sunken (topbar user, disabled Cancel, ORIGINAL LAYOUT) | 6.23 | 6.78 | 5.96 |
| Ink on sunken (hovered row title) | 13.18 | 11.94 | 10.24 |
| Accent on paper (text links, the panel links) | 5.39 | 7.96 | 5.70 |
| Accent on surface (links inside a panel) | 5.97 | 7.31 | 6.23 |
| Accent-strong on paper (link hover) | 7.86 | 10.36 | 8.14 |
| Accent-strong on surface (skip link) | 8.70 | 9.51 | 8.90 |
| Rail current: accent-strong on accent-soft over paper | 6.37 | 7.11 | 6.55 |
| Rail current as the product draws it today: accent on the same | 4.37 | 5.47 | 4.58 |
| Strip and bar current: accent-strong on accent-soft over sunken | 5.92 | 6.00 | 6.23 |
| Pressed grouping, UPDATED: accent-strong on accent-soft over surface | 7.00 | 6.47 | 7.11 |
| Primary button label on accent | 5.76 | 8.32 | 7.00 |
| Primary hover: label on accent-strong | 8.40 | 10.83 | 10.00 |
| Danger button label on revoked | 5.17 | 6.84 | 6.13 |
| Danger hover: label on revoked-ink | 6.83 | 8.45 | 8.03 |
| Failed line: revoked-ink on revoked-soft over surface | 5.62 | 5.69 | 6.08 |
| UI: focus ring (accent) vs paper | 5.39 | 7.96 | 5.70 |
| UI: focus ring (accent) vs surface | 5.97 | 7.31 | 6.23 |
| UI: pressed inset ring (accent) vs accent-soft over surface | 4.80 | 4.97 | 4.98 |
| UI: progress fill (accent) vs its track (border) | 4.42 | 5.64 | 4.69 |
| UI: control border (border-strong) vs surface (the system value) | 1.58 | 1.56 | 1.64 |
| Hint on paper (never used for text) | 3.22 | 3.90 | 3.31 |

Ratios are WCAG 2 relative luminance, with rgba washes composited over their ground. In pass 2, the render's own
contrast check flagged no text on any board. The Components boards carry dark and sepia cells, so those themes
were measured in the browser too.

- **The control border fails 3:1**, at 1.6:1. It is the system's own `kb-border-strong` on the grouping control
  and the secondary buttons. Each of those controls is named by its label, and the pressed state adds a fill and
  an inset accent ring (4.8:1), so the state never rests on the border alone. It is logged under *Token gaps*
  (the list that feeds the build) and in `build-prompt.md` → *Colour roles*, not changed.

## Render log

**Pass 1** (`design-preview 06-library --click`, every board; `preview=done pngs=19 failed=0 issues=100
states=94`).

*What I saw, read PNG by PNG:*

- **Main:** the lead is the focal point, the shelves read as shelves, and the bar fits at 390.
- **Widths:** all four frames are correct.
- **Components boards:** the shell, book card, doc row, grouping, clear and states boards are correct, but
  clipped at the bottom.
- **The public library and the stand-ins** are correct.

*Measured, and fixed:*

- contrast: the current rail item measured 4.36:1, so its text is now `kb-accent-strong` (6.37:1).
- contrast: the disabled Cancel measured 4.26:1 at `opacity: 0.6`. A disabled button is now `kb-secondary` on
  `kb-surface-sunken` (6.23:1), with no opacity.
- target: the skip link was 116×37. It is now 44 px tall.
- target: the panel links ("Create an API key…", "Make a project public…") were 22 px. They are now 44 px
  (`lib-link--solo`), with negative block margins so the panel's rhythm holds.
- layout-shift: the clear's four presets scrolled the page to the clear (header y 88→548). Presets no longer
  scroll.
- layout-shift: "Show all N documents" → "Show fewer" shrank the button (166.8→101.5 px). Both labels now share
  one grid cell.
- layout-shift (Widths): Review changed width with its count (95.2 → 67.2 / 101.8 / 88.6 px). The pill is now
  always laid out at a 3-character width, and hidden at 0.
- page-clip / frame-clip: Main's frame was too short, and so was every Components board. The Continue and State
  boards are re-flowed to 3 per row (3304 wide).
- The stand-ins measured frame + 58 px, because `.kb-app` and `.rd-away` kept `min-height: 100vh` inside the
  flow board. They are now `min-height: 0` there, so only the flow board holds the window height.
- Added the preset "Long · by subject, all 26 shown", so the longest list is one press away and its height is
  measured.

**Pass 2** (every board, `--click`; `preview=done pngs=19 failed=0 issues=28 states=94`). Every contrast and
target line is gone, and so are the clear, Show all and Review layout shifts.

*Read:*

- Main's default state;
- the clearing state (the disabled Cancel now reads clearly);
- Review at 0 (the pill hidden, no shift) and at 99+;
- the empty library;
- the long list with all 26 shown;
- Widths;
- the re-flowed Continue and State boards in all three themes;
- the single parts.

*What is left:*

- **page-clip on Main, on purpose.** I kept the frame at 2330 for this pass so that each state reported its true
  height; a frame taller than a state reports its own height instead.
  - Measured tallest states: 3248 (with subjects, by project); 3218 (long, by subject, all 26 shown); 2978 (clear
    failed).
  - The tallest state a click reaches is long, by project, with field-notes' 20 documents unfolded and the
    clear failed: 2845 (long, measured) + 15 rows × 67.8 px (the row pitch, measured on that state's PNG) + 395
    (failed minus rest, measured) ≈ 4257.
  - **Main's h is 4280**, with `$preview` to match. It was set from those numbers; no third render was made.
- **The other frames are set from pass 2's measurements**: the content bottom of each PNG (ImageMagick trim)
  plus the board's 32 px padding, or `content=` where the frame was short.
  - Components: Shell 3112, BookCard 1728, DocRow 1212, Continue 3034, Grouping 651, Clear 2735, State 5392.
  - Parts: ClearAll 198, ContinueReading 321, DocRow 108, LibraryState 1171.
  - Pages: Library 2470 (content 2466), PublicLibrary 1010 (content ends at 1004).
- **layout-shift lines left, with reasons:**
  - "Continue · one item" and "Continue · 한국어 first" resize the lead. These presets swap the data: one item
    spans the full width, and the Korean title runs to two lines instead of three. That is a different scene,
    not a control showing its state.
  - "Rail folded" and "Navigation" move main and resize the lead and rows. This is the shell's fold, which is
    locked ("folding still works"): folded, main takes the width, as the product does today.
- **Two small CSS fixes after pass 2, not re-rendered:**
  - inside the new `inline-flex` panel links, the arrow lost its space ("dashboard→"); it now has `gap: 0.3em`;
  - "Show fewer" sat centred in the reserved width; it is now left-aligned with "Show all".

**Answer pass to critique 01, pass A1** (`design-preview 06-library --click --phone-click`, every board;
`preview=done pngs=21 failed=0 issues=27 states=213`, 472.6 s).

*Read:* Main (default, one item, 한국어 first, failed at phone with the bar at the window foot, folded, the long
list), PublicLibrary (visitor, signed-in visitor, member with nothing public, each 404, loading, failed, each
stand-in it reaches), Widths and PublicWidths (each preset; the bar lists only the page on screen), ShellStates,
StateStates, ClearStates, the other Components boards and the parts.

*Measured, and fixed:*

- frame-clip: PublicWidths 1381 in 1380 → `h` 1390; ShellStates 3132 in 3112 → 3140; ClearStates 2737 in 2735 →
  2745. StateStates measured about 4479 → 4480. PublicLibrary's tallest state (the visitor) measured 1151 → `h`
  1160.

*Gone, against the first draft's pass 2:* "Continue · one item" on Main and Widths; "Continue · 한국어 first" at
1440 (Main frame and the Widths desktop frame); the phone bar's move on "Failed to load" and "Try again"; every
presets-across-pages jump on Widths.

*Left, with reasons (see Critique pass 01):* "Continue · 한국어 first" at 390 (lead 356.4×295.4 → 356.4×243.7), 820
(775.2×234.8 → 775.2×204.5) and 1024 (729.6×234.8 → 729.6×204.5), C02's rebutted half; the fold on Main, Widths,
PublicLibrary and PublicWidths, C04, logged.

**Answer pass, pass A2** (`--click --board` PublicLibrary, PublicWidths, ShellStates, ClearStates, StateStates;
`preview=done pngs=6 failed=0 issues=9 states=54`, 126.8 s). Every frame-clip is gone; the 9 lines left are the
fold ('Navigation' on PublicLibrary and PublicWidths), logged under C04. *Read:* each of the five boards, and the
State and Clear boards whole: the three Loading columns at their real widths (3, 2 and 1 card columns), the
public Loading at 1024, the clear in every phase and theme. No third render was made.

*Larger text, measured with my own harness (root font size on a 390 and a 360 viewport, by project):* the
library's own content holds at 150, 175 and 200% (the bar wraps to two rows, 203–231 px tall; the grouping
control and the buttons wrap inside their boxes). The locked shell's topbar still scrolls sideways at 390: the
account summary at 200% (`scrollWidth` 403), the public topbar's Sign in at 175% (401) and 200% (454). Logged,
not changed (build-prompt → *Proposed shell values*, observation 6).

## Critique pass 01

Answered by `design-drafter` on 2026-10-20. Held for the judge, untouched in this pass: C05, C12, C13, C14, C15,
C16.

- **C01** (PublicLibrary frame 7 px short): fixed: the board is now the public flow PAGE (fills the window,
  interactive), `h` 1160 from its tallest state, measured 1151 in pass A1; pass A2 reports no frame or page clip.
- **C02** (the Continue presets resize the lead):
  - *one item:* fixed: from `kbmain` 60rem the lead keeps its 3fr column and the 2fr column stays empty, as a lone
    book card keeps its column width (departure 5); the 1024 px lead is gone from Main and Widths in pass A1;
  - *한국어 first:* rebutted: the preset swaps the data for the same chapter in its other language, so the lead
    keeps its width and its height follows the title's line count (390: 295.4 → 243.7 px; 820 and 1024: 234.8 →
    204.5 px). It is a different scene, not a control showing its state; reserving the English title's lines would
    leave a blank band under every shorter title. At 1440 the shift is gone, since the title now sets at the page
    title's step (C09).
- **C03** (the phone bar jumps 44 px on the short failed state): fixed: at phone width the stage's shell fills the
  window (`.lib-proto__stage > .sc-host > .kb-app { min-height: 100vh }` below 40rem, the product's own
  `min-height: 100dvh`), so the bar rests at the window foot in every state (`Main.phone.state-13.png`); pass A1
  measured no nav move on Main's phone clicks.
- **C04** (the fold re-flows the page, unlogged): fixed: logged under *Component and token gaps* and in
  `build-prompt.md` → *The fold* with the measured numbers (main x 240 → 16 at 1440; at 1024 Continue from stacked,
  lead 729.6 px, to two columns, 572 and 381.5 px). The fold is the locked shell's, not redesigned; its
  layout-shift lines remain on purpose.
- **C05** (the clear's presets leave the clear at the foot): held for the judge.
- **C06** (the public library is not an interactive page; one 32-button bar for two screens): fixed: the public
  library is its own flow board, `03 · Page — Public library, /@quillwork (the flow)` (9 presets and the theme
  row, ten stand-ins reached by clicks), with its own width sheet, `05 · …at 390, 820, 1024 and 1440`. Each bar
  (Main, Widths, PublicLibrary, PublicWidths) lists only the page on screen; no preset changes the page (checked
  on 7 pages of Widths and 11 of PublicLibrary); duplicate labels are gone. A member's Library link from the
  public flow opens the stand-in "Library — drawn on board 01". Logged as departure 8 (six Pages).
- **C07** (the Loading frames draw a column the page never has): fixed: `.lib` takes `width: 100%` up to the
  app's reading width, and each frame is the page's content column at that width (1024 at 1440, 775 at 820, 356
  at 390, 1024 for the public page) with 20 px of board padding; the board's lead says so. Pass A2 shows 3, 2 and
  1 card columns.
- **C08** (larger text scrolls the phone sideways): fixed for this page: the phone bar wraps to a second row
  (`flex-wrap`, items `flex: 1 1 0; min-width: min-content`), the grouping control's labels and the content
  buttons' labels wrap inside their boxes below 40rem; measured at 150/175/200% on 390 and 360, the library's
  content holds. What still scrolls is the locked shell's topbar (account summary at 200%, public Sign in from
  175%), logged as shell observation 6 in `build-prompt.md`, not changed (the critic exempted the account menu on
  the same ground).
- **C09** (seven type sizes, two near-miss pairs): fixed: five steps. The lead's title sets at the page title's
  step (`clamp(1.35rem, 1.05rem + 1.6cqi, 1.65rem)`), so it leads by place, its card and its progress edge, not
  by 4 px; the shelf labels join the 11 px mono step; panel and confirmation titles 1.15rem with the group titles.
  On screen: sans 13 and 15, mono 11, serif 18.4 and 26.4.
- **C10** (hard crops through text on ShellStates): fixed: every non-phone crop ends in a 4.5rem fade
  (`.lib-stage--fade`); a phone frame ends on its bottom bar; the board's lead says so. Read on pass A2's PNG.
- **C11** (`kb-border-strong` 1.58:1, logged in the wrong place): fixed: moved into *Component and token gaps* →
  *Token gaps* and into `build-prompt.md` → *Colour roles*; the system value is not restyled.
- **C12, C13, C14, C15, C16** (choices escalated): held for the judge.

## Judge pass 01 (`judge-01.md`)

Answered by `design-drafter` on 2026-10-20, the short pass after the judge. Every upheld item is fixed; the dropped
ones are left as drawn.

- **C05** (upheld, narrowed to a bar note): fixed: the library's state-bar group carries a note, "Shown at the
  foot of the page, under “Your reading data”: scroll down.", visible whenever the library is on screen and the
  clear is in any phase but rest (so on all four 'Clear all' presets, and on the same states reached by clicking).
  It is always laid out and shown by `visibility`, so the bar never changes height; it renders in both bar copies
  (`Library.dc.html`, `Elsewhere.dc.html`) so the stand-ins keep the same bar height. Presets still never scroll.
  On Main and on all four of Widths' bars (read on pass J1's `Main.frame.state-16.png` and
  `Widths.frame.state-16.png`). The public flow has no clear, so its bars carry no note. `build-prompt.md` →
  *Canvas-only* says so.
- **C12** (dropped): left as drawn, the frame stays the operator's question (open question 2).
- **C13** (dropped): left as drawn, with C12 (open question 1).
- **C14** (dropped): left as drawn; 07-book-page takes this job's confirmation form (the orchestrator carries it).
- **C15** (upheld, the zero wording): fixed: a member's unopened book card reads "0 of 4 finished" over an empty
  bar (`BookCard.dc.html`); the signed-out card keeps "4 chapters". The Book card board's first caption is now
  "Nothing opened yet · 0 of 4 finished". Follow-on, same ruling: the clear's cleared line read "Every book is back
  to Not started.", a book word the cards no longer show; it now reads "Every book and document is back to the
  start." (`ClearAll.dc.html`, build prompt *cleared* and copy list). Document rows keep "Not started" (a
  document's own state word, the reader's `unopened`).
- **C16** (upheld, both words): fixed: the lead's action reads "Continue reading →", and after a finished chapter
  the signed reader's "Read next →" (`ContinueReading.dc.html`); the place line ("Left off at …", "Up next · you
  finished chapter 2") is unchanged. Both labels fit at 390 (read on pass J1's `Main.phone.png`).

**Render, pass J1** (`design-preview 06-library --click`, boards Main, Widths, BookCardStates, ContinueStates,
ClearStates, BookCard, ContinueReading, ClearAll, Elsewhere; `preview=done pngs=10 failed=0 issues=14 states=91`,
205.8 s). *Read:* Main's default and 'Clear all · confirming' tops (the note shown, the header at the same y 88),
Main's cleared state (cards "0 of N finished", the new cleared line), the phone view (the lead's "Continue reading
→"), Widths' four bars on 'Clear all · confirming', the Book card and Continue boards. *Measured:* every content
height equals its frame (Main 4280); no new issue. The 14 lines are the ones already logged: the fold (C04) on
Main and Widths, and "Continue · 한국어 first" below 1440 (C02's rebutted half). No second render was needed.

## Verdict

- status: done
- job: 06-library
- round: 06-library/01-library
- boards: 19 `.dc.html` (see the handback)
- render_loop: first draft done: 2 renders, 13 fixes; answer pass done: 2 renders, 12 fixes; judge pass done: 1
  render, 3 fixes; open: the fold (logged, C04) and "Continue · 한국어 first" below 1440 (rebutted, C02)
- critique_answers: fixed 10, rebutted 1 (C02's Korean half); judge-upheld fixed 3 (C05, C15, C16); dropped left
  as drawn: C12, C13, C14
- design_check: `design-check: OK -- 1 job(s), 1 round(s), 19 board(s), open rounds: 06-library/01-library`

## Read-back pass

The orchestrator's concreteness check found `build-prompt.md` giving the shelf label two sizes: §4 *A shelf* said
"12px 700 uppercase ink", while the type table's *Labels* row (after C09's fix) and the canvas (`library.css`,
`.lib-group__name { font-size: 0.6875rem; … }`) put it at 11px. Changed: §4 *A shelf* now names the *Labels* step
exactly as drawn: `<h3>`, JetBrains Mono 700, 11px (0.6875rem), uppercase, `--kb-tracking-label`, `kb-ink`. No
other "12px" remains in `build-prompt.md`. No board, finding or decision changed; no render was needed (the canvas
is untouched). `design-check 06-library` re-run after the edit.
