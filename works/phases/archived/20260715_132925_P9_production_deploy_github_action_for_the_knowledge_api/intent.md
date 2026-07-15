# Intent — P9

- Captured at: 2026-07-15T08:34:05+09:00
- Origin: operator (immediately after P8 go-live — the knowledge API is now live at
  https://knowledge.hi2vi.com, deployed by hand this session)

## Original Input (verbatim)

> and so you did the change the edge project to deploy this? good. I think we should have
> production deploy github action like other projects

## Scope Expansion — Original Input (verbatim, 2026-07-15, mid-DECOMP-planning)

> And note that I'm not want to deploy only the API but the whole webpage at the knowledge web.
> So that the otters [others] can access to the knowledge yourself itself I mean, distict from
> hi2vi btw (the webui using existing one, and no longer github webpage will be needed. only the
> public url)

## Confirmed Intent (refined + clarified) — API-deploy baseline (EXPANDED below)

> **Superseded/expanded 2026-07-15:** the confirmed intent below captured the original API-only
> deploy automation. It still holds as the deploy **core**, but the phase scope has been **expanded**
> — see **Expanded & Confirmed Intent** after this section. Read both.

Replace this session's **hand-run** production deploy of the knowledge API with a **GitHub
Action**, mirroring the pattern the operator's other projects on the same shared OCI box already
use (`hi2vi_web/.github/workflows/deploy-production.yml` + its `deploy/` script chain). Today a
code change to `server/*`, the `Dockerfile`, or `compose.prod.yml` only reaches production when
someone SSHes into the box and manually runs `git fetch/merge` + `docker compose -f
compose.prod.yml up -d --build`, and the edge vhost (`deploy/knowledge.conf`) was applied by hand
into `/home/opc/edge/conf.d/`. This phase makes that flow **repeatable and auditable**.

**The phase delivers** a `Production Deploy` workflow for `leetusik/knowledge`, mirroring
`hi2vi_web`'s: **manually triggered** (`workflow_dispatch`), main-branch-guarded, that SSHes into
the shared OCI box and, in one disciplined on-box script:

1. **Redeploys the `knowledge-api` container** from the target `main` SHA — fetch `origin/main`,
   verify the target SHA is an ancestor of fetched `origin/main` (never `reset --hard`/force),
   on-box **ARM/aarch64 build** (the OCI Ampere box can't use an x86 runner image — same reason
   hi2vi builds on the box), bring up via `compose.prod.yml`, **health-gate** on
   `/healthz` over the shared network, and **roll back** on failure.
2. **Re-applies the edge vhost** — drop `deploy/knowledge.conf` into `/home/opc/edge/conf.d/` and
   reload through the edge's **own** `./deploy.sh` (hard `nginx -t` gate → graceful reload, never
   recreate). This makes the vhost repeatable from git instead of the hand-applied, un-versioned
   host file it is now (`/home/opc/edge` is a plain directory, not a repo).
3. **External smoke** after deploy: `https://knowledge.hi2vi.com/healthz` → 200 (no secrets in the
   workflow logs), like hi2vi's public-URL smoke.

**The knowledge-specific wrinkle DECOMP must design around (this is why it is its own phase, not a
copy-paste of hi2vi's):** the box clone at `/opt/knowledge` is **also the publish-on-write clone** —
the running container commits agent docs to it and pushes them to `main` (P8). hi2vi's box clone is
deploy-only. So the deploy must **never discard an unpushed publish-on-write commit** nor
force-move the checkout out from under the running container: it has to reconcile the box clone
with `origin/main` using the same fetch + ancestor/ff discipline the write path uses, and decide
what happens if the box is legitimately ahead of `origin` (a doc written but not yet pushed).

**Design-first, like P8:** the DECOMP slice **proposes** the deploy-script shape (GHA driver +
on-box remote script + build/health/rollback helper, mirroring hi2vi's three-script split),
the publish-on-write reconciliation strategy, and the **GitHub secret provisioning** (the runner
needs an SSH key to reach `opc@box` — a **different** credential from the container's git deploy
key `knowledge-api@oci-box`; likely the same `ORACLE_SSH_*` secret set hi2vi uses, added to the
`leetusik/knowledge` repo), for **operator sign-off before implementation**.

## Expanded & Confirmed Intent (2026-07-15)

Mid-DECOMP-planning the operator expanded the scope: **the production deploy should ship the whole
webpage, not just the API.** The box must **self-host the human web UI** so people browse the
knowledge base directly at **https://knowledge.hi2vi.com** (distinct from hi2vi), **reusing the
existing mkdocs web UI**, and **GitHub Pages is retired** — one public URL serves everything.

So P9 is reframed to: **self-host the full knowledge site — human web UI *and* machine API — at
`knowledge.hi2vi.com`, behind one manual-dispatch production-deploy GitHub Action, retiring GitHub
Pages.** Everything in the API-deploy baseline above still holds as the **deploy core** (the
publish-on-write reconciliation, the three-script split, health-gate/rollback, runner secrets,
external smoke). Added on top:

1. **Self-hosted web UI (live-serve).** Add a `knowledge-site` viewer service to `compose.prod.yml`
   running `mkdocs serve` off the same box clone the api mounts — mirroring the local `compose.yml`
   `kb` service. The site is fully static/client-side (lunr + `graph.json`) and never calls the API,
   so viewer and API are independent services sharing the domain. Because the box clone holds each
   doc the instant the container writes it, the site is **fresher than Pages** (~65 s
   push→Pages→CDN lag → **near-instant**); the git push continues **only for off-box backup/history**.
2. **Two-location edge routing.** Split `deploy/knowledge.conf`'s single `location /` into
   `/` → `knowledge-site:8000` (humans) and `/api/*` + `/healthz` → `knowledge-api:8000` (agent).
3. **URL cutover.** `site_url` + `KB_PUBLIC_BASE_URL` (+ parity-locked `params.operator.json`
   `KB_SITE_URL`) → `https://knowledge.hi2vi.com/` (served at the domain root, dropping `/knowledge/`).
4. **Retire GitHub Pages for this site.** Disable `pages.yml` (cleaning up its `site_smoke.py`
   pin-parity read + `plugin/templates/manifest.json` parity coupling so CI stays green). The shipped
   **plugin keeps** Pages for downstream users — this retires Pages for **this** repo's site only.
   Cutover is safe: the box site is proven live before repo Settings→Pages is turned off (no gap).
5. **The deploy now brings up both services** (`docker compose up -d --build` → `api` + `site`),
   health-gates both, and the E2E must prove the **fresh-on-write linchpin** (mkdocs' watcher sees
   the api container's writes to the shared bind-mounted `docs/`).

## Clarifications Resolved

- Q: How should the deploy be triggered? — A: **Manual dispatch (`workflow_dispatch`)**, like
  `hi2vi_web`'s `deploy-production.yml`. (Also the safe choice given publish-on-write: the agent's
  constant doc pushes to `main` must never trigger a server redeploy — manual dispatch sidesteps
  that entirely; an auto-on-code-push CD variant was considered and declined.)
- Q: What should the deploy cover? — A: **API server redeploy AND edge vhost re-apply** — the
  workflow re-drops `deploy/knowledge.conf` into the edge and reloads it, so the vhost lives in git
  and re-applies repeatably (closes the durability gap that it is currently a hand-applied,
  un-versioned host file).
- Q (2026-07-15): How should the box serve the web UI? — A: **Live-serve** — a `mkdocs serve` viewer
  container mirroring the local `kb` service (fresh-on-write, near-zero glue). Static
  rebuild-on-write and periodic-cron rebuild were considered and declined (more glue / staleness).
- Q (2026-07-15): What happens to GitHub Pages? — A: **Retire it fully** — the box becomes the sole
  public site; `pages.yml` disabled; the git push is kept only for off-box backup. Keeping Pages as
  a fallback mirror was considered and declined.

## Notes

- **Reference implementation to mirror:** `hi2vi_web/.github/workflows/deploy-production.yml` +
  `hi2vi_web/deploy/{deploy.sh, github-actions-production-deploy.sh, oracle-production-deploy-remote.sh,
  rollback.sh}`. Its remote script already does the "refuse dirty worktree / fetch origin main /
  verify target SHA is an ancestor / hand off to deploy.sh for checkout+build+health-gate+rollback"
  dance — the knowledge version adapts it for the publish-on-write clone.
- **Corroboration of the P8.F2 edge finding:** hi2vi's own deploy workflow header states the box now
  runs "the standalone `edge` project (formerly the shared changple5-nginx-1 edge, migrated
  2026-07-03)" — confirming P8.F2's retarget was correct and that `deploy/knowledge.conf` is already
  the right source-of-truth artifact for this phase to re-apply.
- **Two distinct credentials, do not conflate:** (a) the GHA runner → `opc@box` SSH key (this
  phase; for running the deploy) vs (b) the container → GitHub git deploy key `knowledge-api@oci-box`
  (P8; for publish-on-write). DECOMP provisions (a) only.
- **Cross-repo:** none blocking. This is knowledge-repo-internal; it does not change the frozen hi2vi
  consumer contract from P8.
- Created immediately after P8's review pass; P8 stays `done` in `active/`. P9 is a fresh phase with
  only `DECOMP` + `REVIEW` — **not decomposed or executed yet** (this is phase creation only).
