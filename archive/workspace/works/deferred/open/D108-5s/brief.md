# Deferred: D108-5s Reader pagehide beacon has no edge route in production

## Context

## Why Deferred

web/src/components/reader/use-reading.ts sends navigator.sendBeacon('/api/reader/position'), a Next route handler, but deploy/knowledge.conf has no location for it, so production sends it to location /api/ (FastAPI), which has no such route. The pagehide save likely 404s; the server-action saves are unaffected. Seen while planning P41-sr.B2, outside its phase.

## Trigger to Promote

Next deploy-config change, or the reader's last position on leaving is found stale on production

## Notes

