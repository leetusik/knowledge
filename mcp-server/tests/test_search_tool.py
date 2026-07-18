"""Terse behavioral tests for the `search` tool and the served app.

Upstream is stubbed with an `httpx.MockTransport` (no live API): we exercise the
real request path — bearer forwarding, param building — and assert the mapping to
the search-hit contract, `<mark>` stripping, the empty citation `url`, and the
401 → tool-error mapping. A Starlette `TestClient` smoke proves the ASGI app
(MCP mounted) builds and `GET /healthz` answers 200.

Async cores are driven with `asyncio.run` so the only dev dependency is pytest
(mirroring `cli/`).
"""

from __future__ import annotations

import asyncio

import httpx
import pytest
from mcp.server.fastmcp.exceptions import ToolError
from starlette.testclient import TestClient

from knowledge_mcp import server

# One upstream /api/search result in the exact shape server/search.py:_finalize
# emits (only the fields the tool reads matter, but keep it realistic).
_SAMPLE = {
    "query": "vector index",
    "mode": "hybrid",
    "total": 1,
    "limit": 5,
    "offset": 0,
    "results": [
        {
            "id": 42,
            "project": "changple5",
            "slug": "vector-index-notes",
            "date": "2026-05-01",
            "title": "Vector index notes",
            "tags": ["search", "vectors"],
            "rel_path": "changple5/2026-05-01-vector-index-notes.md",
            "source_repo": "changple5",
            "created_at": "2026-05-01T00:00:00Z",
            "updated_at": "2026-05-01T00:00:00Z",
            "score": 0.87,
            "snippet": "a <mark>vector</mark> index over <mark>embeddings</mark>",
            "signals": {"bm25": 1.2, "recency": 0.5, "vector": 0.9},
        }
    ],
}


def test_search_maps_hits_and_forwards_bearer():
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["authorization"] = request.headers.get("authorization")
        seen["path"] = request.url.path
        seen["params"] = dict(request.url.params)
        return httpx.Response(200, json=_SAMPLE)

    out = asyncio.run(
        server.run_search(
            query="vector index",
            project="changple5",
            limit=5,
            authorization="Bearer vk_test_123",
            transport=httpx.MockTransport(handler),
        )
    )

    # Envelope.
    assert out["query"] == "vector index"
    assert out["total"] == 1
    assert len(out["results"]) == 1

    # Exact search-hit contract, no extra keys.
    hit = out["results"][0]
    assert set(hit) == {"title", "snippet", "url", "id", "rel_path"}
    assert hit["title"] == "Vector index notes"
    assert hit["id"] == 42
    assert hit["rel_path"] == "changple5/2026-05-01-vector-index-notes.md"

    # <mark>…</mark> stripped for agent consumption.
    assert hit["snippet"] == "a vector index over embeddings"
    assert "<mark>" not in hit["snippet"] and "</mark>" not in hit["snippet"]

    # url is the reserved seam — empty for the whole corpus until source_url lands.
    assert hit["url"] == ""

    # The inbound bearer is forwarded verbatim to the upstream /api/search call,
    # with q + project + clamped limit.
    assert seen["authorization"] == "Bearer vk_test_123"
    assert seen["path"] == "/api/search"
    assert seen["params"] == {"q": "vector index", "project": "changple5", "limit": "5"}


def test_limit_clamped_to_max():
    def handler(request: httpx.Request) -> httpx.Response:
        # 999 must be clamped to MAX_LIMIT before forwarding.
        assert request.url.params.get("limit") == str(server.config.MAX_LIMIT)
        return httpx.Response(200, json={"query": "x", "total": 0, "results": []})

    out = asyncio.run(
        server.run_search(
            query="x", project=None, limit=999, authorization="Bearer vk_x",
            transport=httpx.MockTransport(handler),
        )
    )
    assert out["results"] == []


def test_upstream_401_becomes_tool_error():
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"detail": "invalid credential"})

    with pytest.raises(ToolError) as excinfo:
        asyncio.run(
            server.run_search(
                query="x", project=None, limit=5, authorization="Bearer bad",
                transport=httpx.MockTransport(handler),
            )
        )
    assert "unauthorized" in str(excinfo.value).lower()


def test_app_builds_and_healthz_ok():
    with TestClient(server.app) as client:
        resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
