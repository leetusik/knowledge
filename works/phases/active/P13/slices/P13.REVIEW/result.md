# P13.REVIEW — result

**Verdict: `pass`.** Every P13 code deliverable is complete, committed, and proven on localhost; the phase objective (a user inside Claude Code/Codex runs the whole lifecycle without the website) is met at the code level. "Hosted end-to-end" is explicitly scoped as **pending a one-time operator cutover** of the P10–P12 accounts plane — a documented follow-up spanning P10–P13, **not** a P13 code defect. Durable docs consolidated into 8 new versions.

## What I validated (all five baselines match the plan)

| Command | Expected | Result |
|---|---|---|
| `python3 scripts/workflow.py validate` | state integrity | **passed** |
| `cd cli && uv run pytest -q` | 39 passed | **39 passed** |
| `uv run pytest -q` (root) | 65 passed, 12 skipped | **65 passed, 12 skipped** |
| `python3 scripts/plugin_parity.py` | exit 1, exactly 34 issues, 0 `cli/` | **exit 1, 34 issues (26 completeness + 8 byte-drift), 0 `cli/` mentions** |
| `scripts/cli_smoke.py` exists + reads as a faithful lifecycle+429 driver | present | **present (372 lines); confirmed faithful** |

- The 34 parity issues are the pre-existing D9 backlog (P10–P12 `server/*` never mirrored to the plugin template) — **P13 added zero new parity debt** (0 `cli/` mentions, byte-identical to the S1 baseline through S5). Not P13's to fix (the plugin stays untouched by decree).
- **`cli_smoke.py` read-through:** it drives the *installed* `knowledge` binary via one `subprocess` per command under a throwaway `XDG_CONFIG_HOME`, **scrubs** `KB_API_TOKEN`/`KB_API_BASE_URL` from the child env (the tenant-#1 public-write hazard), and walks init → projects-empty → save → list → search → read-roundtrip → projects-present → usage → logout → post-logout-`vk_`-survival → throttle. The throttle check proves byte-identical generic-401 (enumeration safety) then a 429 at exactly `limit+1`, with a clean `error: HTTP 429` surfacing; collect-all-failures / `PASS`-exit-1 style mirroring `onboarding_smoke.py`. I did **not** re-run the live stack — S5 proved it live; I trust the slices' recorded `done` verdicts and validated them together at the doc/intent level.

## The hosted-cutover call (the thing this review had to get right)

The hosted `knowledge init` flow is **not yet live, and that is not a P13 gap.** Verified state:

- **P13's own deliverable — the edge routing — is deployed and verified.** `deploy/knowledge.conf`'s `location /auth/` + `location /app/` route the control plane to the API; `GET https://knowledge.hi2vi.com/auth/me` returns FastAPI JSON, not the old mkdocs 404 HTML. S5's work is done.
- **The gap is upstream: the P10–P12 accounts plane was never deployed to prod.** No `knowledge-postgres` on the box, box clone at pre-P13 code (the running API has no `/auth` routes behind the edge yet), box `.env` missing `POSTGRES_PASSWORD`/`KB_OPERATOR_EMAIL`/`KB_OPERATOR_PASSWORD`. So a hosted `knowledge init` cannot complete until the operator runs a one-time P10→P13 cutover (push → provision secrets → Production Deploy → `alembic upgrade head` → `python -m server.seed` → deploy edge conf → verify).

Every P13 slice validated against **localhost** for exactly this reason (S1–S5 all note it). The code lights the hosted flow up the moment the operator runs the cutover. I wrote that cutover as an **ordered runbook** into the new `operations.md` version (*Hosted accounts-plane cutover (P10–P13)*) and scoped "hosted end-to-end" as pending it in `api.md`, `product.md`, `experience.md`, and `qa.md`. This is why `pass` is the right verdict rather than `changes_requested`: the code deliverables are sound; the remaining work is an operator action, not a defect.

## Phase against intent

`intent.md` asked for (a) a standalone installable CLI (not a plugin feature) to sign up, log in, set credentials, and use the knowledge features end to end; (b) agent-readable guide docs bundled with the CLI; (c) knowledge saving + Claude Code connection free-tier, no paid gating. All delivered: S1 (package + config seam + client), S2 (`signup`/`login`/`logout`/`whoami`/`init` — the two-token payoff proven against the verbatim SKILL heredoc), S3 (`save`/`search`/`list`/`read`/`projects`/`usage` + `--json`), S4 (bundled `knowledge guide` + discovery, Open Question (a) resolved), S5 (edge routing + server-side `/auth` throttle + `cli_smoke.py`). No paid gating anywhere in the CLI flow. The plugin (`/knowledge:explain` + `/knowledge:setup`) is untouched by decree, as required.

## Docs consolidated (8 new versions, one per affected Doc-impact area)

Walked `phase.md`'s Doc impact list (DECOMP → S5) and issued one `doc-new-version --source P13.REVIEW` per affected doc, then `rebuild-docs` + `validate`:

- **api** `v0010` — public contract widened `/api/* + /healthz` → `/api/* + /auth/* + /app/* + /healthz`; new `429` on `/auth/{signup,login}`; the `{total,items}` vs `{total,results}` shape split; `/api/projects` = GROUP BY over documents; the prod-cutover caveat.
- **security** `v0009` — the two-token model; passwords never in `argv`; show-once `vk_` written to the seam, never printed (`redact_token`); generic-401 preserved through the throttle; `chmod 600` enforced in code; the public grant throttled server-side per-IP (why not nginx); the `$KB_API_TOKEN` → tenant-#1 hazard; 7 checklist items; the P8 "no rate limit needed" open-question narrowed.
- **product** `v0005` — the CLI as a third distribution surface; agent-first non-interactive onboarding; the bundled guide as the second deliverable.
- **experience** `v0006` — the CLI journey (one-shot `init`; the six commands; the two-token model visible after `logout`; the `--json`/exit-code agent contract).
- **operations** `v0014` — install (`uv tool install ./cli` proven / git form once pushed); `--reinstall` not `--force`; alembic in-container; the edge change; `KB_AUTH_RATE_LIMIT`/`KB_AUTH_RATE_WINDOW_S` (not yet in `compose.prod.yml`); **the hosted accounts-plane cutover runbook**; 3 new invariants.
- **architecture** `v0011` — the `cli/` package boundary (own dist, root stays `package = false`); the two deliberate implementations of the config contract; base-url via `load_raw` not `resolve()`; the additive `api.project` key (absence = reuse and backfill).
- **decisions** `v0014` — D-P13-1…6 as ADRs; resolved Open Questions (a) bundled-not-served, (b) `save` prints `id`/`rel_path`, (d) CLI is `knowledge`; the `save`-project-= -repo-basename override; two supersessions (P8 rate-limit rationale narrowed; DECOMP config-default line overridden).
- **qa** `v0007` — `scripts/cli_smoke.py` exists + is a faithful driver; 429 + generic-401 proven live at S5; the fresh-window caveat; hosted E2E pending the cutover; 4 new fragile areas.

`backend`/`data`/`frontend` were **skipped** — no Doc impact line lands there (no new server logic beyond the throttle, which is security's; no schema; no web UI).

## Deviations from `plan.md`

None material. The plan's expected doc set (api, security, product, experience, operations, architecture, decisions, qa) is exactly what I consolidated; backend/data/frontend skipped as the plan allowed. Long auto-generated version filenames forced one shorter `--summary` for `operations` (the first attempt hit a filesystem name-length limit) — cosmetic, the version body carries the full prose.

## For the orchestrator

Record with `review-phase P13 --verdict pass --reviewer slice-executor-high` and run `validate`. I did not commit, did not run `review-phase`, and did not transition phase status. The operator's P10–P13 hosted cutover (operations → *Hosted accounts-plane cutover*) is the remaining follow-up to make the hosted CLI flow live — it is not a P13 deliverable.
