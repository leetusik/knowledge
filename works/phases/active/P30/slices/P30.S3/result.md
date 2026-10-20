# P30.S3 — result

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** high
- **summary:** Shipped `server/native/`, a pure parser, validator and projection for native chapters.
  - It uses markdown-it-py with GFM, plus callouts, typed YAML 1.2 core blocks and `{#id}`.
  - It rejects and never strips, with one violation list.
  - It covers the SVG allowlist, ids, references, limits, the normalized tree and the section projection.
  - It ships with 24 language-neutral conformance fixtures (core test 4, the Python half) and direct SVG
    allowlist tests.
- **files_changed:**
  - `pyproject.toml`, `uv.lock`;
  - `server/native/`: `__init__.py`, `errors.py`, `yamlcore.py`, `ids.py`, `refs.py`, `svg.py`,
    `schema.py`, `parse.py`, `project.py`, `fixtures_util.py`, `README.md`;
  - `tests/test_native_format.py`;
  - `tests/fixtures/native/`: 24 cases (`*.md` with `*.json`+`*.txt`, or `*.err`);
  - `works/phases/active/P30/phase.md`, this file.
- **validation:**
  - `KB_TEST_DATABASE_URL=postgresql://kb:kb@127.0.0.1:55432/kb uv run pytest -q` passed: 186 passed, 0
    skipped (133 before, plus 53 new).
  - `python3 scripts/skills_parity.py` failed as known (A3, until S7): the explain skill copy is missing.
  - `python3 scripts/workflow.py validate` passed (pre-existing stale-docs and oversized-section warnings
    only).
  - `git diff --stat -- web/` is empty.
- **deviations:**
  1. Two helper modules beyond the plan's six: `yamlcore.py` (the 1.2 core loader) and `errors.py`, plus
     `fixtures_util.py` (the fixture formats S12 mirrors).
  2. `NativeFormatError` carries a *list* of violations. `.line`, `.col`, `.code` and `.message` mirror the
     first, because P29 says one 422 lists every violation.
  3. The projection follows the signed `05-annotations` round (passage containers, with no whitespace
     collapse), not the plan's "whitespace collapse" wording (OQ8).
  4. `.err` fixtures compare `<line> <code>` pairs only. Columns and messages are not cross-language.
  5. One extra direct test, for the 512 KB body limit, is generated in memory so that no 512 KB fixture is
     committed. The SVG size and element limits are likewise tested in memory.
  6. A 32-level nesting cap (inline and YAML) was added after fuzzing found two `RecursionError`s. A
     nesting bomb is now a 422.
- **doc_impact:** three lines appended to `phase.md` → `## Doc impact`: `data.md` (the format and the
  tree), `backend.md` (`server/native/` and its dependencies), and the `decisions.md` ADRs (reject, never
  strip; markdown-it-py with fixtures; the projection as the anchor basis; unknown enums rejected).

## What was built

`parse_chapter(source, reserved_ids=())` returns a `ParseResult` with:

- `tree`;
- `source`: the stored form, with assigned ids written in;
- `assigned_ids`;
- `refs`;
- `warnings` (empty for now).

Its spec is `server/native/README.md`: the module map, the error codes, the enforced grammar, the limits,
ids, references, the full tree shape with an example, and the projection rules that S12 reimplements.

- **YAML:** the plan offered pyyaml held to 1.2 core, or ruamel. **PyYAML** was used, for its
  scanner, parser and composer only. Plain scalars are resolved by the 1.2 core regexes in
  `yamlcore._resolve`, so `yes` and `2026-10-21` stay strings and `0o17` is 15. Anchors, aliases, tags,
  `%` directives, duplicate keys, non-string keys, `<<` and `.inf`/`.nan` are refused. JSON loads.
- **Markdown:** markdown-it-py 4.2.0 (`commonmark` preset, `html: True`, so raw HTML is *seen* and
  rejected) plus tables, strikethrough (single tilde too, like remark-gfm) and mdit-py-plugins 0.6.1's
  `gfm_autolink`. Task lists and footnotes are off, since P29 does not list them.
  - The built-in `alerts` option was not used: it knows only GitHub's five types, with no title and no
    collapse. Callouts and heading ids come from a core rule (`_native_extensions`) that runs before
    inline parsing.
  - `validateLink` and `normalizeLink` are overridden, so every URL reaches the reference check verbatim.
    Otherwise markdown-it would silently leave `javascript:` links as text.
- **SVG:** expat in namespace mode. DOCTYPE, entities, PIs, comments and CDATA abort the parse. Every
  element, attribute and value violation is collected (the block, element and attribute appear in the
  violation), and the tree is returned only when clean.
- **Ids:** authored ids are claimed first, then assignment runs in source order around them. Every
  fixture asserts that `parse_chapter(result.source)` yields the same tree with nothing to assign.

## Decisions taken unattended

Each is recorded on `## Operator Questions` as decided:

- **OQ4:** the svg block is a YAML mapping, `{svg, label, caption?}`.
- **OQ5:** unknown callout types, tones, shapes, kinds and chart types, and dangling diagram references,
  are a 422.
- **OQ6:** quiz item, option and sources item ids are required. Option ids are scoped per item, and
  `item-<n>` is never minted.
- **OQ7:** h1, h5, h6, nested headings and nested typed blocks or id'd code are rejected.
- **OQ8:** the projection is the signed passage-container rule, with code-point offsets. Bare emails
  (`mailto:`) are rejected, svg `class` is `kb-fill-<tone>`/`kb-stroke-<tone>` only, and an asset name is
  `[A-Za-z0-9][A-Za-z0-9._-]{0,127}`.

The signed rounds' additive details were read through an Explore lookup (Sonnet):

- figure `credit` is inline markdown;
- a card `body` is paragraphs split at blank lines;
- the tone list has 13 names;
- `x.numeric` is `{from, to}`;
- an interval is `[low, high]` or `[low, median, high]`;
- a state's `initial` is one id, and its `final` is one id or a list (normalized to a list);
- self-transitions are allowed;
- a nested diagram in a figure row takes its caption from the item, so an inner `caption` is rejected.

## Fixtures (`tests/fixtures/native/`)

- **Valid (10):**
  - `prose`: CommonMark and GFM, lists, tables, code fences with lang, title and id, indented code,
    `mermaid` as plain code, authored and assigned heading ids, slug collision, `## Sources` →
    `sources-list`, an ATX closing sequence, setext;
  - `callouts`: all six types, collapsed, lowercase, empty;
  - `korean`: Korean headings → `s-<n>`, Korean labels and cloze;
  - `figures`: a full and a minimal figure, rows of 2 and 3 with image, card, diagram and svg;
  - `diagrams-graph`: flow and state;
  - `diagrams-rows`: sequence, stack, timeline, and bar, line and interval charts;
  - `svg`: markers, `use` with `href` and `xlink:href`, classes, text and tspan, a JSON body;
  - `quiz`: single and multi choice, recall, cloze;
  - `refs-sources`: every reference scheme and form, and sources;
  - `limits-at`: 20 items, 6 options, 5 blanks, 60 nodes, 100 edges, 12 groups, 200 points, 12 actors,
    and 3- and 2-item rows.
- **Errors (14):**
  - `err-raw-html`: a block, inline, heading, cell, list, callout title and body, a comment, and an *(md)*
    YAML field;
  - `err-svg-element`, `err-svg-attribute`, `err-svg-external`;
  - `err-ids`, `err-refs`, `err-yaml`, `err-structure`, `err-header`, `err-diagram`, `err-quiz`;
  - `err-limits-over`: one over on each limit;
  - `err-typed-blocks-at` and `err-typed-blocks-over`: 300 blocks pass and 301 fail. The at-limit case
    carries one unrelated h1, so no 300-block tree is stored.

## Fuzzing (throwaway, not committed)

6,000 and then 20,000 randomly mutated fixtures turned up:

- one `KeyError` (a missing `numeric.from`, fixed);
- no tree mismatch after a round trip through `.source`.

Hand-made bombs found that a 250k-deep emphasis and a 5k-deep YAML flow list hit `RecursionError`, and
the emphasis spent 11 s in `SyntaxTreeNode` first.

- **The fix:** an inline-depth check on the flat token stream before any tree is built, a YAML depth check
  on the iterative event stream, and a `RecursionError` catch as a last resort.
- **Now:** both bombs are a `limit` 422, in under 1 s for a 500 KB emphasis bomb and in 0.1 s for YAML.

## Notes

- The Explore lookup flagged two un-updated build-prompt lines (`02-figures` l.491–493 and `04-quiz`
  result l.127–128) that call captions and prompts highlightable. The SIGNOFFs resolve this ("note and
  bookmark, never a highlight"), and the projection follows the SIGNOFFs.
- The notebook edits are in `phase.md`: `## Decisions` (one S3 line), `## Doc impact` (3),
  `## Operator Questions` (OQ4–OQ8), `## Notes for later slices` (the core-tests note retagged, and an S3
  note for S4, S5, S9 and S12) and `## Now`.
