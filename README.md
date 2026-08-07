# Knowledge Base

**Live site → <https://knowledge.hi2vi.com>** — the hosted product; sign in to
browse your own library, or jump straight to the public
[knowledge map](https://knowledge.hi2vi.com/@leetusik/graph).

Technical explainers written from real project work. When I solve something
non-trivial, a coding agent (Claude Code / Codex) researches the actual code
and writes a beginner-friendly explainer here — grounded in the real repo, no
invented claims. The library grows as I work.

What started as a personal knowledge base is now a small hosted product with
four ways in: a free **web app** (sign up, browse/search/read, share, an
in-app graph), a Claude Code **plugin** (self-host your own KB), a standalone
**CLI** (drive it from a terminal or a coding agent), and an **MCP retrieval
service** (`search` + `fetch_document` tools for any AI agent). This README
covers the plugin and CLI install paths; the web app needs no install — just
sign up.

## Install the plugin

This repo's knowledge feature ships as a Claude Code plugin, so any Claude Code
user can spin up their own version. From inside Claude Code:

    /plugin marketplace add leetusik/knowledge
    /plugin install knowledge@knowledge

Then run `/knowledge:setup` once — pick **Connect** to post to the hosted KB
with just a browser (no infra), or **Scaffold** to self-host your own. Scaffold
mode needs Python 3.12+, Docker (optional — runs the local viewer + API), and a
GitHub repository (optional — only to publish via Pages). Then run
`/knowledge:explain <topic>` whenever you want something explained and kept.
Full details in [`plugin/README.md`](plugin/README.md).

## Command-line interface

There is also a standalone `knowledge` CLI for the **hosted** service — sign up,
configure credentials, and save and search knowledge from a terminal, without
visiting the website or installing the plugin:

    curl -fsSL https://knowledge.hi2vi.com/install.sh | bash
    printf %s "$PASSWORD" | knowledge init --email you@example.com --password-stdin
    knowledge save note.md --tag python --tag testing

The installer bootstraps [`uv`](https://docs.astral.sh/uv/) if needed, then runs
the canonical `uv tool install git+https://github.com/leetusik/knowledge#subdirectory=cli`
(also usable directly). `init` prints a `web login:` line — the CLI and the web
app share one account, so the same email + password log into both. It writes the
same `~/.config/knowledge-kb/config.json` the plugin reads, so all three (plugin,
CLI, web app) share one hosted knowledge base. Full quickstart in
[`cli/README.md`](cli/README.md).

Driving this from a coding agent? Export
`KB_API_BASE_URL=https://knowledge.hi2vi.com` and `KB_API_TOKEN=<an org key>` to
save over plain REST with no CLI install at all, or run `knowledge guide` for the
full machine-readable contract (auth, the save rules, the `--json`/exit-code
protocol) as one bundled, offline document. The canonical `/knowledge:explain`
skill is also published, copyable and downloadable, at
[`/SKILL.md`](https://knowledge.hi2vi.com/SKILL.md).

## How it's built

- **Write path** — a custom `explain` skill posts to a FastAPI document API that
  writes the page, updates a **hybrid** search index (BM25 + recency decay +
  Gemini embedding cosine, fused by RRF), and makes a scoped git commit.
  Documents are self-contained interactive HTML explainers (Background,
  Intuition, Code, a quiz) — this page you're reading was written the same way,
  into this same repo.
- **Publish path** — the API is hosted at <https://knowledge.hi2vi.com> behind
  one nginx edge that also fronts a Next.js web app (`/` — the primary human
  surface: sign up, browse/search/read, an in-app graph, sharing) and an MCP
  retrieval service (`/mcp`) any AI agent can call. A doc written on the box is
  live the instant it's saved — *fresh-on-write*, no CI build or CDN lag — and a
  manual-dispatch `Production Deploy` GitHub Action reconciles the box from
  `main`. The box pushes every write to `origin/main` for off-box backup; locally
  and from the plugin, nothing pushes until you do. Workspace internals
  (versioned docs history and build artifacts) stay excluded from the built
  local site. (The old GitHub Pages deploy is retired here; the plugin still
  ships it for self-hosters.)
- **Versioned project docs** — the repo's own design docs are kept as durable,
  versioned truth in 11 tracks (architecture, API, operations, …): latest
  under `docs/current/`, full history under `docs/versions/` (excluded from the
  built site, available in git).
- **Publish-safe metadata** — document frontmatter (`source.repo`) is sanitized
  at write time (local paths become repo basenames; URLs pass through), so no
  filesystem details leak to the public site.
- **Pretty share links** — a hosted org can claim a durable public slug and get
  readable URLs (`/@{org}/{project}/{doc-slug}`, `/@{org}/graph`); the old
  `/documents/{id}` and `/graph/{uuid}` links keep resolving forever.
- **Knowledge map** — the hosted app draws an interactive
  [graph](https://knowledge.hi2vi.com/@leetusik/graph) of the library
  client-side. The **local** MkDocs site (below) builds its own static graph the
  same way it always has: `graph.json` emitted at build time by a MkDocs hook
  (`scripts/graph_hook.py`) and drawn client-side with vendored, no-CDN
  JavaScript — that copy is what self-hosters and the plugin scaffold get.

## Recreating from scratch

Two ways to stand this knowledge base back up:

- **Restore this KB** — clone this repo and run `docker compose up -d` (this now
  also starts a local `postgres` for the accounts plane). The API reindexes
  `docs/` on startup, so the SQLite content database self-heals from the files
  already in git — nothing else to restore for browsing/searching. The accounts
  plane (signup/login) starts unmigrated and empty; run
  `docker compose exec api alembic upgrade head` if you need that too.
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
