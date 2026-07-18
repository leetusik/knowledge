"""Thin async httpx proxy over the frozen ``GET /api/search``.

This is the whole "proxy-and-forward-bearer" architecture in one function: the
caller's inbound ``Authorization`` header is forwarded **verbatim** upstream, so
the existing ``server/api_auth.py`` resolver scopes the corpus to the bearer's
tenant/project with no new auth code here. Nothing is stored — the header lives
only for the duration of the one request.

The httpx conventions are lifted from ``cli/src/knowledge_cli/client.py``:
per-call bearer (here, a forwarded header), ``follow_redirects=False`` so a
redirect can never silently re-send the bearer to wherever the edge points, a
drop-None param builder so server defaults apply, non-2xx → an exception, and a
FastAPI-``detail`` extraction that never sprays a raw body. The transport is
injectable so tests drive the real request path with an ``httpx.MockTransport``
and no live server.
"""

from __future__ import annotations

import json
from typing import Any

import httpx

from . import __version__

# Identifies MCP-service traffic at the edge / in API logs, distinct from the
# CLI (`knowledge-cli/…`) and browsers. Mirrors the CLI's explicit UA.
USER_AGENT = f"knowledge-mcp/{__version__}"


class UpstreamError(Exception):
    """A non-2xx response from ``/api/search``.

    ``detail`` is FastAPI's own ``{"detail": …}`` when present (safe to surface —
    a generic 401, a 400 that names the bad FTS query), or ``""``. Raw bodies are
    never carried. ``server.py`` maps ``status`` to an MCP tool error.
    """

    def __init__(self, status: int, detail: str = "") -> None:
        self.status = status
        self.detail = detail
        super().__init__(f"HTTP {status}: {detail}" if detail else f"HTTP {status}")


def _detail(response: httpx.Response) -> str:
    """FastAPI's ``detail`` field, or ``""``. Never a raw body (which could be an
    HTML error page from the edge)."""

    try:
        payload = response.json()
    except ValueError:
        return ""
    if isinstance(payload, dict):
        detail = payload.get("detail")
        if isinstance(detail, str):
            return detail
        if detail is not None:
            return json.dumps(detail)
    return ""


def _params(**values: Any) -> dict[str, Any]:
    """Query params with the unset ones dropped, so server defaults apply."""

    return {key: value for key, value in values.items() if value is not None}


async def search(
    *,
    base_url: str,
    authorization: str | None,
    q: str,
    project: str | None = None,
    limit: int | None = None,
    timeout: float = 15.0,
    transport: httpx.BaseTransport | None = None,
) -> dict[str, Any]:
    """``GET {base_url}/api/search`` with the inbound bearer forwarded verbatim.

    Returns the parsed JSON envelope (``{query, mode, total, limit, offset,
    results[]}``). Raises :class:`UpstreamError` on any non-2xx (401 for a
    missing/invalid bearer, 400 for a malformed FTS query, etc.).
    """

    headers = {"User-Agent": USER_AGENT}
    if authorization:
        # Forward exactly what the caller sent (scheme + token), unmodified —
        # the frozen /api/* plane only accepts `Authorization: Bearer`, and the
        # resolver reads this header to scope the corpus.
        headers["Authorization"] = authorization

    async with httpx.AsyncClient(
        base_url=base_url.rstrip("/"),
        timeout=timeout,
        follow_redirects=False,
        headers=headers,
        transport=transport,
    ) as client:
        response = await client.get("/api/search", params=_params(q=q, project=project, limit=limit))

    if response.status_code >= 400:
        raise UpstreamError(response.status_code, _detail(response))
    try:
        return response.json()
    except ValueError:
        raise UpstreamError(response.status_code, "upstream response was not JSON") from None
