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

-
