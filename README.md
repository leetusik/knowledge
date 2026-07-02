# Knowledge Base

A personal library of educational explainer documents, written by coding agents
(Claude Code, Codex) via the `explain` skill, served locally with MkDocs
Material in Docker, and published to GitHub Pages. You direct and approve; the
agent runs the commands.

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

## Publishing (GitHub Pages)

The `docs/` tree is published as a static site at
<https://leetusik.github.io/knowledge/>.

- **Deploys on push to `main`.** The `.github/workflows/pages.yml` workflow
  builds with MkDocs Material (pinned to the same `9.7.6` as the local image)
  and deploys via the official GitHub Pages actions.
- **Only the operator pushes.** The `explain` skill and the API commit locally
  but never push — nothing publishes until you run `git push` yourself.
- **Check before you push:** `docker compose run --rm kb build` runs the same
  build as CI (same 9.7.6), so a clean local build means a clean deploy.
- **One-time setup:** in the GitHub repo, set Settings → Pages → Source =
  "GitHub Actions". This can't be automated from the repo.

## API

Beside the viewer, a second compose service (`api`) runs a DB-backed document
API. `docker compose up -d` starts both: the site on **8765** and the API on
**8766**.

- **Endpoints** (base `http://localhost:8766`):
  - `GET /healthz` — liveness + document count.
  - `GET /api/documents[?project=&tag=&limit=&offset=]` — list, newest-first.
  - `GET /api/documents/{id}` / `GET /api/documents/by-path/<project>/<file>.md` —
    a single document, including its markdown body.
  - `GET /api/search?q=<terms>[&project=&tag=&raw=]` — full-text BM25 search
    with `<mark>`-highlighted snippets.
  - `POST /api/reindex` — rebuild the DB from the `docs/` tree.
  - `POST /api/documents` — create a document (used by the `explain` skill).

- **The API owns writes.** A `POST /api/documents` does the whole write in one
  locked step: it writes the `docs/<project>/<date>-<slug>.md` convention file,
  inserts the Recent bullet in `docs/index.md`, upserts the SQLite row, and makes
  a scoped git commit (`docs(<project>): add <slug>`, staging only the two files
  it touched — never `-A`, and it **never pushes**). `docs/` stays canonical; the
  DB (`data/kb.sqlite3`) is disposable.

- **`docs/` is canonical; reindex reconciles drift.** After manual edits to the
  tree, an API-down fallback write, or a `git reset`, run
  `POST /api/reindex` to rebuild the DB to match the files.

- **Publishing stays manual.** The API and agents never push. You publish by
  running `git push` yourself.

- **Single worker — never scale.** The write path serializes on an in-process
  lock, so the API runs exactly one uvicorn worker. Never add `--workers`
  (WAL still gives concurrent reads).

- **Optional auth.** Set `KB_API_TOKEN` (env / the commented line in
  `compose.yml`) to require `Authorization: Bearer <token>` on the two mutating
  endpoints (`POST /api/documents`, `POST /api/reindex`); GETs stay open.

- **Linux hosts.** The image runs as root and relies on system-level git config
  surviving the bind mount. If this ever moves off macOS to a Linux host, add a
  compose `user:` mapping so written files aren't owned by root.

## Recreating from scratch

This repo has a remote (`https://github.com/leetusik/knowledge.git`) and
publishes to GitHub Pages on push to `main` (see Publishing above). If it is
ever lost, ask an agent to re-scaffold it: `mkdocs.yml`, `compose.yml`,
`docs/index.md` (with the `<!-- explain:recent -->` marker), `docs/tags.md`
(with the `<!-- material/tags -->` marker), `.gitignore`, and this README —
then `git init` and commit. The `explain` skill refuses to write anywhere else
and will point here if the repo is missing.
