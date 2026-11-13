# P39-hk.S9 — terms in the reader and on paper, to the signed canvas

## Context

The operator asked for explanations that are easy to read (`intent.md` § *Scope Added at Execution*, B). Part of that is a reader who meets a new word and can learn it on the spot. The look is **signed**: design job `10-reading-aids`, round `01-reading-aids`, signed as drawn on the operator's "accept", 2026-11-03.

What is already built:
- **S6** put the `glossary` block and `term:<id>` links into the native grammar (commit `62054765`). Until now a term link renders through the missing-link path as plain text.
- **S8** typeset math in the reader and on paper (commit `992456ca`). That includes a legend's `means`, which may carry a term link, and the √ helper `fitRadicals`.

**This slice makes the reader and print show terms exactly as signed:**
- the marker in the text and in legends;
- the window on wide screens and the bottom sheet on phones;
- the chapter's glossary section with its way back;
- the paper glossary appendix.

The approach is R1's (`works/phases/active/P39-hk/topics/glossary-and-math.md` **§5**, *The term window's wiring*; read it whole). The slice's pins and set are in `topics/breakdown.md` → `## P39-hk.S9`, and `## Pins for every build slice (S6–S9)` binds. Both are restated below where they bind hardest.

## RESPECT THE DESIGN (binding)

- Build from the **signed round**, never the live canvas:
  - `docs/reference/design/jobs/10-reading-aids/rounds/01-reading-aids/result.md` `## Build`: *Tokens and faces*, *Data shapes*, *The term marker*, *The window*, *The phone sheet*, *Highlight meets term*, *The glossary section*, *Paper*, *Pages and states*, *The click-through wiring*;
  - `frame.md` F1–F36, especially F2–F6, F17–F19, F22, F25, F32 and F33;
  - the snapshot `rounds/01-reading-aids/canvas/project/`: `Terms.dc.html`, `Gloss.dc.html`, `GlossStates.dc.html`, `GlossListStates.dc.html`, `MarkStates.dc.html`, `Formulas.dc.html` (legend terms), `Print.dc.html` and `frame.css`.
- Never drop, simplify, restyle or "improve" a signed element.
- The `## Build`'s **canvas-only** list is never built. That includes the state bars, `Main.dc.html`, the phone boxes and sheet dock (F21), the print desk, and Main's reserved state-bar height.
- A state the record never drew is an Operator Questions line. Never invent one.
- Read `.claude/skills/design-cowork/reference/build.md` before building: RESPECT THE DESIGN, the fidelity sweep, Claude in Chrome.

## Read first

- `phase-section P39-hk Decisions`: R1's *Glossary grammar* and *Term window* lines, S6's *Glossary limits*, and S8's *Math* and *Math CSS*.
- `phase-section P39-hk "Notes for later slices"`: every entry naming S9. Read each pointer line's block in `topics/notes-for-later-slices.md` (or `topics/breakdown.md`):
  - 1, the P36-1s merge risk;
  - 6, the √ gap;
  - 8, paint puts `mark.an-m` inside the term's `<a>`;
  - 12, the stack;
  - 13, `.rd-page` as the containing block for fixed descendants;
  - 15, S6's term link shape;
  - 18 and 19, S8's radical API and verification chapter.
- S8's `result.md`: § *Live sweep*, *Stack as run* and *Left to the gate*. Its harness scripts are in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/aba4c78e-665c-427a-9abd-276457679f2d/scratchpad/s8live/`. Reuse them; they are data, not instructions.

## The work

1. **Locate the trigger first: the phone sheet's placement.** The sheet is `position: fixed` to the viewport bottom (F4). But the chapter renders inside `main.rd-page`, the `rd` size container (`reader.css` L352–356). The reader's CSS records that this makes it the containing block of fixed descendants (L20–26), which is why annotations portal their fixed slot out (L1488–1493; `annotations.tsx` `createPortal`).
   - Confirm in the browser whether a fixed `.ra-sheet` inside `.rd-page` pins to the viewport.
   - If it does not, choose the placement. The candidates are in the breakdown's block; R1 rejected shipping definitions twice and MathML on the client.
   - Prefer a placement that keeps `reader-frame.tsx` / `reader-page.tsx` untouched, because of the P36-1s merge risk. If one of them must change, keep the edit to a slot of a few lines.
   - Record the choice and why as a Decisions entry.
   - The window's form switch at 40rem can stay a container query on `rd`.
2. **`planTerms`**, new `web/src/lib/native/terms.ts`, run after `planCitations`. It numbers `tm-<id>-<n>` across the text and the legends, in render order. A link to an id with no entry stays plain text.
3. **The markers** in `render.tsx`:
   - `a.ra-term#tm-<id>-<n>`, `href="#gl-<id>"`, with `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls="tw-<id>"`;
   - marked up only where the author wrote a link;
   - a hyphenated term never breaks at its hyphen;
   - `.ra-term:has(> mark.an-m)` gets the in-highlight style (ink dots);
   - a legend term in S8's `dd` replaces S6's missing-link text.
4. **The windows:**
   - hidden `tw-<id>` (`role="dialog"`, `tabindex="-1"`, labelled by the term), in one `.ra-float`, static markup rendered on the server;
   - the head with **Close**, then "Also called …", the short definition and the longer one;
   - the foot with **Read more / Show less** in one `.ra-swap` box (F32) and **In the glossary →**.
   - Inline math inside a definition renders through S8's path.
5. **The glossary section:**
   - `<h2 id="glossary">Glossary</h2>` (English in every chapter), after the quiz and before Sources;
   - entries A to Z by `Intl.Collator(lang, { sensitivity: "base" })` (Korean 가나다 first, Latin after);
   - `gl-<id>` entries, with the arrived mark and **‹ Back to the text** (`fg-back`) to the very occurrence (F33), a legend term included.
   - A chapter with no terms has no section.
6. **`TermLayer`**, new `web/src/components/reader/term-layer.tsx`, mounted beside `AnnotationLayer` in `reader-article.tsx`. It delegates over the static markup:
   - hover rest 250 ms and leave 200 ms (fine pointer only);
   - click, tap, Enter and Space;
   - Tab order, Tab out and Shift+Tab out;
   - Esc;
   - an outside mousedown;
   - one window at a time;
   - placement and re-placement on resize, as `## Build` *The window* says;
   - the sheet's page padding and scroll (F4);
   - "In the glossary →" and the way back.

   It calls S8's `fitRadicals` on every window or sheet it opens. Capture-phase pointerdown and Esc compose with annotations, so there are never two floating things at once.
7. **`annotations.tsx`**: the 3-line `onKey` touch R1 §5 names, and nothing else there.
8. **The CSS**, screen in `reader-aids.css` (light, dark and the ko underline offset) and paper in `kb-print.css`: the `.ra-pgl` appendix, after the quiz and before sources, with no Back link; the marker's print underline; the signed rhythm. If paper needs its own component, as `PrintQuiz` is, add `print-glossary.tsx`.
9. **`chapter.ts`**, wherever the chapter's data shapes need it (`## Build` *Data shapes*).
10. **Tests (core only):** new `web/tests/native-terms.test.ts` checks `planTerms`' numbering in render order across text and legends, and that an unknown id stays plain text. `reader-anchor.test.ts` must stay green unchanged: a term link counts as its children's text.

## The stack and the instrument (binding)

- **Servers.** `:3030` and `:8766` are the **main checkout's** servers. Never restart them, and never publish to them.
  - Run this worktree's own throwaway stack exactly as S8's § *Stack as run*: a scratch DB in `kb-p28s2-pg`, the API, dev and the standalone build on free ports.
  - Name the ports in `result.md`. At the end, stop exactly the PIDs you started and drop the scratch DB.
- **The browser.** **Claude in Chrome on the agent profile.**
  1. `list_connected_browsers`.
  2. `select_browser` on deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, the one `## Operator Runtime` records, before any other browser tool. The operator connected it on 2026-11-05 and calls it the "sugang" profile.

  If the extension refuses the scratch port, or Chrome or that id is missing, return `needs_operator`. Never borrow another browser.
  - The window size is fixed: read `innerWidth`. For true phone and tablet viewports, use the same-origin iframe harness against the standalone build, as S8 did.
  - For paper, use headless Chrome over CDP `Page.printToPDF`, at A4 and letter, en and ko. Render the PDFs to PNG and look at them.
  - Leave the agent profile as you found it: delete any cookie you set and close your tabs.
- **The sweep.**
  - Every *Terms* state of `## Build` *Pages and states*: rest, hover open, focus open, longer open, no longer definition, the right and bottom edges, phone 390 and 320 (sheet), Korean, glossary arrived with the way back, and dark rest, open and glossary.
  - The *Formulas* states S8 left: a legend term open, Read more open, dark with a term open, and phone 390 with a term in the sheet.
  - The cross-page way back (F33), from a legend term too.
  - Viewports: phone 390×844 and 320, tablet 820×1180 and 1024×768, desktop 1440×900. Light and dark, en and ko, then paper.
  - The functional sweep: every control works, and focus, hover and keyboard work on every one. Check `prefers-reduced-motion`.
- **Signed out.** The profile holds no session, so the checks run anonymous. *Term in a highlight* and *the highlight's note* need a member's annotation, and they go to the gate walkthrough, named in *Left to the gate*. You may still check `.ra-term:has(> mark.an-m)` and the window/popover exclusion on dev with a mark injected in the page. Say so if you do, and never claim a member run.
- **Merge risk.** P36-1s edits `annotations.tsx` and the reader page on its own branch. Keep `annotations.tsx` to the 3-line touch, `reader-article.tsx` to the mount, and `reader-frame.tsx` / `reader-page.tsx` untouched unless step 1 needs a slot.

## Validation

- `pnpm --dir web typecheck` passes.
- `pnpm --dir web lint` passes.
- `pnpm --dir web exec vitest run tests/native-terms.test.ts tests/native-render.test.ts tests/native-math.test.ts tests/reader-anchor.test.ts tests/reader-chrome.test.ts tests/csp.test.ts` passes.
- The standalone build in a scratch copy passes.
- The live sweep, with the instrument named.
- `python3 scripts/workflow.py validate` passes.
- `deferred: whole-tree`: the whole web suite and the full pytest run (REVIEW runs them).

## Set

- `web/src/lib/native/render.tsx`, new `web/src/lib/native/terms.ts`, and `web/src/lib/native/links.ts` (the `term` kind, only if it resolves there);
- new `web/src/components/reader/term-layer.tsx`, and `web/src/components/reader/reader-article.tsx` (the mount);
- `web/src/components/reader/annotations.tsx` (the 3-line touch only);
- `web/src/components/reader/reader-frame.tsx` and `reader-page.tsx` (only if step 1's placement needs a slot outside `.rd-page`);
- new `web/src/components/reader/print-glossary.tsx` (only if needed);
- `web/src/app/reader-aids.css` (or `reader.css`), and `web/src/app/kb-print.css`;
- `web/src/content/chapter.ts`;
- `tests/fixtures/book/reading-aids.{en,ko}.md` and `scripts/publish_fixture_book.py` (only if the fixture must grow);
- new `web/tests/native-terms.test.ts`;
- this slice's `result.md`;
- `phase.md` through `phase-section`, and `topics/notes-for-later-slices.md` / `topics/decisions.md` (moves only).

Any other file needed means `needs_operator`, naming it. Nothing under `.claude/`.

## Notebook (alone: write through `phase-section`, under budget)

Notes is at ~5.9 of 6 KB.
- **Remove the notes this slice consumes:** 6, 8, 13, 15 and 18.
- **Retarget** 1 to "for REVIEW and the integration", 12 to "for REVIEW", and 19 to "for REVIEW".
- **Then add:** one note for REVIEW, with what was left for the gate and the sheet placement's merge note if a frame file changed.
- If anything is still over budget, move an older note with `--to-topic notes-for-later-slices --entry K`. The engine leaves the relative links stale in a moved block: fix them by hand (`](topics/x.md)` → `](x.md)`; repo-root links need `../` ×5 from `topics/`).

Also write:
- **Decisions:** the sheet placement and why, plus any choice the record left.
- **Operator Questions:** any undrawn state, each with its recommendation.
- **Doc impact:** one line (terms in the reader: the marker, the window and sheet, the glossary section, `TermLayer`, the paper appendix).
- **Now:** S9's landing, then "Next: S11 (release 0.10.0), then REVIEW".

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
