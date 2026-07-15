# Result — P8.DECOMP

Decomposed phase P8 (Knowledge API for the hi2vi content agent) and wrote the hosting design proposal. Two deliverables per `plan.md`: (1) the operator-sign-off hosting proposal in `phase.md`, (2) the phase's five middle slices as bare folders, plus the seeded phase notebook.

## What I produced

- **Hosting design proposal** in `works/phases/active/P8/phase.md` under **"Hosting Design Proposal — FOR OPERATOR SIGN-OFF"**, answering all seven design questions from the plan with one recommendation + rationale each, *within* the fixed frame (public `knowledge.hi2vi.com` vhost on the shared OCI edge):
  1. Deployment shape — own `compose.prod.yml` (api-only) + own clone on the box, joined to `changple_shared_network`, `knowledge.hi2vi.com` vhost with DNS re-resolution + `*.hi2vi.com` TLS, and the edge-fragility re-apply story (undeclared conf/cert/network wiped on every changple5 deploy → documented cross-repo `apply-to-edge.sh` handoff; Option-B/D2 as the clean long-term).
  2. Publish-on-write — the hosted API pushes after its scoped commit, `KB_GIT_PUSH` flag (default off, local never pushes), SSH deploy-key credential, fetch+rebase-onto-`origin/main` + non-force push, best-effort 201 `pushed`/`push_error` mirroring `committed`/`commit_error`.
  3. Read auth — new `KB_REQUIRE_READ_AUTH` flag gates reads/search behind the existing bearer on the box while local stays open; healthz stays open (count leak immaterial — corpus is public on Pages); no CORS (server-to-server consumer, browser-only Pages search never calls the API).
  4. Clone freshness — the fetch+rebase-before-push flow is itself the freshness mechanism; + boot fetch/reindex; no cron/webhook.
  5. Secrets + frozen contract — operator places KB_API_TOKEN / deploy key / DNS / optional Gemini on the box (pending handoffs); freeze the `KNOWLEDGE_API_URL`/`KNOWLEDGE_API_TOKEN` + write 201/409/422/401 (+ new push fields) + read/search-under-bearer contract into `api.md` at review as the hi2vi pointer.
  6. `docs/hi2vi/` bootstrap — verify-only (P7.F1 auto-landing covers it; distinct from `docs/hi2vi_web/`), folded into the E2E slice.
  7. Embeddings — recommend provisioning the Gemini key at launch (graceful degrade, zero code cost to defer).

- **Five middle slices** created with `new-slice` (bare folders, no pre-filled `plan.md`):
  - `P8.S1` — publish-on-write: server-side git push after the scoped commit — **risk high**, order 1
  - `P8.S2` — hosted read auth: gate reads/search behind bearer (local stays open) — risk medium, order 2, depends P8.S1
  - `P8.S3` — prod deploy artifacts for knowledge.hi2vi.com (compose.prod + vhost + runbook) — risk medium, order 3, depends P8.S2
  - `P8.S4` — secrets provisioning runbook + frozen consumer contract — risk medium, order 4, depends P8.S3
  - `P8.S5` — E2E acceptance: first hi2vi write → push → Pages → live; search under auth — risk medium, order 5, depends P8.S4

- **Seeded `phase.md`:** Context, the proposal, Decomposition (table + per-slice scope + pending-handoff points + cross-repo ordering), Findings & Notes (ground-truth spot-checks), Constraints, Doc impact (api/operations/security/architecture), Open Questions.

## Risk rationale (the phase's cost lever)

- **S1 high** — touches gitops/push; a bad push discipline could clobber `main`; needs full judgment on rebase/divergence/failure semantics → `slice-executor-high`.
- **S2–S5 medium** — auth-gating, prod-deploy artifact authoring, contract-freeze, and operator-gated E2E: real judgment but bounded by this proposal; none is fully mechanical, so none is `low` (per the plan's rule: nothing touching auth, gitops/push, or the prod deploy is `low`).

## Validation

- `python3 scripts/workflow.py validate` → **passed** ("Workflow validation passed.") — the five new slices are well-formed; `depends_on` targets all exist.
- Confirmed each new slice folder is bare (only `slice.json`, no `plan.md`).

Decomposition slices have no behavioral validation beyond `validate` (per `slice.json` — empty `validation.required`).

## Deviations from plan

None. Slice count is 5 (within the plan's suggested 4–6); the E2E acceptance step exists as its own slice (P8.S5) as the plan permits; operator-run actions are shaped as pending handoffs and named in `phase.md`; the cross-repo dependency is recorded.

## Doc impact

No docs versioned here (decomposition slice). Expected doc impact recorded under **Doc impact** in `phase.md` for P8.REVIEW to consolidate: `api.md` (hosted deployment + frozen contract + push fields), `operations.md` (prod deploy on the box + publish-on-write + edge re-apply), `security.md` (hosted read-auth + push credential + secrets), `architecture.md` (hosted-deployment shape — possibly light).
