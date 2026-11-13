# P39-hk.R1 — result

## Verdict

- **status:** done
- **route:** research
- **model:** opus
- **effort:** xhigh
- **summary:** R1 settled each of the six questions into one approach. The evidence is file:line references plus throwaway probes run in Chromium 151, WebKit 27.2 and Firefox 157. The findings are in `topics/glossary-and-math.md`.
  - **Glossary:** a `glossary` typed block with its own term-id namespace and `term:` links (`ref-missing-term`).
  - **Inline math:** `` $`…`$ ``, counted in the projection as a `data-an-len` atom.
  - **Display formulas:** a `formula` block carrying `tex`, `alt`, `reading` and `where`.
  - **Engine:** Temml MathML, rebuilt through an allowlist (no raw HTML), with STIX Two Math vendored.
  - **Validation:** a TeX allowlist twinned in Python and TypeScript.
  - **Term window:** one client `TermLayer`, with one 3-line touch to `annotations.tsx`.
  - **Translation:** two ingest 422s.
  - **Build cut:** it changes. The grammar and the reader each split in two, as a chain of four slices.
- **files_changed:**
  - `works/phases/active/P39-hk/topics/glossary-and-math.md` (new);
  - `works/phases/active/P39-hk/slices/P39-hk.R1/result.md` (new).
- **validation:**
  - `python3 scripts/workflow.py validate`: passed (warnings only, none from this slice).
  - `git status --porcelain --untracked-files=all`: this slice shows only its two files. The other entries belong to the sibling S1, the next slice S2 (`topics/evidence-model.md`, its `plan.md` and `slice.json`) and the orchestrator's state files. None are this slice's.
  - Whole-tree checks (deferred: whole-tree): none apply, since this slice wrote no code.
- **deviations:**
  - **WebKit and Firefox.** R1 installed Playwright with WebKit 27.2 and Firefox 157 into the scratchpad (`PLAYWRIGHT_BROWSERS_PATH` set there, about 600 MB, nothing outside it). Reason: whether the radical-gap fix could be a fixed CSS margin depended on whether Safari and Firefox show the gap. They do not.
  - **Accessibility.** The text-alternative finding comes from Playwright's accessible-name computation. No screen reader was run.
- **doc_impact:** listed under `notebook` (wave).
- **notebook:**
  - **Decisions:**
    - **Glossary grammar (R1):**
      - a ```` ```glossary #glossary ```` typed block, one per chapter (`limit`), placed freely;
      - the renderer titles it `Glossary` with the block's id;
      - term ids are their own namespace, scoped to the block;
      - `[x](term:<id>)` resolves against them: `ref-missing-term`, or `ref-scheme` for a term image or a term link inside the glossary;
      - search indexes it; the annotation projection is unchanged.

      → [topics/glossary-and-math.md](topics/glossary-and-math.md) §1
    - **Math grammar (R1):**
      - inline math is `` $`…`$ ``: a code span between two dollars, which both parsers already split identically. `$…$` is rejected because `$HOME/$USER` misfires and the two parsers' math extensions disagree.
      - display math is a `formula` block with `tex`, `alt`, `reading` and `where`; `formula-legend` refuses a symbol the formula lacks;
      - inline math is a `data-an-len` atom counting its TeX;
      - `syntax: 1` stays.

      → topic §2
    - **Engine (R1):**
      - Temml 0.14.0 MathML, server-only, rebuilt by saxes through a MathML allowlist (no raw HTML);
      - its `aligned` stacks the relations in Chromium, WebKit and Firefox;
      - STIX Two Math vendored (OFL, 403 KB), loaded only on pages with math;
      - no CSP change;
      - Chromium's √ gap is corrected per instance by measurement, never by a fixed margin.

      → topic §3
    - **Validation (R1):** a TeX allowlist validator twinned in `server/native/tex.py` and `web/src/lib/native/tex.ts`. The fixture `tests/fixtures/native/tex-allowlist.tsv` and a Temml render test hold the two equal. Codes: `math-syntax`, `math-command`, `limit`. No new Python dependency. → topic §4
    - **Term window (R1):**
      - one client `TermLayer` beside `AnnotationLayer`, delegating over static server markup (markers, and hidden windows `tw-<id>`);
      - capture-phase pointerdown and Esc compose with `annotations.tsx`, which gets only one 3-line `onKey` touch;
      - `TAP_IGNORE` is unchanged;
      - the phone sheet is `.ra-sheet`, not a frame panel.

      → topic §5
    - **Translation (R1):** ingest gains the 422s `translation-term-ids` and `translation-math` (display `tex` and `sym` in order; inline TeX as a multiset), beside `translation-quiz-ids`. The skill's translation step keeps both verbatim. → topic §6
  - **Notes for later slices:**
    - **(from R1, for DECOMP2)** Build cut:
      - the grammar splits into (a) the glossary and `term:` links, and (b) math (the TeX twin, the formula block and the translation 422s). Both are high, trigger core invariant: the stored format and the projection offsets.
      - the reader splits into (c) math rendering, high (the no-raw-HTML rebuild), and (d) terms, mid.
      - the order is a chain: (a) → (b) → (c) → (d) → the skill's §4 → the release. Nothing can run in a wave.

      → topic `## Build cut impact`
    - **(from R1, for DECOMP2 and the math render slice)** frame-G1's √ gap belongs to Chromium: 0.418em on the base glyph, less on tall radicands, 0 in WebKit and Firefox. Never ship the canvas's fixed −0.38em; the controller measures each `msqrt` after the fonts load. F24's paren-hugging Σ comes from an `lspace="0"` rule in the rebuild. → topic §3
    - **(from R1, for DECOMP2 and the release slice)** Before deploying, scan the stored native sources once for ```` ```glossary ````, ```` ```formula ```` and `` $` ``. A hit means `syntax: 2` instead of the additive `syntax: 1`. → topic §2
    - **(from R1, for the terms build slice)** Two points:
      - paint puts `mark.an-m` inside the term's `<a>` (`paint.ts` L196), so the canvas's `mark.an-m .ra-term` becomes `.ra-term:has(> mark.an-m)`;
      - a highlight over inline math leaves the formula unpainted, as a citation's `[n]` is. That state is not drawn.

      → topic §2, §5
    - **(from R1, for the skill §4 slice)**
      - TeX in YAML goes in a block scalar or single quotes;
      - a literal `$` beside a code span needs a space;
      - `|` in a table cell is written `\lvert`;
      - the glossary block is ```` ```glossary #glossary ````, after the quiz;
      - a translation keeps term ids and TeX byte for byte.

      → topic §2, §4, §6
  - **Doc impact:**
    - architecture.md, decisions.md, operations.md: math is typeset server-side by Temml (MathML, pinned, web-only), rebuilt through a MathML allowlist, with STIX Two Math vendored in `public/fonts/reader/` (OFL). Inline math is `` $`…`$ ``, not `$…$`. The new codes are `ref-missing-term`, `math-syntax`, `math-command` and `formula-legend`, plus the ingest 422s `translation-term-ids` and `translation-math` (P39-hk.R1; DECOMP2's slices refine).
  - **Operator Questions:**
    - **OQ7 (R1):** The canvas gives each inline formula a spoken sentence in the chapter's language. R1 recommends deriving it from the formula instead (`t = s × √n`, read by the screen reader in its own language), so writers and translators add nothing per inline formula. Display formulas keep their written `alt`. Accept, or add a written alt to the inline form?
      - Numbered 7 so it is not confused with D1's frame-OQ1–OQ6.
      - It does not block DECOMP2: the build proceeds on the recommendation.
  - **Now:** R1 is done. DECOMP2's build cut changes: the grammar and the reader each split in two, as the chain (a) → (b) → (c) → (d), with risks named. OQ7 (inline spoken text) goes to the gate and does not block. → [topics/glossary-and-math.md](topics/glossary-and-math.md)

## Summary

The findings live in `works/phases/active/P39-hk/topics/glossary-and-math.md`: one `##` per question, plus `## Build
cut impact`. This file is the slice's log: what was tried, the commands, and their output.

## Probe log

Every probe ran in
`/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/r1-probe/`.
Nothing went into `web/`, `server/`, `plugin/`, `tests/` or `scripts/`.

1. **Packages** (`npm init`, `npm add`): `temml@0.14.0` (MIT; dist includes `Temml-STIX2.css` and a 9 KB
   `Temml.woff2`, but no STIX Two Math file), `katex@0.19.1`, `@fontsource/stix-two-math@5.3.0` (OFL-1.1),
   `micromark@4`, `micromark-extension-math`, `mdast-util-from-markdown@2` and `playwright`.
2. **`probe1.mjs`: the fixture formulas through Temml and KaTeX (MathML).**
   - Temml: `\mathrm{mean}` → `<mpadded lspace="0"><mi>mean</mi></mpadded>`, and `aligned` → `<mtable class="tml-jot">`
     with `mtd class="tml-right|tml-left" style="padding…"`. `\sqrt{n}` adds a zero-width `mspace` strut.
   - KaTeX: `aligned` → `<mtable columnalign="right left">`, and `\mathrm{mean}` → four
     `<mi mathvariant="normal">` letters, wrapped in `span.katex` and `<semantics>`.
3. **`gen-compare.mjs` → `compare.html` / `compare.png`: canvas markup beside Temml, same CSS** (headless shell 151,
   system STIX Two Math 2.13).
   - Inline widths are equal for `sdef` 110.4, `tapprox` 60.2, `lam` 115 and `pois` 24.1. `participation` is equal
     (158.6 × 87.8).
   - `part` is 105.8 on the canvas against 108.8 in Temml (the ∑ lspace). `tdef` shows Temml's 7.5 px gap after √n,
     which the canvas cancels with its −0.38em hack.
   - The steps' `relLeft` is constant per row on both sides, for example Temml tstat `[669.9, 669.9]` and worked
     `[668.6 ×4]`.
4. **`sqrt.html`: the radical gap by font, in Chromium.**
   - STIX 2.13 (system OTF) and 2.12 (fontsource woff2) behave identically: the radical's lead is 0.794em and its
     trailing gap 0.418em.
   - The UA `math` face shows no gap.
   - fontTools: √ `uni221A` advances 794; the variants are `.s1` 1041, `.s2` 1177 and `.s3` 1170; the assembly parts
     are 1212. 0.794 + 0.418 = 1.212.
5. **`sqrt2.mjs`: the gap by radicand height** (Chromium): 0.418 for n, 30 and x²+y²; 0.171 over an inline `\tfrac`;
   0.035 over a display `\frac`; 0.042 over a tall fraction. A per-instance `margin-inline-end: -gap em` leaves a
   0.241em gap to the next word.
6. **`xengine.mjs`: Chromium 151, WebKit 27.2 and Firefox 157, with the fontsource woff2 as a data URL.**
   - √ gap `{n, tfrac, display frac}`: Chromium `0.418 / 0.171 / 0.035`, WebKit `0 / 0 / 0`, Firefox `0 / 0 / 0`.
   - Temml `aligned` relation x: Chromium `[569 ×3]`, WebKit `[555.7 ×3]`, Firefox `[557.3 ×3]`. The STIX face loaded
     in all three.
   - Screenshot: `xengine-webkit.png`.
7. **`tree.mjs`.**
   - `temml.renderToMathMLTree` is not on the default export (`TypeError`); only `__renderToMathMLTree` is.
   - About 30 samples rendered without error, including `cases`, `binom`, `\operatorname`, `\%` and `\$`. The elements
     emitted: `math menclose mfrac mi mn mo mover mpadded mroot mrow mspace msub msubsup msup mtable mtd mtext mtr munder
     munderover`.
   - With `throwOnError: true`: `\href`, `\url`, `\htmlClass` and `\unknowncmd` are unsupported; `\includegraphics` is
     untrusted; `x^^2` throws a bare `TypeError`.
   - `\color` is *accepted* (`style="color:#ff0000"`).
   - Without `throwOnError`, an unknown command renders as red `mtext`.
8. **`a11y.mjs`: Playwright `ariaSnapshot`, three engines.** `<math alttext>` gets no accessible name, and
   `<math aria-label>` does; the math's text reads `t = s × n` (the √ is not text). This is Playwright's own
   accessible-name computation, not a platform tree or a screen reader.
9. **`f24.mjs`.** Widths in em: canvas F24 5.543 (paren to Σ: 0), `(\sum e)^2` 5.709 (0.166),
   `(\!\sum e)^2` 5.543 (0), `({\sum} e)^2` 5.376 (0).
10. **`print.mjs`.**
    - A4 print to PDF embeds `STIXTwoMath-Regular` as vector text, beside the Georgia body.
    - Dark: `mo` and `mfrac` compute `rgb(230,225,214)`, the text colour, and the screenshot `dark.png` shows the
      rules and radicals in that colour.
    - The page holds 6 `style` attributes, all Temml's own (`mtd` padding, `math` display), which the build's rebuild
      drops.
11. **Currency and shell text.**
    - `micromark-extension-math` reads `It costs $5 and $10`, `Set $HOME/$USER` and `Between $5 and 10$` all as math.
    - mdit `dollarmath`: by default all of the above are math. With `allow_space=False, allow_digits=False`, `$5 and $10`
      and `$5/$10` stay text, but `$HOME/$USER` → math `HOME/` and `Between $5 and 10$` → math.
    - Both parsers turn ``$`…`$`` into `text…$`, then the code, then `$…text`, and both apply the one-space strip. Both
      resolve `\$` to `$`, so the form has no escape.
12. **`pyftsubset`.** The fontsource woff2 cut to ASCII, Greek, the operators, the arrows, the math alphanumerics and
    the scripts, with all features kept: 157,504 bytes, 1,793 glyphs, `MATH` table kept with 43 vertical
    constructions. The source file is 403,344 bytes (5,169 glyphs, 4,605 code points in the `cmap`, version 2.12).
13. **Licence.** stipub `OFL.txt` (WebFetch): "Copyright 2001-2021 The STIX Fonts Project Authors … with Reserved Font
    Name "TM Math"", and STIX Fonts is a trademark of the IEEE.

**Dead ends.**
- Fixing the gap in the font: removing the assembly still leaves 1.177em variants, which would need a 0.383em trailing
  correction, and rewriting advances would overlap the base.
- A single CSS constant would be wrong across variants and across engines.
- A web search for a known Chromium bug found none.

## Deviations from the plan

- The plan asked for the WebKit and Firefox check only implicitly ("print, dark", "accessibility"). R1 installed both
  engines into the scratchpad, because the fix for the radical gap (frame-G1) depends on them.
- Nothing was written outside the slice's set and this `result.md`.
