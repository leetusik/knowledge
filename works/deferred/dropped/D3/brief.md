# Deferred: D3 Revoke orphan GitHub deploy key 157264706 (knowledge-api@oci) + delete its stray private half from the repo working tree

## Context

## Why Deferred

P8.F2 found a live write-capable deploy key whose private half sits untracked at ./knowledge_deploy_key (never committed; now gitignored). It is redundant — the box authenticates with knowledge-api@oci-box (157267945). Revocation + local deletion are operator-only actions (credential revocation / irreversible local deletion).

## Trigger to Promote

operator runs: gh repo deploy-key delete 157264706 -R leetusik/knowledge && rm -f knowledge_deploy_key knowledge_deploy_key.pub

## Notes

