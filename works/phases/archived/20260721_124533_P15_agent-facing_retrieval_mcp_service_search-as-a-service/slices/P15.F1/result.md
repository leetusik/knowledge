# P15.F1 result — widen the MCP transport-security allowlist (fix `421 Invalid Host header`)

## What the bug was
The deployed `knowledge-mcp` server returned `421 Invalid Host header` to every
non-localhost caller. `server.py` built `FastMCP(...)` with no explicit
`transport_security`, so in `mcp==1.28.1` FastMCP auto-enabled DNS-rebinding
protection with a **localhost-only** allowlist (its internal `host` defaults to
`127.0.0.1`). That rejected both the public edge host `knowledge.hi2vi.com` and the
internal `knowledge-mcp:9000` dual-reachability path before the MCP handler ran.
P15.S4's smoke only hit `localhost:9000` (the one allowed host), so it was missed.

## Changes made (exactly per plan.md)

1. **`mcp-server/src/knowledge_mcp/config.py`**
   - Added `_env_list(name)` helper — `os.environ.get(name, "")` split on `,`, trimmed, empties dropped.
   - Added module constants `_LOCALHOST_HOSTS = ["127.0.0.1:*", "localhost:*", "[::1]:*"]`
     and `_LOCALHOST_ORIGINS = ["http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*"]`.
   - Added `allowed_hosts()` = localhost host defaults + `_env_list("MCP_ALLOWED_HOSTS")`.
   - Added `allowed_origins()` = localhost origin defaults + `_env_list("MCP_ALLOWED_ORIGINS")`.
   - Read at call time (12-factor). Docstrings capture *why* (FastMCP's localhost-only
     default 421s non-localhost callers) and the exact/`:*` matching rule.

2. **`mcp-server/src/knowledge_mcp/server.py`**
   - Added `from mcp.server.transport_security import TransportSecuritySettings`.
   - Changed the module-level `FastMCP(...)` construction to pass an explicit
     `transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=True,
     allowed_hosts=config.allowed_hosts(), allowed_origins=config.allowed_origins())`.
     This skips FastMCP's localhost-only auto-branch and keeps protection ON with the
     widened allowlist. Tools, `/healthz`, and the app build are untouched.

3. **`compose.prod.yml`** (the `mcp` service `environment:` block)
   - `MCP_ALLOWED_HOSTS: "knowledge.hi2vi.com,knowledge-mcp,knowledge-mcp:*"`
   - `MCP_ALLOWED_ORIGINS: "https://knowledge.hi2vi.com"`
   - With a comment explaining the exact-vs-`:*` matching rule and why localhost stays a
     built-in config.py default (image healthcheck + local smoke).

4. **`mcp-server/tests/test_host_allowlist.py`** (new, terse — one test)
   - With `monkeypatch.setenv("MCP_ALLOWED_HOSTS", "knowledge.hi2vi.com,knowledge-mcp,knowledge-mcp:*")`,
     builds `TransportSecurityMiddleware(TransportSecuritySettings(enable_dns_rebinding_protection=True,
     allowed_hosts=config.allowed_hosts()))` and asserts `_validate_host`:
     `knowledge.hi2vi.com` True (public exact), `knowledge-mcp:9000` True (internal `:*` wildcard),
     `localhost:9000` True (localhost default preserved), `evil.attacker.com` False (rejected).

## Matching semantics — verified against the SDK
Confirmed in `mcp-server/.venv/.../mcp/server/transport_security.py:_validate_host`:
exact string match first, then for each allowlist entry ending in `:*`, `host.startswith(base + ":")`.
So the port-less public host `knowledge.hi2vi.com` is matched by its **exact** entry (a
`knowledge.hi2vi.com:*` pattern would NOT match it), and `knowledge-mcp:9000` is matched by
the `knowledge-mcp:*` wildcard. The compose list also carries a bare `knowledge-mcp` exact
entry (covers a port-less internal Host, harmless). Origin validation lets an absent Origin
pass, so server-side agents (which send no Origin) are unaffected; the public origin is
configured for browser-based clients.

## Verification (run, exact output)

```
$ cd mcp-server && uv run pytest -q
...........                                                              [100%]
=============================== warnings summary ===============================
tests/test_search_tool.py:22
  .../tests/test_search_tool.py:22: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient
11 passed, 1 warning in 0.17s
```
(11 passed = the prior 10-case suite + the 1 new host-allowlist test. The lone warning is a
pre-existing Starlette/httpx deprecation from `test_search_tool.py`, unrelated to this fix.)

```
$ cd mcp-server && uv run python -c "import knowledge_mcp.server as s; print('import ok')"
import ok
```
(Proves the FastMCP construction with the new `transport_security` arg is valid.)

`python3 scripts/workflow.py validate` → `Workflow validation passed.` (state integrity).

## For the orchestrator (redeploy + verification)
- No code/edge/nginx changes beyond the four files above. `/api/*` untouched (frozen).
- On redeploy, the `mcp` service picks up `MCP_ALLOWED_HOSTS` / `MCP_ALLOWED_ORIGINS`
  from `compose.prod.yml` — no box `.env` change needed (these are non-secret literals).
- Public verification (owner: orchestrator, post-deploy): `GET https://knowledge.hi2vi.com/mcp`
  should now return the routed MCP response (bare GET → 406 `"Client must accept
  text/event-stream"`) rather than `421`; and re-run `mcp-server/scripts/e2e_smoke.py`
  against `https://knowledge.hi2vi.com/mcp` with a real hi2vi `vk_` key, plus the internal
  `http://knowledge-mcp:9000/mcp` path.
- I did NOT deploy, ssh, hit any endpoint, run `doc-new-version`, commit, or change any
  slice/phase status.

## Deviations
None — implemented exactly as plan.md specified.
