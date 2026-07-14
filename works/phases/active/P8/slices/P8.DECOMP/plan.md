# Plan — P8.DECOMP (decompose phase P8: Knowledge API for hi2vi content agent)

Orchestrator plan, operator-approved 2026-07-14. Executor: `slice-executor-high`.

## Your job (two deliverables)

1. **A hosting design proposal**, written into `works/phases/active/P8/phase.md`, concrete enough for the operator to sign off before any implementation slice runs (this sign-off is mandated by `intent.md`).
2. **The phase's middle slices**, created with `new-slice` (bare folders — never pre-fill their `plan.md`), with deliberate `--risk` ratings and a sensible `--order`, plus the seeded phase notebook (`phase.md`: Decomposition rationale, Findings & Notes, Constraints, expected Doc-impact areas).

Read first: `works/phases/active/P8/intent.md` (the confirmed intent + the 2026-07-14 execution-kickoff addendum), `works/phases/active/P8/phase.md`, `docs/current/api.md`, `docs/current/operations.md`, `docs/current/security.md`, `docs/current/architecture.md`, and `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md` (the shared OCI box's edge, documented in this knowledge base).

## Fixed decision (do not re-open)

The operator resolved the hosting question at kickoff: the knowledge API deploys **public at `https://knowledge.hi2vi.com`** — a new subdomain vhost on the shared OCI box's existing edge (nginx `changple5-nginx-1` + Cloudflare + `changple_shared_network`), alongside hi2vi.com. One subdomain is enough: hi2vi's content agent consumes the public URL with a bearer token (no separate private-network path). The GitHub Pages site stays at `leetusik.github.io/knowledge/`. Design *within* this decision; do not re-weigh tailnet-only or private-network-only options.

## Verified ground truth (recon 2026-07-14 — trust these, spot-check only what you build on)

- **Write path already complete** (P2/P4/P7): `POST /api/documents` writes the convention md file + `docs/index.md` Recent bullet + FTS row + best-effort embedding + scoped git commit; contract 201 (`{id, rel_path, url, ..., committed, commit_sha, landing_created}`) / 409 dup / 422 convention / 401 auth. First write of a new project auto-creates `docs/<project>/index.md` (P7.F1 `ensure_project_landing`, `server/main.py:264`) so a first `docs/hi2vi/` write cannot break the `site_smoke.py` deploy gate.
- **Bearer auth** (`require_bearer`, `server/main.py:64`; `KB_API_TOKEN` via `server/config.py`) protects **writes only** (POST documents, DELETEs, reindex). **All reads/search/healthz are unconditionally open.** Auth is a no-op when `KB_API_TOKEN` is unset — that open-by-default behavior is the local dev UX and must survive for local/plugin users.
- **`server/gitops.py` never pushes** — scoped `git add` + commit only (author `kb-api`, set at image build). No remote/credential/push code anywhere. Publish-on-write is entirely unbuilt: the biggest work item.
- **Deployment today is local-only**: `compose.yml` bind-mounts the operator's working tree (`.:/repo`, ports 8765 viewer / 8766 api), Makefile assumes Mac + Tailscale. No prod compose, no vhost config, no TLS material, no OCI deploy tooling in this repo (the edge's break-glass script lives in the hi2vi/changple5 repos).
- **Pages deploy**: `.github/workflows/pages.yml` on every push to `main`, gated by `scripts/site_smoke.py`; `plugin-ci.yml` parity gate is untouched by content-only writes. A server-pushed commit to `main` is a *valid* deploy trigger by design.
- **Embeddings**: Gemini only (`GOOGLE_API_KEY`/`GEMINI_API_KEY`); everything degrades gracefully to BM25-only when the key is absent (write 201 unaffected, search falls back). Low quota model — fine for one daily agent write.
- **Consumer side**: the shipped plugin already resolves `KB_API_BASE_URL` + `KB_API_TOKEN` (env → `~/.config/knowledge-kb/config.json`); hi2vi P15.S4 plans against env names `KNOWLEDGE_API_URL` / `KNOWLEDGE_API_TOKEN`. `KB_PUBLIC_BASE_URL` is the *viewer* origin used in the 201 `url` field — a separate concept from the API's own origin.

## Design questions the proposal must answer (recommend one option each, with rationale)

1. **Deployment shape on the OCI box.** Own compose project with **its own clone** of this repo (not a working-tree bind mount — the container commits, so it needs a clone it owns), joined to `changple_shared_network`; nginx vhost + Cloudflare DNS record for `knowledge.hi2vi.com`; TLS consistent with how the edge handles hi2vi.com today. Account for the documented edge fragility (undeclared runtime state wiped by changple5 deploys; "Option B" dedicated-edge plan in the explainer + deferred job D2) — the design should state what knowledge.hi2vi.com needs from the edge and what happens to it on an edge reset (a documented re-apply step is acceptable; silent breakage is not).
2. **Publish-on-write mechanism** — how an agent write reaches `main` → Pages with no operator action. Options: the hosted API pushes after its scoped commit (credential: repo-scoped deploy key vs fine-grained PAT; push discipline: fetch + ff-only guard vs rebase; failure semantics: 201 with `pushed`/`push_error` fields vs 5xx), or a knowledge-side sync job. Recommend one; spell out divergence handling (operator pushes to `main` from the Mac too) and how a failed push surfaces.
3. **Auth on reads** for the hosted deployment (intent point 5: read/search "under the same bearer auth") while local stays open (no-token = open). Decide `healthz` exposure (edge/uptime checks want it open; it leaks doc count). Decide whether CORS matters (server-to-server consumer: probably not — state it).
4. **Hosted clone freshness** — how the box's clone learns about operator-pushed commits (pull-on-write ff-only, periodic pull, startup self-heal + reindex, or webhook). Keep it simple; a daily-write agent doesn't need real-time mirroring, but a stale clone must not produce push rejections or resurrect deleted docs.
5. **Secrets/token provisioning + the frozen consumer contract**: generate and place `KB_API_TOKEN`, git push credential, optional Gemini key on the box (never in this repo); freeze the contract hi2vi P15.S4 codes against — `KNOWLEDGE_API_URL=https://knowledge.hi2vi.com`, `KNOWLEDGE_API_TOKEN`, the write 201/409/422/401 shapes, and the search/read request/response shapes. Decide where the contract doc lives (e.g. a versioned doc-impact into `docs/current/api.md` at review + a pointer for the hi2vi repo).
6. **`docs/hi2vi/` bootstrap** — likely verify-only given auto-landing; confirm whether anything is actually needed beyond an E2E "first hi2vi write" check (folder naming: research docs `project: "hi2vi"` vs existing engineering `docs/hi2vi_web/` — keep them distinct).
7. **Embeddings on the box** — provision the Gemini key (hybrid search for hi2vi's dedup/grounding) or accept BM25-only at launch. Recommend one.

## Slice-creation guidance

- Create only the middle slices (`python3 scripts/workflow.py new-slice --phase P8 --slice P8.S<n> --name "..." --kind implementation --risk <low|medium|high> --order <n>`); `P8.DECOMP` and `P8.REVIEW` already exist. Bare folders — no plan.md pre-fill.
- `--risk` selects the executor tier and is the phase's main cost lever: `low` only for fully mechanical work; anything touching auth, gitops/push, or the prod deploy is not `low`.
- Shape operator-run actions — Cloudflare DNS record, secret generation/placement on the box, anything needing operator SSH/accounts — as explicit **pending handoff points** inside the relevant slices (name them in the slice names or `phase.md` notes so the orchestrator can see them coming). Assume the agent may have no SSH access to the box; prefer slices that produce ready-to-run artifacts (compose file, vhost conf, step-by-step apply instructions) with an operator-applies-then-validates gate, unless you find evidence in-repo that agent-side deploy is possible.
- Keep the slice count lean (the work above suggests roughly 4–6 middle slices); an E2E acceptance step (hi2vi-style write → push → Pages deploy → doc live; search reads back under auth) must exist somewhere — either its own slice or the tail of the deploy slice.
- Note the cross-repo dependency in `phase.md`: hi2vi `P15.S4` consumes the frozen contract at planning time and needs the reachable endpoint for its e2e (`P15.S9`).

## Constraints (contract)

- You may run `new-slice` (decomposition privilege). Never commit, never transition slice/phase status, never run `doc-new-version` (doc versioning happens at P8.REVIEW; record expected doc impact as notes).
- Durable-truth changes you foresee → list under a "Doc impact" heading in `phase.md` for the review to consolidate.
- Keep `phase.md` the single shared notebook: breakdown + rationale, the hosting proposal (clearly marked **for operator sign-off**), findings, constraints.
- Write your free-form `result.md` in this slice folder when done; return your structured verdict.
