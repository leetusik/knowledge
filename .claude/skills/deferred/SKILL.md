---
name: deferred
description: Rebuild and show the deferred jobs dashboard.
allowed-tools: Bash(python3 scripts/workflow.py:*)
disable-model-invocation: true
---

# deferred

Run `python3 scripts/workflow.py deferred`. Then read `works/deferred.md` if you need the human-readable dashboard. It lists jobs in id order: numbered ids (`D2` before `D10`) first, then minted ones (`D-m3xa`) by creation time.
