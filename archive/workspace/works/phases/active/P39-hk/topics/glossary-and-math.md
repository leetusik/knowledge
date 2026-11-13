# P39-hk — the glossary and math grammar, the engine, validation, the term window's wiring

`P39-hk.R1` wrote this on 2026-11-03: findings only, for `P39-hk.DECOMP2`. Each `##` settles one question into one
approach, with the evidence behind it, the rejected alternatives, the files the build touches and the core tests it
needs. Line numbers are at `00e201bf` (this branch's HEAD when R1 ran). The look is the signed round
`10-reading-aids/01-reading-aids` (`docs/reference/design/jobs/10-reading-aids/`); nothing here re-decides it.

**Probes** ran in the session scratchpad only (`r1-probe/`: `temml@0.14.0`, `katex@0.19.1`,
`@fontsource/stix-two-math@5.3.0`, `micromark-extension-math`, `mdast-util-from-markdown@2`, Playwright with WebKit
27.2 and Firefox 157, and the existing headless Chromium 151.0.7922.34). Nothing was installed in `web/` or `server/`.
The commands and their output are in `slices/P39-hk.R1/result.md`.

## 1. The glossary grammar

**The approach.**

- **The block.** A typed fenced block, `` ```glossary #glossary ``. `"glossary"` joins `TYPED_BLOCKS`
  (`server/native/schema.py` L39). The body is a YAML mapping with one key, `terms` (1 to 100 items, code `limit`).
  Each item has these fields:
  - `id` (required): `[a-z0-9][a-z0-9-]{0,63}`, checked by `local_id` (L160);
  - `term` (required): plain text;
  - `aliases` (optional): a list of 1 to 8 plain strings;
  - `short` (required): *(md)*;
  - `long` (optional): *(md)*.

  The tree node is
  `{type:"glossary", id, terms:[{id, term, aliases:[str]|null, short:[Inline], long:[Inline]|null}]}`. Both
  definitions are single *(md)* paragraphs, so inline math works inside them (F31).
- **The definition length.** "About 40 words" is a rule for the writer and the critic, not a grammar cap. The window's
  body already scrolls past `min(32rem, 70vh)` (F5).
- **One glossary per chapter.** A second glossary block is refused with `limit` ("a chapter holds at most one glossary
  block"). Its position is free in the grammar, like `sources`: the parser checks neither position today, and
  `cites.ts` L9 says the sources list "may sit anywhere in the chapter".
  - The skill places it after the quiz and before `## Sources` (F6).
  - The renderer draws the section where the block is: `<h2 id={block.id}>Glossary</h2>`, in English (F1, F17), then
    the A to Z list.
  - The author writes no heading of their own. The skill's convention is `` ```glossary #glossary ``, so the signed
    `id="glossary"` holds the way `` ```sources #sources `` does today (`ids.py` L29–39: `## Sources` takes
    `sources-list`, clear of the block).
- **Term ids are their own namespace**, scoped to the glossary block. This matches how diagram node ids are scoped to
  their diagram and quiz option ids to their item (`server/native/README.md` *Ids → Scoped ids*). Term ids never join
  the document namespace.
  - The reader's DOM ids are generated with prefixes: `gl-<id>` (the entry), `tm-<id>-<n>` (each occurrence) and
    `tw-<id>` (the window). They are generated at render and never stored, like `cite-<source>-<k>` (`cites.ts` L1–11).
- **`term:` links.** `[DSR](term:dsr)` is a third in-chapter reference kind.
  - `parse_ref` (`server/native/refs.py` L52) and `parseRef` (`web/src/lib/native/refs.ts` L81) gain
    `term:<id>` → `{kind:"term", id}`. A malformed id is `ref-malformed`, and a `term:` image is `ref-scheme`.
  - The parser collects term refs the way it collects `#id` refs (`parse.py` L431–465). After the walk, a ref whose id
    names no term is refused with the new code **`ref-missing-term`**, the twin of `ref-missing-id` (L154). The
    glossary may come after the links.
  - A `term:` link inside the glossary block is refused with `ref-scheme` ("a glossary definition cannot link a
    term"). The window would otherwise open a window, and the occurrence numbering would count the hidden window
    copies. The signed data shape has no links in a definition: `short` and `long` are runs of text and math (F31).
  - `term:` links are allowed everywhere else a link is allowed: prose, a formula's `reading` and its legend's
    `means` (OQ4, signed), captions and quiz text.
  - `md` documents have no native checks, so a `term:` link there renders as a missing link (`links.ts` L82–91).
- **The relation to the `DEFINITION` callout.** They are separate and stay unchanged (`schema.py` L40, `render.tsx`
  L758 `callout`).
  - A glossary entry is the lookup definition, reachable from every occurrence.
  - A collapsed `DEFINITION` primer stays the in-flow explanation that runs a paragraph or more, for a concept the
    reader may already know (the skill's §4 rule).
  - The skill says when to use which. The grammar does not link them.
- **The search projection.** `_search_block` (`project.py` L114) adds the glossary's `term`, `aliases`, `short` and
  `long` (through `inline_text`), so search finds a chapter by its definitions.
- **The annotation projection.** Nothing changes.
  - The glossary is a typed block, a head/cap container, so it contributes nothing (`project.py` L69,
    `project.ts` `containers`).
  - A `term:` link in prose is a `link` node, already counted as its children's text (`project.py` L33–44,
    `project.ts` L16–31).
  - The marker must add no text node of its own. Any screen-reader-only hint carries `data-an-skip`, as
    `render.tsx` L582–583 does today.

**Rejected alternatives.**

- *Term ids in the document namespace.* `[x](#dsr)` would then be ambiguous between jumping to the entry and opening
  the window. Term ids like `k` or `t` (the fixture's) would burn heading slugs, and they would fall under
  `translation-ids`, which only warns.
- *A position rule* (the glossary followed only by sources). It is awkward to state, because the `## Sources` heading
  sits between them. Neither `quiz` nor `sources` has one, and the skill already orders the chapter's end.
- *Moving the glossary at render* to before the sources. The render order would then differ from the source order, and
  the section anchoring would get harder.
- *An authored `## Glossary` heading.* A translator could translate it, and F1 signs it English in every chapter.
- *Auto-detecting terms.* The intent forbids it ("a word like 'bar' would mislink").

**Files the build touches.** These, in the four places together: `server/native/{schema,parse,refs,project}.py` and
`README.md`; their byte copies in `plugin/templates/kb/server/native/`; `web/src/lib/native/{schema,parse,refs,tree,project}.ts`;
`tests/fixtures/native/` plus the template copies.

**Tests (core).** Each fixture is a pair that both suites read automatically (`tests/test_native_format.py` L18–39,
`web/tests/native-conformance.test.ts` L18–40):
- `glossary.md/.json/.txt`: terms, aliases, inline math in a definition, term links in prose and in a legend, and the
  search text;
- `err-glossary.md/.err`: a second block (`limit`), a duplicate term id (`id-duplicate`), a malformed id, a missing
  `short`, and a `term:` link inside a definition (`ref-scheme`);
- `err-terms.md/.err`: `ref-missing-term` and a `term:` image.

## 2. The math grammar

**The approach.**

- **Inline math is `` $`…`$ ``**: a CommonMark code span with a `$` touching each backtick. GitHub and GitLab
  document the same form.
  - A code span whose text node ends in `$` and whose next text node starts with `$` becomes
    `{type:"math", tex:<code text>}`. The two dollars are consumed.
  - The detection is a post-pass over the inline children both parsers already produce. On the Python side that is
    `inline_children`, `parse.py` L426 `code_inline`. On the TS side it is `parse.ts` L902 `inlineCode`. It runs at
    every depth: inside emphasis, link text, table cells and *(md)* YAML fields.
  - **Probe:** markdown-it-py 4.2.0 and mdast-util-from-markdown 2 split ``The rule $`t = s \times \sqrt{n}`$ holds;
    it costs $5 and $10.`` into the same three nodes. Both also apply the CommonMark one-space strip
    (`` $` x^2 `$ `` → `x^2`).
  - Both resolve `\$` to `$` before the pass, so the form has no escape. To put a literal dollar next to a code span,
    leave a space between them. The skill and the README say so.
  - Native only: with `format: "md"` the pass is off, like the other extensions (`parse.ts` L1–9).
- **The display block is a typed block** `` ```formula #<id> `` (`"formula"` joins `TYPED_BLOCKS`). Its fields:
  - `tex` (required): TeX, in a block scalar or single quotes;
  - `alt` (required): plain text, the spoken formula in the chapter's language, like a figure's `alt`;
  - `reading` (required): *(md)*, one plain sentence. Inline math in it is refused with `field-value` ("a reading is
    plain words"; F7: "no symbols in it").
  - `where` (required): 1 to 20 items of `{sym, means}`. `sym` is TeX checked in the inline context. `means` is *(md)*
    and may carry `term:` links (OQ4).

  The tree node is
  `{type:"formula", id, tex, alt, reading:[Inline], where:[{sym, means:[Inline]}]}`, which is the signed data shape
  `{ id, alt, read, legend: [{ sym, runs }] }` (round `result.md` *Data shapes*). The renderer, not the author,
  decides between a single row and stepped rows: a `tex` whose top level is `\begin{aligned}…\end{aligned}` is drawn
  as steps (§3).
- **The legend check.** Every `where[].sym` must occur in `tex`. The match runs on the tokens of both, after dropping
  spaces and unwrapping a brace group that holds one token, so `e_{i}` equals `e_i`. A sym that does not occur is
  refused with the new code **`formula-legend`**. It catches a typo, and a legend gone stale after the formula was
  edited.
  - "No fewer" and "in order" (F7) are not checked mechanically. What counts as a symbol is not well defined: is
    `P(\text{no event})` one symbol? The signed fixture's `participation` legend lists `N, e_i, Σ_i` while Σ comes
    first in the formula. The critic holds those two.
- **Inline math in the annotation projection is an atom.**
  - The projection counts the TeX verbatim, the way `code` is counted: `project.py` `inline_text` and `project.ts`
    `inlineText` add `node.tex`.
  - The renderer stamps the `<math>` with `data-an-len="<code points of tex>"`. That is the stand-in `anchor.ts`
    already supports (L18–19, L122–128, L157–162).
  - So the self-check stays exact. `verified` (L563–581) compares only text units, and an atom just takes its length.
  - A selection edge inside a formula snaps to its edge (`offsetIn`, L219–238), so a formula is wholly in a highlight
    or wholly out.
  - The paint never splits a formula or wraps it, because `paint.ts` L94 skips every unit that is not text. That
    keeps paint's static-markup assumption: no `<mark>` ever goes inside MathML.
  - `parse.py` `_plain` (L481) and `parse.ts` `plainText` (L121) treat math like code, so a heading slug or a
    citation's section name keeps the TeX's letters.

**Rejected alternatives.**

- *`$…$` with no guard.* Probe: mdit dollarmath's default reads ``It costs $5 and $10`` as the math `5 and `.
- *`$…$` with Pandoc's guards* (`allow_space=False, allow_digits=False`).
  - The guard fixes `$5 and $10`, but ``Set $HOME/$USER`` is still read as the math `HOME/` (probe). A codebase
    explain writes shell variables.
  - The TS twin is remark/micromark, not markdown-it (`parse.ts` L11). `micromark-extension-math` has no guard at
    all: the probe read `$5 and $10`, `$HOME/$USER` and `Between $5 and 10$` all as math. The twins would diverge
    unless a custom micromark tokenizer were written.
  - It would also change the meaning of every stored syntax-1 chapter that holds two dollars, because the reader
    re-parses stored source at render (`validate.ts` L41, `lib/reader/load.ts` L584).
- *`\(…\)`.* CommonMark eats the backslash (`\(` is an escape), and `_` and `*` inside would parse as emphasis.
- *A `math` fence for display.* A stored chapter may already hold `` ```math `` (GitHub's display form). It would
  become a typed block and be refused at render. `formula` cannot plausibly collide, and it carries the reading and
  the legend the design requires.
- *Math in the projection as nothing* (`data-an-skip`). A highlight across a formula would silently lose it from the
  quote, and the formula could never begin or end a highlight.
- *Math as a linear Unicode form in the projection.* It would mean a second converter twinned in both languages,
  for a nicer quote in the notes panel.

**`syntax: 1` stays.** All three new forms are additive.
- `term:` links were refused before (`ref-scheme`), so no stored chapter has one.
- `` ```glossary `` and `` ```formula `` were ordinary code fences, and `` $` `` beside a code span is implausible.
- There is no precedent either way: `quiz` and `sources` were in the parser from its first commit (`a2028fca`).
- The release slice should scan the stored native sources once for `` ```glossary ``, `` ```formula `` and `` $` ``.
  A hit (unlikely) means bumping to `syntax: 2` for the new forms instead.

**Files the build touches.**
- `server/native/{schema,parse,project}.py`, a new `server/native/tex.py` (§4) and `README.md` (the tree and the
  codes);
- `server/native_ingest.py` (§6);
- the template copies, including registering the new `tex.py` file in `plugin/templates/manifest.json` if its list
  needs it;
- `web/src/lib/native/{schema,parse,tree,project}.ts` and a new `tex.ts`;
- the fixtures.

**Tests (core).**
- `math.md/.json/.txt`: inline math in prose, in a table cell and in a YAML *(md)* field; a formula block; the
  projection `.txt` showing the TeX counted; and `$5`, `$HOME/$USER` and `` $ `ls` `` staying text.
- `err-formula.md/.err`: a missing `reading`, `alt` or `where`; math in a `reading` (`field-value`); and
  `formula-legend`.

## 3. The engine

**The approach: Temml (`temml@0.14.0`, MIT), MathML only, run in the server-only renderer** (`render.tsx` L20
`import "server-only"`). It sends no math JavaScript to the client. The output is rebuilt into React elements through a
MathML allowlist, never inserted as HTML.

- **Why Temml, against the signed canvas.**
  - **Face and markup.** Temml emits the elements the canvas hand-wrote: `mi`, `mo`, `mn`, `mtext`, `msqrt`, `mfrac`,
    `msup`, `msub`, `msubsup`, `munder` and `mtable`. In STIX Two Math those render at the canvas's sizes. The probe,
    in headless Chromium 151 with the canvas CSS, measured the same width and height for `s = mean ÷ sd`,
    `t ≈ 2.19`, `λ = rate × time`, `e^(−λ)` and the `participation` display (158.6 × 87.8 px for both).
  - **Size against the text.** Temml sets no font size, so frame.css's `--ra-math-k: 1` (inline) and
    `--ra-display-k: 1.5` (display) apply unchanged.
  - **Steps aligned on the relation (frame-G1).** `\begin{aligned}` becomes an `mtable` whose cells carry
    `tml-right` / `tml-left`. With Temml's two cell rules (`text-align`) the relations stack on one x.
    - Chromium 151: `[569, 569, 569]`. WebKit 27.2: `[555.7 ×3]`. Firefox 157: `[557.3 ×3]`. The canvas's note that
      "Chromium's MathML table ignores cell alignment" holds for `columnalign`, which KaTeX uses (below), not for
      Temml's classes.
    - The canvas's wider gap around the relation (a 0.28em grid gap) and its 0.2em row gap are reproduced in CSS on
      those cells, once Temml's inline `style` attributes are dropped (the rebuild drops every `style`).
    - So the steps keep their single `<math alttext>`, and the canvas's grid of separate math cells, with its
      `aria-hidden` and `aria-label` dance, is not needed.
  - **F24, `(Σe)²`.** Temml's `(\sum e)^2` leaves the MathML operator dictionary's 0.166em before ∑ (probe), where the
    canvas hugs the paren. TeX itself puts no space between an opening fence and an operator (Open–Op = 0). The
    rebuild applies that: an `mo` large operator straight after a prefix fence gets `lspace="0"`. That gives the canvas's
    5.543em width with 0 gap, the same as the hand-written F24 markup (probe: the spelling `(\!\sum e)^2` matched it
    exactly).
  - **√ with no trailing space (frame-G1).** This is not an engine matter. Probe, per engine and the radicand's height:

    | Engine | √n, √30, √(x²+y²) | √ over an inline fraction | √ over a display fraction |
    |---|---|---|---|
    | Chromium 151 | 0.418em | 0.171em | 0.035em |
    | WebKit 27.2 | 0 | 0 | 0 |
    | Firefox 157 | 0 | 0 | 0 |

    - The cause: Chromium sizes a stretchy radical at its widest glyph, the 1.212em assembly parts of STIX Two Math's
      √ (fontTools, versions 2.12 and 2.13 alike), but draws the variant it picked (0.794, 1.041 or 1.177em). Every
      MathML engine emits `<msqrt>`, so none avoids it.
    - The canvas's fixed `.ra-m msqrt { margin-inline-end: -0.38em }` is listed canvas-only. It would overlap the next
      glyph by about 0.4em in Safari, iOS and Firefox, and by up to 0.38em on Chromium's taller variants.
    - **The fix:** a measured, per-instance correction in the chapter's client controller (§5). After
      `document.fonts.ready`, for each `msqrt`/`mroot` in the chapter (windows and legends included):
      `gap = msqrt.right − base.right`; if `gap > 0.01em`, set `style.marginInlineEnd = -gap/fontSize + "em"`.
    - The probe applied exactly this. The gap to the next word became 0.241em, a word space. It is 0 work in WebKit
      and Firefox, and in em it holds on paper, where print uses the same DOM.
    - Without script the gap stays, which is the safe failure.
  - **Print.** A Chromium print to PDF embedded `STIXTwoMath-Regular` as vector text (probe). Paper sizes come from
    kb-print.css as signed.
    - print-O1 (inline math reads light at 14 px) is a property of the face. No engine changes it; it stays as drawn,
      and any thickening would be a look change.
  - **Dark.** Temml emits no colour (and `\color` is refused, §4). Glyphs, fraction rules and radicals take
    `currentColor`: probe `rgb(230,225,214)` on `mo` and `mfrac` under a dark ground.
- **No raw HTML.** `render.tsx` L1–19: "no `dangerouslySetInnerHTML`… every element below is a React element".
  - A new `web/src/lib/native/mathml.ts` calls `temml.renderToString(tex, { displayMode, wrap: "none",
    throwOnError: true, trust: false, annotate: false })`.
  - It then parses the result with `saxes` (already a dependency, `package.json`; `svg.ts` L13), keeps only allowlisted
    elements and attributes, and returns React elements, the way `svgChildren` does for SVG (`render.tsx`
    L1211–1222).
  - **The element allowlist:** `math mrow mi mn mo mtext mspace mfrac msqrt mroot msub msup msubsup munder mover
    munderover mtable mtr mtd mpadded`. The probe walked Temml's output for about 30 samples, and every element it
    emitted is in that list except `menclose` (`\overline`), which §4 leaves out.
  - **The attribute allowlist:** `display displaystyle scriptlevel mathvariant lspace rspace stretchy fence form
    movablelimits separator largeop symmetric minsize maxsize linethickness width height depth voffset accent
    accentunder`, plus `class` limited to `tml-right tml-left tml-jot tml-small tml-sml-pad tml-med-pad tml-lrg-pad`.
    Every `style` is dropped and replaced by the build's CSS.
  - `__renderToMathMLTree` would skip the string parse, but it is a double-underscore internal; the default export
    has no public `renderToMathMLTree` (probe: `TypeError`).
  - If Temml still throws at render, for TeX that should have been refused (a parser drift), the block is refused with
    the existing placeholder. Raw TeX is never shown (`validate.ts` L1–14).
- **CSS.** The build does not import `Temml-STIX2.css`. It sets `math { display: inline-flex; flex-wrap: wrap }` and
  pads `math > mrow`, both against F7 (`white-space: nowrap`). The build carries its own rules: frame.css Part 3's
  `.ra-m`, `.ra-mb*` and `.ra-legend`, plus Temml's cell rules (`.tml-right`, `.tml-left`, the `tml-jot` padding).
- **The text alternative.**
  - **Display:** the authored `alt` goes on `<math alttext>`, then the caption is read (F7 *Spoken*).
  - **Inline:** the alttext is a linear form derived at render from the rebuilt MathML: token text, `√` before a
    radicand, `^`/`_` for scripts, Unicode superscript digits where they exist. For example `t = s × √n` and
    `(∑e)² ÷ ∑e²`.
    - These are the canvas's own inline snippet forms (F12). Inline math is linear by grammar (F7), so the linear
      form is a faithful spoken alternative, and a screen reader reads its symbols in its own language.
    - It is derived TS-side at render only, so there is no twin.
    - This departs from the signed "alttext in the chapter's language" for inline formulas: **OQ (R1)**.
  - **Probe:** Playwright's accessible-name computation ignored `alttext` in all three engines and used `aria-label`.
    The platform accessibility trees and real screen readers were not checked. The review gate should listen to one
    formula with VoiceOver before choosing between `alttext` alone (as signed) and `alttext` plus `aria-label`.
- **Fonts.**
  - **What to vendor.** STIX Two Math is OFL 1.1. Its Reserved Font Name is "TM Math", not STIX (stipub `OFL.txt`).
    "STIX Fonts" is an IEEE trademark. Vendor the unmodified Google Fonts / fontsource woff2: version 2.12, 403 KB,
    with the full `cmap` (4,605 code points) and the `MATH` table.
  - **Where it goes.** Into `web/public/fonts/reader/`, beside Literata, with its line in `public/fonts/README.md`.
    It is one `@font-face` in `reader-fonts.css`: `local("STIX Two Math")` first (macOS's 2.13 measured identical),
    then the file.
  - **When it loads.** A face loads only when text uses it, so only pages that render math fetch it, once, and it is
    cached across chapters.
  - **A smaller file.** A `pyftsubset` cut with the `MATH` table kept measured 157 KB (1,793 glyphs, 43 vertical
    constructions). It is a Modified Version under the OFL, still not named "TM Math". Leave it as a later weight
    option, gated on a coverage check (every code point Temml emits for the allowlist is in the `cmap`).
- **The CSP needs no change.** `csp.ts` L28–34 sets no `font-src` and no `default-src`, so same-origin fonts load.
  `style-src` is open, and the rebuild emits no style attributes anyway. The client controller's measured
  `marginInlineEnd` and placement are CSSOM writes, the kind `style-src` governs; `style-src` is open (L23–26).
- **Weight.**
  - Temml adds about 480 KB (`temml.mjs`) to the server bundle and 0 bytes to client JS.
  - The HTML per formula is about 0.2–0.4 KB inline and about 1.1 KB for the `tstat` display.
  - The font is 403 KB, fetched once, only on pages with math.
  - Pin `temml` exactly, as `shiki 4.5.0` and `saxes 6.0.0` are (`web/package.json`).

**Rejected alternatives.**

- *KaTeX HTML output.* It draws in its own KaTeX fonts (the Computer Modern look), so STIX Two Math (F8) is impossible.
  Its markup is span-and-inline-style heavy.
- *KaTeX MathML only* (`output: "mathml"`). Probe:
  - `aligned` becomes `<mtable columnalign="right left">`. `columnalign` is not in MathML Core, so Chromium does not
    align it (frame-G1 fails).
  - `\mathrm{mean}` is split into four `<mi mathvariant="normal">` letters.
  - Each formula is wrapped in `span.katex` and `<semantics>` with a TeX annotation.
- *MathJax 4 (SVG or CHTML) on the server.* It avoids Chromium's radical gap, but it is not the signed MathML markup
  (`math.ra-m`, `alttext`). SVG formulas are not text, CHTML ships its own fonts and CSS, and it is the heaviest
  option for an allowlisted subset.
- *A hand-written TeX→MathML converter.* It would re-implement the operator spacing and stretching that Temml
  already gets right, and it would be a third parser to own beside the validator twin.
- *Authoring MathML directly.* Writers and translators cannot work in it.

**Files the build touches.**
- `web/package.json` and `pnpm-lock.yaml` (`temml`, exact);
- new `web/src/lib/native/mathml.ts`;
- `render.tsx` (inline `math`, `formula`, legend);
- a `FormulaBox` that reuses `scroll-box.tsx`'s measured overflow (L1–25: role `region` only when it scrolls; the
  signed mask fade);
- `web/src/content/chapter.ts` (`where` / `여기서`, "Formula, scrolls sideways");
- the reader CSS and `kb-print.css`;
- `web/src/app/reader-fonts.css`, `web/public/fonts/reader/stix-two-math.woff2` and `web/public/fonts/README.md`.

**Tests (core).**
- `web/tests/native-math.test.ts`:
  - every row of the allowlist fixture (§4) renders through Temml with `throwOnError` in its context;
  - every element and attribute Temml emits for those samples is in the rebuild allowlist (closing the loop between
    the validator and the renderer);
  - the F24 `lspace` rule.
- The radical correction, the placement and the look are verified live in a real browser, never by a test.

## 4. Validation at publish, with no Python math engine

**The approach.** A TeX-subset validator twinned in Python and TypeScript: a new `server/native/tex.py` and
`web/src/lib/native/tex.ts`. A shared allowlist fixture holds the two equal, and a TS test holds the allowlist equal to
what Temml renders. It adds no new Python dependency: `pyproject.toml` already pins `markdown-it-py==4.2.0` and
`mdit-py-plugins==0.6.1` (L16–17), and `tex.py` is pure Python.

- **The tokenizer.**
  - control words `\[A-Za-z]+`;
  - control symbols `\,` `\;` `\:` `\!` `\ ` `\{` `\}` `\|` `\%` `\$` `\_` `\&` and `\\`;
  - `{ } ^ _ & '`, letters, digits and ASCII operators.
  - Outside a text argument, only printable ASCII. Greek and operators go through commands.
  - Inside a text argument (`\text`, `\mathrm`, `\operatorname`), any printable character except `\ { } $ % # & ^ _ ~`.
    This is where a Korean chapter would put words; but the formula stays verbatim, and the canvas keeps it English.
  - `%` (a comment), `#`, `~` and control characters are refused.
- **The allowlist.** It is data: the fixture `tests/fixtures/native/tex-allowlist.tsv` (command, context, arity,
  sample). The file has no `.md`, so it is not a conformance case (`test_native_format.py` L41–46). It starts with
  these, and grows only through that fixture:
  - Greek: `\alpha`…`\omega`, `\varepsilon`, `\varphi`, `\vartheta`, `\Gamma`…`\Omega`;
  - operators and relations: `\times \div \cdot \pm \mp \approx \neq \ne \le \leq \ge \geq \ll \gg \sim \simeq
    \equiv \propto \to \rightarrow \leftarrow \Rightarrow \Leftarrow \leftrightarrow \Leftrightarrow \mapsto \infty
    \partial \nabla \in \notin \subset \subseteq \cup \cap \emptyset \forall \exists \neg \land \lor \ldots \cdots
    \dots \circ \bullet \ast \prime \% \$`;
  - delimiters: `\lvert \rvert \lVert \rVert \langle \rangle \lfloor \rfloor \lceil \rceil \{ \} \|`;
  - large operators and functions: `\sum \prod \int \lim \max \min \sup \inf \arg \log \ln \exp \sin \cos \tan \det
    \Pr \limits \nolimits`;
  - commands with arguments: `\sqrt{}`, `\sqrt[]{}`, `\text{}`, `\mathrm{}`, `\mathit{}`, `\mathbf{}`,
    `\operatorname{}`, `\hat{}`, `\bar{}`, `\tilde{}`, `\vec{}`, `\dot{}`, `\ddot{}`;
  - `\left` / `\right` with an allowed delimiter or `.`;
  - spacing: `\, \; \: \! \quad \qquad`;
  - **display only:** `\frac{}{}`, `\tfrac{}{}`, `\dfrac{}{}`, `\binom{}{}`, the environments `aligned` and `cases`
    (top level, not nested), and `&` and `\\` (inside them only).
  - Inline is linear (F7: "no stacked fraction in a line").
- **The structure checks.** Braces balanced and nested at most 20 deep. Every argument present. No `x^a^b` or `^^`
  (a double script). `\left` paired with `\right`. `\begin`/`\end` matched. Not empty.
  - Temml itself throws a bare `TypeError` on `x^^2` (probe), so refusing it up front matters.
- **Refused by name, because Temml accepts or sanitizes them** (probe): `\color` is accepted as
  `style="color:#ff0000"`. `\href`, `\url`, `\htmlClass` and `\includegraphics` are refused by Temml only while
  `trust` is false. The allowlist refuses all of them, along with `\def \newcommand \renewcommand \let \tag \label
  \ref \eqref \verb`, whatever Temml would do.
- **The refusal codes and where they surface.**

  | Code | When |
  |---|---|
  | `math-syntax` | Tokens or structure are wrong. |
  | `math-command` | The command is not in the allowlist, or a display-only form is used inline. The message names the command. |
  | `limit` | Inline TeX is over 300 code points, display over 2,000, or nesting is deeper than 20. |
  | `formula-legend` | §2's legend check fails. |
  | `ref-missing-term` | §1's `term:` link names no term. |

  - They join the one 422 at ingest (`server/native/errors.py`; file lines are remapped to body lines by `native_ingest.remap_lines`, L68).
    Inline math carries the paragraph's line (col 1, as links do today). A block field carries its YAML line and
    `block`.
  - They come back from the TS render gate (`validate.ts`) as a refused-block placeholder, as defence in depth.
  - The explain skill's publish step reads the 422 and fixes the chapter.
- **A YAML gotcha for the skill text.** TeX in a YAML double-quoted string loses backslashes to escapes: `"\frac"`
  holds a form feed. Write `tex` and `sym` in a block scalar (`|`) or single quotes. The validator refuses the control
  character with `math-syntax`, so the mistake can't ship.
  - In a GFM table cell, a `|` inside math still splits the cell: write `\lvert`.

**Rejected alternatives.**

- *A Python math library* (latex2mathml, pylatexenc). It is a new dependency in `pyproject.toml` and `uv.lock`, which
  are template-identical, and it would accept a different set than Temml, so the two would drift.
- *Running Temml at publish from Python through Node.* The knowledge base's server is Python-only, and the plugin
  template ships it to users' machines.
- *No publish check, only the render-time refusal.* The intent says "validated at publish", and a refused placeholder
  in a published chapter is the failure this exists to prevent.

**Files the build touches.** `server/native/tex.py` and its template copy; `web/src/lib/native/tex.ts`; the call sites
in `schema.*` and `parse.*`; `tests/fixtures/native/tex-allowlist.tsv`, `math.md`, `err-math.md` and their template
copies; `server/native/README.md` (the codes table L50–58).

**Tests (core).**
- `err-math.md/.err`: one case for each of `math-syntax`, `math-command` (including `\frac` inline and `\color`) and
  `limit`;
- a Python test and a TS test, each asserting that its allowlist constant equals the TSV;
- `native-math.test.ts` (§3) proving that Temml renders every TSV sample.

## 5. The term window's wiring

**The approach: one chapter-level client controller, `TermLayer`**, in a new
`web/src/components/reader/term-layer.tsx`. It is mounted beside `AnnotationLayer` in `reader-article.tsx` (L77) and
works by event delegation on the article. Nothing is a client island inside a stamped paragraph.

- **The server markup.** All of it comes from `render.tsx`. It is static, so paint's assumption holds
  (`paint.ts` L14–17: "the chapter is static markup").
  - Each marker is `<a class="ra-term" id="tm-<id>-<n>" href="#gl-<id>" aria-haspopup="dialog" aria-expanded="false"
    aria-controls="tw-<id>">`. The occurrences are numbered by a pre-pass `planTerms` in a new
    `web/src/lib/native/terms.ts`, which follows `planCitations`' pattern (`cites.ts` L50–101). It walks the text and
    the legends in render order and is keyed by the link node.
  - The glossary section.
  - One hidden window per term, `<div class="ra-win" id="tw-<id>" role="dialog" tabindex="-1" hidden>`, inside one
    `.ra-float` holder. It has Close, Read more and Show less (the swap box, F32) and In the glossary →, a real
    `<a href="#gl-<id>">`.
  - The controller only toggles `hidden`, `aria-expanded`, classes and the holder's position. It never moves a
    React-rendered node. A later React re-render restores the attributes, which closes the window: safe.
  - **A build note:** paint puts its `<mark>` inside the term's `<a>` (`paint.ts` L196 inserts the mark beside the text
    node). The canvas's rule `mark.an-m .ra-term` must therefore be written `.ra-term:has(> mark.an-m)`.
- **Per-term islands are rejected.** A client component per marker would sit inside `data-tx` paragraphs, where
  React's hydration and re-render would fight paint's text-node splits. It would also need shared state anyway for
  "one window at a time", and it would cost N islands.
- **The phone sheet.** The same window element switches form at the container's 40rem (F3, F4): a container query in
  CSS, the same breakpoint in the controller's placement.
  - It is **not** a frame panel. The frame's sheets are modal, with a scrim and a focus trap (`reader-frame.tsx`
    L299–318, L703–720). The term sheet has no scrim (OQ3, signed) and is not modal: a tap on another term swaps it.
  - It uses the canvas's `.ra-sheet` classes, never `.rd-sheet`. annotations.tsx stands down for any `.rd-sheet`
    (L1822) and must keep working while a term sheet is open.
  - A tap on the frame's bottom bar is a pointerdown outside the sheet, so it closes the sheet.
- **Never two floating things at once (F2).** Almost all of it composes with no edit to annotations.tsx:
  - **Clicking a term inside a highlight opens the window, never the popover.** annotations' capture click handler
    already skips a mark inside a link (L1796, `!t.closest("a")`). The term is an `<a>`. Its next lines (L1805–1809)
    close an open popover and, because `a` is in `TAP_IGNORE`, leave the click to reach the controller.
  - **Clicking a highlight while a window is open opens the popover and closes the window.** The controller closes its
    window on a pointerdown outside the window and the terms, in the capture phase on the document. That runs before
    annotations' click (L1875) opens the popover.
  - **Esc.** The controller listens for keydown in the capture phase on the document. While a window is open it closes
    the window, focuses the term and calls `preventDefault()`. annotations' `onKey` (bubble, L1873) then bails at
    L1819 (`e.defaultPrevented`). The frame's Esc (L301) acts only while a frame panel is open.
  - **A hover-opened window** also closes on a focusin outside it, for example Enter on a highlight's stop.
  - **The one keyboard edge** zero-touch cannot cover: Enter or Space on a term while an annotation popover is open.
    annotations' `onKey` acts only on `mark.an-m[data-an-key]` (L1825–1829). **The one located touch** is about 3 lines in
    annotations' `onKey`, just above L1825: on Enter or Space landing on `a.ra-term` with a popover open, call
    `closeAll(false)`. It is the only annotations.tsx edit, which is the P36-1s merge risk.
- **`TAP_IGNORE` needs no change** (`lib/reader/chrome.ts` L149–150).
  - `a` covers the markers, and `[tabindex]` covers the window and sheet roots (`tabindex="-1"`, as signed).
  - The controller stops the click that closed a window from also toggling the chrome, as annotations does (L1809):
    a capture click on the article, `stopPropagation()` unless the target is in `TAP_IGNORE`. The frame's `onTap`
    (L334) then never sees it.
- **The rest of the controller's work** follows the build contract (round `result.md` *The window*, *The phone
  sheet*, *The glossary section*):
  - placement and re-placement;
  - the 250 ms hover rest and the 200 ms hover leave;
  - Tab and Shift+Tab out;
  - Read more;
  - the sheet's page padding and its scroll;
  - "In the glossary →", which marks the entry and sets its hidden `fg-back` link to the remembered occurrence
    `#tm-<id>-<n>`;
  - Back;
  - the radical correction (§3).

**Rejected alternatives.**

- *Per-term islands.* See above.
- *Routing the term sheet through the frame's `panel` state.* That makes it modal with a scrim, against OQ3.
- *A shared "float-open" event protocol in annotations.tsx.* It makes a bigger edit to the merge-risk file than the
  single 3-line `onKey` touch.
- *Putting the window content in the client props.* It would ship the definitions twice and render MathML on the
  client.

**Files the build touches.**
- `render.tsx` (markers, glossary section, windows), `web/src/lib/native/terms.ts` (new), `term-layer.tsx` (new) and
  `reader-article.tsx` (mount);
- `annotations.tsx` (the 3-line touch only);
- the reader CSS and `kb-print.css` (the paper appendix);
- `web/src/content/chapter.ts` (Glossary, Close, Read more, Show less, In the glossary →, Also called; "‹ Back to the
  text" reuses `sources.back`).

**Tests (core).** `web/tests/native-terms.test.ts`, like `native-cites.test.ts`: `planTerms` numbers
`tm-<id>-<n>` in render order across text and legends, and leaves an unknown id as plain text. The hover, keyboard,
sheet and placement behaviour is verified live in a real browser, never by tests.

## 6. Translation

**The approach: both a publish-time check and the skill's translation step.**

- **At publish.** `translation_check` (`server/native_ingest.py` L255) gains two 422s beside `translation-quiz-ids`
  (L265). It is Python-only (ingest), so it needs no TS twin.
  - **`translation-term-ids`:** the glossary's term id set must equal the source version's. `term:` links and the
    reader's occurrence ids hang on it, which is why it is a 422, like quiz ids, and not a warning like block ids
    (L273).
  - **`translation-math`:**
    - the display formulas, in order, must match the source's: each `tex` byte-equal and its `where[].sym` list
      byte-equal;
    - the multiset of inline TeX strings across the chapter must match, definitions and legends included. A multiset,
      because a translated sentence may move a formula.
    - The message names what is missing or extra.
- **In the skill.** The translation step (DECOMP2's skill slice) says to keep every `term:` id, the glossary's ids,
  every `` $`…`$ `` and every formula's `tex` and `sym` byte for byte. It says to translate the term, its aliases, both
  definitions, the reading, the legend meanings and the `alt`.
  - Formula words stay English (`\text{no event}`, `\mathrm{rate}`): the signed data shape is "the MathML
    language-free".
  - The glossary re-sorts by the chapter's collator at render (F6), so a Korean chapter gets 가나다 order with no
    authored order.

**Rejected alternatives.**

- *Warnings only.* A translation that drops a term id breaks its `term:` links, and the parse already refuses those,
  but only for links. A dropped or changed formula would publish silently.
- *Comparing inline math in order.* Reordering a sentence is legitimate translation.
- *The skill step alone.* It holds the writer, not the server.

**Files the build touches.** `server/native_ingest.py` and its template copy; the skill's translation step (the skill
slice).

**Tests (core).** In `tests/test_native_ingest.py`, beside the `translation-quiz-ids` cases: term ids differ (422);
display `tex` differs (422); a legend `sym` differs (422); inline TeX missing (422); and the same set reordered
(accepted).

## Build cut impact

**The cut changes from `topics/breakdown.md` *Build inventory*.** Two items split, two things are added, and the risks
are named.

1. **The native grammar splits into two slices, run as a chain.** They share `schema.*`, `parse.*`, `tree.ts`,
   `project.*`, the README and the fixtures, so they are not parallel-safe.
   - **(a) The glossary and `term:` links** (§1). In the four places, plus the search text.
   - **(b) Math** (§2, §4, §6). The `tex` validator twin, inline math, the formula block, the allowlist fixture, and
     the translation 422s.
   - Each is a full pass over the four places, and one slice would be about twice the size of either.
   - **Risk: high**, trigger **core invariant**: the stored chapter format, and the projection offsets that stored
     annotations anchor on.
2. **The reader splits into two slices, run as a chain.**
   - **(c) Math rendering** (§3): the `temml` dependency, `mathml.ts` with its rebuild allowlist, the inline, formula
     and legend markup, `FormulaBox`, the vendored STIX Two Math, and the screen and paper math CSS.
     **Risk: high**, trigger **core invariant**: the renderer's no-raw-HTML guarantee (`render.tsx` L1–19). This is
     the one place an engine's output enters the page.
   - **(d) Terms** (§5): `planTerms`, the markers, the hidden windows, the glossary section and its way back,
     `TermLayer` with the radical correction, the 3-line `annotations.tsx` touch, and the paper appendix.
     **Risk: low (mid)**: §5 pins the wiring; no named trigger.
   - (c) comes before (d): both edit `render.tsx`, and the windows' definitions carry inline math.
3. **Added items.**
   - A new web dependency, `temml`, pinned exactly. It is web-only and not under `plugin/`, so it does not move the
     plugin release.
   - A vendored font and its README line.
   - A release-checklist line: scan the stored native sources once for `` ```glossary ``, `` ```formula `` and
     `` $` `` before deploying (§2). It is not a slice.
4. **Unchanged.** The skill's §4 grammar text gains these points:
   - the `` $`…`$ `` form and its no-escape rule;
   - the `formula` fields;
   - the YAML quoting gotcha;
   - the `|`-in-a-table rule;
   - the translation keep-list;
   - the glossary convention `` ```glossary #glossary ``, after the quiz.

   The plugin release (0.10.0) is unchanged.
5. **The order.** (a) → (b) → (c) → (d) → the skill's §4 → the release. Nothing in this cut can run in a wave: each
   step edits files the next one edits, or depends on them.
