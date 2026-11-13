## The explain route

Explaining one thing once stays the knowledge plugin's one-shot skill: `/knowledge:explain <topic>`, operator-invoked only, researches, writes and publishes one document. **A book is a phase, and this route makes one.** A book has several chapters: researched as a whole, outlined and signed, then each chapter's research topped up, drafted, checked and judged by a fresh-eyes critic, and the book read whole. "Explain P30 as a book", "write a book on X" and "make an explain phase for Y" all land here, and so does the plugin's own book suggestion (*A confirmed proposal*, below). Like every phase, it is created only on the operator's word, never on the agent's own initiative and never because a phase just finished. It follows the same procedure: refine, clarify, **confirm at step 3**, `new-phase`, stop. The plugin's explain skill owns every research and writing rule: the research run and its dossier, grammar, ids, quiz, sources, publish. The phase orchestrates that skill, and nothing here restates it. The phase needs the plugin at **0.6.0 or later**, for its research agents and its book section (§9).

1. **Ask the `## Explain` fields at step 2.** Suggest a value for each, with your reason; the operator confirms or overrides:
   - **subject**: a phase id (`P30`), a slice id (`P30.S4`) or a free topic;
   - **mode**: `codebase` (the subject is this repo's code or its work records) or `general` (no repo behind it; the web and the operator's material are the evidence). This is the book's mode. It is not the skill's §1 mode (change, topic or general), which the outline sets for each chapter;
   - **book**: its slug and title, placed by the skill's §1 rules. A phase or slice subject gets that phase's own book, `p<N>` titled `P<N>: <phase name>`, as §1 names it for a slice (§1 counts numbered phases; a minted id keeps its form, so `P-7kq2` suggests the book `p-7kq2`, titled `P-7kq2: <phase name>`); §1's `phases` book holds one chapter per phase, which is the one-shot's job. Anything else is a named book, of kind `codebase` or `subject`;
   - **lang**: `en` (translations: none), unless the operator names another language for the chapters. The research is written in English either way. A translation names the published original's version (§5), so translations follow the accepted book: the review lists them as a deferred job for the orchestrator to file;
   - **reader**: who it is for, what they already know, and what they will do with the book. The outline turns that into each chapter's reader tasks, and every chapter and the critic write for this reader;
   - **depth**: about how many chapters;
   - **must-cover**: the points the book must teach, or `none`. The research checks the evidence for each one, for the whole book and for each chapter;
   - **leave-out**: what the book deliberately leaves out, or `none`. The research does not chase it, and the critic does not ask for it;
   - **trusted sources**: the sources the operator wants used first (a spec, a paper, an internal page), or `none`. They are still checked like any source;
   - **project**: the knowledge-base project the book is published into. It **must be private**: an existing private project of the operator's org, or a new name, which is created private on its first publish;
   - **visibility**: always `private`. The operator makes the book public in the reader after accepting it, never through this phase.

   If the plugin is not installed, older than 0.6.0 or not set up, say so here, because the phase needs all three: `/plugin install knowledge@knowledge` (or update it), then `/knowledge:setup` once. Setup writes the org-level key the review publishes with. Say the cost too: a book runs the plugin's full research, tens of research agents before the outline and a top-up and a critic for each chapter, so it costs several one-shot runs, and its web searches can pass the session's cap (the plugin's README, *Explain: permissions and the search cap*).
2. **Confirm the name and objective at step 3.** An objective that works: *"turn P30 into a book of about six chapters for a developer new to this repo; the research runs first, the operator signs the outline before chapters are written, every chapter is critic-checked, and the book is published private"*.
3. **`new-phase`, fill `intent.md`, STOP.** Append the confirmed fields as their own section:

   ```markdown
   ## Explain

   - subject: P30
   - mode: codebase
   - book: p30 — "P30: native chapters"
   - lang: en (translations: none)
   - reader: a developer new to this repo who knows Python and HTTP, and will change the publish path
   - depth: about 6 chapters
   - must-cover: the publish path end to end; why chapters are versioned
   - leave-out: the web reader's styling
   - trusted sources: none
   - project: team-notes (private)
   - visibility: private
   ```

   The section is added only to an explain phase, as `## Design Style` is added only to a design phase. The scaffold does not carry the heading, and every reader treats its absence as "not an explain phase". The section is the whole marker: there is no flag and no engine change.

**A confirmed proposal.** The plugin's `/knowledge:explain` may find that a request is a book (its §9.1). In an interactive session it then shows the operator one proposal: the phase name, the objective and every `## Explain` field, each with its reason. Only on the operator's **literal yes** does it invoke this skill, with the operator's request and that proposal verbatim. That yes is step 3's confirmation of the name, the objective and the fields, so do not ask again:
- check the proposal as step 2 would: all eleven fields present, `visibility: private`, the project private, the subject real. Anything missing or contradictory (a public project, a field the proposal left out) means the proposal is not confirmed: ask about that field in step 2 and confirm at step 3 as usual;
- run `new-phase` with the proposal's name and objective, then fill `intent.md`: under *Original Input (verbatim)* the operator's request, the proposal and their reply, word for word; under *Confirmed Intent* the objective; and the `## Explain` section with one field a line (the proposal joins some fields with ` · `);
- commit and STOP (step 5), and say "Run `/do-whole-phase` to research and write it."

**What that `DECOMP` will cut.** Do not cut it here; `DECOMP` reads the procedure from `do-whole-phase`'s references:
- **`DECOMP`** (`reference/explain-decomposition.md`) leads the whole-book research (the skill's §9.2) into `book/research/` and writes `book/outline.md` from it: the reader; the order and prerequisites; and for each chapter its key, title, goal, reader tasks, sources, questions, claims, declared gaps, expected top-up, diagrams and figures, and quiz targets. It then cuts one bare chapter slice per chapter, `--kind implementation --risk high`: each chapter's executor leads a research run on the high row.
- **The outline gate:** the first chapter slice stops `pending` until the operator signs the outline (`accept`), with `book/research/summary.md` beside it. The signature freezes the book's research indexes. On feedback, `DECOMP` runs again.
- **Each chapter slice** (`reference/explain-chapter.md`) tops up its own research (§9.3), drafts from its reader tasks and checks, is judged by the plugin's `knowledge:explain-critic`, and is revised once.
- **The review** (`reference/explain-review.md`) reads the whole book, publishes every chapter private, reads the book in the real reader, and returns the book's URL as the walkthrough.

The acceptance gate is `--require`: the operator accepts by reading the book. An explain phase changes no product code and no durable truth, so it leaves no `## Doc impact` notes, owes no docs phase, and appends no `## Regression Checklist` line.
