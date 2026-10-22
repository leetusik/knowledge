# Intent — P32

- Captured at: 2026-10-22T22:03:27+09:00
- Origin: operator

## Original Input (verbatim)

> explain how current /knowledge:explain works, for book and one document. and suggest a better approach. workflow is currently evolving. look bootstrap_agentic_workspace local dev dir's backlog. what it is working and stuff.

> I want agents also research well about the topic. very thoroughly.

> think about best quality over efficiency.

> all as your reccomendation. /create-phase and not the cross vendor check. maybe defer it to later.

> and everything is english as default. make only korean version when asked.

Answers during the run (verbatim), to OQ1 (keep `no-research`?) and to "should `/knowledge:explain <subject> book`
create the explain phase and run it to the end?":

> 1. yes, 2. more like suggest phsae for the creating phase, and running it is like normal one.

Confirmation of the restated understanding (verbatim):

> your right

Answer to OQ5 (the skill's size, ≈ 125–145 KB instead of ≈ 85–90 KB), verbatim:

> accept

## Confirmed Intent (refined + clarified)

Explaining a topic should rest on **thorough research by agents**, not on one writer's quick look. Research
becomes its own stage, done by several agents, and every chapter is written from it and checked against it.
This holds for **both** a single document (`/knowledge:explain`) and a book (an explain phase). **Best quality
over efficiency**: cost and time are not the bound; only loop safety is.

What the operator wants the research to be:
- **Planned first.** The questions the stated reader needs answered, split into angles that do not overlap.
- **Wide, then deep, in parallel.** One researcher per angle. For a general subject: foundations, current
  practice, evidence and numbers, history, criticism and failure modes, real cases. For a codebase subject also:
  the code traced in its real order, the history behind it (why), and how others solve the same problem.
- **Held to source quality.** Primary sources (specs, official docs, source code, original papers) over
  secondary ones; a blog only points to a primary source and never supports a claim alone; every page cited is
  opened, and the supporting passage is quoted; publisher, date and version recorded.
- **Kept as a dossier** on disk: a source library and a claim ledger (each claim, its sources, the passage, a
  confidence; a load-bearing claim needs a primary source or two independent ones; disagreements between sources
  are recorded, never quietly settled).
- **Independently verified.** A different model re-opens the sources, checks each claim against its passage,
  and looks for counter-evidence to the main claims.
- **Completed by gap rounds.** "What would an expert expect, and what would this reader still ask?" drives more
  research, until a round adds nothing important, with a cap; a run that hits the cap says so.
- **Loud when it fails.** No web research means the run stops and says so; it never publishes a thinner chapter.

What follows from it:
- A chapter is written **only from the dossier** (plus the code), and every claim in it traces back to a ledger
  entry. The fresh-eyes **critic** checks the chapter against the ledger, and also for **coverage**: anything the
  research plan's questions call for that the chapter leaves out is a finding.
- The **single document** runs the full research team and the critic **by default**; a `quick` word opts out.
- In a **book**, the research for the whole book comes before the outline; each chapter adds a focused top-up to
  the shared source library. The operator sees a research summary (key sources, open disagreements, weak spots)
  together with the outline, at the outline signature.
- **English by default, everywhere**: a single document, every chapter of a book, and the research notes are
  written in English whatever language the request is written in. A Korean version is made **only when the
  operator asks for one**; a book asks for no translation unless the operator names one.
- **A book starts from a suggestion; running it stays normal.** When the operator asks `/knowledge:explain` for a
  book, or the subject is plainly too big for one document, it **proposes** the explain phase: a name, an
  objective and every `## Explain` field filled in (subject, reader, depth, must-cover, leave-out, trusted
  sources, project, private, English). On the operator's yes it creates the phase through the workflow's
  explain route, with the same confirmation as today, and **stops**. The operator runs the phase the normal way
  (`/do-whole-phase`); explain never runs it. Outside a workflow workspace it says a book needs one and offers
  a single document instead.
- **`no-research` stays** as an explicit opt-out only the operator chooses (a repo-only chapter with no "Best
  practices & next steps"), never chosen by the agent; the report labels such a run. A run whose web research
  *fails* still stops loudly.
- The research, verifier and critic agents ship **in the knowledge plugin**, beside the writing rules they serve,
  so the bootstrap workspace stops carrying its own copy of the critic.

Delivered **prepared in this repo**: the plugin's single-document pipeline built and working, and a
ready-to-apply package plus handoff for the bootstrap workspace's explain phase, which the operator relays (as
P31 did). This repo never edits the bootstrap repo.

**Out of scope** (later, separately): a server-side draft state for books and chapters; moving the publish
plumbing into the CLI and shrinking the skill; thinning the bootstrap's explain references once its parallel
slices (P42) have merged; a cross-vendor verifier (deferred, D67).

## Clarifications Resolved

- Q: Should a single document run the full research team by default? — A: yes, as recommended, with a `quick` opt-out.
- Q: Should the operator approve the research plan before research starts (a book)? — A: no extra stop, as recommended. The intake asks what must be covered, what to leave out, and which sources the operator trusts; the research summary rides along at the outline signature.
- Q: Is the research published with the book? — A: as recommended: the dossier stays with the drafts, each chapter publishes its own sources, and a book may end with a "Sources and further reading" chapter.
- Q: Which model verifies? — A: as recommended, a different model from the researcher (Sonnet checks Opus). Not a cross-vendor check: deferred to later (D67).
- Q: Which language? — A: English by default for everything; a Korean version only when asked. (Today's skill defaults to the language the request is written in.)
- Q (OQ1, from P32.S1): Keep `no-research`? — A: yes, as an explicit opt-out only the operator chooses; failed research still stops.
- Q: Should `/knowledge:explain <subject> book` create the explain phase and run it to the end? — A: no; it suggests the phase, creates it on the operator's yes through the normal route, and the operator runs it as a normal phase. Outside a workflow workspace it offers a single document instead.
- Q (OQ2–OQ4, from P32.S3; answered by approving P32.DECOMP2's plan, 2026-10-23): who dispatches a book's research in the bootstrap? — A: a narrow carve-out in `slice-executor.md` (the explain `DECOMP` executor and each chapter executor may dispatch the knowledge plugin's research agents). Is the operator's yes to the book proposal `create-phase`'s confirmation? — A: yes. The WebSearch session cap? — A: the plugin README and the book package tell the operator to raise it (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`); the skill never changes settings and turns a capped search into a loud, resumable stop. The same approval accepted the full rehearsals (higher cost) and the skill growing to about 85–90 KB.
- Q (OQ5, from P32.S4): the skill will be about 125–145 KB, not 85–90 KB — accept, or move Part B out of the single file? — A: "accept": the skill stays one file; Part A cites Part B, never restates it. Moving Part B out belongs with the later skill-shrink work.

## Notes

- Grounding for the research design: Anthropic, "How we built our multi-agent research system" (2025-06-13), <https://www.anthropic.com/engineering/multi-agent-research-system>: each subagent task has an objective, an output format, source and tool guidance, and boundaries; start wide, then narrow; source-quality heuristics; subagents write to files; a separate citation pass.
- Evidence the critic earns its place: P31.S5's one-chapter rehearsal, where the critic found two must-fixes (a wrong quiz key, a diagram in the wrong step order) that `knowledge check` passed.
- The bootstrap context at intake (2026-10-22): workspace v69; P42 (several slices at once inside a phase) in flight on `feat/run-loop`; bootstrap slice executors may spawn only `Explore`, so a book's parallel research there fans out as slices, not subagents; bootstrap D66 notes the explain skill is far over the size re-attached after a compaction.
