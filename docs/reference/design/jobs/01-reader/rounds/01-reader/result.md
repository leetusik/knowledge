# Result — job `01-reader`, round `01-reader` (P29.S4, first draft)

This round is one direction (`new visual direction: no`) that extends the `knowledge` system's look into a reader. The canvas is under `jobs/01-reader/canvas/project/` and passes `design-check 01-reader`. Nothing here is signed. Every open call is listed under *Open questions* for the operator.

## Intent, one line per Page

- **01 · Page — Reader (the flow).**
  - Who: the operator, signed in on a phone, iPad or Mac, coming back days later; or a signed-out reader of a public book.
  - The job: read one chapter well, from opening to end, then go on to the next.
  - What they see first: the chapter's title and lede under the name of its book. A reader who reopens a started chapter sees the section they left instead, with a small note saying so.
- **02 · Page — Chapter screen alone.**
  - Who: the builder, or the operator, looking at the chapter screen by itself, as the flow mounts it. It takes every scene as props.
  - What they see first: the chapter opening, as in 01.
- **03 · Page — The reader at 390, 820 and 1440.**
  - Who: the operator checking the handoff's three reference sizes.
  - What they see: one prototype state drawn three times, side by side, in any theme. A click in any frame moves all three.
- **04 · Page — Stand-in for another job's screen.**
  - Who: a reader who followed a link to a screen another job draws.
  - What they see first: a plain statement of which job draws that screen, and the one way back.

## The plan, and its review

The plan below was made in working notes before the first board, and is recorded here at the end; `result.md` did not exist before then. The review changed four parts that read like the default for any reading product.

### Boards

1. One flow board (01).
2. Each screen as its own board: the chapter screen (02) and the stand-in (04).
3. A widths board (03), because the handoff asks for every state at three sizes.
4. A Foundations board for the proposed tokens (05).
5. One Components board per part (06–18).
6. Each mounted part as its own one-instance board (19–31). The flow and the Components boards `<dc-import>` them.

### Type

- **Reading text.** Literata, at five sizes: 15, 16.5, **18 (the default)**, 20 and 22 px. Leading is 1.65.
- **Headings inside the text.** Fraunces semibold: h2 at 1.45em, h3 at 1.18em, h4 at 1em.
- **Chapter title.** Fraunces at 1.75× the text size on a phone (1.6× before critique pass 01), 2.1× from 40rem and 2.4× from 64rem.
- **Lede.** Literata at 1.18×, in secondary ink.
- **Code, tables and inline code.** One small step in the column, `--rd-fs-s`, 5/6 of the text size: 15 px at the default size (critique pass 01; before, 0.78×, 0.82× and 0.9× of different parents).
- **Callouts.** At the body size and leading; their titles at 1em (critique pass 01; before, 0.94× and 1.04em).
- **Interface type.** Source Sans 3, in two steps: 13 px for meta and captions, and 15 px for controls, list titles and notices. Sheet titles are Fraunces at 18 px (18.4 px before critique pass 01).
- **Labels.** JetBrains Mono at 11 px, uppercase, the system's eyebrow rule.
- **Code.** JetBrains Mono.
- **The whole scale at the default size** is seven sizes: 11, 13, 15, 18, 21.2, 26.1 and the title (43.2 / 37.8 / 31.5). It is drawn on board 05.

### Space

- Gaps come from `kb-space-*`.
- Inside the text column, each step is multiplied by `--rd-k`, the size factor, so the rhythm grows with the text.

### Colour roles

- **Neutrals:** the system's paper, surface, sunken, ink, secondary and hairline.
- **One accent, teal.** It marks links, the one primary action of the end of a chapter ("Read next →" or "Back to the book →"), the progress line, and the current state ("Reading now", pressed options, the current version).
- **`status-idle`** colours the notices ("Older version", "Older translation") and Warning callouts.
- **`status-revoked`** colours Caution callouts.

### The bold move

The chapter opening is set like a book's chapter page:
- the mono line `CHAPTER 2 OF 5` and the book's name;
- a large Fraunces title;
- the Literata lede and the version line;
- the generated contents, between two hairlines.

Everything after it is quiet: one column of text, words for controls, and hairlines instead of boxes.

### What the review changed

1. **No docs-site layout.** The default is a sticky contents sidebar on the left and an "On this page" rail on the right. The reader keeps one centred column, as in a Kindle. The contents sit in the chapter opening, and the full chapter list sits in a Contents sheet one press away.
2. **Words, not icon buttons.** The default is a hamburger, a gear, "Aa" and a globe. The system has no icon set, so the controls are words: Contents, Display, English / 한국어, ‹ book.
3. **A thin line, not a badge or a ring.** Progress is a 3 px line at the very top that never hides, plus "Chapter 2 of 5 · 42%" under Contents in the chapter bar. A percentage badge would compete with the text.
4. **No app shell around a chapter** (open question 4). A member reads in the same quiet chrome as everyone else.

## What was designed

### Pages

- **01 · Page — Reader (the flow).** `Main.dc.html` is a fill page, interactive at 1440×1017. It holds the whole scene in one `state`:
  - the document, the language and the version;
  - signed in or out;
  - the chrome, the open sheet and the load status;
  - the progress map, the section being read, and the sign-in prompt;
  - the device settings, the OS theme, and the stand-in being shown.

  Its state bar has seven page groups. Only the current page's presets show:
  - **Reader · a chapter:** Top of chapter, Reopened at saved section, Reading · chrome hidden, Reading · chrome back, Chapter list open, Display settings, Version history, Version history · failed, End · finished, End · marked unread, Last chapter · end, No summary, One section · no contents, 20-chapter book · list, 한국어 · older translation, Older version · v1, Signed out, Signed out · Sign in to save, Device in dark mode · System, Loading, Not found, Failed to load.
  - **Reader · a loose document:** Top of document, Reopened at saved section, End of document, Signed out.
  - **Book page, Library, Sign in, Legacy reader, External link:** one preset each, with the "only state" note.

  Themes and text size are device settings. A preset keeps them, and the Display sheet changes them.
- **02 · Page — Chapter screen alone.** `Reader.dc.html` takes the scene as props and renders the chapter at the top when alone.
- **03 · Page — The reader at 390, 820 and 1440.** `Widths.dc.html` is interactive. It has its own state bar of the key scenes, plus a theme row (Light, Dark, Sepia, System).
- **04 · Page — Stand-in for another job's screen.** `Elsewhere.dc.html` draws five kinds: book page, library, sign in, legacy reader and external link.

### Foundations

**05 · Foundations** shows:
- the five text sizes, set in real text;
- the type steps at size 3, and the whole seven-size scale of a chapter screen, with what uses each size;
- the three themes, with every role's hex value;
- the syntax roles, with their contrast.

All of it is marked "proposed".

### Components

Each board shows every state side by side under a plain caption, at phone, iPad and desktop widths and in light, dark and sepia where the state differs:

- **06 · Component — Top bar and progress line:**
  - member and signed out;
  - one and two languages;
  - English or 한국어 current;
  - an older version;
  - the phone, iPad and desktop forms;
  - a loose document (back to the library).
- **07 · Component — Chapter bar:**
  - the first chapter (no Previous);
  - a middle chapter;
  - the last chapter ("Back to the book →");
  - Contents pressed;
  - the phone form, with titles hidden;
  - a Korean neighbour title.
- **08 · Component — Chapter opening:**
  - full, with no summary, with one section (no contents) and with the longest title at 390;
  - an older version and the older-translation notice;
  - a loose document;
  - the Korean opening;
  - all three themes;
  - text sizes 1 and 5.
- **09 · Component — Prose kit:**
  - every element of the native kit, at three sizes and in three themes;
  - every link kind, including the missing link;
  - Hangul inside English, and a Korean passage.
- **10 · Component — Callout:**
  - six types, with a title and without, in light, dark and sepia;
  - collapsed, closed and open.
- **11 · Component — Code block:**
  - titled and untitled;
  - a long line that wraps;
  - ASCII art at 390 and 820;
  - syntax in three themes.
- **12 · Component — Table:**
  - wide (8 columns) at the phone and iPad widths, in light and dark;
  - numeric, right-aligned, in three themes;
  - long (34 rows) at 720, and on a phone in its own scroll box with the header kept.
- **13 · Component — Chapter list:**
  - all four states;
  - signed out, with no progress;
  - dark, reading the last chapter (Updated);
  - 한국어 in sepia;
  - a 20-chapter book in sepia and in light.
- **14 · Component — Chapter end:**
  - finished, at 720;
  - the last chapter, in sepia;
  - a loose document;
  - marked unread, with "Mark as finished";
  - signed out, with "Sign in to save" open, in dark;
  - finished on an earlier version;
  - not finished yet.
- **15 · Component — Sign in to save:** the one pattern, raised and inline, for finished chapters, bookmarks, highlights and notes, and quiz answers.
- **16 · Component — Display panel:**
  - the defaults;
  - size 1 and size 5;
  - each theme chosen;
  - System on a dark device;
  - the sheet on a phone.
- **17 · Component — Version history:**
  - English, reading the newest, with Current marked;
  - English, reading v1, in sepia;
  - 한국어, translated from English v1, in dark;
  - three versions;
  - one version only;
  - failed to load.
- **18 · Component — Loading, not found, failed:**
  - the skeleton at phone, iPad and desktop width;
  - not found;
  - failed, with Try again.

### Mounted parts (19–31)

Each part of the reader is a `.dc.html` file that takes its state as props: `ReaderTop`, `ReaderBottom`, `ChapterHead`, `Prose`, `Callout`, `CodeBlock`, `ProseTable`, `ChapterList`, `ChapterEnd`, `SignInToSave`, `DisplayPanel`, `VersionList` and `ReaderState`. Each is placed once on the canvas, at its natural size.

### Directions

None. The operator asked for no options.

## Data used

### Real

- **The five chapter titles** of the `knowledge` maintainer guide, in their order, exactly as the handoff gives them.
- **The chapters' subjects**, from reading the real chapters on `origin/main` (`git show`, read only; nothing pulled or merged):
  - the two planes;
  - disk as canonical;
  - the write path;
  - the contracts;
  - the read surfaces;
  - shipping;
  - the decisions.
- **The route table and the settings table**, modelled on the shipped server's routes and environment flags, with P29's reader routes added.
- **Shipped copy from `web/src/content/documents.ts`:**
  - the older-version notice ("You're reading vN of this … It was superseded — the current version is vM.", with "document" replaced by "chapter" in a chapter);
  - "Version history";
  - "Published …";
  - "Current".
- **The fixed contract strings:** "Mark as finished", "Mark as unread", "Updated", "Sign in to save", "English" and "한국어".
- **The logo:** `assets/logo.svg`, byte-identical to `web/public/logo.svg`.

### Made up for the canvas

- **The book's title,** "The knowledge maintainer guide". No manifest names it yet.
- **The chapter bodies.** They are written for the canvas, on each chapter's real subject. The main sample chapter (2) carries the full prose kit.
- **Tidewater, from the inside.** An invented 20-chapter codebase book in an invented project, `tidewater`:
  - chapter 7 is a legacy (original layout) chapter;
  - chapter 10 has a v2;
  - chapter 20 is "Reading guide: how to use this book".
- **The loose document.** "SQLite's write-ahead log, in practice", in an invented project `field-notes` (v2).
- **A private chapter,** `private-notes/sharding`, which only exists to resolve as a missing link.
- **The Korean variant** of chapter 2 (KO v1, translated from EN v1), written for the canvas.
- **Every date, version number and progress figure.**
- **The latency table** inside the sample chapter. Its figures are sample chapter content, not product claims.
- **The failure reference** `ref · rd-7f3a2c91`.

### Not on the canvas

- No secret, key, email or person.
- No glide-ilab or base material, and nothing from arb_upbit_1.
- The signed-in reader is never named: the reader chrome shows no account menu.

**Placeholders:** none.

## Component and token gaps

The system ships no component bundle, so every part is drawn as markup, on its own board, and logged here. None of it is added to the system.

### Component gaps

- the top bar and the progress line;
- the chapter bar;
- the resume pill;
- the chapter opening, with its notices and its generated contents;
- the prose kit;
- callouts;
- the code block with syntax roles;
- prose tables (wide, long, numeric);
- the chapter list;
- the chapter end;
- Sign in to save;
- the Display panel;
- version history;
- the left and right sheets with their scrim;
- the reading skeleton, not-found and failed states.

Buttons and the editorial error match the shipped `app-button` and `states/` values. One departure: reader buttons use the 15 px interface step (see *Departures*).

### Token gaps (proposed additions; nothing applied to the system)

1. **`--font-reading`:** Literata, then Pretendard, Apple SD Gothic Neo, Noto Sans KR, Georgia, serif. Literata is OFL and self-hostable. It is a fourth face beside the system's three.
2. **Five text sizes** as `--rd-fs` with a matching spacing factor `--rd-k`: 0.9375, 1.03125, 1.125, 1.25 and 1.375rem. The leading is `--rd-lead` 1.65. The column's small step is `--rd-fs-s`, `--rd-fs × 0.8333`.
3. **`--rd-measure` 36rem** (the text column) and **`--rd-wide` 48rem** (code, tables and art).
4. **The sepia theme:** a full set of `kb-*` role values under `[data-theme="sepia"]`, scoped to the reader. It is listed in `build-prompt.md`.
5. **Syntax roles** `--rd-syn-kw`, `--rd-syn-fn`, `--rd-syn-st`, `--rd-syn-nu` and `--rd-syn-cm`, in light, dark and sepia.
6. **`--rd-on-accent`:** `#fbfaf5`, or `#16130f` in dark. The dark value matches the shipped `kb-console-responsive.css` dark primary label.
7. **Motion:** `--rd-ease` 0.15s for the chrome's fade, with `prefers-reduced-motion` honoured.
8. **Chrome heights:** `--rd-top-h` 3.5rem, `--rd-bot-h` 3.75rem and `--rd-line` 3px.
9. **A Hangul face.** The canvas falls back to the system Hangul fonts. The product ships Pretendard.

None of these changes the app's own light or dark tokens outside the reader.

## States reached only by interaction

The state bar cannot force these. Each one is reached by using the prototype on 01 or 03:

- **Hover:**
  - text links take accent-strong and keep their underline;
  - buttons take the system's hover;
  - chapter rows underline their title;
  - theme and size options take an accent border.
- **Focus:** a 2 px `kb-accent` ring on every control. Tab into a hidden chrome and it shows itself while it holds the focus.
- **Keyboard:**
  - a collapsed callout opens and closes with Enter and Space;
  - Escape closes any sheet;
  - focus moves into a sheet when it opens;
  - the ASCII-art block and the scrolling tables are focusable regions you can scroll with the arrow keys.
- **The chrome hiding as you scroll down, and coming back** when you scroll up, reach the top or the end, or tap the text.
- **The resume pill** leaves when the chrome hides or on "From the top".
- **Reaching the chapter end** marks a member's chapter finished with no press, unless they marked it unread (open question 10).
- **The 한국어 / English switch** lands on the same section in the other language.
- **Try again** on Failed to load passes through the skeleton for about 0.9 s and lands on the chapter. A preset pressed during that time drops the late result.
- **The Contents sheet** scrolls the current chapter into view, about a third of the way down.
- **Opening a started chapter from the list** lands at its saved section, with the pill.

## Departures from the handoff

Each is a call the handoff left open, or a place where the canvas differs from what the product will do.

1. **A fourth face, Literata, for reading text.** It is the answer to "kindle like": Kindle's Bookerly is proprietary, and Literata is the open book face closest to it. It is OFL and self-hostable. On the canvas it loads from Google Fonts CSS; the product self-hosts it.
2. **The text column is 36rem, and code and tables run to 48rem**, not `kb-measure` 42rem and `kb-app-read-w` 64rem. Literata at 18 px needs a narrower measure than Source Sans at 16 px to stay at about 65 characters per line.
3. **Lines past 75 characters.** At sizes 1 and 2 (15 and 16.5 px), the fixed 36rem column runs past 75 characters per line. The operator fixed the column width ("fixed column width"), so it does not narrow for small text.
4. **The canvas scrolls inside the reader frame.** The product scrolls the window, with fixed bars and `env(safe-area-inset-*)`. `build-prompt.md` specifies the product's way.
5. **A reading chrome of its own** for members and the signed-out alike, not the app shell (open question 4).
6. **Presets keep the device settings.** A state bar preset sets the whole scene except theme and size, because those are per device. "Device in dark mode · System" is the one preset that sets the theme.
7. **The widths board's two axes.** 03 works on scene and theme at once; its bar has a separate theme row. It is an interactive 2794 px board, not a 1280–1440 fill page, because it draws three device frames.
8. **02 and 04 are fixed 1440×900 boards**, not fill pages. 02 is the screen the flow mounts. 04 is a stand-in.
9. **In-text links carry `href="#top"`** and are handled by script, so a link never leaves the canvas. In-chapter `#id` links point at their heading.
10. **The canvas parses its sample markdown in the browser** (`reader.js`), to keep the boards honest to the native format. The product renders on the server (S2).
11. **Progress is the scrolled fraction of the chapter,** shown as a percentage and saved with the section being read. A member reading an older version saves nothing.
12. **Back links use "‹"**, as the craft rule asks, and the next links use "→", per the README.
13. **"Sign in" is not in the phone top bar**, for room. On a phone, a signed-out reader meets it at the chapter end ("Mark as finished" answers "Sign in to save"). From 40rem it sits in the top bar.
14. **"Version history" shows only when there is more than one version.** A single version shows no dead link. The sheet's "This is the only version." state is drawn on board 17.
15. **The chapter's contents show only with at least 2 entries.** The handoff asks for no one-line contents.
16. **The not-found copy is new.** It is "Chapter not found / There's no chapter at this address. It may have moved, or the link may be wrong." The shipped `publicNotFound` speaks of documents and offers search. This one names the chapter and offers "‹ Back to the library", as the check asks.
17. **The README's "tables become cards below 40rem" rule is not used for prose tables** (open question 2).
18. **The long table on a phone scrolls inside its own 30rem box**, where its header row sticks. From 40rem its header sticks under the top bar as the page scrolls (fixed in critique pass 01: before, it stuck one bar too low and rows showed above it).
19. **Board 22, the Prose mounted part, shows the loose document.** The main sample chapter would pass the 8000 px board limit.
20. **The reader's interface type is 13 and 15 px, with sheet titles at 18.** Buttons are 15 px, where the console's buttons are 0.85rem. The README's 0.85rem is a console rule; in the reader, buttons match the bar controls so there is one control size.
21. **Hangul inside English text breaks between syllables at the end of a line**, as S2 asks ("without `keep-all` on the English"). It is visible on the Prose kit board, and open question 6 proposes a fix.

## Render log

The preview ran as `design-preview 01-reader --runtime <the handoff's runtime> --click`, into a scratch folder outside the design root.

### Pass 1

- **What it covered:** 31 screenshots, with the click-through on 01 and 03.
- **What it measured:** 8 `issue` lines: 6 × `check=target`, 1 × `check=dead-link` and 1 × `check=size`.
- **What the PNGs showed:**
  - text inside flex rows lost its spaces;
  - the resume pill covered the chapter heading;
  - table cells broke mid-word;
  - the contents' two columns misaligned;
  - the 20-chapter Contents opened at the top, not at the current chapter;
  - a preset read as not pressed after a jump.
- **Fixed:**
  1. The language buttons grew from 38 to 44 px (`target`).
  2. The demo `#id` links on board 09 now point at `#top` (`dead-link`).
  3. The Prose mounted part now shows the loose document, under 8000 px (`size`).
  4. Mixed text in flex rows is wrapped in spans.
  5. The resume pill moved to the bottom, above the chapter bar.
  6. Table cells keep words whole.
  7. Contents entries align their first lines across the two columns.
  8. The Contents sheet scrolls the current chapter into view.
  9. A scene's signature now includes "in the text" or "at the top", so the pressed preset is always the one that matches.

### Pass 2

- **What it covered:** 32 screenshots and 94 click-through states.
- **What it measured:** 0 `issue` lines and 0 `check=` lines, interaction checks included (`layout-shift`, `same-target`, `page-clip`, `hover-contrast`).
- **Coverage limit:** the state cap of 48 was reached on 01 and 03. The click-through tried presets on three of 01's pages; I clicked the rest myself while reading the states, including Library → back, which returns to the same section.
- **The link graph from `Main.dc.html`** reaches Reader, Widths and Elsewhere.
- **What I read:** every board PNG, and the state PNGs of 01 and a sample of 03.
- **What I fixed after it.** These fixes were checked by my own scratch measurements and screenshots, not by a third `design-preview` pass; there were at most 2 passes.
  - **A caption on 08** read "A loose document · no chapter of". It is now "A loose document · no book, no chapter number".
  - **The last chapter's end** read "…end of The knowledge maintainer guide.", with a capital mid-sentence. It is now "You've reached the end of this book."
  - **Board 10** wrapped its sixth callout onto a new row, being 4 px short. It is now 3200 px wide, and its height is re-measured.
  - **Wide tables** ran past their track at 820 and 1440 with no sign. They now show the fade and "Scroll sideways for all 8 columns →" at every width.
  - **The long table on a phone** lost its header row and wrapped "write key" unevenly. It now scrolls in a 30rem box with the header kept, and its cells stay on one line.
  - **Interface type had near-misses** at 13, 14, 15 and 16 px. It is now two steps, 13 and 15, plus the 11 px labels and 18.4 px sheet titles.
  - **Line breaks.** A contents entry left "runs" alone on its last line, and the notices left "at v2." and "is v2." alone. The contents and the chapter-list titles now use `text-wrap: pretty`, and the notices use `text-wrap: balance`.
  - **The Korean blockquote** rendered in synthetic italic. Korean quotes now stay upright, and Korean emphasis is set semibold, because Hangul has no italic.
  - **The missing-link sentence** in the sample chapter said the links "no longer resolve for you", which hinted at why. It now reads "Recovery from a lost disk is in the backup runbook, and the plan for outgrowing one disk is in the sharding draft.", and the Korean is rewritten the same way. The missing links read as plain text and say nothing about why.
  - **Board heights** were re-measured after these fixes and synced into `canvas.json` and each `$preview`.
- **Left open:**
  - Hangul inside English (departure 21, open question 6).
  - The "→" glyph sits slightly high in Source Sans 3.
  - The resume pill overlaps one line of text while it shows. It is transient, and leaves when the chrome hides.

## Measured contrast (every text, link and UI colour, in each theme)

The values are computed from the token hex values with the WCAG formula. Text needs 4.5:1, and UI parts 3:1.

| Pair | Light | Dark | Sepia |
|---|---|---|---|
| Body text (ink) on the reading ground | 15.80 (`#26211c` on `#fffefa`) | 12.88 (`#ece4d7` on `#232019`) | 11.81 (`#382a1b` on `#f6ecd6`) |
| Secondary text (lede, meta, captions) on the ground | 7.48 | 7.32 | 6.87 |
| Links and the accent on the ground | 5.97 (`#0f6f66`) | 7.31 (`#62bdb2`) | 6.23 (`#0c6159`) |
| Link hover (accent-strong) on the ground | 8.70 | 9.51 | 8.90 |
| Ink on sunken (code, plain callouts, table head) | 13.18 | 11.94 | 10.24 |
| Secondary on sunken (callout type, table head labels) | 6.23 | 6.78 | 5.96 |
| Links on sunken (inside a plain callout) | 4.98 | 6.77 | 5.41 |
| Ink on accent-soft (Important callout, current row) | 12.75 | 8.79 | 9.42 |
| Accent-strong on accent-soft (Reading now, pressed, Updated tag) | 7.02 | 6.49 | 7.11 |
| Links on accent-soft (inside an Important callout) | **4.82** | **4.99** | **4.98** |
| Ink on idle-soft (notices, Warning callout) | 12.85 | 9.60 | 10.25 |
| Idle-ink on idle-soft (notice label, Warning type) | 5.93 | 6.27 | 6.42 |
| Accent-strong on idle-soft (notice action) | 7.08 | 7.09 | 7.73 |
| Ink on revoked-soft (Caution callout) | 12.56 | 9.86 | 10.04 |
| Revoked-ink on revoked-soft (Caution type) | 5.62 | 5.68 | 6.08 |
| Primary button label on accent | 5.76 | 8.32 | 7.00 |
| Primary button label on accent-strong (hover) | 8.40 | 10.83 | 10.00 |
| Syntax keyword on sunken / on the ground | 6.38 / 7.65 | 7.44 / 8.03 | 6.81 / 7.86 |
| Syntax function on sunken / on the ground | 6.68 / 8.01 | 8.34 / 9.00 | 6.79 / 7.82 |
| Syntax string on sunken / on the ground | 6.22 / 7.46 | 8.01 / 8.64 | 6.76 / 7.79 |
| Syntax number on sunken / on the ground | 5.72 / 6.86 | 7.57 / 8.17 | 6.02 / 6.94 |
| Syntax comment on sunken / on the ground | 6.23 / 7.48 | 6.78 / 7.32 | 5.96 / 6.87 |
| Focus ring and progress fill vs the ground (UI) | 5.97 | 7.31 | 6.23 |
| Progress fill vs its track (UI) | 4.42 | 5.64 | 4.69 |
| Hint vs the ground: never used for text | 3.56 | 3.58 | 3.62 |

The lowest text pair is a link inside an Important callout: 4.82, 4.99 and 4.98, all at or above 4.5. Every measured `check=contrast` line in both passes was clean.

## Open questions, for the operator

Each one is drawn as my answer, in the one direction. Only the operator's words settle them.

1. **ASCII art on a phone (handoff Q1).**
   - **Drawn:** the art keeps its lines and scrolls sideways inside its own block. The block is a focusable region named "Drawing, scrolls sideways", with the hint "Scroll sideways to see the whole drawing →" under 40rem. The page itself never scrolls sideways.
   - **Trade-off:** you cannot see the whole drawing at once on a phone. Scaling it to fit would show the whole shape but makes monospace unreadable below about 70%.
2. **Wide tables on a phone (Q2).**
   - **Drawn:** round 06's focusable scroll box is kept, with a fade at the right edge and "Scroll sideways for all 8 columns →".
   - **Long tables:** a long table keeps its header in view, under the top bar from 40rem, and in its own scroll box on a phone.
   - **Not used:** the README's "cards below 40rem" rule.
   - **Trade-off:** cards read row by row without scrolling, but an 8-column table becomes 6 tall cards, and the columns can no longer be compared.
3. **Copy link and Print (Q3).**
   - **Argued against** both, in the reader's chrome:
     - the browser's own share (Safari's share sheet on iPhone and iPad, the address bar on a Mac) already copies the chapter's address;
     - every print sheet belongs to the `legacy-and-print` job.
   - **Trade-off:** on a Mac, copying a link is two moves, not one. A "Copy link" could later sit in the Contents sheet, out of the reading line.
4. **Where a member reads (Q4).**
   - **Drawn:** a reading chrome of its own, the same for members and the signed-out, with no app rail or app topbar:
     - the logo, which goes to the library;
     - "‹ book", back to the book;
     - the language switch;
     - Display;
     - "Sign in", for the signed-out only.
   - **Trade-off:** a member is one press further from the console and the app's navigation while reading. The `library` job can add Library and Review to the app shell either way.
5. **The Hangul face.** The canvas shows the system Hangul fonts, because the system could not carry Pretendard. The product names Pretendard right after Literata. Is Pretendard beside Literata the pairing you want, or a Korean serif such as Noto Serif KR to match Literata's tone?
6. **Hangul inside English.** S2 says no `keep-all` on English, so a Korean term at the end of an English line can break between its syllables ("지식 시/스템의"). The fix would be to wrap each Hangul run in `<span lang="ko">` at render time, which the `:lang(ko)` rule then keeps whole. Should the renderer do that?
7. **The "Sign in to save" button.**
   - **Drawn:** "Sign in" as a secondary button beside "Not now", so the chapter end keeps one primary action ("Read next →").
   - **Trade-off:** a primary "Sign in" would push harder toward an account, at the cost of two primary buttons on one screen.
8. **Sepia and the reading face as system tokens.** Should sepia, Literata, the five sizes and the syntax roles enter the `knowledge` system once signed, or stay reader-scoped?
9. **Interface type in the reader.** The reader uses 13 and 15 px, where the console uses 0.82rem text and 0.85rem buttons. Keep the reader's own two steps, or match the console?
10. **How long Mark as unread holds.**
    - **Drawn:** Mark as unread holds until the reader presses Mark as finished. Reaching the end again does not finish the chapter, and the end says so: "Marked as unread. It stays that way until you mark it finished."
    - **Why:** S3 says `max_fraction` only grows. Once a chapter has been read to the end, a rule that re-finishes it at the end would undo the press on the next position write.
    - **The other reading:** a fresh read to the end finishes it again. That needs the server to reset `max_fraction` on Mark as unread. Which do you want?

## Critique pass 01

The answer to `critique-01.md` (mode `critic`, verdict `revise`, 5 must-fix, nothing held for a judge). Every must-fix is fixed; none is rebutted.

- **C01** (the state bar re-wraps at 390 when a long preset is pressed): fixed. Each preset now reserves the width of its bold, pressed label (a hidden bold copy of its label, `content: attr(data-label) / ""`, so it adds nothing to the button's name), on Main and on Widths. Measured at 390, 820 and 1440, pressing each of the 22 chapter presets from a fresh load and then all 22 one after another: the bar holds one height (317, 140 and 88 px) and the top bar one y (320, 143 and 91) in every case. At 390 the bar is 52 px taller than before, since every preset now takes its bold width. The pressed look is unchanged.
- **C02** (the long table's sticky header floats one bar too low from 40rem): fixed. The canvas's scroller carries the top bar's height as padding, and a sticky offset counts from inside it, so the canvas now uses `top: calc(-1 * --rd-top-h)` with the chrome hidden and `top: 0` while it shows. Measured at 820, 1024 and 1440: with the chrome hidden the header's top equals the reading area's top (143, 117, 91), and while it shows it equals the top bar's bottom (199, 173, 147). Pictured at 820 and 1440, nothing shows above the header. The phone's own 30rem box is unchanged. `build-prompt.md` keeps the product's values (`0` and `--rd-top-h`, for a window that scrolls) and now says why the canvas's differ.
- **C03** (Mark as finished / Mark as unread moves the button and the page on a phone): fixed. Every sentence a member can toggle between (Finished, Finished on an earlier version, Marked as unread, Not finished yet) is rendered in one grid cell, with the three not current at `visibility: hidden`, so the cell is always as tall as the longest. The row is now a grid: below 40rem the button sits under the sentence, and from 40rem at its end. Measured at 390, 430, 600, 820 and 1440, from End · marked unread to Mark as finished and back: the button, the next block and the chapter list keep their exact x, y, width and height. The sentence cell is a polite live region.
- **C04** (the loose document's title breaks "write-" / "ahead"): fixed. Display titles (the chapter title and the next chapter's title) put a WORD JOINER after each hyphen between two letters (`RD.display`), and `overflow-wrap` still breaks a compound wider than the column. Measured: "SQLite's write-ahead" / "log, in practice" at 390 (304 / 215 px), 820 and 1440. The build prompt names the rule (5).
- **C05** (fifteen text sizes, with near-misses): fixed. A chapter at the default size now uses seven sizes: 11, 13, 15, 18, 21.2, 26.1 and the title (43.2 at 1440, 31.5 at 390), measured over every visible text node at 1440 and 390. The changes:
  - code, table cells and inline code share one small step, `--rd-fs-s` = 5/6 of the text size, 15 px at the default, where they were 14.0, 14.8, 13.3 and 13.9;
  - the " · new tab" marker uses the same step (was 14.0);
  - callouts are at the body size and leading (was 16.9 / 1.6), and their titles at 1em (was 17.6);
  - the next chapter's title is at the h3 step, 21.2 (was 23.2);
  - sheet titles and "Sign in to save" are 18 (was 18.4), and the "In this book" title at the chapter end follows the text size (18 at the default);
  - the chapter title on a phone is 1.75× (31.5 px), so it stands clear of the 26.1 px h2 (it was 28.8).

  Board 05 now draws the seven sizes with what uses each. At the other four sizes a chapter shows seven or eight sizes, because the column's steps move with the text while the interface's 13 and 15 px stay. At sizes 1 and 2 the column's small step (12.5 and 13.75 px) sits close to the 13 px meta step. They sit in different places, the code and tables in the column and the meta in its lines and bars. This is logged here and in `build-prompt.md`, not hidden.

### Also changed in this pass

- **Callouts carry the reading face themselves.** The Callout board (10) and its mounted part (23) drew callout text in Source Sans 3, because outside the prose wrapper nothing set Literata. In the chapter they were already Literata. The board now matches the page.
- **Focus inside a sheet.** The critic's build note is taken up in `build-prompt.md` (15): while a sheet is open, Tab and Shift+Tab stay inside it. The canvas does not trap focus.
- **A side effect to know.** On a phone, the long table's 30rem box now shows the route column and only a sliver of the next one, because the route's inline code grew from 13.3 to 15 px. The fade and "Scroll in the table for all 34 rows and 4 columns" say there is more. Open question 2 stands as drawn.

### Not acted on (the operator's taste)

The critic's 2b notes stay with the operator: Literata as a fourth face (departure 1), bars running edge to edge at 1440 against a 36rem column, and the four near-identical beige callout grounds in light and sepia.

### Render log, critique pass

- **Pass 1** (`design-preview 01-reader --click --phone-click`): 32 PNGs, 141 states, 11 issues, all `check=frame-clip`, from boards whose content grew with the new sizes (Foundations, HeadStates, ProseStates, CalloutStates, CodeStates, TableStates, StateStates, Prose, Callout, CodeBlock, ProseTable). No `layout-shift`, in the frame or the phone view. I read every changed board's PNG. I synced the 11 heights into `canvas.json` and each `$preview`, and re-stacked the rows below them. I then measured C01–C05 with my own scripts at 390, 430, 600, 820, 1024 and 1440 (numbers above). From reading the PNGs I fixed the callout face, and from the size counts I made the "In this book" title follow the text size.
- **Pass 2** (the same command): 32 PNGs, 141 states, **0 issues**, every frame equal to its content height. I read the changed boards again (callouts now in Literata) and a sample of Main and Widths states, at the phone, iPad and desktop sizes.
- **Left open:** the 13 / 12.5–13.75 px closeness at text sizes 1 and 2 (above); the "→" glyph that sits high in Source Sans 3 and the resume pill over one line, both carried over from the first draft.
