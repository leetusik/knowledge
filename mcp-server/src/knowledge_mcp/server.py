"""The FastMCP server: the ``search`` tool, the result mapping, the ``/healthz``
route, and the assembled Streamable-HTTP ASGI ``app``.

Transport decision (durable): official ``mcp`` SDK (FastMCP) with the
**Streamable-HTTP** transport — ``mcp.streamable_http_app()`` yields a Starlette
app with the MCP endpoint at ``/mcp`` — served by uvicorn (nginx-frontable in S3).
Not the deprecated HTTP+SSE transport.

Inbound-bearer accessor (the slice's genuinely uncertain API, confirmed against
``mcp==1.28.1``): a tool takes a ``Context`` param, and under the streamable-http
transport ``ctx.request_context.request`` is the Starlette ``Request`` for the POST
that carried the tool call (the transport builds it at
``mcp/server/streamable_http.py`` and threads it through ``RequestContext.request``).
So ``ctx.request_context.request.headers.get("authorization")`` is the caller's
inbound header, which we forward verbatim upstream. No ASGI middleware / contextvar
workaround was needed — the SDK exposes the request directly.
"""

from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import Context, FastMCP
from mcp.server.fastmcp.exceptions import ToolError
from starlette.requests import Request
from starlette.responses import JSONResponse

from . import config, upstream

mcp = FastMCP(config.SERVER_NAME, stateless_http=config.stateless_http())

_MARK_OPEN = "<mark>"
_MARK_CLOSE = "</mark>"


def _strip_marks(text: str | None) -> str:
    """Drop ``<mark>``/``</mark>`` FTS highlight tags — agents consume plain text."""

    if not text:
        return ""
    return text.replace(_MARK_OPEN, "").replace(_MARK_CLOSE, "")


def _citation_url(result: dict[str, Any]) -> str:
    """The document's **public origin** for a clickable citation, or ``""``.

    The single reserved seam for citation URLs. The frozen ``/api/search`` response
    carries **no** origin field today (``source.repo`` is a repo name like
    ``changple5``/``hi2vi_web``, not a URL), so this returns ``""`` for the entire
    current corpus — an empty ``url`` is correct until a future ``source_url``
    data-model + ingester job populates a real origin here.

    Do NOT substitute the login-gated web-app route
    (``…/documents/{id}``) or the retired mkdocs path
    (``…/{project}/{date}-{slug}/``): both are misleading citations for an agent's
    chip, worse than empty. When ``source_url`` lands, this helper is the only
    place that changes.
    """

    origin = result.get("source_url")  # reserved field; absent in today's corpus
    if isinstance(origin, str) and origin.strip():
        return origin.strip()
    return ""


def _map_hit(result: dict[str, Any]) -> dict[str, Any]:
    """Project one upstream ``/api/search`` result to the MCP search-hit contract.

    Upstream shape (``server/search.py:_finalize``): ``{id, project, slug, date,
    title, tags, rel_path, source_repo, created_at, updated_at, score, snippet,
    signals}``. We surface the five agent-facing fields; ``id`` + ``rel_path`` are
    the durable handles the later ``fetch_document`` tool (S2) and stable citations
    key on.
    """

    return {
        "title": result.get("title", ""),
        "snippet": _strip_marks(result.get("snippet")),
        "url": _citation_url(result),
        "id": result.get("id"),
        "rel_path": result.get("rel_path", ""),
    }


def _clamp_limit(limit: int | None) -> int:
    """Default to a small page and clamp to a small max before forwarding."""

    if limit is None:
        return config.DEFAULT_LIMIT
    try:
        value = int(limit)
    except (TypeError, ValueError):
        return config.DEFAULT_LIMIT
    if value < 1:
        return 1
    if value > config.MAX_LIMIT:
        return config.MAX_LIMIT
    return value


def _tool_error(exc: upstream.UpstreamError) -> ToolError:
    """Map an upstream non-2xx to an MCP tool error message."""

    if exc.status == 401:
        return ToolError("unauthorized: missing/invalid bearer")
    if exc.status == 400:
        # Malformed FTS query — surface the server's own detail so the agent can fix it.
        return ToolError(f"bad search query: {exc.detail}" if exc.detail else "bad search query")
    return ToolError(f"search failed: upstream returned HTTP {exc.status}")


async def run_search(
    *,
    query: str,
    project: str | None,
    limit: int | None,
    authorization: str | None,
    transport: Any | None = None,
) -> dict[str, Any]:
    """Core search: clamp, proxy ``/api/search`` (forwarding the bearer), map hits.

    Kept separate from the ``search`` tool wrapper so it is unit-testable with an
    ``httpx.MockTransport`` upstream and an explicit ``authorization`` value — no
    MCP protocol handshake needed.
    """

    clamped = _clamp_limit(limit)
    try:
        raw = await upstream.search(
            base_url=config.api_base_url(),
            authorization=authorization,
            q=query,
            project=project,
            limit=clamped,
            timeout=config.UPSTREAM_TIMEOUT,
            transport=transport,
        )
    except upstream.UpstreamError as exc:
        raise _tool_error(exc) from exc

    results = [_map_hit(hit) for hit in raw.get("results", [])]
    return {
        "query": raw.get("query", query),
        "total": raw.get("total", len(results)),
        "results": results,
    }


def _inbound_authorization(ctx: Context | None) -> str | None:
    """Read the caller's inbound ``Authorization`` header from the MCP request.

    Under the Streamable-HTTP transport ``ctx.request_context.request`` is the
    Starlette ``Request``. Degrades to ``None`` if no HTTP request is in scope
    (e.g. a non-HTTP transport) — the upstream then gets no bearer and returns a
    401, which maps to a clean tool error.
    """

    if ctx is None:
        return None
    try:
        request = ctx.request_context.request
    except (ValueError, AttributeError):
        return None
    if request is None:
        return None
    return request.headers.get("authorization")


@mcp.tool(
    name="search",
    description=(
        "Search the knowledge corpus scoped to your API key. Returns ranked hits, "
        "each {title, snippet, url, id, rel_path}. `url` is the document's public "
        "citation origin when one exists (empty otherwise). Use `id`/`rel_path` for "
        "stable references. `project` optionally narrows to one project; `limit` "
        "caps the result count."
    ),
)
async def search(
    query: str,
    project: str | None = None,
    limit: int = config.DEFAULT_LIMIT,
    ctx: Context = None,  # injected by FastMCP; excluded from the tool's input schema
) -> dict[str, Any]:
    authorization = _inbound_authorization(ctx)
    return await run_search(
        query=query,
        project=project,
        limit=limit,
        authorization=authorization,
    )


@mcp.custom_route("/healthz", methods=["GET"])
async def healthz(_request: Request) -> JSONResponse:
    """Unauthenticated liveness probe for S3's container healthcheck / edge gate."""

    return JSONResponse({"status": "ok", "service": config.SERVER_NAME})


# The assembled Streamable-HTTP ASGI app: MCP endpoint at /mcp + GET /healthz.
# `custom_route` and `tool` register before this build, so both are included.
app = mcp.streamable_http_app()
