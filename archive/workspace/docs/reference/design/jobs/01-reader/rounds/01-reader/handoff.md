# Handoff — job `01-reader`, round `01-reader` (slice P29.S4)

new visual direction: no

critique: critic+judge

This is the drafter's whole brief and the critic's yardstick for the reader's first round. The
orchestrator wrote it on 2026-10-18 from the record:
- the P29 contracts (`works/phases/active/P29/phase.md` → `## Decisions`, S1–S3);
- the S4 notes (`## Notes for later slices`);
- `works/phases/active/P29/intent.md`;
- the synced design system;
- the shipped code.

Anything marked REFERENCE is data, not a proposal. No `docs/current/` section is named. Experience and
frontend there are STALE: P28's `## Doc impact` and the code win.

## Product context

- **What knowledge is.** A hosted knowledge base. Coding agents publish documents, mostly explainers
  about a codebase, into an org's library, which is read on the web and over MCP. P29 and P30 turn it
  into a **personal learning library that reads like an e-book**:
  - books of ordered chapters, for anything the operator studies (AI, English, Finance, …);
  - codebase knowledge stays first-class.
- **Who reads.**
  - The operator, a solo developer, reading their own books on iPhone, iPad and a Mac, in long
    sessions, coming back days later.
  - Anyone reading a public book while signed out.
- **What the reader is for.** Reading one chapter well:
  - getting in;
  - reading without the interface in the way;
  - knowing where you are;
  - moving on to the next chapter;
  - switching between English and Korean;
  - coming back to the same place.
- **Where it sits.**
  - A chapter opens at `/@{org}/{project}/books/{book}/{key}[?lang=&v=]`.
  - A loose document, which is in no book, opens in the same reader with no book navigation.
  - The reader **replaces today's document view** for native chapters and loose native documents.
  - It is the phase's most central surface. Every later job draws in the reading type and the three
    themes this job settles: wave 2's blocks inside a chapter, and wave 3's library, book page, review,
    legacy reader and print.
- **Today's document view (REFERENCE: the shipped look the reader grows from, signed as round 06 on
  2026-09-21):**
  - the views: `web/src/app/(public)/documents/[id]/document-view.tsx`, `markdown-body.tsx` and
    `version-history.tsx`;
  - the pretty-URL page: `web/src/app/(public)/[org]/[project]/[slug]/page.tsx`;
  - the styles: `web/src/app/kb-docview.css`, whose `.kb-prose` grid has a text track at `kb-measure` and
    a full track at `kb-app-read-w`;
  - the shell: `web/src/components/public-shell.tsx`;
  - the copy: `web/src/content/documents.ts`;
  - round 06's record: `web/design/rounds/06-document-views/` (`handoff.md`, `SIGNOFF.md`,
    `output/result.md` and `output/build-prompt.md`).

## The operator's bar

none beyond the shipped bar

This line is copied from `docs/reference/design/bar.md` (2026-10-18). The nearest candidate, "need
mobile, tablet, and pc view upgrade", was offered for the bar at this round's opening. It was not
promoted, so it sits under *Collected taste*.

## Scope

### This job: the reader, one surface

Everything here is drawn at phone, iPad and desktop, in **light, dark and sepia**.

1. **The chapter opening:**
   - the header: the chapter title and its `summary` lede, under the book it belongs to;
   - the **generated table of contents**, built from the chapter's h2 and h3. Authors never write one.
2. **Reading:**
   - continuous scroll;
   - the **chrome hides on scroll** and comes back;
   - a **progress indicator**;
   - previous and next chapter;
   - the **chapter list**, reachable from the chrome while reading.
3. **The chapter end:**
   - the chapter list with each chapter's state: `unopened`, `started`, `finished`, or finished but
     **Updated**;
   - **Mark as finished** / **Mark as unread**;
   - the next chapter.
4. **The settings panel:**
   - **text size in 5 steps**, whose values the design picks;
   - **theme: System (default), Light, Dark or Sepia**;
   - **no column width**;
   - settings are per device and for every reader, signed in or not. They are not synced to the
     account.
5. **Language and versions:**
   - the **language switch**, naming each language in itself ("English", "한국어");
   - **version history** for the variant being read, including opening an older version;
   - the **stale-translation flag**, shown when a translation was made from an older version of its
     source.
6. **The prose kit** inside the column:
   - headings (h2–h4), paragraphs, emphasis, strong, strikethrough and inline code;
   - ordered, unordered and nested lists, a plain blockquote and a thematic break;
   - **callouts**: 6 types, with and without a title, collapsed and expanded;
   - **code**: with a title and without, a long line, and an ASCII-art `text` block;
   - **tables**: wide (8 columns), long (34 rows), and numeric with right-aligned numbers;
   - **links** of every kind, plus the **"missing link"** style;
   - Korean text.
7. **Loading and failure:** **the chapter loading state** (D36 (6)), **not found**, and **a failed
   load**.
8. **Member and anonymous chrome**, including the **"Sign in to save"** pattern that the other jobs
   reuse.
9. **A loose document** in the reader: the same page with no book navigation.
10. **Reading typography and the sepia theme**, as additions to the system (build inventory lines 1–8 in
    `phase.md`).

**Sizing.** One surface: about 5 Pages or fewer, plus their components. `design-check` warns past 6
Pages or 16 boards. How the Pages divide the states is the drafter's call.

This wave has **one job**: no sibling job drafts beside it.

### Not this job

Draw none of these. The sample chapters use the prose kit only.

- **`figures`** (P29.S5): `figure`, `figures` rows, `svg`, `sources` and inline citations, and images of
  any kind, a plain markdown image included.
- **`diagrams`** (P29.S5): the six diagram kinds.
- **`quiz`** (P29.S5): quiz blocks and their saved answers.
- **`annotations`** (P29.S5): bookmarks, highlights, notes, "Review this", the annotation panel and the
  per-book list. **Draw no bookmark, highlight or note control in the reader's chrome**; that job adds
  them to the signed reader.
- **`library`** (P29.S6): the library, Continue reading, the public org page `/@{org}`, and Library and
  Review as entry points in the app shell.
- **`book-page`** (P29.S6): the book page.
- **`review`** (P29.S6): the review surface.
- **`legacy-and-print`** (P29.S6): the legacy (HTML) reader and every print sheet, the native one
  included.
- **The console, auth, graph and landing** stay unchanged.

## Screens × states

**Prototype first.** Every state below must be reachable on an interactive Page: by a click or, where
no click reaches it, by that page's state bar.

Each state carries a one-line check the critic holds it to. Every state is drawn at phone (390×844), iPad
(820×1180) and desktop (1440×900), in light, dark and sepia. The critic checks all three themes; a Page
reaches them through the settings panel or its state bar.

### The chapter opening

- **Member opens a chapter at the top.** Check: the title, the `summary` lede and a table of contents
  listing every h2 with its h3s are present, and each entry jumps to its heading.
- **No `summary`.** Check: the header closes up with no empty gap where the lede would be.
- **The longest title**, "Knowledge System Internals: The Content Plane, the Write Path, and the
  Contracts". Check: it wraps whole at 390 px and is never truncated and never overflows.
- **A chapter with one h2 or none.** Check: no empty or one-line table of contents is drawn.
- **Reopening a started chapter.** Check: the page opens at the saved section, not at the top, with the
  chrome showing.

### Reading

- **Mid-chapter, scrolling down.** Check: the chrome is out of the way, the progress indicator stays,
  and nothing overlaps the text.
- **Mid-chapter, chrome back.** Check: back to the book, the chapter list, previous and next, settings
  and the language switch are all reachable.
- **The chapter list open while reading.** Check:
  - every chapter shows its state in words;
  - the current chapter is marked;
  - each row opens its own chapter.
- **A 20-chapter book's list on a phone.** Check: all 20 rows are reachable without losing the reading
  place, and the preface-like last chapter reads as part of the list.
- **The Korean variant (`lang="ko"`).** Check: Korean breaks between words (`keep-all`), never
  mid-word, and never overflows at 390 px.
- **English with Korean terms inline.** Check: the Hangul renders from the fallback face, and the line
  wraps normally, without `keep-all` on the English.

### The prose kit

The main sample chapter carries every element.

- **Headings h2, h3 and h4.** Check: three distinct levels at every text-size step, and long headings
  wrap.
- **Paragraphs, emphasis, strong, strikethrough, inline code, lists (ordered, unordered, nested two
  deep), a plain blockquote and a thematic break.** Check: each is distinct, and inline code keeps the
  line spacing.
- **Callouts `NOTE`, `IMPORTANT`, `WARNING`, `CAUTION`, `SKIP` and `DEFINITION`, each with a title and
  without.** Check: each type is named in words, never by colour alone, and an untitled one still says
  its type.
- **A collapsed callout (`> [!DEFINITION]- Primer`), closed and open.** Check: it opens and closes by
  click and by keyboard (Enter and Space), and when closed it shows its title.
- **A callout holding a list and code.** Check: the nested content keeps its own styling inside the
  callout.
- **Code with a title (`title="server/reindex.py"`) and without.** Check: the title reads as the block's
  label, and syntax colours hold their contrast in all three themes.
- **A long code line.** Check: it wraps, and the page never scrolls sideways. S2: "Long lines wrap;
  there is no horizontal page scroll."
- **An ASCII-art `text` block wider than a phone column.** Check: the art keeps its alignment and the
  page never scrolls sideways. How it does so is open question 1.
- **A wide table (8 columns).** Check: at 390 px every column stays reachable and the page never
  scrolls sideways.
- **A long table (34 rows).** Check: in row 30 the reader can still tell which column a value belongs
  to.
- **A numeric table.** Check: numbers are right-aligned per the GFM alignment row.
- **Links: in-chapter `#id`, another chapter (`chapter:`), a loose document (`doc:`) and external
  (`https:`).** Check:
  - links read as links in all three themes, at ≥ 4.5:1;
  - an external link tells the reader it opens a new tab.
- **The missing link**: a target that does not resolve, or is private to this reader. Check: it reads
  as plain text, is not clickable, and says nothing about why.

### The chapter end

- **Member reaches the end.** Check:
  - the chapter shows as finished with no press: the end is reached when `max_fraction >= 0.95` or the
    end-of-chapter mark is in view;
  - **Mark as unread** is offered.
- **Member, not finished.** Check: **Mark as finished** is offered, and it turns into **Mark as unread**
  when pressed.
- **The next chapter.** Check: its title is shown and opens that chapter.
- **The last chapter of a book.** Check: there is no dead "next"; the way on is back to the book.
- **The chapter list showing all four states** (`unopened`, `started`, `finished`, finished and
  **Updated**). Check:
  - each state is a word, never colour alone;
  - "Updated" appears on a finished chapter whose newest version is newer than the one it was finished
    on.
- **Previous and next at the ends of a book.** Check: the first chapter has no previous, and the last
  has no next.

### The settings panel

- **Open, with the defaults** (the design's default size; theme System). Check:
  - each current choice is marked;
  - there is no column-width control;
  - on a phone the panel fits 390×844 with every control reachable.
- **Each text-size step.** Check: the column's text changes size live, and at the largest step on a
  phone every prose-kit element still fits with no sideways page scroll.
- **Each theme: Light, Dark and Sepia.** Check: the whole reader changes live, and body text and links
  measure ≥ 4.5:1 in each theme, recorded in `result.md`.
- **System, with the OS light and with the OS dark.** Check: System shows the matching theme, and Sepia
  appears only when chosen.
- **Signed out.** Check: settings work exactly as for a member, with no "Sign in to save" here.
- **Keyboard.** Check: every control is reachable and operable by keyboard, with the system's focus
  ring.

### Language and versions

- **The switch on a two-language chapter.** Check:
  - it names "English" and "한국어", each in its own language;
  - it marks the current one;
  - switching lands on the same section in the other language.
- **A one-language chapter.** Check: no dead switch.
- **Reading the stale Korean variant**: KO v1, translated from EN v1, while EN is at v2. Check: the
  reader is told in words that this translation was made from an older English version, and is given a
  way to the newer English.
- **Version history of the variant being read.** Check: the versions are listed with their dates, the
  current one is marked, and each entry opens its own version.
- **Reading an older version**: EN v1 while v2 is newest. Check: the older-version state is
  unmistakable, says which version it is, and offers the newest.

### Loading, not found, failed

- **Chapter loading (D36 (6)).** Check:
  - a skeleton mirrors the chapter's own layout at that width;
  - it is drawn in `kb-surface-sunken` with the `kb-border` sheen;
  - it is still under reduced motion.
- **Not found.** A missing chapter and a chapter private to this reader show the same state. Check: it
  is short and specific, never hints that a private chapter exists, and offers the way back to the
  library.
- **Failed to load.** Check: the shell stays, the content area speaks editorially (the system's error
  rule), and one action tries again.

### Member and anonymous

- **Member.** Check: progress is shown and saved (chapter states, Mark as finished), and back to the
  book and the library are reachable.
- **Anonymous, on a public book.** Check:
  - the page and its settings work;
  - the chapter list shows no progress states;
  - **Mark as finished** answers **"Sign in to save"**;
  - the sign-in stand-in says the reader comes back to the same chapter and section.
- **The "Sign in to save" pattern.** Check: it is one pattern, drawn once as a component, that the wave
  2 and wave 3 jobs can reuse for bookmarks, highlights, quiz answers and review.

### A loose document

- **A loose native document in the reader.** Check:
  - there is no chapter list, no previous or next, and no "chapter N of M";
  - the header, table of contents, settings and version history work as in a chapter;
  - back goes to the library.

## Every link and where it goes

Every link stays in the prototype: `design-check` fails `check=leaves-canvas` on an absolute URL.

- **The table of contents and `#id` links** go to their heading on the same Page.
- **The chapter list, previous and next, and `chapter:` links** go to that chapter, in this job:
  - the clicked chapter is the chapter shown, so each opens its own;
  - only the main sample chapter carries the full prose kit;
  - the others show their own title, lede and opening paragraphs.
- **A `doc:` link** goes to the loose-document state, in this job.
- **The language switch** goes to the other variant, in this job.
- **A version** goes to that version, in this job.
- **Back to the book** goes to an in-canvas "Book page — another job (`book-page`)" state.
- **The library, and not-found's way back,** go to an in-canvas "Library — another job (`library`)"
  state.
- **A legacy (HTML) chapter in a chapter list** goes to an in-canvas "Legacy reader — another job
  (`legacy-and-print`)" state.
- **"Sign in to save"** goes to an in-canvas "Sign in — another surface (auth, unchanged)" state, which
  says the reader comes back to the same chapter and section.
- **An external `https:` link** is drawn as one, but opens an in-canvas note naming where it would go,
  never an absolute URL.

## Data

The design record is committed to this **public** repo, so whatever the canvas shows becomes public
(`phase.md` → `## Decisions` → *Canvas content rule*).

### The books, in the library's real shape

No real names appear except the `knowledge` maintainer guide's.

- **The main book: `knowledge` / `maintainer-guide`.** Five chapters, in order, with their real titles:
  1. "Knowledge: What It Is and How It Is Used"
  2. "Knowledge System Internals: The Content Plane, the Write Path, and the Contracts"
  3. "Knowledge's Read Surfaces: Two Front Ends, One Corpus"
  4. "Shipping and Running Knowledge: Distribution, the Edge, Security, and the Gates"
  5. "Why Knowledge Is This Way, and How to Change It"

  The book's own title is the drafter's, since no manifest exists yet. The chapter bodies are written
  for the canvas: realistic, and on each chapter's real subject. For subject matter, the drafter may
  read a real chapter with `git show origin/main:docs/knowledge/<file>.html` (read only; never pull or
  merge). It never copies a secret, a key, an email or a person.
- **The KO/EN pair** sits on the main sample chapter:
  - English v2, the newest;
  - Korean v1, translated from English v1;
  - English v1 in the version history.

  The Korean text is written for the canvas.
- **The long book:** an invented 20-chapter codebase book in an invented project. Its 20th chapter is a
  preface-like reading guide.
- **The loose document:** an invented loose document in an invented project. A Finance or English
  subject note is fine.
- **Chapter states:** across the lists, a mix that shows all four (`unopened`, `started`, `finished`,
  and finished and Updated).

### Copy

- **Real copy first:**
  - `web/src/content/documents.ts`, the copy for today's document view, versions and not-found;
  - the system README's content rules: sentence case, no exclamation marks, no emoji, "…" for pending,
    "→" on links that move you on, and the lowercase wordmark.
- **The contract strings are fixed:** "Mark as finished", "Mark as unread", "Updated", "Sign in to
  save", "English" and "한국어".
- **Other reader copy** is the drafter's, in English only, because chrome copy is English-only (D36
  (4)). Log it in `build-prompt.md`.

### Edge cases

- the longest real title (above);
- a chapter with no `summary`;
- a chapter with one h2;
- a 34-row table and an 8-column table;
- a long code line and an ASCII-art block;
- Korean body text and Korean headings;
- a 20-chapter list.

### Never on the canvas

- glide-ilab or base material;
- arb_upbit_1's strategy content;
- secrets, keys, emails or any personal data.

A signed-in reader is an invented name with no email.

## The system inventory

- **Title: `knowledge`**, as the Design System Artifact shows it. Copy it into `canvas.json`'s
  `designSystems` record.
  - Namespace: `kb`.
  - Artifact: https://claude.ai/artifact/7qemgwHNsoPNf5kYHEJ4md, version `1792321604-e214`.
  - Synced from code on 2026-10-18, by the read-only route.
- **Cached at `jobs/01-reader/canvas/project/ds/kb/`:** `tokens.css`, `tokens.json`, `README.md` and
  `fonts/` (Fraunces, Source Sans 3, JetBrains Mono). Read the README first: its colour, type, layout,
  states and content rules bind.
- **Components: none.** No bundle ships, so there is no `x-import`. Every component this job needs is a
  **component gap**: draw it as markup on its own board and log it.

  Where the product already has a component, match its values exactly:
  - buttons: `web/src/components/ui/app-button.tsx`;
  - the shell: `web/src/components/public-shell.tsx` and `web/src/components/app-shell/`;
  - the version list: `version-history.tsx`;
  - the skeleton and the editorial error: `web/src/components/states/`.
- **Themes:** Light and Dark only (`data-theme`; in the code, `data-md-color-scheme` `default` and
  `slate`).
- **Known gaps this job meets:**
  - **No sepia theme.** This job proposes it.
  - **One reading size today**: prose at 1rem, `kb-leading-body` 1.72, in `kb-measure` 42rem. The 5
    steps are new.
  - **No code-syntax colour roles.** Today's document view does not highlight code. Under S2, code is
    highlighted at render time into token classes styled by design tokens.
  - **No Hangul face on the canvas.** The product ships Pretendard, but the system could not carry it
    (2.06 MB, over the cap). The canvas falls back to the system Hangul fonts each stack names.
  - **No motion tokens and no fluid sizes** in the system. Their code values are in the README's *Not
    synced* section.

## Constraints

- **Viewports** (from `## Operator Runtime`):
  - phone 390×844;
  - iPad 820×1180 portrait and 1024×768 landscape;
  - desktop 1280–1440 wide, with 1440×900 as the reference.
- **Devices:** iPhone and iPad in Safari and Chrome, and Mac Chrome. Fixed chrome on a phone respects
  the safe areas (`env(safe-area-inset-*)`).
- **Continuous scroll only.** Page-turn mode is out, on the operator's "no" (`intent.md`).
- **One fixed column width,** with no width setting: the operator's "good. but fixed column width."
- **Theme.**
  - The reader follows System by default **for every reader**, signed-out readers included. This is the
    one exception to P28's rule that public pages stay light.
  - Settings are per device and never synced.
- **The accessibility floor:**
  - text ≥ 4.5:1, and large text and UI ≥ 3:1, in every theme, measured;
  - `kb-hint` never used for body text;
  - the system's focus ring (`kb-focus-w` in `kb-accent`);
  - targets of at least 44 px (`kb-tap`) below 40rem;
  - inputs at 16px;
  - a state or a type never shown by colour alone;
  - `prefers-reduced-motion` respected;
  - every control operable by keyboard.
- **Korean (S2):**
  - under `:lang(ko)`: `word-break: keep-all; overflow-wrap: anywhere; line-break: strict`, with a
    Hangul face before the generic fallback;
  - Korean terms inside English text get Hangul glyphs from the fallback, without `keep-all`.
- **Layout.** It follows the system's containers (`kbapp`, `kbmain`) and breakpoints (40, 64 and
  90rem). The page never scrolls sideways at any width.
- **No icon set and no emoji** (README). Use words and the text marks `·`, `…` and `→`.
- **A face beyond the system's three,** if the reading type wants one, must be free to ship (OFL or
  similar) and self-hostable. Log it as a departure, with its reason.

## Locked vs. in play

### Locked

- **The data contracts** (`phase.md` → `## Decisions`, S1–S3):
  - what a chapter contains: the six callout types and the collapsed form, titled code, the generated
    table of contents;
  - the chapter states and the finished rule;
  - the settings: 5 steps, the four theme choices, no column width, per device;
  - the endonym switch and English-only chrome;
  - what an anonymous reader keeps (only the settings), and "Sign in to save".
- **Continuous scroll and the fixed column** (above).
- **The system's structure and brand spirit:**
  - "A calm editorial library: warm paper, charcoal ink, one deep teal, and hairlines instead of boxes";
  - one interactive accent;
  - no icon set;
  - the logo files, used as they are.
- **The copy rules and the fixed strings** (*Data*).
- **The accessibility floor.**

No element in this design record is signed yet.

### In play

- **Reading typography:** the faces, the 5 size steps, leading, the fixed column's width and the heading
  scale.
- **Themes:** the **sepia** theme, and the reader's light and dark reading values.
- **Spacing, motion and layout.**
- **The reader's parts:** the chrome and how it hides, the progress indicator, the table of contents,
  the settings panel, the chapter list, the language and version controls, and the syntax colours.

A value that would change the app's own light or dark tokens outside the reader is logged as a proposed
system change in `result.md` and `build-prompt.md`. It is never applied silently.

## Collected taste

### The operator's answers to the three taste questions

They were asked at this round's opening, on 2026-10-18. The operator had approved DECOMP2 without
answering them, so the run stopped once to ask. Quoted literally:

1. The mood wanted for long reading: **"good."**
2. Readers they like (Apple Books, Kindle, Readwise Reader, iA Writer, anything else): **"kindle
   like"**
3. Anything to avoid: **"non"**

**How they read against the record** (the orchestrator's note, not the operator's words):
- "good." names no new mood, so the established mood stands.
- "kindle like" makes Kindle the one reference for the reading feel. It does not reopen what is locked:
  continuous scroll rather than pages, and one fixed column.
- "non" names nothing to avoid.

### This phase's own words

From `intent.md`, 2026-10-17, verbatim:
- "I want it to be work like E book reader." (the original request)
- "maybe full-redesign again. with very new features." (the original request; settled when the operator
  answered "reader first fine." to "a full redesign, or reader-first?")
- "I want more refined diagrams, mobile, ipad friendly, image available, multi column image or diagram
  input also possible, and more quizs available etc.."
- "bookmark(where you left), more easy to another chapter good.  may help."
- "good. but fixed column width."

### Earlier words

Design memory under `web/design/rounds/`, read only:
- 2026-09-21, `04-console-surfaces/handoff.md:57-58`: "need mobile, tablet, and pc view upgrade".
- 2026-09-21, `06-document-views/SIGNOFF.md:35-36`: every open question in round 06 was answered "decide
  for me". The operator has handed over open calls before; this job still logs its calls as open
  questions.
- 2026-07-18, `01-landing/SIGNOFF.md:8-17`, a design session's summary that the operator relayed: "It
  extends the calm editorial library (teal-only, warm paper/charcoal, Fraunces/Source Sans/JetBrains
  Mono); no new brand."

### The established look

The system's character, from its README's opening: "A calm editorial library: warm paper, charcoal ink,
one deep teal, and hairlines instead of boxes. … Draw every surface as if it were a well-set page first
and an app second."

This record has no signed jobs yet.

## Direction

- **`new visual direction: no`** (the line at the top): this job extends the system's look. From the
  confirmed intent: "P27's design system went live with P28 and is the starting point, not something to
  replace wholesale. Reader typography and themes are in play." (`intent.md`). That came from the
  operator's "reader first fine."
- **One direction.** The operator asked for no options. Draw one, and log the open calls.

## Open questions, posed back

The drafter draws its own answer to each, in the one direction, and logs it under `open_questions` for
the operator. Only the operator's words settle them.

1. **ASCII art on a phone.** S2 says long code lines wrap and the page never scrolls sideways, but
   wrapping breaks ASCII art. How a `text` block wider than the column keeps its alignment is the
   drafter's call, flagged. Options include scrolling inside the block or scaling.
2. **Wide tables on a phone.** Today's document view scrolls a wide table inside a focusable wrapper
   (round 06 §5–§6), and S2 says nothing about tables. Keep that or propose another way, flagged.
3. **Today's document actions.** The shipped view carries Copy link, Export PDF, Full width and, for a
   member, Delete.
   - Export PDF and Full width leave with the legacy path (S2; the `legacy-and-print` job).
   - Delete stays on the console's document list.
   - Copy link, and any Print control, have no contract line in the native reader. The drafter places
     them or argues against them, flagged.
4. **Where the reader sits for a member:** inside the app shell (rail and topbar), or in a reading
   chrome of its own. The drafter's call, flagged. The `library` job adds Library and Review to the app
   shell either way.

## Paths

- **Runtime:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/a574425d-2975-4a5e-863a-fca7588c7aab/artifact-type/dc-runtime.js`
- **Type references:**
  `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/artifact-files/a574425d-2975-4a5e-863a-fca7588c7aab/`,
  holding `SKILL.md` and `artifact-type/reference/{format,craft,design-system-components,view-state}.md`
- **System namespace:** `kb`

## Required output

- **The canvas tree** under `jobs/01-reader/canvas/project/`, passing `design-check 01-reader`.
- **`rounds/01-reader/result.md`**, holding:
  - the intent lines and the plan;
  - what was designed;
  - the data used;
  - every departure from this handoff;
  - the open questions;
  - the component gaps;
  - the measured contrast of every text and link colour in light, dark and sepia.
- **`rounds/01-reader/build-prompt.md`**, complete enough to build from without inventing anything:
  - the sepia values;
  - the 5 text-size steps;
  - the reading type;
  - the syntax roles;
  - the chrome's hide-and-show behaviour;
  - every state above;
  - every string the drafter wrote.

  The state bar is canvas-only, never something to build.
