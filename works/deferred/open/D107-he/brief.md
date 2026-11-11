# Deferred: D107-he Listen part grouping that stays stable across edits

## Context

## Why Deferred

Parts merge sections greedily up to the ~10 min cap, so an edit that pushes one part over the cap regroups every later part of the document and re-renders them, against the intent that an edit re-renders only what changed.

## Trigger to Promote

Re-rendering after edits is noticeably slow or wasteful on the Mac runner

## Notes

