# Intent — P3

- Captured at: 2026-07-02T13:27:01+09:00
- Origin: operator

## Original Input (verbatim)

> There will be two track knowledge store plan
> 1. in docs/ dir
> 2. In db
>
> 1 is used for github static page, 2 is used for personal webui(later search engine will be attached. Hybrid search retriver based).
> So this app should provide not only docs storing but db write/read endpoint to bootstrap_agentic_workspace's /explain skill.

(Framing from the same conversation: "make up phases for the below task. mind that no other repo editing." — and after the workspace was installed: "we now installed bootstrap agentic workspace. your job is to make only phases not code edit.")

## Confirmed Intent (refined + clarified)

Build track 1 of the two-track knowledge store: publish the `docs/` markdown tree as a public GitHub Pages static site. Today the repo has a remote (`https://github.com/leetusik/knowledge.git`) but no CI and `site_url` points at localhost — nothing is published.

- **Workflow**: `.github/workflows/pages.yml` triggered on `push` to `main` (+ `workflow_dispatch`); permissions `contents: read, pages: write, id-token: write`; concurrency group `pages`. Build: checkout → setup-python 3.12 → `pip install mkdocs-material==9.7.6` (pinned to match the local `squidfunk/mkdocs-material:9.7.6` Docker image, so `docker compose run --rm kb build` is a faithful pre-push check) → `mkdocs build` (NOT `--strict`) → `actions/upload-pages-artifact` → `actions/deploy-pages` in the `github-pages` environment.
- **Config**: `mkdocs.yml` `site_url` → `https://leetusik.github.io/knowledge/`; the auto-nav rule stays untouched (no `nav:` key, no `strict:` — the existing comment in mkdocs.yml is load-bearing).
- **Publishing model**: deploys happen only on a manual `git push` by the operator — the `/explain` skill and the P2 API commit locally but never push. Document this in README.
- **One-time operator action**: GitHub repo Settings → Pages → Source = "GitHub Actions" (cannot be automated from this repo).

## Clarifications Resolved

- Q: One phase or several? — A: Two phases, one per track: P2 (DB/API track) and this phase (GitHub Pages track).
- Q: Placeholder P1? — A: Leave untouched; real work starts at P2.

## Notes

- Full details (workflow YAML shape, verification steps) are in the operator-approved plan at `~/.claude/plans/make-up-phases-for-precious-fairy.md`, "Phase 5 — GitHub Pages CI" section.
- Independent of P2 — can be executed before or after it; only touches `mkdocs.yml`, `README.md`, and `.github/`.
