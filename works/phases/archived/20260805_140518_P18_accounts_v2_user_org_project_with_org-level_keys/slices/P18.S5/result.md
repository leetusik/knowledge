# Result — P18.S5: Prod migration (0003) + deploy + extended onboarding E2E (operator-gated)

Two executor stages around one operator `pending` gate (P17.S5's shape). **Stage A
(below) is complete and returned `needs_operator`.** Stage B appends to this file after
the operator clears the gate and the cutover is live.

---

## Stage A — smoke extension + local proof + prod pre-flight + operator runbook (done 2026-07-22)

### 1. What changed — `scripts/onboarding_smoke.py` gains the P18 org-model journey

The smoke keeps every existing tenant-B check intact (onboard → project-bound `vk_` →
one write → search → list → cross-tenant isolation → `documents_created == 1` metering)
and adds a **section 4** (`_run_org_journey`) that runs in its **own fresh tenant C**
(a second signup) so tenant B's `== 1` usage/isolation assertions stay pristine:

- **Signup provisioning** — asserts the additive `project` field on the signup response
  is the auto `"default"` project, and that `"default"` is a real registry row via
  `GET /app/projects`.
- **One org key, two project names** — mints ONE org-level key (`POST /app/credentials`,
  asserts `project_id: null`), then writes docs to **two never-pre-created** project
  names with it. Both names then appear in `GET /app/projects` (**get-or-create proof**),
  and per-named-project usage (`GET /app/projects/{id}/usage`) shows
  `documents_created == 1` each (metering attributes by project name).
- **Revoke → 401** — `DELETE /app/credentials/{id}` (204), then a write with the revoked
  org key → **401**.
- **Project-bound regression** — a `POST /app/projects/{id}/credentials` key still mints
  (`project_id` = that project) and writes (201).

The style is unchanged (argparse, collect-all-failures, HTTP-level, unique throwaway
emails). `scripts/` is **not** a plugin `shipped_dir`, so there is **no template mirror**
(confirmed: no `plugin/templates/kb/scripts/onboarding_smoke.py`; `alembic/` is repo-only
too) — `plugin_parity` is a pure no-op for this slice.

### 2. Local proof — extended smoke green against a disposable tenant-mode stack

Stood up a throwaway `postgres:17` (`:55433`), applied migrations, seeded, ran a local
`uvicorn server.main:app` in tenant mode against a temp `KB_ROOT`, ran the extended
smoke, verified the resulting rows in Postgres, then tore the whole stack down.

| Step | Outcome |
|---|---|
| `docker run postgres:17` + `.venv/bin/python -m alembic upgrade head` | `0001 → 0002 → 0003` applied clean; `uq_projects_tenant_id UNIQUE(tenant_id, name)` present; `project_credentials.tenant_id` **NOT NULL** (FK tenants CASCADE, indexed); `project_credentials.project_id` **nullable** |
| `.venv/bin/python -m server.seed` | fresh DB → operator user + tenant #1 named `"default"` (+ default project) via `provision_signup`; idempotent |
| `onboarding_smoke.py --base-url http://127.0.0.1:8799` | **PASS** — `tenant B onboarded … B-only isolation; usage metered; org journey OK … 1 org key -> 2 get-or-create projects, per-project usage, revoke->401, project-bound regression` (exit 0) |
| Postgres row assertion | org key row is `project_id IS NULL` **and** `revoked_at` set; both `org-smoke-{alpha,beta}-*` projects were get-or-created (never explicitly created); `usage_events` attributed per named project (alpha document.created×2 [org write + regression write], beta ×1) |

Local stack fully torn down (postgres container removed; local uvicorn on `:8799`
stopped; temp `KB_ROOT` cleared). Nothing touched the repo tree or the real box.

### 3. Prod pre-flight — read-only probes (no prod mutation; no writes, no mints)

All probes via `curl` (default UA passes Cloudflare clean, per intent.md) against
`https://knowledge.hi2vi.com`. Auth-throttle budget: **1** `login` call (of 20/900 s/IP).

| Probe | Result | Reading |
|---|---|---|
| `GET /healthz` | **200** `{"status":"ok","docs_root":"/repo/docs","db":"ok","documents":13}` | api live; content + accounts planes healthy; 13 docs |
| `GET /app/documents/1/raw` (unauth) | **401** `{"detail":"Unauthorized"}` | P16/P17 route present — box is at **P16/P17-era** code |
| `GET /app/projects` (unauth) | **401** `{"detail":"Unauthorized"}` | the `/app/*` surface is mounted (control for the 404 below) |
| **`GET /app/credentials`** (unauth) | **404** `{"detail":"Not Found"}` | **P18.S2 org endpoint is ABSENT** — combined with the 401 above (surface mounted), the 404 is route-absent → **P18 code is NOT on the box** |
| `POST /auth/login` nonsense creds (1 throttle call) | **401** `{"detail":"invalid email or password"}` | accounts DB **migrated (0001+0002) + seeded + live** (a dormant/unmigrated DB would 500) |

**Git-state inference (mint/write nothing on prod):**
- `origin/main` = `84fc855` (P17 review) — what the box deploys; local `HEAD` = `10645fb`
  (P18.S4); **7 ahead / 0 behind**.
- `git cat-file -e origin/main:alembic/versions/0003_org_level_credentials.py` → **ABSENT**
  → `0003` is repo-only/unpushed → **not applied to prod**.
- `git grep create_org_credential origin/main -- server/app_api.py` → **ABSENT** → confirms
  the `/app/credentials` 404 is route-absent, not app-absent.

**Conclusion.** The box runs pre-P18 (P17-era) code; `0003` is not applied; the accounts
DB is already migrated + seeded + live. So the P10 first-cutover `stop → migrate → seed →
up` deadlock **does not apply** (that only bites a *fresh, unmigrated* DB). This cutover
DOES carry a new migration (`0003`) — unlike P17.S5 — so the ordering below is load-bearing.

### 4. Customized operator runbook (the reopened `pending` gate)

**Ordering constraint (load-bearing).** The P18 resolver reads
`project_credentials.tenant_id`, which `0003` adds. **Deploying P18 code before `0003` is
applied breaks EVERY `vk_` auth** (missing column → 500 on all `/api/*`). So the order is
**reconcile clone → apply `0003` → recreate api on new code**, run **back-to-back**. The
safe overlap is *old code + new schema*: `0003` only adds `tenant_id` (backfilled), makes
`project_id` nullable, and adds `UNIQUE(tenant_id, name)` — none of which old code reads
or writes on the existing-key path, so live `vk_` reads/writes keep working during the
window. ⚠ **Old-code mint-window caveat:** while old code serves between migrate and
recreate, a **new key mint** (`POST /app/projects/{id}/credentials`, `knowledge init`) or
a **duplicate-name** `POST /app/projects` would 500 (old code omits the now-NOT-NULL
`tenant_id` / hits the new UNIQUE). Keep the window seconds-short (migrate → deploy
back-to-back); existing keys are unaffected.

**Step 1 — push `main`** (workstation; ships P18 S1–S4 + `0003`):
```bash
git push origin main            # tip 10645fb (feat(cli): P18.S4 …)
git rev-parse origin/main       # confirm 10645fb (or later, incl. a rebase over an unpushed doc)
```
If the publish-on-write box advanced `origin/main` meanwhile (a doc auto-commit), the push
is rejected → `git pull --rebase origin main`, then re-push.

**Step 2 (optional, read-only) — see what `0003` will merge.** Prod had no
`UNIQUE(tenant_id, name)`, so duplicate project names may exist; `0003` merges them
oldest-wins before adding the constraint. Eyeball what would be merged:
```bash
ssh oracle-cloud 'cd /opt/knowledge && docker compose -f compose.prod.yml exec -T postgres \
  psql -U kb -d kb -c "SELECT tenant_id, name, count(*) FROM projects GROUP BY tenant_id, name HAVING count(*)>1;"'
# 0 rows → the de-dupe is a no-op. Any rows → those names will be merged to the oldest row.
```

**Steps 3–6 — on the box, back-to-back** (`ssh oracle-cloud`, `cd /opt/knowledge`):
```bash
# 3. RECONCILE the box clone to origin/main tip — files ONLY; the running knowledge-api
#    keeps serving OLD code (a separate long-lived process). This is deploy.sh's own
#    step-1 reconcile run standalone (one-shot api-service container: root-owned .git,
#    SSH origin, baked safe.directory + deploy key). ff when behind; rebase if an unpushed
#    publish-on-write doc diverged. (If it fails on .git/index.lock — a concurrent doc
#    write — just re-run.)
docker compose -f compose.prod.yml run --rm -T --no-deps --name knowledge-reconcile-manual \
  --entrypoint sh api -c '
    set -eu; cd /repo
    b=$(git symbolic-ref --short -q HEAD || true); [ "$b" = main ] || { echo "not on main ($b)"; exit 1; }
    git diff --quiet && git diff --cached --quiet || { echo "dirty tree; refusing"; git status --short; exit 1; }
    git fetch --prune origin main
    f=$(git rev-parse --verify FETCH_HEAD^{commit}); h=$(git rev-parse HEAD)
    if [ "$h" = "$f" ]; then echo "already at tip";
    elif git merge-base --is-ancestor "$h" "$f"; then git merge --ff-only "$f";
    else git rebase "$f" || { git rebase --abort; echo "rebase conflict — abort"; exit 1; }; fi
    echo "reconciled to $(git rev-parse --short HEAD)"'
git -C /opt/knowledge log -1 --oneline   # expect 10645fb (P18.S4) — 0003 now on disk

# 4. Apply 0003 as a ONE-SHOT (runs alembic instead of uvicorn; old api still serving).
docker compose -f compose.prod.yml run --rm api alembic upgrade head
#    expect: Running upgrade 0002_usage_events -> 0003_org_level_credentials

# 5. (optional) idempotent seed — a no-op on the already-seeded box (keeps seed == signup shape).
docker compose -f compose.prod.yml run --rm api python -m server.seed

# 6. Recreate the api onto NEW code IMMEDIATELY (ends the old-code overlap). deploy.sh
#    re-reconciles (no-op — already at tip), rebuilds web/mcp, FORCE-RECREATES the
#    bind-mounted api (P17.F1) so it runs P18 code, health-gates all three, and self-asserts
#    the api process is fresh.
deploy/deploy.sh
```

**Ultra-safe alternative (no code/schema-mismatch, no mint-window; brief api downtime):**
insert `docker compose -f compose.prod.yml stop api` between step 3 and step 4 — the api
is down through the migrate and comes back on new code in step 6 (deploy.sh). Trades the
narrow mint-window for a ~30–90 s write outage on the hi2vi agent (its writes retry).

**Step 7 — verify (public, read-only):**
```bash
curl -sS https://knowledge.hi2vi.com/healthz                                             # 200 {"status":"ok",…}
curl -sS -o /dev/null -w '%{http_code}\n' https://knowledge.hi2vi.com/app/credentials    # 401 now (was 404) ← decisive P18-present flip
curl -sS -X POST https://knowledge.hi2vi.com/auth/login -H 'content-type: application/json' \
  -d '{"email":"nobody@example.com","password":"x"}'                                     # 401 "invalid email or password" (still migrated/live)
```
Post-conditions to eyeball on the box:
- `docker compose -f compose.prod.yml ps` → `knowledge-api` / `-web` / `-mcp` / `-postgres` all **Up (healthy)**.
- deploy.sh's tail: `api process is fresh (StartedAt=… >= deploy start …)` — the P17.F1
  freshness self-assert passed (proves the force-recreate landed P18 code, not the stale uvicorn).

Then **re-dispatch Stage B**, which re-verifies the flip (`/app/credentials` 404→401,
login discriminator, `/healthz` freshness) and runs the extended `onboarding_smoke.py`
against the live host.

**Residual notes.**
- **Smoke leftovers:** Stage B's hosted smoke onboards **two** throwaway tenants (tenant B
  + the org-journey tenant C) and writes their docs under `tenants/<uuid>/` — namespaced,
  isolated from tenant #1's public corpus (same residual shape as P17's runs). No delete
  API; the operator may purge later.
- The `--master-token` isolation-vs-tenant-#1 extra is optional and operator-only (needs
  the master `KB_API_TOKEN`, which this executor never sees); Stage B runs B-only isolation
  without it unless the operator provides it.

### Stage A validation

| Command | Outcome |
|---|---|
| `.venv/bin/python -m py_compile scripts/onboarding_smoke.py` + `--help` | **PASS** (compiles; argparse OK) |
| Disposable `postgres:17` + `alembic upgrade head` (0001→0002→**0003**) | **PASS** (constraint + columns as designed) |
| `python -m server.seed` (local) | **PASS** (operator user + tenant #1 `"default"` + default project; idempotent) |
| `onboarding_smoke.py` vs local tenant-mode `uvicorn` | **PASS** — tenant-B isolation/usage + full P18 org-model journey (exit 0) |
| Postgres row assertion (org key NULL+revoked; 2 get-or-create projects; per-project usage) | **PASS** |
| 5 read-only prod probes (1 login discriminator) + git-state inference | as tabulated — box pre-P18, `0003` not applied, accounts DB migrated/live |
| `python3 scripts/plugin_parity.py` | **PASS** (no-op — smoke in `scripts/`, not a `shipped_dir`) |
| `python3 scripts/skills_parity.py` | **PASS** |
| `python3 scripts/workflow.py validate` | **PASS** (workspace state integrity) |

**Deviations from `plan.md`:** the org-model journey runs in a **fresh tenant C** (a
second signup) rather than reusing tenant B — this is what keeps the existing tenant-B
`documents_created == 1` isolation/usage assertions intact (plan item 1: *"Keep all
existing isolation/usage checks intact"*). No other deviations. No prod mutations (probes
read-only; nothing minted or written on the box). No commits, no status transitions, no
doc versioning, no pushes.

### Gate

Slice set `pending` by the orchestrator; Stage A returns **`needs_operator`**. The
operator runs **Step 1 (push) → Steps 3–6 (reconcile → migrate → deploy, back-to-back) →
Step 7 (verify)**; Steps 2 + 5 are optional. On completion, re-dispatch **Stage B**, which
re-verifies the cutover and runs the live extended `onboarding_smoke.py` E2E.

---

## Stage B — hosted end-to-end (2026-07-22)

The operator ran the §4 runbook (reconcile → `alembic upgrade head` 0003 → optional seed →
`deploy/deploy.sh`). Stage B re-verifies the P18-present flip and runs the extended
`onboarding_smoke.py` against the live host. **All green — the cutover is live.**

### 1. P18-present flip + freshness (read-only probes)

| Probe | Result | Reading |
|---|---|---|
| `GET /healthz` | **200** `{"status":"ok","docs_root":"/repo/docs","db":"ok","documents":14}` | api live; content + accounts planes healthy (14 public docs — was 13 in Stage A; a doc published between stages; the smoke's writes are non-public and don't count here) |
| **`GET /app/credentials`** (unauth) | **401** `{"detail":"Unauthorized"}` | **decisive P18-present flip** — was **404** pre-cutover (route-absent). 404→401 proves S2's org endpoint is now mounted → **P18 code is on the box** |
| `POST /auth/login` nonsense creds | **401** `{"detail":"invalid email or password"}` | accounts DB **migrated + seeded + live** (a dormant/unmigrated DB would 500; the generic 401 is the credential-check discriminator) |

**Login-probe methodology note (not a P18 change, not a defect).** The first login probe
used password `"x"` (matching Stage A's form) and returned **422**
`string_too_short (min_length 8)` — request-shape validation short-circuits before the
credential check, so it does **not** reach the DB discriminator. `LoginIn` shares
`_EmailPasswordInput` (`password: Field(min_length=8)`) with signup — and that constraint
is **already present at P17 (`git show 84fc855:server/auth_api.py`)**, so it is
long-standing login validation, *not* a P18 tightening. (Stage A's 401-with-`"x"` reflects
the box then running code older than the 84fc855 tree.) A single retry with a valid-length
nonsense password reached the credential check → the true **401 "invalid email or
password"** above. 2 login calls total, well within the 20/900 s/IP throttle.

### 2. Extended `onboarding_smoke.py` — hosted, WITHOUT `--master-token`

```
.venv/bin/python scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com
```

**Exit 0 / PASS.** Summary line verbatim:

> `PASS — tenant B onboarded (onboard-smoke+ed030f51ee1c@example.com), doc onboarding-smoke/2026-07-22-smoke-ed030f51ee1c.md; B-only isolation (no --master-token); usage metered; org journey OK (onboard-smoke-org+6152c6ab5902@example.com): 1 org key -> 2 get-or-create projects, per-project usage, revoke->401, project-bound regression`

That single run covers, against live prod:
- **Tenant-B journey** — signup → project → project-bound `vk_` → one `POST /api/documents`
  (frozen 201 shape) → `GET /api/search` (B finds its own doc) → `GET /api/documents` (B
  lists only its own) → B-only isolation → `documents_created == 1` metered (`/app/usage` +
  `/app/projects/{id}/usage`), `last_used_at` set, foreign project id → 404.
- **Section-4 org-model journey (P18)** in its own fresh tenant C — signup's additive
  `project == "default"` (visible via `/app/projects`); **one org key** (`POST /app/credentials`,
  `project_id: null`) writes to **two never-pre-created project names** → both appear in
  `/app/projects` (**get-or-create** proof) → per-named-project usage `documents_created == 1`
  each; `DELETE /app/credentials/{id}` revoke → subsequent write **401**; project-bound key
  still mints + writes (regression).

The `--master-token` cross-tenant-vs-tenant-#1 leg was intentionally omitted (the operator
did not provide the master `KB_API_TOKEN`, per plan) — B-only isolation still ran.

### 3. Anomalies

None. The 422→retry on the login probe is a probe-methodology detail (documented above),
not a prod anomaly. The smoke passed on the first (and only) run — no retry-loop against
prod throttles.

### Stage B validation

| Command | Outcome |
|---|---|
| `curl GET /healthz` | **200** — api + both planes healthy |
| `curl GET /app/credentials` (unauth) | **401** — P18-present flip (was 404 pre-cutover) |
| `curl POST /auth/login` (nonsense, valid-length pw) | **401** "invalid email or password" — accounts DB migrated + live |
| `.venv/bin/python scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com` | **PASS** (exit 0) — tenant-B journey + P18 org-model journey, all green against live prod |
| `python3 scripts/workflow.py validate` | **PASS** (workspace state integrity) |

**Residual (expected):** the hosted smoke onboarded two throwaway tenants (tenant B +
org-journey tenant C) and wrote their docs under `tenants/<uuid>/` — namespaced, isolated
from tenant #1's public corpus (same residual shape as P16/P17 runs). No delete API; the
operator may purge later. No other prod mutations.

**Deviations from `plan.md` (Stage B):** the login discriminator took **2** calls, not the
plan's "one call only" — the first (`password:"x"`) 422'd on the long-standing
`min_length=8` login validation before reaching the credential check, so one throttle-aware
retry with a valid-length nonsense password produced the true 401 discriminator (2 of
20/900 s/IP). No other deviations. No fixes attempted, no commits, no status transitions, no
doc versioning, no pushes.

### Slice outcome

Stage B is **green**: the P18 accounts-v2 cutover is live on `https://knowledge.hi2vi.com`
(404→401 org-endpoint flip confirmed), and the extended hosted E2E passes end-to-end
(tenant-B isolation/usage + the full P18 org-model journey). Stage B returns **`done`**.
