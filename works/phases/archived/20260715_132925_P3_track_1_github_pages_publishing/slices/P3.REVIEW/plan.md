# Plan — P3.REVIEW: phase review + durable-doc consolidation

Operator-approved 2026-07-02 (do-whole-phase session). Review slice — validates all of P3 together; consolidates docs only on a passing review. You write only docs (`docs/versions/` new files + generated `docs/current/`), never source.

## Context

P3 published `docs/` to GitHub Pages. All slices done: DECOMP (breakdown), S1 (pages.yml + site_url + README), S2 (operator publish gate; site verified live at https://leetusik.github.io/knowledge/, Actions run 3 green). Read `../../phase.md` (notebook incl. the two-line "Doc impact" list) and `../../intent.md` (confirmed intent) first.

## 1. Re-validate the phase's slices together

- **S1**: YAML sanity — `uv run --with pyyaml python -c "import yaml; yaml.safe_load(open('.github/workflows/pages.yml'))"`; faithful local build — `docker compose run --rm kb build` (exit 0; warnings fine, never `--strict`); guards — `mkdocs.yml` has no real `nav:`/`strict:` key and the load-bearing comment is intact; the pip pin in pages.yml equals the compose image pin (both 9.7.6); `site_url` is the live URL.
- **S2**: `curl -sS` https://leetusik.github.io/knowledge/ → 200 + `<title>Knowledge Base</title>`; spot-check `tags/` → 200.
- **State**: `python3 scripts/workflow.py validate`; all four slices have `result.md`; D2 (deferred design polish) exists under `works/deferred/open/D2/`.

## 2. Review against objective and intent

Walk `../../intent.md` "Confirmed Intent" clause by clause — workflow triggers (`push` main + `workflow_dispatch`), permissions (`contents: read, pages: write, id-token: write`), concurrency group `pages`, setup-python 3.12, pinned install, `mkdocs build` without `--strict`, official upload/deploy actions, `github-pages` environment, live `site_url`, auto-nav preserved, manual-push-only publishing documented in README, one-time Pages setting done — and confirm each against the working tree, the live site, and the run history in S2's `result.md`.

## 3. On pass only — consolidate the Doc impact list into doc versions

Two lines in `phase.md` → two new versions. For each: run the command, then edit the file at the printed `edit_path`, matching the doc's existing structure and voice.

1. `python3 scripts/workflow.py doc-new-version --doc decisions --summary "GitHub Pages generator: mkdocs-material 9.7.6 re-confirmed over Hugo" --source P3.REVIEW`
   - Add a Decision Log entry (same shape as the existing "Two-track knowledge store" entry): Date 2026-07-02, Status accepted. Context: at P3 execution the operator reopened the generator choice ("maybe Hugo"). Decision: keep mkdocs-material, pinned exactly to 9.7.6 to match the local viewer image so the local build stays a faithful CI pre-check. Alternatives considered: Hugo — rejected (docs/ is plain markdown without front matter; the viewer + tags page are material-specific; migration cost with no benefit at this scale). Consequences: version bumps happen in two places together (compose.yml image tag + pages.yml pip pin); design polish deferred post-launch as deferred job D2. Update `## Status` to reflect two accepted decisions. Source: P3.REVIEW (evidence: P3 `intent.md`, `phase.md`).
2. `python3 scripts/workflow.py doc-new-version --doc operations --summary "GitHub Pages publishing pipeline live (pinned mkdocs-material CI, manual-push deploys)" --source P3.REVIEW`
   - `## Status`: both tracks operational; site live at https://leetusik.github.io/knowledge/.
   - Replace the `## Publishing` placeholder with the real pipeline: `.github/workflows/pages.yml` (push to `main` + `workflow_dispatch`; concurrency group `pages`; build = pip-pinned mkdocs-material==9.7.6 → `mkdocs build`, never `--strict` → upload-pages-artifact → deploy-pages in the `github-pages` environment); pin-parity rule (bump the compose tag and the pip pin together); pre-push check `docker compose run --rm kb build`; deploys only on the operator's manual `git push` (agents/API never push); one-time setting Settings → Pages → Source = "GitHub Actions" (done 2026-07-02); first-publish lesson — enable Pages before the first push or the deploy step fails; recover with Actions → "Run workflow" (no new push needed).

Then `python3 scripts/workflow.py rebuild-docs` (you edited the version files after the command's snapshot) and `python3 scripts/workflow.py validate`. Never patch old files under `docs/versions/`; never hand-edit `docs/current/`.

## 4. Wrap up

Append the review summary to `../../phase.md` (verdict, what was validated, doc versions created), write `result.md` beside this plan, and return `review_verdict: pass | changes_requested | blocked` (with proposed fix slices if changes_requested).

## Boundaries

- `doc-new-version`/`rebuild-docs` are allowed (this is the review slice). No commits, no slice/phase status transitions, no `new-slice`, never push, no source edits — docs and slice/phase context files only.
- The orchestrator records the verdict with `review-phase`, validates, and commits after you return.
