---
name: defer-job
description: Park work as a deferred job folder, outside active backlog selection.
allowed-tools: Bash(python3 scripts/workflow.py:*)
disable-model-invocation: true
---

# defer-job

Run `python3 scripts/workflow.py defer-job $ARGUMENTS` (for example `--title "..." --reason "..." --trigger "..." --source P-7kq2.S1`).

Leave out `--id`: the engine mints the job's id (`D-m3xa`) and prints it on the `created deferred job` line; never pick a number. An id you give is either shape (`D12`, `D-m3xa`) and is refused when any deferred folder holds it.

Deferred jobs are stored under `works/deferred/open/<DID>/` and never affect next-slice selection until promoted.
