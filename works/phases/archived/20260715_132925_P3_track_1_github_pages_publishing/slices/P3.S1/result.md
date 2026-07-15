# Result — P3.S1: Pages workflow + site_url + README publishing model

Status: **done**. All three file changes shipped together and validated as a unit.

## Changes

1. **NEW `.github/workflows/pages.yml`** — the repo's first CI workflow. `on: push
   [main] + workflow_dispatch`; permissions `contents: read / pages: write /
   id-token: write`; concurrency group `pages`, `cancel-in-progress: false`. Build
   job: checkout → setup-python 3.12 → `pip install mkdocs-material==9.7.6` (exact
   pin, matches `compose.yml`) → `mkdocs build` (no `--strict`) →
   `upload-pages-artifact` with `path: site`. Deploy job (`needs: build`) uses
   `deploy-pages@v4` in the `github-pages` environment. Written byte-for-byte from
   the plan's YAML.
2. **`mkdocs.yml`** — one line: `site_url: http://localhost:8765/` →
   `site_url: https://leetusik.github.io/knowledge/`. Nothing else changed; the
   load-bearing no-nav/no-strict comment is byte-identical.
3. **`README.md`** — three edits:
   - New **"Publishing (GitHub Pages)"** section between "Viewer operations" and
     "API": live URL, deploy-on-push-to-`main` via `pages.yml`, operator-push-only
     model (skill/API commit locally, never push), `docker compose run --rm kb
     build` as the faithful pre-push check (same 9.7.6 as CI), and the one-time
     Settings → Pages → Source = "GitHub Actions" note.
   - Fixed the stale "This repo is local-only (no remote)..." line in "Recreating
     from scratch" to state the remote + Pages-on-push reality.
   - Intro touch: "served locally with MkDocs Material in Docker" now adds "and
     published to GitHub Pages".

## Validation

1. **YAML sanity** — `python3 -c "import yaml; ..."` had no system `pyyaml`;
   fallback `uv run --with pyyaml python -c "import yaml; yaml.safe_load(...)"` →
   **PASS** ("YAML OK (uv)").
2. **Faithful local build** — `docker compose run --rm kb build` → **PASS** (exit
   0, "Documentation built in 0.43 seconds"). Expected non-fatal warnings only:
   the Material/MkDocs-2.0 team notice and `Excluding 'README.md' from the site
   because it conflicts with 'index.md'`. No `--strict`, so warnings don't fail.
3. **Guard checks** — **PASS**. No real `nav:` or `strict:` YAML key
   (`grep -nE "^\s*(strict|nav):" mkdocs.yml` finds nothing; the two `strict`
   hits are inside the load-bearing comment). `git diff mkdocs.yml` shows only the
   `site_url` line. Tracked diff touches only `README.md` + `mkdocs.yml` (plus
   orchestrator-owned `works/*` state files it modified at start-slice, not by this
   slice); untracked adds only `.github/workflows/pages.yml` and this slice's
   `plan.md`.
4. **`python3 scripts/workflow.py validate`** → **PASS** ("Workflow validation
   passed.", exit 0).

## Doc impact (recorded to phase.md, not versioned here)

- operations doc — GitHub Pages publishing pipeline added (pages.yml, site_url →
  live URL, manual-push publishing model, one-time Pages source setting).

## Deviations from plan

None. Note: `import yaml` fell back to the plan's provided `uv run --with pyyaml`
alternative (no system pyyaml) — an anticipated fallback, not a deviation.

## Notes for the orchestrator

- **CI is not yet proven.** The deploy job can only truly run on a real push to
  `main`, and enabling Pages (Settings → Pages → Source = "GitHub Actions") is
  operator-only. That is exactly S2's job: the `pending` gate + live-site
  verification. Nothing was pushed here.
- The Doc impact line above is queued in `phase.md` for `P3.REVIEW` to consolidate
  into the operations doc; this slice ran no `doc-new-version` (correct per phase
  rules).
