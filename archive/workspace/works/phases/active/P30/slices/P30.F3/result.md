# P30.F3 result

- **status:** done, with one deviation (X6 not changed; see below)
- **tier:** mid
- **model:** sonnet
- **effort:** high
- **summary:** X1, X2 and X5 are fixed and proven on the production build: the quiz foot shows exactly one sentence, and `scrollWidth` equals the viewport at 390, 360 and 430, at 100, 150 and 200% root font, on the chapters, book page, legacy page and review. X6 is left as drawn, because the signed legacy design makes the document bar scroll in a tight page (OQ184).
- **validation (all passed):**
  - `pnpm --dir web typecheck`, `lint`, `test` (37 files, 381 tests, including the new `tests/cx.test.ts`) and `build`;
  - `python3 scripts/plugin_parity.py` and `python3 scripts/skills_parity.py`: PASS;
  - `python3 scripts/workflow.py validate`: passed (only the existing docs warnings).
  - The server suite was not run (no server change).
- **deviations:**
  1. **X6 not changed.** The plan asks for a bar that never scrolls. The signed `09-legacy-and-print` build prompt (*Larger text and browser zoom: the tight page*) says the opposite: when the document would keep less than `min(40% of the page, 17rem)` the page is tight, and the document bar becomes `overflow-y: auto` with a sticky fade so the reader sees there is more of it. 335x581 at a normal font is a tight page (the stage keeps 232 px, the bar is 265 px tall in a 230 px box). `overflow: hidden` would cut off controls with no way to reach them (at a 200% root font on 390 the bar is 661 px in a 271 px box). Restoring the signed design means leaving it. Recorded as OQ184 (decided; a bar that never scrolls would be a new design round). The page itself never scrolls and the frame is the only document scroller, as S25 built it.
  2. Scope added to reach the plan's own Verify line ("scrollWidth equals the viewport ... at 200%"): after X2's clip the chapters still overflowed at 200% (a cloze blank, the chapter-end button, the chapter-list "Original layout" tag), and review overflowed by 7 px. They are fixed by the same wrap pattern (see X5 below).
  3. `git mv` staged the `cx.ts` rename (the only staging I did); nothing is committed.
- **doc_impact:** none (no durable truth changed).
- **files_changed:**
  - `web/src/lib/cx.ts` (moved from `web/src/lib/review/cx.ts`), `web/tests/cx.test.ts` (new, prettier-formatted: the only file formatted);
  - `web/src/components/review/card.tsx`, `queue-head.tsx`, `settings.tsx` (import path only);
  - `web/src/components/reader/quiz.tsx`, `figure-parts.tsx`, `note-row.tsx` (class lists);
  - `web/src/app/reader.css`, `book.css`, `review.css`;
  - `works/phases/active/P30/phase.md` (Notes, Operator Questions, Decisions, Now), `topics/operator-questions-decided.md`, `topics/decisions-archive.md`;
  - `works/phases/active/P30/slices/P30.F3/repro/` (the scenarios I ran: `w1.mjs`, `x1b.mjs`, `f1.mjs`, `x6.mjs`; they need a scratch API, as S27's did).

## What changed

### X1: glued class lists

The cause was `` `qz-st${on ? "" : "is-off"}` ``, which becomes `qz-stis-off`. A grep of every `className={`` template (and the `cls =` / `Cls =` string builders and multi-line ternaries) across `web/src` found these glued ones, all now `cx(...)`:

| File | Class |
|---|---|
| `quiz.tsx` | `qz__count`, `qz-st`, `qz-card` / `qz-card--hidden` (opening a card dropped the base class), two `qz-acts__layer` |
| `figure-parts.tsx` | `fg-media--loading` + `is-loaded` |
| `note-row.tsx` | `an-li__main--plain`, `--code`, `--b` (three modifiers that never applied) |

The rest (`rd-sheet`, `rd-btn`, `dg-*`, `fg-row`, the `" is-ok"` style builders and the fully spelled ternaries) already carry their spaces. `cx()` moved to `web/src/lib/cx.ts` and S24's three imports were updated. One test: it joins on one space and drops false, null, undefined and empty parts.

### X2: visually hidden boxes

- `.kb-ch .qz-vh` now has `overflow: hidden; clip: rect(0 0 0 0)` beside its `clip-path`, matching `.rv-vh` and `.dg__sr`.
- The only other visually hidden box missing a clip was the `rd-bnav` marks under 20rem (`overflow: visible`); now `overflow: hidden; clip: rect(0 0 0 0)`. `library.css`, `book.css` and `legacy.css` have no visually hidden class; `kb-console-responsive.css`'s table header already clips.

### X5 and the 200% remainder (wrap, the nearest drawn pattern)

After the clip, 200% still overflowed, so each source was found and given the same wrap rule (`max-width: 100%`, `white-space: normal`, and `min-width: 0` where a flex item), added only where it was needed:

- the book page's "Clear this book's reading data" button (`book.css`: `.bk-clear .rd-btn`; this was X5, 447 px wide);
- the chapter end's `.rd-status__btn` (`min-width: min(10.5rem, 100%)`) and the chapter list's `.rd-ch__tag` (`reader.css`);
- the review card's tag and answer button (`review.css`);
- the cloze blank: `width: min(7.5em, calc(100% - 2em))` so its number and tail stay on the line (4 px over at 200%). At a normal width it is still 7.5em.

## Proof (production build, `next start` on `:3921` against a scratch API on `:8921`)

Instrument: headless Chrome over CDP with a throwaway profile (S27's `cdp.mjs`), signed in as the scratch member, mobile emulation at DPR 2, the root font set to 100/150/200% after hydration. Aside was not used; I claim no Aside run. A second production build of `HEAD` (before F3) on `:3922` is the baseline.

`documentElement.scrollWidth` (the columns are all-blocks, write-lock, write-lock ko, book page, legacy, all-blocks v1, review):

| Viewport, root font | Before F3 | After F3 |
|---|---|---|
| 390, 100% | 564 473 504 390 390 390 390 | 390 on all |
| 390, 150% | 844 709 756 390 390 390 390 | 390 on all |
| 390, 200% | 1123 945 1004 481 390 390 397 | 390 on all |
| 360, 100% / 150% / 200% | 564 473 504 360 360 360 360; 844 709 756 361 360 360 360; 1123 944 1004 481 360 385 398 | 360 on all |
| 430, 100% / 150% / 200% | 564 473 504 430 ...; 844 710 755 430 ...; 1123 944 1004 481 430 430 430 | 430 on all |

The Contents sheet at 390: before F3 the layout viewport was 564 and the sheet spanned 564; after, the viewport is 390 and the sheet is 0 to 390.

X1: after answering (a click on a choice, a multi-select and Check, Show answer on a recall), the foot of every item shows exactly one sentence (`qz-st` 1 visible of 2 to 4), and a `qz__count` is hidden when nothing is answered; signed out and signed in, on all-blocks and write-lock. The baseline carried the glued classes `qz-stis-off` and `qz-acts__layeris-off`.

Nothing else moved: screenshots at 1440 and 390 of the book page, review, legacy page, all-blocks and write-lock are byte-identical before and after, except the book page at 1440 and all-blocks at 390, which differ only in the reading state the baseline run had changed (a chapter marked finished, a different "Continue" card); the layout is the same (checked by eye on the book page). A 200% book page at 390 shows the Clear button wrapped to two lines in its own column.

X6 measurements (`repro/x6.mjs`, DPR 2, classic scrollbars): 335x581 at 100%, 150% and 200% are tight with the bar scrolling (265/230, 480/172, 699/114); 390x844 at 100% is not tight and the bar does not scroll; the page `scrollHeight` equals the viewport in every case (the frame is the only scroller of the document).

## Observations (not defects of F3)

- The legacy chapter in this scratch stack logs React error 418 (a hydration text mismatch) on every load, signed in, on the pre-F3 build too. S27 reported zero console errors, so it may depend on this stack's state (the fixture's date, a finished chapter). I did not chase it; the review should recheck it.
- A per-launch `font-size` set by script before hydration produces the same error on other pages; the scenarios now set it after hydration. A real browser font setting is not an inline style.

## Cleanup

Stopped only my own PIDs (the API `:8921`, web `:3921` and `:3922`; each headless Chrome exits with its scenario) and dropped `kb_f3live`. `:8766` (PID 66506) and `:3030` (PID 8452) were still listening afterwards and were never used.
