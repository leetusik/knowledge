# Phase P8: Knowledge API for hi2vi content agent

_Intent: see [intent.md](intent.md)._

## Objective

Make the knowledge document API production-consumable by the hi2vi content agent: a reachable hosted endpoint (hosting proposed at DECOMP) with bearer auth, docs/hi2vi/ project-folder bootstrap, publish-on-write so agent-written docs (md file + DB row, /explain-style) land on main and GitHub Pages without operator action, and the existing read/search endpoints (hybrid search, get) exposed under the same auth so hi2vi can use accumulated knowledge for content creation

## Context

The write path (`POST /api/documents`) and the read/search surface already exist and are stable (P2/P4/P7). What is missing is **hosting**: today the API runs only on the operator's Mac (`compose.yml`, `localhost:8766`, bind-mount of the working tree, no push, no auth on reads, no TLS). This phase hosts it publicly at `https://knowledge.hi2vi.com` as a co-tenant on the shared OCI box, adds server-side push so writes publish to Pages automatically, gates reads/search behind the same bearer on the hosted deployment (local stays open), and freezes the API contract the hi2vi `P15.S4` content-agent client codes against.

The hosting shape (public subdomain on the shared edge) was **fixed by the operator at execution kickoff** (see intent.md addendum) — this DECOMP designs *within* that decision, it does not re-open it.

---

## Hosting Design Proposal — FOR OPERATOR SIGN-OFF

> **Sign-off gate (mandated by intent.md):** the operator approves this proposal before any implementation slice (P8.S1+) runs. Each numbered recommendation below is a decision the operator is signing off. Deviations become slice-plan notes.

**Fixed frame (not re-opened):** the knowledge API deploys **public at `https://knowledge.hi2vi.com`** — a new subdomain vhost on the shared OCI box's existing edge (`changple5-nginx-1` + Cloudflare + `changple_shared_network`), alongside hi2vi.com. One subdomain suffices; hi2vi's content agent consumes the public URL with a bearer token (no separate private-network path). GitHub Pages stays at `leetusik.github.io/knowledge/`.

### 1. Deployment shape on the OCI box — *recommend: own compose project + own clone, api-only, on the shared network*

- **Its own compose project** in this repo: `compose.prod.yml` shipping **only the `api` service** (no `kb` viewer — the public site is GitHub Pages; the box needs only the API). Smaller surface, no port 8765 on the box.
- **Its own git clone** on the box (e.g. `/opt/knowledge`), separate from the operator's Mac working tree. The container commits *and pushes* into this clone, so it must own a real clone with an `origin` remote (SSH) + push credential — **not** a working-tree bind mount. The box clone bind-mounts into the container at `/repo` as today.
- **Joined to `changple_shared_network`** (the existing external Docker network). The api container is reached by the edge over that network by container name (e.g. `knowledge-api:8000`); **no public host-port publish** for the api (nothing on 8766 exposed on the box's public interface).
- **Env on the box** (via a gitignored `.env`, secrets never in the repo): `KB_API_TOKEN=<generated>`, `KB_REQUIRE_READ_AUTH=true` (new, §3), `KB_GIT_PUSH=true` (new, §2), `KB_PUBLIC_BASE_URL=https://leetusik.github.io/knowledge` (so the 201 `url` points at the real published doc), `GOOGLE_API_KEY=<optional, §7>`, `TZ=Asia/Seoul`, `KB_STARTUP_REINDEX=true` (drift + fetch reconciliation on boot).
- **Edge (nginx vhost + TLS).** A `knowledge.hi2vi.com` server block on `changple5-nginx-1` that `proxy_pass`es to the api container over the shared network, using Docker internal DNS **with re-resolution** (`resolver 127.0.0.11 valid=30s` + a variable in `proxy_pass`, per the explainer's Option-B rule) so the proxy survives api-container recreation. TLS consistent with hi2vi.com: a **Cloudflare Origin CA cert covering `*.hi2vi.com`** (one cert already covers both hi2vi.com and knowledge.hi2vi.com if hi2vi uses a wildcard origin cert), referenced by the vhost. Cloudflare DNS: a proxied `knowledge` record for hi2vi.com (operator action, §5).
- **Edge fragility (documented, per `docs/hi2vi_web/2026-07-02-shared-nginx-explained.md` + deferred D2).** knowledge.hi2vi.com's conf + cert + network membership are **undeclared runtime state** on `changple5-nginx-1`, wiped on **every changple5 deploy** (the `depends_on` recreation cascade) — exactly like hi2vi.com today. What knowledge.hi2vi.com needs from the edge: (a) the vhost conf, (b) the `*.hi2vi.com` cert, (c) the edge attached to `changple_shared_network` (already true for hi2vi). **On an edge reset these must be re-applied.** The break-glass re-apply script (`deploy/edge/apply-to-edge.sh`) lives in the **hi2vi/changple5 repos, not here** — so P8 produces the knowledge vhost conf as a ready-to-drop artifact and a documented **cross-repo handoff**: "extend apply-to-edge.sh to also restore knowledge's conf + cert." Operational rule (same as hi2vi.com): **after any changple5 deploy, assume knowledge.hi2vi.com is down until the (extended) re-apply runs.** A documented re-apply step is acceptable; silent breakage is not. Long-term the Option-B dedicated edge (D2) folds knowledge in as a clean **fourth** conf drop-in.

### 2. Publish-on-write — *recommend: the hosted API pushes after its scoped commit; best-effort, 201 with `pushed`/`push_error`*

- **Mechanism:** after the existing scoped `git commit`, the write path pushes to `origin/main`. Gated by a **new `KB_GIT_PUSH` flag (default false)** so local/plugin deployments **never** push (preserves the "agent never pushes locally" convention); the box sets it true. This is the deliberate, scoped departure from that convention that intent.md point 4 authorizes.
- **Credential:** a **repo-scoped SSH deploy key** with write access (better blast radius than a PAT that spans all the operator's repos; no expiry to babysit). Public half added as a GitHub **deploy key (allow write)** on `leetusik/knowledge`; private half placed on the box and mounted read-only into the container (`GIT_SSH_COMMAND` / mounted `~/.ssh`). The box clone's `origin` uses the SSH URL. (Fine-grained PAT with `contents:write` is the fallback if SSH is inconvenient.)
- **Push discipline — fetch + rebase, never force.** Before pushing: `git fetch origin main`, then rebase the api's commit(s) onto `origin/main`, then `git push origin HEAD:main`. The api only ever **adds a new date-slug doc file** (unique path) and **appends** a Recent bullet to `docs/index.md`, so a rebase onto operator commits is virtually always clean; a genuine conflict (operator edited the same `docs/index.md` region) → abort the rebase, keep the local commit, surface `push_error`. **Never `--force`.**
- **Failure semantics — mirror `committed`/`commit_error` exactly.** Push is a best-effort publish step, like the commit already is. Success/failure never changes the write outcome: still **201**, now carrying `pushed: true|false` and, on failure, `push_error`. A failed push means the doc is written + committed on the box but not yet on Pages — it publishes on the **next** successful push (commits accumulate) or a manual push. **No 5xx** for a push failure. Applies to every commit-producing mutating endpoint (POST documents; DELETE too, for consistency).
- **Divergence (operator also pushes to main from the Mac):** handled by the fetch+rebase-before-push above — the box always lands its commit on top of the latest remote, so it never reverts the operator's work. A failed push never loses the box's commit (local, retried next write).

### 3. Auth on reads (hosted) — *recommend: new `KB_REQUIRE_READ_AUTH` flag; healthz stays open; no CORS*

- **New `KB_REQUIRE_READ_AUTH` flag (default false).** When false (local/plugin default) reads/search stay **open** — the open-by-default local dev + plugin UX intent.md protects. When true **and** `KB_API_TOKEN` is set (the box), the existing `require_bearer` dependency is applied to the read/search endpoints (`GET /api/documents`, `/api/documents/{id}`, `/api/documents/by-path`, `/api/search`, `/api/tags`, `/api/projects`) → 401 without the bearer. Writes are already bearer-guarded regardless.
- **`healthz` stays open** even under read-auth (edge/uptime/Cloudflare probes want it). Its `documents` count leak is **immaterial**: the entire corpus is already public on Pages, so the count is derivable public information (intent.md: "a public API surface leaks nothing new"). Reads are gated not for content secrecy but to stop unauthenticated abuse/load on the box's api. No healthz change needed.
- **CORS: none.** The consumer is **server-to-server** (the hi2vi agent runs server-side); the public Pages site searches **browser-only via lunr and never calls this API** (per architecture.md's search-boundary). So no browser origin ever calls the hosted api → no CORS config. State it explicitly; a future browser client would be a separate change.

### 4. Hosted clone freshness — *recommend: fetch+rebase-before-push (§2) is the freshness mechanism; + boot fetch/reindex*

- The **push flow itself keeps the clone fresh**: every write fetches `origin/main` and rebases onto it before pushing, so the box catches up on operator commits at each write. No cron, no webhook — a daily-write agent needs no real-time mirror.
- **A stale clone must not (a) cause push rejections** — the rebase-before-push handles it; **or (b) resurrect deleted docs** — the write path stages only its own touched paths (`git add --`, never `-A`) and rebases onto the latest remote, so the box's push is always on top of the operator's deletes, never a revert.
- **Boot self-heal:** `KB_STARTUP_REINDEX=true` on the box (fetch on boot, then reindex) reconciles the DB projection with any operator deletes/edits pulled in. Deleted-doc reconciliation of the box's search index is eventually-consistent (next boot / next full reindex) — acceptable for a single daily writer. A periodic pull+reindex is a possible later add, not needed at launch.

### 5. Secrets provisioning + frozen consumer contract — *recommend: operator places secrets on the box (pending handoff); freeze the contract into api.md at review*

- **Secrets on the box (never in this repo), all operator actions (pending handoffs):**
  1. `KB_API_TOKEN` — generate a strong random token; place in the box's gitignored `.env`.
  2. **Git push credential** — generate an SSH keypair; add the public key as a GitHub **deploy key (write)** on `leetusik/knowledge`; place the private key on the box.
  3. **Cloudflare** — add a proxied `knowledge` DNS record for hi2vi.com; ensure the `*.hi2vi.com` origin cert covers it.
  4. Optional `GOOGLE_API_KEY` (§7).
- **Frozen consumer contract** (what hi2vi `P15.S4` codes against — freeze it so the cross-repo client is stable):
  - Config: `KNOWLEDGE_API_URL=https://knowledge.hi2vi.com`, `KNOWLEDGE_API_TOKEN=<the KB_API_TOKEN>`.
  - Write `POST /api/documents` → **201** `{id, rel_path, url, title, project, slug, date, tags, related, recent_updated, landing_created, committed, commit_sha, pushed, push_error?}` (the `pushed`/`push_error` fields are the P8 additions; existing consumers ignore them) / **409** duplicate `{message, rel_path, id, existing_title}` / **422** convention / **401** auth.
  - Read/search: `GET /api/search?q=…`, `GET /api/documents`, `GET /api/documents/{id}` etc. — response shapes exactly as `docs/current/api.md` — now **requiring `Authorization: Bearer <token>`** on the hosted deployment.
  - **Where it lives:** consolidated into `docs/current/api.md` at P8.REVIEW (a "Hosted deployment + frozen contract" section), published on Pages — that published api.md **is** the pointer the hi2vi repo references. (Doc-impact recorded below.)

### 6. `docs/hi2vi/` bootstrap — *recommend: verify-only (auto-landing already covers it); fold into the E2E check*

- No pre-creation needed. The first `POST /api/documents` with `project: "hi2vi"` triggers P7.F1 `ensure_project_landing` → auto-creates `docs/hi2vi/index.md` (staged in the same scoped commit), satisfying the per-project `site/hi2vi/index.html` deploy-gate invariant. So the first hi2vi write cannot break `site_smoke.py`.
- **Naming is distinct and confirmed:** research docs go to `docs/hi2vi/` (`project: "hi2vi"`); the existing engineering explainers stay in `docs/hi2vi_web/` (`project: "hi2vi_web"`). Keep them separate.
- Work reduces to an **E2E "first hi2vi write" verification** (does the auto-landing + deploy gate hold end-to-end) — folded into the acceptance slice, not a separate build.

### 7. Embeddings on the box — *recommend: provision the Gemini key at launch*

- Provision `GOOGLE_API_KEY` on the box. hi2vi's read/search use case (topic dedup, research grounding — intent.md point 5) is exactly what hybrid semantic search improves; it is one env var with graceful BM25-only degradation if absent or quota-limited, and the low quota is fine for one daily agent. If the operator prefers, launch BM25-only and add the key later with **zero code change** — but the recommendation is to provision it.

---

## Decomposition

Five middle slices (`P8.DECOMP` + `P8.REVIEW` already existed). Risk drives the executor tier and is the main cost lever — nothing touching gitops/push, auth, or the prod deploy is `low`.

| Slice | Name | Kind | Risk | Order | Depends |
|---|---|---|---|---|---|
| **P8.S1** | publish-on-write: server-side git push after the scoped commit | implementation | **high** | 1 | — |
| **P8.S2** | hosted read auth: gate reads/search behind bearer (local stays open) | implementation | medium | 2 | S1 |
| **P8.S3** | prod deploy artifacts for knowledge.hi2vi.com (compose.prod + vhost + runbook) | implementation | medium | 3 | S2 |
| **P8.S4** | secrets provisioning runbook + frozen consumer contract | implementation | medium | 4 | S3 |
| **P8.S5** | E2E acceptance: first hi2vi write → push → Pages → live; search under auth | implementation | medium | 5 | S4 |

**Rationale + scope per slice** (the executor writes each `plan.md` at its own turn — these are scope sketches, not plans):

- **P8.S1 — publish-on-write (risk: high).** The biggest, most delicate item and the phase's core new capability: server-side `git push` (§2). Add a `push()` to `server/gitops.py` (fetch + rebase-onto-`origin/main` + non-force push), a `KB_GIT_PUSH` config flag (default false → local never pushes), wire it into the commit-producing mutating paths, and add `pushed`/`push_error` to the 201/DELETE bodies with best-effort semantics mirroring `committed`/`commit_error`. Tests against a **local bare remote** (no network/credentials needed in the executor's env). **High** because it touches gitops/push and a bad push discipline could clobber `main` — it needs full judgment on rebase/divergence/failure semantics.

- **P8.S2 — hosted read auth (risk: medium).** Add the `KB_REQUIRE_READ_AUTH` flag (§3); apply the existing `require_bearer` to the read/search routes only when it is true + `KB_API_TOKEN` set; keep healthz open; no CORS. Small, well-scoped, but touches auth → not `low`. Tests: reads open by default, 401 under the flag without bearer, 200 with it.

- **P8.S3 — prod deploy artifacts (risk: medium).** Author the box artifacts (§1): `compose.prod.yml` (api-only, own-clone mount, external `changple_shared_network`, the box env incl. the new flags), the `knowledge.hi2vi.com` nginx vhost conf (re-resolution + TLS), and a **runbook** (box clone setup, bring-up, the edge re-apply + cross-repo `apply-to-edge.sh` handoff note). **No secrets in any artifact** (env by name only). Operator SSH-applies later; this slice produces ready-to-run artifacts + a validate-after-apply gate. Prod deploy → not `low`.

- **P8.S4 — secrets provisioning + frozen contract (risk: medium).** Two things: (a) a **secrets/DNS provisioning runbook** shaped as explicit **operator pending handoffs** (KB_API_TOKEN, deploy key + GitHub deploy-key add, Cloudflare DNS record, optional Gemini key — §5); (b) **freeze the consumer contract** hi2vi `P15.S4` codes against (§5) and record the doc-impact so the review consolidates it into `api.md`. Defines the cross-repo contract → judgment, medium.

- **P8.S5 — E2E acceptance (risk: medium, operator-gated).** After the box is live: verify `docs/hi2vi/` bootstrap (auto-landing, distinct from `docs/hi2vi_web/`), then the full acceptance — a `project:"hi2vi"` write to `https://knowledge.hi2vi.com` → 201 `pushed:true` → commit on `main` → Pages deploy passes `site_smoke.py` → doc live at the Pages URL; `GET /api/search` + get read back **under bearer**; **401** without the token. Requires the live endpoint → an operator-applied gate precedes it (pending). Validation-heavy + cross-repo → medium.

**Pending handoff points** (operator-only actions, flagged so the orchestrator sees them coming):
- P8.S3: box clone setup + `docker compose -f compose.prod.yml up`, edge conf/cert drop + `apply-to-edge.sh` extension (cross-repo), on the OCI box (assume the agent has **no SSH access** — these are operator-applies-then-validates gates).
- P8.S4: KB_API_TOKEN generation, SSH deploy-key generation + GitHub deploy-key registration, Cloudflare DNS record, optional Gemini key.
- P8.S5: the endpoint must be live (operator brought it up) before the E2E runs; likely a `pending` gate on the operator to confirm bring-up.

**Cross-repo ordering (operator asked "which order, for both repo"):**
- hi2vi `P15.S1–S3` do **not** depend on P8 — run independently, any time.
- hi2vi `P15.S4` (research + knowledge-write client) consumes P8's **frozen contract** at planning time → freeze it (P8.S4, which depends on the S1/S2 shapes) before P15.S4 plans. P8.S4's contract-freeze is the cross-repo unblock and can be prioritized once S1/S2 land.
- hi2vi `P15.S9` (e2e) needs the **live endpoint** → P8.S3+S4+S5 (deploy + secrets + acceptance) must complete before P15.S9.
- P7 (this repo, plugin) is independent of both.

## Findings & Notes

Verified ground truth (recon spot-checks this DECOMP ran — trust the plan's recon, these confirm what the slices build on):

- **Auth is a plain FastAPI dependency.** `require_bearer` (`server/main.py:64`) is a no-op when `KB_API_TOKEN` is unset, else exact-matches `Authorization: Bearer <token>` → 401. Reads (`/api/documents`, `/api/search`, `/api/tags`, `/api/projects`, `healthz`) currently take **no** auth dependency. Gating reads (S2) = adding a flag-conditional dependency to those routes — clean, small.
- **`server/gitops.py` has no push/remote/credential code at all** — `add()` (scoped `--`, never `-A`) + `commit()` (returns HEAD sha) only, every failure → `GitError`. S1 adds `push()` net-new; there is nothing to unwind.
- **Config is env-at-call-time** (`server/config.py`, never cached at import) — adding `KB_GIT_PUSH` / `KB_REQUIRE_READ_AUTH` follows the existing `git_commit_enabled()` / `api_token()` pattern exactly (falsy parse `{0,false,no,off}`).
- **The image already ships `git`** and system-level identity + `safe.directory` (`Dockerfile`), so `push()` in-container needs only the SSH credential + remote — no image changes for the push mechanic itself (a deploy-key mount is a compose concern).
- **`compose.yml` today is local-only**: bind-mounts the working tree (`.:/repo`), publishes 8765/8766, no auth/push/TLS/prod env. The prod compose (S3) is a **separate file**, api-only, own-clone — it does not touch the local `compose.yml`.
- **`KB_PUBLIC_BASE_URL` is the viewer origin for the 201 `url` field** (`config.py:39`), *not* the API's own origin — set it to the Pages URL on the box (`site_url` is `https://leetusik.github.io/knowledge/`) so `url` points at the real published doc. Distinct from `KNOWLEDGE_API_URL` (the API origin the consumer hits).
- **`docs/hi2vi/` does not exist yet** (only `docs/hi2vi_web/`), so the first `project:"hi2vi"` write auto-creates its landing via P7.F1 — bootstrap is verify-only.
- **Origin remote is `https://github.com/leetusik/knowledge.git`** — the box clone will use the SSH form (`git@github.com:leetusik/knowledge.git`) for deploy-key push.
- **Rebuild quirk (operations.md):** `COMPOSE_BAKE=false docker compose up -d --build` on this host — carry the same note into the prod bring-up runbook.

## Constraints

- **Operator sign-off precedes implementation** (intent.md): P8.S1+ do not run until the operator approves the proposal above.
- **Local/plugin UX must survive:** reads open-by-default (no token = open), no push locally — both new behaviors are **flag-gated off by default** (`KB_REQUIRE_READ_AUTH`, `KB_GIT_PUSH`); only the box turns them on.
- **No secrets in the repo:** `KB_API_TOKEN`, the push credential, and the Gemini key live only in the box's env/mount, never committed (extends security.md's existing secret-handling rule).
- **Never `git push --force`; never `git add -A`** — the scoped-commit + rebase-onto-remote discipline is the invariant that keeps the box from clobbering `main`.
- **The agent may have no SSH access to the box** — deploy slices produce ready-to-run artifacts + operator-applies-then-validates gates, not live changes.
- **Edge fragility is a documented, accepted operational cost** — knowledge.hi2vi.com rides the same fragile shared edge as hi2vi.com until Option B (D2); the runbook must state the post-changple5-deploy re-apply rule.
- Executor contract: middle slices append their own findings here; durable-truth changes go to **Doc impact** (below), versioned once at P8.REVIEW — never per slice.

## Doc impact

Expected durable-truth changes for **P8.REVIEW** to consolidate into new doc versions (one per doc, capturing the whole phase):

- **`docs/current/api.md`** — hosted deployment section + the **frozen consumer contract** (base URL `https://knowledge.hi2vi.com`, `KNOWLEDGE_API_URL`/`KNOWLEDGE_API_TOKEN`, the new 201 `pushed`/`push_error` fields, read/search now behind bearer on the hosted deployment). This published api.md is the pointer the hi2vi repo references. (Sources: P8.S1, S2, S4.)
- **`docs/current/operations.md`** — production deployment on the OCI box: `compose.prod.yml` (api-only, own-clone, `changple_shared_network`), the `knowledge.hi2vi.com` vhost + TLS, `KB_GIT_PUSH`/`KB_REQUIRE_READ_AUTH`/`KB_PUBLIC_BASE_URL` box env, the edge re-apply rule + cross-repo `apply-to-edge.sh` handoff, publish-on-write flow, bring-up runbook. (Sources: P8.S1, S3, S5.)
- **`docs/current/security.md`** — hosted auth model (reads behind bearer via `KB_REQUIRE_READ_AUTH`; writes already guarded), the push credential (repo-scoped SSH deploy key, box-only), secret provisioning on the box, the deliberate scoped departure from "agent never pushes". (Sources: P8.S1, S2, S4.)
- **`docs/current/architecture.md`** — the hosted-deployment shape (public co-tenant API on the shared edge; box clone + server-side push as the publish-on-write path; local vs hosted flag-gated behavior). Possibly light — confirm at review whether operations/security already carry it. (Sources: P8.S1, S3.)

## Open Questions

- **TLS cert mechanism** — does hi2vi.com use a Cloudflare Origin CA `*.hi2vi.com` cert (one cert covers knowledge.hi2vi.com free) or a per-host cert? Confirm with the operator / hi2vi repo at P8.S3 so the vhost references the right cert. Recommendation assumes a wildcard origin cert.
- **Push credential form** — SSH deploy key (recommended) vs fine-grained PAT. Operator preference at P8.S4; either works with the same `push()` code (remote URL differs).
- **Gemini key at launch** (§7) — provision now (recommended) or BM25-only launch. Operator call at P8.S4/S3; zero code impact either way.
- **DELETE push scope** — apply `pushed`/`push_error` to DELETE too (recommended, for consistency) or POST-only. Settle in P8.S1's plan.
