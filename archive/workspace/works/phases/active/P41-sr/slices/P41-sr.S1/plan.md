# P41-sr.S1 — the spoken script: what Listen reads (implementation, mid)

## Goal

Write a server-side function that turns a parsed native document into the **ordered list of spoken
segments** Listen will read aloud. The voice engine, the audio cache and the player come later (DECOMP2
cuts them); this slice is only the text Listen speaks.

**The operator's rules** (`intent.md`):
- skip quizzes, code and source lists;
- read a visual's text alternative instead of skipping it.

## Where

- **The module.** Create a new module **`server/spoken.py`**. It sits at the top level of `server/`,
  beside `anchors.py`. It is not in `server/native/`: that package is the grammar with its TS twin, and
  this is server-only.
- **The mirror.** Every file under `server/` and `tests/` ships in the plugin template (`shipped_dirs`
  in `plugin/templates/manifest.json`; `scripts/plugin_parity.py` fails on drift). The open-core
  template mirrors the SaaS server (architecture, P17). So **mirror byte-identically**:
  - `server/spoken.py` → `plugin/templates/kb/server/spoken.py`;
  - `tests/test_spoken.py` → `plugin/templates/kb/tests/test_spoken.py`;
  - `tests/fixtures/spoken/*` → `plugin/templates/kb/tests/fixtures/spoken/*`;
  - add each path to the manifest's `files.identical` list, keeping its existing ordering style.

## The function

```python
def spoken_script(tree: dict, *, lang: str, title: str | None = None) -> list[dict]:
    """Segments in reading order: {"section": str|None, "block": str|None,
    "kind": str, "lang": str, "text": str}."""
```

- **`tree`** is `parse_chapter(source).tree` (`server/native/parse.py`).
- **`lang`** is the caller's language: a chapter variant's `lang`, or the document's. Every segment
  carries it.
- **`section`** is the id of the nearest id'd top-level block at or before this one, the same notion as
  `server/native/project.py:sections`. It is null before the first id'd block.
- **`block`** is the block's own `id` when it has one.
- **`text`** is whitespace-collapsed: runs of spaces or newlines become one space, and the text is
  stripped. Empty segments are dropped.

**Reading order and rules**, by block type. Reuse `server/native/project.py:inline_text` for inline
content, but **with one difference**: inline `math` becomes its spoken form (below), and inline images
read their `alt`. Wrap it, or walk inline nodes yourself; don't change `project.py`.

| Source | Segment(s) | `kind` |
|---|---|---|
| `title` argument (if given) | the title | `title` |
| `tree["summary"]` (if present) | the summary | `summary` |
| `heading` | its text | `heading` |
| `paragraph` | its text | `text` |
| `list` | one segment per item: the item's paragraphs joined, nested lists flattened in order | `list-item` |
| `blockquote` | its paragraphs, one segment each | `quote` |
| `callout` | its title if any, then its paragraphs, one segment each | `callout` |
| `table` | one segment per body row: `"<header>: <cell>; <header>: <cell>"`, skipping empty cells (a table with no head: the cells joined with `"; "`) | `table-row` |
| `figure` | `alt`, then caption if present | `figure` |
| `figures` (row) | per item: image `alt` (+ caption); svg `label` (+ caption); card `title`, then its body paragraphs; diagram `title` (+ caption); then the row's caption | `figure` |
| `diagram` | `title`, then caption if present | `diagram` |
| `svg` | `label`, then caption if present | `svg` |
| `formula` | `alt`, then `reading`, then one segment per `where` entry: `"<sym spoken>: <means>"` | `formula` |
| `code`, `hr`, `quiz`, `sources`, `glossary` | **nothing** (skipped) | — |

- **Tables are read, not skipped.** They hold content the explain documents rely on: doc 67 has nine.
  The `kind` lets a later slice or the player skip them. **Record this in your return** as a decision
  D1 can surface.
- **The glossary is skipped.** It is reference material like sources: terms are explained in the text,
  and the reader's term window shows definitions.
- **Inline math's spoken form** is a minimal, language-neutral linear text, after the reader's
  `linearText` (`web/src/lib/native/mathml.ts:21-22`, `631`):
  - map Greek commands to the Greek letter;
  - `\times`→`×`, `\div`→`÷`, `\cdot`→`·`;
  - `\le`/`\ge`/`\ne`/`\approx`/`\pm` to their symbols;
  - `\sqrt{x}`→`√x` (parentheses around more than one token);
  - `\bar{x}`→`x̄`, `\hat{x}`→`x̂`;
  - `^2`/`^3` and simple digit scripts→Unicode superscripts, otherwise `^(…)`; the same with `_` and
    subscripts;
  - `\sum`→`∑`;
  - `\text{…}`/`\mathrm{…}` keep their content;
  - any other command drops its backslash and keeps its name; braces drop.

  Keep it small: a table plus a tokenizer. How symbols are *spoken* is the voice engine's job later.
  The same function speaks a formula `where[].sym`.

## Test (one tiny core test)

- **The fixture.** `tests/fixtures/spoken/chapter.md` is a valid native chapter. Copy the header form
  from an existing `tests/fixtures/native/*.md`. It contains one of each:
  - a heading, a paragraph with inline math and an inline image;
  - a list, a callout, a table and a code block;
  - a quiz, sources and a glossary;
  - a figure, a figure row, a diagram, an svg, and a formula with `where`.
- **`tests/test_spoken.py`** parses it and asserts the exact segment list (kinds and texts, inline in
  the test), which shows that code, quiz, sources and glossary yield nothing and that alt texts are
  read.
- Keep it to one or two test functions.

## Validation

- `uv run pytest -q tests/test_spoken.py`.
- `uv run python scripts/plugin_parity.py`, which must exit 0.
- `uv run pytest -q tests/test_native_*.py`, to show nothing in the grammar moved.
- A smoke test on a real document: parse `.cache/p41-voices/excerpts/src/doc67.json`'s `source` and
  print the segment count by kind. **Print counts only, never document text**: the repo is public and
  `result.md` is committed.

## Return (wave rules: you write no `phase.md`)

- Write `result.md` with the verdict block first.
- The `notebook` field holds:
  - **Decisions:** one gist, `Spoken script: server/spoken.py …`, with the read and skip table in one
    line, and tables read as `table-row`, the glossary skipped;
  - **Notes for later slices**, `(for D1, DECOMP2)`: the segment shape, and that the mirror is in
    place, so DECOMP2's backend slices mirror too;
  - **Doc impact:** `- backend.md: the spoken script (server/spoken.py) and its read and skip rules
    (P41-sr.S1)`;
  - **Now:** one line.

## Wave

- **Set (this slice):** `server/spoken.py`, `tests/test_spoken.py`, `tests/fixtures/spoken/`,
  `plugin/templates/kb/server/spoken.py`, `plugin/templates/kb/tests/test_spoken.py`,
  `plugin/templates/kb/tests/fixtures/spoken/`, `plugin/templates/manifest.json`,
  `works/phases/active/P41-sr/slices/P41-sr.S1/`.
- **Running beside it:**
  - `P41-sr.R1`: `.cache/p41-voices/apis/`, `works/phases/active/P41-sr/topics/voice-apis.md`, its
    slice folder.
  - `P41-sr.R2`: `.cache/p41-voices/models/`, `.cache/p41-voices/venv*/`,
    `works/phases/active/P41-sr/topics/voice-models.md`, its slice folder, the Mac's CPU and GPU.
  - `P41-sr.R3`: `.cache/p41-playback/`, `works/phases/active/P41-sr/topics/phone-playback.md`, its
    slice folder, a local port and the agent's Chrome.
- **Read-only:** `.cache/p41-voices/excerpts/` (the smoke test).
- **Waiting commits:** none.
- **Join-rebuilt artifact:** none.
- **Checks:** the validation above. The full `pytest` suite and the web gates are
  `deferred: whole-tree`.

## Dispatch

route=mid
reason=kind implementation rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
