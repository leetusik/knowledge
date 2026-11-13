# P39-hk.S7 — result

## Verdict

- **status:** done
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** The native grammar gains math in all four places together: inline `` $`…`$ `` (a post-pass over both parsers' inline children, native only; `$5`, `$HOME/$USER` and `` $ `ls` `` stay text), the `formula` typed block (`tex`, `alt`, `reading` with no math, `where` 1–20 of `{sym, means}`) checked by `formula-legend`, and a TeX allowlist validator twinned in `server/native/tex.py` / `web/src/lib/native/tex.ts` and held by `tests/fixtures/native/tex-allowlist.tsv` (`math-syntax`, `math-command`, `limit`: inline 300, display 2,000, depth 20). Ingest adds the 422s `translation-term-ids` and `translation-math`, and search takes a formula's `alt`, `reading` and legend meanings. The reader gets only an interim inline render: the TeX as code text, counted as text, not yet a `data-an-len` atom (see deviations).
- **files_changed:**
  - `server/native/{schema,parse,project}.py`, new `server/native/tex.py`, `server/native/README.md`, `server/native_ingest.py`
  - `plugin/templates/kb/server/native/{schema,parse,project}.py`, new `plugin/templates/kb/server/native/tex.py`, `plugin/templates/kb/server/native/README.md`, `plugin/templates/kb/server/native_ingest.py`
  - `plugin/templates/manifest.json`
  - `web/src/lib/native/{parse,schema,tree,project}.ts`, new `web/src/lib/native/tex.ts`, `web/src/lib/native/render.tsx` (the interim inline `math` case only)
  - new `tests/fixtures/native/{math.md,math.json,math.txt,err-formula.md,err-formula.err,err-math.md,err-math.err,tex-allowlist.tsv}`, and the same eight under `plugin/templates/kb/tests/fixtures/native/`
  - `tests/test_native_ingest.py`, `tests/test_native_format.py`, new `tests/test_native_tex.py`, and their three template copies
  - new `web/tests/native-tex.test.ts`
  - this `result.md`; `phase.md` through `phase-section`; `topics/notes-for-later-slices.md` (one entry moved there by `--to-topic`)
- **validation:**
  - `uv run pytest tests/test_native_format.py tests/test_native_ingest.py tests/test_native_tex.py -q`: PASS (71 passed, 1 skipped)
  - `python3 scripts/plugin_parity.py`: PASS
  - `pnpm --dir web exec vitest run tests/native-conformance.test.ts tests/native-render.test.ts tests/reader-anchor.test.ts tests/native-tex.test.ts`: PASS (4 files, 152 tests)
  - `pnpm --dir web typecheck`: PASS
  - `python3 scripts/workflow.py validate`: PASS (the pre-existing warnings only: P26 slice kinds, consolidation owed, stale docs, oversized doc sections)
  - `git status --porcelain`: only the set, plus `result.md`, `phase.md`, `topics/notes-for-later-slices.md` and the orchestrator's pre-existing `works/` changes
  - extra:
    - full `uv run pytest -q`: PASS (183 passed, 60 skipped; the Postgres-gated suite skipped, no `KB_TEST_DATABASE_URL`)
    - full `pnpm --dir web exec vitest run`: PASS (38 files, 419 tests)
    - `eslint` on the seven changed TS files: clean; `prettier --check`: clean on all but `render.tsx`, which was already unformatted at HEAD (my hunk is prettier-clean)
    - a throwaway probe proved the TS twin reports the same line, code **and message** as Python for every violation of `err-math`, `err-formula`, `err-glossary` and `err-terms`
- **deviations:**
  1. **The interim render is text, not a `data-an-len` atom.** With the atom, `reader-anchor.test.ts` failed on `math.md`: "painting stored offsets lands on exactly those characters (round trip)", L281, `expected 'sqrt{n}' to be ''`. That test allows only whitespace between a stored edge and the painted one, and an atom's characters are never painted. So `case "math"` renders `<code class="kb-ch-math">{tex}</code>`: the same characters as the projection, counted as text, which the plan allows ("may render the TeX as plain code-like text"). Every other anchor check passed with the atom (verified, coverage, capture). **S8's `math.ra-m` atom needs `web/tests/reader-anchor.test.ts` in its set**, to count an atom's characters as unpainted. It is not in S8's breakdown set (Notes, Now).
  2. Beyond the plan's fixture list:
     - `test_formula_is_searchable` in `tests/test_native_format.py` (and its copy), following S6's `test_glossary_is_searchable`: the search half of the formula grammar.
     - Both TSV tests also assert that every row's sample passes the validator in its context. This closes the loop between the sample column and the validator before S8's Temml test arrives.
  3. `refs.py`, `refs.ts`, `validate.ts` and `ids.*` were not needed. A `term:` link in a legend's `means` resolves as is, because `in_glossary` is false there.
- **doc_impact:** `- **(P39-hk.S7)** architecture.md, qa.md: inline math, the formula block with formula-legend, the TeX allowlist twin and its TSV (math-syntax, math-command, limit), the ingest 422s translation-term-ids and translation-math, formula search, the new fixtures and tests (PASS counts change), the interim reader text` (shortened here; the full line is in `phase.md` `## Doc impact`)

## What was built

**Inline math (`parse.py` `math_pass`, `parse.ts` `mathPass`).** After `inline_children` / `inlineChildren` merges its text nodes, a post-pass runs at every depth: emphasis, link text, table cells, callout titles, headings and every *(md)* YAML field. A `code` node becomes `{type:"math", tex}` when the text before it ends in `$` and the text after it starts with `$`. The two dollars are consumed, left to right:
- `` $`a`$$`b`$ `` is two formulas;
- `` $`a`$`b`$ `` is math, then code, then `$`.

A code node's line is kept beside it (a dict keyed by `id` in Python, a `Map` in TS), so a TeX refusal reports the code span's own line, with `block` inside a typed block. The pass is native only (`this.native` in TS).

An image's alt skips the pass. In Python the alt is `_plain` of its children, with the pass off, so it keeps `$x$` exactly as mdast's plain `alt` string does.

`_plain` / `plainText` add `tex`, as code does: `## Why $`\sqrt{n}`$` slugs to `why-sqrt-n` in both twins. The projections (`inline_text` / `inlineText`) count the TeX verbatim.

**The formula block (`schema.py` `check_formula`, `schema.ts` `checkFormula`).** `"formula"` joins `TYPED_BLOCKS` and `CHECKS`. The fields:
- `tex` is `cx.text`, validated in the display context.
- `alt` is `cx.text`.
- `reading` is `cx.md`. Any math node in it, at any depth, is `field-value`.
- `where` is `seq` 1–20 (`limit`, "symbols"). A non-mapping item is `field-type` with a null slot (quiz's and glossary's rule). Each item is `{sym, means}`, both required. `sym` is validated in the inline context, and `means` is `cx.md`.
- A `sym` that passes is matched with `tex_occurs` / `texOccurs`, but only when `tex` passed too. A miss is `formula-legend`. A sym or tex that fails its own TeX check never cascades into `formula-legend`.

The tree node is `{type:"formula", id, tex, alt, reading:[Inline], where:[{sym, means:[Inline]}]}`. `tex` is kept verbatim, including a block scalar's final `\n`. `tree.ts` adds `{type:"math", tex}` to `Inline`, `"formula"` to `TypedBlock`, and a `LegendItem` interface for S8.

**The validator (`tex.py` / `tex.ts`, character for character the same algorithm).**
1. **Length:** inline over 300 code points, or display over 2,000, is `limit`.
2. **Control characters:** any control character is `math-syntax`, except a line break in display TeX. A tab is always refused, so a double-quoted YAML `"\theta"` cannot ship as `<TAB>heta`.
3. **Empty:** a formula of only spaces is `math-syntax`.
4. **The grammar:** a recursive descent over code points with five contexts: top, `{}` group, `\sqrt`'s `[]`, `\left…\right`, and environment.
   - **Atoms:** an ASCII letter, a digit, `+-*/=<>()[]|,.;:!?`, a group, or an allowlisted command.
   - **Scripts:** `^`, `_` and primes, in the order of KaTeX's parser loop as I recall it (Temml is its fork). This was not run against Temml; S8's render test is the check. A double script is refused, and so is a prime after a superscript. `f'^2` passes and `f' ^2` does not. `\limits` / `\nolimits` must follow an `op`.
   - **Arguments:** a group, one ordinary token, or a 0-arity or delimiter command. A command that takes arguments must be braced (`x^\sqrt{2}` is refused). That mirrors KaTeX's "Got function … with no arguments" refusal, and is stricter where KaTeX lets a font command through.
   - **Text arguments** (`\text`, `\mathrm`, `\operatorname`): any printable character except ``\ { } $ % # & ^ _ ~``.
   - **Structure:** `\left` / `\right` take a delimiter: `( ) [ ] | .` or a `delim` command. An environment sits at the top level only, and `\end` must name its `\begin`. `&` and `\\` are allowed only directly inside an environment, and `\\` followed by `[` is refused, because KaTeX-family parsers read a spacing argument there.
   - **Depth:** groups, `[…]`, `\left` and environments together may nest at most 20 deep.
   - **First problem only:** the first problem is the one violation for that formula.
5. **The legend match (`tokens` / `texTokens`):** control words whole, control symbols as two characters, other characters one by one, spaces dropped. Then `{` + one token + `}` is unwrapped until stable. `occurs` is a contiguous-subsequence test.

**The allowlist** is R1 §4's list exactly: 147 rows. Its arity vocabulary is `0`, `delim`, `op`, `limits`, `fence`, `1`, `2`, `text`, `opt1`, `env` and `cell`. Its contexts are `inline` (anywhere) and `display`.
- The environments are rows `\begin{aligned}` and `\begin{cases}`.
- `&` and `\\` are rows with arity `cell`.
- `\ `, `\_` and `\&` are tokenized but are not rows, so they are `math-command`.
- Every sample was written to pass the validator in its context. The `display` rows' samples use `\frac` or environments, and the `\left` / `\right` sample stays inline (no `\frac`).

**Translation (`native_ingest.py`, Python only).**
- `term_ids` collects the glossary's term ids, and `translation-term-ids` names what is missing and what is extra.
- `display_formulas` builds a `(tex, (sym, …))` list in order. `inline_tex` is a `Counter` from a generic walk for `{type:"math"}` over the whole tree, so definitions, legends, captions and quiz text are included.
- `translation-math` is one finding whose message lists every difference, for example "display formula 1's tex differs", "display formula 1's legend symbols differ", or "inline math missing $`\lambda`$; extra none".
- Both sit after `translation-quiz-ids`.

**Search (`project.py` `_search_block`).** A formula contributes `alt`, `reading` and each `means`, and never `tex`. That is R1's figure precedent (alt and caption, never the pixels). Inline math in a passage is already in the search text as TeX, with its passage.

**README (and its copy).**
- the `tex.py` Modules row, and "four extensions";
- a Math codes row;
- `formula` in the typed-block list;
- three new grammar bullets: *Inline math* (with the no-escape rule for `$`), *The formula block* and *TeX* (the codes, what each refuses, the TSV columns and arities, text arguments, the `\lvert` rule for table cells);
- *Limits* rows for the formula legend and TeX;
- the `term:` row now names a formula's `reading` and `means`;
- the tree's `formula` and `math` nodes;
- projection items 3 and 4;
- search coverage;
- the ingest table's two new 422s;
- a paragraph in *The fixtures* on the TSV.

## Settled where R1 left room (also `phase.md` Decisions, "Math grammar settled (S7)")

- The TSV columns and arity vocabulary above, with a sample that must pass. The file is a header row plus one row per command, with no comments and one final newline.
- One violation per formula: its first problem, in a deterministic left-to-right order that both twins share.
- A line break is allowed in display TeX (block scalars need it) and never in inline TeX or a `sym`. A tab is never allowed. A double-quoted `"\neq"` (a line break plus `eq`) in a display `tex` still passes as letters. Only the README's "block scalar or single quotes" guards that.
- `\limits` / `\nolimits` are accepted only in the script run of an `op` base (`\sum`, `\lim`, `\sin` …), as KaTeX requires.
- The legend check is skipped when `tex` or that `sym` failed its own TeX check, so there is no cascade.
- Search, as above.

## Fixtures

- **`math.md/.json/.txt` (accept).** It covers:
  - inline math in prose, inside emphasis and link text, in two table cells, and in a callout title and body;
  - a heading (`## Why $`\sqrt{n}`$`, assigned `why-sqrt-n`);
  - `$5 and $10`, `$HOME/$USER`, `` $ `ls` `` and `` $ `y` ``, all staying text;
  - `` $`a`$$`b`$ ``;
  - a term link in prose and in a legend's `means`;
  - three formula blocks: one with a 5-symbol legend, one `aligned` with steps, and one unnamed (assigned `formula-1`) whose `sym: 'e_{i}'` matches `e_i` by unwrapping;
  - a quiz prompt with math;
  - a glossary whose `short` and `long` hold math.

  `.txt` shows the TeX counted in the passages, and nothing from the typed blocks.
- **`err-formula.md/.err`:**
  - `8`, `15` and `22` `field-missing` (no `reading`, no `alt`, no `where`);
  - `30 field-value` (math in `reading`);
  - `41` and `42` `formula-legend` (`y`, and `x_i` against `x + z`);
  - `49 limit` (`where: []`);
  - `56 field-unknown`, `58 field-type` and `59 field-unknown`.
- **`err-math.md/.err`:**
  - inline `math-syntax`: a missing argument, an unclosed brace, a double script, non-ASCII, `%`, an unpaired `\left`, a command in `\text`, `\limits` off an operator, and `x^^2` in a table cell;
  - inline `math-command`: `\foo`, `\color`, `\frac`, `\href`, an environment, `\\`;
  - inline `limit`: 301 code points, and 21 levels deep. 300 code points and 20 levels pass, so those lines are absent from the `.err`;
  - display: `\begin{matrix}` (`math-command`), an unclosed `aligned`, `&` outside an environment (`math-command`), a nested environment, `\\` followed by `[`, 2,001 code points (`limit`), and a double-quoted `"\frac"` (a form feed, `math-syntax`);
  - a `sym` with `\frac` (`math-command`, inline context), `\color` in a legend's `means`, and a bad `\sqrt` in a glossary `short`.
- **`tex-allowlist.tsv`:** 147 rows.
- **`test_native_ingest.py` `test_translation_keeps_term_ids_and_math`:**
  - a renamed term id is `[translation-term-ids]`;
  - changed display `tex` is `[translation-math]`;
  - a legend `sym` spelled `e_{i}` for `e_i` is `[translation-math]`. It still passes `formula-legend`, so only translation catches it;
  - a dropped inline formula is `[translation-math]`;
  - the Korean translation with the inline formulas moved and the terms reordered is a 201 with no warnings.
- All are copied byte for byte under `plugin/templates/kb/`. The ten new files are in `manifest.json` `identical`, in sorted position within the native block.

## Observations for S8 (not acted on)

- `web/src/components/review/inline.tsx` has a `default` case, so a `math` node in quiz text currently renders nothing on the Review card. That is OQ9, and S8's set already holds that file.
- `web/src/lib/reader/notes-load.ts` `nameOf` has no `formula` case, so a section that starts at a formula block falls to its default name. It is not in S8's set. The orchestrator may want it there, or may decide the default is fine.
- `tex` keeps a block scalar's trailing `\n`, and Temml should not care. The renderer's `aligned` detection ("top level is one `\begin{aligned}…\end{aligned}`") should trim first.

## Throwaway probes (deleted before return)

- Scratchpad Python scripts (outside the repo) did three jobs. They generated the fixtures' `.json`, `.txt` and `.err` and the TSV from the Python twin. They probed about 50 TeX edge cases. And they printed the translation messages.
- `web/tests/zz-s7-probe.test.ts` compared every violation's line, code and message between the twins for four err fixtures (all equal), and checked a dozen edge cases against the Python probe (all equal). It also rendered `math.md`: 15 `kb-ch-math` code spans, and no formula output.

It was removed, and `git status` does not show it.

## Notebook (written through `phase-section`)

- **Decisions:** "Math grammar settled (S7)", appended. The section is at 12,162 of 12,288 B.
- **Notes for later slices:**
  - removed: the consumed `(from S6, for P39-hk.S7)` note;
  - entry 9, R1's note for S10, replaced by the merged `(from R1 and S7, for P39-hk.S10)` note, which keeps R1's topic pointer;
  - appended: two notes for S8 (the interim render to replace, the node shapes and the owed Temml test; and the anchor-test atom finding);
  - moved to `topics/notes-for-later-slices.md` § 17: S6's note for S9, to stay under budget (6,078 of 6,144 B).
- **Doc impact:** one `(P39-hk.S7)` line.
- **Now:** rewritten, ending "Next: S8 + S10 (a wave)".

## Environment

`web/node_modules` was already installed with the frozen lockfile. No dependency was added: `pyproject.toml`, `uv.lock`, `web/package.json` and `pnpm-lock.yaml` are untouched. No server was started, and `:3030` / `:8766` were not touched.
