# Result — job `09-legacy-and-print`, round `01-legacy-and-print` (slice P29.S6)

**Unsigned draft.** One direction. Nothing here is decided until the operator signs the round.

The canvas is `jobs/09-legacy-and-print/canvas/project/`. Board numbers below are its titles' numbers.

## Intent, one line per Page

- **01 · Page — Legacy reader (the flow).** A member (or a signed-out visitor) opened a chapter or a document that is
  still an old HTML explainer; they came to read it to the end on a phone, an iPad or a Mac. The first thing they
  see is the document itself, filling the screen under the reader's own top bar, with one bar under it saying
  plainly that this one keeps its original layout.
- **02 · Page — The legacy screen alone.** The same screen with no state bar, for reading the build at 1440×900.
- **03 · Page — The legacy reader at 390, 820, 1024 and 1440.** The same prototype state at the four reference
  sizes at once, so the page that never scrolls and the frame that does are checked side by side.
- **04 · Page — Print: the native sheet and the ⌘P notice.** A member presses ⌘P on a native chapter (or on a
  legacy one); what they must see first is their chapter on paper, whole, in the light print palette, with the
  quiz's answers at the end.
- **05 · Page — Stand-in for another job's screen.** Canvas-only: where a click leaves this job.

## The plan, and its review

**Boards.** Five Pages (a flow board with every legacy screen and state, the screen alone, the four widths, the
print sheets and the stand-in), eight Components boards (the document bar, the frame's own states, the document's
look under each theme, the sheets, the Print control with the notice sheet, long content on paper, the quiz and
its key on paper, the masthead and colophon), and eleven mounted parts each shown as one instance (five drawn by
this job, six signed and copied).

**Type, spacing and colour.** Nothing new on screen: the reader's scoped values and the `kb` tokens only (the
interface's 13 px meta step, 15 px semibold status words, the reader's buttons and tags). One new screen value,
the frame's focus ring colour, follows the document's own scheme (below). On paper, today's `kb-print.css`
palette and S2's sizes (prose 10.5pt / 1.55, title 20pt, h2 14pt, h3 12pt, the floor 9pt), Literata for reading,
Fraunces for display, Source Sans 3 for labels, JetBrains Mono for code and addresses.

**The one bold move.** The document gets the whole screen and the reader's chrome gets out of its way: the frame
is the only scroller, the top bar never moves, and everything below the document (the document bar and the
signed chapter bar) folds away downward as the reader scrolls on, so the document grows into the space and never
jumps. Everything else is the signed reader, unchanged.

**Review against the handoff and the bar, and what changed before building.**
- *First plan:* one slim bar at the top holding everything S2 lists (back, title, previous, next, contents,
  language, versions, Print, bookmark). Reviewed: it would be a new bar for one kind of document, beside a signed
  top bar and chapter bar that readers already know, and at 390 it cannot hold nine controls in 44 px targets
  without a menu. **Changed to:** keep the signed top bar and chapter bar unchanged, and add one document bar
  between the frame and the chapter bar for what only a legacy document has (OQ1).
- *First plan:* hide the bars by overlay, as the signed reader does. Reviewed: the parent cannot pad a sandboxed
  cross-origin document, so an overlaid bottom bar would cover the document's last lines when the reader reaches
  the end, which is exactly when the bar shows. **Changed to:** the bottom chrome collapses (the frame grows
  downward; the document's content does not move), and the top bar never hides (collapsing it would move the
  document's content; overlaying it would cover its top).
- *First plan:* a "Not available here" row listing Theme, Text size and Highlights. Reviewed: a list of
  unavailable features reads like an error. **Changed to:** the signed line, plus one short plain sentence.
- *The state bar* scrolls away with the board on every Page (the operator's bar): it sits above the stage, never
  inside the never-scrolling page.

## What was designed

### Pages

- **01 · Legacy reader (the flow)** (`Main.dc.html`, interactive). One board holds the whole flow in its state
  (`lflow.js`): the document, language, version, theme, device scheme, panel, bar, progress, bookmarks, signed in or
  out, and the stand-in a click led to. Its state bar has one group per page, in one grid cell, so the product
  header never moves between pages:
  - *Legacy reader · a chapter in a native book* (Tidewater, chapter 7): Top of chapter; Reading · bar hidden;
    Reading · bar back; End · finished; End · marked unread; Bookmarked here; Chapter list open; Display; Signed
    out; Signed out · Sign in to save; Loading; Loading · slow relay; File missing; Relay failed;
  - *Legacy reader · an all-legacy book* (orchard's guide, lantern's P8): Orchard · reopened at saved place;
    Orchard · chapter list; Orchard · shorter than the screen; lantern P8 · English v2; English v2 · at a section
    한국어 lacks; 한국어 v1 · older translation; English v1 · older version;
  - *Legacy reader · a loose document*: Top · v2; Version history; v1 · older version; End · finished; A document at
    v3 · history; English with Korean terms; Signed out; Not found · no such document; Not found · a private address;
  - the stand-in pages (Book page, Library, A native chapter in the reader, Sign in, External link, Print · new
    tab).
  - Theme presets on every legacy page: Light, Dark, Sepia, System (device light), System (device dark).
  - **How a click reaches the other two legacy pages:** the logo (or Back on a loose document) opens the Library
    stand-in, which lists the five legacy items this canvas holds (orchard's chapter 2, lantern's P8, and the three
    loose documents), each opening its own page at its own state; from the loose document, its in-text link "the
    outbox" opens lantern's P8. The list is canvas-only: the real library is 06-library's.
- **02 · The legacy screen alone** (`Legacy.dc.html`): Tidewater chapter 7 at 1440×900, light.
- **03 · Four widths** (`Widths.dc.html`, interactive): one state drawn at 390×844 (safe areas simulated: 47 px
  top, 34 px bottom), 820×1180, 1024×768 and 1440×900; a click in any frame moves all four. Each frame keeps its
  own reading progress, as four devices would: the same saved anchor lands at a different fraction at each width
  (orchard's chapter 2 reopens at 29% on the phone, 39%, 32% and 34% on the wider three), and each frame's pill,
  chapter bar and Contents row agree with each other.
- **04 · Print** (`Paper.dc.html`, interactive): the knowledge guide's chapter 2 (English v2) cut into pages on A4
  and US Letter, with a canvas-only pager; presets for a table across pages, the quiz, the answer key and
  colophon, 한국어 v1, an older version (v1), a loose native document (v2), and ⌘P on the legacy reader.
- **05 · Stand-in** (`Elsewhere.dc.html`): copied from the signed reader and extended (below).

### Components (every state side by side)

- **06 · The document bar** (`BarStates`): reading (the longest real title, ellipsized), bookmarked, end ·
  finished, end · finished an earlier version, end · marked unread, end · signed out, a loose document with
  history, an older version with its notice, an older translation with a Korean title, loading (actions held),
  at 820 and 1440, and in dark and sepia.
- **07 · The frame's own states** (`FrameStates`): loading, slow relay, file missing (404), relay failed (502),
  not found (no such document, and a private one), at 390; relay failed in dark and loading in sepia at 1440.
- **08 · The document's look under each theme** (`LookStates`): the self-darkening Tidewater chapter and the
  light-only orchard chapter under Light, Dark, Sepia and System on a dark device; the English-with-Korean-terms
  document at 1024×768 in light and dark.
- **09 · Sheets** (`SheetStates`): Contents in a native book and in an all-legacy book, Display for a
  self-darkening and a light-only document, Version history at v3, and at 1440 the side panels (Contents in
  sepia, Version history on v1).
- **10 · Print control and the ⌘P notice** (`PrintStates`): the control at 390 (light, dark, held while loading)
  and 820; where it leads (the new-tab stand-in); the notice sheet for a legacy chapter (A4), a loose document's
  older version (US Letter) and a Korean chapter (A4).
- **11 · Long content on paper** (`PaperBlocks`): a wide table across pages, a long code line, a wide ASCII
  drawing, a collapsed callout printed open, a figure row of four that does not fit the column.
- **12 · Quiz and answer key on paper** (`PaperQuiz`): `choice` single and multi, `cloze`, `recall`, the key, and
  a chapter with twenty items.
- **13 · Masthead and colophon** (`PaperHeads`): current version, older version, loose document, translation
  that lags.
- **14–18, mounted parts this job draws:** `LegacyBar`, `LegacyDoc` (canvas-only stand-in for the framed
  document), `LegacyFrameState`, `LegacyDisplay`, `Sheet` (the print sheet; its pagination is canvas-only).
- **19–24, signed and copied unchanged:** `ReaderTop`, `ReaderBottom`, `ChapterList`, `VersionList`,
  `SignInToSave`, `ReaderState`.

### Directions

None. The operator asked for no options.

## States reached only by interaction

- **Hover** on every button and link in the bars and sheets (the reader's own hover), on 01 and 03.
- **Focus:** the skip link "Skip to the document" (first Tab on 01/02), the bar's controls, the frame's own ring
  (Tab into the frame), and "Show reading controls" (Tab past the frame while the bar is hidden). On desktop the
  frame takes focus quietly after load; its ring shows once focus moves by keyboard.
- **Scrolling the frame** on 01, 02 and 03: the bottom chrome folds away on a scroll down, comes back on a scroll
  up, at the top and at the end; the progress line and "Chapter N of M · P%" follow; at 95% the status words turn
  to the chapter end's.
- **In-document links:** a `#` link scrolls the frame; an external link opens the new-tab stand-in; a same-app
  link routes to the stand-in for where it goes.
- **The document's own quiz** (radio, Check, green and red feedback) inside the frame.
- **The Sign in to save card** from Bookmark while signed out; **Not now** closes it.
- **Retry** on Relay failed returns to Loading, then the document (a send id drops a stale result).
- **Larger text and browser zoom** (02, and 01 and 03 at the phone width): when the bottom chrome at its full height
  would leave the document less than min(40% of the page, 17rem), the page turns tight: the document keeps that
  much, the document bar scrolls inside itself with a fade at its lower edge, and the chapter bar stays whole.
  Reached by zooming the browser (150% and more on a phone) or a larger root font (150% and more); no preset
  reaches it, and no state at the reference sizes is tight.

## Data

- **Real:** the knowledge guide's five chapter titles and its chapter 2 as the signed reader holds it (English v2,
  12 Oct 2026; 한국어 v1, 20 Aug 2026); the signed reader's `reader.js` (books, Tidewater's twenty titles, the
  progress where chapters 1–10 are finished); the wave-2 samples set on paper (the quiz items from `04-quiz`, the
  figure rows and sources from `02-figures`, the diagram "One FastAPI process, two planes" and its print tones
  from `03-diagrams`); today's print palette from `kb-print.css`.
- **Made up** (all invented, in `legacydocs.js` and `legacy.js`): the org Quillwork (`@quillwork`); Tidewater's
  chapter 7 body; orchard's guide (four legacy chapters, v1, 21 Jul 2026: "Orchard in one page: what it schedules
  and why", "Seeds, trees and harvests: the job model", "The harvester: collecting results without losing any",
  "Pruning: retention, cleanup and the nightly sweep"; chapter 1 finished, chapter 2 started at 29% at section
  "trees"); lantern's "lantern, phase by phase" (P8 "Offline edits and the outbox", English v2 and v1, 한국어 v1
  "P8: 오프라인 편집과 아웃박스" from English v1; P9, P17–P18, P24); lantern's loose "Why lantern keeps notes as
  plain files" (v2 12 Sep 2026, v1 30 Jun 2026); "Ferry board, part 2: reading the timetable feed" (v3); "How the
  arrival board reads the Seoul 지하철 feed" (English with Korean terms, self-darkening); the private
  `harbor-ops` project's runbook (the not-found case); the error reference `lg-5d81e0a4`.
- **Placeholders:** `[host]` in every printed and shown address. The canvas clock and print date are 20 Oct 2026.
- **Never on the canvas:** no glide-ilab or base material, nothing from arb_upbit_1, no secrets, keys, emails or
  personal data; the signed-in reader is unnamed.

## Files copied from signed rounds, and every signed part that differs

**Copied unchanged** from `01-reader/rounds/02-revise/canvas/project/`: `reader.css`, `reader.js`,
`ReaderTop.dc.html`, `ReaderBottom.dc.html`, `ChapterList.dc.html`, `VersionList.dc.html`, `SignInToSave.dc.html`,
`ReaderState.dc.html`, `assets/logo.svg`.

**Copied and extended:** `Elsewhere.dc.html` (the stand-in): a `back` prop for the back button's label; three new
kinds, `reader` ("Reader — signed (01-reader)"), `newtab` ("Opens in a new tab: <address>") and `print` ("The
original document, in a new tab"); an `items` prop, a canvas-only list of the legacy items to open from the
Library stand-in (critique C01), in canvas-neutral colours, never the brand. The library kind's body names where
the real routes live (06-library, 07-book-page). Its other kinds are unchanged.

**Copied from `05-annotations`:** the legacy bookmark control's CSS (`.an-btn-w`, `.an-bar__btn`,
`.an-legacy__ctl`, `.an-legacy__na`) into `legacy.css`, and its markup (the button with both labels in one cell,
the line "Highlights are not available in this document.") into `LegacyBar.dc.html`. Words and look unchanged.

**Copied as data:** the quiz items, figure rows, sources and diagram above, into `paper.js`'s sample data, set by
the print stylesheet.

**Signed parts the legacy reader uses differently** (each also a departure below):

| Signed part | In the legacy reader |
|---|---|
| The chrome's hide-and-show (§ *The chrome*: top bar, chapter bar and pill hide together, by overlay, from the window's scroll; a tap toggles) | The top bar and the progress line never hide. The bottom chrome (document bar and chapter bar) collapses on a scroll down and returns on a scroll up of 0.2% of the document or more, at the top and at the end. Input is the bridge's `fraction` only: no tap toggle (the bridge reports no taps) |
| "Show reading controls" (first in the tab order, centred under the line) | First is "Skip to the document"; "Show reading controls" sits after the frame and exists only while the bottom chrome is hidden |
| The resume pill ("Picked up where you left off · **<section title>**") | "Picked up where you left off · **N%**", the fraction where the restore landed: the parent cannot read the document's headings |
| The version notices (§5, at the chapter opening) | In the document bar, above its status row; words unchanged ("this chapter" or "this document") |
| The chapter end's status words (§10) | In the document bar's status cell at 95% or more, in one grid cell with the reading line |
| Display (§13: Theme and Text size) | Theme unchanged; Text size replaced by "In this document", which says what the theme does here and that text size doesn't reach inside |
| Loading, not found and failed (§16) | Not found: `ReaderState` unchanged. Loading and the two relay failures: `LegacyFrameState`, the same pattern (skeleton, then a centred message and one action) inside the frame's area, with the bars usable |

## Seams with the sibling jobs (assumed)

- **`07-book-page`:** a legacy row ("ORIGINAL LAYOUT") on the book page opens this reader at
  `[host]/@quillwork/{project}/books/{slug}/{key}`; this reader's back link ("‹ <book title>", "‹ Book" below
  40rem) returns there. Tidewater has no slug in the signed data, so its addresses use `/books/tidewater/`.
- **`06-library`:** a loose legacy document opens here at `[host]/@quillwork/{project}/{key}`; back ("‹ Library")
  and the logo return to the library.
- **`08-review`:** never links here (legacy chapters make no review cards).
- **`01-reader` (signed):** Previous and Next to a native chapter open the signed reader; its chapter bar comes back
  to the legacy chapter, which opens in this reader again.
- **The frame:** the reader's own chrome, no app shell, for members and the signed-out alike.

## Departures from the handoff

1. **Three bars, not one** (S2 asks for "one slim bar"): the signed top bar, a new document bar, the signed chapter
   bar. OQ1.
2. **The bars' hide-and-show differs from the signed reader's** (above): the top bar never hides; the bottom
   chrome collapses instead of fading over the text; no tap toggle. OQ1.
3. **The frame changes height when the bottom chrome folds and returns.** The preview measures it as
   `check=layout-shift` on 01 and 03 ("clicking 'Reading · bar hidden' resizes 'Datums: …'", e.g. 1440×670 →
   1440×841). It is kept on purpose and not fixed: the frame is S2's `flex: 1` box, the document's content does
   not move (the frame grows downward), and the alternative, an overlay, would cover the document's last lines
   at the end, which a sandboxed cross-origin document cannot be padded for. If the operator prefers no movement
   at all, the bottom chrome never hides (OQ1). Measured in the answer pass (Main, 390×844 and 1440×900, by the
   presets and by a natural wheel scroll): on the fold the top bar, the frame's top edge, the frame's scroll
   position and the first visible line of text stay at the same pixel ("Converting between datums" at y 330 and
   133, before and after); only the frame's lower edge moves down (509 → 785 and 671 → 841 px).
4. **The resume pill names a percentage, not a section.** OQ4. A bridge message carrying the heading's text would
   restore the signed words; adding one is a contract change, so it is not drawn.
5. **No Full width and no Copy link** on the legacy path: neither is kept (the frame already fills the screen;
   S2's chrome has no line for either).
6. **The diagram on paper is drawn as markup** in the signed print tones, standing in for the signed SVG at 100%
   of the column; the build prints the signed SVG.
7. **The handoff's link list names "open question 10"** for a console Back; there are nine questions. Read as
   OQ9.
8. **A Korean framed document's title can break inside a word** at 390 ("P8: 오프라인 편집과 아웃박스"): the
   authored look sets no `keep-all`, and the reader never restyles a document. Logged, not fixed; the explain
   template could add it (outside this job).
9. **Thirteen links carry `href="#top"` and are handled by script** (critique C08), the signed reader's pattern
   (01-reader's departure 9): on a canvas the address each one names is a state of the flow board, not a page, so
   the click handler routes it and `#top` keeps the element a real link (focusable, Enter works, no dead link).
   They are: the skip link (Legacy), Print · new tab (LegacyBar), an in-document link (LegacyDoc), Back on a frame
   state (LegacyFrameState), the logo, Back and Sign in (ReaderTop), Previous, Next and the book link
   (ReaderBottom), a Contents row (ChapterList), the not-found page's library link (ReaderState) and Sign in
   (SignInToSave). In the build each carries its real address (build-prompt.md, Links).
10. **Under larger text or zoom the bottom chrome gives way** (critique C05; not in S2, which assumes the bars fit):
    the tight page keeps the document at least min(40% of the page, 17rem); the document bar scrolls inside itself
    and fades at its lower edge; the chapter bar and the safe area stay whole. And in the document bar a button's
    label wraps instead of running off the screen (`white-space: normal` on `.rd-btn` there; the signed button is
    `nowrap`): only under larger text or zoom does any label wrap, and at the reference sizes nothing changes.

## Open questions (each drawn one way; only the operator settles them)

1. **OQ1, the bars.** Drawn: the signed top bar (never hides) and progress line; under the frame, the document bar
   (status, Print · new tab, Bookmark this position, the two notes) above the signed chapter bar; the two fold
   away together on a scroll down and come back on a scroll up (0.2% of the document), at the top, at the end
   (and stay until a scroll up), and on focus. A hidden bar returns by touch through a scroll up, by keyboard
   through "Show reading controls". No bridge message added. Alternative: the bottom chrome never hides (no
   resize, less reading space: at 390 the bottom chrome takes 276 of the 763 px between the safe areas, so the
   document keeps 428 while it shows and 738 when it folds (it then runs under the home-indicator strip, as
   scrolled content does); measured on the pass-2 render).
2. **OQ2, the bookmark and the notes.** Drawn: Bookmark this position beside Print · new tab, at the end of the
   document bar's row; under the row, the signed line "Highlights are not available in this document." then
   "The theme and text size don't restyle it." in the same 13 px meta step, never over the document.
3. **OQ3, finishing.** Drawn: at 95% or more the bar's status cell turns to the chapter end's words: "Finished ·
   Saved to your progress." with Mark as unread; "Not finished · Marked as unread. Read it to the end again to
   finish it." with Mark as finished; "Finished · You finished an earlier version. This chapter has been updated
   since."; signed out "Not saved · Signed-out reading isn't saved. Your display settings stay on this device."
   with Mark as finished, which asks to sign in. An older version shows no status.
4. **OQ4, resume and progress.** Drawn: restore by anchor, else fraction; the pill "Picked up where you left off ·
   29%" (orchard's chapter 2, where its anchor "trees" lands on the phone) with From the top; the 3 px line and "Chapter N of M · P%" from the bridge's fraction.
5. **OQ5, the notices.** Drawn: in the document bar, above its status row, in the signed words; the top bar's
   "Older version · vN" tag from 40rem as signed.
6. **OQ6, the theme over the document.** Drawn: the bars take the reader's theme; a self-darkening document shows
   its own dark look when the theme is Dark, or System on a dark device (the frame's `color-scheme`), and its
   light look under Light and Sepia; a light-only document stays light in every theme. Display keeps Theme and
   says what it does here; text size is not offered. Whether browsers honour the frame's `color-scheme` is the
   P30 device check (D36 (7)).
7. **OQ7, the native sheet.** Drawn: masthead "knowledge · <book> · Chapter n of N" over the address, version and
   print date; colophon naming the version and where the current one lives (no "knowledge console"); the answer
   key, "Answers", at the chapter's end, numbered as the questions, with the key and the why; a collapsed callout
   prints open; a wide table continues under its repeated header; a long code line wraps with a 2-character hang;
   a wide ASCII drawing scales down to 6.5pt at least, then wraps; a figure row stays side by side while each item
   keeps 13rem, else even rows; faces and sizes as S2 (prose 10.5pt). **A member's saved quiz answers, highlights
   and notes do not print** (S2 is silent; the sheet is the chapter, the same for everyone).
8. **OQ8, the words.** Drawn: the control "Print · new tab", described as "Opens the original document in a new
   tab, where it prints in its own layout."; the notice sheet "This chapter prints from its own page" (full words
   in the build prompt).
9. **OQ9, a legacy document opened from the console.** Answered in words, not drawn (the console is unchanged): it
   opens in this same reader chrome at its pretty address, and Back goes where the document belongs (its book
   page, or the library), not to the console's list.
10. **The y-px bridge option.** Restoring and resuming by fraction drifts when the frame's height changes; a bridge
    `restore` by y-pixels would be exact on the same device. Not drawn (contract change).
11. **Print sheets for the library, the book page or review:** none drawn; none is asked for.
12. **The wave's sample library** (critique C13). The handoff fixes the names (org, projects, book titles, counts,
    keys) and leaves the chapter titles free; the three wave-3 drafts that draw lantern and orchard (06-library,
    07-book-page and this job) invented different products, titles, dates and progress for them. Drawn here: lantern
    an offline notes app ("P8: Offline edits and the outbox"), orchard a job scheduler ("Seeds, trees and harvests:
    the job model"), each on written document bodies. The operator picks one set; the jobs that differ change to it
    in a superseding round. This round keeps its own until then.

## Component and token gaps

No bundle ships, so every component is a gap, drawn as markup and logged:

- **Drawn by this job:** `LegacyBar` (the document bar), `LegacyFrameState` (loading, slow, missing, failed),
  `LegacyDisplay` (Display for a legacy document), the legacy page layout (`.lg-page`, `.lg-bottom`), the print
  sheet (`paper.css` part 1).
- **Signed, used unchanged:** `ReaderTop`, `ReaderBottom`, `ChapterList`, `VersionList`, `SignInToSave`,
  `ReaderState`, the resume pill, the sheets, the annotations' bookmark control.
- **Larger text in the signed bars** (critique C07; a gap, never restyled here): the signed chapter bar
  (`ReaderBottom`) lays "‹ Previous", "Contents" with its counter, and "Next →" in fixed columns, so its labels touch
  at a 150% root font and overprint at 200% on the 390 px phone (the signed 01-reader draws the same geometry to the
  pixel). Below 320 CSS px (a phone at 300% browser zoom, past WCAG's reflow width) the signed top bar's "‹ Book"
  also overprints "Display". The build should let both bars wrap or drop to icons-with-labels under larger text;
  that is a change to the signed reader, for the operator.
- **Token gaps:** the frame's focus-ring colour on a dark document (`#62bdb2`) is not a `kb` token (proposed below);
  the print palette lives in `kb-print.css`, not in `tokens.css`; sepia and the reader's faces stay reader-scoped.
  No change to the app's own light or dark tokens.

## Measured contrast of every colour this job adds

Everything on screen in the bars, sheets and frame states is `kb` tokens and the reader's scoped values, already
measured by the signed reader in light, dark and sepia; this job adds no text colour on screen. Added:

| Colour | On | Ratio | Where |
|---|---|---|---|
| Ring `#0f6f66` (light `kb-accent`) | `#fbfbfa`, a light document page (light, sepia, and dark over a light-only document) | 5.82 | the frame's focus ring (UI ≥ 3) |
| Ring `#62bdb2` (dark `kb-accent`) | `#17191c`, a document's own dark page | 7.92 | the frame's focus ring on a dark document |
| Print ink `#1b1714` | paper `#ffffff` / sunken `#f4f1ea` | 17.81 / 15.79 | prose, headings |
| Print secondary `#4a433a` | `#ffffff` / `#f4f1ea` | 9.74 / 8.64 | masthead, captions, hints, hrefs, code comments |
| Print hint `#6d665a` | `#ffffff` | 5.68 | the recall answer's writing lines (UI) |
| Print accent `#0a544e` | `#ffffff` | 8.78 | an accent card's border |
| Print border `#c9c2b3` | `#ffffff` | 1.77 | hairlines and table rules only (not a UI part) |
| Diagram line `#7c7362` | `#ffffff` / node `#fffefa` | 4.68 / 4.64 | signed print tones |
| Diagram ink `#26211c` | `#fffefa` | 15.80 | signed print tones |
| Diagram store `#44617a` / ink `#33506a` | `#ffffff` / `#e3e6e7` | 6.49 / 6.71 | signed print tones |
| Canvas-only note `#3d362d` | `#f4f3ef` | 10.72 | captions on the boards (never built) |

The framed documents' authored look (REFERENCE, kept as authored): ink `#1f2328` on `#fbfbfa` 15.26; meta `#59636e`
5.90; links `#0b57d0` 6.17; dark ink `#e6e6e6` on `#17191c` 14.11, dark meta `#a8b0b8` 8.02, dark links `#8ab4f8`
8.36.

## Render log

Instrument: `python3 scripts/workflow.py design-preview 09-legacy-and-print --runtime <the handoff's dc-runtime.js>
--click`, a throwaway headless profile, output in the session scratchpad. Every PNG of both passes was read.

**Pass 1** (all 24 boards and the two phone views; 26 PNGs, 109 states, 55 issues):
- 48 `check=layout-shift`: 43 on 04 (the presets and the pager moved the masthead, a `<header>`, sideways with the
  canvas-only page strip), 5 on 01 and 03 (the frame grows when the bottom chrome folds);
- 4 `check=frame-clip`: 06 (1855 in 1500), 07 and 09 (2076 in 2000), 15 (5068 in 1200);
- 3 `check=clipped`: the Print control's visually-hidden description (`#lg-print-hint`, a 1×1 box) on 01, 02, 03.

Fixed after pass 1:
1. the Print description is a `display: none` element still named by `aria-describedby` (nothing clipped);
2. 16's loading and slow-relay texts were swapped (the `aria-hidden` mapping);
3. 05's stand-in named the wrong destination after Next; it is neutral now;
4. the resume pill names the landed percentage ("Picked up where you left off · N%");
5. the print runs shared the class `pp-t` with print tables, so prose and headings took the table cell's style:
   runs are `pp-r` now;
6. a table header could sit alone at a page's foot: a split at row 0 moves the whole table to the next page, and
   `thead` takes `break-after: avoid`;
7. the quiz head could be left without its first question: `break-after: avoid`;
8. the masthead is a `div` (the sheet's first block, not a landmark), so nothing called a header moves with the
   canvas-only page strip (the 43 lines);
9. 06, 07, 09 and 15 resized to hold their content;
10. 05's long address overflowed at 390: it wraps;
11. the framed document's quiz legend straddled its fieldset border: floated, the next block clears it;
12. the bar's second note restored to S2's sense ("The theme and text size don't restyle it."), short enough for
    two lines at 390;
13. the canvas shells no longer set `min-height: 100vh` (the Pages reported their frame's own height).

**Pass 2** (the 18 boards this job draws and the two phone views; 20 PNGs, 109 states, 5 issues). The six signed
parts copied unchanged (19–24) were not re-rendered.
- 0 frame-clip, clipped, contrast, target, page-clip, hover-contrast, same-target or dead-link lines;
- the 5 `check=layout-shift` lines are the frame growing as the bottom chrome folds (390×428 → 738, 820×931 → 1121,
  1024×539 → 709, 1440×671 → 841, on 01 and 03): kept on purpose, departure 3 and OQ1.

Made after pass 2 from its pictures, not re-rendered (two passes is the limit):
1. heights from the measured last painted row (the preview reports the larger of the frame and the content):
   01 1040 → 991 (all 47 states end at row 990), 04 2300 → 2269 (the tallest state, the native chapter, ends at
   2268), 03 1420 → 1404 (all 52 states), and the Components boards trimmed to their background's end (06 1800,
   07 2076, 08 2884, 09 2076, 10 2670, 11 2560, 12 2562, 13 1264). The mounted parts keep their pass-2 sizes: their
   bottoms are white, so the picture cannot show where their content ends;
2. 11's page caption said "Pages 1–4" over three pages: now "Every page", as on 12;
3. the masthead and the colophon broke inside a segment ("Printed 20 / Oct 2026"; "· V2" and "V1" alone on a
   line): each segment now holds together with no-break spaces and a wrapped line ends on the dot. It moves only
   where those lines break (each keeps its line count), and the pages are measured live, so no page changes.

What remains:
- the 5 layout-shift lines (departure 3, OQ1);
- a Korean framed title can break inside a word at 390 (departure 8, the authored look);
- on 11, page 1 ends with the figure row's heading and its one-line lead-in while the row starts page 2: the rules
  keep a heading with the block after it, not a lead-in with the figure it introduces (fixed in the critique pass,
  C09);
- the two edits above (2, 3) are checked by `design-check` and a syntax pass only, not by a render.

**Critique pass 01 renders** (same instrument, output in the session scratchpad; every PNG read):
- **Pass 1, all 24 boards with `--click`** (26 PNGs, 109 states, 302 s): 5 issues, all `check=layout-shift` on 01
  and 03 (the frame grows as the bottom chrome folds: C03, departure 3); no `settle`, page-clip, same-target,
  hover-contrast, contrast, target, clipped or dead-link line. Seen and fixed after it: the Library stand-in's
  orchard row read "Started · 29%" while the chapter it opens lands at 34% at 1440 (the row no longer names a
  percentage); the "Orchard · chapter list" preset showed "Started · 29%" in Contents beside "Chapter 2 of 4 · 34%"
  in the chapter bar, because a restore to the place last reported sent no new report (every restore now reports
  its landing); on 04, page 3 still ended with a lead-in whose list opened page 4 (a lead-in now keeps with a list
  too).
- **Pass 2, the 8 boards those touch** (01, 02, 03, 04, 05, 09, 11, 18; 10 PNGs, 109 states): the same 5
  layout-shift lines and nothing else; Contents and the chapter bar agree (34% at 1440); the stand-in row reads
  "Started". The list rule, which pass 2's picture still missed (the list sits in a block wrapper), was corrected
  after it and checked by a probe screenshot of 04's pages 3 and 4 (the lead-in now opens page 4 with its list; the
  chapter stays 10 pages), not by a third render.
- **Probes** (scripts on the preview's own server and browser, a throwaway profile): every preset on 01 and 03
  pressed after its press and after the natural clicks (logo, the library rows, Previous, Next, Contents rows,
  View on v1, Read v2), 0 unpressed; orchard's chapter 2 reopened at 29% / 39% / 32% / 34% on 03's four frames and
  on 01 at 390 / 820 / 1440, its pill, chapter bar and Contents row equal in each; the fold (departure 3); larger
  text and zoom (C05, below).

What remains: the 5 layout-shift lines (C03, departure 3, OQ1); the signed bars' larger-text gap (C07); a Korean
framed title can break inside a word at 390 (departure 8).

## Critique pass 01

Level `critic` (nothing held for a judge). Every must-fix answered; C11 and C12 are gaps already logged; C13 is a
wave choice, C14 and C15 advisory: those go to the operator as they are.

- **C01** (the book and loose pages reachable only by a hidden route): fixed: the Library stand-in (the logo, or
  Back on a loose document) lists the five legacy items this canvas holds, each a button that opens its own page
  at its own state, its preset pressed (orchard's chapter 2, lantern's P8, the three loose documents); its words
  now say where the real routes live; its preset keeps "‹ Back to the chapter". The route is named in "What was
  designed". The click-through samples three rows and reaches three different pages (no same-target line).
- **C02** (the pressed preset not the one pressed): fixed: a preset is matched on what it sets (page, document,
  language, version, signed in, bar, panel, status, prompt, resumed, read or unread, marked), never on what the
  frame reports once it lands (`at`, the progress word); among presets that still tie, the landed place and then
  the last pressed one decide. Measured: 0 unpressed of 30 legacy presets on 01 and 16 on 03 (re-run after the
  last change), and after Tidewater's Previous and Next, four Contents rows, the library rows, View on v1 and Read
  v2. The stand-in preset for a native chapter is now "A native chapter in the reader", true after Previous and
  after Next. A legacy chapter a click opens that no preset names (lantern's P9, P17–P18 and P24; orchard's
  chapters 1 and 3) shows its page's group with nothing pressed: no preset sets that state, so none claims it.
- **C03** (the frame resizes when the bottom chrome folds): rebutted: the handoff fixes this geometry ("under it
  the frame, `flex: 1; min-height: 0; border: 0`, the only scroller", "a page that never scrolls", handoff lines
  147–149; "the frame as the only scroller", line 560, a locked contract) and asks for "the chrome hiding and
  showing as the frame scrolls" (line 254), so a hiding bar beside a `flex: 1` frame resizes the frame by
  definition; an overlay instead would cover the last lines of a sandboxed document the parent cannot pad.
  Measured on 01 at 390×844 and 1440×900, by preset and by a wheel scroll: the top bar, the frame's top edge, its
  scroll position and the first visible line stay at the same pixel; only the frame's lower edge moves. Kept as
  departure 3; OQ1 puts the choice to the operator (keep the fold, or a bottom chrome that never hides).
- **C04** (one saved place read as five numbers): fixed: the seed is now where its anchor lands on the phone
  (`{ s: "started", pct: 29, at: "trees", frac: 0.29 }`), and the words (OQ4, Data) say 29%; "Orchard · chapter
  list" opens at the saved place; on 03 each frame keeps its own progress, as four devices would; every restore
  reports its landing. Measured: 03's frames read 29 / 39 / 32 / 34%, 01 reads 29% at 390, 39% at 820 and 34% at
  1440, and in each the pill, the chapter bar and that chapter's Contents row agree; 09's sheet cell reads 29%. A
  different width lands the same anchor at a different fraction (build prompt, Resume).
- **C05** (larger text and zoom leave the document no room): fixed: when the chrome at full height would leave the
  document less than min(40% of the page, 17rem), the page turns tight: the document keeps that floor, the document
  bar scrolls inside itself with a fade at its lower edge, the chapter bar and safe area stay whole; it is measured
  again on any change to the page or the chrome, so zoom and a changed root font count. In the document bar a
  button's label wraps rather than run off the screen. Measured on 02: phone 390×844 at browser zoom 100 / 125 /
  150 / 200 / 300%: the frame keeps 509 / 291 / 225 / 169 / 112 px (60 / 43 / 40 / 40 / 40%), the chapter bar
  whole every time (before: 509 / 291 / 160 / 0 / 0); iPad 820×1180 at 200 / 300%: 273 / 157 px; desktop 1440×900
  at 200 / 300%: 184 / 120 px (before 184 / 2); root font 125 / 150 / 200% at 390: 365 / 338 / 338 px (before 365 /
  241 / 0), and "Bookmark this position" stays on screen. Departure 10. Below 320 CSS px (300% zoom on a phone)
  the signed bars still crowd: logged with C07.
- **C06** (`check=settle` on 12 once): rebutted with measurements: this pass's full render of all 24 boards with
  clicks (302 s) reports no `settle` line and 12 renders whole at 3500×2562, as did the critic's seven solo
  renders; nothing on 12 animates or loads late (its pages are cut once, after fonts load). Not reproducible,
  likely load on the shared machine, as the critic suspected.
- **C07** (the signed chapter bar's labels overprint at 150–200% text): fixed: logged as a gap in "Component and
  token gaps" and in the build prompt's "Gaps in signed parts", with the top bar's crowding below 320 CSS px; the
  signed bars are not restyled.
- **C08** (thirteen `href="#top"` links with no named reason): fixed: departure 9 names the reason (the canvas
  routes each address as a state of the flow board; the signed reader's own pattern) and lists all thirteen; the
  build prompt's Links names each one's real address.
- **C09** (a lead-in left at a page's foot while its figure or code opens the next): fixed: a paragraph directly
  before a figure row, diagram, code block, table, callout or list keeps with it (`break-after: avoid`). Seen on
  11 (the figure row's heading and lead-in now open page 2 with the cards, on A4 and US Letter) and 04 (the code
  block's lead-in opens page 3 with it; the list's lead-in opens page 4 with it).
- **C10** (a printed address broken mid-word): fixed: every printed address takes a break opportunity after each
  "/" and before "?" and "&" (`<wbr>` in the build), so "([host]/@quillwork/knowledge/books/" ends the line and
  "maintainer-guide/shipping) ships." starts the next, on A4 and US Letter; a word is cut only when one segment is
  longer than the line.
- **C11** (no component bundle): gap, already logged; for the system and the build.
- **C12** (three colours and faces not tokens): gap, already logged; for the operator and the system.
- **C13** (the wave's sample library disagrees): the operator's choice, not changed here; logged as OQ12. This job
  keeps its set until the operator picks one.
- **C14** (the phone opens with half its height as chrome): advisory, the operator's (OQ1, OQ2); no change. The
  tight page does not trigger at the reference sizes.
- **C15** (the status block reserves the tallest layer): advisory, the operator's; no change (the bar keeps one
  height when the status arrives).

## Read-back pass

- **Build prompt, *Canvas-only* → Board scaffolding** (the orchestrator's read-back): the list named a "Canvas
  sample · not a printed chapter" colophon that no board draws. **The build prompt was wrong, the canvas is right:**
  the sample sheets on 11 and 12 (`PP.sample` in `paper.js`) end without a colophon, and the only colophon on the
  canvas is the product's own (13, and the last page of each native sheet on 04), which the build prompt specifies
  under "The colophon". The stale reference is removed, and the line now names the sample texts the canvas does draw:
  the sample sheets' headings ("A wide ASCII drawing (118 columns)", "Twenty questions, then their key"), their
  lead-ins ("Drawn in a code block marked as art…"), the figure row's sample caption and the drawing
  `datum-ladder.txt`, with a note that the colophon itself is built. No board changed; no render needed.
