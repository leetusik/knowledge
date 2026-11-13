# Intent — P-9sz6

- Captured at: 2026-10-27T11:44:33+09:00
- Origin: operator

## Original Input (verbatim)

> I think it should work like this. how do you think?
> --
> 1. basically explain default is making a document not book. create or update book only asked. but agent can confirm at the begining.
> 2. the whole process of creating knowledge documents is based on workflow's phase. dedicated one. the phase will contain our process.
> 3. one phase per a document.

> 1.the current repo's workspace. the general topics will be asked on dedicated repo. you don't worry about it.
> 2. I think it's good to just default by done in it's own worktree. so that it doesn't block anything.
> 3. workspace required.
> and adopt your smaller defaults too.
> /create-phase. the phase include handoff document and simple prompt for the new version of  workflow.

> and /do-whole-phase the created phase with automode. I approve the creating

## Confirmed Intent (refined + clarified)

Redesign how `/knowledge:explain` works so that every explain runs as its own dedicated
workflow phase, and hand that design to the workflow (the bootstrap workspace repo) as a
new version. This phase produces exactly two files and changes nothing else:

1. **`handoff.md`** — the design, for the session that builds the new workflow version:
   what changes, why, and what differs from today. It carries these decisions:
   - **A document by default.** `/knowledge:explain` makes a standalone document. A book is
     created, or a chapter added to one, only when the operator asks. The agent may confirm
     the placement once, at the beginning; there is no mid-run book question (today's
     after-plan question goes away; a topic too big for one document is scoped down and a
     book is suggested in the final report).
   - **Every explain is a dedicated explain phase**, and the phase contains the whole
     process (research, writing, critic, publish). The phase lives in the **current repo's
     workspace**; general topics are the operator's own matter, run from a dedicated repo.
   - **One phase per publishable unit.** A standalone document is one phase; a book stays
     one phase with chapter slices (its shared research and signed outline need one home);
     adding one chapter to an existing book is one phase; a v2 is a new phase pointing at
     the v1.
   - **Its own worktree by default**, so an explain never blocks product work. This is a
     deliberate change, for explain phases only, to today's "a worktree starts only on the
     operator's word". A finished worktree merges back by itself (an explain touches only
     its phase folder and research); a book's merge waits for the operator's acceptance.
   - **The workspace is required.** No fallback engine outside a workspace.
   - **`/knowledge:explain` creates and runs.** One confirmation at the start (topic,
     document or book, full or quick, language), then it creates the phase and runs it to
     publish without further stops, except the quality stops (the evidence gate, the critic).
     It is an explicit exception to "making a phase ≠ executing it", like `/rotate-backlog`.
   - **Smaller defaults:** the acceptance gate is waived for a standalone document and
     required for a book; outline sign-off is off by default and available on request; the
     research dossier is committed with the phase, except the downloaded pages.
   - **The split of ownership** between the workflow (the phase's lifecycle, state, stops,
     worktree, routing) and the knowledge plugin (the research method, the writing rules,
     publishing).
   - A closing list of what is left for the workflow author to decide.
2. **`prompt.md`** — a short prompt the operator pastes into a session in the bootstrap
   repo to build the new workflow version from `handoff.md`.

Both live in this phase's folder. The plugin's own explain skill (`plugin/skills/explain/`)
is **not** rewritten here; that is a later phase in this repo, after the new workflow
version ships and `/update-workspace` brings it in.

## Clarifications Resolved

- Q: Where do explain phases live? — A: the current repo's workspace; general topics are asked on a dedicated repo, not our concern.
- Q: Does an explain phase block product work? — A: default it to its own worktree so it blocks nothing.
- Q: Is the workspace required? — A: yes.
- Q: The smaller defaults (gate waived for documents and required for books; outline sign-off off by default; dossier committed except downloaded pages)? — A: adopt them.
- Q: Does this phase also rewrite the plugin's explain skill? — A: no (the recommendation, approved with "I approve the creating"); the handoff spells out the plugin/workflow split, the rewrite is a later phase.
- Q: Does `/knowledge:explain` create and also run the phase? — A: yes, one confirmation at the start then run to publish (the recommendation, approved).
- Q: Name, objective, file locations, worktree merge-back, closing open-items list? — A: as proposed (approved).

## Notes

- Today's design says the opposite of point 3 on purpose: create-phase's explain route says
  "A single chapter is not a phase: that is the operator's own `/knowledge:explain`." The
  handoff names that line as reversed.
- Today the single-document explain runs its own state machine (`run.md`, resume, stop
  rules, compaction recovery) inside `plugin/skills/explain/SKILL.md`; the book path already
  runs as an explain phase (`do-whole-phase` references `explain-decomposition.md`,
  `explain-chapter.md`, `explain-review.md`). One engine instead of two is the motive.
- Today phase and slice explains go into a book automatically (§1's `phases` and `p<N>`
  books); under the new default they are standalone documents unless confirmed otherwise.
- The operator asked for the phase to run `do-whole-phase` in auto mode.
