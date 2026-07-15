# Knowledge Base

**Live site → <https://knowledge.hi2vi.com/graph/>** — the interactive knowledge
map; browse from any node, or read the [library index](https://knowledge.hi2vi.com/).

Technical explainers written from real project work. When I solve something
non-trivial, a coding agent (Claude Code / Codex) researches the actual code
and writes a beginner-friendly explainer here — grounded in the real repo, no
invented claims. The library grows as I work.

## Install the plugin

This repo's knowledge feature ships as a Claude Code plugin, so any Claude Code
user can spin up their own version. From inside Claude Code:

    /plugin marketplace add leetusik/knowledge
    /plugin install knowledge@knowledge

Then run `/knowledge:setup` once to scaffold your own knowledge base, and
`/knowledge:explain <topic>` whenever you want something explained and kept.
Requirements: Python 3.12+, with Docker (optional — runs the local viewer + API)
and a GitHub repository (optional — only to publish via Pages). Full details in
[`plugin/README.md`](plugin/README.md).

## How it's built

- **Write path** — a custom `explain` skill posts to a FastAPI + SQLite (FTS5
  full-text search) document API that writes the page, updates the index, and
  makes a scoped git commit. Nothing publishes until I push.
- **Publish path** — the site is self-hosted: a `mkdocs serve` viewer serves
  `docs/` live at the domain root, beside the API behind one nginx edge (`/` →
  site, `/api/*` → API). A doc written on the box is live the instant it lands —
  *fresh-on-write*, no CI build or CDN lag — and a manual-dispatch `Production
  Deploy` GitHub Action reconciles the box from `main`. Workspace internals
  (versioned docs history and build artifacts) stay excluded from the served
  site. (The old GitHub Pages deploy is retired here; the plugin still ships it.)
- **Versioned project docs** — the repo's own design docs are kept as durable,
  versioned truth in 11 tracks (architecture, API, operations, …): latest
  under `docs/current/`, full history under `docs/versions/` (excluded from the
  built site, available in git).
- **Publish-safe metadata** — document frontmatter (`source.repo`) is sanitized
  at write time (local paths become repo basenames; URLs pass through), so no
  filesystem details leak to the public site.
- **Knowledge map** — an interactive
  [graph](https://knowledge.hi2vi.com/graph/) of the library (every
  explainer a node, shared topics and references the edges): its `graph.json`
  is emitted at build time by a MkDocs hook (`scripts/graph_hook.py`) and drawn
  client-side with vendored, no-CDN JavaScript.

## Recreating from scratch

Two ways to stand this knowledge base back up:

- **Restore this KB** — clone this repo and run `docker compose up -d`. The API
  reindexes `docs/` on startup, so the SQLite database self-heals from the files
  already in git; there is nothing else to restore.
- **Rebuild a fresh one** — install the plugin (above) and run
  `/knowledge:setup`. It scaffolds a new KB and writes
  `~/.config/knowledge-kb/config.json`; point that file's `kb_root` at the
  restored or newly scaffolded directory and `/knowledge:explain` writes there.

## Agentic workflow

This repo is developed with
[bootstrap_agentic_workspace.sh](https://github.com/leetusik/bootstrap_agentic_workspace.sh),
a portable harness that drives coding agents through phases → slices → phase
reviews (`scripts/workflow.py`), with operator-approved plans and versioned
docs as the durable record. Workflow state lives in `works/`.
