# Plan — P8.S3: prod deploy artifacts for knowledge.hi2vi.com (compose.prod + vhost + runbook)

Orchestrator plan (auto mode), per the operator-approved hosting proposal in `../../phase.md` §1 (+ §2/§3 for the env the artifacts must carry). Executor: `slice-executor-mid`.

## Job

Author the **ready-to-apply** production artifacts for hosting the API at `https://knowledge.hi2vi.com` on the shared OCI box. This slice is authoring + local validation only — the operator SSH-applies later (the apply/bring-up gate sits before P8.S5; you do not go `pending` here). **No server code changes; do not touch the local `compose.yml`.**

Read first: `../../phase.md` §1–§4, Findings (S1 entry: push mechanics + the `git init --bare -b main` gotcha; the `COMPOSE_BAKE=false` rebuild quirk), `compose.yml` + `Dockerfile` (the local shapes you diverge from), `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md` (the edge you're targeting: `changple5-nginx-1`, `changple_shared_network`, Cloudflare origin certs, the re-apply fragility), and `docs/current/operations.md`.

## Deliverables

1. **`compose.prod.yml`** (repo root, beside `compose.yml`) — the box runs the API from its own clone (e.g. `/opt/knowledge`), so inside that clone `.:/repo` is still the right mount. Shape:
   - **Only the `api` service** (no `kb` viewer). `build: .` with the existing Dockerfile; fixed `container_name: knowledge-api` (the edge proxies to it by name over Docker DNS).
   - **No published ports** — the edge reaches `knowledge-api:8000` over the shared network only. Declare `changple_shared_network` as `external: true` and attach.
   - Env per the proposal: `KB_ROOT=/repo`, `TZ=Asia/Seoul`, `KB_API_TOKEN`, `KB_GIT_PUSH=true`, `KB_REQUIRE_READ_AUTH=true`, `KB_PUBLIC_BASE_URL=https://leetusik.github.io/knowledge`, `KB_STARTUP_REINDEX=true`, `GOOGLE_API_KEY` passthrough — secrets by reference only (`env_file: .env` or `${VAR}` passthrough; **no secret values anywhere in the repo**).
   - **Push credential wiring**: mount the deploy key read-only (a box path, e.g. `/opt/knowledge-secrets/`) and set `GIT_SSH_COMMAND` (`-i <key> -o IdentitiesOnly=yes -o UserKnownHostsFile=<known_hosts>`); include a pinned `known_hosts` for github.com or an `accept-new` strategy — pick one, state why in the runbook. The clone's `origin` must be the SSH form (`git@github.com:leetusik/knowledge.git`) — a runbook step.
   - `restart: unless-stopped`.
2. **`deploy/knowledge.hi2vi.com.conf`** — the nginx vhost, ready to drop onto `changple5-nginx-1`: `server_name knowledge.hi2vi.com`; TLS referencing the `*.hi2vi.com` Cloudflare origin cert paths as hi2vi.com's vhost does (**assumption per proposal: a wildcard origin cert covers it — mark the per-host-cert variant in a comment**, confirm-at-apply step in the runbook); the explainer's Option-B resilience rule: `resolver 127.0.0.11 valid=30s;` + `set $kb_upstream http://knowledge-api:8000;` + `proxy_pass $kb_upstream;` (survives api-container recreation); standard proxy headers; a sane `client_max_body_size` (e.g. 5m — doc writes are markdown); port 80 → 443 redirect consistent with the edge's existing vhosts.
3. **`deploy/README.md`** — the bring-up runbook, operator-facing, step-by-step:
   - Box prep: clone via SSH remote to `/opt/knowledge`, create the gitignored `.env` (variable **names** + generation pointers only — actual secret provisioning is P8.S4's runbook), place the deploy key, `git config` safe.directory if needed.
   - Bring-up: `COMPOSE_BAKE=false docker compose -f compose.prod.yml up -d --build` (carry the documented quirk), verify from the box: container healthy, `docker run --rm --network changple_shared_network curlimages/curl -s http://knowledge-api:8000/healthz` (or equivalent) → 200.
   - Edge apply: copy conf + cert into `changple5-nginx-1`, ensure it's attached to `changple_shared_network`, `nginx -t` + reload — and the **cross-repo handoff note**: extend `apply-to-edge.sh` (hi2vi/changple5 repos) to also restore the knowledge conf+cert; **the post-changple5-deploy rule: assume knowledge.hi2vi.com is down until the re-apply runs.**
   - Cloudflare DNS: proxied `knowledge` record (pointer to S4's provisioning runbook for the actual operator handoff).
   - Post-apply validation checklist: edge-side `curl https://knowledge.hi2vi.com/healthz` → 200; authed `GET /api/search` → 200; un-authed read → 401. **Explicitly defer any write test to P8.S5** (a write pushes to `main` — that's the E2E acceptance, not a runbook smoke step).
4. **`.gitignore`**: add `.env` (verified missing today — the box `.env` must be uncommittable).

## Validation (record commands + outcomes in result.md)

- `docker compose -f compose.prod.yml config` parses (use a dummy env so `${...}` interpolation resolves; document that).
- nginx conf: if convenient, `docker run --rm -v <conf>:/etc/nginx/conf.d/... nginx:<pinned> nginx -t` with stub cert paths commented/stubbed — if TLS paths make `nginx -t` impractical offline, say so and eyeball-verify structure against the explainer instead; don't burn time fighting it.
- `python3 scripts/plugin_parity.py` still passes (new root files must not trip the plugin template parity guard — these are operator-specific artifacts and must NOT be added to `plugin/templates/`).
- Full pytest suite still green (should be untouched); `python3 scripts/workflow.py validate`.

## Constraints

- **No secrets in any artifact** — names and placement paths only.
- Operator-specific values (hi2vi domain, leetusik URLs, box paths) are fine here — but keep them **out of `plugin/templates/`** (the generic scaffold must not inherit hi2vi specifics).
- Append one-line **Doc impact** notes to `phase.md` (operations.md: compose.prod + vhost + runbook + re-apply rule; security.md: deploy-key mount + GIT_SSH_COMMAND wiring) and your findings to Findings & Notes (S3 section) — include anything the operator must confirm at apply time (cert coverage, network name).
- Executor contract: never commit, never transition status; write `result.md`; return the structured verdict; `escalate` with findings if this exceeds mechanical-plus-bounded-judgment depth.
