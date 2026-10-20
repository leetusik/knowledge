# P30.S14 — Prose kit and chapter opening (`01-reader`)

## Goal

Style what S12's pipeline emits inside S13's shell, exactly as signed:
- §5 the chapter opening (`ChapterHead`), with the generated table of contents;
- §6 the prose kit (`Prose`): Literata at `--rd-fs` / 1.65, in ink;
- §6a Hangul runs inside other-language text;
- §7 callouts (`Callout`): every kind and the collapsed state;
- §8 code blocks (`CodeBlock`) and the syntax-role colours on `kb-tok-*`, if S13 didn't land them;
- §8a the diagram slot as a figure frame (the drawing itself is S17's);
- §9 tables (`ProseTable`) and §9a the scroll fades on a drawing's box and a table's box;
- the missing-link style.

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/01-reader/rounds/02-revise/build-prompt.md` §5–§9a, the prose strings,
    the relevant *Every state* rows, *Values P30 adds*;
  - `rounds/03-chapter-bar-and-border/result.md` `## Build`, the delta, which only touches controls
    here;
  - the canvas `rounds/03-chapter-bar-and-border/canvas/project/` (`reader.css`, `ChapterHead`,
    `HeadStates`, `Prose`, `ProseStates`, `Callout`, `CodeBlock`, `ProseTable`).
- `topics/notes-later.md` → *The render pipeline as shipped*, for the `kb-ch-*` hooks, and S13's notes on
  the shell's structure.
- Code: S13's reader components and CSS, `web/src/lib/native/render.tsx`.

## Approach

- Style the `kb-ch-*` hooks to the signed boards. Change `render.tsx`'s markup only where the signed parts
  need structure the pipeline doesn't emit, such as the table-of-contents generation, the callout title
  row, or the code block header. Keep the pipeline's guarantees: no raw HTML, CSP-safe.
- Build the table of contents from the chapter's h2/h3 ids, as §5 draws it.
- Make the scroll fades work with no inner scroller on the page itself. A table or drawing box scrolls
  horizontally inside its frame, as signed, and nothing else scrolls.
- Hangul runs: apply the signed treatment to runs of Hangul inside a non-Korean chapter. Detect them at
  render time, in the server component, using the method the prompt gives.
- Check the fixture book's `all-blocks` chapter and the KO/EN `write-lock` pair, in every theme and at
  every text size.

## Out of scope

- Figures and svg styling (S16), diagram drawing (S17/S18), quiz (S19), the resume pill and chapter end
  (S15).

## Dispatch

slice=P30.S14
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
