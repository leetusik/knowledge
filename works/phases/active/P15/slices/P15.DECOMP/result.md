# Result — P15.DECOMP

## Outcome

Decomposed phase P15 into **four implementation slices** (bare folders, `slice.json` only — no
`plan.md` pre-filled) and seeded `phase.md` with the breakdown, verified findings, constraints, and
open questions. No status transitions, no commits, no deferred commands run.

## Slices created

| id | name | kind | risk | order | depends_on |
|----|------|------|------|-------|-----------|
| P15.S1 | MCP service scaffold + Streamable-HTTP transport + search tool | implementation | **high** | 1 | — |
| P15.S2 | fetch_document tool + response size caps | implementation | **medium** | 2 | P15.S1 |
| P15.S3 | Containerize: Dockerfile + compose service + SSE-safe edge routing + dual reachability | implementation | **high** | 3 | P15.S1, P15.S2 |
| P15.S4 | Stable versioned tool contract + OpenClaw first-consumer E2E smoke | implementation | **medium** | 4 | P15.S3 |

Rationale, per-slice scope, and the risk/tier reasoning are in `phase.md` (Decomposition section).
Summary of the risk logic:

- **S1 high** — greenfield MCP server: SDK/transport selection, Streamable-HTTP wiring, bearer
  pass-through, and the durable hit-`url` architectural decision all converge here; everything downstream
  depends on these choices. -> `slice-executor-high`.
- **S2 medium** — additive `fetch_document` tool on S1's scaffold; thin proxy of existing single-doc
  reads, bounded but real judgment (addressing + truncation). Cleanly droppable (intent: optional).
  -> `slice-executor-mid`.
- **S3 high** — beyond pattern-copy: SSE/streaming through nginx (`proxy_buffering off`, long/idle read
  timeouts, HTTP/1.1) is a new edge concern, and the `conf.d/` tree tests+reloads as a unit so a bad
  directive breaks every site on the box. -> `slice-executor-high`.
- **S4 medium** — the hard work is done by S1–S3; this formalizes the stable/versioned external contract
  and runs the dual-path OpenClaw E2E. Judgment-heavy (external commitment, cross-project) but not deep
  new logic. -> `slice-executor-mid`.

No `low`-risk slice: nothing in this phase is fully mechanical.

## Survey verification (all plan findings confirmed against the repo)

- **Greenfield MCP** — confirmed: `grep` for `mcp|modelcontextprotocol|streamable` across code/config
  finds only `works/` phase metadata. New service.
- **`/api/search` has no `url`** — confirmed in `server/search.py:_finalize()` (returns `title`,
  `snippet` with `<mark>`, `rel_path`, `project/date/slug`, no `url`). The MCP `search` tool must derive
  the url.
- **url caveat is real** — confirmed: `compose.prod.yml:56-63` explicitly marks the canonical
  `{KB_PUBLIC_BASE_URL}/{project}/{date}-{slug}/` `url` as "COSMETIC ONLY … no longer resolves" post-P14
  (mkdocs retired; web app reads docs at `/documents/{db_id}`). This is a live decision for S1, worse than
  cosmetic for OpenClaw's citation chip.
- **Auth reuse via proxy + bearer pass-through** — confirmed in `server/api_auth.py`: a forwarded
  `Authorization: Bearer vk_...` resolves to tenant/project scope for free (the web BFF's
  `KB_API_BASE_URL: http://knowledge-api:8000` pattern). Preferred over importing `server/` in-process.
- **Packaging + deploy precedents** — confirmed: `cli/pyproject.toml` (own hatchling src-layout package),
  `web/Dockerfile` + `compose.prod.yml` `knowledge-web` service + `deploy/knowledge.conf` locations +
  `deploy-production.yml` health-gate. The MCP service copies these patterns.
- **Frozen `/api/*`** — confirmed frozen/additive-only in `docs/current/api.md`; MCP sits alongside.

## D6 reconciliation — recommendation (NOT executed)

**Recommendation: DROP D6 as superseded by P15, and (optionally) re-capture the monetization residue as
a new, narrower deferred job.**

Reasoning. D6 ("Paid-plan retriever endpoint for external AI agents") conflates two things:

1. the **retriever *interface*** for external AI agents, and
2. **charging** for it (a paid plan / plan-gating that surface).

P15 fully delivers (1): an MCP `search`/`fetch_document` retriever over Streamable-HTTP, `vk_`-scoped per
project, dual-reachable — exactly the agent-facing endpoint D6 anticipated. The phase's own `intent.md`
says P15 "realizes/subsumes deferred job D6." D6 does **not** map to any single additional P15 slice (its
deliverable is the whole phase's surface), so `promote-deferred … --slice …` would create an artificial
slice; the natural reconciliation is a phase-level supersede, i.e. **drop**.

P15 deliberately does **not** deliver (2): no billing, no plan gate on the MCP surface. That monetization
was D6's real reason for deferral ("SaaS launches free-only … no paid plan exists yet") and its trigger
("operator decides to introduce the paid plan") is a distinct future event. The metering substrate for it
already exists (P11 usage events; the P12 doc even notes "the paid retriever is P15"). So the *charging*
step remains genuinely future work — but it is a business + billing-gate decision, not a retriever-endpoint
code gap, and does not belong open under D6's current title once P15 ships the endpoint.

Suggested **drop-reason draft** (for the orchestrator/operator to run `drop-deferred D6 --reason "..."`):

> Superseded by P15 (Agent-facing retrieval MCP service). P15 builds the external-agent retriever surface
> D6 anticipated — an MCP `search`/`fetch_document` service over Streamable-HTTP, `vk_`-scoped per
> project, dual-reachable (internal service-name + public edge). The retriever *interface* now exists.
> D6's remaining aspect — actually *charging* for it (a paid plan / gating the MCP surface) — is a
> separate business + billing decision P15 does not build; the P11 usage-event metering is the substrate
> for it when the operator introduces a paid plan. Re-capture that monetization step as a new, narrower
> deferred job if it needs tracking.

**Alternative** (operator's call): keep D6 open but **re-scope its title/reason to monetization only**
("gate + charge for the MCP retriever, introduce the paid plan"), since P15 does not touch billing. Either
is defensible; I recommend the drop + optional new job because it keeps D6's title honest (the endpoint it
names is being delivered) and cleanly separates "endpoint exists" from "endpoint is monetized."

I did **not** run `drop-deferred`/`promote-deferred` — the orchestrator applies the chosen path.

## For the operator (relay)

- P15 will build the retriever **surface**, not a paywall — confirm that matches intent (it does per
  `intent.md`; flagging because D6 was framed as the *paid* endpoint).
- The **hit-`url` shape** is a real product decision (dead canonical link vs the app's `/documents/{id}`
  route vs a flagged rel_path). S1 will resolve it; if the operator has a preference for what the OpenClaw
  citation chip should link to, that's useful input to S1's plan.
- The **hi2vi CS credential scope** (`hi2vi` only vs `hi2vi` + `hi2vi_web`) needs coordination with
  hi2vi P18.S5; S4 will finalize it.

## Deviations from plan

None. Followed the plan's suggested 4-slice shape (scaffold+search / fetch_document / containerize+edge /
contract+E2E), refined only in scope wording — the hit-`url` decision and MCP SDK choice are placed in S1
(not S2) because each `search` hit carries a `url`, so the decision is entangled with the search tool.

## Validation

- `python3 scripts/workflow.py validate` -> **Workflow validation passed.**
- Verified each created slice is a bare folder (`slice.json` only; no `plan.md`).

## Doc impact

None (decomposition slice — creates no durable-truth change; it seeds `phase.md`, whose "Doc impact" list
is filled by the implementation slices and consolidated at the P15 review).
