- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Built the chapter opening (§5) and the prose kit (§6-§9a) from the signed `01-reader` rounds 02 and 03: `ChapterHead` with the generated contents and both notices, the prose kit on S12's `kb-ch-*` hooks, callouts, code, ASCII drawings, the diagram slot's figure, tables with measured scroll boxes and side-aware fades, the missing-link style, and Hangul runs wrapped in `lang="ko"` at render time. Live-checked on the production build in Aside and headless Chrome; every gate passes.
- files_changed:
  - web/src/app/reader.css (the S13 stand-in replaced by the real kit, last block)
  - web/src/components/reader/chapter-head.tsx, versions-button.tsx, scroll-box.tsx (new)
  - web/src/components/reader/reader-article.tsx, reader-frame.tsx, chapter-list.tsx
  - web/src/lib/native/render.tsx
  - web/src/lib/reader/hangul.tsx (new), load.ts, types.ts, state-view.ts
  - web/src/content/chapter.ts, reader.ts
  - web/tests/reader-hangul.test.ts (new)
  - works/phases/active/P30/phase.md (Decisions, Doc impact, Operator Questions, Notes, Now), topics/operator-questions-decided.md, topics/doc-impact-detail.md, topics/notes-later.md
- validation:
  - `pnpm --dir web typecheck` pass
  - `pnpm --dir web lint` pass
  - `pnpm --dir web test` pass (26 files, 244 tests; the four new ones are the Hangul-run and title-joiner core tests)
  - `pnpm --dir web build` pass (run twice; the final build is the one live-checked)
  - `python3 scripts/plugin_parity.py` pass; `python3 scripts/skills_parity.py` pass; `python3 scripts/workflow.py validate` pass (two pre-existing doc warnings)
  - server suite not run: no server file changed
- deviations: none from the plan's scope. The undrawn choices are decided as OQ63-OQ68 below.
- doc_impact: `frontend.md, decisions.md: P30.S14` (one line on `phase.md`; full lines in `topics/doc-impact-detail.md` → *P30.S14*)

## What was built

- **Opening (§5):** a server component. In order: the book line ("CHAPTER N OF M" or "DOCUMENT" with the project), the title (display face, three sizes at 40rem and 64rem, U+2060 after each hyphen between letters, balanced, `keep-all` in Korean), the lede (only with a `summary`), the version line ("vN · Published d Mon yyyy", plus "Version history" when the document has more than one version), the "Older version" and "Older translation" notices, and the contents ("IN THIS CHAPTER/DOCUMENT": two or more h2s, h3s under them, two columns from 40rem, 44px rows). The view model gained `summary`, `date`, `project` and `staleSource`.
- **Prose kit (§6):** headings, paragraphs, lists, blockquote, hr, strong/em/del, inline code (`slice` box decoration), links (accent underline, " · new tab" on external ones, a missing link is plain text), Korean rules including Korean emphasis upright and semibold, a table cell's no-break rule.
- **Hangul runs (§6a):** `hangulRuns` in `web/src/lib/reader/hangul.tsx` (the prompt's pattern) is applied in the server renderer to every text node of a non-Korean variant (so also link, emphasis and strong text, callout titles, table cells, a diagram's title and caption), and to the opening, the contents entries, the Contents sheet's chapter and section titles and the chapter bar's neighbour titles. Not applied to code or attributes.
- **Callouts (§7):** the type word in mono over the tinted ground, then the title; collapsed is a `<details>` whose summary row is 44px with Show/Hide.
- **Code (§8):** the title bar when titled, one block per source line with the 2ch hanging indent, no ligatures; a `text` fence is a drawing in an `ArtBox` (`white-space: pre`, line-height 0.93, scrolls inside its box with the hint and fades).
- **Diagram slot (§8a):** a `figure` at the column's width, `lg×k` above, carrying the block id, the title as its accessible name and the caption (the drawing is S17/S18's).
- **Tables (§9, §9a):** a `TableBox` client island; wide (8+ columns) and long (more than 20 rows) from the data, "scrolls" measured; the fades appear only on a side where more remains; the long table's sticky header sits flush under the top bar while the chrome shows and under the progress line while it hides (the safe area counted); a long table wider than the column takes the 30rem box with its header sticky at the box's top.

## Live check

Instruments: Aside (`aside repl --account u1`) for geometry, interaction and screenshots; the iframe harness (`scratchpad/harness.mjs`) for true narrow viewports; a CDP script over headless Chrome with a throwaway profile for console and CSP capture (positive control: a `data:` page's `console.error` was captured). Aside recorded no console, so it was not used for absence.

Runtime: the production build (`next start`, `:3044`) against a scratch API on `:8767` (scratch `KB_ROOT`, scratch database `kb_s14live` in `kb-p28s2-pg`, no Gemini keys), the fixture book loaded with `scripts/publish_fixture_book.py`, plus scratch documents of mine: a "Prose kit" chapter (every callout, a 78-column drawing, an 8-column table, a 25-row table, a Korean table, Hangul runs inside English, a hyphenated title), an English v2 of `write-lock` (so the Korean translation is older), and a plain `md` document with a drawing. A dev server from a scratchpad clone (`:3045`) was used for CSS iteration only. `:8766` and `:3030` were never used or stopped; all my servers are stopped and the Aside `kb_reader` cookie was cleared.

What was checked:
- **Geometry (computed styles at size 5, three widths):** the title 38.5/46.2/52.8px (1.75/2.1/2.4 × 22), the opening's top padding 88px growing to 132px at 64rem, h2 31.9px (1.45em), body 22px / 36.3px (1.65), callout padding 22px 26px, code 0.8333 × text, table cell padding 0.55rem 0.75rem, the contents in one column below 40rem and two from it.
- **Viewports** (390×844, 820×1180, 1024×768 and 1440×900 true viewports, and 320 for the narrowest): on `prose-kit`, `all-blocks` and the md document no element past the column outside the two signed boxes, no sideways page scroll (`scrollWidth == clientWidth`), and the only scrolling elements are drawings and tables. "No inner scroller" holds.
- **Screenshots** of the opening, notices (older version, older translation, Korean), prose, lists, callouts in all kinds, code, the drawing at its start/middle/end, the 8-column table at its start/middle/end, the long table's phone box and its sticky header (chrome shown and hidden), the Korean table, the md document, in light, dark and sepia and at sizes 1, 3 and 5.
- **Interaction:** a collapsed callout opens and closes by click; Enter on its focused summary toggles it; the focus ring is the 2px accent ring; the contents entry `#tables` jumps and lands under the bars (72px from the top); ArrowRight ×12 on the focused wide table reaches the last column and leaves only the left fade; the tab stops in the body are the links, the summaries, the drawings and the wide or long tables (an ordinary code block is no longer a stop).
- **Console and CSP (CDP, anonymous reader, production build):** no console, exception, CSP or network messages on `all-blocks`, `prose-kit`, `write-lock?lang=ko`, `all-blocks?v=1` and the md document, beyond a pre-existing `favicon.ico` 404. The anonymous reading also proves the opening and the kit render for a signed-out reader. The dev server logs only its HMR WebSocket noise and does not hydrate under this setup (S13's note on dev); no hydration error was logged.

Not verified, so not claimed:
- Space on a collapsed callout's summary: Aside's synthetic `Space` does not activate any `<summary>` (checked on a native one), so it is native browser behaviour I could not drive; Enter and click were driven.
- Row 30 sitting under its column at size 5 in the long table's box, measured as in the prompt: the sticky-header behaviour was checked at the default size only, the by-column alignment was not measured.
- Reduced motion: a source audit only (the shell's rule zeroes every transition under `.rd-root`; the fades use `--rd-ease` and `opacity` only).
- Real devices (D36 (7)), 150% and 200% browser zoom (covered only by the equivalent narrow widths, as in S13), and the canvas boards side by side (the canvas needs the design tool's runtime, so geometry was compared to the signed CSS and prompt numbers instead).
- The "Version history" link-button announces an event and nothing opens until S15 (OQ64).

## Decided (undrawn gaps; full text in `topics/operator-questions-decided.md` → *P30.S14*)

- OQ63: the canvas cascade wins on a callout body's first block (`sm×k` for a paragraph, list or code).
- OQ64: the Version history button is built and announces `reader:open-sheet`; S15 adds the sheet and the listener.
- OQ65: an md document opens with the signed opening and its own leading H1 is dropped when it is the title; no contents (md headings carry no ids).
- OQ66: scrolling blocks are measured client islands; the drawing is always a tab stop, a table only when it is a box; ordinary code is not.
- OQ67: spacing the canvas never draws (list-item paragraphs, md `h1`, S16-S19's blocks) takes the nearest drawn pattern.
- OQ68: the "Older translation" notice shows only on the translation's current version and the notices' actions are plain links.

## Dead ends and notes

- The first CSS draft let `:is()` specificity beat the nested-list and list-item paragraph rules (nested bullets were `disc`, and tight items spaced out); fixed by splitting the selectors and re-checked.
- `--dump-dom` in headless Chrome ran no effects (no `is-over`), and `setDeviceMetricsOverride` did not narrow the window; the CDP script (real events) and the Aside iframe harness replaced them.
- In zsh an unquoted `$dim` is not split: a loop that read `set -- $dim` produced a 300px iframe for one run; re-run correctly.
- Files created were formatted with prettier; existing web files were not (D22).
- Observation for a later slice: the page `<title>` of a reader page reads "Documents · knowledge" (S13's metadata, not touched here).
