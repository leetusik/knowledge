# Result — P8.REVIEW

**Verdict: `pass`.** All six of `intent.md`'s deliverables are met, and the phase's core
capability is proven in production, not merely implemented. Six durable doc versions
consolidate the phase's Doc impact.

---

## 1. Validation — all of P8's slices, together

| Gate | Result |
|---|---|
| `.venv/bin/python -m pytest -q` | **65 passed** (S1 +3 push, S2 +3 read-auth; S3/S4/S5 behavioral-neutral) |
| `python3 scripts/plugin_parity.py` | **PASS**, 0 issues (the guard F1 *and* F2 each had to repair) |
| `python3 scripts/workflow.py validate` | **passed** |
| `docker compose run --rm kb build` → `python3 scripts/site_smoke.py` | **PASS** — run *after* writing the six doc versions, so the docs this review publishes are proven not to break the Pages deploy gate |

### Live production spot-checks (read-only)

| Check | Result |
|---|---|
| `GET /healthz` (no auth) | **200** `{status:"ok", db:"ok", documents:7}` — open as designed; count matches the post-S5 corpus |
| `GET /api/search?q=…` **without** bearer | **401** `{"detail":"missing or invalid bearer token"}` |
| `GET /api/documents` **without** bearer | **401** |
| S5's published doc, Pages | **200** — <https://leetusik.github.io/knowledge/hi2vi/2026-07-14-the-hi2vi-research-space/> |
| `docs/hi2vi/` auto-created landing, Pages | **200** |
| S5's publish commit `383577e` | **an ancestor of `origin/main`** — tree = exactly 3 files (the doc, `docs/hi2vi/index.md`, the `docs/index.md` Recent bullet). Publish-on-write is real. |

So, verified live *today*: the endpoint is up, **read auth is enforced** (`KB_REQUIRE_READ_AUTH`
is on in prod), and the agent-published document is publicly readable.

### Two planned checks I could NOT run — no defect signal, but stated plainly

The plan's remaining two checks both require SSH into the production box (to read
`KB_API_TOKEN` out of `/opt/knowledge/.env`). **My permission system denied box access and
token extraction, and I did not work around it.** So I did not run:

1. **authed `GET /api/search` → 200 with `mode:"hybrid"`** — the *un*-authed 401 above exercises
   the same route and proves the gate; the 200 branch was verified live at S5 with evidence
   (the new doc ranked #1 with `vector 0.717`, and ranked first for a query sharing **no**
   keywords with it — a real semantic signal, not a BM25 fallback). `healthz`'s `documents:7`
   independently corroborates that the S5 write is in the box's DB.
2. **box clone clean / `HEAD == origin/main`** — verified clean at S5 post-push (no
   `rebase-merge`/`rebase-apply` leftovers). **Note the plan's assertion is now stale by
   design:** the orchestrator has pushed P8's own slice commits since, so the box clone is
   legitimately *behind* `origin/main`. Behind is fine and self-healing — `push()` fetches and
   rebases before every push. Only a **dirty tree** would be a problem, and nothing has written
   to the box since S5.

Neither gap changes the verdict: each is corroboration of something S5 proved live yesterday
with concrete evidence. If the orchestrator (which holds operator-granted box access) wants
belt-and-braces, those two commands are the only ones outstanding.

## 2. Review against the objective and `intent.md`

| # | Deliverable | Verdict |
|---|---|---|
| 1 | Production-reachable endpoint | **Met.** `https://knowledge.hi2vi.com` live; TLS via the edge's wildcard origin cert; healthz 200 today. |
| 2 | Auth enforced | **Met, and then some.** Writes were already bearer-guarded; P8 added reads/search. Both 401s confirmed live today. |
| 3 | `docs/hi2vi/` bootstrap | **Met.** The first `project:"hi2vi"` write auto-created `docs/hi2vi/index.md` **in the same scoped commit** (`landing_created:true`, 3-file commit), so it could not break the deploy gate — `site_smoke` green on that push, landing live on Pages. Verify-only, exactly as DECOMP predicted. |
| 4 | Publish-on-write, no operator action | **Met, and proven in production.** POST → 201 `pushed:true` → `383577e` on `main` → Pages deploy green → publicly live **~65s** after the POST returned. |
| 5 | Read/search under the same auth | **Met.** Six read routes gated by `require_read_bearer`; hybrid search confirmed live at S5 — including that a doc is embedded **in the same request that wrote it**, so the agent can search for what it just wrote in the same session. That is precisely the dedup/grounding capability intent point 5 asked for. |
| 6 | Frozen contract for hi2vi `P15.S4` | **Met and now published.** `contract.md` (TestClient-verified at S4, **confirmed against production** at S5) is consolidated **verbatim** into `api.md` v0005. The published `api.md` is the pointer the hi2vi repo references. |

**The local/plugin UX invariant survives — verified in source, not just claimed.**
`git_push_enabled()` and `require_read_auth_enabled()` both **default false** (truthy-parse
`{1,true,yes,on}` — the deliberate inversion vs the falsy-parsed `git_commit_enabled`). A local
or plugin user still gets **open reads and no pushing**, and a *set* `KB_API_TOKEN` still guards
**writes only** (a standing unit test). Installing P8's code changes nothing for an existing user.

**Push safety, verified in source:** `gitops.push()` is `fetch` → `rebase origin/main` →
`push origin HEAD:main` with **no `--force` anywhere** and **no `add -A`**; a failed step runs a
best-effort `rebase --abort` and surfaces `push_error`. A server-side pusher that can only ever
add a dated file on top of the latest remote is safe to run unattended.

### Honest observations (none blocking)

- **The phase needed two fix slices, and both were real.** F2 in particular caught a
  **silent, total** failure: the image had no `ssh` binary, so publish-on-write would have
  returned an identical-looking 201 forever while nothing ever published. It also found that
  S3/S4's deploy artifacts targeted an edge **that no longer exists**. The phase is stronger for
  having found these *before* handing the contract to hi2vi — but the pattern (artifacts authored
  against a stale explainer doc, never checked against the live box) is the phase's main process
  lesson, now recorded in operations/qa.
- **A live, write-capable deploy key's private half was sitting untracked in this public repo's
  working tree** (F2's security finding — residue of the old "generate locally, delete later"
  flow, plus an orphaned second key still authorized on GitHub). **Confirmed remediated at
  review:** no `knowledge_deploy_key*` files exist in the tree, and `git ls-files` shows no key
  material, no `.pem`/`.key`, no `.env` tracked. The root cause is fixed at the source (keys are
  now generated *on the box*), and the rule is recorded in security.
- **Deferred, correctly (not re-litigated):** D3 (orphan deploy key) — **resolved by the
  operator**, verified above. D4 (`kb-api@localhost` commit identity now in public history —
  cosmetic; a one-line change). D5 (the stale `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md`
  explainer, which describes the superseded edge). All three are right to be out of P8.

## 3. Doc versions created (Doc impact → durable truth)

Six, one per affected doc, each capturing the **whole phase**:

| Doc | Version | What it now carries |
|---|---|---|
| `api` | **v0005** | Two deployments; the flag-gated read auth; `pushed`/`push_error` on POST 201 + DELETE; `commit_sha` = **final published HEAD** on a successful push; and the **frozen consumer contract carried in verbatim** from `contract.md` as `## Hosted deployment + frozen contract`, under an additive-only freeze rule. |
| `operations` | **v0009** | Production deployment (api-only `compose.prod.yml`, own box clone, box env, `opc`-owned-clone gotcha); the **real** edge — dedicated, `conf.d`/`certs` read-only host bind mounts ⇒ **declarative host state**, apply = file drop + `./deploy.sh` (`nginx -t` gate → graceful reload, never recreate), and the whole-tree rules (`limit_req_zone` names are global; never `default_server`; no IPv6 `listen`); the publish-on-write flow + measured timings; `KB_GIT_PUSH`/`KB_REQUIRE_READ_AUTH` in the env table; **`openssh-client` is load-bearing**; the push-policy revision. |
| `security` | **v0004** | Hosted auth model (read bearer via the flag, delegating to the same `require_bearer`); the box-only SSH deploy key (over a PAT), pinned host key; **generate credentials where they will live** + the real incident that taught it; the flag-gated, scoped departure from "the agent never pushes"; blast radius of the shared token; the no-rate-limit and commit-identity open questions. |
| `qa` | **v0006** | The **hosted E2E acceptance procedure** (six assertions, run against live production) and its two hard-won lessons: **assert the capability (`pushed:true`), never the status code** — a best-effort path returns an identical-looking 201 when the infrastructure is completely broken — and **shipped-payload slices must run `plugin_parity.py` locally** (pytest missed the drift twice). Plus the new "silent-publish" fragile area. |
| `architecture` | **v0007** | **Two deployments, one codebase** — a table of exactly what differs, why default-off *is* the compatibility contract, how the write path became the **publish** path (in-request, inside the write lock — which is what makes the single-writer invariant load-bearing), and why the box owns a real clone rather than a mount. The search boundary is restated: the API is public now, but the Pages site *still* never calls it — which is why there is no CORS. |
| `decisions` | **v0009** | Seven P8 ADRs: public endpoint + bearer (over private-network/tailnet); `KB_GIT_PUSH` **default-off**; **read auth as a flag, not implied by a set token** (token-implies-closed-reads would have silently broken every existing local/plugin user with a token — the most consequential call in the phase); SSH deploy key over PAT; no CORS; **no `limit_req` zone** (zone names are global across the edge tree — a duplicate blocks the reload for *every* site on the box); wildcard origin cert. Plus two Superseded entries: the "agent never pushes" rule is **narrowed, not abandoned**, and DECOMP's shared-edge fragility rule is **superseded by fact**. |

**Superseded facts kept out.** P8.S3's Doc-impact was written against the old shared edge and
F2 voided it. Scanned the published set: **no** `changple5-nginx-1`, **no** `apply-to-edge.sh`
handoff, **no** `deploy/knowledge.hi2vi.com.conf` filename, **no** "undeclared runtime state
wiped by every co-tenant deploy", **no** "assume knowledge.hi2vi.com is DOWN after a changple5
deploy". The only `docker cp` mentions are the F2 **prohibition** ("never `docker cp` into the
edge"). The docs take the edge story from F2's verified recon.

**Publish safety.** These docs go to GitHub Pages. Scanned clean: no token, no key material, no
origin IP, no `/Users/` path. Box paths (`/opt/knowledge`, `/home/opc/edge`) and container names
appear only as the operational facts already committed in `deploy/`, kept factual and minimal —
mechanics are **referenced** to `deploy/README.md` / `deploy/SECRETS.md` rather than duplicated,
which also keeps the durable docs from drifting against the runbooks.

## 4. Deviations from `plan.md`

1. **The two SSH/box checks were not run** — my permission system denied production shell access
   and token extraction. I did not attempt a workaround. Impact assessed above (none on the
   verdict); the specifics and what remains outstanding are in §1.
2. **Added a gate the plan didn't ask for:** `mkdocs build` + `site_smoke.py` **after** writing the
   doc versions. `docs/current/` is published, so the review's own output rides the next Pages
   deploy — leaving it unverified would have been the same class of mistake this phase twice
   punished. It PASSes.
3. `architecture.md` was consolidated as a **full section**, not the "possibly light" touch the
   Doc-impact line hedged on. The two-deployments/publish-path shape is genuinely architectural
   (it is what makes the single-writer invariant load-bearing), so it earned the space.

No source, tests, `deploy/`, `server/`, or box config were touched. No commit, no status
transition, no `docs/current/*` hand-edit (all six regenerated via `rebuild-docs`).
