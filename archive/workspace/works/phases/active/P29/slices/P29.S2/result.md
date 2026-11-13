# P29.S2 — result: the native chapter format and the legacy path

## Verdict

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** medium
- **summary:** Surveyed all 41 HTML explainers + the 1 markdown doc on `origin/main` (126 figures, 59 inline SVGs, 205 quiz questions, 652 code blocks, 219 tables, 41 scripts — all quiz feedback) and settled the native format as data contracts: CommonMark+GFM with GFM-alert callouts and typed YAML fenced blocks (`figure`, `figures`, `diagram`, `svg`, `quiz`, `sources`), no raw HTML, server-validated at ingest (422) and rendered by the reader with no iframe; a seven-kind diagram vocabulary on fixed grid layouts (Mermaid rejected); a reject-at-ingest SVG allowlist; three quiz types (`choice`, `recall`, `cloze`) with a saved-result payload; ids on headings/typed blocks/quiz items; `chapter:`/`doc:`/`asset:`/`#id` references; `.md` + `format: native`; the full-screen legacy frame with a scroll/link bridge and no height measurement; print; deferred fates; `/explain` changes. 3 operator questions added.
- **files_changed:** `works/phases/active/P29/slices/P29.S2/result.md`, `works/phases/active/P29/phase.md`
- **validation:** `python3 scripts/workflow.py validate` — pass; `git status --porcelain` — only this slice folder, `phase.md` and engine-generated files (pre-existing orchestrator changes to backlog/events/index/state/slice.json/plan.md); scratch `p29-s2/` deleted — yes.
- **deviations:** (1) No Aside probe page was run (optional in the plan); every legacy-frame claim is backed by code/docs and listed as a P30 device check instead. Instrument: none. (2) Diagram classification was done by me from figure captions + structure extracted by script, not by `Explore` passes (cheaper, and the judgment needed the whole set at once). (3) Two small amendments to S1 contracts are proposed, not silently made: `md → native` as an ordinary next version (same `.md` rel_path), and MCP `format` gaining the value `"native"` — both flagged in `## Decisions`.
- **doc_impact:** none
- **operator_need:** none (3 operator questions recorded in `phase.md` → `## Operator Questions` 3–5, for DECOMP2's planning gate; nothing in S3 waits on them)

## Commands run

```
git fetch origin
git archive origin/main docs | tar -x -C <scratch>/p29-s2/corpus        # 41 html + 1 md (+5 archived versions)
python3 -I tools/survey.py $(cat html.txt) > survey.json               # stdlib HTMLParser extractor
python3 -I tools/agg.py survey.json                                     # per-doc table + tag/class counts
(+ ad-hoc python/grep passes for quizzes, scripts, callouts, code, figures, grid CSS, svg colour)
Explore (sonnet) x2: server format/ingest/FTS/MCP; explain skill copies/parity/CLI
WebSearch/WebFetch: micromark directive syntax; Mermaid CVEs; iOS dvh/safe-area; WebKit iframe focus bugs
python3 scripts/workflow.py validate
```

No product file was changed. The corpus was never written into the working tree.

## 1. Survey (evidence)

Corpus: `origin/main` `docs/<project>/` — 41 `.html` (24–109 KB, median ≈ 77 KB) + 1 `.md` (`base/…beginne.md`, 17 KB, Korean).

### 1.1 Per document

`h2/h3/h4`; `svg(n)` = inline SVGs (total SVG elements); `pre`; `tbl`; `ko` = Hangul chars; `ext` = external links; `dark` = has `prefers-color-scheme: dark`. Every doc has exactly 1 `<script>`, 1 `<nav>` contents list, and 5 quiz questions.

| doc | KB | h2/h3/h4 | svg(n) | pre | tbl | details | ko | ext | dark |
|---|---|---|---|---|---|---|---|---|---|
| arb_upbit_1/[private] | 68 | 6/14/10 | 4(127) | 8 | 6 | 0 | 30 | 5 | 1 |
| arb_upbit_1/the-fish-ladder… | 57 | 4/18/6 | 4(84) | 17 | 5 | 1 | 2 | 0 | 1 |
| arb_upbit_1/the-korbit-fish-book-v2… | 71 | 4/21/0 | 1(20) | 25 | 4 | 2 | 0 | 1 | 1 |
| bootstrap…/the-agentic-workspace-from-scratch | 55 | 5/19/5 | 1(27) | 12 | 6 | 0 | 0 | 6 | 1 |
| changple5/[private] | 63 | 4/17/5 | 2(74) | 11 | 3 | 0 | 60 | 0 | 0 |
| changple5/[private] | 78 | 4/13/13 | 3(77) | 32 | 4 | 0 | 0 | 2 | 1 |
| changple5/[private] | 92 | 4/16/12 | 2(89) | 40 | 6 | 0 | 106 | 2 | 0 |
| changple5/[private] | 99 | 4/11/21 | 2(82) | 29 | 11 | 0 | 208 | 4 | 0 |
| changple5/[private] | 99 | 4/12/19 | 0 | 33 | 7 | 0 | 278 | 5 | 0 |
| changple5/[private] | 77 | 4/14/20 | 0 | 25 | 4 | 0 | 372 | 7 | 0 |
| changple5/[private] | 85 | 4/15/13 | 0 | 21 | 6 | 0 | 555 | 6 | 0 |
| changple5/[private] | 103 | 4/15/29 | 0 | 20 | 7 | 0 | 344 | 7 | 0 |
| changple5/[private] | 77 | 4/12/16 | 0 | 23 | 6 | 0 | 153 | 8 | 0 |
| changple5/[private] | 105 | 4/18/26 | 2(88) | 32 | 12 | 0 | 593 | 6 | 0 |
| changple5/[private] | 82 | 4/15/18 | 2(91) | 26 | 7 | 0 | 1053 | 16 | 0 |
| changple5/[private] | 105 | 4/13/29 | 5(156) | 20 | 7 | 0 | 146 | 16 | 0 |
| changple5/[private] | 107 | 4/13/40 | 1(71) | 45 | 6 | 0 | 870 | 2 | 0 |
| changple5/[private] | 87 | 4/12/30 | 2(66) | 23 | 3 | 0 | 474 | 3 | 0 |
| changple5/[private] | 91 | 4/15/18 | 3(115) | 14 | 6 | 0 | 372 | 21 | 0 |
| changple5/16-running-it-celery… | 83 | 4/13/11 | 1(54) | 26 | 8 | 0 | 41 | 1 | 0 |
| changple5/[private] | 77 | 4/13/10 | 2(68) | 21 | 4 | 0 | 98 | 7 | 0 |
| changple5/[private] | 84 | 4/16/23 | 1(31) | 26 | 11 | 0 | 91 | 10 | 0 |
| changple5/[private] | 85 | 4/8/17 | 4(90) | 38 | 6 | 0 | 557 | 5 | 0 |
| changple5/[private] | 79 | 6/11/23 | 1(94) | 0 | 3 | 0 | 121 | 39 | 0 |
| glide-ilab/how-the-glide-ilab-team-ships… | 44 | 5/14/0 | 2(60) | 6 | 3 | 1 | 16 | 5 | 1 |
| glide-ilab/p8-…-ko | 50 | 10/13/5 | 0 | 2 | 4 | 0 | 12260 | 11 | 1 |
| glide-ilab/p8-… | 68 | 10/13/5 | 0 | 2 | 4 | 0 | 486 | 11 | 1 |
| glide-ilab/[private] | 109 | 10/32/0 | 0 | 0 | 20 | 0 | 517 | 16 | 1 |
| glide-ilab/the-signal-tables-pr-explained… | 54 | 5/8/15 | 0 | 11 | 6 | 0 | 270 | 4 | 1 |
| glide-ilab/p17-and-p18… | 84 | 5/22/3 | 3(51) | 17 | 11 | 0 | 20 | 12 | 1 |
| glide-ilab/p24… | 77 | 5/24/3 | 5(86) | 9 | 4 | 0 | 351 | 8 | 1 |
| knowledge/…read-surfaces… | 32 | 5/13/0 | 0 | 3 | 0 | 0 | 0 | 2 | 1 |
| knowledge/…system-internals… | 37 | 5/16/0 | 0 | 7 | 3 | 0 | 0 | 3 | 1 |
| knowledge/…what-it-is… | 35 | 4/12/0 | 0 | 9 | 1 | 0 | 0 | 0 | 1 |
| knowledge/shipping-and-running… | 29 | 5/14/0 | 0 | 3 | 3 | 0 | 0 | 2 | 1 |
| knowledge/why-knowledge-is-this-way… | 25 | 5/10/0 | 0 | 2 | 1 | 0 | 0 | 2 | 1 |
| Mijual/[private] | 66 | 5/13/10 | 3(88) | 7 | 3 | 0 | 660 | 5 | 1 |
| vocky/…decisions-history… | 23 | 4/9/0 | 0 | 1 | 2 | 0 | 0 | 0 | 0 |
| vocky/…security-operations… | 30 | 5/12/0 | 1(26) | 1 | 2 | 0 | 0 | 3 | 0 |
| vocky/…system-internals… | 34 | 5/13/0 | 1(30) | 2 | 2 | 0 | 12 | 3 | 0 |
| vocky/…what-it-is… | 31 | 4/11/0 | 1(31) | 3 | 2 | 0 | 58 | 0 | 0 |

### 1.2 Structure

- **Fixed shape:** 38/41 follow Background / Intuition / Code / Quiz; 15 of those add "Best practices & next steps". The 3 exceptions (`p8` EN, `p8-ko`, `p9`) use a numbered research shape (question + short answer … Sources … Quiz). One (`[private]`, v2) opens with **"What changed since the previous version"** — a re-explain changelog.
- **Headings:** 198 h2, 593 h3, 455 h4 (h4 heavy in changple5). Only 92 of 1,292 headings carry an `id`; 298 in-page `#anchor` links (most into the TOC targets / `<section id>`).
- **TOC:** 41/41 (`<nav aria-label="Contents">`, 1 `목차`). Reader-generatable from headings.
- **Lede/subtitle:** `p.lede` 22 docs, `p.subtitle` 7.

### 1.3 Diagrams

- **126 `<figure>` in 37 docs, 131 `<figcaption>`.** 55 figures hold one inline SVG, 1 holds a row of 3 SVG charts, 70 are CSS/HTML-drawn (`div.node`/`div.arrow`/`div.flow`/`lane`/`layer`/`bar`…) or a `<pre>`. Plus ≈ 15 CSS diagrams outside figures in 12 docs (`div.rung` ladders 63, `step` lists, `layers`).
- **Inline SVG: 59 in 26 docs.** Elements used: `text` 943, `rect` 336, `line` 220, `path` 137, `circle` 42, `marker` 40, `defs` 33, `g` 30, `polygon` 19, `tspan` 8, `title` 3, `desc` 3, `style` 2, `pattern` 1. Size: median 28 shape elements, p90 53, max 94. Colour: **35/59 hard-coded hex attributes**, 12 `currentColor`, 4 `var()`, 23 docs colour SVG via CSS classes in the page `<style>`. 59/59 have `role`/`aria-label`; 59/59 `viewBox`, 12 a fixed `width`. **Korean labels in 13 SVGs** (≈ 30 figures carry Korean in-figure text).
- **Kinds (126 figures, my classification from caption + structure):**

| kind | n | examples |
|---|---|---|
| flow / pipeline / loop / funnel | 36 | changple5/07 fig 1 (12-node read path); knowledge/why… "stages" pipe; Mijual run_turn loop |
| chart / plot (bar, line, axis, interval) | 14 | p24 votes/week + least-squares line; p17 fig 4 (row of 3 charts); fish-ladder price ladder |
| timeline (lanes × time bars, races) | 13 | changple5/05 fig 3 "disconnect at t=3s"; changple5/16 "the race, drawn"; p8 week grid |
| architecture map (2-D boxes + arrows) | 11 | changple5/01 "the whole stack" (51 el.); changple5/20 fig 1 (88 el.); vocky "six doors, one store" |
| sequence (actors × ordered messages) | 10 | changple5/03 Naver round trip; knowledge read-surfaces postMessage |
| annotated code / annotated text | 10 | changple5/07 fig 3 query plan; changple5/09 chunk bars |
| layered stack / nesting | 8 | bootstrap "three layers"; changple5/16 "three nested budgets" |
| comparison / before-after | 6 | arb "same δ rule, two ladders"; knowledge "same corpus, two readers" |
| state machine | 6 | changple5/04 session state machine; changple5/18 subscription states |
| entity / table diagram (ER) | 4 | changple5/04 "five tables of a conversation"; changple5/13 seven tables |
| UI mock (redrawn page) | 4 | p8 / p8-ko list + detail page redrawn from captures |
| grid / matrix | 3 | changple5/06 cell strip (watermark); changple5/12 asymmetric cell |
| tree / decision | 1 | p17 fig 2 review decision |

- Node counts of CSS diagrams: 2–12 nodes; the largest SVGs (88–94 elements) are architecture maps.

### 1.4 Widgets (scripts)

- **41 scripts, exactly 1 per doc; 41/41 are quiz feedback.** 32 are byte-identical (normalized) to the template: click → `.correct`/`.incorrect` on the button + unhide `p.why`. Variants: reveal the right option on a wrong click (3: changple5/17, p17, Mijual), disable options after a right click (3: arb ×2, Mijual), "Correct./Not quite." prefix (1: fish-ladder), `aria-pressed` (2).
- 1 doc adds **reveal/toggle** (changple5/20: 16 self-check "Show answer" items).
- 1 doc adds a **link builder** (p9: composes GitHub URLs from `data-p`/`data-kb` attributes) — plain links absorb it.
- **None:** tabs, stepper/animation, copy button, theme toggle, `localStorage`, scoring, `postMessage`, `<form>`/`<input>`, canvas, video, iframe.
- Absorbable by declarative blocks: all of it (quiz → `quiz`; reveal → `recall` item / collapsed callout; link builder → ordinary links).

### 1.5 Figures and multi-column layouts

- `<img>`: **0**. Figures: 126 (above). Captions: 131.
- Rows of 2–4 side-by-side items: ≈ 10 instances in 7 docs — p17 `.charts` (3 SVG charts, `auto-fit minmax(14rem,1fr)`), p17 `.grid` cards, knowledge `.two`/`.planes`/`.doors` (2–4 boxes in a figure), p24 `.states`/`.chipcols`, changple5/18 `.grid2` cards, p9 `.lanes` (2 cols → 1 under 40rem), p8 `.grid` (4 weeks → 2 under 40rem). 7 of them collapse by `auto-fit`/media query.
- Only 8/41 docs have any responsive `@media (max-width…)` rule.

### 1.6 Tables

219 tables in 40 docs; median 6 rows × 3 cols; max 34 rows / 8 cols; 4 tables > 15 rows. Column counts: 3 → 108, 4 → 43, 2 → 39, 5 → 16, 6–8 → 13. Numeric right-aligned cells (`td.num`/`td.n`) 318 in 9 docs.

### 1.7 Code

- 652 `<pre>` in 39 docs (median 7 lines, max 48); 11,582 inline `<code>`.
- **Language labels: 0** (no `class="language-…"`); 2 `pre` carry a role class (`filetree`, `frames`).
- **Highlighting:** none in 624; hand-written spans in 28 (`span.cm` comments 37, `src` 17, `ev` 9) in ~3 docs.
- **Titles/filenames:** ≈ 33 via a caption element (`filepath` 15, `fileref` 10, `filename` 6, `path` 2) + ≈ 49 via a short preceding paragraph naming a file → ≈ 80/652 (12%).
- Language (heuristic): python ≈ 169, sql 38, yaml/kv 29, json 9, js/ts 8, shell 7, **ASCII diagram/flow 41**, rest unlabelled fragments/prose.
- **Line marks: 0. Diffs: 0. Line numbers: 0.**

### 1.8 Callouts

| class | count | docs | typical opener |
|---|---|---|---|
| `div.callout` | 241 | 41 | bold lead: "Key idea", "Why this…", "The one…", "Definition" |
| `div.warn` | 79 | 32 | "A subtle…", "Logout does not…" |
| `div.note` | 25 | 12 | "What the…", "Notice the…" |
| `div.def` (definition) | 16 | 7 | term + definition |
| `div.skip` / `p.skip` | 13 | 9 | "Skip this if…" |
| `p.surprise` ("Watch for") | 19 | 1 | changple5/20 |
| `div.aside` | 6 | 4 | |
| `div.teaser` | 6 | 2 | (p8 UI-mock cards, not a callout) |
| `p.takeaway` | 6 | 1 | |
| `div.danger` | 4 | 2 | |
| `div.info` | 1 | 1 | |

Collapsible `<details>`: 4 in 3 docs, all "beginner primer — skip if you know…" (glossary-like). `blockquote`: 12 in 8 docs (quoting docstrings / phase notes).

### 1.9 Quizzes

- **41 docs × 5 = 205 questions, all multiple choice** (`div.q#qN` → `button.opt[data-correct]` → `p.why[hidden]`). Options: 4 → 189, 3 → 10, 5 → 6. **Correct per question: 1 → 203, 2 → 2** (two "either is right" questions).
- Reveal: explanation unhides on the first click (all); right answer shown on a wrong click (3 docs); lock after right (3). **No scoring, no persistence anywhere.**
- Plus 16 self-check short-answer items with a reveal button (changple5/20).

### 1.10 Text features

- **Korean:** 27/41 HTML docs contain Hangul (> 20 chars) — mostly Korean product terms inside English prose (changple5, Mijual, glide-ilab); 1 Korean-dominant (`p8-ko`, `<html lang="ko">`, `<nav aria-label="목차">`); the md doc is Korean. 40 docs declare `lang="en"`.
- **Math:** 0 typeset (no KaTeX/MathJax/`<math>`/`<sub>`); only `≈` in prose/code.
- **Footnotes:** 0 (3 regex hits are the word "footnote" in prose). `<sup>` 3.
- **Glossary/definitions:** `div.def` 16 (7 docs), `<dl>` 1 doc (6 terms), 4 primer `<details>`; the md doc ends with "용어 미니 사전".
- **Sources/citations section:** 3 docs (`p8` EN "9. Sources", `p8-ko` "9. 출처", `p9`) + `a.src` 140 inline citations in p9.
- **Links:** 266 external (**0 with `target`**), 298 in-page anchors.

### 1.11 Self-styling (the framed explainer's default look, D36 (9))

0 `@media print`; **18/41 `prefers-color-scheme: dark`** (13 with CSS variables); 0 `@font-face`/webfonts (system-ui stack); 19 docs use CSS variables. Template look: `#fbfbfa` page, 46–48rem column, system-ui, h2 with a blue left border, coloured callout boxes, light-only hex in the callout/pre/quiz rules (skill skeleton sets only `color-scheme: light dark`).

### 1.12 The markdown doc (`base`)

Korean, YAML `---` header (with `version: 2`), 1 h1 + 4 h2 + 11 h3 + glossary h2, 30 table lines, 10 blockquote lines, 2 fences (no info string), **0 raw HTML**, 0 `:::`/`> [!`. `word:word` occurs only inside inline code (`market:ticker`, `KRX:005930`). → renders byte-identically under the native pipeline.

## 2. Evidence and rejected alternatives per decision

The contracts themselves are in `phase.md` → `## Decisions` → *Native chapter format and legacy path*. Below: why, and what was rejected.

### Q1 Syntax — CommonMark + GFM + GFM alerts + typed YAML fences

- **Why:** a fenced block is the one extension every CommonMark parser already parses identically (info string + literal body), so Python (markdown-it-py) and TS (remark via react-markdown 10, already installed) need no new grammar for blocks — only a schema for the body. On GitHub/MCP it degrades to a readable YAML code block. Unknown fence types fall back to a code block (forward compatible). GFM alerts degrade to a blockquote on any renderer and GitHub renders the five standard ones natively. Nesting the corpus needs (markdown inside callouts; items inside a figure row; items inside a quiz) is covered: alerts hold full markdown; fences hold YAML lists whose string fields are markdown.
- **Rejected — generic directives (`:::name`, remark-directive):** needs `micromark-extension-directive` on TS and a non-standard plugin on Python (`mdit-py-plugins` has no compatible text-directive implementation), so "one grammar on both sides" becomes two hand-maintained grammars. Text directives are greedy: `:name` with no label/attributes is a directive (micromark docs: "`:x` and `:x[]` are equivalent"), so prose like `ratio a:b` or `see:docs` becomes a node — the base doc is safe only because its `market:ticker` is inside code. Degrades badly on GitHub (`:::` lines show as text).
- **Rejected — MyST / Markdoc as the format:** good prior art (MyST `{directive}` fences and `(target)=` labels; Markdoc `{% tag %}`), but each needs its own parser on both sides (MyST is Python-first; Markdoc is JS-first), and Markdoc tags render as noise on GitHub. Borrowed: MyST's fenced-directive idea and `{#id}` heading targets.
- **Rejected — MDX:** executes JS/JSX at compile; unsafe by construction for agent-authored content.
- **Rejected — sanitized HTML subset:** brings back per-agent layout and colour (the very thing the operator asked to end: 35/59 SVGs hex-coloured, 41 bespoke stylesheets), and needs a sanitizer on both sides that must agree.
- **Rejected — JSON bodies only:** JSON is accepted (it is YAML 1.2), but multi-line markdown strings in JSON are unwritable for LLMs and humans.
- **Dependency weight:** TS: `yaml` (server component only, not shipped to the client), a tiny own remark plugin (alerts, typed fences, `{#id}`), an XML parser for `svg` (server-side). Python: `markdown-it-py` (+`mdit-py-plugins` for GFM tables/strikethrough), a YAML 1.2 loader (`ruamel.yaml`; PyYAML is YAML 1.1 — `yes`/`no`/`on` become booleans, which would break parity with the TS `yaml` package), `defusedxml`.

### Q2 Block vocabulary — evidence rows

| block | evidence | notes |
|---|---|---|
| callout (alert) | 241 callout, 79 warn, 25 note, 16 def, 13 skip, 6 aside, 4 danger; 4 `<details>` primers | GFM types NOTE/IMPORTANT/WARNING/CAUTION + `SKIP`, `DEFINITION`; Obsidian-style `-` fold marker for the 4 collapsed primers |
| figure (image) | 0 `<img>` today; operator ask ("image available"); S1 assets | raster only |
| figures (row) | ≈ 10 side-by-side rows in 7 docs; operator ask ("multi column") | 2–3 items; items image/diagram/svg/card |
| diagram | 126 figures (§1.3) | 7 kinds |
| svg | 59 inline SVGs; the 11 kinds the vocabulary does not cover (UI mock, grid/matrix, tree, bespoke) | sanitized |
| code (fence) | 652 pre, ≈ 80 titled | `title`; no marks/diffs |
| quiz | 205 MCQ + 16 self-check; operator ask ("more quizzes") | `choice`, `recall`, `cloze` |
| sources | 3 docs + 140 inline citations; S1/D13 hand-off | general mode |
| table (GFM) | 219 tables; alignment covers `td.num` | no new block |
| `summary` header field | 22 `p.lede` + 7 `p.subtitle` | rendered under the title |
| TOC | 41/41 | reader-generated from h2/h3, not authored |

**Not in v1 — no evidence:** math (0 typeset), footnotes (0), tabs (0), steppers/animation (0), copy button (0), video/embeds (0), code line marks (0), diffs (0), line numbers (0), table captions (1 table in a figure), 4-item rows (p8 week grid only), `TIP` alert (no "tip" class), quiz `order`/`match` types, Mermaid. Math is raised as Operator Question 5 because the operator named AI/Finance subjects.

### Q3 Diagram vocabulary — render options

- **Chosen — own components, fixed layouts:** every corpus diagram is hand-placed today and small (2–12 CSS nodes; SVG median 28 elements), so a grid placement (`at: [row, col]`) plus orthogonal edge routing covers flow/state/architecture maps without a graph-layout engine; sequence, stack, timeline and chart are inherently row/column. Styled by tokens, so light/dark/sepia and print come free.
- **Rejected — Mermaid:** large client bundle (lazy-loaded diagram chunks, d3 + layout engines), renders SVG strings that must be injected (`innerHTML`), theming is its own variable system rather than our tokens, and a recurring XSS record even with sanitization: CVE-2025-54880 (architecture `iconText` → d3 `html()`, fixed 11.10.0), CVE-2025-54881 (sequence labels via KaTeX path → `innerHTML`, fixed 11.10.0/10.9.4), CVE-2026-41148 (CSS injection via `classDef`, fixed 11.15.0; `securityLevel: sandbox` suggested as workaround — i.e. an iframe again). General graph layout is not needed by any corpus diagram.
- **Rejected — server-side renderers (Graphviz/D2/Kroki):** a binary dependency or a network service on the box, fixed-colour SVG output that must be post-processed into tokens and still sanitized, and no interaction/theming.

### Q4 SVG — why reject, not strip

Stripping silently changes what the author drew (a removed `<style>` loses all colour; a removed `href` breaks markers) and the agent never learns. A 422 listing each violation (block id, element, attribute) lets the agent fix and republish in the same run — the skill already handles 422. The client re-applies the same allowlist while mapping the parsed tree to React elements, so nothing outside the allowlist can reach the DOM even if a stored file bypassed ingest (e.g. edited on disk, reindexed). Hex is rejected because the native goal is theming; 35/59 legacy SVGs show what free colour produces.

### Q5 Quiz types

- `choice` covers 205/205 corpus questions (the 2 two-correct ones as `answer: [a, c]`, "select all").
- `recall` covers the 16 self-check items, and is the classic spaced-repetition card (prompt → reveal → self-grade) — the best fit for S3.
- `cloze` answers "more question types" with a typed-recall item that grades itself (no self-assessment bias) — also a standard SR card.
- **Rejected:** `truefalse` (is a 2-option `choice`), `order`/`match` (no evidence; harder to grade/schedule), free text graded by a model (spend + non-deterministic).
- Client-side grading: the answer key ships in the page; it is a learning tool, not an exam (the corpus ships `data-correct` in the HTML today).

### Q6 Ids — why these granularities

Headings, typed blocks and quiz items are the stable units an author can keep across a re-explain and a translation; paragraphs are not (they are rewritten). So paragraph-level anchors are `(nearest id + text quote)`, the W3C Web Annotation TextQuoteSelector model. Server-assigns-and-writes-back means a missing id never blocks a publish and every stored file is fully id'd, so the next re-explain reads ids back via `fetch_document`. Positional ids for Korean headings avoid non-ASCII ids.

### Q7 References — why warn on cross-chapter misses

A series is often written in order (chapter 3 links forward to chapter 4 before it exists), so a 422 there would force publish ordering; in-chapter `#id` and `asset:` misses are always author errors and are rejected.

### Q8 Format flag

- `.md` + `format: native` keeps the file readable/renderable on GitHub and by every editor, and reuses the existing `---` parser; reindex derives `format` from the header (it already parses it). A new extension (`.kbmd`) was rejected: unknown to GitHub/editors and it buys nothing the header marker does not.
- Plain `md` → same renderer with typed fences inactive: the base doc (§1.12) renders identically; no old file changes meaning.
- Server today: format by extension only (`reindex.py:60-76`), `DocumentIn.format: Literal["md","html"]` (`main.py:527-530`), **no body size limit anywhere**, no sanitizer; FTS/embeddings read the `markdown` column (html → `extract_html_text`); MCP `fetch_document` returns that column in `markdown` capped at 20,000 chars (`CONTRACT.md:121-139`); additive rule `CONTRACT.md:168-174`.

### Q10 Render model / CSP

`web/next.config.ts` ships **no app CSP** — only `X-Frame-Options: DENY` globally and `sandbox allow-scripts; frame-ancestors 'self'` on the two raw relays. The native format needs no CSP relaxation (no inline script, no eval, no third-party origin; images come from the app origin's BFF relay). Recommended for P30 as defense in depth, not a format requirement: an app CSP with `object-src 'none'; base-uri 'self'; frame-src 'self'; img-src 'self'`.

### Q11 Legacy path — evidence

- Surfaces that frame today (grep of `web/src`): `documents/[id]/document-view.tsx` (used by `documents/[id]/page.tsx` and the pretty URL `[org]/[project]/[slug]/page.tsx`) and `documents/[id]/versions/[v]/page.tsx`; relays `api/documents/[id]/raw/route.ts` and `…/versions/[v]/raw/route.ts` (both inject `injectHeightReporter`); `explainer-frame.tsx` (595 lines, parent half + print pinning), `print-blocks.tsx`, `export-pdf-button.tsx`, `full-width-exit.tsx`. **No console or graph preview frames a document.**
- Links: 266 external links, 0 with `target` (the skill bans `target="_blank"`), and the frame's sandbox has no `allow-popups`/`allow-top-navigation` — so today an external click navigates the frame itself (and is refused by any site sending `X-Frame-Options`). Hence the bridge's link interception + `allow-popups allow-popups-to-escape-sandbox`.
- iOS: `100vh` ignores the dynamic toolbar; `100dvh` follows it; `env(safe-area-inset-*)` needs `viewport-fit=cover` (OpenReplay mobile papercuts); WebKit bug 292603 (2025) — a blank scrollable strip the height of the home-indicator inset that no viewport unit excludes; Apple forum thread 803987 — a 100dvh regression leaving a bottom gap after an iOS update. Historic WebKit iframe bugs: focus inside a tall iframe scrolling the parent (158629, 164512), arrow keys in iframe scrolling the page (187539), momentum scrolling in iframes needing a scrolling wrapper on old iOS (css-tricks). With the frame as the only scroller (no tall iframe, no page scroll) most of that class disappears, but each is a device check.
- Theme inside the frame: 18/41 legacy docs self-theme on `prefers-color-scheme`; whether the iframe element's `color-scheme` steers that is a device check, not a claim.
- No Aside probe was run; no browser claim is made.

### Q12 Print — evidence

`kb-print.css` (round 06) already owns the light palette, chrome dropping, `@page` margins and link-href printing; `explainer-frame.tsx` pins the frame to `PRINT_COLUMN_PX` to avoid truncation (P28.F4), and D39 records the residual Chrome slicing. A full-viewport frame cannot print its document, so legacy print moves to the raw page in its own tab.

### Q13 Deferred fates — reasons

- **D37** (Cloudflare rewriting framed explainers): the raw relay survives (legacy frame + print tab), so its trigger "the next change to the raw relay" fires in P30 → absorbed.
- **D38** (unmeasured 70rem box): no unmeasured state exists when the frame is always the viewport → obsolete.
- **D39** (Chrome print slicing of a framed explainer): the frame no longer prints inline → obsolete.
- **D40** (reporter `measureAt` loop): `explainer-height.ts` is deleted → obsolete.
- **D25** (server-rendered PDF): native prints through the reader's print stylesheet; nothing in P30 needs a downloadable PDF → still deferred, trigger unchanged.

### Q14 `/explain` — evidence

- Plugin copy (P): modes change/topic (+ `here`, `research`, `no-research` flags); fixed shape; HTML only; publishes by `curl` to `POST /api/documents` (`format: "html"`); re-explain = list-and-match + `new_version`. Vendored copy (W, `.claude/skills/explain/`): adds the `general` research mode (§4.2a, `#sources`), CLI self-onboarding, no local fallback. Neither mentions images, Korean or translation. `web/public/SKILL.md` = P (parity-enforced).
- CLI: `knowledge save FILE` only; markdown-only (`.md` rel_path hard-coded, `knowledge.py:353-356`), no `format`, no `new_version`/`rel_path`, no assets.
- Parity: `scripts/skills_parity.py` requires CANONICAL, PORTABLE (`.agents/skills/explain/SKILL.md`) and WEB; a missing file → FAIL, exit 1. `.agents/` was deleted with the workspace's Codex path (`70e8eae`). `docs/current/architecture.md:319` still names the portable copy and says the check is wired into `plugin-ci.yml`; `docs/current/experience.md` still names Codex as a supported audience → Operator Question 3.

## Sources

- [micromark-extension-directive (syntax)](https://github.com/micromark/micromark-extension-directive)
- [CVE-2025-54880 (Mermaid)](https://www.cvelogic.com/cve/CVE-2025-54880), [CVE-2025-54881 (Mermaid)](https://www.cvelogic.com/cve/CVE-2025-54881), [CVE-2026-41148 (Mermaid)](https://www.sentinelone.com/vulnerability-database/cve-2026-41148/)
- [5 mobile web papercuts fixes (dvh, safe areas)](https://blog.openreplay.com/5-mobile-web-papercuts-fixes/), [WebKit bug 292603](https://bugs.webkit.org/show_bug.cgi?id=292603), [Apple forum 803987](https://developer.apple.com/forums/thread/803987)
- [WebKit 158629](https://bugs.webkit.org/show_bug.cgi?id=158629), [WebKit 164512](https://bugs.webkit.org/show_bug.cgi?id=164512), [WebKit 187539](https://bugs.webkit.org/show_bug.cgi?id=187539), [css-tricks iframe momentum scroll](https://css-tricks.com/?p=21524)
