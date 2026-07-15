# P9.S3 result — GHA driver + `Production Deploy` workflow + on-box gate

**Verdict: `done` (author + static-validate only; zero production impact).** Authored the three
CI-to-box wrapper files around S2's `deploy/deploy.sh`, mirroring `hi2vi_web`'s proven three-script
split, adapted for the `/opt/knowledge` publish-on-write clone + the two-service + edge-re-apply shape.
No box SSH, no `workflow_dispatch`, no `docker`. First real run is **S5**.

## Files authored (3, all new)

1. **`deploy/github-actions-production-deploy.sh`** (runner driver, SSH transport only, `+x`).
   Near-verbatim mirror of hi2vi's. Knowledge specifics: `ORACLE_REPO_PATH` default `/opt/knowledge`;
   `/tmp` names `knowledge-gha-deploy-…` / `knowledge-gha-artifacts-…`; the header comment. Kept
   verbatim: `set -Eeuo pipefail`, `validate_inputs` (40-hex `TARGET_SHA` + the three `ORACLE_SSH_*` +
   host/user/repo-path required, numeric port, remote helper exists), `prepare_ssh` (`umask 077`
   tempdir; `-o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=<pinned>
   -o IdentitiesOnly=yes`; optional passphrase via `ssh-agent`+askpass), `scp` the gate to `/tmp`,
   `ssh` chmod+mkdir, `printf %q`-quoted invoke with `TARGET_SHA`/`REPO_PATH`/`REMOTE_ARTIFACT_DIR`,
   artifact collection, `cleanup` trap. No git, no docker — transport only.

2. **`deploy/oracle-production-deploy-remote.sh`** (on-box gate = the authoritative gate, `+x`).
   Verify → deploy → edge re-apply → collect:
   - **Verify** (read-only, as hi2vi): assert 40-hex `TARGET_SHA` + `$REPO_PATH/.git`; capture
     `git status --short --branch`; refuse a dirty **tracked** worktree (`! git diff --quiet ||
     ! git diff --cached --quiet` — permits ahead/unpushed); `git fetch --prune origin main`;
     `fetched=$(git rev-parse --verify FETCH_HEAD^{commit})`; `git cat-file -e $TARGET_SHA^{commit}`;
     `git merge-base --is-ancestor $TARGET_SHA $fetched`. **Knowledge adaptation:** every git call goes
     through a `GIT=(git -c "safe.directory=$REPO_PATH")` wrapper so opc's reads don't trip "dubious
     ownership" on the root-owned `.git` objects (the api container commits as uid 0) — the plan's
     sanctioned `-c safe.directory` fallback, applied up front rather than conditionally.
   - **Deploy hand-off:** `deploy/deploy.sh "$TARGET_SHA"` tee'd into `deploy-output.txt` /
     `deploy-error.txt`. On non-zero deploy → summary + `exit $deploy_status`, **edge NOT re-applied**.
   - **Edge re-apply** (only after a healthy deploy, so containers are up before `/` cuts over):
     `install -m 0644 $REPO_PATH/deploy/knowledge.conf /home/opc/edge/conf.d/knowledge.conf`, then
     `( cd /home/opc/edge && ./deploy.sh )` (the edge's own hard `nginx -t` gate → graceful reload;
     never recreates `edge-nginx`), captured to `edge-reload.txt` and echoed. A failed edge `nginx -t`
     reloads nothing **and fails the deploy loudly** (`die`, non-zero) — healthy containers with stale
     routing is not a success. `EDGE_DIR` / `EDGE_VHOST` are env-overridable (default the literal
     paths).
   - **Artifacts:** `compose-ps.txt` (`docker compose -f compose.prod.yml ps` — no `-p`/`--env-file`,
     unlike hi2vi, because knowledge's compose bakes `env_file: .env`), `git-before`/`git-after`
     status, `edge-reload.txt`, `summary.md`; exit with the deploy status.

3. **`.github/workflows/deploy-production.yml`** (`Production Deploy`).
   `on: workflow_dispatch`; `permissions: contents: read`. **`preflight`** guards
   `GITHUB_REF == refs/heads/main` (else fail) and outputs `target_sha=${GITHUB_SHA}`. **`deploy`**
   (`needs: preflight`, `timeout-minutes: 90`, `environment: production` url
   `https://knowledge.hi2vi.com`, `concurrency: {group: knowledge-deploy, cancel-in-progress: false}`):
   checkout@v4 at `target_sha` → `bash -n` the three helpers → run the driver with `TARGET_SHA` + the
   three `${{ secrets.ORACLE_SSH_* }}` + `ARTIFACT_DIR` → **external smoke on BOTH surfaces**
   (`/healthz` → 200 **and** `/` → 200, 5×/6 s retry, both must pass under `set -e`) →
   upload-artifact@v4 (`if: always()`, retention 14 d).

## Static validation (no box access) — all pass

| check | command | result |
|---|---|---|
| `bash -n` driver | `bash -n deploy/github-actions-production-deploy.sh` | **OK** |
| `bash -n` gate | `bash -n deploy/oracle-production-deploy-remote.sh` | **OK** |
| `bash -n` deploy.sh (S2) | `bash -n deploy/deploy.sh` | **OK** |
| `bash -n` embedded `run:` blocks | extracted all 4 → `bash -n` each | **OK** |
| YAML lint | `ruby -ryaml YAML.load_file(...)` (actionlint + pyyaml **unavailable** in this env) | **parsed OK**, structure verified (name, `workflow_dispatch`, `permissions.contents=read`, 2 jobs, `deploy.needs=preflight`, timeout 90, environment url, concurrency `knowledge-deploy`/`cancel-in-progress:false`, preflight output) |
| secret names | grep vs hi2vi | **identical set**: `ORACLE_SSH_PRIVATE_KEY`, `ORACLE_SSH_KNOWN_HOSTS`, `ORACLE_SSH_PASSPHRASE` |
| dual smoke targets | grep workflow | `smoke_one https://knowledge.hi2vi.com/healthz` **and** `.../` |
| no secret leakage | grep for echoed secrets | only the verbatim-from-hi2vi safe handling: key → umask-077 tempfile, passphrase → ssh askpass stdin; neither to a log |
| plugin parity | `python3 scripts/plugin_parity.py` | **PASS** (deploy files + this workflow are not in `plugin/templates/manifest.json` — no parity impact) |
| workflow state | `python3 scripts/workflow.py validate` | **PASS** ("Workflow validation passed.") |

`shellcheck` and `actionlint` are **not installed** in this environment; fallbacks used were `bash -n`
(shell syntax) and `ruby -ryaml` (YAML). Deeper lint is deferred to CI/S5.

## Deviations from `plan.md`

- **Log prefixes kept verbatim from hi2vi** (`[production-deploy]` driver, `[oracle-production-deploy]`
  gate) rather than knowledge-ified. The plan grouped "log prefix" with the `/tmp` name change
  (`→ knowledge-gha-…`), but those prefixes are generic (identical in hi2vi, not a hi2vi-specific
  string), so keeping them preserves the near-verbatim mirror and there is no knowledge-specific prefix
  to substitute. Only the genuinely hi2vi-specific `/tmp` names were changed. Cosmetic; log-only.
- **`-c safe.directory=$REPO_PATH` applied unconditionally** to the gate's git calls (via a `GIT` array)
  rather than only "if it trips dubious ownership." The plan sanctioned this fallback; applying it up
  front is strictly safer (a no-op when ownership is fine) given the box clone's documented root-owned
  `.git` objects, and can't be tested without box access.

Otherwise a faithful mirror; no other departures.

## For S5 — behavioral risks these scripts bet on (must be proven live)

1. **opc's `git fetch --prune origin main` in the gate.** The gate's fetch + ancestor check is the
   *authoritative* gate and runs as **opc** on the host — but knowledge's `origin` is the SSH form
   (`git@github.com:leetusik/knowledge.git`, per `deploy/README.md §1a`) whose deploy key is
   root-owned and readable only inside the container, and a fetch must also **write** fetched
   objects/refs into the root-owned `.git`. `-c safe.directory` suppresses the ownership *check* but
   does **not** grant opc read of the key nor write into root-owned `.git` subdirs. **S5 must confirm
   opc can actually fetch origin/main** (opc has its own GitHub SSH access, or the box's git setup
   permits it, or the write into `.git` succeeds). If it can't, the gate should fetch via the public
   HTTPS URL (repo is public — read needs no credential) or delegate the fetch/ancestor gate to
   deploy.sh's in-container path — a fix slice, informed here. (hi2vi's identical fetch-as-opc works,
   but hi2vi's clone is not a root-committing publish-on-write clone.)
2. **Edge re-apply as opc.** `install` into `/home/opc/edge/conf.d/` and `./deploy.sh` run as opc
   (owner of `/home/opc/edge`; opc is in the docker group) — no sudo. S5 confirms the reload path over
   the full conf.d/ tree (with `hi2vi.conf` + `00-default.conf`), not just this vhost in isolation.
3. **`docker compose ps` for artifacts** needs `.env` present (compose reads `env_file`); it exists by
   the time collect runs (deploy already ran), and the call is `|| true`-guarded.

## Doc impact appended to `phase.md`

Recorded an **S3-realized** note under the running Doc impact list (for **P9.REVIEW** to consolidate,
not versioned here): the manual-dispatch production deploy is now concretely realized as the
three-script GHA→box chain (`workflow_dispatch` main-guarded, `concurrency: knowledge-deploy`,
dual external smoke on `/` + `/healthz`, artifact upload) → the on-box authoritative gate
(verify → `deploy.sh` → edge re-apply) — durable truth for `operations.md` (redeploy procedure) and
`decisions.md` (the hi2vi three-script-split mirror + the edge-re-apply-in-gate + the
`workflow_dispatch`-only guard so publish-on-write pushes never redeploy).
