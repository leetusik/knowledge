# Deferred: D35 scripts/site_smoke.py fails on a clean checkout

## Context

## Why Deferred

OUTSIDE P28's boundary, found while classifying the regression checklist: discover_projects() wants a non-index.md *.md in each docs/<project>/, and the tree's only non-index document is .html, so the smoke and its site/graph.json count check are red for everyone.

## Trigger to Promote

The next docs-site or QA phase

## Notes

