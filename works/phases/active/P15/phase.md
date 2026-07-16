# Phase P15: Agent-facing retrieval MCP service (search-as-a-service)

_Intent: see [intent.md](intent.md)._

## Objective

Expose knowledge retrieval as an MCP server over HTTP so external AI agents consume search-as-a-service: a search tool (query -> ranked title/snippet/url hits, corpus-scoped) plus optional fetch_document, authed by project (vk_) keys over Streamable-HTTP/SSE, backed by the existing frozen /api/search + embeddings. Realizes deferred D6; first consumer is the hi2vi customer-service chatbot (OpenClaw).

## Context

## Decomposition

_Slice breakdown and rationale — filled by the `P15.DECOMP` slice._

## Findings & Notes

_Durable findings and cross-slice notes; `DECOMP` seeds this, and each slice appends when it finishes._

## Constraints

## Open Questions

-
