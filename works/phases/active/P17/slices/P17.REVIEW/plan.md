# Plan — P17.REVIEW: phase review

Operator-approved at the plan gate (2026-07-21). You are the phase reviewer
(slice-executor-high). Read in full: `../../intent.md`, `../../phase.md` (objective,
Decomposition, every Findings note, Constraints, Open Questions, and the `### Doc
impact` list — your consolidation source), and each slice's `result.md`
(`../P17.S1/` … `../P17.F1/`). The six work commits: `fd35a34` DECOMP, `c74350c` S1,
`4171bd0` S2, `7ada848` S3, `3ad7bd9` S4, `07db7d4` S5, `f923822` F1.

## Job

1. **Validate all slices together** (matrix below).
2. **Review the phase** against `intent.md`'s confirmed points, the objective, and the
   current docs; judge the residuals.
3. **Only on a passing review**: consolidate the `phase.md` Doc-impact lines into new
   doc versions (`python3 scripts/workflow.py doc-new-version --doc <doc> --summary
   "..." --source P17.REVIEW` per doc — writing DOCS only, never source; this is the
   one command class you are allowed beyond reads/analysis).
4. Write `result.md` (the review report) + append a review section to `phase.md`.
5. Return a structured verdict with `review_verdict: pass | changes_requested |
   blocked` (+ concrete proposed fix slices on `changes_requested`). You never commit
   and never transition slice/phase status — the orchestrator records the verdict via
   `review-phase`.

## Validation matrix (terse; each row names its slice)

| Slice | Check |
|---|---|
| all | `python3 scripts/workflow.py validate`; `git log --oneline -8` shows the six slice commits |
| S4/S2 | `python3 scripts/plugin_parity.py` → exit 0 · `python3 scripts/skills_parity.py` → exit 0 |
| S1/S3 | `claude plugin validate .` + `claude plugin validate ./plugin` (skip gracefully if CLI absent) |
| S1 | `works/phases/active/P17/slices/P17.S1/sample-explainer.html`: first line `<!DOCTYPE html>`; greps ALL empty: external `src=`, `<link`, `@import`, `url(http`, `fetch(`, `XMLHttpRequest`, `<form`, `target="_blank"`. Run the skill's §2 resolver snippet once → `KB_STATUS=configured` |
| S2 | `.claude/skills/explain/` absent; `diff ~/.claude/skills/explain/SKILL.md plugin/skills/explain/SKILL.md` → empty (if reading the home path is blocked, record as residual — do not fail the review on it) |
| S3 | scratch `XDG_CONFIG_HOME`: write the connect-mode JSON (`api.base_url`/`token`, `site.base_url`, no `kb_root`), run the §2 resolver → configured, host echoed, `KB_LOCAL_FALLBACK=no`; real operator config NEVER touched |
| S5 | Live credential-free re-probes ONLY (python3 urllib + browser UA; create NO accounts, POST nothing): `/healthz` → 200 · `POST /auth/login` nonsense creds → 401 `invalid email or password` · unauth `GET /app/documents/1/raw` → 401. The full 17/17 E2E + MCP `vk_` pass is recorded evidence in S5's `result.md` — cite it, don't repeat it |
| F1 | `bash -n deploy/deploy.sh` clean; the three edits present (force-recreate step, `assert_api_fresh`, corrected prose) |
| regression | backend `uv run pytest tests -q` (expect the P16 baseline ≈ 70 passed / 13 skipped) and mcp-server `uv run pytest` (≈ 12 passed) — P17 touched no server/web/mcp source, so these prove non-regression; web suite skipped by judgment (zero web changes) unless you see a reason |

## Review criteria

`intent.md`'s four confirmed points: (1) always-HTML gist-style explainer, both modes,
markdown house style fully replaced (S1 — inspect the canonical SKILL.md yourself);
(2) best-practices section default-on + judgment gate + mandatory visible-domain
citations + graceful offline skip (S1); (3) public multi-user ingestion — setup
Connect mode (S3), prod accounts plane verified live, hosted fresh-user E2E incl. the
MCP `vk_` path (S5), one-key-serves-all-repos model; (4) all copies reconciled with a
CI guard (S2). Beyond intent: D9 delivered (S4), the split-deploy fix (F1).
Constraints to confirm held: no `/api/*` or MCP contract change anywhere (S1's
`format:"html"` is additive USE of the P16 contract); no design-cowork breach (the
gist is the operator-chosen reference); terse tests only; docs versioned only here.

## Residuals to judge + record (none expected to block; do not fake any of them)

- In-browser quiz-render eyeball → operator residual (P16 accepted the same class);
  natural moment = the operator's post-phase dogfood (install the plugin from the
  public marketplace, `/knowledge:setup` connect, `/explain`, view the doc — which
  also completes S2's flagged end-state).
- F1 is armed-but-not-live-proven (deploy.sh self-upgrades from the box clone; the
  optional two-dispatch proof stays open; the next organic deploy proves it).
- Two throwaway prod tenants + doc 13 (emails in S5's `result.md`; no delete API).
- `alembic/` deliberately unshipped from the scaffold template (S4 limitation).

## Doc consolidation on pass (source: `phase.md` `### Doc impact`, the 10 done-lines)

Expected: **product**, **experience**, **decisions**, **operations**, **qa**,
**architecture** — one `doc-new-version` each with a precise summary (source
`P17.REVIEW`). The S1 "api usage" line records *no contract change* — fold it into
decisions/product rather than versioning `api`, unless at full context you judge an
api version genuinely warranted (P16-style latitude; give the rationale in
`result.md` if you deviate). Never hand-edit `docs/current/*`; never touch old
versions.

## Wrap-up

`result.md` = the review report (matrix outcomes, criteria verdicts, residual
judgments, docs consolidated with version ids, or the proposed fix slices).
`phase.md` gains a `### P17.REVIEW` section summarizing the verdict. Return the
structured verdict with `review_verdict`. Never commit; never transition status.
