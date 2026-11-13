# Deferred: D7 Off-box backup/snapshot for on-box-only tenant content (tenants/<uuid>/)

## Context

## Why Deferred

Non-#1 tenant content lives in a gitignored tenants/<uuid>/ tree on the box — no git backup and no published site (P10 has no per-tenant sites). If the box disk is lost, non-#1 corpora are unrecoverable. Tenant #1 stays safe via the git-published docs/ tree.

## Trigger to Promote

Before any non-#1 tenant carries real data at scale (i.e., before onboarding real active non-operator tenants).

## Notes

