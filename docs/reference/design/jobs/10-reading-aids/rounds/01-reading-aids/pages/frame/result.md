status: done
pass: frame
job: 10-reading-aids
round: 01-reading-aids
frame_gaps: none (this is the frame)
events: none (the frame emits none; the page contract is frame.md F15)
component_gaps:
- frame: the system ships no components; Shell, Gloss and MathBlock are drawn as markup from the tokens (README: "No components ship with this system").
- frame: the reader's language switch (signed 01-reader, copied into the Shell) has a pressed fill of 1.24:1 (light) and 1.47:1 (dark) against the bar, under 1.4.11's 3:1; its group border carries the boundary. Signed part: logged, not restyled.
- frame: no math face in the system; STIX Two Math (OFL) added as the math face (F8); the build self-hosts it.
open_items:
- frame-OQ1 glossary order (drawn A to Z)
- frame-OQ2 glossary place (drawn after the quiz, before the sources)
- frame-OQ3 phone form (drawn a bottom sheet, no scrim)
- frame-OQ4 legend term (drawn linked like a term in the text)
- frame-OQ5 opened term (drawn unchanged)
- frame-OQ6 paper body size: the handoff says "body ≥ 12 pt"; the signed paper body is 10.5 pt (14 px), floor 9 pt; drawn at the signed sizes, formulas at 16 pt
- frame-A1 closed: settled as F32 at the join; the follow-up's `.ra-swap` start edge cleared the GlossStates near-edge (issues=0)
- join-R1 closed: the frame boards now show F17–F33's answers (`## Follow-up pass (join-R1)`)
- frame-G1 engine (R1) must set √ with no trailing space and steps aligned on the relation, as drawn

## Summary

The frame of 10-reading-aids: `frame.md` (F1–F16), `frame.css` (the signed reader copied, five primitives, the
reading aids), the Shell (the reader's top bar as signed), and two shared components with the shared fixture:
`Gloss` (the definition window, its phone sheet, the glossary list, the paper appendix; 12 terms in English and
Korean) and `MathBlock` (the display formula: formula, plain reading, "where" legend; screen and paper; five
formulas). States boards: marker, window and sheet, glossary and paper, inline formula, display formula, Shell.
The bold move is the display formula set large in STIX Two Math, read through one plain sentence and an aligned
legend; the marker (ink text, dotted line) and the window (the annotation popover's box) stay quiet.
Departures: the logo file copied into `canvas/project/assets/` for the Shell; STIX Two Math added (no system math
face). Open: OQ1–OQ6 above, G1. Self-check pass on the last render; one signed contrast gap logged.

## Build (the frame's fragment)

Canvas-only, never built: the states boards, `.ra-board*` classes, the `bare`/`gloss-href="#top"` canvas wiring, the
hrefless `role="button"` markers on boards with no glossary, and the `.ra-m msqrt` margin (a Chromium artefact fix).

- **Tokens:** kb-* only (tokens.css). Frame tokens on `.rd-frame`: `--ra-ctl` = `kb-tap` (44 px), `--ra-win-w`
  28rem, `--ra-math-k` 1, `--ra-display-k` 1.5, `--ra-line` = `kb-secondary`; the highlight's `--an-mark/-2/-edge`
  as built; paper `--pp-*` as built in `kb-print.css`.
- **Faces:** add STIX Two Math, self-hosted, as `--font-math` ("STIX Two Math", "Cambria Math", math).
- **Term marker** (`.ra-term`, frame.md F2): `<a class="ra-term" id="tm-<id>-<n>" href="#gl-<id>"
  aria-haspopup="dialog" aria-expanded aria-controls="tw-<id>">`; dotted 0.09em `kb-secondary` underline at 0.24em
  (ko 0.28em); hover accent dots; open solid 2 px accent; system focus ring; ink dots inside `mark.an-m`; paper 1 px
  dotted `--pp-hint`. Space opens via a key handler.
- **Window** (`.ra-win`, F3, F5): annotation-popover box; head grid (names | Close), body (`.ra-def`, `.ra-def--long`
  with a top hairline), foot (`.ra-more` in `.ra-swap` with both labels, `.ra-go` link). Placement, hover intent
  (250 ms in, 200 ms out), focus, Esc and one-at-a-time rules in F3. Container ≥ 40rem.
- **Sheet** (`.ra-sheet`, F4): container < 40rem, fixed to the bottom, no scrim, 60 % / 85 % max height, body scrolls,
  44 px head and foot; page scrolls the term above it.
- **Glossary** (`.ra-gl`, `.ra-gl__item`, F6): after the quiz, before the sources, h2 "Glossary"; A–Z by
  `Intl.Collator(lang)`; `:target`/`.is-target` mark (sunken ground, inset `kb-border-strong`), focus, `fg-back`
  "‹ Back to the text" to `#tm-<id>-<n>` on the arrived entry only.
- **Inline formula** (`math.ra-m`, F7): MathML, STIX Two Math at 1em, nowrap, `alttext` in the chapter's language,
  linear forms only.
- **Display block** (`figure.ra-mb`, F7): hairline band; `.ra-mb__eq` (the formula at 1.5×, left edge; steps as
  `.ra-steps__grid` rows aligned on the relation; overflow scrolls inside with a 2.5rem mask fade and becomes a
  focusable region); `figcaption.ra-mb__cap` with `.ra-mb__read`, `.ra-mb__where`, `dl.ra-legend` (symbol | meaning,
  first baselines shared; legend terms are `.ra-term`).
- **Paper** (`.ra-paper`, F10): formula 16 pt, reading and legend 10.5 pt, "where" 9 pt, band `break-inside: avoid`;
  appendix entries `.ra-pgl` whole, longer definitions included.
- **Shell:** the reader's top bar unchanged (01-reader); nothing new to build.
- **Data shapes:** term `{ id, term, alias[], short, long? }` per language, `short` and `long` runs of text, kept
  text (one unbreakable run, F22/F23: `.ra-keep { white-space: nowrap }`) and inline math (F31); a hyphenated term
  title kept whole; formula `{ id, alt, read, legend: [{ sym, runs: [text | kept text | {term id, text}] }] }` per
  language (`read` runs too), the MathML itself language-free.
- **Settled at the join (frame.md F17–F33), in frame.css:** `.ra-gl` opening hairline only for the list alone (F17);
  `.ra-gl__item::after` divider on the column, only the target ground bleeds (F25); `.ra-legend` symbol column
  `minmax(max-content, min(calc(var(--rd-fs) * 5.25), 28%))`, paper `5.25em` (F27); `.ra-swap > * { text-align:
  start }` (F32); `(Σe)²` as F24's markup.

## Intent (the frame draws no Page; these are the three pages it serves)

- **terms:** the operator, mid-chapter in a hard explain document, meets "deflated Sharpe ratio (DSR)"; they came to
  understand the sentence without leaving it; first they must see the term's plain-words definition beside it.
- **formulas:** the same reader at "t = s × √n"; they came to read the formula as an idea; first they must see the
  formula set well, then what it says in words.
- **print:** the same chapter on paper; they came to read it away from the screen; first the prose, quiet, with the
  glossary at the back as a reference list.

## Plan

Shared parts, all on kb tokens and the signed reader (`01-reader`, `05-annotations`, `09-legacy-and-print`):
`frame.css` (the reader subset, the reading faces, five primitives, the reading-aid classes), `Shell.dc.html`,
`Gloss.dc.html` (four forms over the 12-term fixture), `MathBlock.dc.html` (five formulas, screen and paper), and the
states boards. Type steps: reading 18 px, small 15 px, interface 15 / 13 px, display formula 27 px, window term 18 px
Fraunces. Space: kb-space steps scaled by `--rd-k`. Colour: ink and secondary text, `kb-border` hairlines,
`kb-border-strong` for the window's edge, accent only for the open term, links and focus.

```
Window: [Term (Fraunces)            Close]   one centre line
        [Also called DSR                 ]
        [short definition, text size     ]
        [-- hairline --; longer          ]
        [Read more        In the glossary →]
Sheet (< 40rem): same parts, 44 px head and foot, from the bottom, no scrim
Display block (column, one left edge):
  ---------------------------------------- hairline
  s = mean/sd        rows aligned at "="
  t = s × √n
  one plain sentence
  where
  t     meaning        symbol | meaning, first baselines shared
  ---------------------------------------- hairline
Glossary entry: term / Also called / short / longer / ‹ Back to the text (arrived entry only)
```

### Plan review

- A sunken well around every formula was the default "card" look: revised to the reader's unboxed hairline band.
- A centred display formula aligned with nothing: revised to the column's left edge (formula, reading, legend share it).
- The window at 16 px: revised to the reader's text size everywhere (the handoff's "≥ the body size").
- A scrim under the phone sheet (the reader's sheets have one): revised to none, so the term stays readable (OQ3).

## Data

Real: the passages, terms and formulas of "Our bar: performance rule v1" from the brief (the operator's document);
the reader's copy ("Back to the text", Sources) from `web/src/content/chapter.ts`. Written for this job from those
passages: 12 short definitions (about 40 words), 7 longer ones, all in English and Korean; the readings and legends.
Placeholders: `[DSR BAR]`, `[TUNING WINDOW]`, `[TEST WINDOW]`, `[DRAWDOWN LIMIT]`, `[HAIRCUT]` and their Korean
forms. Nothing secret or personal.

## States reached only by interaction

The marker's hover (accent dots) and focus (system ring), the window's hover-intent open and close, Esc and focus
return, the sheet's scroll-into-view, the glossary's scroll and focus on arrival: the pages draw them on their
interactive Pages; the states boards show rest and open by `aria-expanded`, never restyled.

## Render log

- Pass 1 (all 9 boards): MathML renders through the runtime, but a `{{hole}}` inside a MathML element renders empty
  (the legend's symbols vanished): rebuilt the legend symbols as literal MathML picked by flags. Fixed frame clips
  (board heights), the window's term/Close centre line, the foot's 1 px edges (a button's transparent border), the
  link's line height, entries' padding into the gutter.
- A temporary probe board (removed) measured Literata vs STIX Two Math (caps 66.2 vs 65.7, x-height 44.9 vs 47.3 per
  100 px): inline math set to 1em; and found Chromium leaves 0.38em after `msqrt` in STIX: cancelled on canvas only.
- Pass 2 (all 9): Chromium's MathML table ignored cell alignment, so steps did not align on "=": rebuilt as a grid
  of math cells. Readings reworded to plain words (no raw "t ≈ 2.19"). Targeted re-renders of MathBlockStates,
  MathBlock and MarkStates confirmed the steps align and the paper formula sits on the left edge. One more render
  than the two-pass budget, to verify the rebuilt formula layout.
- Tool note: `design-preview` crashes writing `preview.json` when an issue line's excerpt splits a non-BMP math
  italic (𝑠); run with `PYTHONIOENCODING=utf-8:backslashreplace` for stdout, and the excerpt still must not reach
  preview.json. Worth an engine fix.
- Last line: `self_check=pass blocking=none`. The Shell's language switch line (non-text-contrast, signed part) was
  named in pass 2 and is logged as a component gap above.

## Measured lines (each fixed or logged as intended)

- fixed: frame-clip ×5, beside-control (window term vs Close), near-edge ×5 (foot 1 px), cramped-padding (paper
  band, glossary item), straggler (paper text-wrap), the MathML table near-edge.
- intended: `target` on `.ra-term` (an inline target in a sentence, WCAG 2.5.8's inline exception; the tool exempts
  only `href` links, and boards without a glossary draw the marker hrefless). `label-ink` on `.ra-term` (inline text,
  not a control label: its box is the line's). `first-line` on formula cells (rows share the math baseline on
  purpose; a fraction row is taller). `size-count` and `tiny-text` on MathBlockStates (math script sizes come from
  MathML's script level: subscripts at 0.71 of their base, 9.8 px under a 14 px paper symbol). `tight-leading` on
  inline-math paragraphs (the measure reads the math element's own box; the paragraph keeps 1.65). `cramped-padding`
  on `mark.an-m` (the signed highlight has no padding by design). `straggler` on a states-board sample at 320 px.
- open: GlossStates near-edge 2.9 px (the sheet with the longer definition open: its body and foot boxes) remains
  after pass 2; not diagnosed within the render budget (frame-A1). The page passes' renders will show it again.

## Follow-up pass (join-R1)

Dispatch: bring the frame files in line with the settled ledger (F17, F22–F25, F27, F31, F32), nothing else.

- **frame.css:** `.ra-keep` (F22, F23); `.ra-swap > *` start edge (F32); `.ra-gl__item` divider moved to a
  column-wide `::after`, the item still bleeding for the target ground (F25); a comment on `.ra-gl`'s opening line
  (F17: kept, since the Components board is the list without its h2; the chapter drops it, as Terms does);
  `.ra-legend` one symbol column, screen bounded as on Formulas, paper `5.25em` (F27). The pages' own identical rules
  stay; they now restate the frame.
- **Gloss.dc.html:** `short` / `long` are runs: text, `{kept}` runs (t-statistic, t-통계량으로, CONDITIONAL-GO’s /
  CONDITIONAL-GO의, out-of-sample, look-ahead; every share: `% of K`, `+0.10 % of K`, `0.25 %`, `[DRAWDOWN LIMIT] of
  K`, `K 대비 %로`, `K 대비 +0.10 %,` / `%는`, `sd 0.25 %인`, `0.1 %만큼`, `K의 [낙폭 한도]입니다.`) and `⟨s⟩`, the
  `sharpe` longer definition's `s = mean ÷ sd` as inline MathML (en and ko alttext; literal MathML picked by a flag,
  since a hole inside MathML renders empty) (F31). Term titles keep a hyphenated word whole (F22).
- **MathBlock.dc.html:** the readings are runs; the worked reading keeps `+0.10 % of K`, `0.25 %`, `t-statistic` /
  `K 대비 +0.10 %,`, `흔들림 0.25 %인`, `t-통계량은`; legend shares joined to their K by no-break spaces or kept;
  a hyphenated legend term takes `ra-keep` (F22, F23). Symbol column from frame.css (F27).
- **MathInlineStates.dc.html:** `(Σe)²` as F24's markup; shares and CONDITIONAL-GO’s kept (F22, F23).
- **Not changed:** GlossStates, GlossListStates, MathBlockStates (they mount the above), Shell, ShellStates,
  MarkStates, the boards' sizes and every page file.
- **Render (1 pass, 6 boards, `--page frame`):** `self_check=pass blocking=none`; Gloss, GlossStates,
  GlossListStates issues=0 (frame-A1's near-edge gone). Seen: the glossary's hairlines end on the column's edges while
  the arrived entry's ground bleeds; `s = mean ÷ sd` set in STIX inline in the Sharpe entry; "+0.10 % of K" and
  "K 대비 +0.10 %, sd 0.25 %인" wrap whole; every legend's meanings start on one edge; "Show less" starts where
  "Read more" does. Remaining lines are the ones already logged as intended (`target` and `label-ink` on `.ra-term`,
  `first-line` on formula cells, `size-count` and `tiny-text` on MathBlockStates, `tight-leading` on inline-math
  paragraphs). The pages were not re-rendered: the frame.css rules equal their own overrides.
- **design-check 10-reading-aids:** OK, 2 warnings (token-drift on Print and Terms, page files, pre-existing).
