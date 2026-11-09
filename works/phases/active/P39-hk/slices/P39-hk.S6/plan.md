# P39-hk.S6 — the glossary block and `term:` links in the native grammar (four places)

## Context

P39-hk adds a per-chapter glossary to the native chapter grammar:
- the terms a chapter explains, each with aliases, a short definition (~40 words) and an optional longer one;
- explicit term links from the text.

The reader's term window, glossary section and print appendix were designed and **signed** (design job `10-reading-aids`). S9 builds them. This slice adds **only the grammar**: parse, validate, refuse at publish, project for search. No render change.

The approach is settled in `works/phases/active/P39-hk/topics/glossary-and-math.md` **§1**, R1's findings. Read it whole before editing. The slice's pins and set are in `works/phases/active/P39-hk/topics/breakdown.md` → `## P39-hk.S6`, restated below.

The grammar lives in **four places, changed together**:
1. the server, `server/native/*` and `server/native_ingest.py`;
2. the server's byte copies under `plugin/templates/kb/server/native/`, kept equal by `scripts/plugin_parity.py` and listed in `plugin/templates/manifest.json`;
3. the TypeScript twin, `web/src/lib/native/*`;
4. the shared fixtures, `tests/fixtures/native/*`, with their template copies. Both `tests/test_native_format.py` and `web/tests/native-conformance.test.ts` read them.

## Read first

- `python3 scripts/workflow.py phase-section P39-hk Decisions`: R1's *Glossary grammar* line, and the DECOMP2 breakdown line.
- `phase-section P39-hk "Notes for later slices"`: the `docs/current` staleness note, and every note addressed to S6 (none expected beyond the breakdown).
- `server/native/README.md`: the grammar's own spec. Find the tree-node, codes and ref-kinds tables there.
- How an existing typed block is defined end to end. The `quiz` block is a close analog: an id'd typed block with a structured body. Follow its path through `schema.py` `TYPED_BLOCKS`, `parse.py`, `refs.py`, `project.py`, `native_ingest.py` `_search_block`, and the TS twins.

## The work

1. **The block.** `"glossary"` joins `TYPED_BLOCKS` (`server/native/schema.py`).
   - Its body is `terms` (1–100 items): `id`, `term`, `aliases` (0–8, as R1 §1 says), `short` *(md)* and `long` *(md, optional)*.
   - Write the field limits (lengths, the id pattern) as R1 §1 gives them. Where R1 is silent, follow the nearest existing block's convention and name the choice in `result.md`.
   - One block per chapter: a second is refused with the existing `limit` code. Its position is free.
2. **The term-id namespace.** It is its own namespace, scoped to the block: a term id never collides with a heading or block `#id`. A duplicate term id is refused, and so is a malformed one, both with the codes R1 §1 names (or the existing id codes, if R1 reuses them).
3. **`term:` links.** `parse_ref` / `parseRef` gain the `term:<id>` kind.
   - A link to no term is the new **`ref-missing-term`**.
   - A `term:` image, and a `term:` link inside the glossary's own definitions, are `ref-scheme`.
   - Term links may appear in prose, captions and quiz text, wherever an ordinary link may.
4. **Search.** `_search_block` (`server/native_ingest.py`) indexes `term`, `aliases`, `short` and `long`, plus the TS twin if one exists. The **annotation projection is unchanged** (`project.py` / `project.ts`): a term link counts as an ordinary link's text, so stored annotations keep their offsets. Prove that with the anchor test.
5. **No render change.** The block renders nothing (`typed()` default), and a term link renders as today's missing link with its text, until S9. Don't touch `render.tsx` beyond what the type system forces; if it forces anything, name it.
6. **README** (`server/native/README.md` and its template copy): the tree node, the codes table (`ref-missing-term`), the ref kinds.
7. **Fixtures** (core tests only, per CLAUDE.md: the parse, the refusals, the twin parity):
   - `glossary.md/.json/.txt`: terms, aliases, term links in prose, a caption and quiz text, the glossary placed after the links, and the search text;
   - `err-glossary.md/.err`: a second block, a duplicate term id, a malformed id, a missing `short`, a term link inside a definition;
   - `err-terms.md/.err`: `ref-missing-term`, and a `term:` image;
   - the same seven under `plugin/templates/kb/tests/fixtures/native/`, each listed in `plugin/templates/manifest.json` `identical`.

   Inline math in a definition, and a term in a formula legend, wait for S7.
8. **Translation** is S7's (the 422s). Don't add it here.

## Environment

The worktree may have no `web/node_modules`. If it is absent, run `pnpm --dir web install --frozen-lockfile`, which must not change `pnpm-lock.yaml`. Never symlink another checkout's.

`uv run` works here. Never touch the main checkout's running servers (`:3030`, `:8766`).

## Validation

- `uv run pytest tests/test_native_format.py tests/test_native_ingest.py -q` passes.
- `python3 scripts/plugin_parity.py` → PASS.
- `pnpm --dir web exec vitest run tests/native-conformance.test.ts tests/native-render.test.ts tests/reader-anchor.test.ts` passes.
- `pnpm --dir web typecheck` passes.
- `git status --porcelain` shows only the set below, plus the slice's `result.md` and the notebook.
- `python3 scripts/workflow.py validate` passes.

## Notebook (this slice runs alone: write through `phase-section`, under budget)

- **Decisions:** only a choice R1 left open: the limits, an id code.
- **Notes for later slices:** for S7 (where math will hook into the same files), for S9 (what a term link's node carries for the renderer) and for S10 (the exact grammar the skill must document).
- **Doc impact:** one line: the native grammar gains the `glossary` block, `term:` links and `ref-missing-term`.
- **Now:** S6's landing, then "Next: S7".

## Set

From the breakdown:
- `server/native/{schema,parse,refs,project}.py`, `server/native/README.md`, `server/native/ids.py` (only if needed), `server/native_ingest.py`;
- `plugin/templates/kb/server/native/{schema,parse,refs,project,ids}.py`, `README.md`, and the template's `native_ingest.py` copy if `plugin_parity.py` names one;
- `web/src/lib/native/{schema,parse,refs,tree,project}.ts`, plus `{ids,links,validate}.ts` only if needed;
- the seven fixtures and their seven template copies;
- `plugin/templates/manifest.json`;
- `tests/test_native_format.py` and its template copy (only if a search-text assertion needs a line);
- this slice's `result.md`;
- `phase.md` through `phase-section`.

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
