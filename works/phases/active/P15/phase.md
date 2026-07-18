# Phase P15: Agent-facing retrieval MCP service (search-as-a-service)

_Intent: see [intent.md](intent.md)._

## Objective

Expose knowledge retrieval as an MCP server over HTTP so external AI agents consume search-as-a-service: a search tool (query -> ranked title/snippet/url hits, corpus-scoped) plus optional fetch_document, authed by project (vk_) keys over Streamable-HTTP/SSE, backed by the existing frozen /api/search + embeddings. Realizes deferred D6; first consumer is the hi2vi customer-service chatbot (OpenClaw).

## Context

New agent-facing product surface. It sits **alongside** the frozen `/api/*` REST contract — a thin MCP
server that wraps the existing hosted API, not a reimplementation of retrieval. The first consumer is
hi2vi's OpenClaw CS bot (its `mcp.servers.knowledge` config, hi2vi P18.S5, is being written in parallel
against whatever contract this phase ships). Divergence from the sketched shape is fine **as long as the
final contract is explicit in this phase's docs** so the hi2vi install step can point at it.

## Decomposition

Four implementation slices, sequenced S1 -> S2 -> S3 -> S4. No `low`-risk slice exists: nothing here is
fully mechanical (new package + MCP protocol + credential pass-through + edge/SSE + a stable external
contract). Risk is the tier lever — set deliberately below.

- **P15.S1 — MCP service scaffold + Streamable-HTTP transport + `search` tool** · `risk: high` · order 1 · depends_on: —
  - The load-bearing slice. Stand up a new MCP service package (own pyproject/src-layout, mirroring the
    `cli/` precedent), choose the Python MCP SDK, wire the **Streamable-HTTP** transport, and ship the
    primary `search` tool: `{query, project?, limit?}` -> size-capped ranked hits, each `{title, snippet,
    url}`, by **proxying** the internal `GET /api/search` and **forwarding the caller's `Authorization:
    Bearer vk_...`** (corpus scoping comes for free from the existing tenant resolver).
  - Also resolves the **hit-`url` shape** decision (an Open Question below) because each search hit must
    carry a `url`, and the **MCP SDK choice**. These two decisions are entangled with the search tool, so
    they live here, not in a later slice.
  - **Why high:** greenfield MCP server, SDK/transport selection, streaming protocol wiring, credential
    pass-through semantics, and a durable architectural decision (url shape) all converge here. Not
    mechanical, and everything downstream builds on the choices made in this slice. -> `slice-executor-high`.

- **P15.S2 — `fetch_document` tool + response size caps** · `risk: medium` · order 2 · depends_on: P15.S1
  - The optional deeper-grounding tool: by `rel_path`/`id` -> full markdown, **size-capped**. Thin proxy
    of the existing single-document reads (`GET /api/documents/{id}` and `GET /api/documents/by-path/
    {rel_path}`), same bearer pass-through as S1. Intent says "ship if cheap; a `search`-only v1 is
    acceptable" — so this is a clean, droppable unit if it proves expensive.
  - **Why medium:** additive tool on S1's established scaffold; bounded work (which endpoint(s), caps,
    error mapping to MCP tool errors), but real judgment on the addressing model + truncation policy.
    -> `slice-executor-mid`.

- **P15.S3 — Containerize + SSE-safe edge routing + dual reachability** · `risk: high` · order 3 · depends_on: P15.S1, P15.S2
  - Package the service as a container and make it **dual-reachable**: (a) container-to-container on
    `changple_shared_network` by service name (a co-tenant agent, e.g. OpenClaw in prod, reaches it with
    no edge hop), and (b) via the public `https://knowledge.hi2vi.com/...` edge (off-box / local-dev
    agents). Add a `knowledge-mcp` service to `compose.prod.yml` (fixed `container_name`, `expose` not
    `ports`, healthcheck, on the shared network) following the proven P14 `knowledge-web` precedent; add
    the edge `location` in `deploy/knowledge.conf`; and update the `deploy-production.yml` health-gate to
    cover the new surface.
  - **Why high:** two real hazards beyond pattern-copying. (1) **SSE/streaming through nginx** — the
    existing edge locations are all request/response; a Streamable-HTTP MCP endpoint needs
    `proxy_buffering off`, long/idle-tolerant read timeouts, and HTTP/1.1 keep-alive to not break the
    stream — a genuinely new edge concern. (2) **Blast radius** — the edge `conf.d/` tree is tested +
    reloaded as a unit, so one bad directive breaks *every* site on the box; the in-file house rules
    (no `default_server`, no IPv6 `listen`, no `limit_req_zone`, the `proxy_set_header` inheritance
    footgun, the `resolver 127.0.0.11` + variable `proxy_pass` requirement) must all be honored.
    -> `slice-executor-high`.

- **P15.S4 — Stable versioned tool contract + OpenClaw first-consumer E2E** · `risk: medium` · order 4 · depends_on: P15.S3
  - Finalize + pin the **stable, versioned tool contract** (tool names, params, output schema, auth
    header, transport, a version marker consumers pin to) as an explicit in-repo artifact, and run the
    **first-consumer E2E smoke**: a `vk_`-authed MCP client (OpenClaw-style) connects over
    Streamable-HTTP on **both** reachability paths and gets grounded, citable hits (`title` + resolvable
    `url`). This is the handshake surface hi2vi P18.S5 points its `mcp.servers.knowledge` at.
  - **Why medium:** the hard protocol/auth/infra work is done by S1–S3; this slice formalizes the
    contract, validates end-to-end, and records the durable-truth "Doc impact" notes for the review to
    consolidate. Judgment-heavy (external-consumer contract stability, cross-project coordination) but
    not deep new logic — a mid executor with a good plan can finish it and escalate if the contract
    design proves deep. -> `slice-executor-mid`.

**Dependency notes.** `depends_on` is advisory (existence-checked only); `order` sequences execution.
S3 lists S2 as a dep so the container ships the full toolset, but if `fetch_document` (S2) is dropped as
"not cheap," S3 is not truly blocked — it can containerize the `search`-only server. S4 hard-depends on
S3 (needs the deployed + edge-routed service to run the dual-reachability E2E).

## Findings & Notes

Survey verified against the repo at decomposition time (2026-07-18):

- **Greenfield MCP — confirmed.** No MCP / Streamable-HTTP / modelcontextprotocol code anywhere in the
  repo (only `works/` phase metadata references P15). This is a brand-new service.
- **`/api/search` response shape — confirmed, and it has NO `url` field.** `server/search.py:_finalize()`
  projects each hit to `{id, project, slug, date, title, tags, rel_path, source_repo, created_at,
  updated_at, score, snippet, signals}`. `snippet` wraps keyword hits in `<mark>…</mark>` (S1 must decide
  whether to strip these for agent consumption). The endpoint is `GET /api/search` (`server/main.py:301`)
  with params `q` (required), `project`, `tag`, `limit` (1–50, default 10), `offset`, `raw`; it returns
  `{query, mode, total, limit, offset, results:[…]}`. **The MCP `search` tool must derive each hit's
  `url` itself** from `project` + `date` + `slug` (or `rel_path`).
- **hit-`url` caveat — a real decision, not cosmetic-only for agents.** The canonical
  `{KB_PUBLIC_BASE_URL}/{project}/{date}-{slug}/` shape (built at `server/main.py:539` for the 201 `url`)
  **no longer resolves to a rendered page**: the mkdocs site was retired in P14, and the Next web app
  reads docs at `/documents/{db_id}` (see `GET /app/documents/{id}` and the P12 web-app read API). The
  `compose.prod.yml` comment (lines 56–63) explicitly flags this `url` as "COSMETIC ONLY … no longer
  resolves." For a CS bot that surfaces the `url` as a **clickable citation chip**, a dead link is a real
  UX defect — so S1's url decision matters. Options in Open Questions.
- **Auth reuse — proxy + bearer pass-through gets corpus scoping for free.** `server/api_auth.py` resolves
  a `/api/*` bearer to an `ApiAuthContext(tenant_id, project_id, credential_id, is_public)`: exact
  `KB_API_TOKEN` -> tenant #1; a `vk_` key -> its project's tenant (+ project id) via
  `get_active_credential_by_token_hash`; a session token -> the user's `tenants[0]`. So a thin MCP
  service that forwards the caller's `Authorization: Bearer vk_...` to `http://knowledge-api:8000` inherits
  tenant/project corpus scoping with **no new auth code** — exactly the web BFF's `KB_API_BASE_URL`
  pattern (`compose.prod.yml:145`). The in-process alternative (importing `server/` modules) couples the
  new service to backend internals and duplicates the tenant plumbing — **prefer the proxy** (record the
  rationale in S1's result).
- **Ready-made HTTP client precedent.** `cli/src/knowledge_cli/client.py` (`KnowledgeClient`) is a thin
  typed httpx client over `/api` (incl. `search()`), with per-call bearer override (`_request(token=…)`).
  S1 may reuse the pattern (or the client) for the upstream calls — httpx + a forwarded bearer.
- **Packaging precedent.** Python 3.12 + uv. `cli/` = own-pyproject src-layout hatchling package
  (`knowledge-cli`, `packages=["src/knowledge_cli"]`, `[project.scripts]`), root stays a virtual project
  (`package=false`, no `[build-system]` — load-bearing for the server's Docker `uv export
  --no-emit-project`). `web/` = own multi-stage Dockerfile + `compose.prod.yml` service + edge `location`.
  The MCP service should follow the `cli/`-style package boundary and the `web/`-style deploy pattern.
- **Deploy / edge pattern — proven at P14 (`knowledge-web`).** `compose.prod.yml`: fixed
  `container_name`, `expose` (no host `ports`), `networks: [changple_shared_network]` (external),
  `depends_on: api healthy`, an image-native healthcheck, secrets from the box `.env` only. Edge
  (`deploy/knowledge.conf`): `resolver 127.0.0.11 valid=30s ipv6=off` + a `set $var` + variable
  `proxy_pass` (request-time DNS re-resolution — load-bearing), most-specific-prefix routing, and
  **shared `proxy_set_header` hoisted to server level** (the footgun: the first per-location
  `proxy_set_header` drops the entire inherited set). Deploy automation: `deploy-production.yml`
  external-smoke gate (`/healthz` + `/`) — extend it for the new surface. Host rebuild quirk:
  `COMPOSE_BAKE=false docker compose up -d --build`.
- **Frozen contract.** `/api/*` (+ `/auth/*` + `/app/*` + `/healthz`) is frozen, additive-only, consumed
  by the live hi2vi content agent. The MCP server sits **alongside** it and **never modifies** it.
- **Metering substrate already exists.** P11 usage events (`GET /api/search` stamps
  `request.state.usage`) are the billing substrate the P12 doc calls "the paid retriever is P15." P15
  builds the retriever *surface* (free/internal dogfooding first); it does **not** build billing/plan
  gating — relevant to the D6 reconciliation (result.md).

### S1 built the scaffold — what S2–S4 must know (2026-07-18)

- **SDK pinned: `mcp==1.28.1`** (latest release; hard `==` pin in `mcp-server/pyproject.toml`, captured
  in `mcp-server/uv.lock`). The inbound-header accessor and `streamable_http_app()` were verified against
  exactly this release. A bump is a deliberate, re-verified change.
- **Inbound-bearer accessor — CONFIRMED, no workaround needed.** Inside a FastMCP tool, add a
  `ctx: Context` param; under Streamable-HTTP, `ctx.request_context.request` is the Starlette `Request`
  for the POST that carried the tool call (the transport builds it at `mcp/server/streamable_http.py` and
  threads it via `RequestContext.request` → low-level server → `Context.request_context.request`). So
  `ctx.request_context.request.headers.get("authorization")` is the caller's inbound header. See
  `server.py:_inbound_authorization`. **S2's `fetch_document` reuses this same accessor + forward pattern.**
- **MCP endpoint path is `/mcp`** (FastMCP default `streamable_http_path`); unauthenticated liveness at
  **`GET /healthz`** (registered via `@mcp.custom_route`, which is auth-exempt by design). **S3's container
  healthcheck + edge gate point at `/healthz`; the edge `location` for MCP proxies `/mcp`.**
- **Transport/statefulness.** Default **stateful** Streamable-HTTP with SSE streaming (`stateless_http`
  default False) — matches the phase's "Streamable-HTTP/SSE" framing and S3's SSE-safe edge work; a
  single-container deploy gives automatic session affinity. A `MCP_STATELESS_HTTP=1` env flag
  (`config.stateless_http()`) flips to stateless if S3/S4 find edge session-stickiness painful — the
  `search` tool is a pure per-call proxy, correct either way. **Multi-replica scaling under stateful mode
  would need sticky sessions or an event store — a note for S3/S4, not built here.**
- **Run commands (dev):** from `mcp-server/`, `uv run knowledge-mcp` (serves on `MCP_HOST:MCP_PORT`,
  default `0.0.0.0:9000`, MCP at `/mcp`) and `uv run pytest`. Config seam (`config.py`): `KB_API_BASE_URL`
  (dev `http://localhost:8000`; **S3 sets prod `http://knowledge-api:8000`**), `KB_PUBLIC_BASE_URL`
  (reserved, unused), `MCP_HOST`, `MCP_PORT`, `MCP_STATELESS_HTTP`.
- **`url` seam for S4/`source_url` job.** `server.py:_citation_url(result)` is the single place citation
  URLs are derived; it reads a reserved `source_url` field that today's `/api/search` response does not
  carry, so it returns `""` for the whole corpus now. The future `source_url` data-model + ingester job
  (deferred) only needs to populate that field upstream and (if the origin isn't literally in the search
  result) extend this one helper. **S4's contract artifact should document `url` as "empty until
  `source_url` lands" so OpenClaw treats an empty `url` as "no citation link," not an error.**
- **Upstream error mapping (reuse in S2).** `upstream.UpstreamError(status, detail)` (FastAPI-`detail`
  extraction, never a raw body) → `server._tool_error`: 401 → "unauthorized: missing/invalid bearer",
  400 → "bad search query: {detail}", other non-2xx → generic. FastMCP re-wraps any raised exception as a
  `ToolError` with an "Error executing tool …" prefix, so the message text is preserved to the client.
- **Test isolation.** `mcp-server/` has its own `pyproject.toml` pytest config (`testpaths=["tests"]`),
  like `cli/`; the **root** pytest (`pyproject.toml`: `testpaths=["tests"]`, `pythonpath=["."]`) does NOT
  collect `mcp-server/tests`, and the `mcp-server/` folder name (not `mcp/`) keeps `import mcp` on the
  root path resolving to the SDK. Run S1's tests from `mcp-server/` with `uv run pytest`.

### S2 added `fetch_document` — what S3–S4 must know (2026-07-18)

- **Two tools now on the one ASGI app.** `search` **and** `fetch_document` both register (`@mcp.tool`)
  before `server.app = mcp.streamable_http_app()` is built, so both are served on the single `/mcp`
  endpoint. **S3 containerizes + edge-routes the whole two-tool surface behind `/mcp`** — no per-tool
  routing, no new endpoint. `mcp.list_tools()` → `['fetch_document', 'search']` (verified).
- **Fetch endpoint mapping (for S4's contract artifact).** `fetch_document(id)` → `GET /api/documents/{id}`;
  `fetch_document(rel_path)` → `GET /api/documents/by-path/{rel_path}` (the by-path URL is built by direct
  concatenation, so httpx preserves the `project/YYYY-MM-DD-slug.md` slashes). Both **404 for a missing
  OR cross-tenant** id/path (existence never leaks) and **401 for a bad bearer** — same forward-the-inbound-
  bearer corpus scoping as `search`; `/api/*` untouched.
- **Truncation knob.** `config.FETCH_MAX_CHARS` (module constant, read once at import from
  `MCP_FETCH_MAX_CHARS`, default **20000 chars**; new `_env_int` helper). Body is capped by **characters**
  (predictable token budgeting); over-cap → first N chars + marker `\n\n…[truncated: showing N of TOTAL
  characters]`, `{truncated: true, total_chars: <original length>}`. S3 can keep the default; **S4's contract
  should document `truncated`/`total_chars`** so consumers know a `markdown` body may be partial and can
  narrow via `search`.
- **Shared error mapper.** `server._tool_error(exc, *, kind="search"|"fetch")` — one function keyed by tool.
  `401` maps identically for both; `fetch` adds `404 → "not found"`. `search`'s mapping is unchanged (its
  call site still uses the default kind). S4/S3 reuse this if they add tools.
- **`url` still empty for fetch too** — same `_citation_url` seam as search (returns `""` for the whole
  corpus). S4's contract should state `url` is "empty until `source_url` lands" for **both** tools; deferred
  D13 populates it.
- **Tests.** 6 terse `fetch_document` cases added to the single `mcp-server/tests/test_search_tool.py`
  (id/rel_path addressing, slash preservation, char-cap truncation, XOR-before-upstream, 404, 401), all via
  `httpx.MockTransport`. Full suite: **10 passed** from `mcp-server/` (`uv run pytest -q`).

### S3 containerized + edge-routed — what S4 must know (2026-07-18)

- **Container/edge topology is live in config (not yet deployed).** The `knowledge-mcp` service
  (`mcp-server/Dockerfile` → `compose.prod.yml`) serves the whole two-tool surface on ONE endpoint
  `/mcp` + internal `GET /healthz` on port 9000. **Dual-reachable:** (a) internal
  `http://knowledge-mcp:9000/mcp` over `changple_shared_network` by container name (no edge hop — the
  OpenClaw prod path), and (b) public `https://knowledge.hi2vi.com/mcp` via the edge `location /mcp`
  (`deploy/knowledge.conf`, SSE-safe). **S4's dual-path E2E runs against the DEPLOYED service** — S3
  only authored + locally validated; the box cutover is the operator's manual Production Deploy.
- **Deployed server is STATELESS** (`MCP_STATELESS_HTTP=1` on the compose service — decision realized
  here). Both tools are pure per-call proxies; no session affinity. An `initialize` POST completes and
  **closes** the stream (verified against the built container — no long-lived session, no hang), so an
  E2E client connects, calls a tool, and disconnects per call. The edge stays SSE-safe regardless
  (`proxy_buffering off` + 3600s timeouts) so a single streamed call is never buffered/cut — but note
  **Cloudflare still caps the public path at ~100s**, which is why stateless was chosen.
- **Auth on the wire, confirmed empirically.** `initialize` needs **NO** bearer (the MCP handshake is
  unauthenticated — verified: a no-bearer `initialize` POST returns 200 with the server capabilities).
  The **tool call** carries `Authorization: Bearer vk_…`, forwarded upstream to `/api/*` for corpus
  scoping (S1/S2). S4's E2E asserts grounded, citable hits on both paths with a `vk_` key.
- **Public liveness signal = bare `GET /mcp` → 406** (JSON-RPC body `"Client must accept
  text/event-stream"`). This is what the deploy-workflow smoke asserts — a routed MCP-server response,
  NOT a gateway 502/504. The MCP `/healthz` is **internal-only** (the api owns the public `= /healthz`;
  the edge does NOT route MCP's healthz). S4's authenticated E2E is a SEPARATE check from this liveness
  gate — don't fold the E2E into the deploy workflow.
- **`X-Accel-Buffering: no`** is set by the MCP server itself on its SSE responses (observed) — the
  edge's `proxy_buffering off` is the explicit, belt-and-suspenders complement. Not something S4 needs
  to do, just context for why streaming works across the edge.
- **`url` still empty corpus-wide** (the `_citation_url`/`source_url` seam, deferred D13) for BOTH
  tools. S4's contract artifact should document `url` as "empty until `source_url` lands" so a consumer
  treats empty as "no citation link," not an error; `fetch_document` also signals `{truncated,
  total_chars}` (S2's char-cap).
- **Image facts** (for S4 sanity / any local repro): `python:3.12-slim`, unprivileged (`uid 10001`),
  `CMD ["knowledge-mcp"]`, image-native HEALTHCHECK (python `urllib` GET `/healthz` — reaches `healthy`
  immediately, no startup reindex). Build: `docker build -t knowledge-mcp:test ./mcp-server`; run:
  `docker run -e MCP_STATELESS_HTTP=1 -p 9000:9000 knowledge-mcp:test`. `serverInfo` advertises
  `{name: knowledge, version: 1.28.1}` (the mcp SDK version).

### S4 pinned the contract + ran the first-consumer E2E — what the REVIEW must know (2026-07-18)

- **Contract v1 is now an explicit in-repo artifact: `mcp-server/CONTRACT.md`.** It pins
  transport (Streamable-HTTP `/mcp`), dual reachability (internal `knowledge-mcp:9000` +
  public `https://knowledge.hi2vi.com/mcp`), auth (`Authorization: Bearer` header,
  forwarded verbatim; `initialize` needs none, tool calls do), the **full input/output
  schema of both tools** (drawn from the S1/S2/S3 notes above, not re-derived), corpus
  scoping, and the versioning rules. It is the handshake surface hi2vi P18.S5 targets.
  Nothing about the tools or `/api/*` changed — S4 only **formalized + validated** the
  finished S1–S3 surface.
- **Versioning decision (v1, additive-only).** `CONTRACT_VERSION = "1"` (in `config.py`),
  surfaced at `GET /healthz` → `{"status":"ok","service":"knowledge","contract_version":"1"}`.
  Additive changes (a new tool, a new optional param, a new output field — e.g. `url`
  becoming populated when D13 lands) stay v1; a breaking change (removed/renamed
  tool/field, changed type, changed auth) bumps it. Explicitly distinct from MCP
  `serverInfo.version` (= the `mcp` SDK release `1.28.1`) — the artifact says so.
- **Corpus-scoping Open Question RESOLVED (no operator input needed).** A `vk_` scopes
  search to the **whole tenant's** corpus (`server/main.py` uses `ctx.tenant_id`, not the
  key's bound project), so **one tenant-scoped hi2vi `vk_` already sees both `hi2vi` and
  `hi2vi_web`**; the `search` `project` param narrows. No two-key scheme. The actual key
  provisioning is hi2vi P18.S5 / the operator's job.
- **The one uncertain client API — RESOLVED and documented.** In `mcp==1.28.1` the
  Streamable-HTTP transport's `headers=`/`auth=` params are **deprecated and ignored**
  (they never reach the wire). The bearer must be set on the underlying
  `httpx.AsyncClient` via `streamablehttp_client(url, httpx_client_factory=…)`.
  **GOTCHA (verified empirically):** the plan's suggested
  `partial(create_mcp_http_client, headers={...})` **silently drops the auth** — the
  transport calls the factory with `headers=None`, and functools.partial's call-time
  keyword *overrides* the bound one. The working path is a **custom factory that MERGES**
  `Authorization` into whatever headers it is handed (`e2e_smoke.py:_bearer_factory`).
  Note also `streamablehttp_client` itself is `@deprecated` (typing-only marker, no
  runtime warning) in favor of `streamable_http_client`; the deprecated wrapper still
  works and is fine for a smoke — a future SDK bump may need the new entry point.
- **E2E run locally — PASSED (direct path).** Stack: legacy-mode api
  (`uvicorn server.main:app`, no `DATABASE_URL`, `KB_API_TOKEN=<t>`, `KB_GIT_COMMIT=false`,
  a scratch `KB_ROOT`) with one POSTed doc → mcp server
  (`KB_API_BASE_URL=http://127.0.0.1:8000 MCP_STATELESS_HTTP=1 uv run knowledge-mcp`,
  binds `0.0.0.0:9000`) → `python mcp-server/scripts/e2e_smoke.py --url
  http://127.0.0.1:9000/mcp --key <t> --query retrieval`. Result: `PASS` — `initialize`
  (serverInfo `knowledge 1.28.1`), `list_tools` → both tools, `search` → 1 grounded hit
  `{title, snippet, url, id, rel_path}`, `fetch_document(id)` → markdown returned.
  Search ran in **bm25 mode** (no Gemini key locally — hybrid vector signal is absent but
  irrelevant to the chain proof). The MCP layer forwards *any* bearer, so legacy+master is
  a faithful proof of the client→mcp→api→hit chain; the true `vk_` tenant scoping is
  already proven by `scripts/onboarding_smoke.py` + S1/S2's forward-bearer design.
- **What remains for the operator (post-deploy).** The public-path + real-hi2vi-`vk_` run
  is operator post-deploy verification: after the manual Production Deploy of the
  `knowledge-mcp` container + edge routing (S3), re-run the SAME `e2e_smoke.py` against
  `https://knowledge.hi2vi.com/mcp` with a real hi2vi `vk_` key. This slice deliberately
  did **not** reach the box. Also outstanding: **D13** (populate `url` via `source_url`;
  empty `url` today is contract-documented as "no citation link, not an error") and the
  final hi2vi `vk_` provisioning (P18.S5).
- **Scope kept tight.** No tool/schema change, no `/api/*` touch (frozen), no deploy. Only
  additions: `mcp-server/CONTRACT.md`, `mcp-server/scripts/e2e_smoke.py`, the `/healthz`
  `contract_version` + `CONTRACT_VERSION` constant, and one terse test assertion. Full
  mcp-server suite: **10 passed** (`cd mcp-server && uv run pytest -q`).

### REVIEW — phase validated + docs consolidated → PASS (2026-07-18)

- **Verdict: `pass`.** All four slices validated **together**: `mcp-server` suite **10 passed**;
  `compose.prod.yml config` parses clean with the `knowledge-mcp` service; `bash -n` clean on both
  deploy scripts; edge `location /mcp` honors every house rule (variable `proxy_pass`, NO per-location
  `proxy_set_header`, `proxy_buffering off`, 3600s timeouts, no zone/default_server/IPv6); the
  **first-consumer E2E was re-run fresh at review and PASSED** (scratch legacy api + 1 doc → local
  stateless mcp → `e2e_smoke.py` → `PASS`, both tools, grounded hit, `fetch` markdown); `workflow.py
  validate` clean.
- **Constraints verified, not assumed.** `git diff be488f7..787498f -- server/` is **empty** — the
  frozen `/api/*` was untouched; all changes confined to `mcp-server/ deploy/ .github/workflows/
  compose.prod.yml` + docs/works metadata. Single-writer untouched (read-only service); lean tests;
  MCP alongside REST; `url` reserved-empty (D13); corpus scoping tenant-wide per `vk_`. D6 dropped at
  DECOMP / D12 / D13 need no review action.
- **Docs consolidated (one version per affected doc, `--source P15.REVIEW`):**
  - **api `v0011`** — new "Agent-facing MCP retrieval service: tool contract v1 (P15)" section + Status.
  - **architecture `v0012`** — "proxy-and-forward-bearer (P15)" section + Status + Roadmap bullet.
  - **operations `v0016`** — "MCP retrieval service deploy (P15)" section + env rows + Status.
  - **product `v0006`** — retriever recast from "deferred (P15)" to a delivered agent-facing
    "search as a service" surface (4th distribution surface); Target-Users + Product-Direction added.
  - (operations/product version summaries were shortened to fit the OS filename-length limit; the
    first `product` attempt was removed + recreated clean.)
- **Outstanding for the operator (not phase gaps):** (1) public-path E2E with a real hi2vi `vk_`
  after the manual Production Deploy; (2) **D13** `url` population via `source_url`; (3) hi2vi `vk_`
  provisioning + OpenClaw `mcp.servers.knowledge` config (hi2vi P18.S5). Nothing is live on the box yet.

### P15.F1 fixed the deployed `421 Invalid Host header` — what the REVIEW / redeploy must know (2026-07-18)

- **Root cause (post-deploy defect, not caught by S4's smoke).** `server.py` built `FastMCP(...)`
  with **no explicit `transport_security`**, so `mcp==1.28.1` auto-enabled DNS-rebinding protection
  with a **localhost-only** allowlist (FastMCP's internal `host` defaults to `127.0.0.1`). That 421'd
  every non-localhost caller — **both** the public `knowledge.hi2vi.com` edge host **and** the internal
  `knowledge-mcp:9000` dual-reachability path — before the MCP handler ran. `MCP_HOST=0.0.0.0` only sets
  uvicorn's *bind* host (a different knob), so it never helped. S4's E2E only hit `localhost:9000` (the
  one allowed host), which is why the defect surfaced only against the deployed box.
- **Fix (protection kept ON, allowlist widened, env-driven).** `config.allowed_hosts()` /
  `allowed_origins()` = built-in localhost defaults **+** `MCP_ALLOWED_HOSTS` / `MCP_ALLOWED_ORIGINS`
  (comma-separated, read at call time). `server.py` now passes an explicit
  `TransportSecuritySettings(enable_dns_rebinding_protection=True, allowed_hosts=…, allowed_origins=…)`,
  which skips FastMCP's localhost-only auto-branch. `compose.prod.yml` sets
  `MCP_ALLOWED_HOSTS="knowledge.hi2vi.com,knowledge-mcp,knowledge-mcp:*"` and
  `MCP_ALLOWED_ORIGINS="https://knowledge.hi2vi.com"` (non-secret literals — no box `.env` change).
- **Matching-rule gotcha (verified against `mcp/server/transport_security.py`).** `_validate_host` =
  **exact** string match OR a `base:*` wildcard via `host.startswith(base + ":")`. So a **port-less**
  host like `knowledge.hi2vi.com` needs an **EXACT** allowlist entry — a `knowledge.hi2vi.com:*` pattern
  would NOT match it — while `knowledge-mcp:9000` (has a port) is covered by `knowledge-mcp:*`. An absent
  Origin passes, so server-side agents (no Origin header) are unaffected regardless.
- **Verification done by the executor.** `cd mcp-server && uv run pytest -q` → **11 passed** (prior 10 +
  1 new terse regression test `tests/test_host_allowlist.py`); `uv run python -c "import
  knowledge_mcp.server as s; ..."` → `import ok` (proves the new `transport_security` construction is
  valid); `workflow.py validate` clean. **Did NOT deploy / ssh / hit any endpoint.**
- **Operator/orchestrator post-redeploy check.** After the `mcp` service is redeployed, `GET
  https://knowledge.hi2vi.com/mcp` should return the routed MCP 406 (`"Client must accept
  text/event-stream"`) instead of `421`, and `e2e_smoke.py` should pass on both the public edge and the
  internal `knowledge-mcp:9000` path with a real hi2vi `vk_`. Files changed: `mcp-server/src/knowledge_mcp/{config,server}.py`,
  `compose.prod.yml`, `mcp-server/tests/test_host_allowlist.py`. `/api/*` untouched (frozen).

## Constraints

- **`/api/*` is frozen** — additive-only, consumed elsewhere. The MCP server wraps it; it never changes
  a field, status, or route on the REST surface.
- **Stable, versioned tool contract** — consumers (OpenClaw today, external agents later) pin to it, so
  the tool names / params / output schema / auth header / transport must be explicit and versioned; a
  change is additive, and the final shape lives in this phase's docs (hi2vi P18.S5 points at it).
- **Dual reachability is mandatory** — internal `changple_shared_network` service name (no edge hop) AND
  public `https://knowledge.hi2vi.com/...` edge. Both paths must be smoke-proven.
- **MCP alongside, not replacing REST** — a new agent-facing surface, not a rewrite of retrieval; retrieval
  stays the frozen `/api/search` + embeddings.
- **Lean tests (house rule)** — terse, high-value cases; prefer running the code / a small E2E smoke over
  a fixture-heavy suite. No sprawl.
- **Edge blast radius** — the `conf.d/` tree tests + reloads as a unit; honor every in-file house rule.
- **Single-writer invariant untouched** — the MCP service only reads (search + fetch); it introduces no
  new writer and never touches the content write lock.

## Open Questions

_For the implementation slices to resolve and record; not blockers to decomposition._

- **Hit-`url` shape (S1).** The canonical `{KB_PUBLIC_BASE_URL}/{project}/{date}-{slug}/` no longer
  resolves (mkdocs retired, P14). Options: (a) point hits at the **web app's live route**
  `https://knowledge.hi2vi.com/documents/{db_id}` (resolves today, but is auth-gated in the app — verify
  an unauthenticated / agent-facing read path); (b) keep the cosmetic canonical path and accept a dead
  link (bad for OpenClaw's citation chip); (c) ship `rel_path` + a `url` derived from a configurable base
  with an explicit "may not render" flag; (d) surface `fetch_document`-addressable ids and let the
  consumer decide. Pick one, make it resolvable, and document it — this is durable truth for the review.
- **MCP SDK / framework choice (S1).** Official Python `mcp` SDK (FastMCP) with the Streamable-HTTP
  transport vs a hand-rolled ASGI app. Pin the SDK + version; confirm Streamable-HTTP (not the deprecated
  HTTP+SSE) transport support and how it maps onto an nginx-frontable ASGI server (uvicorn).
- **`fetch_document` in v1? (S2).** Ship it (thin proxy of the existing single-doc reads) or defer to a
  `search`-only v1. Default: ship if cheap.
- **Response size caps (S1/S2).** Snippet length + result count caps for `search`; full-markdown
  truncation policy for `fetch_document` (byte/char cap, truncation marker). Also: strip `<mark>` from
  snippets for agent consumption?
- **Corpus scoping for the hi2vi CS credential (S4).** hi2vi content spans knowledge projects `hi2vi`
  (content) and `hi2vi_web` (engineering). A `vk_` is bound server-side to **one** project. Decide whether
  the CS bot's key scopes to `hi2vi` only or whether both are needed (and how — two keys? a broader
  scope?). Coordinate the final answer with hi2vi P18.S5.
- **Contract versioning scheme (S4).** How consumers pin (a version in the tool name/description, a
  server version, a documented contract version) and what "additive-only" means for MCP tools.

## Doc impact

_Running list of durable-truth changes for the P15 review to consolidate into doc versions. Slices append
one-line notes here; the review versions the docs (never per slice)._

- (S1) New agent-facing product surface: an **MCP-over-HTTP retrieval service**. SDK = official `mcp` (FastMCP) with the **Streamable-HTTP** transport (MCP endpoint `/mcp`), served by uvicorn — durable architecture doc.
- (S1) **Proxy-and-forward-bearer architecture**: the MCP server reimplements no retrieval — it proxies the frozen `GET /api/search` and forwards the caller's `Authorization: Bearer vk_…` verbatim, so tenant/project corpus scoping is inherited from `server/api_auth.py` with no new auth code. Sits *alongside* `/api/*`, never modifies it.
- (S1) New **package boundary**: `mcp-server/` (own pyproject, hatchling src-layout, package `knowledge_mcp`), mirroring the `cli/` precedent. Folder is `mcp-server/` (NOT `mcp/`) so it never shadows the installed `mcp` SDK when repo root is on `sys.path`.
- (S1) **`search` tool contract** (durable, consumer-pinned): `search(query, project?, limit?)` → `{query, total, results[]}`, each hit `{title, snippet, url, id, rel_path}`; `snippet` has `<mark>`/`</mark>` stripped; `url` = the document's public citation origin, `""` for the whole current corpus until a future `source_url` data-model + ingester job populates it (deliberately NOT the login-gated web app or the retired mkdocs path).
- (S2) **Second MCP tool `fetch_document(id | rel_path)`** (durable, consumer-pinned): given exactly one of `id`/`rel_path` → full markdown, **char-capped** (`MCP_FETCH_MAX_CHARS`, default 20000) with a truncation marker + `{truncated, total_chars}` signal. Response `{id, rel_path, title, project, date, tags, url, markdown, truncated, total_chars}`; `url` via the same `_citation_url` seam as search (empty for the whole corpus today). Proxies the frozen `GET /api/documents/{id}` + `GET /api/documents/by-path/{rel_path}`, forwarding the caller's `Authorization: Bearer vk_…` verbatim — same corpus scoping as search.
- (S2) **`fetch_document` addressing = XOR** of `id`/`rel_path` (both-or-neither → tool error before any upstream call); error mapping `404 → "not found: no document with that id/rel_path"`, `401 → "unauthorized: missing/invalid bearer"` (shared with search; search's `400 → "bad search query"` unchanged).
- (S3) **New `knowledge-mcp` compose service** (own `mcp-server/Dockerfile`, `expose 9000`, `changple_shared_network`, `KB_API_BASE_URL=http://knowledge-api:8000`, `MCP_STATELESS_HTTP=1`, image-native `/healthz` healthcheck, no secrets) — **dual-reachable**: internal `knowledge-mcp:9000` (no edge hop) + public `https://knowledge.hi2vi.com/mcp` — operations doc.
- (S3) **Edge `location /mcp` → `knowledge-mcp:9000`, SSE-safe** (`proxy_buffering off`, `proxy_read_timeout`/`proxy_send_timeout 3600s`, inherited HTTP/1.1 keep-alive, variable `proxy_pass` for DNS re-resolution, NO per-location `proxy_set_header`); Cloudflare's ~100s origin cap → the deployed server runs **stateless** (both tools are per-call proxies, correct either way) — operations doc.
- (S3) **Deploy machinery extended to the MCP surface**: `deploy.sh` health-gate now `wait_healthy mcp knowledge-mcp` (three services), and `deploy-production.yml`'s external smoke adds a public `/mcp` routed-liveness check (bare `GET /mcp` → 406 with a `jsonrpc` body, since the MCP `/healthz` is internal-only) — operations doc.
- (S4) **Stable contract v1** for the knowledge MCP service (tools `search` + `fetch_document`, Streamable-HTTP `/mcp`, `Authorization: Bearer <key>` auth, dual reachability), pinned in `mcp-server/CONTRACT.md` — the in-repo handshake surface hi2vi P18.S5 points `mcp.servers.knowledge` at; **additive-only** within v1 (new tool / optional param / new output field is non-breaking; a breaking change bumps the version); surfaced at `GET /healthz` as `contract_version` (`CONTRACT_VERSION = "1"`, distinct from MCP `serverInfo.version` = the SDK release `1.28.1`) — api + architecture docs.
- (S4) **Corpus scoping = tenant-wide per `vk_`** — search/fetch scope to the whole tenant's corpus (`server/main.py:316` filters by `tenant_id`, not the key's bound project), so **one hi2vi `vk_` key covers both `hi2vi` + `hi2vi_web`** (no two-key scheme); the `search` `project` param optionally narrows. Final key provisioning coordinated with hi2vi P18.S5 (operator side) — api + architecture docs.
- (S4) **`e2e_smoke.py` first-consumer verifier** (`mcp-server/scripts/`) — a committed, path-agnostic OpenClaw-shaped MCP client (`streamablehttp_client` + `ClientSession`, bearer injected via a custom `httpx_client_factory`); the direct path (client → mcp → `/api` → grounded hit) is proven locally, the public-path run with a real hi2vi `vk_` is **operator post-deploy verification** — operations doc.
- (F1) **The P15 MCP deploy requires `MCP_ALLOWED_HOSTS` (+ `MCP_ALLOWED_ORIGINS`)** — FastMCP's localhost-only DNS-rebinding default returns `421 Invalid Host header` to the public edge host `knowledge.hi2vi.com` and the internal `knowledge-mcp:9000` path otherwise. Protection stays ON (env-driven `config.allowed_hosts()`/`allowed_origins()` = localhost defaults + these vars, passed as an explicit `TransportSecuritySettings`). MATCHING: the port-less public host needs an **exact** allowlist entry (`knowledge.hi2vi.com`); the internal path uses `knowledge-mcp:*`. `compose.prod.yml` sets `MCP_ALLOWED_HOSTS="knowledge.hi2vi.com,knowledge-mcp,knowledge-mcp:*"`, `MCP_ALLOWED_ORIGINS="https://knowledge.hi2vi.com"` — operations doc.
