# P15.S1 result — MCP service scaffold + Streamable-HTTP + `search` tool

**Status: done.** Stood up the new `mcp-server/` package, wired the official `mcp`
SDK (FastMCP) over the **Streamable-HTTP** transport served by uvicorn, and shipped
the `search` tool that proxies the frozen `GET /api/search` and forwards the
caller's inbound `Authorization: Bearer vk_…` verbatim. No retrieval reimplemented,
no `/api/*` change.

## What I built

New top-level package `mcp-server/` (folder deliberately **not** `mcp/` — see below),
src-layout mirroring `cli/`, package `knowledge_mcp`:

| File | Role |
| --- | --- |
| `pyproject.toml` | own hatchling package `knowledge-mcp`, `[project.scripts] knowledge-mcp = knowledge_mcp.main:main`, deps `mcp==1.28.1`, `httpx`, `uvicorn`; dev dep `pytest`; `testpaths=["tests"]` |
| `README.md` | what it is, the tool contract, env config table, local run |
| `src/knowledge_mcp/__init__.py` | `__version__ = "0.1.0"` + package docstring |
| `src/knowledge_mcp/config.py` | env seam: `KB_API_BASE_URL`, `KB_PUBLIC_BASE_URL` (reserved), `MCP_HOST/PORT`, `MCP_STATELESS_HTTP`; constants `SERVER_NAME`, `DEFAULT_LIMIT=5`, `MAX_LIMIT=20`, `UPSTREAM_TIMEOUT` |
| `src/knowledge_mcp/upstream.py` | async httpx proxy over `/api/search`: forwards the inbound `Authorization` verbatim, `follow_redirects=False`, `UpstreamError` on non-2xx, FastAPI-`detail` extraction, MockTransport-injectable |
| `src/knowledge_mcp/server.py` | FastMCP instance + `search` tool + mapping helpers (`_strip_marks`, `_citation_url`, `_map_hit`, `_clamp_limit`, `_tool_error`, `run_search`, `_inbound_authorization`) + `GET /healthz` custom route + assembled ASGI `app` |
| `src/knowledge_mcp/main.py` | `knowledge-mcp` uvicorn entrypoint |
| `tests/test_search_tool.py` | terse behavioral tests (below) |

## Decisions made

- **SDK + version: official `mcp` (FastMCP), pinned `mcp==1.28.1`** (latest release).
  Hard `==` pin because the two genuinely uncertain APIs of this slice were verified
  against exactly this release; the `uv.lock` captures the full resolution.
- **Transport: Streamable-HTTP** (not the deprecated HTTP+SSE). `mcp.streamable_http_app()`
  yields a Starlette app with the MCP endpoint at the default **`/mcp`** path; served
  by uvicorn (nginx-frontable in S3). Confirmed present and working in 1.28.1.
- **Statefulness: default stateful (SSE streaming)**, with a `MCP_STATELESS_HTTP=1`
  escape hatch (`config.stateless_http()`). Rationale: matches the phase's
  "Streamable-HTTP/SSE" framing and S3's SSE-safe edge work; a single-container
  deploy gives automatic session affinity. The `search` tool is a pure per-call
  proxy, so stateless is equally correct if S3/S4 prefer it. Multi-replica under
  stateful mode would need sticky sessions / an event store — flagged for S3/S4.
- **Proxy-and-forward-bearer architecture** (over the in-process alternative of
  importing `server/` modules). The MCP server forwards the caller's inbound header
  verbatim to `{KB_API_BASE_URL}/api/search`, so `server/api_auth.py` scopes the
  corpus by tenant/project with **no new auth code** and no coupling to backend
  internals. This is the web BFF's `KB_API_BASE_URL` pattern.
- **Package folder `mcp-server/` (not `mcp/`)**: a top-level `mcp/` dir would shadow
  the installed `mcp` SDK when repo root is on `sys.path` (root pytest sets
  `pythonpath=["."]`). The python package stays `knowledge_mcp` under `src/`.
- **Citation `url` = public origin, else `""`** via a single `_citation_url(result)`
  seam. Today's `/api/search` carries no origin field (`source_repo` is a repo name,
  not a URL), so `url` is `""` for the whole corpus now — deliberately NOT the
  login-gated web-app route nor the retired mkdocs path (both are misleading
  citations for an agent's chip, worse than empty). This helper is the one place a
  future `source_url` data-model + ingester job wires up.
- **Search-hit contract `{title, snippet, url, id, rel_path}`**, envelope
  `{query, total, results[]}`. `snippet` has `<mark>`/`</mark>` stripped for agent
  consumption. `limit` defaults to 5 and is clamped to `MAX_LIMIT=20` before being
  forwarded to `/api/search` (itself capped 1–50). `id`/`rel_path` are the durable
  handles for S2's `fetch_document` and stable citations.
- **Error mapping**: upstream 401 → "unauthorized: missing/invalid bearer";
  400 (bad FTS) → "bad search query: {detail}"; other non-2xx → generic tool error.

## The genuinely uncertain API — resolved (no workaround needed)

Reading the inbound HTTP `Authorization` header inside a FastMCP tool over
streamable-http. **Confirmed the plan's likely path works exactly** against
`mcp==1.28.1`:

- A tool declares a `ctx: Context` param (FastMCP auto-detects it by type and
  excludes it from the tool's input schema).
- Under Streamable-HTTP the transport builds a Starlette `Request` from the POST
  (`mcp/server/streamable_http.py`, `request = Request(scope, receive)`) and threads
  it through `ServerMessageMetadata.request_context` → the low-level server's
  `RequestContext(request=…)` → `Context.request_context.request`.
- So `ctx.request_context.request.headers.get("authorization")` is the caller's
  inbound header. See `server.py:_inbound_authorization` (degrades to `None` if no
  HTTP request is in scope). **No ASGI-middleware / contextvar workaround was
  required** — the SDK exposes the request directly.

I verified this mechanism by source-inspecting the installed SDK before writing code
(request population at `streamable_http.py:404`, `RequestContext` dataclass, the
`custom_route` decorator, and `ToolError` wrapping), then confirmed the assembled app
builds and registers the tool + `/healthz`.

## How I verified (lean, house rule — `mcp-server/tests/test_search_tool.py`)

Ran from `mcp-server/` with `uv run pytest -q` → **4 passed**:

1. `test_search_maps_hits_and_forwards_bearer` — `httpx.MockTransport` stubs the
   upstream; asserts the hit maps to exactly `{title, snippet, url, id, rel_path}`,
   `<mark>…</mark>` is stripped (`"a vector index over embeddings"`), `url == ""`,
   and the **inbound bearer `Bearer vk_test_123` is forwarded verbatim** to
   `/api/search?q=…&project=…&limit=5`.
2. `test_limit_clamped_to_max` — `limit=999` is clamped to `MAX_LIMIT` before forwarding.
3. `test_upstream_401_becomes_tool_error` — an upstream 401 raises `ToolError`
   containing "unauthorized".
4. `test_app_builds_and_healthz_ok` — Starlette `TestClient` on the assembled ASGI
   app (MCP mounted): `GET /healthz` → 200 `{"status":"ok"}`, proving the app builds.

Also smoke-imported the entrypoint (`knowledge_mcp.main.main` callable, `app` routes
`['/mcp','/healthz']`, `mcp==1.28.1` pinned in the lockfile). The full MCP-client
protocol handshake over both reachability paths is **S4's** E2E, not here.

Commands the orchestrator can re-run (from `mcp-server/`): `uv run pytest -q`.
Per the plan I did **not** run `python3 scripts/workflow.py validate` — that is the
orchestrator's state-integrity check.

## Notes for S2–S4 (also appended to `phase.md`)

- S2's `fetch_document` reuses the same `ctx.request_context.request.headers` accessor
  and the `upstream.py` forward-bearer + `_tool_error` patterns; addressing is by
  `id`/`rel_path` (the durable handles S1 emits) over `GET /api/documents/{id}` and
  `/api/documents/by-path/{rel_path}`.
- S3 points the container healthcheck + edge gate at `GET /healthz`, proxies `/mcp`
  (needs `proxy_buffering off` + long read timeouts for SSE), and sets
  `KB_API_BASE_URL=http://knowledge-api:8000`.
- S4's contract artifact should document `url` as "empty until `source_url` lands" so
  a consumer treats an empty `url` as "no citation link," not an error.

## Deviations from `plan.md`

- **Added a `MCP_STATELESS_HTTP` config flag** not spelled out in the plan — a small,
  reserved escape hatch (default off = the plan's default transport) so S3/S4 can flip
  to stateless without a code change if edge session-affinity proves painful. Behavior
  unchanged by default.
- **Added two extra test cases** beyond the plan's named set (limit-clamp; the app-build
  smoke is folded into the healthz test) — still one terse file, well within the house
  rule.
- Otherwise followed the plan exactly. `_citation_url` reads a reserved `source_url`
  field (absent today → `""`), which is the plan's intended seam.
