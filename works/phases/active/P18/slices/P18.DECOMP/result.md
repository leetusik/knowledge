# Result — P18.DECOMP

Executed by `slice-executor-high`, 2026-07-22. Decomposition slice: designed P18's breakdown, created the five middle slices as bare folders, and seeded `phase.md`. No implementation, no commits, no status transitions.

## What I created

Five middle slices (via `python3 scripts/workflow.py new-slice`), bare folders (each holds only `slice.json` — no `plan.md`):

| slice | order | kind | risk | depends_on | scope (one line) |
|---|---|---|---|---|---|
| P18.S1 | 1 | implementation | high | — | alembic 0003 + models + signup/seed default-org/default-project provisioning |
| P18.S2 | 2 | implementation | high | P18.S1 | org-key resolver + additive mint endpoint + write-path get-or-create + metering |
| P18.S3 | 3 | implementation | medium | P18.S2 | web org-keys surface (reused components) + workspace→org copy + BFF routes |
| P18.S4 | 4 | implementation | medium | P18.S2 | CLI `"default"` fallback + explain/setup skill text + skills parity |
| P18.S5 | 5 | implementation | high | P18.S2, P18.S4 | prod alembic 0003 + seed + deploy + extended onboarding E2E (operator-gated) |

DECOMP=order 0, REVIEW=order 9999 (unchanged) — REVIEW stays last.

**Risk reasoning (it selects the executor tier — the phase's cost lever):** S1/S2/S5 are `high` (live prod migration with a UNIQUE constraint that fails on pre-existing dupes + a hot-path resolver change + operator-gated prod cutover — full judgment). S3/S4 are `medium` (web reuses existing P12 components but adds a new surface + BFF wiring; CLI/skills is mostly text but the `DEFAULT_PROJECT`-vs-new-constant decision and byte-exact explain-copy parity are real judgment). **No slice is `low`** — nothing here is fully mechanical.

## `phase.md` seeded

Filled every section: **Context** (accounts-plane map re-verified against the code, with the corrections below), **Decomposition** (per-slice scope + rationale + risk reasoning), **Findings & Notes** (cross-slice decisions later slices must honor), **Constraints** (frozen additive contract, single-worker, parity gates, manual prod schema, Postgres-gated tests, D14/P19/P20 boundaries), **Doc impact expectations** (which of the 11 docs each slice will likely touch + a running "Doc impact" list for slices to append to), and **Open Questions** (all resolved).

## Verification against the code (corrections to the orchestrator's map)

I re-verified every anchor the plan builds on. All held, with these refinements now recorded in `phase.md`:

- **`server/persistence/models.py`** — confirmed `ProjectModel` has no unique constraint (only `ix_projects_tenant_id`) and `ProjectCredentialModel.project_id` is a **non-nullable** FK with no `tenant_id` column. So 0003 must both add `tenant_id` and relax `project_id` nullability.
- **CLI `--project` already ships** (`knowledge.py:632-635`, threaded at `:378`) — the plan's point 4 is mostly already done. The one real behavior gap is the outside-a-repo fallback: `default_project()` falls back to **`auth.DEFAULT_PROJECT = "knowledge"`** (`auth.py:64`), not `"default"`. And `DEFAULT_PROJECT` is **shared** with `init --project`'s default (`auth.py:585`), so S4 must avoid silently changing `init`'s behavior — flagged as an S4 decision.
- **Parity scope pinned exactly:** `plugin/templates/manifest.json` `shipped_dirs = ["server","tests","docs/assets","docs/stylesheets","docs/javascripts"]`, checked set-for-set + content-identical by `scripts/plugin_parity.py`. **`alembic/` is not shipped** (template has no alembic dir) — migrations stay repo-only; every `server/**` and `tests/**` edit mirrors into `plugin/templates/kb/` in the same slice. `scripts/skills_parity.py` guards only the two explain-skill copies (`plugin/skills/explain/SKILL.md` ≡ `.agents/skills/explain/SKILL.md`).
- **De-facto tenant-wide enforcement confirmed** in the resolver (`api_auth.py:153-164` returns `ctx.tenant_id` for any `vk_`) and the write path (`main.py:389-592` never checks `body.project` against the credential) — so org-level keys make existing behavior honest, not looser (relevant to the security-doc wording in S2).

## Deviations from plan.md

None on substance. I adopted the plan's suggested ~5-slice shape verbatim in structure. Refinements the plan invited ("verify anything you build on", "you own the final breakdown"): recorded the CLI-`--project`-already-exists finding and the `DEFAULT_PROJECT` sharing nuance, and pinned the exact parity `shipped_dirs`/`alembic`-excluded scope. Set S3/S4 to depend only on P18.S2 (they are parallel-safe) and S5 to depend on P18.S2 + P18.S4.

## Validation

- `python3 scripts/workflow.py validate` → **passed** ("Workflow validation passed.").
- Bare-folder check: each of P18.S1..S5 contains only `slice.json` (no `plan.md`) → confirmed.
- `next` will point at P18.DECOMP until the orchestrator finishes this slice (DECOMP is still `in_progress`); once finished, order-1 P18.S1 is next.

## Doc impact

None from this slice — DECOMP records no durable-truth code change of its own (it seeds the "Doc impact" running list in `phase.md` for the middle slices to append to). Consolidation happens at P18.REVIEW.
