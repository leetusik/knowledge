# Build prompt — the legacy reader and print (job `09-legacy-and-print`, round `01-legacy-and-print`)

**Unsigned draft.** It becomes the contract only when the operator literally signs this round.

This job draws two things:

1. **The legacy reader:** how a document that is still a self-contained HTML explainer (format `html`, S2 *Legacy
   path*) reads: the page never scrolls, the framed document is the only scroller, under the signed reader's chrome
   plus one document bar.
2. **Print:** the native reader's print sheet (S2 *Print*), the legacy **Print · new tab** control, and the one
   notice sheet ⌘P prints from the legacy reader.

The signed reader's contract (`jobs/01-reader/rounds/02-revise/build-prompt.md`) and the signed annotations'
(`jobs/05-annotations/rounds/01-annotations/build-prompt.md`) still hold in full. Nothing signed moves, is restyled
or is dropped on screen. Where this file names a signed part, it says how the legacy reader uses it.

The canvas is `jobs/09-legacy-and-print/canvas/project/`. Board numbers below are its titles' numbers.

## Canvas-only (never build)

- **The state bar** (`[data-proto="state-bar"]`) on 01, 03 and 04, and **the foot strip**
  (`[data-proto="screens"]`). Nothing in the product corresponds to them.
- **The stand-ins** (`Elsewhere.dc.html`, 05, dashed boxes): the book page, the library, the signed reader, sign in,
  a new tab, the original in a new tab. The Library stand-in's list of five legacy items ("On this canvas, open one
  in the legacy reader:") is the canvas's way to reach the all-legacy book and the loose documents by a click; the
  real library is 06-library's.
- **`LegacyDoc.dc.html` (15) and `legacydocs.js`:** the framed document drawn as markup. In the product it is a
  sandboxed `<iframe>` of the raw relay; the parent never draws, reads or styles it.
- **`lflow.js` and `legacy.js`:** the canvas's flow and sample library. The rules they encode are specified below.
- **The scroll measurement in `Legacy.dc.html`** (`fracOf`, `anchorOf`): on the canvas the parent reads the drawn
  document's scroll; in the product the bridge posts it.
- **The safe-area strips** (`.lg-safe`, 47 px and 34 px on the phone frames) simulate `env(safe-area-inset-*)`.
- **03 Widths' four frames** are a viewing device; the product is one responsive page. Each frame keeps its own
  reading progress there because each stands for a device.
- **`href="#top"` on thirteen links** with a script handler: on the canvas the address is a state of the flow
  board. In the product each link carries its real address (Links, below).
- **The paper:** `.pp-host`, `.pp-probe`, `.pp-mc`, `.pp-sheet`, `.pp-win`, `.pp-slot*`, `.pp-crop`, the pager
  (`[data-proto="pager"]`), `.pp-t--cont` and the measured table splits, the page captions ("Page N of M · A4 ·
  794 × 1123 px · shown at 85%"). The browser's print engine cuts the pages and repeats a table's `<thead>` itself.
- **Board scaffolding:** `.lg-proto`, `.lg-comp*`, `.lg-widths*`, `.pp-board*`, `.pp-comp*`, `.rd-board*`, the
  captions, and the text written to describe a block on the sample sheets of 11 and 12: their headings ("A wide ASCII
  drawing (118 columns)", "Twenty questions, then their key", …), the lead-in under each ("Drawn in a code block
  marked as art…"), the figure row's caption ("Four cards from the signed figure rows, set on paper as two rows of
  two.") and the drawing `datum-ladder.txt`. These sample sheets end without a colophon; the colophon itself (13,
  and the last page of each native sheet on 04) is built, as "The colophon" below says.
- **The drawn diagram on paper** (`.pp-dg*`): the build prints the signed diagram SVG at 100% of the column in its
  signed print tones.

## What the legacy reader is

| Part | Source | In the legacy reader |
|---|---|---|
| Progress line, 3 px | signed (§2) | unchanged; filled to the bridge's fraction; never hides |
| Top bar (`ReaderTop`) | signed (§1) | unchanged: logo → library; back "‹ <book title>" from 40rem, "‹ Book" below, "‹ Library" for a loose document; "Older version · vN" tag from 40rem on an older version; language switch; Display; "Sign in" signed out, from 40rem. **Never hides** |
| The frame | new | `<iframe>` of the raw relay, `flex: 1; min-height: 0; border: 0`, the only scroller |
| Document bar (`LegacyBar`, 14) | new | under the frame: notices, status, Print · new tab, Bookmark this position, two notes |
| Chapter bar (`ReaderBottom`) | signed (§3) | unchanged, under the document bar; none for a loose document |
| Resume pill | signed (§4) | the section is replaced by a percentage (below) |
| Contents, Display, Version history sheets | signed (§15) | Contents and Version history unchanged; Display is `LegacyDisplay` (17) |
| Sign in to save | signed (§12) | `what` "bookmarks" (Bookmark) or the signed chapter end's own words (Mark as finished); `place` "chapter" or "document" |
| Not found | signed (`ReaderState`, §16) | unchanged |
| Loading, relay failed, file missing | new (`LegacyFrameState`, 16) | inside the frame's area, the bars usable |

## Data the page needs

From the server, before the frame loads (the parent never reads the document):

- `doc`: key, title (in its language, with `lang`), format `html`, `noun` "chapter" (in a book) or "document"
  (loose);
- `lang` and `langs` (the languages it exists in); for a translation, `translated_from: {lang, v}` and that
  language's newest version (for the older-translation notice);
- `version`, `newest` (in this language), the published date of the version on screen, and the version list (for
  Version history);
- `look`: `"auto"` when the document switches to its own dark scheme with the operating system, `"light"` when it is
  light only. P30 derives it from the document (its `color-scheme: light dark` or a `prefers-color-scheme: dark`
  rule); until it is known, `"light"`;
- in a book: the book's key, title, `n`, `total`, the previous and next chapters' titles (with their `lang`) and
  formats;
- the raw relay's address: `…/raw`, or `…/versions/{v}/raw` for an older version, plus `?lang=ko` for a non-English
  variant;
- for a member: the reading record (S3: `{anchor, fraction}` position, `max_fraction`, finished state, held after
  Mark as unread) and the document's position bookmarks;
- signed in or out.

**Addresses** (S1): a chapter `[host]/@quillwork/{project}/books/{slug}/{key}`, a loose document
`[host]/@quillwork/{project}/{key}`; `?lang=ko` for Korean; `?v={n}` for an older version (`&` between them).

## Layout

The page never scrolls: `html, body { height: 100dvh; (fallback 100vh) overflow: hidden; overscroll-behavior: none }`,
`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. One column, flex:

1. `env(safe-area-inset-top)`, filled with the bars' surface;
2. the progress line and the top bar (`flex: none`; padded by `env(safe-area-inset-left/right)`);
3. the stage (`flex: 1 1 auto; min-height: 0; position: relative`), holding the frame (`flex: 1 1 auto; min-height:
   0; border: 0`), its states, the resume pill, the Sign in to save slot and "Show reading controls";
4. the bottom chrome (`flex: none`): the document bar, the chapter bar (books only), then
   `env(safe-area-inset-bottom)`, all on `kb-surface`, padded by `env(safe-area-inset-left/right)`.

The frame's own background before load is the document's page colour, `#fbfbfa` (`#17191c` when it shows its dark
look), so a short document or an overscroll shows the document, not the reader.

**Per width** (the reader's size container, the system's breakpoints):

| Width | Top bar | Document bar | Sheets |
|---|---|---|---|
| < 40rem (phone, 390×844) | "‹ Book" / "‹ Library"; no "Sign in" (signed) | status, then the actions on their own row, then the notes; the title ellipsizes on one line | bottom sheets (signed) |
| 40–64rem (iPad portrait 820) | "‹ <book title>" | status and actions on one row (`grid-template-columns: minmax(0,1fr) auto`), the notes under | side panels (signed) |
| ≥ 64rem (iPad landscape 1024, desktop 1440) | as 40rem | as 40rem | side panels; the frame takes focus after load |

Nothing scrolls sideways at any width; the page itself never scrolls at all.

**Larger text and browser zoom (the tight page).** The document keeps at least `min(40% of the page, 17rem)`. Measure
it whenever the page, the top bar, the document bar's content or the chapter bar changes size (a `ResizeObserver` on
each, so zoom and a changed root font count): when the room left for the stage with the bottom chrome at its full
height is less than that floor, set the page tight:

- the stage: `flex: 1 1 0; min-height: min(40%, 17rem)`;
- the bottom chrome: `flex: 0 1 auto; min-height: 0`;
- the document bar: `flex: 0 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain`, with a sticky
  `::after` at its lower edge (`height: var(--kb-space-lg); margin-top: calc(-1 * var(--kb-space-lg))`, a gradient
  from transparent to `kb-surface`, `pointer-events: none`) so the reader sees there is more of it;
- the chapter bar and the bottom safe area stay whole (`flex: none`).

Measure the chrome by its content height (`scrollHeight`), so the answer does not change once tight. At the
reference sizes (390×844, 820×1180, 1024×768, 1440×900, 100% text) no page is tight. Measured on the canvas: the
phone keeps 225 px of 563 at 150% zoom and 169 of 422 at 200%; at a 200% root font the frame keeps 338 of 844.

## The document bar (`LegacyBar`, 14; states on 06)

A region labelled "This document": `padding: var(--kb-space-xs) var(--rd-gut) var(--kb-space-sm)`, `kb-surface`, a
1px `kb-border` top rule, `gap: var(--kb-space-xs)` between its rows, Source Sans 3 (`--font-body`).

1. **Notices** (only when they apply), the signed §5 notices, unchanged in words and look, above the row:
   - older version: label "Older version", "You're reading v{n} of this {noun}. It was superseded — the current
     version is v{m}.", link button "Read v{m} →" (opens the newest version);
   - older translation (only on the newest version of a translation whose source has moved on): label "Older
     translation", "Translated from {source} v{from}. {source} has been updated since: it is at v{newest}.", link
     button "Read {source} v{newest} →" (opens the source language at the same place).
2. **The row:**
   - **the status cell**, a polite live region. Every status the reader can toggle between is rendered in **one grid
     cell**, the others `visibility: hidden` and `aria-hidden`, so the bar keeps one height:
     - *reading* (default, and always on an older version): the plain tag "ORIGINAL LAYOUT" (the signed chapter
       list's), then the title (15px semibold ink, one line, ellipsized, its own `lang`); under it, the meta line
       (13px secondary, tabular figures): "v{n} · Published {date}" and, when there are two or more versions, " · "
       and the link button "Version history" (opens the sheet; `aria-haspopup="dialog"`);
     - *at the end* (fraction ≥ 0.95, newest version): the signed chapter end's words (§10), the word in 15px
       semibold ink and the sentence in 13px secondary, then the meta line with its action:
       - finished: "Finished" · "Saved to your progress." · "Mark as unread";
       - finished an earlier version: "Finished" · "You finished an earlier version. This {noun} has been updated
         since." · "Mark as unread";
       - marked unread: "Not finished" · "Marked as unread. Read it to the end again to finish it." · "Mark as
         finished";
       - signed out: "Not saved" · "Signed-out reading isn't saved. Your display settings stay on this device." ·
         "Mark as finished" (it opens Sign in to save, `aria-expanded`);
       - plus " · Version history" when there is history.
     The meta line holds a 44px (`kb-tap`) row so its link buttons are full targets.
   - **the actions**, `display: flex; gap: var(--kb-space-xs)`, no wrap from 40rem. Under larger text a button's
     label wraps rather than run off the screen: in this bar `.rd-btn { white-space: normal; text-align: center }`
     and each action `max-width: 100%` (at the reference sizes no label wraps):
     - **Print · new tab**: a secondary button (`rd-btn--secondary`, 44px), rendered as
       `<a href="{raw relay address}" target="_blank" rel="noopener">`, with `aria-describedby` naming a hidden
       element that says "Opens the original document in a new tab, where it prints in its own layout.";
     - **Bookmark this position / Bookmarked here**: the signed annotations control, unchanged (secondary, 44px,
       `aria-pressed`, both labels in one cell, pressed in `accent-soft` / `accent-strong`).
     While the frame is loading or has failed, the actions keep their space at `visibility: hidden` (`aria-hidden`).
3. **The notes**, under the row, in the signed 13px meta step (`--font-body` 0.8125rem / 1.45, `kb-secondary`), wrapping
   as a pair: the signed line "Highlights are not available in this document." then "The theme and text size don't
   restyle it." They never cover the document.

## Hide and show (the bottom chrome)

The top bar and the progress line never hide. The bottom chrome (document bar and chapter bar) hides by collapsing:
`display: grid; grid-template-rows: 1fr` → `0fr` over `--rd-ease`, its inner box `min-height: 0; overflow: hidden`,
and `visibility: hidden` after the transition. The frame grows downward into the space; the document's content does
not move. No transition under `prefers-reduced-motion`.

The rules, on each `scroll` message (the bridge reports no taps; `f` is the fraction, `Δ` the change since the last
message):

| Rule | When |
|---|---|
| **show** | `f ≥ 0.995` (the end), and stay shown until a scroll up |
| **show** | `f ≤ 0.0005` (the top) |
| **show** | `Δ < −0.002` (a scroll up of 0.2% of the document or more) |
| **hide** | `Δ > 0.0005`, unless held at the end |
| **ignore** | for 450ms after the reader itself scrolls the frame (a restore, a language or version switch, From the top), and while a sheet is open |
| **re-base** | the first message after the chrome hides or shows only resets the baseline (the frame's height changed, so the fraction did) |
| **show while focused** | the hidden chrome shows while it holds keyboard focus (`:has(:focus-visible)`) |

The resume pill leaves when the chrome hides. A sheet open keeps the chrome as it is.

## Keyboard and focus

- Tab order: **"Skip to the document"** (first, a secondary button shown only while focused, at the top-left under the
  line; it focuses the frame), the top bar, the frame, **"Show reading controls"** (exists only while the bottom
  chrome is hidden; shown only while focused, centred above the bottom edge; it shows the chrome), the document bar,
  the chapter bar.
- **The frame is in the tab order.** On a desktop (≥ 64rem), after load, focus moves to the frame quietly (no ring) so
  Space, PageDown and the arrows scroll it; the ring shows once focus is moved by keyboard.
- **The frame's focus ring:** the system's `kb-focus-w`, drawn just inside the frame's edge (`outline-offset:
  -kb-focus-w`), in the light `kb-accent` `#0f6f66` on a light document page and the dark `kb-accent` `#62bdb2` when
  the document shows its dark look (the ring sits on the document, not the reader's surface).
- Sheets: focus moves to the sheet's Close; Escape closes; focus returns to the opener (signed).

## The bridge (S2), and what each part reads or sends

The relay injects the bridge into the raw document. The parent listens for `message` events whose `source` is the
frame's `contentWindow` and whose data has `kb: "legacy", v: 1`.

| Message | Direction | Used by |
|---|---|---|
| `{type: "scroll", fraction, anchor}`, throttled | frame → parent | the progress line and "Chapter N of M · P%" (`round(fraction × 100)`); the hide-and-show rules; the finished rule; the saved position; Bookmark this position (the current `{anchor, fraction}`); the language switch's place; the end status in the document bar (`fraction ≥ 0.95`) |
| `{type: "restore", anchor?, fraction?}` | parent → frame, on load | the resume; a language switch; a version switch (top); From the top (`fraction: 0`) |
| `{type: "navigate", href}` | frame → parent | a same-app link: the parent validates the path and routes it (a legacy document opens here, a native one in the reader, anything else not found) |
| (none) | — | an `http(s)` link opens a new tab with `noopener` from inside the frame; an `#anchor` link scrolls inside the frame |

Sandbox (S2): `allow-scripts allow-popups allow-popups-to-escape-sandbox`, never `allow-same-origin`, no top
navigation. The parent cannot read the document, its selection, taps or colours. No message was added.

## Resume, progress, finishing and bookmarks (S3)

- **Position:** the bridge's `{anchor, fraction}`. Restore by `anchor` when the document has it, else by `fraction`.
  The same anchor lands at a different fraction on a different width (the canvas's orchard chapter 2, saved at
  "trees": 29% on the phone, 39% at 820, 32% at 1024, 34% at 1440), so every number on one screen (the pill, the
  line, "Chapter N of M · P%" and that chapter's Contents row on the same device) is the landed fraction, never the
  stored one beside a landed one.
- **Resume:** a member reopening a started legacy chapter (not held unread) opens at the saved place with the chrome
  shown, and the signed pill shows "Picked up where you left off · **{N}%**", where N is `round(fraction × 100)` at
  the place the restore landed (the first scroll message after it), with "From the top". It leaves on From the top,
  when the chrome hides, and when another document opens.
- **Progress:** the bridge's fraction drives the line and "Chapter N of M · P%". Writes follow S3's cadence, for a
  member on the newest version only; reading an older version writes nothing.
- **Finished:** at `fraction ≥ 0.95` on the newest version, a member's chapter is marked finished (unless held after
  Mark as unread, until the reader leaves the end and comes back); or by **Mark as finished**. **Mark as unread**
  clears it and holds it. The status words show in the document bar at the end (above).
- **Bookmarks:** Bookmark this position saves the current `{anchor, fraction}`; it reads "Bookmarked here"
  (`aria-pressed="true"`) while the position is within ±2% of a saved one, and pressing it then removes that one.
  No highlights, notes or quiz results in a legacy document.
- **Signed out:** the document reads in full; no progress written, no finished state; Bookmark opens the signed Sign
  in to save (`what` "bookmarks", `place` "{noun}"); Mark as finished opens it with the signed chapter end's words
  ("finished chapters and your place in each one"). Sign in comes back to the same place.

## Languages and versions (S1, S3)

- **The switch** (signed, in the top bar) opens the other language at the same place: the same anchor if that
  language has it, else the nearest preceding anchor it has, else the fraction. Each language keeps its own version
  chain; the switch opens its newest version.
- **Version history** (signed sheet, from the document bar's "Version history"): opening a version opens it at the
  top, through `?v=` and the version relay. An older version shows the top bar's "Older version · vN" tag (from
  40rem), the document bar's Older version notice, and no finished status.

## Loading, relay failure, not found

Inside the frame's area, under the bars; the bars stay usable (the document bar keeps its status line and holds its
actions).

- **Loading** (`LegacyFrameState`, 16): a status line "Loading the original document…" and a skeleton of the
  document's outline (title, meta, four lines, a heading, three lines, a box) in the reader's `rd-skel`, still under
  reduced motion. **Slow relay** (after the reader's slow threshold): the line becomes "Still loading. This
  document is taking longer than usual." in the same place (both lines share one grid cell).
- **File missing** (404 from the relay for a listed document): "Not found · 404" / "This {noun}'s file is missing" /
  "The library lists this {noun}, but the file that holds its text isn't there, so there is nothing to show. The
  book's other chapters still open." (loose: "The rest of the library still opens.") / primary "‹ Back to the book"
  (loose: "‹ Back to the library").
- **Relay failed** (502): "Error · 502" / "The original document didn't load." / "The connection to its file failed
  on our side. Try again — and if it keeps failing, the reference below tells us where it stopped." / primary "Try
  again" / "ref · {reference}". Try again returns to Loading; a result for an earlier attempt is dropped. How the
  page learns of the failure is P30's.
- **Not found** (no such document, or a private one's address: 404-never-403): the signed `ReaderState` unchanged;
  no document bar and no chapter bar.

## Display for a legacy document (`LegacyDisplay`, 17)

The signed Display sheet's **Theme** group unchanged (System, Light, Dark, Sepia, the readout "System · follows this
device, {light|dark} now" / "Sepia · warm paper, for long reading"). **Text size is not offered.** In its place a group
"In this document":

- `look: "auto"`: "It keeps its original layout. The theme colours the reading controls, and Dark (or System, when
  this device is dark) also shows the document's own dark look. Text size doesn't reach inside: to read it larger,
  use your browser's zoom."
- `look: "light"`: "It keeps its original layout, which is light only. The theme colours the reading controls around
  it. Text size doesn't reach inside: to read it larger, use your browser's zoom."

Footer unchanged: "Saved on this device. Your other devices keep their own."

## The theme over the document

- The bars take the reader's theme (Light, Dark, Sepia, System).
- The frame's `color-scheme` is `dark` when the effective theme is Dark (Dark, or System on a dark device), else
  `light`. A self-darkening document then shows its own dark look or its own light look; a light-only document
  ignores it. The reader never injects styles. Whether each browser honours an iframe's `color-scheme` is a P30
  device check (D36 (7)).
- The seam: the bars' `kb-border` hairlines above and below the frame.

## Links

- Back: a chapter → its book page (`07-book-page`); a loose document → the library (`06-library`). The logo → the
  library.
- Previous and Next (chapter bar), and a chapter in Contents: a legacy chapter opens here; a native one opens in the
  signed reader.
- A language or a version: this page.
- Inside the document: as the bridge table.
- Print · new tab: the raw relay, top-level, in a new tab.
- Sign in: the existing auth flow, back to the same place.
- **Every link is a real `<a href>`** (the canvas's `href="#top"` plus a handler stands for these): the skip link →
  `#{the frame's id}`; Print · new tab → the raw relay; the logo and a not-found page's library link → the library;
  Back (the top bar, and a frame state's Back) → the book page or the library; Sign in (the top bar, Sign in to
  save) → the auth flow with a return to this place; Previous, Next and the book link → the chapter's or the book
  page's pretty address; a Contents row → its chapter's address. A handler may route in place (no full load), but
  the `href` is the address, so open-in-new-tab and copy-link work.

## Print: the native sheet (the reader's print stylesheet)

Extends `kb-print.css`, in `@media print`. The canvas's `paper.css`, part 1 (`.pp-flow` and everything under it, and
`.pp-notice`), is the stylesheet: sizes in px at 96/in (1pt = 4/3 px).

- **`@page { size: auto; margin: 16mm 15mm 18mm; }`** (unchanged). Pages are not numbered (browsers don't run a header
  from `@page`).
- **Hidden:** every bar, the progress line, the pill, sheets, scrims, the state and the skip button.
- **Palette** (today's, whatever the screen theme): paper `#ffffff`, sunken `#f4f1ea`, border `#c9c2b3`, ink
  `#1b1714`, secondary `#4a433a`, hint `#6d665a`, accent `#0a544e`.
- **Faces and sizes:** prose Literata (Noto Serif KR for Korean) 14px (10.5pt) / 1.55, measure 38em, `orphans: 2;
  widows: 2`; title Fraunces 600 26.67px (20pt) / 1.2, balanced; h2 Fraunces 600 18.67px (14pt) / 1.3; h3 Fraunces
  600 16px (12pt) / 1.35; h4 Source Sans 3 700 14px; labels and small text Source Sans 3 12px (9pt, the floor); code
  and addresses JetBrains Mono, ligatures off. Headings `break-after: avoid`, balanced.
- **Rhythm:** 10px between blocks; 24px above h2, 18px above h3, 14px above h4 and around wide blocks.
- **Inline:** emphasis italic, strong 700, deleted line-through, code mono at `max(12px, 0.857em)` wrapping anywhere,
  links underlined (1px, offset 0.15em) **followed by their href** " ({href})" in mono 12px secondary; an in-document
  `#` link and a bare link print nothing more. **Every printed address** (an href, a source's URL, the masthead's,
  the colophon's, the notice's) carries `<wbr>` after each "/" (never inside "//") and before each "?" and "&", with
  `overflow-wrap: anywhere`, so it breaks between segments and cuts a word only when one segment is longer than the
  line.
- **Lists:** indent 1.4em, 3px between items, items never split. **Quotes:** 2px border-left, italic, secondary.
- **Callouts:** printed **open** (a collapsed callout too: paper has no button), a 1px border box, radius 4px, padding
  9px 14px 11px, `break-inside: avoid`; the type as a word in mono 12px bold capitals, secondary ("NOTE",
  "IMPORTANT", "WARNING", "CAUTION", "SKIP", "DEFINITION"), then the title in 14px 600; warning and caution take an
  ink border as well as their word.
- **Code:** a box on sunken with a 1px border, `break-inside: avoid`, `print-color-adjust: exact`; a bar with the file
  name and language in mono 12px secondary; lines `white-space: pre-wrap; overflow-wrap: anywhere` with a 2-character
  hanging indent, line-height 1.45; grayscale tokens: keywords 700, comments italic secondary, strings secondary.
  **ASCII art** (a code block marked as art): no hang, line-height 1.3, set at the size that fits its widest line in
  the column, down to 6.5pt at the least, and only then wrapping; never off the paper.
- **Tables:** full column width, 12px / 1.4 Source Sans 3, tabular figures, 1px border cells, padding 4px 6px, header
  on sunken 700 (`print-color-adjust: exact`); rows never split (`tr { break-inside: avoid }`); `thead { display:
  table-header-group; break-after: avoid }` so the header repeats on each page and never stands alone at a page's
  foot; long cells wrap anywhere.
- **Figure rows:** side by side while each item keeps 13rem in the column, else even rows; `break-inside: avoid`;
  cards with a 1px border, radius 4px; an accent card with an accent border and a 3px inset top line; captions 12px
  secondary.
- **Diagrams and the `svg` block:** the signed print tones (`03-diagrams`: line `#7c7362`, ink `#26211c`, node tint
  `#fffefa`, store `#44617a` / ink `#33506a` / tint `#e3e6e7`), `break-inside: avoid`, `print-color-adjust: exact`, no
  fades, no hint, no scroll (`overflow: visible`), the SVG at 100% of the column; caption 12px secondary.
- **Sources:** title "Sources"; items "[n]" in mono 12px secondary, title 600, meta 12px secondary, note 12px, URL in
  mono 12px secondary wrapping anywhere; items never split.
- **Korean:** `:lang(ko) { word-break: keep-all; overflow-wrap: anywhere; line-break: strict }` on paper too, with Noto
  Serif KR before the generic fallback for reading and display, and Pretendard / Apple SD Gothic Neo / Noto Sans KR
  for labels. Chrome copy on the sheet (masthead label, "Quiz", "Answers", hints, colophon) stays English (D36 (4)).

### The masthead (page 1 only)

- label: "knowledge · {book title} · Chapter {n} of {N}" (loose: "knowledge · {project}"), mono 12px 700 capitals,
  letter-spacing 0.06em, secondary;
- the address and facts: "{address} · v{n}, {published date} · Printed {date}", mono 12px secondary, over a 1px rule;
- on an older version, under it: a tag "Older version · v{n}" (mono 12px capitals in a 1px ink box) then "The current
  version is v{m}, at {current address}.";
- then the title, and the summary if the chapter has one (secondary, measure 38em).
- **Line breaks in the label, the facts line and the colophon's label:** a short segment never breaks inside ("Chapter
  2 of 5", "v2, 12 Oct 2026", "Printed 20 Oct 2026", "English · v2": no-break spaces inside), and the " · " between
  segments takes a no-break space before the dot, so a wrapped line ends with "·" and the next starts with a whole
  segment. A long book title or address still wraps where it must.

### The quiz on paper

- a head kept whole and with its first question: "Quiz · {N} questions" (mono 12px capitals, secondary) over the quiz
  title (Fraunces 600 16px);
- each item `break-inside: avoid`, numbered in Fraunces 600 with tabular figures, in a 1.9em gutter:
  - `choice`: the prompt, the hint "Choose one answer." (single) or "Select all that apply." (multi), then the options,
    each with its letter in a 20px ring (single) or a 20px square (multi);
  - `cloze`: the hint "Fill in the blank." / "Fill in the blanks.", the text with each blank as a numbered 8.5em rule
    "(1)";
  - `recall`: the prompt, "Write your answer, then check it against the key.", three 28px writing lines;
- after the last item: "Answers are at the end of this chapter." (12px italic secondary).

A member's saved answers, highlights and notes do not print (OQ7).

### The answer key (the chapter's end, before the colophon)

- "Answers" as an h2, then "{N} answers to “{quiz title}”, each with why." (12px secondary, kept with the first
  answer);
- each answer numbered as its question, `break-inside: avoid`:
  - `choice`: the key in mono 12px bold ("B", "A and C", "A, B and D"), " · " and the option's text, then the
    explanation in 12px secondary;
  - `cloze`: "(1) **{answer}** (or {accepted}, or {accepted})" per blank, joined by " · ", then the explanation;
  - `recall`: the label "ANSWER" (mono 12px capitals) and the model answer, then the explanation.

### The colophon (the last thing printed)

28px above, a 1px rule, 12px / 1.5 secondary, `break-inside: avoid`:
- "knowledge · {book title} · Chapter {n} of {N} · {language} · v{n}" (loose: "knowledge · {project} · {language} ·
  v{n}"), mono 12px 700 capitals, "{language} · v{n}" kept whole (the masthead's break rule);
- "Printed {date} from {address}." then, on the newest version, "This is v{n}, the current version on that date; the
  address always opens the newest." or, on an older one, "This is v{n}, an earlier version; the current version is
  v{m}, at {current address}.";
- on a translation whose source has moved on: "Translated from {source} v{from}. {source} has been updated since: it
  is at v{newest}."

### Page breaks, in short

Never split: a heading from what follows, a lead-in paragraph from the figure row, code block, table, callout,
diagram or list directly after it (`p:has(+ figure, + pre, + table, + aside, + .diagram, + ul, + ol) { break-after:
avoid }`), a list item, a callout, a code block, a table row, a table header alone, a
figure row, a diagram, a quiz head from its first item, a quiz item, an answer, a source, the colophon. Allowed to
split: prose (2 lines at least each side), a table between rows (its header repeats), a list between items.

## The legacy Print control

**Print · new tab** in the document bar (above): an `<a>` to the raw relay (`…/raw`, `…/versions/{v}/raw` on an older
version, `?lang=ko` for Korean), `target="_blank" rel="noopener"`. The original opens on its own, top-level, where the
browser's Print command prints its own layout; the bridge does nothing when it is not framed. S2 retires Export PDF,
`print-blocks.tsx` and the frame's print pinning on this path.

## ⌘P on the legacy reader: the one notice sheet

In `@media print` on the legacy page, everything is hidden but the notice (`display: none` on the bars and the frame;
the frame never prints). The notice (`.pp-notice`), on the print palette, inside the `@page` margins:

- label: as the masthead's ("knowledge · {book title} · Chapter {n} of {N}", or "knowledge · {project}"), mono 12px
  capitals over a 1px rule;
- title: "This {noun} prints from its own page" (Fraunces 600 20pt);
- "“{title}” keeps its original layout, inside a frame that doesn't print. Open its own page and print from there:"
  (the title in its own `lang`);
- the raw relay's address in full, in mono 14px in a 1px ink box, wrapping anywhere;
- "On screen, the bar under the {noun} has Print · new tab, which opens that page for you.";
- "Printed {date}" in mono 12px secondary.

One page on A4 and US Letter.

## Tokens

- On screen: `kb` tokens and the reader's scoped values only (`--rd-gut`, `--rd-line`, `--rd-top-h`, `--rd-bot-h`,
  `--rd-ease`, `rd-btn`, `rd-tag`, `rd-skel`, `rd-notice`, `rd-ed`). Nothing changes the app's light or dark tokens.
- **Proposed (not applied):** the frame's ring colour follows the document's scheme: `#0f6f66` (light `kb-accent`) on a
  light document page, `#62bdb2` (dark `kb-accent`) on a dark one. It uses the existing values; a scoped custom
  property is enough.
- On paper: the print palette above (today's `kb-print.css`) and the signed diagram print tones.

## Additions to signed parts (nothing signed moves or is restyled)

| Part | Add |
|---|---|
| `ReaderTop` | nothing; used with `back` "Library" for a loose document as signed |
| `ReaderBottom` | nothing; it sits inside the collapsing bottom chrome |
| Resume pill | the percentage in place of the section title, on the legacy path only |
| `SignInToSave` | nothing; `what` "bookmarks" |
| The chapter end's words (§10) | shown in the document bar's status cell on the legacy path |
| The version notices (§5) | shown in the document bar on the legacy path |
| Display | `LegacyDisplay` on the legacy path (Theme unchanged; "In this document" in place of Text size) |
| `Elsewhere` (canvas-only) | kinds `reader`, `newtab`, `print`, a `back` label, and the Library stand-in's `items` list |
| `.rd-btn` in the document bar | its label wraps under larger text (the signed button is `nowrap`); no change at the reference sizes |

**Gaps in signed parts, for the operator (not built here):** the signed chapter bar (`ReaderBottom`) overprints its
labels at a 150–200% root font on a phone ("Contents" over "‹ Previous" and "Next →"), and below 320 CSS px the signed
top bar's "‹ Book" overprints "Display". The same in the signed native reader. A fix (wrapping, or icons with labels
under larger text) is a change to the signed reader.

## Every string this job wrote

On screen:
- "Original layout" is the signed tag; new: "This document" (the bar's region label);
- "v{n} · Published {date}", "Version history";
- "Print · new tab"; "Opens the original document in a new tab, where it prints in its own layout.";
- "The theme and text size don't restyle it.";
- "Skip to the document";
- "{title}, in its original layout" (the frame's accessible name);
- "Picked up where you left off · {N}%" (the signed sentence with a percentage);
- "Loading the original document…"; "Still loading. This document is taking longer than usual."; "Loading" / "Still
  loading" (the status's label);
- "Not found · 404"; "This {noun}'s file is missing"; "The library lists this {noun}, but the file that holds its text
  isn't there, so there is nothing to show."; "The book's other chapters still open."; "The rest of the library still
  opens."; "Back to the book"; "Back to the library";
- "Error · 502"; "The original document didn't load."; "The connection to its file failed on our side. Try again —
  and if it keeps failing, the reference below tells us where it stopped."; "Try again"; "ref · {reference}";
- "In this document"; the two Display sentences above.

On paper:
- "knowledge · {book title} · Chapter {n} of {N}"; "knowledge · {project}"; "{address} · v{n}, {date} · Printed {date}";
  "Older version · v{n}"; "The current version is v{m}, at {address}.";
- "Quiz · {N} questions" / "Quiz · 1 question"; "Choose one answer."; "Select all that apply."; "Fill in the blank.";
  "Fill in the blanks."; "Write your answer, then check it against the key."; "Answers are at the end of this
  chapter.";
- "Answers"; "{N} answers to “{title}”, each with why." / "1 answer to …"; "Answer"; "(or …)"; "Sources";
- "knowledge · … · {language} · v{n}"; "Printed {date} from {address}."; "This is v{n}, the current version on that
  date; the address always opens the newest."; "This is v{n}, an earlier version; the current version is v{m}, at
  {address}."; "Translated from {source} v{from}. {source} has been updated since: it is at v{newest}." (the signed
  notice's sentence);
- the notice sheet: "This chapter prints from its own page" / "This document prints from its own page"; "“{title}”
  keeps its original layout, inside a frame that doesn't print. Open its own page and print from there:"; "On screen,
  the bar under the {noun} has Print · new tab, which opens that page for you."; "Printed {date}".

## Open questions this build waits on

OQ1–OQ9 and OQ12 (the wave's sample library) in `result.md`, plus: whether a member's saved quiz answers print (drawn: no), and a y-pixel `restore` for
exact same-device resume (not drawn; a bridge contract change).
