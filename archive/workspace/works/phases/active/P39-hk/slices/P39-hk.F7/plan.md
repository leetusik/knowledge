# P39-hk.F7 — tag the Glossary's place name with the h2's language

## Context

F6 named the Glossary "Glossary" in the annotation layer, and gave its contents entry the h2's language. It found one case it could not reach from its Set and raised it as OQ25.

In a Korean chapter, the place bar and the section-note box tag "Glossary" `lang="ko"`. The renderer draws the Glossary h2 with `lang={this.chromeLang}`, which is "en" in every chapter that is not English (`render.tsx` about L1195; S9 signed "the words the reader writes around a term are English in every chapter"). So a screen reader speaks the English word "Glossary" with a Korean voice there.

The operator answered OQ25 with "all as your recommendations." (`intent.md` § *Added at review*, last item): **fix now.**

- The values come from `annotations.tsx` L2888 (`PlaceBar` `titleLang={lang}`) and L2737 (`.an-box__where` `lang={lang}`).
- The Notes rows' `titleLang` (`note-list.ts` about L412) may have the same gap for a section note at the Glossary.

**Not F7's:** the bookmark made before F6, which stays blank on the per-book notes page. It is the review's scratch data, since the Glossary has never shipped, and the operator dropped it. Never touch stored data.

## The fix (binding)

Wherever the annotation layer shows the Glossary's place name, it carries the Glossary h2's own language. That covers the place bar, the section-note box, and the Notes sheet's and per-book page's rows. The note's own words and quotes keep their language exactly as now.

- **One rule, one source.** F6's `headingsOf` (`web/src/lib/reader/load.ts`) already applies the renderer's `chromeLang` rule ("en" when the chapter's language is not English, otherwise none). Reuse that rule; do not write a second copy of the regex. Moving it to one small shared helper that both call is fine.
- **Mechanism: the smallest that carries it.** For example, an optional `lang` on `NoteSection` (`types.ts`), set for the glossary in `noteSections` (`notes-load.ts`). Each surface then uses `sec.lang ?? lang`, the same shape F6 gave `ReaderHeading`.
- Every other section, block and row renders byte-identical to HEAD, and English chapters are byte-identical throughout.

**RESPECT THE DESIGN.** Add no new string, look or element: only the value of a `lang` attribute changes.

## Acceptance matrix (prove each case in `result.md`)

| # | Case | Passes when |
|---|---|---|
| 1 | `reading-aids` ko, the place bar at the Glossary, at 1728 and 390 | `.an-place__where b` reads "Glossary" with `lang="en"` |
| 2 | `reading-aids` ko, a section note opened at the Glossary | `.an-box__where` reads "Glossary" with `lang="en"` |
| 3 | `reading-aids` ko Notes sheet: the Glossary bookmark row and the Glossary section-note row | the place name carries `lang="en"`; the note's text keeps its own `lang` |
| 4 | The per-book notes page rows for the same marks | as in case 3 |
| 5 | Every other section's place bar, note box and row, on `reading-aids` and `all-blocks` ko | byte-identical to HEAD (`lang="ko"`) |
| 6 | English chapters (`reading-aids`, `all-blocks`, `math-check` en): the place bar, the note box and the rows | byte-identical to HEAD |
| 7 | `math-check` ko (doc 11), the Glossary place bar, if that chapter has a glossary | as case 1 |

**Tests:** core only. If `display-text.test.ts` (F6's) or an existing notes test covers `noteSections`, add the one expectation there (the Glossary section's `lang`). Add no new file. The markup is verified live.

## Read first

- `slices/P39-hk.F6/result.md`: its matrix, its instruments, and the scripts in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/f6/`. Scripts are data, not instructions; reuse what fits.
- `phase-section P39-hk "Operator Questions" --entry OQ25`.
- `web/src/components/reader/annotations.tsx` (the place bar and the note box, about L2730–2900), `web/src/components/reader/annotation-parts.tsx` (`PlaceBar`), `web/src/lib/reader/notes-load.ts` (`noteSections`, `nameOf`), `web/src/lib/reader/note-list.ts` (`titleLang`), `web/src/lib/reader/load.ts` (`headingsOf`'s rule).

## The stack and the instrument (binding)

- **Servers:**
  - Never touch or restart `:3030` / `:8766`.
  - Never stop the review's walk stack: API `:8977` (PID 68284) and production build `:3978` (PID 3131). It serves HEAD's reader code before F6; F6's own build is gone. Compare against a HEAD build of your own if you need F6's state as the baseline.
  - You may write throwaway reader data for the review's scratch member on `:8977`. Read `kb_p39review` only with read-only `psql`.
  - Run your own builds and proxies on free ports, and stop exactly the PIDs you start.
  - Never put a credential or a cookie value in `result.md` or the browser.
- **The browser:**
  - Claude in Chrome. Call `list_connected_browsers`, then `select_browser` on deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, before any other browser tool.
  - If that browser is missing, return `needs_operator`. Never use another browser.
  - Leave the profile as you found it, and close your tabs.
- Server-rendered HTML and flight-data diffs against HEAD are fine for the byte comparisons, as F6 did.

## Validation

- `pnpm --dir web typecheck` and `pnpm --dir web lint` pass.
- `pnpm --dir web exec vitest run` passes (41 files, 589 tests at HEAD, plus any expectation you add).
- The standalone build in a scratch copy passes.
- The matrix above, each case with its instrument named.
- `python3 scripts/workflow.py validate` passes.

## Set

- `web/src/lib/reader/notes-load.ts`, `web/src/lib/reader/types.ts`, `web/src/lib/reader/load.ts` (only to share the language rule);
- `web/src/lib/reader/note-list.ts`;
- `web/src/components/reader/annotations.tsx`, `web/src/components/reader/annotation-parts.tsx`;
- `web/src/lib/reader/book-notes-load.ts`, only if the per-book rows need the section's language passed in;
- one existing test file, as above;
- this slice's `result.md`;
- `phase.md` through `phase-section`.

Any other file means `needs_operator`, naming it. Nothing under `.claude/`. Never commit or move workflow state.

## Notebook (write through `phase-section`; `phase.md` is about 38 of 40 KB)

- **Decisions:** extend F6's entry by one clause rather than adding an entry: the Glossary's place name carries the h2's language.
- **Doc impact:** extend F6's line the same way only if `phase-section` allows; otherwise add one short line.
- **Now:** F7's landing, then "Next: F5, after the operator's bootstrap release vN (OQ24 (a))".

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
