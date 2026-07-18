"""The FastMCP server: the ``search`` and ``fetch_document`` tools, their result
mapping, the ``/healthz`` route, and the assembled Streamable-HTTP ASGI ``app``.
Both tools register before ``app`` is built, so both are served on the one endpoint.

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


def _truncate(markdown: str, max_chars: int) -> tuple[str, bool, int]:
    """Size-cap a document body by CHARACTER count for a bounded agent context spend.

    Returns ``(body, truncated, total_chars)``. Over the cap: the first
    ``max_chars`` chars + a visible marker naming the shown/total sizes, and
    ``truncated=True``. Under it: the body unchanged, ``truncated=False``.
    ``total_chars`` is **always the original length** so the agent knows there is
    more (it can narrow via ``search`` or a more specific query).
    """

    total = len(markdown)
    if total <= max_chars:
        return markdown, False, total
    marker = f"\n\n…[truncated: showing {max_chars} of {total} characters]"
    return markdown[:max_chars] + marker, True, total


def _map_document(
    doc: dict[str, Any], *, markdown: str, truncated: bool, total_chars: int
) -> dict[str, Any]:
    """Project one upstream single-doc read to the ``fetch_document`` contract.

    Upstream shape (``server/main.py:_public_doc`` with ``markdown`` included):
    ``{id, project, slug, date, title, tags, rel_path, source_repo, markdown,
    related, created_at, updated_at}``. We surface the citable metadata plus the
    (possibly truncated) body and the truncation signal. ``url`` goes through the
    same ``_citation_url`` seam as ``search`` (empty for the whole corpus today).
    """

    return {
        "id": doc.get("id"),
        "rel_path": doc.get("rel_path", ""),
        "title": doc.get("title", ""),
        "project": doc.get("project", ""),
        "date": doc.get("date", ""),
        "tags": doc.get("tags", []),
        "url": _citation_url(doc),
        "markdown": markdown,
        "truncated": truncated,
        "total_chars": total_chars,
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


def _tool_error(exc: upstream.UpstreamError, *, kind: str = "search") -> ToolError:
    """Map an upstream non-2xx to an MCP tool error message, keyed by ``kind``.

    ``401`` (missing/invalid bearer) maps identically for both tools. The rest are
    tool-specific: ``search`` names a ``400`` as a bad FTS query; ``fetch`` names a
    ``404`` as a missing id/rel_path (existence never leaks — the upstream 404s a
    cross-tenant id/path too). ``kind`` selects the surface; the default preserves
    S1's ``search`` mapping byte-for-byte.
    """

    if exc.status == 401:
        return ToolError("unauthorized: missing/invalid bearer")
    if kind == "fetch":
        if exc.status == 404:
            return ToolError("not found: no document with that id/rel_path")
        return ToolError(f"fetch failed: upstream returned HTTP {exc.status}")
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


async def run_fetch_document(
    *,
    id: int | None = None,
    rel_path: str | None = None,
    authorization: str | None,
    transport: Any | None = None,
) -> dict[str, Any]:
    """Core fetch: validate the id/rel_path XOR, proxy the single-doc read
    (forwarding the bearer), size-cap the markdown, return the response dict.

    Kept separate from the ``fetch_document`` tool wrapper so it is unit-testable
    with an ``httpx.MockTransport`` upstream and an explicit ``authorization`` value
    — no MCP protocol handshake needed (same split as :func:`run_search`). The XOR
    check raises **before** any upstream call, so a malformed request never touches
    the API.
    """

    if (id is None) == (rel_path is None):
        raise ToolError("provide exactly one of `id` or `rel_path`")

    try:
        doc = await upstream.fetch_document(
            base_url=config.api_base_url(),
            authorization=authorization,
            id=id,
            rel_path=rel_path,
            timeout=config.UPSTREAM_TIMEOUT,
            transport=transport,
        )
    except upstream.UpstreamError as exc:
        raise _tool_error(exc, kind="fetch") from exc

    markdown, truncated, total_chars = _truncate(doc.get("markdown") or "", config.FETCH_MAX_CHARS)
    return _map_document(doc, markdown=markdown, truncated=truncated, total_chars=total_chars)


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


@mcp.tool(
    name="fetch_document",
    description=(
        "Fetch one document's full markdown, size-capped, by `id` OR `rel_path` "
        "(provide exactly one — use the `id`/`rel_path` from a `search` hit). "
        "Returns {id, rel_path, title, project, date, tags, url, markdown, "
        "truncated, total_chars}. When `truncated` is true, `markdown` is the first "
        "N characters and `total_chars` is the full length — narrow with `search` "
        "for the rest. `url` is the document's public citation origin when one "
        "exists (empty otherwise)."
    ),
)
async def fetch_document(
    id: int | None = None,
    rel_path: str | None = None,
    ctx: Context = None,  # injected by FastMCP; excluded from the tool's input schema
) -> dict[str, Any]:
    authorization = _inbound_authorization(ctx)
    return await run_fetch_document(
        id=id,
        rel_path=rel_path,
        authorization=authorization,
    )


@mcp.custom_route("/healthz", methods=["GET"])
async def healthz(_request: Request) -> JSONResponse:
    """Unauthenticated liveness probe for S3's container healthcheck / edge gate."""

    return JSONResponse({"status": "ok", "service": config.SERVER_NAME})


# The assembled Streamable-HTTP ASGI app: MCP endpoint at /mcp + GET /healthz.
# `custom_route` and `tool` register before this build, so both are included.
app = mcp.streamable_http_app()
