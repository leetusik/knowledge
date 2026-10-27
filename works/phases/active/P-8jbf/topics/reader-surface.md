# Reader surface: what P-8jbf's rule actually reaches

Written by P-8jbf.DECOMP (pass 1, halted `needs_operator`). The finding behind OQ1.

## Finding

The rule in `intent.md` was written against the console document view in
`web/src/app/kb-docview.css`: `.kb-doc` (64rem article), the `.kb-prose` grid (`--kb-measure`
42rem text track plus a full track), 16px body text, and the `?view=full` full view. Since
P30.S13 / P30.S25 the product no longer reads documents there:

- `/documents/{id}`, the pretty URL `/@{org}/{project}/{slug}` and the book chapter URL
  `/@{org}/{project}/books/{book}/{chapter}` render the **signed `01-reader`**
  (`ReaderPage` → `ReaderFrame` → `ReaderArticle`, styled by `web/src/app/reader.css`).
  An html explainer opens in the **legacy reader** (`LegacyReader`, `web/src/app/legacy.css`),
  a full-window sandboxed frame that already uses the whole width.
- `.kb-doc` / `.kb-prose` and the `?view=full` full view now render only on
  `/documents/{id}/versions/{v}` (`versions/[v]/page.tsx`), a superseded-version archive page
  nothing in the product links to (the reader's version history uses `?v=N`).

So the rule's subject and its numbers do not describe what the operator sees:

| The intent says | The reader actually has |
|---|---|
| text stops at 42rem (~670px) | one track `--rd-measure: 36rem` (576px), `reader.css:142`, `.rd-flow` `:359-366` |
| code, figures, tables stop at the article's 64rem | the same 36rem track: "one column for every block" (signed, `01-reader` round 02-revise, result.md:80-83 and departure 2, :360); wider content scrolls in its own box |
| body text 16px | Literata at `--rd-fs` 1.125rem (18px) by default, five reader-chosen sizes 15 / 16.5 / 18 / 20 / 22px (`.rd-size-1..5`, `reader.css:165-169`); "no column-width control" (`display-panel.tsx:24-25`) |
| headings keep their rem scale | headings and the title are computed from `--rd-fs` (em / calc), so they move with the text |
| the full view (`?view=full`) | the reader is already chrome-light; there is no full view on it |

Live evidence: the public fixture `/@p28s2/research/focus-ring-floor-and-touch-targets` on dev
`:3030`, headless Chrome `--window-size=1920,1080`: the column runs x=672 to x=1248 (576px,
36rem), everything else is empty paper.

## Why it cannot be built as written

Built literally, S1 would widen `.kb-doc` on the archive page and leave every document and
chapter the operator opens unchanged. Moving the rule onto the reader takes visual decisions
the operator has not made: there is no article width separate from the text column, the body
is already 18px with five user sizes, and the operator's "article grows toward 88rem" shape
needs a wide track the signed reader removed on purpose. That is a decision for the operator,
never one for the build.

## Recommendation (for the operator to confirm)

On the reader (loose documents **and** book chapters: one reader, one rule), above 1600px
(100rem) of window width (the reader fills the window, so window width = app width):

- **One wider column:** `--rd-measure` 36rem → **44rem** (576 → 704px).
- **Text one step larger:** every text size ×10/9, so the default reads at **20px** (18 → 20;
  the five steps become about 16.7 / 18.3 / 20 / 22.2 / 24.4px). The column's spacing
  (`--rd-k`), headings, the title and the column's small step for code and tables all follow,
  because the reader computes them from the text size. About 71 characters per line at the
  default, inside the 45-75 the reader's design asks for (`review.css:24`).
- **Code, tables, figures, diagrams stay in the column** (the signed one-track rule holds);
  they get the wider column with it.
- **Unchanged:** below 1600px, print (`kb-print.css` sets `.rd-flow` to block in print), the
  Display panel (each step simply reads larger above the step), the top and chapter bars, the
  review page, the book page, the book-notes page, the legacy html reader, and the archive
  page. The margin-notes rail (`.an-rail`, from rd 64rem) is placed from `--rd-measure` and
  follows the column; at 1600px it still fits (1176-1432px).

Why this one: it keeps the signed reader intact, needs no design round, stays one small
implementation slice, and visibly fills more of a big screen (text 11% larger, column 22%
wider).

## Alternatives and their tradeoffs

- **B, the accepted shape carried over:** text column to ~44rem and code, tables, figures and
  diagrams breaking out to a wide track (~64rem). Closest to what the operator accepted, but it
  reverses the signed "one column for every block" decision, and a 64rem block collides with
  the margin-notes rail when Notes is on (at 1920: block 448-1472px, rail 1336-1592px).
  Resolving that is a visual decision, so a design round on `01-reader`: not a small phase.
- **C, widen only:** column to 44rem at the same text size: about 79 characters per line, past
  the reader's 45-75. Not recommended.
- **D, literal:** apply the intent's rule to `.kb-doc`. Changes only the archive page; the
  operator would see nothing on the documents they open. Not recommended.

## Decisions to take

1. Re-target the phase from the console `.kb-doc` view to the reader (documents and chapters).
2. The recommendation above (one wider column 44rem, text one step larger, blocks stay in the
   column), or B (with a design round), or other numbers.

Decided as drawn (if 1 and the recommendation are accepted): the 1600px step on window width;
everything below it and print unchanged; the Display control unchanged in its UI; the notes
rail follows the column; review, book, book-notes, legacy and archive pages untouched.

## The cut once confirmed (provisional; the DECOMP re-run cuts it)

One implementation slice, `--risk low` (mid row): values pinned, one scoped viewport media
block in the reader's sheet. Set: `web/src/app/reader.css` only (read-only checks:
`kb-print.css`, `review.css`, `book.css`, `legacy.css`). Build gotchas:

- `--rd-measure` and `.rd-root` are shared with the review (`rv-page`), book (`bk-page`),
  book-notes (`.an-page__main`) and legacy (`lg-page`) roots: scope the override to the reader
  frame (`ReaderFrame`'s root / `.rd-page`), never to `.rd-root` alone.
- A custom property cannot reference itself (`--rd-fs: calc(var(--rd-fs) * …)` is a cycle):
  scale through a new multiplier read by the size classes, or restate the five sizes inside
  the media block.
- The reader's chrome and gutters use viewport `@media` on rem values (`reader.css:172-173`);
  `.rd-page` is the `rd` container and cannot query itself.
- Verify at 1440 (unchanged; Aside `u1` is fixed at 1440×900) and at 1920 and 2560 through
  headless Chrome `--window-size` (works on dev `:3030`, proven here), each with Notes off and
  on (the rail), a long table, a code block, a figure; plus a print check that nothing moved.

## Observation (outside the phase)

`/documents/{id}/versions/{v}` (the `.kb-doc` archive page with its `?view=full` full view)
is reachable only by an old link. Deferred-job candidate: retire it or redirect it to the
reader's `?v=N` (reason: an orphaned second document surface; trigger: next reader or
documents phase).
