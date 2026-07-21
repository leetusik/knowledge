# Knowledge MCP service — tool contract **v1**

The stable, versioned handshake surface for the knowledge retrieval MCP service.
External agents (the first consumer is hi2vi's OpenClaw CS bot,
`mcp.servers.knowledge`, hi2vi P18.S5) **pin to this document**: the transport,
endpoint, auth header, tool names, and input/output schemas below are the contract.
Changes are **additive-only** within v1 (see [Versioning & stability](#versioning--stability)).

- **Contract version:** `1` — also surfaced at `GET /healthz` (`contract_version`).
- **What it wraps:** the service is a thin proxy over the **frozen** `GET /api/search`
  and single-document reads; it reimplements no retrieval and **never modifies `/api/*`**.
  The frozen REST contract is the retrieval substrate this contract sits *alongside*.

---

## Transport & endpoint

- **Protocol:** MCP over **Streamable-HTTP** (the official `modelcontextprotocol`
  transport — *not* the deprecated HTTP+SSE transport). Server built with the Python
  `mcp` SDK (FastMCP).
- **Endpoint path:** `/mcp` (POST for JSON-RPC; responses are JSON or an SSE stream
  the transport negotiates via the `Accept: application/json, text/event-stream` header
  the client sets automatically).
- **Statefulness:** the **deployed** server runs **stateless** (`MCP_STATELESS_HTTP=1`).
  Both tools are pure per-call proxies, so no session affinity is needed: a client
  `initialize`s, calls a tool, and the stream closes per call. (Stateless was chosen
  because the public path traverses Cloudflare, which caps a single origin response at
  ~100s; a per-call proxy is well within that.)
- **Liveness:** `GET /healthz` → `200 {"status":"ok","service":"knowledge","contract_version":"1"}`.
  This route is **internal-only** (the container healthcheck + the compose/deploy gate
  use it); the public edge does **not** route it. The public routed-liveness signal is a
  bare `GET /mcp` → **406** with a JSON-RPC body `"Client must accept text/event-stream"`
  (a routed MCP response, distinct from a gateway 5xx).

## Reachability

The service is **dual-reachable** — a consumer picks the path by where it runs:

| Path | URL | Who uses it |
|------|-----|-------------|
| **Internal** (no edge hop) | `http://knowledge-mcp:9000/mcp` | a co-tenant agent on `changple_shared_network` (e.g. OpenClaw in prod) |
| **Public** (via the edge) | `https://knowledge.hi2vi.com/mcp` | off-box / local-dev agents |

Both serve the identical two-tool surface. The public path is SSE-safe end to end
(edge `proxy_buffering off` + long read/send timeouts; the server also sets
`X-Accel-Buffering: no` on its SSE responses).

## Auth

- **Header:** send `Authorization: Bearer <key>` as an HTTP header on requests.
  The **`initialize` handshake needs no bearer** (verified: a no-bearer `initialize`
  returns the server capabilities). **Tool calls require the bearer** — it is forwarded
  **verbatim** upstream to `/api/*`, where the existing tenant resolver
  (`server/api_auth.py`) scopes the corpus. No auth logic lives in this service.
- **Key type:** a project **`vk_…`** key (minted in the accounts app,
  `POST /app/projects/{id}/credentials`). Missing/invalid bearer on a tool call →
  the tool returns the error `unauthorized: missing/invalid bearer`.
- **Client note — setting the header with the Python `mcp` SDK (`1.28.1`):** the
  transport's `headers=` / `auth=` parameters are **deprecated and ignored** — they no
  longer reach the wire. Configure the bearer on the underlying `httpx.AsyncClient` via
  `streamablehttp_client`'s `httpx_client_factory`. A
  `partial(create_mcp_http_client, headers={...})` does **not** work (the transport calls
  the factory with `headers=None`, which overrides the partial and drops the bearer); use
  a small factory that **merges** `Authorization` into whatever headers it is handed. See
  `mcp-server/scripts/e2e_smoke.py` (`_bearer_factory`) for the reference implementation.
  OpenClaw and other MCP clients that accept an `Authorization` header in their server
  config (e.g. `mcp.servers.knowledge`) set it through their own config, not this SDK detail.

## Tools

Both tools are served on the single `/mcp` endpoint. `list_tools()` →
`['fetch_document', 'search']`.

### `search(query, project?, limit=5)`

Search the caller's corpus and return ranked hits.

**Input**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `query` | string | yes | the search query (FTS + hybrid vector when the server has embeddings enabled) |
| `project` | string | no | narrows to one project within the caller's tenant (see [Corpus scoping](#corpus-scoping)) |
| `limit` | integer | no, default **5** | result count; **clamped to 1–20** before forwarding |

**Output** — `{query, total, results}` where each `results[]` item is:

```json
{ "title": "…", "snippet": "…", "url": "", "id": 42, "rel_path": "project/YYYY-MM-DD-slug.md" }
```

- `title` — the document title.
- `snippet` — a short excerpt with FTS `<mark>…</mark>` highlight tags **stripped**
  (agents consume plain text).
- `url` — the document's **public citation origin**, or `""`. **It is empty for the
  entire current corpus** (no document carries a citation origin yet). Treat an empty
  `url` as **"no citation link," not an error**. A future `source_url` data-model +
  ingester job (deferred **D13**) will populate it; when it lands, this contract stays
  v1 (a populated field is additive).
- `id`, `rel_path` — the durable handles to pass to `fetch_document`.

**Errors** (returned as MCP tool errors): `unauthorized: missing/invalid bearer` (401
upstream); `bad search query: <detail>` (400 upstream, e.g. a malformed FTS query);
otherwise `search failed: upstream returned HTTP <status>`.

### `fetch_document(id? | rel_path?)`

Fetch one document's full markdown by **exactly one** of `id` or `rel_path` (use the
`id`/`rel_path` from a `search` hit).

**Input**

| Param | Type | Notes |
|-------|------|-------|
| `id` | integer | the document id from a search hit |
| `rel_path` | string | the `project/YYYY-MM-DD-slug.md` path from a search hit |

Provide **exactly one** (XOR). Both or neither → tool error
`provide exactly one of \`id\` or \`rel_path\`` **before any upstream call**.

**Output**

```json
{
  "id": 42, "rel_path": "project/…​.md", "title": "…", "project": "…",
  "date": "YYYY-MM-DD", "tags": ["…"], "url": "", "format": "md",
  "markdown": "# …", "truncated": false, "total_chars": 207
}
```

- `markdown` — the document body, **character-capped** (default **20000** chars,
  `MCP_FETCH_MAX_CHARS`). Over the cap, `markdown` is the first N chars plus a marker
  `…[truncated: showing N of TOTAL characters]`, `truncated` is `true`, and `total_chars`
  is the **full** length — so the agent knows there is more and can narrow via `search`.
- `format` — `"md" | "html"`. For an `"html"` doc (a standalone HTML explainer)
  `markdown` carries the server-extracted **readable text** (not the raw HTML), so the
  agent surface stays plain text and character-capped exactly as for markdown docs.
  Consumers must **tolerate this field being absent** on an older server; treat a
  missing `format` as `"md"`.
- `url` — same citation seam as `search`; empty for the whole current corpus (D13).

**Errors:** `not found: no document with that id/rel_path` (404 — a missing **or**
cross-tenant id/path both 404; existence never leaks); `unauthorized: missing/invalid
bearer` (401); otherwise `fetch failed: upstream returned HTTP <status>`.

## Corpus scoping

A `vk_` key resolves to a **tenant**, and search/fetch scope to the **whole tenant's
corpus** — upstream filters by `tenant_id`, **not** by the single project the key is
bound to. Consequences:

- **One tenant-scoped `vk_` key sees all of that tenant's projects.** For hi2vi, whose
  content spans the `hi2vi` (content) and `hi2vi_web` (engineering) knowledge projects,
  **a single hi2vi `vk_` key covers both** — no two-key or broadened-scope scheme is
  needed. This is the recommended provisioning for the OpenClaw CS bot.
- The `search` **`project` param** optionally **narrows** a query to one project within
  that tenant corpus.
- Final key provisioning (which project the key is minted under, and issuing it to
  OpenClaw) is coordinated with hi2vi P18.S5 on the operator/hi2vi side; this contract
  only specifies the scoping behavior the key inherits.

## Versioning & stability

- **`serverInfo.version` ≠ contract version.** The MCP `initialize` response advertises
  `serverInfo = {name: "knowledge", version: "1.28.1"}` — that `version` is the **`mcp`
  SDK release**, not this contract. The consumer-pinned **contract version is `1`**,
  surfaced at `GET /healthz` as `contract_version` and stated at the top of this document.
- **Additive-only within v1.** The following are **non-breaking** and do **not** bump the
  version: a new tool, a new **optional** input param, a new output field (e.g. `url`
  becoming populated when `source_url` lands). Consumers must tolerate unknown output
  fields.
- **A version bump is a breaking change:** removing or renaming a tool, removing or
  renaming an output field, changing a field's type, or changing the auth model. Such a
  change increments `CONTRACT_VERSION` and is announced here.
- **`/api/*` is frozen.** This contract wraps a frozen REST surface; the guarantees above
  rest on that. This service never changes a field, status, or route on `/api/*`.

## Verification

`mcp-server/scripts/e2e_smoke.py` is the committed, path-agnostic first-consumer
verifier: an OpenClaw-shaped client connects over Streamable-HTTP with a bearer,
`initialize`s, `list_tools()`, calls `search`, then `fetch_document` on the first hit,
and asserts grounded results. Run it against either reachability path:

```sh
# local direct path (a legacy-mode api + this mcp server)
python mcp-server/scripts/e2e_smoke.py --url http://localhost:9000/mcp --key <bearer>

# public path — operator post-deploy, with a real hi2vi vk_ key
python mcp-server/scripts/e2e_smoke.py --url https://knowledge.hi2vi.com/mcp --key vk_...
```

- The **direct path is proven locally** (client → mcp → `/api` → grounded hit).
- The **public-path run with a real hi2vi `vk_` key is operator post-deploy verification**
  — it re-runs the same script against `https://knowledge.hi2vi.com/mcp` after the
  operator's manual Production Deploy of the `knowledge-mcp` container + edge routing.
