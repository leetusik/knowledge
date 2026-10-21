## The explain route

Explaining one thing once stays the knowledge plugin's one-shot skill: `/knowledge:explain <topic>`, operator-invoked only, writes and publishes one chapter. **A book is a phase, and this route makes one.** A book has several chapters: researched, outlined and signed, each drafted, checked and judged by a fresh-eyes critic, then read whole. "Explain P30 as a book", "write a book on X" and "make an explain phase for Y" all land here. Like every phase, it is created only on the operator's word, never on the agent's own initiative and never because a phase just finished. It follows the same procedure: refine, clarify, **confirm at step 3**, `new-phase`, stop. The plugin's explain skill owns every writing rule: grammar, ids, quiz, sources, publish. The phase orchestrates that skill, and nothing here restates it. The phase needs the skill at **0.5.0 or later**, for its §4.9 `knowledge check`.

1. **Ask the `## Explain` fields at step 2.** Suggest a value for each, with your reason; the operator confirms or overrides:
   - **subject**: a phase id (`P30`), a slice id (`P30.S4`) or a free topic;
   - **mode**: `codebase` (the subject is this repo's code or its work records) or `general` (no repo behind it; the web and the operator's material are the evidence);
   - **book**: its slug and title, placed by the skill's §1 rules. A phase or slice subject gets that phase's own book, `p<N>` titled `P<N>: <phase name>`, as §1 names it for a slice; §1's `phases` book holds one chapter per phase, which is the one-shot's job. Anything else is a named book, of kind `codebase` or `subject`;
   - **lang**: the language the chapters are written in, plus any translations wanted. A translation names the published original's version (§5), so translations follow the accepted book: the review lists them as a deferred job for the orchestrator to file;
   - **reader**: who it is for and what they already know. The outline, every chapter and the critic write for this reader;
   - **depth**: about how many chapters;
   - **project**: the knowledge-base project the book is published into. It **must be private**: an existing private project of the operator's org, or a new name, which is created private on its first publish;
   - **visibility**: always `private`. The operator makes the book public in the reader after accepting it, never through this phase.

   If the plugin is not installed or not set up, say so here, because the phase needs both: `/plugin install knowledge@knowledge`, then `/knowledge:setup` once. Setup writes the org-level key the review publishes with.
2. **Confirm the name and objective at step 3.** An objective that works: *"turn P30 into a book of about six chapters for a developer new to this repo; the operator signs the outline before chapters are written, every chapter is critic-checked, and the book is published private"*.
3. **`new-phase`, fill `intent.md`, STOP.** Append the confirmed fields as their own section:

   ```markdown
   ## Explain

   - subject: P30
   - mode: codebase
   - book: p30 — "P30: native chapters"
   - lang: en (translations: ko, after acceptance)
   - reader: a developer new to this repo who knows Python and HTTP
   - depth: about 6 chapters
   - project: team-notes (private)
   - visibility: private
   ```

   The section is added only to an explain phase, as `## Design Style` is added only to a design phase. The scaffold does not carry the heading, and every reader treats its absence as "not an explain phase". The section is the whole marker: there is no flag and no engine change.

**What that `DECOMP` will cut.** Do not cut it here; `DECOMP` reads the procedure from `do-whole-phase`'s references:
- **`DECOMP`** (`reference/explain-decomposition.md`) researches the subject and writes `book/outline.md`: the reader; the order and prerequisites; and for each chapter its key, title, goal, sources, diagrams and figures, and quiz targets. It then cuts one bare chapter slice per chapter, `--kind implementation --risk low` (the mid tier), or `high` only for a named trigger such as a chapter on a core algorithm or invariant.
- **The outline gate:** the first chapter slice stops `pending` until the operator signs the outline (`accept`). On feedback, `DECOMP` runs again.
- **Each chapter slice** (`reference/explain-chapter.md`) drafts and checks, is judged by `explain-critic`, and is revised once.
- **The review** (`reference/explain-review.md`) reads the whole book, publishes every chapter private, reads the book in the real reader, and returns the book's URL as the walkthrough.

The acceptance gate is `--require`: the operator accepts by reading the book. An explain phase changes no product code and no durable truth, so it leaves no `## Doc impact` notes, owes no docs phase, and appends no `## Regression Checklist` line.
