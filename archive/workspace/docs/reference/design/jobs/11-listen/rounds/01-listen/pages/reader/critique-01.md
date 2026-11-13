# Critique 01: 11-listen/01-listen

- pass: 01
- mode: critic
- scope: page reader
- verdict: revise
- confidence: high
- must_fix: 8 (part 1: 4, part 2a: 4)
- gaps: 0
- advisory: 4
- escalate: none
- preview: 90.1s, 47 states
- standard: .claude/agents/design-drafter.md
- open_items: C01, C02, C03, C04, C05, C06, C07, C08

## Findings

### C01 · must-fix · part 1 · open
- board: Reader.dc.html · view: frame · state: -
- finding: 80 `check=layout-shift` lines stand unanswered: neither fixed nor logged anywhere in the page's `result.md` outside its render log. Until each class is answered, a reader of the record cannot tell an intended move from a real one.
- evidence: `.preview/11-listen/01-listen/pages/reader/preview.json` `issues`. They fall into three classes. (a) The window presets: `clicking 'iPad 820' moves the page: header.rd-top x 1->311`, `'Phone 390' resizes 'Library' 67x44 -> 48.6x44px` (see C06), `'Phone 320' resizes 'Notes' 59.4x44 -> 53x44px`, `main y 203->251`. (b) The in-page contents links: `clicking 'Scoring a run' moves the page: main y 203->-259`, on 17 states. (c) The presets that scroll the window: `'Reading on, bars hidden' / 'Follow along off' / 'Next chapter starts' moves the page: main y 203->-632`. The verdict block's `open_items` and `## States reached only by interaction` do not mention them.
- confidence: high · found_by: measured

### C02 · must-fix · part 1 · open
- board: Reader.dc.html · view: frame · state: 06, 07, 08, 11, 14, 16
- finding: The head's Listen slot changes height with every Listen state, so the text under it jumps each time the state changes. This includes the changes the reader never asked for (preparing finishes, the connection drops, the limit is hit). A reader at the top of the document sees the contents list and the first heading shift by up to 81 px while reading (bar line 6). Starting Listen itself moves the text 3 px (44 → 47 px), a near-miss of the reason reader-G4 gives ("so the text under it does not jump").
- evidence: the height of `.rx-listen` and the offset of the first `h2` from the `h1`, measured in the critic's harness at desktop 1440. Ready, idle 44 px / 491. Waiting 47 / 494. Preparing 60 / 506. First part ready 113 / 560. Tap to play 101 / 547. Playing 47 / 494. Connection lost 101 / 547. Voice failed 126 / 572. Daily limit 122 / 569. Earlier version 122 / 569. The same shifts show between `Reader.frame.state-07.png`, `-08.png`, `-11.png` and `-14.png`. Standard: "Controls never change size or move what is around them when they show state" and the bar's line 6.
- confidence: medium · found_by: critic

### C03 · must-fix · part 1 · open
- board: Reader.dc.html · view: frame · state: 11
- finding: In the document's Playing state at desktop, the dock sits over the block being read. The follow-along mark runs down beside a paragraph whose second line is hidden under the capsule, so the reader cannot see the sentence they are hearing. This fails the handoff's check for *playing, docked*: "it never covers the text being read".
- evidence: `.preview/11-listen/01-listen/pages/reader/Reader.frame.state-11.png` (the rule at x≈420 spans y 925–1003, and the dock spans y 961–1026). Measured in the harness: `.lx-follow` 921–1010 against `.lx-dock` 961–1026. The same overlap shows on `<scratch>/focus-dock.png` right after pressing Listen. Handoff `## Pages` → reader → *playing, docked*.
- confidence: medium · found_by: critic

### C04 · must-fix · part 1 · open
- board: Reader.dc.html · view: frame · state: 05
- finding: On a document left part-way, one action has two names on one screen. The head says **Continue listening** and the bottom pill says **Listen · 18:05 of 42:10**, and both resume at 18:05. The reader cannot tell they are the same action. This departs from frame F1 ("Continue listening" is the resume word) and no `frame_gaps:` entry logs it.
- evidence: `Reader.frame.state-05.png` (the head button "Continue listening 18:05 of 42:10" at y≈587, the pill "Listen · 18:05 of 42:10" at y≈1003). In the harness, pressing the pill on that preset gives the dock "Playing · 18:05 of 42:10". `frame.md` F1 and F6. Standard *Copy*: "keep the same action name through the flow". The page's `frame_gaps:` lists G1–G4 only.
- confidence: high · found_by: critic

### C05 · must-fix · part 2a · open
- board: Reader.dc.html · view: frame · state: 08, 09, 13, 15, 17, 11
- finding: Once a Listen exists, the head note and the dock carry the same thing twice on one screen, so the page has no single next step. Signed out shows two accent **Sign in** buttons. First part ready and Tap to play show two accent Play controls. Finished shows two Start overs. Daily limit shows an enabled Play in the head beside a disabled-looking Play in the dock. Playing shows "Playing · 12:30 of 42:10" in the head and again in the dock. reader-G4 logs the choice to show the note in every state, but not the doubled actions it creates.
- evidence: `Reader.frame.state-17.png` (Sign in at y≈644 and y≈992, both filled accent). `-08.png` and `-09.png` (accent Play in the note, plus the dock's accent Play circle). `-13.png`. `-15.png` (G3 logs the enabled/disabled conflict, but not the doubling). `-11.png`. Standard *Hierarchy*: "One primary action per screen". *Toss-level care*: "One core message and one primary action per screen". `frame.md` F6: "The note's one action (F10) is the only accent button Listen adds".
- confidence: medium · found_by: critic

### C06 · must-fix · part 2a · open
- board: Reader.dc.html · view: frame · state: 02, 41
- finding: At Phone 390, the loose document's back link is cut to "‹ Li…", so the reader cannot tell where back goes. At Phone 320 the same link reads "‹ Library" in full, because the language switch has wrapped to a second row. The narrowest phone reads better than the common one.
- evidence: `Reader.frame.state-41.png` (the top bar: "‹ Li…" between the logo and the English/한국어 switch), and the same on the dark Phone 390 shot `<scratch>/dark-phone-signedout.png`. `Reader.frame.state-43.png` / `Reader.w320.png` show the full "Library". Measured: `clicking 'Phone 390' resizes 'Library' 67x44 -> 48.6x44px`. Standard *Polish*: "Deliberate crops … never by accident". *Toss-level care*: "Long names … still hold". F16 names the label "‹ Library". Whether the cut comes from the frame's Shell or the page's `.rx-loose` copy (reader-G2), no entry logs it.
- confidence: medium · found_by: critic

### C07 · must-fix · part 2a · open
- board: Reader.dc.html · view: frame · state: 00
- finding: The measured type-scale line is neither fixed nor logged. The page shows 7 font sizes, over the standard's 4–6, so it is unrecorded whether the extra step is the signed reader's or Listen's.
- evidence: `preview.json` views.frame `size-count`: "7 font sizes on one board (11px, 13px, 15px, 18px, 21px, 26px, 43px), over 6". Standard *Type*: "Few sizes in clear steps (about 4–6 on a screen)". The rubric's advisory measured lines must be answered.
- confidence: high · found_by: measured

### C08 · must-fix · part 2a · open
- board: Reader.dc.html · view: frame · state: 33
- finding: The measured padding line on the dock with the longest chapter title is neither fixed nor logged. The title's text runs to 3.8 px from the capsule's right edge. By eye, the ellipsis stops about 25 px before the chevron, so the line may come from the untruncated text. Either way it needs an answer, and since the Dock is the frame's, the answer has to come through the page's log.
- evidence: `preview.json` state 33 `cramped-padding`: `section "Shipping and runnin…": text 3.8px from its right edge, under 8px`, box [432, 907, 576, 65]. `Reader.frame.state-33.png` (the dock at y≈940).
- confidence: high · found_by: measured

### C09 · advisory · part 2b · open
- board: Reader.dc.html · view: frame · state: 00
- finding: At the top of a document, Listen appears twice: the head's button and the bottom pill, which floats over the opening paragraph. Frame F6 shows the pill "whenever the reader's chrome shows (… the top)". This keeps Listen one tap away while reading, at the cost of a doubled control and covered text on the first screen.
- evidence: `Reader.frame.png` (the head Listen at y≈587, the pill at y≈1003 over "its average gain stands cle…"). `Reader.w320.png`.
- confidence: medium · found_by: critic

### C10 · advisory · part 2b · open
- board: Reader.dc.html · view: text200 · state: 00
- finding: At 200% text, the signed document title breaks inside a word, "performan / ce rule v1", with no hyphen. This is the signed reader's head, which the page keeps as signed, so it is noted for the operator rather than held against the page.
- evidence: `.preview/11-listen/01-listen/pages/reader/Reader.text200.png`.
- confidence: medium · found_by: critic

### C11 · advisory · part 2b · open
- board: Reader.dc.html · view: frame · state: 23, 43
- finding: The Korean title and lede render in the signed reader's serif stack (Fraunces → Noto Serif KR before Pretendard), while the handoff's Korean check names Pretendard. The signed reading face is kept at the cost of the check's literal word. `keep-all` holds, and the 320 px lede breaks cleanly.
- evidence: `Reader.frame.state-43.png`. Harness computed style: h1 `font-family: Fraunces, "Noto Serif KR", "Nanum Myeongjo", Pretendard, …`, `word-break: keep-all`, `lang=ko`.
- confidence: medium · found_by: critic

### C12 · advisory · part 2b · open
- board: Reader.dc.html · view: frame · state: 26
- finding: While chapter 2 plays, moving on to read chapter 3 shows "Playing · Chapter 2 · 12:30" in chapter 3's head, with no Listen from this chapter (reader-G4). This keeps one book-wide Listen, at the cost of a way to restart from the chapter on screen.
- evidence: in the harness, from the Chapter Playing preset, clicking Next: the head reads "Playing / Chapter 2 · 12:30" under chapter 3's title.
- confidence: medium · found_by: critic

## For the judge

None: no must-fix is low-confidence, the verdict is `revise`, and no finding stands against a logged departure. Under `critic` alone, the operator should read C02, C03, C05 and C06 as medium-confidence calls.

## Scorecard

| board | Part 1 | Part 2a |
|---|---|---|
| Reader.dc.html | C01, C02, C03, C04 | C05, C06, C07, C08 |

**Component gaps:** none new.

**2b notes for the operator:**
- At the top of a document, Listen appears twice (the head button and a pill floating over the first paragraph), by frame F6's rule (C09).
- At 200% text, the signed title breaks inside "performance" (C10).
- Korean titles use the signed reader's serif face, while the handoff's check names Pretendard (C11).
- Reading another chapter while one plays shows the playing chapter's state, with no "from here" Listen (C12).

**The bar:**
1. holds: the contents links go to distinct anchors (`#rx-b-1`, `#rx-b-4`), and chapter Next changes the chapter.
2. holds within the page: Listen carries the item's title and position into the dock, and the left-part-way pill carries 18:05.
3. holds (no search or filter on this page).
4. holds: one bar, verbatim chrome, this page's presets only, every handoff state reached (`statebar` empty on every state).
5. holds: `#to:book` placeholders are expected here, and the outside destinations are inert `#top`.
6. open: C02 (and C01 to be answered).
7. holds (no filtered list).
8. holds: hovering Listen shows an accent border with the label readable (`<scratch>/hover-listen.png`), and `hover-contrast` reports none.
9. holds: "‹" back links, a centred column, the note's action on the column edge. The back label is cut at 390 (C06).
10. holds: one direction, icons only.
11. open: C05 (one primary action per screen) and C06 (long names hold).

**Holds:**
- Every handoff state × check is reachable by preset or click: 22 document and 10 chapter presets, plus the window and theme switches.
- The dock stays put while the bars hide (`.lx-dock` top 907 in Playing and in "Reading on, bars hidden").
- "Starting…" keeps the button's 119 px rest width.
- The focus ring wraps the whole capsule.
- Dark text contrast holds on idle, playing, failed, limit, waiting, signed out and outdated: lowest 6.47:1, measured by the critic's harness.
- No contrast, target, clip or name issues on any of the 47 states.
- `design-check --page reader` OK, `self_check=pass`.
- The Korean lede keeps `keep-all` at 320.
- The frame's F10 sentences are used verbatim.

**Not seen:**
- Pretendard did not load in the critic's headless harness (no network), so the shipped Hangul UI face was not seen.
- Dark non-text contrast (the dock's border and the disabled lead circle) was not measured.
- The note's accent buttons were not hovered by eye (the tool reports no `hover-contrast`).
- The in-canvas stand-in sheets ("Listen", "Sign in") and the chapter-change live region were not looked at.
- The iPad window was judged from the contact sheet only.
