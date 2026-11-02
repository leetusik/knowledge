# P39-hk.R1 — research: the glossary and math grammar, the engine, validation, the term window's wiring

## Context

P39-hk adds a per-chapter glossary (term links that open a definition window, a glossary section, a print appendix) and real typeset math (inline formulas, and a display block with a plain-words reading and a "where" legend). The confirmed intent is in `works/phases/active/P39-hk/intent.md`: read *Confirmed Intent* (the glossary data contract) and *Scope Added at Execution*, section **B**.

The look is **signed**: design job `10-reading-aids`, round `01-reading-aids`, signed as drawn on 2026-11-03. Its record is under `docs/reference/design/jobs/10-reading-aids/`:
- `rounds/01-reading-aids/result.md`: its `## Build` is the build contract;
- `rounds/01-reading-aids/frame.md`: the shared choices F1–F36;
- `canvas/project/`: the boards, read as data, especially `Formulas.dc.html`, `MathBlock.dc.html`, `MathInlineStates.dc.html`, `Gloss.dc.html`, `GlossStates.dc.html`, `Terms.dc.html` and `Print.dc.html`.

These answers were drawn and signed:
- glossary order A–Z;
- the glossary after the quiz and before the sources;
- a bottom sheet with no scrim on a phone;
- a legend symbol that is a glossary term is linked like a term in the text;
- an opened term looks unchanged;
- paper body text at the signed 10.5 pt.

Research must honor that look, never re-decide it. Its findings feed `P39-hk.DECOMP2`, which cuts the build.

This slice is **findings only**: no product code, no edits under `server/`, `web/`, `plugin/`, `tests/` or `scripts/`.

## Read first

- `python3 scripts/workflow.py phase-section P39-hk "Notes for later slices"`. These entries bind:
  - the grammar lives in four places, changed together;
  - annotations anchor by code-point offsets into the projection;
  - `paint.ts` assumes static markup;
  - the D1 notes on STIX Two Math, frame-G1 (√ with no trailing space, stepped rows aligned on the relation) and print-O1 (inline math on paper reads light at 14 px);
  - the P36-1s merge risk on `annotations.tsx`.
- `works/phases/active/P39-hk/topics/breakdown.md` → `## Build inventory` and `## P39-hk.R1`: the six questions and the output contract, restated below.

## The six questions: settle each into **one** approach, with the evidence (file:line) behind it

1. **The glossary grammar.**
   - The block's form: a typed fenced block in `TYPED_BLOCKS`, `server/native/schema.py` ~L39.
   - The term id namespace: shared with the chapter's `#id`s, or its own.
   - `term:` link resolution in `server/native/refs.py` and `web/src/lib/native/refs.ts`, with its refusal code(s).
   - One glossary per chapter, and how it relates to the existing `DEFINITION` callout (`web/src/lib/native/render.tsx`).
   - What the glossary contributes to the search projection (`server/native_ingest.py` `search_text`) and to the annotation projection (`project.py` / `project.ts`).
   - Aliases, the short definition (~40 words) and the optional longer one, per the data contract.
2. **The math grammar.**
   - The inline delimiter: `$…$` with currency guards (e.g. `mdit_py_plugins` dollarmath's rules), or an explicit form. Explain subjects carry prices like "$5", so a false positive matters.
   - The display block: a typed block carrying tex, reading and where.
   - How the legend's entries carry a term link (signed: a legend symbol that is a term is linked like a term).
   - How inline math counts in the annotation projection (`data-an-skip` / `data-an-len`), so highlights stay anchored.
3. **The engine.**
   - KaTeX vs Temml (MathML), or another server-side option, in the server-only renderer `render.tsx`.
   - Judge it against the signed canvas: STIX Two Math, √ spacing, steps aligned on the relation, size relative to body text, print, dark.
   - Fonts (self-hosting; licence), the CSP (`web/src/lib/csp.ts`), bundle and page weight, and accessibility (a text alternative a screen reader speaks; the canvas uses MathML `alttext`).
   - Any `pnpm add` probe runs in a **scratch copy** in the session scratchpad, never in `web/`.
4. **Validation at publish** with no Python math engine.
   - For example, a TeX allowlist validator twinned in Python and TypeScript and held by shared fixtures under `tests/fixtures/native/`, with a test proving the renderer accepts every allowlisted command.
   - Prefer no new Python dependency (`pyproject.toml` and `uv.lock` are template-identical files).
   - Name the refusal codes and where they surface.
5. **The term window's wiring.**
   - One chapter-level client controller with event delegation, or per-term islands. Weigh this against `paint.ts`'s static-markup assumption (no client island inside a stamped paragraph).
   - Its Esc beside `annotations.tsx`'s document-level Esc, and its relation to the annotation popover (signed: the two never open together).
   - `TAP_IGNORE` in `web/src/components/reader/chrome.ts`.
   - The phone bottom sheet versus the reader's existing sheets (`reader-frame.tsx`).
   - Keep the touch on `annotations.tsx` small and located (the P36-1s merge risk).
6. **Translation.** What keeps term ids and formulas verbatim across a translated chapter, and where a check enforces it (publish-time validation, the skill's translation step, or both).

For each question, give:
- the one approach;
- the alternatives rejected, in one line each, with why;
- the files the build will touch;
- the tests the build needs. Core behaviour only, per CLAUDE.md: the parse and refusal codes, and the Python/TS twin parity. Never style.

## Output (the slice's whole set)

- **`works/phases/active/P39-hk/topics/glossary-and-math.md`:** the long findings, one `##` section per question, plus `## Build cut impact`. That last section says whether `DECOMP2`'s build cut changes from `topics/breakdown.md` `## Build inventory` (slices added, merged, reordered, or a risk changed), and why.
- **`result.md`:** the verdict block first, then a short summary pointing at the topic.
- **The `notebook` field** of the verdict, since this runs in a wave and does not write `phase.md`:
  - `## Decisions`: one gist line per settled question, linking the topic;
  - `## Notes for later slices`: for `DECOMP2`, gist-sized, linking the topic;
  - `## Doc impact`: only if a finding changes durable truth beyond what DECOMP already noted;
  - `## Now`: one line on whether the build cut changes.
- An operator-only question (one that changes the signed look or the data contract) goes in the notebook's `## Operator Questions`, never only in `result.md`. If one blocks a settled answer, return `needs_operator`.

## Validation

- `git status --porcelain --untracked-files=all` shows nothing of this slice's beyond its set (`topics/glossary-and-math.md`) and its own `result.md`.
- `python3 scripts/workflow.py validate` passes (read-only check).

## Wave

- **Set:** `works/phases/active/P39-hk/topics/glossary-and-math.md`. Plus this slice's own `result.md`.
- **Beside it:** `P39-hk.S1`, set:
  - `plugin/skills/explain/SKILL.md`;
  - `.agents/skills/explain/SKILL.md`;
  - `web/public/SKILL.md`;
  - `plugin/agents/*.md`;
  - `works/phases/active/P39-hk/topics/skill-headings.md`.
- **Commits waiting:** none.
- **Join-rebuilt artifact:** none.
- **Checks scoped to this set:** `validate` only. No test suite, typecheck or build runs (findings only).
- **Rules:**
  - write no `phase.md` and run no writing engine command; return notebook entries in the verdict;
  - edit nothing outside the set; any other file needed means `needs_operator`;
  - throwaway probes live in the session scratchpad only.

## Dispatch

route=research
reason=kind research
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
