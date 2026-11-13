# P-8jbf breakdown

## Passes

- DECOMP (pass 1): halted `needs_operator` on OQ1, with nothing cut. The first rule targeted
  the console `.kb-doc` view, which renders only the unlinked archive page
  `/documents/{id}/versions/{v}`. Evidence: [reader-surface.md](reader-surface.md).
- DECOMP (pass 1 re-run, after OQ1 "as your recommendation"): cut **one implementation
  slice**, `P-8jbf.S1`, then `P-8jbf.REVIEW`. There is no research slice, no `DECOMP2` and no
  `co-work` slice: this is not a design phase, and the operator decided the rule in words.

## Estimate

Times come from `dispatch-summary`'s `means` (metered span time):

- `P-8jbf.S1` (implementation, mid row): 28.9 span-minutes per slice by the kind mean. The
  mid row's mean is 20.6 minutes per span.
- `P-8jbf.REVIEW`: 369.5 span-minutes per slice by the kind mean. That mean is skewed by
  large phases; a one-file CSS phase should land well below it.
- Total by the means: about 400 span-minutes after this decomposition. No slice spends money.

## Join-rebuilt artifact

None.

## P-8jbf.S1

- **Goal:** build the wide-screen rule exactly as `intent.md`'s Confirmed Intent pins it, in
  the signed `01-reader`, for loose documents and book chapters. Above 1600px of window width:
  - `--rd-measure` goes from 36rem to **44rem**.
  - Each of the five text sizes is multiplied by **10/9**: 15 / 16.5 / 18 / 20 / 22px become
    about 16.7 / 18.3 / 20 / 22.2 / 24.4px, so the default reads at 20px. `--rd-k` gets the
    same ×10/9, so the column's spacing follows. Headings, the title, code and table text
    (`--rd-fs-s`) and the quiz (`--qz-nfs`) follow through the reader's existing calc chain.
  - Code, tables, figures and diagrams stay in the one column.
  - The margin-notes rail `.an-rail` follows the column.
  - Unchanged: everything below the step, print, the Display panel's controls, the top bar,
    the chapter bar, the sheets, and the review, book, book-notes, legacy html reader and
    archive pages.
- **Set** (the only file it may edit): `web/src/app/reader.css`, as one new block near the
  reader root's breakpoints and the article's track. It reads, without editing:
  `kb-print.css`, `review.css`, `book.css`, `legacy.css`, `reader-frame.tsx` and
  `annotations.tsx`.
- **Scope:** `.rd-article`. Only `ReaderFrame` renders it (`reader-frame.tsx:592`); it holds
  the document or chapter, its loading, not-found and failed states (`ReaderStateBlock` renders
  inside `ReaderFrame`), and the notes rail (`annotations.tsx:330, 541`).
  - Never scope to `.rd-root`, `.rd-size-N` or `.rd-page`. Other roots carry them too: the
    review page (`rd-root rd-size-N`, `.rd-page.rd-flow.rv-page`), the book page
    (`rd-root rd-size-3 bk-page`), book notes (`rd-root`, `.an-page__main` reads
    `--rd-measure`) and the legacy reader (`rd-root rd-size-3 lg-page`).
  - The top bar, the chapter bar, the sheets and the Display panel all sit outside
    `.rd-article`, so they stay unchanged without any extra rule.
- **Step:** `@media screen and (min-width: 100rem)`.
  - It measures the window: the intent's "window width", and the form of every other reader
    step (40rem and 90rem are `min-width` viewport media, `reader.css:172-173`).
  - "Above 1600px" therefore reads as ≥ 1600px: 1599px stays unchanged and 1600px is wide.
  - `screen` keeps print out by construction. `kb-print.css` also sets `.rd-flow` to block.
- **Gotchas:**
  - A custom property is computed where it is declared, so `--rd-fs-s`, declared on
    `.rd-root` (`reader.css:141`), would arrive in the article already computed at the
    unscaled size. Re-declare it in the scope:
    `--rd-fs-s: calc(var(--rd-fs) * 0.8333)`.
  - `--rd-fs: calc(var(--rd-fs) * …)` is a cycle. Restate the five steps instead
    (`.rd-size-N .rd-article { --rd-fs: …; --rd-k: …; }`), each value the signed one ×10/9.
  - `--qz-nfs` is declared on `.kb-ch .qz`, inside the article, so it follows by itself.
  - At every step the column holds 10% more em than it does today
    (44/36 × 9/10 = 1.1), so no em-based layout gets less room than at today's same size.
  - Rail fit at 1600px: the rail runs from 1176px to 1432px.
- **Verification:**
  - Run in a real browser on the `## Operator Runtime` dev runtime `:3030`, then
    `pnpm --dir web build`, the production build check, since CSS can drift there.
  - The instrument for wide viewports is headless Chrome. Use `--window-size` screenshots for
    anonymous pages (proven at 1920 in pass 1). Use CDP for signed-in states (Notes on); mind
    the login limiter of about 5 sign-ins per 15 minutes.
  - Aside (`u1`) is fixed at 1440×900, so it covers only the 1440 check.
  - Check at 1440 (unchanged), 1599 (unchanged), 1600 (wide), 1920 and 2560, with Notes off
    and on.
  - Check all five text sizes at 1920, on both a book chapter and a loose document.
  - Include a long table, a code block, a figure and a diagram.
  - Print from a 1920 window and confirm nothing moved.
  - Take before and after screenshots of the review, book, book-notes and legacy pages at
    1920 and confirm they are identical.
  - Gates: `pnpm --dir web lint`, `typecheck`, `build`. Write no new test (CLAUDE.md: never
    for style).
  - A public loose document for anonymous checks: `/documents/20` →
    `/@p28s2/research/focus-ring-floor-and-touch-targets`, which is short; find a longer one
    and a chapter.
- **Risk:** `low` (the mid row). There is no named trigger: the change is CSS only, in one
  file, with pinned values and no persisted state. The shared `.rd-root` is not a wide blast
  radius once the rule is scoped to `.rd-article`, which only `ReaderFrame` renders.
- **spends money:** no
- **Depends on:** none
