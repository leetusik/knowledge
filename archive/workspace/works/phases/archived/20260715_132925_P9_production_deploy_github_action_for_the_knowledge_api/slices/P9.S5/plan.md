# P9.S5 — E2E acceptance: real production deploy + Pages retirement

## Context

S5 is the phase's proof of correctness: the **first real run** of the whole new two-service system
against live production, and the moment GitHub Pages is retired. Everything upstream (S1 self-host + Pages
retirement, S2 deploy core, S3 workflow, F1 gate hardening, S4 the now-provisioned runner key) has been
authored + statically validated but **never executed on the box**. S5 executes and verifies it.

**Live state established (read-only recon this session):**
- Local `main` is **8 commits ahead of origin/main** (origin still at `abe0ee6`, P8.REVIEW). All of P9 —
  including `deploy-production.yml` and `deploy/deploy.sh` — is **local-only, unpushed**. `gh` sees only
  the old `pages` + `plugin parity` workflows; the new workflow 404s on origin.
- The box clone `/opt/knowledge` is on `main` at `383577e` (behind origin, clean-ancestor — a clean
  ff-merge target), origin = `git@github.com:leetusik/knowledge.git` (SSH). It is **missing all P9
  machinery**: `deploy/deploy.sh` + both on-box scripts are absent; `compose.prod.yml` / `knowledge.conf`
  are the old **single-service** versions (no `knowledge-site`).
- Only `knowledge-api` runs (healthy, 12 h). The live edge vhost has **no site upstream**.
- **Routing verified safe:** the API's routes are natively `/api/*` + `/healthz` (`server/main.py`); the
  frozen consumer contract (`api.md`) hits `https://knowledge.hi2vi.com/api/*`. S1's `location /api/`
  (no path rewrite) passes `/api/...` through unchanged → the hi2vi consumer keeps working; `/` (a former
  404 at the API) now serves the site. No breakage.

**Consequence:** the first deploy needs a bootstrap — **push origin → reconcile the box clone → then
dispatch** — because the on-box gate calls `/opt/knowledge/deploy/deploy.sh`, which doesn't exist there yet.

## Execution model — orchestrator-driven (deliberate, operator-authorized)

S5 was decomposed as operator co-work (`pending` — the operator dispatches). The operator has delegated
execution to me ("you just do it") with box access via `ssh oracle-cloud` + `gh` admin. Because S5 is
**interactive live-prod work with judgment gates** (deploy monitoring, fix-forward-on-failure, the Pages
cutover), I will **drive it directly as orchestrator** rather than dispatch a `slice-executor` subagent —
a deliberate, one-slice deviation from "delegate every slice," appropriate to live-prod co-work. **P9.REVIEW
is still delegated to `slice-executor-high`** per the contract. Secret discipline throughout: the
`KB_API_TOKEN` is read into a transient shell var and used in-place, **never echoed**; workflow logs are
grep-checked for leaks.

## Actions requiring your consent (approving this plan authorizes them)

1. **Push** local `main` (8 commits) → `origin/leetusik/knowledge` (clean fast-forward).
2. **Trigger a real production deploy** against live `https://knowledge.hi2vi.com`.
3. The **fresh-on-write probe writes + deletes one clearly-labeled doc** on the production KB
   (publish-on-write → origin/main advances by 2 harmless probe commits, then cleaned).
4. **Retire GitHub Pages** for `leetusik/knowledge` — done only *after* the box is proven live (no gap);
   re-enabling is a Settings toggle but the Pages site goes down.

## Steps

1. **Push origin.** `git push origin main` (ff; `abe0ee6` is an ancestor). Puts the workflow + `deploy.sh`
   + two-service compose + split vhost on origin — the precondition for both the box reconcile and the
   dispatch.
2. **Bootstrap the box clone (one-time).** Reconcile `/opt/knowledge` to `origin/main` via the one-shot
   **api container** (reuses the mounted deploy key + `GIT_SSH_COMMAND` + baked `safe.directory`, exactly
   as `deploy.sh` will): `docker compose -f compose.prod.yml run --rm -T --no-deps --entrypoint sh api -c
   'cd /repo && git fetch --prune origin main && git status --porcelain && git merge --ff-only origin/main'`.
   The clone is clean + strictly behind → ff-only succeeds. This **doubles as the first live proof that the
   in-container SSH git authenticates** (de-risks F1's core unknown *before* the workflow depends on it).
   Confirm afterward: `deploy/deploy.sh` present + `compose.prod.yml` now has `knowledge-site`.
3. **Dispatch the real deploy.** `gh workflow run deploy-production.yml --ref main -R leetusik/knowledge`,
   then watch (`gh run watch` / `gh run view --log`). The run: preflight (main-guard, `target_sha`) →
   checkout → `bash -n` the 3 helpers → runner driver (SSH via the S4 key) → on-box gate → `deploy.sh`
   (reconcile no-op, `up -d --build` **both** services, health-gate **both**) → edge vhost re-apply
   (`nginx -t` gate → graceful reload) → external smoke on `/healthz` + `/`.
4. **Verify acceptance (§H + DECOMP S5):**
   - **a. Both containers healthy** — `ssh oracle-cloud 'docker compose -f /opt/knowledge/compose.prod.yml
     ps'` → `knowledge-api` + `knowledge-site` both `healthy`.
   - **b. Box safe** — on `main`, clean, **not detached**, no orphaned unpushed commit (`git -C
     /opt/knowledge status -sb` + `rev-parse --abbrev-ref HEAD`).
   - **c. Two-location routing live** — `curl -fsS https://knowledge.hi2vi.com/healthz` (api 200 JSON),
     `curl -fsSI https://knowledge.hi2vi.com/` (site 200 HTML), and one bearer'd `GET /api/documents` (200)
     to confirm the consumer path still resolves to the api.
   - **d. Fresh-on-write linchpin (THE critical test)** — read `KB_API_TOKEN` from the box `.env` into a
     transient var (never echoed); `POST /api/documents` a clearly-labeled probe (title "P9.S5 freshness
     probe", an isolable project slug); **immediately** GET its published page on the site
     `https://knowledge.hi2vi.com/<slug>` → it must appear with **no container restart**; then `DELETE
     /api/documents/by-path/<slug>` to clean up. Proves the api's write into the shared bind-mount is
     picked up live by `knowledge-site`'s `--livereload` watcher — the whole basis of the live-serve choice.
   - **e. No secrets in logs** — `gh run view --log` for the deploy job → grep-verify no private-key
     material or token appears.
5. **Retire Pages (only after 4a–d pass).** §C cutover safety: box proven live first → no gap. Disable
   Pages: `gh api -X DELETE repos/leetusik/knowledge/pages` (or you, via Settings → Pages). Verify: `gh api
   repos/leetusik/knowledge/pages` → 404, and `https://knowledge.hi2vi.com/` still 200 (box serving). The
   shipped plugin keeps Pages for downstream users (unchanged) — only *this* repo's Pages is retired.
6. **Sync + record.** `git fetch`/`git pull --ff-only` locally (origin advanced from the probe add/delete
   and any box doc pushes); append S5 findings + a Doc-impact note to `phase.md`; commit. S5 → `done`.

## Risk handling (pause + consult you at each)

- **Deploy health fails** → §F v1 **fix-forward** (capture artifacts, fix on `main`, re-dispatch); **no
  rollback** (bind-mounted code can't be image-flipped). I stop and consult before re-dispatching.
- **Edge `nginx -t` fails** → edge keeps last-good config, deploy fails loudly; fix `deploy/knowledge.conf`,
  re-dispatch.
- **Fresh-on-write doesn't fire (§H)** → fall back to mkdocs polling watch / rebuild-on-write (a follow-up
  `fix` slice); stop and consult.
- **In-container reconcile can't authenticate** → surfaces at step 2 (bootstrap), *before* any dispatch —
  caught early, fix, retry.

## Constraints

- **Never** detach / `reset --hard` / `--force` the box clone (it is the publish-on-write clone) — reconcile
  on `main` only.
- **Two-credential separation holds:** S5 uses the S4 runner key (runner→box) and *reads* `KB_API_TOKEN`
  for the probe; it never touches P8's container deploy key beyond that key's own normal in-container use.
- No secret in the transcript (token in a transient var, used in-place) or in workflow logs.

## Verification

Steps 4 (a–e) and 5 **are** the verification — both services healthy, box safe on `main`, two-location
routing live, the fresh-on-write linchpin proven, no secrets leaked, and Pages retired with the box serving
the root. Then P9.REVIEW (delegated to `slice-executor-high`) validates all slices + consolidates the
durable docs.
