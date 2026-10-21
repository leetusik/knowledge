# Deferred: D37 Stop Cloudflare rewriting framed explainers: Cache-Control no-transform on the raw relay

## Context

## Why Deferred

Cloudflare's edge injects its Web Analytics beacon (runs inside the sandbox, reports private document views by id) and email obfuscation into /api/documents/{id}/raw and the versions raw route; the relay already sends no-store, so add no-transform there; that it stops both is unverified against Cloudflare docs

## Trigger to Promote

operator picks turning it off at the P28 walkthrough, or the next change to the raw relay

## Notes

