# P9.S3 — GHA driver + `Production Deploy` workflow + on-box gate

**You are `slice-executor-mid`.** Author the three CI-to-box wrapper files around S2's `deploy/deploy.sh`,
mirroring `hi2vi_web`'s proven three-script split, adapted for the knowledge checkout (`/opt/knowledge`) and
the two-service + edge re-apply shape. **Author + static-validate ONLY** — no box access; the workflow's first
real run is S5. If anything exceeds a mechanical mirror (a design ambiguity, the reference doesn't fit),
return `escalate` with findings rather than guessing.

## Read first
`phase.md` §D + Constraints; and the references to mirror (read them directly):
`/Users/sugang/projects/personal/hi2vi_web/deploy/github-actions-production-deploy.sh`,
`/Users/sugang/projects/personal/hi2vi_web/deploy/oracle-production-deploy-remote.sh`,
`/Users/sugang/projects/personal/hi2vi_web/.github/workflows/deploy-production.yml`. Also
`deploy/deploy.sh` (S2, what the gate calls), `deploy/knowledge.conf` (its header documents the edge apply
path), `compose.prod.yml`.

## Three files

### 1. `deploy/github-actions-production-deploy.sh` — runner driver (SSH transport only)
Mirror hi2vi's almost verbatim; change only knowledge specifics:
- Env defaults: `ORACLE_SSH_HOST=140.245.64.173`, `ORACLE_SSH_USER=opc`, `ORACLE_SSH_PORT=22`,
  **`ORACLE_REPO_PATH=/opt/knowledge`**; log prefix + `/tmp` script/artifact names → `knowledge-gha-deploy-…`
  / `knowledge-gha-artifacts-…`.
- Keep verbatim: `set -Eeuo pipefail`; `validate_inputs` (require `TARGET_SHA` 40-hex + the three
  `ORACLE_SSH_*` + host/user/repo-path; numeric port; remote helper exists); `prepare_ssh` (`umask 077`
  tempdir; `-o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=<pinned> -o IdentitiesOnly=yes`;
  optional passphrase via `ssh-agent`+askpass); `scp` the remote gate to `/tmp`; `ssh` chmod+mkdir; invoke with
  `TARGET_SHA`/`REPO_PATH`/`REMOTE_ARTIFACT_DIR` (`printf %q`-quoted); collect artifacts back; `cleanup` trap.
  **Transport only — no git/docker.**

### 2. `deploy/oracle-production-deploy-remote.sh` — on-box gate (verify → deploy → edge re-apply)
Mirror hi2vi's, adapted:
- Env: `TARGET_SHA`, `REPO_PATH=/opt/knowledge`, `REMOTE_ARTIFACT_DIR`, `COMPOSE_FILE=compose.prod.yml`.
- Verify (read-only, exactly as hi2vi): assert `TARGET_SHA` 40-hex + `$REPO_PATH/.git`; capture
  `git status --short --branch`; **refuse a dirty tracked worktree** (`! git diff --quiet || ! git diff
  --cached --quiet` — permits *ahead/unpushed*, refuses only a *mid-write*); `git fetch --prune origin main`;
  `fetched=$(git rev-parse --verify FETCH_HEAD^{commit})`; `git cat-file -e $TARGET_SHA^{commit}`;
  `git merge-base --is-ancestor $TARGET_SHA $fetched`. These read-only checks run as `opc` and only read refs
  (root-owned loose objects are world-readable); if any trips "dubious ownership", pass
  `-c safe.directory=/opt/knowledge`.
- Hand off to **S2's** `deploy/deploy.sh "$TARGET_SHA"` (tee stdout/err into the artifact dir).
- **Then re-apply the edge vhost** (after `deploy.sh` succeeds — containers healthy before `/`→site cuts over):
  `install -m 0644 /opt/knowledge/deploy/knowledge.conf /home/opc/edge/conf.d/knowledge.conf`, then
  `( cd /home/opc/edge && ./deploy.sh )` (the edge's own hard `nginx -t` gate → graceful reload; **never**
  recreate `edge-nginx`). Capture its output; a failed edge `nginx -t` reloads nothing and **must fail the
  deploy loudly**.
- Collect artifacts (`docker compose -f compose.prod.yml ps`, `git status`, the edge reload log) + a
  `summary.md`; exit with the deploy status.

### 3. `.github/workflows/deploy-production.yml`
Mirror hi2vi's, knowledge specifics:
- `name: Production Deploy`; `on: workflow_dispatch`; `permissions: contents: read`.
- **`preflight`**: guard `GITHUB_REF == refs/heads/main` (else fail), output `target_sha=${GITHUB_SHA}`.
- **`deploy`** (`needs: preflight`, `timeout-minutes: 90`, `environment: { name: production, url:
  https://knowledge.hi2vi.com }`, `concurrency: { group: knowledge-deploy, cancel-in-progress: false }`):
  (1) `actions/checkout@v4` at `target_sha`; (2) validate helpers `bash -n deploy/deploy.sh
  deploy/github-actions-production-deploy.sh deploy/oracle-production-deploy-remote.sh`; (3) run the driver with
  `env:` `TARGET_SHA` + `ORACLE_SSH_PRIVATE_KEY`/`ORACLE_SSH_KNOWN_HOSTS`/`ORACLE_SSH_PASSPHRASE`
  (`${{ secrets.* }}`, provisioned in S4) + `ARTIFACT_DIR: production-deploy-artifacts`; (4) **external smoke
  (both surfaces):** curl `https://knowledge.hi2vi.com/healthz` → 200 **and** `https://knowledge.hi2vi.com/`
  → 200, retry loop, both must pass; (5) `actions/upload-artifact@v4` (`if: always()`, retention 14d).

## Static validation (no box access)
- `bash -n` all three scripts; `shellcheck` if available.
- Lint YAML: `actionlint` if available, else `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-production.yml'))"`.
- Confirm the three secret names match hi2vi's exactly; the smoke hits `/` and `/healthz`;
  `python3 scripts/plugin_parity.py` still passes (deploy files + this workflow aren't in the plugin
  manifest — confirm no parity impact); `python3 scripts/workflow.py validate`. Behavioral proof is **S5**.

## Constraints
- Author + static-validate ONLY — no box SSH, no dispatch, no `docker`. Never commit / transition status.
  Append S3 findings to `phase.md`; add a Doc-impact note if durable truth changed; do not version docs or
  edit `docs/current/*`.

## Verdict
`done` with the three files + static-validation results, or `escalate` with findings if the mirror doesn't fit.
