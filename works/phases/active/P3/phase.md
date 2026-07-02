# Phase P3: Track 1 — GitHub Pages publishing

_Intent: see [intent.md](intent.md)._

## Objective

Publish the docs/ track as a GitHub Pages static site: GitHub Actions workflow building with mkdocs-material pinned to 9.7.6 (matching the local Docker image) and deploying via the official Pages actions, site_url updated to https://leetusik.github.io/knowledge/, auto-nav (no nav:, no strict:) preserved, publishing stays manual git push only — agents never push.

## Context

P3 is Track 1 of the two-track knowledge store: publish the `docs/` markdown tree as a public GitHub Pages static site. Today the repo has a remote (`https://github.com/leetusik/knowledge.git`) but no CI, and `mkdocs.yml` `site_url` still points at localhost — nothing is published. This phase adds the CI workflow and config so a manual operator push deploys the live site. Independent of P2; only touches `mkdocs.yml`, `README.md`, and `.github/`.

## Decomposition

Two middle slices between `DECOMP` (order 0) and `REVIEW` (order 9999):

- **P3.S1 — Pages workflow + site_url + README publishing model** (order 1, `implementation`, risk **medium**). One slice for all three file changes together: `.github/workflows/pages.yml` (the new CI workflow), the `mkdocs.yml` `site_url` line, and the README publishing-model section. They ship together or not at all, and the local pinned-image build (`docker compose run --rm kb build`) validates them as a unit. Risk is **medium** on purpose: this is the first CI in the repo, and the workflow half is only truly provable on a real push (CI cannot be fully exercised locally).
- **P3.S2 — Publish gate: operator enables Pages + first push; verify live site** (order 2, `implementation`, risk **low**). A first-class gate for the operator co-work the intent requires: repo Settings → Pages → Source = "GitHub Actions", then `git push origin main`. At its turn the orchestrator sets this slice `pending` with exact instructions and stops; after the operator clears it, the slice's executor verifies the live site (`curl` the public URL, content sanity) and records evidence. Risk **low** — verification only; the operator performs the risky part.

**Rationale for the S2-as-pending-gate design:** the one-time operator action (enabling Pages, first push) cannot be automated from this repo, and agents never push. Modeling it as its own `pending` slice makes that hand-off visible workflow state — a tracked, ordered gate with its own verification — instead of a loose note buried in a plan, and keeps S1 (the reviewable file changes) cleanly separable from the operator-driven publish/verify step.

## Findings & Notes

Seeded by `P3.DECOMP` (facts verified by the orchestrator — reuse, don't re-derive):

- Remote is `https://github.com/leetusik/knowledge.git` — matches intent.
- No `.github/` directory exists yet.
- The `gh` CLI token is currently invalid → live-deploy verification (S2) must lean on `curl` against the public URL; `gh` is optional if the operator re-auths.
- Both `docs/versions/` and `docs/current/` live under `docs/`, so both publish — same as the local viewer, intended.
- Existing P3 slice orders: `DECOMP` = 0, `REVIEW` = 9999 → middle slices take orders 1 and 2.

This session's operator decisions:

- **Generator re-confirmed: mkdocs-material 9.7.6.** The invocation note reopened the generator choice ("maybe Hugo"); Hugo was rejected — `docs/` is plain markdown with no front matter, and the local viewer + tags page are material-specific. Pinned exactly to `9.7.6` to match the local `squidfunk/mkdocs-material:9.7.6` compose viewer, so `docker compose run --rm kb build` stays a faithful pre-push check.
- **Design polish deferred.** Publish first with the stock indigo / dark-mode look; restyle after the real site is visible. (The orchestrator handles the design-polish `defer-job`.)

Cross-slice notes from `P3.S1` (executor):

- All three file changes shipped together and validated as a unit: `.github/workflows/pages.yml` (new CI), `mkdocs.yml` `site_url` → `https://leetusik.github.io/knowledge/` (one line; no-nav/no-strict comment byte-identical), and the README "Publishing (GitHub Pages)" section + stale "local-only" line fix + intro touch.
- Faithful pre-push check `docker compose run --rm kb build` passed clean (exit 0). Expected non-fatal warnings only: the MkDocs-2.0 team notice and `Excluding 'README.md' ... conflicts with 'index.md'` (no `--strict`, so warnings don't fail the build). CI runs the identical `mkdocs build`, so a clean local build predicts a clean CI build.
- The workflow used plain `mkdocs build` + `path: site` (not `--site-dir _site`) — same command the local check runs, and `site/` is already gitignored. Intent-compliant (no site-dir).
- **CI remains unproven until S2's push.** The deploy job can only truly run on a real push to `main`, and the one-time repo Settings → Pages → Source = "GitHub Actions" is operator-only. S2 is the pending gate that enables Pages, does the first push, and verifies the live site.

## Constraints

- Agents never push — deploys happen only on a manual `git push` by the operator (the `/explain` skill and the P2 API commit locally but never push).
- Auto-nav stays untouched: no `nav:` key and no `strict:` ever — the existing comment in `mkdocs.yml` is load-bearing.
- CI builds must pin `mkdocs-material==9.7.6` to match the local Docker image (build parity).
- The GitHub repo Settings → Pages → Source = "GitHub Actions" setting is operator-only; it cannot be automated from this repo.
- Durable-doc versioning happens only at `REVIEW`, via the "Doc impact" running list below — non-review slices append notes, they do not run `doc-new-version`.

## Doc impact

_Running list of durable-truth changes for `P3.REVIEW` to consolidate into doc versions._

- decisions doc — P3 re-confirmed mkdocs-material 9.7.6 as the Pages generator (Hugo considered, rejected); design polish deferred post-launch.
- operations doc — GitHub Pages publishing pipeline added (pages.yml, site_url → live URL, manual-push publishing model, one-time Pages source setting).

## Open Questions

- None — the generator question ("maybe Hugo") is resolved: mkdocs-material 9.7.6 re-confirmed this session.
