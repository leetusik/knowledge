# P-9sz6.S1 — result

## Verdict

- status: done
- route: research
- model: opus
- effort: xhigh
- summary: Wrote handoff.md, the design for the bootstrap-repo session. It covers every Confirmed Intent decision (rule, why, and the exact payload/ and plugin/ places that change), the single-document phase shape, the extended `## Explain` with two filled examples, the ownership split and interface, the plugin follow-up, migration notes, and 10 open items with recommendations. Also wrote prompt.md, a 1.6 KB paste-in prompt that drives that repo's own process. Reading the real worktree machinery surfaced three collisions with the auto-merge default, each with a recommendation.
- files_changed: works/phases/active/P-9sz6/handoff.md (new), works/phases/active/P-9sz6/prompt.md (new), works/phases/active/P-9sz6/slices/P-9sz6.S1/result.md (new), works/phases/active/P-9sz6/phase.md (through phase-section: Notes for later slices, Now)
- validation: `python3 scripts/workflow.py validate` passed (pre-existing warnings only: P26.S5 kind, the P28–P32 consolidation debt, stale and oversized docs). `git status` in both repos: nothing changed outside this phase folder. The bootstrap repo is clean.
- deviations: (1) handoff.md is about 37 KB in bytes, above the plan's aim of 15–30 KB. The three engine collisions and the worktree lifecycle needed line-level citations; much of the excess is multi-byte punctuation. (2) No topic file was added; the handoff is self-contained in the phase folder.
- doc_impact: none (no durable truth of this repo changes)

## What was read

- Phase: intent.md, the notebook through phase-section, topics/breakdown.md, phase.json.
- Plugin (`plugin/skills/explain/SKILL.md`, 0.6.0), by section: the run card L22–101, §1 L103–178, §2 L180–268, §3.1 L282–365, §3.3 L459–508, §3.9–§3.10 L704–777, §4.10 L1122–1152, §5 L1154–1272, §6–§9.3 L1310–1458, B5's dispatch and inputs L1791–1850, and B9 L2253–2268. Never read whole.
- Bootstrap repo: `CLAUDE.md`, `changelog.d/README.md`, CHANGELOG v81–v83, and in `payload/`:
  - `contract.md` (by grep);
  - `create-phase/SKILL.md` (whole);
  - `do-whole-phase/reference/explain-{decomposition,chapter,review}.md` (whole);
  - `parallel-phase/SKILL.md` (whole);
  - `rotate-backlog/SKILL.md` (whole);
  - `do-whole-phase/SKILL.md` L26–27 and `reference/worktree.md`;
  - `do-next-slice` SKILL L38 and `reference/decomposition.md` L7;
  - `review-phase` L108–114;
  - `slice-executor.md`'s explain lines;
  - `gitattributes`.
- `payload/scripts/workflow.py` was grepped only: explain_phase, SLICE_STOP_KINDS, BUSY_PHASE_STATUSES, parallel_gate's busy loop, the consolidation stamp in parallel_start and at the review pass, teardown's ignored-file handling, and `--host-branch`.
- Also: `installer/main.py` (grep), `installer/payloads/doc_bodies/operations.md` L43–59, `README.en.md` L524–538, and `tests/retrofit_smoke.sh`'s explain assertions.
- This repo: `server/documents_api.py` L415, the anonymous document route a document's privacy probe can use.

No Explore dispatch was needed. Each read was a named range or a grep, so delegating would have cost more than reading inline.

## Findings beyond the plan's list

All are in handoff.md §3.4 and §9.

1. **`parallel-gate` refuses while `main` is busy** (`workflow.py` L6922–6927, `BUSY_PHASE_STATUSES` L469). An explain's merge on `done` would almost never fire during product work. Recommendation: a quiet-point exemption the engine checks, granted when the branch's diff touches only its own phase folder and the `works/` files.
2. **`parallel-start` stamps `consolidation: "pending"`** (L5764, L6081), and the review stamps nothing when there are no notes (L5388–5400). Every worktree explain phase would therefore sit unarchivable until someone runs `parallel-consolidated`. Recommendation: a passing review with no notes flips the debt to `done`, for every worktree phase.
3. **A nested install requires `--host-branch`**, an operator-confirmed name, for a phase that makes no host commit. Recommendation: a detached host worktree for explain phases.
4. **Things to verify while building:**
   - Manual-mode permission rules live in the untracked `.claude/settings.local.json`, which an at-root worktree does not carry.
   - `parallel-start` refuses on a parallel stream, so an explain asked from inside a phase worktree needs a rule. Recommendation: refuse.
   - Nested teardown refuses ignored `pages/` unless given `--discard-ignored`.
5. **A chapter added to a book in a public project** would publish publicly at once. That breaks create-phase L118's "always private … never through this phase". Recommendation: keep the rule and refuse at the confirmation, offering two options.
6. **The Korean `README.md` carries no explain section.** Only `README.en.md` needs its prose updated.

## Readings of the intent (not the operator's literal words)

- **The book keeps its signed outline.** The intent defaults outline sign-off to off, but names "signed outline" as the reason a book is one phase. Read as: off for documents and chapters, fixed on for books.
- **A chapter's acceptance gate is waived, like a document's.** The intent names only documents (waived) and books (required).
- **A document's review reads the result in the reader when an agent account can, else falls back to an API read-back**, to avoid adding a stop that is not a quality stop.

These three are left as a REVIEW note so the walkthrough puts them to the operator as decisions. No `## Operator Questions` entry was needed: each conflict resolves by a recommendation that keeps an existing rule.

## Notebook entries written (phase.md)

- Notes for later slices: removed the two DECOMP→S1 entries (consumed). Appended one S1→REVIEW entry (the three readings above).
- Now: rewritten, covering what landed, the three collisions, REVIEW next, and no operator questions.
