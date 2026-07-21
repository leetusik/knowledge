# Result — P17.S4: Plugin-template parity remediation (promoted D9)

**D9 is delivered by this slice.** The P10–P16 SaaS server is now mirrored into
`plugin/templates/kb/`, `scripts/plugin_parity.py` exits **0** (was FAIL 36), and a
freshly rendered scaffold **boots dormant single-tenant** exactly like before —
proven end-to-end with Docker.

## Mirror inventory

**Added (27 byte-copies from repo → `plugin/templates/kb/`, all listed in the manifest
`identical` class):**

- `server/accounts/{__init__,auth,repository,security,service,types}.py` (6)
- `server/{api_auth,app_api,auth_api,dashboard_api,documents_api,graph_api,seed,usage_api}.py` (8)
- `server/persistence/{__init__,base,engine,models}.py` (4)
- `server/usage/{__init__,metering,repository,service,types}.py` (5)
- `tests/{test_dashboard_api,test_documents_api,test_graph_api,test_html_documents}.py` (4)

**Refreshed (8 byte-drifted `identical` files, re-copied from repo):**
`server/{config,db,documents,main,reindex,search}.py`, `pyproject.toml`, `uv.lock`.
(`uv.lock`/`pyproject.toml` now carry the accounts-plane deps — this is what makes the
mirrored server import + boot cleanly; the Docker build's uv-install layer cache-hit
against the repo image confirms the dep sets are byte-identical.)

All 35 copies were verified byte-identical to their repo counterparts (`cmp -s`).

**Deliberately NOT shipped (limitation — recorded here + in `phase.md`):** `alembic/`
(dormant scaffolds never migrate; multi-tenant self-hosting stays undocumented),
`scripts/onboarding_smoke.py`, `cli/`. None are in `shipped_dirs`, so parity does not
require them; they are intentionally out of the open-core scaffold.

## The parameterization as landed

The repo `compose.yml:40` sets a literal tenant-mode
`DATABASE_URL: postgresql+psycopg://kb:kb@postgres:5432/kb`. A plain mirror would put
every scaffold user into tenant mode (migrate/seed obligations, the P10 boot-failure
class). Resolved with a new render token, exactly as the plan directed:

- **`plugin/templates/kb/compose.yml`** — the full repo compose is mirrored (postgres
  service, `depends_on: postgres/service_healthy`, `KB_OPERATOR_EMAIL`/`KB_OPERATOR_PASSWORD`
  `${VAR:-}` host-env passthroughs, `pgdata` volume) with exactly **four** render tokens:
  `{{KB_VIEWER_PORT}}`, `{{KB_API_PORT}}`, `{{KB_TZ}}`, and the new `{{KB_DATABASE_URL}}`
  on the DATABASE_URL line. Every comment is left byte-identical to repo (the existing
  repo comment already documents the dormant case: *"Unset would leave accounts
  dormant"*).
- **Operator render** (`params.operator.json` gains
  `KB_DATABASE_URL = "postgresql+psycopg://kb:kb@postgres:5432/kb"`) →
  `DATABASE_URL: postgresql+psycopg://kb:kb@postgres:5432/kb`, byte-matching repo →
  **parity green**.
- **Scaffold render** (setup skill passes `--set KB_DATABASE_URL=""`) →
  `DATABASE_URL:` (YAML null). Docker Compose resolves a null environment value from the
  host env; a fresh self-host machine has no `DATABASE_URL`, so the var is **UNSET** in
  the api container. `server/config.py::database_url()` (`_env` returns the default when
  the value is None *or* empty) → `None` → **accounts plane dormant, single-tenant**.
  (Verified in-container: `DATABASE_URL=[<UNSET>]`.)

### Why a render token (not `${...}`) and one inherent caveat

Parity byte-compares the *operator-rendered* compose against the repo's **unquoted
literal**. Quoting (`DATABASE_URL: "{{KB_DATABASE_URL}}"`) would break that match, and a
plain `${DATABASE_URL:-}` passthrough can never reproduce the literal — so a render token
is the only form that satisfies both parity (operator → literal) and dormancy (scaffold →
null). One inherent, benign consequence: because the null value is a host-env passthrough,
a scaffold user who *had* exported `DATABASE_URL` in their shell would light the accounts
plane up against the bundled `postgres` service. That is opt-in latent capability, matches
the repo comment's "Unset → dormant" contract, and never fires for a fresh self-host user.

### `render.py` untouched

`render.py` has no optional/default-param mechanism (it strictly requires every
referenced token to be provided and every provided param to be referenced, both
directions). It needed **no change**: the empty scaffold value is supplied by the setup
skill's `--set KB_DATABASE_URL=""`, and `""` renders as the empty string.

## Manifest + setup-skill plumbing

- **`plugin/templates/manifest.json`** — 27 added files appended to `identical`; new
  `KB_DATABASE_URL` entry in the `placeholders` doc-block; `parameterized`,
  `template_only`, and `shipped_dirs` unchanged.
- **`plugin/templates/params.operator.json`** — added `KB_DATABASE_URL` (the full repo
  value) so parity's operator render round-trips byte-exactly.
- **`plugin/skills/setup/SKILL.md`** — added `KB_DATABASE_URL` to the stage-2 param table
  + a one-bullet "always empty (dormant)" derive note; added `--set KB_DATABASE_URL=""` to
  the stage-4 render invocation (**required** — the scaffold render fails without it); added
  the `KB_DATABASE_URL: ""` row to the `.kb-scaffold.json` marker; updated the two "seven
  tokens" references → "eight". See *Deviations*.

## Validation

| # | Command | Result |
|---|---|---|
| 1 | `python3 scripts/plugin_parity.py` | **PASS — exit 0** (headline gate; was FAIL 36). Re-run green after all scratch work. |
| 2 | Dormant-boot proof (Docker, full path) | **PASS** — see below. |
| 3 | Sanity-read setup stage-6 probe wording vs new compose | **No change needed** — see below. |
| 4a | `python3 scripts/skills_parity.py` | PASS — explain skill copies in body parity. |
| 4b | `claude plugin validate plugin` | ✔ Validation passed. |
| 4c | `python3 scripts/workflow.py validate` | Workflow validation passed. |
| 5 | New test suites | None — the 4 test mirrors are byte-copies (contract: keep tests terse). |

### Dormant-boot proof (Docker available: server 28.2.2, daemon up)

Rendered a scaffold into a scratch dir (`--set KB_DATABASE_URL=""`, ports 8790/8791 to
avoid the operator's 8765/8766), 62 files, **no leftover `{{KB_` tokens**, all three new
server subtrees present. Then:

- `docker compose build api` → **built** (uv dep-install layer cache-hit vs the repo image
  → the mirrored `pyproject.toml`/`uv.lock` are the same accounts-plane dep set).
- `docker compose up -d` → postgres **Healthy**, then api **Started** (the `depends_on`
  health gate works).
- In-container env: `DATABASE_URL=[<UNSET>]`. api logs: *"startup reindex: indexed=1 …"*,
  *"Application startup complete"*, *"Uvicorn running"* — **no accounts/postgres
  connection attempt** → dormant single-tenant, exactly like today.
- `curl /healthz` → **200** `{"status":"ok","db":"ok","documents":1}`.
- `POST /api/documents` (markdown, unauthenticated local write) → **201** (id=2,
  `format:"md"`) → `GET /api/documents/2` → **200** read-back. (Response `commit_error`
  "not a git repository" is expected — I rendered without the setup skill's `git init`
  step; the doc was still written + indexed.)
- Teardown: `docker compose down -v` (containers + `pgdata` volume + network removed),
  built image removed, scratch scaffold removed. **Confirmed zero `kbscratch` docker
  residue** and scratchpad clean.

### Setup stage-6 wording (validation step 3)

Read stage 6 against the new compose. `docker compose up -d` now brings up 3 services
(kb, postgres, api) and api waits on postgres health, so first boot is marginally slower
and one extra (unused) postgres container runs. The existing wording — *"First build
takes a few minutes"*, probe healthz + report both results — stays accurate; postgres
publishes **no host port**, so the stage-6 "port bind error" note (8765/8766) is
unaffected. **Per the plan's "if the wording needs nothing, change nothing", left
unchanged.**

## Deviations from `plan.md`

1. **Setup skill: touched more than "the param-table row".** The plan's scope guard says
   "at most the param-table row … if render strictly demands the new param." Render *does*
   strictly demand it, and the param-table row alone is documentation — the scaffold
   render only works if the stage-4 invocation actually passes the param, so I also added
   `--set KB_DATABASE_URL=""` (load-bearing) plus consistency edits (the derive bullet, the
   marker row, "seven → eight tokens"). All are minimal and confined to making the scaffold
   render correctly; nothing else in the skill changed. High-tier judgment within the
   plan's clear intent (a working dormant scaffold).
2. **compose.yml comment not "adjusted".** The plan said keep the DATABASE_URL comment
   "adjusted to explain both values" and add a template comment that a scaffold boots an
   unused postgres. But `compose.yml` is `parameterized` — the *operator* render must
   byte-match repo, so any comment text not in the repo breaks parity. The repo comment
   already states "Unset would leave accounts dormant", covering both values; the
   "unused postgres" acceptance is documented here + in `phase.md` instead of in the file.
   Parity (the headline gate) constrains this.

No other deviations. Repo-side `server/**`, `compose.prod.yml`, `deploy/**`, `cli/`
untouched; plugin version stays **0.3.0**; `render.py` unchanged.
