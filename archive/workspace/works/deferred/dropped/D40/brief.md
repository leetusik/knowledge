# Deferred: D40 Explainer reporter: measureAt can loop with a document that mutation-observes <html>

## Context

## Why Deferred

F4's paper emulation writes an inline style on <html> twice per post; a document whose MutationObserver watches <html> attributes and changes layout in response loops the reporter until the per-width budget latches, then a later growth at that width leaves a stale frame with an inner scroll (probe: 300 posts <12s, maxTop 374); none of docs 25-33 nor the /explain template does this; fix: cap measureAt per width separately from the posting budget, correct the header comment

## Trigger to Promote

the /explain template or any framed document gaining a MutationObserver, or an explainer seen churning or stale after load

## Notes

