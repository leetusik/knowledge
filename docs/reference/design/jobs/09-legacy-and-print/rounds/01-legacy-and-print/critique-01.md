# Critique 01: 09-legacy-and-print/01-legacy-and-print

- pass: 01
- mode: critic
- verdict: revise
- confidence: high
- must_fix: 10 (part 1: 8, part 2a: 2)
- gaps: 2
- advisory: 2
- wave: 06-library, 07-book-page, 08-review, 1 choice
- escalate: C03, C06, C13
- preview: 478s, 171 states
- standard: .claude/agents/design-drafter.md

## Findings

Evidence paths: `<S>` is `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/critic-09-01`. `<S>/pass-01/` holds the engine's PNGs, `preview.json` and (beside it) `preview.log`; `<S>/look/` holds my own captures. Drafter-file lines are from `.claude/agents/design-drafter.md`; handoff lines from `handoff.md` of this round.

### C01 · must-fix · part 1 · open
- board: Main.dc.html · view: frame, phone (the same) · state: 00
- finding: The seven all-legacy-book states and the nine loose-document states can be reached from Main only by one hidden route that nothing in the prototype names.
- evidence: Main opens on the native Tidewater chapter, and no visible control on it leads to a loose document or to the lantern and orchard books. The one route I found, walked by clicks: top-bar logo -> the "Library — another job" stand-in -> press the stand-in's lone state-bar button "Library" (it silently turns "‹ Back to the chapter" into "‹ Back to the document": `<S>/look/away-library.png` against `<S>/look/route-2-library-preset.png`) -> the loose document -> its in-text link "the outbox" -> lantern's P8 chapter, which is the book page. The stand-in's own words promise more ("A loose legacy document opens from there, in the legacy reader.") and offer only a Back button; result.md does not name the route. Handoff line 235: "by a click or, where no click reaches it, by that page's state bar"; the bar's line 4: every handoff state "by a click to its page and then its preset". Nothing is strictly unreachable (the engine's `unreachable` check is silent), so this is discoverability, not a dead end. Widths carries 7 of the 16 states (4 loose, 3 book).
- confidence: medium · found_by: critic

### C02 · must-fix · part 1 · open
- board: Main.dc.html and Widths.dc.html · view: frame, phone (the same) · state: 00 (the presets named below)
- finding: The state bar's pressed preset is not the one just pressed, for 6 of Main's 30 legacy presets, 4 of Widths' 16, and on the stand-in pages' one preset.
- evidence: I pressed every preset and read `aria-pressed` once it landed. All 14 Tidewater presets hold. Loose document, none pressed after "v1 · older version", "A document at v3 · history" and "English with Korean terms". All-legacy book, none pressed after "lantern P8 · English v2", "English v2 · at a section 한국어 lacks" and "한국어 v1 · older translation". Widths, none pressed after "한국어 v1 · older translation", "Version history", "v1 · older version" and "English with Korean terms". Reaching the state by clicking does the same: Version history -> View on v1 shows the older-version notice and "Older version · v1" in the top bar, with no preset pressed. On the stand-in pages the one preset (with its "only state" note) is unpressed after Logo ("Library"), after Previous (the page shows chapter 6; the preset reads "Chapter 8 in the reader") and after Contents rows 1, 5, 10 and 20: 6 of the 10 natural clicks I tried (Back, Logo, Previous, Next, four Contents rows, a same-app link, Sign in). Drafter file line 69 ("the pressed preset is the one matching the current state") and line 71 ("a page with one state shows its one preset pressed"). Probable cause: `sig()` in lflow.js includes `at` and the progress state, which change after landing.
- confidence: high · found_by: critic

### C03 · must-fix · part 1 · escalated
- board: Main.dc.html (frame, phone) and Widths.dc.html (390, 820, 1024, 1440) · view: frame, phone · state: 00
- finding: Folding the bottom chrome resizes the document frame by 170 to 310 px, so the page does not hold still across states.
- evidence: six `check=layout-shift` lines, each "clicking 'Reading · bar hidden' resizes 'Datums: Chart Datum, Mean Sea L…'": Main frame 1440x670.5 -> 841 px; Main phone 390x509.4 -> 785; Widths 390x428.4 -> 738; Widths 820x931.4 -> 1121; Widths 1024x538.5 -> 709; Widths 1440x670.5 -> 841. The bar's line 6 (controls keep their size and the page holds still across states) and drafter-file line 125 (`check=layout-shift` names a control resized, or a header, nav or main moved, by more than 4 px). Departure 3 logs it as kept on purpose, with a reason: an overlay would cover the last lines of a sandboxed document the page cannot pad, and the other answer to open question 1 is a bottom chrome that never hides. The reason explains the choice; it does not lift the bar's line. After-state PNG against the first: `<S>/pass-01/Main.frame.state-01.png` against `<S>/pass-01/Main.frame.png`.
- confidence: high · found_by: measured

### C04 · must-fix · part 1 · open
- board: Widths.dc.html (state 09, "Orchard · reopened at saved place") and Main.dc.html (reached by the route in C01) · view: frame · state: 09
- finding: One saved place reads as five different numbers: 41% in the data, the words and the sheet board, and 59, 78, 64 or 68% in the live pill, chapter bar and Contents row.
- evidence: legacy.js seeds `{ s: "started", pct: 41, at: "retries", frac: 0.41 }`; result.md words the pill "Picked up where you left off · 41%" (OQ4) and the SheetStates board draws the row "Started · 41%". `<S>/pass-01/Widths.frame.state-09.png`: the pill and "Chapter 2 of 4" read 59% at 390, 78% at 820, 64% at 1024 and 68% at 1440; the Contents sheet opened from the 1440 frame reads "Started · 78%" (the iPad frame's number) while that frame's own chapter bar reads 68%. On Main at 1440 the pill, the chapter bar and the Contents row all read 68%. The anchor "retries" lands 18 to 37 points below the saved fraction. Handoff lines 256-257 (it opens at the saved place and "follows open question 4") and the bar's line 2 (a choice carries: the place the member left is the place the next screen shows).
- confidence: high · found_by: critic

### C05 · must-fix · part 1 · open
- board: Legacy.dc.html (the same page on Main and Widths at 390) · view: frame, phone · state: 00
- finding: Under larger text or browser zoom the chrome takes the whole screen and leaves the document no room, although the Display sheet tells the reader to use the browser's zoom to read it larger.
- evidence: Browser zoom on the 390x844 phone, measured the way zoom works (the CSS viewport shrinks): the document frame is 509 px at 100%, 291 at 125%, 160 (28% of the viewport) at 150%, and 0 at 200% and 300%; at 200% the bottom chrome (380 px) also runs 17 px past the 422 px viewport. Desktop 1440x900: 184 px (41%) at 200%, 2 px at 300%. iPad 820x1180: 273 px at 200%, 0 at 300%. Text scaled through the root font size (390x844): frame 365 / 241 / 0 px at 125 / 150 / 200%, with the top bar growing to 115 px; at 200% "Bookmark this position" runs off the right edge and the chapter bar's counter is cut off by the viewport. The page is `100dvh` and only the frame scrolls, so nothing outside the viewport can be reached. PNGs: `<S>/look/bzoom-150.png`, `<S>/look/bzoom-200.png`, `<S>/look/zoomc-150.png`, `<S>/look/zoomc-200.png`. The sheet's words, LegacyDisplay.dc.html lines 47-48: "Text size doesn't reach inside: to read it larger, use your browser's zoom." Drafter-file line 139 ("Long names, two-line labels and larger text still hold") and line 143 (phone width: "nothing is clipped").
- confidence: high · found_by: critic

### C06 · must-fix · part 1 · escalated
- board: PaperQuiz.dc.html · view: frame · state: 00
- finding: The full run reports `check=settle` on PaperQuiz: "the page was still changing after 8s".
- evidence: line 198 of `<S>/preview.log`; PNG `<S>/pass-01/PaperQuiz.frame.png` (3500x2562). Seven later solo renders of this board came back clean (settled in 2.4 to 2.9 s), and my own click harness was running during the last two minutes of the full run, so load (a slow web font) is a likely cause. I could not reproduce it, so I cannot say the board is at fault.
- confidence: low · found_by: measured

### C07 · must-fix · part 1 · open
- board: ReaderBottom.dc.html (mounted on Main, Legacy and Widths) · view: frame, at 150% to 200% text · state: 00
- finding: The signed chapter bar's labels touch at 150% text and overprint at 200%, and result.md does not log it as a gap for the build.
- evidence: With the root font size at 200% on the 390 px phone, the "Contents" label (x 88 to 302) overprints "‹ Previous" (34 to 161) and "Next →" (270 to 356) (`<S>/look/zoomc-200.png`); at 150% the labels touch (Previous ends at 120, Contents begins at 115). The signed 01-reader's Reader.dc.html gives the same geometry to the pixel, so the part is the signed reader's and the drafter may not restyle it. result.md's "Component and token gaps" lists ReaderBottom only as "Signed, used unchanged" and names no larger-text gap. A gap the drafter did not log is a Part 1 must-fix whose fix is the log line (in result.md and build-prompt.md), never a restyle.
- confidence: medium · found_by: critic

### C08 · must-fix · part 1 · open
- board: - (13 anchors on 9 boards: Legacy, LegacyBar, LegacyDoc, LegacyFrameState, and the signed ReaderTop, ReaderBottom, ChapterList, ReaderState, SignInToSave) · view: frame · state: -
- finding: Thirteen links carry `href="#top"` under script handlers, and nothing in this round names the reason.
- evidence: a `grep` of the boards finds ReaderTop 3, ReaderBottom 3, and one each in Legacy ("Skip to the document"), LegacyBar ("Print · new tab"), LegacyDoc, LegacyFrameState, ChapterList, ReaderState and SignInToSave. Each has an `onclick` and resolves (`design-check` is OK, no `dead-link`), which is the signed reader's pattern. The bar's line 5: "no `#` placeholder without a named reason". The signed round names it (01-reader's result.md, departure 9: "In-text links carry `href="#top"` and are handled by script"); this round's result.md and build-prompt.md do not (build-prompt.md's Links section does say where each link goes).
- confidence: medium · found_by: critic

### C09 · must-fix · part 2a · open
- board: PaperBlocks.dc.html (A4 and US Letter, page 1 to 2) and Paper.dc.html (page 2 to 3) · view: frame · state: 00
- finding: A lead-in is left at the foot of one page while the figure or code it introduces opens the next.
- evidence: `<S>/pass-01/PaperBlocks.frame.png`, A4 and US Letter page 1: the heading "A figure row of four, wider than the column" and its one-line lead-in end the page with about 270 px blank below, and the four cards start page 2 under no heading. `<S>/pass-01/Paper.frame.png`, page 2 ends on "The rebuild itself is short enough to read in one sitting:" and the code block it introduces (server/reindex.py) opens page 3. paper.css keeps a heading with the block after it (`break-after: avoid` on `.pp-h2` to `.pp-h4`) and sets nothing on a lead-in before a figure row or a code block. Drafter-file line 98 (group by proximity: related things sit closer to each other than to anything else).
- confidence: medium · found_by: critic

### C10 · must-fix · part 2a · open
- board: Paper.dc.html (page 2) and PaperBlocks.dc.html (page 2, both sizes) · view: frame · state: 00
- finding: The printed address in the "Next.js app" card breaks in the middle of a word.
- evidence: `<S>/look/pb-href-crop.png`: "([host]/@quillwork/knowledge/books/maintai" ends a line and "ner-guide/shipping) ships." starts the next; on US Letter it breaks "maintaine / r-guide". A break after a "/" keeps every word whole. Drafter-file polish block (lines 145 to 150): nothing is cut by accident.
- confidence: medium · found_by: critic

### C11 · gap · part 1 · open
- board: - · view: - · state: -
- finding: The `kb` system ships no component bundle, so every component of this job is drawn as markup.
- evidence: `canvas/project/ds/kb/` carries `tokens.css`, `tokens.json`, the fonts and a README that says "No components ship with this system"; result.md's "Component and token gaps" logs it (drawn by this job: LegacyBar, LegacyFrameState, LegacyDisplay, the legacy page layout, the print sheet; signed and reused: ReaderTop, ReaderBottom, ChapterList, VersionList, SignInToSave, ReaderState, the resume pill). For the system and the build, not the drafter.
- confidence: high · found_by: critic

### C12 · gap · part 1 · open
- board: - · view: - · state: -
- finding: Three colours and faces this job needs are not system tokens.
- evidence: result.md logs them: the frame's focus ring on a dark document (`#62bdb2`), the print palette that lives in `kb-print.css` rather than `tokens.css`, and sepia and the reader's faces kept reader-scoped; no change to the app's own light or dark tokens. For the operator and the system.
- confidence: high · found_by: critic

### C13 · choice · part 2b · escalated
- board: Main.dc.html and Widths.dc.html (data in legacy.js and legacydocs.js) · view: frame · state: -
- wave: 06-library/Library.dc.html (library.js: LANTERN, ORCHARD, DOCS) and 07-book-page/BookPage.dc.html (book.js: lantern, orchard); 08-review draws none of these books (only Tidewater, the knowledge guide and field-notes)
- finding: The three drafts of the wave's shared sample library invent different products, titles, dates and progress for the same two books and the same loose document, although the handoff says "All four wave-3 jobs use these names, so their canvases agree."
- evidence: the handoff fixes the names (org, projects, book titles, counts, formats, the keys p8, p9, p17-p18, p24) and leaves the free titles to each drafter; no signed job names lantern or orchard, so no side contradicts the system or a signed job.
  - Version A, 06-library: lantern is a phase-pages builder ("P8: Rendering phase pages from plain files", v2, 한국어 "P8: 평범한 파일에서 페이즈 페이지 그리기"; "P9: The release checklist"; "P17 and P18: Search, and then its index"; "P24: Moving builds to the edge"). Orchard schedules harvest runs ("Orchard at a glance", "How orchard schedules a harvest run", "The grading pipeline, stage by stage", "Shipping orchard and keeping it running"), chapter 2 started at 60%. The loose lantern documents are "Release day in lantern: the checklist, explained" (v2, 2 Sep 2026) and "Why lantern keeps its phases in plain files" (v1, 18 Jul 2026); the series is quayside, the Korean-terms document is helpdesk.
  - Version B, 07-book-page: lantern is a probe monitor ("P8: Probe scheduling without a thundering herd", v2 2 Sep 2026 and v1 4 Jul 2026, 한국어 "P8: 몰림 없는 프로브 스케줄링" 11 Jul 2026; "P9: Incident timelines from raw check results"; "P17 and P18: Status pages, then the notices that follow them"; "P24: Running checks from three regions"). Orchard is a cache ("orchard in one page: what it caches, and why", "How a cache key is made", "Remote storage and eviction", "Running orchard in CI", all 14 May 2026).
  - Version C, 09 (this job): lantern is an offline notes app ("P8: Offline edits and the outbox", v2 14 Sep 2026 and v1 2 Aug 2026, 한국어 "P8: 오프라인 편집과 아웃박스" 20 Aug 2026; "P9: Search that works offline"; "P17–P18: Sharing a notebook, and the permissions it needed"; "P24: Moving attachments out of the notes"). Orchard is a job scheduler ("Orchard in one page: what it schedules and why", "Seeds, trees and harvests: the job model", "The harvester: collecting results without losing any", "Pruning: retention, cleanup and the nightly sweep", 21 Jul 2026), chapter 2 started at 41%. Lantern's loose document is "Why lantern keeps notes as plain files" (v2 12 Sep 2026, v1 30 Jun 2026); the series is ferry-board, the Korean-terms document is subway-times.
  - Copy conventions differ too: "P17 and P18" (A, B) against "P17–P18" (C); "orchard in one page" (B) against "Orchard in one page" (C).
  - Cost, said without a preference: 09's titles sit on written document bodies (legacydocs.js: orchard-1 to -4, the P8 versions, plain-files, the series, the Korean-terms one), while A's and B's sit on titles and rows. The sibling canvases were rendered once with no clicks while their drafters' answer passes may have been running, so their data may move.
- confidence: medium · found_by: critic

### C14 · advisory · part 2b · open
- board: Main.dc.html, Widths.dc.html (phone) · view: phone · state: 00 (and the older-version and older-translation presets)
- finding: Against "kindle like", the legacy page opens with half or more of the phone's height as chrome, and the older-version and older-translation notices push it further.
- evidence: Widths phone frame (390x844, safe areas included): the document gets 428 px (51%) by default, 345 px (41%) on an older version and 285 px (34%) on an older translation, until the first scroll folds the bottom chrome; Main's phone view, without safe areas, gives 509 px (60%). The handoff's taste words, quoted: "kindle like" and, from the phase's intent, "I want it to be work like E book reader." The trade: the bar holds what the handoff requires of a legacy document (the status, Print, Bookmark with its signed line, the not-applicable note, the version notices) at 44 px targets, which is why it is tall. Open questions 1 and 2 already ask this.
- confidence: medium · found_by: critic

### C15 · advisory · part 2b · open
- board: Main.dc.html · view: phone · state: 00
- finding: The status block reserves the tallest status layer's height, which leaves about 37 px of the bar empty in the default state on the phone.
- evidence: At 390 the status block is 107 px tall while the default "v1 · Published …" layer uses 70 (the tallest layer, "You finished an earlier version…", wraps), so the default bar shows air above its first row and below the date (`<S>/pass-01/Main.phone.png`); on desktop the date sits in a 44 px box sized for the "Mark as unread" button, about 26 px more than its line. The reservation is how the bar stays still when the status arrives (drafter-file line 125). The trade is a still bar against a denser one, and it adds to the weight in C14.
- confidence: medium · found_by: critic

## For the judge

Under `critic` alone (this round's level) this list goes to the operator as it is; each item is unsure.

- C03 · standoff (unsure): the drafter logged departure 3 with a reason (an overlay would cover the last lines of a document the page cannot pad; the other answer to open question 1 is a bottom chrome that never hides). I find the reason explains the choice but does not lift the bar's line 6 against six measured lines. The operator picks: keep the fold and accept the shift, a bottom chrome that never hides, or a third way.
- C06 · low confidence (unsure): `check=settle` in one full run, clean in seven solo renders; load from my own harness is a likely cause.
- C13 · wave choice (unsure): three drafts of the shared sample library disagree and no signed job decides it. The operator picks the canonical set; if this job keeps its own it is the other two that change.

## Scorecard

| Board | Part 1 | Part 2a |
|---|---|---|
| 01 Main | C01 C02 C03 C04 C05 C07 | ok |
| 02 Legacy | C05 C07 | ok |
| 03 Widths | C02 C03 C04 C05 C07 | ok |
| 04 Paper | ok | C09 C10 |
| 05 Elsewhere | ok | ok |
| 06 BarStates | ok | ok |
| 07 FrameStates | ok | ok |
| 08 LookStates | ok | ok |
| 09 SheetStates | ok | ok |
| 10 PrintStates | ok | ok |
| 11 PaperBlocks | ok | C09 C10 |
| 12 PaperQuiz | C06 | ok |
| 13 PaperHeads | ok | ok |
| 14 LegacyBar | ok | ok |
| 15 LegacyDoc | ok | ok |
| 16 LegacyFrameState | ok | ok |
| 17 LegacyDisplay | ok | ok |
| 18 Sheet | ok | ok |
| 19 ReaderTop | ok | ok |
| 20 ReaderBottom | C07 | ok |
| 21 ChapterList | ok | ok |
| 22 VersionList | ok | ok |
| 23 SignInToSave | ok | ok |
| 24 ReaderState | ok | ok |

C08 is cross-board (13 anchors on 9 boards) and is not repeated per row.

**Component gaps:** C11 (no component bundle, logged), C12 (three token gaps, logged), and the signed chapter bar at large text (the log line is C07).

**2b notes for the operator:**
- Against "kindle like", the legacy page opens with about half of a phone's height as chrome (428 of 844 px left for the document, 285 px on an older translation) until the first scroll; the bar holds what the handoff requires of a legacy document, which is the trade (open questions 1 and 2). (C14)
- The status block reserves the tallest status layer's height, so the default bar carries about 37 px of air on the phone: a still bar against a denser one. (C15)
- Three drafts of the shared sample library disagree on what lantern and orchard are and on their titles, dates and progress (60% against 41%): pick one set. (C13, choice)

**Options:** none asked; one direction drawn.

**The bar:**
1. Every list item opens its own item: holds (Contents rows 1, 5, 10 and 20 open chapters 1, 5, 10 and 20; Previous opens chapter 6 and Next chapter 8; Version history's View opens v1).
2. A choice carries: C04 (the saved place does not carry as one number; the language, version and chapter choices do carry).
3. Search and filters: not applicable (this job's Pages have none).
4. The state bar: C01, C02 (it scrolls away and is never pinned: holds on Main at 390, Widths and Paper; sunken, dashed, no system component, no brand accent: holds).
5. No outward link, no `#` placeholder without a reason: C08 (no link leaves the prototype: holds, `design-check` has no `check=leaves-canvas`).
6. Controls keep their size and the page holds still: C03.
7. The same list header in every filter and search state: not applicable.
8. Hover on the primary and secondary controls: holds (no `check=hover-contrast` line; the label stays readable).
9. Back chevron, logo home, centred column, aligned figures, decisive primary action: holds ("‹" before each back label, the logo opens the library stand-in, the document column is centred at 1440, the figure rows align).
10. One direction, no decorative SVG: holds (zero inline SVG).
11. The Toss-level lines: C05 (larger text, line 139).

**Holds:**
- All 14 Tidewater presets and the 5 theme buttons land pressed; the Paper presets land.
- Contents rows open their own chapters, Previous goes to chapter 6, Next to chapter 8; the logo and Back lead to stand-ins at 44 px with a way back.
- The external link and Print · new tab both open the "Outside the canvas · a new tab" stand-in at 1440 and 390, and Back returns to the same place; the resume pill's "From the top" returns the frame to the top (scroll 1357 -> 0) and drops the pill.
- The page never scrolls (its scroll height equals the viewport) and nothing scrolls sideways at 390; the safe areas on Widths (47 and 34 px) are respected.
- The document's own look under each theme: a self-darkening document shows its dark look under Dark or System-dark, a light-only one stays light.
- The KO/EN switch keeps the place by anchor, then fraction; the Korean sheet uses `lang="ko"` and `keep-all`.
- The answer key, masthead and colophon; the Print control and the ⌘P notice, which names the address in full.
- Keyboard order, the skip link, and "Show reading controls" at 178x44.
- No contrast, target, click-error, hover-contrast or dead-link line from the engine; `design-check` is OK (24 boards); no unmounted part.
- One direction, zero inline SVG, and the signed words unchanged.

**Not seen:**
- Hover and focus looks beyond the measured contrast and a few screenshots (`<S>/look/hv-*.png`).
- Transient states beyond the presets (for example the 900 ms load after Retry).
- Landscape phone: measured only (844x390: the frame is 41% of the height; 667x375: 29%); it is not a handoff width.
- Larger text and zoom were measured through an injected root font size and a viewport and device-scale override, never on a device or an operating-system setting.
- The real iframe, the bridge, the sandbox and `color-scheme` (the P30 device check, D36 (7)).
- Real print-to-PDF pagination: the paper pages are clipped clones of one flow.
- The engine's 48-state cap on Main and Widths: I pressed every preset by hand instead (36 on Main, 16 on Widths).
- Dark and sepia were read on Main's theme presets, the Widths theme buttons and LookStates, not on every preset at every width.
- The sibling canvases (06, 07, 08) were rendered once with no clicks, while the 06 and 08 drafters' answer passes may have been running; 08-review has no legacy content.
- iPad widths for the states that Widths does not carry.
- Why PaperQuiz tripped `settle` in the full run (C06).
- Process note: near the end of the pass I opened lines 296 to 347 of result.md by mistake, which are the drafter's self-check log. No finding rests on it: C09 was drawn from the PNGs before I opened it and is kept as drawn, and the later additions (C07's log rule, C08) come from the rubric and the markup.
