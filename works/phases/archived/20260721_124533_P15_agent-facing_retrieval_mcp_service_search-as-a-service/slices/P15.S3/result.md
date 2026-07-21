# P15.S3 result — Containerize + SSE-safe edge routing + dual reachability

**Status: done.** Authored + locally validated the deploy config to make the `mcp-server/`
package (S1+S2) dual-reachable — internally at `knowledge-mcp:9000` (no edge hop) and publicly
at `https://knowledge.hi2vi.com/mcp`. Did **not** deploy to the box (the edge cutover is the
operator's manual Production Deploy).

## The five artifacts

1. **`mcp-server/Dockerfile`** (new) — self-contained installable image mirroring the api image's
   uv discipline, extended to install the package itself:
   - `FROM python:3.12-slim`; pinned `COPY --from=ghcr.io/astral-sh/uv:0.8.14 /uv /usr/local/bin/uv`.
   - Two install layers for caching: (a) `uv export --frozen --no-dev --no-emit-project -o /tmp/req.txt
     && uv pip install --system -r /tmp/req.txt` (deps only — `--no-emit-project` omits `knowledge-mcp`
     itself, so a code change never busts the dep layer); (b) `COPY src/` then
     `uv pip install --system --no-deps .` (builds+installs the `knowledge_mcp` wheel + its
     `knowledge-mcp` console script from `[project.scripts]`).
   - **No apt packages** (no git/ssh/tzdata — pure HTTP proxy, no commits, no date math), unlike the
     api image which needs all three.
   - Runs **unprivileged** (`useradd --uid 10001 appuser` + `USER appuser`) — no bind mount / git means
     no root need; `/usr/local` is world-executable.
   - `EXPOSE 9000`; image-native `HEALTHCHECK` = python `urllib` GET `http://127.0.0.1:9000/healthz` → 200
     (curl absent in slim — the api image's exact probe pattern), `start-period=10s` (no startup reindex).
   - `CMD ["knowledge-mcp"]` (console script → `main:main` → `uvicorn.run(app, 0.0.0.0:9000)`; the
     Streamable-HTTP session-manager lifespan starts, `/mcp` + `/healthz` go live).
   - Plus **`mcp-server/.dockerignore`** (new, supporting) to lean the build context (excludes
     `.venv`/`.pytest_cache`/`tests`/`README.md`/etc.).

2. **`compose.prod.yml` — `mcp` service (`container_name: knowledge-mcp`)** — modeled on `web`:
   `build: {context: ./mcp-server}`; `KB_API_BASE_URL: http://knowledge-api:8000` (the internal
   service-name URL the web BFF uses) + **`MCP_STATELESS_HTTP: "1"`**; `expose: ["9000"]` (no host
   `ports`); `depends_on: {api: service_healthy}`; `networks: [changple_shared_network]` (external);
   `restart: unless-stopped`. **No `env_file`, no secrets.** Health is **image-native** (from the
   Dockerfile HEALTHCHECK) — no compose `healthcheck:` block; `deploy.sh wait_healthy` reads
   `.State.Health.Status` via `docker inspect`, which an image HEALTHCHECK populates.

3. **`deploy/knowledge.conf` — SSE-safe `location /mcp`** on the `:443` server:
   - New `set $knowledge_mcp_upstream knowledge-mcp;` beside the existing `set $..._upstream` vars.
   - `location /mcp { proxy_pass http://$knowledge_mcp_upstream:9000; proxy_connect_timeout 5s;
     proxy_buffering off; proxy_read_timeout 3600s; proxy_send_timeout 3600s; }` — modeled on
     `location /api/auth/`.
   - **Every house rule honored** (see the audit under Verification): NO per-location `proxy_set_header`
     (inherits the full server-level `Host`/`X-Real-IP`/`X-Forwarded-*` + `proxy_http_version 1.1` +
     `Connection ""` set — the HTTP/1.1 keep-alive is required for SSE); variable `proxy_pass`
     (request-time DNS re-resolution → an mcp-container restart self-heals); `proxy_buffering off` +
     long timeouts (SSE-safe); NO `limit_req_zone`/`default_server`/IPv6 `listen`. Updated the header
     "Two upstreams" → "Three upstreams" and the ROUTING map comment to include `/mcp`.

4. **`deploy/deploy.sh` — MCP added to the on-box health-gate** — `wait_healthy mcp knowledge-mcp ||
   gate_ok=0` after the `web` gate; "both services" → "all three services" in the success log, the
   die message, and the DONE line; `capture_artifacts` now also dumps `deploy-mcp-logs.txt`; header +
   lifecycle/step comments updated to name three services. **`deploy/oracle-production-deploy-remote.sh`**
   — the two summary lines + the two "both-service"/log mentions updated to "all three / three-service
   (api + web + mcp)".

5. **`.github/workflows/deploy-production.yml` — extended external smoke.** Added a `smoke_mcp` helper
   (parallel to `smoke_one`) that does a **bare `GET https://knowledge.hi2vi.com/mcp`** and asserts a
   **406 (or 400) with a `jsonrpc` body** = a routed MCP-server response, retrying 5×/6s like the
   existing checks. Kept the `/healthz` + `/` checks intact; step renamed "…all surfaces…".

## Decisions realized

- **Stateless deploy (`MCP_STATELESS_HTTP=1`).** Both tools are pure per-call proxies (no session
  state), and the public path crosses Cloudflare's ~100s origin cap where a long-lived stateful SSE
  session is fragile — so stateless is correct, affinity-free, and scalable. Verified the container
  boots and serves under `MCP_STATELESS_HTTP=1` (a stateless `initialize` POST completes and closes
  the stream — no hang).
- **SSE-safe edge anyway.** `proxy_buffering off` + `proxy_read_timeout/proxy_send_timeout 3600s` +
  inherited HTTP/1.1 keep-alive, so a single tool call's streamed response is never buffered/cut. The
  MCP server itself sends `X-Accel-Buffering: no` on its stream (observed) — our `proxy_buffering off`
  makes that intent explicit at the edge and is belt-and-suspenders.
- **Public liveness on `/mcp`, not `/healthz`.** The MCP `/healthz` is internal-only (the api owns the
  public `= /healthz`; the edge does not route MCP's healthz). A bare `GET /mcp` is the cleanest routed
  liveness signal — see below.

## Exactly how I verified (Docker available; nginx NOT)

- **Docker: available** (28.2.2, daemon up). **nginx: NOT installed** locally.
- **Image builds + serves.** `docker build -t knowledge-mcp:test ./mcp-server` succeeded. Ran it
  (`-e MCP_STATELESS_HTTP=1 -p 9099:9000`) and observed the live endpoints:
  - `GET /healthz` → **200** `{"status":"ok","service":"knowledge"}`.
  - Bare `GET /mcp` (no Accept) → **406 Not Acceptable**, body
    `{"jsonrpc":"2.0","id":"server-error","error":{"code":-32600,"message":"Not Acceptable: Client must accept text/event-stream"}}` — a routed MCP-server response, definitively **not** a 502/504.
  - JSON-RPC `initialize` POST (no bearer, `Accept: application/json, text/event-stream`) → **200**
    `text/event-stream` with the initialize result (`serverInfo {name: knowledge, version: 1.28.1}`);
    the response carries `x-accel-buffering: no`. Confirms `initialize` needs **no** bearer (auth is
    per-tool-call) and the transport streams SSE.
  - Image-native HEALTHCHECK reached `healthy` on the first poll (exit=0) → confirms
    `wait_healthy mcp knowledge-mcp` will gate correctly via `docker inspect`.
  - **Chose the bare-GET-406 smoke** as the most robust minimal check: single request, no body/stream
    draining, no protocol-version coupling; deterministic + fast; and it survives a minor SDK status
    change (400↔406) while still failing loudly on a gateway 5xx. Verified the exact `smoke_mcp`
    assertion logic (`code∈{406,400}` && body has `jsonrpc`) returns OK against the local container.
    **Deliberately no `curl -f`** in `smoke_mcp` — 406 is the success signal, and `-f` would discard it.
- **Compose parses.** `COMPOSE_BAKE=false docker compose -f compose.prod.yml config` → exit 0 with the
  new `mcp` service well-formed (dummy `.env` used, then removed).
- **Edge config (no nginx locally).** Line-by-line house-rule audit passed: braces balanced (9 open / 9
  close); no `default_server`/IPv6 `listen`/`limit_req_zone` directives (only the pre-existing +
  new comment references); variable `proxy_pass`; `proxy_buffering off`; long timeouts; and **no**
  `proxy_set_header` inside `/mcp`. The authoritative `nginx -t` gate runs on-box at deploy (the edge's
  own `deploy.sh` gates the whole `conf.d/` tree before reload).
- **Deploy scripts parse.** `bash -n deploy/deploy.sh deploy/oracle-production-deploy-remote.sh` → OK.
- **Workflow.** YAML parses (steps intact); the extracted `External smoke` step passes `bash -n`.

## What S4 must know (dual-path E2E)

- **Two reachability paths, one endpoint `/mcp`, both tools (`search` + `fetch_document`):**
  - **Internal (no edge hop):** `http://knowledge-mcp:9000/mcp` over `changple_shared_network` by
    container name — a co-tenant agent (OpenClaw in prod) uses this. Test container-to-container.
  - **Public:** `https://knowledge.hi2vi.com/mcp` (edge `location /mcp` → `knowledge-mcp:9000`),
    SSE-safe, behind Cloudflare (~100s cap).
- **Deployed server is STATELESS** (`MCP_STATELESS_HTTP=1`). No session affinity; each tool call is an
  independent per-call proxy. An `initialize` POST completes + closes the stream (no long-lived session
  to keep) — an E2E client can connect, call a tool, and disconnect per call.
- **Auth:** `initialize` needs **no** bearer; the **tool call** forwards `Authorization: Bearer vk_…`
  upstream to `/api/*` for corpus scoping (S1/S2). E2E asserts grounded, citable hits.
- **`url` is empty** for the whole corpus today (the `_citation_url`/`source_url` seam, deferred D13) —
  S4's contract should document `url` as "empty until `source_url` lands" so a consumer treats empty as
  "no citation link," not an error. `fetch_document` also returns `{truncated, total_chars}` (S2).
- **Public liveness is proven on `/mcp` itself** (bare GET → 406), NOT `/healthz` (internal-only). S4's
  authenticated E2E is separate from this liveness gate — build it as its own check, don't fold it into
  the deploy workflow's smoke.
- **Do NOT deploy from S3** — the box cutover is the operator's manual `workflow_dispatch` Production
  Deploy. S4's dual-path E2E runs against the **already-deployed** service.

## Deviations from plan.md

- **Split the single chained install into two RUN layers** (deps, then `--no-deps .` after `COPY src/`)
  for Docker layer caching — same reproducible `uv export --frozen`/`--no-deps .` commands the plan
  specifies, just ordered so a code change doesn't rebuild the dep layer. Faithful to the plan's intent.
- **Added `mcp-server/.dockerignore`** (a small supporting artifact for the containerize deliverable, not
  one of the five) to lean the build context.
- **Health is image-native** (Dockerfile HEALTHCHECK, no compose `healthcheck:` block) — matches the
  plan's "image-native healthcheck" wording; the compose service documents this in a comment.
- Chose the **bare-GET-406** public smoke (the plan offered this or an `initialize` POST) as the most
  robust minimal check, per the plan's instruction to pick by observing the real container.
- Otherwise none.
