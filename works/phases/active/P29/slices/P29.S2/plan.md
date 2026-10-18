# P29.S2 — research: the native chapter format and the legacy path

## Goal

Settle, as data contracts, three things:
- the format a chapter is written in, and how the reader renders it;
- the full-screen path for every existing HTML explainer;
- how `/explain` produces chapters.

Derive the block vocabulary from what the existing explainers actually draw and from the operator's
explicit asks. Invent nothing beyond those. **Findings only: no product code.** What you settle lands in
`phase.md`, where `P29.S3`, `P29.DECOMP2`, the design handoffs, P30's `DECOMP` and P30's bootstrap
handoff note will read it.

Read these first:
- the scope: `phase.md` → *Slice breakdown* → **S2**;
- the operator's words in `intent.md`: the native-format bullet, the legacy-path bullet and
  Clarifications;
- `## Decisions` → *Book and chapter model*, which holds S1's contracts that you build on;
- the notes tagged for S2 under `## Notes for later slices`.

**The direction is fixed:**
- a native format, rendered by the reader itself with no iframe;
- a full-screen legacy path for the HTML explainers.

A real blocker in that direction returns `needs_operator` with the exact question. Never switch approach
silently (`intent.md`).

## 1. Survey the corpus first: this is the evidence

1. Export the library from `origin/main` into your scratch directory: `git fetch origin`, then
   `git archive origin/main docs | tar -x -C <scratch>/corpus`. Never pull or merge into local `main`, and
   never write the corpus into the working tree.
2. Survey all 41 HTML explainers (their current versions) plus the one markdown document. Archived
   versions under `docs/.versions/` are optional context.
3. Measure every item below. For each kind give counts (overall and per document) and one or two cited
   examples (the path plus a short excerpt or a description).
   - **Structure:** headings; how many documents follow `/explain`'s fixed shape (Background / Intuition /
     Code / Best practices / Quiz); tables of contents.
   - **Diagrams:**
     - inline `<svg>`, and boxes and arrows drawn with CSS;
     - each diagram classified by kind: pipeline/flow, layered stack, sequence, tree/hierarchy, state,
       timeline, comparison/before-after, chart/plot, grid/matrix, annotated code, other;
     - each diagram's size (its node count), its color use (hard-coded hex, or `currentColor`/variables)
       and any Korean labels.
   - **Widgets:**
     - every `<script>`, classified by what it does: quiz scoring, reveal/toggle, tabs,
       stepper/animation, copy button, theme, other;
     - which of these interactions a declarative block could absorb.
   - **Figures and multi-column layouts:** `<figure>` and captions; grid or flex rows of 2–3 figures or
     cards; `<img>` (S1 found 0).
   - **Tables:** the count and the typical size.
   - **Code:**
     - the number of code blocks and their languages;
     - how each is highlighted: hand-written spans, classes, or none;
     - titles or filenames, line marks, diffs.
   - **Callouts:** note, tip, warning and aside boxes, counted by type.
   - **Quizzes:** per document, the question types present, how answers and explanations are revealed,
     and how scoring works.
   - **Text features:** Korean (documents with Hangul, mixed KO/EN), math, footnotes,
     glossaries/definitions, collapsible `<details>`, sources/citations sections, external links.
   - **Self-styling:** `@media print`, `prefers-color-scheme`, fonts, and whatever makes up the framed
     explainer's default look (D36 (9)).
4. Use a throwaway extraction script for the counts. For classification that needs eyes, run `Explore`
   passes over representative documents (point `Explore` at the scratch corpus; it reads files on disk).
5. Put the full survey tables in `result.md`.

## 2. Questions to settle

Give each one a recommended answer, the evidence behind it, and the alternatives you rejected, each with
its reason. Where only the operator can decide, recommend a default and add the question to
`## Operator Questions`.

1. **Syntax.** The starting candidate is Markdown plus a small set of block types.
   - **Compare at least:**
     - generic directives (`:::name{#id}`, remark-directive);
     - typed fenced blocks with YAML/JSON bodies (```` ```quiz ````, ```` ```diagram ````), with GFM
       alerts (`> [!NOTE]`) for callouts;
     - MyST and Markdoc, as prior art;
     - MDX, an expected rejection because it executes code;
     - a sanitized HTML subset, also an expected rejection because it brings back per-agent layout.
   - **Criteria:**
     - **Safe by construction:** no code execution and no raw HTML.
     - **One grammar on both sides.** The Python server parses it for:
       - ingest validation;
       - FTS and embedding text;
       - MCP `fetch_document` text.

       The TypeScript reader parses it too. Today that is react-markdown 10 + remark-gfm, with no
       sanitizer, highlighter or directive plugin installed. Both sides must parse it the same way, and a
       shared set of conformance fixtures becomes P30's core test.
     - **LLM-writability**, and how it degrades as plain text (MCP, GitHub).
     - **Nesting** where the corpus needs it.
     - **A fallback for unknown blocks** (forward compatibility).
     - **Dependency weight.**
2. **Block vocabulary.**
   - Each block gets:
     - its purpose;
     - its fields;
     - its required accessibility fields (alt text, caption, text alternative);
     - its evidence row from §1.
   - The candidates are figure, figure row (2–3 items that stack on a phone), callout, diagram, code,
     image and quiz.
   - Add a block only with evidence. For example, add tabs, steps or reveal if the widgets show them.
   - A useful block with no evidence goes on a "not in v1 — no evidence" list. Math for the AI and Finance
     subjects the operator named is one example. If you judge such a block needed for the first version,
     raise it as an operator question with a default.
3. **Diagram vocabulary.**
   - Settle which kinds the corpus actually draws, and how each is written and rendered.
   - Diagrams are styled by design-system tokens, so they follow light/dark/sepia.
   - Weigh three ways to render them:
     - a small vocabulary rendered by the reader's own components;
     - Mermaid (its size, theming, XSS history and `securityLevel`);
     - server-side renderers.
   - For each kind, name the layout it needs: fixed rows and columns, or a general graph layout engine.
4. **Custom SVG.** The sanitize contract:
   - The element and attribute allowlist.
   - The forbidden list: `script`, `foreignObject`, event handlers, `<style>`, external `href`,
     `<image>`, and `<use>` of an external target.
   - A color rule that lets it theme: `currentColor`, token variables or semantic classes, instead of
     hard-coded hex.
   - Size limits.
   - Whether the server rejects at ingest (a 422 listing each violation) or strips.
   - What the client does again at render, as defense in depth. Never `dangerouslySetInnerHTML` of
     unsanitized input.
5. **Quiz types.** Each type's fields: the prompt, the options or answer, the answer key and an
   explanation. Also settle:
   - client-side grading;
   - what a saved result records, as a payload shape S3 builds the review on.

   The corpus types come first. "More question types" is the operator's own ask (`intent.md`). Justify each
   added type by that ask and by how well it fits S3's spaced repetition (for example, a recall/flashcard or
   a cloze type). Keep the set small.
6. **Stable block ids.**
   - **Granularity:** which blocks carry ids (sections or headings, paragraphs, figures, quizzes, each quiz
     item), and what S3's highlights and notes need. One example is a block id plus a text-quote selector
     within the block.
   - **Who assigns them:** the author (the skill), derivation from content, or the server at ingest
     (written into the stored file).
   - **How they survive:**
     - a re-explain, which publishes the next version;
     - a translation, where the KO and EN variants share ids.

     S1 fixed that anchors map by block id, never by offset.
   - **What the server checks:** uniqueness and syntax, and what happens to a block with no id.
7. **References.**
   - **Images:** by the publish-time `name`. S1 fixed that the version header maps each name to
     `<sha256>.<ext>`.
   - **Cross-chapter links:** book + chapter `key` + an optional `lang`, never a `documents.id`.
   - Also links to loose documents, and in-chapter anchors to block ids.
   - **Resolution:** how the reader resolves each reference to S1's URLs, and what a broken reference does
     at ingest and at render.
8. **Format flag and the `md` question.**
   - **Detection:** the native file's extension and/or header marker, so a reindex derives `format=native`
     from the file alone (S1).
   - **Today's plain `md`:** whether those documents render as native. Check the one `base` md document,
     and the parse risk: for example, a directive syntax could turn `word:word` in an old document into a
     node.
   - **Ingest:** what the server stores and validates.
   - **Search and MCP:** the FTS and embedding text and the MCP `fetch_document` text of a native chapter,
     additive-only (`mcp-server/CONTRACT.md`).
   - **Limits:** size limits.
9. **KO/EN authoring.**
   - How a variant is written and published. S1 fixed that each variant is its own document with its own
     version chain, plus `translated_from`.
   - What must match across variants: block ids and quiz items.
   - The Korean typography the reader must meet: line breaking and fonts.
10. **The sanitize-and-render model.**
    - The end-to-end path from the stored file to the reader's React tree: no iframe for native, and no raw
      HTML on the app origin.
    - Read the app's CSP in `web/next.config.ts` and state what the format needs from it.
    - Code highlighting: recommend an approach (render-time, with themeable tokens). Leave the final
      library pick to P30 unless the design needs it.
11. **The legacy path.**
    - **Every surface that frames an HTML explainer today:** the document view, the version view, the
      pretty URL, and any console or graph preview. Each one moves to the legacy path, so P30 can retire
      `web/src/lib/explainer-height.ts` and its parent half everywhere.
    - **The frame** is full-screen and is the only scroller. Settle:
      - the sandbox flags (today `allow-scripts`, no `allow-same-origin`) and the raw relay's headers;
      - viewport sizing on phones: `dvh`, the iOS URL bar, safe areas;
      - keyboard scrolling and focus;
      - in-page `#anchor` links and outbound links;
      - how the reader chrome coexists with the frame: prev/next, the chapter list, the KO/EN switch,
        versions. Theme and text size cannot reach inside.
    - **The injection policy.** Nothing measures content height (`intent.md`). Decide whether anything
      else is injected (a scroll-position reporter for resume, link interception) or nothing at all. Decide
      what resume means for a legacy chapter. S3 builds on this.
    - **Evidence and device checks.** Give each claim its evidence: the code, WebKit/MDN docs or bug
      reports. Also name the device check P30's sweep must run in the operator runtime: iPhone and iPad in
      Safari and Chrome, and Mac Chrome.
    - **An optional throwaway probe page** in a real browser is allowed:
      - only through Aside, `aside repl --account u1`, invoked as `.claude/skills/design-cowork/SKILL.md`
        describes;
      - never the operator's profile;
      - name the instrument in `result.md` if you use one.
12. **Print.**
    - How a native chapter prints. That is the reader's print stylesheet: chrome hidden, light colors,
      figure rows, diagrams, quizzes.
    - How a legacy chapter prints. A page that holds a full-viewport frame prints only what the frame
      shows; one answer is a print control that opens the raw document on its own.
    - Read `web/src/app/kb-print.css`.
13. **Deferred fates and the D36 inputs.**
    - For each of D37, D38, D39, D40 and D25 (`works/deferred/open/<D>/brief.md`), record whether it is
      obsolete, absorbed by P30's path, or still needed, with the reason.
    - Answer D36's items where they bear on the reader (`works/deferred/open/D36/brief.md`):
      - (4) round 06's English-only copy: state the reader's copy-language rule. DECOMP2 also reads this.
      - (7) the Safari, print and DPR judgments.
      - (9) the framed explainer's default look.
14. **`/explain`.**
    - **The modes.** How each mode produces a native chapter:
      - the codebase modes: topic, phase and slice. Today the review's pointer is
        `explain: not written — run /explain for this phase`.
      - the general-learning mode, which has no repo. `.claude/skills/explain/SKILL.md` is the vendored
        copy that has this mode, and it writes `#sources`.
    - **The page shape.** What replaces today's fixed shape in native blocks, including the Sources block
      that S1's D13 decision hands to you.
    - **Publishing.**
      - What the publish sends: S1's `book`, `chapter`, `lang`, `translated_from` and `assets`.
      - How the agent makes and attaches images: screenshots and rendered charts.
      - How a translation is produced.
      - How a re-explain carries block ids forward.
    - **The CLI.** What the `knowledge` CLI (`cli/`) needs in order to publish a chapter with images.
    - **The shipped copies and their parity.**
      - `plugin/skills/explain/SKILL.md` (canonical) is identical to `web/public/SKILL.md`.
      - **Verified 2026-10-18:** `python3 scripts/skills_parity.py` FAILS with
        `explain skill copy missing: .agents/skills/explain/SKILL.md`.
      - The portable copy was deleted by the workspace update
        `70e8eae chore(workspace): remove retired Codex path and low executor tier` (2026-09-21), together
        with the workspace's own `.agents/` skills.
      - Settle whether the portable copy is still a shipped product file. Either P30 restores it and keeps
        it safe from workspace updates, or P30 retires it and updates the parity script.
      - Make that an operator question with your recommended default. P30's standing gate runs this
        script.
    - **The bootstrap copy.** This repo never edits `.claude/skills/explain/`; the bootstrap ships it.
      Record what it must change as notes for P30's handoff note.

## Method

- **What to read.**
  - The reader code in the S2 notes.
  - `server/documents.py`: header and format handling, and what ingest validates today.
  - `server/documents_api.py` and `server/main.py`, only where the native format touches ingest and
    serving.
  - `mcp-server/CONTRACT.md` and `web/next.config.ts`.
  - The skill copies.
  - `web/design/rounds/06-document-views/`, as read-only design memory.
- **The docs are STALE.** `docs/current` is stale for api, backend, experience, frontend, product, qa and
  security. Check it against P28's `## Doc impact` (P28 `phase.md` L608–838) and against the code. **The
  code wins.**
- **`Explore`.** Use it for bulky reads, at the `explore_model` / `explore_effort` below. Upgrade it to
  `sonnet` for a classification or lookup that needs judgment.
- **Web search.** Use it where a question needs outside evidence: prior-art formats, iOS iframe scrolling,
  SVG sanitizer allowlists, Mermaid's security model. Cite what you use.
- **Scratch.** Probes and the corpus export go in your session scratchpad under `p29-s2/`
  (`/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/f0010d83-1939-47da-8f62-5ffe37557260/scratchpad/p29-s2/`).
  Delete it before you finish.
- **Don't change anything else.** Change nothing in the product, and no file outside this slice's folder
  and `phase.md`.

## Output

- **`phase.md` `## Decisions`.**
  - Add the subsection `### Native chapter format and legacy path — data contracts (P29.S2; evidence in
    slices/P29.S2/result.md)` after S1's.
  - Write one entry per settled question, phrased as a contract a design handoff can quote. Cover:
    - the syntax;
    - each block and its fields;
    - the diagram vocabulary and the SVG rules;
    - the quiz types and the result payload;
    - the ids and the references;
    - the format flag and the render model;
    - the legacy path and print;
    - the deferred fates;
    - `/explain`.
  - Tag each entry `(P29.S2)`. Keep the entries as contracts; evidence goes in `result.md`.
- **`phase.md` `## Operator Questions`.** Only decisions that are truly the operator's, each with your
  recommended default. The portable-copy parity question is one of them.
- **`phase.md` `## Notes for later slices`.**
  - **For S3:**
    - the block ids and their granularity;
    - the quiz types and the saved-result payload;
    - what a legacy chapter offers for resume and anchors.
  - **For DECOMP2:**
    - the block inventory each design job must draw, with every state (for example, a quiz that is
      unanswered, correct, wrong or revealed, and a figure row that is stacked);
    - the legacy reader's chrome;
    - print;
    - the D36 inputs.
  - Tag each note `**(from P29.S2, for P29.Sx)**`.
  - Remove the notes tagged only for S2 once you consume them. Re-tag the shared "for P29.S2, P29.S3"
    notes as "for P29.S3".
- **`phase.md` `## Now`.** Rewrite it.
- **`result.md`.**
  - The verdict block comes first.
  - Then the survey tables, the evidence for each decision, the rejected alternatives and the commands
    you ran.
- **Keep `phase.md` under its budget.** Rewrite sections, never just append to them, and never drop a
  decision or a question.

## Validation

- `python3 scripts/workflow.py validate` passes.
- `git status --porcelain` shows only this slice's folder, `phase.md` and the engine's generated files.
- The scratch directory is deleted.

## Return

The structured verdict, mirrored at the head of `result.md`:
- `status`, `tier`, `model`, `effort`;
- `summary`, `files_changed`, `validation`, `deviations`;
- `doc_impact: none`, `operator_need`.

Never commit and never move workflow state.

## Dispatch

route=research
reason=kind research
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
