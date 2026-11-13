#!/usr/bin/env python3
"""First-consumer E2E smoke for the knowledge MCP service (P15.S4).

An OpenClaw-shaped MCP client: it connects to a *running* knowledge-mcp server
over Streamable-HTTP with a bearer, exercises the full contract, and asserts the
client -> mcp -> /api -> grounded-hit chain end to end. This is the same handshake
hi2vi's OpenClaw (`mcp.servers.knowledge`, P18.S5) performs — a committed,
path-agnostic verifier (not a unit test; the terse behavioral tests live in
`mcp-server/tests/`). It is deliberately reusable against BOTH reachability paths:

    # local direct path (a legacy-mode api + this mcp server; see CONTRACT.md):
    python mcp-server/scripts/e2e_smoke.py --url http://localhost:9000/mcp --key <bearer>

    # public path, operator post-deploy with a real vk_ key:
    python mcp-server/scripts/e2e_smoke.py --url https://hi2vi.com/mcp --key vk_...

What it checks:
  1. initialize()                 -> handshake OK, serverInfo captured (SDK version).
  2. list_tools()                 -> both `search` and `fetch_document` are advertised.
  3. call_tool("search", ...)     -> >= 1 grounded hit, each shaped
                                     {title, snippet, url, id, rel_path}.
  4. call_tool("fetch_document")  -> the first hit's `id` returns full `markdown`.
  5. the Feedback endpoint (`--feedback-url`, default: `--url` with `/mcp` replaced
     by `/feedback/mcp`): initialize() and list_tools() with no key, the tool list
     exactly `capture_feedback`. Only with `--capture` (it WRITES one event, marked
     `source.product = "e2e-smoke"`): call_tool("capture_feedback") with `--key`
     (or `--capture-key`) -> an accepted receipt. `--feedback-only` skips 1-4.

Auth (the one genuinely uncertain client API — see CONTRACT.md "Auth"): in
`mcp==1.28.1` the transport's `headers=`/`auth=` params are DEPRECATED and IGNORED
(a runtime warning; they no longer reach the wire). The bearer must be configured
on the underlying `httpx.AsyncClient`, via `streamablehttp_client`'s
`httpx_client_factory`. NOTE a `partial(create_mcp_http_client, headers=...)` does
NOT work: `streamablehttp_client` calls the factory with `headers=None`, which
overrides the partial's bound headers and drops the auth. So we pass a small
custom factory that MERGES `Authorization: Bearer <key>` into whatever headers the
transport hands it — the reliable path (verified against 1.28.1).

Exit 0 + `PASS — …` on success; non-zero + `FAIL — …` with the collected failures.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import Any

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from mcp.shared._httpx_utils import McpHttpClientFactory, create_mcp_http_client

# The five agent-facing fields every `search` hit carries (CONTRACT.md §Tools).
SEARCH_HIT_KEYS = {"title", "snippet", "url", "id", "rel_path"}


def _bearer_factory(key: str | None) -> McpHttpClientFactory:
    """A `McpHttpClientFactory` that injects `Authorization: Bearer <key>`.

    Merges the bearer into whatever headers the transport passes (rather than a
    `partial(..., headers=...)`, which the transport's own `headers=None` would
    override — see the module docstring). Matches the protocol signature exactly.
    """

    def factory(
        headers: dict[str, str] | None = None,
        timeout: httpx.Timeout | None = None,
        auth: httpx.Auth | None = None,
    ) -> httpx.AsyncClient:
        merged = dict(headers or {})
        if key:
            merged["Authorization"] = f"Bearer {key}"
        return create_mcp_http_client(headers=merged, timeout=timeout, auth=auth)

    return factory


def _result_payload(result: Any) -> dict[str, Any]:
    """Extract a tool's JSON result dict from a `CallToolResult`.

    FastMCP returns a dict-typed tool result in `structuredContent`; fall back to
    parsing the first text content block as JSON for robustness across SDK builds.
    """

    if getattr(result, "structuredContent", None):
        return result.structuredContent
    for block in getattr(result, "content", []) or []:
        text = getattr(block, "text", None)
        if text:
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                continue
    return {}


async def run(url: str, key: str, query: str, failures: list[str]) -> str:
    """Drive the client E2E against a running server; append failures. Returns a summary."""

    async with streamablehttp_client(url, httpx_client_factory=_bearer_factory(key)) as (
        read_stream,
        write_stream,
        _get_session_id,
    ):
        async with ClientSession(read_stream, write_stream) as session:
            # 1. Handshake (unauthenticated by design; bearer still on the wire).
            init = await session.initialize()
            server_info = init.serverInfo
            sdk_version = getattr(server_info, "version", "?")

            # 2. Tool discovery — both tools must be advertised.
            tools = {t.name for t in (await session.list_tools()).tools}
            for expected in ("search", "fetch_document"):
                if expected not in tools:
                    failures.append(f"list_tools: `{expected}` missing (advertised: {sorted(tools)})")
            if failures:
                return f"tool discovery failed (serverInfo={server_info.name} {sdk_version})"

            # 3. search -> >= 1 grounded hit in the exact hit contract.
            search_res = await session.call_tool("search", {"query": query, "limit": 5})
            if search_res.isError:
                failures.append(f"call_tool search: tool error: {_error_text(search_res)}")
                return "search call errored"
            payload = _result_payload(search_res)
            hits = payload.get("results", [])
            if not hits:
                failures.append(
                    f"call_tool search q={query!r}: expected >= 1 hit, got 0 "
                    f"(total={payload.get('total')!r}) — seed a matching doc first"
                )
                return "search returned no hits"
            first = hits[0]
            missing = SEARCH_HIT_KEYS - set(first)
            if missing:
                failures.append(f"search hit missing contract keys {sorted(missing)}: {first}")
            hit_id = first.get("id")
            if hit_id is None:
                failures.append(f"search hit has no `id` to fetch: {first}")
                return "search hit unusable for fetch"

            # 4. fetch_document by the first hit's id -> full markdown.
            fetch_res = await session.call_tool("fetch_document", {"id": hit_id})
            if fetch_res.isError:
                failures.append(f"call_tool fetch_document id={hit_id}: tool error: {_error_text(fetch_res)}")
                return "fetch_document call errored"
            doc = _result_payload(fetch_res)
            if not doc.get("markdown"):
                failures.append(f"fetch_document id={hit_id}: empty/absent `markdown`: {doc}")

    return (
        f"MCP E2E ok against {url} (SDK serverInfo {server_info.name} {sdk_version}); "
        f"search -> {len(hits)} hit(s), first id={hit_id} title={first.get('title')!r}; "
        f"fetch_document -> {doc.get('total_chars')} chars (truncated={doc.get('truncated')})"
    )


async def run_feedback(url: str, capture_key: str | None, failures: list[str]) -> str:
    """The Feedback endpoint: a keyless handshake and tool list, then (only when a
    capture key is given, i.e. ``--capture``) one real capture. Returns a summary."""

    async with streamablehttp_client(url, httpx_client_factory=_bearer_factory(None)) as (
        read_stream,
        write_stream,
        _get_session_id,
    ):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            tools = sorted(t.name for t in (await session.list_tools()).tools)
    if tools != ["capture_feedback"]:
        failures.append(f"feedback list_tools: expected exactly ['capture_feedback'], got {tools}")
        return "feedback tool discovery failed"
    if capture_key is None:
        return f"feedback {url}: initialize + list_tools (no key) ok, capture skipped (no --capture)"

    async with streamablehttp_client(url, httpx_client_factory=_bearer_factory(capture_key)) as (
        read_stream,
        write_stream,
        _get_session_id,
    ):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            res = await session.call_tool(
                "capture_feedback",
                {
                    "message": "e2e smoke capture",
                    "source": {"product": "e2e-smoke", "integration": "mcp"},
                },
            )
    if res.isError:
        failures.append(f"call_tool capture_feedback: tool error: {_error_text(res)}")
        return "capture errored"
    receipt = res.structuredContent or {}
    if receipt.get("status") != "accepted" or not receipt.get("request_id"):
        failures.append(f"capture_feedback: unexpected receipt {receipt}")
    return f"feedback {url}: capture accepted, request_id={receipt.get('request_id')}"


def _error_text(result: Any) -> str:
    for block in getattr(result, "content", []) or []:
        text = getattr(block, "text", None)
        if text:
            return text
    return "<no error text>"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://localhost:9000/mcp", help="the Library MCP endpoint (…/mcp)")
    parser.add_argument("--key", help="the bearer forwarded for corpus scoping (vk_… or master)")
    parser.add_argument("--query", default="knowledge", help="the search query (default: 'knowledge')")
    parser.add_argument("--feedback-url", help="the Feedback MCP endpoint (default: --url's /mcp → /feedback/mcp)")
    parser.add_argument("--capture", action="store_true", help="also call capture_feedback (WRITES one event)")
    parser.add_argument("--capture-key", help="the key for --capture (a capture or full key; default --key)")
    parser.add_argument("--feedback-only", action="store_true", help="skip the Library checks (no --key needed)")
    args = parser.parse_args()

    feedback_url = args.feedback_url or (
        args.url[: -len("/mcp")] + "/feedback/mcp" if args.url.endswith("/mcp") else args.url
    )
    capture_key = (args.capture_key or args.key) if args.capture else None
    if not args.feedback_only and not args.key:
        parser.error("--key is required unless --feedback-only")
    if args.capture and not capture_key:
        parser.error("--capture needs --capture-key or --key")

    failures: list[str] = []
    summaries: list[str] = []
    if not args.feedback_only:
        try:
            summaries.append(asyncio.run(run(args.url, args.key, args.query, failures)))
        except Exception as exc:  # noqa: BLE001 — a smoke reports any failure as a clean FAIL line
            failures.append(f"E2E transport/protocol error against {args.url}: {type(exc).__name__}: {exc}")
            summaries.append("aborted (exception)")
    try:
        summaries.append(asyncio.run(run_feedback(feedback_url, capture_key, failures)))
    except Exception as exc:  # noqa: BLE001
        failures.append(f"E2E transport/protocol error against {feedback_url}: {type(exc).__name__}: {exc}")
        summaries.append("feedback aborted (exception)")
    summary = "; ".join(summaries)

    if failures:
        print(f"FAIL — {len(failures)} MCP E2E check(s) failed ({args.url}):")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print(f"PASS — {summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
