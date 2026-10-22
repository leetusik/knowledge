# P32.S3 — where the research team runs: hosts, the plugin and the book package

## Goal

Judge every host the explain skill ships to against the pipeline S1 and S2 recommend, find out what each
host really allows, and recommend how the pipeline is delivered: where each agent ships, how the skill
dispatches and degrades, the shape of the three skill copies, the plugin version, and the bootstrap package's
shape (files and patches), including the operator's new book-suggestion flow. Quality over efficiency: cost and
time are not the bound; loop safety is. Findings only: this slice writes no product file, and the bootstrap is
read-only.

## Read first

- `works/phases/active/P32/intent.md`, including the two answers recorded during the run: `no-research` stays
  as an operator-only opt-out, and **a book starts from a suggestion** (see question 9 below).
- `phase.md` `## Notes for later slices`: the **P32.S3** entry (questions 1–8, this slice's spec: answer every
  one), **(from P32.S1, for P32.S3)** and **(from P32.S2, for P32.S3)** (the 22 capabilities the pipeline
  assumes). Answer each capability: available as assumed, available differently, or not available (and the
  fallback).
- `topics/research-evidence.md` §4 (the integrated pipeline) and §5; `topics/research-method.md` §3.1, §3.5,
  §3.6 and §4.2. Read other parts only as needed; do not re-research S1's or S2's ground.
- This repo: the three skill copies, `scripts/skills_parity.py`, `scripts/plugin_parity.py`,
  `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `plugin/README.md`,
  `.github/workflows/plugin-ci.yml`; P31's `package/README.md`, `PATCHES.md` and `handoff-explain.md` (the
  package-and-handoff pattern).
- The bootstrap, **read-only**, at `/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh`: as the S3
  entry lists, plus `CHANGELOG.md` v65–v69 and the contract (`payload/` copy of `CLAUDE.md`, the
  create-phase and confirmation rules); P42 at `.claude/worktrees/run-loop/workflow/works/phases/active/P42/`
  (intent, `phase.md`'s Decisions) for the wave protocol.

## Question 9 (added from the operator's answer)

**The book suggestion.** When the operator asks `/knowledge:explain` for a book, or the subject is plainly too
big for one document, the skill proposes the explain phase (a name, an objective, every `## Explain` field:
subject, reader, depth, must-cover, leave-out, trusted sources, project, private, English), creates it through
the workflow's explain route on the operator's yes, and stops; the operator runs it with `/do-whole-phase`.
Outside a workflow workspace it says a book needs one and offers a single document. Find out and recommend:
- how the skill detects a workflow workspace (flat and nested installs) and its version, and what it does when
  the workspace is too old to have the explain route;
- how a plugin skill hands over to the workspace's `create-phase` explain route without breaking the contract
  (create-phase runs only when instructed; `new-phase` only after the operator confirms name and objective):
  whether the operator's yes to the proposal is that confirmation, and whether the skill invokes the route or
  tells the operator the command;
- what "plainly too big for one document" means as a rule the skill can apply, and how it is offered rather
  than imposed;
- which `## Explain` fields the bootstrap's route must gain (must-cover, leave-out, trusted sources) and what
  changes in its `lang` default (English; translations only when named).

## Sources

Open the official docs the S3 entry lists (Claude Code: plugins reference, subagents, skills, permissions and
settings, model selection; Codex: skills, `AGENTS.md`, subagents or parallel tasks; the Agent Skills standard
and its host list). Prefer the docs over blog posts, note each page's date or version, and quote the passages
you rely on (S1 and S2 found `WebFetch` will not reproduce long passages: `curl` and convert locally in this
session's scratchpad when you need verbatim text). Where the docs are silent and the answer matters, **test it
in this Claude Code install** with a throwaway plugin or agent in the scratchpad (never in the repo, never in
`~/.claude/` beyond what a test needs and removes): for example a plugin agent's honored frontmatter, a
per-call model, a prompt-free tool, a skill's supporting file. Say which answers are documented, which are
tested and which are inferred. A source that will not load after two tries goes under **Not opened**.

## What to write

**`works/phases/active/P32/topics/hosts-and-delivery.md`**, in English:

1. **Summary**, about a page: the recommended delivery.
2. **Findings by question 1–7 and 9**, each documented, tested or inferred, with evidence.
3. **The capability table:** each of the 22 assumed capabilities × each host (Claude Code plugin, the portable
   copy's hosts, the single-file landing copy, the bootstrap's book flow): available / different / missing,
   and the fallback or degraded mode the run reports.
4. **Recommendation (question 8):** where each agent ships (researcher, verifier, gap reviewer if separate,
   explain-critic), each agent's frontmatter; how the skill dispatches, in waves, with which model per role, and
   how it degrades and reports the mode; where the dossier lives and how a run resumes; how verbatim page text
   is obtained (or the approximate fallback) and what permissions that needs; the three copies' shape and the
   parity-guard changes; the plugin version; the book suggestion flow; the bootstrap package's files and patches
   (before and after P42 merges).
5. **Hand-offs to DECOMP2:** the build pieces this implies, with the open-design or blast-radius trigger each
   one carries.
6. **Sources** and **Not opened / open questions.**

## Notebook and result

- `phase.md` (one section at a time, `phase-section`):
  - `## Decisions`: one line per settled delivery choice, pointing at the topic file;
  - `## Notes for later slices`: remove the P32.S3 entry and the S1 and S2 notes for S3; add or extend the
    DECOMP2 entry with what it needs from you (keep its existing sketch intact);
  - `## Operator Questions`: append only a question only the operator can answer;
  - `## Now`: rewrite as the hand-off to DECOMP2 (planned at the operator's gate).
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact: none`), then the sources opened and not opened,
  the tests run (and that their throwaway files are removed), and the headline findings.
- Run `python3 scripts/workflow.py validate`. No commit, no state command.

## Verification

- `topics/hosts-and-delivery.md` answers questions 1–9 and covers every assumed capability.
- Every throwaway test file is removed; `~/.claude/` is as it was apart from what Claude Code itself writes.
- The product diff is empty (`git diff --stat -- web/ server/ cli/ plugin/ .agents/ scripts/`); the bootstrap's
  `git status --short` is empty.
- `validate` passes.
