# Deferred: D4 Agent-published commits are authored kb-api <kb-api@localhost> in public repo history

## Context

## Why Deferred

The Dockerfile's system git identity (pre-existing, untouched by P8) means every doc the hosted API publishes to main carries a placeholder localhost identity. Harmless but unattributable; a one-line Dockerfile/env change if the operator wants real attribution.

## Trigger to Promote

operator decides they want attributable agent commits

## Notes

