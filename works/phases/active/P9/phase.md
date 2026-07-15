# Phase P9: Self-host the full knowledge site (web UI + API) at knowledge.hi2vi.com + automated production deploy

_Intent: see [intent.md](intent.md). Scope **expanded 2026-07-15** (mid-DECOMP-planning) from
API-only deploy automation to full self-hosted site + Pages retirement — see intent.md's
"Expanded & Confirmed Intent"._

## Objective

Self-host the full knowledge site — the human web UI **and** the machine API — at
**https://knowledge.hi2vi.com**, behind one **manual-dispatch (`workflow_dispatch`)**
production-deploy GitHub Action mirroring `hi2vi_web`'s three-script split, and **retire GitHub
Pages**. The GHA SSHes into the shared OCI box, reconciles the publish-on-write box clone with
`origin/main` (fetch + ancestor-gate + ff/rebase, never detach/reset/force), redeploys **both**
containers (`COMPOSE_BAKE=false docker compose -f compose.prod.yml up -d --build`) with a per-service
health-gate + rollback, and re-applies the edge vhost (now **two-location**: `/` → the mkdocs
`knowledge-site` viewer, `/api/*`+`/healthz` → `knowledge-api`). The web UI is served **live** by a
`mkdocs serve` viewer off the same box clone (fresh-on-write, replacing the ~65 s Pages lag). Two
knowledge-specific wrinkles govern the deploy core — code runs from the bind-mounted checkout (image
rollback can't revert it) and the box clone is also the publish-on-write clone (a deploy must never
orphan an unpushed doc). DECOMP proposes the full shape (self-host + reconcile + rollback + secrets)
for operator sign-off before implementation.

## Context

The knowledge API went live at knowledge.hi2vi.com in P8 via a **hand-run** deploy. P9 automates that
deploy — and, per the operator's mid-planning expansion, also makes the box the **single public front
door** for the whole site (web UI + API), retiring GitHub Pages. Serving decision: **live-serve**
(`mkdocs serve`, mirroring local `compose.yml`'s `kb`). The viewer is fully static/client-side and
never calls the API, so the two services coexist on one domain via path-based edge routing. The
reference deploy pattern is `hi2vi_web`'s `deploy-production.yml` + `deploy/` chain, adapted for the
publish-on-write clone.

## Decomposition

Five middle slices, `order` 1..5, created by `P9.DECOMP` as bare folders (each fills its own
`plan.md` at its turn). Risk sets the executor tier and is the phase's cost lever — the ratings below
are deliberate. This phase is **design-first**: S1 does not begin until the operator signs off on the
§A–§H design proposal recorded under **Findings & Notes** below.

- **P9.S1 — Self-host the web UI + retire Pages (`high`, order 1).** The enabling core of the
  scope expansion. Adds the `knowledge-site` live-serve viewer to `compose.prod.yml`; splits the edge
  vhost (`deploy/knowledge.conf`) into `/`→site + `/api/*`+`/healthz`→api; cuts
  `site_url` / `KB_PUBLIC_BASE_URL` / parity-locked `params.operator.json` `KB_SITE_URL` to
  `knowledge.hi2vi.com` (root, dropping `/knowledge/`); and retires `pages.yml` for *this* repo's site
  while untangling its `site_smoke.py` pin-parity read + `plugin_parity.py` "identical" coupling so both
  CIs stay green. **High** because a wrong vhost split is a site-wide edge outage (the conf.d tree is
  tested+reloaded as a unit), the surfaces are multiply-coupled (mkdocs ↔ plugin parity ↔ two CIs), and
  it is the piece everything downstream builds on. Fully locally validatable: `docker compose -f
  compose.prod.yml config`, local `mkdocs serve` / `docker compose run --rm kb build`,
  `python3 scripts/site_smoke.py`, `python3 scripts/plugin_parity.py`.
  _May split via fractional `--order`_ (e.g. `1.1` viewer+routing+URL, `1.5` Pages retirement) **only if**
  the surface proves too broad at planning time; default is one cohesive slice.
- **P9.S2 — On-box deploy: reconcile + redeploy both + edge re-apply (`high`, order 2).** The novel
  deploy core. Authors `deploy/deploy.sh` (publish-on-write-safe reconcile-on-`main` — never
  detach/reset/force; can't copy hi2vi's detached `git checkout`), brings up **both** api+site via
  `COMPOSE_BAKE=false docker compose -f compose.prod.yml up -d --build`, health-gates **both**
  containers, handles rollback for mount-based code (§F), navigates root-owned `.git`, and re-applies
  the edge two-location vhost. **High** because the reconciliation and the mount-based-rollback are the
  knowledge-specific inventions that make this its own phase rather than a hi2vi copy-paste.
- **P9.S3 — GHA driver + Production Deploy workflow (`medium`, order 3).** SSH-transport-only runner
  driver (`deploy/github-actions-production-deploy.sh`) + `.github/workflows/deploy-production.yml`
  (`workflow_dispatch`, main-branch guard, three `ORACLE_SSH_*` secrets, external smoke on `/` and
  `/healthz`, artifact upload) + the on-box gate `deploy/oracle-production-deploy-remote.sh`. **Medium**:
  a close, well-understood mirror of hi2vi's proven scripts — mechanical but security-sensitive
  (secret handling, host-key pinning), so not `low`.
- **P9.S4 — Runner SSH-key provisioning runbook + operator gate (`medium`, order 4).** Precise runbook
  for the net-new runner→`opc@box` SSH key as three `leetusik/knowledge` repo secrets, then a `pending`
  operator gate (only the operator can create GitHub secrets + authorize the box key). **Medium, not
  `low`**: a mis-authored secrets/known_hosts runbook is a real security hazard (P8 already saw a leaked
  key), so it needs judgment, not literal step-following.
- **P9.S5 — E2E acceptance, real dispatch (`high`, order 5).** Operator co-work (`pending`). Real
  `workflow_dispatch` run; verify: reconcile leaves the box on `main` with no orphaned unpushed doc, both
  containers healthy, two-location routing, the UI live at the root, the **fresh-on-write linchpin**
  (§H — POST a doc → appears on the site with no restart), no secrets in logs, and the Pages cutover
  (box proven live *before* repo Settings→Pages off). **High** because it exercises the whole novel
  system against live production and is the phase's proof of correctness.

**Dependency shape (advisory):** S2 builds on S1's `compose.prod.yml`/vhost; S3 wraps S2's on-box
scripts; S4 provisions the secret S3's workflow consumes; S5 proves S1–S4 end-to-end. Kept linear by
`order`; `depends_on` intentionally left empty (advisory-only, existence-checked by `validate`).

## Findings & Notes

_Seeded by `P9.DECOMP` (2026-07-15). This is the **design proposal (§A–§H)** the operator signs off on
before S1. Grounded/refined against the actual repo + the `hi2vi_web` reference. Each later slice
appends its own findings below when it finishes._

### §A. Self-host the web UI — live-serve viewer (S1)

New `compose.prod.yml` service mirroring local `compose.yml`'s `kb`:

- `image: squidfunk/mkdocs-material:9.7.6` (the exact local pin),
- `command: serve --dev-addr=0.0.0.0:8000 --livereload`,
- `container_name: knowledge-site` (edge proxies by name),
- `volumes: [ .:/docs ]` — the **same box clone** (`/opt/knowledge`) the api mounts at `/repo`,
- `networks: [ changple_shared_network ]` (external; reachable only by container name, no host-port publish),
- `restart: unless-stopped`,
- a **healthcheck** mirroring the api's (`python -c "import urllib.request,sys; ...urlopen('http://127.0.0.1:8000/', timeout=3)...200"` — the image has no curl; give it a `start_period` for the first build).

Serves live from `docs/`; because the api writes into the same bind-mounted tree, doc changes surface
with no separate rebuild step.

> **Grounding refinement (correct the DECOMP-plan draft):** the plan's §A draft wrote the command
> **without** `--livereload`. The live `compose.yml` `kb` service uses `serve --dev-addr=0.0.0.0:8000
> --livereload` with a load-bearing comment: _"`--livereload` must be explicit: the flag's default never
> arms in this image, and without it new pages don't appear until the container restarts."_ So the
> `knowledge-site` command **must include `--livereload`** — it is exactly what makes §H's fresh-on-write
> work. S1 should match local verbatim.

> `compose.prod.yml` is **not** in `plugin/templates/manifest.json` (not `identical`/`parameterized`/
> `shipped_dirs`) — it is box-only, so adding `knowledge-site` has **zero plugin-parity impact**. (The
> *local* `compose.yml` *is* `parameterized`; do not touch it here.)

### §B. Edge vhost — two-location routing (`deploy/knowledge.conf`, S1)

Today the vhost is a single `location /` → `knowledge-api:8000` (verified: conf lines 118-137). Split into:

- `location /api/ { proxy_pass http://$knowledge_upstream:8000; ... }` and
  `location = /healthz { proxy_pass http://$knowledge_upstream:8000; ... }` → the api (unchanged upstream),
- `location / { proxy_pass http://$knowledge_site_upstream:8000; ... }` → the new `knowledge-site`.

Reuse the existing `resolver 127.0.0.11 valid=30s ipv6=off` + `set $var` + variable-in-`proxy_pass`
re-resolution pattern (load-bearing per the conf's own comment; add a second `set $knowledge_site_upstream
knowledge-site`). Keep server-level `client_max_body_size 5m` + `proxy_read_timeout 120s` (they matter for
the api write path). **Honor the edge house rules** (called out in the conf header): **no** `default_server`,
**no** IPv6 `listen [::]`, **no** `limit_req_zone`. Optionally add `Upgrade`/`Connection` proxy headers on
`/` for mkdocs livereload's websocket — **cosmetic** (drives browser auto-refresh only; with `--livereload`
the server-side rebuild + a manual refresh already show fresh content).

### §C. URL cutover + Pages retirement (S1)

- `mkdocs.yml:2` `site_url: https://leetusik.github.io/knowledge/` → `https://knowledge.hi2vi.com/`
  (drop the `/knowledge/` subpath — served at the domain root) **and** `plugin/templates/params.operator.json`
  `KB_SITE_URL` **identically** — `mkdocs.yml` is `parameterized` in the manifest, so a mismatch fails
  `plugin_parity.py`'s render-and-compare (verified: `plugin_parity.py:100-112`).
- `compose.prod.yml` `KB_PUBLIC_BASE_URL: https://leetusik.github.io/knowledge` (line 51) →
  `https://knowledge.hi2vi.com` (the 201-response `url` origin; **no code change** — `server/config.py`/
  `main.py` are plugin-`identical` and read this from env).
- **Disable `pages.yml` — cannot just `rm` it.** Two live CI couplings, both verified:
  1. `scripts/site_smoke.py:147-160` reads `pages.yml` for **pin-parity** (asserts its
     `mkdocs-material==X` matches `compose.yml`'s `squidfunk/mkdocs-material:X`). A **missing** `pages.yml`
     appends a `failures` entry ("pin-parity check skipped: pages.yml ... missing") → `site_smoke.py`
     **fails**, so `rm` breaks it directly. `site_smoke.py` is `identical`-shipped, so this also fires in
     the plugin.
  2. `plugin/templates/manifest.json` lists `.github/workflows/pages.yml` under **`identical`** (line 44),
     and `plugin_parity.py:88-98` **byte-compares** `plugin/templates/kb/.github/workflows/pages.yml`
     against the repo copy. So neutralizing **only** the repo's `pages.yml` while leaving the template's
     untouched will trip `[identical] byte drift` → **plugin-CI red**.
- **The real tension S1 must resolve (grounding refinement):** the DECOMP-plan draft said "neutralize the
  repo workflow (drop the `push` trigger) *and* keep `plugin/templates/kb/.github/workflows/pages.yml`
  untouched (plugin keeps Pages) *and* keep the file present for parity" — but those three cannot all hold
  simultaneously, precisely because of coupling (2)'s byte-compare. Concrete options for S1 (pick one +
  operator sign-off):
  - **(pref) Reclassify + neutralize:** move `.github/workflows/pages.yml` **out of** the manifest's
    `identical` list (repo and template may then legitimately diverge), neutralize the repo copy (drop only
    the `push:` trigger — **keep** the `pip install mkdocs-material==9.7.6` line so `site_smoke.py`'s
    pin-parity read still passes), and leave the plugin template with Pages intact for downstream users.
    Retires Pages for *this* site only; keeps the shipped plugin's Pages path; keeps both CIs green.
  - **(alt) Operator-settings-only cutover:** leave every file byte-identical and retire Pages purely by
    the operator turning **repo Settings → Pages Off** (no file change → no CI coupling touched). Downside:
    the `push`-triggered `pages.yml` would still *run* on each doc push and its `deploy-pages` step would
    fail (Pages off) → a red workflow on every push. Not clean.
  - **(alt) Full removal:** delete the repo's `pages.yml`, remove it from `identical`, **and** repoint
    `site_smoke.py`'s pin-parity anchor off `pages.yml` (e.g. onto `compose.prod.yml`'s `knowledge-site`
    image pin). Most churn; loses the current pin anchor.
- The **shipped plugin keeps Pages** for downstream users regardless
  (`plugin/templates/kb/.github/workflows/pages.yml` stays) — P9 retires Pages for **this** repo's site only.
- **Cutover safety:** disabling the workflow does **not** take the Pages *site* down (it serves the last
  build until the operator flips repo Settings→Pages off) → the box site must be **proven live in S5
  before** Pages is turned off, so there is **no gap**. `knowledge.hi2vi.com` already resolves to the box
  (Cloudflare → edge) — **no DNS change** needed.

### §D. Deploy-script shape — mirror hi2vi's three-script split, now for both services (S2+S3)

Mirror the verified `hi2vi_web/deploy/` chain, adapted for the publish-on-write clone + two services:

- **`deploy/github-actions-production-deploy.sh`** (runner, S3 — transport only). Mirror
  `hi2vi_web/deploy/github-actions-production-deploy.sh`: `umask 077` tempdir for key + known_hosts,
  `ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=<pinned> -o IdentitiesOnly=yes`,
  optional passphrase via `ssh-agent`+askpass, `scp` the remote gate + create a remote artifact dir,
  invoke with `TARGET_SHA` / `REPO_PATH=/opt/knowledge` / `REMOTE_ARTIFACT_DIR`, collect artifacts back
  by `scp`. Non-secret defaults as env (same shared box: `ORACLE_SSH_HOST=140.245.64.173`, `USER=opc`,
  `PORT=22`; only `REPO_PATH` differs from hi2vi's `/home/opc/hi2vi_web`).
- **`deploy/oracle-production-deploy-remote.sh`** (on-box gate, S2/S3). Mirror hi2vi's: refuse a dirty
  **tracked** worktree, `git fetch --prune origin main`, `FETCH_HEAD^{commit}` + `cat-file -e $SHA^{commit}`
  + `merge-base --is-ancestor` — **then** hand to `deploy/deploy.sh`, **then** re-apply the edge vhost per
  §B, then collect artifacts. (Knowledge-specific: reconcile §E replaces hi2vi's detached checkout, and the
  edge re-apply is added on top.)
- **`deploy/deploy.sh`** (bring-up + health-gate + rollback, S2). Reconcile §E → `COMPOSE_BAKE=false docker
  compose -f compose.prod.yml up -d --build` bringing up **both** `api` + `site` → health-gate **both**
  via `docker inspect '{{.State.Health.Status}}'` (hi2vi's `wait_healthy` loop, extended to two services)
  → rollback §F. Keep hi2vi's `COMPOSE_BAKE=false` workaround.
- **`deploy/rollback.sh`** (manual, S2). Per §F.
- **Edge re-apply** reuses P8's already-documented path: `scp deploy/knowledge.conf` →
  `/home/opc/edge/conf.d/knowledge.conf`, then `cd /home/opc/edge && ./deploy.sh` (edge's own `nginx -t`
  gate → graceful reload; **never** recreate the edge). Documented in `deploy/knowledge.conf`'s header +
  `deploy/README.md`.

### §E. Publish-on-write reconciliation — the deploy core (S2)

Replaces hi2vi's detached `git checkout $REF` (which would move HEAD off `main` and could strand an
unpushed publish-on-write commit). Instead, on the box clone, **on `main`**:

1. **Refuse a mid-write, permit ahead/unpushed** — reuse hi2vi's guard **verbatim**:
   `! git diff --quiet || ! git diff --cached --quiet` (refuses only a dirty tracked worktree = a write in
   progress; an *ahead/unpushed* clean tree passes — that is the whole point).
2. `git fetch --prune origin main`; ancestor-gate exactly as hi2vi:
   `FETCH_HEAD^{commit}` + `git cat-file -e $TARGET_SHA^{commit}` + `git merge-base --is-ancestor $TARGET_SHA $fetched`.
3. **Reconcile on `main`**, mirroring `server/gitops.py`'s own push discipline (fetch → rebase onto
   `origin/main` → never force): `git merge --ff-only` when the box is strictly behind; `git rebase $fetched`
   when the box is ahead/diverged (an unpushed doc replays cleanly on top). On rebase conflict →
   `git rebase --abort` + refuse the deploy (never leave a half-rebased clone). **Never** detach / `reset
   --hard` / `--force`.
4. **Root-owned `.git`** (the api container commits as uid 0, so `/opt/knowledge/.git` objects are
   root-owned; `opc` can't `git` against them cleanly). Two options — **recommend (a)**:
   - **(a, recommended) one-shot container git:** `docker run --rm -v /opt/knowledge:/repo <api-image>
     git -C /repo <cmd>` — runs as uid 0 and **reuses the image's baked `git config --system
     safe.directory /repo` + identity** (verified in `Dockerfile:39-41`); no host sudo grant, matches the
     ownership model the container already uses.
   - (b) `sudo git` on the box — simpler but requires granting `opc` sudo-git.
5. **Concurrency:** a publish-on-write commit could land mid-deploy. Retry transient `.git/index.lock`
   contention; accept the small residual race (manual dispatch is rare; a write is ~6 s). S2 documents this.

### §F. Rollback for mount-based code (S2)

**Key divergence from hi2vi:** knowledge runs `server/` from the **bind mount** (`.:/repo`, `KB_ROOT=/repo`;
`Dockerfile` ships only interpreter+git+deps, never the app — verified `Dockerfile:1-4,29-31`). So an
image-tag flip (hi2vi's rollback) **cannot revert mounted `server/` code** — the code follows the
working-tree checkout, not the image.

- **v1 (recommended): health-gate-and-report, no auto git rollback.** On health failure, capture artifacts,
  exit non-zero, and recover by **fix-forward** (merge a fix to `main`, re-dispatch). Simple, and it never
  risks moving the publish-on-write checkout backwards under the running container.
- **v2 (optional): best-effort git rollback** to a recorded `PREV_HEAD`, **only** when a clean ff-back with
  **no stranded doc commits** is possible (else refuse and fall back to v1). More moving parts near the
  publish-on-write invariant.
- Present both to the operator at sign-off; **v1** is the DECOMP recommendation.

### §G. Runner SSH-key provisioning (S4)

Net-new runner → `opc@box` SSH key, added as **three repo secrets on `leetusik/knowledge`**, mirroring
hi2vi's set (verified `hi2vi_web/.github/workflows/deploy-production.yml:61-63` +
`github-actions-production-deploy.sh:17-19`): `ORACLE_SSH_PRIVATE_KEY`, `ORACLE_SSH_KNOWN_HOSTS`,
`ORACLE_SSH_PASSPHRASE`. Two options — **recommend (b)**:

- (a) reuse hi2vi's existing runner key;
- **(b, recommended) mint a dedicated `knowledge` runner key** — least-privilege, and safer given P8's
  leaked-key history (a dedicated key can be rotated/revoked without touching hi2vi's deploy).

This key is **distinct** from the container's git deploy key `knowledge-api@oci-box` (P8, publish-on-write)
— P9 **never** touches that credential. S4's runbook complements the existing `deploy/SECRETS.md`.

### §H. Fresh-on-write linchpin — must be proven in E2E (S5)

Live-serve freshness depends on mkdocs' file watcher inside `knowledge-site` detecting the **api
container's** writes to the shared bind-mounted `docs/`. On the Linux box, cross-container `inotify` over a
shared bind mount fires on the same host inode, so it **should** work — but this is the **critical
assumption** of the live-serve choice, so **S5 must prove it**: POST a doc via the api → it appears on
`https://knowledge.hi2vi.com/` with **no container restart**. The `--livereload` flag (§A) is what arms
the watcher. **Fallback if it doesn't fire:** mkdocs' polling watch, or switch `knowledge-site` to
rebuild-on-write. This is why S5 is `high` and gated as operator co-work.

### S1 findings — self-host the web UI + retire Pages (done 2026-07-15, author-only, no box impact)

Implemented §A/§B/§C against the signed-off design + the two confirmed operator decisions
(Pages = reclassify + neutralize; URLs → `knowledge.hi2vi.com` **root**). Six files changed, all
locally validated (no SSH, no edge reload, no `docker compose up`). Notes for S2–S5 + REVIEW:

- **`compose.prod.yml` — new `site` service.** Added `site` (key `site`, `container_name:
  knowledge-site`, `image: squidfunk/mkdocs-material:9.7.6`, `command: serve --dev-addr=0.0.0.0:8000
  --livereload`, `volumes: [ .:/docs ]`, `networks: [ changple_shared_network ]`, **no host `ports:`**,
  `restart: unless-stopped`, python-based healthcheck hitting `/` with `start_period: 40s`). `--livereload`
  is present verbatim from local `compose.yml` `kb` (the §H fresh-on-write flag). `KB_PUBLIC_BASE_URL`
  repointed to `https://knowledge.hi2vi.com` (no trailing slash — `config.py` rstrips). Also refreshed the
  file's now-stale header comment ("ships ONLY the api service … Pages" → "ships TWO services"). `docker
  compose -f compose.prod.yml config` confirms: `site` on `changple_shared_network`, no ports, healthcheck
  + start_period 40s. **For S2:** the deploy must bring up **both** `api` + `site` and health-gate both;
  `docker inspect '{{.State.Health.Status}}'` works for `site` too (healthcheck is now declared).
- **`deploy/knowledge.conf` — two-location split.** Added `set $knowledge_site_upstream knowledge-site;`
  next to the api var. Split the single `location /` into three: `location /api/` + `location = /healthz`
  → `$knowledge_upstream` (both keep `proxy_connect_timeout 5s` + `proxy_read_timeout 120s`), and
  `location /` → `$knowledge_site_upstream` (the mkdocs viewer). **Header-inheritance footgun handled:**
  hoisted the shared `proxy_set_header` (Host / X-Real-IP / X-Forwarded-For / X-Forwarded-Proto) +
  `proxy_http_version 1.1` + `proxy_set_header Connection ""` to **server level**, leaving each `location`
  with only `proxy_pass` (+ the api timeouts) so all three inherit the full header set. Skipped the
  livereload websocket `Upgrade`/`Connection` headers (cosmetic per §B). Refreshed the file header comment.
  Verified: no `default_server`, no IPv6 `listen`, no `limit_req_zone` (the only grep hits are the house-rule
  doc comments). **Isolated `nginx -t` passed** (throwaway `nginx:alpine`, dummy certs, `http{}` wrapper
  including only this vhost) — but the real cross-tree `nginx -t` + graceful reload over the full conf.d/
  tree (with `hi2vi.conf` + `00-default.conf`) is **S2's edge-re-apply + S5's on-box gate**, not done here.
- **URL cutover (`mkdocs.yml` + `params.operator.json`).** `mkdocs.yml:2` `site_url` → `https://knowledge.hi2vi.com/`
  (trailing slash — root) and `params.operator.json` `KB_SITE_URL` set **identically** (mkdocs.yml is
  `parameterized`; `plugin_parity.py` renders the template with these params and byte-compares). Parity green.
- **Pages retirement (`pages.yml` + `manifest.json`).** **Refinement of the approved "drop the push
  trigger":** rather than drop the `push:` trigger, I **removed the Pages deploy** (the `deploy` job, the
  `upload-pages-artifact` step, the `pages: write` + `id-token: write` permissions, and `concurrency:
  group: pages`) while **keeping the `build` job on `push:[main]` + `workflow_dispatch`** (checkout →
  setup-python → `pip install mkdocs-material==9.7.6` → `mkdocs build` → `site_smoke.py`). This retires
  Pages for this repo's site **and** preserves the site-build CI guard (catches a broken build/site_smoke
  before it reaches the box's live-serve); dropping the trigger would have lost that guard. Kept the
  filename `.github/workflows/pages.yml` (`site_smoke.py:147-160` reads that exact path for pin-parity) and
  the `mkdocs-material==9.7.6` pin line; renamed `name:` → `site build`. Reclassified `pages.yml` **out of**
  `manifest.json` `files.identical` (removed the last entry + the now-dangling comma after `.dockerignore`)
  so the neutralized repo copy and the untouched plugin template (`plugin/templates/kb/.github/workflows/
  pages.yml`, still full Pages) may legitimately diverge — downstream plugin users keep Pages. `pages.yml`
  is in no other manifest class and `.github/workflows` is not a `shipped_dir`, so it is now
  parity-unmanaged. Both CIs green.
- **Cutover safety (unchanged from §C):** disabling the deploy does **not** take the live Pages *site*
  down (it serves the last build until the operator flips repo Settings→Pages **Off**). So the box site must
  be proven live in **S5 before** Pages is turned off — no gap. This slice has **zero** production impact.

### S2 findings — on-box deploy core `deploy/deploy.sh` (done 2026-07-15, author-only, no box impact)

Authored `deploy/deploy.sh` per §E/§F + the signed-off operator decisions (one-shot container git,
gate+fix-forward, no rollback). **Only** `deploy/deploy.sh` changed — `compose.prod.yml` untouched.
Static-validated only (no docker/SSH here); behavioral proof is **S5**. Notes for S3–S5 + REVIEW:

- **Reconcile mechanism = `docker compose run` reusing the api service (NOT a compose edit).** Chose
  `docker compose -f compose.prod.yml run --rm -T --no-deps --name knowledge-reconcile-$$
  --entrypoint sh api -c '<posix reconcile>'`. It inherits the api's `.:/repo` mount, `/run/secrets`
  deploy key, `GIT_SSH_COMMAND`, `changple_shared_network`, and the baked `safe.directory /repo` +
  identity — so git fetch/rebase over SSH run as uid 0, matching the root-owned `.git`. **The
  `container_name: knowledge-api` caveat is handled by `--name knowledge-reconcile-$$`** (a unique
  ephemeral name that can't clash with the live container), so **no `image:` was added to
  `compose.prod.yml`** and the config/parity/site_smoke suite was not required. **Fallback if a given
  Compose still refuses `run` on the pinned service:** add `image: knowledge-api:latest` + use
  `docker run` (documented in the script header + failure message). **S5 MUST confirm live:** (a)
  `docker compose run` is accepted on the pinned api service, (b) the run container authenticates to
  github over SSH and reconciles, (c) the live api's bind-mounted tree reflects the reconcile.
- **Tip-vs-`TARGET_SHA` divergence (deliberate, documented in code + result.md):** the box deploys
  origin/main's **tip**, not the exact `TARGET_SHA` — can't `checkout --detach` to a SHA without
  risking orphaning an unpushed publish-on-write doc. `TARGET_SHA` is a sanity assert + log only
  (`cat-file -e` + `merge-base --is-ancestor`); the authoritative ancestor gate is **S3**'s remote
  script. Code and docs are disjoint paths, so tip-code == `TARGET_SHA`-code absent an interleaved
  code commit mid-run.
- **Reconcile logic mirrors `server/gitops.py`:** refuse dirty tracked worktree (permit ahead/unpushed
  clean); wait out `.git/index.lock` (`LOCK_TRIES`×`LOCK_INTERVAL` = 6×3 s; accept the small residual
  race); `fetch --prune origin main`; `merge --ff-only` when behind/equal, `rebase` when
  ahead/diverged, `rebase --abort`+fail on conflict; a defensive `main`-branch guard. **Never**
  detach/reset/force (those tokens live only in comments).
- **Health-gate BOTH** `knowledge-api` + `knowledge-site` (hi2vi's `wait_healthy` parameterized;
  24×5 s each, covering start_periods 60 s / 40 s; docker's transient `starting` keeps polling). **§F
  v1 failure path:** capture `compose ps` + per-service `logs` into `$REMOTE_ARTIFACT_DIR` (set by
  S3's remote gate), then `die` non-zero with a fix-forward message — **no** `rollback.sh`, no image
  flip, no `git reset` (bind-mounted code can't be reverted by an image flip anyway).
- **For S3:** `deploy.sh` accepts `TARGET_SHA` as `$1` (or env) and honors `REMOTE_ARTIFACT_DIR`; it
  does the reconcile itself — so S3's `oracle-production-deploy-remote.sh` does the dirty-worktree
  refusal + `fetch`/ancestor-gate (authoritative) and then calls `deploy/deploy.sh "$TARGET_SHA"`,
  then re-applies the edge vhost. The dirty-worktree + fetch/ancestor steps are duplicated defensively
  inside `deploy.sh` (it can run standalone on-box) — that is intentional, not a conflict.
- **bash-3.2 toolchain note:** the reconcile heredoc is captured via
  `IFS='' read -r -d '' RECONCILE_SCRIPT <<'RECONCILE' … || true` (not `$(cat <<…)`), because a
  heredoc-in-command-substitution with an apostrophe in the body trips macOS bash 3.2's parser; the
  `read` idiom is clean on both bash 3.2 and the box's modern bash. Purely a static-check
  accommodation.

### S3 findings — GHA driver + `Production Deploy` workflow + on-box gate (done 2026-07-15, author-only, no box impact)

Authored the three CI-to-box wrapper files per §D, mirroring `hi2vi_web`'s three-script split for the
`/opt/knowledge` publish-on-write clone + the two-service + edge shape. Static-validated only (no SSH,
no dispatch, no docker); behavioral proof is **S5**. Three new files, none in the plugin manifest.

- **`deploy/github-actions-production-deploy.sh`** (runner driver, transport only). Near-verbatim mirror
  of hi2vi's; only knowledge specifics: `ORACLE_REPO_PATH=/opt/knowledge`, `/tmp` names
  `knowledge-gha-deploy-…`/`knowledge-gha-artifacts-…`, header comment. **Kept hi2vi's generic log
  prefixes verbatim** (`[production-deploy]` / `[oracle-production-deploy]`) — they're not hi2vi-specific
  strings, so knowledge-ifying them would only diverge the mirror (noted as a deviation in result.md).
- **`deploy/oracle-production-deploy-remote.sh`** (on-box gate = authoritative gate). verify → deploy →
  edge re-apply → collect. **Knowledge adaptations vs hi2vi:** (1) all git calls go through
  `GIT=(git -c "safe.directory=$REPO_PATH")` (applied up front, not conditionally) because the box clone's
  `.git` objects are root-owned (api commits as uid 0); (2) the edge re-apply is layered on **after** a
  healthy deploy — `install -m 0644 $REPO_PATH/deploy/knowledge.conf /home/opc/edge/conf.d/knowledge.conf`
  then `( cd /home/opc/edge && ./deploy.sh )` (edge's own `nginx -t` gate → graceful reload; never
  recreate `edge-nginx`); a failed edge `nginx -t` reloads nothing **and fails the deploy loudly**
  (`die`); (3) artifacts use plain `docker compose -f compose.prod.yml ps` (no `-p`/`--env-file` — env is
  baked as `env_file: .env`). Edge re-apply is skipped if the deploy is non-zero (no routing cutover onto
  unhealthy containers).
- **`.github/workflows/deploy-production.yml`** (`Production Deploy`). `workflow_dispatch` only;
  `preflight` guards `refs/heads/main` + outputs `target_sha=$GITHUB_SHA`; `deploy` (needs preflight,
  timeout 90, environment `production`→`https://knowledge.hi2vi.com`, `concurrency: knowledge-deploy`,
  `cancel-in-progress: false`) checks out `target_sha`, `bash -n`s the three helpers, runs the driver
  with `TARGET_SHA` + the three `ORACLE_SSH_*` secrets (S4 provisions them on `leetusik/knowledge`) +
  `ARTIFACT_DIR`, then an **external smoke on BOTH** `/healthz` **and** `/` (both must 200 under a retry
  loop), then `upload-artifact` (`if: always()`, 14 d). Secret name set is **identical to hi2vi's**.
- **Static validation, all pass:** `bash -n` × 3 scripts + all 4 embedded `run:` blocks; YAML via
  `ruby -ryaml` (actionlint + pyyaml absent in this env — noted); secret names + dual smoke confirmed;
  `plugin_parity.py` PASS (deploy files + workflow not in the manifest); `workflow.py validate` PASS.
- **TOP S5 RISK — opc's fetch in the gate.** The gate's `git fetch --prune origin main` + ancestor
  check is the authoritative gate but runs as **opc** on the host, while knowledge's `origin` is the
  SSH form with a root-owned deploy key opc can't read, and a fetch must **write** into the root-owned
  `.git`. `-c safe.directory` fixes only the ownership *check*, not key-read or `.git` write. **S5 must
  prove opc can actually fetch origin/main**; if not, the gate should fetch via the public HTTPS URL
  (public repo, no credential to read) or delegate the fetch/ancestor gate to deploy.sh's in-container
  path (a fix slice). hi2vi's identical fetch-as-opc works, but hi2vi's clone isn't a root-committing
  publish-on-write clone — this is the knowledge-specific unknown.

### F1 findings — gate hardening: `deploy.sh`'s in-container reconcile is the single git-truth path (done 2026-07-15, author-only, no box impact)

Fixed the **top S5 risk** S3 flagged: `oracle-production-deploy-remote.sh`'s authoritative
`git fetch --prune origin main` + ancestor-verify ran as **`opc`**, which cannot authenticate
(`origin` is SSH, deploy key root-owned/unreadable by opc, no opc GitHub key) — so it would kill
**every** deploy at the gate. The fix is a **net deletion** in the gate + comment-only accuracy edits in
`deploy.sh`. Static-validated only; behavioral proof is **S5**.

- **The delegation is fully covered — verified before deleting.** `deploy/deploy.sh`'s one-shot **root**
  reconcile container (which holds the deploy key via `GIT_SSH_COMMAND` + baked `safe.directory`) already
  does, all fail-closed under `set -eu`: on-`main` branch check (160-164), dirty-tracked refusal (168-172,
  identical guard to the one removed), `.git/index.lock` wait (177-186), `git fetch --prune origin main`
  (189), `FETCH_HEAD` rev-parse (190), `cat-file -e $TARGET_SHA` (196-199), `merge-base --is-ancestor`
  (200-203), and ff/rebase reconcile w/ abort-on-conflict (207-224) — **strictly more** than the gate's
  removed opc-side checks. The gate asserts `TARGET_SHA` is 40-hex and hands off `deploy/deploy.sh
  "$TARGET_SHA"`, so the in-container `if [ -n "$TARGET_SHA" ]` ancestor gate **always fires** on a real
  deploy. Fail-closed safety (non-`main` / dirty / missing-or-non-ancestor SHA / rebase conflict) is
  **preserved and relocated**, now inside the container before any build — not weakened.
- **Gate changes:** deleted the opc-side dirty-check gate and the fetch+ancestor block (and the now-unused
  `fetched_main_sha`); made `run_capture` non-fatal (`|| true`) so the git-before/git-after status
  artifacts can never abort the deploy; kept the `GIT=(git -c safe.directory=…)` array **only** for those
  best-effort captures (three call sites, all `git status --short --branch`); rewrote the header from
  "AUTHORITATIVE gate" to opc-safe **orchestration** with an explicit "why no git gate here" paragraph.
  Kept the `TARGET_SHA`/`.git` asserts, the `deploy/deploy.sh` handoff, `reapply_edge`, `collect_status`,
  and the summary unchanged. Only executable git remaining in the gate: the 3 non-fatal status captures.
- **`deploy.sh` = comment-only (NO logic change, `git diff`-confirmed).** Updated four comments that called
  the in-container ancestor-verify "only a sanity assert" / pointed to "S3's remote script" as authoritative
  (the DELIBERATE DIVERGENCE block, the usage line, the `TARGET_SHA=` knob, the reconcile comment above the
  ancestor branch): after F1 that in-container check **is** the authoritative ancestor gate. The deliberate
  tip-vs-`TARGET_SHA` divergence note is preserved (box deploys the fetched **tip**; `TARGET_SHA` is
  verified an ancestor of it, fail-closed). Deviation from plan: also touched the usage line + `TARGET_SHA=`
  knob comment (same stale "sanity assert" wording) beyond the two spots the plan named, to avoid leaving
  the file self-contradictory — all comment-only, within plan intent.
- **For S5:** the whole point of F1 is proven only on the box — S5 must confirm (a) the gate no longer dies
  as opc (no opc-side fetch), and (b) `deploy.sh`'s reconcile container actually authenticates to GitHub
  over SSH, fetches, ancestor-gates fail-closed, and ff/rebases. The gate is now pure orchestration:
  assert inputs → `deploy.sh` (authoritative git + build + health-gate) → edge re-apply → artifacts.
- **Static validation, all pass:** `bash -n` both scripts; `plugin_parity.py` PASS (deploy files not in the
  manifest); `workflow.py validate` PASS. `shellcheck` not installed in this env.

### S4 findings — runner SSH-key provisioning runbook + operator gate (authored 2026-07-15, docs-only, `needs_operator`)

Extended `deploy/SECRETS.md` with the net-new **GHA runner → `opc@box`** SSH-key provisioning discipline
(§G option b: a *dedicated* key, mint-from-scratch, not a reuse of hi2vi's). **One file** changed
(`deploy/SECRETS.md`); no box SSH, no `gh`, no dispatch. Returned `needs_operator` — only the operator
can mint the key + create the secrets. Static-validated only. Notes for S5 + REVIEW:

- **Secret contract confirmed against the driver** (`deploy/github-actions-production-deploy.sh`):
  `ORACLE_SSH_PRIVATE_KEY` **required** (l.65) + `ORACLE_SSH_KNOWN_HOSTS` **required** (l.66) — both must
  exist or the runner `die`s before connecting; `ORACLE_SSH_PASSPHRASE` **optional** (empty ⇒
  passphrase-less path, l.23/89-99). Box coords `opc@140.245.64.173:22` (driver defaults l.17-19). The
  runbook's three secret names match the driver exactly, so **S5's dispatch just needs these three set**.
- **Two-credentials crux, encoded hard:** new `## 2b` opens with a "This is NOT the §2 key" table
  (direction / stored-as / born / comment-tag) + "P9 provisions §2b only." §2 (the P8 container→GitHub
  deploy key `knowledge-api@oci`, born on the box at `/opt/knowledge-secrets/knowledge_deploy_key`) is
  **untouched** — no content or path of §2 changed. §2b's comment tag is `knowledge-gha-runner@box`.
- **Mint/register discipline (dedicated, from scratch):** `ssh-keygen -t ed25519 -N ''` into a `umask
  077` `mktemp -d` on the operator's machine → private half piped **once** into `gh secret set < file`
  (never displayed) → `.pub` **appended** to `~opc/.ssh/authorized_keys` (`>>`, never overwrite — hi2vi's
  runner key on the same `opc` account survives) → host key `ssh-keyscan`'d and **verified out-of-band**
  against the box's `/etc/ssh/ssh_host_ed25519_key.pub` fingerprint (defeats scan-time MITM; why
  `StrictHostKeyChecking=yes` is safe) → tempdir **shredded**. Dedicated = blast-radius isolation
  (rotate/revoke this key's `authorized_keys` line + its secret without touching hi2vi); it is isolation,
  **not** a forced-command lock (the driver `scp`s + runs a script, so a command restriction isn't
  applicable — noted in the runbook).
- **Honest intro-invariant fix:** the file's "no secret value ever transits a laptop / both generated on
  the box" claim was refined — it still holds for §1 (token) + §2 (push key), but the runner key is the
  **one deliberate exception** (its private half *must* reach a GH secret): a minimal, controlled transit
  (`umask 077` tempdir → one `gh secret set`, client-side-encrypted → `.pub` to box → shred), not a
  free-for-all. No silent self-contradiction left.
- **Label-echo observation (for REVIEW):** §2 already uses inline bold sub-steps `2a./2b./2c.`; the new
  top-level `## 2b` heading (the plan's explicit name) visually echoes §2's inline `2b.`. Not a
  cross-reference ambiguity (no "§2b" reference in the file points at §2's inline step — all point at the
  new heading), and the plan forbids touching §2, so I kept the plan's naming. REVIEW may optionally
  renumber §2's inline steps.
- **For S5:** the dispatch is blocked until the operator completes the §2b to-do (mint + 3 secrets + `.pub`
  append + OOB host-key verify + shred). Once done, S5 can `workflow_dispatch` the `Production Deploy`
  action; the runner will authenticate to `opc@140.245.64.173` with `ORACLE_SSH_PRIVATE_KEY` against the
  pinned `ORACLE_SSH_KNOWN_HOSTS`.
- **Static validation:** `python3 scripts/plugin_parity.py` PASS (`SECRETS.md` not in the manifest → zero
  parity impact); `python3 scripts/workflow.py validate` PASS; markdown internal-consistency read-through
  PASS.

## Constraints

- **Design-first:** S1 does not start until the operator signs off on §A–§H (like P8). DECOMP proposes; it
  implements nothing.
- **Two distinct credentials, never conflate:** (a) the GHA runner → `opc@box` SSH key (P9, §G) vs (b) the
  container → GitHub git deploy key `knowledge-api@oci-box` (P8, publish-on-write). P9 provisions (a) only.
- **Never** detach / `reset --hard` / `--force` the box clone (§E) — it is also the publish-on-write clone;
  a deploy must never orphan an unpushed doc commit.
- **Edge house rules** (§B): no `default_server`, no IPv6 `listen`, no `limit_req_zone` — the conf.d tree is
  `nginx -t`-tested and reloaded **as a unit**; one break takes every site on the edge down.
- **Keep both CIs green** (§C): touching `pages.yml` / `mkdocs.yml` / `params.operator.json` must not break
  `site_smoke.py` pin-parity or `plugin_parity.py` `identical`/`parameterized` checks.
- **Manual dispatch only** (`workflow_dispatch`): the agent's constant publish-on-write pushes to `main`
  must **never** trigger a redeploy (intent.md, Clarifications Resolved).
- **The shipped plugin keeps Pages** for downstream users — retire Pages for **this** repo's site only.
- **No cross-repo blast radius:** knowledge-repo-internal; does not change the frozen hi2vi consumer
  contract from P8.

## Doc impact

_Running list of durable-truth changes for **P9.REVIEW** to consolidate into doc versions (one version
per affected doc, capturing the whole phase). Seeded by `P9.DECOMP`; each slice appends as it changes
durable truth — do **not** version docs per slice._

- `operations.md` — the site is now **self-hosted** (live-serve `knowledge-site` viewer on the box), not
  Pages; **drop the ~65 s Pages publish SLA** (fresh-on-write instead); document the manual-dispatch
  redeploy procedure (reconcile + both-service bring-up + edge re-apply) and the two-service topology.
- `architecture.md` — Track 1 (the human web UI) becomes **self-hosted live-serve**, not GitHub Pages;
  two independent services (`knowledge-api` + `knowledge-site`) on one box behind two-location edge routing.
- `api.md` — the 201 `url` origin is now `https://knowledge.hi2vi.com` (root); the publish mechanism is
  the box's live-serve site, no longer Pages (the git push is off-box backup/history only).
- `security.md` — the public-site premise is now served by the box; add the runner→`opc@box` SSH-key
  credential (§G), kept distinct from the container's `knowledge-api@oci-box` deploy key.
- `decisions.md` — new ADRs: self-host the site; live-serve (vs static/cron rebuild); retire Pages;
  automated production deploy + the reconcile / mount-based-rollback divergences from hi2vi (§E/§F); the
  dedicated runner key (§G).
- `deploy/README.md` — extend with the manual-dispatch redeploy procedure + the `knowledge-site` service
  (a repo doc, **not** a `docs/current/*` durable doc — note it here for S1/REVIEW, not for `doc-new-version`).
- **S1 realized (2026-07-15)** the durable-truth changes above in code — REVIEW should consolidate them into
  the named docs: `operations.md`/`architecture.md` (self-hosted `knowledge-site` live-serve + two-location
  edge routing, no Pages, no ~65 s SLA), `api.md` (201 `url` origin now `https://knowledge.hi2vi.com` root),
  `decisions.md` (self-host + live-serve + retire-Pages + the Pages "reclassify-out-of-`identical`"
  mechanism). Nothing versioned this slice (deferred to REVIEW per the once-per-phase rule).
- **S2 realized (2026-07-15)** the §E/§F deploy-core divergences in code (`deploy/deploy.sh`) — REVIEW
  should fold into `decisions.md` new ADRs: **publish-on-write reconcile-on-`main`** (fetch → ff-only
  when behind / rebase when ahead / abort on conflict; never detach/reset/force; deploys origin/main
  **tip** — the deliberate tip-vs-`TARGET_SHA` divergence — via a one-shot container reusing the api
  service for root-owned-`.git` + SSH), and **gate + fix-forward, no rollback** (§F v1; bind-mounted
  code makes an image flip useless). Also `operations.md` — the manual-dispatch redeploy procedure now
  has a concrete on-box script (reconcile → both-service bring-up → health-gate both). Repo doc
  `deploy/README.md` should gain the `deploy.sh` usage + reconcile/fix-forward behavior (not a
  `docs/current/*` durable doc — for S3/REVIEW, not `doc-new-version`). Nothing versioned this slice.
- **S3 realized (2026-07-15)** the manual-dispatch production deploy as the concrete three-script
  GHA→box chain — REVIEW should fold into: `operations.md` (the redeploy **procedure** is now a
  `workflow_dispatch` `Production Deploy` action → SSH-transport driver → on-box authoritative gate
  [dirty-check + `fetch`/ancestor-gate] → `deploy/deploy.sh` → **edge vhost re-apply** [`install` conf
  + edge `./deploy.sh` `nginx -t` gate → graceful reload] → **dual external smoke** on `/healthz` + `/`;
  artifacts uploaded 14 d) and `decisions.md` (new ADRs: **mirror hi2vi's three-script split**
  [runner-transport driver / on-box gate / `deploy.sh`] for the knowledge shape; **edge re-apply inside
  the on-box gate** after a healthy deploy [a failed edge `nginx -t` fails the deploy loudly];
  **`workflow_dispatch`-only, main-guarded, `concurrency: knowledge-deploy`** so the agent's constant
  publish-on-write pushes never trigger a redeploy). Repo doc `deploy/README.md` should gain the
  manual-dispatch redeploy usage (not a `docs/current/*` durable doc). Nothing versioned this slice.
- **F1 realized (2026-07-15)** the gate hardening: the authoritative git (fetch `origin/main` + fail-closed
  `TARGET_SHA` ancestor-verify + dirty refusal + on-`main` + `.git/index.lock` wait + ff/rebase reconcile)
  now lives **only** inside `deploy.sh`'s one-shot **root** container — the opc-side gate cannot authenticate
  (SSH origin, root-owned deploy key, no opc key), so `oracle-production-deploy-remote.sh` is now pure
  opc-safe orchestration (assert inputs → `deploy.sh` owns all git → edge re-apply → artifacts). REVIEW
  should fold into: `operations.md` (the redeploy procedure's authoritative reconcile/fetch/ancestor gate is
  the in-container step, not an on-box opc gate) and `decisions.md` (new ADR: **relocate all authoritative
  git into `deploy.sh`'s root container** because the opc-side fetch can't authenticate against the SSH
  origin / root-owned publish-on-write clone — the knowledge divergence from hi2vi's opc-side fetch).
  Nothing versioned this slice.
- **S4 realized (2026-07-15)** the runner-key provisioning discipline in the repo doc `deploy/SECRETS.md`
  (§2b + §5 bullet + intro-invariant fix) — a **repo doc, not** a `docs/current/*` durable doc, so nothing
  is versioned here. For **REVIEW → `security.md`**: add the **GHA runner → `opc@box` SSH-key credential**
  (three `leetusik/knowledge` Actions secrets `ORACLE_SSH_PRIVATE_KEY` / `ORACLE_SSH_KNOWN_HOSTS` /
  optional `ORACLE_SSH_PASSPHRASE`; dedicated ed25519, `knowledge-gha-runner@box`, `.pub` on `opc`'s
  `authorized_keys`), kept **distinct** from the P8 container→GitHub deploy key `knowledge-api@oci-box`
  (`/opt/knowledge-secrets/knowledge_deploy_key`, born on the box) — the two-credentials distinction is
  the load-bearing security note. Also note the deliberate secret-transit exception for the runner key
  (private half minted in a `umask 077` tempdir → piped once into `gh secret set` → shredded), which
  refines `security.md`'s "secrets are box-born-and-never-leave" premise. `decisions.md` already carries
  the "dedicated runner key (§G)" ADR from DECOMP's list. Nothing versioned this slice.

## Open Questions

_For operator sign-off at S1 (design-first). DECOMP's recommendations noted; operator confirms._

- **§C Pages-retirement mechanism:** reclassify+neutralize (pref) vs settings-only vs full-removal? (The
  `identical` byte-compare on `pages.yml` forces an explicit choice — see §C.)
- **§E root-owned `.git` access:** one-shot container git (pref) vs `sudo git` on the box?
- **§F rollback:** health-gate-and-report / fix-forward only (v1, pref) vs optional best-effort git
  rollback (v2)?
- **§G runner key:** dedicated `knowledge` key (pref) vs reuse hi2vi's key?
