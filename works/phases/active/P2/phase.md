# Phase P2: Track 2 — DB-backed document API

_Intent: see [intent.md](intent.md)._

## Objective

Build the DB track of the two-track knowledge store: SQLite (FTS5) document store + FastAPI service with read/list/search/reindex endpoints and an API-owned write path (docs/-convention file + Recent-marker update + DB upsert + scoped git commit), containerized as compose service 'api' on port 8766 beside the mkdocs viewer, so the /explain skill can POST documents instead of writing files. docs/ stays canonical; reindex rebuilds the DB from files.

## Context

## Decomposition

_Slice breakdown and rationale — filled by the `P2.DECOMP` slice._

## Findings & Notes

_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._

## Constraints

## Open Questions

-
