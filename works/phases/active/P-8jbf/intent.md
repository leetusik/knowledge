# Intent — P-8jbf

- Captured at: 2026-10-27T13:32:37+09:00
- Origin: operator

## Original Input (verbatim)

> and I want big width when width is big. like for  a pc view

> reader, as your recommendation, small phase. /create-phase and /do-whole-phase rightaway

## Confirmed Intent (refined + clarified)

On a PC-width screen the document reader should use the width instead of leaving most of
the screen empty. Today, on a 1920px screen, paragraph text stops at 42rem (~670px) and
code, figures and tables at the article's 64rem (~1020px), and the rest is margin; even
full view keeps text at 42rem.

The operator accepted this rule, in their words "as your recommendation":

- **Where:** the document reader only (the document view and its full view). Not the
  library or other pages.
- **When:** on wide screens only, above about **1600px** (100rem) of app width.
- **The article** (the document's header and metadata, code, figures, diagrams, tables, the
  explainer frame) grows from **64rem** toward the app's **88rem** maximum.
- **Paragraph text** (the reading column) grows from **42rem to 50rem**, and the reader's
  body text goes from 16px to **18px** (1.125rem), so the column is physically much wider
  while a line still holds a comfortable number of characters. Headings keep their own
  scale.
- **Unchanged:** phone, tablet and laptop widths (below the 1600px step), and print.

This supersedes, for wide screens only, design round 06's signed reading-column decision
(the 42rem measure, "DECISION · question 1" in `web/src/app/kb-docview.css`); below the step
that decision stands as signed.

## Clarifications Resolved

- Q: Which surfaces? — A: the reader.
- Q: How wide should text go: a wide page with moderately wider text, true full width, or a toggle? — A: the recommendation (wide page, text 42→~50rem with slightly bigger body text).
- Q: A design round with a canvas, or a small phase with the rule decided in words? — A: a small phase. Not a design phase: the operator decided the visual rule here in words and declined a design round, so there is no co-work slice and no canvas; the build implements exactly the rule above.
- Q: Start now? — A: yes, create and run `/do-whole-phase` right away.

## Notes

- Current tokens: `--kb-measure: 42rem` (`web/src/app/kb-tokens.css:66`), `--kb-app-read-w: 64rem`
  (`:94`), `--kb-app-max-w: 88rem` (`:216`); the reading grid is `.kb-prose` in
  `web/src/app/kb-docview.css`, full view is `.kb-app[data-kb-view="full"]` there. Print
  (`kb-print.css`) reads the measure and must not change.
- "About 1600px", "about 50rem" and "about 18px" were the recommendation's words; the values
  above pin them so nothing is invented in the build.
