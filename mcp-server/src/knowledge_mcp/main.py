"""``knowledge-mcp`` — uvicorn entrypoint for the MCP-over-HTTP server.

Serves the assembled Streamable-HTTP ASGI app (MCP endpoint at ``/mcp`` +
``GET /healthz``) on ``MCP_HOST``/``MCP_PORT``. S3 fronts this with nginx and adds
the container/compose wiring; here it is just a plain uvicorn boot so the service
runs identically in dev and in a container.
"""

from __future__ import annotations

import uvicorn

from . import config
from .server import app


def main() -> None:
    uvicorn.run(app, host=config.mcp_host(), port=config.mcp_port())


if __name__ == "__main__":
    main()
