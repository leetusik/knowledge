---
doc_id: security
version: v0003
created_at: 2026-07-14T16:21:13+09:00
source: P7.REVIEW
summary: P7: SaaS-open config model (~/.config/knowledge-kb/config.json, chmod 600), local-only-fallback rule, no secrets in scaffolds, payload isolation
previous: v0002_p4_publish-safe_source_metadata_sanitizer_no_local_paths_on_public_surface
---

# Security

## Status

Personal, single-operator knowledge base. The threat model is modest — no multi-tenant data, no customer PII — but P4 hardened the **public-surface hygiene**: nothing on the published GitHub Pages site or the API leaks the author's local filesystem. P7 packaged the feature as a distributable Claude Code plugin, which adds two hygiene boundaries: a **payload-isolation** rule (nothing personal ships in the installable payload) and a **SaaS-open config model** (per-user config file + a local-only-fallback rule) that keeps a future hosted multi-user version possible without building it now.

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

## Plugin config model + secrets hygiene (P7)

The packaged plugin adds a per-user config model designed to stay **SaaS-open**
(a hosted API later = a different `base_url` + token) while building nothing hosted:

- **Config file, not committed secrets.** `/knowledge:setup` writes
  `$XDG_CONFIG_HOME/knowledge-kb/config.json` (default `~/.config/knowledge-kb/`),
  **chmod 600**, with nested keys `kb_root`, `api.{base_url,token}`, `site.base_url`.
  The token defaults to JSON `null` (no bearer) — a hosted deployment later sets
  `api.base_url` + `api.token` here, unchanged code path.
- **No secret is ever scaffolded.** Setup **never** collects or writes a Gemini key —
  it stays host-env-only (`GOOGLE_API_KEY`/`GEMINI_API_KEY`), so no credential lands
  in the rendered KB, its git history, or the config file. The `KB_API_TOKEN` likewise
  stays env/config-only, never templated into the scaffold.
- **Local-only-fallback rule.** The shipped `/knowledge:explain` skill performs its
  file+git write fallback **only** when config resolves a **local** `kb_root`; a remote
  `base_url` that is unreachable is reported to the user, never silently written to
  disk — so a hosted KB can never be bypassed into a stray local write.
- **Payload isolation.** The plugin's `source` dir is copied whole into every
  installer's cache, so the payload lives under `plugin/` (marketplace
  `source: "./plugin"`) and ships **only** the templated KB + the two user-facing
  skills — never the operator's `docs/` content, `works/`, `data/`, `.env`, tokens, or
  workspace machinery. The shipped `plugin/templates/params.operator.json` carries only
  **public** site metadata (site name, the public Pages URL, copyright, TZ, ports) used
  by the parity guard — no secret, no local path. (`docs/current/` publish-safety and
  `exclude_docs: /versions/` from P4 still hold.)

## Security Checklist

- [x] No secrets committed (token + Gemini key via env only)
- [x] Auth rules documented (bearer on mutating endpoints)
- [x] No local filesystem paths on the public surface (write-time sanitizer + backfill)
- [x] Workspace internals excluded from the published site (`exclude_docs: /versions/`)
- [x] Plugin payload isolated — nothing personal ships (payload under `plugin/`, `source: "./plugin"`)
- [x] No secret scaffolded — config file chmod 600, token `null` default, Gemini key host-env only
- [x] Local-only-fallback — the explain skill never falls back to a local write for a remote KB

## Open Questions

- SaaS-someday would reopen the threat model (multi-tenant auth, data isolation, rate limits) — noted, out of scope now.
