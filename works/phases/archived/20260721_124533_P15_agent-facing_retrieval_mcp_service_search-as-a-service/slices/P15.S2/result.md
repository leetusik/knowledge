# P15.S2 result — `fetch_document` tool + response size caps

**Status: done.** Shipped the second MCP tool, `fetch_document`, as a thin proxy of the
frozen single-document reads, additive on S1's proven scaffold. No new source files —
extended the three existing modules + the one test file, exactly as the plan called for.
`/api/*` untouched; retrieval unchanged.

## What I added

- **`upstream.py` → `async def fetch_document(...)`** — mirrors `search()`'s proxy shape
  verbatim (forwarded `Authorization`, `follow_redirects=False`, `USER_AGENT`, `_detail`
  extraction, non-2xx → `UpstreamError`, injectable `transport`). Addresses by `id` (int) →
  `GET /api/documents/{id}` or by `rel_path` (str) → `GET /api/documents/by-path/{rel_path}`,
  building the by-path URL by direct concatenation like
  `cli/knowledge_cli/client.py:document_get_by_path` — httpx preserves the `/` separators the
  upstream `{rel_path:path}` converter expects (asserted in tests). Returns the parsed doc
  JSON with `markdown` included.
- **`server.py`** — added:
  - `run_fetch_document(*, id, rel_path, authorization, transport=None)` — the unit-testable
    core (same split as `run_search`): validate the XOR, proxy, map errors, size-cap, return.
  - `_truncate(markdown, max_chars) -> (body, truncated, total_chars)` — the char-cap helper.
  - `_map_document(doc, *, markdown, truncated, total_chars)` — projects the upstream doc to
    the contract; `url` goes through the **same `_citation_url` seam** as search (empty today).
  - The `@mcp.tool(name="fetch_document")` wrapper with signature
    `fetch_document(id: int | None = None, rel_path: str | None = None, ctx: Context = None)`,
    reusing the unchanged `_inbound_authorization(ctx)` bearer accessor.
  - Generalized `_tool_error(exc, *, kind="search")` — keyed the **shared** mapper by kind
    rather than duplicating it. `401` maps identically for both; `kind="fetch"` adds
    `404 → "not found: no document with that id/rel_path"`; the `search` default path is
    **byte-for-byte unchanged** (`400 → "bad search query"` intact — no regression; `run_search`
    still calls `_tool_error(exc)` with the default kind).
- **`config.py` → `FETCH_MAX_CHARS`** — module constant read once at import from
  `MCP_FETCH_MAX_CHARS`, default **20000** (via a new `_env_int` helper). Reuses
  `UPSTREAM_TIMEOUT` for the fetch call.

## Decisions realized (as specified in the plan — not re-litigated)

- **Addressing = XOR of `id`/`rel_path`.** `(id is None) == (rel_path is None)` → a `ToolError`
  ("provide exactly one of `id` or `rel_path`") raised **before any upstream call** (test asserts
  the MockTransport handler is never hit for both-or-neither).
- **Truncation = by characters.** Over `FETCH_MAX_CHARS`: first N chars + a visible marker
  `\n\n…[truncated: showing N of TOTAL characters]`, `truncated=True`, `total_chars` = the
  **original** length. Under cap: body unchanged, `truncated=False`, `total_chars=len(body)`.
- **Response contract:** `{id, rel_path, title, project, date, tags, url, markdown, truncated,
  total_chars}`. `url` via `_citation_url` (empty for the whole corpus until `source_url` lands —
  deliberately NOT the login-gated app route or the retired mkdocs path).
- **Error mapping:** fetch `404 → "not found"`, `401 → "unauthorized"`; search `400 → "bad search
  query"` preserved.

## How I verified (lean — house rule)

Extended the single `mcp-server/tests/test_search_tool.py` with 6 terse `fetch_document` cases,
all driving the real request path through an `httpx.MockTransport` upstream (no live server):
fetch-by-id → exact contract + bearer forwarded to `GET /api/documents/42`; fetch-by-rel_path →
`GET /api/documents/by-path/...` with slashes preserved; over-cap truncation (marker present,
`total_chars` = original, only the cap's body chars); XOR both-and-neither → `ToolError` with the
handler never hit; upstream 404 → "not found"; upstream 401 → "unauthorized". The under-cap
(`truncated=False`) case is covered by the by-id test.

- `uv run pytest -q` (from `mcp-server/`) → **10 passed** (4 pre-existing search + 6 new fetch),
  1 pre-existing StarletteDeprecationWarning (TestClient+httpx, inherited from S1 — not mine).
- Inline registration check: `mcp.list_tools()` → `['fetch_document', 'search']`; the
  `fetch_document` input schema exposes exactly `{id, rel_path}` (the injected `ctx` correctly
  excluded from the schema).

Did **not** run `python3 scripts/workflow.py validate` — that is the orchestrator's state-integrity
check, per the plan.

## Deviations from plan

None. Chose the "key the shared `_tool_error` by kind" option the plan offered (vs a separate
`_fetch_tool_error`) — cleaner, and it keeps search's mapping byte-for-byte.

## What S3/S4 must know

- **Both tools are now registered on the one ASGI app** (`server.app = mcp.streamable_http_app()`,
  built after both `@mcp.tool` registrations). S3 containerizes and edge-routes the whole
  two-tool surface behind the single `/mcp` endpoint — no per-tool routing.
- **Fetch endpoint mapping** (for S4's contract artifact): `fetch_document(id)` → `GET
  /api/documents/{id}`; `fetch_document(rel_path)` → `GET /api/documents/by-path/{rel_path}`.
  Both 404 for a missing **or cross-tenant** id/path (existence never leaks), 401 for a bad
  bearer — same forward-the-inbound-bearer corpus scoping as search.
- **Truncation knob:** `MCP_FETCH_MAX_CHARS` (default 20000 chars). S3 can leave it at the default;
  S4's contract should document `truncated`/`total_chars` so consumers know a body may be partial.
- **`url` still empty** for fetch too (shared `_citation_url` seam) — S4's contract should state
  `url` is "empty until `source_url` lands," same as search; deferred D13 lights it up.
