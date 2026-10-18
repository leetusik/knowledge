# Build prompt — the reader (job `01-reader`, round `01-reader`)

This is the implementation contract for the reader drawn on the `01-reader` canvas. It is a **draft until the operator signs the round**; build nothing from it before then. Once signed, build exactly this, under RESPECT THE DESIGN: never drop, simplify, restyle or "improve" an element. Where this file and the canvas disagree, the canvas wins, and the disagreement is a bug in this file.

## Canvas-only (never build)

- **The state bar** (`[data-proto="state-bar"]`) at the top of 01 and 03, and **the foot strip** (`[data-proto="screens"]`).
- **03, the widths board.** Its three device frames, its own bar and its theme row.
- **04, the stand-ins** `Elsewhere.dc.html`: Book page, Library, Sign in, Legacy reader and External link. Each link goes to the real surface instead (see *Wiring*).
- **05, the Foundations board,** and every Components board's titles, captions and grey ground.
- **`reader.js`.** It parses markdown in the browser and holds the sample data. The product renders on the server (S2) and reads real data.
- **`flow.js`.** It holds the scene state and the presets. The product's state is the URL, the server's progress and the device settings.
- **The inner scroller `.rd-scroll`.** The product scrolls the window (see *Layout*).

## What it is, and where it sits

- **The URLs.** A chapter opens at `/@{org}/{project}/books/{book}/{key}[?lang=&v=]`. A loose native document opens in the same reader, with no book navigation.
- **What it replaces.** The reader replaces today's document view (`documents/[id]/document-view.tsx` and the pretty-URL page) for native chapters and loose native documents. Legacy (HTML) chapters keep the legacy path; the `legacy-and-print` job draws it.
- **Who sees the same reader.** Members and the signed-out alike. A member gets progress; a signed-out reader gets everything else (*Member and signed out*).
- **No app shell.** The reader has its own chrome, with no app rail and no app topbar.

## Tokens

These are additions, proposed to the `knowledge` system after signoff. Until then they are scoped to the reader root, and the app's own light and dark tokens are unchanged.

### Faces

| Role | Stack | Note |
|---|---|---|
| `--font-reading` (body text, lede, display-panel samples) | `"Literata", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", Georgia, serif` | Literata is OFL. Self-host it, variable `opsz` 7–72 and `wght` 400–700, roman and italic, `font-display: swap`. Pretendard is the shipped Hangul face. |
| `--font-display` | system (Fraunces) | Title, headings, sheet titles, callout titles, the "next chapter" title |
| `--font-body` | system (Source Sans 3) | Every control, meta line, table and caption |
| `--font-mono` | system (JetBrains Mono) | Code, labels, chapter numbers, version numbers |

### Text size: five steps, per device

The reader root carries one of five classes. `--rd-fs` is the text size; `--rd-k` multiplies every vertical spacing step inside the text, so the rhythm grows with the text.

| Step | `--rd-fs` | px | `--rd-k` | Readout |
|---|---|---|---|---|
| 1 | 0.9375rem | 15 | 0.9375 | "Size 1 of 5 · smallest" |
| 2 | 1.03125rem | 16.5 | 1.03125 | "Size 2 of 5" |
| **3 (default)** | 1.125rem | 18 | 1.125 | "Size 3 of 5 · default" |
| 4 | 1.25rem | 20 | 1.25 | "Size 4 of 5" |
| 5 | 1.375rem | 22 | 1.375 | "Size 5 of 5 · largest" |

- **Leading** `--rd-lead` is 1.65 for body text, and for callouts.
- **The column's small step** `--rd-fs-s` is `calc(var(--rd-fs) * 0.8333)`: 15 px at the default size. Code, table cells and inline code use it.
- **The text column** `--rd-measure` is 36rem. It is fixed at every step, with no width control.
- **The wide track** `--rd-wide` is 48rem, for code, tables and art.

### Themes

Each theme is a `data-theme` value on the reader root: `light`, `dark` or `sepia`. **Light and dark are the system's values, unchanged.** Sepia is new; it sets these `kb-*` roles under `[data-theme="sepia"]`:

```
--kb-paper: #efe2c5;            --kb-surface: #f6ecd6;          --kb-surface-sunken: #ecdcba;
--kb-border: #e0cda6;           --kb-border-strong: #cfb88c;
--kb-accent: #0c6159;           --kb-accent-strong: #08483f;    --kb-accent-soft: rgba(12, 97, 89, 0.15);
--kb-tag-bg: #e6dcbf;           --kb-tag-fg: #284d45;
--kb-ink: #382a1b;              --kb-secondary: #5f4d37;        --kb-hint: #8b785b;
--kb-status-active: #0c6159;    --kb-status-active-soft: rgba(12, 97, 89, 0.12);  --kb-status-active-ink: #08483f;
--kb-status-idle: #7d5c1d;      --kb-status-idle-soft: #eedcb4; --kb-status-idle-ink: #614716;
--kb-status-revoked: #9a4535;   --kb-status-revoked-soft: #efd7c6; --kb-status-revoked-ink: #833526;
--kb-scrim: rgba(56, 42, 27, 0.42);
--kb-shadow-raise: 0 0.6rem 1.4rem rgba(56, 42, 27, 0.14);
--kb-shadow-overlay: 0 1.4rem 3rem rgba(56, 42, 27, 0.24);
```

In code, the system's themes are `data-md-color-scheme` `default` and `slate`; add `sepia` beside them for the reader.

**Which theme shows:**

| Choice | Theme |
|---|---|
| System (default, for every reader) | `prefers-color-scheme` → `light` or `dark`, never sepia |
| Light | `light` |
| Dark | `dark` |
| Sepia | `sepia` |

The reader follows System for signed-out readers too. This is the one exception to P28's rule that public pages stay light.

### The label on a primary button

`--rd-on-accent`:

| Light | Dark | Sepia |
|---|---|---|
| `#fbfaf5` | `#16130f` | `#fbfaf5` |

### Syntax roles

Code is highlighted at render time into token classes (S2). Each class reads one role:

| Class | Role | Light | Dark | Sepia |
|---|---|---|---|---|
| `t-kw` | keyword | `#7a3d6e` | `#d9a7cf` | `#6c335f` |
| `t-fn` | function | `#0a5a52` | `#7fcfc4` | `#0a5149` |
| `t-st` | string | `#6e4f12` | `#dcb877` | `#5f430d` |
| `t-nu` | number | `#9a3b2a` | `#eba893` | `#8a3323` |
| `t-cm` | comment (italic) | `#5c5347` | `#b6ad9d` | `#5f4d37` |

Every role measures at least 5.7:1 on `kb-surface-sunken` and on `kb-surface`, in all three themes (table in `result.md`).

### Frame and motion

| Token | Value | What it is |
|---|---|---|
| `--rd-top-h` | 3.5rem | the top bar's height |
| `--rd-bot-h` | 3.75rem | the chapter bar's height |
| `--rd-line` | 3px | the progress line's height |
| `--rd-ease` | 0.15s ease | the chrome's fade, and hover transitions |

The progress fill animates its width over 0.2s linear. Under `prefers-reduced-motion: reduce`, every transition is 0s and the skeleton does not animate.

### The type scale

A chapter screen at the default size uses seven sizes, each a clear step from the next. The column's sizes are ratios of `--rd-fs`, so they move together when the reader changes the text size; the interface's sizes are fixed.

| At size 3 | Ratio or value | Face | Used for |
|---|---|---|---|
| 43.2 px | `--rd-fs × 2.4` from 64rem (`× 2.1` = 37.8 from 40rem, `× 1.75` = 31.5 below) | display | the chapter title |
| 26.1 px | `1.45em` | display | h2 |
| 21.2 px | `× 1.18` | reading / display | the lede, h3, the next chapter's title |
| 18 px | `--rd-fs` | reading / display | body text, h4, callout text and callout titles, the "In this book" title at the chapter end |
| 18 px (1.125rem), fixed | | display | sheet titles, the book title in the Contents sheet, "Sign in to save" |
| 15 px | `--rd-fs-s` (`× 0.8333`) | mono / body | code, table cells, inline code, the " · new tab" marker |
| 15 px (0.9375rem), fixed | | body | every control and button, list and contents titles, notices, sheet leads, the book line |
| 13 px (0.8125rem), fixed | | body / mono | meta, captions, status sub-lines, the chapter bar's sub-lines, hints, the code block's title |
| 11 px (0.6875rem), fixed | | mono, 700, uppercase, `kb-tracking-label` | labels (the system's eyebrow) |

At the default size the column's small step and the controls' step are the same 15 px, and body text and the sheet titles the same 18 px. At the other four sizes the column's steps move with the text and the interface's stay where they are, so a chapter screen shows seven or eight sizes; at sizes 1 and 2 the column's small step (12.5 and 13.75 px) sits close to the fixed 13 px meta step.

## Layout

### The product's frame

The window scrolls.
- **The progress line** is fixed at the very top, at `top: env(safe-area-inset-top)`, full width, 3px. It never hides.
- **The top bar** is fixed under the line, `--rd-top-h` tall, with `padding-top: env(safe-area-inset-top)` added above the line.
- **The chapter bar** is fixed at the bottom, `--rd-bot-h` tall, plus `env(safe-area-inset-bottom)`.
- **The content** has `padding-top` of line + bar, and `padding-bottom` of the chapter bar. A loose document has no chapter bar and no bottom padding for it.
- **Headings** carry `scroll-margin-top: calc(var(--rd-top-h) + var(--kb-space-md))`.

### Container and breakpoints

The reader root is the size container `rd` (inline-size). Breakpoints are measured on it, at 40rem, 64rem and 90rem. The gutter `--rd-gut` is `kb-app-gutter`, or `kb-app-gutter-wide` from 90rem; below 40rem it uses the phone gutter.

### Article tracks

The article is one grid, centred as a whole:

```
[full-start] minmax(var(--rd-gut), 1fr)
[wide-start] minmax(0, calc((var(--rd-wide) - var(--rd-measure)) / 2))
[text-start] min(100% - 2 * var(--rd-gut), var(--rd-measure))
[text-end]   minmax(0, calc((var(--rd-wide) - var(--rd-measure)) / 2))
[wide-end]   minmax(var(--rd-gut), 1fr) [full-end]
```

- Every block sits in `text`.
- Code blocks and tables sit in `wide`.
- Below 40rem, a code block bleeds to `full`: square corners, no side borders, padded by the gutter.

The page never scrolls sideways at any width.

## The parts, their props and their states

Names match the canvas files. Props are listed as the view model each part needs.

### 1. Top bar (`ReaderTop`, board 06)

- **Props:**
  - `pct`;
  - `backLong` / `backShort`;
  - `isOld` / `version`;
  - `langs` / `lang`;
  - `member`;
  - `panel`;
  - `onBack`, `onLogo`, `onLang`, `onDisplay`, `onSignIn`.
- **Layout:** a grid of `minmax(0, 1fr) auto`, on the surface, with a 1px `kb-border` bottom.
- **The start group:**
  1. **The logo**, a 44×44 link with aria-label "knowledge library". It goes to the library, the reader's home.
  2. **The back link**, "‹" in secondary and then the label in `kb-weight-medium`. From 40rem the label is the book title, ellipsized; below 40rem it is "Book". A loose document says "Library".
  3. **From 40rem only, on an older version:** the tag "Older version · vN", in mono 11px, `status-idle-ink` on `status-idle-soft`.
- **The end group:**
  1. **The language switch.** It shows only when the chapter has two or more languages. It is a `role="group"` with aria-label "Language", inside a 1px `kb-border-strong` outline. It holds one button per language with `aria-pressed`, labelled "English" and "한국어", each with its own `lang`. The pressed one takes `accent-soft` and `accent-strong`.
  2. **"Display"**, a text button with `aria-haspopup="dialog"` and `aria-expanded`. It takes the accent-soft fill while its sheet is open.
  3. **"Sign in"**, for the signed-out, from 40rem only, in accent.
- **Every target** is at least 44px.
- **The skip button.** The first focusable element is "Show reading controls". It is visually hidden until focused, centred under the line, and shows the chrome when pressed.

### 2. The progress line

It is a 3px track in `kb-border`, filled in `kb-accent` to `pct`%. It sits above the top bar, stays when the chrome hides, and stays under an open sheet's scrim.

### 3. Chapter bar (`ReaderBottom`, board 07)

- **Props:**
  - `n`, `total`, `pct`;
  - `prevTitle` / `prevLang`;
  - `nextTitle` / `nextLang`;
  - `bookTitle`;
  - `panel`;
  - `onPrev`, `onNext`, `onBook`, `onContents`.
- **Layout:** `aria-label="Chapters"`. A grid of `1fr | minmax(0, 13rem) | 1fr`, or `9.5rem` in the middle below 40rem. On the surface, with a 1px top border.
- **Start, when there is a previous chapter:**
  - "‹ Previous", in 15px semibold;
  - under it, from 40rem, the previous title in 13px secondary, on one ellipsized line, in its own `lang`.
  - The first chapter shows nothing here, with no dead control.
- **Middle:**
  - "Contents" over "Chapter N of M · P%" in 13px tabular secondary;
  - `aria-haspopup="dialog"` and `aria-expanded`, with the accent-soft fill while open.
- **End, when there is a next chapter:** "Next →" over the next title, right-aligned.
- **End, on the last chapter:** "Back to the book →" over the book title. The short form below 40rem is "The book →".
- **Hover:** a `kb-surface-sunken` fill.
- **A loose document** has no chapter bar.

### 4. Resume pill (in `Reader`)

- **When it shows:** a member reopens a started chapter that has a saved section. The page opens at that section, with the chrome shown.
- **Where:** centred, `--kb-space-sm` above the chapter bar plus the bottom safe area, or above the bottom edge on a loose document.
- **What it says:** "Picked up where you left off · **<section title>**". The text is 13px secondary, with the section in ink semibold, and ellipsizes. Beside it is the quiet pill button "From the top", 44px tall.
- **When it leaves:**
  - on "From the top", which scrolls to the top;
  - when the chrome hides;
  - when another chapter opens.

### 5. Chapter opening (`ChapterHead`, board 08)

**Props:** `doc`, `lang`, `ver` (the reader's view model), `onLink`, `onVersions`, `onLatest`, `onSource`.

**In order:**

1. **The book line.** "CHAPTER 2 OF 5" in mono 11px uppercase secondary, then the book title in 15px secondary, on a wrapping baseline row. A loose document shows "DOCUMENT" and the project name.
2. **The title**, `<h1>`:
   - Fraunces semibold, `text-wrap: balance`;
   - `font-size: calc(var(--rd-fs) * 1.75)` and line-height 1.14 below 40rem;
   - `* 2.1` and line-height 1.1 from 40rem;
   - `* 2.4` from 64rem, where the opening's top padding grows 1.5×.
   - It always wraps whole, never truncates, and in Korean uses `keep-all`.
   - **It never breaks at the hyphen of a compound** ("SQLite's write-ahead log, in practice" never sets "write-" over "ahead"). The renderer inserts U+2060 WORD JOINER after each hyphen between two letters in the chapter title and the next chapter's title; `overflow-wrap: break-word` still breaks a compound wider than the column. `text-wrap: balance` alone takes the hyphen.
3. **The lede.** The `summary`, in Literata at `* 1.18`, line-height 1.5, secondary, `text-wrap: pretty`. With no `summary`, the lede is not rendered and leaves no gap.
4. **The version line.** "vN · Published <d Mon yyyy>" in 13px tabular secondary. When the variant has more than one version, it adds " · " and "Version history", a link-button in accent that opens the Version history sheet.
5. **The notices.** They sit between the version line and the contents, each with a 1px `kb-border-strong` outline on `status-idle-soft`, a mono label, a balanced sentence and an action:
   - **An older version:** "OLDER VERSION" / "You're reading v1 of this chapter. It was superseded — the current version is v2." / **"Read v2 →"**. A loose document says "document".
   - **A translation made from an older source version:** "OLDER TRANSLATION" / "Translated from English v1. English has been updated since: it is at v2." / **"Read English v2 →"**, which opens the source language at its newest version and the same section.
6. **The contents.** It shows only when the variant has at least 2 h2s:
   - a 1px hairline above and below;
   - the label "IN THIS CHAPTER" (or "IN THIS DOCUMENT");
   - every h2, in 15px semibold ink, with its h3s under it in 15px regular secondary, indented `kb-space-md`;
   - each entry is a 44px row whose first line starts at the top of the row, `text-wrap: pretty`;
   - two columns (`columns: 2`, gap `kb-space-xl`, groups never split) from 40rem, one column below;
   - aria-label "In this chapter";
   - each entry jumps to its heading;
   - hover: accent-strong with an underline.

### 6. The prose kit (`Prose`, board 09), Literata at `--rd-fs` / 1.65, in ink

| Element | Spec |
|---|---|
| First block | `margin-top: kb-space-xl × k` |
| h2 | Fraunces semibold 1.45em / 1.2. Margin `2xl×k` above and `md×k` below. Padding-bottom `sm×k`, with a 1px `kb-border` rule under it |
| h3 | 1.18em / 1.25, margin `xl×k` above and `sm×k` below. Directly after an h2, `md×k` above |
| h4 | 1em / 1.35, margin `lg×k` above and `xs×k` below |
| Headings | `text-wrap: pretty`, `overflow-wrap: break-word`, and `keep-all` in Korean |
| p | `md×k` above, `text-wrap: pretty`, `hanging-punctuation: first` |
| strong | weight 650 |
| em | italic. In Korean: upright and semibold, because Hangul has no italic |
| del | 1px line, secondary |
| Inline code | mono 0.8333em (15 px in body text at the default size; 1em inside a table cell, which is already at `--rd-fs-s`), line-height 1. Padding 0.12em 0.32em, on sunken with a 1px `kb-border`, radius `kb-radius-sm`. `overflow-wrap: anywhere`, `box-decoration-break: clone`, so the line spacing holds |
| Lists | `md×k` above, padding-left 1.4em, items `xs×k` apart. Markers in secondary, tabular. Nested `ol` → `lower-alpha`, nested `ul` → `circle`; nested lists `xs×k` above |
| Blockquote | `lg×k` above, 1em left padding, 2px `kb-border-strong` left rule, secondary italic. A Korean quote stays upright |
| Thematic break | `xl×k` above, a 1px `kb-border` line |
| Link (in-chapter, `chapter:`, `doc:`) | accent, a 1px underline at 0.18em offset in the accent at 55%. Hover: accent-strong with a 2px underline |
| External link (`https:`) | the same, followed by " · new tab" in body 0.8333em semibold, nowrap. It opens in a new tab with `rel="noopener"` |
| Missing link (a target that is missing or private to this reader) | plain text in the paragraph's ink: no underline, not focusable, no title, no tooltip, no word about why |
| Korean (`:lang(ko)`) | `word-break: keep-all; overflow-wrap: anywhere; line-break: strict` |
| Hangul inside English | Hangul glyphs come from the fallback in `--font-reading`, with no `keep-all` (open question 6 proposes wrapping each Hangul run in `lang="ko"`) |

### 7. Callout (`Callout`, board 10)

- **Props:** `block` (`type`, `title`, `collapsed`, `body`), `open`, `onLink`.
- **The box:** `lg×k` above, padding `md×k` and `md×k + 0.25rem`, radius `kb-radius`, text at `--rd-fs` / `--rd-lead`, the same size and leading as the body text around it.
- **The head:** the type word in mono 11px uppercase, then the title in Fraunces semibold 1em (the body size; face and weight set it apart), on one wrapping baseline row. An untitled callout still shows its type word.

| Type | Word | Ground | Word colour |
|---|---|---|---|
| NOTE | "Note" | `kb-surface-sunken` | secondary |
| IMPORTANT | "Important" | `kb-accent-soft` | accent-strong |
| WARNING | "Warning" | `kb-status-idle-soft` | `status-idle-ink` |
| CAUTION | "Caution" | `kb-status-revoked-soft` | `status-revoked-ink` |
| SKIP | "Skip" | `kb-surface-sunken` | secondary |
| DEFINITION | "Definition" | `kb-surface-sunken` | secondary |

The type word renders uppercase through `text-transform`.

- **The body:** its first child sits `xs×k` below the head. Paragraphs, lists and code inside it sit `sm×k` apart and keep their own styling. Code inside a callout sits on `kb-surface`.
- **Collapsed (`> [!TYPE]- Title`):**
  - a `<details>` / `<summary>`, closed by default;
  - the summary is a 44px row with the head and, at the end, "Show" or "Hide" in 15px semibold accent (underlined on hover);
  - it opens by click, Enter and Space, with the focus ring on the summary;
  - when closed, it shows its title.

### 8. Code block (`CodeBlock`, board 11)

- **Props:** `block` (`lang`, `langLabel`, `title`, `lines` of tokens, `art`).
- **The title bar**, when a title is given: a `<figcaption>` with the title in mono 13px 600 ink (`overflow-wrap: anywhere`) and the language in mono 11px uppercase secondary. It sits on the surface with a 1px border and no bottom border, rounded on top.
- **The body:** `pre` on sunken with a 1px border, radius `kb-radius`, padding 0.9rem 1rem, mono at `--rd-fs-s` / 1.6.
- **Long lines** wrap (`white-space: pre-wrap; overflow-wrap: anywhere`), with a 2ch hanging indent per source line. The page never scrolls sideways.
- **ASCII art** (`text` blocks, or blocks the renderer marks as art):
  - `white-space: pre`, line-height 1.35, `overflow-x: auto` inside the block;
  - `tabindex="0"`, `role="region"`, aria-label "Drawing, scrolls sideways";
  - below 40rem, the hint "Scroll sideways to see the whole drawing →" in 13px secondary under it.

### 9. Table (`ProseTable`, board 12)

- **Props:** `block` (`head`, `rows`, `cols`, `wide`, `long`, per-cell alignment class).
- **The table:**
  - body face at `--rd-fs-s` / 1.45;
  - cells padded 0.55rem 0.75rem, with 1px `kb-border` rules between columns and rows;
  - the header in mono 11px 700 uppercase secondary on sunken, nowrap;
  - inside a 1px bordered, rounded box;
  - cells never break mid-word;
  - right-aligned columns (from the GFM alignment row) use `tabular-nums`, and centred ones are centred.
- **Wide (8 columns or more, or wider than the track):**
  - the box scrolls sideways, with `tabindex="0"`, `role="region"` and aria-label "Table, N columns, scrolls sideways";
  - the table's `min-width` is 44rem;
  - when `scrollWidth > clientWidth`, a 2rem fade to the surface sits at the right edge, and under the box the hint "Scroll sideways for all N columns →" in 13px secondary.
- **Long (more than 20 rows):**
  - from 40rem, the header row is `position: sticky`, under the top bar while it shows (`top: --rd-top-h`) and at `top: 0` when the chrome is hidden, with a 1px `kb-border-strong` shadow line. No row ever shows above it. These are the product's values, for a window that scrolls; the canvas's inner scroller carries the bar's height as padding, so its offsets read one bar lower (`-rd-top-h` and `0`) for the same picture;
  - below 40rem, the table scrolls inside its own box (`overflow: auto; max-height: 30rem`), its header row sticks to the top of the box, and cells stay on one line;
  - the box is a focusable region labelled "Table, N columns, R rows", with the fade and the hint "Scroll in the table for all R rows and N columns".

### 10. Chapter end (`ChapterEnd`, board 14)

- **Props:** `doc`, `lang`, `prog`, `member`, `prompt`, `onMark`, `onOpen`, `onBook`, `onLibrary`, `onPrompt`, `onSignIn`.
- **The end mark:** "END OF CHAPTER" (or "END OF DOCUMENT"), mono 11px, between two hairlines. It is the end sentinel (`data-end`).
- **The status row:** a state word in 15px semibold over a sub-line in 13px secondary, and a secondary button at least 10.5rem wide: under the sentence below 40rem, at the row's end from 40rem (a `minmax(0, 1fr) auto` grid, vertically centred).
- **It holds still.** A member's four sentences (the table's member rows) are all rendered in one grid cell, the three not current at `visibility: hidden`, so the cell is always as tall as the longest at that width. Pressing Mark as finished or Mark as unread changes which sentence shows and the button's label, and moves nothing: not the button, not the next block, not the list. A signed-out reader has the one sentence. The cell is a polite live region.

| Who and when | Word / sub-line | Button |
|---|---|---|
| Signed out | "Not saved" / "Signed-out reading isn't saved. Your display settings stay on this device." | **Mark as finished** → opens Sign in to save |
| Member, finished on the newest version | "Finished" / "Saved to your progress." | **Mark as unread** |
| Member, finished on an older version (Updated) | "Finished" / "You finished an earlier version. This chapter has been updated since." | **Mark as unread** |
| Member, marked unread | "Not finished" / "Marked as unread. It stays that way until you mark it finished." | **Mark as finished** |
| Member, not yet reached | "Not finished yet" / "Reaching this point marks the chapter finished." | **Mark as finished** |

- **Pressing.** The button's label swaps in place, with the same width and no layout shift. Mark as finished becomes Mark as unread, and back.
- **Sign in to save** (signed out) opens inline under the status row, raised (see 12).
- **Next, when there is a next chapter:**
  - a block between two hairlines;
  - "NEXT · CHAPTER 3" (mono label);
  - the next title in Fraunces at `--rd-fs × 1.18` / 1.25 (the h3 step), balanced, in its own `lang`, its compounds kept whole (5);
  - its lede in 15px secondary when it has one (max-width 34rem);
  - the one primary button, "Read next →".
- **The last chapter:** "LAST CHAPTER" / "You've reached the end of this book." / the primary button "Back to the book →".
- **A loose document:** no next block and no chapter list, and the secondary button "‹ Back to the library".
- **"In this book"** (chapters only): the Fraunces title at `--rd-fs` (18 px at the default size), with "X of M finished" (member) or "M chapters" (signed out) in 13px tabular secondary at the right, over the chapter list (11).

### 11. Chapter list (`ChapterList`, board 13): the Contents sheet and the chapter end

- **Props:** `book`, `cur`, `prog`, `member`, `lang`, `sections`, `sec`, `onOpen`, `onSection`.
- **The list:** `aria-label="Chapters"`, rows separated by 1px hairlines.
- **Each row** is a link to its own chapter:
  - a grid of `2.4rem | 1fr`;
  - the number in mono 13px 600 tabular secondary;
  - the title in 15px semibold ink, in its own `lang`, `text-wrap: pretty`;
  - a meta line in 13px tabular secondary;
  - padding 0.7rem 0.5rem, at least 44px tall;
  - hover: a sunken fill with the title underlined.
- **The meta line:**

| State | Member's meta line |
|---|---|
| `unopened` | "Not started" |
| `started` | "Started · 38%" |
| `started`, marked unread | "Started" |
| `finished` | "Finished" |
| `finished`, newest version newer than the one finished on | "Finished" plus the tag "UPDATED" (accent tag) |
| a legacy chapter | its state word plus the tag "ORIGINAL LAYOUT" (plain tag) |

- **Signed out:** no state words and no counts. Only the current row shows "Reading now".
- **The current chapter:** an `accent-soft` row with `aria-current="page"`. Its meta line starts with "Reading now" in accent-strong semibold, then " · " and the state.
  - Under it, in the Contents sheet only, comes the list of its sections ("Sections of this chapter"): 44px rows in 15px secondary, indented to the title's edge.
  - The section being read is ink semibold with `aria-current="location"`.
  - Each section jumps there and closes the sheet.
- **A legacy row** opens the legacy reader.

### 12. Sign in to save (`SignInToSave`, board 15): the one reusable pattern

- **Props:**
  - `what`: "finished chapters and your place in each one" | "bookmarks" | "highlights and notes" | "quiz answers";
  - `place`: "chapter" | "document";
  - `raised`;
  - `onSignIn`, `onDismiss`.
- **The box:**
  - `role="group"`, `aria-label="Sign in to save"`, max-width 30rem;
  - padding `md` `lg` `lg`, a 1px `kb-border-strong` outline, radius `kb-radius`, on the surface;
  - `raised` adds `kb-shadow-raise`.
- **The text:**
  - the title "Sign in to save", in Fraunces 1.125rem;
  - the body in 15px secondary: "Signed in, your {what} are kept across your devices. After you sign in, you come back to this {place}, at this section."
- **The actions:** a secondary "Sign in" and a quiet "Not now", which closes the box.
- **Reuse.** Wave 2 and 3 jobs reuse it as is, changing only `what`.

### 13. Display sheet (`DisplayPanel`, board 16)

- **Props:** `size`, `themeChoice`, `os`, `onSize`, `onTheme`.
- **Text size**, a `fieldset` with the legend "TEXT SIZE":
  - five buttons in a 5-column grid, each an "A" in Literata at that step's size, with `aria-pressed` and aria-label "Text size N of 5", plus ", smallest" / ", default" / ", largest" on steps 1, 3 and 5;
  - under them, the readout in 13px secondary: "Size **N of 5** · default".
- **Theme**, a `fieldset` with the legend "THEME":
  - four buttons — System, Light, Dark, Sepia — each a 2rem swatch with "Aa" over its label;
  - the System swatch is split light and dark;
  - the readout: "**System** · follows this device, light now" (or "dark now"), "**Sepia** · warm paper, for long reading", or just "**Light**" / "**Dark**".
- **The pressed option:** a 1px accent border plus a 1px inset accent ring and an `accent-soft` fill. Hover: an accent border.
- **The note** under a hairline: "Saved on this device. Your other devices keep their own."
- **No column-width control.**
- **Applying a choice.** Every choice applies live to the whole reader. It is stored on the device, never synced and never sent to the server, and is the same for members and the signed-out.

### 14. Version history sheet (`VersionList`, board 17)

- **Props:** `doc`, `lang`, `ver`, `fail`, `onOpen`.
- **The lead:**
  - "English · 1 earlier version, newest first.";
  - "N earlier versions, newest first.";
  - "This is the only version.";
  - in the variant's own language name: "English", "한국어".
- **The rows**, newest first:
  - "vN" in mono 15px 700;
  - "Current" (accent tag) on the newest;
  - "Published <date>" in 13px;
  - "Translated from English v1" on a translation;
  - on the open version, an `accent-soft` row with `aria-current` and "Reading now" in accent-strong;
  - every other row has a secondary "View" button (aria-label "View version N") that opens that version.
- **Failed:** "UNAVAILABLE" (mono label) and "Couldn't load this chapter's history. The chapter itself is fine — reload to try again."

### 15. Sheets: Contents, Display, Version history

- **Every sheet:**
  - `role="dialog"`, `aria-modal="true"`, labelled by its title;
  - the head holds the title (Fraunces 1.125rem) and a quiet "Close" button, over a hairline;
  - the body scrolls on its own (`overscroll-behavior: contain`).
- **The scrim** is `kb-scrim`, a button labelled "Close panel" that closes the sheet.
- **Below 40rem:** a bottom sheet, max-height 88%, with a top radius.
- **From 40rem:** a full-height side sheet, `min(26rem, 88%)` wide. Contents comes from the left; Display and Version history from the right.
- **Behaviour:**
  - opening moves focus to "Close";
  - while it is open, focus stays inside it: Tab and Shift+Tab cycle through its controls (the canvas does not trap focus; the product does, since the sheet is `aria-modal`);
  - Escape, Close and the scrim close the sheet and return focus to the control that opened it;
  - the chrome cannot hide while a sheet is open.
- **Contents:**
  - the book title in Fraunces 1.125rem;
  - "Chapter N of M · X of M finished" (signed out: "Chapter N of M") in 13px tabular secondary;
  - the chapter list (11), which opens with the current chapter in view, a third of the way down.

### 16. Loading, not found, failed (`ReaderState`, board 18)

- **Props:** `kind` (`loading` | `notfound` | `failed`), `noun`, `onRetry`, `onLibrary`.
- **The bars.** The top bar and the progress line stay in every state. The chapter bar appears only once the chapter is ready.
- **Loading:**
  - `role="status"`, aria-label "Loading…";
  - a skeleton that mirrors the chapter opening at that width:
    - a book line;
    - two title bars at the title's height for that width;
    - a lede bar and a meta bar;
    - the contents block between hairlines, with four lines;
    - an h2 bar, four text lines and a code block;
  - drawn in `kb-surface-sunken` with a `kb-border` sheen moving across (1.4s), and still under reduced motion.
- **Not found.** A missing chapter and one private to this reader show the same state:
  - "NOT FOUND · 404" (mono);
  - "Chapter not found" (editorial title, `clamp(1.5rem, 1.1rem + 2cqi, 2.2rem)`, balanced);
  - "There's no chapter at this address. It may have moved, or the link may be wrong.";
  - the secondary "‹ Back to the library".
- **Failed:**
  - "ERROR · 500";
  - "Something on our side stopped reading.";
  - "This chapter did not finish loading. Try again — and if it keeps failing, the reference below tells us where it stopped.";
  - the primary "Try again";
  - "ref · <request id>" in mono 13px secondary.
  - Below 40rem, the actions stack at full width.
- **Try again** shows the skeleton, then the chapter. A result that arrives after the reader has moved on is dropped.

## Behaviour

### The chrome

The top bar, the chapter bar and the resume pill hide and show together. They are hidden with `visibility: hidden; opacity: 0` over `--rd-ease`, never moved and never reflowed. The progress line never hides. The rules, on each scroll event:

| Rule | When |
|---|---|
| **show** | the scroll position is under 48px, or within 4px of the bottom |
| **hide** | the page scrolls **down** more than 4px since the last event |
| **show** | the page scrolls **up** more than 12px since the last event |
| **toggle** | a tap or click on the text, except on a link, button, summary, details, code block, table, focusable region, input or label, or while text is selected |
| **ignore** | for 450ms after the reader itself scrolls (a jump to a section, a resume, opening a chapter), and while a sheet is open |
| **show while focused** | a hidden bar shows while it holds the keyboard focus (`:has(:focus-visible)`), and "Show reading controls" shows it for good |

### Progress, section and finished

- **Progress** is `round(scrollY / (scrollHeight − innerHeight) × 100)`. It drives the line and "Chapter N of M · P%".
- **The section being read** is the last h2 or h3 whose top is above the top bar's bottom edge + 16px + 8px.
- **For a member on the newest version,** the reader writes the position (section, fraction, `max_fraction` growing only) at the S3 cadence: 2s after scrolling stops, at most every 15s, plus the beacon. **Reading an older version writes nothing.**
- **Finished.** The chapter is marked finished with no press when the end sentinel's top comes within 40px of the viewport's bottom, or progress reaches 95%. It is then written immediately.
  - This happens once per chapter, language and version per visit.
  - It does not happen for the signed-out, or on a chapter marked unread (open question 10).
  - "Finishing any variant finishes the chapter" (S3).
- **Updated** is shown when the newest version is newer than the version the chapter was finished on.

### Opening and moving

- **Opening a chapter.**
  - For a member, a started chapter with a saved section opens at that section with the resume pill, unless it was marked unread.
  - Every other chapter opens at the top, with the chrome shown.
- **The language switch** opens the other variant at the same section. If that section does not exist there, it opens at the nearest earlier section, or at the top. Chrome copy stays English (D36 (4)).
- **A version** opens that version at its top. The newest version clears `?v=`.
- **Contents entries and `#id` links** scroll to the heading, below the top bar.

### Keyboard

- Every control is reachable in order:
  1. Show reading controls;
  2. logo;
  3. back;
  4. language;
  5. Display;
  6. Sign in;
  7. the article;
  8. the chapter bar.
- Collapsed callouts open with Enter and Space.
- Scroll regions (art, wide and long tables) are focusable and scroll with the arrow keys.
- Escape closes a sheet.
- The focus ring is `kb-focus-w` (2px) in `kb-accent`, offset `kb-focus-offset`.

## Wiring

| From | Goes to |
|---|---|
| The logo | the library (`library` job) |
| ‹ book title / ‹ Book | the book page (`book-page` job) |
| ‹ Library (a loose document), "‹ Back to the library" | the library |
| Previous / Next / a chapter row / "Read next →" / a `chapter:` link | that chapter, in this reader; each opens its own |
| "Back to the book →" (last chapter) | the book page |
| A legacy chapter's row | the legacy reader (`legacy-and-print` job) |
| A `doc:` link | that loose document, in this reader |
| A contents entry / a section row / an `#id` link | that heading, on this page |
| English / 한국어 | the other variant, same section (`?lang=`) |
| "Version history" → View | that version (`?v=N`) |
| "Read v2 →" (older version) | the newest version, at the top |
| "Read English v2 →" (older translation) | the English variant at its newest version, same section |
| "Sign in" (top bar, or the Sign in to save box) | the existing auth flow, returning to this chapter, language, version and section |
| An external link | a new tab; the chapter stays open |
| "Try again" | reloads the chapter |

## Data the page needs (view model)

```ts
type Lang = "en" | "ko";                 // any language a variant carries; the switch names each in itself
type ChapterState = "unopened" | "started" | "finished";      // S3; "Updated" is derived

interface ReaderView {
  kind: "chapter" | "loose";
  title: string; summary?: string;       // summary optional: no lede when absent
  lang: Lang; langs: Lang[];             // langs.length < 2 → no switch
  version: number; newest: number;       // version < newest → older-version tag and notice
  publishedAt: string;                   // shown "8 Aug 2026"
  translatedFrom?: { lang: Lang; version: number; sourceNewest: number };  // stale when version < sourceNewest
  versions: { n: number; publishedAt: string; translatedFrom?: { lang: Lang; version: number } }[];  // newest first
  toc: { id: string; text: string; subs: { id: string; text: string }[] }[];   // h2 with their h3s; shown when length >= 2
  blocks: Block[];                       // rendered server-side (S2)
  book?: { key: string; title: string; n: number; total: number;
           prev?: { key: string; title: string; lang: Lang };
           next?: { key: string; title: string; lang: Lang; summary?: string } };
  chapters?: ChapterRow[];               // the book's chapters, in manifest order
  viewer: { member: boolean };
  progress?: { state: ChapterState; finishedOnVersion?: number; unread?: boolean;
               section?: string; maxFraction: number };   // member only
}
interface ChapterRow {
  key: string; n: number; title: string; lang: Lang;      // title in the reader's language when that variant exists
  format: "native" | "md" | "legacy";
  state?: ChapterState; percent?: number; updated?: boolean; unread?: boolean;  // member only
  sections?: { id: string; text: string }[];              // the current chapter only
}
interface DisplaySettings { size: 1 | 2 | 3 | 4 | 5; theme: "system" | "light" | "dark" | "sepia" }  // device only; default {3, "system"}
```

- **Finished counts** ("X of M finished") count `finished` chapters, Updated included, over every chapter in the manifest (S3).
- **Missing links** come from the server as unresolved (missing, or private to this reader). The client renders them as plain text and is never told which.

## Every state, and the board that shows it

States are reached on 01 by its state bar and by clicking, and on 03 at 390, 820 and 1440.

| State | Where |
|---|---|
| Top of chapter (member) | 01 "Top of chapter"; 08 |
| Reopened at the saved section (pill) | 01 "Reopened at saved section" |
| Reading, chrome hidden / chrome back | 01 presets; scrolling |
| Chapter list open | 01 "Chapter list open"; 13 |
| 20-chapter book list on a phone | 01 "20-chapter book · list"; 03; 13 |
| Display open, each size and each theme, System on a dark device | 01 "Display settings", "Device in dark mode · System"; 16 |
| Version history, and history failed | 01 presets; 17 |
| End: finished / marked unread / not finished yet / Updated | 01 presets; 14 |
| Last chapter, end | 01 "Last chapter · end"; 07; 14 |
| No summary | 01 "No summary"; 08 |
| One section, no contents | 01 "One section · no contents"; 08 |
| Longest title at 390 | 03; 08 |
| 한국어, older translation | 01 "한국어 · older translation"; 08; 09 |
| Older version v1 | 01 "Older version · v1"; 06; 08; 17 |
| Signed out, and Sign in to save | 01 "Signed out", "Signed out · Sign in to save"; 14; 15 |
| Loading / Not found / Failed | 01 presets; 18 |
| Loose document: top, resumed, end, signed out | 01's "Reader · a loose document" page |
| The prose kit in three themes and three sizes | 09–12 |

## Every string written for the reader

The chrome copy is English only. Fixed contract strings: "Mark as finished", "Mark as unread", "Updated", "Sign in to save", "English" and "한국어".

### Top bar

- "knowledge library" (logo aria)
- "‹" with the book title, or "Book" below 40rem
- "Library" (a loose document)
- "Older version · vN"
- "Language" (aria)
- "Display"
- "Sign in"
- "Show reading controls"

### Chapter bar

- "Chapters" (aria)
- "‹ Previous"
- "Contents"
- "Chapter N of M · P%"
- "Next →"
- "Back to the book →", or "The book →" below 40rem

### Resume pill

- "Picked up where you left off · <section>"
- "From the top"

### Opening

- "Chapter N of M"
- "Document"
- "vN · Published <date>"
- "Version history"
- "Older version"
- "You're reading vN of this chapter. It was superseded — the current version is vM." (shipped copy; "document" on a loose document)
- "Read vM →"
- "Older translation"
- "Translated from English v1. English has been updated since: it is at v2."
- "Read English v2 →"
- "In this chapter" / "In this document"

### Prose

- " · new tab"
- "Scroll sideways to see the whole drawing →"
- "Drawing, scrolls sideways" (aria)
- "Scroll sideways for all N columns →"
- "Table, N columns, scrolls sideways" (aria)
- "Scroll in the table for all R rows and N columns"
- "Table, N columns, R rows" (aria)
- "Show" / "Hide" (collapsed callout)
- "Note", "Important", "Warning", "Caution", "Skip", "Definition"

### Chapter end

- "End of chapter" / "End of document"
- "Not saved" / "Signed-out reading isn't saved. Your display settings stay on this device."
- "Finished" / "Saved to your progress."
- "You finished an earlier version. This chapter has been updated since."
- "Not finished" / "Marked as unread. It stays that way until you mark it finished."
- "Not finished yet" / "Reaching this point marks the chapter finished."
- "Next · Chapter N"
- "Read next →"
- "Last chapter"
- "You've reached the end of this book."
- "Back to the book →"
- "‹ Back to the library"
- "In this book"
- "X of M finished" / "M chapters"

### Chapter list

- "Chapters" / "Sections of this chapter" (aria)
- "Not started"
- "Started · N%"
- "Started"
- "Finished"
- "Updated"
- "Original layout"
- "Reading now"

### Sheets

- "Contents"
- "Close"
- "Close panel" (aria)
- "Chapter N of M · X of M finished"
- "Display"
- "Text size"
- "Size N of 5" with " · smallest" / " · default" / " · largest"
- "Text size N of 5, smallest|default|largest" (aria)
- "Theme"
- "System", "Light", "Dark", "Sepia"
- " · follows this device, light now|dark now"
- " · warm paper, for long reading"
- "Saved on this device. Your other devices keep their own."
- "Version history"
- "English · 1 earlier version, newest first."
- "N earlier versions, newest first."
- "This is the only version."
- "vN"
- "Current"
- "Published <date>"
- "Translated from English v1"
- "View"
- "View version N" (aria)
- "Unavailable"
- "Couldn't load this chapter's history. The chapter itself is fine — reload to try again."

### Sign in to save

- "Sign in to save"
- "Signed in, your {finished chapters and your place in each one | bookmarks | highlights and notes | quiz answers} are kept across your devices. After you sign in, you come back to this {chapter | document}, at this section."
- "Sign in"
- "Not now"

### States

- "Loading…" (aria)
- "Not found · 404"
- "Chapter not found"
- "There's no chapter at this address. It may have moved, or the link may be wrong."
- "‹ Back to the library"
- "Error · 500"
- "Something on our side stopped reading."
- "This chapter did not finish loading. Try again — and if it keeps failing, the reference below tells us where it stopped."
- "Try again"
- "ref · <id>"

## Proposed system changes (logged, not applied)

1. Add `--font-reading` (Literata, self-hosted, OFL) as a fourth face, for long-form reading.
2. Add the five reading sizes (`--rd-fs` / `--rd-k`) and `--rd-lead` 1.65.
3. Add `--rd-measure` 36rem and `--rd-wide` 48rem for the reader. `kb-measure` 42rem stays for other prose.
4. Add the sepia theme as a reader-only third theme.
5. Add the five syntax roles in three themes.
6. Add `--rd-on-accent` (dark `#16130f`, matching the shipped console dark primary label).
7. Add the motion token `--rd-ease` 0.15s, and the chrome heights.
8. Pretendard stays the Hangul face. The canvas could not carry it.

None changes an existing light or dark value.
