# P15.S4 — Stable versioned tool contract + OpenClaw first-consumer E2E

## Context

S1–S3 built and deployed the MCP surface (two tools on `/mcp` over Streamable-HTTP, dual-reachable,
stateless). **S4 finalizes the phase**: (1) pin an explicit, versioned, in-repo **contract artifact** —
the handshake surface hi2vi P18.S5 points its `mcp.servers.knowledge` at — and (2) prove it with a
**first-consumer E2E**: an OpenClaw-shaped MCP client connects over Streamable-HTTP with a bearer, calls
the tools, and gets grounded, citable hits. The hard protocol/auth/infra work is done; this slice
formalizes and validates, and records the durable-truth notes the REVIEW consolidates.

**Two phase Open Questions are resolved here (with defaults — no operator input needed):**
- **Corpus scoping (hi2vi CS credential).** A `vk_` resolves to a **tenant** and search scopes to the
  *whole tenant's* corpus (`server/main.py:316` passes `_tenant_filter(ctx)` = `ctx.tenant_id`, **not**
  the key's bound project). So **one tenant-scoped `vk_` already sees all of hi2vi's projects**
  (`hi2vi` + `hi2vi_web`); the `search` `project` param optionally narrows. No two-key scheme needed.
  Document this; final key provisioning is coordinated with hi2vi P18.S5 (operator/hi2vi side).
- **Versioning scheme.** Contract **v1**, **additive-only** (new tools / optional params / new output
  fields are non-breaking; a breaking change bumps the version). Surface `contract_version` in `/healthz`
  so a consumer/monitor can read it. (Note: MCP `serverInfo.version` advertises the *SDK* version
  `1.28.1`, which is distinct from the contract version — the artifact says so.)

## What to build

**1. `mcp-server/CONTRACT.md` — the pinnable, versioned contract artifact** (the durable handshake hi2vi
P18.S5 targets). Sections:
- **Transport & endpoint:** MCP Streamable-HTTP at `/mcp`; stateless deployed server.
- **Reachability:** internal `http://knowledge-mcp:9000/mcp` (co-tenant, no edge hop) + public
  `https://knowledge.hi2vi.com/mcp`.
- **Auth:** send `Authorization: Bearer vk_<project key>` as an HTTP header on requests; `initialize`
  needs none, tool calls do. Forwarded verbatim upstream for corpus scoping. Client note: with the
  Python `mcp` SDK, set the header via the `httpx_client_factory` (the `headers=`/`auth=` params are
  deprecated in 1.28.1); OpenClaw sets it via its own `mcp.servers.knowledge` config.
- **Tools (full input/output schema):**
  - `search(query, project?, limit=5)` → `{query, total, results:[{title, snippet, url, id, rel_path}]}`;
    `<mark>` stripped; `limit` clamped ≤20; **`url` empty until `source_url` lands (D13)** — treat empty
    as "no citation link," not an error.
  - `fetch_document(id? | rel_path?)` (exactly one) → `{id, rel_path, title, project, date, tags, url,
    markdown, truncated, total_chars}`; char-capped (default 20000) — `truncated`/`total_chars` signal a
    partial body; errors 404 "not found", 401 "unauthorized".
- **Corpus scoping semantics** (tenant-wide; `project` narrows) + the hi2vi one-key recommendation.
- **Versioning & stability:** contract v1, additive-only rules, `/healthz.contract_version`, the
  `/api/*`-frozen guarantee this wraps.

**2. `mcp-server/scripts/e2e_smoke.py` — a committed, path-agnostic OpenClaw-shaped verifier** (a smoke
script, sibling in spirit to `scripts/onboarding_smoke.py`, NOT a unit test):
- Args/env: `--url` (default `http://localhost:9000/mcp`), `--key` (the bearer), optional `--query`.
- Connect with `streamablehttp_client(url, httpx_client_factory=<factory injecting Authorization: Bearer
  {key}>)` + `ClientSession`; `initialize()`; `list_tools()` → assert `search` + `fetch_document`
  present; `call_tool("search", {query, limit})` → assert ≥1 hit shaped `{title, snippet, url, id,
  rel_path}`; `call_tool("fetch_document", {id: <first hit id>})` → assert `markdown` returned. Exit
  0/nonzero with a clear pass/fail line (the `onboarding_smoke.py` reporting style).
- **The one uncertain API** (why any snags escalate): the `httpx_client_factory` header injection.
  Likely path: a factory `partial(create_mcp_http_client, headers={"Authorization": f"Bearer {key}"})`
  from `mcp.shared._httpx_utils`, or a tiny custom factory returning an `httpx.AsyncClient(headers=…)`
  matching the `McpHttpClientFactory` protocol. Confirm against `mcp==1.28.1`; if it differs, adapt.

**3. `mcp-server/src/knowledge_mcp/server.py` — add `contract_version` to `/healthz`** (+ a
`CONTRACT_VERSION = "1"` constant, in `config.py` or `server.py`). Tiny, additive; keep `{status, service}`.

## Run the E2E locally (direct path — lean, no docker/postgres required)
Prove the full chain client → mcp → api → grounded hit against a **local legacy-mode api** (simplest
faithful stack; tenant/`vk_` scoping is already proven by `scripts/onboarding_smoke.py` and the S1/S2
forward-bearer design — the MCP layer forwards *any* bearer):
1. Run the api locally (`uvicorn server.main:app --port 8000`, no `DATABASE_URL` → legacy mode, set
   `KB_API_TOKEN=<t>`), `POST /api/documents` one doc with that bearer so search has content.
2. Run the mcp server (`KB_API_BASE_URL=http://localhost:8000 uv run knowledge-mcp`).
3. `python mcp-server/scripts/e2e_smoke.py --url http://localhost:9000/mcp --key <t>` → both tools
   return grounded results. Report what ran.
If the accounts stack is easy, optionally run the true `vk_` path (compose up + `onboarding_smoke.py`
to mint a `vk_` + write a doc) and point the smoke at it. Document exactly what was exercised.

**Public-path + real-hi2vi-`vk_` run is operator post-deploy verification** (S3 established the box
deploy is the operator's manual step). Not a blocker to S4 — the same `e2e_smoke.py` re-runs against
`https://knowledge.hi2vi.com/mcp` with a real key after deploy. State this in CONTRACT.md + result.md.

## Reuse (don't reinvent)
- `scripts/onboarding_smoke.py` — the base-URL/arg-parsing + pass/fail reporting style, and (if using the
  `vk_` path) the exact signup→project→credential→write seed sequence.
- `mcp-server/src/knowledge_mcp/server.py` (tool schemas, `/healthz`) + `phase.md`'s S1/S2/S3 notes —
  the authoritative source for every field/behavior the CONTRACT.md must state (don't re-derive).
- The installed `mcp` client: `mcp.client.streamable_http.streamablehttp_client`, `mcp.ClientSession`,
  `mcp.shared._httpx_utils.create_mcp_http_client` — no new dependency (the SDK ships the client).

## Decisions to record (append one-line "Doc impact" notes to `phase.md`; REVIEW consolidates → api + architecture + operations docs)
- Stable **contract v1** for the knowledge MCP service (tools `search` + `fetch_document`, Streamable-HTTP
  `/mcp`, `Authorization: Bearer vk_` auth, dual reachability), pinned in `mcp-server/CONTRACT.md`;
  additive-only; `/healthz.contract_version`.
- Corpus scoping = tenant-wide per `vk_` (`project` narrows); one hi2vi key covers `hi2vi` + `hi2vi_web`.
- `e2e_smoke.py` first-consumer verifier (direct path proven locally; public path = operator post-deploy).

## Verification (lean — house rule)
- `cd mcp-server && uv run pytest -q` still green (the `/healthz` edit doesn't regress the 10 tests; add
  at most one terse assertion that `/healthz` now carries `contract_version`).
- Run `e2e_smoke.py` locally as above → both tools return grounded results (report the output).
- `python3 scripts/workflow.py validate` (orchestrator, state integrity).

## Out of scope
- `source_url` populating `url` → **deferred D13**.
- Actual box deploy + public-path E2E with a real hi2vi key → **operator** (post-deploy).
- Any `/api/*` change → forbidden (frozen).

## Executor
Risk `medium` → **`slice-executor-mid`**. Formalization + validation on the finished S1–S3 surface; the
only uncertain bit is the client `httpx_client_factory` header injection (guidance above). Escalate if the
local E2E stack or the client-auth mechanism proves materially deeper than described rather than guessing.
