# Deferred: D11 Production Deploy: reconcile box clone before invoking deploy.sh (self-upgrade trap)

## Context

## Why Deferred

deploy.sh reconciles /opt/knowledge to the target commit INSIDE itself, so any change to its own health-gate/service set (P14: site->web) means the still-old on-box deploy.sh health-gates a service the new compose removed -> the dispatch fails, and only its reconcile updates deploy.sh for the NEXT run. Cost this deploy one wasted re-dispatch.

## Trigger to Promote

next time the deploy machinery's compose service set or health-gate changes

## Notes

