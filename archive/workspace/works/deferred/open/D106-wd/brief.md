# Deferred: D106-wd Listen audio cleanup: orphaned rows and files

## Context

## Why Deferred

Deleting a document leaves its listen_* rows and .audio part files on the box disk, and nothing collects parts no unit references any more. Unreachable behind the readability gate, but the disk grows.

## Trigger to Promote

The box disk budget tightens, or a document-delete or retention pass is planned

## Notes

