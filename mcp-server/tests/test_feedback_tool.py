"""Terse behavioral tests for the write-only `capture_feedback` tool at `/feedback/mcp`.

Upstream `POST /api/feedback` is stubbed with an `httpx.MockTransport`: the body the
tool builds, the forwarded bearer, the `recorded_by` default, the 202 → result mapping
and every failure → an `isError` result (never an exception). Then the assembled app:
each endpoint lists only its own tools, and both refuse a `Host` off the allowlist.
"""

from __future__ import annotations

import asyncio
import json

import httpx
import pytest
from starlette.testclient import TestClient

from knowledge_mcp import feedback, server

_RECEIPT = {
    "request_id": "0b7c3c6e-6f0e-4d7c-9a51-1d2f3e4a5b6c",
    "accepted_at": "2026-11-13T10:00:00+00:00",
    "status": "accepted",
}


def _capture(handler, **fields):
    fields.setdefault("message", "the answer was wrong")
    fields.setdefault("source", {"product": "hi2vi", "integration": "cs-bot"})
    return asyncio.run(
        feedback.run_capture_feedback(
            fields=fields,
            authorization="Bearer kb_capture_123",
            transport=httpx.MockTransport(handler),
        )
    )


def _text(result) -> str:
    return result.content[0].text


def test_body_carries_given_fields_and_bearer_and_omits_the_rest():
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["method"] = request.method
        seen["path"] = request.url.path
        seen["authorization"] = request.headers.get("authorization")
        seen["address_headers"] = {"x-real-ip", "x-forwarded-for"} & set(request.headers)
        seen["body"] = json.loads(request.content)
        return httpx.Response(202, json=_RECEIPT)

    _capture(handler, feedback_value=1, tags=["a"], project="cs", comment=None)

    assert seen["method"] == "POST"
    assert seen["path"] == "/api/feedback"
    assert seen["authorization"] == "Bearer kb_capture_123"
    # No address header: the API buckets an in-network capture by its bearer.
    assert seen["address_headers"] == set()
    assert seen["body"] == {
        "message": "the answer was wrong",
        "source": {"product": "hi2vi", "integration": "cs-bot"},
        "feedback_value": 1,
        "tags": ["a"],
        "project": "cs",
        "recorded_by": "agent",
    }


@pytest.mark.parametrize(("given", "sent"), [(None, "agent"), ("  ", "agent"), ("human", "human")])
def test_recorded_by_defaults_to_agent(given, sent):
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["body"] = json.loads(request.content)
        return httpx.Response(202, json=_RECEIPT)

    _capture(handler, recorded_by=given)
    assert seen["body"]["recorded_by"] == sent


def test_202_becomes_vockys_result():
    result = _capture(lambda _r: httpx.Response(202, json=_RECEIPT))
    assert result.isError is False
    assert _text(result) == f"Accepted feedback capture {_RECEIPT['request_id']}"
    assert result.structuredContent == _RECEIPT


@pytest.mark.parametrize(
    ("status", "body", "expected"),
    [
        (400, {"detail": "message must not be blank"}, "message must not be blank"),
        (
            400,
            {"detail": "project does not exist in this org, and a capture-only key cannot create one"},
            "project does not exist in this org, and a capture-only key cannot create one",
        ),
        (401, {"detail": "invalid credential"}, "unauthorized: missing/invalid bearer"),
        (403, {"detail": "forbidden"}, "may not capture"),
        (429, {"detail": "too many"}, "rate limited"),
        (500, {"detail": "storage write failed"}, "capture failed: upstream returned HTTP 500"),
    ],
)
def test_upstream_failures_become_tool_errors(status, body, expected):
    result = _capture(lambda _r: httpx.Response(status, json=body))
    assert result.isError is True
    assert expected in _text(result)


def test_transport_error_becomes_tool_error():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused", request=request)

    result = _capture(handler)
    assert result.isError is True
    assert _text(result).startswith("capture failed")


def test_each_endpoint_lists_only_its_own_tools():
    feedback_tools = {t.name for t in asyncio.run(server.feedback_mcp.list_tools())}
    library_tools = {t.name for t in asyncio.run(server.mcp.list_tools())}
    assert feedback_tools == {"capture_feedback"}
    assert library_tools == {"search", "fetch_document"}


_INIT = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2025-06-18",
        "capabilities": {},
        "clientInfo": {"name": "test", "version": "0"},
    },
}
_ACCEPT = {"Accept": "application/json, text/event-stream", "Content-Type": "application/json"}


@pytest.mark.parametrize("path", ["/mcp", "/feedback/mcp"])
def test_both_endpoints_answer_on_the_exact_path_and_refuse_foreign_hosts(path):
    with TestClient(server.build_app()) as client:
        ok = client.post(f"http://localhost:9000{path}", json=_INIT, headers=_ACCEPT, follow_redirects=False)
        evil = client.post(f"http://evil.attacker.com{path}", json=_INIT, headers=_ACCEPT, follow_redirects=False)
    assert ok.status_code == 200
    assert evil.status_code == 421
