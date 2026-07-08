# Knowledge Base

**Live site → <https://leetusik.github.io/knowledge/>**

Technical explainers written from real project work. When I solve something
non-trivial, a coding agent (Claude Code / Codex) researches the actual code
and writes a beginner-friendly explainer here — grounded in the real repo, no
invented claims. The library grows as I work.

## How it's built

- **Write path** — a custom `explain` skill posts to a FastAPI + SQLite (FTS5
  full-text search) document API that writes the page, updates the index, and
  makes a scoped git commit. Nothing publishes until I push.
- **Publish path** — MkDocs Material builds in CI and deploys to GitHub Pages
  on every push to `main`. Workspace internals (versioned docs history and build
  artifacts) are excluded from the published site.
- **Versioned project docs** — the repo's own design docs are kept as durable,
  versioned truth in 11 tracks (architecture, API, operations, …): latest
  under `docs/current/`, full history under `docs/versions/` (excluded from the
  built site, available in git).
- **Publish-safe metadata** — document frontmatter (`source.repo`) is sanitized
  at write time (local paths become repo basenames; URLs pass through), so no
  filesystem details leak to the public site.

## Agentic workflow

This repo is developed with
[bootstrap_agentic_workspace.sh](https://github.com/leetusik/bootstrap_agentic_workspace.sh),
a portable harness that drives coding agents through phases → slices → phase
reviews (`scripts/workflow.py`), with operator-approved plans and versioned
docs as the durable record. Workflow state lives in `works/`.
