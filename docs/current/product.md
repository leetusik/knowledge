---
doc_id: product
version: v0005
created_at: 2026-07-18T03:16:20+09:00
source: P13.REVIEW
summary: P13 standalone knowledge CLI as a third distribution surface; agent-first non-interactive onboarding; bundled agent-readable guide docs
previous: v0004_p12_authenticated_web_app_is_the_primary_user_surface_all_web-ui_features_free
---

# Product

## Status

The knowledge base is built and live across P2–P6 (DB-backed document API, public GitHub Pages site, hybrid search, operator-designed visual system, interactive knowledge graph). As of **P7** the feature also **ships as an installable Claude Code plugin** hosted in this repo — any Claude Code user can install it and scaffold their own knowledge base, not just the operator. The architecture is kept **SaaS-open** (a hosted multi-user version stays possible; nothing hosted is built). As of **P10–P12** that hosted multi-user version is real: the deployment is a multi-tenant SaaS with an **authenticated web app** as the primary user surface — a tenant dashboard, project detail pages, per-tenant document browse/search/read, and an in-app knowledge graph. **All web-UI features are free** — nothing in the web UI is plan-gated; the only planned paid feature (a retriever endpoint for AI-agent use) is deferred (P15) and is not a web-UI feature. As of **P13** there is a **third distribution surface**: a standalone installable `knowledge` **CLI** — explicitly not a plugin feature — that lets a user working *inside* Claude Code or Codex sign up, log in, configure credentials, and use the knowledge features end to end **without ever visiting the website**, shipped with **bundled agent-readable guide docs** so a coding agent can drive the whole flow. See *CLI + agent-first onboarding (P13)* below.

## Summary

A personal knowledge base. Its content is a `docs/` tree of educational explainer documents written by the `/explain` skill and browsed through a MkDocs Material viewer run via Docker. The same content is served through two consumption tracks: a public static site and a database-backed read/write/search API. As of P7 the whole feature is **packaged as a Claude Code plugin** (`/plugin marketplace add leetusik/knowledge` → `/plugin install knowledge@knowledge`): it ships **`/knowledge:explain`** (write an explainer into your KB) and **`/knowledge:setup`** (scaffold your own KB — API server + MkDocs site + Pages workflow — from scratch), so the feature is usable by anyone, independent of the operator's workspace system.

## Target Users

- The operator (owner and primary reader of the knowledge base).
- Coding agents writing knowledge via the `/explain` skill.
- **Any Claude Code user** who installs the `knowledge` plugin and runs `/knowledge:setup` to stand up their own KB (added P7).
- **A user working inside Claude Code or Codex** who installs the standalone `knowledge` CLI (added P13) to onboard to the hosted SaaS and use the knowledge features from the terminal — driven by their coding agent via the bundled guide — never touching the website.

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

**CLI + agent-first onboarding (P13).** P13 adds a **third distribution surface** beside the plugin and the web app: a standalone installable `knowledge` CLI (its own package, `uv tool install`, console script `knowledge`) so a user who lives inside Claude Code or Codex can run the entire lifecycle from the terminal — sign up, log in, set up credentials against the hosted SaaS, then `save`/`search`/`list`/`read`/`projects`/`usage` — **without visiting the website**. This directly delivers the operator's "let's say you are my user" intent. Two product properties define it:

- **Agent-first, non-interactive.** The CLI is designed to be driven by a coding agent, not typed by a human: a one-shot `knowledge init` runs the whole signup→project→credential→config→verify sequence unattended, passwords never come from interactive flags, and every command has a machine-readable `--json`/exit-code contract. The CLI *writes the config seam* that `/knowledge:explain` already reads — so a single `init` lights up the plugin against the hosted SaaS with zero plugin change.
- **A second deliverable: bundled agent-readable guide docs.** A `knowledge guide` command emits the full machine-readable lifecycle contract (every non-guessable constraint included), **bundled in the CLI package** so it works offline and is versioned with the code — the intent's explicit "proper guide docs so a user doesn't even need the website" deliverable. Discovery is install-instruction tails aimed at agents (READMEs + the `--help` epilog), not a served API doc.

The existing `/knowledge:explain` + `/knowledge:setup` plugin **stays untouched** as the self-host, open-core path; the CLI is the hosted-SaaS onboarding path. Knowledge saving and the Claude Code connection remain **free-tier** — the CLI adds no paid gating. (One honest caveat: the hosted flow is code-complete and edge-routed, but end-to-end on prod awaits a one-time operator cutover of the P10–P12 accounts plane — see operations.)

## Terminology

- `phase`: grouped unit of work under `works/phases/active/` or `works/phases/archived/`
- `slice`: concrete unit of work inside a phase
- `deferred job`: parked work under `works/deferred/` that does not affect active selection until promoted
