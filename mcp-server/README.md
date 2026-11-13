# knowledge-mcp

An [MCP](https://modelcontextprotocol.io) server that exposes two agent surfaces
over HTTP from one process. Both are thin proxies: each tool calls the platform's
REST API and **forwards the caller's** `Authorization: Bearer vk_…` upstream, so
every scope and permission check stays in the API. Nothing is reimplemented here.

- **The Library** at **`/mcp`**: the read tools `search` and `fetch_document`
  (proxying `GET /api/search` and the single-document reads).
- **Feedback** at **`/feedback/mcp`**: write-only, one tool, `capture_feedback`
  (proxying `POST /api/feedback`).

Public URLs: `https://hi2vi.com/mcp` and `https://hi2vi.com/feedback/mcp`.
`CONTRACT.md` is the full contract of both.

## What it exposes

- **Transport:** Streamable-HTTP (official `mcp` SDK / FastMCP), served by uvicorn.
  Two MCP endpoints, `/mcp` and `/feedback/mcp`, each answering a `POST` on its exact
  path (no redirect); unauthenticated liveness at **`GET /healthz`**.
- **Auth:** `initialize` and `tools/list` need no key on either endpoint. Each tool
  call forwards the bearer and the API decides: a missing/invalid key → the tool
  error `unauthorized: missing/invalid bearer`.
- **Tool `search`** — `search(query, project?, limit?)` → `{query, total, results[]}`,
  each hit `{title, snippet, url, id, rel_path}`:
  - `snippet` — the FTS excerpt with `<mark>`/`</mark>` highlight tags stripped.
  - `url` — the document's public citation origin when one exists, else `""`.
    No document carries an origin today, so `url` is empty for the whole current
    corpus; it lights up non-breakingly once a future `source_url` ingester job
    populates it. (It is deliberately *not* pointed at the login-gated web app or
    the retired mkdocs path — a dead/misleading citation is worse than empty.)
  - `id`, `rel_path` — durable handles for stable citations and `fetch_document`.
- **Tool `fetch_document`** — one document's size-capped body by `id` or `rel_path`.
- **Tool `capture_feedback`** (on `/feedback/mcp` only) — `capture_feedback(message,
  source{product, integration?}, …)` stores one feedback event and returns
  `Accepted feedback capture <request_id>` with `{request_id, accepted_at, status}`.
  A `capture` key (write-only) or a `full` key is accepted. `recorded_by` defaults
  to `"agent"` when the caller gives none.

## Configuration (env)

| Var | Default | Meaning |
| --- | --- | --- |
| `KB_API_BASE_URL` | `http://localhost:8000` | Base URL of the platform REST API to proxy. |
| `KB_PUBLIC_BASE_URL` | *(empty)* | Reserved for future citation-`url` derivation; unused today. |
| `MCP_HOST` | `0.0.0.0` | uvicorn bind host. |
| `MCP_PORT` | `9000` | uvicorn bind port (both MCP endpoints and `/healthz`). |
| `MCP_STATELESS_HTTP` | `0` | `1` to run the Streamable-HTTP transport statelessly (no session affinity); applies to both endpoints. |
| `MCP_ALLOWED_HOSTS` | *(localhost only)* | Extra `Host` values both endpoints accept (comma-separated). A port-less public host needs an exact entry (`hi2vi.com`); a host with a port needs `name:*`. |
| `MCP_ALLOWED_ORIGINS` | *(localhost only)* | Extra `Origin` values both endpoints accept (an absent Origin always passes). |
| `MCP_FETCH_MAX_CHARS` | `20000` | `fetch_document`'s character cap. |

## Run locally

Requires Python 3.12+ and [`uv`](https://docs.astral.sh/uv/).

```sh
# from mcp-server/
uv run knowledge-mcp                 # serves on http://0.0.0.0:9000: /mcp and /feedback/mcp
uv run pytest                        # the package's own test suite
```

Point an MCP client's Streamable-HTTP transport at `http://localhost:9000/mcp` (the
Library) or `http://localhost:9000/feedback/mcp` (Feedback) with an
`Authorization: Bearer vk_…` header. `scripts/e2e_smoke.py` checks both against a
running server (the capture call only with `--capture`, since it writes an event).
