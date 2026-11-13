# P39-hk.S6 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** The native grammar gains the `glossary` typed block (one per chapter, `terms` 1–100 of `{id, term, aliases?, short, long?}`, term ids a namespace scoped to the block), `term:<id>` links resolved after the walk (`ref-missing-term`; a `term:` image or a term link inside a definition is `ref-scheme`), and glossary search text. It lands in all four places together: the server, its template byte copies, the TS twin, and the shared fixtures with their copies. There is no render change, and the annotation projection is unchanged (anchor test green).
- **files_changed:**
  - `server/native/{schema,parse,refs,project}.py`, `server/native/README.md`
  - `plugin/templates/kb/server/native/{schema,parse,refs,project}.py`, `plugin/templates/kb/server/native/README.md`
  - `web/src/lib/native/{schema,parse,refs,tree}.ts`
  - `tests/fixtures/native/{glossary.md,glossary.json,glossary.txt,err-glossary.md,err-glossary.err,err-terms.md,err-terms.err}` (new)
  - `plugin/templates/kb/tests/fixtures/native/`: the same seven (new)
  - `plugin/templates/manifest.json`
  - `tests/test_native_format.py`, `plugin/templates/kb/tests/test_native_format.py`
  - this `result.md`; `phase.md` through `phase-section`
- **validation:**
  - `uv run pytest tests/test_native_format.py tests/test_native_ingest.py -q`: PASS (64 passed, 1 skipped)
  - `python3 scripts/plugin_parity.py`: PASS
  - `pnpm --dir web exec vitest run tests/native-conformance.test.ts tests/native-render.test.ts tests/reader-anchor.test.ts`: PASS (3 files, 139 tests; the glossary, err-glossary and err-terms cases ran in each)
  - `pnpm --dir web typecheck`: PASS
  - `python3 scripts/workflow.py validate`: PASS (stale-docs and oversized-section warnings only, both pre-existing)
  - `git status --porcelain`: only the set, plus `result.md`, `phase.md` and the orchestrator's pre-existing `works/` changes
  - extra:
    - full `uv run pytest -q`: PASS (176 passed, 60 skipped). The Postgres-gated suite was skipped: no `KB_TEST_DATABASE_URL`.
    - full `pnpm --dir web exec vitest run`: PASS (37 files, 406 tests)
    - `prettier --check` and `eslint` on the four changed TS files: clean
- **deviations:**
  - `_search_block` lives in `server/native/project.py`, not `native_ingest.py` as the plan said, so the change is there. `native_ingest.py` needs no change: `resolve_refs` ignores the new `term` ref kind, the same way it ignores `id`.
  - `ids.py`, `ids.ts`, `links.ts`, `validate.ts` and `project.ts` were not needed. There is no TS search twin (search is Python-only), and the TS annotation projection already counts a link as its children's text.
  - Fixtures go a little beyond the plan's list (stated below): a term id equal to a heading id (namespace proof), `aliases: []`, a malformed `term:` ref, and a `#id` naming only a term.
- **doc_impact:** `- **(P39-hk.S6)** architecture.md, qa.md: the native grammar gains the glossary typed block, term:<id> links and ref-missing-term; search indexes terms, aliases and definitions; the projection is unchanged; new fixtures and test_glossary_is_searchable` (shortened here; the full line is in `phase.md` `## Doc impact`)

## What was built

**The block (`schema.py` `check_glossary`, `schema.ts` `checkGlossary`).** `"glossary"` joins `TYPED_BLOCKS` and `CHECKS`.
- The body is one key, `terms`: 1–100 items, code `limit`.
- Each item is checked with `cx.mapping` (required `id`, `term`, `short`; optional `aliases`, `long`).
- `id` goes through `local_id`: `[a-z0-9][a-z0-9-]{0,63}`, else `id-malformed`.
- A local `seen` set gives `id-duplicate "duplicate term id …"`, like a diagram's node ids.
- `term` and each alias are `cx.text`; `short` and `long` are `cx.md`.

The tree node is `{type:"glossary", id, terms:[{id, term, aliases:[str]|null, short:[Inline], long:[Inline]|null}]}`. `tree.ts` adds `"glossary"` to `TypedBlock` and exports a `GlossaryTerm` interface for S9.

**The parser (`parse.py`, `parse.ts`).**
- A glossary counter in `typed()`: a second block is `limit` "a chapter holds at most one glossary block", at its fence line. Its body is still validated, so the 422 lists every violation.
- `in_glossary` / `inGlossary` is set only while `CHECKS["glossary"]` runs. `reference()` refuses a `term:` ref then with `ref-scheme` "a glossary definition cannot link a term (…)". The check sits in `reference()`, so it also catches a reference-style link (`[x][def]` whose definition is `term:…`).
- Other `term:` refs are collected as `term_refs`. After the walk they are checked against `term_ids` (the union of the glossary blocks' term ids), so a glossary may follow its links. A miss is `ref-missing-term` "term:<id> names no term in this chapter's glossary".
- Term ids never touch `IdRegistry`.

**Refs (`refs.py`, `refs.ts`).** `parse_ref` / `parseRef` gain `term:<id>`, which returns `{kind:"term", id}`. A `term:` image is `ref-scheme`, and a malformed id is `ref-malformed`. The fallback message now lists `term:`. `Ref` in `refs.ts` gains the union member. `links.ts` `resolveLink` already sends any unmatched kind to `default` (missing), so the type system forced nothing there or in `render.tsx`.

**Search (`project.py` `_search_block`).** Each term contributes its `term`, its aliases, `short` and `long` (through `inline_text`). The annotation projection (`_containers` / `containers`) is untouched: a typed block contributes nothing, and a `term:` link is a `link` node counted as its children's text.

**README (and its template copy).** Changes:
- the Modules row for `refs.py`;
- the `ref-missing-term` code;
- the typed-block list;
- a new *The glossary* bullet;
- a *Limits* row;
- *Scoped ids* (term ids);
- a `term:<id>` row in *References*;
- the tree node, and `# a term: link too` on `link`;
- projection item 3 (glossary text contributes nothing) and item 4 (a term link moves no offset);
- the `search_text` coverage.

## Choices where R1 was silent (also in `phase.md` Decisions, "Glossary limits (S6)")

- **`aliases`: absent or null means none; when given, 1–8.** An empty list is `limit` ("must have 1-8 aliases, has 0"). The plan says "0–8, as R1 §1 says", while R1 §1 and the breakdown say "a list of 1 to 8 plain strings" with a tree type of `[str]|null`. I followed R1's words. Refusing `[]` keeps one spelling for "no aliases" (`null`), never `[]` beside `null`.
- **No length caps** on `term`, an alias, `short` or `long`. R1 says "about 40 words" is the writer's and the critic's rule, not a grammar cap, and no existing block caps a string field.
- **No `title` key.** R1 gives the body one key, and the reader titles the section in English. An unknown key is `field-unknown`.
- **A non-mapping term item** is `field-type` "must be a mapping", and its slot in `terms` is `null`. This is quiz's convention (`_quiz_item`), the plan's named analog.
- **Duplicate term ids are checked per block.** A refused second glossary's terms still resolve links, so a chapter with two glossaries gets one `limit`, not a cascade of `ref-missing-term` for terms that exist. Merging the blocks is the fix, and a cross-block duplicate would then surface as `id-duplicate`.
- **Aliases are not checked for duplicates**, nor against the term. R1 is silent, and the nearest lists (a node's `fields`, chart categories) are not checked either.
- **The second glossary's `limit` carries `block`** when that block has an authored id, like every other violation inside a typed block. The `.err` format is line + code only, so this does not reach the fixtures.

## Fixtures (both suites read them automatically)

- **`glossary.md/.json/.txt` (accept).** Contents:
  - 4 terms: aliases present and absent, `long` present and absent, a numeric term quoted (`"429"`), an inline code span in a definition;
  - term links in a prose paragraph (one with `*em*` link text), a list item, a callout title, a figure caption, and a quiz prompt and explanation;
  - `[glossary](#glossary)` and `[this section](#rate-limit)` beside a term with the id `rate-limit`, which proves the two namespaces never collide (no `id-duplicate`);
  - the glossary placed after every link, then `## Sources {#sources-list}`.

  The `.txt` holds none of the glossary's text: the section `glossary` is empty, and the term links count as their text.
- **`err-glossary.md/.err`:**
  - `14 id-duplicate`;
  - `17 id-malformed` (`Bad_Id`);
  - `20 field-missing` (no `short`);
  - `24 ref-scheme` (a `term:` link inside `short`);
  - `27 limit` (`aliases: []`);
  - `31 limit` (the second block).
- **`err-terms.md/.err`:**
  - `8 ref-missing-term`;
  - `9 ref-scheme` (a `term:` image);
  - `10 ref-missing-term` (`term:intro` names a heading id, not a term);
  - `11 ref-missing-id` (`#bucket` names only a term);
  - `12 ref-malformed` (`term:Bad_Id`).
- **`tests/test_native_format.py` `test_glossary_is_searchable`** (and its template copy): `search_text` of the accept fixture holds a term, an alias, both definitions and a definition with a code span. It is the one new test, and core: it is the search half of the grammar. `.txt` proves the other half.

All seven fixtures are byte-copied under `plugin/templates/kb/tests/fixtures/native/` and listed in `manifest.json` `identical`, in sorted position. `plugin_parity.py` passes, including its completeness check.

## Throwaway probes (deleted before return)

- `web/tests/zz-s6-probe.test.ts`: rendered `glossary.md` with `NativeChapter`.
  - All 8 term links come out as `kb-link-missing` spans carrying their text. There are 9 spans in total, with "token bucket" appearing once more than it has links. Presumably the existing figure or quiz markup draws one caption or prompt twice; not traced, since that markup is unchanged.
  - The page holds no definition or alias text: the block draws nothing.
  - No `term:` href reaches the HTML.
  - `href="#glossary"` is an anchor with no target yet (S9 draws the `<h2 id>`).
- `tests/test_zz_s6_probe.py`: published through `POST /api/documents` with the ingest test's `client` fixture.
  - A glossary chapter gets a 201, with no warnings and no assigned ids.
  - `/api/search` finds the chapter by an alias (`zephyrbucket`), by a word only in `long` (`quokkatokens`), and by `short` text.
  - The same body with `term:nowhere` gets one 422, `[(3, "ref-missing-term")]`: line 3 of the body as sent.

Both files were removed, and `git status` shows neither.

## Environment

- `web/node_modules` was absent. I ran `pnpm --dir web install --frozen-lockfile`, and `web/pnpm-lock.yaml` is byte-identical to the copy saved before the install (`cmp`).
- I touched no server: no `:3030` or `:8766`, and no stack was started. The slice claims no browser verification.

## Notebook (written through `phase-section`; sizes after)

- **Decisions** (+1): "Glossary limits (S6)". 11,672 B, under 12 KB.
- **Notes for later slices** (+3): for S7 (the in-glossary hook, `cx.md` for math, where `translation-term-ids` reads), for S9 (a term link's node, the block's shape, the `#glossary` target, `notes-load.ts` `nameOf`) and for S10 (where the exact grammar lives and its three traps). 5,998 B, under 6 KB. No note was addressed to S6, so none was removed.
- **Doc impact** (+1): the line above.
- **Now:** S6 landed; next is S7. 1,423 B.
- `phase.md` total: 29,435 B of 40 KB.
