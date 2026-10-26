---
name: create-phase
description: Capture operator intent (refine → clarify → confirm), then create one or more phases (intent.md + DECOMP/REVIEW only) or route to defer-job. Stops before decomposition.
allowed-tools: Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep
---

# create-phase

Turn an operator request for new work into one or more phases — or a deferred job — with the operator's intent captured first. **This skill creates phases; it never decomposes or implements them** (see *Making a phase ≠ executing it* in the contract — `CLAUDE.md`).

**Who may invoke it.** The operator, or **the agent when instructed** — by an approved plan that says to create a phase, or by a direct operator instruction. **Never on the agent's own initiative**: this is a narrower exception to the contract's "workflow command-skills are explicit-invocation only" than `design-cowork`, which does fire by itself. And invocation is not where the safety lives: **the confirmation gate at step 3 does not move**. Whoever started the intake, `new-phase` runs only after the operator has explicitly confirmed each phase's name and objective. **Invocation is not the gate; confirmation is.** One route is the exception: `/rotate-backlog`'s docs-phase route, where the operator's `/rotate-backlog` invocation *is* the confirmation of the engine-drafted name, objective and `docs-debt` scope (the proposal is still printed). Every other phase waits for the explicit yes.

## Procedure

1. **Refine.** Restate the operator's request in clear language. Read the `docs/current/` **sections** the request actually touches (just in time — never the whole doc set; `python3 scripts/workflow.py docs` lists what exists) and run `python3 scripts/workflow.py next` for the current pointer, if useful. Preserve the operator's exact words — you will record them verbatim later.

2. **Clarify.** Ask the operator about anything ambiguous before acting: scope and boundaries, whether this is one phase or several, a sensible name and objective for each, and whether the work should start now (a phase) or be parked for later (a deferred job). Wait for answers. Do not run any `workflow.py` command yet.

   **If the work touches product visual design, one of those questions is the design style** — read the `design-cowork` skill (its `reference/shape.md`, `## Shape — three styles`) and ask which of the three the work wants. **You suggest one and give the reason; the operator confirms or overrides.** It is never your decision alone and never left implicit:

   - **`build-after`** — one phase, two decomposition passes: `DECOMP` → groundwork → design round(s) → `DECOMP2` → build slices. Choose it when the whole design should land before any of it is built and the build fits in the same phase.
   - **`design-only`** — a *design* phase, then a separate *apply* phase; both keep the single pass. Choose it when the design is big.
   - **`paired`** — one phase, alternating design 1 → apply 1 → design 2 → apply 2; `DECOMP` cuts the pairs as **bare folders** and there is **no `DECOMP2`**. Choose it when the rounds are independent surfaces and each is small enough to apply before the next design starts.

   **`design-only` must be chosen here** — the `DECOMP` slice's executor is forbidden from running `new-phase`, so a phase split decided later cannot be created from inside decomposition. That is the deadline this choice has; the other two styles can still be settled at `DECOMP`. When a phase was created before its visual nature was clear, `DECOMP` asks the style instead and stops **`pending`** for the answer — and if the answer turns out to be `design-only`, the apply phase is created on the main thread through this skill, never from inside a `DECOMP`.

   **Ask the mockup question in the same breath:** *every design job comes as a working canvas you open in the Claude app — clickable Pages with realistic data, and each component in all its states; do you also want an in-product mockup before you sign, or will you sign on the canvas?* The canvas is the default review surface. A mockup is a throwaway route in the project's own frontend, built from the signed-off design with stubbed data, **in addition to** the canvas — it costs a dispatched build and a second `pending` stop. The default is **`on request`**: each job closes on the operator's literal approval when they return to the published canvas, and they can still ask for a mockup in their own words at any time before that. Record the answer as the `Mockup:` line under `## Design Style` (step 4.2). When the style is asked at `DECOMP` instead, this question travels with it.

   **If the request is "consolidate the docs" / "run a docs phase" — or the operator is clearing a `consolidation_owed=` line from `next` — the scope is already written down.** Run `python3 scripts/workflow.py docs-debt` and propose what it prints; see *The docs-phase route* below. It is an ordinary phase through this same procedure, confirmed at step 3 like any other.

   **If the request is to explain something as a book** ("explain P30 as a book", "write a book on X", an explain phase), ask the `## Explain` fields: subject, mode, book, lang (`en` unless the operator names another), reader, depth, must-cover, leave-out, trusted sources, project (private) and visibility (`private`). A request that arrives from `/knowledge:explain` with a proposal the operator accepted with a literal yes is already confirmed: see *A confirmed proposal* in the route. See *The explain route* below. A single chapter is not a phase: that is the operator's own `/knowledge:explain`.

3. **Confirm.** Present your refined understanding back to the operator — for each phase, the proposed **name** and **objective**; for deferred work, the title, reason, and trigger. Get explicit confirmation. Per the contract, do **not** run `new-phase` until the operator confirms. (An explain phase the plugin's `/knowledge:explain` proposed, and the operator accepted with a literal yes, arrives confirmed: *The explain route*, *A confirmed proposal*.)

4. **Route on the operator's choice:**

   **Defer for later** → fold the confirmed intent into the arguments and run:
   ```
   python3 scripts/workflow.py defer-job --title "..." --reason "..." --trigger "..." [--source ...]
   ```
   Leave out `--id`: the engine mints the job's id (`D-m3xa`) and prints it on the `created deferred job` line; never pick a number. This parks the job under `works/deferred/open/<DID>/` and never affects next-slice selection until promoted (the same command the `defer-job` skill wraps). Commit it as step 5 says, report and STOP.

   **Make a phase (or several)** → for each phase, in operator-confirmed order:
   1. Create it, leaving out `--phase`:
      ```
      python3 scripts/workflow.py new-phase --name "..." --objective "..."
      ```
      The engine mints the id (`P-7kq2`: `P-` and a 4-symbol token) and prints it on the `created phase` line; never pick a number, and use that printed id as `P<N>` in every step below. `new-phase` creates only `P<N>.DECOMP` and `P<N>.REVIEW`, scaffolds `intent.md`, and links it near the top of `phase.md`.
   2. Fill `works/phases/active/P<N>/intent.md`:
      - leave **Origin** as `operator`;
      - paste the operator's request **word-for-word** under *Original Input (verbatim)* — do not fix grammar or wording;
      - write the confirmed, refined wording under *Confirmed Intent (refined + clarified)*: what the operator wants (objective, scope, constraints, in their terms), **never workflow mechanics** (which tools, hooks or design loop run). The skills own those and can retire them;
      - record any clarifying Q/A under *Clarifications Resolved*;
      - **for a visual-design phase only**, append a `## Design Style` section naming the confirmed
        style (`build-after` / `design-only` / `paired`) and the one-line reason, then a second line
        `Mockup: requested` or `Mockup: on request` (the default when the operator did not ask for
        one). `DECOMP` reads both. The section is added **only when the phase is visual** — the
        scaffold does not carry the heading, and every reader treats its absence as "not a design
        phase", never as an unanswered question; an absent `Mockup:` line reads as `on request`.
        There is no `Design tool:` line: `drafter` is the only design tool.
      - **for an explain phase only**, append a `## Explain` section with the confirmed fields
        (*The explain route* below shows its shape). `DECOMP` and the review read it; its absence
        reads as "not an explain phase", never as an unanswered question.

      (`new-phase` already filled the phase id and captured-at timestamp.)
   3. Confirm `phase.md` links `intent.md` near the top (the engine added `_Intent: see [intent.md](intent.md)._`).
   4. **Say nothing about worktrees.** The phase runs on this stream, like every phase the
      operator does not ask into a worktree (v43), and creation stamps nothing. The one exception
      is a hint `new-phase` prints when another phase is already `in_progress` here — that this
      phase *could* run in parallel on its own branch. **Relay that hint; never act on it.** Only
      the operator's word starts a worktree, and it is `/do-next-slice` / `/do-whole-phase` that
      act on it later, never `create-phase`. See the `parallel-phase` skill.

5. **Commit, then STOP and report.** Commit what the intake wrote, and only that: the new phase folders (or the deferred job's folder) and the regenerated `works/` files (`state.json`, `index.json`, `backlog.md`, `deferred.md`, `events.jsonl`), never other changes the tree holds. **(nested)** Commit in the nested repo, `git -C workflow …`, with paths relative to it. One commit for the whole intake, in the contract's Commit Convention: `chore(P<N>): create <name> and record the operator's intent` (a deferred job: `chore(D<N>): defer <title>`). Never push. Then list the phases created — IDs, names, and `intent.md` paths — or the deferred job created. Do **not** decompose into middle slices, write any slice's `plan.md`, or implement code. Decomposition is the `DECOMP` slice's own job, later, when the operator executes the phase (`/do-next-slice`, `/do-whole-phase`, `/do-whole-phases`) or explicitly tells you to.

## The docs-phase route

Durable docs are versioned **in a docs phase the operator creates** — never per slice, and no longer at the review, which only *verifies* each phase's `## Doc impact` list and lets the engine stamp that phase's `consolidation` debt. So "consolidate the docs", "clear the doc debt", and a `consolidation_owed=` line in `next` all land here. **`/rotate-backlog` is the default entry point for this route, and there the invocation is the confirmation**: it checks the debt first, drafts the docs phase's name and objective from `docs-debt`, prints the proposal, runs the printed `new-phase` line as is (no pause, no narrowing), fills `intent.md` as below, then runs the docs phase through `do-whole-phase` and archives the done phases at the end. A later `/rotate-backlog` replaces a docs phase that has not started (no docs slice past `ready`) with one new docs phase covering all the debt, the debt that arose since included; one that has started finishes first, and the new debt waits for it. Steps 2–4 below still hold, with the operator's confirmation at step 3 for a docs phase made by hand through `/create-phase`; the same refine → clarify → **confirm at step 3** → `new-phase` → stop applies there. What the route adds is that the scope is already recorded — do not re-derive it by hand:

1. **Read the debt** (read-only): `python3 scripts/workflow.py docs-debt`. It prints every owing phase with its `## Doc impact` notes, the docs those notes touch, and the command that pays each phase.
2. **Propose that as the scope** in step 2 — the phases and the docs it names. The operator may narrow it; a phase left out simply keeps owing and stays in `active/`.
3. **Confirm the name and objective at step 3, unchanged.** An objective that works: *"consolidate the `## Doc impact` notes from P12–P16 into new versions of architecture, operations and qa"* — name the phases, because they are what gets cleared at the end.
4. **`new-phase`, fill `intent.md`, STOP.** Create it with `--consolidates <the confirmed phases>` (for example `--consolidates P12,P-7kq2`: any id form works) — that flag is what marks it a docs phase, so `rotate-backlog` and `docs-debt` see those phases' debt as being paid and never propose a second docs phase for them; it refuses, writing nothing, for an id that is not an active phase owing consolidation, and a phase left out of the list keeps owing. A docs phase runs on the default stream, like every phase (v43) — nothing to pass, nothing to pin. It has to: `doc-new-version`, `docs-consolidated` and `parallel-consolidated` only run there, so **never ask for a worktree on a docs phase**, whatever hint `new-phase` or `next` prints. Record the `docs-debt` scope in `intent.md`; decomposition is the docs phase's own `DECOMP` slice, later.

**What that `DECOMP` will cut** (write it into `intent.md`; do not cut it here): **one slice per doc**, `--kind docs` — `doc-new-version` is per doc and one doc usually collects notes from several phases, so per-doc keeps each doc to a single new version. Risk by the normal rule. Each slice runs, per note it covers:

```sh
python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source <P>.REVIEW
# edit only the returned edit_path, then:
python3 scripts/workflow.py rebuild-docs
```

and the phase records the payment **for each phase it covered**: `python3 scripts/workflow.py docs-consolidated <P>` (a merged parallel phase: `parallel-consolidated <P>`), which is also what unblocks archiving those phases. All of it on the **default stream**: a doc version copies the doc's whole body and writes the one shared `docs/index.json`, so two branches versioning at once would fork it.

Two things that keep the route from feeding itself: a docs phase leaves **no `## Doc impact` notes of its own** (it pays other phases' notes; it creates no new durable truth), so its own review stamps no new debt — and it changes no operator-visible surface, so its acceptance gate is normally `--waive`d at the `DECOMP` boundary.

## The QA-sweep route

The phase review re-runs only the `## Regression Checklist` lines inside its phase's boundary (`python3 scripts/workflow.py phase-scope <P>`: the phase's own surfaces plus every earlier line a changed file feeds), so the **whole** cumulative list is re-run only when the operator asks for it — "run the full regression sweep", "QA sweep", "re-run the checklist" all land here. Nothing is special-cased: same refine → clarify → **confirm at step 3** → `new-phase` → stop. An objective that works: *"re-run every `## Regression Checklist` line in the manifest runtime and report what no longer holds"*.

**What that `DECOMP` will cut** (write it into `intent.md`; do not cut it here): `--kind qa --risk low` slices (the mid row — a sweep re-runs written lines, it designs nothing), one per checklist block (one for the whole list when it is short), each re-running its lines with the instrument and viewports `## Operator Runtime` names and recording the result line by line in `result.md`. Failures become findings the phase's review turns into fix slices or deferred jobs; a line whose precondition no longer exists is reported for the review to strike or rewrite in its `## Regression Checklist` write. A QA phase changes no product code, leaves no `## Doc impact` notes of its own, appends no new checklist lines, and changes no operator-visible surface — so its acceptance gate is normally `--waive`d at the `DECOMP` boundary.

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
