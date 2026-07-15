# Result — P8.S3: prod deploy artifacts for knowledge.hi2vi.com

Authoring + local validation only, as planned. No server code touched, local
`compose.yml` untouched, no `pending` handoff (the operator SSH-applies before
P8.S5). Executor: `slice-executor-mid`.

## Deliverables (all created)

1. **`compose.prod.yml`** (repo root) — api-only box compose project.
   - Only the `api` service; `build: .` (existing Dockerfile); fixed
     `container_name: knowledge-api` (edge proxies by name).
   - **No published ports.** Attaches to `changple_shared_network`
     (`external: true`).
   - Env: literals in `environment:` (`KB_ROOT=/repo`, `TZ=Asia/Seoul`,
     `KB_GIT_PUSH=true`, `KB_REQUIRE_READ_AUTH=true`,
     `KB_PUBLIC_BASE_URL=https://leetusik.github.io/knowledge`,
     `KB_STARTUP_REINDEX=true`); **secrets by reference only** via
     `env_file: .env` (`KB_API_TOKEN`, `GOOGLE_API_KEY`) — no secret values in
     the repo. `KB_GIT_COMMIT` left unset (defaults true).
   - **Push credential wiring:** deploy key + `known_hosts` bind-mounted
     read-only from the box (`/opt/knowledge-secrets:/run/secrets:ro`);
     `GIT_SSH_COMMAND=ssh -i /run/secrets/knowledge_deploy_key -o
     IdentitiesOnly=yes -o UserKnownHostsFile=/run/secrets/known_hosts -o
     StrictHostKeyChecking=yes`. **Chose pinned `known_hosts` over
     `accept-new`** (rationale in-file + runbook): github.com's host keys are
     static and publicly verifiable, so pinning removes the first-push TOFU
     MITM window; the `accept-new` swap is documented as the weaker
     convenience alternative.
   - `restart: unless-stopped`.
   - **Enhancement (deviation, see below):** a dependency-free `healthcheck`
     (image python hitting `/healthz`, `start_period: 60s` for the boot
     reindex) so the runbook's "container healthy" assertion is real.
2. **`deploy/knowledge.hi2vi.com.conf`** — nginx vhost for `changple5-nginx-1`.
   - `server_name knowledge.hi2vi.com`; port 80 → 443 redirect.
   - **Docker-DNS re-resolution (explainer Option-B):**
     `resolver 127.0.0.11 valid=30s;` + `set $kb_upstream
     http://knowledge-api:8000;` + `proxy_pass $kb_upstream;` (survives api
     recreation).
   - **TLS** references the `*.hi2vi.com` wildcard Cloudflare Origin CA cert
     paths (`/etc/nginx/certs/hi2vi.com.{pem,key}`) with a **CONFIRM-AT-APPLY**
     comment to copy hi2vi.com.conf's exact paths, plus the **per-host-cert
     variant** marked in a comment. HTTP/2 left as a version-matched comment
     (avoids an `nginx -t` failure across nginx versions).
   - Standard proxy headers; `client_max_body_size 5m`; sane timeouts (60s read
     for the boot-reindex first hit).
3. **`deploy/README.md`** — operator bring-up + edge re-apply runbook: box prep
   (SSH clone → `/opt/knowledge`, deploy key + `known_hosts` placement, `.env`
   with **names + generation pointers only** — secret provisioning deferred to
   P8.S4), bring-up (`COMPOSE_BAKE=false docker compose -f compose.prod.yml up
   -d --build` + shared-network `curl .../healthz` → 200), edge apply
   (cert-confirm, `docker cp` conf, network connect, `nginx -t` + graceful
   reload), the **cross-repo `apply-to-edge.sh` handoff** + the
   post-changple5-deploy "assume down until re-apply" rule, Cloudflare DNS
   pointer to P8.S4, and a post-apply checklist (healthz 200 / authed search
   200 / un-authed 401) that **explicitly defers the write test to P8.S5**.
4. **`.gitignore`** — added `.env` (was missing; the box `.env` must be
   uncommittable).

## Validation — commands + outcomes

| Command | Outcome |
|---|---|
| `docker compose -f compose.prod.yml config` (dummy `.env` present) | **PASS** (exit 0) — parses; `env_file` secrets merged into `environment`; `changple_shared_network` external; no ports published. |
| `nginx -t` (nginx:1.27-alpine, stub self-signed cert at the referenced paths, `--network none`) | **PASS** — "syntax is ok / test is successful"; validates the resolver, variable `proxy_pass`, TLS load, headers. |
| `.venv/bin/python -m pytest -q` | **PASS** — 65 passed (unchanged from S2; no server code touched). |
| `python3 scripts/plugin_parity.py` | **FAIL (5 issues) — PRE-EXISTING, not caused by this slice** (see below). |
| `python3 scripts/workflow.py validate` | **PASS** — "Workflow validation passed." |

Dummy `.env` (gitignored, placeholder token) was created only for
`docker compose config` / `env_file` resolution and **removed** after — the
worktree carries no `.env`. nginx stub certs live in the scratchpad only.

### plugin_parity FAIL is pre-existing S1/S2 drift, NOT this slice

`python3 scripts/plugin_parity.py` reports 5 drift issues:
```
[identical] byte drift: server/config.py
[identical] byte drift: server/gitops.py
[identical] byte drift: server/main.py
[identical] byte drift: tests/test_api_read.py
[completeness] in repo but not shipped: tests/test_api_push.py
```
All five are **P8.S1/S2 committed changes** (HEAD = `82d6f4a`, P8.S2) that were
never mirrored into `plugin/templates/kb/`: S1 added `gitops.push()` +
`git_push_enabled()` + `test_api_push.py` and edited `main.py`; S2 added
`require_read_auth_enabled()` + `require_read_bearer` and edited
`test_api_read.py`. **This slice touches none of those paths** — it adds only
`compose.prod.yml`, `deploy/*`, and one `.gitignore` line, none of which are
parity-tracked (`shipped_dirs` = server/tests/docs-assets/stylesheets/
javascripts; `.gitignore` is a `template_only` file, not byte-compared). So the
guard was already red at HEAD before P8.S3, and my artifacts provably cannot
change its result. `plugin_parity` runs in CI (`plugin-ci.yml`) on push, so it
was not caught by S1/S2's local pytest gate. **Out of P8.S3 scope to fix**
(would mean editing `plugin/templates/kb/server/*` + `tests/*` + `manifest.json`)
— surfaced as a finding for the orchestrator: a plugin-template sync (its own
fix slice, or P8.REVIEW) is needed before the next push or `plugin-ci` will fail.

## Deviations from plan

- **Added a `healthcheck` to `compose.prod.yml`** (not in the plan's shape
  list). It is dependency-free (uses the image's own python, no curl in the
  slim image), makes `docker compose ps` report `healthy`, and is exactly what
  the runbook's "container healthy" step asserts. `start_period: 60s` covers
  the `KB_STARTUP_REINDEX` boot window. Low-risk operability enhancement,
  within mid-tier bounded judgment.
- Otherwise none — all four deliverables built to the plan.

## Open items the operator must confirm AT APPLY (carried into the runbook)

- **TLS cert coverage** — that hi2vi.com uses a `*.hi2vi.com` wildcard Origin
  cert (the vhost's assumption). If it is a per-host cert, provision a
  knowledge.hi2vi.com origin cert and repoint the two `ssl_certificate*` lines
  (per-host variant is commented in the conf).
- **Exact cert paths** — copy hi2vi.com.conf's real `ssl_certificate` /
  `ssl_certificate_key` paths (the conf uses `/etc/nginx/certs/hi2vi.com.{pem,key}`
  as the placeholder).
- **`known_hosts` pinning** — generate via `ssh-keyscan` and verify against
  GitHub's published fingerprints (or switch to `accept-new`).
- **HTTP/2 directive form** — match the edge's nginx version / other vhosts.
