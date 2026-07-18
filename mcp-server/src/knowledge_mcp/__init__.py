"""knowledge-mcp — knowledge retrieval exposed as agent tools over MCP-over-HTTP.

A thin Model Context Protocol server (official ``mcp`` SDK / FastMCP, Streamable-
HTTP transport) that **proxies** the frozen ``GET /api/search`` REST endpoint and
**forwards the caller's** ``Authorization: Bearer vk_…`` upstream. Retrieval is not
reimplemented; tenant/project corpus scoping is inherited from the existing
``server/api_auth.py`` bearer resolver with no new auth code. The MCP surface sits
*alongside* the frozen ``/api/*`` contract and never modifies it.
"""

__version__ = "0.1.0"
