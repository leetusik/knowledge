# Result — P19.S5: Prod cutover — reconcile + alembic `0004` + deploy + public-link live smoke (operator-gated)

Two executor stages around one operator `pending` gate (the P18.S5 shape). **Stage A
(below) is complete and returned `needs_operator`.** Stage B appends to this file after
the operator clears the gate and the cutover is live.

---

## Stage A — smoke extension + local proof + prod pre-flight + operator runbook (done 2026-07-22)

### 1. What changed — `scripts/onboarding_smoke.py` gains the P19 public-link leg

The smoke keeps every existing tenant-B check and the full P18 section-4 org-model journey
intact, and adds a **P19 public-link leg** (`_run_public_link_leg`) that runs **inside the
section-4 fresh tenant C, before the org-key revoke** (so the org key is still live and the
tenant-B `documents_created == 1` assertions stay pristine). A new **`--skip-web-pages`**
flag (default: run the web-page checks) opts out of the same-origin Next-page checks — used
locally where only a bare uvicorn API is up.

The leg, in order (collect-all-failures, httpx, terse):

- **org-key html write** to a fresh project `org-smoke-public-{hexid}` (`format:"html"`, so
  `/raw` has real bytes); asserts the 201 `url` **ends `/documents/{id}`** (the S4 mode-aware
  save URL — value assertion only; the frozen key set is untouched).
- **anonymous, still private** → `GET /app/documents/{id}` → **404** (negative first).
- **session** `PATCH /app/projects/{id}` `{"visibility":"public"}` → **200**, echoes
  `visibility:"public"`.
- **anonymous, now public** (no bearer at all): `GET /app/documents/{id}` → **200** JSON with
  **no `tenant_id`** key; `GET …/raw` → **200** + exact P16 header
  `Content-Security-Policy: sandbox allow-scripts; frame-ancestors 'self'`;
  `GET /app/graph?org={tenant_uuid}` → **200** with the doc's `rel_path` among the nodes
  (tenant uuid taken from the org signup payload's `tenant.id`); `GET /app/graph?org={random}`
  → **404** (no existence leak).
- **web pages** (skipped under `--skip-web-pages`): anonymous `GET {the 201 url}` → 200 HTML;
  anonymous `GET /graph/{tenant_uuid}` → 200 HTML.
- **toggle back** `PATCH …{"visibility":"private"}` → 200; then (web pages in scope) anonymous
  `GET {the 201 url}` → a **/login redirect** (302/303/307/308, `Location` contains `/login`),
  and anonymous `GET /app/documents/{id}` → **404** again. The instant-toggle round-trip leaves
  the throwaway tenant fully private.

`scripts/` is **not** a plugin `shipped_dir`, so there is **no template mirror** to keep in
parity (same as P18.S5 — confirmed: no `plugin/templates/kb/scripts/onboarding_smoke.py`).

### 2. Local proof — extended smoke green against a disposable tenant-mode stack

Stood up a throwaway `postgres:17` (`:55434`), ran `alembic upgrade head`, seeded, ran a local
`uvicorn server.main:app` in tenant mode against a temp `KB_ROOT`, ran the extended smoke with
`--skip-web-pages` (no Next app up locally), asserted the resulting Postgres rows, then tore the
whole stack down.

| Step | Outcome |
|---|---|
| `docker run postgres:17` + `.venv/bin/python -m alembic upgrade head` | `0001 → 0002 → 0003 → **0004**` applied clean; exact line `Running upgrade 0003_org_level_credentials -> 0004_project_visibility` |
| `projects.visibility` column check (`information_schema`) | `text`, `is_nullable=NO`, `column_default='private'::text` — **byte-equal to the migration** (`Text NOT NULL DEFAULT 'private'`) |
| `.venv/bin/python -m server.seed` | operator user + tenant #1 `"default"` created (idempotent) |
| `onboarding_smoke.py --base-url http://127.0.0.1:8799 --skip-web-pages` | **PASS** (exit 0) — full summary below |
| Postgres row assertion | all three `org-smoke-*` projects present and **`visibility='private'`** — the public-link leg's toggle round-trip (private→public→private) left the throwaway tenant private |

Verbatim PASS summary line:

> `PASS — tenant B onboarded (onboard-smoke+b2b510985c92@example.com), doc onboarding-smoke/2026-07-22-smoke-b2b510985c92.md; B-only isolation (no --master-token); usage metered; org journey OK (onboard-smoke-org+433e962dd368@example.com): 1 org key -> 2 get-or-create projects, per-project usage, revoke->401, project-bound regression; public-link (private->public->private, web skipped)`

Exit 0 = **zero failures collected**, so every anonymous-surface assertion in the leg passed
(404-before-public, 200-after-public with no `tenant_id`, the `/raw` sandbox CSP header, the
public graph carrying the doc node, the random-org 404, and the toggle-back 404). The web-page
checks were skipped locally (no Next app) and get their first live exercise in Stage B against
prod (same origin). Local stack fully torn down (postgres container removed; local uvicorn
stopped; temp `KB_ROOT` cleared; ports `:8799`/`:55434` free). Nothing touched the repo tree or
the real box.

### 3. Prod pre-flight — read-only probes (no mutation; no writes, no mints, no push)

`curl` (default UA passes Cloudflare clean) against `https://knowledge.hi2vi.com`.

| Probe | Result | Reading |
|---|---|---|
| `GET /healthz` | **200** `{"status":"ok","docs_root":"/repo/docs","db":"ok","documents":18}` | api live; content + accounts planes healthy; 18 public docs |
| **Flip probe** `GET /app/graph?org=<random-uuid>` (unauth) | **401** `{"detail":"Unauthorized"}` | **P19 NOT live yet** — the pre-P19 `/app/graph` is `require_user`, so an anonymous call 401s regardless of `org`. Post-P19 the route is optional-identity and a random org resolves to the public path → **404 "graph not found"**. So **401 → 404** is the decisive live-flip. |

**Git-state inference (read-only; nothing minted or written on prod):**
- `origin/main` = `92ad39f` (P18.S5 Stage A) — what the box deploys; local `HEAD` = `f2c15f8`
  (P19.S4); **7 ahead / 0 behind**.
- `git cat-file -e origin/main:alembic/versions/0004_project_visibility.py` → **ABSENT** → `0004`
  is repo-only/unpushed → **not applied to prod**.
- `git grep visibility origin/main -- server/app_api.py` → **ABSENT** → confirms the box runs
  pre-P19 code (the 401 flip-probe baseline is route-behavior, not P19).

**Conclusion.** The box runs pre-P19 code; `0004` is not applied; the accounts DB is migrated
(through `0003`) + live. This cutover carries one **purely additive** migration (`0004` =
`projects.visibility Text NOT NULL DEFAULT 'private'`), so the ordering below is load-bearing but
the safe overlap is *fully* safe (see the runbook's ordering note).

### 4. Customized operator runbook (the reopened `pending` gate) — §Runbook

**Ordering constraint (load-bearing, but the overlap is safe).** P19 code (`server/app_api.py`,
`documents_api.py`, `graph_api.py`, dashboard, signup serializers) **SELECTs `projects.visibility`
on every project read**, so **deploying P19 code before `0004` is applied 500s broadly** (missing
column on all project reads, including get-or-create on writes). So the order is **reconcile clone
→ apply `0004` → recreate api on new code**, back-to-back. The safe overlap is *old code + new
schema*, and unlike P18's `0003` it carries **no mint-window**: `0004` only adds one column with a
server `DEFAULT 'private'`; the old (pre-P19) code never reads `visibility` and its project
`INSERT`s omit the column, so the DEFAULT fills it and old-code reads/writes/mints keep working
untouched during the migrate→recreate window. (`0004` has no data migration, no de-dup, no new
constraint — nothing to preview.)

**Step 1 — push `main`** (workstation; ships P18 Stage B + P18 docs + P19 S1–S4 + `0004`):
```bash
git push origin main            # ships up to f2c15f8 (feat(api): P19.S4 …)
git rev-parse origin/main       # confirm f2c15f8 (or later, incl. a rebase over an unpushed doc)
```
If the publish-on-write box advanced `origin/main` meanwhile (a doc auto-commit), the push is
rejected → `git pull --rebase origin main`, then re-push.

**Steps 2–5 — on the box, back-to-back** (`ssh oracle-cloud`, `cd /opt/knowledge`):
```bash
# 2. RECONCILE the box clone to origin/main tip — files ONLY; the running knowledge-api
#    keeps serving OLD code (a separate long-lived process). deploy.sh's own step-1 reconcile
#    run standalone (one-shot api-service container: root-owned .git, SSH origin, baked
#    safe.directory + deploy key). ff when behind; rebase if an unpushed publish-on-write doc
#    diverged. (If it fails on .git/index.lock — a concurrent doc write — just re-run.)
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
git -C /opt/knowledge log -1 --oneline   # expect f2c15f8 (P19.S4) — 0004 now on disk

# 3. Apply 0004 as a ONE-SHOT (runs alembic instead of uvicorn; old api still serving).
docker compose -f compose.prod.yml run --rm api alembic upgrade head
#    expect: Running upgrade 0003_org_level_credentials -> 0004_project_visibility

# 4. (optional) idempotent seed — a no-op on the already-seeded box (keeps seed == signup shape).
docker compose -f compose.prod.yml run --rm api python -m server.seed

# 5. Recreate the api onto NEW code IMMEDIATELY (ends the old-code overlap). deploy.sh
#    re-reconciles (no-op — already at tip), rebuilds web/mcp, FORCE-RECREATES the
#    bind-mounted api (P17.F1) so it runs P19 code, health-gates all three, and self-asserts
#    the api process is fresh. (The Production Deploy Action — workflow_dispatch, main-guarded
#    — wraps the same chain + external curls and runs no alembic; either works for this step.)
deploy/deploy.sh
```

**Ultra-safe alternative (belt-and-suspenders; brief api downtime):** insert
`docker compose -f compose.prod.yml stop api` between step 2 and step 3 — the api is down through
the migrate and comes back on new code in step 5 (deploy.sh). For `0004` the standard path already
has **no** mint-window (the column has a server DEFAULT), so this variant only removes the
theoretical window at the cost of a ~30–90 s write outage on the hi2vi agent (its writes retry).

**Step 6 — verify (public, read-only):**
```bash
curl -sS https://knowledge.hi2vi.com/healthz                                              # 200 {"status":"ok",…}
curl -sS -o /dev/null -w '%{http_code}\n' "https://knowledge.hi2vi.com/app/graph?org=$(uuidgen)"
#    -> 404 now (was 401) ← decisive P19-present flip (optional-identity public graph path)
```
Post-conditions to eyeball on the box:
- `docker compose -f compose.prod.yml ps` → `knowledge-api` / `-web` / `-mcp` / `-postgres` all **Up (healthy)**.
- deploy.sh's tail: `api process is fresh (StartedAt=… >= deploy start …)` — the P17.F1 freshness
  self-assert passed (proves the force-recreate landed P19 code, not the stale uvicorn).

Then **re-dispatch Stage B**, which re-verifies the flip (`/app/graph?org=<random>` 401→404) and
runs the extended `onboarding_smoke.py` against the live host **with web pages in scope** (no
`--skip-web-pages` — the Next public pages are the same origin on prod).

**Residual notes.**
- **Smoke leftovers:** Stage B's hosted smoke onboards **two** throwaway tenants (tenant B + the
  section-4 tenant C) and writes their docs under `tenants/<uuid>/` — namespaced, isolated from
  tenant #1's public corpus (same residual shape as P16/P17/P18 runs). The public-link leg toggles
  its own throwaway project public→private and leaves it **private**, so no throwaway content stays
  publicly reachable. No delete API; the operator may purge later.
- The `--master-token` isolation-vs-tenant-#1 extra is optional and operator-only (needs the master
  `KB_API_TOKEN`, which this executor never sees); Stage B runs B-only isolation without it unless
  the operator provides it.

### Stage A validation

| Command | Outcome |
|---|---|
| `.venv/bin/python -m py_compile scripts/onboarding_smoke.py` + `--help` | **PASS** (compiles; `--skip-web-pages` flag present) |
| Disposable `postgres:17` + `alembic upgrade head` (0001→0002→0003→**0004**) | **PASS** — exact `0003_… -> 0004_project_visibility` line; column `text NOT NULL DEFAULT 'private'` |
| `python -m server.seed` (local) | **PASS** (operator user + tenant #1 `"default"`; idempotent) |
| `onboarding_smoke.py --skip-web-pages` vs local tenant-mode `uvicorn` | **PASS** (exit 0) — tenant-B isolation/usage + P18 org journey + **P19 public-link leg** |
| Postgres row assertion (all `org-smoke-*` projects `visibility='private'` post-round-trip) | **PASS** |
| 2 read-only prod probes (`/healthz` 200; flip probe **401** baseline) + git-state inference | as tabulated — box pre-P19, `0004` not applied, accounts DB migrated/live |
| `python3 scripts/workflow.py validate` | see below |

**Deviations from `plan.md`:** none of substance. The public-link leg is factored into a small
helper `_run_public_link_leg` (rather than inlined) and writes its html doc to a **dedicated fresh
project** `org-smoke-public-{hexid}` — this keeps the P18 per-project `documents_created == 1`
assertions on `proj_a`/`proj_b` pristine and gives the leg its own project to toggle. It runs
**before** the org-key revoke (the plan's "org key still live" requirement). The web-page redirect
assertion accepts 302/303/307/308 (Next `redirect()` issues 307) with `/login` in `Location`, a
superset of the plan's "(302/307)". No prod mutations (probes read-only; nothing minted or written
on the box). No commits, no status transitions, no doc versioning, no pushes.

### Gate

The orchestrator commits Stage A, sets the slice `pending`, reports the runbook, and stops. The
operator runs **Step 1 (push) → Steps 2–5 (reconcile → `0004` → deploy, back-to-back) → Step 6
(verify)**; Step 4 (seed) is optional. On completion, re-dispatch **Stage B**, which re-verifies
the cutover (401→404 flip) and runs the live extended `onboarding_smoke.py` E2E with web pages in
scope. Stage A returns **`needs_operator`**.

---

## Stage B — hosted verification (done 2026-07-22, cutover live)

The operator executed the runbook (push → reconcile → `alembic upgrade head` applied
`0003_org_level_credentials -> 0004_project_visibility` → `deploy/deploy.sh`: all services
Up (healthy), api process fresh, `/healthz` 200, flip probe 401→404 verified twice). Stage B
re-verifies the cutover from the workstation and drives the full public-link E2E live.

### 1. Read-only prod probes — the P19 live-flip confirmed

`curl` (default UA, clean through Cloudflare) against `https://knowledge.hi2vi.com`.

| Probe | Result | Reading |
|---|---|---|
| `GET /healthz` | **200** `{"status":"ok","docs_root":"/repo/docs","db":"ok","documents":18}` | api live; content + accounts planes healthy; 18 public docs (unchanged from the Stage A baseline) |
| **Flip probe** `GET /app/graph?org=C1C4F228-49ED-451E-9EBA-3237FDE09DF1` (unauth, random org) | **404** `{"detail":"graph not found"}` | **P19 is LIVE** — the pre-P19 baseline was **401** (`require_user`); the optional-identity public-graph path now resolves the random org to the public path and answers **404 "graph not found"**. The decisive **401 → 404** flip. |

### 2. Hosted extended smoke — full public-link E2E, web pages in scope

`.venv/bin/python scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com`
(httpx 0.28.1; **no** `--skip-web-pages` — the Next public pages are the same origin on prod).
This signs up two throwaway tenants (tenant B + section-4 tenant C), exercises B-isolation +
usage metering + the P18 org journey, and runs the P19 public-link leg end-to-end against the
live host: 201 `url` shape → anonymous 404-while-private → session PATCH public → anonymous
doc/`raw`/graph 200s **plus the same-origin web pages** → PATCH back private → 404 + `/login`
redirect.

**Exit 0 — zero failures collected.** Verbatim PASS summary line:

> `PASS — tenant B onboarded (onboard-smoke+3b4b27203d79@example.com), doc onboarding-smoke/2026-07-22-smoke-3b4b27203d79.md; B-only isolation (no --master-token); usage metered; org journey OK (onboard-smoke-org+0013738e6128@example.com): 1 org key -> 2 get-or-create projects, per-project usage, revoke->401, project-bound regression; public-link (private->public->private, web pages OK)`

The `web pages OK` tail (vs Stage A's local `web skipped`) is the new signal: the anonymous
same-origin public pages passed live for the first time — `GET {the 201 url}` → 200 HTML and
`GET /graph/{tenant_uuid}` → 200 HTML while public, and after the toggle-back the doc page
returned a `/login` redirect. Every anonymous-surface assertion held live: the S4 mode-aware 201
`url` ending `/documents/{id}`, the 404-before-public, the 200-after-public JSON with no
`tenant_id`, the `/raw` P16 sandbox CSP header byte-for-byte, the public graph carrying the doc
node, the random-org 404 (no existence leak), and the toggle-back 404. The public-link leg's
throwaway project ends **private** (private→public→private round-trip), so no throwaway content
stays publicly reachable.

### 3. Anomalies

**None.** Both probes and the full hosted smoke passed on the first run — no retry, no transient
error, no failures collected. `--master-token` was not supplied (operator-only secret this
executor never sees), so the smoke ran B-only isolation as designed; the isolation-vs-tenant-#1
extra remains an optional operator-run check.

### 4. Residue (as documented in the runbook)

The hosted smoke onboarded two throwaway tenants (B + section-4 C) whose docs live under
`tenants/<uuid>/` — namespaced, isolated from tenant #1's public corpus (same residual shape as
P16/P17/P18 runs). The public-link leg left its throwaway project **private**. No delete API; the
operator may purge later. `/healthz` still reports `documents: 18` (tenant-#1 public corpus
unchanged) — the throwaway tenants' docs are not counted in the public docs plane.

### Stage B validation

| Command | Outcome |
|---|---|
| `curl -sS https://knowledge.hi2vi.com/healthz` | **200** `{"status":"ok",…,"documents":18}` |
| `curl -sS "https://knowledge.hi2vi.com/app/graph?org=<random-uuid>"` (flip probe) | **404** `{"detail":"graph not found"}` — the P19 401→404 live-flip |
| `.venv/bin/python scripts/onboarding_smoke.py --base-url https://knowledge.hi2vi.com` (web pages in scope) | **PASS** (exit 0) — full B-isolation + usage + P18 org journey + **P19 public-link leg with same-origin web pages** |
| `python3 scripts/workflow.py validate` | see verdict — state integrity clean |

**Deviations from `plan.md` (Stage B):** none. Probes read-only; the smoke ran its own throwaway
signup/write journey only. No commits, no status transitions, no doc versioning, no pushes, no
alembic. Stage B returns **`done`**.
