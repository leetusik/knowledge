# Knowledge MCP service — tool contract **v1**

The stable, versioned handshake surface for the platform's MCP service. One process
serves two endpoints:

- **The Library** at `/mcp` (`https://hi2vi.com/mcp`): the read tools `search` and
  `fetch_document`. Everything below up to [Feedback endpoint](#feedback-endpoint-feedbackmcp)
  describes it.
- **Feedback** at `/feedback/mcp` (`https://hi2vi.com/feedback/mcp`): **write-only**,
  one tool, `capture_feedback`. See [Feedback endpoint](#feedback-endpoint-feedbackmcp).


External agents (the first consumer is hi2vi's OpenClaw CS bot,
`mcp.servers.knowledge`, hi2vi P18.S5) **pin to this document**: the transport,
endpoint, auth header, tool names, and input/output schemas below are the contract.
Changes are **additive-only** within v1 (see [Versioning & stability](#versioning--stability)).

- **Contract version:** `1` — also surfaced at `GET /healthz` (`contract_version`).
- **What it wraps:** the service is a thin proxy over the **frozen** `GET /api/search`
  and single-document reads (the Library) and `POST /api/feedback` (Feedback); it
  reimplements no retrieval or capture logic and **never modifies `/api/*`**. The REST
  contract is the substrate this contract sits *alongside*.

---

## Transport & endpoint

- **Protocol:** MCP over **Streamable-HTTP** (the official `modelcontextprotocol`
  transport — *not* the deprecated HTTP+SSE transport). Server built with the Python
  `mcp` SDK (FastMCP).
- **Endpoint paths:** `/mcp` (the Library) and `/feedback/mcp` (Feedback), each
  answering on its exact path with no redirect (POST for JSON-RPC; responses are JSON or
  an SSE stream the transport negotiates via the `Accept: application/json,
  text/event-stream` header the client sets automatically). Both share the process, the
  port, `/healthz`, the statelessness flag and the `Host`/`Origin` allowlists
  (`MCP_ALLOWED_HOSTS`, `MCP_ALLOWED_ORIGINS`); a `Host` outside the allowlist is
  refused with `421` on either.
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
| **Internal** (no edge hop) | `http://knowledge-mcp:9000/mcp`, `http://knowledge-mcp:9000/feedback/mcp` | a co-tenant agent on `changple_shared_network` (e.g. OpenClaw in prod) |
| **Public** (via the edge) | `https://hi2vi.com/mcp`, `https://hi2vi.com/feedback/mcp` | off-box / local-dev agents |

Both paths serve the identical surfaces. The old public host `knowledge.hi2vi.com`
answers with a `308` to the apex; not every MCP client follows a redirect on a `POST`,
so configure the apex URL directly. The public path is SSE-safe end to end
(edge `proxy_buffering off` + long read/send timeouts; the server also sets
`X-Accel-Buffering: no` on its SSE responses).

## Auth

- **Header:** send `Authorization: Bearer <key>` as an HTTP header on requests.
  On **both endpoints** the **`initialize` handshake and `tools/list` need no bearer**
  (verified: a no-bearer `initialize` returns the server capabilities, and the tool list
  follows). **Tool calls require the bearer** — it is forwarded
  **verbatim** upstream to `/api/*`, where the existing tenant resolver
  (`server/api_auth.py`) scopes the corpus. No auth logic lives in this service.
- **Key type:** a **`vk_…`** key, project-bound or org-level (minted in the accounts
  app, `POST /app/projects/{id}/credentials` or `POST /app/credentials`). A key has a
  scope: a **`full`** key reaches every key surface; a **`capture`** key reaches only
  Feedback capture, so on `/mcp` its `search`/`fetch_document` calls fail (the API
  answers 403 → `search failed: upstream returned HTTP 403`), while on `/feedback/mcp`
  it is the intended key. Missing/invalid bearer on a tool call → the tool returns the
  error `unauthorized: missing/invalid bearer`.
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

The Library's two tools are served on `/mcp`, and only there. `list_tools()` →
`['fetch_document', 'search']` (never `capture_feedback`).

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
| `rel_path` | string | the `project/YYYY-MM-DD-slug.md` path from a search hit. A document migrated from html to native (P30) moved from `….html` to `….md`; its old `….html` path still resolves (a stem alias) |

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
- `format` — `"md" | "html" | "native"`. For an `"html"` doc (a standalone HTML explainer)
  `markdown` carries the server-extracted **readable text** (not the raw HTML), so the
  agent surface stays plain text and character-capped exactly as for markdown docs.
  For a `"native"` chapter (P30) `markdown` carries the chapter's **native source**: the
  whole stored file, its `---` header (`format: native`, `syntax: 1`) and every id
  included, so a re-explain can carry its ids forward. The source is valid CommonMark
  (typed blocks are fenced code, ids are `{#id}` / `#id` text), so a consumer that does
  not know the value can treat it as `"md"`. `"native"` is a new value in an existing
  field, additive under [Versioning & stability](#versioning--stability): the contract
  version stays `1`. Consumers must **tolerate this field being absent** on an older
  server; treat a missing `format` as `"md"`, and an unknown value as `"md"`.
- `url` — same citation seam as `search`; empty for the whole current corpus (D13).

**Errors:** `not found: no document with that id/rel_path` (404 — a missing **or**
cross-tenant id/path both 404; existence never leaks); `unauthorized: missing/invalid
bearer` (401); otherwise `fetch failed: upstream returned HTTP <status>`.

## Feedback endpoint (`/feedback/mcp`)

Write-only: one tool, no read tool. `list_tools()` → `['capture_feedback']` (never a
Library tool). Ported from vocky's MCP capture tool: the name, parameters, description
and result shape are vocky's. It is a thin proxy to `POST /api/feedback`, which is the
authority: the tool validates nothing beyond its input schema and relays the API's
rejection text.

### `capture_feedback(message, source, …)`

**Input** — `message` (string) and `source` (`{product: string, integration?: string}`)
are required. Optional: `feedback_value` (integer), `comment`, `channel`, `recorded_by`,
`project`, `conversation_id`, `session_id`, `user_id`, `trigger_type`,
`trigger_message`, `trigger_metadata` (object), `target_type`, `target_id`,
`target_role`, `target_text`, `event_at` (ISO 8601 with an offset), `tags` (string
list), `messages` (list), `used_context` (list), `source_metadata` (object),
`attributes` (object). The API's own vocabularies apply (`feedback_value` 1|2;
`channel` web|mobile|support; `recorded_by` agent|human). The fields not given are not
sent.

- `recorded_by` — who recorded the event. **Defaults to `"agent"`** when the caller gives
  none (or a blank value): MCP is the agent-runtime surface. Pass `"human"` when relaying
  a human-recorded event. (`POST /api/feedback` itself leaves it null when absent.)
- `project` — the destination project, honoured only for an org-level key (`"default"`
  when absent). A full-access key get-or-creates it in its org; a capture-only key may
  name only a project that already exists in its org (or `"default"`), and any other
  name is a 400 (`project does not exist in this org, and a capture-only key cannot
  create one`). A project-bound key always lands in its own project.

**Output** — a tool result with the text `Accepted feedback capture <request_id>` and the
structured content:

```json
{ "request_id": "<uuid>", "accepted_at": "<ISO 8601>", "status": "accepted" }
```

The event is stored when the result comes back (no queue).

**Auth** — `initialize` and `tools/list` need no key; the call needs a key the API
accepts for capture: a `capture` key (write-only, the intended one) or a `full` key.

**Errors** (returned as `isError` tool results; the tool never raises):

| Upstream | Tool error text |
|---|---|
| 400 | the API's `detail` (e.g. `message must not be blank`) |
| 401 | `unauthorized: missing/invalid bearer` |
| 403 | `forbidden: this key may not capture feedback` |
| 413 | the API's `detail`: `request body must not exceed <N> bytes` (the API's body cap, `KB_FEEDBACK_MAX_BODY_BYTES`, default 262144); nothing was captured, and the same call will fail again until it is smaller |
| 429 | `rate limited: too many captures, retry later` (the API counts this hop's captures per org: every key and session of one org shares one limit, and another org's callers never spend it) |
| any other status ≥ 400 | `capture failed: upstream returned HTTP <status>` |
| unreachable / timeout | `capture failed: upstream unreachable (<error type>)` |

No attachment upload over MCP: attachments go through `POST /api/feedback/attachments`
and the REST capture. So the uploads' `503` (`uploads are paused while unlinked files
are reclaimed — please retry later`, the ceiling on unlinked attachment bytes) never
comes from this tool; a `503` from the capture route itself would surface as
`capture failed: upstream returned HTTP 503`.

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
  `serverInfo = {name: "knowledge", version: "1.28.1"}` on `/mcp` and
  `{name: "feedback", version: "1.28.1"}` on `/feedback/mcp` — that `version` is the
  **`mcp` SDK release**, not this contract. The Feedback endpoint was an additive change
  (a new endpoint and tool): the contract version stays `1`. The consumer-pinned **contract version is `1`**,
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
and asserts grounded results. It then checks the Feedback endpoint: a keyless
`initialize` and `list_tools()` returning exactly `capture_feedback`; the capture call
itself runs only with `--capture`, because it writes an event. Run it against either
reachability path:

```sh
# local direct path (an api + this mcp server)
python mcp-server/scripts/e2e_smoke.py --url http://localhost:9000/mcp --key <bearer>

# public path — operator post-deploy, with a real vk_ key
python mcp-server/scripts/e2e_smoke.py --url https://hi2vi.com/mcp --key vk_...

# the Feedback endpoint alone, with one real capture (writes an event)
python mcp-server/scripts/e2e_smoke.py --url https://hi2vi.com/mcp --feedback-only \
  --capture --capture-key vk_...
```

- The **direct path is proven locally** (client → mcp → `/api` → grounded hit; and a
  capture stored and read back through the API).
- The **public-path run with a real `vk_` key is operator post-deploy verification**
  — it re-runs the same script against `https://hi2vi.com/mcp` after the Production
  Deploy of the `knowledge-mcp` container + edge routing.
