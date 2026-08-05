# Phase P24: Upload finish-return timeout

_Intent: see [intent.md](intent.md)._

## Objective

Fix the changple5→knowledge prod upload experience where the document saves but the client reports a disconnect because it never receives the finish response in time — confirm the 5s client timeout vs synchronous git commit/push in POST /api/documents, then make the finish response reliable and its reporting honest.

## Context

## Decomposition

_Slice breakdown and rationale — filled by the `P24.DECOMP` slice._

## Findings & Notes

_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._

## Constraints

## Open Questions

-
