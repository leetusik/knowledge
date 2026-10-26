---
name: rotate-backlog
description: "One invocation cleans up every done phase: it archives what is already clean, pays all the doc debt through one docs phase it creates (replacing one that has not started) or resumes, and runs (looping until nothing owes), goes around parked work, and archives every paid phase. It stops only for running work or for uncommitted product edits beside parked work. The word archive-only keeps the plain archive-and-report path; the word gate restores the approval loop."
argument-hint: "[archive-only] [gate]"
allowed-tools: Bash(python3 scripts/workflow.py:*), Read, Edit, Write, Glob, Grep, Bash, Agent
disable-model-invocation: true
---

# rotate-backlog

One invocation cleans up every done phase. It archives the phases that already owe nothing at once, then pays the rest of the doc debt: it replaces a live docs phase that has not started with one new docs phase paying all of it, resumes one that has started (the new debt waits for it), or creates the one docs phase that pays it (the invocation is the operator's yes), runs it end to end on the default stream, asks the engine again, and loops until nothing owes. Then it archives every paid phase, the docs phases included.

It goes around **parked** work (a `pending` or `blocked` phase or slice, a slice with `changes_requested`): the docs phase runs ahead of it and never touches it, and the report lists it. That is safe because a docs phase writes only workflow docs and the engine has checked that the product tree is clean; a `/do-whole-phases` run parks only an open acceptance gate. It stops only for **running** work (a slice `in_progress` or `in_review`, a phase `in_review`) or for uncommitted product edits beside parked work. A re-run at any point resumes from the live docs phase.

The engine decides; this skill runs the chain. `python3 scripts/workflow.py rotate-backlog` prints one decision as its **first stdout line**, `rotate=<branch>`, and the branches below follow it. Archiving stays whole-phase only and never uses `--force`: to archive an unfinished phase, use `archive-phase <P> --force` by hand.

## Procedure

1. **`archive-only` in the invocation args:** run `python3 scripts/workflow.py rotate-backlog --archive-only`, relay its report, and **STOP**. That is the plain archive-and-report path: it creates, reorders and runs nothing, and it is not refused on a parallel stream.

2. **Otherwise run the engine** and read its **stdout before its exit code** (`refused` exits 1):

   ```sh
   python3 scripts/workflow.py rotate-backlog
   ```

   Every branch but `refused` first archives the phases that are cleanly archivable (never one that owes docs). `archive` lists them in its sweep report; the other four branches print, after the first line and before the branch's own lines:
   - `archived=<ids>` when it moved any. Relay and commit it first (`chore(works): archive <ids> with rotate-backlog`). It may name a phase the docs phase has just paid, because `docs-consolidated` makes it archivable on the next run.
   - one `parked=<id> status=<status>[ stop_kind=<kind>]` per parked item (a blocked or `changes_requested` item has no `stop_kind`). Relay each; touch none.

   **Every commit of the run, the docs phase's slice commits included, names its own paths** (the phases it archived, created, replaced or ran, and the regenerated files under `works/`; `git add -- <path>` of a replaced phase's folder stages its removal) and leaves the parked phases' folders out: `git add -- <paths>`, then `git commit -- <paths>`, never `git add -A`.

   Branch on the first line as a prefix:

   - **`rotate=refused`** (`rotate=refused stream=<branch>`): this checkout is a parallel stream. Relay the line and the stderr message, tell the operator to run `/rotate-backlog` from the main checkout, and **STOP**. Nothing was written.

   - **`rotate=archive`**: nothing owes and no docs phase is live. Relay the sweep report verbatim (`rotated <n> done phase(s) to archived:` with its `- <P>: <path>` lines, or `no done phases to rotate…`, or `no active phases to rotate`), plus any `docs_phase_elsewhere=` line (a docs phase on another stream that is not resumed here). Commit the archive (`chore(works): archive <ids> with rotate-backlog`), or commit nothing when nothing was rotated. Report and end the run.

   - **`rotate=stop_midflight`** (`midflight=<id>:<status>, …`): a docs phase is owed or live, and default-stream work is running right now (the list holds running items only). Relay `midflight=`, `archived=` (commit it), the `parked=` lines, `stopped_before=` and the closing line. Nothing was created, replaced or reordered. **STOP**; a re-run once no listed slice is `in_progress` or `in_review` and no listed phase is `in_review` goes on.

   - **`rotate=stop_uncommitted`** (`uncommitted=<n>`): something is parked and the product tree holds uncommitted edits, which a parked item may own and the docs phase's commits would take. Relay `uncommitted=` with its path lines, `archived=` (commit it), the `parked=` lines, `stopped_before=` and the closing line. Nothing was created, replaced or reordered. **STOP**: the operator commits or stashes those edits, then re-runs. A workspace without git never prints this.

   - **`rotate=replace`** (`rotate=replace replaced=<ids>`): every live docs phase is unstarted (none of its docs slices is past `ready`; a done `DECOMP` wrote only a plan) and new debt stands that none pays. The engine removed each one's folder (`docs_phase_replaced=<P> (paid <ids>; …)`, logged; the workspace's git history keeps it) and printed one proposal covering all the debt, the replaced phases' and the new. Relay the `docs_phase_replaced=` lines, then run the `create` branch's steps 1-4, its commit also staging each removed folder, with the message `chore(works): replace <old> with <P> with rotate-backlog`.

   - **`rotate=resume`** (`rotate=resume docs_phase=<P>`): a docs phase is live and either has started (a docs slice past `ready`, so it has written doc versions or is about to) or nothing new owes. Relay any `docs_phase_covered=` and `docs_debt_waiting=` lines, in every case.
     1. A started docs phase is never replaced: it runs as it is, `docs_debt_waiting=` names the debt it does not pay, and the loop (step 3 of the procedure) creates one more docs phase for that once this one is `done`, or the next `/rotate-backlog` does if this invocation has already created one.
     2. **Commit whenever a `docs_phase_order=<P> <old> -> <new>` line was printed**, before the docs phase runs: the engine re-asserted the queue jump in `phase.json`. Name the docs phase's `phase.json` and the `works/` files the engine rewrote, with the message `chore(works): move <P> ahead with rotate-backlog`. When it was not printed, nothing changed: commit nothing.
     3. **Run the docs phase `<P>` end to end per the `do-whole-phase` skill, in `auto`.** `python3 scripts/workflow.py next` now points at it (it sorts first by order); its `WAITING ON OPERATOR` for a parked item is not the run's stop while the docs phase sorts first. The `/rotate-backlog` invocation is the explicit `auto` that the contract's decomposition carve-out requires, so the docs phase's `DECOMP` plans inline; `gate` in the invocation args restores the approval loop instead. Its acceptance gate is normally `--waive`d at the `DECOMP` boundary. Every normal stop ends the run (`pending`, `needs_operator`, `blocked`, a failed or empty high return, a non-passing review): report where it stopped and that the next `/rotate-backlog` resumes from there.
     4. When the docs phase is `done`, go to the loop (step 3 of the procedure).

   - **`rotate=create`**: a docs phase is owed and none is live.
     1. **Show the proposal** so the operator sees what is being created: `docs_phase_proposal=`, `phase=`, `name=`, `objective=`, and the `scope:` line's `python3 scripts/workflow.py docs-debt` in a few lines (the phases, the note count, the docs). Relay any `docs_phase_covered=` line.
     2. **Run the printed `create:` line exactly as printed.** Its `--order` is the queue jump ahead of planned work. The `/rotate-backlog` invocation is the operator's yes for the engine-drafted name, objective and scope: no pause, no narrowing, no editing. Read the new phase id `<P>` from the `phase=` line and keep it for the rest of the invocation, across a compaction too: this run has created its one docs phase. Relay any parallel `hint:` the engine prints; never act on it.
     3. **Fill `works/phases/active/<P>/intent.md`** as the `create-phase` skill's *docs-phase route* says, which stays the source of truth: origin `operator`; under *Original Input (verbatim)*, the `/rotate-backlog` invocation; under *Confirmed Intent*, the engine-drafted name and objective and the `docs-debt` scope; and the cut the phase's `DECOMP` will make, written down and not made: one `--kind docs` slice per doc, `doc-new-version` then `rebuild-docs` per note, and the payment per covered phase as `docs-debt`'s `pay:` line says (`docs-consolidated <P>`, or `parallel-consolidated <P>`), with the acceptance gate `--waive`d at the `DECOMP` boundary.
     4. **Commit** (`chore(works): create <P> with rotate-backlog`), then continue as `resume` from its step 3.

3. **Loop.** After each docs phase is `done`, run `python3 scripts/workflow.py rotate-backlog` again. Whatever its first line, relay and commit any `archived=` line and relay any `parked=` lines as in step 2, then branch on the first line:
   - `rotate=archive`: the `archive` branch above; the run ends.
   - `rotate=resume`: another docs phase is live; the whole `resume` branch above, its relay and steps 1-4.
   - `rotate=replace`: the `replace` branch above, only if this invocation has created no docs phase yet; otherwise relay it, commit the removal (`chore(works): replace <old> with rotate-backlog`) and end the run, and the next `/rotate-backlog` proposes the docs phase.
   - `rotate=create`: the `create` branch above, only if this invocation has created no docs phase yet; otherwise relay it and end the run, and the next `/rotate-backlog` takes that step.
   - anything else (`stop_midflight`, `stop_uncommitted`, `refused`): its branch above; the run ends.

   An invocation creates at most one docs phase, and each docs phase ends `done` or stops the run, so the loop is finite.

## Rules

- The docs phase runs on the **default stream** only, like every docs phase: `doc-new-version` and the payment commands run nowhere else. Never ask for a worktree, and relay without acting on any parallel-run hint `new-phase` or `next` prints.
- Create the docs phase only through the printed `create:` line, as printed. Never narrow, edit or re-word it, and never run `--force`, `archive-phase` or `archive-all` on the operator's behalf.
- Never touch a parked item: not its status, not its folder in a commit, not the files it owns.
- Every stop is reported with the exact engine line that caused it.
- `archive-only` never creates or runs anything.
