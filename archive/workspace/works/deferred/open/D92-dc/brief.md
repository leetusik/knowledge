# Deferred: D92-dc phase-section --to-topic leaves relative links stale in the moved block

## Context

## Why Deferred

a link written relative to phase.md points one level off from topics/; DECOMP2, F6 and the orchestrator fixed moved links by hand. A workspace engine bug: the fix belongs in the bootstrap repo

## Trigger to Promote

the next --to-topic move of an entry with a relative link, or the next engine change in the bootstrap repo

## Notes

