# Deferred: D60 no-transform on the server's /app raw routes

## Context

## Why Deferred

D37's Cache-Control no-transform landed only on the web relays (P30.S25); GET /app/documents/{id}/raw and its version route still let Cloudflare rewrite explainers (email obfuscation seen live after the P30 deploy, random per response)

## Trigger to Promote

The next change to the raw routes or the edge

## Notes

