# knowledge-mcp — the MCP-over-HTTP retrieval server (P15.S3).
#
# Unlike the api image (which is packaging-ONLY and bind-mounts the app + /repo at
# runtime, and so needs git/ssh/tzdata), this is a SELF-CONTAINED installable
# package: the image ships the interpreter, the frozen deps, AND the knowledge_mcp
# code + its `knowledge-mcp` console script. The server is a thin proxy of the
# frozen /api/* — it holds NO secrets (the only credential is the caller's inbound
# bearer, forwarded per-request) and does NO git/commits/date-math, so NONE of the
# api image's apt packages (git, openssh-client, tzdata) are needed here.
FROM python:3.12-slim

# uv binary — used only to resolve+install the locked deps and the package into the
# system env. Pinned to the SAME uv version as the api image (the host uv that
# produced uv.lock) so the build is byte-reproducible; a bump is deliberate + visible.
COPY --from=ghcr.io/astral-sh/uv:0.8.14 /uv /usr/local/bin/uv

WORKDIR /app

# 1) Install the runtime deps from the FROZEN lock into the system interpreter —
#    the api image's exact `uv export --frozen --no-dev --no-emit-project` pattern.
#    `--no-emit-project` omits knowledge-mcp itself (the project), so this layer is
#    ONLY the third-party deps and stays cached across code-only changes.
COPY pyproject.toml uv.lock ./
RUN uv export --frozen --no-dev --no-emit-project -o /tmp/req.txt \
    && uv pip install --system -r /tmp/req.txt \
    && rm -f /tmp/req.txt

# 2) Install the package itself (the knowledge_mcp code + the `knowledge-mcp`
#    console script) with --no-deps: the deps are already pinned+installed above, so
#    this only builds+installs THIS wheel from src/. Copied after the deps layer so a
#    code change never busts the (slow) dep-install layer.
COPY src/ ./src/
RUN uv pip install --system --no-deps .

# Run unprivileged: nothing here needs root (no bind mount, no git). The console
# script + interpreter live in /usr/local and are world-executable.
RUN useradd --create-home --uid 10001 appuser
USER appuser

# The MCP endpoint (/mcp) + GET /healthz are served on 9000 (MCP_PORT default).
# Documentary only — the compose service uses `expose`, never a host `ports` publish.
EXPOSE 9000

# Container health for `docker compose ps` + the deploy health-gate (deploy/deploy.sh
# wait_healthy mcp reads it via `docker inspect`). curl is absent in the slim image,
# so probe with the image's own python (the api image's exact urllib pattern), on the
# UNAUTHENTICATED /healthz. Short start-period: no startup reindex, boot is near-instant.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0) if urllib.request.urlopen('http://127.0.0.1:9000/healthz', timeout=3).status==200 else sys.exit(1)"]

# The console script (knowledge_mcp.main:main) -> uvicorn.run(app, host=0.0.0.0,
# port=9000): the Streamable-HTTP session-manager lifespan starts, /mcp + /healthz
# go live. Statefulness is env-driven (MCP_STATELESS_HTTP, set to 1 by the compose
# service) — the image itself is mode-agnostic.
CMD ["knowledge-mcp"]
