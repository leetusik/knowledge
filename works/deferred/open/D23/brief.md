# Deferred: D23 Bound the Gemini embed on the publish worker

## Context

## Why Deferred

A stalled embed blocks the single FIFO publish worker and every queued push behind it until restart; writes stay durable — availability of the off-box backup, not correctness

## Trigger to Promote

When adding timeouts/retries to embeddings or touching server/publish.py next

## Notes

