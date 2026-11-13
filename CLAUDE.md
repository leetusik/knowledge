# CLAUDE.md — the hi2vi platform

The Library at <https://knowledge.hi2vi.com>: a document API, a web app, a CLI, an MCP retrieval server, a Claude Code plugin, and a Mac voice runner for Listen. This file holds only what the code does not say.

## Layout

- `server/`: the FastAPI document and accounts API (`server.main:app`). `alembic/`: its accounts-plane migrations. `tests/`: its pytest suite.
- `web/`: the Next.js web app (pnpm). `web/public/SKILL.md` is the explain skill served at `/SKILL.md`.
- `cli/` (the `knowledge` CLI), `mcp-server/` (MCP over HTTP at `/mcp`), `tools/listen-runner/` (the Mac Listen runner, a LaunchAgent): each its own uv project with its own tests.
- `plugin/`: the Claude Code plugin (`skills/explain`, `skills/setup`, `agents/explain-critic.md`) and `templates/kb/`, the self-host scaffold. `.claude-plugin/marketplace.json` is its marketplace; `.agents/skills/explain/SKILL.md` is the portable explain copy.
- `deploy/`: the box's deploy scripts and nginx vhost. `compose.prod.yml` is production; `compose.yml` is local.
- `docs/`: the library's content root (the box writes tenant #1's projects under `docs/<project>/`), plus the MkDocs site sources the scaffold ships (`index.md`, `tags.md`, `graph.md`, `assets/`, `javascripts/`, `stylesheets/`, `mkdocs.yml`).
- `scripts/`: the parity guards, the smokes and the book migration.
- `archive/workspace/`: the frozen records of the workspace that built this repo up to 2026-11-13.

## Commands

- Python: `uv run pytest` (root suite); `uv run uvicorn server.main:app --port 8766` (local API). `cli/`, `mcp-server/` and `tools/listen-runner/` run `uv run pytest` from their own folder.
- Web: `pnpm --dir web typecheck`, `lint`, `test`, `dev` (`http://127.0.0.1:3030`). Run `pnpm --dir web build` in a scratch copy of `web/`, never in a checkout whose dev server is running: the build rewrites `web/.next`.
- Parity: `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py` (CI runs both, `.github/workflows/plugin-ci.yml`).

## Rules

- The explain skill has three copies: `plugin/skills/explain/SKILL.md` (canonical), `.agents/skills/explain/SKILL.md` (same body, its own frontmatter) and `web/public/SKILL.md` (byte-identical). Edit all three; `skills_parity.py` fails on drift. The critic's body in `plugin/agents/explain-critic.md` is generated from the canonical file: `python3 scripts/skills_parity.py --write-agents`.
- Files listed in `plugin/templates/manifest.json` are held byte-equal (or render-equal) to their repo-root twins by `plugin_parity.py`, among them `.dockerignore`, `mkdocs.yml`, `scripts/site_smoke.py` and most of `server/` and `tests/`. Change both sides together.
- Never commit library content by hand. Projects are private by default; the box's write path commits and pushes a public project's documents itself, and a private project never enters git (`server/publish_gate.py`, `server/gitops.py`). `tenants/`, `data/` and `.assets/` are gitignored.
- The accounts schema changes only through a new `alembic/versions/` revision; Production Deploy applies it (`alembic upgrade head`). Never alter the database by hand.
- No secrets in the repo: deploy keys live on the box (`deploy/SECRETS.md`); `.env` files are gitignored.

## Release

Users install `knowledge@knowledge` from `.claude-plugin/marketplace.json` and pull an update only when `plugin/.claude-plugin/plugin.json`'s `version` changes, so any change under `plugin/**` ships with a version bump. The release checklist (parity, `claude plugin validate`, the scaffold rehearsal) is in `plugin/README.md`.

## Deploy

Production is the box's checkout at `/opt/knowledge`, deployed only by dispatching the `Production Deploy` workflow from `main` (`.github/workflows/deploy-production.yml` → `deploy/oracle-production-deploy-remote.sh`). It reconciles the checkout with `origin/main`, rebuilds, migrates and health-gates the services. Never change code or containers on the box by hand: the deploy refuses a dirty tracked tree. The Listen runner on the Mac is installed by `tools/listen-runner/install.sh`, not by the deploy.

## Where the workspace lives

Phases, plans, durable docs and the operator's decisions live in the hi2vi host's `workflow/`, outside this repo. `archive/workspace/` is the frozen record of the old in-repo workspace: read it, never edit it, and run no workflow engine in this repo.
