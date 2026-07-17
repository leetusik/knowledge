---
doc_id: product
version: v0004
created_at: 2026-07-17T15:00:39+09:00
source: P12.REVIEW
summary: P12 authenticated web app is the primary user surface; all web-UI features free
previous: v0003_p7_the_knowledge_feature_now_ships_as_an_installable_claude_code_plugin_marketplace_knowledge_explain_knowledge_setup_for_any_user_architecture_kept_saas-open
---

# Product

## Status

The knowledge base is built and live across P2–P6 (DB-backed document API, public GitHub Pages site, hybrid search, operator-designed visual system, interactive knowledge graph). As of **P7** the feature also **ships as an installable Claude Code plugin** hosted in this repo — any Claude Code user can install it and scaffold their own knowledge base, not just the operator. The architecture is kept **SaaS-open** (a hosted multi-user version stays possible; nothing hosted is built). As of **P10–P12** that hosted multi-user version is real: the deployment is a multi-tenant SaaS with an **authenticated web app** as the primary user surface — a tenant dashboard, project detail pages, per-tenant document browse/search/read, and an in-app knowledge graph. **All web-UI features are free** — nothing in the web UI is plan-gated; the only planned paid feature (a retriever endpoint for AI-agent use) is deferred (P15) and is not a web-UI feature.

## Summary

A personal knowledge base. Its content is a `docs/` tree of educational explainer documents written by the `/explain` skill and browsed through a MkDocs Material viewer run via Docker. The same content is served through two consumption tracks: a public static site and a database-backed read/write/search API. As of P7 the whole feature is **packaged as a Claude Code plugin** (`/plugin marketplace add leetusik/knowledge` → `/plugin install knowledge@knowledge`): it ships **`/knowledge:explain`** (write an explainer into your KB) and **`/knowledge:setup`** (scaffold your own KB — API server + MkDocs site + Pages workflow — from scratch), so the feature is usable by anyone, independent of the operator's workspace system.

## Target Users

- The operator (owner and primary reader of the knowledge base).
- Coding agents writing knowledge via the `/explain` skill.
- **Any Claude Code user** who installs the `knowledge` plugin and runs `/knowledge:setup` to stand up their own KB (added P7).

## Problem

- Knowledge is scattered across conversations and repos, with no durable, browsable, searchable home.

## Goals

- Publish the `docs/` tree publicly via GitHub Pages (Track 1).
- Provide a DB-backed read/write/search API to power a future personal web UI with hybrid search (Track 2).

## Non-Goals for Now

- ~~The personal web UI itself.~~ **Delivered in P12** — see *Authenticated web app + free web UI (P12)* below (production deploy + public landing page land in P14).
- An embeddings pipeline (Track 2 leaves a `sqlite-vec` extension point, but no embeddings this cycle) — *resolved P4* (hybrid semantic search is live).
- Editing the `bootstrap_agentic_workspace` repo (the `/explain` update is handled there separately).

## Product Direction

Keep durable product truth here. Update by creating a new version under `docs/versions/product/`, not by patching old versions.

**Distribution & SaaS-open (P7).** The feature is now distributed as a Claude Code plugin (marketplace + isolated payload), so its reach is no longer limited to the operator's machine. Per operator direction, knowledge may eventually become a **SaaS-like** hosted, multi-user product — not today's work, but the plugin's config model (per-user config file, bearer auth, local-vs-remote resolution) is deliberately kept from precluding a hosted version. Building the hosted service is out of scope for now.

**Authenticated web app + free web UI (P12).** The primary user surface is now an authenticated web app (Next.js, in `web/`): sign up / sign in, a tenant dashboard, project detail pages (with show-once `vk_` credentials), per-tenant document browse/search/read, and an in-app knowledge graph. **Every web-UI feature is free** — the knowledge graph and the Claude Code-facing surfaces included; nothing in the web UI is plan-gated. The one planned paid feature is a retriever endpoint for AI-agent use, which is **deferred** (P15) and is not a web-UI feature. This resolves the earlier "the personal web UI itself" non-goal: it is built (production deploy + a public landing page land in P14).

## Terminology

- `phase`: grouped unit of work under `works/phases/active/` or `works/phases/archived/`
- `slice`: concrete unit of work inside a phase
- `deferred job`: parked work under `works/deferred/` that does not affect active selection until promoted
