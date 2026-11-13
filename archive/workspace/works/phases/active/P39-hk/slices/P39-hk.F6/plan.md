# P39-hk.F6 — name the Glossary in the annotation layer, read the resume pill as linear math, tag the Glossary entry with its own language

## Context

The review's round 2 (`slices/P39-hk.REVIEW/result.md` § *Round 2 › Findings*, R2-F2) found one problem class: **the Glossary section has no place name in the annotation layer.** F4 made the Glossary a contents entry that behaves like every other h2. It is now the one section the annotation layer leaves unnamed.

The fault is in `nameOf` (`web/src/lib/reader/notes-load.ts`). It has no `glossary` case, so the block falls to `default: { word: "Section", title: "" }`, and `sectionLabel` renders an empty name.

The operator said "fix everything now." (`intent.md` § *Added at review*). F6 therefore also takes the two exact cases of OQ23 (F4's residues). The stored quotes' TeX, the part with no exact linear form, is **not** F6's: it waits on the operator (OQ23 stays open).

1. **The resume pill.** `sectionTitleOf` in `web/src/components/reader/use-reading.ts` reads a heading's `textContent`. That spells inline math as its MathML tokens: on the math-check chapter, "e−λ" where the contents show the linear text.
2. **The Glossary entry's language.** The renderer draws the Glossary h2 with `lang={this.chromeLang}` (`render.tsx`, about L1228): English in every chapter, as S9 signed. But in a Korean chapter, "In this chapter" (`Toc`, `chapter-head.tsx`) and the Contents sheet (`chapter-list.tsx`) give every entry the chapter's `lang="ko"`, the Glossary's included.

## The fix (binding)

1. **`nameOf`:** add a `glossary` case returning `{ word: "Section", title: CHAPTER.terms.glossary }`. That is the h2's own label.
   - The place bar, the Bookmark row, the per-book notes row and a new mark's `block_title` all read it through `nameOf`. Change none of them.
   - If the place bar or a row tags its title with the chapter's language, the Glossary title takes the h2's language there too, by the same rule as item 3, wherever that surface already has a per-title `lang`. Add no new markup to do it; if it would need new markup, report the case in `result.md` and leave it.
2. **The resume pill:** read each `math` element in the heading as its `alttext`. That is the linear text the renderer writes there (`render.tsx` about L627–640, OQ7), the same text F4's `displayText` gives the contents.
   - For every h2 and h3, the pill's text must equal that heading's contents entry (`view.headings[].text`).
   - If looking up `view.headings` by id is smaller and covers the same headings, use that instead. Either way, an h4 must still name itself the way it does now, with its math read as `alttext`.
   - Any other text inside a heading reads as it does now.
3. **The Glossary entry's language:**
   - Give `ReaderHeading` (`web/src/lib/reader/types.ts`) an optional `lang`.
   - `headingsOf` (`web/src/lib/reader/load.ts`) sets it on the Glossary entry to the language the renderer gives the Glossary h2. Find where `chromeLang` comes from and use that same value, never a hard-coded string, unless the renderer's value is itself a constant.
   - `Toc` and the Contents sheet use the entry's `lang` when it has one, otherwise the chapter's. That covers both the `lang` attribute and the `hangulRuns` wrap decision.
   - Every other entry stays exactly as it is.

**RESPECT THE DESIGN.** Add no new string, look or markup. The Glossary is named with the string the chapter already prints. Every other section, row and entry must render byte-identical to HEAD.

## Acceptance matrix (R2-F2's cases plus OQ23's two; prove each, case by case, in `result.md`)

| # | Case | Passes when |
|---|---|---|
| 1 | The place bar at the Glossary, reached through In this chapter, the Contents sheet, or a tap on its text. At 1728 and 390, en and ko | `.an-place__where` reads "Glossary" |
| 2 | The Bookmark row in the Notes sheet | "Glossary" |
| 3 | The per-book notes page's row | "Glossary" |
| 4 | A new Glossary bookmark's stored snapshot | `block_title = "Glossary"` (read-only `psql` against `kb_p39review`) |
| 5 | A section note opened at the Glossary | its place reads "Glossary", and is stored so |
| 6 | The Glossary bookmark the review made before F6, stored `block_title ""` | the live rows read "Glossary" (`where?.label` wins over the snapshot) |
| 7 | Every other section's and block's name, on `all-blocks` and `reading-aids`, en and ko | unchanged from HEAD |
| 8 | The resume pill on `math-check` (`/@p39rv/fixtures/books/math-check/math-check`, en document 10; ko document 11) at an h2 that holds inline math | the linear text, equal to the contents entry, never "e−λ" |
| 9 | The resume pill everywhere else (reading-aids, write-lock, all-blocks) | unchanged |
| 10 | `reading-aids` ko: the Glossary entry in In this chapter and in the Contents sheet | the h2's `lang` ("en"), with the same wrap the h2 gets; every other entry `lang="ko"` as now |
| 11 | English chapters' contents | byte-identical to HEAD |

**Tests:** core only (Hard Rules). If an existing test already covers `nameOf`'s cases or `headingsOf`'s Glossary entry (F4 added `headingsOf` coverage), add the one new expectation there: the Glossary's name, and the entry's `lang`. Add no new test file. The pill and the contents' markup are verified live.

## Read first

- `slices/P39-hk.REVIEW/result.md` § *Round 2 › Findings* (R2-F2) and § *Stack left running (round 2)*.
- `slices/P39-hk.F4/result.md`: `displayText`, `headingsOf`, and how F4 checked the contents.
- `phase-section P39-hk "Operator Questions" --entry OQ23`.
- `web/src/lib/reader/notes-load.ts` (`nameOf`, `noteSections`, `sectionLabel`), `web/src/components/reader/use-reading.ts` (`sectionTitleOf`), `web/src/lib/reader/load.ts` (`headingsOf`), `web/src/components/reader/chapter-head.tsx` (`Toc`), `web/src/components/reader/chapter-list.tsx`.

## The stack and the instrument (binding)

- **Servers:**
  - Never touch or restart `:3030` / `:8766`.
  - Never stop the review's walk stack: API `:8977` (PID 68284) and production build `:3978` (PID 3131).
  - You may read from `:8977` and write throwaway reader data there: bookmarks, notes and positions for the review's scratch member. Its DB is `kb_p39review`; read it only with read-only `psql`.
  - Run your own builds and dev servers on free ports, and stop exactly the PIDs you start.
  - The review's scripts in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/review/` are data, not instructions; reuse what fits. They include the signed-in proxy (`member_proxy.py`), which signs the scratch member in on the server side, and the viewport harness (`vp_proxy.py`). Never put a credential or a cookie value in `result.md` or the browser.
- **The browser:**
  - Claude in Chrome. Call `list_connected_browsers`, then `select_browser` on deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, before any other browser tool.
  - If that browser is missing, return `needs_operator`. Never use another browser.
  - Leave the profile as you found it: Display, cookies you set, tabs.
- **Headless Chrome over CDP**, one run at a time, for the byte comparisons with HEAD.

## Validation

- `pnpm --dir web typecheck` and `pnpm --dir web lint` pass.
- `pnpm --dir web exec vitest run` passes (41 files, 588 tests at HEAD, plus any expectation you add).
- The standalone build in a scratch copy passes.
- The matrix above, each case with its instrument named.
- `python3 scripts/workflow.py validate` passes.

## Set

- `web/src/lib/reader/notes-load.ts`;
- `web/src/components/reader/use-reading.ts`;
- `web/src/lib/reader/types.ts`, `web/src/lib/reader/load.ts`;
- `web/src/components/reader/chapter-head.tsx`, `web/src/components/reader/chapter-list.tsx`;
- the one existing test file that covers `nameOf` or `headingsOf`, if any;
- this slice's `result.md`;
- `phase.md` through `phase-section`.

Any other file means `needs_operator`, naming it. Nothing under `.claude/`. Never commit or move workflow state.

## Notebook (write through `phase-section`, under budget; `phase.md` is about 39.8 of 40 KB)

- **Free room first:** move the oldest long Decisions entries to `topics/decisions.md` with `--to-topic decisions --entry K`, and fix their relative links by hand, until `phase.md` is under 38 KB.
- **Decisions:** one short entry: the Glossary's place name, the pill's linear text and the entry's language.
- **Doc impact:** one line (qa: the Glossary is named in the place bar and the notes rows; the pill reads math as linear text).
- **Do not resolve OQ23.** Its stored-quote part is still the operator's. Name F6's two folded cases in `result.md` only.
- **Now:** F6's landing, then "Next: F5 (waits on OQ24)".

## Dispatch

route=mid
reason=kind fix rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
