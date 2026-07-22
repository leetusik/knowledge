# Deferred: D16 knowledge init --project other re-mints an org key (reuse-gate relaxation)

## Context

## Why Deferred

S4 preserved the init reuse-gate structure verbatim, so a recorded-project change still mints a fresh org key even though org keys are not project-bound — mild tension with one-key-all-repos. Relax the gate to reuse an existing org key across projects.

## Trigger to Promote

next CLI onboarding slice (e.g. P20) or operator reports duplicate org keys

## Notes

