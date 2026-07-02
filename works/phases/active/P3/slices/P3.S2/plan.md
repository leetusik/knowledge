# Plan — P3.S2: Publish gate — operator enables Pages + first push; verify live site

Operator-approved 2026-07-02 (do-whole-phase session). Risk low.

## Context

S1 shipped the pipeline files (`.github/workflows/pages.yml`, live `site_url`, README publishing model) — see `../../phase.md`. CI is unproven until a real push, and two actions are operator-only: the one-time Pages source setting and the push itself (agents never push — hard constraint). S2 models that hand-off as a `pending` gate, then verifies the live site.

Pre-checked facts: the repo is public (github.com/leetusik/knowledge → 200; no visibility change needed); the Pages URL was 404 before the gate (nothing published yet, as expected); `gh` CLI token is invalid, so verification uses plain `curl`.

## Operator gate (before the executor runs)

The orchestrator sets this slice `pending` and stops. Operator steps:

1. **One-time setting**: GitHub → `leetusik/knowledge` → Settings → Pages → "Build and deployment" → Source = **"GitHub Actions"**.
2. **Publish**: `git push origin main` — the first push with the workflow on main; it triggers the `pages` run.
3. Optionally watch: repo → Actions tab → "pages"; wait for green.
4. Resume: `python3 scripts/workflow.py set-slice-status P3.S2 in_progress` (or tell the orchestrator to clear it).

## Executor job (after the gate clears)

Verify the live site and record evidence:

- `curl -sS -o /dev/null -w "%{http_code}" --retry 6 --retry-delay 10 --retry-all-errors https://leetusik.github.io/knowledge/` → expect **200** (first-deploy propagation can lag a minute or two).
- Content sanity on the fetched HTML: page title "Knowledge Base"; the Recent list present; spot-check one known page under `hi2vi_web/` (pick a real one from `docs/hi2vi_web/`) and that `tags/` renders.
- Record evidence (status codes, key excerpt lines, `date` timestamp) in `result.md` beside this plan.
- Append a short cross-slice note to `../../phase.md`: site verified live at the URL — pipeline proven end-to-end. **No new Doc impact line** — S1's operations line already covers the pipeline truth.
- If still 404/failing after retries: return `needs_operator` with exactly what was observed (likely the Pages setting or a red Actions run) — do not guess-fix CI in this slice.

## Boundaries

- No commits, no workflow state transitions, no `doc-new-version`, no `new-slice`, never push.
- Touch nothing outside `result.md` + the `phase.md` append.
