# Deferred: D51 Redirect past-version page to the reader and retire the old print layer

## Context

## Why Deferred

The /documents/{id}/versions/{v} page still uses print-blocks.tsx, export-pdf-button.tsx and kb-print.css part 4; redirecting it made Next emit a nonce-less script that the CSP blocks (P30.S26 OQ178)

## Trigger to Promote

The nonce-less page script is fixed, or the next change to the version page

## Notes

