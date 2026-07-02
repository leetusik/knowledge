# AGENTS.md

> Equivalent to `CLAUDE.md`. If you change workflow rules, update both.

## Agent Contract

This file is a compact routing contract. Operational detail lives in `scripts/workflow.py`, the Agent Skills under `.claude/skills/` and `.agents/skills/`, and the active slice folder.

Core rule: **Backlog routes. Slice folder explains. Result summarizes. Docs are versioned durable truth.**

## Driving This Workspace

Everything runs through one manager: `python3 scripts/workflow.py <command>`. The same operations are also packaged as Agent Skills so they work natively in either tool:

- **Claude Code:** slash commands like `/create-phase`, `/do-next-slice`, `/do-whole-phase`, `/review-phase` (from `.claude/skills/`), plus the `slice-executor` subagent that implements delegated slices and runs the phase review. `.claude/settings.json` pre-approves the workflow script so it runs without prompts.
- **Codex:** the same skills under `.agents/skills/` via `$skill` or `/skills` — **except `do-whole-phase`, which is Claude Code only** (Codex has no plan mode, so it cannot do genuine per-slice planning across that loop) — plus the `slice-executor` subagent under `.codex/agents/` that implements delegated slices and runs the phase review (on `gpt-5.5`). Codex reads this file as `AGENTS.md`.
- **Any agent / CI:** call `python3 scripts/workflow.py ...` directly. This always works, even where skills are unavailable.

**Orchestrator and executor.** `do-next-slice` and `do-whole-phase` run as an orchestrator/worker split. The **orchestrator** (main thread) plans each slice at the operator's gate (plan mode by default — research, clarify, confirm), writes its **native plan** to `plan.md` (free-form, no template), transitions workflow state, commits, and talks to the operator. Every slice — decomposition, implementation, `fix`, and the phase review — is delegated to the **`slice-executor`** subagent (in Claude Code `.claude/agents/slice-executor.md` on `opus`; in Codex spawned from `.codex/agents/slice-executor.toml` on `gpt-5.5`) at effort `xhigh` — dropping to a `slice-executor-high` variant at effort `high` for low-risk implementation/`fix` slices, while decomposition and review stay `xhigh` and the orchestrator stays `max`; it does the slice's job against `plan.md`, writes `result.md`, appends cross-slice notes to `phase.md`, and returns a structured verdict — it never commits and never transitions slice/phase status (it may run `new-slice` only while executing a decomposition slice, and `doc-new-version` only while executing the review slice). Delegating the execution — including decomposition's slice-creation and the phase review — is what keeps the orchestrator's context lean. By default the orchestrator advances on its own — after each slice it automatically plans the next; the only pause is the operator's approval of each **readied plan** before the executor runs (**plan → operator approves the readied plan → executor, repeated** — never a pause before planning begins). The operator can invoke the skill with `auto` to skip that plan-approval and run plan → executor straight through (the safety halts — `pending`, `needs_operator`, `blocked`, a failed return — still STOP the loop). The orchestrator **trusts a `done` verdict** — it does not re-run the slice's validation — and runs only `validate` (state integrity) before it finishes and commits; behavioral validation is consolidated into the phase review, which validates all slices at once and consolidates the phase's durable-doc versions. A `needs_operator`, `blocked`, failed, or empty return still means the slice is not done.

Workflow command-skills are explicit-invocation only; agents should not fire them autonomously.

**Capture intent first.** When an operator request arrives, before acting: **refine** it into clear language, **clarify** anything ambiguous by asking the operator, and **confirm** your understanding. Only after the operator confirms do you act. This applies wherever operator intent first enters a unit of work — always at the phase level, and at the slice level when an operator note is ambiguous.

**Making a phase ≠ executing it.** When the operator asks you to make, create, suggest, or plan a phase, use the `/create-phase` skill: capture intent, then run `new-phase` — which creates only `P<N>.DECOMP` and `P<N>.REVIEW` and scaffolds the phase-root `intent.md` (linked from `phase.md`) — then fill that `intent.md` with the confirmed intent, and then STOP and report. Do **not** decompose the phase into middle slices, do **not** write slice plans, and do **not** implement any code. Decomposition is the `DECOMP` slice's own job and happens later, when the operator executes the phase (`/do-next-slice`, `/do-whole-phase`) or explicitly tells you to. Creating several phases at once is fine; decomposing or executing any of them is a separate, explicit step.

## Read Order

1. `docs/current/*.md` for the fullstack doc set
2. `docs/index.json`
3. `works/state.json`, `works/backlog.md`, and `works/deferred.md`
4. The active phase folder (including its `intent.md`) and active slice folder only

Do not read every historical slice or old doc version by default. Archived phases and old doc versions are history.

## Canonical State

- Current pointer: `works/state.json`
- Generated dashboards/index: `works/backlog.md`, `works/deferred.md`, `works/index.json`
- Phase state: `works/phases/active/<phase_id>/phase.json`
- Phase notebook: `works/phases/active/<phase_id>/phase.md` — objective plus the accumulating decomposition, findings, cross-slice notes, and a running "Doc impact" list (durable-truth changes the review slice consolidates into doc versions); the shared context across a phase's slices
- Phase intent: `works/phases/active/<phase_id>/intent.md` — scaffolded by `new-phase` and linked from `phase.md`; holds the operator's verbatim original request plus the confirmed refined intent (and resolved clarifications), filled by the `/create-phase` skill. The source of truth for what the operator asked when intent is unclear.
- Slice state: `works/phases/active/<phase_id>/slices/<slice_id>/slice.json`
- Slice context: `plan.md` (the orchestrator's free-form native plan for the slice, written at the slice's turn — no fixed template) and `result.md` (written at slice end), beside `slice.json`
- Deferred state: `works/deferred/open/<DID>/deferred.json`
- Doc index: `docs/index.json`; latest docs: `docs/current/*.md` generated from `docs/versions/<doc>/vNNNN_*.md`

## Hard Rules

- Keep `works/backlog.md` and `works/deferred.md` lean: IDs, names, statuses, pointers, paths only. Detail goes in the folders.
- Keep test files small by default: tests are welcome, but keep each test file or suite terse — minimal high-value cases, no fixture or scaffolding sprawl. Prefer lightweight verification (run the code, `validate`, a small smoke check); grow a suite only when the operator asks or the risk clearly warrants it.
- Never patch old files under `docs/versions/`; create a new version with `doc-new-version`.
- Treat `docs/current/*.md` as generated snapshots; never hand-edit them.
- Durable docs are versioned **once per phase, at the review slice**: implementation, `fix`, and decomposition slices never run `doc-new-version` — when they change durable truth they append a one-line "Doc impact" note to `phase.md`, and the review slice consolidates those into new versions on a passing review.
- New phases start with only `P<N>.DECOMP` and `P<N>.REVIEW`, plus a scaffolded phase-root `intent.md` (linked from `phase.md`). The `DECOMP` slice — planned by the orchestrator, executed by the `slice-executor` — creates the middle slices **only** — bare folders — and records the slice breakdown, findings, and notes in `phase.md`; it does **not** pre-fill the new slices' `plan.md`.
- "Make/create/suggest a phase" = use the `/create-phase` skill (captures intent, then runs `new-phase`, which creates `DECOMP` + `REVIEW` and scaffolds `intent.md`), then stop — do not decompose, write slice plans, or implement until the operator executes the phase or says to. See *Driving This Workspace*.
- Capture operator intent at phase creation: **refine → clarify (ask the operator) → confirm**, then fill the `intent.md` that `new-phase` scaffolds in the phase folder (verbatim original + confirmed refined intent + any resolved clarifications); the engine links it near the top of `phase.md`. Do **not** run `new-phase` until the operator confirms your understanding. The verbatim original is immutable; only the confirmed wording is refined.
- When unsure of the operator's intent, consult the phase's `intent.md` (linked from `phase.md`) — the confirmed source of truth for what was asked. For slice-specific intent, read that slice's `plan.md`.
- Each slice owns exactly two context files: `plan.md` (the orchestrator's free-form native plan for the slice, written at the slice's turn — no fixed template; it incorporates any operator note passed with `do-next-slice`/`do-whole-phase`, while the operator's verbatim intent lives in the phase's `intent.md`, not duplicated per slice) and `result.md` (write when done). A slice never pre-fills another slice's `plan.md`. There are no per-slice brief or review files.
- `phase.md` is the phase notebook: the `DECOMP` slice seeds it (breakdown, findings, notes), and every slice reads it for accumulated context at start and appends durable cross-slice notes back to it when it finishes — so later slices build on what earlier ones learned.
- Every slice — decomposition, implementation, `fix`, and the phase review — is executed by the dispatched `slice-executor` subagent (Claude Code: `.claude/agents/slice-executor.md`; Codex: `.codex/agents/slice-executor.toml`, `gpt-5.5`) at effort `xhigh` — a `slice-executor-high` variant at effort `high` runs low-risk implementation/`fix` slices, while decomposition and review stay `xhigh` — not by the orchestrator directly. The orchestrator owns plan-mode planning, every status transition, and all commits; the executor does the slice's job, writes `result.md`, and appends the slice's `phase.md` notes, but never commits and never transitions slice/phase status (it may run `new-slice` only during a decomposition slice, and `doc-new-version` only during the review slice). `plan.md` is the orchestrator's free-form native plan, written at the slice's turn (just-in-time, no template). The orchestrator trusts a `done` verdict and re-runs only `validate` (state integrity), not the slice's tests; behavioral validation and durable-doc consolidation are done by the phase review — which the executor runs and the orchestrator records via `review-phase`.
- Slice selection is by `order`; `--order` accepts fractional values (e.g. `--order 4.5`) so a slice (or phase) can be inserted between two existing neighbors without renumbering. `depends_on` is advisory and only checked for existence by `validate`.
- Operator co-work (`pending`, shown `[~]`): when a slice or phase needs the operator — to validate something, or to run an action only the operator can perform — set it `pending` (`set-slice-status <id> pending` or `set-phase-status <P> pending`), report exactly what you need, and STOP. A `pending` item halts selection: `next` prints `WAITING ON OPERATOR`, and neither `do-next-slice` nor `do-whole-phase` may start, finish, or advance past it. Work resumes only after the operator approves — they (or you, on their explicit say-so) clear it with `set-slice-status <id> in_progress` (or `set-phase-status <P> in_progress`). `pending` means "waiting on the operator" and is distinct from `blocked` (an impediment or unmet dependency you cannot resolve yourself).
- Deferred jobs never affect next-slice selection until promoted.
- Record the phase review with `review-phase`. A passing review marks a phase `done` but does **not** archive it — the phase stays in `active/`. Archiving is a separate, manual step: `archive-all` once every active phase is done (the last review slice complete), `rotate-backlog` to archive just the done phases while others continue, or `archive-phase <P>` for a single review-passed phase. Archive whole phases only, never individual slices.

## IDs and Status

- Phase IDs: `P1`, `P2`, ... with status `planned | in_progress | in_review | pending | blocked | done`
- Slice IDs: `P1.DECOMP`, `P1.S1`, `P1.F1`, `P1.REVIEW`, ... with status `todo | in_progress | in_review | changes_requested | pending | blocked | done`
- Deferred IDs: `D1`, `D2`, ... with status `deferred | ready | promoted | done | dropped`
- Doc versions: `v0001_bootstrap.md`, `v0002_<slug>.md`, ...
- Phase review verdicts: `pass | changes_requested | blocked`

## Workflow Commands

Use `python3 scripts/workflow.py <command>`:

- `next` — show current/next active slice
- `new-phase --phase P2 --name "..." --objective "..."` — also creates `DECOMP` + `REVIEW` and scaffolds the phase-root `intent.md`; the `/create-phase` skill captures intent and fills it
- `new-slice --phase P1 --slice P1.S1 --name "..."` (`--kind`, `--risk`, `--order`, `--depends-on`)
- `start-slice P1.S1` / `finish-slice P1.S1` / `set-slice-status P1.S1 <status>`
- `set-phase-status P1 <status>`
- `set-slice-status P1.S1 pending` / `set-phase-status P1 pending` — hand off for operator co-work (validation or operator-run action); clear with `... in_progress` after approval
- `review-phase P1 --verdict pass|changes_requested|blocked [--reviewer NAME] [--note "..."]`
- `doc-new-version --doc frontend --summary "..." --source P1.REVIEW` / `docs` / `rebuild-docs` — durable-doc versioning; run at the phase review to consolidate, not per slice
- `deferred` / `defer-job --title "..." --reason "..." --trigger "..." --source P1.S1`
- `promote-deferred D1 --phase P1 --slice P1.S2 --name "..."` / `drop-deferred D1 --reason "..."`
- `archive-all` (batch-archive every active phase once all are done) / `rotate-backlog` (archive just the done phases, leave the rest) / `archive-phase P1` (archive a single review-passed phase)
- `rebuild` / `validate`

## Commit Convention

Use `type(scope): summary`, imperative voice, no trailing period. Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `build`, `perf`, `revert`.

By default, commit after each completed slice — at the end of `do-next-slice`, and at every clean slice boundary inside `do-whole-phase` (Claude Code only). Outside the slice workflow, commit only when asked. **Attribute each commit to the model that did the work:** Claude Code adds its own `Co-Authored-By: Claude …` trailer automatically; in Codex, add `Co-Authored-By: GPT-5.5 <noreply@openai.com>` to every commit, and never carry over another tool's trailer (a Codex commit must not be attributed to Claude/Opus). Do not create branches unless the operator asks — work on the current branch, including `main`. Never push without being asked.
