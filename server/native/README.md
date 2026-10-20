# `server/native/`: the native chapter format

This package is a pure Python parser, validator and plain-text projection for `format: native`
chapters, following P29.S2's contract. It is not wired to any route: S5 wires ingest, and S12's TS parser
reproduces the same tree from the shared fixtures in `tests/fixtures/native/`.

```python
from server.native import parse_chapter, NativeFormatError, sections, search_text

result = parse_chapter(source, reserved_ids=retired_ids)   # raises NativeFormatError
result.tree          # the normalized block tree (below), JSON-serializable
result.source        # the file to store: LF line endings, every assigned id written in
result.assigned_ids  # [{"id", "type", "line"}], for the 201 response
result.refs          # every link/image reference: {"kind", ..., "href", "line", "image"}
sections(result.tree)     # [{"id", "text"}]: the anchor basis (S9)
search_text(result.tree)  # the FTS/embedding text (S5)
```

## Modules

| Module | What it holds |
|---|---|
| `parse.py` | `parse_chapter`. It runs markdown-it-py (CommonMark + GFM tables, strikethrough and autolinks) plus the three extensions, and builds the tree. |
| `schema.py` | The typed-block schemas and every limit. |
| `svg.py` | The SVG allowlist validator. It rejects and never strips. |
| `ids.py` | Id syntax, the document namespace and assignment. |
| `refs.py` | Reference syntax (`#id`, `http(s):`, `asset:`, `chapter:`, `doc:`). |
| `project.py` | The section projection and the search text. |
| `yamlcore.py` | The YAML 1.2 core-schema loader, on PyYAML. |
| `errors.py` | `Violation` and `NativeFormatError`. |
| `fixtures_util.py` | The `.json` and `.err` fixture formats. |

## Errors

Every failure is one `NativeFormatError` that lists **every** violation. P29 says ingest returns one 422.

- `.violations` holds `Violation(line, col, code, message, block?, element?, attribute?)`, sorted.
- `.line`, `.col`, `.code` and `.message` mirror the first violation.
- `.to_detail()` is the list of dicts that S5 puts in the 422 `detail`.

Lines are 1-based in the whole file, header included. `col` is best effort and is 1 when only the line is
known. A violation inside a typed block carries `block` when the block has an authored id. SVG violations
add `element` and `attribute`.

The codes are:

| Area | Codes |
|---|---|
| File | `body-too-large`, `control-char`, `limit` |
| Header | `header-missing`, `header-yaml`, `header-format`, `header-syntax`, `header-field` |
| Markdown | `raw-html`, `heading-level`, `heading-nested`, `typed-block-nested`, `id-nested`, `fence-info`, `callout-type` |
| Ids | `id-malformed`, `id-duplicate` |
| YAML | `yaml`, `yaml-anchor`, `yaml-tag`, `yaml-duplicate-key`, `yaml-key`, `yaml-merge`, `yaml-value` |
| Schema | `field-type`, `field-missing`, `field-unknown`, `field-value`, `limit`, `diagram-ref`, `quiz-answer`, `cloze-blank` |
| References | `ref-scheme`, `ref-malformed`, `ref-missing-id`, `ref-external-image`, `ref-asset-link` |
| SVG | `svg-xml`, `svg-root`, `svg-element`, `svg-attribute`, `svg-value`, `svg-ref`, `svg-namespace`, `svg-text`, `svg-limit` |

## The grammar, as enforced

- **Header.** The `---` YAML header (core schema) must say `format: native` and `syntax: 1`. If `summary`
  is present, it must be a non-empty string. Ingest (`server/documents.py`) validates every other header
  field.
- **Raw HTML** is rejected in every position: an HTML block, inline HTML or a comment, in a paragraph,
  heading, table cell, list, callout title or body, or an *(md)* YAML field. Plain-text YAML fields such
  as `alt` and `label` are text, never HTML.
- **Headings** are h2–h4 only, and only at the top level. An h1 (the title comes from the header), an
  h5/h6, or a heading inside a list, quote or callout is rejected. The trailing `{#id}` is the heading's
  id.
- **Callouts** are a blockquote whose first line is `[!TYPE]`, `[!TYPE]-` (collapsed), or either one
  followed by ` title`. The type is case-insensitive and normalized to upper case. The types are `NOTE`,
  `IMPORTANT`, `WARNING`, `CAUTION`, `SKIP` and `DEFINITION`; anything else is `callout-type`. A
  blockquote without the marker is a plain quote.
- **Code fences.** The info string is `` ```[lang] [title="..."] [#id] ``. Any other token is
  `fence-info`. A language outside the typed-block names is an ordinary code block, `mermaid` included.
  An authored id is allowed only at the top level.
- **Typed blocks.** These are `` ```figure|figures|diagram|svg|quiz|sources [#id] `` at the top level only,
  with a YAML 1.2 core-schema mapping body (JSON accepted). Anchors, aliases, tags, `%` directives,
  duplicate keys, non-string keys, `<<` and `.inf`/`.nan` are rejected.
- **Schema checks.** Unknown keys are rejected. A required string must be non-empty. A string field must
  be a YAML string: `label: 2024` is a number, so quote it. Enum values are checked, so an unknown
  tone, shape, kind or type is rejected at ingest, and the renderer's fallbacks are defence in depth.
- **Autolinks.** CommonMark `<…>` and GFM bare `www.` / `http(s)://` text become links, and their URLs
  are checked like any other. A bare email becomes a `mailto:` link, which is rejected, since P29 allows no
  other scheme.

### Limits

| What | Limit |
|---|---|
| Body | 512 KB (UTF-8, the whole file) |
| Typed blocks | 300 per chapter |
| Figure row | 2–3 items |
| Quiz | 1–20 items; a choice has 2–6 options; a cloze has 1–5 blanks |
| Diagram nodes | 60: flow/state `nodes`, and a stack's `items` in total |
| Diagram edges | 100: flow/state `edges`, and sequence `steps` |
| Diagram lanes | 12: flow/state `groups`, timeline `lanes`, sequence `actors` and stack `layers` |
| Diagram points | 200: chart `values` over all series (an interval is one point), and timeline bars plus marks |
| SVG | 64 KB of source; 2,000 elements; `viewBox` required on the root |
| Nesting | 32 levels of inline markup, and 32 levels of YAML collections (checked before any tree is built, so a nesting bomb is a 422, never a 500). This is Python-side defence and is not part of the shared fixtures. |

### Ids

The syntax is `[a-z0-9][a-z0-9-]{0,63}`.

**The document namespace** must be unique per chapter. It holds:

- h2–h4 headings;
- every typed block;
- an authored code-block id;
- every quiz item;
- every sources item.

**Scoped ids** need to be unique only inside their parent:

- quiz option ids, within their item (`answer: [b]`);
- diagram node, group and actor ids, within their diagram;
- SVG element ids, within their SVG.

**Assignment** covers an id'd construct that has none, in source order, after every authored id is
claimed:

- an ASCII heading takes its slug (`## Getting started` → `getting-started`; a collision takes `-2`, `-3`,
  and so on). `## Sources` takes `sources-list`, clear of the `sources` block;
- any other heading takes `s-<n>`;
- a typed block takes `<type>-<n>`.

`n` is the smallest free positive integer, and `reserved_ids` (retired ids) are never handed out. Quiz
item, option and sources item ids are required in the YAML, so `item-<n>` is never minted.
`result.source` has every assigned id written in: ` {#id}` on the heading line (before an ATX closing
sequence), and ` #id` on the fence line.

### References

| Form | Where | Notes |
|---|---|---|
| `#<id>` | links | Resolved here: a miss is `ref-missing-id`. |
| `http(s)://host…` | links | An external **image** is `ref-external-image`. |
| `asset:<name>` | images only | The name is `[A-Za-z0-9][A-Za-z0-9._-]{0,127}`. A link to an asset is `ref-asset-link`. S5 resolves it against the `assets` map. |
| `chapter:[<project>/]<book>/<key>[?lang=<xx>][#<id>]` | links | S5 resolves it, and a miss is a warning. |
| `doc:[<project>/]<slug>` | links | S5 resolves it, and a miss is a warning. |

Anything else is `ref-scheme`, including `mailto:`, `javascript:`, `data:` and relative paths. A figure's
`src` and a figure row item's `image` are bare asset names. A source's `url` must be `http(s)`.

## The tree

`json.dumps(tree, sort_keys=True)` is the stable form, and the fixtures store it with `indent=2`. Every
block has `type` and `id`; `id` is `null` on a block that does not carry one. Every optional schema
field is present, and `null` when absent. Defaults (a figure's `width: column`, a flow's
`direction: down`, a node's `shape: box`, a tone's `default`, and so on) are the renderer's to apply.

```text
Tree       {syntax: 1, summary: str|null, blocks: [Block]}

Block      {type:"paragraph", id:null, content:[Inline]}
           {type:"heading", id, level:2|3|4, content:[Inline]}
           {type:"list", id:null, ordered:bool, start:int|null, tight:bool, items:[{blocks:[Block]}]}
           {type:"blockquote", id:null, blocks:[Block]}
           {type:"callout", id:null, kind:"NOTE"|…, collapsed:bool, title:[Inline]|null, blocks:[Block]}
           {type:"table", id:null, align:["left"|"center"|"right"|null], head:[[Inline]], rows:[[[Inline]]]}
           {type:"code", id:str|null, lang:str|null, title:str|null, text:str}   # no final newline
           {type:"hr", id:null}
           {type:"figure", id, src, alt, caption:[Inline], credit:[Inline]|null, width:"column"|"wide"|null}
           {type:"figures", id, caption:[Inline]|null, items:[FigItem]}
           {type:"diagram", id, kind, title, caption:[Inline]|null, …Kind}
           {type:"svg", id, label, caption:[Inline]|null, svg:SvgElement}
           {type:"quiz", id, title:str|null, items:[QuizItem]}
           {type:"sources", id, items:[{id, title, url, publisher, date, accessed, note}]}   # strings|null

FigItem    {kind:"image", src, alt, caption:[Inline]|null}
           {kind:"diagram", diagram:{kind, title, …Kind}, caption:[Inline]|null}   # no inner caption
           {kind:"svg", svg:SvgElement, label, caption:[Inline]|null}
           {kind:"card", title, body:[[Inline]], tone:str|null}   # body: paragraphs split at blank lines

Kind       flow/state: nodes:[{id, label, sub, at:[row,col]|null, shape, fields:[str]|null, tone}],
                       groups:[{id, label, nodes:[id]}]|null, edges:[{from, to, label, style, tone}],
                       direction; state adds initial:id|null, final:[id]|null (a scalar is wrapped)
           sequence:   actors:[{id, label}], steps:[{from, to, label, style, note}]
           stack:      layers:[{label, items:[str]|null, tone}], nested:bool|null
           timeline:   axis:{unit, from:num, to:num, ticks:[num]|null},
                       lanes:[{label, bars:[{from, to, label, tone}], marks:[{at, label}]|null}]
           chart:      type:"bar"|"line"|"interval", x:{label, categories:[str]|null,
                       numeric:{from, to}|null}, y:{label, min, max}, series:[{name, values, tone}],
                       rules:[{at, label}]|null; an interval value is [low, high] or [low, median, high]

QuizItem   {id, type:"choice", prompt:[Inline], options:[{id, text:[Inline]}], answer:[id], explain:[Inline]}
           {id, type:"recall", prompt:[Inline], answer:[Inline], explain:[Inline]|null}
           {id, type:"cloze", text:[Inline|Blank], explain:[Inline]|null}

Inline     {type:"text", text}            # adjacent text merged; a soft break is "\n" inside it
           {type:"code", text}
           {type:"em"|"strong"|"del", children:[Inline]}
           {type:"link", href, title:str|null, children:[Inline]}
           {type:"image", src, alt, title:str|null}
           {type:"break"}                 # a hard line break
Blank      {type:"blank", accept:[str]}   # a cloze blank, its accepted answers verbatim

SvgElement {name, attrs:{name: value}, children:[SvgElement | {text}]}
           # xlink:href is normalized to href; text is kept only inside text/tspan/title/desc
```

URLs are kept exactly as written, after Markdown unescaping, with no percent-encoding. Entities
(`&amp;`) become their characters.

An example: this source

````markdown
---
format: native
syntax: 1
---
## Background

Read [the quiz](#quiz-1).

```quiz
items:
  - {id: q1, type: recall, prompt: Why?, answer: Because.}
```
````

parses to (shown compactly)

```json
{"syntax": 1, "summary": null, "blocks": [
  {"type": "heading", "id": "background", "level": 2, "content": [{"type": "text", "text": "Background"}]},
  {"type": "paragraph", "id": null, "content": [
    {"type": "text", "text": "Read "},
    {"type": "link", "href": "#quiz-1", "title": null, "children": [{"type": "text", "text": "the quiz"}]},
    {"type": "text", "text": "."}]},
  {"type": "quiz", "id": "quiz-1", "title": null, "items": [
    {"id": "q1", "type": "recall", "prompt": [{"type": "text", "text": "Why?"}],
     "answer": [{"type": "text", "text": "Because."}], "explain": null}]}]}
```

and its stored source reads `## Background {#background}` and ```` ```quiz #quiz-1 ````.

## The projection: what annotation offsets measure

This follows the signed `05-annotations` round, *Sections and offsets*. S12 must reproduce it exactly.

1. **Sections.** A section is an id'd top-level block (an h2–h4 heading, a typed block, or a code block
   with an authored id) plus every block after it, up to the next id'd block. Content before the first
   id'd block belongs to no section and takes no highlight (`annotations` 5).
2. **A section's text** is its passage containers' texts joined by `"\n"`. The passage containers, in
   document order, are:
   - each paragraph, whether at the top level or inside a list item, quote or callout;
   - a callout's title;
   - each table cell: the header row, then each row, left to right. An empty cell is an empty container;
   - a code block's text, verbatim.
3. **Containers that contribute nothing.** Headings, and all of a typed block's text (captions, titles,
   labels, quiz prompts and options, source titles), are *head*/*cap* containers. They take a note or a
   bookmark, never a highlight, so they add nothing to the section text. A section that starts at a
   typed block therefore holds only the passages after it.
4. **A container's text** concatenates its inline nodes:
   - `text` and `code` verbatim; a soft break is already the `"\n"` inside the text;
   - `break` becomes `"\n"`;
   - `image` and `blank` become nothing;
   - `em`, `strong`, `del` and `link` become their children's text.

   **No whitespace is collapsed and nothing is normalized.**
5. **Offsets** count Unicode code points of the section text, so a TS port counts with
   `Array.from(text)`, not UTF-16 units.

The `.txt` fixture form (`format_sections`) writes, for each section, `=== <id>\n<text>\n`.

`search_text` is the wider P29 search projection. It covers the summary, headings, every passage,
figure alt and caption and credit, every diagram label, title and caption, SVG labels, and quiz titles,
prompts, options and explanations. It never includes answer keys: a recall `answer`, a choice `answer` or
a cloze blank. It also covers source titles. It is Python-only (S5).

## The fixtures

Each case in `tests/fixtures/native/` is `<case>.md` plus one of these:

- `<case>.json` (`format_tree`) and `<case>.txt` (`format_sections`);
- `<case>.err`: one `<line> <code>` row per distinct pair, sorted.

The `limits-at` case and the two `err-typed-blocks-*` cases sit exactly at each limit and one over it.
The at-limit typed-block case carries one unrelated h1, so its `.err` proves that 300 typed blocks raise
no `limit` without storing a 300-block tree. The 512 KB body limit and the SVG size and element limits
are tested in memory in `tests/test_native_format.py` rather than as committed fixtures.
