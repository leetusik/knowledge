---
doc_id: security
version: v0002
created_at: 2026-07-08T21:52:17+09:00
source: P4.REVIEW
summary: P4: publish-safe source metadata sanitizer, no local paths on public surface
previous: v0001_bootstrap
---

# Security

## Status

Personal, single-operator knowledge base. The threat model is modest — no multi-tenant data, no customer PII — but P4 hardened the **public-surface hygiene**: nothing on the published GitHub Pages site or the API leaks the author's local filesystem.

## Purpose

Use this doc for auth, authorization, secrets, customer data boundaries, and sensitive operations.

## Auth Model

- Identity: bearer token only, and only on the mutating endpoints (`POST /api/documents`, `DELETE /api/documents/*`, `POST /api/reindex`). `Authorization: Bearer <KB_API_TOKEN>` is required when `KB_API_TOKEN` is set, else those endpoints are localhost-open. All `GET` endpoints are always open.
- No sessions/cookies — stateless bearer check per request.

## Authorization Rules

- Reads (`GET`, including `/api/search`, `/api/tags`, `/api/projects`): open to anyone who can reach the service.
- Writes (create/delete/reindex): bearer-guarded when `KB_API_TOKEN` is set. Rotate by changing the value and restarting the `api` service.

## Secret Handling

- `KB_API_TOKEN` and the Gemini credential (`GOOGLE_API_KEY` preferred, `GEMINI_API_KEY` fallback) are injected via environment / compose `environment:`, **never committed**. An empty Gemini key simply disables semantic search (graceful BM25-only degradation).
- Tests strip ambient `GOOGLE_API_KEY`/`GEMINI_API_KEY` (an autouse `conftest` fixture) so no test ever hits the network from a developer's exported key.

## Customer Data Boundaries / Publish Safety (P4)

- **No local filesystem paths on the public surface.** Before P4 every published doc carried `source.repo` as an absolute local path (e.g. `/home/<user>/projects/changple5`) in frontmatter, the DB, and API output, leaking the author's filesystem to the public GitHub Pages site.
- P4 added `sanitize_source_repo()`, applied at both ingestion seams (`POST /api/documents` and reindex parse): a local path collapses to its basename, a URL passes through unchanged, and empty/null yields empty. So `source.repo` stays publish-safe **regardless of what the (frozen) `/explain` skill sends** — no skill change needed. All 6 existing explainer docs were backfilled; a repo-wide grep confirms zero absolute local (home-directory) paths remain in `docs/` or in the built site.
- **Workspace internals are excluded from the built site.** `mkdocs.yml` `exclude_docs: /versions/` keeps the `docs/versions/` durable-doc history out of the published pages/nav/search (it stays in git). `docs/current/` stays published.

## Security Checklist

- [x] No secrets committed (token + Gemini key via env only)
- [x] Auth rules documented (bearer on mutating endpoints)
- [x] No local filesystem paths on the public surface (write-time sanitizer + backfill)
- [x] Workspace internals excluded from the published site (`exclude_docs: /versions/`)

## Open Questions

- SaaS-someday would reopen the threat model (multi-tenant auth, data isolation, rate limits) — noted, out of scope now.
