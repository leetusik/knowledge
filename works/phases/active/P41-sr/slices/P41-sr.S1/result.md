# P41-sr.S1 result

## Verdict

- status: done
- route: mid
- model: opus
- effort: medium
- summary: Added `server/spoken.py`, whose `spoken_script(tree, lang=, title=)` turns a parsed native chapter into ordered spoken segments `{section, block, kind, lang, text}` under the plan's read/skip table (tables read as `table-row`; code, hr, quiz, sources, glossary skipped; alt texts read; inline math as a small linear text). It has one fixture test and is mirrored byte-identically into the plugin template.
- files_changed: server/spoken.py, tests/test_spoken.py, tests/fixtures/spoken/chapter.md, plugin/templates/kb/server/spoken.py, plugin/templates/kb/tests/test_spoken.py, plugin/templates/kb/tests/fixtures/spoken/chapter.md, plugin/templates/manifest.json, works/phases/active/P41-sr/slices/P41-sr.S1/result.md
- validation: `uv run pytest -q tests/test_spoken.py` passed (1 test); `uv run python scripts/plugin_parity.py` passed (exit 0); `uv run pytest -q tests/test_native_*.py` passed (71 passed, 1 skipped); doc 67 smoke test passed (counts below). Deferred, whole tree: the full `pytest` suite and the web gates.
- deviations: (1) The math table has a few small additions beyond the plan's list, so that common inline TeX does not read as junk: `\lvert`/`\rvert`/`\vert` become `|`; `\left`/`\right` become nothing; `\frac{a}{b}` becomes `a ÷ b`, with parentheses around a part longer than one token, as the reader's `linearText` does (without this rule it would read `fracab`); `\overline` is handled like `\bar`, and `\leq`/`\geq`/`\neq` like their short forms. (2) Superscript and subscript characters cover digits and `+ - = ( )`. Letter scripts keep `^`/`_`, so `e_i` reads `e_i`, following the plan's "simple digit scripts". (3) A figure's `credit` is not read, because the plan's table does not list it. (4) The fixture's figure row has 3 items (image, card, diagram), since the grammar allows 2-3; the svg is covered by the standalone `svg` block.
- notebook:
  - Decisions: `Spoken script: server/spoken.py spoken_script(tree, lang=, title=) → [{section, block, kind, lang, text}]. Read: title, summary, heading, paragraph (text), list item each (nested lists flattened), quote and callout paragraphs (callout title first), table body rows "header: cell; …" (kind table-row, so the player can skip them), figure/figures/diagram/svg alt-or-label-or-title then caption, formula alt, reading, "sym: means". Skipped: code, hr, quiz, sources, glossary. Inline math → linear text, inline image → alt (P41-sr.S1)`
  - Notes for later slices: `**(from P41-sr.S1, for D1, DECOMP2)** Segment shape: {section: nearest id'd top-level block or null, block: own top-level id or null, kind: title|summary|heading|text|list-item|quote|callout|table-row|figure|diagram|svg|formula, lang, text (whitespace-collapsed, never empty)}. server/spoken.py and its test and fixture are mirrored in plugin/templates/kb/ and listed in the manifest's files.identical; DECOMP2's backend slices must mirror their new server/ and tests/ files too (plugin_parity.py fails on drift). Doc 67 → 187 segments, 52 of them table-row; a Sources heading is still read before its skipped list.`
  - Doc impact: `- backend.md: the spoken script (server/spoken.py) and its read and skip rules (P41-sr.S1)`
  - Now: `P41-sr.S1 landed server/spoken.py (the spoken script, mirrored to the plugin); the voice engine, cache and player wait on the research wave and DECOMP2.`

## Detail

- **Module.** `server/spoken.py`, top-level beside `anchors.py`. `project.py` is unchanged. `spoken_inline` reproduces `inline_text`, except that math goes through `speak_tex` and an image reads its `alt`. `speak_tex` is a small recursive reader: groups, commands with their arguments, `^`/`_` scripts, plus a Greek table and a symbol table. Any other command drops its backslash and keeps its name.
- **Section rule.** A block with an `id` starts a section, even a skipped one (a quiz with `#check`), exactly as `project.sections` does. A skipped block simply emits nothing.
- **Lists.** Each item's own paragraphs are joined into one segment. Its nested lists follow as further `list-item` segments, in order. A quote or callout inside an item yields its paragraphs as `list-item` segments too.
- **Tables.** One segment per body row. A cell is labelled with its header when that header is non-empty. Empty cells are dropped. With no header text, cells are joined with `"; "`.
- **Fixture** `tests/fixtures/spoken/chapter.md`: it parses with no assigned ids and contains one of each block type the plan lists. The test asserts the exact `(section, block, kind, text)` list.
- **Smoke test, doc 67** (`.cache/p41-voices/excerpts/src/doc67.json`, counts only). The source parses. The run produced 187 segments: callout 14, diagram 7, heading 27, list-item 18, summary 1, table-row 52, text 67, title 1. The document's blocks are: callout 3, code 6, diagram 4, heading 27, list 4, paragraph 67, quiz 1, sources 1, table 9. In total 33,921 characters. No segment contains a backslash, so no raw TeX leaked.
- **Observation for D1/DECOMP2.** A `## Sources` heading is still read as a heading, even though the sources list after it is skipped. If that sounds odd when spoken, a later slice can drop a heading whose section yields nothing else. This slice made no such decision.
- **Instrument:** none needed (server-only, no browser claim).
