---
status: done
tier: mid
model: sonnet
effort: high
---

# P30.S27: fidelity and functional sweep (qa), result

## Verdict block

- **status:** done. The sweep ran to the end. It found **3 defects worth an F slice (2 High, 1 Medium), 3 Low defects and 4 observations**. Nothing was fixed (`git status` shows no source edit).
- **summary:** I drove every P30 surface in a fresh scratch stack (dev clone and production build) with headless Chrome over CDP: real mouse, key and wheel events, emulated viewports, DPR 2/3, classic scrollbars, `Page.printToPDF`. Most of the checklist passes. The defects:
  - **X1 (High):** the quiz foot shows every state sentence at once. A glued class (`qz-stis-off`) is the cause.
  - **X2 (High):** a signed-in reader who has answered a quiz gets a page wider than a 390 phone (564 px), and the Contents/Notes sheet is cut off. A `.qz-vh` text without `overflow: hidden` is the cause.
  - **X3 (Medium):** a `#section` link, and the sign-in round trip, often land at the top instead of at the section.
- **tests/validation run:** `python3 scripts/workflow.py validate` (see the end of this file). No product code changed, so there are no web or server gates to run.
- **deviations:**
  1. **Aside `u1` was not used and the iframe harness was not built.** I drove everything through headless Chrome over CDP. `Emulation.setDeviceMetricsOverride` gives a true CSS viewport, the same instrument S22–S26 used for narrow widths. This is named in *Instruments* and I claim no Aside run.
  2. The environment was a fresh scratch API (`:8911`, database `kb_s27live`, dropped), the production build (`next start :3911`), a second `next start :3912` (its own login limiter) and a dev clone (`next dev :3913`). `:8766` and `:3030` were never touched.
- **doc_impact:** one `## Doc impact` line in `phase.md` (`qa.md`, the P30 regression lines; full lines in `topics/doc-impact-detail.md` → *P30.S27*).
- **files_changed:** this file; `works/phases/active/P30/phase.md` (Doc impact, Operator Questions, Notes, Now); `works/phases/active/P30/topics/doc-impact-detail.md`; evidence in `slices/P30.S27/evidence/`.

## Setup

- **Stack:** scratch API with a scratch `KB_ROOT` and database `kb_s27live` in `kb-p28s2-pg`.
  - Accounts: `s27-member@example.com` (org `s27org`) and `s27-other@example.com` (org `otherorg`).
  - Content:
    - the fixture book (`fixtures/fixture-guide`: `all-blocks` v1–v3, `write-lock` en v2 beside ko v1, a legacy html chapter);
    - the codebase book `knowledge/guide` (chapter with 2 versions plus a Korean translation, `release` with 3 versions);
    - the subject book `tidewater` (8 md chapters plus a legacy html chapter);
    - the private project `lantern` (a book and a loose md note);
    - loose documents: md, native (fixture-finance), html and a stress document (118-column drawing, 45-row table, 20 quiz items).
  - Public projects: `fixtures`, `knowledge`, `tidewater`; private: `fixture-finance`, `lantern`. The other org has one public and one private project.
- **How to reproduce:** `evidence/repro/` has the driver (`cdp.mjs`), helpers, seed scripts and the scenarios for X2 and X3. They need a scratch API and the same accounts, so they are not self-contained.
- **Cleanup:** I stopped only my own PIDs (API, three web servers, headless Chromes) and dropped `kb_s27live`. `:8766` (PID 66506) and `:3030` (PID 8452) were still listening afterwards.

## Instruments (what was and was not used)

| Instrument | Used for |
|---|---|
| Headless Chrome 1 over CDP (`Input.dispatchMouseEvent`, `dispatchKeyEvent`, wheel; `Emulation.setDeviceMetricsOverride` with DPR 1/1.5/2/3; `setEmulatedMedia` for dark, reduced motion, `pointer: coarse`; `--disable-features=OverlayScrollbar` for 15 px classic scrollbars; `Page.printToPDF`; `Log`/`Runtime` capture for console and CSP) | everything below |
| `pdftotext` and `pdftoppm` | reading the printed PDFs |
| Aside `u1` | **not used** |
| the iframe harness | **not built**; CDP viewports replace it (a true CSS viewport) |
| Safari, Firefox, a real iOS or Android device | **not run**: see *Operator-run device list* |

## Checklist

Evidence paths are in the session scratchpad `…/scratchpad/s27/` unless a file sits under `evidence/`.

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Every visible control does something | **pass, with X1–X3 and X6 below** | The inventory covered the reader chrome, the sheets, the page's links, the legacy bar, the book page, the library, the per-book list and review. A link audit (45 internal hrefs from 14 pages, fetched signed in) found none dead. |
| 1a | Reader chrome | pass | Display (5 sizes × 4 themes, cookie `kb_reader`, survives a reload, Esc returns focus to Display). The Contents sheet jumps and its Notes tab lists rows. Version history opens and View v1 gives "Older version … Read v2". EN/한국어 switch with the "Older translation" notice and "Read English v2 →". Next and Previous. Top-bar links. Mark as finished and Mark as unread. Bookmark and Add note from the place bar. |
| 2 | Resume and progress survive a reload, signed in | pass | Scrolled to 4000 px, waited 2.8 s, reloaded: landed at 3955 px (anchored to block `fig-mixed`) with "Picked up where you left off · Images · From the top". `POST` `{anchor_id:"fig-mixed", fraction:0.447}`. The legacy frame restored 16–17% too. |
| 3 | Quiz results persist and show "your answer" on return | pass | single, multi, recall (missed) and cloze (1 of 2): `POST` bodies saved. After a reload each item reads "Your answer from 21 Oct 2026". On v3, where the item prompt changed, it reads "…, on v2". Review count went to 2 due. |
| 4 | Highlights, notes, bookmarks persist, re-anchor, show Unanchored | pass (the label is "Text changed") | Persisted across a reload (server rows `anchored`). Published v3 with one phrase deleted and one reworded: the reworded highlight re-anchored; the deleted one reads "Text changed · Made on English v2 · this version no longer says it" in the Notes sheet and the per-book list. The bookmark kept its block. Add label, Delete + Undo, filters (All / Bookmarks / Highlights and notes) and a row's `?note=` landing all work. |
| 5 | Review: rate, suspend, undo, end | pass | Good and Again on quiz and highlight cards; Suspend then Undo restored the count; "Done for today … next card due tomorrow" end state with Continue reading. Settings sheet opens; By book toggles its list. |
| 6 | Clear this book and Clear all | pass | Clear this book: that book's 3 chapters, 3 annotations and quiz answers went to 0, review cards to 0, and the other book's state stayed. Clear all: books 2→0, docs 4→0, annotations 4→0, review 1/5→0/0. The confirm text matches what was removed. |
| 7 | No inner scroller (DPR 2, classic scrollbars, width changes) | **pass for vertical scrollers, with X6** | 15 px classic scrollbars in effect. 200 random viewports (320–1520 × 500–1100, DPR 2) on each of native, legacy, loose-stress and ko. Native: only horizontal scroll boxes (diagram, art, figure) and, below 40 rem, the designed long-table box; page scroll is the only vertical one. Legacy: page `scrollHeight` equals `innerHeight` in 199 of 200 samples, frame is the scroller. The 200th: `div.lg-bottom__bar` scrolled 35 px at 335×581 (X6). A fixed-width list (390/820/1024/1440 × DPR 2, classic scrollbars) was clean on the library, org page, book pages, per-book list, review, past-version and not-found pages. |
| 8 | Signed out: Sign in to save, nothing written, round trip | **partial** | The quiz and the highlight bar show "Sign in to save … you come back to this chapter, at this section"; 0 writes (the `POST` list was empty). The top-bar Sign in href carries the section. **Round trip lands at the top (X3).** `next=//evil.example.com` stays on the login page. |
| 9 | Another org's member sees only public; private returns the constant not-found | pass | Private doc/book/chapter vs a nonexistent one: identical status, title and text for 5 pairs (anon), and member B gets the same on org A's private content; `/documents/5` and `/documents/9999` both go to login. B reads A's public chapters and sees its own private project. |
| 10 | CSP, no console errors | pass | The production build had zero `log.error`, exceptions or CSP lines across all survey, theme, size, sweep and keyboard runs. The 404 pages log the browser's own "Failed to load resource 404". The only other line is the warning "css preloaded … not used" (O3). Dev clone: no error beyond the 404s and HMR info lines; the same results as prod, including X2. |
| 11 | Themes (light, dark, sepia, system dark) and text sizes 1, 3, 5 | **pass, with X1 and X2** | 12 surfaces × 3 themes × 3 sizes × (390, 1024): 216 loads, 0 console lines, 0 contrast failures in a WCAG text-contrast scan except the past-version page (O1). System theme with emulated `prefers-color-scheme: dark`: the reader root is dark and the contrast scan found 0 failures on 6 surfaces. A second pass at 390 with the member's state found page overflow only on the three quiz-bearing chapters (27 of 27 combos, X2). Screenshots of callouts, diagrams, figures in dark look as drawn. |
| 12 | Keyboard reach | pass | Tab order on a chapter: logo, back, Display, Version history, contents links, highlight marks, links, collapsed callout, scroll boxes, sources, quiz controls. Every stop shows a focus ring (0 `NO-RING`). Display opens on Enter, traps Tab, returns focus on Esc. Space and Enter toggle a collapsed callout's summary. Review: Show answer by Enter, Tab to I got it, Enter rates. |
| 13 | Device checks a browser can emulate (D36 (7)) | pass | See below. |
| 14 | Re-checks from earlier "Not verified" lists | see below | |

### Re-checked "Not verified" items

| Item | Result |
|---|---|
| Text zoom 150% and 200% | Browser zoom (viewports 960, 720 and 512 CSS px at DPR 1.5 and 2) is clean on 7 surfaces. **Root font 150%/200% at 390, 820 and 1024 overflows horizontally on the chapter** (844/1123 at 390, 860/820, 1144/1024; X2) **and on the book page at 200% (X5)**; review is 4 px over at 200%. |
| Reduced motion | `prefers-reduced-motion: reduce`: every transition computes to 1e-05 s and no animation starts when a sheet opens. Pass. |
| Space on a collapsed callout's summary | Space opens and Enter closes it. Pass. |
| Refused-finish revert | Killed the API, clicked Mark as finished: the end reverted to "Not finished / Marked as unread" silently; with the API back, it finished. Pass (`evidence/t7-refused.png`). |
| Long table's sticky header at large sizes | Size 5 at 390: the box scrolls 720 px with the header pinned (`th` 1 px from the box top, `position: sticky; top: 0`). At 1440 the header sticks under the top bar (`top: 59px`). The wheel chains to the page at the box's end. Pass. |
| `prefers-color-scheme: dark` with the system theme | Pass (see row 11). One observation: `body` stays light (O2). |
| Print | See the Print section. |

### Emulable device checks (D36 (7))

- **Legacy frame as the only scroller under `100dvh`:** at 390×844, 390×760 and 390×640 (mobile emulation) page `scrollHeight` equals `innerHeight`; the frame plus the bottom chrome fill it exactly. Only an emulation of a URL bar changing: the real one is operator-run.
- **External links open a new tab:** every external link carries `target="_blank" rel="noopener noreferrer"`; clicking the legacy frame's external link opened a second page. The real-device tab behaviour is operator-run.
- **Korean line breaking:** `word-break: keep-all; line-break: strict; overflow-wrap: anywhere` computed on the KO chapter; at 390 px **0 of 145** Hangul words split across lines. Safari is operator-run.
- **Native diagram hairlines at DPR 2 and 3:** the smallest drawn stroke is 0.85 px (the flow and state diagrams at 390), the others 1.0–1.95 px; nothing under 0.85. Rendering at real DPR 3 is operator-run.
- **Touch targets:** with `pointer: coarse` and touch emulation at 390 every control outside running text is at least 44×44 on the chapter, book page, library, review, per-book list, legacy chapter and loose document (the only smaller one is the off-screen "Skip to content" link).

### Print (CDP `Page.printToPDF`, A4 and Letter)

| Page | Result |
|---|---|
| native chapter (`all-blocks`) | 8 pages A4, 9 Letter. Page 1 has the masthead (`KNOWLEDGE · FIXTURE GUIDE · CHAPTER 1 OF 3`, address, `v3`, `Printed 21 Oct 2026`); the quiz is printed, followed by the answer key ("Answers", "4 answers to 'Check yourself'"); the colophon is last; every link is followed by its address. |
| older version (`?v=1`) | prints the v1 text. |
| KO chapter, loose md | masthead and colophon present. |
| legacy chapter | one notice sheet: "This chapter prints from its own page … Open its own page and print from there:" with the raw address. |
| `/documents/{id}/versions/1` | still the old P28 layer (D51). |

The printed address host is `127.0.0.1:3030` because this build's `NEXT_PUBLIC_APP_URL` points there; no request went to `:3030`.

## Defects

Severity: High = broken for normal use; Medium = a promised behaviour fails; Low = polish or an edge.

### X1 (High): the quiz foot shows every state sentence at once

- **Surface:** the reader's quiz (`web/src/components/reader/quiz.tsx`), every answered item, every theme, every viewport, signed in or out.
- **Steps:**
  1. Open `/@s27org/fixtures/books/fixture-guide/all-blocks`.
  2. Click an option in question 1, then Check in question 2, then Show answer and "I missed it" in question 3.
  3. Read the foot under each item.
- **Expected** (the signed `04-quiz` round, *Every state*): the foot shows the one sentence for the current state; the others are stacked in the same grid cell and hidden (`.qz-st.is-off { visibility: hidden }`).
- **Actual:** all sentences show together, for example "Correct / Saved for review", "Nothing to check yet · Choose at least one answer first.", "Incorrect · partly right · Saved · review keeps your first answer", and for recall both "Got it" and "Missed it" (`evidence/t5-recall.png`).
- **Cause:** the class lists are glued, as the S24 gotcha predicted but was fixed only in review. `quiz.tsx` lines 273, 326, 565 and 586 write `` `qz-st${on ? "" : "is-off"}` ``, which becomes `qz-stis-off` when off: it matches neither `.qz-st` nor `.is-off`. 10 elements on the chapter carry a glued class. The grep finds only these four.
- **Suggested fix:** use `cx()` (`web/src/lib/review/cx.ts`) or add the space, in the four places.

### X2 (High): the reader page is wider than the phone when the signed-in reader has quiz answers

- **Surface:** native chapters (`all-blocks`, `write-lock` en and ko) at 360, 390 and 430 px wide; also the fixed sheets and, at a larger root font, the tablet widths.
- **Steps:**
  1. Sign in and answer a quiz in a chapter (or keep the seeded answers).
  2. Open the chapter at 390×844 (mobile emulation).
  3. Read `documentElement.scrollWidth`.
- **Expected:** `scrollWidth` equals the viewport (390).
- **Actual:**
  - **564** at 390, 360 and 430 on `all-blocks`; **506** (ko) and **473** (en) on `write-lock`. The same chapter signed out (no answers) is 390.
  - With mobile emulation the layout viewport grows to 564, so the page is zoomed out. The Contents and Notes sheet is cut off at the right edge (`evidence/m1-pop.png`).
  - Root font 150% on 390: 844 px; 200%: 1123 px. 150% on 820: 860; 200% on 1024: 1144.
  - Over 27 of 27 theme × size combinations at 390 the three chapters overflow; the 9 other surfaces do not.
- **Cause (confirmed):** `.kb-ch .qz-vh` (`web/src/app/reader.css:1316`) is `position: absolute; width: 1px; white-space: nowrap; clip-path: inset(50%)` but has `overflow: visible`. Its text is a long nowrap sentence, for example "Question 4 of 4, incorrect. Incorrect · 1 of 2 blanks right. Your answer from 21 Oct 2026". `clip-path` does not clip scrollable overflow, so the text stretches the page. Adding `overflow: hidden` to it in the browser takes `scrollWidth` from 564 to 390 (`evidence/repro/z11.mjs`). The `qz-n--bad` badge (rotated `::after`) also contributes in the bisect (564→517 when hidden); recheck after the first fix.
  - I did not re-test the 150% and 200% root-font cases with that CSS applied.
- **Suggested fix:** add `overflow: hidden` (and `clip: rect(0 0 0 0)`) to the sr-only rule, then re-measure at 150% and 200%.

### X3 (Medium): a `#section` link and the sign-in round trip land at the top

- **Surface:** every native chapter and loose document; the sign-in return.
- **Steps:**
  1. Signed out, scroll the chapter to its Quiz section and reveal the top bar.
  2. Click the real "Sign in" (href `…login?next=…/all-blocks%23quiz-section`) and sign in.
  3. Read `location` and `scrollY` for 5 s.
- **Expected** (the plan and `topics/notes-later.md`, URLs and the sign-in return address): "returns to the chapter and block".
- **Actual:** the URL returns with `#quiz-section`, but `scrollY` stays 0 for 5 s while the section is at 9189 px (prod). The reader writes `fraction 0`, which overwrites the member's earlier resume position (`max_fraction` was kept).
- **Also:**
  - A plain same-origin link to `…/write-lock#a-later-addition` lands at the top in 2 of 3 runs signed out and in 5 of 5 signed in (`evidence/repro/v10b.mjs`). The dev clone behaved the same.
  - A fresh load of the same URL from a blank tab scrolls correctly (3 of 3), and a same-document fragment change does too.
- **Cause (not isolated):** nothing in the reader scrolls to `location.hash`. It leans on the browser's native fragment scroll, which loses a race with the streamed page. `use-reading.ts` only avoids overriding a hash.
- **Suggested fix:** after hydration, scroll to the hash target when it exists, under the top bar, and make the sign-in return do the same.

### X4 (Low): a book chapter opened by its document address renders as a loose document

- **Surface:** `/documents/{id}` and its canonical `/@{org}/{project}/{slug}` for a document that is a book chapter.
- **Steps:** anonymous `/documents/1` redirects to `/@s27org/fixtures/every-block-once`; for the legacy chapter `/documents/23` redirects to `/@s27org/tidewater/tw-9`.
- **Expected:** a chapter reads inside its book (Contents, Previous/Next, "In this book", back to the book).
- **Actual:** it reads as a standalone "DOCUMENT" with "‹ Library" and a "Notes" link, no book chrome.
- **Why it may be by design:** S11 made `canonical_path` the target for a document. I record it as an operator question (OQ183) rather than a decision.

### X5 (Low): the book page overflows at a 200% root font on a phone

- **Surface:** `/@{org}/{project}/books/{book}` at 390 with `html { font-size: 200% }` (a user's large browser font).
- **Actual:** `scrollWidth` 481 (390 wide viewport): `span.bk-lang` and `span.rd-tag` reach 448 and the ghost "Clear this book's reading data" button is 447 px wide (right edge 481). 150% is clean.
- **Expected:** the page reflows at larger text.
- **Suggested fix:** let the language row wrap and the ghost button shrink. Review at 200% is 4 px over (`qz-bw`, 394): see X2.

### X6 (Low): the legacy bottom bar scrolls vertically at 335×581

- **Surface:** the legacy reader, at 335×581, DPR 2, classic scrollbars, normal font.
- **Actual:** `div.lg-bottom__bar` has a 35 px vertical scroll range; this is a second scroller beside the frame. The page itself does not scroll. The S25 note says "the bar becomes a scrolling bar at 200% root font on 390, as drawn"; here it also happens at a normal font on a small viewport.
- **Expected:** exactly one scroller (the frame).

## Observations (not defects)

- **O1:** the past-version page (`/documents/{id}/versions/{v}`) fails text contrast (3.22:1 on its eyebrow, sub line and meta labels, at 10–12 px) in every theme. It is the old P28 layer that D51 retires.
- **O2:** with the system theme on a dark OS, the reader root is dark but `body` stays `rgb(246,242,232)`. Overscroll, or any gap, would show the light colour.
- **O3:** the production build logs the warning "The resource …css was preloaded … but not used within a few seconds" on most pages. It is a warning, not an error; no CSP line.
- **O4:** the chapter, book and not-found pages for a private or missing book or chapter answer HTTP 200 (the loading boundary has streamed, `noindex`); the document route answers 404. This is the known S13/S23 note.

Already filed, not re-reported: D41 (no way back for a suspended card; Undo disappears after a reload), D42, D45, D48, D49, D50, D51 and the OQ list.

## Suggested F groupings

1. **P30.F3 — Quiz class and sr-only (X1 + X2).** `quiz.tsx` (four class lists) and `reader.css` (`.qz-vh`). Re-measure 390/360/430 signed in, 150% and 200% root font, and the Contents sheet. Mechanical, `risk: low`.
2. **P30.F4 — Deep-link landing (X3).** A hash scroll after hydration in `reader-frame.tsx`/`use-reading.ts`, the sign-in return, and a check against the resume restore. `risk: low`, but it touches the reader's resume path.
3. **P30.F5 — Large-text polish (X5 + X6).** The book page's language row and ghost button, the legacy bar. `risk: low`.
4. **Decision first (X4, OQ183):** redirect `/documents/{id}` of a chapter to its book URL, or leave it.

## Operator-run device list (not claimed)

Run on the operator's devices for the gate walkthrough (D36 (7)):

- **iPhone and iPad, Safari and Chrome; Mac Chrome and Safari:**
  - the legacy frame as the only scroller under `100dvh`, with the URL bar shown and hidden and the home-indicator strip (WebKit 292603);
  - momentum scrolling in the frame;
  - keyboard scrolling after focus;
  - an external link opening a new tab;
  - whether the frame's `color-scheme` steers the 18 self-theming documents. I did not run a self-theming document in the dark theme.
- **Native diagram hairlines at real DPR 2 and 3.**
- **Native Korean line breaking in Safari.**
- **Print to PDF from Safari** (and Firefox's engine); a printer's own margins; a lazy image not loaded when printing starts.
- **The real iOS keyboard** in the cloze blanks, the note field and review.
- **Real classic scrollbars on Windows or Linux Chrome:** I emulated a 15 px scrollbar only.

## Doc impact

Appended one line to `phase.md` → `## Doc impact` (qa.md regression lines), with the lines in `topics/doc-impact-detail.md` → *P30.S27*.

## Validation

- `python3 scripts/workflow.py validate`: see the final run in the verdict message (run after the notebook edits).
- No web or server gate was run: no source changed.
