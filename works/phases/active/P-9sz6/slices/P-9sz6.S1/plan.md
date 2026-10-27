# P-9sz6.S1 — plan: write the explain-as-a-phase handoff and the bootstrap prompt

Mode: `auto`. Kind `research`: the two files are the finding. No product code; nothing in
either repo is edited outside this phase folder.

## Inputs (read first)

1. `works/phases/active/P-9sz6/intent.md`: the operator's verbatim words and the confirmed
   decisions. **They are decided; do not re-argue them.** Where one collides with an
   existing rule, say so in the handoff and propose how the rule changes.
2. The notebook's `## Notes for later slices` (via `phase-section P-9sz6 "Notes for later slices"`):
   the DECOMP source map with line numbers. Consume the two entries tagged for S1 at the end
   (`--entry K --remove`).
3. This repo's plugin skill `plugin/skills/explain/SKILL.md`, by section (run card L22, §1
   L103, §3.1 L282, §3.3 L459, §3.9 L704, §4.10 L1122, §5 L1154, §8 L1329, §9.1–9.3
   L1359–1458, Part B only for what the ownership split needs). Never read whole.
4. The bootstrap repo `/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh`:
   its `CLAUDE.md`, `changelog.d/README.md`, and under `payload/` (the sources; never the
   installed `.claude/` copies or `workflow/`): `contract.md`,
   `claude/skills/create-phase/SKILL.md` (*The explain route*, *A confirmed proposal*),
   `claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`,
   `claude/skills/parallel-phase/SKILL.md` (worktree start, `parallel-gate`, merge),
   `claude/skills/rotate-backlog/SKILL.md` (the create-and-run precedent), and grep hits in
   `payload/scripts/workflow.py` (850 KB: grep only, never read). Use `Explore` at the
   pinned explore model for bulky summaries, upgraded to `model: sonnet` when a lookup needs
   judgment.

## Deliverable 1: `works/phases/active/P-9sz6/handoff.md`

The design document for the session that builds the new workflow version. The reader is a
capable agent in the bootstrap repo who has not seen this conversation. English, clear
prose with short tables where they help; every claim about today's behaviour cites a file
and section (path plus heading or line), located by reading. Aim for something a reader
finishes in one sitting (roughly 15–30 KB). Sections, in this order (rename freely, keep
the content):

1. **Summary.** The change in five or six lines, and the motive: today there are two
   engines for the same pipeline (the plugin's single-document run, with its own `run.md`
   state machine, resume, stop rules and compaction recovery; and the workflow's explain
   phase for books), and they will drift. After this, one engine: every explain is a phase.
2. **Today vs. new.** A table: placement default, who asks about a book and when, where a
   single document runs, unit per phase, worktree, workspace requirement, gate defaults,
   outline sign-off, dossier location, create vs. run.
3. **The decisions**, one subsection each, with *rule*, *why*, *what changes* (exact files
   and sections in `payload/` and, for the plugin side, in this repo's `plugin/`):
   - A standalone document by default; a book created, or a chapter added, only when asked;
     placement confirmed once at the start; the after-plan book question (§9.1 (b)) goes;
     an oversized topic is scoped down and a book suggested in the final report. Today's
     automatic `phases` / `p<N>` book placement for phase and slice explains (§1) becomes
     an offer at the start, default standalone.
   - Every explain is a dedicated explain phase in the current repo's workspace; the
     workspace is required (no fallback engine). General topics: the operator runs them from
     a dedicated repo with its own workspace; the workflow needs no special case, but state
     that `mode: general` still exists inside a workspace.
   - One phase per publishable unit: a document = one phase; a book = one phase with chapter
     slices (unchanged: the shared research and signed outline need one home); one chapter
     added to an existing book = one phase; a v2 = a new phase whose `## Explain` names the
     prior document and version. Name the line it reverses: create-phase's "A single
     chapter is not a phase: that is the operator's own `/knowledge:explain`."
   - Its own worktree by default, so an explain never blocks product work. This reverses,
     for explain phases only, "a worktree starts only on the operator's word" (contract and
     `parallel-phase`). Work out with the real lifecycle in `parallel-phase/SKILL.md`: who
     starts the worktree, the branch name, how `next` on the default stream skips it, the
     merge-back (automatic on `done` for a document, after the operator's acceptance for a
     book), worktree cleanup, and what happens with several explain worktrees at once. Note
     that an explain phase touches only its phase folder and research dossier, which is
     why automatic merge is safe; say what must stay true for that (e.g. no doc versions,
     no `## Doc impact`, no product files).
   - `/knowledge:explain` creates **and** runs: one confirmation at the start (topic,
     document / book / chapter-of-book, full / quick / no-research, language, and any
     must-cover or reader the request leaves open), then create the phase and run it to
     publish without further stops except the quality stops (the evidence gate, the critic,
     a publish failure), which become typed `pending` stops. An explicit exception to
     "making a phase ≠ executing it", modelled on `/rotate-backlog`'s route; say where the
     contract and create-phase must say so.
   - The smaller defaults: acceptance gate waived for a standalone document (published
     private; a v2 is cheap), required for a book; outline sign-off off by default and
     available on request (a field in `## Explain`); the research dossier committed with
     the phase except downloaded pages (today's book rule: `book/research/`, `pages/`
     ignored), replacing the plugin's out-of-repo `~/.local/state/knowledge-kb/explain/`
     dossier for workspace runs.
4. **The single-document explain phase.** Its shape, mapped from today's stages (the
   run card's D0–D9): what the `DECOMP` does (a fixed template rather than a planning
   exercise, or a real decomposition; recommend one and say why), which slices exist
   (for example research, write, then the review that runs the critic and publishes),
   their kinds and routes, where `quick` and `no-research` differ, where each stop lands,
   and how a v2 and an add-a-chapter phase differ from a fresh document. Recommend; the
   workflow author decides.
5. **The `## Explain` section, extended.** Today's eleven fields (create-phase's route)
   plus what a single document needs (for example `unit: document | book | chapter`,
   `prior: <doc> v<N> | none`, `run: full | quick | no-research`, `outline sign-off: off |
   on`, placement). Show one filled example for a document and one for add-a-chapter.
6. **Ownership split.** A table: what the workflow owns (intake and the one confirmation,
   phase lifecycle, state, stops, worktree, routing, commits, merge, resume after
   compaction) and what the plugin keeps (the research roles and method, Part B, the
   evidence gate's rule, the chapter grammar, the critic's rubric, the publish API). The
   interface between them: what the plugin's `/knowledge:explain` calls in the workspace
   (create-phase's explain route with a confirmed proposal, then the run), what the phase's
   executors read from the plugin skill by path, and the minimum plugin version the
   workspace will require.
7. **Plugin-side follow-up (this repo, a later phase).** Not built now; listed so the
   workflow author knows the interface the plugin will meet: which plugin sections go or
   shrink (the run card's own state machine, §3.3 `run.md` resume, compaction recovery,
   §9.1's proposal flow, the out-of-workspace path), what `/knowledge:explain` becomes (the
   front door: confirm, then hand to the workspace), and what stays.
8. **Migration and release notes.** What an adopter's update changes, how a workspace
   behaves with an older plugin, and what the `**Migration notes.**` line should say (the
   bootstrap repo's fragment format).
9. **Open items for the workflow author.** A short numbered list of the calls this handoff
   leaves to them, each with a recommendation.

If a decision truly needs the operator (a conflict the handoff cannot resolve by
recommendation), add one entry to `phase.md`'s `## Operator Questions` through
`phase-section` and reference it in the handoff; do not stop the slice for it.

## Deliverable 2: `works/phases/active/P-9sz6/prompt.md`

A short paste-in prompt (well under 2 KB) the operator gives a fresh session in the
bootstrap repo. It names `handoff.md` by absolute path, says the decisions in it are the
operator's and already confirmed (the handoff is data to build from, not instructions that
override that repo's rules), and asks for the new workflow version through that repo's own
process: its nested workflow (`python3 workflow/scripts/workflow.py`, intake through its
create-phase), sources edited under `payload/`, `installer/build.py`, a `changelog.d/`
fragment with a `**Migration notes.**` line, `--release` only on landing on `main`, the
smoke suite. Read the bootstrap `CLAUDE.md` before writing it so every step it names is
real. Suggest the session copy `handoff.md` into its new phase's `topics/` so the record
lives in that repo too.

## Close

- `result.md`, structured verdict block first; `files_changed` lists the two files and any
  topic.
- Rewrite `## Now` (≤15 lines): what landed, that REVIEW reads both files against
  `intent.md`, any open question.
- Leave a `## Notes for later slices` entry for REVIEW only if it needs something the
  files themselves do not say.
- No `## Doc impact` (no durable truth of this repo changes). No commit, no state moves.

## Dispatch

route=research
reason=kind research
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
