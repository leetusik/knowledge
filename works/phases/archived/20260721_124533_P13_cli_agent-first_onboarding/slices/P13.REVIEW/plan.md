# P13.REVIEW — phase review + durable-doc consolidation

`review` · executor **`slice-executor-high`**

## What this review covers

P13 shipped a standalone `knowledge` CLI + agent-readable guide docs so a user inside Claude Code/Codex can run the whole lifecycle without the website (`intent.md`). Five implementation slices are done and committed:

- **S1** — CLI package + config seam + HTTP client
- **S2** — `signup`/`login`/`logout`/`whoami`/`init` (the two-token model; proved the seam lights up `/knowledge:explain`)
- **S3** — `save`/`search`/`list`/`read`/`projects`/`usage` (+ `--json`)
- **S4** — bundled `knowledge guide` + discovery
- **S5** — edge routing for `/auth/*` + `/app/*`, server-side per-IP throttle on the public grant, `scripts/cli_smoke.py` E2E

Validate all five together, review against the objective + `intent.md` + the durable docs, and **on a passing review consolidate the phase's Doc impact notes into new doc versions**.

## Validate (state integrity + the phase's own baselines)

- `python3 scripts/workflow.py validate` — state integrity.
- `cd cli && uv run pytest -q` → **39 passed**.
- `uv run pytest -q` (root) → **65 passed, 12 skipped** (the throttle must not have regressed this).
- `python3 scripts/plugin_parity.py` → exit 1, **exactly 34 issues, 0 `cli/` mentions** (D-P13-5: the phase added no CLI parity debt; the 34 are the pre-existing D9 backlog).
- `python3 scripts/cli_smoke.py --base-url http://localhost:8766` is the E2E artifact S5 proved live — you do **not** need to re-run the live stack; confirm the script exists and reads as a faithful lifecycle+429 driver. Do not re-run each slice's live run — trust the slices' recorded `done` verdicts + `result.md` files; this review validates them *together* at the doc/intent level.

## The one thing this review must get right: the hosted cutover

**The hosted flow is not yet live, and that is NOT a P13 code defect — record it honestly, do not fail the phase for it.** Verified against the box this session:

- The edge now routes `/auth/*` + `/app/*` to the API (deployed + verified: they return FastAPI JSON, not the old mkdocs HTML). That was S5's deliverable and it is done.
- But the **accounts plane (P10–P12) was never deployed to prod**: `knowledge-postgres` is not running on the box, the box clone is at pre-P13 code with no `/auth` routes, and the box `.env` lacks `POSTGRES_PASSWORD`/`KB_OPERATOR_EMAIL`/`KB_OPERATOR_PASSWORD`. So a hosted `knowledge init` cannot work until a one-time production cutover the operator owns (provision secrets → trigger the `Production Deploy` action → `alembic upgrade head` → `python -m server.seed`).

Treat this as a **documented operational follow-up that spans P10–P13**, not a P13 gap: every P13 deliverable is complete and proven on localhost, and the edge routing lights the flow up the moment the operator runs the cutover. The verdict should be **`pass`** if the code deliverables are sound, with "hosted end-to-end" explicitly scoped as pending that operator cutover. Write the cutover as an ordered runbook in the new `operations.md` version.

## Consolidate the durable docs (only on a passing review)

Walk the phase's **Doc impact** list in `phase.md` (DECOMP → S5, each slice's confirmed/corrected line) and issue one `doc-new-version --doc <d> --summary "..." --source P13.REVIEW` per affected doc. Do **not** hand-edit `docs/current/*` (generated). Expected set:

- **`api.md`** — the frozen public consumer contract **widened** from `/api/* + /healthz` to `/api/* + /auth/* + /app/* + /healthz`; new **429** (`Retry-After`, generic body) on `/auth/{signup,login}`. Note the two response-shape facts S3 surfaced (`/api/documents` → `{total,items}` vs `/api/search` → `{total,results}`; `/api/projects` is a GROUP BY over documents).
- **`security.md`** — the two-token model (non-expiring `vk_` = `api.token`; additive 30-day `auth.session_token`); passwords never in `argv`; show-once `vk_` written to the seam, never printed (`redact_token`); generic-401 enumeration-safety preserved verbatim (incl. through the throttle); `chmod 600` now enforced in code; the **public password grant is throttled server-side per-IP** (in-process, single-worker-coherent, why not an nginx zone); the `$KB_API_TOKEN` → tenant-#1 public-publish hazard + warning.
- **`product.md`** — the CLI as a third distribution surface; agent-first, non-interactive onboarding; the bundled guide as the second deliverable.
- **`experience.md`** — the CLI journey (`init` one-shot; `save`/`search`/`list`/`read`/`projects`/`usage`); the two-token model visible from the terminal (after `logout`, reads keep working, `usage` needs re-login); the `--json`/exit-code agent contract.
- **`operations.md`** — install is `uv tool install ./cli` proven / the `git+…#subdirectory=cli` form true once pushed (now pushed); `--reinstall` not `--force`; alembic runs **inside** the container; edge routing added + the deploy path; **the hosted cutover runbook** (secrets → Production Deploy action → migrate → seed); `KB_AUTH_RATE_LIMIT`/`KB_AUTH_RATE_WINDOW_S` exist and default 20/900s but are **not yet in `compose.prod.yml`** (box runs code defaults).
- **`architecture.md`** — the `cli/` package boundary (own hatchling dist, console script `knowledge`, root stays `package=false`); the **two deliberate implementations** of the `knowledge-kb` config contract that must change together; base-url resolution reads the config literally (`load_raw`), never `resolve()`; the additive `api.project` key (absence = unknown → reuse and backfill, never mint).
- **`decisions.md`** — D-P13-1…6, and the resolved open questions: (a) guide bundled not served; (b) `save` prints id/rel_path not the `url`; (d) the CLI is `knowledge`, no `kb` alias; plus S3's override of DECOMP's project-default line (project = repo basename per `explain/SKILL.md:160`).
- **`qa.md`** — the CLI smoke (`scripts/cli_smoke.py`) exists; the 429 + generic-401 are proven live; note hosted E2E is pending the cutover.

Keep each version summary tight; the version body is the durable prose. `backend.md`/`data.md`/`frontend.md` are untouched by P13 (no new server logic beyond the throttle, which is `security.md`'s; no schema; no web UI) — skip them unless a Doc impact line genuinely lands there.

## Record

Return a `review_verdict` (`pass` expected). The orchestrator records it with `review-phase P13 --verdict … --reviewer slice-executor-high` and validates. Do not commit and do not transition phase status yourself.
