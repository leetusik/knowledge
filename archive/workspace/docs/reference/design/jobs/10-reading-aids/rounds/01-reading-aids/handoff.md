# Handoff — 10-reading-aids / 01-reading-aids (P39-hk.D1)

brief: waves/P39-hk.D1/brief.md

new visual direction: no

critique: critic

## Scope boundary

This job draws the **reading aids inside the chapter view**, one connected group:

1. the **term marker** in running text and its **definition window** (hover and focus on desktop, tap on a
   phone, keyboard, Esc; short definition → the longer one; a link to the glossary section);
2. the **glossary section** of the chapter, the window's link target;
3. the **inline formula** in a sentence;
4. the **display formula block** with its plain-words reading and "where" legend;
5. the **print form** of each: the glossary as an appendix, the marker on paper, both formulas on paper.

**Entry Page:** `Main.dc.html`, a chapter excerpt that reaches every page: reading a term, the formulas,
print.

**Not this slice:**
- the explain skill's confirmation (terminal text, no UI);
- the Hermes chat panel beside the reader (P36-1s, its own branch and canvas);
- the annotation popover and highlights (signed job `05-annotations`). It is drawn here only where a term
  meets a highlight, and is never changed;
- the chapter's other blocks (callouts, diagrams, figures, quiz, sources: signed jobs 02–04), shown only as
  they are, around the new aids.

## Pages

- **`terms` → `Terms.dc.html`.** A chapter section in the reading column with marked terms, and the
  glossary section. Screens × states, each with its check:
  - *rest*: a paragraph with 3–4 marked terms. Check: the marker reads as "has a definition" without shouting;
    it is not the link colour alone and is told apart from a plain link and from a highlight;
  - *hover open* (desktop): the window beside the term. Check: the short definition and the term are readable
    at once; the window never covers the term; nothing jumps;
  - *focus open* (keyboard): the same window from Tab + Enter. Check: the focus ring is visible on the term;
    Esc closes it and focus returns to the term;
  - *longer open*: the longer definition shown. Check: it opens in place or as the window grows, never as a
    new page; it can be closed back to short;
  - *no longer definition*: a term with only the short one. Check: no dead control;
  - *edge*: a term at the right edge of the column and at the bottom of the screen. Check: the window flips
    or shifts and stays fully on screen;
  - *phone tap* (390 and 320): the window's phone form. Check: thumb reach; one tap opens it, one clear way
    closes it; the text stays ≥ the body size; targets ≥ 44 px;
  - *term in a highlight*: a marked term inside an annotated passage. Check: both read; the term's window and
    the annotation popover never open together;
  - *Korean chapter*: the same window with a Korean term and definition. Check: Pretendard, `keep-all`, no
    awkward breaks;
  - *glossary section*: every term of the chapter (about 12), each with its aliases, short and longer
    definition. Check: scannable; reached from a window's link, the target entry is shown (scrolled to and
    marked) and there is a way back to where the reader was;
  - *dark*: rest, open and glossary in dark. Check: contrast measured.
  - Item it takes: a chapter (its terms and their definitions). Leads to: the glossary section (in-page),
    `formulas` (a legend symbol that is a term, if the frame answers that way: open question 4), `print`.
- **`formulas` → `Formulas.dc.html`.** A chapter section with formulas. Screens × states:
  - *inline*: "computes s = mean ÷ sd and t = s × √n" set as inline math in the sentence. Check: it sits on
    the line without changing the line height badly; it is not smaller than the text;
  - *display block*: t = s × √n as a display formula with its plain-words reading ("t grows with the square
    root of the number of events") and its "where" legend (t, s, n, mean, sd, each in plain words). Check: a
    newcomer can read the formula through the legend without a second source; the legend's symbols match the
    formula's set exactly;
  - *a larger formula*: the participation ratio N = (Σe)² ÷ Σe² as a display block with reading and legend.
    Check: fraction, sums and superscripts are typeset, not typed;
  - *long formula on a 320 px phone*. Check: nothing is cut off and the page never scrolls sideways (the
    block itself may, if the frame says so);
  - *formula with a term in its legend* (e.g. "eigenvalue"). Check: it behaves like a term in the text, if the
    frame answers that way;
  - *dark* and *focus* (if the block has any control). Check: contrast measured; the reading is reachable by
    a screen reader.
  - Item it takes: a chapter's formulas. Leads to: `terms` (a legend term), `print`.
- **`print` → `Print.dc.html`.** The same chapter on paper (A4 and letter). Screens × states:
  - *a page of text* with marked terms and an inline formula. Check: the marker on paper is quiet and the text
    reads as plain prose; no window, no control;
  - *a display formula on paper* with its reading and legend. Check: legible at print size (body ≥ 12 pt); no
    break between a formula and its legend;
  - *the glossary appendix*: every term on paper, after the chapter's body, with the quiz's paper form as the
    precedent. Check: it reads as a reference list; long definitions included.
  - Item it takes: a chapter. Leads to: nothing (paper).

## Every link has a target in scope

- A window's "in the glossary" link goes to that term's entry in the glossary section, on the same page.
- The glossary entry's way back goes to where the reader was (the term's place in the text).
- The entry Page links to `terms`, `formulas` and `print` (real links, wired by the join).
- A link in the chapter excerpt that goes outside this job (another chapter, a source) is drawn as it is
  today and goes nowhere new.

## A shared choice, one answer

Answered by the repo (quoted as existing):
- **A dialog-like popover** exists once: the annotation popover (`an-box an-pop`, `role="dialog"`, an
  `aria-label`, Esc closes it), `web/src/components/reader/annotations.tsx`, signed job `05-annotations`.
- **Sheets** on the reader: `web/src/components/reader/reader-frame.tsx`, signed job `01-reader`.
- **The reading column**, its type and its hairlines: signed job `01-reader`.
- **Print:** the same DOM with `.pp-only` blocks shown only on paper, `web/src/app/kb-print.css`, signed job
  `09-legacy-and-print`; the quiz's paper form, signed job `04-quiz`.
- **A collapsed callout** for a primer: the `DEFINITION` callout, `web/src/lib/native/render.tsx`, signed job
  `02-figures`.

Not answered by the repo (the frame pass gives each one answer, before any page is drawn): the marker's
look; the window's desktop form and its phone form; how the longer definition opens; the math typeface and
the formula's size relative to the text; the legend's layout; the glossary's place and order.

## Alignment

Every button, text and box on every page, measured, as the shipped standard says.

## Job data

The shared data in the brief: the passages, the terms and the formulas from "Our bar: performance rule v1".
Write each term's short definition (about 40 words) and a longer one for about half of them, in plain words,
from those passages. A fact the passages do not give stays a visible placeholder.

## Open questions, posed back (only the operator's words settle them)

1. **Glossary order:** alphabetical, or in the order terms first appear in the chapter?
2. **Glossary place:** where it sits in the chapter, given that the quiz and sources close every chapter.
3. **The window on a phone:** the same small window, or a sheet from the bottom?
4. **A symbol in a "where" legend that is also a glossary term:** linked like a term in the text, or plain?
5. **The marker on a term the reader has already opened:** unchanged, or quieter after the first look?

## The required output

The joined canvas tree passing `design-check 10-reading-aids`, and one round `result.md` (the join's): the
verdict block with `open_items:`, a `## Summary` of 1 KB or less (what was drawn, departures, open items with
IDs) and a `## Build` complete enough to build from without inventing anything. The frame and each page
leave their own files under the round.
