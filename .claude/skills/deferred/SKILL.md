---
name: deferred
description: Rebuild and show the deferred jobs dashboard.
allowed-tools: Bash(python3 scripts/workflow.py:*)
disable-model-invocation: true
---

# deferred

Run `python3 scripts/workflow.py deferred`. Then read `works/deferred.md` if you need the human-readable dashboard. It lists jobs in id order: numbered ids by number (`D2` before `D10`, `D92` before `D92-x4`) first, then v73 ids (`D-m3xa`) by creation time.
