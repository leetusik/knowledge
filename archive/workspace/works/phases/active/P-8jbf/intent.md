# Intent — P-8jbf

- Captured at: 2026-10-27T13:32:37+09:00
- Origin: operator

## Original Input (verbatim)

> and I want big width when width is big. like for  a pc view

> reader, as your recommendation, small phase. /create-phase and /do-whole-phase rightaway

## Confirmed Intent (refined + clarified)

On a PC-width screen the reader should use more of the width instead of leaving most of the
screen empty. Documents and book chapters open in the signed `01-reader`
(`web/src/app/reader.css`): one 36rem (576px) column for text, code, tables and figures, and
18px Literata text in five reader-chosen sizes. On a 1920px screen the rest is empty paper.

**Re-targeted after OQ1** (the first rule, below under *Superseded*, described the console
`.kb-doc` view, which now renders only an unlinked archive page). The operator accepted, in
their words "as your recommendation", this rule:

- **Where:** the reader, for loose documents **and** book chapters (one reader, one rule).
- **When:** only above **1600px** (100rem) of window width.
- **One wider column:** the reader's column (`--rd-measure`) grows from **36rem to 44rem**
  (576 → 704px).
- **Text one step larger:** every one of the five text sizes ×10/9, so the default reads at
  **20px** instead of 18px (the steps become about 16.7 / 18.3 / 20 / 22.2 / 24.4px). The
  column's spacing, headings, the title and the code/table text follow, as the reader already
  computes them from the text size. About 71 characters per line at the default.
- **Code, tables, figures and diagrams stay in the column**: the signed one-column rule holds;
  they simply get the wider column. The margin-notes rail follows the column.
- **Unchanged:** everything below 1600px, print, the Display panel's controls, the top and
  chapter bars, and the review, book, book-notes, legacy html reader and archive pages.
- **Not chosen:** the very-wide second step (≈2200px+), breaking code and tables out of the
  column (needs a design round on `01-reader`), widening without larger text, and the literal
  first rule.

### Superseded (the first confirmed rule, kept for the record)

Written against the console document view (`kb-docview.css`): above ~1600px the article grows
from 64rem toward 88rem, paragraph text 42rem → 50rem, body text 16px → 18px, phone, tablet,
laptop and print unchanged. P-8jbf.DECOMP found that view now renders only
`/documents/{id}/versions/{v}`, which nothing links to (OQ1, `topics/reader-surface.md`).

## Clarifications Resolved

- Q: Which surfaces? — A: the reader.
- Q: How wide should text go: a wide page with moderately wider text, true full width, or a toggle? — A: the recommendation (wide page, text 42→~50rem with slightly bigger body text).
- Q: A design round with a canvas, or a small phase with the rule decided in words? — A: a small phase. Not a design phase: the operator decided the visual rule here in words and declined a design round, so there is no co-work slice and no canvas; the build implements exactly the rule above.
- Q: Start now? — A: yes, create and run `/do-whole-phase` right away.
- Q (OQ1, P-8jbf.DECOMP): the rule targets the archive-only `.kb-doc` view; re-target it to the reader where documents and chapters open — the recommendation (column 36→44rem, text one step larger, 18→20px default, blocks stay in the column, above 1600px), the recommendation plus a very-wide second step, a code/table breakout (design round), or widen-only? — A (verbatim): "as your recommendation" — the recommendation, without the second step.

## Notes

- The reader: `--rd-measure: 36rem` (`web/src/app/reader.css:142`), the `.rd-flow` grid
  (`:359-366`), the five sizes `.rd-size-1..5` (`:165-169`), the margin-notes rail `.an-rail`.
  Print (`kb-print.css`) sets `.rd-flow` to block and must not change. Detail and evidence:
  `topics/reader-surface.md`.
- (First pass, superseded) the console tokens `--kb-measure` 42rem, `--kb-app-read-w` 64rem,
  `--kb-app-max-w` 88rem in `kb-tokens.css`; untouched by this phase.
