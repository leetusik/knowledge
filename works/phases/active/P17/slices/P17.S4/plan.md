# Plan — P17.S4: Plugin-template parity remediation (promoted D9)

Operator-approved at the plan gate (2026-07-21). Orchestrator bumped the tier
`medium → high` at this gate (recorded in slice.json): the mirror-vs-dormant
reconciliation below is design-bearing, not mechanical. Read `../../phase.md`
(Findings & Notes: the D9/parity section + Constraints) first. This slice realizes
deferred **D9** (already promoted; the original deferred context is appended at the
bottom of this file — note its counts predate P13/P16: the gate now fails with 36).

## Job

Mirror the P10–P16 SaaS server into `plugin/templates/kb/` so
`python3 scripts/plugin_parity.py` exits **0** (36 issues today), while a freshly
rendered scaffold **stays dormant single-tenant** and boots exactly like today's.
Operator-ratified direction: mirror, never narrow `shipped_dirs`.

## The trap this plan resolves (read before editing)

The parity gate byte-compares `identical` files and **renders `parameterized` files
with the operator params** (via `plugin/setup/render.py` + its params file — map the
exact paths from `scripts/plugin_parity.py` itself) expecting a byte-match with the
repo file. The repo `compose.yml:40` sets
`DATABASE_URL: postgresql+psycopg://kb:kb@postgres:5432/kb` — so a plain mirror would
give every scaffold user a TENANT-MODE stack (migrate/seed obligations, the
boot-failure class the P10 runbook documents) and break the phase's promise that
scaffolds behave dormant. Reconcile with parameterization:

1. Template `compose.yml` gets a `{{KB_DATABASE_URL}}` placeholder on that line
   (keep the surrounding comment, adjusted to explain both values).
2. The operator params file sets it to the full repo value — parity's operator-render
   then byte-matches `compose.yml` → gate green.
3. The SCAFFOLD-side value defaults to **empty** → api env `DATABASE_URL:` (empty) →
   accounts plane dormant. Wire the default at the `render.py` level if its mechanics
   allow a default/optional param (read the code first); only if render strictly
   requires every placeholder do you add the minimal param plumbing to the setup
   skill's scaffold param table (`plugin/skills/setup/SKILL.md` — S3 just landed
   there; touch ONLY the param table row if unavoidable, nothing else).
   VERIFY the empty-value behavior end-to-end: compose yields a set-but-empty env —
   confirm `server/config.py::database_url()` treats empty as None (read it; if it
   does not, choose a rendered form that omits cleanly or a `${KB_DATABASE_URL:-}`
   host-env passthrough — your call, with the dormant outcome proven by the boot
   check below).
4. `KB_OPERATOR_EMAIL`/`KB_OPERATOR_PASSWORD` already use `${VAR:-}` host-env
   interpolation — copy through literally. The `postgres` service block +
   `depends_on: service_healthy` mirror as-is (a scaffold boots an unused postgres —
   accepted; say so in the template comment).

## The mirror set

- **Add** (byte-copy from repo, then list each file in the template manifest's
  `identical` class): `server/accounts/**`, `server/persistence/**`,
  `server/usage/**`, `server/{api_auth,app_api,auth_api,dashboard_api,documents_api,
  graph_api,seed,usage_api}.py`, and the 4 missing test files
  (`tests/test_dashboard_api.py`, `tests/test_documents_api.py`,
  `tests/test_graph_api.py`, `tests/test_html_documents.py`). Treat the parity
  output as the authoritative list — mirror EXACTLY what completeness demands,
  no extras.
- **Refresh** the byte-drifted `identical` files: `server/{config,db,documents,main,
  reindex,search}.py`, `pyproject.toml`, `uv.lock` (the dep set now carries the
  accounts plane — this is what makes the mirrored server import cleanly).
- **Manifest** (`plugin/templates/manifest.json`): extend `identical` with every
  added file; `parameterized` + `shipped_dirs` stay as they are; add the new
  placeholder to the `placeholders` doc-block.
- **Deliberately NOT shipped** (record in result.md + phase.md as a limitation):
  `alembic/` (dormant scaffolds never migrate; multi-tenant self-hosting stays
  undocumented), `scripts/onboarding_smoke.py`, `cli/` — none are in `shipped_dirs`.
- `plugin/.claude-plugin/plugin.json` stays **0.3.0** (same unreleased release).
  `compose.prod.yml` and `deploy/**` are untouched (D11 not triggered).

## Validation

1. `python3 scripts/plugin_parity.py` → **exit 0**. (Headline gate; today FAIL 36.)
2. **Dormant-boot proof**: render a scaffold into a scratch dir with test params and
   the empty `KB_DATABASE_URL`; then `docker compose build api && docker compose up -d`
   there, `curl /healthz` → 200, one `POST /api/documents` markdown round-trip
   (unauthenticated local write, as scaffold users do), read it back, then
   `docker compose down -v` and remove the scratch. If docker is unavailable,
   degrade: scratch venv from the template's `pyproject.toml`/`uv.lock`,
   `DATABASE_URL` unset, `python -c "import server.main"` constructs the app —
   record the un-run docker residual for S5/REVIEW.
3. Sanity-read the setup skill's stage-6 probe wording against the new compose
   (api now waits on postgres health — slower first boot, no behavior change; if the
   wording needs nothing, change nothing).
4. `python3 scripts/skills_parity.py` still green; `claude plugin validate .` +
   `./plugin` (if CLI available); `python3 scripts/workflow.py validate`.
5. No new test suites — the 4 test mirrors are byte-copies.

## Wrap-up

`result.md`: the mirror inventory, the parameterization as landed (exact rendered
forms), boot-proof outcome, limitations. `phase.md` appends: cross-slice note for S5
(parity green → the push no longer turns plugin-ci red; scaffold stays dormant) +
Doc impact lines (architecture/operations: template now mirrors the multi-tenant
server dormant-by-default; parity green; alembic deliberately unshipped). D9 is
delivered by this slice — say so explicitly in result.md. Never commit; never
transition status.

---

## Appendix — original promoted deferred context (D9, written 2026-07-17)

# Deferred: D9 plugin/templates/kb drift: P10-P12 SaaS server files unshipped, plugin_parity exits 1

## Why Deferred

plugin/templates/manifest.json declares shipped_dirs: [server, tests, ...] and scripts/plugin_parity.py fails on any file present in the repo root but missing from the template. The P10-P12 SaaS pivot added server/accounts/*, api_auth.py, app_api.py, auth_api.py, usage/*, documents_api.py, graph_api.py, persistence/*, seed.py plus test files and never mirrored them into the template. Verified 2026-07-17: python3 scripts/plugin_parity.py exits 1 with 34 issues = 26 completeness failures (in repo but not shipped) + 8 byte-drift files (server/config.py, server/db.py, server/main.py, server/reindex.py, server/search.py, pyproject.toml, uv.lock, and parameterized compose.yml). CI is currently green ONLY because local main is 29 commits ahead of origin/main - every P10-P12 commit is unpushed, so plugin-ci.yml has never seen this tree. Not P13's job: P13 is CLI onboarding and its intent says the plugin stays untouched (P13 keeps CLI code/tests out of server/ and tests/ so it adds no new parity debt). Resolution requires a deliberate call: re-sync the template with the SaaS server files, or narrow shipped_dirs so the open-core plugin template stops claiming to ship the multi-tenant control plane.

## Trigger to Promote

before the next push to origin/main (plugin-ci.yml turns red on the first push carrying the P10-P12 commits)
