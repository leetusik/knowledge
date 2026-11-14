"""Both endpoints answer their trailing-slash form (`/mcp/`, `/feedback/mcp/`) as
the exact path does, with no redirect: a client that always sends the slash form
loses its bearer on a scheme-changing redirect behind the edge. The same endpoint
object serves both forms, so the host check, the bearer pass-through and the
session manager are shared.
"""

from __future__ import annotations

import json

import pytest
from starlette.testclient import TestClient

from knowledge_mcp import server, upstream

_ACCEPT = {"Accept": "application/json, text/event-stream", "Content-Type": "application/json"}
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
_TOOL_CALLS = {
    "/feedback/mcp": ("capture_feedback", {"message": "m", "source": {"product": "hi2vi"}}),
    "/mcp": ("search", {"query": "q"}),
}
_GOOD = "Bearer kb_good_key"


def _rpc(response) -> dict:
    """The JSON-RPC message of a POST answer (SSE `data:` line, or a JSON body)."""

    if response.headers.get("content-type", "").startswith("application/json"):
        return response.json()
    for line in response.text.splitlines():
        if line.startswith("data:"):
            return json.loads(line[len("data:"):])
    raise AssertionError(f"no JSON-RPC message in {response.text!r}")


@pytest.mark.parametrize("path", ["/mcp", "/feedback/mcp"])
def test_initialize_on_the_slash_form_answers_as_the_exact_path(path):
    with TestClient(server.build_app()) as client:
        exact = client.post(f"http://localhost:9000{path}", json=_INIT, headers=_ACCEPT, follow_redirects=False)
        slash = client.post(f"http://localhost:9000{path}/", json=_INIT, headers=_ACCEPT, follow_redirects=False)
    assert slash.status_code == exact.status_code == 200
    assert "location" not in slash.headers
    assert _rpc(slash)["result"]["serverInfo"] == _rpc(exact)["result"]["serverInfo"]


@pytest.mark.parametrize("path", ["/mcp/", "/feedback/mcp/"])
def test_a_foreign_host_is_refused_on_the_slash_form(path):
    with TestClient(server.build_app()) as client:
        evil = client.post(f"http://evil.attacker.com{path}", json=_INIT, headers=_ACCEPT, follow_redirects=False)
    assert evil.status_code == 421


@pytest.mark.parametrize("path", ["/mcp", "/feedback/mcp"])
def test_get_and_delete_on_the_slash_form_reach_the_same_session_manager(path):
    with TestClient(server.build_app()) as client:
        init = client.post(f"http://localhost:9000{path}", json=_INIT, headers=_ACCEPT)
        sid = {"mcp-session-id": init.headers["mcp-session-id"]}
        answers = {}
        for form in (path, f"{path}/"):
            url = f"http://localhost:9000{form}"
            get = client.get(url, headers={**sid, "Accept": "application/json"}, follow_redirects=False)
            stale = client.delete(url, headers={"mcp-session-id": "0" * 32}, follow_redirects=False)
            answers[form] = (get.status_code, stale.status_code)
        # A session opened on the exact path is closed on the slash form: one manager.
        closed = client.delete(f"http://localhost:9000{path}/", headers=sid, follow_redirects=False)
    assert answers[f"{path}/"] == answers[path] == (406, 404)
    assert closed.status_code == 200


@pytest.mark.parametrize("path", ["/mcp", "/feedback/mcp"])
@pytest.mark.parametrize("key", [None, "Bearer kb_bad_key", _GOOD])
def test_a_tool_call_carries_the_bearer_the_same_way_on_both_forms(monkeypatch, path, key):
    seen: list[str | None] = []

    async def fake_upstream(*, authorization, **_kwargs):
        seen.append(authorization)
        if authorization != _GOOD:
            raise upstream.UpstreamError(401, "invalid credential")
        return {"request_id": "r1", "accepted_at": "t", "status": "accepted", "query": "q", "total": 0, "results": []}

    monkeypatch.setattr(upstream, "capture_feedback", fake_upstream)
    monkeypatch.setattr(upstream, "search", fake_upstream)
    tool, arguments = _TOOL_CALLS[path]
    auth = {"Authorization": key} if key else {}

    outcomes = {}
    with TestClient(server.build_app()) as client:
        for form in (path, f"{path}/"):
            url = f"http://localhost:9000{form}"
            init = client.post(url, json=_INIT, headers={**_ACCEPT, **auth}, follow_redirects=False)
            assert init.status_code == 200, (form, init.status_code)
            headers = {**_ACCEPT, **auth, "mcp-session-id": init.headers["mcp-session-id"]}
            client.post(url, json={"jsonrpc": "2.0", "method": "notifications/initialized"}, headers=headers)
            call = {"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": tool, "arguments": arguments}}
            answer = client.post(url, json=call, headers=headers, follow_redirects=False)
            result = _rpc(answer)["result"]
            outcomes[form] = (answer.status_code, result["isError"], result["content"][0]["text"])

    assert seen == [key, key]
    assert outcomes[f"{path}/"] == outcomes[path]
    assert outcomes[path][1] is (key != _GOOD)
    if key != _GOOD:
        assert "unauthorized" in outcomes[path][2]
