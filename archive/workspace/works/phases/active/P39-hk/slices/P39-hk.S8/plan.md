# P39-hk.S8 — typeset math in the reader and on paper, to the signed canvas

## Context

The operator asked for formulas that "looks good" and are "easy to understand", not raw symbols (`intent.md` § *Scope Added at Execution*, B). The look is **signed**: design job `10-reading-aids`, round `01-reading-aids`, signed as drawn on the operator's "accept", 2026-11-03. S7 put math into the native grammar (commit `23649f40`):
- an inline `math` node;
- the `formula` block (`tex`, `alt`, `reading`, `where`);
- the TeX allowlist.

The reader still shows inline TeX as code text, and draws nothing for `formula`. **This slice makes the reader and print typeset math exactly as signed.**

The approach is R1's (`works/phases/active/P39-hk/topics/glossary-and-math.md` **§3**):
- Temml MathML, server-only, rebuilt through an element and attribute allowlist into React elements, so no raw HTML ever enters the page;
- STIX Two Math, vendored;
- Chromium's √ gap corrected per instance by measurement.

The slice's pins and set are in `topics/breakdown.md` → `## P39-hk.S8`, and `## Pins for every build slice (S6–S9)` binds. Both are restated below where they bind hardest.

## RESPECT THE DESIGN (binding)

- Build from the **signed round**, never the live canvas:
  - `docs/reference/design/jobs/10-reading-aids/rounds/01-reading-aids/result.md` `## Build`: *Inline formula*, *Display formula block*, *Paper*;
  - `frame.md` F1–F36, especially F7, F8, F24, F27 and F36;
  - the snapshot `rounds/01-reading-aids/canvas/project/`: `MathBlock.dc.html`, `MathInlineStates.dc.html`, `MathBlockStates.dc.html`, `Formulas.dc.html`, `Print.dc.html` and `frame.css`.
- Never drop, simplify, restyle or "improve" a signed element.
- The `## Build`'s **canvas-only** list is never built. That includes the state bars, `Main.dc.html`, the phone boxes, the print desk, and the fixed `.ra-m msqrt { margin-inline-end: -0.38em }`.
- A state the record never drew becomes a line in the verdict's `notebook` → Operator Questions. Never invent one.
- Read `.claude/skills/design-cowork/reference/build.md` before building: RESPECT THE DESIGN, the fidelity sweep, Claude in Chrome.

## Read first

- `phase-section P39-hk Decisions`: R1's *Engine* line, and S7's *Math grammar settled*.
- `phase-section P39-hk "Notes for later slices"`: the entries `(from S7, for P39-hk.S8)`, `(from S7, for P39-hk.S8 and its plan)`, `(from R1, for P39-hk.S8 and S9)` (the √ gap) and `(from DECOMP2, for P39-hk.S8, S9 and REVIEW)` (the stack). Read the pointer lines' blocks in `topics/notes-for-later-slices.md`.
- S7's `result.md` → *For the orchestrator, when planning S8*. Its four points are folded in below.

## The work

1. **The engine.**
   - Run `pnpm --dir web add --save-exact temml@0.14.0`.
   - Add a new `web/src/lib/native/mathml.ts`. It calls `temml.renderToString` with `throwOnError`, `trust: false` and no `annotate`, and parses the result with `saxes` (already a dependency? check; if not, name what you use and why).
   - The result is rebuilt through R1's element and attribute allowlists into React elements. The rebuild drops every `style`, applies F24's `lspace="0"` rule, and **never** inserts raw HTML: no `dangerouslySetInnerHTML` (`render.tsx` L1–19 is the guarantee).
   - Trim a block scalar's trailing `\n` from `tex` before detecting `aligned` (S7).
2. **The markup.**
   - Replace S7's interim `case "math"` with `math.ra-m` carrying `data-an-len`, so the annotation projection still counts its TeX.
   - The inline `alttext` is derived linear text. That is R1's OQ7 recommendation, which the build proceeds on.
   - The `formula` block becomes `figure.ra-mb`.
   - `aligned` becomes stepped rows aligned on the relation.
   - The caption carries the reading, then "where" (ko 여기서), then `dl.ra-legend`, with one symbol column per chapter (F27).
   - A `term:` link in a legend's `means` renders as S6's missing-link text until S9.
3. **`FormulaBox`** (new `web/src/components/reader/formula-box.tsx`). It reuses `scroll-box.tsx`'s measured overflow: `role="region"` and the label "Formula, scrolls sideways" only when it actually scrolls, with the mask fade.
4. **The √ correction.**
   - A helper, `web/src/lib/reader/radicals.ts`, measures each `msqrt` / `mroot` after `document.fonts.ready` and sets a per-instance `marginInlineEnd`.
   - A small client mount, `web/src/components/reader/math-layer.tsx`, runs it over the article. Add its mount line in `reader-article.tsx`.
   - Hidden windows are skipped: S9 calls the helper when a window opens. Export it for that.
   - Never use a fixed margin.
5. **STIX Two Math.**
   - Vendor `web/public/fonts/reader/stix-two-math.woff2`.
   - Add the OFL line in `web/public/fonts/README.md` (R1 names the Reserved Font Name).
   - `--font-math`: `"STIX Two Math", "Cambria Math", math`, with `local()` first, in `reader-fonts.css`.
   - It loads **only on pages with math**.
6. **The CSS**, screen and paper: `reader.css` (or a new `reader-aids.css` imported beside it) and `kb-print.css`, light and dark. The math colour is `currentColor`.
7. **The anchor test.** Atoms are never painted, so `web/tests/reader-anchor.test.ts` must count an atom's (`data-an-len`) characters as unpainted in its round-trip assertion (L279–282). Change **only** that, narrowly: no other weakening of the invariant (S7's deviation 1).
8. **`notes-load.ts` `nameOf`** gains a `formula` case, so a note on a formula names it (S7).
9. **The Review card** (OQ9, built on its recommendation): a quiz card shows a formula as its linear text, made on the server where the queue is read. It never drops the formula silently.
10. **The old-version page** must not break on math. Touch it only if it needs the CSS.
11. **The verification chapter.**
    - Add `tests/fixtures/book/reading-aids.en.md` and its Korean translation `reading-aids.ko.md` to the dev fixture book.
    - It carries the signed fixture's text (F12: the three sections, the headings per F29), its four display formulas, its inline formulas, its 12-term glossary and the quiz item (F30).
    - Publish it with `scripts/publish_fixture_book.py --base-url <scratch>`; touch that script only if the new chapter needs it.
    - S9 and REVIEW reuse this chapter.
12. **Tests (core only).** Add `web/tests/native-math.test.ts`, checking that:
    - every TSV row renders through Temml in its context;
    - every element and attribute Temml emits for them is in the rebuild allowlist;
    - the F24 rule holds.

    S7's validator rules were written from KaTeX's parser as recalled. If a TSV sample or an allowlisted command fails in Temml, fix the TSV and both validator twins together, with their template copies and the plugin parity guard passing. They are in this set for that reason only, and each fix is named in `result.md`.

## The stack and the instrument (binding)

- **Servers.** `:3030` and `:8766` are the **main checkout's** servers. Never restart them, and never publish to them.
  - Run this worktree's own throwaway stack on free ports: an API with a scratch `KB_ROOT` / `KB_DB_PATH` and the fixture book. Use P30's recipe: `works/phases/active/P30/topics/notes-later.md` *Loading the fixture book*, and `P30/slices/P30.REVIEW/result.md` *Stack and instruments*.
  - Run `pnpm --dir web exec next dev -H 127.0.0.1 -p <port>` with `KB_API_BASE_URL` pointed at that API.
  - Also build the standalone production build in a scratch copy, exactly as `docs/current/operations.md` `## Operator Runtime` says.
  - Name the ports in `result.md`, and stop everything at the end.
- **The browser.** **Claude in Chrome on the agent profile.**
  1. `list_connected_browsers`.
  2. `select_browser` on deviceId `c14e5b18-f250-45f1-b92e-4a08a31197b5`, the one `## Operator Runtime` records, before any other browser tool.

  If the extension refuses the scratch port, or Chrome or that id is missing, return `needs_operator`. Never borrow another browser.
  - The window size is fixed: read `innerWidth`. For a true phone or tablet viewport, use the manifest's same-origin iframe harness against the standalone build.
  - For paper, use CDP `Page.printToPDF` on the same runtime, at A4 and letter.
- **The sweep:**
  - the *Formulas* states of `## Build` *Pages and states*, at phone 390×844 (and 320), tablet 820×1180 and desktop 1440×900, in light and dark, English and Korean;
  - the *Print* page's formulas;
  - the √ in Chromium, against WebKit's zero gap where the harness allows;
  - the font loading only on pages with math;
  - a screen reader's view of one formula, via the accessible-name computation. Real VoiceOver is the gate's.
- **Signed out.** The profile holds no session, so checks run anonymous. A state that needs a member is left to the gate walkthrough; name it.
- **Merge risk.** P36-1s edits `annotations.tsx` and the reader page on its own branch. This slice touches neither beyond the mount line in `reader-article.tsx`.

## Validation

- `pnpm --dir web typecheck` passes.
- `pnpm --dir web lint` passes.
- `pnpm --dir web exec vitest run tests/native-math.test.ts tests/native-render.test.ts tests/reader-anchor.test.ts tests/native-conformance.test.ts tests/csp.test.ts` passes.
- The standalone build in a scratch copy passes.
- The live sweep, with the instrument named.
- `deferred: whole-tree`: the whole web suite and the full pytest run (REVIEW runs them).

## Wave

- **Set:**
  - `web/package.json`, `web/pnpm-lock.yaml`;
  - new `web/src/lib/native/mathml.ts`, `web/src/lib/native/render.tsx`;
  - new `web/src/components/reader/formula-box.tsx`, `web/src/components/reader/scroll-box.tsx` (only if a prop is needed);
  - new `web/src/lib/reader/radicals.ts`, new `web/src/components/reader/math-layer.tsx`, `web/src/components/reader/reader-article.tsx` (the mount line);
  - `web/src/lib/reader/notes-load.ts`;
  - `web/src/content/chapter.ts`;
  - `web/src/app/reader.css` (or new `web/src/app/reader-aids.css`), `web/src/app/kb-print.css`, `web/src/app/reader-fonts.css`;
  - new `web/public/fonts/reader/stix-two-math.woff2` (and its OFL text), `web/public/fonts/README.md`;
  - `web/src/components/review/inline.tsx`, `web/src/app/review/page.tsx`, `web/src/lib/review/actions.ts`, `web/src/lib/review/types.ts`;
  - `web/src/app/(public)/documents/[id]/versions/[v]/page.tsx` (only if needed);
  - new `tests/fixtures/book/reading-aids.en.md`, `reading-aids.ko.md`, `scripts/publish_fixture_book.py` (only if needed);
  - new `web/tests/native-math.test.ts`, `web/tests/reader-anchor.test.ts`;
  - only if Temml refuses an allowlisted sample (work item 12): `tests/fixtures/native/tex-allowlist.tsv`, `server/native/tex.py`, `web/src/lib/native/tex.ts`, their copies `plugin/templates/kb/tests/fixtures/native/tex-allowlist.tsv` and `plugin/templates/kb/server/native/tex.py`, and `tests/fixtures/native/{math,err-math}.*` with their template copies.

  Plus this slice's `result.md`. It holds the scratch ports, the scratch copy, `web/node_modules` and the agent's Chrome profile.
- **Beside it:** `P39-hk.S10` (the skill's §4 grammar text). Its set is `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`, `plugin/agents/explain-critic.md`, `works/phases/active/P39-hk/topics/skill-headings.md`, and `works/phases/active/P39-hk/package/**` + `handoff-explain.md` (only if a cited heading moved).
- **Commits waiting:** none.
- **Join-rebuilt artifact:** none.
- **Checks scoped to this set:** the validation above.
- **Rules:**
  - write no `phase.md`, and run no writing engine command; return notebook entries in the verdict's `notebook` field:
    - Decisions: any choice the record left;
    - Notes for later slices: for S9 (the radical helper's API, the legend term link, the CSS hooks) and REVIEW (the stack recipe as run, what was left for the gate);
    - Doc impact: one line;
    - Operator Questions: an undrawn state;
    - Now.
  - Name the notes this slice consumed, for the orchestrator to remove.
  - Edit nothing outside the set; any other file means `needs_operator`, naming it.

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
