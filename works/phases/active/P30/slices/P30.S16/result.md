- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Built figures and sources from the signed `02-figures` round 01 on S12's pipeline, with `03-diagrams`' tones: the image box (sized from the asset map, loading, missing, animated still), the figure (column and a measured wide scroll box), the plain image (paragraph split), the figure row and the row card in all 13 tones, the `svg` block, the sources list and the citation with its way back. Live-checked on the production build and a dev clone; no server change.
- files_changed: `web/src/lib/native/render.tsx`, `web/src/lib/native/cites.ts` (new), `web/src/lib/native/links.ts`, `web/src/lib/native/index.ts`, `web/src/components/reader/figure-parts.tsx` (new), `web/src/components/reader/scroll-box.tsx`, `web/src/components/reader/reader-article.tsx`, `web/src/app/(public)/documents/[id]/document-view.tsx`, `web/src/app/(public)/documents/[id]/versions/[v]/page.tsx`, `web/src/content/chapter.ts`, `web/src/app/reader.css`, `web/tests/native-cites.test.ts` (new), `web/tests/native-render.test.ts`, and the notebook: `works/phases/active/P30/phase.md`, `topics/notes-later.md`, `topics/operator-questions-decided.md`, `topics/doc-impact-detail.md`, this file
- validation:
  - `pnpm --dir web typecheck`: PASS
  - `pnpm --dir web lint`: PASS
  - `pnpm --dir web test`: PASS (28 files, 262 tests; 5 new in `tests/native-cites.test.ts`)
  - `pnpm --dir web build`: PASS
  - `python3 scripts/plugin_parity.py`: PASS
  - `python3 scripts/skills_parity.py`: PASS
  - `python3 scripts/workflow.py validate`: PASS (pre-existing warnings only)
  - live check, below: PASS
- deviations: none from `plan.md`. Two things worth naming: (1) the S12 render test forbade every `style=` attribute; the figures' `--fg-*` custom properties are required by the signed markup, so that test now allows exactly those numeric properties and still refuses any other `style` (recorded in `topics/notes-later.md` → *Figures and sources as shipped*); (2) the source `note` is plain text, not inline Markdown (OQ79, a schema change deferred).
- doc_impact: `frontend.md`, `decisions.md` (one line in `phase.md` → Doc impact; full lines in `topics/doc-impact-detail.md` → *P30.S16*)
- operator questions raised: OQ78-OQ82, all decided (collapsed in `phase.md`; full text in `topics/operator-questions-decided.md` → *P30.S16*)

## What was built

- **Image box (§1)** `figure-parts.tsx` `ImageBox`: `--fg-w`/`--fg-h` and `width`/`height` from the asset map, the loading box with the `.rd-skel` sheen before the `<picture>`, `is-loaded` on `load` or when `img.complete` at hydration, the edge hairline, the plate (`#ece4d7` in dark), the missing box (server-rendered for an asset the version lacks; swapped in on the image's `error`), an animated GIF's `<source media="(prefers-reduced-motion: reduce)">` still. `MissingBox` is shared.
- **Figure (§2)** `render.tsx` `figure`: caption (interface face, secondary), credit, the still-frame line (only for an animated asset with a still); `column` is server markup; `wide` is `ScrollFigure` (client): overflow measured by `useBox` (now exported, with a `watchLoad` flag so an image's `load` re-measures), `is-over`/`is-more-l`/`is-more-r`, the fades, the hint, and `tabindex`/`role=region`/`aria-label` only while it overflows.
- **Plain image (§3)** `paragraph`/`plainImage`: a native paragraph holding an image is split (before, image, after), `id="img-<name>"` with `-2`, `-3`, `data-block`.
- **Figure row (§4) and card (§5):** the signed markup and container queries (`rd` and `fgrow`), `fg-row--cards` stretching, items image, svg, card, diagram (a diagram item keeps S12's body in `div.kb-ch-diagram` until S17/S18), the card in every tone.
- **`svg` block (§6):** `ScrollFigure kind="svg"`; `--fg-vbw` from the viewBox, `--fg-minw = ceil(vbw × 11 / smallest font-size)` (16 if none), none in a row item; the tone classes `kb-fill-/kb-stroke-<tone>` on `03-diagrams`' values.
- **Sources (§7) and citation (§8):** `cites.ts` `planCitations` (pre-pass, a WeakMap keyed by the link node; per source: its citations in document order with the nearest h2) and `letters`; `sources`/`sourceBack` draw the number column, title, meta, URL (new tab), note, and the way back (one link, or a lead and lettered links, aria-labels with `, in “<section>”` only when an h2 precedes); the citation is one link `words + nbsp + [n]` (or `[n]` alone for a bare number), id `cite-<source>-<k>`, `:target` tints.
- **Tones:** `--dg-<tone>`, `-ink`, `-tint` for 13 tones in light, slate, sepia, system dark and print (generated from `03-diagrams`' `diagram.css`, not hand-typed), `--fg-plate`, `--fg-edge`; `.fg-tone-<tone>` for cards.
- **CSS:** the last block of `web/src/app/reader.css`. Where the prose kit's rules are more specific than the canvas's single classes (`.kb-ch a`, `.kb-ch ol`, `.kb-ch li`, `.rd-article [id]`, `.kb-ch img`) the figure rules carry `.kb-ch` so the signed values win; `.kb-ch img` excludes `.fg-media__img`.
- **Wiring:** `assetInfo` (via `documentAssets`) is passed by the reader article and the two legacy read pages; `assetUrl` still works but sizes nothing (16:9 fallback).
- **No server change:** S4 already records `width`, `height`, `animated` and `still`, and S5/S12/F2 shipped the ids and the sources fixture shape. `plugin_parity` unchanged.

## Live check

Instruments: Aside (`aside repl --account u1`) for geometry, screenshots and the iframe viewport harness (true 390/820/1024/1440 viewports); a CDP script over headless Chrome with a throwaway profile (real key events, `Emulation.setEmulatedMedia` for reduced motion, console/CSP/network capture; Aside records no console).

Runtime: the production build `next start` on `:3081` and a dev clone on `:3083` (opened at `localhost`) against a scratch API on `:8781` (scratch `KB_ROOT`, scratch database `kb_s16live` in `kb-p28s2-pg`, migrated to `0006`, `KB_GIT_COMMIT=false`, no Gemini keys), the fixture book from `scripts/publish_fixture_book.py`, and my own chapter (`figs`: every state in the round's table, with generated PNG and GIF assets; the "missing" image is a stored file deleted from the asset directory). The `fixtures` project was made public so the reader was checked anonymously. `:8766` and `:3030` were never used or stopped (both still listening); all my servers are stopped.

What was checked, with the numbers:
- **Image sizes** at 390, 820, 1024 and 1440 (size 3): a 1440×900 shot is the column's width (576 × 360; 356 × 223 at 390); the tall portrait 1170×2532 is 266 × 576 at every width; the 3:1 chart 576 × 192; the 260×100 small image is 260 × 100 and never scaled up; the sketch 1192×315 is 576 × 152 (wide); the missing box (900×500) is reserved at 576 × 320; the GIF 600×340 is 576 × 326.
- **Wide figure and svg scroll boxes at 390:** the wide figure and the chart overflow (576/356), carry `role=region`, `aria-label="Image, scrolls sideways"`, `tabindex=0`, the hint and the right fade; at 820 and up they fit (no region, no hint). The wide svg (viewBox 900, font 12) takes `--fg-minw: 825px` (`ceil(900 × 11 / 12)`) and scrolls with "Drawing, scrolls sideways"; the UI mock (320, font 13) takes 271px and scrolls only below 576. Scrolled to the end the left fade shows and the right one is gone. ArrowRight (real key events, 3 then 15) moved the focused wide figure 120px then to its end (220/220), and the fade classes followed.
- **Rows:** stacked at 390 (one column); at 820 and 1440 a row of two is two columns, a row of three is three columns at sizes 1 and 3 and one column at size 5 (the card rows too), a row of two stays two at size 5; items are top-aligned, an all-cards row stretches equally.
- **Loading and missing:** lazy images below the fold show the box without `is-loaded` until they arrive; after scrolling through, every image is `is-loaded` and the deleted one is the "Image not available" box with its alt (swapped on `error`), keeping its caption.
- **Reduced motion (CDP):** the GIF's `currentSrc` is the still PNG, the "Still frame" line is displayed, the skeleton animation is `none`; with motion allowed the GIF plays and the line is hidden. A plain image never shows the line.
- **Citations and sources:** one source cited four times shows "Back to the text:" with `a b c d`; a source cited once, "Back to the text" with `, in “<section>”` in its aria-label; an uncited one has none; `#src-alpha` lands with its top at 75px (3 + 56 + 16) with the sunken ground and hairline box; `#cite-src-alpha-2` lands at 91px (3 + 56 + 32) with the accent-soft tint; the bare number link shows `[2]` alone; the 140-character URL wraps in the column; the Korean source and card render.
- **Tones and themes:** all 13 cards in light, dark and sepia (screenshots read), svg shapes and labels in the tone classes in dark, the transparent PNG on the `#ece4d7` plate in dark with the edge hairline; the three themes were driven by setting the reader root's `data-md-color-scheme` (the same attribute the Display control sets).
- **No inner scroller, no sideways page:** at 390 and 320, sizes 1 and 5, `scrollWidth == clientWidth` and nothing past the column except the sources' item boxes (pulled out by `sm`, inside the 16px gutter, by design).
- **Console and CSP (CDP, anonymous, production build):** none, beyond a `favicon.ico` 404 (pre-existing) and the 404 for the one image file I deleted on purpose. The dev clone hydrated and logged only the pre-existing preload warning and HMR messages. The fixture chapter `all-blocks` (figure, rows, svg, two sources, three citations) also renders with no messages; `?v=1` renders.
- Keyboard: the tab stops in the figures are the links, citations, back links, source URLs and the scroll boxes only while they overflow.

Not verified, so not claimed:
- The canvas boards side by side (the canvas needs the design tool's runtime): geometry was compared with the prompt's numbers and the canvas CSS, as S13-S15 did.
- Real devices (D36 (7)); the three themes were driven by the attribute, not through the Display sheet on each (S13 checked that control); `prefers-color-scheme: dark` with the system choice (the block is a copy of the slate values, source audit only).
- A GIF still under reduced motion in Safari, and image loading failures other than a 404.
- Citation numbering in `md` (it has no sources blocks) and quiz inline links (S19 owns the quiz).

## Observations (not built around)

- A source `note` is text in the tree, so a link or emphasis in it cannot render (OQ79, a deferred-job candidate: "Sources `note` as inline Markdown", trigger: an author needs one).
- After a back link or `#cite-…` URL the browser also focuses the citation, so the reader's focus ring shows with the accent-soft tint (OQ82).
- A `default` card's ground is the page's own tint, so it reads as ink on the page (03's value, OQ78).
- The legacy read pages (`document-view.tsx`, the version page) pass `assetInfo` but have no `fg-*` CSS; S25 retires them.
- Residue: scratch database `kb_s16live` in `kb-p28s2-pg`; I moved S15's scratch `node_modules` copy into my dev clone (scratchpad only).
