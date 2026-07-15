# Result — P7.DECOMP (decompose phase P7: Claude Code plugin)

Executed by slice-executor-high. Decomposed phase P7 into six implementation
slices, verified the plan's four "verify-before-relying" claims against the code,
and seeded `phase.md`. No code implemented, no other slice's `plan.md` pre-filled,
no commits, no status transitions.

## Verification of the plan's four claims

1. **`site_smoke.py` PROJECTS hardcode — CONFIRMED (crux).** `scripts/site_smoke.py:48`
   pins `["changple5", "hi2vi_web", "bootstrap_agentic_workspace.sh"]`; `check_built`
   (194–196) requires `site/<project>/index.html` per name, plus the marker/Recent-bullet
   invariants (58–68, 184–187) and the graph doc-count invariants (284–302). A fresh
   scaffold fails its own `pages.yml` deploy gate → S1 de-hardcodes PROJECTS (derive from
   docs tree / graph.json) and S3's seed content must satisfy the invariants. This is the
   S1↔S3 coupling.
2. **`compose.yml` lacks `KB_PUBLIC_BASE_URL` — RESOLVED, no change.** `public_base_url()`
   (`config.py:39–41`, default `http://localhost:8765`) is used only at `main.py:322–324`
   to build the local-viewer response `url`. The `kb` service serves at root, so the
   localhost URL is correct locally; the `/knowledge/` subpath is Pages-only. Setting the
   var would break local links. Do NOT "fix" it.
3. **Dockerfile floating uv tag — CONFIRMED.** `Dockerfile:16` uses
   `ghcr.io/astral-sh/uv:latest`; S1 pins it so the Dockerfile joins the byte-identical
   class.
4. **Stale `result.md` stubs — CONFIRMED, ignored.** This file overwrites the DECOMP stub.

Full detail (3-file-class mapping, config schema, payload-isolation notes) is recorded in
`phase.md` under Findings & Notes and Constraints.

## Middle slices created (bare folders, `slice.json` only)

| Slice | Name | kind | risk | order | depends_on |
|-------|------|------|------|-------|------------|
| P7.S1 | Feature portability pass | implementation | medium | 1 | — |
| P7.S2 | Plugin skeleton + marketplace wiring | implementation | low | 2 | — |
| P7.S3 | Template payload, renderer, parity guard | implementation | high | 3 | S1, S2 |
| P7.S4 | Shipped explain skill | implementation | medium | 4 | S2 |
| P7.S5 | Setup skill | implementation | high | 5 | S3 |
| P7.S6 | E2E install test + docs | implementation | medium | 6 | S3, S4, S5 |

Risk rationale is in `phase.md` (Decomposition). Summary of the cost-lever choices: S2
is the only `low` (deterministic file authoring against a fully-pinned format — literal
plan-follower, escalates on any surprise); S3 and S5 are `high` (byte-parity integration
crux; multi-branch setup UX with idempotency + degraded modes); S1/S4/S6 are `medium`
(bounded judgment). The breakdown matches the plan's advisory candidate — verification
did not warrant deviating from it.

## Validation

- `python3 scripts/workflow.py validate` → **passed** ("Workflow validation passed.")

## phase.md seeding

Filled `## Decomposition` (per-slice scope + risk rationale), `## Findings & Notes`
(the four claim verifications + the 3-file-class mapping, config schema, payload
isolation), `## Constraints` (MIT license, payload isolation, Claude-Code-only scope,
bootstrap untouched, never push, version-bump release rule, SaaS-open config model,
root-only parity guard), and started `## Doc impact` (architecture, api, operations,
security, decisions, product — each with anticipated feeder slices).

## Doc impact

Non-review slice → no doc versioning. Seeded the phase's `## Doc impact` running list in
`phase.md` with the six anticipated docs (architecture, api, operations, security,
decisions, product) and their feeder slices, for the review slice to consolidate.

## Deviations from plan.md

None. Kept the advisory 6-slice breakdown, orders, dependencies, and risk ratings as the
plan proposed — the code verification confirmed rather than contradicted them.
