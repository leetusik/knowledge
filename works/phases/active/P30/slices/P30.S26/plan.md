# P30.S26 — Print (`09-legacy-and-print`)

## Goal

Build the round's print sections:
- *Print: the native sheet*, which is the reader's print stylesheet, extending `kb-print.css`: the
  masthead (page 1 only), figure rows, diagrams, the quiz on paper, the answer key, the colophon, and the
  page breaks;
- *The legacy Print control*;
- *⌘P on the legacy reader: the one notice sheet*.

`print-blocks.tsx` and `export-pdf-button.tsx` retire from the legacy path.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/09-legacy-and-print/rounds/01-legacy-and-print/build-prompt.md`: the print sections, *Tokens*, *Additions to signed parts*, and the strings;
  - the canvas's print boards.
- Code: `kb-print.css` and its current scope (P28's `@page` print box), `print-blocks.tsx`,
  `export-pdf-button.tsx`, and S25's legacy reader.
- `topics/notes-later.md`: the reader, figure, diagram and quiz notes (each slice's print CSS was
  transcribed but not printed).

## Approach

- The print stylesheet applies to the native reader. Hide the chrome, and lay out the masthead, figures,
  diagrams (no scroll boxes on paper; fit or break as signed), the quiz on paper with an answer key at the
  end, the colophon, and the page breaks.
- The legacy reader: the Print control prints the explainer as the prompt says. ⌘P shows the one notice
  sheet instead of printing the chrome.
- Retire `print-blocks.tsx` and `export-pdf-button.tsx` from the legacy path. Grep their imports, and keep
  anything still used elsewhere.

## Live check (in addition to the rules)

Print to PDF with headless Chrome (`--print-to-pdf` or CDP `Page.printToPDF`) for:
- the fixture book's `all-blocks` chapter;
- the KO chapter;
- a legacy explainer, through its control.

Inspect the PDFs' pages by rendering them to PNG, and compare against the print boards. Then check that
⌘P on legacy shows the notice sheet.

## Dispatch

slice=P30.S26
phase=P30
kind=implementation
risk=low
attempt=1
route=mid
reason=kind implementation rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
