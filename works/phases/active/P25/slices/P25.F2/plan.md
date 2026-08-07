# Plan — P25.F2: dashboard org-slug hint — changing a claimed slug breaks previously shared links

## Why (Review Finding 2, minor)

The dashboard's Public URL panel makes changing a claimed slug a one-keystroke action, and the phase deliberately ships **no slug-history redirects** (phase.md Q3): changing the slug breaks every previously shared pretty link. The panel's hint copy never says so.

## The fix — copy only, one file

In `web/src/content/dashboard.ts`, extend the existing `DASHBOARD.orgSlug.hint` string (find the `orgSlug` section S5 added) so it also warns, in one short sentence, that changing an already-set slug breaks links that were shared under the old one. Match the surrounding copy's tone (plain, terse). Do not add new keys, do not touch any component, do not touch any other file.

## Validation

- `cd web && npm run typecheck` (a string edit can't break it, but it is the cheap gate) and `cd web && npm run test` (baseline 15 files / 85 tests — unchanged expected).
- `python3 scripts/workflow.py validate`.
- Append one "Doc impact" line to `phase.md` (experience.md: the slug-change warning is surfaced in the panel copy).

## Boundaries

This is a one-string edit. If it turns out to require anything more — a component change, a second file, layout work — return `escalate` with what you found instead of doing it.
