# Build prompt — job `06-library`, round `01-library` (slice P29.S6)

The implementation contract for the library, the public org library, the app shell's two new entry points and
"Clear all reading data". Complete on its own: build from this file and the canvas, never invent. Where this file
and the canvas disagree, the canvas's board named here wins and the disagreement is a bug in this file.

Everything here extends the system (`design.json` → `kb`) and the signed reader
(`jobs/01-reader/rounds/02-revise/build-prompt.md`, "the reader's build prompt" below). Where a value is the
reader's, this file names the reader's section instead of restating it.

## Canvas-only (never build)

- **The state bar** (`<div data-proto="state-bar">`, "Prototype only · jump to a state:") at the top of every
  interactive Page, and its theme row. It is how the canvas reaches states no click reaches. It lists only the page
  on screen. A preset sets the page's whole state and leaves the page at its top, the clear's presets included
  (the clear is at the foot); while the clear is in any phase but rest, the library's group shows the note "Shown
  at the foot of the page, under “Your reading data”: scroll down." (always laid out, shown by `visibility`).
- **The two flow boards and their width sheets:** board 01 plays the member's library and board 04 draws it at four
  widths; board 03 plays `/@quillwork` and board 05 draws it at four widths. They are separate only because a
  member's library never links to the public page; that split is not a product structure.
- **The foot strip** (`<div data-proto="screens">`, "Canvas only · …").
- **The stand-ins** for other jobs' and other surfaces' screens (`Elsewhere.dc.html`: Book page, Reader, Legacy
  reader, Review, Console, Sign in, Sign out, Home, Larkspur's library, and "Library — drawn on board 01", where a
  member on `/@quillwork` lands from Library on the public flow board). Each is a dashed card on grey that names
  the screen that would be there.
- **The Components boards' grey ground, captions and frames** (`lib-board`, `lib-cell`, `lib-cap`, `lib-ground`,
  `lib-stage`, `lib-widths`) and the flow board's shell (`lib-proto`).
- **`libflow.js`** (the prototype's controller) and the sample data in `library.js` (`window.LIB`): build the view
  model below from S1 and S3, never from these files.

## What it is, and where it sits

| Route | Who | Frame | What |
|---|---|---|---|
| `/library` | a signed-in member | the app shell | Continue reading, then the org's books and loose documents by project or by subject, then "Your reading data" |
| `/@{org}` | anyone | signed out: the public shell; signed in: the app shell | the org's public projects' books and loose documents |
| the app shell | members | — | two new entries, Library and Review, above the console's three |

`/library` lists only the viewer's own org. The org is the viewer's tenant (the topbar crumb's "Org").

## Tokens

Every value is a `kb-*` token from `tokens.css` (light `:root, [data-theme="light"]`, dark `[data-theme="dark"]`),
plus these:

- **The theme at runtime** (the drawn answer to open question 1; the operator decides):
  - `/library`, and `/@{org}` for a signed-in reader: the app's rule. They follow the operating system
    (`prefers-color-scheme`): light or dark, with no toggle and no sepia.
  - `/@{org}` signed out: light, like every public page today.
  - Every board is also drawn in dark and sepia so the operator can choose otherwise.
- **Sepia** (only if the operator picks it for the library; open question 1): the reader's sepia block, unchanged
  (the reader's build prompt → *Themes*). Under the drawn answer (follow System) the library never shows sepia.
- **`--lib-on-fill`**, the label on a filled button: light `#fbfaf5`, dark `#16130f`, sepia `#fbfaf5`. This is the
  system's own rule (README: "white text on teal in light, dark text in dark, where the accent lightens. Danger
  buttons follow the same rule"); the product's `.kb-appbtn--danger` hardcodes `#fbfaf5`, which is wrong in dark.
- **The display face** on these surfaces: `"Fraunces", "Noto Serif KR", "Nanum Myeongjo", "Pretendard", Georgia,
  serif` (the reader's display stack: Noto Serif KR before the fallback, so a Korean chapter title in a Fraunces
  slot sets in a serif Hangul face).

Faces: Fraunces (display: page title, section titles, book titles, the lead's chapter title, editorial titles,
panel titles); Source Sans 3 (`--font-body`: everything else); JetBrains Mono (`--font-mono`: labels, shelf
labels, tags, the count, the reference line, the topbar user).

### Type steps on a screen (five)

| Step | Use | Value |
|---|---|---|
| Display | "Library" or the org name (the page title), and the lead Continue item's chapter title | Fraunces 600, `clamp(1.35rem, 1.05rem + 1.6cqi, 1.65rem)` on `kbmain` (26.4px at 1440). Page title: `--kb-leading-display`, `--kb-tracking-display`. Lead title: line-height 1.15, `--kb-tracking-display`, `text-wrap: balance` |
| Section and book titles | "Continue reading", "Books and documents", "Your reading data", book card titles, panel and confirmation titles | Fraunces 600, 1.15rem, `--kb-leading-heading` |
| Body and controls | row titles (600), notes, buttons, the grouping control | 15px (0.9375rem) |
| Meta | row meta, card meta, the progress count (600, ink), group counts | 13px (0.8125rem), `tabular-nums` |
| Labels | "CHAPTER 2 OF 5", "DOCUMENT", project labels, shelf labels (in ink), tags, the rail eyebrow | JetBrains Mono 700, 11px (0.6875rem), uppercase, `--kb-tracking-label` |

The lead title shares the page title's step: it leads by its place, its card, its progress edge and its button,
not by a near-miss size. The editorial error title (§9) is the reader's own step and stands alone on its screen.

### Colour roles

- `kb-paper` the page; `kb-surface` the lead, book cards, panels and the confirmation; `kb-surface-sunken` the
  topbar band, the nav strip and bar, row hover, skeleton blocks; `kb-border` hairlines and progress tracks;
  `kb-border-strong` control borders and card hover. **A system gap:** `kb-border-strong` measures 1.58:1 (light),
  1.56 (dark) and 1.64 (sepia) on `kb-surface`, under the 3:1 floor for UI parts. It is the system's own value for
  input and control borders, so it is used as the system names it and logged; no control here is told apart by
  its border alone (each has its label, and the pressed grouping option adds a fill and a 4.8:1 inset ring). The
  operator and the system decide the value.
- Text: `kb-ink` and `kb-secondary` only. **`kb-hint` is never text** (3.2:1 light).
- One accent (`kb-accent`) for: progress fills, the one primary button ("Continue reading →" on the lead, "Try again"),
  the current nav item, the pressed grouping, text links. `kb-accent-strong` for hover, pressed text, the current
  item's text.
- `kb-status-revoked` only on "Yes, clear all reading data"; `kb-status-revoked-soft` / `-ink` only on the
  clear's failure line.
- The reader's tags, unchanged: `UPDATED` (accent: `kb-accent-strong` on `kb-accent-soft`), `ORIGINAL LAYOUT`
  (plain: `kb-secondary` on `kb-surface-sunken`), and `PUBLIC`, a plain tag with the same values.

### Space

`kb-space-*` only: `xl` (2.4rem) between sections and between shelves; `lg` (1.5rem) a card's and a panel's padding;
`md` (1rem) between a section's parts and between cards; `sm` (0.6rem) and `xs` (0.35rem) inside an item. Gaps are
flex or grid `gap` throughout.

### Motion

`0.15s ease` on colour, background, border and shadow. The skeleton's sheen moves 1.4s; under
`prefers-reduced-motion: reduce` it is still and every transition is 0s (the reader's rule).

## Layout

- **Containers:** the shell's `kbapp` (on `.kb-app`) places the nav; `kbmain` (on `.kb-app-main`) lays out the
  content. Breakpoints 40, 64 and 90rem, as the shell.
- **The content column:** `.lib`, `max-width: var(--kb-app-read-w)` (64rem), `margin-inline: auto`, a flex
  column with `gap: kb-space-xl`. It never scrolls sideways at any width.
- **Main's padding:** the shell's (phone `1.1rem 1.05rem 1.6rem`; 40–64rem `1.35rem 1.4rem 2.2rem`; 64–90rem
  `1.6rem 1.7rem 2.2rem`; from 90rem `2rem 2.4rem 3rem`, capped at 88rem and centred).
- **At each width** (the Widths board, 04, draws all four):
  - **phone 390:** topbar (logo, wordmark, account avatar); content; the five-item bar sticky at the bottom.
    Continue reading stacks (lead, then rows); book cards one per row; the grouping control full width; the
    clear's buttons stack full width with Cancel last (column-reverse, so the safe action is nearest the thumb).
  - **iPad portrait 820:** topbar; the strip of five sticky under it; Continue stacks; cards two per row.
  - **iPad landscape 1024:** the rail appears (64rem); Continue stacks (main is under 60rem); cards two per row.
  - **desktop 1440:** rail; Continue in two columns (lead 3fr, rows 2fr, from `kbmain` 60rem); cards three per
    row. With one Continue item the lead keeps its 3fr column and the 2fr column stays empty, as a lone book card
    keeps its column width; the lead never stretches across the page.
  - **Larger text** (to 200% on a 390 phone, and at 360): nothing this page draws scrolls sideways. The phone bar
    wraps to a second row, the grouping control's labels and the content buttons' labels wrap inside their boxes.
    The locked shell's topbar is the one thing that still does (measured at 390: the app topbar's account summary
    at 200%, `scrollWidth` 403; the public topbar's "Sign in" at 175%, 401, and at 200%, 454); see *Proposed
    shell values*, observation 6. It is not this page's to change.

## The parts, their props and their states

### 1. The app shell's entry points (board 07)

The shell's structure is unchanged (topbar, rail, fold, strip, bottom bar, containers, the active-item rule).
This job adds two items and a group heading, and proposes three accessibility values.

- **The items, in order:** a **Reading** group — Library (`/library`), Review (the review page, `08-review`) —
  then the existing **Org** group — Dashboard, Documents, Graph.
- **Rail (from 64rem):** two `kb-rail__sec` blocks, each with its eyebrow (`kb-rail__head`: "Reading", "Org"),
  `gap: kb-space-lg` between them, inside the one `<nav aria-label="Sections">`.
- **Strip (40–64rem):** the five links in one row, with a 1px `kb-border-strong` separator (1.3rem tall,
  `aria-hidden`) before Dashboard.
- **Phone bar (below 40rem):** five equal columns, no separator: a wrapping flex row (`display: flex; flex-wrap:
  wrap`), each link `flex: 1 1 0; min-width: min-content`. At 390 and default text each item is 78px wide and
  3.6rem tall; no label is cut ("Documents" is the longest). With larger text, once the five labels no longer fit
  one row (from about 175% at 390), the bar wraps to a second row instead of scrolling sideways or cutting a label;
  each row's items share its width. The shell keeps filling the window (its own `.kb-app { min-height: 100dvh }`),
  so the bar rests at the window's foot in a short state (failed, empty) as in a long one.
- **Current item:** `aria-current="page"` on Library while on `/library`. Rail: `kb-accent-strong` text
  (proposed, see *Proposed shell values*), 2px `kb-accent` left edge, `kb-accent-soft` wash. Strip and bar:
  `kb-accent-strong` on `kb-accent-soft`; the bar adds a 2px `kb-accent` top edge. On `/@{org}` no item is
  current.
- **The Review count** (open question 11): S3 `counts.due` for the signed-in reader, in a pill after the label
  (`.kb-count`: mono 11px 700, `kb-ink` on `kb-surface`, 1px `kb-border-strong`, pill radius, `tabular-nums`,
  `min-width: calc(3ch + 0.8em + 2px)` so "99+" fits and every count is one width). Above 99 it reads "99+". The
  pill is always laid out, so Review never changes width as the count changes: at 0 it is `visibility: hidden`
  and the link's name is plain "Review"; on the phone bar (equal columns) a zero pill is `display: none`. The pill
  is `aria-hidden`; the link's name carries the count: "Review, 12 due". On the phone bar the pill wraps under the
  label if it does not fit beside it.
- **The logo and wordmark** link to `/library` for a member (today `/dashboard`; open question 3), and to `/`
  for a visitor who is signed out (unchanged).
- **The fold:** unchanged (`aria-label="Navigation"`, `aria-expanded`, `aria-controls="kb-rail"`, title "Hide
  navigation" / "Show navigation", lucide `PanelLeftClose` / `PanelLeftOpen` 16px). Folded, the rail is gone and
  main takes the width. **What that does to this page (the shell's own behaviour, logged, not changed):** main's
  left edge moves (x 240 → 16 at 1440) and the content column re-centres in the wider main, so the head, the lead
  and the rows move left; at 1024 the wider `kbmain` crosses 60rem, so Continue re-flows from stacked (lead
  729.6px wide) to two columns (lead 572px, rows 381.5px). Build it exactly so; the library adds nothing to the
  fold.
- **The public shell** (signed out on `/@{org}`): unchanged: brand to `/`, a spacer, the ghost "Sign in" to
  `/login?returnTo=/@{org}` (the return needs D18).
- **Signed in on `/@{org}`** (member or not): the app shell, the crumb "Org <their org>", no current item; Library
  goes to the viewer's own `/library`.

### 2. The page head

- `<h1 class="lib-title">`: "Library" on `/library`; the org's display name on `/@{org}` ("Quillwork").
- `.lib-sub` under it: `/library`: "{n} books · {m} documents" (plural rules: "1 book", "1 document"); hidden when
  the library is empty. `/@{org}`: "Public library · {n} books · {m} documents", or "Public library" when nothing
  is public (the member's view only).
- `/@{org}` adds one note (`.lib-note`, 15px secondary, max 40rem):
  - signed out: "Signed out, nothing you read here is saved. **Sign in** to keep your place in each book; you
    come back to this page." ("Sign in" is a text link to the sign-in page with `returnTo=/@{org}`.)
  - signed in (member or not): "Your progress in these books is private to you."

### 3. Continue reading (`ContinueReading`, board 10)

- **Shown** on `/library` only, when `GET continue?limit=4` returns at least one item. With none, the section is
  not drawn at all (no heading, no empty line).
- **Section:** `<section aria-labelledby>`, `<h2>` "Continue reading" on a hairline (`.lib-sec__head`).
- **Items:** up to four, most recent first, **one per book and one per loose document**:
  - a **started** chapter or document resumes at its saved place;
  - a book whose most recent position is a **finished** chapter offers its **next unfinished chapter** ("up
    next"); if none is left, the book does not appear;
  - a finished loose document does not appear;
  - a book from another org (a public book the reader opened) appears like any other, with its org named in the
    book line (described, not drawn; open question 8).
- **The lead (the first item)** is one link (`<a class="lib-lead">`) to the place it names, on `kb-surface` with a
  `kb-border` hairline and `kb-radius`:
  - its **top edge** is the reader's own 3px progress line: a `kb-border` track with a `kb-accent` fill at the
    chapter's fraction (0 for "up next"), `aria-hidden`;
  - **book line:** mono label "CHAPTER {n} OF {total}" (or "DOCUMENT"), then the book's title (or the
    document's project) in 15px secondary; when two books in the list share a slug, the book line adds " ·
    {project}"; then `ORIGINAL LAYOUT` when the chapter is legacy;
  - **title:** the chapter's title in the language last read (`lang` set; Hangul runs inside English get
    `lang="ko"`, the reader's §6a);
  - **place line** (15px secondary, `tabular-nums`): "Left off at **{section}** · {pct}%" (the section is the
    position's `anchor_id` resolved to its heading text, in ink 600); "Left off at {pct}%" when there is no
    section (plain `md`, legacy); "Up next · you finished chapter {n}" for an offered chapter; then " · 한국어"
    (the language's own name) only when the language is not English;
  - **the action:** a span styled as the primary button inside the link, "Continue reading →", or the signed
    reader's "Read next →" for an offered chapter (the place line already names which chapter was finished); the
    whole lead is the one target; the span has `pointer-events: none`.
  - **Hover:** the border goes `kb-border-strong`, `kb-shadow-hover`, and the button span goes
    `kb-accent-strong`. **Focus:** the system ring on the link.
- **The other items** are rows (`<ul class="lib-rows" aria-label="Also in progress">`): a hairline list; each row a
  link with the mono label and book line (13px), the title (15px 600 ink), and the place line (13px), plus
  `ORIGINAL LAYOUT` for a legacy item. Hover: `kb-surface-sunken` and the title underlined.
- **Opening:** a native chapter or a native or `md` loose document opens the reader at the saved place (the
  reader's *Opening and moving*); a legacy chapter or document opens the legacy reader (`09-legacy-and-print`).

### 4. Books and documents: the shelves

- **Section:** `<h2>` "Books and documents" on the same hairline head as Continue reading, with the grouping
  control at its right (wrapping under it below 40rem, full width).
- **By project (the default):** one shelf per project **that has something to read**, A to Z by project name.
  Projects with nothing to read are not shelves; one line under the last shelf says so (open question 6):
  "{n} projects have nothing to read yet. **They're on the dashboard →**" (link to `/dashboard`); with one
  project: "1 project has nothing to read yet." The line shows only by project.
- **By subject:** one shelf per subject label, A to Z, then a last shelf "Without a subject" for every book and
  loose document with no label. A subject shelf holds the subject's books and its loose articles; a one-article
  subject is a shelf with one document row and no card (it is a subject, never a book). When no subject exists
  at all (today), a note sits above the shelves: "Nothing has a subject yet. A book or document gets one when
  it's published with a subject." and the one shelf is "Without a subject".
- **A shelf:** `<section aria-labelledby>`, its head a mono shelf label (`<h3>`, the *Labels* step of the type
  table: JetBrains Mono 700, 11px (0.6875rem), uppercase, `--kb-tracking-label`, `kb-ink`; the project name or
  subject label as data), its count ("1 book · 2 documents", 13px secondary), and on `/library`
  by project a plain `PUBLIC` tag on a public project (open question 6; private projects carry nothing). Then
  the books as a card grid, then the documents as rows.
- **Card grid:** `<ul class="lib-books">`, `grid-template-columns: repeat(auto-fill, minmax(min(17rem, 100%),
  1fr))`, `gap: kb-space-md`; `auto-fill`, so a lone card keeps the column width.
- **Order inside a shelf:** books A to Z by title; documents newest first by date (so three documents that read
  like a series never look ordered as one).
- **Many documents:** a shelf with more than 6 documents shows the newest 5 and a quiet button "Show all {n}
  documents" (`aria-expanded`), which becomes "Show fewer". The button never changes size: both labels sit in one
  grid cell (the other `visibility: hidden`), left-aligned, so it keeps the width of "Show all {n} documents"; its
  accessible name is the visible label.
- **Outside its project's shelf** (by subject, and "Without a subject"), each card and row names its project
  (mono label), so two books with the slug `maintainer-guide` read "KNOWLEDGE · The knowledge maintainer guide"
  and "ORCHARD · The orchard maintainer guide". In a project shelf the shelf names it.

### 5. Book card (`BookCard`, board 08)

- **Props:** `card` `{id, title, titleParts[], project, slug, showProject, member, total, done, opened, updated,
  allLegacy, langs[]}`, `onOpen`.
- One link (`<a class="lib-book">`) to the book page `/@{org}/{project}/books/{book}` (`07-book-page`), on
  `kb-surface`, `kb-border` hairline, `kb-radius`, padding `md 1.1rem 1.1rem`, a flex column with `gap: sm`:
  - the project label (mono) when `showProject`;
  - the title (Fraunces 1.15rem 600, `text-wrap: pretty`, never truncated);
  - a meta line (13px secondary): signed out, "{total} chapters"; then the languages when the book has more
    than one ("English · 한국어", each in its own `lang`); then `ORIGINAL LAYOUT` when **every** chapter is legacy
    (a mixed book shows nothing extra);
  - signed in, pushed to the card's foot: the 3px bar (`aria-hidden`, fill = done ÷ total) and the count line
    (13px 600 ink, `tabular-nums`): "{done} of {total} finished", "0 of {total} finished" (the bar empty) when
    no chapter is finished or opened, the signed reader's "X of M finished" (Updated counts as finished); then
    `UPDATED` when any finished chapter has a newer version than the one it was finished on. "Not started" is a
    chapter's or a document's word, never a book's; "{total} chapters" is the signed-out form.
- **Hover:** `kb-border-strong`, `kb-shadow-hover`, the title underlined. **Focus:** the system ring.
- **States drawn:** not started; started; every chapter finished; Updated; every chapter legacy; mixed; a KO/EN
  pair; signed out; same slug in two projects.

### 6. Loose document row (`DocRow`, board 09)

- **Props:** `doc` `{id, title, titleParts[], lang, project, showProject, member, state, pct, updated, legacy,
  format, date, section}`, `onOpen`.
- A row link (`<a class="lib-row">`) in a hairline list: the title (15px 600 ink), then a meta line (13px
  secondary, items separated by "·"): the project label (mono) when `showProject`; signed in, the state in the
  reader's words, "Not started", "Started · {pct}%" ("Started" at 0), "Finished"; the newest version's date
  ("9 Oct 2026"); then `UPDATED` (finished on an older version than the newest) and `ORIGINAL LAYOUT` (legacy).
- No version numbers and no series markers.
- Opens the reader (native, `md`) or the legacy reader (legacy) at the saved place.

### 7. The grouping control (`Grouping`, board 11)

- `role="group"`, `aria-label="Group books and documents"`; two `<button type="button" aria-pressed>`: "By
  project", "By subject". The reader's language switch, as signed: 1px `kb-border-strong` box on `kb-surface`,
  `kb-radius-sm`, options 44px tall, 15px 600; rest `kb-secondary`, hover `kb-ink` on `kb-surface-sunken`;
  pressed `kb-accent-strong` on `kb-accent-soft` with an inset 1px `kb-accent` ring. Below 40rem (`kbmain`) the
  two options share the full width (`flex: 1 1 0; min-width: 0`, `padding-inline: 0.6rem`) and a label may wrap
  inside its option (`white-space: normal`, line-height 1.2, `text-wrap: balance`), so larger text never pushes
  the control past the edge.
- **Memory** (open question 5): the URL carries the choice (`/library?by=subject`; by project has no parameter)
  and the device remembers it in the `kb_reader` cookie (`libraryGroup: "project" | "subject"`); a URL with
  `by` wins over the cookie. Switching replaces the URL (no new history entry) and collapses every "Show all".
- On `/@{org}` it shows only when a public subject exists (none today, so not drawn there).

### 8. Your reading data and Clear all (`ClearAll`, board 12)

- **Where** (open question 10): the foot of `/library` only, after the shelves, above a hairline:
  `<section aria-labelledby>`, `<h2>` "Your reading data", the lead "What you've finished, your place in
  each book and document, bookmarks, highlights, notes, quiz answers and review cards. Only you can see them.",
  and a **secondary** button "Clear all reading data".
- **Props:** `phase` (`rest` | `confirm` | `clearing` | `cleared` | `failed`), `onStart`, `onCancel`,
  `onConfirm`.
- **confirm** (an inline two-step, the console's `kb-confirm` family, not a dialog): the button is replaced by a
  panel (`role="group"`, `aria-labelledby` its title; `kb-surface`, `kb-border-strong`, `kb-radius`, max 36rem):
  - "Clear all reading data?" (Fraunces 1.15rem, the section-title step);
  - "This removes, from every library you read:" and a list: "your place and progress in every book and
    document", "bookmarks", "highlights and notes", "quiz answers", "review cards and their schedule";
  - "It keeps the books and documents themselves, your review settings, and your display settings on this
    device. It can't be undone." (secondary);
  - the actions: **Cancel** (secondary, takes the focus when the panel opens) and **"Yes, clear all reading
    data"** (danger: `--lib-on-fill` on `kb-status-revoked`, hover `kb-status-revoked-ink`). Below 40rem they
    stack full width, Cancel last.
  - Escape or Cancel closes the panel, changes nothing, and returns the focus to "Clear all reading data".
- **clearing:** `DELETE /app/reader/state?scope=all`. The danger button keeps its width (both labels share one
  grid cell) and shows a spinner and "Clearing…", `aria-busy="true"`; Cancel is disabled (the request is
  already sent). A disabled button is `kb-secondary` on `kb-surface-sunken` with a `kb-border` edge and
  `cursor: not-allowed`, never dimmed by opacity (6.23:1 light, 6.78 dark, 5.96 sepia). Focus stays on the
  pressed button.
- **cleared:** the panel closes; a status line (`role="status"`, takes the focus): "**All reading data
  cleared.** Every book and document is back to the start." above the button. The page re-reads: Continue
  reading is gone and every card reads "0 of {n} finished", every row "Not started".
- **failed:** the panel stays open with an alert line at its top (`role="alert"`, `kb-status-revoked-ink` on
  `kb-status-revoked-soft`): "**Nothing was cleared.** Something on our side stopped, so your reading data is as
  it was. Try again." and, under the actions, "ref · {request id}" (mono 13px secondary). Pressing the danger
  button again retries.
- **What it removes** (S3 *Privacy*): every row of `reader_positions`, `reader_bookmarks`, `reader_annotations`,
  `quiz_attempts`, `review_cards` (and their `review_logs` by cascade) for the user, in every tenant. **It keeps**
  `reader_profiles` (time zone and daily limits) and the `kb_reader` cookie.

### 9. Loading, failed, empty and not found (`LibraryState`, board 13)

- **Props:** `kind` (`loading` | `failed` | `empty` | `notfound` | `nothingpublic`), `route` (`library` |
  `public`), `signedIn`, `org`, `onRetry`, `onPrimary`.
- **The shell stays in every state;** the content area speaks.
- **loading:** `role="status"`, aria-label "Loading…": a skeleton that mirrors the page at that width (the same
  grid classes as the real page): the head (title and sub bars); on `/library` the Continue section (a heading
  bar, the lead block 12.5rem — 14rem on the phone — and three rows of three lines, side by side from `kbmain`
  60rem); the shelves' head with a heading bar and the control's block (full width on the phone); a shelf label,
  three card blocks in the card grid (one per row on the phone, 7.5rem tall), a shelf label and two rows. Blocks
  `kb-surface-sunken` with a `kb-border` sheen (1.4s), still under reduced motion.
- **failed:** editorial (the reader's §16): "Error · 500" (mono label), "Something on our side stopped
  reading." (`<h1>`, Fraunces `clamp(1.5rem, 1.1rem + 2cqi, 2.2rem)`, balanced), "Your library did not finish
  loading. Try again — and if it keeps failing, the reference below tells us where it stopped." (`/@{org}`:
  "This library did not finish loading. …"), the primary "Try again", "ref · {request id}". Try again shows the
  skeleton, then the page; a result that arrives after the reader moved on is dropped.
- **empty** (`/library`, an org with no documents): under the "Library" heading, a panel: "No books or documents
  yet" / "Publish one with an API key, and it shows up here." / the link "Create an API key on the dashboard →"
  (`/dashboard`). No Continue reading, no grouping, no shelves; "Your reading data" stays at the foot.
- **notfound** (`/@{org}`): the constant 404 for an unknown org, an org with nothing public (to anyone not a
  member) and a private project's address (open question 9; 404-never-403): "Not found · 404", "Library not
  found", "There's no public library at this address. It may have moved, or the link may be wrong.", and one
  secondary action: signed out "Sign in"; signed in "‹ Back to your library" (`/library`).
- **nothingpublic** (`/@{org}` seen by a member of that org, nothing public): under the org heading and "Public
  library", a panel: "Nothing here is public yet" / "Visitors to this address see a not-found page until a
  project is public. Only members of {org} see this note." / "Make a project public on the dashboard →".

## Behaviour

- **Every link is a real `<a href>`** to its route; the canvas uses `#top` with handlers only because it has no
  router.
- **Opening a book card** goes to `/@{org}/{project}/books/{book}` (member) or the same URL's public view (signed
  out); **a document row** to the document's reader URL; **Continue items** to the reader at the position (or
  the legacy reader).
- **Back from any of them** returns to the library at the same scroll position (the browser's own history).
- **Grouping** changes the URL and re-renders without a reload; the scroll position stays at the shelves' head.
- **Keyboard:** Tab order is the skip link ("Skip to content" → `#main-content`), the topbar, the nav, then the
  page top to bottom. Every control is a button or a link; Escape closes the clear's confirmation.
- **Focus** is the system ring (`kb-focus-w` solid `kb-accent`, offset `kb-focus-offset`) on every control.
- **Below 40rem (`kbmain`)** a content button's label may wrap to two lines (`white-space: normal`, centred) rather
  than run past the edge with larger text; at default text no label wraps.
- **Targets:** every link and button in the page and the nav is at least 44px (`kb-tap`) tall, at every width.
  The skip link is 44px tall when it shows. A link standing alone under a panel's text ("Create an API key on the
  dashboard →", "Make a project public on the dashboard →") is `inline-flex`, `align-items: center`,
  `min-height: var(--kb-tap)`, the arrow `0.3em` after the text, with `margin-block: calc(var(--kb-space-sm) * -1)`
  so the panel's rhythm is unchanged. A link inside a sentence ("Sign in", "They're on the dashboard →") stays
  inline.

## Wiring (the routes and what each part reads)

- `GET /app/reader/continue?limit=4` → Continue reading.
- `GET /app/reader/library` → per-book progress, batched (done, total, opened, updated) and per-document state for
  the loose documents.
- The manifests (S1, `GET /api/books?project=` for each readable project of the tenant) and the loose documents'
  list → the shelves; `book.subject` and the document's `subject` → by subject.
- `counts.due` (S3 review) → the Review pill.
- `DELETE /app/reader/state?scope=all` → the clear.
- `/@{org}`: the org's public projects only (P19 visibility); for a signed-in reader, `GET library` for their own
  state on those books.

## Data the page needs (view model)

```
LibraryView {
  route: "library" | "public"
  viewer: { signedIn, memberOfOrg, name, initial, orgName }        // the topbar shows the email in the product
  status: "loading" | "ready" | "failed", requestId?
  title, sub                                                       // see §2
  due: number                                                      // counts.due
  group: "project" | "subject"                                     // URL ?by=, else cookie, else "project"
  continue: ContinueItem[]                                         // ≤ 4; empty → section absent
  shelves: Shelf[]
  noSubjects: boolean                                              // by subject, no labels at all
  emptyProjects: number                                            // projects with nothing to read
  isEmpty: boolean                                                 // the org has no documents
  missing: boolean, nothingPublic: boolean                         // /@{org} only
}
ContinueItem {                                                     // from reader_positions, newest updated_at first
  kind: "chapter" | "doc", next: boolean                           // next: the book's last position is finished
  legacy: boolean                                                  // format = legacy
  project, bookTitle?, bookId?, showProject                         // showProject: two listed books share a slug
  n?, total?, finishedN?                                           // chapter position in the manifest
  title, lang, langName                                            // langName only when lang ≠ en ("한국어")
  section?                                                         // anchor_id → its heading text; none for md/legacy
  pct                                                              // round(fraction × 100)
  href                                                             // the reader or legacy reader URL, at the position
}
Shelf { key, name, count, isPublic, books: BookCard[], docs: DocRow[], docsTotal, folded }
BookCard { id, title, project, slug, showProject, member, total, done, opened, updated, allLegacy, langs[] }
DocRow { id, title, lang, project, showProject, member, state, pct, updated, legacy, format, date }
```

- `done` = finished chapters ÷ every chapter in the manifest (Updated counts as finished); `updated` = any
  finished chapter's `finished_version` < its newest version; `opened` = any chapter has a position.
- `state` = no row → "none"; else `reader_positions.state`; `pct` = `round(max_fraction × 100)`.
- `date` = the newest version's date, "9 Oct 2026".

## Every state, and the board that shows it

| State | Where on the canvas |
|---|---|
| By project · today; by subject (no subjects; with subjects); switching | 01 presets and the control; 04 |
| Continue: several; one; 한국어 first; just finished (up next); a loose document; a legacy chapter; none | 01 presets (and clicks); 10 |
| Opened nothing yet; everything finished | 01 presets |
| Book cards (9 states) | 08; on 01 by preset |
| Loose documents (8 states) | 09; on 01 |
| Long and many (longest real title, Korean titles, 20 documents folded and unfolded) | 01 "Long and many" + "Show all 20 documents"; 01 "Long · by subject, all 26 shown" |
| Rail folded; Review count 0 and 99+ | 01 presets; 07 |
| Loading, failed (and Try again), empty | 01 presets; 13; 04 at each width |
| Clear all: rest, confirming, clearing, cleared, failed | 01 (click through, or presets); 12 |
| /@quillwork signed out; signed in not a member; member with nothing public; the three 404s; loading; failed | 03 presets and clicks; 05 at each width; 13 |
| The shell at 390, 820, 1024, 1440 | 04; 05; 07 |
| Light, dark, sepia | the theme row on 01, 03, 04 and 05; every Components board |

## Every string written for these surfaces

### Shell
- "Reading" (rail eyebrow), "Library", "Review", "Review, {n} due" (accessible name), "{n}" / "99+" (pill)

### Head
- "Library", "{n} books · {m} documents" ("1 book", "1 document")
- "Public library · {n} books · {m} documents", "Public library"
- "Signed out, nothing you read here is saved. Sign in to keep your place in each book; you come back to this page."
- "Your progress in these books is private to you."

### Continue reading
- "Continue reading", "Also in progress" (list name)
- "Chapter {n} of {total}", "Document", "{book title} · {project}"
- "Left off at {section} · {pct}%", "Left off at {pct}%", "Up next · you finished chapter {n}", " · 한국어"
- "Continue reading →", "Read next →"

### Shelves
- "Books and documents", "Group books and documents" (group name), "By project", "By subject"
- "Nothing has a subject yet. A book or document gets one when it's published with a subject."
- "Without a subject"
- "{n} book(s) · {m} document(s)" (shelf count), "Books in {shelf}", "Documents in {shelf}" (list names)
- "Public" (tag)
- "Show all {n} documents", "Show fewer"
- "{n} projects have nothing to read yet." / "1 project has nothing to read yet.", "They're on the dashboard →"

### Cards and rows
- "{n} chapters" (signed out), "English · 한국어", "{done} of {total} finished" ("0 of {total} finished" unopened)
- "Not started", "Started", "Started · {pct}%", "Finished", "{d Mon yyyy}"
- the reader's tags: "Updated", "Original layout" (set uppercase by the tag style)

### Your reading data
- "Your reading data"
- "What you've finished, your place in each book and document, bookmarks, highlights, notes, quiz answers and
  review cards. Only you can see them."
- "Clear all reading data", "Clear all reading data?", "This removes, from every library you read:"
- "your place and progress in every book and document", "bookmarks", "highlights and notes", "quiz answers",
  "review cards and their schedule"
- "It keeps the books and documents themselves, your review settings, and your display settings on this device.
  It can't be undone."
- "Cancel", "Yes, clear all reading data", "Clearing…"
- "All reading data cleared. Every book and document is back to the start."
- "Nothing was cleared. Something on our side stopped, so your reading data is as it was. Try again."
- "ref · {id}"

### States
- "Loading…" (aria)
- "Error · 500", "Something on our side stopped reading."
- "Your library did not finish loading. Try again — and if it keeps failing, the reference below tells us where
  it stopped." / "This library did not finish loading. …"
- "Try again", "ref · {id}"
- "No books or documents yet", "Publish one with an API key, and it shows up here.", "Create an API key on the
  dashboard →"
- "Not found · 404", "Library not found", "There's no public library at this address. It may have moved, or the
  link may be wrong.", "Sign in", "‹ Back to your library"
- "Nothing here is public yet", "Visitors to this address see a not-found page until a project is public. Only
  members of {org} see this note.", "Make a project public on the dashboard →"

## Proposed shell values (logged as proposals in `result.md`; the operator decides)

1. **Every nav target 44px at every width:** rail links, strip links, the fold toggle and Sign out
   (`min-height: var(--kb-tap)`); the phone account summary 44×44. Today some are 36–40px above 40rem.
2. **The topbar user line and the rail eyebrow in `kb-secondary`**, not `kb-hint` (3.0–3.4:1 on the band).
3. **The current rail item's text in `kb-accent-strong`** (6.37:1 light, 7.11 dark, 6.55 sepia on its wash over
   paper), not `kb-accent` (4.37:1 light, under 4.5).
4. **The danger button's label follows `--lib-on-fill`** in dark (`#16130f`), as the README's rule says.
5. **The wordmark and the post-sign-in landing go to `/library`** (open question 3).
6. **Observation, no value proposed: the topbar under larger text.** At 390 the app topbar's account summary
   pushes the page 13px sideways at 200% text, and the public topbar's "Sign in" button 11px at 175% and 64px at
   200%. Both are the shell's rem-sized parts (critique pass 01, C08); the shell's owner decides how they yield
   (wrap, shrink the wordmark, or drop the user line first).
