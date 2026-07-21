# P15.S3 — Containerize + SSE-safe edge routing + dual reachability

## Context

S1+S2 shipped the `mcp-server/` package (two tools, `search` + `fetch_document`, on one Streamable-HTTP
ASGI app at `/mcp`, plus `GET /healthz`). **S3 deploys it**: package the service as a container and make
it **dual-reachable** —
- **(a) internal**, container-to-container on `changple_shared_network` by service name
  (`http://knowledge-mcp:9000/mcp`) — a co-tenant agent (OpenClaw in prod) reaches it with **no edge hop**; and
- **(b) public**, via the box's dedicated edge at `https://knowledge.hi2vi.com/mcp` — for off-box / local-dev agents.

This follows the **proven P14 `knowledge-web` precedent** (own Dockerfile → `compose.prod.yml` service on
the external network with a fixed `container_name` + `expose` + healthcheck → an edge `location` → a
health-gate line). The MCP server holds **no secrets** (the only credential is the caller's inbound
bearer, forwarded per-request), so the wiring is simpler than the web/api services.

**S3 authors + locally-validates the deploy config only — it does NOT deploy to the box.** The actual
edge cutover is the operator's manual `workflow_dispatch` Production Deploy, run later. That keeps the
edge blast radius (a bad directive breaks *every* site on the shared `conf.d/` tree) off this slice.

## What to build (5 deliverables)

**1. `mcp-server/Dockerfile`** — a reproducible Python image, mirroring the api `Dockerfile`'s uv
discipline but for a **self-contained installable package** (not bind-mounted like the api):
- `FROM python:3.12-slim`; copy the pinned uv (`COPY --from=ghcr.io/astral-sh/uv:0.8.14 /uv /usr/local/bin/uv`).
- Copy `pyproject.toml uv.lock` + `src/`, then install **from the frozen lock** and the package itself:
  `uv export --frozen --no-dev --no-emit-project -o /tmp/req.txt && uv pip install --system -r /tmp/req.txt
  && uv pip install --system --no-deps .` (reproducible; the api image's exact pattern, extended to
  install `knowledge_mcp`). No git/ssh/tzdata needed (pure HTTP proxy, no commits, no date math).
- `EXPOSE 9000`; run unprivileged if easy; `CMD ["knowledge-mcp"]` (the console script → `main.py` →
  `uvicorn.run(app, host=0.0.0.0, port=9000)`, lifespan/session-manager enabled).
- `HEALTHCHECK` via python `urllib` GET `http://127.0.0.1:9000/healthz` → 200 (curl absent in slim —
  mirror the api image's probe exactly), short `start-period` (no startup reindex).

**2. `compose.prod.yml` — add a `knowledge-mcp` service** (service key `mcp`), following the `web` service:
- `build: { context: ./mcp-server }`; `container_name: knowledge-mcp` (fixed — edge proxies by name).
- `environment:` `KB_API_BASE_URL: http://knowledge-api:8000` (the internal service-name URL — the web
  BFF's exact pattern) **and `MCP_STATELESS_HTTP: "1"`** (see the stateless decision below).
- `expose: ["9000"]` (NO host `ports`); `networks: [changple_shared_network]` (external, satisfies
  reachability (a)); `depends_on: { api: { condition: service_healthy } }` (it proxies to the api);
  image-native `healthcheck` on `/healthz`; `restart: unless-stopped`. No secrets, no `env_file`.

**3. `deploy/knowledge.conf` — add an SSE-safe `location /mcp`** to the `:443` server (satisfies (b)):
- Add `set $knowledge_mcp_upstream knowledge-mcp;` beside the existing `set $..._upstream` vars.
- `location /mcp { proxy_pass http://$knowledge_mcp_upstream:9000; proxy_connect_timeout 5s;
  proxy_buffering off; proxy_read_timeout 3600s; proxy_send_timeout 3600s; }`.
- **HOUSE RULES — honor every one (a bad directive breaks the whole edge):**
  - **NO per-location `proxy_set_header`** — the server-level hoisted set (`Host`, `X-Real-IP`,
    `X-Forwarded-*`, **`proxy_http_version 1.1` + `Connection ""`**) is inherited ONLY if the location
    sets none. The MCP location sets none → inherits the full set + HTTP/1.1 keep-alive (**required for
    SSE streaming**). This is the documented footgun.
  - **Variable `proxy_pass`** (`http://$knowledge_mcp_upstream:9000`) for request-time DNS re-resolution
    (the `resolver 127.0.0.11` note) — so an mcp-container restart self-heals.
  - **`proxy_buffering off`** — the SSE-safe requirement: Streamable-HTTP streams responses; buffering
    would delay/break them.
  - **NO `limit_req_zone`, NO `default_server`, NO IPv6 `listen`** — all forbidden in this tree.
  - `/mcp` is more specific than `/` and doesn't collide with `/api/`, so longest-prefix routes it to mcp.

**4. `deploy/deploy.sh` — add the MCP service to the on-box health-gate** (the load-bearing deploy gate):
- After `wait_healthy web knowledge-web`, add `wait_healthy mcp knowledge-mcp || gate_ok=0` (`dc up -d
  --build` already builds the new compose service). Update the "both services"/"knowledge-api +
  knowledge-web" log+summary wording → three services (deploy.sh ~285/289/292 and
  `deploy/oracle-production-deploy-remote.sh` ~133/146).

**5. `.github/workflows/deploy-production.yml` — extend the external smoke** for the new public surface.
The MCP server's `/healthz` is **internal only** (not edge-routed; the api owns public `= /healthz`), so
the public liveness check is on `/mcp` itself. Add a step that proves the edge **routes to a live MCP
server** without a full protocol handshake — e.g. a minimal JSON-RPC `initialize` POST to
`https://knowledge.hi2vi.com/mcp` (headers `Content-Type: application/json`,
`Accept: application/json, text/event-stream`) asserting a 200/valid response (initialize needs **no**
bearer — auth is per-tool-call upstream), **or** a bare `GET /mcp` asserting a routed MCP-server status
(e.g. 400/406, **not** a 502/504 gateway error). The executor picks the most robust minimal check by
observing what the local container returns. Keep the existing `/healthz` + `/` checks intact. The
**authenticated tool-call E2E over both paths is S4's job** — do not duplicate it here.

## Stateless deploy decision (record it)
Set **`MCP_STATELESS_HTTP=1`** on the deployed service. Rationale: the public path traverses Cloudflare,
which caps an origin response at **~100s** (the api `location` already notes this), so a long-lived
stateful SSE session stream is fragile across the edge. Both tools are **pure per-call proxies**, so
stateless is fully correct, needs no session affinity, and is trivially scalable. The edge `location`
stays SSE-safe regardless (`proxy_buffering off` + long timeouts) so a single tool call's streamed
response is never buffered/cut, and a future stateful internal use still works. (S1 built the
`MCP_STATELESS_HTTP` flag for exactly this.)

## Reuse (don't reinvent)
- `Dockerfile` (api) — the `COPY --from=ghcr.io/astral-sh/uv:0.8.14`, `uv export --frozen --no-dev`,
  system-install, and python-`urllib` healthcheck patterns to mirror.
- `compose.prod.yml` `web` service — the exact fixed-`container_name` + `expose` + external-network +
  `depends_on: api healthy` + healthcheck + `KB_API_BASE_URL` shape to copy for `knowledge-mcp`.
- `deploy/knowledge.conf` `location /api/auth/` — a location that correctly sets **no** per-location
  `proxy_set_header` and uses variable `proxy_pass`: the template for the `/mcp` location.
- `deploy/deploy.sh:281-282` `wait_healthy api|web` — the health-gate line to extend.
- `.github/workflows/deploy-production.yml:75-87` `smoke_one` — the smoke helper to extend.

## Decisions to record (append one-line "Doc impact" notes to `phase.md`; REVIEW consolidates → operations doc)
- New `knowledge-mcp` compose service (own Dockerfile, `expose 9000`, `changple_shared_network`,
  `KB_API_BASE_URL=http://knowledge-api:8000`, `MCP_STATELESS_HTTP=1`, `/healthz` healthcheck) — dual-reachable:
  internal `knowledge-mcp:9000` + public `https://knowledge.hi2vi.com/mcp`.
- Edge `location /mcp` → `knowledge-mcp:9000`, SSE-safe (`proxy_buffering off`, long read/send timeouts,
  inherited HTTP/1.1 keep-alive, variable `proxy_pass`); Cloudflare ~100s cap → deployed server runs stateless.
- `deploy.sh` health-gate + `deploy-production.yml` external smoke extended to the MCP surface (public
  liveness via `/mcp`, since the MCP `/healthz` is internal-only).

## Verification (lean — house rule)
- **Compose parses:** `COMPOSE_BAKE=false docker compose -f compose.prod.yml config` succeeds with the new
  service (a dummy `.env` suffices, as the header notes).
- **Image builds + serves (if Docker is available locally):** `docker build -t knowledge-mcp:test ./mcp-server`,
  run it (`-e KB_API_BASE_URL=http://host.docker.internal:8000 -e MCP_STATELESS_HTTP=1 -p 9000:9000`), and
  confirm `GET /healthz` → 200 and `/mcp` answers a handshake (the smoke's chosen check). If Docker is
  unavailable, say so, validate the Dockerfile inputs against the package layout, and rely on the on-box build.
- **Edge config:** run `nginx -t` on the file if nginx is available; otherwise verify the `/mcp` location
  against each house rule above line-by-line (the authoritative `nginx -t` gate runs on-box at deploy).
- **Deploy scripts still parse:** `bash -n deploy/deploy.sh deploy/oracle-production-deploy-remote.sh`.
- Then the orchestrator runs `python3 scripts/workflow.py validate` (state integrity only).

## Out of scope (later)
- Authenticated `vk_` MCP-client first-consumer E2E over BOTH reachability paths + the versioned contract
  artifact → **S4**.
- `source_url` that lights up `url` → **deferred D13**.
- Actually deploying to the box (operator's manual Production Deploy) — S3 writes + validates config only.

## Executor
Risk `high` → **`slice-executor-high`**. Real hazards: SSE-through-nginx, edge blast radius (shared
`conf.d/` tree), Docker packaging of a real installable package, the stateless-deploy call, and touching
the shared deploy machinery. Follow the house rules exactly; escalate only if a hazard proves deeper than
described. **Do not deploy** — author + locally validate.
