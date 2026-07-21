# knowledge — Claude Code plugin

Turn what you just figured out into a personal knowledge base. The plugin ships
two skills:

- `/knowledge:explain <topic or change-ref>` — researches a topic **or a code
  change** in your current repo or conversation and writes a single
  self-contained **interactive HTML explainer** — Background, Intuition, Code, a
  cited "Best practices & next steps" section from web research, and a 5-question
  quiz with immediate feedback — into your own knowledge base (API-first, with a
  plain-file fallback). The best-practices section is default-on but skips itself
  for purely-internal subjects or when offline (`research` / `no-research` force
  it on/off; add `here` to also drop a copy in the current project). The first
  explainer filed under a brand-new project also creates that project's landing
  page automatically, so your published site keeps building as the library grows.
- `/knowledge:setup` — scaffolds that knowledge base from scratch: a MkDocs
  Material site, a FastAPI + SQLite document API, an interactive knowledge
  graph, and a GitHub Pages publishing workflow. Run it once after install.

## Install

    /plugin marketplace add leetusik/knowledge
    /plugin install knowledge@knowledge

Then run `/knowledge:setup` once to create your KB, and `/knowledge:explain`
whenever you want something explained and kept.

## Requirements

- Python 3.12+ (the document API and site tooling).
- Docker (optional but recommended — runs the local viewer + API; without it
  the KB still works through the file-write fallback).
- A GitHub repository (optional — only needed to publish the site via Pages).

The live demo of what you get: <https://leetusik.github.io/knowledge/>.

## Development & releasing

The shipped payload under `plugin/templates/kb/` is a byte-for-byte snapshot of
the live repo it was extracted from. A root-only parity guard
(`scripts/plugin_parity.py`, run in CI by `.github/workflows/plugin-ci.yml`)
re-renders the templates and fails the build if they drift from their source
files, so the scaffold a user installs always matches the running system.

Release checklist — before pushing a release:

1. Any change under `plugin/**` ships only with a `plugin.json` `version` bump;
   installers pull updates only when the version changes.
2. `python3 scripts/plugin_parity.py` — templates in parity with the repo.
3. `claude plugin validate .` and `claude plugin validate ./plugin` — both pass
   (add `--strict` to surface metadata warnings).
4. Run the setup + explain E2E rehearsal (scaffold into a temp dir on throwaway
   ports; exercise the 201 / 409 / fallback paths, then `mkdocs build` +
   `site_smoke.py`) — never against your own live KB.
