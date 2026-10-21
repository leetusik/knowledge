# Deferred: D61 Migration and smoke raw checks tolerate Cloudflare email obfuscation

## Context

## Why Deferred

migrate_books.py verify flagged 4 raw hash changes (docs 27, 29, 37, 50) that were Cloudflare's per-response data-cfemail rewrite, not content changes; the check should normalise or compare the index's raw_html

## Trigger to Promote

The next use of migrate_books.py or a raw-content smoke check

## Notes

