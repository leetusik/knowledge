# P30.F2 result

- status: done
- tier: mid
- model: sonnet
- effort: high
- summary: Fixed the three native-parser defects on both halves with fixtures. A chart's kind is now its own `chart` key and the block keeps `type: "diagram"` (OQ46). A non-string choice-quiz answer is one 422 violation, no longer a TypeError. Ids, slugs, keys, asset names and `chapter:`/`doc:` refs match with `fullmatch`, so a trailing newline is refused.
- validation (all passed):
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q`: 225 passed
  - `pnpm --dir web typecheck`, `lint`: clean; `test`: 230 passed (core test 4 on 26 fixtures); `build`: ok
  - `python3 scripts/plugin_parity.py`: PASS; `python3 scripts/skills_parity.py`: PASS; `python3 scripts/workflow.py validate`: passed
  - scratch publish: see below
- deviations: none
- doc_impact: backend.md, decisions.md (one line in phase.md, detail in `topics/doc-impact-detail.md` → *P30.F2*)

## What changed

1. **Chart key (OQ46).** `server/native/schema.py` `_chart` returns `{"chart": ctype, …}` instead of `type`, so `block.update(...)` no longer clobbers `type: "diagram"`. This also applies to a chart inside a figures row. Mirrored in `web/src/lib/native/schema.ts`. `tree.ts` drops the `bar|line|interval` union and its comment, and `render.tsx` loses the `isChart` workaround and reads `d.chart` for `data-type`. README `chart:` line updated. `diagrams-rows.json` (3 charts) and `limits-at.json` (1) regenerated; the `.txt` files are unchanged.
2. **Quiz `answer: [[a]]`.** The 500 came from `seen.add(a)` with an unhashable list. Now only strings are added to `seen`, in Python and TS. The nested list is one `quiz-answer` violation with its line. Fixture `err-quiz-answer-type` covers `[[a]]` plus a mixed `[a, 3, {k: v}]`.
3. **Trailing-newline ids.** `.match` → `.fullmatch` in `native/ids.py`, `native/refs.py` (asset name, chapter and doc refs), `assets.py` (name and `FILE_RE`), `books.py` (key, slug, lang), `documents.py` (project, tag/slug, date, archive file name), `documents_api.py` (`FILE_RE`) and `reader_api.py` (`ID_RE`, `NAME_RE`). `$` followed by `fullmatch` rejects `"s1\n"`. TS `pyFullMatch` is now a plain exec (no newline tolerance). README "Ids" paragraph says so. Fixture `err-id-newline` has a block-scalar quiz item id and option id (both `id-malformed`, lines 13 and 22).
4. **Left alone on purpose:** `yamlcore` scalar regexes (they classify plain scalars, not validate ids), `_FENCE_ID_RE` (a line scanner for a fence line), and `_FILENAME_RE` in `reindex.py`/`seed.py`. These are filename or scanner patterns, not id/slug/key validators.
5. **Plugin mirror:** 11 changed files re-copied, 4 new fixture files copied, and the 2 new fixtures listed in `plugin/templates/manifest.json`.

## Decided (unattended)

- The chart key is named `chart`, as OQ46 suggested (no operator alternative given).
- A figures-row chart gets the same key, which is consistent and contract-simple (the plan said "chart kind moves to its own key", without carving out the nested case).
- The stricter option for the sweep: fullmatch applies to every id, slug or key validator, plus asset and file names.

## Stored charts

- Stored trees are re-parsed from `source`, so the next parse of a stored chart returns `type: "diagram"` plus `chart`. The only consumer that read the old `type` was `render.tsx`, now updated.
- Python `project._search_block` keys on `type`. Before this, a top-level chart (type `bar`) fell through and contributed no search text. It now contributes its labels via `_search_diagram`. A stored search row keeps its old text until reindex or re-ingest. Not a regression, and `.txt` (section projection) is unchanged.

## Scratch publish

- Fresh API on `:8768`, legacy mode (no `DATABASE_URL`), scratch `KB_ROOT` in the scratchpad, `KB_GIT_COMMIT=false`, no Gemini key.
- `scripts/publish_fixture_book.py` ingested the whole book. `all-blocks` is native version 2 and re-parses with the three chart blocks as `diagram` with `chart` `bar`, `line` and `interval`.
- The server was stopped afterwards. A short-lived scratch database `kb_f2live` in the test Postgres was created for an aborted first attempt and dropped. `:8766` (the operator's standing server) and `:3030` were never touched.
- Observation: my first publish attempt in tenant mode returned 401 (no accounts bootstrap), so I switched to legacy mode.
- Observation: a later fresh-root attempt found the book already present in the scratch root; the scratch state only was involved.

## Escalation / questions

No operator questions raised. No findings outside the slice.
