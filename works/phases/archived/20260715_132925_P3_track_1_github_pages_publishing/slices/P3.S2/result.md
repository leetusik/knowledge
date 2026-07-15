# Result — P3.S2: Publish gate + live-site verification

Verified: 2026-07-02 16:57 KST (`date` → `Thu Jul  2 16:57:15 KST 2026`).

Operator gate cleared before this run: Pages source set to "GitHub Actions" and the site deployed successfully (per orchestrator). This slice is the verification half only — no commits, no state transitions, no push.

## Validation Run

1. Root reachability — **PASS (200)**
   - `curl -sS -o … -w "%{http_code}" --retry 6 --retry-delay 10 --retry-all-errors https://leetusik.github.io/knowledge/` → `200`

2. Homepage content sanity — **PASS**
   - `<title>Knowledge Base</title>` present.
   - "Recent" section present (`id="recent"` anchor + heading). Recent entry links to a real page:
     `The Shared nginx Problem — Explained for Beginners -> hi2vi_web/2026-07-02-shared-nginx-explained/`
   - "Browse" section present linking `Tags -> tags/`.

3. Spot-check page (mkdocs directory URL) — **PASS (200)**
   - Source: `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md`
   - URL: `https://leetusik.github.io/knowledge/hi2vi_web/2026-07-02-shared-nginx-explained/` → `200`
   - `<title>The Shared nginx Problem — Explained for Beginners - Knowledge Base</title>` — confirms directory-URL mapping (`docs/<project>/<file>.md` → `/<project>/<file-without-.md>/`).

4. Tags page renders — **PASS (200)**
   - `https://leetusik.github.io/knowledge/tags/` → `200`, `<title>Tags - Knowledge Base</title>`.

## Deploy history (confirmed via public GitHub API — https://api.github.com/repos/leetusik/knowledge/actions/runs)

- **Run 1** (`push`) — `completed / failure`, id `28574058799`. Build job fully succeeded (pinned install + `mkdocs build` + artifact upload all green); the `deploy` job failed at `actions/deploy-pages@v4` because the push landed BEFORE Pages was enabled (Settings → Pages → Source = "GitHub Actions").
- **Run 2** (`workflow_dispatch`) — `completed / cancelled`, id `28574129019`. Manually cancelled mid-build.
- **Run 3** (`workflow_dispatch`, after Pages was enabled) — `completed / success`, id `28574368474`, https://github.com/leetusik/knowledge/actions/runs/28574368474. **This run published the live site.**

Lesson: first-publish order matters — enable Pages before the first push. Harmless here because the workflow re-runs cleanly via `workflow_dispatch`.

## Outcome

Live site is up at https://leetusik.github.io/knowledge/ with correct title, Recent list, working project-page directory URLs, and a rendered tags page. The Pages pipeline shipped in S1 is now proven end-to-end.

## Deviations from Plan

None.

## Files Changed

- `works/phases/active/P3/slices/P3.S2/result.md` (this file)
- `works/phases/active/P3/phase.md` (cross-slice note appended)

## Doc Versions Created

- None (durable-doc versioning happens at P3.REVIEW; S1's "operations doc" Doc-impact line already covers the pipeline — no new line added).

## Roadmap Updates

- None.

## Retrospective

- Verification-only slice; the `pending` operator gate design worked cleanly — operator enabled Pages + pushed, executor verified live. `curl` (not `gh`, whose token is invalid) sufficed for both reachability and content sanity.
