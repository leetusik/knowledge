# Knowledge Base

A personal library of educational explainer documents, written by coding agents
(Claude Code, Codex) via the `explain` skill and served locally with MkDocs
Material in Docker. You direct and approve; the agent runs the commands.

## The loop

1. In any project, ask the agent: `/explain <topic>` — or in plain words,
   "write this up for the knowledge base". No topic means "document what we
   just discussed".
2. The agent researches the topic in that repo (real code, real configs — no
   invented claims), writes a novice-friendly explainer in the house style,
   and files it here under `docs/<project>/<YYYY-MM-DD>-<slug>.md`.
3. Browse at <http://localhost:8765> — the sidebar groups pages by source
   project, the [Tags](docs/tags.md) page groups them by topic, and full-text
   search covers everything.

## What lives here

- One explainer per topic, filed under its source project's folder.
- YAML frontmatter on every page: `title` (always double-quoted), `date`,
  `tags` (a YAML list of lowercase-kebab topics), and a `source:` map
  (`project`, `repo` path).
- `docs/index.md` keeps a "Recent" list; the skill inserts entries directly
  after the `<!-- explain:recent -->` marker.

## Conventions

- **Auto-commit, this repo only.** After writing a page, the skill runs
  `git -C ~/projects/personal/knowledge add -A` and commits as
  `docs(<project>): add <slug>`. It never pushes, and it never auto-commits in
  any other repo.
- **Keep auto-nav.** Do not add a `nav:` key to `mkdocs.yml` and do not set
  `strict: true`. The sidebar builds itself from the `docs/` tree, which is
  what lets the skill add pages with zero config — a `nav:` key would orphan
  every new page, and `strict` would turn that warning into a serve failure.
- Pages are dated snapshots. Prefer writing a new page over rewriting an old
  one, unless a page is factually wrong.

## Viewer operations (ask your agent)

- **Start:** `docker compose up -d` in this directory, then open
  <http://localhost:8765>. The container restarts automatically with Docker
  (`restart: unless-stopped`).
- **Watch rebuilds:** `docker compose logs -f kb` — edits under `docs/`
  live-reload.
- **Stop:** `docker compose down`.
- **Upgrade:** the image tag is pinned in `compose.yml`. Bump the tag, run
  `docker compose pull && docker compose up -d`, and re-check the site.

## Recreating from scratch

This repo is local-only (no remote) unless you add one. If it is ever lost,
ask an agent to re-scaffold it: `mkdocs.yml`, `compose.yml`, `docs/index.md`
(with the `<!-- explain:recent -->` marker), `docs/tags.md` (with the
`<!-- material/tags -->` marker), `.gitignore`, and this README — then
`git init` and commit. The `explain` skill refuses to write anywhere else and
will point here if the repo is missing.
