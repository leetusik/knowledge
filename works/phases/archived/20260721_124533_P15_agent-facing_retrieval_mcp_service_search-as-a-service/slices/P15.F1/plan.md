# P15.F1 — Fix `421 Invalid Host header`: widen the MCP transport-security allowlist

## Why (the bug this fixes)
The P15 deploy went live but `GET https://knowledge.hi2vi.com/mcp` returns **`421 Invalid Host
header`** on every call (verified live; the container is `Up (healthy)` and the edge routes to it
correctly — the server itself rejects the request).

Root cause: `server.py` builds `FastMCP(config.SERVER_NAME, stateless_http=...)` with **no `host`
arg** and **no `transport_security`**. In `mcp==1.28.1`, `FastMCP.__init__` then auto-enables
DNS-rebinding protection with a **localhost-only** allowlist:

```python
# mcp/server/fastmcp/server.py
if transport_security is None and host in ("127.0.0.1", "localhost", "::1"):
    transport_security = TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=["127.0.0.1:*", "localhost:*", "[::1]:*"], ...)
```

FastMCP's internal `host` defaults to `127.0.0.1`, so this fires. Any non-localhost `Host` →
`421` before the MCP handler runs. (`MCP_HOST=0.0.0.0` only sets uvicorn's *bind* host in
`main.py` — a different knob.) P15.S4's smoke only hit `localhost:9000` (the one allowed host),
so this was never caught. It breaks **both** documented paths: the public `knowledge.hi2vi.com`
**and** the internal `knowledge-mcp:9000` dual-reachability path (OpenClaw's prod config).

## Fix approach
Keep DNS-rebinding protection **ON** (conservative — the server forwards a bearer and sits behind
nginx+Cloudflare) but widen the allowlist to the hosts we actually serve, env-driven so no host is
hardcoded in code.

### Host/Origin matching semantics (mcp==1.28.1, `mcp/server/transport_security.py`) — get these right
- `_validate_host`: **exact** match, OR a `base:*` wildcard matched as `host.startswith(base + ":")`.
  → A port-less host like `knowledge.hi2vi.com` needs an **EXACT** entry; a `knowledge.hi2vi.com:*`
  pattern would NOT match it. An internal `knowledge-mcp:9000` is covered by `knowledge-mcp:*`.
- `_validate_origin`: an **absent** Origin passes (server-side agents send none), so origins are
  secondary; still configure the public origin for browser-based MCP clients.
- POST `Content-Type` must be `application/json` — MCP already complies; do not touch.

## Exact changes

### 1. `mcp-server/src/knowledge_mcp/config.py` — add env-driven allowlist readers
Values are read at call time (same 12-factor pattern as the other functions here). Add:
- a `_env_list(name)` helper: `os.environ.get(name, "")` split on `,`, trimmed, empties dropped.
- module constants for the always-trusted localhost patterns:
  - hosts: `["127.0.0.1:*", "localhost:*", "[::1]:*"]`
  - origins: `["http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*"]`
- `allowed_hosts() -> list[str]` = localhost host defaults **+** `_env_list("MCP_ALLOWED_HOSTS")`.
- `allowed_origins() -> list[str]` = localhost origin defaults **+** `_env_list("MCP_ALLOWED_ORIGINS")`.

Docstrings should note *why* (FastMCP's localhost-only default 421s non-localhost callers) and the
exact/`:*` matching rule, so a future reader doesn't re-trip this.

### 2. `mcp-server/src/knowledge_mcp/server.py` — pass explicit transport security
- Add import: `from mcp.server.transport_security import TransportSecuritySettings`.
- Change the module-level construction to:
  ```python
  mcp = FastMCP(
      config.SERVER_NAME,
      stateless_http=config.stateless_http(),
      transport_security=TransportSecuritySettings(
          enable_dns_rebinding_protection=True,
          allowed_hosts=config.allowed_hosts(),
          allowed_origins=config.allowed_origins(),
      ),
  )
  ```
Passing `transport_security` explicitly skips FastMCP's localhost-only auto-branch and uses our
widened allowlist while keeping protection ON. Do not change the tools, `/healthz`, or the app build.

### 3. `compose.prod.yml` — set the prod allowlist on the `mcp` service `environment:` block
Add (next to `KB_API_BASE_URL` / `MCP_STATELESS_HTTP`), with a short comment:
```yaml
      MCP_ALLOWED_HOSTS: "knowledge.hi2vi.com,knowledge-mcp,knowledge-mcp:*"
      MCP_ALLOWED_ORIGINS: "https://knowledge.hi2vi.com"
```
(`knowledge.hi2vi.com` exact = public edge host; `knowledge-mcp` + `knowledge-mcp:*` = internal
dual-reachability path; localhost stays a built-in default from config.py for the image
healthcheck + local smoke.)

### 4. Test — one terse file `mcp-server/tests/test_host_allowlist.py`
Regression guard for this fix. Keep it small (a single test is fine). It should, with
`monkeypatch.setenv("MCP_ALLOWED_HOSTS", "knowledge.hi2vi.com,knowledge-mcp,knowledge-mcp:*")`,
build `TransportSecurityMiddleware(TransportSecuritySettings(enable_dns_rebinding_protection=True,
allowed_hosts=config.allowed_hosts()))` and assert:
- `_validate_host("knowledge.hi2vi.com")` is True  (public, exact)
- `_validate_host("knowledge-mcp:9000")` is True   (internal, `:*` wildcard)
- `_validate_host("localhost:9000")` is True        (localhost default preserved)
- `_validate_host("evil.attacker.com")` is False    (everything else still rejected)

`config.allowed_hosts()` reads env at call time, so no module reload is needed — just set the env
before calling it.

## Executor verification (do these; report exact output)
1. `cd mcp-server && uv run pytest -q` → **all pass** (the existing suite + the new test).
2. Confirm `uv run python -c "import knowledge_mcp.server as s; print('ok')"` imports cleanly
   (catches a bad import / construction).
Do NOT deploy or hit the box — the orchestrator owns the redeploy + public verification.

## Doc impact (append to phase.md — do NOT run doc-new-version)
Append a one-line Doc impact note: *operations.md — the P15 MCP deploy requires
`MCP_ALLOWED_HOSTS` (+ `MCP_ALLOWED_ORIGINS`); FastMCP's localhost-only DNS-rebinding default
returns `421 Invalid Host header` to the public edge host and the internal `knowledge-mcp:9000`
path otherwise. Public host needs an exact allowlist entry; internal uses `knowledge-mcp:*`.*
The phase review consolidates this into a new operations doc version.

## Out of scope
No edge/nginx change (the server-side allowlist fixes both paths; an edge Host-rewrite would fix
only the public path). No change to the frozen `/api/*`. No `vk_`/D13 work.
