# P9.S2 — On-box deploy core: `deploy/deploy.sh` (reconcile + redeploy both + health-gate)

**You are `slice-executor-high`.** Author `deploy/deploy.sh` — the on-box container-deploy core — per the
signed-off design (`phase.md` §D/§E/§F + the operator decisions: **one-shot container git**,
**gate+fix-forward rollback**). This slice **authors + statically validates** (`bash -n`, `shellcheck`
if available, logic review); it does **NOT** run on any box (the real run is S5). No production impact.

**Scope — this slice delivers ONLY `deploy/deploy.sh`.** The remote gate
(`oracle-production-deploy-remote.sh`), the runner driver, the workflow, and the edge re-apply are **S3**.
No `rollback.sh` (see §F below). You MAY add a stable `image:` name to the api service in
`compose.prod.yml` **only if** your reconcile mechanism needs it (see below) — otherwise touch no other file.

## Read first
`phase.md` §D/§E/§F + Constraints; the reference `hi2vi_web/deploy/deploy.sh` (the `wait_healthy` loop +
`COMPOSE_BAKE=false` + config-knobs shape to mirror); `compose.prod.yml` (both services, the api's
`GIT_SSH_COMMAND` + secrets mount + `.:/repo`); `server/gitops.py` (the push discipline this mirrors);
`Dockerfile` (baked `safe.directory`/identity).

## What `deploy/deploy.sh` does

Model it on `hi2vi_web/deploy/deploy.sh` (config knobs, `dc()` wrapper, `log`/`die`, `wait_healthy`,
`set -euo pipefail`, `export COMPOSE_BAKE=false`), adapted for the publish-on-write clone + two services.

Config knobs (env-overridable): `APP_DIR` (box clone, e.g. `/opt/knowledge` — default to the script's
parent), `COMPOSE_FILE=compose.prod.yml`, `TARGET_SHA` (optional arg `$1`; used for a sanity assert +
logging — see reconcile), health-poll knobs (tries/interval, ~24×5 s covering the api's `start_period 60s`
and the site's `40s`).

### 1. Preflight
Require `git`, `docker`, `docker compose` v2; assert `$COMPOSE_FILE`, `.git`, `.env` exist under `$APP_DIR`.

### 2. Reconcile the box clone (§E) — the crux; runs on `main`, never detach/reset/force
Do the git reconcile **inside a one-shot container that reuses the api service** — this is what makes the
reconcile authenticate over SSH and honor the baked `safe.directory`, since the box clone's `.git` objects
are root-owned (the api commits as uid 0) and `origin` is the SSH form driven by `GIT_SSH_COMMAND`:

- **Preferred mechanism:** `docker compose -f compose.prod.yml run --rm --no-deps --entrypoint sh api -c
  '<reconcile script>'`. A `compose run` container inherits the api service's `.:/repo` mount,
  `/run/secrets` (deploy key), `GIT_SSH_COMMAND`, and the image's baked `git config --system
  safe.directory /repo` + identity — so `git fetch`/`rebase` over SSH just work, as root, matching the
  ownership of the objects the running api writes. It is a **separate ephemeral container**; the running
  `knowledge-api` is untouched.
- **`container_name` caveat:** the api service pins `container_name: knowledge-api`; if that makes
  `compose run` refuse (name clash), either pass `--name knowledge-reconcile-$$` or add a stable
  `image: knowledge-api:latest` to the api service in `compose.prod.yml` and use `docker run --rm` with
  explicit `-v .:/repo -v /opt/knowledge-secrets:/run/secrets:ro -e GIT_SSH_COMMAND=… -w /repo
  knowledge-api:latest sh -c '…'`. Pick whichever you can reason is correct; **document the choice + that
  S5 must confirm it live** (you can't run docker here).

The reconcile script (inside the container), mirroring `server/gitops.py`'s fetch→rebase→never-force:
1. `git fetch --prune origin main`; `fetched=$(git rev-parse --verify FETCH_HEAD^{commit})`.
2. If a `TARGET_SHA` was passed: assert `git cat-file -e $TARGET_SHA^{commit}` and `git merge-base
   --is-ancestor $TARGET_SHA $fetched` (a sanity check; the authoritative gate is S3's remote script).
3. Reconcile local `main` to `$fetched` (the tip): `git merge --ff-only $fetched` when the box is behind/
   equal; `git rebase $fetched` when the box is ahead/diverged (an unpushed publish-on-write doc replays
   on top). On rebase conflict → `git rebase --abort` and `die` (never leave a half-rebased clone). **Never**
   `checkout --detach` / `reset --hard` / `--force`.
   - **Deliberate divergence to note in a comment + `result.md`:** the box deploys origin/main **tip** (can't
     detach to an exact SHA without orphaning an unpushed doc). Since code and docs are disjoint paths,
     tip-code == `TARGET_SHA`-code absent an interleaved code commit landing mid-run.
4. Retry a transient `.git/index.lock` briefly (a publish-on-write commit could land mid-deploy — §E step 5);
   accept the small residual race (manual dispatch is rare).

### 3. Build + recreate BOTH services
`export COMPOSE_BAKE=false` (the host's bake-path panic workaround, from P8/hi2vi), then
`docker compose -f compose.prod.yml up -d --build` — builds the api image, uses the pinned mkdocs image for
`site`, and recreates both containers (reloading uvicorn with the reconciled mounted code, and the viewer).

### 4. Health-gate BOTH containers
Adapt hi2vi's `wait_healthy` (poll `docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}
{{else}}none{{end}}'`) and run it for **both** `knowledge-api` and `knowledge-site` (both define
healthchecks). `healthy` both → success; `unhealthy`/`none`/timeout on either → failure.

### 5. On failure — gate + report, NO auto rollback (§F v1)
Capture `docker compose -f compose.prod.yml ps` + `logs` (into `$REMOTE_ARTIFACT_DIR` if the env var is set),
then `die` non-zero with a message pointing to **fix-forward recovery** (merge a corrected commit to `main`
and re-dispatch — the reconcile picks it up). **Do not** author a `rollback.sh` and **do not** attempt any
image-tag flip or `git reset` — v1 deliberately never moves the publish-on-write checkout backwards under the
running container (mount-based code makes an image flip useless anyway; §F).

## Static validation (no box access)
- `bash -n deploy/deploy.sh` (syntax) and `shellcheck deploy/deploy.sh` if available; fix all warnings.
- Logic review against §E/§F: never detach/reset/force; ff-only vs rebase branch is correct; conflict aborts;
  both services health-gated; failure path captures artifacts + exits non-zero with no rollback.
- If you added `image:` to `compose.prod.yml`, re-run `docker compose -f compose.prod.yml config` (dummy
  `.env`), `python3 scripts/plugin_parity.py`, `python3 scripts/site_smoke.py`, and
  `python3 scripts/workflow.py validate` to confirm nothing regressed. Note clearly that behavioral proof
  (the actual reconcile/build/health) is **S5**.

## Constraints
- Author + static-validate ONLY — no box SSH, no `docker`/`docker compose up`, no edge changes.
- Never commit, never transition status. Append S2 findings (incl. the chosen reconcile mechanism + the
  tip-vs-TARGET_SHA divergence) to `phase.md` Findings & Notes; add a Doc-impact note if durable truth
  changed. Do not version docs or edit `docs/current/*`.

## Verdict
`done` with the file(s) changed + static-validation results + the reconcile mechanism you chose (and that S5
must confirm it live), or `escalate` with findings if the design doesn't hold against the real files.
