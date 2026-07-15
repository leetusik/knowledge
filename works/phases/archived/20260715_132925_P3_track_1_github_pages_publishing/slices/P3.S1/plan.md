# Plan — P3.S1: Pages workflow + site_url + README publishing model

Operator-approved 2026-07-02 (do-whole-phase session). Risk medium.

## Context

P3 publishes `docs/` as a public GitHub Pages site (see `../../phase.md` and `../../intent.md`). S1 is the file-changes slice: the CI workflow, the `site_url` fix, and the README publishing-model documentation — shipped together, validated as a unit by the pinned local image. Publishing stays operator-push-only; S2 (next slice) is the operator gate + live verification, so CI being provable only on a real push is expected and out of scope here.

## Changes (3 files, one new)

### 1. NEW `.github/workflows/pages.yml`

Exactly this content (per confirmed intent):

```yaml
name: pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false   # never cancel a deploy mid-flight

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install mkdocs-material==9.7.6   # exact pin — matches compose.yml image
      - run: mkdocs build   # never --strict; see the load-bearing comment in mkdocs.yml
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Deliberate detail vs. the original phase sketch: plain `mkdocs build` + `path: site` instead of `--site-dir _site` — same command the local Docker check runs, and `site/` is already gitignored. `intent.md` mandates no site-dir, so this is intent-compliant.

### 2. `mkdocs.yml` — one line only

`site_url: http://localhost:8765/` → `site_url: https://leetusik.github.io/knowledge/`. Nothing else moves; the no-nav/no-strict comment stays byte-identical.

### 3. `README.md` — publishing model

- New **"Publishing (GitHub Pages)"** section (after "Viewer operations", before "API"): live URL `https://leetusik.github.io/knowledge/`; deploys run via `.github/workflows/pages.yml` on push to `main`; **only the operator pushes** — the `explain` skill and the API commit locally, never push; faithful pre-push check `docker compose run --rm kb build` (same 9.7.6 as CI); one-time setup note: repo Settings → Pages → Source = "GitHub Actions".
- Fix the now-stale line in "Recreating from scratch" ("This repo is local-only (no remote)...") to reflect the remote + Pages reality.
- One-phrase intro touch: "served locally … in Docker" gains "and published to GitHub Pages".

Match the README's existing voice and formatting (bold-led bullets, wrapped ~80 cols).

## Validation (run in-slice)

1. YAML sanity: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pages.yml'))"` (fallback: `uv run --with pyyaml python -c ...`).
2. Faithful local build: `docker compose run --rm kb build` succeeds (warnings like the docs/README-vs-index notice are expected and fine — no `--strict`). If Docker isn't running, return `needs_operator` — don't skip this check.
3. Guard checks: `mkdocs.yml` still has no `nav:` and no `strict:`; the comment is untouched; `git diff --stat` shows only the three files (plus this slice's context files).
4. `python3 scripts/workflow.py validate`.

## Wrap-up (executor)

- Append to `../../phase.md`: a short cross-slice note (what exists now, that CI remains unproven until S2's push) and one Doc impact line — "operations doc — GitHub Pages publishing pipeline added (pages.yml, site_url → live URL, manual-push publishing model, one-time Pages source setting)."
- Write `result.md` beside this plan. Return your verdict.

## Boundaries

- No commits, no workflow state transitions, no `doc-new-version`, no `new-slice`.
- Do not touch anything outside the three files + this slice's `result.md` + `phase.md` appends. Never push.
