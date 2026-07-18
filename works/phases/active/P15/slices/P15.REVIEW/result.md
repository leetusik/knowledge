# P15.REVIEW result — phase review (validate all slices + consolidate durable docs)

**Verdict: `pass`.** All four middle slices (S1 scaffold+`search`, S2 `fetch_document`+caps,
S3 containerize+SSE-safe edge+dual reachability, S4 versioned contract+E2E) validate together,
the phase meets its objective / `intent.md` / constraints, and the accumulated "Doc impact"
notes are consolidated into four new doc versions (api, architecture, operations, product).
No source was touched (review slice); nothing is committed (the orchestrator records the
verdict with `review-phase` and commits).

## 1. Validation — all slices together (the consolidated behavioral gate)

| Check | Command | Outcome |
|---|---|---|
| Package suite (S1+S2+S4) | `cd mcp-server && uv run pytest -q` | **10 passed** (1 StarletteDeprecationWarning, benign) |
| Deploy config (S3) | `COMPOSE_BAKE=false docker compose -f compose.prod.yml config -q` (dummy `.env`) | **VALID** — parses clean; the `mcp` service (`container_name: knowledge-mcp`, `expose 9000`, `KB_API_BASE_URL: http://knowledge-api:8000`, `MCP_STATELESS_HTTP="1"`) is present |
| Deploy scripts (S3) | `bash -n deploy/deploy.sh deploy/oracle-production-deploy-remote.sh` | **OK** (no syntax errors) |
| Edge house rules (S3) | spot-check `deploy/knowledge.conf` `location /mcp` | **Honored** — variable `proxy_pass http://$knowledge_mcp_upstream:9000` (request-time DNS re-resolution), **NO per-location `proxy_set_header`** (inherits the full server-level set incl. HTTP/1.1 keep-alive), `proxy_buffering off`, `proxy_read_timeout`/`proxy_send_timeout 3600s`; no `default_server`/IPv6/`limit_req_zone` |
| First-consumer E2E (S4) | fresh re-run: scratch legacy-mode api + 1 POSTed doc → local stateless mcp → `mcp-server/scripts/e2e_smoke.py --url http://127.0.0.1:9000/mcp --key <t> --query retrieval` | **PASS** (see below) |
| State integrity | `python3 scripts/workflow.py validate` (before + after consolidation) | **passed** both times |
| Docs rebuild | `python3 scripts/workflow.py rebuild-docs` + `docs` | new latest versions present; current docs regenerated |

**Fresh consolidated E2E (direct/local path) — re-run at review, PASS:**
- api healthy (legacy mode, scratch `KB_ROOT`, `KB_GIT_COMMIT=false`, master bearer) → `POST /api/documents` → **201** → direct `GET /api/search?q=retrieval` → **1 hit**.
- mcp `/healthz` → `{"status":"ok","service":"knowledge","contract_version":"1"}`.
- `e2e_smoke.py` → `PASS — MCP E2E ok … (SDK serverInfo knowledge 1.28.1); search -> 1 hit(s), first id=1 title='Vector index notes for retrieval'; fetch_document -> 124 chars (truncated=False)`, exit 0.
- Chain proven: client → mcp → `/api` → grounded, citable hit; `initialize` (no bearer), `list_tools` → both tools, `search` in the `{title, snippet, url, id, rel_path}` shape, `fetch_document(id)` → markdown. Ran in bm25 mode (no Gemini key locally — the hybrid vector signal is absent but irrelevant to the chain proof). Both scratch servers were torn down; no leftover processes.
- The **public-path + real-hi2vi-`vk_` run remains operator post-deploy verification** (this review did not reach the box, by design).

## 2. Review against objective / intent / constraints

**Objective — MET.** An MCP-over-HTTP retrieval service: `search` (+ `fetch_document`) →
ranked, corpus-scoped, citable hits; `vk_`-bearer auth over Streamable-HTTP (`/mcp`); **dual
reachability** (internal `knowledge-mcp:9000` + public `https://knowledge.hi2vi.com/mcp`); a
**stable, versioned tool contract v1** (`mcp-server/CONTRACT.md`, `CONTRACT_VERSION="1"` at
`/healthz`); backed by the **frozen `/api/search` + embeddings** (retrieval not rebuilt);
first consumer = hi2vi OpenClaw. Realizes/subsumes deferred **D6**.

**Constraints — HELD (verified, not assumed):**
- **`/api/*` frozen.** `git diff be488f7..787498f -- server/` is **empty** — the phase changed **no `server/` route/contract**. All changes are confined to `mcp-server/`, `deploy/`, `.github/workflows/`, `compose.prod.yml`, and docs/`works/` metadata (verified via `git diff --stat`).
- **Single-writer invariant untouched** — the MCP service only reads (`search` + `fetch_document`); no new writer, never touches the content write lock.
- **Lean tests** — one terse suite (`mcp-server/tests/test_search_tool.py`, 10 cases) + one committed E2E smoke script; no fixture sprawl.
- **Edge house rules honored** (see §1) and **MCP sits alongside REST**, not replacing it.
- **`url` reserved-empty (D13)** — documented in the contract + docs as "no citation link, not an error," empty for the whole current corpus until a future `source_url` job.
- **Corpus scoping resolved** — tenant-wide per `vk_` (upstream filters by `tenant_id`), so one hi2vi `vk_` covers `hi2vi` + `hi2vi_web`; `project` narrows. No two-key scheme.

**Deferred-job disposition (no action needed at review):** **D6** dropped as superseded at
DECOMP (P15 subsumes it), **D12** added at DECOMP, **D13** (`source_url`) added at S1.

No defect surfaced → `pass` (not `changes_requested`/`blocked`).

## 3. Durable-doc consolidation (on the pass)

Four new versions created (`doc-new-version --source P15.REVIEW`, edited in-place, `rebuild-docs`):

| Doc | New version | What P15 truth was folded in |
|---|---|---|
| **api** | `v0011` | New Status paragraph + a full **"Agent-facing MCP retrieval service: tool contract v1 (P15)"** section — transport/endpoint (`/mcp`, Streamable-HTTP, stateless deploy, 406 liveness), dual reachability, forward-the-bearer auth, full `search`/`fetch_document` I/O schemas + error mapping, `url` reserved-empty (D13), tenant-wide corpus scoping, additive-only v1 versioning + `/healthz.contract_version` — alongside the frozen REST `/api/*`. |
| **architecture** | `v0012` | Status clause + **"Agent-facing MCP retrieval service: proxy-and-forward-bearer (P15)"** section — the `mcp-server/`/`knowledge_mcp` package boundary (named to avoid shadowing the `mcp` SDK), the proxy-and-forward-bearer decision (no retrieval rebuilt, scoping inherited, in-process alt rejected), Streamable-HTTP stateless deploy, contract v1, single-writer untouched; + a Roadmap "P15 delivered" bullet. |
| **operations** | `v0016` | Status clause + env-var rows (`MCP_STATELESS_HTTP`, `MCP_FETCH_MAX_CHARS`, `MCP_HOST`/`MCP_PORT`, mcp `KB_API_BASE_URL`) + **"MCP retrieval service deploy (P15)"** section — `mcp-server/Dockerfile`, the `mcp`/`knowledge-mcp` compose service, SSE-safe edge `location /mcp`, three-service health-gate + `/mcp` routed-liveness smoke, dual reachability, and the `e2e_smoke.py` verifier + **operator post-deploy public-path run**. |
| **product** | `v0006` | Status + Product-Direction updates recasting the retriever from "deferred (P15)" to a **delivered agent-facing "search as a service" surface** (fourth distribution surface, first agent-to-agent one); a new Target-Users bullet (any AI agent, first = OpenClaw); a **"Agent-facing retrieval product surface (P15)"** paragraph — realizes/subsumes D6, dogfooded by hi2vi's OpenClaw, **billing/plan-gating still future**. |

Only docs were written; `docs/current/*.md` are regenerated snapshots (never hand-edited).
Note: the `operations` and `product` version summaries were shortened from the plan's phrasing
because the auto-generated slug filename exceeded the OS 255-byte filename limit (the first
`product` attempt was removed + recreated with a short summary; a clean single `v0006`).

## What the operator must know (still outstanding after this phase)

1. **Public-path E2E (operator post-deploy).** After the manual Production Deploy of the `knowledge-mcp` container + edge routing, re-run `python mcp-server/scripts/e2e_smoke.py --url https://knowledge.hi2vi.com/mcp --key vk_...` with a **real hi2vi `vk_` key**. This review proved only the direct/local path.
2. **D13 — `url` population.** Every hit's/`fetch`'s `url` is `""` corpus-wide until a future `source_url` data-model + ingester job lands (documented as "no citation link," additive, stays contract v1).
3. **hi2vi `vk_` provisioning (hi2vi P18.S5).** The OpenClaw `mcp.servers.knowledge` key + config are the hi2vi side's job, pointed at this phase's contract v1 (`mcp-server/CONTRACT.md`).

## Deviations from plan

- **None substantive.** The plan's `docker compose … config` "with the `knowledge-mcp` service" is satisfied by the compose service keyed `mcp` whose `container_name` is `knowledge-mcp` (as designed in S3). The two doc-version summaries were shortened only to fit the filesystem's filename length limit (content unchanged in intent). The `product` doc was versioned (the plan left it to executor judgment): the current product doc described the retriever only as *deferred*, so it did not yet describe this delivered agent-facing surface — a version was warranted.

## Boundaries respected

No source edited; no `new-slice`; no commit; no `review-phase`/`finish-slice`/`set-phase-status`;
phase not archived. Only `doc-new-version` + `rebuild-docs` (review-slice privilege) and doc/
`result.md`/`phase.md` writes.
