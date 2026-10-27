---
name: promote-deferred
description: Promote a deferred job into an active phase or slice.
allowed-tools: Bash(python3 scripts/workflow.py:*)
disable-model-invocation: true
---

# promote-deferred

Run `python3 scripts/workflow.py promote-deferred $ARGUMENTS` (for example `92 --phase 46 --slice P46-k2.S2 --name "..."`; add `--create-phase --phase-name "..." --phase-objective "..."` to start a new phase, leaving out `--phase` so the engine mints its id, and name the slice by its bare suffix, `--slice S1`).

The job and the phase take any brief form: `92`, `D92` or `92-x4`, `D12`, `m3xa` or `D-m3xa`; `46`, `P46` or `46-k2`, `P12`, `7kq2` or `P-7kq2`. A number names the one id carrying it and is refused, the ids listed, when two share it: type the tail then. `--create-phase --phase 46` reuses the one existing `P46` or `P46-<tail>` and creates `P46` only when none exists. `--slice` is the full new slice id (`P46-k2.S2`) or its bare suffix (`S2`); in a phase being minted only the suffix can name it.

This moves the job from `works/deferred/open/` to `works/deferred/promoted/`, creates a slice folder, and carries the deferred context into the slice brief.
