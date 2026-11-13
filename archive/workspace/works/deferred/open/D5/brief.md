# Deferred: D5 Refresh the public explainer docs/hi2vi_web/2026-07-02-shared-nginx-explained.md — it describes a superseded edge topology

## Context

## Why Deferred

P8.F2 found the box no longer runs the shared changple5-nginx-1 edge: the dedicated 'Option B' edge (project 'edge', read-only conf.d/certs bind mounts, own deploy.sh) is live, which the explainer itself proposed as the fix. The published doc now teaches a topology that no longer exists, and its 'wiped by every changple5 deploy' fragility warning is void.

## Trigger to Promote

operator wants the public explainer to match reality (it is a content doc, out of scope for P8's durable-doc versioning)

## Notes

