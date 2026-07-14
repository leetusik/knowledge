# Phase P9: Production deploy GitHub Action for the knowledge API

_Intent: see [intent.md](intent.md)._

## Objective

Add a manual (workflow_dispatch) production-deploy GitHub Action mirroring hi2vi_web's deploy-production.yml: SSH into the shared OCI box, redeploy the knowledge-api container from main with an on-box ARM build + health gate + rollback, and re-apply the edge vhost (deploy/knowledge.conf -> /home/opc/edge/conf.d/ + the edge's own deploy.sh reload). Must handle the publish-on-write wrinkle unique to this repo (the box clone at /opt/knowledge also makes and pushes agent commits) so a deploy never discards an unpushed doc or force-moves the checkout. Replaces today's hand-run SSH redeploy with a repeatable, auditable flow. DECOMP proposes the detailed deploy-script shape + GitHub secret provisioning for operator sign-off.

## Context

## Decomposition

_Slice breakdown and rationale — filled by the `P9.DECOMP` slice._

## Findings & Notes

_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._

## Constraints

## Open Questions

-
