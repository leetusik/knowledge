# knowledge-mcp

An [MCP](https://modelcontextprotocol.io) server that exposes knowledge retrieval
as an **agent tool over HTTP**. It is a thin wrapper: it **proxies** the frozen
`GET /api/search` REST endpoint and **forwards the caller's**
`Authorization: Bearer vk_…` upstream, so tenant/project corpus scoping is
inherited from the existing API with no new auth code. Retrieval itself is not
reimplemented — this is a new agent-facing surface *alongside* the frozen `/api/*`
contract, never a change to it.

First consumer: hi2vi's OpenClaw customer-service bot.

## What it exposes

- **Transport:** Streamable-HTTP (official `mcp` SDK / FastMCP), served by uvicorn.
  MCP endpoint at **`/mcp`**; unauthenticated liveness at **`GET /healthz`**.
- **Tool `search`** — `search(query, project?, limit?)` → `{query, total, results[]}`,
  each hit `{title, snippet, url, id, rel_path}`:
  - `snippet` — the FTS excerpt with `<mark>`/`</mark>` highlight tags stripped.
  - `url` — the document's public citation origin when one exists, else `""`.
    No document carries an origin today, so `url` is empty for the whole current
    corpus; it lights up non-breakingly once a future `source_url` ingester job
    populates it. (It is deliberately *not* pointed at the login-gated web app or
    the retired mkdocs path — a dead/misleading citation is worse than empty.)
  - `id`, `rel_path` — durable handles for stable citations and the planned
    `fetch_document` tool.
  - Auth: send your `Authorization: Bearer vk_…`; it is forwarded upstream and
    scopes the corpus. A missing/invalid bearer → an `unauthorized` tool error.

## Configuration (env)

| Var | Default | Meaning |
| --- | --- | --- |
| `KB_API_BASE_URL` | `http://localhost:8000` | Base URL of the knowledge REST API to proxy. |
| `KB_PUBLIC_BASE_URL` | *(empty)* | Reserved for future citation-`url` derivation; unused today. |
| `MCP_HOST` | `0.0.0.0` | uvicorn bind host. |
| `MCP_PORT` | `9000` | uvicorn bind port (MCP endpoint at `/mcp`). |
| `MCP_STATELESS_HTTP` | `0` | `1` to run the Streamable-HTTP transport statelessly (no session affinity). |

## Run locally

Requires Python 3.12+ and [`uv`](https://docs.astral.sh/uv/).

```sh
# from mcp-server/
uv run knowledge-mcp                 # serves on http://0.0.0.0:9000, MCP at /mcp
uv run pytest                        # the package's own test suite
```

Point an MCP client's Streamable-HTTP transport at `http://localhost:9000/mcp`
with an `Authorization: Bearer vk_…` header.
