# P39-hk.S7 — math in the native grammar: inline `` $`…`$ ``, the `formula` block, the TeX allowlist, the translation 422s

## Context

P39-hk adds real typeset math to the native chapter grammar. The operator asked for "looking good formula … don't just shitting around with 수학 기호들" (`intent.md` § *Scope Added at Execution*, B). The look is signed (design job `10-reading-aids`). S8 builds the rendering; this slice adds **the grammar**:
- inline math;
- the display `formula` block with its plain-words reading and "where" legend;
- the TeX allowlist that validates every formula at publish;
- the translation checks that keep term ids and formulas verbatim.

S6 just landed the `glossary` block and `term:` links in the same four places (commit `62054765`). Build on its shape.

The approach is settled in `works/phases/active/P39-hk/topics/glossary-and-math.md` **§2, §4, §6**, R1's findings. Read them whole. The slice's pins and set are in `topics/breakdown.md` → `## P39-hk.S7`, restated below.

## Read first

- `phase-section P39-hk Decisions`: R1's *Math grammar*, *Validation* and *Translation* lines; S6's line.
- `phase-section P39-hk "Notes for later slices"`: the entry `(from S6, for P39-hk.S7)`, on `in_glossary` / `inGlossary`.
- S6's `result.md` and diff (`git show 62054765 --stat`), so you follow its patterns: post-walk resolution, the fixture layout, the template copies and the manifest.

## The work

1. **Inline math `` $`…`$ ``.**
   - A post-pass over the inline children both parsers produce, at every depth, native only, turns a code span between two dollars into `{type:"math", tex}`.
   - `_plain` / `plainText` treat it like code. The annotation projection counts its TeX as one atom (`data-an-len`), so stored annotation offsets stay valid.
   - `$5`, `$HOME/$USER` and `` $ `ls` `` stay text.
   - Math is allowed in a glossary definition (OQ4 / F31) and in a legend's `means`.
2. **The `formula` block:**
   - `tex`;
   - `alt`, the spoken text;
   - `reading` *(md)*, with no math allowed in it;
   - `where`, 1–20 items of `{sym, means}`, where `means` is *(md)* and may carry a `term:` link, which is signed: a legend term is linked like a term.

   **`formula-legend`** refuses a `sym` the formula lacks, by R1 §2's rule.
3. **The TeX allowlist validator**, twinned: a new `server/native/tex.py` ↔ `web/src/lib/native/tex.ts`.
   - Its data is `tests/fixtures/native/tex-allowlist.tsv`.
   - Codes: `math-syntax`, `math-command`, and `limit` (inline 300, display 2,000, depth 20).
   - A Python test and a TS test each assert that their allowlist equals the TSV.
   - The render test proving Temml accepts every allowlisted command is S8's, since Temml arrives there. Leave S8 a note.
   - **No new Python dependency** (`pyproject.toml` / `uv.lock` untouched).
4. **Translation** (`translation_check` in `server/native_ingest.py`, Python only): the 422s `translation-term-ids` and `translation-math`.
   - `translation-math` checks display `tex` and `sym` in order, and inline TeX as a multiset.
   - They sit beside the existing `translation-quiz-ids`.
5. **Search.** R1 left formulas open. Settle it as one Decisions line: the figure precedent indexes alt and caption, which suggests `alt`, `reading` and each `means`.
6. **The interim render.**
   - `render.tsx` gets **only** an interim inline `math` case, with the TeX counted as an atom (`data-an-len`), so `reader-anchor.test.ts` and `native-render.test.ts` stay green. It may render the TeX as plain code-like text. S8 replaces it.
   - `formula` stays the `typed()` default (null) until S8.
   - No styling, no engine.
7. **README** (and its template copy): the tree, the codes, and the no-escape rule for `$`.
8. **Fixtures** (core tests only):
   - `math.md/.json/.txt`: inline math in prose, a table cell and a YAML *(md)* field; a formula block; the TeX counted; `$5`, `$HOME/$USER` and `` $ `ls` `` as text; a term in a legend's `means`; math in a glossary definition;
   - `err-formula.md/.err` and `err-math.md/.err` (R1 §2, §4);
   - `tex-allowlist.tsv`;
   - their template copies, plus the manifest;
   - in `test_native_ingest.py` (and its template copy), the translation cases. Each of these is a 422: term ids differ, display `tex` differs, a legend `sym` differs, inline TeX is missing. The same set reordered is accepted.

## Environment

As S6: `web/node_modules` is installed with the frozen lockfile. Never touch `:3030` / `:8766`.

## Validation

- `uv run pytest tests/test_native_format.py tests/test_native_ingest.py -q` passes, plus a new `tests/test_native_tex.py` if you create one.
- `python3 scripts/plugin_parity.py` → PASS.
- `pnpm --dir web exec vitest run tests/native-conformance.test.ts tests/native-render.test.ts tests/reader-anchor.test.ts tests/native-tex.test.ts` passes.
- `pnpm --dir web typecheck` passes.
- `git status --porcelain` shows only the set below, plus `result.md` and the notebook.
- `python3 scripts/workflow.py validate` passes.

## Notebook (alone: write through `phase-section`, under budget; Notes is at ~5.6 of 6 KB)

- **Decisions:**
  - the search choice for formulas;
  - any limit or code R1 left open.
- **Notes for later slices:**
  - remove the consumed `(from S6, for P39-hk.S7)` note;
  - for S8: the interim render to replace, the Temml render test owed, and the node shapes;
  - for S10: the exact grammar to document.

  Move an older note to `topics/notes-for-later-slices.md` (`--to-topic notes-for-later-slices --entry K`) if needed.
- **Doc impact:** one line (inline math, the formula block, the TeX allowlist and its codes, the translation 422s).
- **Now:** S7's landing, then "Next: S8 + S10 (a wave)".

## Set

From the breakdown:
- `server/native/{schema,parse,project}.py`, new `server/native/tex.py`, `server/native/README.md`, `server/native_ingest.py`; `server/native/refs.py` only if `term:` inside `means` needs it;
- their copies under `plugin/templates/kb/server/` (`native/{schema,parse,project,tex,refs}.py`, `native/README.md`, `native_ingest.py`);
- `plugin/templates/manifest.json`;
- `web/src/lib/native/{schema,parse,tree,project}.ts`, new `web/src/lib/native/tex.ts`, `web/src/lib/native/{validate,refs}.ts` (only if needed);
- `web/src/lib/native/render.tsx`: the interim inline `math` case only;
- `tests/fixtures/native/{math.md,math.json,math.txt,err-formula.md,err-formula.err,err-math.md,err-math.err,tex-allowlist.tsv}` and the same under `plugin/templates/kb/tests/fixtures/native/`;
- `tests/test_native_ingest.py` and its template copy;
- the Python TSV test (in `tests/test_native_format.py` or a new `tests/test_native_tex.py`), its template copy and the manifest;
- new `web/tests/native-tex.test.ts`;
- this slice's `result.md`;
- `phase.md` through `phase-section`, and `topics/notes-for-later-slices.md`.

Any other file needed means `needs_operator`, naming it.

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
