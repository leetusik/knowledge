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
