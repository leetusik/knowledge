# P30.S20 result: annotations I (selection, highlights, notes)

## Verdict

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **summary:** Built annotations I from the signed `05-annotations` rounds 01 and 02 §1. This covers the `<mark>` paint (folded callouts included), selection by mouse, touch and keyboard, the bar, the popover, the undo line, highlight and section notes with edit and delete, "Review this" wired to S10, and the 2,000-character note. Selections are captured in the server's section projection, and a test proves that equal to Python's on every fixture. Failure handling never loses an annotation: writes retry, show Try again, and are held across a sign-in.
- **files_changed:**
  - **new:** `web/src/lib/reader/anchor.ts`, `web/src/lib/reader/paint.ts`, `web/src/lib/reader/notes.ts`, `web/src/lib/reader/notes-load.ts`, `web/src/components/reader/annotations.tsx`, `web/tests/reader-anchor.test.ts`, `web/tests/fixtures/anchor-mixed.txt`
  - **edited:** `web/src/lib/native/render.tsx`, `web/src/components/reader/figure-parts.tsx`, `web/src/components/reader/reader-article.tsx`, `web/src/components/reader/reader-frame.tsx`, `web/src/lib/reader/chrome.ts`, `web/src/lib/reader/load.ts`, `web/src/lib/reader/types.ts`, `web/src/lib/reader/actions.ts`, `web/src/lib/knowledge/reader.ts`, `web/src/content/reader.ts`, `web/src/app/reader.css`, `web/tests/native-cites.test.ts`
  - **notebook:** `works/phases/active/P30/phase.md` (Decisions, Operator Questions, Doc impact, Notes, Now), `topics/operator-questions-decided.md`, `topics/doc-impact-detail.md`, `topics/notes-later.md`
- **validation:**
  - `pnpm --dir web typecheck`: pass
  - `pnpm --dir web lint`: pass
  - `pnpm --dir web test`: pass (344 tests in 32 files; 62 new in `reader-anchor.test.ts`)
  - `pnpm --dir web build`: pass
  - `python3 scripts/plugin_parity.py`: pass
  - `python3 scripts/skills_parity.py`: pass
  - `python3 scripts/workflow.py validate`: pass (only the standing stale-docs and oversized-section warnings)
  - live check: see below
  - the server suite was not run, because no server file changed
- **deviations:**
  - The plan named the CSS Custom Highlight API as the first choice. I used `<mark>` wrapping, because round 02 makes each highlight a tab stop and a Highlight range cannot hold focus (OQ101).
  - Bookmark in the block bar and the Markdown bar are left to S21, per the plan's scope (OQ105).
  - I added one behaviour the rounds do not draw: writes stopped by a 401 are held in `sessionStorage` and sent after the sign-in (OQ109). Without it, a lapsed session would lose the reader's highlight.
- **doc_impact:** `- frontend.md, api.md: P30.S20 — 05-annotations rounds 01 and 02 (§1 keyboard reach) are the design record of highlights and notes in the reader; full lines in topics/doc-impact-detail.md → *P30.S20* (P30.S20)`

## The core invariant

A captured anchor's `{block_id, start, end, exact, prefix, suffix}` must equal what the shared `project.ts`/`project.py` projection gives for the same text.

- **The renderer stamps containers.** Each passage container gets `data-tx`/`data-sec`/`data-base`, but only when its rendered text equals the projection's next container. Paragraphs carry offsets across image splits; callout titles, `th`/`td` and code lines are stamped too. Text that is not the author's carries `data-an-skip`. A bare citation's `[n]` carries `data-an-len`.
- **Capture verifies before it trusts.** `capture()` in `anchor.ts` runs on a minimal DOM interface. It checks every stamp against the server's projection text again, snaps to word boundaries, and cuts the quote, prefix and suffix from the projection itself. A container that fails the check takes no highlight (OQ110).
- **The test proves it against Python.** `web/tests/reader-anchor.test.ts` parses `renderToStaticMarkup` for every accept fixture and compares against Python's `<case>.txt`. It covers:
  - every stamped container is verified, and every non-space character is covered;
  - random selections capture Python's offsets and context;
  - points on element boundaries;
  - the paint round trip (`slicesIn` → capture back);
  - a mixed chapter pinned to Python's own projection (`fixtures/anchor-mixed.txt`). It holds an image mid-paragraph, bare and normal citations, a missing link, a hard break, Hangul, emoji, a table image cell, titled and folded callouts, code with an id, and sources;
  - classification, snapping (Korean and emoji code points) and the 5,000 cap.
- **Live, every row is right.** I checked every annotation stored during the live check against Python's projection and the S9 resolver (`scratchpad/s20/verify.py`). All of them were `exact` at their stored offsets. They covered a paragraph, a callout title, a list item, a table cell, a code line, a callout body, a cut-at-section-end passage, an overlap, an inline-link paragraph and a section note.

## Live check

**Instruments:**
- **Behaviour, writes, console and CSP:** headless Chrome over CDP with a throwaway (or reused) profile, sending real mouse, touch and key events (`scratchpad/s20/cdp20.mjs`, scenarios `s1`-`s5`).
- **Geometry and screenshots:** **Aside** (`aside repl --account u1`) at 1440, on the agent profile signed in to the scratch account. It confirmed the paint classes and tab stops, and that a click opens the popover; screenshot at `scratchpad/s20/aside-1440-pop.png`.
- **Narrow viewports:** 390 used CDP mobile and touch emulation, not the Aside iframe harness. Interaction there is emulated touch, not a real device.

**Runtime:**
- scratch API `:8831` (database `kb_s20live`, KB_ROOT in the scratchpad, fixture book from `scripts/publish_fixture_book.py`, `fixtures` made public);
- the production build via `next start` `:3831`;
- a dev clone (`next dev`) `:3832` at `http://localhost`.

I never used `:8766` or `:3030`. I stopped my own PIDs only and dropped the scratch database afterwards.

**Results (all pass):**
- **Selection flow:**
  - mouse selection gives the bar and the pending tint in place of the native selection;
  - keyboard selection keeps the native selection;
  - H highlights and N opens a note on a new highlight; Escape steps back from the field to the bar, then clears;
  - touch (390, coarse pointer) puts the bar 28 px below and keeps the handles; Highlight takes the native selection away and opens the popover;
  - a tap elsewhere closes it, and only the next tap toggles the chrome.
- **The bar:**
  - a selection that crosses a section is cut at the end of its section and the bar says so;
  - a heading gives "Section · Background" with Add note;
  - the title gives "Highlights start at the first section.".
- **Popover and stops:**
  - opens with focus in the box;
  - Review this goes On, then Off with the paused line (the PATCH reaches S10);
  - Add note with Cmd+Enter keeps line breaks and Korean;
  - Escape returns focus to the highlight's stop (`aria-describedby` "Highlight with a note"), and Enter on the stop reopens;
  - a click on an overlap opens the chooser, and a pick by keyboard opens that highlight.
- **The note:**
  - the count appears from 1,800 and stops at 2,000 with the full line; a 2,000-character note saves;
  - on touch, the hint row keeps its height for the count and the field is 16 px.
- **Section notes:** saved, reopened in view, edited to empty (which deletes it), and restored with Undo.
- **Delete and Undo:**
  - Delete shows the undo line (fixed, `role=status`) and Undo puts the highlight back;
  - when the window runs out, the DELETE is sent and a reload shows one fewer highlight.
- **Folded callout:** paints when opened. Closing it closes the popover and moves focus to the summary.
- **Persistence:** after a reload, highlights, notes (2 px edge) and stops are back.
- **Signed out:** Highlight raises Sign in to save at the selection (`next` returns to the chapter), and Not now clears it.
- **Failures:**
  - API stopped: retries, then "Not saved · check your connection" with Try again while the paint stays; with the API back, Try again saves;
  - session revoked (401): Sign in to save in the bottom slot, the write held; signing in from its link comes back to the chapter, and the held highlight is saved and painted.
- **Sweep:**
  - viewports 820×1180, 1024×768 and 1440×900 (390 above), in light, dark, sepia and system dark at text sizes 1 and 5;
  - paint contrast is at least 7.2:1 everywhere;
  - a low popover is revealed inside the visible band and stays within the column;
  - no sideways scroll and no inner scroller.
- **Dev clone:** the main flow (s1) and the failure paths (s4) pass, with no hydration errors.
- **Console and CSP:** no CSP violations and no errors from the page. The only entry was the browser's own `/favicon.ico` 404, which predates this slice. Next dev also prints its existing `scroll-behavior: smooth` warning.

**Compared to the signed boards** (the critic's rendered PNGs of round 01: `HighlightStates`, `PopStates`, `SelectionStates`, `SelBar`):
- the paint, the popover's order and words (including "Its note goes with it."), the chooser and the bars match;
- the cut-selection bar spans the column, where the canvas boards are narrow frames.

**Fixes the live check found** (all in `annotations.tsx`):
- a mouse selection could be re-read as a touch selection by a late `selectionchange`;
- the reveal measured the popover before it took its width;
- the reveal never reset after the float closed.

## Not verified

- Real phones and tablets (touch was emulated).
- Print (the CSS hides the paint and floats, but nothing was printed).
- The canvases themselves (compared to the critic's rendered PNGs instead).
- Forced colours (the CSS was transcribed, not rendered).

## Notebook

- **Decisions:** one line (Annotations I).
- **Operator Questions:** OQ99-OQ110, collapsed into one line; full text in `topics/operator-questions-decided.md` → *P30.S20*.
- **Doc impact:** one line; full text in `topics/doc-impact-detail.md` → *P30.S20*.
- **Notes for later slices:**
  - removed S20 from the audiences of the S8, S9, S10, S12, S13, S15, S16 and S19 notes;
  - added *Annotations I as shipped* (`topics/notes-later.md`) for S21, S24 and REVIEW.
- **Now:** rewritten.
