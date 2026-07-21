# P15.S2 — `fetch_document` tool + response size caps

## Context

P15.S1 shipped the MCP service scaffold and the `search` tool (each hit carries durable `id` +
`rel_path` handles). **S2 adds the second, deeper-grounding tool: `fetch_document`** — given an `id`
or a `rel_path`, return the document's **full markdown**, size-capped. It's the tool an agent reaches
for after `search` when a snippet isn't enough to ground an answer.

This is a **thin proxy** of the existing frozen single-document reads, exactly like S1's `search`:
- `GET /api/documents/{id}` (`server/main.py:289`, `id` is an int) and
- `GET /api/documents/by-path/{rel_path:path}` (`server/main.py:277`, the `:path` converter allows the
  `project/YYYY-MM-DD-slug.md` slashes),
both returning `_public_doc(doc, include_markdown=True)` — the full doc dict **including `markdown`** —
and both **404 for a missing id/path and for a cross-tenant one** (existence never leaks). Same
**forward-the-inbound-bearer** architecture as S1: corpus scoping is inherited, `/api/*` untouched.

The intent flagged `fetch_document` as "ship if cheap; a `search`-only v1 is acceptable." **It is
cheap** — a near-identical proxy that reuses all of S1's infrastructure — so we **ship it**. The only
real judgment is the **addressing model** (id vs rel_path) and the **truncation policy**, both decided
below.

## What to build (extend S1's three modules + its one test file — no new files needed)

**1. `upstream.py` — add `async def fetch_document(...)`** mirroring the existing `search()`:
- Address by `id` (int) → `GET /api/documents/{id}`, or by `rel_path` (str) →
  `GET /api/documents/by-path/{rel_path}` (build the path directly like
  `cli/src/knowledge_cli/client.py:document_get_by_path` — httpx keeps the `/`).
- Reuse the module's conventions verbatim: forward `authorization` header, `follow_redirects=False`,
  `USER_AGENT`, `_detail(...)` extraction, `UpstreamError(status, detail)` on any non-2xx, injectable
  `transport` for tests. Returns the parsed doc JSON.

**2. `server.py` — add a `fetch_document` tool + an isolated `run_fetch_document(...)` core + a mapper:**
- Tool signature: `fetch_document(id: int | None = None, rel_path: str | None = None, ctx: Context = None)`.
  Require **exactly one** of `id`/`rel_path` (XOR): both-or-neither → a `ToolError`
  ("provide exactly one of `id` or `rel_path`") raised **before** any upstream call. Read the inbound
  bearer with the existing `_inbound_authorization(ctx)` helper (unchanged).
- `run_fetch_document(*, id, rel_path, authorization, transport=None)` — the unit-testable core
  (same split as `run_search`): validate XOR, call `upstream.fetch_document`, map `UpstreamError` →
  tool error, apply the size cap, return the response dict.
- **Response contract:** `{id, rel_path, title, project, date, tags, url, markdown, truncated, total_chars}`.
  `url` via the existing `_citation_url(...)` seam (empty today). `id`/`rel_path`/`title` echo the doc
  so the agent can cite. `markdown` is the (possibly truncated) body.
- **Error mapping:** generalize the error surface so `fetch` maps **404 → "not found: no document with
  that id/rel_path"**, **401 → "unauthorized: missing/invalid bearer"** (shared with search), else
  generic. Keep search's existing **400 → "bad search query"** intact — factor a small
  `_fetch_tool_error` (or key the shared `_tool_error` by kind); don't regress S1's mapping.

**3. `config.py` — add the truncation cap** as an env-overridable knob:
- `FETCH_MAX_CHARS` (module constant, env `MCP_FETCH_MAX_CHARS`, default **20000** — ~5–6k tokens,
  covers the current "explained-for-beginners" corpus while bounding an agent's context spend).
- Reuse `UPSTREAM_TIMEOUT` for the fetch call.

**Truncation policy (the judgment call):** cap by **characters** (predictable for token budgeting; the
body is text). If `len(markdown) > FETCH_MAX_CHARS`: return the first `FETCH_MAX_CHARS` chars, append a
clear marker (e.g. `\n\n…[truncated: showing 20000 of 41234 characters]`), and set `truncated: true`
with `total_chars` = the original length so the agent knows there's more (it can narrow via `search`
or a more specific query). Untruncated docs → `truncated: false`, `total_chars = len(markdown)`.

## Reuse (don't reinvent — all in the S1 package)
- `mcp-server/src/knowledge_mcp/upstream.py:search` — the exact async httpx proxy shape to copy for
  `fetch_document` (headers, `follow_redirects=False`, `_detail`, `UpstreamError`, `transport=`).
- `mcp-server/src/knowledge_mcp/server.py` — `_inbound_authorization`, `_citation_url`, `_tool_error`,
  the `run_search`/`search` core-vs-tool split, and the `@mcp.tool(...)` registration pattern.
- `cli/src/knowledge_cli/client.py:document_get` / `document_get_by_path` — proof of the exact endpoint
  paths, the int-vs-by-path split, and the 404-for-foreign behavior to expect.
- `server/main.py:277-298` (`get_document_by_path`, `get_document`) + `_public_doc` (`:194`) — the
  upstream response shape (`markdown` included; fields id/project/slug/date/title/tags/rel_path/…).

## Decisions to record (append one-line "Doc impact" notes to `phase.md`; REVIEW consolidates)
- Second MCP tool `fetch_document(id | rel_path)` → full markdown, **char-capped** (`MCP_FETCH_MAX_CHARS`,
  default 20000) with a truncation marker + `{truncated, total_chars}` signal; proxies the frozen
  `GET /api/documents/{id}` + `/api/documents/by-path/{rel_path}`, same bearer forward as `search`.
- `fetch_document` addressing = XOR of `id`/`rel_path`; 404 → "not found" tool error.

## Verification (lean — house rule; extend the single `tests/test_search_tool.py`, or add one terse file)
Using `httpx.MockTransport` as the stubbed upstream (no live server), assert:
- fetch **by id** maps to `{id, rel_path, title, project, date, tags, url, markdown, truncated,
  total_chars}` and forwards the inbound bearer to `GET /api/documents/{id}`;
- fetch **by rel_path** hits `GET /api/documents/by-path/{rel_path}` (slashes preserved);
- **truncation**: a doc longer than `FETCH_MAX_CHARS` → `truncated == True`, marker present,
  `len(markdown) ≤ cap + marker`, `total_chars` = original length; a short doc → `truncated == False`;
- **XOR**: both-or-neither `id`/`rel_path` → `ToolError` before any upstream call;
- **404** upstream → a "not found" `ToolError`; **401** → "unauthorized".
Run from `mcp-server/` with `uv run pytest -q` (its own pytest config; the root suite doesn't collect
it). Then the orchestrator runs `python3 scripts/workflow.py validate` (state integrity only).

## Out of scope (later slices)
- Dockerfile + `compose.prod.yml` `knowledge-mcp` service + SSE-safe edge routing + dual reachability → **S3**.
- Stable versioned contract artifact + OpenClaw first-consumer E2E → **S4**.
- `source_url` population that lights up `url` → **deferred D13** (not this slice; `url` stays `""`).
