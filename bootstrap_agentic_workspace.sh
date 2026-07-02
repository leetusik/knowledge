#!/bin/sh
set -eu

usage() {
  cat <<'USAGE'
Usage:
  bootstrap_agentic_workspace.sh [TARGET_DIR] [options]

Options:
  --name NAME                 Optional project name override
  --summary TEXT              Optional one-sentence summary override
  --phase-name NAME           Optional initial P1 phase name override
  --phase-objective TEXT      Optional initial P1 phase objective override
  --force-empty-ok            Allow bootstrapping into a repo with extra non-managed files
  --into-existing             Non-destructively retrofit into an existing repo (see docs/retrofit-guide.md)
  --update                    Update an already-installed workspace's machinery to this version
  --dry-run                   With --update, preview the change-list without writing anything
  -h, --help                  Show this help

TARGET_DIR defaults to the current directory.

This bootstrap creates a compact, scalable agentic workspace tuned for BOTH
Claude Code and OpenAI Codex:

- AGENTS.md / CLAUDE.md are equivalent compact routing contracts (the reliable
  cross-tool fallback both agents read).
- Operations ship as Agent Skills in BOTH .claude/skills/ (Claude Code: /slash +
  auto-invocation) and .agents/skills/ (Codex: $skill / implicit), so the same
  command works natively in either tool.
- works/backlog.md and works/deferred.md are generated dashboards, never the
  task database. Canonical state is JSON in the phase/slice/deferred folders.
- Each slice owns slice.json plus plan.md (the orchestrator's free-form native plan, written at the slice's turn) and result.md (written at slice end).
- Deferred jobs are one folder per job and never affect next-slice selection
  until promoted.
- Phase review is recorded (review-phase) and gates archiving.
- Docs are versioned fullstack categories: agents create
  docs/versions/<doc>/vNNNN_*.md and regenerate docs/current/*.md.

Requires python3 (>= 3.8). Safe to re-run only into a fresh workspace.
USAGE
}

die() { printf 'Error: %s\n' "$1" >&2; exit 1; }
need_value() { [ $# -ge 2 ] || die "$1 requires a value"; [ -n "$2" ] || die "$1 requires a non-empty value"; }

target_dir=
project_name=
project_summary=
phase_name=
phase_objective=
force_empty_ok=0
into_existing=0
update=0
dry_run=0

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --name) need_value "$1" "${2-}"; project_name=$2; shift 2 ;;
    --name=*) project_name=${1#--name=}; [ -n "$project_name" ] || die "--name requires a non-empty value"; shift ;;
    --summary) need_value "$1" "${2-}"; project_summary=$2; shift 2 ;;
    --summary=*) project_summary=${1#--summary=}; [ -n "$project_summary" ] || die "--summary requires a non-empty value"; shift ;;
    --phase-name) need_value "$1" "${2-}"; phase_name=$2; shift 2 ;;
    --phase-name=*) phase_name=${1#--phase-name=}; [ -n "$phase_name" ] || die "--phase-name requires a non-empty value"; shift ;;
    --phase-objective) need_value "$1" "${2-}"; phase_objective=$2; shift 2 ;;
    --phase-objective=*) phase_objective=${1#--phase-objective=}; [ -n "$phase_objective" ] || die "--phase-objective requires a non-empty value"; shift ;;
    --force-empty-ok) force_empty_ok=1; shift ;;
    --into-existing) into_existing=1; shift ;;
    --update) update=1; shift ;;
    --dry-run) dry_run=1; shift ;;
    --) shift; while [ $# -gt 0 ]; do [ -z "$target_dir" ] || die "only one TARGET_DIR may be provided"; target_dir=$1; shift; done ;;
    -*) die "unknown option $1" ;;
    *) [ -z "$target_dir" ] || die "only one TARGET_DIR may be provided"; target_dir=$1; shift ;;
  esac
done

[ -n "$target_dir" ] || target_dir=.
[ -e "$target_dir" ] && [ ! -d "$target_dir" ] && die "target exists but is not a directory: $target_dir"
[ "$update" = 1 ] && [ "$into_existing" = 1 ] && die "--update and --into-existing are mutually exclusive"
[ "$dry_run" = 1 ] && [ "$update" = 0 ] && die "--dry-run is only valid with --update"

# Fixed non-interactive defaults. The first real task should replace this bootstrap intake context.
[ -n "$project_name" ] || project_name="New Project"
[ -n "$project_summary" ] || project_summary="Fresh agentic workspace. Replace this summary during the first real task."
[ -n "$phase_name" ] || phase_name="Bootstrap Intake"
[ -n "$phase_objective" ] || phase_objective="Capture the first real task, create versioned durable docs, and replace this placeholder phase with concrete work."

command -v python3 >/dev/null 2>&1 || die "python3 is required for this bootstrap"

export TARGET_DIR="$target_dir"
export PROJECT_NAME="$project_name"
export PROJECT_SUMMARY="$project_summary"
export PHASE_NAME="$phase_name"
export PHASE_OBJECTIVE="$phase_objective"
export FORCE_EMPTY_OK="$force_empty_ok"
export INTO_EXISTING="$into_existing"
export UPDATE="$update"
export DRY_RUN="$dry_run"

python3 - <<'PY'
from __future__ import annotations

import difflib
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

if sys.version_info < (3, 8):
    sys.exit(f"Error: python3 >= 3.8 required, found {sys.version.split()[0]}")

TARGET = Path(os.environ["TARGET_DIR"]).expanduser()
PROJECT_NAME = os.environ["PROJECT_NAME"]
PROJECT_SUMMARY = os.environ["PROJECT_SUMMARY"]
PHASE_NAME = os.environ["PHASE_NAME"]
PHASE_OBJECTIVE = os.environ["PHASE_OBJECTIVE"]
FORCE_EMPTY_OK = os.environ.get("FORCE_EMPTY_OK") == "1"
# Retrofit: non-destructively add the workspace to an EXISTING repo. Gated
# strictly behind --into-existing; the fresh-install path is unchanged.
RETROFIT = os.environ.get("INTO_EXISTING") == "1"
INSTALL_DOCS = True  # recomputed in the guards for retrofit (skip if target already has docs/)
RETROFIT_SUMMARY = {"created": [], "skipped": [], "merged": []}
# Update: refresh an already-installed workspace's machinery to THIS version,
# preserving the downstream's own work (everything under works/ except templates)
# and all of docs/. Gated behind --update; mutually exclusive with --into-existing.
# --dry-run previews the change-list and writes nothing.
UPDATE = os.environ.get("UPDATE") == "1"
DRY_RUN = os.environ.get("DRY_RUN") == "1"
UPDATE_DOCS = True  # recomputed in the guards for update (skip docs rebuild if no docs subsystem)
UPDATE_SUMMARY = {"updated": [], "added": [], "merged": [], "preserved": [], "unchanged": [], "stale": []}
UPSTREAM_URL = "https://github.com/leetusik/bootstrap_agentic_workspace.sh"
ROOT = TARGET.resolve()

DOC_TYPES = ["product", "experience", "architecture", "frontend", "backend", "data", "api", "operations", "security", "qa", "decisions"]

# Common, harmless files a brand-new repo often already contains. Their presence
# does NOT count as "non-empty" for the safety guard (the GitHub "create repo
# with README" case should just work).
EMPTY_OK_ALLOWLIST = {
    ".git", ".github", ".gitignore", ".gitattributes", ".gitkeep",
    ".editorconfig", ".vscode", ".idea", ".DS_Store",
    "README.md", "README", "README.rst", "README.txt",
    "LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING", "NOTICE",
}

# Each operation ships as one Agent Skill, mirrored into Claude Code (.claude/skills)
# and Codex (.agents/skills). Fields:
#   name, desc          : skill identity (description drives implicit matching)
#   tools               : Claude Code allowed-tools line (tight scope = fewer prompts)
#   body                : the procedure (shared by both tools)
# All workflow command-skills are explicit-invocation only (operator actions),
# so neither agent fires them on a whim: disable-model-invocation (Claude) and
# allow_implicit_invocation=false (Codex).
COMMAND_SKILLS = [
    {
        "name": "create-phase",
        "desc": "Capture operator intent (refine → clarify → confirm), then create one or more phases (intent.md + DECOMP/REVIEW only) or route to defer-job. Stops before decomposition.",
        "tools": "Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep",
        "body": """Turn an operator request for new work into one or more phases — or a deferred job — with the operator's intent captured first. Explicit invocation only. **This skill creates phases; it never decomposes or implements them** (see *Making a phase ≠ executing it* in the contract — `AGENTS.md`/`CLAUDE.md`).

## Procedure

1. **Refine.** Restate the operator's request in clear language. Read `docs/current/*.md` and `works/backlog.md` for context if useful. Preserve the operator's exact words — you will record them verbatim later.

2. **Clarify.** Ask the operator about anything ambiguous before acting: scope and boundaries, whether this is one phase or several, a sensible name and objective for each, and whether the work should start now (a phase) or be parked for later (a deferred job). Wait for answers. Do not run any `workflow.py` command yet.

3. **Confirm.** Present your refined understanding back to the operator — for each phase, the proposed **name** and **objective**; for deferred work, the title, reason, and trigger. Get explicit confirmation. Per the contract, do **not** run `new-phase` until the operator confirms.

4. **Route on the operator's choice:**

   **Defer for later** → fold the confirmed intent into the arguments and run:
   ```
   python3 scripts/workflow.py defer-job --title "..." --reason "..." --trigger "..." [--source ...]
   ```
   This parks the job under `works/deferred/open/<DID>/` and never affects next-slice selection until promoted (the same command the `defer-job` skill wraps). Report and STOP.

   **Make a phase (or several)** → for each phase, in operator-confirmed order:
   1. Create it:
      ```
      python3 scripts/workflow.py new-phase --phase P<N> --name "..." --objective "..."
      ```
      `new-phase` creates only `P<N>.DECOMP` and `P<N>.REVIEW`, scaffolds `intent.md`, and links it near the top of `phase.md`.
   2. Fill `works/phases/active/P<N>/intent.md`:
      - leave **Origin** as `operator`;
      - paste the operator's request **word-for-word** under *Original Input (verbatim)* — do not fix grammar or wording;
      - write the confirmed, refined wording under *Confirmed Intent (refined + clarified)*;
      - record any clarifying Q/A under *Clarifications Resolved*.

      (`new-phase` already filled the phase id and captured-at timestamp.)
   3. Confirm `phase.md` links `intent.md` near the top (the engine added `_Intent: see [intent.md](intent.md)._`).

5. **STOP and report.** List the phases created — IDs, names, and `intent.md` paths — or the deferred job created. Do **not** decompose into middle slices, write any slice's `plan.md`, or implement code. Decomposition is the `DECOMP` slice's own job, later, when the operator executes the phase (`/do-next-slice`, `/do-whole-phase`) or explicitly tells you to.
""",
    },
    {
        "name": "do-next-slice",
        "desc": "Continue the active phase by completing exactly one slice, then stop.",
        "tools": "Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep, Bash, Agent, EnterPlanMode, ExitPlanMode",
        "body": """Run `python3 scripts/workflow.py next`, then read `AGENTS.md` (or `CLAUDE.md`), `docs/current/*.md` as needed, `docs/index.json`, `works/state.json`, `works/backlog.md`, the selected slice folder, and the phase's `phase.md` (the phase notebook — accumulated decomposition, findings, and cross-slice notes). If you are ever unsure of the operator's intent, consult the phase's `intent.md` (linked from `phase.md`) — the confirmed record of what was asked.

You are the ORCHESTRATOR (main thread): you plan each slice, verify, commit, move workflow state, and talk to the operator. The execution of every slice — decomposition, implementation, `fix`, and the phase **review** — is delegated to the `slice-executor` subagent (you do not do that slice's work yourself). One slice, then stop.

If `next` prints `WAITING ON OPERATOR` (the current slice or phase is `pending`, shown `[~]`), STOP: the work is waiting on operator co-work. Report what is needed and do not start, finish, or advance it. Resume only after the operator approves and clears the `pending` status back to `in_progress`.

Work exactly one slice:

1. If the selected slice is `todo`, run `python3 scripts/workflow.py start-slice <slice_id>`.
2. Plan the slice at the operator's gate before implementing. In Claude Code, **call the `EnterPlanMode` tool** to enter plan mode, do read-only research (surface any clarifying questions), then **call `ExitPlanMode`** to present the readied plan for the operator's approval. (In Codex, present the readied plan inline and wait for approval.) This is the slice-level intent step (refine → clarify → confirm when an operator note is ambiguous; consult `intent.md` when unsure). After approval (the harness exits plan mode), write the **operator-approved plan verbatim** to this slice's own `plan.md` — persist the exact plan the operator just approved, in full, not a paraphrase or summary; free-form, no template; pull relevant context from `phase.md` and let the plan incorporate any operator note (the operator's verbatim intent lives in the phase's `intent.md`). Never pre-fill another slice's `plan.md`. If the operator invoked the skill with `auto` (e.g. `/do-next-slice auto`; "run unattended" also counts), do **not** enter plan mode — plan inline, write `plan.md`, and dispatch the executor right away. `auto` waives only the approval gate, not the `pending` / `needs_operator` / `blocked` safety stops.
3. Dispatch the executor to implement the slice. **Pick the variant by the slice's `kind` + `risk` (in `slice.json`):** a low-risk implementation or `fix` slice (`risk == low`) → dispatch **`slice-executor-high`** (effort `high`); decomposition, review, or any slice whose risk is not `low` (medium / high / unset) → dispatch **`slice-executor`** (effort `xhigh`). Give the chosen subagent the slice id and folder path; it reads `plan.md`, `phase.md`, `slice.json`, the docs, and the code itself, implements, runs the slice's validation, writes `result.md`, appends durable cross-slice notes to `phase.md`, and returns a structured verdict (`status` = `done` | `needs_operator` | `blocked`, plus `summary`, `files_changed`, `validation`, `deviations`, `doc_impact`; a review slice also returns `doc_versions` and a `review_verdict`). Do not implement the slice yourself. (In Codex, **spawn the matching subagent** — `.codex/agents/slice-executor.toml`, or `.codex/agents/slice-executor-high.toml` for a low-risk slice by the same rule — the same way; it does the slice's job against `plan.md` and returns the verdict; you never implement the slice inline.)
4. Trust the verdict; do not re-run the slice's work. Read the returned verdict and `result.md`, then run `python3 scripts/workflow.py validate` (state integrity only — do **not** re-run the slice's tests; the phase review validates all slices together later). Then act on `status`:
   - `done` → continue to step 5.
   - `needs_operator` → set the slice `pending` (`python3 scripts/workflow.py set-slice-status <slice_id> pending`), report the `operator_need`, and STOP without finishing.
   - `blocked` → record the blocker in `result.md`, report it, and STOP.
   - failed or empty return → treat the slice as not done: do not finish, do not commit; report and STOP.
5. Mark the slice done with `python3 scripts/workflow.py finish-slice <slice_id>` only when complete and verified.
6. Run `python3 scripts/workflow.py validate`.
7. Commit by default: group the slice's pending changes into focused `type(scope): summary` commit(s) following the Commit Convention. Committing is the orchestrator's job — the executor never commits. Do not branch unless the operator asks; never push.

When the selected slice is a decomposition (`kind: decomposition`), it runs the **same path** as any slice — you plan it, the `slice-executor` does its job. That job is to create the phase's middle slices: in step 3 the executor runs `python3 scripts/workflow.py new-slice --phase <P> --slice <P>.S<n> --name "..."` (with `--kind`, `--risk`, `--order`, `--depends-on` as the plan specifies) to create them as **bare folders** — never pre-filling their `plan.md`; each fills its own when it runs — and records the slice breakdown (what each slice covers and why) plus findings in the phase's `phase.md`, so later slices share that context. Set each middle slice's `--risk` deliberately — `risk` now also selects the executor's effort (a `low`-risk slice runs at `high`, everything else at `xhigh`). Plan the decomposition accordingly; you still verify, `finish-slice`, and commit as for any slice.

When the selected slice is a phase review (`kind: review`), step 3 delegates the review to the `slice-executor` like any slice — you do not review it yourself. Plan it so the executor: validates all of the phase's slices together (each slice's validation commands from its `plan.md` / `result.md`, plus `python3 scripts/workflow.py validate`), reviews the phase against its objective, `intent.md`, and the docs, and — **only on a passing review** — consolidates the phase's durable-doc changes (the running "Doc impact" notes in `phase.md`) into new doc versions. On a review slice the executor writes only docs, never source code. (In Codex, spawn the `slice-executor` from `.codex/agents/slice-executor.toml` the same way.) It returns a `review_verdict`; you record it and act on it instead of running steps 5–7:

- Record the verdict: `python3 scripts/workflow.py review-phase <P> --verdict pass|changes_requested|blocked --reviewer slice-executor --note "..."`, then `python3 scripts/workflow.py validate` (state integrity — also catches a stale `docs/current`).
- On `pass`: run `finish-slice <slice_id>`. A passing review marks the phase `done` but it **stays in `active/`** — archiving is a separate, manual step, so do **not** archive now. Archive later, when the operator asks: `archive-all` once every active phase is done, `rotate-backlog` to archive just the done phases while others continue, or `archive-phase <P>` for one phase.
- On `changes_requested`: create the executor's proposed fix slices (`python3 scripts/workflow.py new-slice --phase <P> --slice <P>.F<n> --name "..." --kind fix`) and leave the review slice open for re-review; do not finish or archive. Docs stay unversioned until the eventual passing re-review consolidates them.
- On `blocked`: record the blocker; do not finish or archive.

Durable-doc versioning happens **only** at the phase review: the review-slice executor consolidates the phase's "Doc impact" notes (recorded in `phase.md` by earlier slices) into new versions on a passing review, and reports them in `doc_versions`; you confirm via `validate`. Implementation, `fix`, and decomposition slices never run `doc-new-version` — when they change durable truth they append a one-line "Doc impact" note to `phase.md`. Never patch `docs/current/*.md` or old versions.

Stop after one slice. Do not advance to the next slice in the same turn.
""",
    },
    {
        "name": "do-whole-phase",
        "claude_only": True,  # Codex has no plan mode; its auto-advancing loop can't do genuine per-slice planning
        "desc": "Finish the active phase end-to-end, including the review and any fix slices.",
        "tools": "Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep, Bash, Agent, EnterPlanMode, ExitPlanMode",
        "body": """Read `AGENTS.md` and the phase's `phase.md` (and its `intent.md` when present), run `python3 scripts/workflow.py next`, then finish every remaining slice in the current phase only. If you are ever unsure of the operator's intent, consult `intent.md` — the confirmed record of what was asked.

You are the ORCHESTRATOR (main thread): you plan each slice, verify, commit, move workflow state, and talk to the operator. Every slice — decomposition, implementation, `fix`, and the phase **review** — is delegated to the `slice-executor` subagent, one at a time and sequentially. Same contract as `do-next-slice`, looped over the phase.

Rules:

- If a slice or the phase is `pending` (shown `[~]`; `next` prints `WAITING ON OPERATOR`), STOP the loop: it needs operator co-work (validation or an operator-run action). Report what you need and do not start, finish, or advance past it. Resume only after the operator clears `pending` back to `in_progress`. If you hit such a point mid-slice, set it `pending` with `set-slice-status <slice_id> pending` and STOP.
- Re-read `works/state.json`, `works/backlog.md`, and the phase's `phase.md` after each slice.
- **Default loop — plan → operator approves the readied plan → executor, repeated.** The orchestrator advances on its own: after each slice it **automatically enters plan mode to plan the next** — it never stops to ask permission to start planning. For each slice: in Claude Code, **call the `EnterPlanMode` tool** to enter plan mode, do read-only research (surface any clarifying questions), then **call `ExitPlanMode` to present the readied plan** for the operator's approval. The only pause is approving the finished plan — never a pause before planning begins. After approval (the harness exits plan mode), write the approved **native plan** to that slice's **own** `plan.md` (free-form — no template; let it incorporate any operator note), pulling context from `phase.md`; then dispatch the executor; then re-read state and head straight into planning the next slice (`EnterPlanMode` again). Never pre-fill another slice's `plan.md`. The operator's verbatim intent lives in the phase's `intent.md`, not duplicated per slice.
- **`auto` (operator opt-in) skips plan mode and the approval.** If the operator invokes the skill with `auto` (e.g. `/do-whole-phase auto`; "run unattended" also counts), do **not** enter plan mode (no `EnterPlanMode` / `ExitPlanMode`): for each slice, plan inline → write `plan.md` → dispatch the executor → validate (state integrity) → finish → commit → next, to the end of the phase. `auto` waives only the plan-approval pause — the safety halts still apply: a `pending` slice/phase, or any `needs_operator` / `blocked` / failed executor return, STOPS the loop even in `auto`.
- Delegated slices (decomposition, implementation, `fix`): dispatch the executor (one at a time — wait for it to return before the next) — **`slice-executor-high`** (effort `high`) for a low-risk implementation/`fix` slice (`risk == low`), else **`slice-executor`** (effort `xhigh`) — to do the slice's job against `plan.md`; it writes `result.md`, appends notes to `phase.md`, and returns a structured verdict. Then trust the verdict: read it and `result.md`, and run `python3 scripts/workflow.py validate` (state integrity only — do **not** re-run the slice's tests; the phase review validates all slices together). On `needs_operator`, set the slice `pending`, report, and STOP; on `blocked`, record the blocker and STOP; on a failed or empty return, treat the slice as not done and STOP. A `done` verdict proceeds.
- When the slice is a decomposition (`kind: decomposition`), it runs the same path as any slice: you plan it, then dispatch the `slice-executor`, whose job is to create the phase's middle slices with `new-slice` (bare folders — never pre-filling their `plan.md`) and record the breakdown, findings, and notes in `phase.md`. Set each slice's `--risk` deliberately — it also selects the executor's effort (`low` → `high`, else `xhigh`).
- When a slice finishes (its `result.md` and `phase.md` notes written by the executor), run `finish-slice <slice_id>`, then `python3 scripts/workflow.py validate`.
- Durable-doc versioning happens **only** at the phase review (see below): implementation, `fix`, and decomposition slices never run `doc-new-version` — when they change durable truth they append a one-line "Doc impact" note to `phase.md` for the review to consolidate.
- Commit at every clean slice boundary by default, following the Commit Convention (do not branch unless the operator asks; never push). Commits are the orchestrator's job — the executor never commits.
- When you reach the phase review slice, delegate it to the `slice-executor` like any slice. Plan it so the executor validates all of the phase's slices together (each slice's validation commands plus `python3 scripts/workflow.py validate`), reviews against the objective / `intent.md` / docs, and — **only on a passing review** — consolidates the phase's "Doc impact" notes from `phase.md` into new doc versions (writing only docs, never source). It returns a `review_verdict`.
- Record the verdict: `python3 scripts/workflow.py review-phase <P> --verdict pass|changes_requested|blocked --reviewer slice-executor --note "..."`, then `python3 scripts/workflow.py validate`.
- If the verdict is `changes_requested`, create the executor's proposed fix slices with `python3 scripts/workflow.py new-slice --phase <P> --slice <P.Fn> --name "..." --kind fix`, complete them (via the executor), then re-review (which consolidates the docs once it passes).
- Only a `pass` verdict marks the phase `done` (review-phase does this for you).
- A passing review leaves the phase `done` in `active/`; do **not** archive it here. Archiving is a separate manual step — later, when the operator asks, use `archive-all` once every active phase is done, `rotate-backlog` to archive just the done phases while others continue, or `archive-phase <P>` for one phase.
- Do not continue into the next phase.
""",
    },
    {
        "name": "review-phase",
        "desc": "Review a completed phase against its objective and record a pass / changes_requested / blocked verdict.",
        "tools": "Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep, Bash",
        "body": """The phase review is executed by the `slice-executor` (the orchestrator dispatches it at the `REVIEW` slice); this is its checklist. It is where the phase's slices are **validated together** — the orchestrator trusted each executor's `done` and did not re-run per-slice validation, so re-run it here across the whole phase — and where the phase's durable-doc changes are **consolidated into new versions on a passing review** (from the "Doc impact" notes in `phase.md`). Write only docs here, never source code; do not implement fixes — those are done by fix slices.

Read:

- `AGENTS.md` (or `CLAUDE.md`)
- `docs/current/*.md` relevant to the phase, and `docs/index.json`
- `works/state.json`, `works/backlog.md`
- the phase folder under `works/phases/active/<P>/` and each completed slice's `slice.json` + `result.md`

Check:

- Did the phase objective actually ship?
- Did each slice meet its brief and plan? Are deviations explained in `result.md`?
- **Validate all slices together** (the orchestrator no longer re-runs per-slice validation): re-run each slice's validation commands from its `plan.md` / `result.md`, plus `python3 scripts/workflow.py validate`. Do they pass across the finished phase?
- Were the phase's durable-truth changes (product, architecture, API, …) consolidated into new doc versions **at this review** — not per-slice, not in-place edits?
- Do `docs/current/*.md` match the latest versions in `docs/index.json` after consolidation? (`python3 scripts/workflow.py validate` checks this.)
- Are any issues serious enough to require fix slices?

On a **passing** review, before recording `pass`, consolidate docs: for each durable-truth area changed across the phase (per the "Doc impact" notes in `phase.md`), run `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source <P>.REVIEW`, edit only the returned `edit_path`, then `python3 scripts/workflow.py rebuild-docs` — one version per affected doc, capturing the whole phase. On `changes_requested` / `blocked`, version nothing — fixes land first and the eventual passing re-review consolidates them.

The orchestrator records exactly one verdict (the executor returns it; the executor never runs `review-phase` itself):

```sh
python3 scripts/workflow.py review-phase <P> --verdict pass --reviewer slice-executor --note "short justification"
# or
python3 scripts/workflow.py review-phase <P> --verdict changes_requested --reviewer slice-executor --note "numbered issues + proposed fix slices like P1.F1"
# or
python3 scripts/workflow.py review-phase <P> --verdict blocked --reviewer slice-executor --note "the blocker and needed input"
```

`pass` also marks the phase `done` — it stays in `active/`; archiving is a separate, manual step (`archive-all`, `rotate-backlog`, or `archive-phase`). `changes_requested` returns it to `in_progress`. `blocked` sets it `blocked`.
""",
    },
    {
        "name": "doc-new-version",
        "desc": "Create a new versioned durable doc instead of patching current docs.",
        "tools": "Bash(python3 scripts/workflow.py:*), Read, Edit",
        "body": """Run `python3 scripts/workflow.py doc-new-version $ARGUMENTS` (for example `--doc product --summary "..." --source P1.S1`).

Then edit only the returned `edit_path` under `docs/versions/<doc>/`, and run:

```sh
python3 scripts/workflow.py rebuild-docs
python3 scripts/workflow.py validate
```

Never manually edit `docs/current/*.md` or any existing file under `docs/versions/`.
""",
    },
    {
        "name": "deferred",
        "desc": "Rebuild and show the deferred jobs dashboard.",
        "tools": "Bash(python3 scripts/workflow.py:*)",
        "body": """Run `python3 scripts/workflow.py deferred`. Then read `works/deferred.md` if you need the human-readable dashboard.
""",
    },
    {
        "name": "defer-job",
        "desc": "Park work as a deferred job folder, outside active backlog selection.",
        "tools": "Bash(python3 scripts/workflow.py:*)",
        "body": """Run `python3 scripts/workflow.py defer-job $ARGUMENTS` (for example `--title "..." --reason "..." --trigger "..." --source P1.S1`).

Deferred jobs are stored under `works/deferred/open/<DID>/` and never affect next-slice selection until promoted.
""",
    },
    {
        "name": "promote-deferred",
        "desc": "Promote a deferred job into an active phase or slice.",
        "tools": "Bash(python3 scripts/workflow.py:*)",
        "body": """Run `python3 scripts/workflow.py promote-deferred $ARGUMENTS` (for example `D1 --phase P1 --slice P1.S2 --name "..."`; add `--create-phase --phase-name "..." --phase-objective "..."` to start a new phase).

This moves the job from `works/deferred/open/` to `works/deferred/promoted/`, creates a slice folder, and carries the deferred context into the slice brief.
""",
    },
    {
        "name": "archive-phase",
        "desc": "Archive review-passed phases: archive-all (full sweep), rotate-backlog (partial), or archive-phase (single).",
        "tools": "Bash(python3 scripts/workflow.py:*)",
        "body": """Archiving is **manual and explicit** — never automatic. A passing review marks a phase `done` but leaves it in `active/`; the **operator** decides when to archive (invoking this skill is that decision — never archive unasked). Archive whole phases only, never individual slices. Three first-class options:

**Archive everything — end-of-batch sweep.** When every active phase is done (the last review slice across all phases is complete), sweep them all to archived at once:

```sh
python3 scripts/workflow.py archive-all
```

`archive-all` refuses unless every active phase is `done` with a passing review.

**Rotate the done phases — partial sweep.** When only some phases are done, archive exactly those and leave the in-progress ones active:

```sh
python3 scripts/workflow.py rotate-backlog
```

**Archive one phase.** Archive a single review-passed phase by id:

```sh
python3 scripts/workflow.py archive-phase <P>
```

All three gate on the same rule: a phase must be `done` with a passing review to archive. Use `--force` (on `archive-all`/`archive-phase`) only for exceptional cleanup of an unfinished phase.
""",
    },
    {
        "name": "rotate-backlog",
        "desc": "Archive every currently-done phase and leave in-progress phases active (partial archive-all).",
        "tools": "Bash(python3 scripts/workflow.py:*)",
        "body": """Archive every phase that is **currently done** (all slices complete with a passing review) and leave in-progress phases active, then rebuild the dashboards:

```sh
python3 scripts/workflow.py rotate-backlog
```

This is the **partial** rotation `archive-all` cannot do: `archive-all` refuses unless *every* active phase is done, while `rotate-backlog` sweeps just the done phases and leaves the rest. Use it when several phases are active and only some have passed review.

Archives whole phases only; unfinished, blocked, or unreviewed phases are left untouched. There is no `--force` — to archive an unfinished phase, use `archive-phase <P> --force`.
""",
    },
    {
        "name": "rebuild-workflow",
        "desc": "Rebuild generated workflow dashboards, indexes, and docs snapshots, then validate.",
        "tools": "Bash(python3 scripts/workflow.py:*)",
        "body": """Run:

```sh
python3 scripts/workflow.py rebuild
python3 scripts/workflow.py validate
```
""",
    },
    {
        "name": "commit",
        "desc": "Group pending changes by topic into focused conventional commits.",
        "tools": "Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git reset:*), Bash(git commit:*)",
        "body": """Inspect pending changes, group them by logical topic, and create one focused commit per group using `type(scope): summary` (imperative, no trailing period).

Never push, force-push, use `git add -A`, or skip hooks unless explicitly asked.
""",
    },
    {
        "name": "retrofit",
        "desc": "Non-destructively adopt this agentic workspace into the current existing repository.",
        "tools": "Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep, Bash",
        "body": """Adopt the agentic workspace into the CURRENT existing repository, non-destructively. Explicit-invocation only. The full procedure and collision policy are in `docs/retrofit-guide.md`; this skill drives it.

Preflight (read-only):

1. Confirm a git repo: `git rev-parse --is-inside-work-tree`. If the working tree is dirty (`git status --porcelain` is non-empty), tell the operator and recommend committing or stashing first, so the retrofit lands as a clean, reviewable diff.
2. If `works/state.json` already exists, STOP and report: this repo already has the workspace — drive it with `python3 scripts/workflow.py` (or `/do-next-slice`). Do not retrofit again.
3. Locate the installer `bootstrap_agentic_workspace.sh`. It is NOT part of an installed workspace, so ask the operator for its path, or fetch it per the README (the `curl` one-liner). Never fabricate a copy.
4. Seed the first phase from the project's CURRENT state: read the `README`, the package manifest (`package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` / …), the primary language, and `git log -1 --format=%s`. From these, synthesize a concrete `--phase-name` and `--phase-objective` that reflect the existing code and the first real change to make.

Apply:

5. Run the installer in retrofit mode from the repo root:

   ```sh
   sh <path>/bootstrap_agentic_workspace.sh . --into-existing \\
     --name "<project>" --summary "<one sentence>" \\
     --phase-name "<synthesized>" --phase-objective "<synthesized>"
   ```

   It is non-destructive: it skips files you already have, additively merges `.claude/settings.json` and `CLAUDE.md`/`AGENTS.md` (marked section + `*.workspace.md` sidecar), installs the `docs/`+`works/` subsystems only if absent, and aborts before writing if a foreign `scripts/workflow.py` exists. It seeds P1 with `DECOMP`+`REVIEW` only.

Reconcile + verify:

6. If the repo already had `CLAUDE.md`/`AGENTS.md`, the installer kept them and wrote `CLAUDE.workspace.md`/`AGENTS.workspace.md` plus a marked pointer block. Read the sidecar and fold the workspace contract into the project's own contract as appropriate — the project's existing rules win where they disagree.
7. Replace P1's placeholder `intent.md` with the synthesized intent: set Origin to `synthesized-from-repo`, record the README / manifest / `git log` basis you used under "Original Input (verbatim)", and the synthesized objective under "Confirmed Intent (refined + clarified)". Keep it linked near the top of P1's `phase.md`.
8. Ensure `__pycache__/` and `*.pyc` are git-ignored (the installer never edits `.gitignore`).
9. Run `python3 scripts/workflow.py validate`, then `python3 scripts/workflow.py next`.

Report:

10. Summarize what the installer created / skipped / merged (from its printed summary) and show `git status`. Do NOT commit automatically — the operator reviews the diff and tells you when to commit. Point them at `docs/retrofit-guide.md` for the full policy and troubleshooting.
""",
    },
    {
        "name": "update-workspace",
        "desc": "Update the current repo's agentic-workspace machinery to the latest upstream cornerstone, preserving your phases, slices, and docs.",
        "tools": "Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep, Bash",
        "body": """Update the CURRENT repo's agentic-workspace machinery to the latest upstream cornerstone, preserving your own work. Explicit-invocation only. Run this when the cornerstone has changed since you adopted or last synced and you want this repo to match the current version. (For first-time adoption use `/retrofit` instead.)

What it changes: it OVERWRITES machinery (`scripts/workflow.py`, the `.claude/agents/` and `.codex/agents/` subagents, every skill under `.claude/skills/` and `.agents/skills/`, `.codex/config.toml`, `works/templates/*`), additively MERGES `.claude/settings.json`, and refreshes the `CLAUDE.md`/`AGENTS.md` contract. It PRESERVES everything under `works/` except templates (your state, phases, slices, deferred jobs) and all of `docs/` (your versioned docs). It never commits.

Preflight (read-only):

1. Confirm a git repo: `git rev-parse --is-inside-work-tree`. If the working tree is dirty (`git status --porcelain` is non-empty), tell the operator and recommend committing or stashing first, so the update lands as a clean, reviewable diff.
2. Confirm this repo already has the workspace: `works/state.json` (or any `works/phases/active/*/phase.json`) AND `scripts/workflow.py` must exist. If not, STOP — this repo has not adopted the workspace; use `/retrofit` instead.
3. If `works/.workspace-version.json` exists, read it and report the last-synced commit and time so the operator knows the starting point.

Fetch upstream:

4. Shallow-clone the cornerstone to a temp dir and capture its HEAD commit:

   ```sh
   tmp="$(mktemp -d)"
   git clone --depth 1 https://github.com/leetusik/bootstrap_agentic_workspace.sh.git "$tmp"
   ref="$(git -C "$tmp" rev-parse HEAD)"
   ```

Preview the diff (this is the "check what is different" step):

5. Run the freshly-cloned installer in dry-run update mode from the repo root — it writes nothing and prints the change-list:

   ```sh
   sh "$tmp/bootstrap_agentic_workspace.sh" . --update --dry-run
   ```

   Show the operator the change-list: machinery files that would be updated (with +added/-removed counts) or added, settings merged, how many files are preserved and unchanged, and any stale workspace skills upstream has dropped.

6. STOP and let the operator review and approve. Do not apply without approval.

Apply (after the operator approves):

7. Run the same installer in update mode, recording the upstream commit so provenance is tracked:

   ```sh
   SYNCED_COMMIT="$ref" sh "$tmp/bootstrap_agentic_workspace.sh" . --update
   ```

Verify:

8. The installer's update already ran `validate` / `rebuild` (or `next` for a repo without the docs subsystem) and printed the result. Run `python3 scripts/workflow.py next` to confirm the current state under the refreshed engine.

Report and clean up:

9. Summarize what was updated / added / merged / preserved and any flagged stale skills (from the installer's printed summary), and show `git status`. Do NOT commit automatically — the operator reviews the diff and tells you when to commit. Remove the temp clone: `rm -rf "$tmp"`.
""",
    },
]

MANAGED_DIRS = [
    "docs", "docs/current", "docs/versions",
    *[f"docs/versions/{doc_id}" for doc_id in DOC_TYPES],
    "works", "works/phases", "works/phases/active", "works/phases/archived",
    "works/deferred", "works/deferred/open", "works/deferred/promoted", "works/deferred/dropped",
    "works/templates", "scripts",
    ".claude", ".claude/skills", ".claude/agents",
    ".agents", ".agents/skills",
    ".codex", ".codex/agents",
]

MANAGED_FILES = [
    "AGENTS.md", "CLAUDE.md",
    "docs/README.md", "docs/index.json",
    *[f"docs/current/{doc_id}.md" for doc_id in DOC_TYPES],
    *[f"docs/versions/{doc_id}/v0001_bootstrap.md" for doc_id in DOC_TYPES],
    "works/state.json", "works/index.json", "works/backlog.md", "works/deferred.md", "works/events.jsonl",
    "works/phases/active/P1/phase.json", "works/phases/active/P1/phase.md", "works/phases/active/P1/intent.md",
    *[f"works/phases/active/P1/slices/P1.DECOMP/{n}" for n in ("slice.json", "result.md")],
    *[f"works/phases/active/P1/slices/P1.REVIEW/{n}" for n in ("slice.json", "result.md")],
    *[f"works/templates/{n}" for n in ("result.md", "deferred_brief.md", "intent.md")],
    "scripts/workflow.py",
    ".claude/agents/slice-executor.md", ".claude/agents/slice-executor-high.md", ".claude/settings.json",
    ".codex/config.toml", ".codex/agents/slice-executor.toml", ".codex/agents/slice-executor-high.toml",
]
for s in COMMAND_SKILLS:
    name = s["name"]
    MANAGED_DIRS.append(f".claude/skills/{name}")
    MANAGED_FILES.append(f".claude/skills/{name}/SKILL.md")
    if s.get("claude_only"):
        continue
    MANAGED_DIRS.extend([f".agents/skills/{name}", f".agents/skills/{name}/agents"])
    MANAGED_FILES.extend([
        f".agents/skills/{name}/SKILL.md",
        f".agents/skills/{name}/agents/openai.yaml",
    ])


def now_iso() -> str:
    return datetime.now().astimezone().replace(microsecond=0).isoformat()


def slugify(value: str, fallback: str = "item") -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "_", value.strip().lower()).strip("_")
    return slug or fallback


def _atomic_write(p, text: str, executable: bool = False) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    # Atomic write: temp file in the same dir, then replace.
    fd, tmp = tempfile.mkstemp(dir=str(p.parent), prefix=".tmp_", suffix=p.name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        if executable:
            mode = os.stat(tmp).st_mode
            os.chmod(tmp, mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        os.replace(tmp, str(p))
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


# ---- Retrofit (--into-existing) write policy --------------------------------
# In retrofit mode the workspace is added non-destructively: an existing file is
# never overwritten. A small, known set is additively, idempotently merged.
def _merge_settings_json(text: str) -> None:
    """Union our permission entries into an existing .claude/settings.json,
    preserving every key the target already has. Idempotent."""
    p = ROOT / ".claude/settings.json"
    ours = json.loads(text)
    try:
        theirs = json.loads(p.read_text(encoding="utf-8"))
        if not isinstance(theirs, dict):
            raise ValueError("settings.json is not a JSON object")
    except Exception:
        # Never clobber an unparseable file — drop a sidecar instead.
        _atomic_write(ROOT / ".claude/settings.workspace.json", text)
        RETROFIT_SUMMARY["skipped"].append(".claude/settings.json (unparseable; wrote .claude/settings.workspace.json)")
        return
    perms = theirs.setdefault("permissions", {})
    for key in ("allow", "deny"):
        current = perms.get(key) or []
        additions = (ours.get("permissions") or {}).get(key) or []
        perms[key] = list(current) + [x for x in additions if x not in current]
    _atomic_write(p, json.dumps(theirs, ensure_ascii=False, indent=2) + "\n")
    RETROFIT_SUMMARY["merged"].append(".claude/settings.json")


def _merge_contract(path: str, full_text: str) -> None:
    """Keep the target's existing CLAUDE.md/AGENTS.md; write the full workspace
    contract to a *.workspace.md sidecar and append a marked, idempotent pointer
    block (re-running replaces just the marked block, never duplicates)."""
    p = ROOT / path
    sidecar = path[:-3] + ".workspace.md"  # CLAUDE.md -> CLAUDE.workspace.md
    _atomic_write(ROOT / sidecar, full_text)
    begin, end = "<!-- BEGIN agentic-workspace -->", "<!-- END agentic-workspace -->"
    block = (
        f"{begin}\n"
        f"> This repo uses the agentic workspace (`scripts/workflow.py` + skills under `.claude/`/`.agents/`).\n"
        f"> Full operating contract: [`{sidecar}`]({sidecar}) — reconcile it with this file's own rules as needed.\n"
        f"{end}"
    )
    existing = p.read_text(encoding="utf-8")
    if begin in existing and end in existing:
        i = existing.index(begin)
        j = existing.index(end) + len(end)
        new = existing[:i] + block + existing[j:]
    else:
        sep = "" if existing.endswith("\n") else "\n"
        new = existing + sep + "\n" + block + "\n"
    _atomic_write(p, new)
    RETROFIT_SUMMARY["merged"].append(path)
    RETROFIT_SUMMARY["created"].append(sidecar)


def _retrofit_handle(path: str, text: str) -> bool:
    """Return True if retrofit policy fully handled this write (kept theirs or
    merged); False to proceed with a normal create."""
    if not (ROOT / path).exists():
        return False  # absent -> create normally
    if path == ".claude/settings.json":
        _merge_settings_json(text)
        return True
    if path in ("CLAUDE.md", "AGENTS.md"):
        _merge_contract(path, text)
        return True
    RETROFIT_SUMMARY["skipped"].append(path)  # keep theirs
    return True


# ---- Update (--update) write policy -----------------------------------------
# Refresh machinery in place while preserving the downstream's own work and docs:
#   OVERWRITE (machinery, upstream-owned): scripts/workflow.py, the .claude
#     subagents, every skill, .codex/config.toml, works/templates/*.
#   MERGE (additive): .claude/settings.json.
#   CONTRACT (sidecar-aware): CLAUDE.md / AGENTS.md.
#   PRESERVE (never touch): everything under works/ except templates, and all of
#     docs/ (the append-only version chain plus generated snapshots).
# In --dry-run nothing is written; changes are only recorded for the report.
def _is_machinery(path: str) -> bool:
    if path in ("scripts/workflow.py", ".codex/config.toml"):
        return True
    return path.startswith((".claude/agents/", ".codex/agents/", ".claude/skills/", ".agents/skills/", "works/templates/"))


def _difflines(old: str, new: str):
    """(added, removed) line counts between two texts, via difflib opcodes."""
    a, b = old.splitlines(), new.splitlines()
    added = removed = 0
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b).get_opcodes():
        if tag in ("replace", "delete"):
            removed += i2 - i1
        if tag in ("replace", "insert"):
            added += j2 - j1
    return added, removed


def _record_change(path: str, text: str) -> bool:
    """Record whether `text` changes the file at `path`; return True if it does."""
    target = ROOT / path
    if target.is_file():
        old = target.read_text(encoding="utf-8")
        if old == text:
            UPDATE_SUMMARY["unchanged"].append(path)
            return False
        added, removed = _difflines(old, text)
        UPDATE_SUMMARY["updated"].append((path, added, removed))
        return True
    UPDATE_SUMMARY["added"].append(path)
    return True


def _update_write(path: str, text: str, executable: bool) -> None:
    if _record_change(path, text) and not DRY_RUN:
        _atomic_write(ROOT / path, text, executable)


def _update_handle(path: str, text: str, executable: bool) -> None:
    # Preserve all downstream work and docs.
    if path.startswith("works/") and not path.startswith("works/templates/"):
        UPDATE_SUMMARY["preserved"].append(path)
        return
    if path.startswith("docs/") and path != "docs/README.md":
        UPDATE_SUMMARY["preserved"].append(path)
        return
    if path == "docs/README.md":
        # Machinery doc, but only refresh where the docs subsystem exists.
        if UPDATE_DOCS:
            _update_write(path, text, executable)
        else:
            UPDATE_SUMMARY["preserved"].append(path)
        return
    # Additive merge: never clobber the operator's settings.
    if path == ".claude/settings.json":
        if (ROOT / path).exists():
            UPDATE_SUMMARY["merged"].append(path)
            if not DRY_RUN:
                _merge_settings_json(text)
        else:
            _update_write(path, text, executable)
        return
    # Contract: a retrofitted repo keeps its own CLAUDE.md/AGENTS.md and we
    # refresh the workspace sidecar; a fresh-installed repo's contract IS
    # machinery, so overwrite it in place (operator previews via --dry-run).
    if path in ("CLAUDE.md", "AGENTS.md"):
        sidecar = path[:-3] + ".workspace.md"
        if (ROOT / sidecar).exists():
            _record_change(sidecar, text)
            if not DRY_RUN:
                _merge_contract(path, text)
        else:
            _update_write(path, text, executable)
        return
    if _is_machinery(path):
        _update_write(path, text, executable)
        return
    # Any other managed file is content/state — preserve.
    UPDATE_SUMMARY["preserved"].append(path)


def write_text(path, text: str, executable: bool = False) -> None:
    if UPDATE:
        _update_handle(path, text, executable)
        return
    if RETROFIT:
        if not INSTALL_DOCS and (path == "docs" or path.startswith("docs/")):
            return  # target already has a docs/ system — don't scaffold ours
        if _retrofit_handle(path, text):
            return
    _atomic_write(ROOT / path, text, executable)
    if RETROFIT:
        RETROFIT_SUMMARY["created"].append(path)


def write_json(path, data) -> None:
    write_text(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


# ---- Guards -----------------------------------------------------------------
ROOT.mkdir(parents=True, exist_ok=True)
for rel in MANAGED_DIRS:
    p = ROOT / rel
    if p.exists() and not p.is_dir():
        sys.exit(f"Error: managed directory path exists but is not a directory: {rel}")

if UPDATE:
    # Require an already-installed workspace; refuse on a bare or foreign repo.
    works_present = (ROOT / "works/state.json").exists() or any(
        (ROOT / "works/phases/active").glob("*/phase.json")
    )
    if not ((ROOT / "scripts/workflow.py").exists() and works_present):
        print("Error: no agentic workspace found here to update.", file=sys.stderr)
        print("Install fresh into an empty dir, or adopt an existing repo with --into-existing.", file=sys.stderr)
        sys.exit(1)
    # Rebuild docs only when THIS repo uses the workspace's OWN docs system —
    # index.json plus our versioned doc-type dirs. A repo adopted over its own
    # (foreign or absent) docs/ never received ours, so running our docs rebuild
    # there would crash or corrupt; skip it and rebuild only the works side.
    UPDATE_DOCS = (
        (ROOT / "docs/index.json").exists()
        and (ROOT / "docs/versions").is_dir()
        and any((ROOT / "docs/versions" / d).is_dir() for d in DOC_TYPES)
    )
elif RETROFIT:
    # PLAN pass: classify before writing anything, and abort up front on a
    # load-bearing collision so a retrofit can never half-install.
    # Idempotent: a repo that already has the workspace is a clean no-op. Check
    # this BEFORE the workflow.py guard so re-running --into-existing (which sees
    # the workflow.py we installed) exits cleanly instead of aborting.
    works_present = (ROOT / "works/state.json").exists() or any(
        (ROOT / "works/phases/active").glob("*/phase.json")
    )
    if works_present:
        print("This repo already contains an agentic workspace (works/ present) — nothing to retrofit.")
        print("Drive it directly with python3 scripts/workflow.py.")
        sys.exit(0)
    # A foreign scripts/workflow.py would break the runtime — abort before writing.
    if (ROOT / "scripts/workflow.py").exists():
        print("Error: target already has scripts/workflow.py.", file=sys.stderr)
        print("The workspace runtime shells out to it, so it cannot be installed over a", file=sys.stderr)
        print("foreign copy. Rename/relocate the existing file, or adopt the workspace", file=sys.stderr)
        print("manually (see docs/retrofit-guide.md), then re-run.", file=sys.stderr)
        sys.exit(1)
    # Install the docs versioning subsystem only when the target has no docs
    # system of its own; otherwise leave docs/ untouched and skip its rebuild.
    docs_present = (
        (ROOT / "docs/index.json").exists()
        or ((ROOT / "docs/current").is_dir() and any((ROOT / "docs/current").glob("*.md")))
        or ((ROOT / "docs/versions").is_dir() and any((ROOT / "docs/versions").iterdir()))
    )
    INSTALL_DOCS = not docs_present
else:
    conflicts = [rel for rel in MANAGED_FILES if (ROOT / rel).exists()]
    if conflicts:
        print("Error: target already contains managed workflow files:", file=sys.stderr)
        for rel in conflicts:
            print(f"  - {rel}", file=sys.stderr)
        print("Refusing to overwrite. Use this bootstrap only for a fresh agentic workspace.", file=sys.stderr)
        print("To add the workspace to an existing repo, re-run with --into-existing.", file=sys.stderr)
        sys.exit(1)

    if not FORCE_EMPTY_OK:
        extra = sorted(p.name for p in ROOT.iterdir() if p.name not in EMPTY_OK_ALLOWLIST)
        if extra:
            print("Error: target is not empty (beyond common repo metadata).", file=sys.stderr)
            print("Unexpected entries:", file=sys.stderr)
            for name in extra:
                print(f"  - {name}", file=sys.stderr)
            print("Re-run with --force-empty-ok if these are intentional and no managed files conflict.", file=sys.stderr)
            print("Or use --into-existing to non-destructively retrofit into an existing repo.", file=sys.stderr)
            sys.exit(1)

for rel in MANAGED_DIRS:
    if DRY_RUN:
        continue  # dry-run writes nothing, not even directories
    if ((RETROFIT and not INSTALL_DOCS) or (UPDATE and not UPDATE_DOCS)) and (rel == "docs" or rel.startswith("docs/")):
        continue  # don't scaffold a docs/ tree the target opted out of
    (ROOT / rel).mkdir(parents=True, exist_ok=True)

created_at = now_iso()

# ---- Routing contract (CLAUDE.md / AGENTS.md) -------------------------------
WORKFLOW_DOC = """## Agent Contract

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
"""
write_text("CLAUDE.md", f"# CLAUDE.md\n\n> Equivalent to `AGENTS.md`. If you change workflow rules, update both.\n\n{WORKFLOW_DOC}")
write_text("AGENTS.md", f"# AGENTS.md\n\n> Equivalent to `CLAUDE.md`. If you change workflow rules, update both.\n\n{WORKFLOW_DOC}")

# ---- Versioned docs ---------------------------------------------------------
DOC_BODIES = {
    "product": f"""# Product

## Status

{PROJECT_NAME} is newly bootstrapped. Treat product scope, terminology, and public promises as draft until validated through the workflow.

## Summary

{PROJECT_SUMMARY}

## Target Users

- <primary user or customer>
- <secondary user or operator>

## Problem

- <problem this project solves>
- <current pain or workflow gap>

## Goals

- <goal>
- <goal>
- <goal>

## Non-Goals for Now

- <explicitly out-of-scope item>
- <explicitly out-of-scope item>

## Product Direction

Keep durable product truth here. Update by creating a new version under `docs/versions/product/`, not by patching old versions.

## Terminology

- `phase`: grouped unit of work under `works/phases/active/` or `works/phases/archived/`
- `slice`: concrete unit of work inside a phase
- `deferred job`: parked work under `works/deferred/` that does not affect active selection until promoted
""",
    "experience": """# Experience

## Status

No user experience map is finalized yet.

## Purpose

Use this doc for product-facing flow truth: routes, journeys, UX states, copy tone, and user-visible behavior.

## Route / Screen Map

- <route or screen>: <purpose>

## Core User Journeys

### Journey Name

- Entry:
- Steps:
- Success state:
- Failure / recovery state:

## UX States

- Empty states:
- Loading states:
- Error states:
- Permission states:

## Copy and Tone

- <principle>

## Open Questions

-
""",
    "architecture": f"""# Architecture

## Status

{PROJECT_NAME} is newly bootstrapped. This document should describe stable system-level truth as the app takes shape.

## Current Repo Shape

- `CLAUDE.md` / `AGENTS.md`: equivalent compact routing contracts
- `docs/current/`: generated latest doc snapshots
- `docs/versions/`: immutable durable doc versions by category
- `docs/index.json`: latest-version map
- `works/state.json`: current/next pointer
- `works/index.json`: generated machine index
- `works/backlog.md`: generated human dashboard
- `works/phases/active/`: active phase folders
- `works/phases/archived/`: archived phase folders
- `works/deferred/`: deferred job folders
- `scripts/workflow.py`: workflow and docs version manager
- `.claude/`, `.agents/`, `.codex/`: tool entry points (skills, subagents, config)

## System Shape

- <frontend runtime>
- <backend runtime>
- <database / persistence>
- <background workers / queues>
- <external integrations>

## Boundaries

- Frontend boundary:
- Backend boundary:
- Data boundary:
- External service boundary:

## Cross-Cutting Constraints

- <constraint>

## Open Questions

-
""",
    "frontend": """# Frontend

## Status

No frontend implementation truth is finalized yet.

## Purpose

Use this doc for browser/client structure and conventions.

## Stack

- Framework:
- Styling:
- Component system:
- State management:
- Data fetching:

## Routes and Layouts

- <route>: <layout and responsibility>

## Component Conventions

- <convention>

## Forms and Validation

- <pattern>

## Client Auth / Session Behavior

- <pattern>

## Accessibility / Responsive Rules

- <rule>

## Open Questions

-
""",
    "backend": """# Backend

## Status

No backend implementation truth is finalized yet.

## Purpose

Use this doc for server-side module layout, domain boundaries, jobs, auth, errors, and logging.

## Stack

- Language/runtime:
- Framework:
- Package manager:
- Server entrypoint:

## Module / Service Layout

- <module>: <responsibility>

## Domain Boundaries

- <domain>: <owned behavior>

## Auth and Session Logic

- <pattern>

## Background Jobs / Workers

- <job>: <trigger and behavior>

## Error Handling and Logging

- <pattern>

## Open Questions

-
""",
    "data": """# Data

## Status

No data model is finalized yet.

## Purpose

Use this doc for database schema truth, entities, migrations, indexes, storage, retention, and seed/test data.

## Storage

- Primary DB:
- Cache:
- Object/file storage:

## Entities

### Entity Name

- Purpose:
- Key fields:
- Relationships:
- Indexes:

## Migrations

- Tooling:
- Rules:

## Retention / Deletion

- <policy>

## Seed and Test Data

- <approach>

## Open Questions

-
""",
    "api": """# API

## Status

No public-facing contracts are finalized yet. Add contracts here when they are implemented or explicitly accepted.

## Documentation Rules

- Only document a contract as stable when it is implemented or explicitly accepted.
- Mark experimental surfaces as draft.
- Record breaking changes once external consumers exist.
- Keep public contract changes synchronized with product, experience, frontend, backend, data, and security docs when boundaries change.
- Update this doc by creating a new version under `docs/versions/api/`, not by patching old versions.

## Contract Template

### Surface Name

- Status:
- Consumers:
- Purpose:
- Method / transport:
- Path / topic / event:
- Inputs:
- Outputs:
- Errors:
- Auth or permissions:
- Notes:

## Contracts

- None yet.
""",
    "operations": """# Operations

## Status

No operations truth is finalized yet.

## Purpose

Use this doc for local development, environment variables, deployment, infra, jobs, observability, backups, and recovery.

## Local Development

- Install:
- Run:
- Test:
- Build:

## Environment Variables

| Name | Required | Purpose | Notes |
|---|---|---|---|
| <NAME> | yes/no | <purpose> | <notes> |

## Deployment

- Target:
- Process:
- Rollback:

## Scheduled Jobs / Workers

- <job>: <schedule/trigger>

## Observability

- Logs:
- Metrics:
- Alerts:

## Backup / Restore

- <policy>

## Open Questions

-
""",
    "security": """# Security

## Status

No security model is finalized yet.

## Purpose

Use this doc for auth, authorization, secrets, customer data boundaries, rate limits, abuse cases, and sensitive operations.

## Auth Model

- Identity:
- Session:
- Token/cookie behavior:

## Authorization Rules

- <resource>: <who can do what>

## Secret Handling

- <rule>

## Customer Data Boundaries

- <rule>

## Rate Limits / Abuse Cases

- <case>: <mitigation>

## Security Checklist

- [ ] No secrets committed
- [ ] Auth rules documented
- [ ] Sensitive data paths documented

## Open Questions

-
""",
    "qa": """# QA

## Status

No QA strategy is finalized yet.

## Purpose

Use this doc for test commands, acceptance criteria style, manual QA missions, browser QA flows, regression checks, and known fragile areas.

## Test Commands

- Unit:
- Integration:
- E2E:
- Lint/typecheck:

## Acceptance Criteria Style

- <rule>

## Manual QA Missions

### Mission Name

- Route / entry:
- What a real user would try:
- What would feel wrong:
- Evidence to collect:

## Regression Checklist

- [ ] <check>

## Known Fragile Areas

- <area>

## Open Questions

-
""",
    "decisions": """# Decisions

## Status

No major decisions are recorded yet.

## Purpose

Use this doc as a lightweight ADR index: important choices, rejected alternatives, tradeoffs, and decision sources.

## Decision Log

### Decision Title

- Date:
- Status: proposed | accepted | superseded
- Context:
- Decision:
- Alternatives considered:
- Consequences:
- Source:

## Superseded Decisions

- None yet.
""",
}


def doc_frontmatter(doc_id: str, version: str, source: str, summary: str, previous=None) -> str:
    previous_line = f"previous: {previous}\n" if previous else "previous: null\n"
    return f"---\ndoc_id: {doc_id}\nversion: {version}\ncreated_at: {created_at}\nsource: {source}\nsummary: {summary}\n{previous_line}---\n\n"


index_docs = {}
for doc_id in DOC_TYPES:
    version_id = "v0001_bootstrap"
    rel = f"docs/versions/{doc_id}/{version_id}.md"
    summary = f"Initial {doc_id} doc"
    content = doc_frontmatter(doc_id, "v0001", "bootstrap", summary) + DOC_BODIES[doc_id]
    write_text(rel, content)
    write_text(f"docs/current/{doc_id}.md", content)
    index_docs[doc_id] = {
        "latest": version_id,
        "current_path": f"docs/current/{doc_id}.md",
        "versions": [{"id": version_id, "path": rel, "created_at": created_at, "source": "bootstrap", "summary": summary, "previous": None}],
    }
write_json("docs/index.json", {"docs": index_docs, "last_rebuilt_at": created_at})
write_text("docs/README.md", f"""# Docs

Durable docs are versioned. Do not patch old versions.

## Categories

{chr(10).join(f"- `docs/current/{doc_id}.md`" for doc_id in DOC_TYPES)}

## Rules

Doc updates are the agent's job, normally as part of a slice — the operator asks; the agent runs the commands.

- Read latest docs from `docs/current/*.md`.
- The agent creates updates with `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source <phase-or-slice>`.
- Edit only the newly created version file under `docs/versions/<doc>/`.
- The agent runs `python3 scripts/workflow.py rebuild-docs` after editing the new version.
- `docs/current/*.md` is generated from the latest version and should not be manually edited.

## Update Triggers

- `product`: goals, users, scope, terminology, business direction
- `experience`: routes, journeys, UI behavior, copy, UX states
- `architecture`: system boundaries, components, runtime, integrations
- `frontend`: routing, components, state, data fetching, browser auth
- `backend`: server modules, services, jobs, auth/session, logging/errors
- `data`: schema, migrations, entities, indexes, storage, retention
- `api`: REST/RPC/webhook/event contracts and error shapes
- `operations`: env, deployment, local commands, jobs, monitoring, backups
- `security`: permissions, secrets, customer data boundaries, abuse controls
- `qa`: test commands, QA missions, regression checklist, acceptance style
- `decisions`: meaningful choices, tradeoffs, rejected alternatives
""")

# ---- Templates --------------------------------------------------------------
# No plan.md template: the orchestrator writes its own free-form native plan into
# each slice's plan.md at the slice's turn. Only result.md (and intent.md) are scaffolded.
write_text("works/templates/result.md", """# Result

- Phase ID: __PHASE_ID__
- Slice ID: __SLICE_ID__
- Slice: __SLICE_NAME__
- Review status: pending
- Next action:

## Outcome

## Deviations from Plan

## Validation Run

-

## Files Changed

-

## Doc Versions Created

-

## Roadmap Updates

-

## Retrospective

-
""")
write_text("works/templates/deferred_brief.md", """# Deferred: __DEFERRED_ID__ __TITLE__

## Context

## Why Deferred

## Trigger to Promote

## Notes

""")
write_text("works/templates/intent.md", """# Intent — __PHASE_ID__

- Captured at: __CAPTURED_AT__
- Origin: __ORIGIN__

## Original Input (verbatim)

> <the operator's raw request, word-for-word — preserve grammar and wording exactly; do not fix it here>

## Confirmed Intent (refined + clarified)

<a clear restatement of what the operator wants, as confirmed by the operator>

## Clarifications Resolved

- Q: <clarifying question asked> — A: <operator's answer>

## Notes

-
""")

# ---- Initial phase P1 -------------------------------------------------------
p1_path = "works/phases/active/P1"
phase_json = {
    "id": "P1", "name": PHASE_NAME, "objective": PHASE_OBJECTIVE, "status": "planned", "order": 1,
    "created_at": created_at, "started_at": None, "completed_at": None,
    "review": {"status": "pending", "reviewed_at": None, "reviewer": None, "note": None},
    "paths": {"phase_md": "phase.md", "slices_dir": "slices"},
    "archive": {"archived": False, "archived_at": None, "archive_path": None},
}
write_json(f"{p1_path}/phase.json", phase_json)
write_text(f"{p1_path}/phase.md", f"""# Phase P1: {PHASE_NAME}

_Intent: see [intent.md](intent.md)._

## Objective

{PHASE_OBJECTIVE}

## Context

Initial bootstrap phase. Use `P1.DECOMP` to create concrete implementation slices before coding starts.

## Decomposition

_Slice breakdown and rationale — filled by the `P1.DECOMP` slice._

## Findings & Notes

_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._

## Constraints

- Keep `works/backlog.md` lean.
- Store detailed slice context inside each slice folder.
- Create new doc versions for durable doc changes.
- Record the review with `review-phase`; phases stay in `active/` after passing and are archived manually later (`archive-all`, `rotate-backlog`, or `archive-phase`).

## Open Questions

-
""")
intent_origin = "synthesized-from-repo" if RETROFIT else "bootstrap-placeholder"
intent_original = "(Synthesized by the adopting agent from the repo's README, manifest, and git history — not a verbatim operator request.)" if RETROFIT else "(Bootstrap placeholder — no operator request captured yet.)"
write_text(f"{p1_path}/intent.md", f"""# Intent — P1

- Captured at: {created_at}
- Origin: {intent_origin}

## Original Input (verbatim)

> {intent_original}

## Confirmed Intent (refined + clarified)

{PHASE_OBJECTIVE}

## Clarifications Resolved

-

## Notes

- Seeded by the installer; refine and confirm with the operator when the first real task arrives.
""")


def new_slice_files(phase_id: str, slice_id: str, name: str, kind: str, status: str, order: int, risk: str, source: dict) -> None:
    folder = f"works/phases/active/{phase_id}/slices/{slice_id}"
    slice_data = {
        "id": slice_id, "phase_id": phase_id, "name": name, "kind": kind, "status": status, "order": order,
        "depends_on": [], "created_at": created_at, "started_at": None, "completed_at": None, "risk": risk, "source": source,
        "paths": {"plan": "plan.md", "result": "result.md"},
        "validation": {"required": [], "last_run": None, "last_status": "pending"},
        "archive": {"archived": False, "archived_at": None, "archive_path": None},
    }
    write_json(f"{folder}/slice.json", slice_data)
    replacements = {"__PHASE_ID__": phase_id, "__SLICE_ID__": slice_id, "__SLICE_NAME__": name, "__CREATED_AT__": created_at}
    # Only result.md is scaffolded; plan.md has no template (the orchestrator writes its
    # free-form native plan there at the slice's turn), matching create_slice in workflow.py.
    for tmpl_name in ("result.md",):
        text = (ROOT / "works/templates" / tmpl_name).read_text(encoding="utf-8")
        for k, v in replacements.items():
            text = text.replace(k, v)
        write_text(f"{folder}/{tmpl_name}", text)


new_slice_files("P1", "P1.DECOMP", "decompose phase", "decomposition", "todo", 0, "low", {"type": "bootstrap", "id": None})
new_slice_files("P1", "P1.REVIEW", "phase review", "review", "todo", 9999, "medium", {"type": "bootstrap", "id": None})
write_text("works/events.jsonl", json.dumps({"ts": created_at, "type": "bootstrap", "project": PROJECT_NAME, "phase": "P1"}, ensure_ascii=False) + "\n")

# ---- Workflow engine (scripts/workflow.py) ----------------------------------
WORKFLOW_PY = r'''#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import stat
import sys
import tempfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKS = ROOT / "works"
DOCS = ROOT / "docs"
ACTIVE = WORKS / "phases" / "active"
ARCHIVED = WORKS / "phases" / "archived"
DEFERRED_OPEN = WORKS / "deferred" / "open"
DEFERRED_PROMOTED = WORKS / "deferred" / "promoted"
DEFERRED_DROPPED = WORKS / "deferred" / "dropped"
DOC_TYPES = {"product", "experience", "architecture", "frontend", "backend", "data", "api", "operations", "security", "qa", "decisions"}
PHASE_STATUSES = {"planned", "in_progress", "in_review", "pending", "blocked", "done"}
SLICE_STATUSES = {"todo", "in_progress", "in_review", "changes_requested", "pending", "blocked", "done"}
DEFERRED_STATUSES = {"deferred", "ready", "promoted", "done", "dropped"}
REVIEW_VERDICTS = {"pass", "changes_requested", "blocked"}


def now_iso() -> str:
    return datetime.now().astimezone().replace(microsecond=0).isoformat()


def timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def slugify(value: str, fallback: str = "item") -> str:
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "_", value.strip().lower()).strip("_")
    return slug or fallback


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_text(path: Path, text: str, executable: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp_", suffix=path.name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        if executable:
            os.chmod(tmp, os.stat(tmp).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        os.replace(tmp, str(path))
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def write_json(path: Path, data: object) -> None:
    write_text(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def append_event(event_type: str, **payload: object) -> None:
    event = {"ts": now_iso(), "type": event_type, **payload}
    WORKS.mkdir(parents=True, exist_ok=True)
    with (WORKS / "events.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")


def strip_frontmatter(text: str) -> str:
    if text.startswith("---\n"):
        end = text.find("\n---\n", 4)
        if end != -1:
            return text[end + len("\n---\n"):].lstrip("\n")
    return text


def doc_index() -> dict:
    return read_json(DOCS / "index.json")


def write_doc_index(index: dict) -> None:
    index["last_rebuilt_at"] = now_iso()
    write_json(DOCS / "index.json", index)


def rebuild_docs() -> None:
    index = doc_index()
    for doc_id, info in index.get("docs", {}).items():
        latest = next((v for v in info.get("versions", []) if v["id"] == info.get("latest")), None)
        if not latest:
            raise SystemExit(f"latest version missing in docs/index.json for {doc_id}")
        src = ROOT / latest["path"]
        if not src.exists():
            raise SystemExit(f"latest doc file missing: {latest['path']}")
        write_text(ROOT / info["current_path"], src.read_text(encoding="utf-8"))
    write_doc_index(index)


def next_doc_version_id(doc_id: str, index: dict) -> tuple:
    nums = []
    for v in index["docs"][doc_id].get("versions", []):
        m = re.match(r"v(\d+)", v["id"])
        if m:
            nums.append(int(m.group(1)))
    num = max(nums, default=0) + 1
    return f"v{num:04d}", num


def new_doc_version(args: argparse.Namespace) -> None:
    doc_id = args.doc
    if doc_id not in DOC_TYPES:
        raise SystemExit(f"doc must be one of: {', '.join(sorted(DOC_TYPES))}")
    index = doc_index()
    info = index["docs"][doc_id]
    latest_id = info["latest"]
    latest = next(v for v in info["versions"] if v["id"] == latest_id)
    base_body = strip_frontmatter((ROOT / latest["path"]).read_text(encoding="utf-8"))
    version_prefix, _ = next_doc_version_id(doc_id, index)
    version_id = f"{version_prefix}_{slugify(args.summary, 'update')}"
    rel = f"docs/versions/{doc_id}/{version_id}.md"
    dest = ROOT / rel
    if dest.exists():
        raise SystemExit(f"doc version already exists: {rel}")
    frontmatter = (
        f"---\n"
        f"doc_id: {doc_id}\n"
        f"version: {version_prefix}\n"
        f"created_at: {now_iso()}\n"
        f"source: {args.source}\n"
        f"summary: {args.summary}\n"
        f"previous: {latest_id}\n"
        f"---\n\n"
    )
    write_text(dest, frontmatter + base_body)
    info["latest"] = version_id
    info["versions"].append({
        "id": version_id, "path": rel, "created_at": now_iso(),
        "source": args.source, "summary": args.summary, "previous": latest_id,
    })
    write_doc_index(index)
    rebuild_docs()
    append_event("doc_version_created", doc=doc_id, version=version_id, source=args.source)
    print(f"created doc version {doc_id}/{version_id}")
    print(f"edit_path={rel}")
    print("after editing, run: python3 scripts/workflow.py rebuild-docs")


def cmd_docs(args: argparse.Namespace) -> None:
    index = doc_index()
    for doc_id in sorted(index["docs"]):
        info = index["docs"][doc_id]
        latest = next(v for v in info["versions"] if v["id"] == info["latest"])
        print(f"{doc_id}: latest={info['latest']} current={info['current_path']} latest_path={latest['path']}")


def validate_docs(errors: list) -> None:
    if not (DOCS / "index.json").exists():
        errors.append("missing docs/index.json")
        return
    index = doc_index()
    for doc_id in DOC_TYPES:
        info = index.get("docs", {}).get(doc_id)
        if not info:
            errors.append(f"missing doc index entry: {doc_id}")
            continue
        latest = next((v for v in info.get("versions", []) if v.get("id") == info.get("latest")), None)
        if not latest:
            errors.append(f"missing latest doc version entry: {doc_id}")
            continue
        latest_path = ROOT / latest["path"]
        current_path = ROOT / info["current_path"]
        if not latest_path.exists():
            errors.append(f"missing latest doc file: {latest['path']}")
        if not current_path.exists():
            errors.append(f"missing current doc file: {info['current_path']}")
        if latest_path.exists() and current_path.exists() and latest_path.read_text(encoding="utf-8") != current_path.read_text(encoding="utf-8"):
            errors.append(f"current doc is stale; run rebuild-docs: {doc_id}")


def phase_dirs() -> list:
    if not ACTIVE.exists():
        return []
    return sorted([p for p in ACTIVE.iterdir() if p.is_dir() and (p / "phase.json").exists()], key=lambda p: read_json(p / "phase.json").get("order", 999999))


def slice_dirs(phase_dir: Path) -> list:
    slices = phase_dir / "slices"
    if not slices.exists():
        return []
    return sorted([p for p in slices.iterdir() if p.is_dir() and (p / "slice.json").exists()], key=lambda p: read_json(p / "slice.json").get("order", 999999))


def all_active_phases() -> list:
    phases = []
    for pdir in phase_dirs():
        data = read_json(pdir / "phase.json")
        data["path"] = str(pdir.relative_to(ROOT))
        data["slices"] = []
        for sdir in slice_dirs(pdir):
            sdata = read_json(sdir / "slice.json")
            sdata["path"] = str(sdir.relative_to(ROOT))
            data["slices"].append(sdata)
        phases.append(data)
    return phases


def deferred_jobs() -> dict:
    groups = {"open": [], "promoted": [], "dropped": []}
    for label, base in [("open", DEFERRED_OPEN), ("promoted", DEFERRED_PROMOTED), ("dropped", DEFERRED_DROPPED)]:
        if not base.exists():
            continue
        for ddir in sorted([p for p in base.iterdir() if p.is_dir()]):
            djson = ddir / "deferred.json"
            if not djson.exists():
                continue
            data = read_json(djson)
            data["path"] = str(ddir.relative_to(ROOT))
            groups[label].append(data)
    return groups


def clean_cell(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        if "slice_id" in value:
            value = value.get("slice_id") or value
        elif "id" in value:
            value = value.get("id") or value
        else:
            value = json.dumps(value, ensure_ascii=False)
    return str(value).replace("|", "\\|").replace("\n", " ")


def status_box(status: object) -> str:
    """Dashboard checkbox glyph: done -> x, pending (waiting on operator) -> ~, else blank."""
    return "x" if status == "done" else "~" if status == "pending" else " "


def rebuild_deferred_dashboard(groups=None, rebuilt_at=None) -> None:
    groups = groups or deferred_jobs()
    rebuilt_at = rebuilt_at or now_iso()
    open_count = len(groups.get("open", []))
    promoted_count = len(groups.get("promoted", []))
    dropped_count = len(groups.get("dropped", []))
    lines = [
        "# Deferred Jobs", "", "> Generated dashboard. Do not put detailed deferred context here; edit each `works/deferred/<state>/<DID>/` folder instead.", "",
        "## Summary", "",
        f"- Open: `{open_count}`", f"- Promoted: `{promoted_count}`", f"- Dropped: `{dropped_count}`", f"- Rebuilt at: `{rebuilt_at}`", "",
        "## Open", "", "| ID | Status | Title | Source | Trigger | Path |", "|---|---|---|---|---|---|",
    ]
    if not groups.get("open"):
        lines.append("| - | - | - | - | - | - |")
    for d in groups.get("open", []):
        lines.append(f"| `{clean_cell(d.get('id'))}` | `{clean_cell(d.get('status'))}` | {clean_cell(d.get('title'))} | {clean_cell(d.get('source'))} | {clean_cell(d.get('trigger'))} | `{clean_cell(d.get('path'))}` |")
    lines.extend(["", "## Promoted", "", "| ID | Status | Title | Promoted To | Path |", "|---|---|---|---|---|"])
    if not groups.get("promoted"):
        lines.append("| - | - | - | - | - |")
    for d in groups.get("promoted", []):
        lines.append(f"| `{clean_cell(d.get('id'))}` | `{clean_cell(d.get('status'))}` | {clean_cell(d.get('title'))} | `{clean_cell(d.get('promoted_to'))}` | `{clean_cell(d.get('path'))}` |")
    lines.extend(["", "## Dropped", "", "| ID | Status | Title | Reason | Path |", "|---|---|---|---|---|"])
    if not groups.get("dropped"):
        lines.append("| - | - | - | - | - |")
    for d in groups.get("dropped", []):
        lines.append(f"| `{clean_cell(d.get('id'))}` | `{clean_cell(d.get('status'))}` | {clean_cell(d.get('title'))} | {clean_cell(d.get('dropped_reason'))} | `{clean_cell(d.get('path'))}` |")
    lines.append("")
    write_text(WORKS / "deferred.md", "\n".join(lines))


def resolve_current(phases: list) -> tuple:
    for phase in phases:
        if phase.get("status") == "done":
            continue
        current_phase = phase["id"]
        if phase.get("status") in ("blocked", "pending"):
            return current_phase, None, None
        open_slices = [s for s in phase["slices"] if s.get("status") != "done"]
        if open_slices:
            return current_phase, open_slices[0]["id"], open_slices[1]["id"] if len(open_slices) > 1 else None
        return current_phase, None, None
    return None, None, None


def operator_wait_target(phases: list, current_phase, current_slice):
    """The phase or slice id awaiting operator co-work (status `pending`), else None.
    `pending` means the operator must validate or run something; selection halts
    until it is cleared back to `in_progress`. Distinct from `blocked`."""
    for phase in phases:
        if phase["id"] != current_phase:
            continue
        if phase.get("status") == "pending":
            return phase["id"]
        cur = next((s for s in phase["slices"] if s["id"] == current_slice), None)
        if cur and cur.get("status") == "pending":
            return current_slice
        break
    return None


def rebuild_index_and_state() -> None:
    phases = all_active_phases()
    current_phase, current_slice, next_slice = resolve_current(phases)
    waiting_on = operator_wait_target(phases, current_phase, current_slice)
    deferred = deferred_jobs()
    rebuilt_at = now_iso()
    index = {
        "active_phases": [
            {
                "id": p["id"], "name": p["name"], "objective": p["objective"], "status": p["status"],
                "order": p.get("order"), "path": p["path"],
                "review_status": p.get("review", {}).get("status"),
                "current_slice": next((s["id"] for s in p["slices"] if s.get("status") != "done"), None),
                "slice_count": len(p["slices"]),
                "done_slice_count": sum(1 for s in p["slices"] if s.get("status") == "done"),
            } for p in phases
        ],
        "deferred_open_count": len(deferred.get("open", [])),
        "deferred_promoted_count": len(deferred.get("promoted", [])),
        "deferred_dropped_count": len(deferred.get("dropped", [])),
        "last_rebuilt_at": rebuilt_at,
    }
    write_json(WORKS / "index.json", index)
    mode = "waiting" if waiting_on else ("phase" if current_phase else "idle")
    state = {"current_phase": current_phase, "current_slice": current_slice, "next_slice": next_slice, "waiting_on_operator": waiting_on, "mode": mode, "updated_at": rebuilt_at}
    write_json(WORKS / "state.json", state)
    rebuild_backlog(phases, state, index)
    rebuild_deferred_dashboard(deferred, rebuilt_at)


def rebuild_backlog(phases: list, state: dict, index: dict) -> None:
    lines = [
        "# Backlog", "", "> Generated dashboard. Do not put detailed task context here; edit phase/slice/deferred folders instead.",
        "> Status box: `[x]` done · `[~]` pending — waiting on operator · `[ ]` open/in progress.", "",
        "## Pointer", "",
        f"- Current phase: `{state.get('current_phase') or 'none'}`",
        f"- Current slice: `{state.get('current_slice') or 'none'}`",
        f"- Next slice: `{state.get('next_slice') or 'none'}`",
        f"- Waiting on operator: `{state.get('waiting_on_operator') or 'none'}`",
        f"- Open deferred jobs: `{index.get('deferred_open_count', 0)}`",
        f"- Rebuilt at: `{index.get('last_rebuilt_at')}`", "",
        "## Active Phases", "", "| Phase | Status | Review | Name | Current Slice | Path |", "|---|---|---|---|---|---|",
    ]
    if not phases:
        lines.append("| - | - | - | - | - | - |")
    for p in phases:
        current = next((s["id"] for s in p["slices"] if s.get("status") != "done"), "none")
        name = clean_cell(p.get("name", ""))
        review = clean_cell(p.get("review", {}).get("status"))
        lines.append(f"| [{status_box(p['status'])}] `{p['id']}` | `{p['status']}` | `{review}` | {name} | `{current}` | `{p['path']}` |")
    for p in phases:
        lines.extend(["", f"## Phase {p['id']}: {p['name']}", "", "| Slice | Status | Name | Kind | Path |", "|---|---|---|---|---|"])
        for s in p["slices"]:
            checkbox = status_box(s.get("status"))
            name = clean_cell(s.get("name", ""))
            lines.append(f"| [{checkbox}] `{s['id']}` | `{s['status']}` | {name} | `{clean_cell(s.get('kind', ''))}` | `{s['path']}` |")
    lines.append("")
    write_text(WORKS / "backlog.md", "\n".join(lines))


def validate() -> int:
    errors: list = []
    warnings: list = []
    phases = all_active_phases()
    seen_phases, seen_slices = set(), set()
    all_slice_ids = {s["id"] for p in phases for s in p["slices"]}
    for p in phases:
        if p["id"] in seen_phases:
            errors.append(f"duplicate phase id: {p['id']}")
        seen_phases.add(p["id"])
        if p["status"] not in PHASE_STATUSES:
            errors.append(f"invalid phase status {p['id']}: {p['status']}")
        review_status = p.get("review", {}).get("status")
        if p["status"] == "done" and review_status != "pass":
            errors.append(f"phase {p['id']} is done but review status is {review_status!r}; record a passing review with review-phase")
        if not (ACTIVE / p["id"] / "intent.md").exists():
            warnings.append(f"phase {p['id']} has no intent.md (expected {p['id']}/intent.md); capture operator intent via the create-phase skill")
        for s in p["slices"]:
            if s["id"] in seen_slices:
                errors.append(f"duplicate slice id: {s['id']}")
            seen_slices.add(s["id"])
            if s["phase_id"] != p["id"]:
                errors.append(f"slice phase mismatch: {s['id']} says {s['phase_id']}, folder phase is {p['id']}")
            if s["status"] not in SLICE_STATUSES:
                errors.append(f"invalid slice status {s['id']}: {s['status']}")
            for dep in s.get("depends_on", []):
                if dep not in all_slice_ids:
                    errors.append(f"missing dependency for {s['id']}: {dep}")
    state = read_json(WORKS / "state.json") if (WORKS / "state.json").exists() else {}
    if state.get("current_phase") and state["current_phase"] not in seen_phases:
        errors.append(f"state current_phase does not exist: {state['current_phase']}")
    if state.get("current_slice") and state["current_slice"] not in seen_slices:
        errors.append(f"state current_slice does not exist: {state['current_slice']}")
    for base, allowed in [(DEFERRED_OPEN, {"deferred", "ready"}), (DEFERRED_PROMOTED, {"promoted", "done"}), (DEFERRED_DROPPED, {"dropped"})]:
        if not base.exists():
            continue
        for ddir in base.iterdir():
            if not ddir.is_dir():
                continue
            djson = ddir / "deferred.json"
            if not djson.exists():
                errors.append(f"missing deferred.json: {ddir.relative_to(ROOT)}")
                continue
            data = read_json(djson)
            if data.get("status") not in DEFERRED_STATUSES:
                errors.append(f"invalid deferred status {data.get('id')}: {data.get('status')}")
            if data.get("status") not in allowed:
                errors.append(f"deferred job in wrong folder: {data.get('id')} status {data.get('status')} under {base.relative_to(ROOT)}")
    validate_docs(errors)
    for w in warnings:
        print(f"warning: {w}")
    if errors:
        print("Workflow validation failed:")
        for e in errors:
            print(f"- {e}")
        return 1
    print("Workflow validation passed.")
    return 0


def require_phase(phase_id: str) -> Path:
    p = ACTIVE / phase_id
    if not (p / "phase.json").exists():
        raise SystemExit(f"phase not found: {phase_id}")
    return p


def require_slice(slice_id: str) -> Path:
    phase_id = slice_id.split(".", 1)[0]
    s = ACTIVE / phase_id / "slices" / slice_id
    if not (s / "slice.json").exists():
        raise SystemExit(f"slice not found: {slice_id}")
    return s


def load_template(name: str) -> str:
    return (WORKS / "templates" / name).read_text(encoding="utf-8")


def render_template(text: str, **values: str) -> str:
    for k, v in values.items():
        text = text.replace(f"__{k.upper()}__", v)
    return text


def create_slice(phase_id: str, slice_id: str, name: str, kind: str, order, risk: str, source: dict, depends_on=None) -> Path:
    require_phase(phase_id)
    if not slice_id.startswith(f"{phase_id}."):
        raise SystemExit(f"slice id must start with {phase_id}.")
    sdir = ACTIVE / phase_id / "slices" / slice_id
    if sdir.exists():
        raise SystemExit(f"slice already exists: {slice_id}")
    created = now_iso()
    data = {
        "id": slice_id, "phase_id": phase_id, "name": name, "kind": kind, "status": "todo", "order": order,
        "depends_on": depends_on or [], "created_at": created, "started_at": None, "completed_at": None, "risk": risk, "source": source,
        "paths": {"plan": "plan.md", "result": "result.md"},
        "validation": {"required": [], "last_run": None, "last_status": "pending"},
        "archive": {"archived": False, "archived_at": None, "archive_path": None},
    }
    write_json(sdir / "slice.json", data)
    common = {"PHASE_ID": phase_id, "SLICE_ID": slice_id, "SLICE_NAME": name, "CREATED_AT": created}
    # Only result.md is scaffolded. plan.md has no template: the orchestrator writes its
    # own free-form native plan there at the slice's turn, so a fresh slice has no plan.md.
    for name_in in ("result.md",):
        write_text(sdir / name_in, render_template(load_template(name_in), **common))
    return sdir


def new_phase(args: argparse.Namespace) -> None:
    phase_id = args.phase
    if not re.fullmatch(r"P[0-9]+", phase_id):
        raise SystemExit("phase must look like P1, P2, P3")
    pdir = ACTIVE / phase_id
    if pdir.exists():
        raise SystemExit(f"phase already exists: {phase_id}")
    order = _clean_order(args.order) if args.order is not None else max([read_json(p / "phase.json").get("order", 0) for p in phase_dirs()], default=0) + 1
    phase_data = {
        "id": phase_id, "name": args.name, "objective": args.objective, "status": "planned", "order": order,
        "created_at": now_iso(), "started_at": None, "completed_at": None,
        "review": {"status": "pending", "reviewed_at": None, "reviewer": None, "note": None},
        "paths": {"phase_md": "phase.md", "intent_md": "intent.md", "slices_dir": "slices"},
        "archive": {"archived": False, "archived_at": None, "archive_path": None},
    }
    write_json(pdir / "phase.json", phase_data)
    write_text(pdir / "phase.md", f"# Phase {phase_id}: {args.name}\n\n_Intent: see [intent.md](intent.md)._\n\n## Objective\n\n{args.objective}\n\n## Context\n\n## Decomposition\n\n_Slice breakdown and rationale — filled by the `{phase_id}.DECOMP` slice._\n\n## Findings & Notes\n\n_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._\n\n## Constraints\n\n## Open Questions\n\n-\n")
    write_text(pdir / "intent.md", render_template(load_template("intent.md"), PHASE_ID=phase_id, CAPTURED_AT=now_iso(), ORIGIN="operator"))
    create_slice(phase_id, f"{phase_id}.DECOMP", "decompose phase", "decomposition", 0, "low", source={"type": "new_phase", "id": phase_id})
    create_slice(phase_id, f"{phase_id}.REVIEW", "phase review", "review", 9999, "medium", source={"type": "new_phase", "id": phase_id})
    append_event("phase_created", phase=phase_id)
    rebuild_index_and_state()
    print(f"created phase {phase_id}: {pdir.relative_to(ROOT)}")


def _clean_order(value):
    """Normalize an explicit order: whole numbers stay ints, fractions stay floats so a
    slice/phase can be inserted between two neighbors (e.g. --order 4.5 sorts between 4 and 5)."""
    return int(value) if float(value).is_integer() else float(value)


def _auto_order(pdir: Path, explicit):
    if explicit is not None:
        return _clean_order(explicit)
    orders = [read_json(s / "slice.json").get("order", 0) for s in slice_dirs(pdir) if read_json(s / "slice.json").get("kind") != "review"]
    return max(orders, default=0) + 10


def new_slice(args: argparse.Namespace) -> None:
    pdir = require_phase(args.phase)
    order = _auto_order(pdir, args.order)
    sdir = create_slice(args.phase, args.slice, args.name, args.kind, order, args.risk, source={"type": "manual", "id": None}, depends_on=args.depends_on or [])
    append_event("slice_created", phase=args.phase, slice=args.slice)
    rebuild_index_and_state()
    print(f"created slice {args.slice}: {sdir.relative_to(ROOT)}")


def set_slice_status(slice_id: str, status: str) -> None:
    if status not in SLICE_STATUSES:
        raise SystemExit(f"invalid slice status: {status}")
    sdir = require_slice(slice_id)
    data = read_json(sdir / "slice.json")
    old = data.get("status")
    data["status"] = status
    if status == "in_progress" and not data.get("started_at"):
        data["started_at"] = now_iso()
    if status == "done":
        data["completed_at"] = now_iso()
    write_json(sdir / "slice.json", data)
    append_event("slice_status_changed", slice=slice_id, old_status=old, new_status=status)
    rebuild_index_and_state()


def start_slice(args: argparse.Namespace) -> None:
    set_slice_status(args.slice, "in_progress")
    print(f"started {args.slice}")


def finish_slice(args: argparse.Namespace) -> None:
    set_slice_status(args.slice, "done")
    print(f"finished {args.slice}")


def _set_phase_status(pdir: Path, status: str) -> str:
    data = read_json(pdir / "phase.json")
    old = data.get("status")
    data["status"] = status
    if status == "in_progress" and not data.get("started_at"):
        data["started_at"] = now_iso()
    if status == "done":
        data["completed_at"] = now_iso()
    write_json(pdir / "phase.json", data)
    return old


def set_phase_status(args: argparse.Namespace) -> None:
    if args.status not in PHASE_STATUSES:
        raise SystemExit(f"invalid phase status: {args.status}")
    pdir = require_phase(args.phase)
    old = _set_phase_status(pdir, args.status)
    append_event("phase_status_changed", phase=args.phase, old_status=old, new_status=args.status)
    rebuild_index_and_state()
    print(f"phase {args.phase}: {old} -> {args.status}")


def review_phase(args: argparse.Namespace) -> None:
    if args.verdict not in REVIEW_VERDICTS:
        raise SystemExit(f"verdict must be one of: {', '.join(sorted(REVIEW_VERDICTS))}")
    pdir = require_phase(args.phase)
    data = read_json(pdir / "phase.json")
    data["review"] = {"status": args.verdict, "reviewed_at": now_iso(), "reviewer": args.reviewer, "note": args.note}
    # Verdict drives phase status so the lifecycle stays consistent.
    status_map = {"pass": "done", "changes_requested": "in_progress", "blocked": "blocked"}
    new_status = status_map[args.verdict]
    if new_status == "done":
        data["completed_at"] = now_iso()
    data["status"] = new_status
    write_json(pdir / "phase.json", data)
    append_event("phase_reviewed", phase=args.phase, verdict=args.verdict, reviewer=args.reviewer)
    rebuild_index_and_state()
    print(f"phase {args.phase} review: {args.verdict} (status -> {new_status})")
    if args.verdict == "changes_requested":
        print("create fix slices, e.g.: python3 scripts/workflow.py new-slice --phase {0} --slice {0}.F1 --name \"...\" --kind fix".format(args.phase))
    elif args.verdict == "pass":
        print(f"phase {args.phase} is done and stays in active/. Do NOT archive a single phase now.")
        print("Archive all phases together with `archive-all` only once every active phase is done (the last review slice is complete).")


def cmd_next(args: argparse.Namespace) -> None:
    rebuild_index_and_state()
    state = read_json(WORKS / "state.json")
    waiting = state.get("waiting_on_operator")
    if waiting:
        kind = "slice" if "." in waiting else "phase"
        clear = f"set-slice-status {waiting} in_progress" if kind == "slice" else f"set-phase-status {waiting} in_progress"
        print(f"current_phase={state.get('current_phase')}")
        print(f"waiting_on_operator={waiting}")
        print(f"WAITING ON OPERATOR: {kind} {waiting} is pending [~] -- operator co-work needed (validation or an operator-run action).")
        print("Do not start, finish, or advance past it. Report what you need, then wait for the operator.")
        print(f"After the operator approves, clear it: python3 scripts/workflow.py {clear}")
        return
    current_slice = state.get("current_slice")
    if not current_slice:
        if state.get("current_phase"):
            print(f"current_phase={state['current_phase']}")
            print("no open slice in the current phase; review/archive it or create a new phase")
        else:
            print("no active slice; create a phase or promote deferred work")
        return
    sdir = require_slice(current_slice)
    print(f"current_phase={current_slice.split('.', 1)[0]}")
    print(f"current_slice={current_slice}")
    print(f"slice_path={sdir.relative_to(ROOT)}")
    print(f"next_slice={state.get('next_slice') or 'none'}")


def cmd_deferred(args: argparse.Namespace) -> None:
    rebuild_index_and_state()
    groups = deferred_jobs()
    print(f"open={len(groups.get('open', []))}")
    print(f"promoted={len(groups.get('promoted', []))}")
    print(f"dropped={len(groups.get('dropped', []))}")
    print("dashboard=works/deferred.md")


def next_deferred_id() -> str:
    max_n = 0
    for base in (DEFERRED_OPEN, DEFERRED_PROMOTED, DEFERRED_DROPPED):
        if not base.exists():
            continue
        for p in base.iterdir():
            m = re.fullmatch(r"D(\d+)", p.name)
            if m:
                max_n = max(max_n, int(m.group(1)))
    return f"D{max_n + 1}"


def defer_job(args: argparse.Namespace) -> None:
    did = args.id or next_deferred_id()
    ddir = DEFERRED_OPEN / did
    if ddir.exists():
        raise SystemExit(f"deferred job already exists: {did}")
    created = now_iso()
    data = {"id": did, "title": args.title, "status": "deferred", "source": args.source, "reason": args.reason, "trigger": args.trigger, "created_at": created, "promoted_to": None, "dropped_reason": None}
    write_json(ddir / "deferred.json", data)
    text = load_template("deferred_brief.md").replace("__DEFERRED_ID__", did).replace("__TITLE__", args.title)
    text = text.replace("## Why Deferred\n", f"## Why Deferred\n\n{args.reason}\n")
    text = text.replace("## Trigger to Promote\n", f"## Trigger to Promote\n\n{args.trigger}\n")
    write_text(ddir / "brief.md", text)
    append_event("deferred_created", deferred=did, source=args.source)
    rebuild_index_and_state()
    print(f"created deferred job {did}: {ddir.relative_to(ROOT)}")


def promote_deferred(args: argparse.Namespace) -> None:
    did = args.deferred_id
    ddir = DEFERRED_OPEN / did
    if not (ddir / "deferred.json").exists():
        raise SystemExit(f"open deferred job not found: {did}")
    data = read_json(ddir / "deferred.json")
    if not (ACTIVE / args.phase / "phase.json").exists():
        if not args.create_phase:
            raise SystemExit(f"phase does not exist: {args.phase}. Use --create-phase to create it.")
        ns = argparse.Namespace(phase=args.phase, name=args.phase_name or data["title"], objective=args.phase_objective or data["title"], order=None)
        new_phase(ns)
    pdir = require_phase(args.phase)
    order = _auto_order(pdir, args.order)
    sdir = create_slice(args.phase, args.slice, args.name or data["title"], args.kind, order, args.risk, source={"type": "deferred", "id": did, "path": str(ddir.relative_to(ROOT))}, depends_on=args.depends_on or [])
    plan_path = sdir / "plan.md"
    # plan.md has no template, so it may not exist yet; only prepend a separator when it does.
    sep = "\n---\n\n" if plan_path.exists() and plan_path.read_text(encoding="utf-8").strip() else ""
    with plan_path.open("a", encoding="utf-8") as f:
        f.write(f"{sep}## Promoted Deferred Context\n\n")
        f.write((ddir / "brief.md").read_text(encoding="utf-8"))
    data["status"] = "promoted"
    data["promoted_to"] = {"phase_id": args.phase, "slice_id": args.slice, "path": str(sdir.relative_to(ROOT))}
    write_json(ddir / "deferred.json", data)
    target = DEFERRED_PROMOTED / did
    if target.exists():
        raise SystemExit(f"promoted destination already exists: {target.relative_to(ROOT)}")
    shutil.move(str(ddir), str(target))
    append_event("deferred_promoted", deferred=did, phase=args.phase, slice=args.slice)
    rebuild_index_and_state()
    print(f"promoted {did} -> {args.slice}: {sdir.relative_to(ROOT)}")


def drop_deferred(args: argparse.Namespace) -> None:
    did = args.deferred_id
    ddir = DEFERRED_OPEN / did
    if not (ddir / "deferred.json").exists():
        raise SystemExit(f"open deferred job not found: {did}")
    data = read_json(ddir / "deferred.json")
    data["status"] = "dropped"
    data["dropped_reason"] = args.reason
    write_json(ddir / "deferred.json", data)
    target = DEFERRED_DROPPED / did
    if target.exists():
        raise SystemExit(f"dropped destination already exists: {target.relative_to(ROOT)}")
    shutil.move(str(ddir), str(target))
    append_event("deferred_dropped", deferred=did, reason=args.reason)
    rebuild_index_and_state()
    print(f"dropped {did}: {target.relative_to(ROOT)}")


def _phase_blockers(pdir: Path) -> list:
    """Reasons a phase is not cleanly archivable; empty list means ready."""
    phase = read_json(pdir / "phase.json")
    slices = [read_json(s / "slice.json") for s in slice_dirs(pdir)]
    reasons = []
    not_done = [s["id"] for s in slices if s.get("status") != "done"]
    if not_done:
        reasons.append(f"unfinished slices: {', '.join(not_done)}")
    review_status = phase.get("review", {}).get("status")
    if review_status != "pass":
        reasons.append(f"review is {review_status!r}, not pass")
    return reasons


def _archive_one(pdir: Path, forced: bool) -> Path:
    """Move a single phase folder to archived/, writing its manifest. No rebuild."""
    phase = read_json(pdir / "phase.json")
    phase_id = phase["id"]
    slices = [read_json(s / "slice.json") for s in slice_dirs(pdir)]
    review_status = phase.get("review", {}).get("status")
    base_name = f"{timestamp()}_{phase_id}_{slugify(phase.get('name', phase_id))}"
    archive_name = base_name
    suffix = 1
    while (ARCHIVED / archive_name).exists():
        suffix += 1
        archive_name = f"{base_name}_{suffix}"
    dest = ARCHIVED / archive_name
    manifest = {
        "phase_id": phase_id, "archived_at": now_iso(),
        "archive_reason": "forced" if forced else "phase_review_passed",
        "review_verdict": review_status,
        "source_path": str(pdir.relative_to(ROOT)), "archive_path": str(dest.relative_to(ROOT)),
        "slices": [s["id"] for s in slices],
    }
    write_json(pdir / "archive_manifest.json", manifest)
    shutil.move(str(pdir), str(dest))
    append_event("phase_archived", phase=phase_id, archive_path=str(dest.relative_to(ROOT)))
    return dest


def archive_phase(args: argparse.Namespace) -> None:
    # First-class single-phase archive: archive one review-passed phase on request.
    # Useful when only some phases are done. For the partial sweep of every done
    # phase use rotate-backlog; for the end-of-batch sweep of everything use
    # archive-all. --force is for exceptional cleanup of an unfinished phase only.
    pdir = require_phase(args.phase)
    if not args.force:
        reasons = _phase_blockers(pdir)
        if reasons:
            raise SystemExit(f"phase {args.phase} is not archivable ({'; '.join(reasons)}). Finish/review it, or use --force for exceptional cleanup.")
    dest = _archive_one(pdir, forced=args.force)
    rebuild_index_and_state()
    print(f"archived phase {args.phase}: {dest.relative_to(ROOT)}")


def archive_all(args: argparse.Namespace) -> None:
    # Batch-archive every active phase at once. Gated so archiving only happens
    # once the last review slice across all active phases is done.
    pdirs = phase_dirs()
    if not pdirs:
        print("no active phases to archive")
        return
    if not args.force:
        blockers = []
        for pdir in pdirs:
            reasons = _phase_blockers(pdir)
            if reasons:
                blockers.append(f"{read_json(pdir / 'phase.json')['id']}: {'; '.join(reasons)}")
        if blockers:
            print("not archiving: every active phase must be done (the last review slice complete) before a batch archive.")
            for b in blockers:
                print(f"- {b}")
            raise SystemExit("Finish the open phases first, or use --force for exceptional cleanup.")
    archived = []
    for pdir in pdirs:
        phase_id = read_json(pdir / "phase.json")["id"]
        dest = _archive_one(pdir, forced=args.force)
        archived.append((phase_id, dest))
    rebuild_index_and_state()
    print(f"archived {len(archived)} phase(s):")
    for phase_id, dest in archived:
        print(f"- {phase_id}: {dest.relative_to(ROOT)}")


def rotate_backlog(args: argparse.Namespace) -> None:
    # Partial rotation: archive every phase that is cleanly archivable right now
    # (all slices done with a passing review) and leave the rest active, then
    # rebuild the dashboards. This is the partial sweep archive-all cannot do,
    # since archive-all refuses unless EVERY active phase is done.
    pdirs = phase_dirs()
    if not pdirs:
        print("no active phases to rotate")
        return
    ready, blocked = [], []
    for pdir in pdirs:
        phase_id = read_json(pdir / "phase.json")["id"]
        (blocked if _phase_blockers(pdir) else ready).append((phase_id, pdir))
    if not ready:
        rebuild_index_and_state()
        print(f"no done phases to rotate; {len(blocked)} phase(s) still active: {', '.join(p for p, _ in blocked)}")
        return
    archived = []
    for phase_id, pdir in ready:
        dest = _archive_one(pdir, forced=False)
        archived.append((phase_id, dest))
    rebuild_index_and_state()
    print(f"rotated {len(archived)} done phase(s) to archived:")
    for phase_id, dest in archived:
        print(f"- {phase_id}: {dest.relative_to(ROOT)}")
    if blocked:
        print(f"left {len(blocked)} phase(s) active: {', '.join(p for p, _ in blocked)}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Manage the agentic workflow state.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("rebuild", help="Rebuild workflow dashboards/index/state and docs snapshots")
    p.set_defaults(func=lambda args: (rebuild_docs(), rebuild_index_and_state(), print("rebuilt workflow and docs")))

    p = sub.add_parser("rebuild-docs", help="Regenerate docs/current/*.md from docs/index.json latest versions")
    p.set_defaults(func=lambda args: (rebuild_docs(), print("rebuilt docs/current from latest versions")))

    p = sub.add_parser("docs", help="Print latest doc versions")
    p.set_defaults(func=cmd_docs)

    p = sub.add_parser("doc-new-version", help="Create a new durable doc version from the latest version")
    p.add_argument("--doc", required=True, choices=sorted(DOC_TYPES))
    p.add_argument("--summary", required=True)
    p.add_argument("--source", required=True)
    p.set_defaults(func=new_doc_version)

    p = sub.add_parser("validate", help="Validate workflow and docs structure")
    p.set_defaults(func=lambda args: sys.exit(validate()))

    p = sub.add_parser("next", help="Print the current phase/slice selection")
    p.set_defaults(func=cmd_next)

    p = sub.add_parser("deferred", help="Rebuild and print deferred jobs dashboard summary")
    p.set_defaults(func=cmd_deferred)

    p = sub.add_parser("new-phase", help="Create a new phase with DECOMP and REVIEW slices")
    p.add_argument("--phase", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--objective", required=True)
    p.add_argument("--order", type=float)
    p.set_defaults(func=new_phase)

    p = sub.add_parser("new-slice", help="Create a new slice folder with slice.json + markdown files")
    p.add_argument("--phase", required=True)
    p.add_argument("--slice", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--kind", default="implementation")
    p.add_argument("--risk", default="medium")
    p.add_argument("--order", type=float)
    p.add_argument("--depends-on", action="append")
    p.set_defaults(func=new_slice)

    p = sub.add_parser("start-slice", help="Mark a slice in_progress")
    p.add_argument("slice")
    p.set_defaults(func=start_slice)

    p = sub.add_parser("finish-slice", help="Mark a slice done")
    p.add_argument("slice")
    p.set_defaults(func=finish_slice)

    p = sub.add_parser("set-slice-status", help="Set any valid slice status")
    p.add_argument("slice")
    p.add_argument("status")
    p.set_defaults(func=lambda args: (set_slice_status(args.slice, args.status), print(f"slice {args.slice}: {args.status}")))

    p = sub.add_parser("set-phase-status", help="Set any valid phase status")
    p.add_argument("phase")
    p.add_argument("status")
    p.set_defaults(func=set_phase_status)

    p = sub.add_parser("review-phase", help="Record a phase review verdict (pass/changes_requested/blocked)")
    p.add_argument("phase")
    p.add_argument("--verdict", required=True, choices=sorted(REVIEW_VERDICTS))
    p.add_argument("--reviewer", default=None)
    p.add_argument("--note", default=None)
    p.set_defaults(func=review_phase)

    p = sub.add_parser("defer-job", help="Create a deferred job folder")
    p.add_argument("--id")
    p.add_argument("--title", required=True)
    p.add_argument("--reason", required=True)
    p.add_argument("--trigger", required=True)
    p.add_argument("--source", required=True)
    p.set_defaults(func=defer_job)

    p = sub.add_parser("promote-deferred", help="Promote an open deferred job into an active slice")
    p.add_argument("deferred_id")
    p.add_argument("--phase", required=True)
    p.add_argument("--slice", required=True)
    p.add_argument("--name")
    p.add_argument("--kind", default="implementation")
    p.add_argument("--risk", default="medium")
    p.add_argument("--order", type=float)
    p.add_argument("--depends-on", action="append")
    p.add_argument("--create-phase", action="store_true")
    p.add_argument("--phase-name")
    p.add_argument("--phase-objective")
    p.set_defaults(func=promote_deferred)

    p = sub.add_parser("drop-deferred", help="Drop an open deferred job")
    p.add_argument("deferred_id")
    p.add_argument("--reason", required=True)
    p.set_defaults(func=drop_deferred)

    p = sub.add_parser("archive-phase", help="Archive a single review-passed phase (first-class; use when only some phases are done)")
    p.add_argument("phase")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=archive_phase)

    p = sub.add_parser("archive-all", help="Batch-archive ALL active phases at once; only when every phase is done (last review slice complete)")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=archive_all)

    p = sub.add_parser("rotate-backlog", help="Archive every currently-done phase and leave in-progress phases active, then rebuild (partial archive-all)")
    p.set_defaults(func=rotate_backlog)

    args = parser.parse_args(argv)
    result = args.func(args)
    if isinstance(result, tuple):
        return 0
    return 0 if result is None else int(result or 0)


if __name__ == "__main__":
    raise SystemExit(main())
'''
write_text("scripts/workflow.py", WORKFLOW_PY, executable=True)

# ---- Agent surfaces: skills for both tools ----------------------------------
def claude_skill(name: str, desc: str, tools: str, body: str) -> str:
    return (
        "---\n"
        f"name: {name}\n"
        f"description: {desc}\n"
        f"allowed-tools: {tools}\n"
        "disable-model-invocation: true\n"
        "---\n\n"
        f"# {name}\n\n{body}"
    )


def codex_skill(name: str, desc: str, body: str) -> str:
    return (
        "---\n"
        f"name: {name}\n"
        f"description: {desc}\n"
        "---\n\n"
        f"# {name}\n\n{body}"
    )


def codex_openai_yaml(name: str, desc: str) -> str:
    return (
        "interface:\n"
        f"  display_name: \"{name}\"\n"
        f"  short_description: \"{desc}\"\n"
        f"  default_prompt: \"Use the {name} skill.\"\n"
        "policy:\n"
        "  allow_implicit_invocation: false\n"
    )


def codex_subagent_toml(name: str, desc: str, model: str, effort: str, sandbox: str, instructions: str) -> str:
    return (
        f'name = "{name}"\n'
        f'description = "{desc}"\n'
        f'model = "{model}"\n'
        f'model_reasoning_effort = "{effort}"\n'
        f'sandbox_mode = "{sandbox}"\n'
        'developer_instructions = """\n'
        + instructions
        + '"""\n'
    )


for s in COMMAND_SKILLS:
    write_text(f".claude/skills/{s['name']}/SKILL.md", claude_skill(s["name"], s["desc"], s["tools"], s["body"]))
    if s.get("claude_only"):
        continue  # do-whole-phase is Claude-only — Codex lacks plan mode for per-slice planning
    write_text(f".agents/skills/{s['name']}/SKILL.md", codex_skill(s["name"], s["desc"], s["body"]))
    write_text(f".agents/skills/{s['name']}/agents/openai.yaml", codex_openai_yaml(s["name"], s["desc"]))

# Claude Code subagent: full-permission worker that implements one already-planned slice.
_SLICE_EXECUTOR_DESC = "Executes exactly one already-planned slice in an isolated context; returns a structured verdict. Never commits and never transitions slice/phase status."


def claude_subagent_md(name: str, effort: str, description: str, body: str) -> str:
    # Effort is frozen in a subagent's frontmatter (Claude Code has no per-dispatch effort
    # override), so two definitions — slice-executor (xhigh, the default) and slice-executor-high
    # (high, for low-risk slices) — are the only way to vary it. Byte-identical except name /
    # effort / description; the orchestrator picks the variant by the slice's kind + risk.
    return (
        "---\n"
        f"name: {name}\n"
        f"description: {description}\n"
        "tools: Read, Edit, Write, Glob, Grep, Bash\n"
        "model: opus\n"
        f"effort: {effort}\n"
        "permissionMode: bypassPermissions\n"
        "---\n\n"
    ) + body


_SLICE_EXECUTOR_BODY = """You execute exactly ONE already-planned slice for this agentic workspace, in an isolated context. The orchestrator (main thread) has already written this slice's `plan.md`; your job is to carry it out, validate it, record the result, and report back. You handle every slice kind — implementation, `fix`, **decomposition**, and the phase **review**. You never commit and never transition slice/phase status. (Two carve-outs, each tied to one kind: while executing a **decomposition** slice you create the phase's middle slices with `new-slice`; while executing a **review** slice you create the phase's consolidated doc versions with `doc-new-version` — see *Do*. Even then you run no other state-transition command and never commit.)

## Inputs (read them yourself)

You are given the slice id and its folder path. Read the files yourself — do not expect their contents to be pasted:

- the slice's `plan.md` — your spec: the orchestrator's free-form native plan for this slice (it states the goal, the scope, and how to validate)
- the phase's `phase.md` (accumulated cross-slice notes, including the running "Doc impact" list) and its `intent.md` (the confirmed operator intent — read it if you are unsure what was asked)
- the slice's `slice.json`, the relevant `docs/current/*.md`, and the code you will change (for a **review** slice: every completed slice's `slice.json` + `result.md`, and `docs/index.json`)
- `AGENTS.md` / `CLAUDE.md` — honor every repo-specific safety rule there

## Do

1. Do the slice's job exactly as `plan.md` specifies:
   - **Implementation / `fix` slice:** make the code changes the plan calls for.
   - **Decomposition slice (`kind: decomposition`):** create the phase's middle slices with `python3 scripts/workflow.py new-slice --phase <P> --slice <P>.S<n> --name "..."` (add `--kind`, `--risk`, `--order`, `--depends-on` as the plan specifies). Create **bare folders only — never pre-fill their `plan.md`** (each slice fills its own when it runs).
   - **Review slice (`kind: review`):** review the whole phase. Validate all of its slices together (step 2), then judge the work against the phase objective, `intent.md`, the slices' `result.md`, and the docs, and decide a `review_verdict` — `pass`, `changes_requested` (numbered issues + proposed fix slices like `P1.F1`), or `blocked`. **Never edit source code on a review slice** — if the work needs code changes, that is a `changes_requested` with fix slices. Consolidate docs only on a `pass` (step 5).
2. Run the slice's validation (the validation called for in `plan.md`; for a decomposition slice that is `python3 scripts/workflow.py validate`; for a **review** slice, run every completed slice's validation commands from its `plan.md` / `result.md`, plus `python3 scripts/workflow.py validate`).
3. Write `result.md`: the validation commands and their outcomes, the doc versions you created (review slice) or the "Doc impact" notes you recorded (other slices), and any deviations from `plan.md`.
4. Append durable cross-slice notes (decisions, findings, gotchas) to the phase's `phase.md` so later slices build on what you learned. For a decomposition slice, record the slice breakdown (what each middle slice covers and why) here.
5. Docs are versioned **once per phase, at the review slice — never per slice**:
   - **A non-review slice that changes durable truth** (product / architecture / API / …): do **not** version docs — append a one-line note to the "Doc impact" running list in `phase.md` naming the doc(s) affected and what changed, so the review consolidates them.
   - **The review slice, on a `pass` only:** for each durable-truth area changed across the phase (per those "Doc impact" notes), run `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source <P>.REVIEW`, edit only the returned `edit_path`, run `python3 scripts/workflow.py rebuild-docs`, and report the versions — one per affected doc, capturing the whole phase. Never patch `docs/current/*.md` or an existing version.

## Never

- commit or push (no `git commit`, `git add`, `git push`);
- run workflow state-transition commands: `start-slice`, `finish-slice`, `new-phase`, `review-phase`, `set-slice-status`, `set-phase-status`, `archive-all`, `rotate-backlog`, `archive-phase` — the only workflow commands you may run are `new-slice` (decomposition slice only) and `doc-new-version` / `rebuild-docs` (review slice only);
- version docs on a non-review slice, or edit source code on a review slice (there you write only docs + `result.md` / `phase.md`);
- pre-fill another slice's `plan.md` (including the middle slices you create during decomposition);
- violate any repo-specific safety rule in `CLAUDE.md` / `AGENTS.md`.

The orchestrator trusts your `done` verdict (it re-runs only `validate`, not your tests), then runs `finish-slice` and commits — the phase review validates all slices together and consolidates the docs. Leaving state transitions and commits to the orchestrator is what keeps the slice boundary clean.

## Return exactly one structured verdict

End your final message with this block — it is data for the orchestrator, not a human-facing summary:

- `status`: `done` | `needs_operator` | `blocked` — whether you finished the slice's job
- `summary`: 1-3 sentences on what you did
- `files_changed`: the paths you created or edited
- `validation`: each command you ran and whether it passed (or the commands the orchestrator should run)
- `deviations`: where and why you departed from `plan.md`, or `none`
- `doc_impact`: (non-review slices) the one-line "Doc impact" note(s) you appended to `phase.md`, or `none`
- `doc_versions`: (review slice only) the consolidated doc versions you created, or `none`
- `review_verdict`: (review slice only) `pass` | `changes_requested` (numbered issues + proposed fix slices) | `blocked` (the blocker)
- `operator_need`: only if `status` is `needs_operator` — exactly what the operator must do or validate
- `blocker`: only if `status` is `blocked` — what is blocking and what input is needed
"""

write_text(".claude/agents/slice-executor.md", claude_subagent_md(
    "slice-executor", "xhigh", _SLICE_EXECUTOR_DESC, _SLICE_EXECUTOR_BODY))
write_text(".claude/agents/slice-executor-high.md", claude_subagent_md(
    "slice-executor-high", "high", _SLICE_EXECUTOR_DESC + " Lower-effort variant for low-risk slices.", _SLICE_EXECUTOR_BODY))

# ---- Codex subagent: the slice-executor (mirrors the Claude Code .claude/agents/ split) ----
# Codex spawns this from .codex/agents/ (https://developers.openai.com/codex/subagents):
# a full-permission slice-executor on gpt-5.5 that implements each slice and runs the phase review.
_SLICE_EXECUTOR_CODEX_DESC = "Executes exactly one already-planned slice in an isolated context; returns a structured verdict. Never commits and never transitions slice/phase status."
_SLICE_EXECUTOR_CODEX_INSTRUCTIONS = '''You execute exactly ONE already-planned slice for this agentic workspace, in an isolated context. The orchestrator (main thread) has already written this slice's `plan.md`; your job is to carry it out exactly, validate it, record the result, and report back. You handle every slice kind — implementation, `fix`, **decomposition**, and the phase **review**. You never commit and never transition slice/phase status. (Two carve-outs, each tied to one kind: while executing a **decomposition** slice you create the phase's middle slices with `new-slice`; while executing a **review** slice you create the phase's consolidated doc versions with `doc-new-version` — see *Do*. Even then you run no other state-transition command and never commit.)

## Inputs (read them yourself)

You are given the slice id and its folder path. Read the files yourself — do not expect their contents to be pasted:

- the slice's `plan.md` — your spec: the orchestrator's operator-approved plan for this slice (it states the goal, the scope, and how to validate)
- the phase's `phase.md` (accumulated cross-slice notes, including the running "Doc impact" list) and its `intent.md` (the confirmed operator intent — read it if you are unsure what was asked)
- the slice's `slice.json`, the relevant `docs/current/*.md`, and the code you will change (for a **review** slice: every completed slice's `slice.json` + `result.md`, and `docs/index.json`)
- `AGENTS.md` / `CLAUDE.md` — honor every repo-specific safety rule there

## Do

1. Do the slice's job exactly as `plan.md` specifies:
   - **Implementation / `fix` slice:** make the code changes the plan calls for.
   - **Decomposition slice (`kind: decomposition`):** create the phase's middle slices with `python3 scripts/workflow.py new-slice --phase <P> --slice <P>.S<n> --name "..."` (add `--kind`, `--risk`, `--order`, `--depends-on` as the plan specifies). Create **bare folders only — never pre-fill their `plan.md`** (each slice fills its own when it runs).
   - **Review slice (`kind: review`):** review the whole phase. Validate all of its slices together (step 2), then judge the work against the phase objective, `intent.md`, the slices' `result.md`, and the docs, and decide a `review_verdict` — `pass`, `changes_requested` (numbered issues + proposed fix slices like `P1.F1`), or `blocked`. **Never edit source code on a review slice** — if the work needs code changes, that is a `changes_requested` with fix slices. Consolidate docs only on a `pass` (step 5).
2. Run the slice's validation (the validation called for in `plan.md`; for a decomposition slice that is `python3 scripts/workflow.py validate`; for a **review** slice, run every completed slice's validation commands from its `plan.md` / `result.md`, plus `python3 scripts/workflow.py validate`).
3. Write `result.md`: the validation commands and their outcomes, the doc versions you created (review slice) or the "Doc impact" notes you recorded (other slices), and any deviations from `plan.md`.
4. Append durable cross-slice notes (decisions, findings, gotchas) to the phase's `phase.md` so later slices build on what you learned. For a decomposition slice, record the slice breakdown (what each middle slice covers and why) here.
5. Docs are versioned **once per phase, at the review slice — never per slice**:
   - **A non-review slice that changes durable truth** (product / architecture / API / …): do **not** version docs — append a one-line note to the "Doc impact" running list in `phase.md` naming the doc(s) affected and what changed, so the review consolidates them.
   - **The review slice, on a `pass` only:** for each durable-truth area changed across the phase (per those "Doc impact" notes), run `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source <P>.REVIEW`, edit only the returned `edit_path`, run `python3 scripts/workflow.py rebuild-docs`, and report the versions — one per affected doc, capturing the whole phase. Never patch `docs/current/*.md` or an existing version.

## Never

- commit or push (no `git commit`, `git add`, `git push`) — the orchestrator owns commits;
- run workflow state-transition commands: `start-slice`, `finish-slice`, `new-phase`, `review-phase`, `set-slice-status`, `set-phase-status`, `archive-all`, `rotate-backlog`, `archive-phase` — the only workflow commands you may run are `new-slice` (decomposition slice only) and `doc-new-version` / `rebuild-docs` (review slice only);
- version docs on a non-review slice, or edit source code on a review slice (there you write only docs + `result.md` / `phase.md`);
- pre-fill another slice's `plan.md` (including the middle slices you create during decomposition);
- violate any repo-specific safety rule in `CLAUDE.md` / `AGENTS.md`.

The orchestrator trusts your `done` verdict (it re-runs only `validate`, not your tests), then runs `finish-slice` and commits — the phase review validates all slices together and consolidates the docs. Leaving state transitions and commits to the orchestrator is what keeps the slice boundary clean.

## Return exactly one structured verdict

End your final message with this block — it is data for the orchestrator, not a human-facing summary:

- `status`: `done` | `needs_operator` | `blocked` — whether you finished the slice's job
- `summary`: 1-3 sentences on what you did
- `files_changed`: the paths you created or edited
- `validation`: each command you ran and whether it passed (or the commands the orchestrator should run)
- `deviations`: where and why you departed from `plan.md`, or `none`
- `doc_impact`: (non-review slices) the one-line "Doc impact" note(s) you appended to `phase.md`, or `none`
- `doc_versions`: (review slice only) the consolidated doc versions you created, or `none`
- `review_verdict`: (review slice only) `pass` | `changes_requested` (numbered issues + proposed fix slices) | `blocked` (the blocker)
- `operator_need`: only if `status` is `needs_operator` — exactly what the operator must do or validate
- `blocker`: only if `status` is `blocked` — what is blocking and what input is needed
'''
write_text(".codex/agents/slice-executor.toml", codex_subagent_toml(
    "slice-executor", _SLICE_EXECUTOR_CODEX_DESC,
    "gpt-5.5", "xhigh", "workspace-write", _SLICE_EXECUTOR_CODEX_INSTRUCTIONS,
))
write_text(".codex/agents/slice-executor-high.toml", codex_subagent_toml(
    "slice-executor-high", _SLICE_EXECUTOR_CODEX_DESC + " Lower-effort variant for low-risk slices.",
    "gpt-5.5", "high", "workspace-write", _SLICE_EXECUTOR_CODEX_INSTRUCTIONS,
))

# ---- Claude Code project settings: pre-approve the workflow manager ----------
write_json(".claude/settings.json", {
    "permissions": {
        "allow": [
            "Bash(python3 scripts/workflow.py:*)",
            "Read",
            "Edit",
            "Write",
            "Glob",
            "Grep",
        ],
        "deny": [
            "Bash(git push:*)",
            "Bash(rm -rf:*)",
        ],
    },
})

# ---- Codex project config (documentation + safe defaults) -------------------
write_text(".codex/config.toml", """# Project-scoped Codex notes for this agentic workspace.
#
# Codex reads instructions from AGENTS.md and discovers repo skills under
# .agents/skills/ automatically. The primary Codex config lives in your user
# home (~/.codex/config.toml); keep machine/account settings there.
#
# Subagents ship under .codex/agents/ (https://developers.openai.com/codex/subagents):
#   - slice-executor.toml       — gpt-5.5 / xhigh, implements one already-planned slice (and runs the phase review)
#   - slice-executor-high.toml  — gpt-5.5 / high, the same worker at lower effort for low-risk implementation/fix slices
# The orchestrator (main Codex thread) spawns the matching slice-executor to do each slice — picking
# slice-executor-high for a low-risk slice — including
# the phase review, where it also consolidates the phase's doc versions; it never implements a slice inline.
#
# Recommended user-level settings to pair with this workspace:
#
#   # Treat this repo root as the project root.
#   project_root_markers = [".git"]
#
#   # Subagent concurrency/depth defaults live in your user config:
#   [agents]
#   max_threads = 6
#   max_depth = 1

project_root_markers = [".git"]
""")

# ---- Generate dashboards/state from the source of truth, then self-check ----
def run_workflow(*workflow_args: str) -> None:
    subprocess.run([sys.executable, str(ROOT / "scripts" / "workflow.py"), *workflow_args], cwd=str(ROOT), check=True)


def write_version_marker() -> None:
    """Record provenance: which upstream commit this workspace is synced to.
    Informational only (the diff itself is always file-based); kept out of
    MANAGED_FILES so it never trips the fresh-install conflict guard."""
    marker = {
        "upstream_url": UPSTREAM_URL,
        "synced_commit": os.environ.get("SYNCED_COMMIT") or "bootstrap",
        "synced_at": now_iso(),
    }
    _atomic_write(ROOT / "works/.workspace-version.json", json.dumps(marker, ensure_ascii=False, indent=2) + "\n")


def flag_stale_skills() -> None:
    """Surface workspace-managed skill dirs that this version no longer ships, so
    the operator can remove them. A dir is "ours" only by a tool-specific marker
    (Claude SKILL.md sets `disable-model-invocation: true`; a Codex skill carries an
    `agents/openai.yaml`) — so the operator's own skills are not mislabeled. The
    expected set is per-tool: Codex excludes `claude_only` skills (e.g. do-whole-phase),
    so a workspace updated to this version flags its now-stale Codex copy. Never deletes."""
    claude_expected = {s["name"] for s in COMMAND_SKILLS}
    codex_expected = {s["name"] for s in COMMAND_SKILLS if not s.get("claude_only")}
    for base, expected in ((".claude/skills", claude_expected), (".agents/skills", codex_expected)):
        d = ROOT / base
        if not d.is_dir():
            continue
        for sub in sorted(d.iterdir()):
            if not sub.is_dir() or sub.name in expected:
                continue
            if base == ".claude/skills":
                try:
                    head = (sub / "SKILL.md").read_text(encoding="utf-8")[:400]
                except OSError:
                    continue
                ours = "disable-model-invocation: true" in head
            else:
                ours = (sub / "agents" / "openai.yaml").is_file()
            if ours:
                UPDATE_SUMMARY["stale"].append(f"{base}/{sub.name}")


def print_change_list() -> None:
    upd, add, mrg = UPDATE_SUMMARY["updated"], UPDATE_SUMMARY["added"], UPDATE_SUMMARY["merged"]
    print(f"  machinery updated: {len(upd)} file(s)")
    for path, added, removed in upd:
        print(f"    ~ {path}  (+{added}/-{removed})")
    if add:
        print(f"  added: {len(add)} file(s)")
        for path in add:
            print(f"    + {path}")
    if mrg:
        print(f"  merged (additive): {', '.join(mrg)}")
    print(f"  preserved (your work + docs, untouched): {len(UPDATE_SUMMARY['preserved'])} file(s)")
    print(f"  unchanged: {len(UPDATE_SUMMARY['unchanged'])} file(s)")
    if UPDATE_SUMMARY["stale"]:
        print(f"  stale workspace skills dropped upstream (remove manually?): {', '.join(UPDATE_SUMMARY['stale'])}")


if UPDATE:
    flag_stale_skills()

if DRY_RUN:
    pass  # previewed only — no rebuild/validate, no marker
elif UPDATE:
    if UPDATE_DOCS:
        run_workflow("rebuild")
        run_workflow("validate")
    else:
        # No docs subsystem here (retrofitted repo) — the docs rebuild would crash.
        run_workflow("next")
    write_version_marker()
elif RETROFIT and not INSTALL_DOCS:
    # The target owns docs/ — rebuild only the works side; do not run our docs
    # rebuild/validate against a foreign doc system.
    run_workflow("next")
    write_version_marker()
else:
    run_workflow("rebuild")
    run_workflow("validate")
    write_version_marker()

if DRY_RUN:
    print(f"DRY RUN (--update --dry-run) at {TARGET} — nothing written.")
    print_change_list()
    print("Re-run without --dry-run to apply.")
elif UPDATE:
    print(f"Update complete (--update) at {TARGET}")
    print_change_list()
    if not UPDATE_DOCS:
        print("  note: no docs subsystem here; skipped docs rebuild (ran 'next' only)")
    print(f"  provenance recorded: works/.workspace-version.json (synced_commit {os.environ.get('SYNCED_COMMIT') or 'bootstrap'})")
    print("The installer made no git changes. Review the diff (git status); commit once the operator approves.")
    print("Next: python3 scripts/workflow.py next")
elif RETROFIT:
    created, skipped, merged = (RETROFIT_SUMMARY["created"], RETROFIT_SUMMARY["skipped"], RETROFIT_SUMMARY["merged"])
    print(f"Retrofit complete (--into-existing) at {TARGET}")
    print(f"  created: {len(created)} new file(s)")
    print(f"  skipped (kept yours): {len(skipped)} file(s)")
    if merged:
        print(f"  merged (additive): {', '.join(merged)}")
    print(f"  docs subsystem: {'installed' if INSTALL_DOCS else 'skipped (target already has a docs/ system)'}")
    print(f"  works subsystem: installed; seeded phase P1 - {PHASE_NAME}")
    if not INSTALL_DOCS:
        print("  note: docs versioning not installed; skipped docs rebuild/validate")
    print("The installer made no git changes. Review the diff (git status); commit the adoption once the operator approves.")
    print("If CLAUDE.md/AGENTS.md already existed, reconcile the *.workspace.md sidecar(s); add __pycache__/ to .gitignore.")
    print("Next: python3 scripts/workflow.py validate && python3 scripts/workflow.py next")
else:
    print(f"Bootstrapped cross-tool agentic workspace at {TARGET}")
    print("Contracts: CLAUDE.md and AGENTS.md (equivalent)")
    print("Claude Code: skills in .claude/skills/ (e.g. /do-next-slice), subagent .claude/agents/slice-executor.md, settings .claude/settings.json")
    print("Codex: skills in .agents/skills/ (e.g. $do-next-slice), subagent .codex/agents/slice-executor.toml, instructions AGENTS.md")
    print("Any agent / CI: python3 scripts/workflow.py <command>")
    print("Canonical state: phase.json / slice.json / deferred.json; generated: works/backlog.md, works/deferred.md")
    print("Versioned docs: docs/versions/<doc>/vNNNN_*.md with generated docs/current/*.md")
    print(f"Created initial phase: P1 - {PHASE_NAME}")
    print("Next: python3 scripts/workflow.py next   (or /do-next-slice in Claude Code)")
PY
