# P15.S1 — MCP service scaffold + Streamable-HTTP transport + `search` tool

## Context

P15 exposes knowledge retrieval as an **MCP server over HTTP** ("search as a service") so external
AI agents consume it as a tool. First consumer: hi2vi's OpenClaw CS bot (P18.S5, built in parallel).
S1 is the load-bearing slice — it stands up the service, picks the SDK/transport, and ships the
primary `search` tool. Everything downstream (fetch_document S2, containerize+edge S3, contract+E2E
S4) builds on the choices made here.

Retrieval is **not** rebuilt: the MCP server is a thin wrapper that **proxies the existing frozen
`GET /api/search`** and **forwards the caller's `Authorization: Bearer vk_…`**, so tenant/project
corpus scoping is inherited for free (`server/api_auth.py` resolves the bearer). `/api/*` is frozen —
this service sits alongside it and never changes it.

**Citation-`url` decision (operator, this session):** each `search` hit carries a `url` = the
document's **public origin** (e.g. a naver-cafe post / blog / hi2vi `/docs` article) when one exists,
else **empty**. Today **no** document carries a public origin (`source.repo` holds a repo name like
`changple5`/`hi2vi_web`, not a URL; the corpus is repo-derived explainers), so `url` is empty for the
whole current corpus. The field is **reserved in the contract** so it lights up non-breakingly once a
future `source_url` data-model + ingester job populates it. Do **not** point `url` at the
login-gated web-app page or the dead mkdocs path — both are misleading citations, worse than empty.
The `source_url` + ingestion work is logged as a **deferred job** by the orchestrator (detail later).

## What to build

New top-level package `mcp-server/` (folder deliberately **not** `mcp/` — a top-level `mcp/` dir would
shadow the installed `mcp` SDK when repo root is on `sys.path`, since root `pytest` sets
`pythonpath=["."]`). Mirrors the `cli/` precedent: own `pyproject.toml`, hatchling src-layout,
package `knowledge_mcp`.

```
mcp-server/
  pyproject.toml            # own package, [build-system]=hatchling, deps: mcp (pinned), httpx
  README.md                 # what it is + local run
  src/knowledge_mcp/
    __init__.py             # __version__
    config.py               # KB_API_BASE_URL, KB_PUBLIC_BASE_URL(reserved), MCP_PORT, caps/timeouts
    upstream.py             # async httpx client → GET /api/search, forwards bearer, follow_redirects=False
    server.py               # FastMCP instance + `search` tool + ASGI app (mount MCP + GET /healthz)
    main.py                 # uvicorn entrypoint (knowledge-mcp script)
  tests/
    test_search_tool.py     # terse: MockTransport upstream → mapping / mark-strip / url / bearer / 401
```

**SDK / transport:** official Python `mcp` SDK (FastMCP) with the **Streamable-HTTP** transport
(not deprecated HTTP+SSE), served by **uvicorn** (nginx-frontable in S3). FastMCP's
`streamable_http_app()` yields a Starlette app; add a `GET /healthz` route (S3's container healthcheck
needs it) by mounting it under / extending the Starlette app. MCP endpoint at the default `/mcp` path.
Server name `knowledge`, tool name `search`.

**`search` tool** — `search(query: str, project: str | None = None, limit: int = 5)`:
- Read the incoming request's `Authorization` header (the caller's `Bearer vk_…`) and forward it to
  `GET {KB_API_BASE_URL}/api/search?q=…&project=…&limit=…`. **Key technical risk** (why this slice is
  `high`): the exact accessor for the inbound HTTP header inside a FastMCP tool over streamable-http.
  Likely path: a `Context` param → `ctx.request_context.request` (Starlette `Request`) →
  `.headers.get("authorization")`. Confirm against the pinned SDK version; if the SDK exposes it
  differently, adapt (this is the one genuinely uncertain API). If it proves deeper than a header
  accessor, escalate with findings.
- Map each upstream result → hit `{title, snippet, url, id, rel_path}`:
  - `snippet` — strip `<mark>`/`</mark>` for agent consumption.
  - `url` — via a single `_citation_url(result)` helper that returns the public origin when present,
    else `""`. The `/api/search` response has no origin field today, so it returns `""` for now;
    this helper is the single seam the future `source_url` work fills.
  - `id`, `rel_path` — durable handles for `fetch_document` (S2) and stable citation references.
- Envelope: `{query, total, results: [...]}`. Size-capped: `limit` default **5**, clamp to a small max
  (~20) and forward to the API (itself capped 1–50). Snippet already short.
- Error mapping → MCP tool errors: upstream **401** → "unauthorized: missing/invalid bearer";
  **400** (bad FTS) → surface the detail; other non-2xx → generic tool error.

**Config seam (`config.py`):** env-driven like `server/`/`web/` — `KB_API_BASE_URL`
(dev `http://localhost:8000`; prod `http://knowledge-api:8000` set by S3), `KB_PUBLIC_BASE_URL`
(reserved for future url derivation), `MCP_PORT` (e.g. 9000), timeouts + caps as constants.

**Proxy client (`upstream.py`):** thin `httpx.AsyncClient` over `/api/search`, forwarded bearer,
`User-Agent: knowledge-mcp/<version>`, `follow_redirects=False` (don't leak the bearer on a redirect —
same reasoning as `cli/src/knowledge_cli/client.py`), MockTransport-injectable for tests.

## Reuse (don't reinvent)
- `cli/pyproject.toml` — the exact own-package src-layout + `[project.scripts]` shape to copy.
- `cli/src/knowledge_cli/client.py` — httpx client pattern: per-call bearer, `follow_redirects=False`,
  `_params` drop-None, `ApiError` on non-2xx, JSON-detail extraction.
- `server/main.py:301` `/api/search` params + response `{query, mode, total, limit, offset, results[]}`
  and `server/search.py:_finalize` — the exact upstream result fields to map from.

## Decisions to record (append as one-line "Doc impact" notes in `phase.md`; REVIEW consolidates)
- MCP SDK = official `mcp` (FastMCP) + Streamable-HTTP over uvicorn.
- Proxy-and-forward-bearer architecture (no in-process coupling; corpus scoping inherited).
- Package boundary `mcp-server/` + `knowledge_mcp` (src-layout; folder named to avoid shadowing `mcp`).
- Search hit contract `{title, snippet, url, id, rel_path}`; `<mark>` stripped; `url` = public origin,
  `""` until a future `source_url` data-model + ingester job populates it.

## Verification (lean — house rule)
- Unit (`test_search_tool.py`, `httpx.MockTransport` upstream): tool maps a sample result to
  `{title, snippet, url, id, rel_path}`; `<mark>` stripped; `url == ""`; bearer forwarded to the
  upstream request; upstream 401 → tool error. One file, minimal fixtures.
- App smoke: Starlette `TestClient` — `GET /healthz` → 200 and the ASGI app (MCP mounted) builds.
- `python3 scripts/workflow.py validate` (state integrity).
- Full MCP-client protocol handshake over both reachability paths is **S4's** E2E, not here.

## Out of scope (later slices)
- `fetch_document` tool + full-markdown size caps → **S2**.
- Dockerfile + `compose.prod.yml` service + SSE-safe edge routing + dual reachability → **S3**.
- Stable versioned contract artifact + OpenClaw first-consumer E2E + `source_url` population → **S4** / deferred.
