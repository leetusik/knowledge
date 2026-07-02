# Plan — P3.DECOMP: decompose "Track 1 — GitHub Pages publishing"

Operator-approved 2026-07-02 (do-whole-phase session).

## Context

P3 publishes the `docs/` tree as a public GitHub Pages site. Confirmed intent (`../../intent.md`): `.github/workflows/pages.yml` building with **mkdocs-material==9.7.6** (exact match with the local `squidfunk/mkdocs-material:9.7.6` compose viewer, so `docker compose run --rm kb build` stays a faithful pre-push check), deploying via the official Pages actions (`upload-pages-artifact` → `deploy-pages`, `github-pages` environment); `site_url` → `https://leetusik.github.io/knowledge/`; auto-nav untouched (no `nav:`, no `strict:` — the mkdocs.yml comment is load-bearing); publishing happens **only on manual operator push** — agents never push.

The operator's invocation note reopened the generator choice ("maybe Hugo"). **Resolved this session with the operator:** mkdocs-material 9.7.6 re-confirmed (Hugo rejected — docs/ is plain markdown with no front matter; local viewer + tags page are material-specific); **design polish deferred** — publish first with the stock indigo/dark-mode look, restyle after the real site is visible.

Facts verified by the orchestrator (reuse, don't re-derive):

- Remote is `https://github.com/leetusik/knowledge.git` — matches intent.
- No `.github/` directory exists yet.
- `gh` CLI token is currently invalid → live-deploy verification must lean on `curl` against the public URL; `gh` is optional if the operator re-auths.
- `docs/versions/` and `docs/current/` both live under `docs/`, so both publish — same as the local viewer, intended.
- Existing P3 slice orders: `DECOMP` = 0, `REVIEW` = 9999 → middle slices take orders 1 and 2.

## Your job (executor)

Create exactly two middle slices — bare folders, never pre-fill their `plan.md`:

1. `python3 scripts/workflow.py new-slice --phase P3 --slice P3.S1 --name "Pages workflow + site_url + README publishing model" --kind implementation --risk medium --order 1`
   — one slice for all three file changes (`.github/workflows/pages.yml`, the `mkdocs.yml` site_url line, README publishing-model section): they ship together or not at all, and the local pinned-image build validates them as a unit. Risk **medium** deliberately: first CI in this repo, and the workflow half is only truly provable on a real push.
2. `python3 scripts/workflow.py new-slice --phase P3 --slice P3.S2 --name "Publish gate: operator enables Pages + first push; verify live site" --kind implementation --risk low --order 2`
   — first-class gate for the operator co-work the intent requires (repo Settings → Pages → Source = "GitHub Actions", then `git push origin main`). At its turn the orchestrator sets it `pending` with exact instructions and stops; after the operator clears it, that slice's executor verifies the live site (`curl` the public URL, content sanity) and records evidence. Risk **low** (verification only; the operator does the risky part).

Then seed `phase.md` (the phase notebook, two levels up):

- **Decomposition**: the breakdown above + rationale, including the S2-as-pending-gate design (it makes the one-time operator action visible workflow state instead of a loose note).
- **Findings & Notes**: the verified facts and this session's decisions (generator re-confirmed, design deferred) from Context.
- **Constraints**: agents never push; no `nav:`/`strict:` ever; durable-doc versioning only at REVIEW via "Doc impact" notes; the Pages source setting is operator-only.
- **Open Questions**: clear it (the generator question is resolved).
- **Doc impact** (start the running list with one line, for REVIEW to consolidate): decisions doc — P3 re-confirmed mkdocs-material 9.7.6 as the Pages generator (Hugo considered, rejected); design polish deferred post-launch.

Write `result.md` beside this plan, return your verdict.

## Boundaries

- You may run `new-slice` (this is the decomposition slice). No other state transitions, no commits, no `doc-new-version`, no touching S1/S2 `plan.md`.
- Do not edit source, docs, mkdocs.yml, README — decomposition only records and creates slice folders.
- The orchestrator handles the design-polish `defer-job`, `finish-slice`, `validate`, and the commit after you return.

## Verification (this slice)

- `python3 scripts/workflow.py validate` passes.
- Backlog shows P3.S1/P3.S2 ordered between DECOMP and REVIEW; their folders contain no pre-filled `plan.md`.
- `phase.md` sections filled as above.
