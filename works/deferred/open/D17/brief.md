# Deferred: D17 Rate-limit the anonymous read surface (public doc/raw/graph)

## Context

## Why Deferred

P19 shipped the product's first anonymous read paths (GET /app/documents/{id}, /raw, /app/graph?org=) with no per-IP throttle; only /auth/* is rate-limited today.

## Trigger to Promote

Before promoting public links to real traffic, or at first sign of scraping/abuse on the anonymous surface

## Notes

