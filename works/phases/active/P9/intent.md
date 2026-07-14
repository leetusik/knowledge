# Intent — P9

- Captured at: 2026-07-15T08:34:05+09:00
- Origin: operator (immediately after P8 go-live — the knowledge API is now live at
  https://knowledge.hi2vi.com, deployed by hand this session)

## Original Input (verbatim)

> and so you did the change the edge project to deploy this? good. I think we should have
> production deploy github action like other projects

## Confirmed Intent (refined + clarified)

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

## Clarifications Resolved

- Q: How should the deploy be triggered? — A: **Manual dispatch (`workflow_dispatch`)**, like
  `hi2vi_web`'s `deploy-production.yml`. (Also the safe choice given publish-on-write: the agent's
  constant doc pushes to `main` must never trigger a server redeploy — manual dispatch sidesteps
  that entirely; an auto-on-code-push CD variant was considered and declined.)
- Q: What should the deploy cover? — A: **API server redeploy AND edge vhost re-apply** — the
  workflow re-drops `deploy/knowledge.conf` into the edge and reloads it, so the vhost lives in git
  and re-applies repeatably (closes the durability gap that it is currently a hand-applied,
  un-versioned host file).

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
