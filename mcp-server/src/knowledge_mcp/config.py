"""Env-driven config seam for the MCP service — the same 12-factor pattern as
``server/`` and ``web/`` (values read from the environment at call time so a
process, a container, or a test can override them without touching code).

The runtime knobs (``KB_API_BASE_URL``, host/port, stateless flag) are functions;
the fixed caps and identifiers are module constants. Nothing here is secret — the
only credential in play is the caller's inbound bearer, which is forwarded
per-request and never stored (see ``upstream.py``).
"""

from __future__ import annotations

import os

# --- identifiers / fixed caps ------------------------------------------------

# MCP server name advertised to clients; also the tool namespace. Stable — the
# hi2vi OpenClaw consumer (P18.S5) pins its `mcp.servers.knowledge` at this.
SERVER_NAME = "knowledge"

# The knowledge MCP **tool contract** version (see mcp-server/CONTRACT.md).
# DISTINCT from the MCP `serverInfo.version` the SDK advertises (that is the
# `mcp` SDK release, `1.28.1`). This is the consumer-pinned contract: bumped only
# on a BREAKING change (a removed/renamed tool, a removed output field, a changed
# type or auth model). Additive changes (a new tool, a new optional param, a new
# output field) stay v1. Surfaced at `GET /healthz` so a consumer/monitor can read
# it without a protocol handshake.
CONTRACT_VERSION = "1"

# `search` result-count caps. `limit` defaults to a small, agent-friendly page
# and is clamped to a small max before being forwarded to /api/search (which is
# itself capped 1–50 server-side). Snippets are already short (~12 tokens).
DEFAULT_LIMIT = 5
MAX_LIMIT = 20

# Upstream call timeout (seconds). Search is embedding-backed but bounded.
UPSTREAM_TIMEOUT = 15.0


def _env(name: str, default: str) -> str:
    value = os.environ.get(name)
    return value if value is not None and value != "" else default


def _env_int(name: str, default: int) -> int:
    try:
        return int(_env(name, str(default)))
    except ValueError:
        return default


def _env_list(name: str) -> list[str]:
    """Read a comma-separated env var into a trimmed list (empties dropped)."""

    return [item.strip() for item in os.environ.get(name, "").split(",") if item.strip()]


# `fetch_document` full-markdown cap. The body is text, so we cap by CHARACTERS
# (predictable for an agent's token budgeting). Over the cap, `fetch_document`
# returns the first `FETCH_MAX_CHARS` chars + a truncation marker and signals
# `{truncated: true, total_chars}`; the default ~5–6k tokens covers the current
# "explained-for-beginners" corpus while bounding an agent's context spend.
# `MCP_FETCH_MAX_CHARS` overrides it (read once at import, like the other caps).
FETCH_MAX_CHARS = _env_int("MCP_FETCH_MAX_CHARS", 20000)


def api_base_url() -> str:
    """Base URL of the frozen knowledge REST API the tools proxy.

    Dev: ``http://localhost:8000``. Prod (set by S3's compose service) reaches
    the API container-to-container by service name, e.g.
    ``http://knowledge-api:8000`` — the same ``KB_API_BASE_URL`` seam the web BFF
    uses (``compose.prod.yml``). Trailing slash trimmed so path joins are clean.
    """

    return _env("KB_API_BASE_URL", "http://localhost:8000").rstrip("/")


def public_base_url() -> str:
    """RESERVED. Public origin base for a future citation-``url`` derivation.

    No document carries a public origin today, so ``_citation_url`` returns ``""``
    for the whole corpus and this value is unused. It is the seam a future
    ``source_url`` data-model + ingester job wires up. Do NOT point it at the
    login-gated web app or the retired mkdocs site.
    """

    return _env("KB_PUBLIC_BASE_URL", "").rstrip("/")


def mcp_host() -> str:
    """Bind host for uvicorn. Container-friendly default binds all interfaces."""

    return _env("MCP_HOST", "0.0.0.0")


def mcp_port() -> int:
    """Bind port for uvicorn (the MCP endpoint is at ``/mcp`` on this port)."""

    try:
        return int(_env("MCP_PORT", "9000"))
    except ValueError:
        return 9000


def stateless_http() -> bool:
    """Whether to run the Streamable-HTTP transport statelessly.

    Default False (the SDK default): stateful sessions with SSE streaming — what
    the phase's "Streamable-HTTP/SSE" framing and S3's SSE-safe edge routing
    assume, and what a single-container deployment (one replica → automatic
    session affinity) handles cleanly. Set ``MCP_STATELESS_HTTP=1`` to flip to
    stateless (no session affinity) if S3/S4 find edge session-stickiness
    painful; the `search` tool is a pure per-call proxy, so it is correct either
    way. Multi-replica scaling under stateful mode would need sticky sessions or
    an event store — a note for S3/S4, out of scope here.
    """

    return _env("MCP_STATELESS_HTTP", "0").strip().lower() in {"1", "true", "yes", "on"}


# --- transport-security allowlists (DNS-rebinding protection) -----------------
#
# WHY THIS EXISTS: FastMCP auto-enables DNS-rebinding protection with a
# **localhost-only** allowlist whenever its internal `host` is 127.0.0.1/localhost
# (the default). That default returns **`421 Invalid Host header`** to EVERY
# non-localhost caller — both the public edge host `knowledge.hi2vi.com` and the
# internal `knowledge-mcp:9000` dual-reachability path — before the MCP handler
# even runs. `server.py` therefore passes an EXPLICIT `TransportSecuritySettings`
# built from these readers, which keeps the protection ON but widens the allowlist
# to the hosts we actually serve (env-driven, no host hardcoded in code).
#
# MATCHING RULE (mcp==1.28.1, `mcp/server/transport_security.py:_validate_host`):
# a Host is allowed on an **EXACT** string match OR a `base:*` wildcard matched as
# `host.startswith(base + ":")`. Consequences that are easy to get wrong:
#   - a **port-less** host like `knowledge.hi2vi.com` needs an **EXACT** entry — a
#     `knowledge.hi2vi.com:*` pattern would NOT match it.
#   - an internal `knowledge-mcp:9000` (has a port) is covered by `knowledge-mcp:*`.
# Origins: an ABSENT Origin passes (server-side agents send none), so origins are
# secondary; the public origin is still configured for browser-based MCP clients.

# Always-trusted localhost patterns (the image healthcheck + local smoke hit these).
_LOCALHOST_HOSTS = ["127.0.0.1:*", "localhost:*", "[::1]:*"]
_LOCALHOST_ORIGINS = ["http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*"]


def allowed_hosts() -> list[str]:
    """Allowed ``Host`` header values for DNS-rebinding protection.

    Localhost defaults **plus** ``MCP_ALLOWED_HOSTS`` (comma-separated). Read at
    call time (12-factor). Remember the matching rule above: a port-less public
    host needs an EXACT entry (e.g. ``knowledge.hi2vi.com``); a host that carries a
    port needs a ``base:*`` wildcard (e.g. ``knowledge-mcp:*``).
    """

    return _LOCALHOST_HOSTS + _env_list("MCP_ALLOWED_HOSTS")


def allowed_origins() -> list[str]:
    """Allowed ``Origin`` header values for DNS-rebinding protection.

    Localhost defaults **plus** ``MCP_ALLOWED_ORIGINS`` (comma-separated). An absent
    Origin already passes, so this only matters for browser-based MCP clients.
    """

    return _LOCALHOST_ORIGINS + _env_list("MCP_ALLOWED_ORIGINS")
