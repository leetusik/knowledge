status: done
pass: page formulas
job: 10-reading-aids
round: 01-reading-aids
boards: Formulas.dc.html (Page — Formulas in a chapter; 1440 × 2680, fill, interactive)
frame_gaps:
- formulas-FG1 `on-open-print` (F15) has no control to emit it: the signed native reader prints by ⌘P with no button (09-legacy-and-print), so none is drawn; answer drawn: the page emits no print event, the join's foot strip reaches `print`.
- formulas-FG2 how a Page shows a phone width on the desktop canvas: answer drawn: the phone presets put the same page in a 390 × 844 and a 320 × 568 viewport box (a hairline edge, no device chrome; canvas-only), so the sheet docks at that viewport's bottom and F4's scroll-the-term-above-the-sheet happens inside it.
- formulas-FG3 the sheet's dock on canvas: `.rd-frame` is a size container (layout containment), so `position: fixed` inside it acts as absolute; answer drawn: a zero-height `position: sticky; bottom: 0` dock at the frame's end holds the sheet (canvas-only); the build keeps F4's fixed sheet.
events:
- on-open-terms { term } — "In the glossary →" in the window or sheet of any legend term or marked term; alone (no handler) the link is `href="#to:terms"` for the join to wire.
component_gaps:
- formulas: none new. The frame's logged gaps show here too: the Shell's language switch (signed 01-reader) pressed fill 1.24:1 light, 1.47:1 dark (non-text-contrast); the Shell's top bar overflows to 422 px and the language switch overprints the back link at 390 px with 200 % text (reflow, overprint; seen on the PNG). Both are the signed top bar, copied unchanged by the frame: logged, not restyled.
open_items:
- formulas-OQ4 a legend symbol that is a glossary term: drawn linked like a term in the text (frame OQ4, the operator's)
- formulas-A1 the window with the longer definition open: near-edge 2.9 px between its body and foot (frame-A1, inside the frame's `Gloss`)
- formulas-T1 Tab order inside the window is Close → Read more → In the glossary (the frame's `Gloss` DOM order); F3 says Read more → In the glossary → Close. For the join or the frame to settle; the page did not edit `Gloss`.
- formulas-S1 self-check ends `fail` only on the signed Shell lines above (non-text-contrast ×2, reflow, overprint); every line in the page's own markup is fixed or logged.
- formulas-C07..C10 (critique-01, frame parts): MathBlock legend columns on three edges (C07), stepped rows with no gap (C08), display 27 px vs signed h2 26.1 px (C09), the inline `(Σe)² ÷ Σe²` snippet's spacing (C10); for the frame or the join to settle.
- formulas-C11 (critique-01, advisory, the operator's): the lead-in "With the thirty events above:" sits boxed between two formula rules.

## Summary

One Page, `Formulas.dc.html`: the reader's top bar over a chapter excerpt of "Our bar: performance rule v1" in
three sections (Scoring a run, Counting the trials, When nothing happens), each a paragraph with inline math and its
display block from the frame's `MathBlock`: t = s × √n, the worked example in steps, the participation ratio,
Poisson. Legend terms and one marked term in the text open the frame's `Gloss` window (desktop: below the term, its
left edge on the term's, never past the column, above when short of room; hover 250 ms, click, Enter/Space, Esc,
click outside, Tab out) or its sheet under 40rem; "In the glossary →" emits `on-open-terms {term}`. State bar: Rest,
Legend term open, Read more open, Korean, Dark, Dark · term open, Phone 390, Phone 390 · term open, Phone 320 · long
formula. Departure: the worked example is set in steps (F7), not on one line. Frame gaps FG1–FG3; open OQ4, A1, T1,
S1, C07–C11. Critique 01: C01, C02 fixed.

## Build (the formulas page's fragment)

Canvas-only, never built: the state bar (`data-proto="state-bar"`), the phone viewport boxes (`.fm-stage--phone`,
`.fm-box--390/320`, `--fm-vh`), the sticky zero-height sheet dock (`.fm-dock`, `.fm-sheet`), `bare` mounts and the
hrefless `role="button"` markers (the build's markers link `#gl-<id>`, F2).

- **Where:** inside the chapter's prose (`.rd-article.rd-flow.rd-prose`), as built; nothing new around it.
- **Inline formula:** `math.ra-m` in the sentence (F7), `alttext` in the chapter's language; the six snippets of F12
  (`s = mean ÷ sd`, `t = s × √n`, `t ≈ 2.19`, `(Σe)² ÷ Σe²`, `e`, `λ = rate × time`, `e^(−λ)`).
- **Display block:** `figure.ra-mb` (F7) after the paragraph that introduces it: `tstat` (steps), `worked` (four
  steps aligned on the relation: =, =, ≈, ≈), `participation` (one fraction with sums and powers), `poisson` (two
  relations). Reading, "where", legend from the formula's data (`{ id, alt, read, legend }` per language).
- **Legend term:** a `.ra-term` in the legend's meaning, `aria-haspopup="dialog"`, `aria-expanded`; it behaves as a
  term in the text (F2, F3): hover intent 250 ms in / 200 ms out (mouse only, container ≥ 40rem), click/tap/Enter/
  Space opens and moves focus into the window, Esc and Close return focus to the term, a click outside closes, Tab
  past the last control closes and continues in the text, Shift+Tab from the first closes back to the term. One
  window at a time across text and legends.
- **Window placement (F3):** absolute in the reader frame; left = the term's first line's left, shifted left to end
  on the column's right edge; top = the term's last line + `kb-space-xs`; above the term (anchored by its bottom, so
  the longer definition grows upward) when the room below in the visible area is short and the room above under the
  top bar is enough. Placed hidden (`data-placed="0"`), then shown.
- **Sheet (F4):** under 40rem, fixed to the bottom; on open the page scrolls the term to `16px` above the sheet's top.
- **"In the glossary →":** `href="#gl-<id>"` in the build (the glossary is in the chapter); on the canvas it emits
  `on-open-terms {term}`.
- **Tokens:** kb-* and the frame's (`--ra-*`); no new values.

## Intent

- **formulas:** the operator, mid-chapter in "Our bar: performance rule v1", reaches "t = s × √n"; they came to read
  the formula as an idea, not a string of symbols; first they must see the formula set well, then the one plain
  sentence that says what it does, then each symbol in words.

## Plan

One Page, `Formulas.dc.html` (PAGE, interactive, 1440 wide): the reader's top bar (`Shell`, bare) over a chapter
excerpt in the reading column, three short sections, each a paragraph with inline math and its display block
(`MathBlock`). Legend terms (and one marked term in the prose) open the frame's window (`Gloss form="window"`) on
desktop and its sheet (`form="sheet"`) under 40rem. No page-local components: every part is the frame's.

- Type steps: the reader's (18 px text, 15 px small, h2 1.45em), display math 27 px, legend symbol 18 px math.
- Space: kb-space steps × `--rd-k`, as the frame's classes set them; the page adds none inside the column.
- Colour: ink on surface; accent only for an open term, links and focus; dark from the same tokens.
- The one bold move is the frame's: the display formula set large, read through one sentence and a legend.

Layout (desktop): everything on the column's two edges (36rem, centred); the top bar full width.

```
[state bar: Prototype only · jump to a state: | Formulas  Rest  Legend term open  Read more open  Korean  ...]
[logo ‹ Our bar: performance rule v1                                   English|한국어  Display]
                 | h2 Scoring a run                                      |
                 | text … computes [s = mean ÷ sd] and [t = s × √n] …   |
                 | ───────────────────────────────────── hairline       |
                 |  s = mean/sd        (steps aligned on "=")            |
                 |  t = s × √n                                           |
                 | one plain sentence                                    |
                 | where                                                 |
                 | t    the t-statistic: …    (symbol | meaning, 1st baseline) |
                 | ─────────────────────────────────────                 |
                 | With the thirty events above:  → worked, four steps   |
                 | h2 Counting the trials … participation block           |
                 | h2 When nothing happens … poisson block                |
  window: below the legend term, its left edge on the term's, never past the column's right edge; above when short of room
```

### Plan review

- A print button for "Leads to: print" was the default: the signed native reader prints by ⌘P (09), with no
  control, so none is drawn (FG1).
- The worked example was first drawn on one line (`chain`) as the long-formula case; on desktop it overflowed the
  36rem column and scrolled, which F7 forbids for a formula of several relations ("one relation a row"). Revised to
  `worked` (steps), which fits at 320 px; the in-box scroll fallback stays on the frame's MathBlockStates board.
- Section heads were first "How the scorer reads a run" (a one-word last line at 320 px): cut to "Scoring a run".

## Data

Real: the passages and formulas of "Our bar: performance rule v1" (the brief's shared data), verbatim in English;
the frame's fixture (`RA_GLOSS`, `RA_FORMULAS`). Written for this page: the three section heads, the lead-in "With
the thirty events above:", and the Korean prose (from the frame's Korean snippets and the passages). No placeholder
needed. Nothing secret or personal.

## States reached only by interaction

Hover intent on a legend term (mouse), the focus ring on a term and on the window, Esc and focus return, Tab out of
the window, click outside, a second click on the open term closing it, a tap on another term swapping the sheet.

## Render log

- Pass 1 (Formulas, --click): every handler threw (`componentDidUpdate` gets no `prevState` in the runtime): moved to
  instance fields. Seen: the reader frame was `rd-frame rd-in`, so `display: contents` dropped its box (no surface,
  no container, the Shell showed "Book" at 1440): not yet diagnosed.
- Pass 2: handlers clean; windows did not show (the frame had no box, so the placement measured a 0 × 0 frame).
  Fixed: `rd-frame` > `rd-in`. The one-line worked example scrolled at 1440: set in steps. Phone stage's top padding
  moved the header 25 px on the phone presets: removed.
- Pass 3 (one past the two-pass budget, to verify the placement fix): windows land below their terms on the term's
  left edge; the 390 sheet docks at the viewport's bottom with the term 16 px above it; 320 steps fit; dark and
  Korean read. Content 2667 px: `h` set to 2680 after this pass (not re-rendered).
- Last line of pass 3: `self_check=fail blocking=non-text-contrast:2,reflow:1,overprint:1`, all four on the signed
  Shell (logged above).

## Measured lines (each fixed or logged as intended)

- fixed: script-error, click-error ×all (pass 1), off-centre (pass 2), page-clip (h 2600 → 2680), layout-shift of
  the header on the phone presets' top padding.
- intended: `target` ×8 on `.ra-term` (inline in a sentence or legend: WCAG 2.5.8's inline exception, frame F2);
  `label-ink` ×2 on `.ra-term` (inline text, its box is the line's); `first-line` ×3 on formula cells (rows share the
  math baseline; a fraction row is taller: frame); `tight-leading` on paragraphs with inline math (the measure reads
  the math element's box; the paragraph keeps 1.65: frame); `size-count` 7 in Read more open (12.5 and 19 px are
  MathML script sizes: frame; 26 and 27 px are the signed h2 and F9's display math, a near-miss the frame owns: C09); `layout-shift` on the phone presets and on Read more in the phone sheet (the canvas viewport box centres the page, x 0 →
  525) and on a phone term open or the 320 preset (the viewport box scrolls the term above the sheet, F4, or to the
  worked example: header y moves by scroll, not by layout).
- logged as the frame's: `near-edge` 2.9 px in the window with the longer definition (formulas-A1 = frame-A1);
  non-text-contrast, reflow, overprint on the signed Shell (component_gaps).

## Critique pass 01

Answering `pages/formulas/critique-01.md` (critic mode; nothing held for a judge). Render: one `--click` pass after
the C01 fix, one after C02 (`Formulas.dc.html` only); `design-check --page formulas` OK.

- C01 fixed: Read more in the phone sheet now re-runs F4's placement. The sheet's scroll moved into `keepTermAbove()`
  (run on open, and again when `on-toggle` opens the longer definition in sheet form, after the sheet has grown), so
  the page scrolls the term back to 16 px above the taller sheet's top, under the top bar. Seen on
  `.preview/…/pages/formulas/Formulas.frame.state-26.png` ("Phone 390 · term open > Read more"): "the per-event
  Sharpe ratio" with its open line sits above the sheet. The new `layout-shift` line on 'Read more' (header y −196 →
  −411) is that scroll, logged as intended like the other phone scrolls.
- C02 fixed: figures and units no longer part. English "+0.10&nbsp;%&nbsp;of&nbsp;K", "0.25&nbsp;%" and the unit
  phrase "in %&nbsp;of&nbsp;K" use no-break spaces; Korean "K&nbsp;대비&nbsp;+0.10&nbsp;%," and "sd&nbsp;0.25&nbsp;%인"
  are each a `.fm-keep` (`white-space: nowrap`) span, since Hangul after "%" is a break chance a no-break space does
  not close, and "K&nbsp;대비&nbsp;%로". Seen on `Formulas.frame.state-05.png` (EN) and `state-23.png` (KO): no line
  opens on "%" or "인". The build carries the same no-break joins in the chapter's text.
- C03 gap, logged (already): the signed Shell language switch, non-text-contrast; not restyled.
- C04 gap, logged (already): the signed Shell top bar, reflow and overprint at 200 % text; not restyled.
- C05 gap, logged (already, formulas-A1 = frame-A1): the frame `Gloss` near-edge 2.9 px.
- C06 gap, logged (already, formulas-T1): the frame `Gloss` Tab order against F3.
- C07 gap, logged (formulas-C07..C10): the frame `MathBlock` legend column per block; the page only mounts it.
- C08 gap, logged: the frame `MathBlock` step rows.
- C09 gap, logged: F9's 27 px display size against the signed h2 26.1 px (added to the `size-count` reason).
- C10 gap, logged: the frame's inline snippet (F12's exact markup).
- C11 advisory, left for the operator (a taste note the handoff does not put in play): logged formulas-C11.
