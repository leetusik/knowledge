# Deferred: D24 Version durable docs for the automated alembic step in deploy.sh (operations/data/decisions still say manual)

## Context

## Why Deferred

Hotfix after the P25 deploy failure: deploy.sh step 3b now runs alembic upgrade head in a one-shot api-service container before the api force-recreate. docs/current/operations.md, data.md, and decisions.md still document the migration as a manual on-box step — durable-doc drift that needs consolidation into new versions.

## Trigger to Promote

Next phase review (fold into its Doc impact consolidation), or the next deploy-machinery phase

## Notes

