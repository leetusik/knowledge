# Deferred: D8 usage_events retention/cleanup job

## Context

## Why Deferred

P11 stores usage as an unbounded event log (operator-chosen grain); observability-only + low volume, so a retention/cleanup job is deferred until table growth becomes material

## Trigger to Promote

usage_events growth becomes material / before onboarding high-volume non-#1 tenants

## Notes

