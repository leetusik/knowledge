# P15.S4 result — stable versioned contract + first-consumer E2E

**Status: done.** The phase's final middle slice formalized and validated the S1–S3 MCP
surface — no tool/schema change, no `/api/*` touch, no deploy. Three deliverables plus a
tiny additive edit, both phase Open Questions resolved, and the first-consumer E2E proven
locally.

## What was built

1. **`mcp-server/CONTRACT.md`** — the pinnable, versioned contract artifact (the handshake
   surface hi2vi P18.S5 points `mcp.servers.knowledge` at). Sections: Transport & endpoint
   (Streamable-HTTP `/mcp`, stateless deploy, liveness), Reachability (internal
   `knowledge-mcp:9000` + public `https://knowledge.hi2vi.com/mcp`), Auth (`Authorization:
   Bearer` header, `initialize` needs none / tool calls do, forwarded verbatim, plus the
   Python-SDK `httpx_client_factory` client note), full input/output **Tools** schema for
   `search` and `fetch_document` (every field/behavior taken from `phase.md`'s S1/S2/S3
   notes, not re-derived), Corpus scoping, Versioning & stability, and a Verification
   section. All fields cross-checked against `server.py`.
2. **`mcp-server/scripts/e2e_smoke.py`** — a committed, path-agnostic OpenClaw-shaped MCP
   client verifier (a smoke, sibling in spirit to `scripts/onboarding_smoke.py`, not a unit
   test). `--url` (default `http://localhost:9000/mcp`), `--key` (bearer), `--query`. It
   `initialize`s, `list_tools()` (asserts both tools), `call_tool("search")` (asserts ≥1 hit
   in the `{title, snippet, url, id, rel_path}` shape), `call_tool("fetch_document", {id})`
   (asserts `markdown`), and prints a `PASS`/`FAIL` line with exit 0/nonzero.
3. **`/healthz` now carries `contract_version`** + a `CONTRACT_VERSION = "1"` constant
   (`config.py`). `/healthz` → `{"status":"ok","service":"knowledge","contract_version":"1"}`
   — `{status, service}` preserved, additive only. One terse test assertion added.

## Resolved open questions

- **Corpus scoping (was an Open Question / phase decision).** A `vk_` scopes search to the
  **whole tenant's** corpus (`server/main.py` filters by `tenant_id`, not the key's bound
  project), so **one tenant-scoped hi2vi `vk_` already sees both `hi2vi` + `hi2vi_web`**;
  the `search` `project` param narrows. No two-key scheme. Documented in CONTRACT.md;
  actual key provisioning is hi2vi P18.S5 / the operator's job.
- **Versioning scheme.** Contract **v1, additive-only**; `CONTRACT_VERSION = "1"` surfaced
  at `/healthz`; explicitly distinct from MCP `serverInfo.version` (the SDK release
  `1.28.1`). Documented in CONTRACT.md.
- **The one genuinely uncertain API — the E2E client's bearer injection.** RESOLVED against
  the installed `mcp==1.28.1`: the transport's `headers=`/`auth=` are deprecated and
  **ignored** (they never reach the wire), so the bearer is set on the underlying
  `httpx.AsyncClient` via `streamablehttp_client(url, httpx_client_factory=…)`.
  **Empirically-verified gotcha:** the plan's suggested
  `partial(create_mcp_http_client, headers={...})` **silently drops the auth** —
  `streamablehttp_client` calls the factory with `headers=None`, and a functools.partial
  call-time keyword *overrides* the bound one (confirmed: the resulting client had no
  Authorization header). The working path is a **custom factory that MERGES** the header
  (`e2e_smoke.py:_bearer_factory`). No new dependency; the SDK ships the client.

## Validation — commands run and outcomes

- `cd mcp-server && uv run pytest -q` → **10 passed** (the pre-existing suite plus the one
  new `/healthz.contract_version` assertion; no regression).
- **Local E2E (direct path), PASSED.** Exact stack:
  1. api (legacy mode, from repo root):
     `KB_ROOT=<scratch> KB_API_TOKEN=e2e-master-token KB_GIT_COMMIT=false
     KB_STARTUP_REINDEX=false .venv/bin/uvicorn server.main:app --host 127.0.0.1 --port 8000`
     → `/healthz` ok, `documents: 0`.
  2. `POST /api/documents` one doc (bearer `e2e-master-token`) → `201`, `id=1`; direct
     `GET /api/search?q=retrieval` → 1 hit (mode `bm25`), `GET /api/documents/1` → markdown.
  3. mcp server:
     `KB_API_BASE_URL=http://127.0.0.1:8000 MCP_STATELESS_HTTP=1 MCP_HOST=127.0.0.1
     MCP_PORT=9000 uv run knowledge-mcp` → `/healthz` →
     `{"status":"ok","service":"knowledge","contract_version":"1"}`.
  4. `python mcp-server/scripts/e2e_smoke.py --url http://127.0.0.1:9000/mcp --key
     e2e-master-token --query retrieval` →

     ```
     PASS — MCP E2E ok against http://127.0.0.1:9000/mcp (SDK serverInfo knowledge 1.28.1);
     search -> 1 hit(s), first id=1 title='Vector index notes for retrieval';
     fetch_document -> 207 chars (truncated=False)
     exit=0
     ```

  This proves the full client → mcp → `/api` → grounded-hit chain. Search ran in **bm25
  mode** (no Gemini key locally — the hybrid vector signal is absent but irrelevant to the
  chain proof). The MCP layer forwards *any* bearer, so legacy+master is a faithful proof;
  the true `vk_` tenant scoping is already proven by `scripts/onboarding_smoke.py` + S1/S2's
  forward-bearer design. Both local servers were shut down after the run; the scratch
  `KB_ROOT` was used so the real repo `docs/`/`data/` were untouched, and `KB_GIT_COMMIT=false`
  prevented any commit from the write path.

_Not run (per plan): `python3 scripts/workflow.py validate` is the orchestrator's check._

## For the REVIEW slice

- **Doc impact (3 notes appended to `phase.md`):** contract v1 (api + architecture),
  corpus scoping = tenant-wide (api + architecture), `e2e_smoke.py` first-consumer verifier
  (operations). The durable-truth also spans the S1–S3 notes already in `phase.md`'s Doc
  impact list; the review consolidates the whole phase into api + architecture + operations
  doc versions.
- Durable cross-slice notes (contract-v1 summary, corpus-scoping resolution, the client-auth
  gotcha, the E2E result, and what remains for the operator) are appended to `phase.md`'s
  Findings & Notes under "S4 pinned the contract…".

## For the operator (post-deploy)

The **public-path + real-hi2vi-`vk_` run is operator post-deploy verification** (this slice
did not reach the box). After the manual Production Deploy of the `knowledge-mcp` container +
edge routing (S3), re-run the same script against the public path with a real hi2vi `vk_`:

```sh
python mcp-server/scripts/e2e_smoke.py --url https://knowledge.hi2vi.com/mcp --key vk_...
```

Also outstanding (out of S4 scope): **D13** (populate `url` via `source_url`; empty `url`
today is contract-documented as "no citation link, not an error") and the final hi2vi `vk_`
provisioning (hi2vi P18.S5).

## Deviations from plan

- The plan suggested `partial(create_mcp_http_client, headers={...})` as the "likely" auth
  factory. It **does not work** (drops the bearer, as verified) — I used the plan's stated
  fallback, a custom merging factory matching the `McpHttpClientFactory` protocol. This is
  within the plan's intent (it explicitly said "confirm against the installed SDK; adapt if
  it differs"), not a scope change.

## Files changed

- `mcp-server/CONTRACT.md` (new)
- `mcp-server/scripts/e2e_smoke.py` (new)
- `mcp-server/src/knowledge_mcp/config.py` (added `CONTRACT_VERSION`)
- `mcp-server/src/knowledge_mcp/server.py` (`/healthz` now returns `contract_version`)
- `mcp-server/tests/test_search_tool.py` (one terse `/healthz` assertion)
- `works/phases/active/P15/phase.md` (Doc impact ×3 + S4 Findings block)
