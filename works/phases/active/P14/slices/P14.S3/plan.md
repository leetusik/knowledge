# P14.S3 — Plan (native, orchestrator-written) — Ship the web app (Dockerfile + compose + edge)

Make the Next `web/` app deployable behind the OCI edge, following hi2vi_web's Next-standalone-in-Docker
pattern. You are `slice-executor-high`. Read `phase.md` (the "Routing resolution" + "Docs-site decision" +
"Edge reconciliation" notes) first — the decisions are already made; you execute them.

**Resolved (do not re-decide):** landing/app → new `knowledge-web` container; CLI planes
(`/auth //app //api`, `/healthz`) → `knowledge-api` **unchanged**; `/api/auth/` (Next BFF) → `knowledge-web`
(more-specific location); **retire the mkdocs `knowledge-site`** from the edge + compose; `/docs` reserved for
future product docs (do not claim it). The live edge apply is **operator-run** (gated at REVIEW) — you produce
+ locally-validate the artifacts and return `done`.

## Build

1. **`web/Dockerfile`** (new) — multi-stage `node:22-slim`, context `web/`, adapted from
   `~/projects/personal/hi2vi_web/Dockerfile` but **drop the sharp block** (no `next/image`).
   - build: `corepack enable && corepack prepare pnpm@10.28.2 --activate`, `pnpm install --frozen-lockfile`,
     `ARG NEXT_PUBLIC_APP_URL` + assert non-empty, `ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL`, `pnpm build`
     (`output: standalone` is set in `web/next.config.ts`). **Do NOT** set `NODE_ENV=production` in build
     (drops devDeps → build fails). `NEXT_TELEMETRY_DISABLED=1`.
   - runtime: `NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0`, copy `--from=build` `.next/standalone` →`./`,
     `.next/static` → `./.next/static`, `public` → `./public`; `USER node`; `EXPOSE 3000`; `HEALTHCHECK` via
     `node -e "fetch('http://127.0.0.1:3000/')…"`; `CMD ["node","server.js"]`.
   - Add **`web/.dockerignore`** (`node_modules`, `.next`, `.git`, `design/`, etc.) for a lean context.
2. **`compose.prod.yml`** — add `knowledge-web`, remove `site`:
   - Add service `knowledge-web` (`container_name: knowledge-web`): `build: { context: ./web, args: {
     NEXT_PUBLIC_APP_URL: "https://knowledge.hi2vi.com" } }`, `expose: ["3000"]` (no host ports),
     `networks: [changple_shared_network]`, `depends_on: { api: { condition: service_healthy } }`,
     `restart: unless-stopped`, healthcheck fetch `http://127.0.0.1:3000/`. **Runtime env** (`web/src/lib/
     env.ts` requires them): `KB_API_BASE_URL: http://knowledge-api:8000` (literal), and `SESSION_SECRET` from
     the box `.env` (a **NEW secret** — add it via `env_file: .env` and document that the operator must
     generate it).
   - **Remove** the `site` (mkdocs `knowledge-site`) service block entirely.
   - Keep `api`, `postgres`, `pgdata`, the external network unchanged.
3. **`deploy/knowledge.conf`** — route the Next app, retire mkdocs. **Preserve every edge invariant**
   (conf header / `phase.md`): most-specific location wins; hoisted server-level `proxy_set_header` with **NO
   per-location `proxy_set_header`** (inheritance footgun); `resolver 127.0.0.11` + variable `proxy_pass`;
   never `default_server`; no IPv6 `listen`; no `limit_req_zone`; Cloudflare real-IP restore; keep
   `client_max_body_size 5m` + api `proxy_read_timeout 120s`.
   - Replace `set $knowledge_site_upstream knowledge-site;` → `set $knowledge_web_upstream knowledge-web;`.
   - **Add** `location /api/auth/ { proxy_pass http://$knowledge_web_upstream:3000; proxy_connect_timeout 5s;
     proxy_read_timeout 60s; }` (more specific than `/api/`; FastAPI has no such route).
   - **Keep** `/api/`, `/auth/`, `/app/`, `= /healthz` → `$knowledge_upstream` unchanged.
   - **Change** `location / { proxy_pass http://$knowledge_web_upstream:3000; }` (was the mkdocs site).
   - Rewrite the routing-contract comment to describe: `/api/auth/` + everything not
     `/api/ //auth/ //app/ /=healthz` → the Next `knowledge-web`; the CLI planes stay on `knowledge-api`; the
     mkdocs site is retired.
4. **`deploy/README.md`** (+ `deploy/runbook.md` if present) — update tersely: build the `knowledge-web` image
   on the box, `docker compose up -d knowledge-web`, retire mkdocs (`docker compose rm -sf site`), the **new
   `SESSION_SECRET`** the operator generates into the box `.env`, `scp deploy/knowledge.conf … && ssh …
   ./deploy.sh`, and the `KB_PUBLIC_BASE_URL` caveat (below).

## Do NOT
- Change server code, the web app source, or `KB_PUBLIC_BASE_URL`. **Flag** the caveat only: GitHub Pages was
  retired in P9 and the mkdocs site is going, so the API's written-doc `url` field (`server/main.py:540`,
  `{base}/{project}/{date}-{slug}/`) no longer resolves publicly — cosmetic (docs read by id), to be finalized
  at the operator's prod cutover / a future docs effort.

## Verification (local; the live edge apply is operator-run, gated at REVIEW)
- `docker compose -f compose.prod.yml config` passes (create a throwaway `.env` if missing, per the compose
  header — do not commit it) — confirms `knowledge-web` well-formed and `site` gone.
- If Docker is available and time permits, build the image:
  `docker build -f web/Dockerfile web --build-arg NEXT_PUBLIC_APP_URL=https://knowledge.hi2vi.com` and confirm
  it runs (`node server.js`, 200 on `/`). If a full Docker build is too heavy/unavailable, **say so** — S2
  already proved `cd web && pnpm build`.
- **Do NOT claim a live `nginx -t`** (needs the box's full conf.d tree + certs). Review the conf against the
  invariants; the real `nginx -t` gate is operator-side via `deploy.sh`.
- Write `result.md` (what you built, the Docker-build outcome, the `KB_PUBLIC_BASE_URL` caveat, the operator
  deploy steps) + append `phase.md` notes and a **Doc impact** line (web Dockerfile / compose service / edge
  vhost — closes the P14-deferred deploy items). Return a structured verdict. **Do not commit, do not
  transition status, do not version docs.**
