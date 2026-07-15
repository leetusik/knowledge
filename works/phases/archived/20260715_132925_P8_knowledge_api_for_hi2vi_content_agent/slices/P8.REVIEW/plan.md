# Plan — P8.REVIEW: phase review (validate all slices, judge against intent, consolidate durable docs)

Orchestrator plan (auto mode). Executor: `slice-executor-high`.

## What P8 shipped (all slices `done`, committed)

| Slice | What it delivered |
|---|---|
| `P8.DECOMP` | Hosting design proposal (operator-approved 2026-07-14) + 5 middle slices |
| `P8.S1` | Publish-on-write: `gitops.push()` (fetch → rebase onto `origin/main` → non-force push), `KB_GIT_PUSH` flag **default false**, `pushed`/`push_error` on POST + both DELETEs |
| `P8.S2` | Hosted read auth: `KB_REQUIRE_READ_AUTH` flag (default false) gating the six read/search routes behind the existing bearer; healthz open; no CORS |
| `P8.S3` | Prod deploy artifacts: `compose.prod.yml`, vhost, bring-up runbook |
| `P8.F1` | Plugin template parity restored (S1/S2 drift), plugin 0.1.0 → 0.2.0 |
| `P8.S4` | `deploy/SECRETS.md` provisioning runbook + `works/phases/active/P8/contract.md` (frozen consumer contract) |
| `P8.F2` | **Reality fix**: `openssh-client` added to the image (the container literally could not push — publish-on-write would have failed silently forever); deploy artifacts retargeted from the dead `changple5-nginx-1` to the live dedicated edge; plugin 0.2.1 |
| `P8.S5` | E2E acceptance **against live production**: 201 `pushed:true` → commit `383577e` on `main` → Pages deploy green → publicly live in 65s; hybrid search read-back under bearer; 401 without; duplicate → 409 |

**The endpoint is live in production**: `https://knowledge.hi2vi.com` (orchestrator performed the bring-up with operator-granted box access). Box: own clone at `/opt/knowledge`, container `knowledge-api` (no public port), vhost `/home/opc/edge/conf.d/knowledge.conf` on the dedicated `edge-nginx`, Cloudflare-proxied, wildcard `*.hi2vi.com` origin cert, `KB_GIT_PUSH=true`, `KB_REQUIRE_READ_AUTH=true`, Gemini key present (search runs `hybrid`).

## Your job

### 1. Validate every slice's work together (not just the last one)

- `.venv/bin/python -m pytest -q` — the whole suite (65 as of F2; S5 added none).
- `python3 scripts/plugin_parity.py` — must be green (F1 and F2 both had to fix it; this is the guard that keeps the shipped payload honest).
- `python3 scripts/workflow.py validate`.
- **Live, read-only production spot-checks** (do **not** write, do **not** change box config, do **not** touch `/home/opc/edge/`): `healthz` → 200; authed `GET /api/search` → 200 with `mode: hybrid`; un-authed → 401; the S5 doc still live at its Pages URL. Token: `TOKEN=$(ssh oracle-cloud 'sudo grep "^KB_API_TOKEN=" /opt/knowledge/.env | cut -d= -f2-')` — **never print it, never write it into any file.**
- Confirm the box clone is clean and `HEAD == origin/main` (a dirty box tree would break the next rebase-before-push).

### 2. Review against the objective and `intent.md`'s six deliverables

Judge each honestly (`phase.json` objective + `intent.md` items 1–6): production-reachable endpoint; auth enforced; `docs/hi2vi/` bootstrap; publish-on-write with no operator action; read/search exposed under the same auth; frozen contract for hi2vi `P15.S4`. Call out anything only partially met. Also confirm the local/plugin UX invariant survived: **both new behaviors are flag-gated off by default** — a local or plugin user still gets open reads and no pushing.

### 3. Consolidate the durable docs — **only on a passing review**

Read the **Doc impact** section of `phase.md` in full and consolidate it into new versions with `python3 scripts/workflow.py doc-new-version --doc <doc> --summary "..." --source P8.REVIEW`, then write the new version file under `docs/versions/<doc>/`. Expect roughly:

- **`api.md`** — the hosted deployment + **frozen contract**. `works/phases/active/P8/contract.md` was written to be consolidated **verbatim** and was confirmed against the live box in S5 — carry it in faithfully (base URL, bearer on all `/api/*`, POST 201/409/422/401, read/search shapes, the new `pushed`/`push_error` fields, `commit_sha` = final published HEAD on a successful push, publish/retry semantics). This published doc is the pointer hi2vi's repo references.
- **`operations.md`** — production deployment and the publish-on-write flow, with the **real** topology.
- **`security.md`** — hosted auth model, the on-box deploy key, secret handling, the deliberate scoped departure from "agent never pushes".
- **`qa.md`** — the E2E acceptance procedure and its two hard-won lessons: **assert the capability (`pushed:true`), never just the status code** (a best-effort path returns an identical-looking 201 when the infrastructure is completely broken), and **shipped-payload slices must run `scripts/plugin_parity.py` locally** (pytest alone missed the drift twice).
- **`architecture.md`** — the hosted-deployment shape (public co-tenant API on the shared edge; box clone + server-side push as the publish path; local vs hosted flag-gated behavior).
- **`decisions.md`** — the phase's ADRs: public endpoint at `knowledge.hi2vi.com` + bearer (over tailnet-only/private-network); `KB_GIT_PUSH` default-off; `KB_REQUIRE_READ_AUTH` as a flag rather than "token set ⇒ reads closed" (which would have broken every existing local/plugin user); SSH deploy key over PAT; DELETE pushes too; no CORS; no `limit_req` zone on the vhost; reuse of the wildcard origin cert.

**Critical — do not carry superseded facts into the docs.** P8.S3's Doc-impact lines were written against the *old* shared edge and F2 **voided** them. The following are FALSE and must not appear: `changple5-nginx-1`; conf applied by `docker cp` into a container's writable layer; the cross-repo `apply-to-edge.sh` handoff; and the rule "after any changple5 deploy, assume knowledge.hi2vi.com is DOWN". The truth: the dedicated `edge` project at `/home/opc/edge` bind-mounts `conf.d/` + `certs/` **read-only from the host**, so the vhost is persistent declarative state that co-tenant deploys cannot wipe; changes are a host file drop + `./deploy.sh` (hard `nginx -t` gate → graceful reload, never recreate). `phase.md`'s F2 findings carry the verified topology — trust that over S3's lines.

Docs are **publicly published**. No secrets, no tokens, no private IPs. Box paths (`/opt/knowledge`, `/home/opc/edge`) and container names are operational facts already implied by the repo's own committed `deploy/` artifacts — keep them factual and minimal, and never publish anything that would help someone reach the box (no token, no key material, no origin IP).

### 4. Return the verdict

`pass` | `changes_requested` (with concrete proposed fix slices) | `blocked`. The orchestrator records it with `review-phase`.

## Constraints

- You may run `doc-new-version` (review privilege) — that is the **only** state-mutating command you may run. Never commit, never transition slice/phase status.
- Write **only** docs (`docs/versions/**`, and whatever `rebuild-docs`/`doc-new-version` regenerates). Never touch source, tests, `deploy/`, or `server/` in this slice.
- Never hand-edit `docs/current/*.md` — they are generated snapshots.
- Three deferred jobs are already filed for out-of-scope follow-ups (D3 orphan deploy key — **already resolved by the operator**; D4 `kb-api@localhost` commit identity; D5 the stale `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md` explainer). Don't re-litigate them; mention them in the review summary if relevant.
- Write `result.md` in this slice folder and return the structured verdict (`review_verdict`).
