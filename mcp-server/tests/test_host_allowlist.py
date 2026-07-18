"""Regression guard for P15.F1 — the `421 Invalid Host header` fix.

FastMCP's localhost-only DNS-rebinding default 421s every non-localhost caller.
`config.allowed_hosts()` widens the allowlist (env-driven) while keeping protection
on. We build the SDK's own `TransportSecurityMiddleware` from that allowlist and
assert its `_validate_host` accepts the two served hosts (public exact + internal
`:*` wildcard) and the localhost default, and still rejects everything else.
"""

from __future__ import annotations

from mcp.server.transport_security import (
    TransportSecurityMiddleware,
    TransportSecuritySettings,
)

from knowledge_mcp import config


def test_allowed_hosts_accepts_served_hosts_and_rejects_others(monkeypatch):
    monkeypatch.setenv("MCP_ALLOWED_HOSTS", "knowledge.hi2vi.com,knowledge-mcp,knowledge-mcp:*")
    mw = TransportSecurityMiddleware(
        TransportSecuritySettings(
            enable_dns_rebinding_protection=True,
            allowed_hosts=config.allowed_hosts(),
        )
    )

    assert mw._validate_host("knowledge.hi2vi.com") is True   # public edge, exact match
    assert mw._validate_host("knowledge-mcp:9000") is True     # internal, `:*` wildcard
    assert mw._validate_host("localhost:9000") is True         # localhost default preserved
    assert mw._validate_host("evil.attacker.com") is False     # everything else rejected
