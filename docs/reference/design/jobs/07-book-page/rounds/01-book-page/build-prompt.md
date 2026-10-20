# Build prompt — the book page (job `07-book-page`, round `01-book-page`)

This is the implementation contract for the book page drawn on the `07-book-page` canvas. It is a **draft until the
operator signs the round**; build nothing from it before then. Once signed, build exactly this, under RESPECT THE
DESIGN: never drop, simplify, restyle or "improve" an element. Where this file and the canvas disagree, the canvas
wins, and the disagreement is a bug in this file.

It is complete on its own, with one dependency: the signed reader's build prompt
(`jobs/01-reader/rounds/02-revise/build-prompt.md`), whose tokens, faces, sepia theme, buttons, tags, chapter-row
values, version rows and states (§§ *Tokens*, 5, 11, 14, 16) this page uses unchanged. Where this file says "the
reader's", it means that file's value, never a copy that may drift.

## Canvas-only (never build)

- **The state bar** (`[data-proto="state-bar"]`): on 01 the first row of the scrolled page, scrolling away with it;
  on 03 the board's first row, above the four frames. Its presets and its theme row stand in for real data and the
  reader's Display setting. **The foot strip** (`[data-proto="screens"]`) under 01.
- **04, the stand-ins** (`Elsewhere.dc.html`): Reader (signed), Legacy reader, Notes in this book, Library and
  Sign in. Each link goes to the real surface instead (*Wiring*).
- **03, the widths board**: its four frames (each the whole page at its width, at least one screen tall) and their
  captions.
- **Every Components board's** titles, captions, rows and grey ground (05 to 11), and the mounted parts' standalone
  frames (12 to 18).
- **`book.js`**: the sample library (Quillwork, invented), the per-reader state, the view model and the flow. The
  product reads the routes below; `BK.view()` is the shape of what the page computes from them.
- **The flow shells** `.bk-proto` (01), `.bk-stage` (03) and `.bk-away--flow` (the stand-in in the flow): canvas
  layout only. 01 scrolls as a document, as the product does (*Layout*).
- **A preset's reveal** on 01 (`reveal`, `jump` in `book.js`): a preset that names a part below the first screen
  ("Guide · chapter 2's versions open", the four "Clear · …") scrolls that part into view once it renders. The product
  has no presets; its own reveal is the clear flow's, in §7.
- **The sample data**: every name except the knowledge guide's five titles is invented.

## What it is, and where it sits

- **The URL:** `/@{org}/{project}/books/{book}` (S1 *Compatibility*). Public-gated by its project, like every page
  of a book: a member of the owner org or anyone on a public project reads it; anyone else gets the constant 404.
- **What points here:** the signed reader's back link ("‹" and the book title from 40rem, "‹ Book" below) and its
  "Back to the book →" on a last chapter; the library's book cards (`06-library`); the legacy reader's back link
  (`09-legacy-and-print`).
- **Its frame:** the reader's chrome (open question 2): the reader's root, the reader's themes, a slim top bar of its
  own, no app rail and no app topbar, for members and the signed-out alike.
- **Its theme** (open question 1): the reader's Display setting, read from the reader-settings cookie, for every
  reader, signed out included: System (default; `prefers-color-scheme` → light or dark, never sepia), Light, Dark or
  Sepia. A chapter and its book page always show the same theme. The page has no Display control of its own.

## Tokens

No new token. Every value is a `kb-*` token or one of the reader's values (its faces, `--rd-fs` at size 3 = 1.125rem,
`--rd-top-h` 3.5rem, `--rd-line` 3px, `--rd-on-accent`, sepia). The page's root is the reader's root at text size
3: the book page does not follow the reader's text size (open question 12).

### The type steps (six)

| Step | Face, size, weight | Used for |
|---|---|---|
| Book title | Fraunces (`--font-display`, with Noto Serif KR), `clamp(1.875rem, 1.2rem + 4cqi, 2.6rem)` on the head's own width (`container: bkhead`), 600, line-height 1.12, `kb-tracking-display`, `text-wrap: balance` | `h1` |
| Continue title | Fraunces, `calc(var(--rd-fs) * 1.18)` (21.24px), 600, 1.25 | the reader's `rd-next__title` |
| Description, h2s | Literata (`--font-reading`) at `--rd-fs` (18px), 1.5, secondary, for the description; Fraunces 18px 600 for "Contents" and "Your reading data" | |
| Body and controls | Source Sans 3 (`--font-body`) 0.9375rem (15px) | row titles (600), progress, buttons, confirmation |
| Meta | 0.8125rem (13px), secondary, `tabular-nums` | row meta, the count, the variants line, dates |
| Labels | JetBrains Mono 0.6875rem (11px) 700, uppercase, `kb-tracking-label` | the kind ("CODEBASE"), the Continue label, tags |

The confirmation's question is 1.0625rem (17px) 600: the one step between body and h2, used once.

### Colour roles

Ink for titles; secondary for meta, the description and lead copy; accent for the one primary button, the progress
fill and the language links; the reader's three tags (accent "UPDATED" and "CURRENT", plain "ORIGINAL LAYOUT", idle
"OLDER TRANSLATION"); revoked only in the clear flow (the trigger's text, the danger button's fill, the error line).
Measured contrast, every pair in every theme: `result.md` → *Contrast*.

## Layout

### The product's frame

The window scrolls.
- **The top bar** is sticky at `top: 0` (with `padding-top: env(safe-area-inset-top)` above it), `--rd-top-h` tall,
  full width, `kb-surface` with a `kb-border` hairline under it. There is no progress line on this page.
- **The page** sits under it in `<main>`, padding `kb-space-xl` top (`kb-space-2xl` from 64rem), the gutter at the
  sides, `kb-space-2xl` at the bottom (plus `env(safe-area-inset-bottom)`).

### Container and breakpoints

The root is the reader's size container `rd` (inline-size), with its gutter: `kb-app-gutter-phone` below 40rem,
`kb-app-gutter` from 40rem, `kb-app-gutter-wide` from 90rem.

### The columns

- **Below 64rem:** one column, `max-width: 40rem`, `margin-inline: auto`. In order: the head, Continue reading, the
  notes entry, then Contents and the reading-data foot. Gaps: `kb-space-lg` between head, Continue and the notes
  entry; `kb-space-xl` from them to Contents; `kb-space-2xl` from Contents to "Your reading data".
- **From 64rem:** a grid `minmax(0, 24rem) minmax(0, 40rem)`, `justify-content: center`, `align-items: start`,
  `column-gap: kb-space-xl` (`kb-space-2xl` from 90rem). Left: the head, Continue reading and the notes entry. Right:
  Contents and the reading-data foot. The two columns are centred as a whole. At 1024 the columns measure 384 and
  548 px; at 1440, 384 and 640.
- **Nothing scrolls sideways** at any width. Titles wrap whole; Korean under `:lang(ko)` with `word-break: keep-all;
  overflow-wrap: anywhere; line-break: strict`.

## The parts, their props and their states

### 1. Top bar (`BookTop`, board 05)

`<header>`, a three-column grid `auto minmax(0, 1fr) auto`, `column-gap: kb-space-sm`, padding-inline
`calc(var(--rd-gut) - 0.6rem)`, 15px.
- **Start:** the logo (the reader's `rd-logo`: 44×44, the 22px mark, `aria-label="knowledge library"`) → the
  library; then the reader's back link (`rd-back`): "‹" (secondary, `aria-hidden`) + "Library" at every width →
  the library.
- **Middle:** the book's title (Fraunces 15px 600, one line, ellipsis) over its progress ("2 of 5 finished") or,
  signed out, its count ("5 chapters") (13px secondary, `tabular-nums`). It is always laid out, and shown
  (`visibility`) only once the head's bottom edge has passed under the bar's bottom edge; while hidden it is
  `aria-hidden="true"`. Nothing in the bar moves when it shows.
- **End:** signed out, "Sign in" (the reader's `rd-tbtn rd-tbtn--signin`, accent text) → sign-in, returning to this
  page, at **every width** (the reader hides it below 40rem; a book page has no chapter end to carry it). Signed in,
  nothing.
- Props: `title`, `progress`, `compact`, `anon`, `onLogo`, `onLibrary`, `onSignIn`.

### 2. The book's head (`BookHead`, board 06)

`<header class="bk-head">`, a flex column, gap `kb-space-lg`, `container: bkhead / inline-size`.
1. **The id block** (flex column, gap `kb-space-sm`):
   - **The kind line** (15px secondary): the mono label "CODEBASE" or "SUBJECT" (the reader's `rd-head__n`), then
     where the book lives: for a codebase book, the project ("knowledge"), or on the public view (signed out, or a
     reader from another org) "@quillwork / knowledge"; for a subject book, its `subject` label ("English"). A
     codebase book with a `subject` adds " · <subject>" after the project.
   - **The title** (`h1`, *Type steps*).
2. **The description** (`description?`), Literata 18px secondary, `max-width: 36rem`. Absent when the book has none
   (most codebase books).
3. **Progress**, signed in (member or another org): "**2 of 5** finished" (15px ink, the numbers 600,
   `tabular-nums`), and under it a 3px track (`kb-border`, rounded) with an accent fill at finished ÷ every chapter.
   The fill is `aria-hidden`; the sentence carries the value. Updated counts as finished. Never opened: "**0 of 5**
   finished", an empty track.
4. **Signed out**, in place of progress: "**5 chapters**", then (15px secondary) "Signed-out reading isn't saved.
   <u>Sign in</u> to keep your place and progress in this book." — "Sign in" an inline accent link, underlined →
   sign-in, returning here.
- Props: `book`, `viewer`, `pk` (the canvas's progress set), `onSignIn`.

### 3. Continue reading (`Continue`, board 07)

The reader's "Next" block, values unchanged (`rd-next`: hairlines above and below, padding `kb-space-lg` 0, a flex
column with gap `kb-space-sm`, items at the start), with `margin-top: 0`. It is a `<section>` whose label is an
`h2` set as the reader's `rd-next__label` (mono 11px). It carries the page's **one primary button**.

The pointer is S3's: the most recently updated position among this book's chapters.

| State | Label (`h2`) | Title | Line(s) | Button |
|---|---|---|---|---|
| The pointer's chapter is started, with a section | "Continue · Chapter 2" | the chapter's title, in its shown variant's `lang` | "You stopped at **The write path**, 38% of the way in." (the section in ink 600, in its `lang`) | primary "Continue reading →" → the chapter at its saved position |
| Started, no section (legacy, `md`) | "Continue · Chapter 2" | title | "You stopped 64% of the way in." | the same |
| Started at 0% (just opened, or marked unread) | "Continue · Chapter N" | title | "You've opened it, but not read far yet." | the same |
| The pointer is on a finished chapter | "Next · Chapter 4" | the next chapter not finished after it (else the first not finished) | "You finished chapter 3." and its `summary` when it has one | primary "Read next →" → that chapter |
| Never opened, cleared, or signed out | "Start · Chapter 1" | chapter 1's title | its `summary` when it has one (`rd-next__lede`) | primary "Read chapter 1 →" |
| Every chapter finished, one or more Updated | "Finished" | "You've finished all 5 chapters." | "Chapter 5 has been updated since you finished it." (the first Updated, in book order) | primary "Read chapter 5 again →" |
| Every chapter finished, none Updated | "Finished" | "You've finished all 5 chapters." | — | **secondary** "Read chapter 1 again →" |

- A legacy chapter adds the plain tag "ORIGINAL LAYOUT" above the button.
- "→" is `aria-hidden`.
- S3 says Continue reading is absent for an anonymous reader and for one who has opened nothing: "Start · Chapter 1"
  is what takes its place (open question 6).
- Props: `book`, `viewer`, `pk`, `onOpen(key, lang, version, resume)`.

### 4. The per-book list's entry (`NotesEntry`, board 08)

A link under Continue reading, no border: "Notes in this book →" (15px 600 ink; the "→" `aria-hidden`, 0.3em after
the words, on their baseline) over a count line (13px secondary, `tabular-nums`): "33 items in 4 chapters", "2 items
in 1 chapter", or "Nothing marked yet". 44px tall at least,
padding `kb-space-xs` 0.5rem, pulled out by 0.5rem so its text keeps the column's edge; hover: `kb-surface-sunken`
and the title underlined. It opens the signed list (`05-annotations` → `BookNotes`) for this book.
- **Shown** when the signed-in reader has reading data in this book (any chapter not `unopened`). **Left out** signed
  out, never opened, and right after a clear.
- The count is S3's `GET annotations?org=&project=&book=` total (orphans included) and its distinct chapters.
- From here, the signed list's back link should read "‹ Back to the book" and return here (open question 7); the
  signed list is unchanged until the operator says.
- Props: `book`, `viewer`, `pk`, `onNotes`.

### 5. Contents

A `<section>`: the reader's list head (`rd-end__listhead`, margin 0): `h2` "Contents" (Fraunces 18px 600) and the
count "5 chapters" (13px secondary) on one baseline, the count at the end; the same head in every state. Under it,
for a `phases` or per-slice book only, the shape note (13px secondary):
- phases book: "One chapter for each phase that was explained, in phase order."
- per-slice book: "One chapter for each slice of P24, in slice order."

Then the rows: the reader's `rd-chs` (`<ol aria-label="Chapters">`, a hairline above, one under each row), in
`position` order, ties broken by `key`.

### 6. A chapter row (`ChapterRow`, board 09)

**The main link** is the reader's chapter row (§11), values unchanged: a grid `2.4rem minmax(0, 1fr)`, gap
`kb-space-sm`, padding 0.7rem 0.5rem, at least 44px, hover `kb-surface-sunken` and the title underlined.
- **The number:** the chapter's ordinal in manifest order, 1 to M (the reader's "Chapter N of M"), mono 13px
  secondary. Never the position: in a phases book the title carries the phase ("P8: …"); open question 4.
- **The title:** the `title` override, else the shown variant's document title, in its `lang`. The shown variant is
  the language this reader last read the chapter in, else the manifest's first variant.
- **The meta line**, signed in: "Not started", "Started · 38%" ("Started" at 0%), "Finished", or "Finished" with the
  accent tag "UPDATED" (finished on an older version than that variant's newest); a legacy chapter adds the plain tag
  "ORIGINAL LAYOUT". A per-slice book's row starts the line with the slice id ("P24.S3", mono 12px 600 secondary),
  joined to the word by the word's own separator, a space, "·" and a space, in one run of text: "P24.S3 · Started ·
  22%". Every dot on the line has the same spacing; the id is never a separate flex item with its own gap. Signed
  out: no state words, so only the slice id (no dot after it) or the legacy tag. **The line is always laid out**, at
  least 1.125rem (one tag) high, empty when it has nothing, so a row is the same height signed in and signed out.
- **It opens** the chapter in its shown language: a native chapter at `/@{org}/{project}/books/{book}/{key}` (plus
  `?lang=` when the shown language is not the first), at the reader's saved position; a legacy chapter in the legacy
  reader at the same URL.

**The variants line**, only when the chapter has two or more languages, or two or more versions in a language. It
sits under the title's left edge (padding-left `calc(0.5rem + 2.4rem + kb-space-sm)`, padding-bottom
`kb-space-xs`), 13px secondary, one wrapping row with gap 0 `kb-space-md` in which every language link (with its tag)
and the Versions button wrap as items of their own. On a row that has the line, the main link's padding-bottom drops
to `kb-space-xs`, so the line reads as part of its row:
- **Two or more languages:** one link per language, in manifest order: "English · v2", "한국어 · v1" (accent 600, the
  name in its own `lang`, 44px tall) → that variant's newest version at `?lang=`. A translation whose
  `translated_from.version` is older than its source's newest version adds the reader's idle tag "OLDER
  TRANSLATION" after its link.
- **One language, two or more versions:** the newest version and its date as text, "v3 · 14 Oct 2026".
- **"Versions"**: the reader's quiet button at 13px, 44px tall, padding-inline 0.6rem with `margin-inline-start:
  -0.6rem` (its label lines up with the links when it wraps to a line of its own), `aria-expanded`. Its two labels,
  "Versions" and "Hide versions", are stacked in one grid cell so it never changes width, each at the start of the
  cell; open, it takes `kb-accent-soft` with `kb-accent-strong` text. Only when some language has two or more
  versions.

**The versions panel**, under the variants line when open (one open at a time on the page), padding-left as the line,
gap `kb-space-md`, `role="region"`, `aria-label="Versions of chapter 2"`:
- one group per language, named (13px 600 ink, in its `lang`; plus "ORIGINAL LAYOUT" for a legacy variant) when the
  chapter has two or more languages;
- the reader's version rows (§14, `rd-vers` / `rd-ver`): "v2" (mono 15px 700) with the accent tag "CURRENT" on the
  newest, "Published 12 Oct 2026", "Translated from English v1" when recorded, and a secondary "View" button
  (`aria-label="View version 2, English"`) → that version at `?lang=&v=` (no `?v=` for the newest). The reader's
  "Reading now" is not used: nothing is open here.
- Props: `row` (the view model below), `open`, `onOpen(key, lang, version, resume)`, `onVersions(key)`.

### 7. Your reading data (`ClearData`, board 10)

At the foot of the Contents column, `kb-space-2xl` under the last row, signed in only, and only when the reader has
reading data in this book (or the flow below is under way). A flex column, gap `kb-space-sm`, items at the start.
- `h2` "Your reading data" (Fraunces 18px 600).
- **Idle:** "Your place, progress, bookmarks, highlights and notes in this book are kept for you alone." (15px
  secondary), then the trigger "Clear this book's reading data": the reader's ghost button with `kb-status-revoked-ink`
  text and a `kb-border-strong` hairline; hover `kb-status-revoked-soft` fill and a `kb-status-revoked` hairline.
- **Confirming** (the product's inline two-step pattern; the trigger is replaced): a group with hairlines above and
  below (padding `kb-space-lg` 0, `max-width: 36rem`), `role="group"`, named by its question:
  - "Clear your reading data for this book?" (17px 600 ink)
  - "This removes, from **The knowledge maintainer guide** only:" (15px secondary, the title in ink)
  - a bulleted list (15px ink): "your place and progress in 3 chapters"; "33 bookmarks, highlights and notes" (left
    out when there are none; "1 bookmark, highlight or note" for one); "your quiz answers, and the review cards from
    its chapters"
  - "It keeps every other book, the chapters themselves, and your display settings on this device. You can't undo
    this." (15px secondary)
  - actions (gap `kb-space-sm`; below 40rem each takes half the row): "Cancel" (ghost) first, then "Clear reading
    data" (the product's danger button: `kb-status-revoked` fill, `--rd-on-accent` label; hover
    `kb-status-revoked-ink`).
  - **Focus lands on Cancel** when the group opens from the trigger, never on the danger button, and the section
    ("Your reading data" with the group) is then **brought into view by the least distance**
    (`scrollIntoView({ block: "nearest" })`, `scroll-margin-top: calc(--rd-top-h + kb-space-md)` so the pinned top
    bar never covers it, `scroll-margin-bottom: kb-space-lg`): the trigger sits at the foot of the page, and the
    group opens below it, so without this Cancel, its focus ring and "Clear reading data" would open under the fold.
    The window moves only as far as it must; when the whole group is already on screen nothing moves.
  - **Escape** or Cancel closes it and returns focus to the trigger; nothing is cleared without the second press.
  - Focus itself never scrolls (`focus({ preventScroll: true })`); only the reveal above does. Focus moves only after
    a press inside this part, never when the page is rendered straight into a state.
- **Clearing:** the danger button's label becomes "Clearing…" (both labels stacked in one cell, so it keeps its
  width), `aria-busy="true"`; a second press does nothing; Escape does nothing. **Cancel steps out of view and keeps
  its place** (`visibility: hidden`, `aria-hidden="true"`, `tabindex="-1"`): the request has gone, so there is nothing
  to cancel, and a greyed-out Cancel would fall under 4.5:1 (2.85:1 light, 2.77:1 sepia, measured). When it fails,
  Cancel comes back.
- **Failed:** the group stays; under the actions, `role="alert"`, 15px `kb-status-revoked-ink`: "**Couldn't clear this
  book's reading data.** Nothing was cleared. Try again." The danger button is the retry.
- **Cleared:** the group and the trigger go; `role="status"`, `tabindex="-1"`, 15px secondary, `kb-radius-sm`:
  "**Reading data cleared.** Every chapter of this book reads Not started, and there's no place to continue from."
  The busy button goes with the group, so **focus moves to this line** (`focus({ preventScroll: true })`, then the
  same least-distance reveal), never left on the document body; with a keyboard it shows the system ring. A failure
  leaves focus on the danger button, which is the retry. The page re-renders from the
  cleared state: every row "Not started", progress "0 of 5 finished", Continue reading becomes "Start · Chapter 1",
  the notes entry is left out. The section stays until the reader leaves the page.
- The write is S3's `DELETE /app/reader/state?scope=book` with the book's `(org, project, book)`. It removes, for this
  reader and this book's chapters only: positions (place, progress, finished), bookmarks, annotations, quiz attempts,
  and review cards and their logs.
- Props: `book`, `viewer`, `pk`, `clear` (`idle | confirm | pending | failed | done`), `onAsk`, `onCancel`,
  `onConfirm`.

### 8. Loading, not found, failed (`BookState`, board 11)

The reader's §16, with the noun "book", inside the page under the top bar (which stays, with no middle).
- **Loading:** `role="status"`, `aria-label="Loading…"`, the reader's skeleton blocks in the page's own shape: the
  kind line, two title lines, the progress line and track, a Continue block (label, title, a line, a 44px button),
  then the list head and five rows; two columns from 64rem.
- **Not found:** "Not found · 404" / `h1` "Book not found" / "There's no book at this address. It may have moved,
  or the link may be wrong." / primary "‹ Back to the library". A private book's address, signed out, is this exactly
  (404, never 403).
- **Failed:** "Error · 500" / `h1` "Something on our side stopped reading." / "This book did not finish loading.
  Try again — and if it keeps failing, the reference below tells us where it stopped." / primary "Try again" / "ref ·
  bk-4c81d0e2" (the request's reference).

## The book shapes

- **A codebase guide** (the knowledge guide, 5 chapters): no description; the place line "knowledge".
- **20 chapters with a preface-like chapter at position 20** (Tidewater): drawn in place, as chapter 20 (open
  question 3); a description under the title. On a phone the top bar's middle keeps the book and its progress in view
  while the list scrolls.
- **A `phases` book** (`lantern`): rows numbered 1 to 4 in position order (8, 9, 17, 24); titles "P8: …", the joint
  chapter one row titled "P17 and P18: …"; the shape note. All legacy: "ORIGINAL LAYOUT" on every row, never an
  error.
- **A per-slice book** (`p24`): rows 1 to 4, each meta line starting with the slice id; the shape note.
- **All legacy, never opened** (`orchard`): every row "Not started" with "ORIGINAL LAYOUT"; Continue reading is
  "Start · Chapter 1"; no notes entry and no reading-data foot, so nothing empty is left.

## Member, another org, signed out

| | Member | Signed in, another org | Signed out |
|---|---|---|---|
| Place line | project | "@org / project" | "@org / project" |
| Progress, row states, Continue reading | theirs | theirs (S3: the same features) | none: "N chapters", "Start · Chapter 1", no state words |
| Notes entry, reading-data foot | when they have data | when they have data | never |
| Sign in | — | — | top bar at every width, and the head's inline link |
| A private book | readable | the constant 404 | the constant 404 |

Reading state is the reader's alone: nothing on the page shows anyone else's.

## Wiring

| Click | Goes to |
|---|---|
| Logo, "‹ Library", "‹ Back to the library" | the library, `/library` (members) or `/@{org}` (signed out) — `06-library` |
| A row's main link | `/@{org}/{project}/books/{book}/{key}[?lang=]`, the reader at the saved position (native) or the legacy reader (legacy, `09-legacy-and-print`) |
| A language link | the same, `?lang=<lang>`, at the saved position when that variant has one |
| A version's "View" | the same, `?lang=<lang>&v=<n>` (no `v` for the newest), from the top |
| Continue reading / Read next / Read chapter N | the chapter in its shown language, at the saved position for "Continue reading", else from the top |
| Notes in this book | the signed per-book list for this book (`05-annotations`) |
| Sign in | the existing sign-in, returning to this URL |
| Versions | opens or closes that row's versions panel, in place |
| Clear this book's reading data | the confirmation, in place |
| Try again | re-reads the page |

## Data the page needs (view model)

One server read, S3's `GET /app/reader/books/{org}/{project}/{book}` (signed in), alongside S1's manifest
(`GET /app/orgs/{org}/{project}/books/{book}`, public-gated); signed out, the manifest alone. The count line comes
from `GET /app/reader/annotations?org=&project=&book=`.

```
book:     { org, project, slug, title, kind: "codebase"|"subject", subject?, description?, visibility }
viewer:   "member" | "other" | "anon"          // member of the owner org, another org, signed out
head:     { kindLabel, place, title, description?, done, total, pct }        // done counts Updated
cont:     { kind: "continue"|"next"|"start"|"finished",
            n, total, key, lang, title?, legacy, section?, pct?, summary?, after?, updated: [n] }
rows[]:   { key, n, title, lang, legacy, state: "unopened"|"started"|"finished"|"updated",
            word, pct, slice?,                                               // slice = source.slice
            langLinks[]: { code, label, v, stale, legacy },                  // two or more languages
            single?: "v3 · 14 Oct 2026",                                     // one language, versions > 1
            multiVer, groups[]: { code, label, legacy,
              rows[]: { v, date: "Published …", current, from?: "Translated from English v1" } } }
count:    "5 chapters"
shapeNote?: phases | per-slice note
notes?:   { n, chapters, line }                                              // null → no entry
data:     { has, chapters, notes }                                           // has → the reading-data foot
```

- **From S1:** chapter order (`position`, then `key`), `title?`, `variants` with `{lang, version, format,
  updated_at, translated_from?}`, `source.phase|slice`, `summary` (the lede, S2). The version list of each variant
  comes from the existing `/versions` routes; dates are each version's publish date.
- **From S3:** per chapter, the state and `finished_version` (of the variant finished), `max_fraction` for "Started ·
  N%" (rounded), the resume's `anchor_id` (its heading's text is the section) and the language last read; the
  continue pointer; book progress = finished ÷ every chapter.
- **Stale translation:** a variant whose newest version's `translated_from.version` is older than the newest
  version of `translated_from.lang`.

## Every state, and the board that shows it

| State | Board, preset |
|---|---|
| The guide, 2 of 5 finished; chapter 2 at "The write path"; chapter 5 Updated | 01 "Guide · 2 of 5 finished" |
| Chapter 2 last read in 한국어 | 01 "Guide · last read in 한국어" |
| A chapter started at 0% (just opened, or marked unread): "Started" alone in its row; Continue's "You've opened it, but not read far yet." | 01 "Guide · chapter 3 started at 0%"; boards 07 and 09 |
| Chapter 2's versions open | 01 "Guide · chapter 2's versions open"; any row's Versions |
| Every chapter finished, one Updated | 01 "Guide · all finished, one Updated" |
| Never opened | 01 "Guide · never opened" |
| Tidewater, 20 chapters | 01 "Tidewater · 20 chapters" |
| Phases book; per-slice book; all legacy | 01 "lantern · phases book", "lantern · per-slice book p24", "orchard · all legacy, never opened" |
| Clear: confirming, clearing…, cleared, failed | 01 "Clear · …" (each brings the section into view); the trigger and the confirm button; board 10 |
| Legacy and not started; legacy and finished | 01 "orchard · all legacy, never opened", "Tidewater · 20 chapters" (chapter 7); board 09 |
| Signed out; another org; a private book signed out | 01 "Signed out · public book", "Signed in · reader from another org", "Signed out · a private book's address" |
| Loading, not found, failed | 01 "Loading", "Not found", "Failed to load" |
| The top bar's middle | scroll any state on 01 in Play; board 05 |
| Every theme | the bar's theme row on 01 and 03; the Components boards' dark and sepia rows |
| Every width | 03 |

## Every string written for the book page

### Top bar
- "Library" (after "‹"); "Sign in"; the logo's name "knowledge library"
- the middle: the book's title; "{done} of {M} finished" or "{M} chapters"

### Head
- "Codebase", "Subject"; "@{org} / {project}"
- "{done} of {M} finished"; "{M} chapters"
- "Signed-out reading isn't saved. Sign in to keep your place and progress in this book."

### Continue reading
- "Continue · Chapter {n}", "Next · Chapter {n}", "Start · Chapter {n}", "Finished"
- "You stopped at {section}, {pct}% of the way in."; "You stopped {pct}% of the way in."; "You've opened it, but
  not read far yet."; "You finished chapter {n}."
- "You've finished all {M} chapters."; "Chapter {n} has been updated since you finished it."
- "Continue reading →", "Read next →", "Read chapter {n} →", "Read chapter {n} again →"

### Notes entry
- "Notes in this book →"; "{n} item(s) in {c} chapter(s)"; "Nothing marked yet"

### Contents
- "Contents"; "{M} chapters"; "Chapters" (the list's name)
- "One chapter for each phase that was explained, in phase order."; "One chapter for each slice of {phase}, in slice
  order."
- the reader's words: "Not started", "Started · {pct}%", "Started", "Finished", "UPDATED", "ORIGINAL LAYOUT",
  "OLDER TRANSLATION", "CURRENT", "Published {date}", "Translated from {language} v{n}", "View"
- "{language} · v{n}"; "v{n} · {date}"; "Versions", "Hide versions"; "Versions of chapter {n}"; "View version {n},
  {language}"

### Your reading data
- "Your reading data"
- "Your place, progress, bookmarks, highlights and notes in this book are kept for you alone."
- "Clear this book's reading data"
- "Clear your reading data for this book?"
- "This removes, from {book title} only:"; "your place and progress in {n} chapter(s)"; "{n} bookmarks, highlights
  and notes" / "1 bookmark, highlight or note"; "your quiz answers, and the review cards from its chapters"
- "It keeps every other book, the chapters themselves, and your display settings on this device. You can't undo
  this."
- "Cancel"; "Clear reading data"; "Clearing…"
- "Couldn't clear this book's reading data. Nothing was cleared. Try again."
- "Reading data cleared. Every chapter of this book reads Not started, and there's no place to continue from."

### States
- "Loading…"; "Not found · 404"; "Book not found"; "There's no book at this address. It may have moved, or the link
  may be wrong."; "‹ Back to the library"
- "Error · 500"; "Something on our side stopped reading."; "This book did not finish loading. Try again — and if it
  keeps failing, the reference below tells us where it stopped."; "Try again"; "ref · {reference}"

## Keyboard and accessibility

- Every control is a real `<a href>` or `<button>`; focus shows the system ring (`kb-focus-w` in `kb-accent`,
  offset `kb-focus-offset`).
- Targets are at least 44×44 px; the head's inline "Sign in" sits in a sentence.
- Headings: `h1` the book; `h2` Continue's label, "Contents", "Your reading data".
- State is never told by colour alone: words ("Finished", "Started · 38%"), tags, the "Hide versions" label,
  "Clearing…".
- `prefers-reduced-motion`: the skeleton does not pulse (the reader's rule).
