# P-8jbf.S1 — plan: the wide-screen reader rule

Mode: `auto`. Kind `implementation`, risk `low`, the mid row.

## Goal

Build exactly the rule `intent.md`'s *Confirmed Intent* pins (read it; its *Superseded*
subsection is history): on the signed `01-reader`, for loose documents and book chapters,
at windows **≥ 1600px**:

- `--rd-measure` 36rem → **44rem**;
- each of the five text sizes ×**10/9** (15 / 16.5 / 18 / 20 / 22px → about 16.7 / 18.3 /
  20 / 22.2 / 24.4px; default 20px), and `--rd-k` ×10/9 so the column's spacing follows;
  headings, title, code/table text (`--rd-fs-s`) and the quiz follow through the existing
  calc chain;
- code, tables, figures and diagrams stay in the one column; the margin-notes rail follows;
- unchanged: below 1600px, print, the Display panel's controls, the top bar, chapter bar and
  sheets, and the review, book, book-notes, legacy html reader and archive pages.

Invent nothing visual: every value is pinned. If something cannot be built as pinned (a
value that breaks a signed element, a rail that no longer fits), stop with `escalate` or
`needs_operator`; never "improve" or restyle (RESPECT THE DESIGN).

## How (from the DECOMP's breakdown; read `topics/breakdown.md` § P-8jbf.S1 in full)

- **Set:** `web/src/app/reader.css` only — one new block near the reader root's breakpoints
  and the article's track. Read-only: `kb-print.css`, `review.css`, `book.css`,
  `legacy.css`, `reader-frame.tsx`, `annotations.tsx`.
- **Scope:** `.rd-article` (rendered only by `ReaderFrame`). Never `.rd-root`, `.rd-size-N`
  or `.rd-page` alone: the review, book, book-notes and legacy roots share them.
- **Step:** `@media screen and (min-width: 100rem)` (window width, the reader's existing
  `min-width` convention; `screen` keeps print out).
- **Gotchas:** re-declare `--rd-fs-s: calc(var(--rd-fs) * 0.8333)` in the scope (it is
  computed on `.rd-root`); restate the five steps per `.rd-size-N .rd-article { --rd-fs: …;
  --rd-k: …; }`, each the signed value ×10/9 (no self-referencing `calc`); `.an-rail` and
  `--qz-nfs` follow by themselves. Match the file's comment style: a short block comment
  naming the rule and that it supersedes nothing below the step.
- Consume the notebook's `## Notes for later slices` entry for S1 at the end
  (`--entry K --remove`).

## Verify (in a real browser; name the instrument in `result.md`)

Per `## Operator Runtime` (`docs/current/operations.md`, read that section): the dev
runtime on `:3030`, plus the production build. Wide viewports: headless Chrome
(`--window-size` for anonymous pages; CDP for a signed-in Notes-on state, minding the login
limiter of about 5 sign-ins per 15 minutes). Aside (`u1`) is fixed at 1440×900 and covers
only the 1440 check.

1. 1440 and 1599: identical to before (measure 576px, default 18px).
2. 1600, 1920, 2560: column 704px at the default, text 20px, code/table/figure/diagram
   inside the column, Notes off and on (rail beside the column, not overlapping).
3. All five sizes at 1920 on a book chapter and on a loose document with a long table, a
   code block, a figure and a diagram (`/documents/20` is short; find a longer document and
   a chapter).
4. Print from a 1920 window: unchanged from before.
5. Review, book, book-notes and legacy pages at 1920: before/after identical.
6. Gates: `pnpm --dir web lint`, `pnpm --dir web typecheck`, `pnpm --dir web build`. No new
   test (style is verified live, never by a test).

Keep before/after measurements (column x-range and computed `font-size`) in `result.md`;
screenshots go in the session scratchpad or `/tmp`-free locations outside the repo, never
committed.

## Close

- `result.md`, structured verdict block first, with `files_changed`, the instrument, and
  the measurements.
- Append one `## Doc impact` line through `phase-section` (product and qa: the reader's
  wide-screen step — ≥1600px column 44rem and text sizes ×10/9, scoped to documents and
  chapters).
- Rewrite `## Now` (≤15 lines) for the review.
- No commit, no state moves.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
