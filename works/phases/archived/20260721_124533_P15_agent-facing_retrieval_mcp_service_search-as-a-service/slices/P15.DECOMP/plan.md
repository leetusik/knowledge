# Plan — P15.DECOMP: decompose "Agent-facing retrieval MCP service (search-as-a-service)"

## Job

Decompose phase P15 into its middle slices and seed `phase.md` with the breakdown, findings,
constraints, and open questions. You create slice folders (bare — `new-slice` only, never their
`plan.md`) and write this slice's `result.md`. You do NOT commit, do NOT transition any status,
and do NOT run `promote-deferred`/`drop-deferred` (recommend only; the orchestrator applies it).

## Read first

- `works/phases/active/P15/phase.md` and especially `works/phases/active/P15/intent.md` — the
  authoritative statement of what the operator asked for: MCP server over Streamable-HTTP/SSE,
  `search` tool (query → ranked title/snippet/url hits, corpus-scoped by `vk_` credential),
  optional `fetch_document`, dual reachability (internal `changple_shared_network` service name
  AND public `https://knowledge.hi2vi.com`), first consumer = hi2vi OpenClaw CS bot (its P18.S5
  writes its `mcp.servers.knowledge` config against whatever contract this phase ships —
  divergence is fine if the final contract is explicit in this phase's docs).
- `docs/current/architecture.md`, `docs/current/api.md`, `docs/current/backend.md`,
  `docs/current/operations.md` — current durable truth.
- Key source files (verified 2026-07-18, pre-decomposition survey):
  - `server/main.py` — `/api/*` routes live here; `GET /api/search` at ~:301; doc reads
    `GET /api/documents/{id}` ~:289 and `GET /api/documents/by-path/{rel_path}` ~:277;
    201-`url` derivation `{KB_PUBLIC_BASE_URL}/{project}/{date}-{slug}/` at ~:539.
  - `server/search.py` — search logic + `_finalize()` result projection.
  - `server/api_auth.py` — bearer resolution: `KB_API_TOKEN` → tenant #1; `vk_` project key →
    tenant+project scope; session token. Two modes keyed on `DATABASE_URL`.
  - `server/config.py` — env-driven config (`KB_PUBLIC_BASE_URL`, `KB_REQUIRE_READ_AUTH`, ...).
  - `cli/src/knowledge_cli/client.py` — ready-made typed HTTP client for `/api` (incl. `search()`).
  - `compose.prod.yml`, `deploy/knowledge.conf`, `deploy/README.md` — the add-a-service +
    edge-routing pattern (fixed `container_name`, `networks: [changple_shared_network]`,
    `expose` not `ports`, healthcheck; nginx location with `resolver 127.0.0.11` + variable
    `proxy_pass`; house rules documented in-file).

## Survey findings to build on (verify as you go, record in phase.md)

- **Greenfield MCP**: no MCP code exists anywhere in the repo. This is a new service.
- **`/api/search` response** has `title`, `snippet` (with `<mark>` wrappers), `rel_path` — but
  **no `url` field**. The MCP `search` tool must derive each hit's `url`.
- **URL caveat**: the canonical `{KB_PUBLIC_BASE_URL}/{project}/{date}-{slug}/` shape is currently
  **cosmetic** — the mkdocs site was retired in P14 and that path no longer resolves; the web app
  reads docs at `/documents/{db_id}`. Which URL the MCP hits should carry is a real decision this
  decomposition must surface (and an implementation slice must resolve/record).
- **Auth reuse**: a thin MCP service that proxies `http://knowledge-api:8000` and forwards the
  caller's `Authorization: Bearer vk_...` gets tenant/project corpus scoping for free (the web
  BFF's `KB_API_BASE_URL` pattern). Alternative (importing `server/` modules in-process) couples
  the new service to the backend's internals. Weigh and record the choice rationale.
- **Packaging precedent**: Python 3.12 + uv; `cli/` = own-pyproject src-layout package precedent;
  `web/` = own Dockerfile + compose service + edge location precedent.
- **Frozen contract**: `/api/*` REST is frozen and consumed elsewhere — the MCP server sits
  ALONGSIDE it, never modifies it.

## Do

1. Decide the middle-slice breakdown — your call, guided by intent. Likely 3–5 implementation
   slices; a plausible shape (adjust as your research dictates):
   - MCP service package scaffold + Streamable-HTTP transport + `search` tool wrapping the
     internal API with bearer pass-through.
   - `fetch_document` tool + the hit-`url` decision + response size caps.
   - Containerize: Dockerfile + `compose.prod.yml` service + edge `location` in
     `deploy/knowledge.conf` + dual-reachability smoke.
   - Versioned, stable tool-contract doc + first-consumer (OpenClaw) handshake / E2E smoke.
2. Create each slice: `python3 scripts/workflow.py new-slice --phase P15 --slice P15.Sn
   --name "..." --kind implementation --risk <low|medium|high> --order <n>` (use
   `--depends-on` where real). **Bare folders only — never pre-fill another slice's `plan.md`.**
   Set `--risk` deliberately: it selects the executor tier and is the phase's main cost lever;
   `low` ONLY for fully mechanical work. New package + auth + MCP protocol + edge changes are
   NOT mechanical — expect mostly `medium`/`high`.
3. Seed `phase.md`:
   - **Decomposition**: the breakdown with per-slice rationale and risk reasoning.
   - **Findings & Notes**: the survey facts above plus anything new you verify (exact
     `/api/search` shapes, auth specifics, SDK options for Streamable-HTTP MCP in Python).
   - **Constraints**: frozen `/api/*`; stable versioned tool contract (consumers pin to it);
     dual reachability; lean tests per house rules; MCP server alongside, not replacing, REST.
   - **Open Questions**: e.g. hit-`url` shape (cosmetic canonical path vs `/documents/{id}` vs
     ship rel_path+flag), MCP SDK choice, `fetch_document` in v1 or not — anything the
     implementation slices must resolve.
4. **Reconcile D6** (`works/deferred/open/D6/` — "Paid-plan retriever endpoint for external AI
   agents"): recommend in `result.md` whether to promote it into P15 or drop it as superseded
   (with a drop-reason draft). Do not run the deferred commands yourself.
5. Write `result.md` (free-form): what you created, the breakdown rationale, the D6
   recommendation, and anything the orchestrator should relay to the operator.

## Return

A structured verdict: `done` (with a summary of slices created) or `escalate`/`needs_operator`/
`blocked` with findings. Remember: no commits, no status transitions, `new-slice` is the only
workflow mutation you may run.
