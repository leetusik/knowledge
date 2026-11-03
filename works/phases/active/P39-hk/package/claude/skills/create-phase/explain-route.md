## The explain route

**Every explain is its own explain phase**, in this repo's workspace (nested or at root), one phase per publishable unit: a **document** (the default: one standalone document), a **book** (several chapters drawn from the phases that built the subject, outlined and signed, each chapter written, checked by a critic on a second model, and the book read whole), a **chapter** added to an existing book, or a v2 of a document or chapter (`prior:`). A book or a chapter is made only when the operator asks, in their own words or at the confirmation; the unit is settled **once, at the start**, never mid-run. `/knowledge:explain <topic>` lands here (the plugin calls this skill when instructed), and so do "explain P30", "write a book on X", "add a chapter on Y to book Z" and "make an explain phase for Y". Like every phase, it is created only on the operator's word, never on the agent's own initiative and never because a phase just finished.

**An explain tells what this repository's code does, from what its phases recorded.** One writer reads the code at one commit and the records of the phases that built the subject, traces every sentence to them, and a critic on a second model checks the draft against them before the private publish. There is no research run: no web search, no research agent, nothing from outside the code and the records. A subject with no code behind it is declined; a subject the code has but no phase covers is offered *The research route* (below) first. The plugin's explain skill owns every evidence and writing rule (the evidence and its record, grammar, ids, quiz, sources, publish). The phase orchestrates that skill, and nothing here restates it. The phase needs the plugin at **0.10.0 or later**, whose §3 *Gather the evidence* is the evidence model these steps follow. Plugin sections are cited by number **and** heading, so a renumbering cannot silently point a phase at the wrong rule.

**Refuse before anything is written:**
- **From inside a phase worktree** (`python3 scripts/workflow.py next` prints a `stream=` line): say "start an explain from the main checkout" and stop, writing nothing; a phase created here would land on another phase's branch.
- **A subject with no code behind it** (not this repository's code, or no git repository: the plugin's §1 *Resolve the topic, the mode and the placement*): decline plainly, in one or two sentences, and write nothing. Explain is codebase-only; the knowledge base keeps the subject books and documents already published.
- **A book, or a chapter of one, in a public project:** `visibility: private` is absolute. Refuse at the confirmation and offer the two ways on: make the project private for the run, or write a standalone private document instead.
- **The plugin missing, older than 0.10.0, or not set up:** say so and stop, writing nothing. The operator updates it (`/plugin marketplace update knowledge`, then `knowledge@knowledge` from the `/plugin` panel; a first install is `/plugin install knowledge@knowledge`) and runs `/knowledge:setup` once, which writes the org-level key the review publishes with. Read the version from the plugin registry, as `do-whole-phase`'s `reference/explain-decomposition.md` does.

1. **Gather the `## Explain` fields** (step 2). A request from the plugin's front door arrives with them (*A confirmed proposal*, below). Any other request (a direct "make an explain phase for X") is drafted here the way the front door drafts it, from the installed skill and never from memory: its §1 *Resolve the topic, the mode and the placement* (the unit and its placement, *The title rule*, *The reader*, *The shape*, *The phases that cover the subject*) and its *The front door, step by step*, steps 4–6 (a live explain phase on the same subject, the knowledge base and the prior, the cheap look and the coverage, the proposal). The sixteen fields, in this order:
   - **unit**: `document` (default), `book` or `chapter`. The literal `unit` line is what the plugin's front door tests for, so it is always written;
   - **subject**: a phase id (`P30`), a slice id (`P30.S4`) or a topic of this repository's code;
   - **phases**: the phases that cover the subject, by §1's *The phases that cover the subject* (ids, comma-separated, at most 6 named), or `none` when no phase covers it and the operator chose to explain from the code alone. The writer reads their records, the code, and nothing else;
   - **book**: `none` for a document. For a book, its slug and title, kind `codebase`, by §1's rules: a phase or slice subject gets that phase's own book, slug `p<N>` (a tailed or v73 id keeps its form: `P46-k2` suggests `p46-k2`), its title set by §1's title rule; anything else is a named book. For a chapter, the existing book it joins;
   - **chapter**: `none`, or for a chapter `<key> — "<title>" · position <n>`;
   - **prior**: `none`, or the version a v2 supersedes: `<rel_path> v<N>` for a document, `<book>/<key> v<N>` for a chapter. Fill it when a lookup finds one;
   - **lang**: `en` (translations: none), unless the operator names another language. The dossier is written in English either way. A translation names the published original's version (§5 *Publish via the KB document API*), so translations follow the accepted unit: the review lists them as a deferred job for the orchestrator to file;
   - **reader**: a concrete guess at who it is for, by §1's *The reader*: who they are, what they already know, what they are new to, and what they will do with it; never a stock reader. Every chapter and the critic write for this reader (a chapter: the book's reader, as its outline states);
   - **depth**: `one document`, `one chapter`, or for a book about how many chapters. A topic too big for one document is scoped down to what one carries, and the closing report suggests a book for the rest;
   - **must-cover**: the points it must teach, or `none`. The writer looks for the evidence of each one; one the code and the records cannot carry is stated as a gap;
   - **leave-out**: what it deliberately leaves out, or `none`. The writer does not read for it, and the critic does not ask for it;
   - **trusted sources**: the files or phases the operator wants read first, or `none`. Only the code and the records count: a page, or anything else outside them, is set aside, and the report says so;
   - **project**: the knowledge-base project it is published into. It **must be private**: an existing private project of the operator's org, or a new name, created private on its first publish;
   - **visibility**: always `private`. The operator makes it public in the reader after accepting it, never through this phase;
   - **outline sign-off**: `off` (default) or `on`. A book is `on`, fixed;
   - **worktree**: `yes` (default: the phase runs in its own worktree, so it never blocks product work) or `no`.

   There is **no `run:` line and no `mode:` line**: one run, and every subject is this repository's code. **The required set, per unit:** every unit writes all sixteen lines. A document has `book: none`, `chapter: none`, `depth: one document`; a book has `chapter: none`, `outline sign-off: on`; a chapter names an existing `book`, its `chapter` and `depth: one chapter`. An older section is read, never rewritten here: one with no `unit` line is a book from before the line existed (its eleven fields: subject, mode, book, lang, reader, depth, must-cover, leave-out, trusted sources, project, visibility), and one with `run:` and `mode:` lines and no `phases:` line is from before this route; `do-whole-phase`'s `reference/explain-decomposition.md` says how their `DECOMP` reads them.

   **When no phase covers the subject,** the confirmation says so and offers two replies, as the front door's step 7 words them: "research first" (*The research route*, below: a research phase that records findings; the explain follows only when the operator asks again) or "yes" (explain from the code alone, `phases: none`).

   Say the cost here: **one writer and one critic on a second model**, plus the explain phase around it (a book: one of each per chapter, after one reading of the whole subject). The writer reads the skill by path, so manual permission mode needs the rules §3.2 *Permissions, and the payload builder* prints, with its lines for such a writer; auto mode needs none.

2. **Show the one confirmation** (step 3), in the shape of the plugin's front-door step 7, drawn from the installed skill: the plain summary, the reader, the sections with their Quiz and Next steps lines and the other shapes, the phases that built it, the cost line, the phase name and objective, the `## Explain` block, and the `Why:` line. One literal yes signs the phase's name (`Explain: <subject>`), its objective, every field, the sections, the worktree and the run in `auto`; a changed line or a picked shape is folded in and the whole confirmation shown again. Its head and tail, for orientation (step 7 holds the rest and a worked example):

   ```
   Explain — confirm once; then it runs to publish.
   In plain words: <2–4 plain sentences: what it explains, for whom, what they can do afterwards>
   Reader: <the reader> (change it if I guessed wrong)
   Sections (your yes signs them; change any line): 1. <Heading> — <the reader's question it answers> …
   Built by: <the covering phases> | no phase covers this code — see below
   Cost: one writer and one critic on a second model, plus the explain phase around it
   Phase: Explain: <subject> — <the objective>
   ## Explain … the sixteen lines …
   Why: <field — reason>; …
   Reply yes, or change any line.
   ```

   A book's confirmation lists its chapters in place of the sections, and its stops line adds the outline and acceptance gates.
3. **On the yes, create and run**, in this order:
   1. `python3 scripts/workflow.py new-phase --name "Explain: <subject>" --objective "..."`;
   2. fill `intent.md` (step 4.2): under *Original Input (verbatim)* the operator's request, the confirmation as last shown and their reply, word for word (the writer takes the signed sections from there: §3.1 *D0: the brief, and the prior version*, *The signed sections*); under *Confirmed Intent* the objective; then the `## Explain` section, one field a line:

      ```markdown
      ## Explain

      - unit: document
      - subject: how a re-explain publishes the next version of the same document
      - phases: P30, P33-n3
      - book: none
      - chapter: none
      - prior: none
      - lang: en (translations: none)
      - reader: you, who built the publish path in P30; new to how a v2 keeps its ids; you will change the 409 handling
      - depth: one document
      - must-cover: the 409 → new-version path; why heading and quiz ids survive a version
      - leave-out: the web reader's styling
      - trusted sources: none
      - project: knowledge (private)
      - visibility: private
      - outline sign-off: off
      - worktree: yes
      ```

      The section is added only to an explain phase, as `## Design Style` is added only to a design phase. The scaffold does not carry the heading, and every reader treats its absence as "not an explain phase". The section is the whole marker: there is no flag;
   3. the intake commit (step 5);
   4. unless `worktree: no`, `python3 scripts/workflow.py parallel-start <P>` (nested: with no `--host-branch`, which cuts a detached host worktree, since an explain makes no host commit), then `EnterWorktree` into the path it prints (nested: the host worktree). The `parallel-phase` skill carries the rest of the lifecycle, the merge back included;
   5. `python3 scripts/workflow.py next`, then run the phase per the `do-whole-phase` skill in **`auto`**: the confirmation is the explicit `auto` the contract's decomposition carve-out requires, so `DECOMP` plans inline, as `/rotate-backlog`'s invocation is for its docs phase.

   It runs to publish. Its only stops are the quality stops, each a typed `pending`: a **critic stop** (the critic failed twice, or a must-fix left neither fixed nor disputed) takes `--stop-kind decision`; a **publish failure** (a refusal twice, a rejected key, a public project) takes `operator-action`; a denied call (`FAILED: permissions`, §3.2 *Permissions, and the payload builder*) returns `needs_operator`, as the references say; and a book adds its outline gate and its acceptance gate.

**A confirmed proposal.** The plugin's `/knowledge:explain` shows the operator its own proposal (its front-door step 7): the plain summary, the reader, the sections, the phases that built the subject, the unit, the phase name, the objective and every `## Explain` field, each with its reason. Only on the operator's **literal yes** does it invoke this skill, with the operator's request, that proposal as last shown and their reply, verbatim. That yes is the one confirmation, so do not ask again:
- check the proposal as step 1 would: the sixteen-line set for its unit present, `visibility: private`, the project private, the subject real and in this repository's code, every `phases:` id a phase of this workspace (active or archived), and the stream check. Anything missing or contradictory (a public project, a field the proposal left out) means the proposal is not confirmed: ask about that field and show the one confirmation as usual. Never ask for a field the set does not have (`run:`, `mode:`);
- run step 3 as written, the request, the proposal and the reply under *Original Input (verbatim)* (the proposal joins some fields with ` · `: write one a line);
- **with no `unit` line**, or with `run:` and `mode:` lines and no `phases:` line, the proposal came from a plugin older than 0.10.0: create nothing, and refuse as step 1's last refusal says (update the plugin, then ask again).

**A "research first" reply** (the front door's, or this route's own confirmation's) is not an explain: it arrives with a `Research: <subject>` block and goes to *The research route*, below. No `## Explain` section and no explain phase is created for it.

**What that `DECOMP` will cut.** Do not cut it here; `DECOMP` reads the procedure from `do-whole-phase`'s references:
- **a book:** `DECOMP` (`reference/explain-decomposition.md`) reads the whole subject (§9.2 *The evidence for a book (an explain phase)*): the code at one commit and every covering phase's records, into `book/research/evidence.md`. It then writes `book/outline.md` from it: the reader; `## Drawn from` (each chapter and the phases it draws from) and `## Gaps`; the order and prerequisites; and for each chapter its key, title, goal, sections, reader tasks, entries, gaps and open items, diagrams and figures, and quiz targets. It cuts one bare chapter slice per chapter, `--kind implementation --risk high`. **The outline gate:** the first chapter slice stops `pending` until the operator signs the outline (`accept`), which signs every chapter's sections at once and freezes the book's `brief.md` and `evidence.md`; on feedback `DECOMP` runs again. **Each chapter slice** (`reference/explain-chapter.md`) reads its phases closer into its own `evidence-ch<k>.md` and drafts (§9.3 *A chapter: its evidence, then the draft*), is judged once by the plugin's `knowledge:explain-critic` on a second model, and is revised once;
- **a document or a chapter:** the same shape with one chapter. `DECOMP` writes the brief, reads the evidence and writes the reader's path (§3 *Gather the evidence*, through §3.10 *D6: the final outline, the reader's path*) into the phase's `doc/` dossier, and always cuts exactly one write slice `S1`; with `outline sign-off: on`, `S1` waits for the operator's `accept` first;
- **the review** (`reference/explain-review.md`) publishes private, proves it private, reads it in the real reader, and returns the URL as the walkthrough.

**The acceptance gate, per unit:** a book's is `--require` (the operator accepts by reading the book); a document's and a chapter's are waived (published private; a v2 is cheap). An explain phase changes no product code and no durable truth, so it leaves no `## Doc impact` notes, owes no docs phase, and appends no `## Regression Checklist` line.
