"""Terse behavioral tests for the `search` + `fetch_document` tools and the app.

Upstream is stubbed with an `httpx.MockTransport` (no live API): we exercise the
real request path — bearer forwarding, param/path building — and assert the mapping
to each tool's contract, `<mark>` stripping, the empty citation `url`, the `search`
401 → tool-error mapping, and for `fetch_document` the id/rel_path addressing (XOR),
char-cap truncation, and 404 → "not found" / 401 → "unauthorized" mapping. A
Starlette `TestClient` smoke proves the ASGI app (MCP mounted) builds and
`GET /healthz` answers 200.

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
    body = resp.json()
    assert body["status"] == "ok"
    # /healthz surfaces the consumer-pinned contract version (S4, CONTRACT.md).
    assert body["contract_version"] == server.config.CONTRACT_VERSION == "1"


# --- fetch_document (S2) -----------------------------------------------------

# One upstream single-doc read in the shape server/main.py:_public_doc(..., include_
# markdown=True) emits (tags already parsed to a list, tags_text dropped).
_DOC = {
    "id": 42,
    "tenant_id": "",
    "project": "changple5",
    "slug": "vector-index-notes",
    "date": "2026-05-01",
    "title": "Vector index notes",
    "tags": ["search", "vectors"],
    "source_repo": "changple5",
    "rel_path": "changple5/2026-05-01-vector-index-notes.md",
    "format": "md",
    "markdown": "# Vector index notes\n\nA short body about embeddings.",
    "related": [],
    "created_at": "2026-05-01T00:00:00Z",
    "updated_at": "2026-05-01T00:00:00Z",
}

_FETCH_KEYS = {
    "id", "rel_path", "title", "project", "date",
    "tags", "url", "format", "markdown", "truncated", "total_chars",
}


def test_fetch_by_id_maps_contract_and_forwards_bearer():
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["authorization"] = request.headers.get("authorization")
        seen["path"] = request.url.path
        return httpx.Response(200, json=_DOC)

    out = asyncio.run(
        server.run_fetch_document(
            id=42,
            authorization="Bearer vk_test_123",
            transport=httpx.MockTransport(handler),
        )
    )

    # Exact fetch contract, no extra keys.
    assert set(out) == _FETCH_KEYS
    assert out["id"] == 42
    assert out["rel_path"] == "changple5/2026-05-01-vector-index-notes.md"
    assert out["title"] == "Vector index notes"
    assert out["project"] == "changple5"
    assert out["date"] == "2026-05-01"
    assert out["tags"] == ["search", "vectors"]
    assert out["url"] == ""  # same reserved seam as search — empty for the corpus
    assert out["format"] == "md"  # relayed verbatim from the upstream md doc

    # Under the default cap -> full body, not truncated.
    assert out["markdown"] == _DOC["markdown"]
    assert out["truncated"] is False
    assert out["total_chars"] == len(_DOC["markdown"])

    # Inbound bearer forwarded verbatim to GET /api/documents/{id}.
    assert seen["authorization"] == "Bearer vk_test_123"
    assert seen["path"] == "/api/documents/42"


def test_fetch_relays_html_format_and_defaults_when_absent():
    # An html doc: format relayed verbatim; markdown = the server-extracted readable
    # text (not raw HTML), passed through unchanged under the cap.
    html_text = "Quiz explainer\n\nQ1: pick one. A) yes B) no"
    html_doc = {**_DOC, "format": "html", "markdown": html_text}

    def html_handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=html_doc)

    out = asyncio.run(
        server.run_fetch_document(
            id=42, authorization="Bearer vk_x",
            transport=httpx.MockTransport(html_handler),
        )
    )
    assert out["format"] == "html"
    assert out["markdown"] == html_text

    # An older upstream that omits `format` -> the mapper defaults to "md".
    legacy_doc = {k: v for k, v in _DOC.items() if k != "format"}

    def legacy_handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=legacy_doc)

    out = asyncio.run(
        server.run_fetch_document(
            id=42, authorization="Bearer vk_x",
            transport=httpx.MockTransport(legacy_handler),
        )
    )
    assert out["format"] == "md"


def test_fetch_by_rel_path_hits_by_path_endpoint_slashes_preserved():
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        return httpx.Response(200, json=_DOC)

    out = asyncio.run(
        server.run_fetch_document(
            rel_path="changple5/2026-05-01-vector-index-notes.md",
            authorization="Bearer vk_x",
            transport=httpx.MockTransport(handler),
        )
    )
    assert out["id"] == 42
    # The `/` separators survive into the {rel_path:path} upstream route.
    assert seen["path"] == "/api/documents/by-path/changple5/2026-05-01-vector-index-notes.md"


def test_fetch_truncates_over_cap(monkeypatch):
    monkeypatch.setattr(server.config, "FETCH_MAX_CHARS", 50)
    body = "x" * 120
    doc = {**_DOC, "markdown": body}

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=doc)

    out = asyncio.run(
        server.run_fetch_document(
            id=42, authorization="Bearer vk_x",
            transport=httpx.MockTransport(handler),
        )
    )
    assert out["truncated"] is True
    assert out["total_chars"] == 120          # original length, not the shown length
    assert out["markdown"].count("x") == 50   # only the cap's worth of body chars
    assert "truncated: showing 50 of 120" in out["markdown"]


def test_fetch_xor_violation_raises_before_upstream():
    called = {"hit": False}

    def handler(_request: httpx.Request) -> httpx.Response:
        called["hit"] = True
        return httpx.Response(200, json=_DOC)

    transport = httpx.MockTransport(handler)

    # Both provided -> error before any upstream call.
    with pytest.raises(ToolError) as excinfo:
        asyncio.run(
            server.run_fetch_document(
                id=42, rel_path="a/b.md",
                authorization="Bearer vk_x", transport=transport,
            )
        )
    assert "exactly one" in str(excinfo.value).lower()

    # Neither provided -> same error, still no upstream call.
    with pytest.raises(ToolError):
        asyncio.run(
            server.run_fetch_document(
                authorization="Bearer vk_x", transport=transport,
            )
        )
    assert called["hit"] is False


def test_fetch_404_becomes_not_found():
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"detail": "no document with id 999"})

    with pytest.raises(ToolError) as excinfo:
        asyncio.run(
            server.run_fetch_document(
                id=999, authorization="Bearer vk_x",
                transport=httpx.MockTransport(handler),
            )
        )
    assert "not found" in str(excinfo.value).lower()


def test_fetch_401_becomes_unauthorized():
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"detail": "invalid credential"})

    with pytest.raises(ToolError) as excinfo:
        asyncio.run(
            server.run_fetch_document(
                id=42, authorization="Bearer bad",
                transport=httpx.MockTransport(handler),
            )
        )
    assert "unauthorized" in str(excinfo.value).lower()
