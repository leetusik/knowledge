# P9.DECOMP — decompose the self-hosted-site + automated-deploy phase

**You are `slice-executor-high` executing the decomposition slice.** Your job is **only**:
1. Create the five middle slices as **bare folders** via `new-slice` (commands below) — do **not**
   pre-fill their `plan.md`.
2. Record the **slice breakdown + rationale** in `phase.md`'s **Decomposition** section, and the
   **design proposal (§A–§H)** in **Findings & Notes**, and seed the **Doc-impact** list.
3. Return a structured verdict.

Do **not** implement any code, write any slice's `plan.md`, version docs, or transition phase/slice
status. `intent.md` (expanded 2026-07-15) and `phase.md` Objective/Context were already updated by the
orchestrator — **read them first** for the confirmed scope. This phase is **design-first**: the design
you record is what the operator signs off on before S1.

## Read first
- `works/phases/active/P9/intent.md` — esp. "Expanded & Confirmed Intent" + "Clarifications Resolved".
- `works/phases/active/P9/phase.md` — Objective + Context (already reframed).
- For grounding, skim: `compose.yml` (the local `kb` service), `compose.prod.yml`, `Dockerfile`,
  `deploy/knowledge.conf`, `server/gitops.py`, `mkdocs.yml`, `.github/workflows/pages.yml`,
  `scripts/site_smoke.py`, `plugin/templates/manifest.json`, and (sibling repo, reference to mirror)
  `hi2vi_web/deploy/{deploy.sh,oracle-production-deploy-remote.sh,github-actions-production-deploy.sh,rollback.sh}`
  + `hi2vi_web/.github/workflows/deploy-production.yml`.

## Create the five middle slices (bare)
```
python3 scripts/workflow.py new-slice --phase P9 --slice P9.S1 --name "Self-host the web UI + retire Pages" --kind implementation --risk high --order 1
python3 scripts/workflow.py new-slice --phase P9 --slice P9.S2 --name "On-box deploy: reconcile + redeploy both services + edge re-apply" --kind implementation --risk high --order 2
python3 scripts/workflow.py new-slice --phase P9 --slice P9.S3 --name "GHA driver + Production Deploy workflow" --kind implementation --risk medium --order 3
python3 scripts/workflow.py new-slice --phase P9 --slice P9.S4 --name "Runner SSH-key provisioning runbook + operator gate" --kind implementation --risk medium --order 4
python3 scripts/workflow.py new-slice --phase P9 --slice P9.S5 --name "E2E acceptance (real dispatch)" --kind implementation --risk high --order 5
```
Risk sets the executor tier and is the phase's cost lever — the ratings above are deliberate
(rationale in the breakdown). Run `python3 scripts/workflow.py validate` after creating them.

## Record in phase.md → Decomposition (breakdown + rationale)
- **P9.S1 — Self-host the web UI + retire Pages (high).** Add the `knowledge-site` live-serve viewer
  to `compose.prod.yml`; split the edge vhost into `/`→site + `/api/*`+`/healthz`→api; cut
  `site_url`/`KB_PUBLIC_BASE_URL`/`params.operator.json` KB_SITE_URL to `knowledge.hi2vi.com`; disable
  `pages.yml` and fix its `site_smoke.py`/plugin-parity/CI coupling. High: a wrong vhost split =
  outage; multiple coupled surfaces; the enabling core. Locally validatable (`docker compose config`,
  local `mkdocs serve`, `site_smoke.py`, `plugin_parity.py`).
- **P9.S2 — On-box deploy: reconcile + redeploy both + edge re-apply (high).** The publish-on-write-safe
  reconciliation (can't copy hi2vi), rollback for mount-based code, root-owned `.git`; `deploy.sh`
  brings up **both** containers + health-gates both; edge two-location re-apply. High: the novel core.
- **P9.S3 — GHA driver + workflow (medium).** SSH-transport driver + `deploy-production.yml`
  (workflow_dispatch, main-guard, 3 `ORACLE_SSH_*` secrets, external smoke on `/` and `/healthz`,
  artifacts). Close hi2vi mirror.
- **P9.S4 — Runner SSH-key provisioning + operator gate (medium).** Precise secrets runbook + a
  `pending` gate. Not low — a mis-authored secrets runbook is dangerous.
- **P9.S5 — E2E acceptance (high).** Real dispatch; verify reconcile, both containers healthy, routing,
  UI live, **fresh-on-write**, no-secrets-in-logs, unpushed-doc safety, Pages cutover. Operator co-work.

Note: DECOMP may **split S1** (fractional `--order`, e.g. S1a viewer+routing+URL, S1b Pages retirement)
if the surface proves too broad — but default to one slice; the parts are cohesive.

## Record in phase.md → Findings & Notes (the design proposal for sign-off, §A–§H)

**A. Self-host the web UI — live-serve viewer.** New `compose.prod.yml` service mirroring local
`compose.yml`'s `kb`: `image: squidfunk/mkdocs-material:9.7.6`, `command: serve --dev-addr=0.0.0.0:8000`
(keep the watch → rebuilds on doc change), `container_name: knowledge-site`, `volumes: [ .:/docs ]`
(same box clone the api mounts), on `changple_shared_network`, `restart: unless-stopped`, + a
**healthcheck** (python-urllib GET `/`→200, like the api's — the image has no curl). Serves live from
`docs/`; api writes appear with no rebuild step.

**B. Edge vhost — two-location routing (`deploy/knowledge.conf`).** Split today's single `location /`
(all→`knowledge-api`) into `location /api/` + `location = /healthz` → `knowledge-api:8000`
(unchanged) and `location /` → new `knowledge-site:8000`. Reuse the `resolver 127.0.0.11` + `set $var`
+ variable-in-`proxy_pass` re-resolution pattern per upstream. Honor edge house rules: **no**
`default_server`, **no** IPv6 `listen`, **no** `limit_req_zone`. Consider websocket-upgrade headers on
`/` for mkdocs livereload (cosmetic — server-side rebuild works regardless).

**C. URL cutover + Pages retirement.**
- `mkdocs.yml:2` `site_url` → `https://knowledge.hi2vi.com/` (drop the `/knowledge/` subpath — root) +
  `plugin/templates/params.operator.json` `KB_SITE_URL` identically (parity-locked; else plugin-ci fails).
- `compose.prod.yml` `KB_PUBLIC_BASE_URL` → `https://knowledge.hi2vi.com` (201 `url`; **no code change**
  — `server/config.py`/`main.py` are plugin-`identical`).
- Disable `pages.yml` — **can't just `rm`:** `scripts/site_smoke.py:147-160` reads it for pin parity
  and `plugin/templates/manifest.json:43` lists it `identical` (both CIs red if the root file vanishes).
  Preferred: neutralize the workflow (drop the `push` trigger) + repoint `site_smoke.py`'s pin-parity
  source, keeping the file present for parity; finalize in S1. The **shipped plugin keeps Pages** for
  downstream users (`plugin/templates/kb/.github/workflows/pages.yml` untouched) — retire Pages for
  **this** site only.
- **Cutover safety:** disabling the workflow doesn't take the Pages *site* down (serves last build until
  the operator flips repo Settings→Pages off) → box site proven live (S5) **before** Pages off. No gap.
  knowledge.hi2vi.com already resolves to the box (Cloudflare→edge) — no DNS change.

**D. Deploy-script shape — mirror hi2vi's three-script split (now both services).**
`deploy/github-actions-production-deploy.sh` (runner, transport only: key+known_hosts → `umask 077`
tempdir, `StrictHostKeyChecking=yes` + pinned `UserKnownHostsFile`, `scp` remote gate, invoke with
`TARGET_SHA`/`REPO_PATH=/opt/knowledge`/`REMOTE_ARTIFACT_DIR`, collect artifacts; host/user/port are
non-secret env defaults). `deploy/oracle-production-deploy-remote.sh` (on-box gate: verify → hand to
`deploy.sh` → re-apply edge §B → collect artifacts). `deploy/deploy.sh` (reconcile §E → `COMPOSE_BAKE=false
docker compose -f compose.prod.yml up -d --build` bringing up **both** api+site → health-gate **both**
→ rollback §F). `deploy/rollback.sh` (manual, per §F).

**E. Publish-on-write reconciliation (the deploy core).** Replaces hi2vi's detached `git checkout`:
dirty-tracked-worktree refusal reused verbatim (`! git diff --quiet || ! git diff --cached --quiet` —
permits *ahead/unpushed*, refuses only a *mid-write*) → `git fetch --prune origin main` → ancestor-gate
(`FETCH_HEAD^{commit}` + `cat-file -e $SHA^{commit}` + `merge-base --is-ancestor`) → reconcile **on
`main`**: `git merge --ff-only` if behind, `git rebase $fetched` if ahead/diverged (the container's own
discipline; conflict → `rebase --abort` + refuse). **Never** detach/reset/force. Root-owned `.git`: run
reconcile via one-shot `docker run --rm -v /opt/knowledge:/repo <image> git …` (uid 0, reuses baked
`safe.directory`) **or** `sudo git` — recommend one. Concurrency: retry transient `.git/index.lock`,
accept the small residual race (manual dispatch is rare, writes ~6 s).

**F. Rollback (mount-based code).** Image-tag flip won't revert mounted `server/`. **v1 (recommended):
health-gate-and-report, no auto git rollback** — capture artifacts, exit non-zero, recover by
fix-forward (merge a fix to `main`, re-dispatch). v2 (optional): best-effort git rollback to a recorded
`PREV_HEAD` only if a clean ff-back with no stranded doc commits. Present both; operator signs off.

**G. Runner SSH-key provisioning (S4).** Net-new runner→`opc@box` key as three repo secrets on
`leetusik/knowledge` (mirror hi2vi: `ORACLE_SSH_PRIVATE_KEY`, `ORACLE_SSH_KNOWN_HOSTS`,
`ORACLE_SSH_PASSPHRASE`). Present: (a) reuse hi2vi's existing key vs (b) mint a **dedicated** knowledge
runner key (**recommended**, given P8's leaked-key history). **Distinct** from the container's git
deploy key `knowledge-api@oci-box` (P8) — P9 never touches that.

**H. Fresh-on-write linchpin (must be proven in E2E).** Live-serve freshness depends on mkdocs' file
watcher detecting the api container's writes to the shared bind-mounted `docs/`. On the Linux box,
cross-container inotify over a shared bind mount should fire (same host inode) — but this is the
**critical assumption** of the live-serve choice and **S5 must prove it** (POST a doc → appears on the
site with no restart). Fallback: mkdocs' polling watch, or switch that one service to rebuild-on-write.

## Seed phase.md → Doc-impact (for P9.REVIEW to consolidate)
- `operations.md` — self-hosted deploy + publishing model; **drop the ~65 s Pages SLA**; the redeploy
  procedure; the site service.
- `architecture.md` — Track 1 becomes **self-hosted** (not Pages); two services on one box.
- `api.md` — 201 `url` origin (knowledge.hi2vi.com) + publish mechanism (no longer Pages).
- `security.md` — public-site premise now via the box; the runner SSH key credential.
- `decisions.md` — new ADRs: self-host the site, live-serve choice, retire Pages, automated deploy +
  reconcile/rollback divergences from hi2vi, runner key.
- `deploy/README.md` — extend with the redeploy procedure + the `knowledge-site` service (not a durable
  `docs/` doc, but note it for S1/REVIEW).

## Verdict
Return `done` with: the five slices created (ids/risks/orders), a one-line confirmation that phase.md's
Decomposition + Findings/Notes (§A–§H) + Doc-impact are filled, and `validate` clean. If anything is
beyond scope or ambiguous, return `escalate` with findings (do not guess).
