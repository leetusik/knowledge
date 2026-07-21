# Phase P18: Accounts v2: user/org/project with org-level keys

_Intent: see [intent.md](intent.md)._

## Objective

Restructure the accounts plane to an explicit user → org → project model: signup auto-provisions a "default" org and "default" project; API keys become mintable at org level (making today's de-facto tenant-wide enforcement honest); project resolution is get-or-create by name; knowledge save keeps the repo-basename default with a --project override and "default" fallback. Org creation + member invites stay out of scope (deferred).

## Context

## Decomposition

_Slice breakdown and rationale — filled by the `P18.DECOMP` slice._

## Findings & Notes

_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._

## Constraints

## Open Questions

-
