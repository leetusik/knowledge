# P14.S3 — Result — Ship the web app (Dockerfile + compose + edge)

The Next `web/` app is now deployable behind the OCI edge, the mkdocs `site` is retired, and the
`/api/auth/*` BFF-vs-FastAPI collision is resolved at the edge. Every artifact was locally validated
(including a full Docker build + a live container smoke). The live edge apply stays operator-run at REVIEW.

## What I built

**`web/Dockerfile` (new)** — multi-stage `node:22-slim`, context `web/`, adapted from hi2vi_web's
Next-standalone pattern with the **sharp/@img block dropped** (this app has no `next/image`, so no native
codec closure to stage) and the hi2vi-specific verification/analytics build args dropped (`web/` has exactly
one `NEXT_PUBLIC_*` var).
- build stage: `corepack prepare pnpm@10.28.2`, `pnpm install --frozen-lockfile`, `ARG NEXT_PUBLIC_APP_URL`
  + non-empty assert, `ENV NEXT_PUBLIC_APP_URL`, `pnpm build`. `NEXT_TELEMETRY_DISABLED=1`; **NODE_ENV is
  NOT set in build** (would drop devDeps → build fails).
- runtime stage: `NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0`; copy `.next/standalone`→`./`,
  `.next/static`→`./.next/static`, `public`→`./public`; `USER node`; `EXPOSE 3000`; `HEALTHCHECK` via
  `node -e "fetch('http://127.0.0.1:3000/')…"`; `CMD ["node","server.js"]`. No writable-cache line (no
  next/image; the app writes nothing to disk).

**`web/.dockerignore` (new)** — lean context: `node_modules`, `.next`, `out`, `design/`, `tests/`, `.git`,
`.env*`, tsbuildinfo, editor/VCS noise.

**`compose.prod.yml`** — added service `web` (`container_name: knowledge-web`): `build.context ./web` with
`args.NEXT_PUBLIC_APP_URL="https://knowledge.hi2vi.com"`, `expose: ["3000"]` (no host ports),
`depends_on: api service_healthy`, `changple_shared_network`, `restart: unless-stopped`, node-fetch
healthcheck. Runtime env: `KB_API_BASE_URL: http://knowledge-api:8000` (literal) and
`SESSION_SECRET: ${SESSION_SECRET}`. **Removed the `site` (mkdocs `knowledge-site`) service entirely.**
`api`, `postgres`, `pgdata`, and the external network are unchanged (only the header comment + the
`KB_PUBLIC_BASE_URL` caveat comment were touched).

**`deploy/knowledge.conf`** — routes the Next app, retires mkdocs, every edge invariant preserved:
- `set $knowledge_site_upstream knowledge-site;` → `set $knowledge_web_upstream knowledge-web;`
- new `location /api/auth/ { proxy_pass http://$knowledge_web_upstream:3000; proxy_connect_timeout 5s;
  proxy_read_timeout 60s; }` — **more specific than `/api/`** (longest-prefix wins), so the Next BFF's auth
  routes reach the web app while every other `/api/*` still reaches FastAPI (which has no `/api/auth/*`).
- `/api/`, `/auth/`, `/app/`, `= /healthz` → `$knowledge_upstream` **unchanged** (P13 CLI contract, 120s).
- `location /` now proxies `http://$knowledge_web_upstream:3000` (was the mkdocs site).
- routing-contract + header-footgun + `/` comments rewritten for the new topology.
- **Invariants held:** most-specific wins; hoisted server-level `proxy_set_header` with NO per-location
  `proxy_set_header` (the new location sets none too); `resolver 127.0.0.11` + variable `proxy_pass` for
  the web upstream; no `default_server`; no IPv6 `listen`; no `limit_req_zone`; Cloudflare real-IP restore;
  `client_max_body_size 5m`; api `proxy_read_timeout 120s`.

**`deploy/README.md`** — updated the intro, the artifacts list (api + web + postgres; `site` removed; the
two-upstream vhost), §1c `.env` (added `SESSION_SECRET=$(openssl rand -base64 32)` + a note that the box
`.env` also carries the P10 secrets and that `web` reads only `SESSION_SECRET`), §2 bring-up (expect
`knowledge-api + knowledge-web + knowledge-postgres`; one-time `docker compose rm -sf site`; the
`KB_PUBLIC_BASE_URL` caveat block), and the §5 write-test note (doc is readable by id, not a rendered page).

**Deploy-automation follow-through (deviation — see below):** `deploy/deploy.sh` health-gated the now-removed
`knowledge-site`; swapped that gate + its log/artifact/failure strings to `knowledge-web`. Also fixed the
stale service-name comments in `deploy/oracle-production-deploy-remote.sh` and
`.github/workflows/deploy-production.yml` (their functional smoke — `/healthz` + `/`, both 200 — was already
correct since `/` now serves the Next app).

## Validation (all local; live edge apply is operator-run at REVIEW)

| Check | Command | Result |
|-------|---------|--------|
| Compose well-formed, `site` gone | `docker compose -f compose.prod.yml config` (throwaway `.env`) | **PASS** — exit 0, no warnings; services = `postgres, api, web`; web resolves NEXT_PUBLIC_APP_URL/KB_API_BASE_URL/SESSION_SECRET/expose 3000/depends_on api healthy |
| Docker image builds | `docker build -f web/Dockerfile web --build-arg NEXT_PUBLIC_APP_URL=https://knowledge.hi2vi.com` | **PASS** — clean multi-stage build; all three standalone COPY paths resolved; image 408 MB |
| Container runs + serves | `docker run … knowledge-web` then curl | **PASS** — `node server.js` → Next 16.2.10 Ready on `0.0.0.0:3000`; `GET /` → 200, `GET /login` → 200; image HEALTHCHECK → `healthy` |
| Deploy scripts syntax | `bash -n deploy/deploy.sh` / `oracle-production-deploy-remote.sh` | **PASS** |
| Workflow state integrity | `python3 scripts/workflow.py validate` | **PASS** |
| nginx `-t` | (NOT claimed) | Deferred to the box's `./deploy.sh` — needs the full conf.d/ tree + certs. Reviewed against the invariants above instead. |

The Docker build was **not** too heavy — it completed and the container smoke-passed, so this goes beyond
S2's `pnpm build` proof. All verification artifacts (throwaway `.env`, the built image, the test container)
were removed; `.env` is confirmed absent and not in git.

## `KB_PUBLIC_BASE_URL` caveat (flagged, deliberately NOT changed)

`KB_PUBLIC_BASE_URL` stays `https://knowledge.hi2vi.com` in `compose.prod.yml`. The api's 201 `url` field is
`{base}/{project}/{date}-{slug}/` (`server/main.py`) — the retired mkdocs site used to render that path at
`/`, but the Next app has no such route, so the link no longer resolves to a page. **Cosmetic only** — docs
are read by id via the api/app, never this link. Repointing it (to the public docs/ GitHub-Pages track, or
degrading it) is deferred to the operator's prod cutover / a future docs effort. I flagged it in three places:
a `⚠ CAVEAT` comment beside `KB_PUBLIC_BASE_URL` in `compose.prod.yml`, a `> KB_PUBLIC_BASE_URL caveat` block
in `deploy/README.md §2`, and here. Server code, `web/src/`, and `KB_PUBLIC_BASE_URL` were **not** changed.

## Operator box-side deploy steps (run at the REVIEW gate — nothing here is live yet)

1. **Generate the new secret into the box `.env`** (`/opt/knowledge/.env`, gitignored, mode 600):
   `printf 'SESSION_SECRET=%s\n' "$(openssl rand -base64 32)" >> /opt/knowledge/.env` (or via the §1c
   heredoc on a fresh box). Rotating it later forces every user to re-login.
2. **Build + bring up the web app** (and retire mkdocs), on the box in `/opt/knowledge`:
   `COMPOSE_BAKE=false docker compose -f compose.prod.yml up -d --build` then
   `docker compose -f compose.prod.yml rm -sf site`. Expect `knowledge-api + knowledge-web +
   knowledge-postgres` Up (healthy).
3. **Apply the edge vhost:** `scp deploy/knowledge.conf oracle-cloud:/home/opc/edge/conf.d/knowledge.conf`
   then `ssh oracle-cloud 'cd /home/opc/edge && ./deploy.sh'` (its `nginx -t` gate → graceful reload;
   NEVER a recreate). Optionally pre-gate with `./validate.sh`.
4. **Smoke:** `curl https://knowledge.hi2vi.com/healthz` → 200 and `curl https://knowledge.hi2vi.com/` →
   200 (the Next landing). Or dispatch the `Production Deploy` Action (§6), which now builds + health-gates
   `knowledge-api` + `knowledge-web` and smokes both surfaces.

## Deviations from `plan.md`

1. **Extended beyond the five enumerated files to the deploy-automation scripts.** `deploy/deploy.sh` line 280
   health-gated `wait_healthy site knowledge-site`; removing the `site` service (a plan mandate) would have
   made `dc ps -q site` empty → the gate return non-zero → **every automated `Production Deploy` would die
   with a false failure**. I swapped that gate to `knowledge-web` and fixed the matching log/artifact/failure
   strings, plus the stale service-name comments in `oracle-production-deploy-remote.sh` and
   `.github/workflows/deploy-production.yml`. This is a necessary consequence of "remove the site service,"
   not new scope; the plan focused on the artifacts and didn't note the coupling. `bash -n` clean; the live
   behavior runs only on the box (unchanged logic, only the service key/name).
2. **`SESSION_SECRET` via `${SESSION_SECRET}` interpolation, not `env_file: .env`.** The plan said "add it via
   `env_file: .env`". I used `environment: SESSION_SECRET: ${SESSION_SECRET}` (mirroring the api's
   `POSTGRES_PASSWORD`) so the api's `KB_API_TOKEN` / `POSTGRES_PASSWORD` / operator creds in `.env` are NOT
   injected into the web container. Same source (the box `.env`), same operator-generates-it requirement,
   tighter secret surface, and an unset value surfaces earlier (a compose interpolation warning). Documented
   in the compose comment.

No other deviations. No server code, `web/src/`, or `KB_PUBLIC_BASE_URL` value changed. No commit, no status
transition, no `doc-new-version` (per the executor contract).
