# P15.REVIEW — phase review (validate all slices + consolidate durable docs)

## Context

The four middle slices are done (S1 scaffold+`search`; S2 `fetch_document`+caps; S3 containerize+SSE-safe
edge+dual reachability; S4 versioned contract+first-consumer E2E). This is the phase's **single
behavioral-validation + durable-doc-consolidation gate**: the orchestrator trusted each slice's `done`
verdict and ran only state-integrity `validate`, so the REVIEW validates **all slices together**, checks
the phase against its objective/`intent.md`/constraints, and — **only on a passing review** — consolidates
the accumulated **"Doc impact"** notes in `phase.md` into new doc versions. Delegated to
**`slice-executor-high`** like any review. The executor writes **only docs** (never source), may run
`doc-new-version` (allowed in the review slice), and returns a `review_verdict`; the orchestrator records
it with `review-phase` (the executor never transitions phase status or commits).

## 1. Validate all slices together (behavioral — the consolidated gate)
Run from repo root unless noted:
- **Package suite (S1+S2+S4):** `cd mcp-server && uv run pytest -q` → expect **10 passed** (search
  mapping/mark-strip/url/bearer/clamp/401; fetch id+rel_path/slash/truncation/XOR/404/401;
  `/healthz.contract_version`).
- **S3 deploy config:** `COMPOSE_BAKE=false docker compose -f compose.prod.yml config` parses with the
  `knowledge-mcp` service (dummy `.env` ok); `bash -n deploy/deploy.sh deploy/oracle-production-deploy-remote.sh`;
  spot-check the edge `location /mcp` still honors the house rules (no per-location `proxy_set_header`,
  variable `proxy_pass`, `proxy_buffering off`).
- **S4 first-consumer E2E (re-run if feasible for a fresh consolidated proof; else trust S4's recorded
  PASS):** local legacy-mode api (`uvicorn server.main:app --port 8000`, no `DATABASE_URL`, `KB_API_TOKEN`,
  a scratch `KB_ROOT`, `KB_GIT_COMMIT=false`) + one POSTed doc → `KB_API_BASE_URL=http://localhost:8000 uv
  run knowledge-mcp` → `python mcp-server/scripts/e2e_smoke.py --url http://127.0.0.1:9000/mcp --key <t>`
  → PASS. (The mcp Docker image build is heavier and already proven in S3 — optional here.)
- **State integrity:** `python3 scripts/workflow.py validate`.

## 2. Review against objective / intent / constraints
- **Objective met:** an MCP-over-HTTP retrieval service — `search` (+ optional `fetch_document`) →
  ranked, corpus-scoped, citable hits; `vk_`-bearer auth over Streamable-HTTP; **dual reachability**
  (internal service-name + public edge); a **stable versioned tool contract**; backed by the **frozen
  `/api/search` + embeddings** (retrieval not rebuilt); first consumer = hi2vi OpenClaw. Confirm each.
- **Constraints held (verify, don't assume):**
  - **`/api/*` frozen** — the phase touched **no `server/` route/contract** (changes are confined to
    `mcp-server/`, `deploy/`, `.github/workflows/`, `compose.prod.yml`, and docs). Confirm via the diff.
  - Single-writer invariant untouched (the service only reads); lean tests (one terse suite + a smoke
    script, no sprawl); edge house rules honored; MCP sits *alongside* REST.
- **Intent alignment (`intent.md`):** search-as-a-service reusable surface; `title`+`url` citation shape
  with `url` **reserved-empty** until `source_url` (deferred **D13**) — treat empty as "no link," not an
  error; corpus scoping resolved (one tenant-scoped `vk_` covers `hi2vi`+`hi2vi_web`, `project` narrows).
- **Deferred-job disposition:** **D6** was already dropped as superseded at DECOMP (P15 subsumes it),
  **D12** added at DECOMP, **D13** (`source_url`) added at S1 — no deferred action is needed at review.
- If a real defect surfaces, return **`changes_requested`** with proposed `fix` slices (don't patch source
  inline); a genuine impediment → **`blocked`**; otherwise **`pass`**.

## 3. Consolidate durable docs (ONLY on a passing review)
For each affected doc: `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "…" --source
P15.REVIEW` (this seeds the new version file from the current latest's body), then **edit that new
`docs/versions/<doc>/vNNNN_*.md` file** to fold in the P15 durable truth from `phase.md`'s "Doc impact"
list, then `python3 scripts/workflow.py rebuild-docs`. The Doc impact notes are pre-tagged by target:
- **api** — MCP **contract v1**: tools `search`/`fetch_document` (full I/O schemas), `Authorization:
  Bearer vk_` auth, Streamable-HTTP `/mcp`, additive-only versioning + `/healthz.contract_version`,
  tenant-wide corpus scoping — a new **agent-facing** surface *alongside* the frozen REST `/api/*`.
- **architecture** — the MCP service shape: **proxy-and-forward-bearer** (no retrieval rebuilt, scoping
  inherited), the `mcp-server/` + `knowledge_mcp` package boundary (folder named to avoid shadowing the
  `mcp` SDK), contract v1, the stateless-deploy decision.
- **operations** — the `knowledge-mcp` deploy: `mcp-server/Dockerfile`, `compose.prod.yml` service
  (`expose 9000`, external network, `KB_API_BASE_URL`, `MCP_STATELESS_HTTP=1`, `/healthz` healthcheck),
  edge **SSE-safe `location /mcp`**, extended `deploy.sh` health-gate + `deploy-production.yml` `/mcp`
  smoke, dual reachability, and the `e2e_smoke.py` verifier + **operator post-deploy public-path run**.
- **product** — evaluate whether the search-as-a-service **agent-facing retrieval product** surface
  (which realizes/subsumes the dropped D6) warrants a version; version it if the current product doc
  doesn't yet describe this surface. (Not pre-tagged in Doc impact — the executor's judgment.)

## Verification (of the review itself)
- All §1 commands pass; `python3 scripts/workflow.py docs` shows the new latest versions after
  consolidation; `python3 scripts/workflow.py validate` clean (docs structure + state).

## Boundaries
Review slice: the executor **validates + reviews + consolidates docs only** — writes no source, runs no
`new-slice`, does **not** commit and does **not** run `review-phase`/`finish-slice` (the orchestrator
records the verdict with `review-phase P15 --verdict … --reviewer slice-executor-high`, which transitions
both the phase and the REVIEW slice, then commits). Do not archive the phase (a separate manual step).

## Executor
**`slice-executor-high`** (review is always top tier).
