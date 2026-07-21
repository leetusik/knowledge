#!/usr/bin/env bash
#
# deploy.sh — on-box container-deploy core for https://knowledge.hi2vi.com (P9.S2).
#
# Runs ON the shared OCI box from the publish-on-write clone (default /opt/knowledge).
# Reconciles that clone with origin/main and rebuilds the app images
# (`api` = the document API + CLI control plane, `web` = the Next.js standalone UI + BFF,
# `mcp` = the MCP-over-HTTP retrieval server at /mcp, P15.S3; the mkdocs `site` was
# RETIRED in P14.S3). Compose recreates `web`/`mcp` when their image changes; `api` is
# FORCE-recreated unconditionally because it runs server/ from the bind mount — a
# code-only push changes neither its image nor its config, so a plain `up` would leave
# the stale uvicorn running (the S5/P17 split-deploy incident). Health-gates all three,
# then self-asserts the api process is fresh. `postgres` is the
# durable control-plane store, brought up as the api's dependency (not gated here).
# This is the knowledge analogue of hi2vi_web/deploy/deploy.sh, but with two
# knowledge-specific inventions (see phase.md §E/§F):
#
#   1. RECONCILE, NOT `git checkout --detach` (§E). hi2vi detaches HEAD to an exact
#      ref; we CANNOT — the box clone is ALSO the publish-on-write clone, so detaching
#      (or `reset --hard`/`--force`) would strand an unpushed doc commit. Instead we
#      stay on `main` and reconcile: fetch → fast-forward when behind, rebase when
#      ahead/diverged (an unpushed doc replays on top), abort on conflict. This mirrors
#      server/gitops.py's own push discipline (fetch → rebase → never force).
#
#      DELIBERATE DIVERGENCE — the box deploys origin/main's TIP, not the exact
#      TARGET_SHA. We cannot detach to a specific SHA without risking orphaning an
#      unpushed publish-on-write doc. Because code and docs are disjoint paths, the
#      tip's *code* equals TARGET_SHA's code unless an interleaved code commit lands
#      mid-run (rare, manual dispatch). TARGET_SHA is still enforced: the in-container
#      ancestor-verify below (step 2) fails closed if it is missing or is not an
#      ancestor of the fetched tip — and since P9.F1 that in-container check IS the
#      AUTHORITATIVE ancestor gate. S3's remote script runs as `opc`, which cannot
#      fetch or verify (root-owned deploy key, no opc GitHub key), so it delegates ALL
#      authoritative git to this root container.
#
#   2. ROOT-OWNED .git → one-shot container git (§E step 4). The running api container
#      commits as uid 0, so /opt/knowledge/.git objects are root-owned and `opc` can't
#      git against them cleanly, and `origin` is an SSH remote driven by the api's
#      GIT_SSH_COMMAND + a bind-mounted deploy key. So the reconcile runs inside a
#      SEPARATE, EPHEMERAL container that reuses the api service via
#      `docker compose run` — it inherits the api's `.:/repo` mount, `/run/secrets`
#      deploy key, GIT_SSH_COMMAND, network, and the image's baked
#      `git config --system safe.directory /repo` + identity. The live `knowledge-api`
#      container is untouched. We pass `--name knowledge-reconcile-$$` so the run
#      container never clashes with the api service's pinned `container_name:
#      knowledge-api` (a distinct, unique name sidesteps the caveat entirely). If a
#      given Compose still refuses `run` on a `container_name`-pinned service, the
#      documented fallback is to add `image: knowledge-api:latest` to the api service
#      and swap the reconcile to `docker run --rm -v .:/repo -v
#      /opt/knowledge-secrets:/run/secrets:ro -e GIT_SSH_COMMAND=… -w /repo
#      knowledge-api:latest sh -c '…'`.
#
#   3. NO AUTO ROLLBACK — gate + fix-forward (§F v1). knowledge runs server/ from the
#      BIND MOUNT (.:/repo), so an image-tag flip (hi2vi's rollback) cannot revert
#      mounted code, and moving the publish-on-write checkout backwards under the
#      running container is unsafe. On health failure we capture artifacts, exit
#      non-zero, and recover by fix-forward (merge a corrected commit to main and
#      re-dispatch — the reconcile picks it up). There is NO rollback.sh.
#
# Lifecycle:
#   1. preflight (git/docker/compose v2; compose file, .git, .env present)
#   2. reconcile the box clone on `main` inside a one-shot api-service container (§E)
#   3. COMPOSE_BAKE=false docker compose up -d --build   (builds api + web + mcp; recreates
#      web/mcp on image change, but NOT the bind-mounted api)
#   4. force-recreate the bind-mounted api (up -d --force-recreate --no-deps api) so it runs
#      the reconciled code, not the stale uvicorn (the S5/P17 split-deploy fix)
#   5. health-gate knowledge-api + knowledge-web + knowledge-mcp (docker inspect Health.Status),
#      then self-assert the api's StartedAt postdates this deploy run (freshness trap)
#   6. on failure: capture ps + logs (into $REMOTE_ARTIFACT_DIR if set), die non-zero
#      with a fix-forward message; NO rollback.
#
# Authored + statically checked off-box (P9.S2): `bash -n`, logic review vs §E/§F.
# It has ZERO production impact until it actually runs on the box at S5, which is the
# behavioral proof (reconcile authenticates + ff/rebase; both build + gate healthy;
# and that `docker compose run` is accepted on the container_name-pinned api service).
#
# Usage (on the box, from /opt/knowledge — opc must be in the docker group):
#   deploy/deploy.sh [TARGET_SHA]      # optional; when given, the in-container ancestor-verify
#                                      # (AUTHORITATIVE since P9.F1) fails closed unless it is an
#                                      # ancestor of the fetched origin/main tip

set -euo pipefail

# --- config knobs (override via env) ----------------------------------------
# Repo root = parent of this script's dir, so compose.prod.yml + .env resolve
# regardless of the caller's cwd.
APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"                    # api service env_file (operator-created, gitignored)
TARGET_SHA="${1:-${TARGET_SHA:-}}"              # optional: in-container ancestor gate (authoritative, P9.F1); tip is deployed
HEALTH_TRIES="${HEALTH_TRIES:-24}"              # poll count per service (24*5 = up to 120s each)
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"         # seconds between health polls
LOCK_TRIES="${LOCK_TRIES:-6}"                   # .git/index.lock waits before refusing (concurrency)
LOCK_INTERVAL="${LOCK_INTERVAL:-3}"             # seconds between index.lock checks (a write is ~6s)
RECONCILE_CONTAINER="knowledge-reconcile-$$"    # unique ephemeral name (never clashes with knowledge-api)

# COMPOSE_BAKE=false avoids the `docker compose build` bake-path panic seen on this
# host's Compose version (P8/hi2vi: compose/build_bake.go slice-bounds — a CLI bug).
# Exported so the docker subprocess inherits it.
export COMPOSE_BAKE=false

# Wall-clock start of this deploy run (UTC epoch). The post-gate freshness self-assert
# (assert_api_fresh) compares the api container's StartedAt against this to prove the
# force-recreate landed a NEW uvicorn, not the pre-existing stale one (the S5/P17 trap).
DEPLOY_START_TS="$(date -u +%s)"

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

# `docker compose -f <file>` wrapper (cwd is $APP_DIR, so .env + build context resolve).
dc() { docker compose -f "$COMPOSE_FILE" "$@"; }

# --- health-gate one service on its own healthcheck --------------------------
# Polls `docker inspect --format '{{.State.Health.Status}}'` for the given compose
# service until it reports `healthy`. Returns 0 on healthy, 1 on timeout / an
# `unhealthy` verdict / a service with no healthcheck. $1 = compose service key,
# $2 = friendly container name (for logs).
wait_healthy() {
    local svc="$1" name="$2" cid status i
    cid="$(dc ps -q "$svc" 2>/dev/null || true)"
    [[ -n "$cid" ]] || { log "no running $name container to health-check"; return 1; }
    for ((i = 1; i <= HEALTH_TRIES; i++)); do
        status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || true)"
        case "$status" in
            healthy)
                log "$name healthy on poll $i"
                return 0
                ;;
            unhealthy)
                log "$name reported UNHEALTHY on poll $i (healthcheck retries exhausted)"
                return 1
                ;;
            none)
                log "$name has no healthcheck — cannot gate (check compose/Dockerfile)"
                return 1
                ;;
            *)
                log "$name poll $i/$HEALTH_TRIES: status=${status:-<none>} — waiting ${HEALTH_INTERVAL}s"
                ;;
        esac
        sleep "$HEALTH_INTERVAL"
    done
    log "$name health-gate TIMED OUT after $((HEALTH_TRIES * HEALTH_INTERVAL))s"
    return 1
}

# --- assert the api process is fresh (post-gate bind-mount stale-process trap) ---
# The api runs server/ from the bind mount, so a plain `up` can leave the OLD uvicorn
# running against new code (the S5/P17 split-deploy incident). Step 2b force-recreates
# it, and this PROVES it landed: read the api container's StartedAt and fail closed if it
# predates this deploy run. StartedAt is RFC3339 (e.g. 2026-07-21T08:31:02.123456789Z);
# the box is Oracle Linux / GNU date, so `date -u -d <ts> +%s` parses it — the conversion
# is guarded so a parse failure dies loudly rather than passing a possibly-stale api.
assert_api_fresh() {
    local started_at started_ts
    started_at="$(docker inspect --format '{{.State.StartedAt}}' knowledge-api 2>/dev/null || true)"
    [[ -n "$started_at" ]] || die "cannot read knowledge-api StartedAt (container missing?) — bind-mount stale-process trap; see P17.F1"
    started_ts="$(date -u -d "$started_at" +%s 2>/dev/null || true)"
    [[ -n "$started_ts" ]] || die "could not parse knowledge-api StartedAt='$started_at' to an epoch (GNU 'date -d' expected on the box) — refusing to pass a possibly-stale api; see P17.F1"
    if (( started_ts < DEPLOY_START_TS )); then
        die "api process predates this deploy (StartedAt=$started_at = ${started_ts}s < deploy start ${DEPLOY_START_TS}s) — bind-mount stale-process trap: the force-recreate did not land a fresh uvicorn; see P17.F1"
    fi
    log "api process is fresh (StartedAt=$started_at, ${started_ts}s >= deploy start ${DEPLOY_START_TS}s)"
}

# --- diagnostics on failure (no rollback, §F v1) -----------------------------
# Dumps compose ps + per-service logs into $REMOTE_ARTIFACT_DIR when set (the remote
# gate, S3, scps this dir back), else prints status inline. Never fails the deploy.
capture_artifacts() {
    log "capturing diagnostics (health-gate failed)"
    if [[ -n "${REMOTE_ARTIFACT_DIR:-}" ]]; then
        mkdir -p "$REMOTE_ARTIFACT_DIR" 2>/dev/null || true
        dc ps                              > "$REMOTE_ARTIFACT_DIR/deploy-compose-ps.txt"   2>&1 || true
        dc logs --no-color --tail 300 api  > "$REMOTE_ARTIFACT_DIR/deploy-api-logs.txt"     2>&1 || true
        dc logs --no-color --tail 300 web  > "$REMOTE_ARTIFACT_DIR/deploy-web-logs.txt"     2>&1 || true
        dc logs --no-color --tail 300 mcp  > "$REMOTE_ARTIFACT_DIR/deploy-mcp-logs.txt"     2>&1 || true
        log "diagnostics written to $REMOTE_ARTIFACT_DIR"
    else
        log "REMOTE_ARTIFACT_DIR unset — printing compose ps inline"
        dc ps || true
    fi
}

# --- reconcile script (runs INSIDE the one-shot api container as root, POSIX sh) ---
# Kept strictly POSIX (the entrypoint override is `sh` = dash in the slim image): no
# bashisms. Mirrors server/gitops.py (fetch → rebase → never force) but reconciles the
# LOCAL branch instead of pushing. Reads TARGET_SHA / LOCK_TRIES / LOCK_INTERVAL from
# the environment injected via `-e` below.
#
# Assigned via `read -r -d ''` (not `$(cat <<…)`): a heredoc inside command
# substitution whose body contains an apostrophe trips bash 3.2's parser (macOS
# static-check toolchain), while this idiom parses cleanly there AND on the box's
# modern bash. `read -d ''` returns non-zero at EOF (no NUL), hence the `|| true`.
IFS='' read -r -d '' RECONCILE_SCRIPT <<'RECONCILE' || true
set -eu
cd /repo

echo "[reconcile] pwd=$(pwd)  head=$(git rev-parse --short HEAD 2>/dev/null || echo UNKNOWN)"

# Never operate off `main` (the publish-on-write branch). If somehow detached or on
# another branch, refuse rather than risk stranding an unpushed doc.
branch="$(git symbolic-ref --short -q HEAD || true)"
if [ "$branch" != "main" ]; then
  echo "[reconcile] ERROR: box clone is not on 'main' (on: ${branch:-DETACHED HEAD}); refusing (never detach/reset/force)"
  exit 1
fi

# Refuse a mid-write (dirty TRACKED tree = a doc write in progress); an ahead/unpushed
# CLEAN tree passes (that is the whole point). Same guard shape as hi2vi's remote gate.
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[reconcile] ERROR: dirty tracked worktree — a doc write may be in progress; refusing"
  git status --short || true
  exit 1
fi

# Wait out a concurrent publish-on-write holding .git/index.lock (a write is ~6s).
# Accept the small residual race (a write could grab the lock right after this check);
# a git op that then hits the lock fails loudly under `set -e` — manual dispatch is rare.
i=0
while [ -f .git/index.lock ]; do
  i=$((i + 1))
  if [ "$i" -gt "${LOCK_TRIES:-6}" ]; then
    echo "[reconcile] ERROR: .git/index.lock persisted after ${LOCK_TRIES:-6} checks (stale lock or long write); refusing"
    exit 1
  fi
  echo "[reconcile] .git/index.lock present (publish-on-write in progress?) — waiting ${LOCK_INTERVAL:-3}s [$i/${LOCK_TRIES:-6}]"
  sleep "${LOCK_INTERVAL:-3}"
done

# Fetch origin/main over SSH (deploy key via GIT_SSH_COMMAND; safe.directory baked).
git fetch --prune origin main
fetched="$(git rev-parse --verify 'FETCH_HEAD^{commit}')"
echo "[reconcile] fetched origin/main tip: $fetched"

# Fail-closed ancestor gate vs the runner-provided TARGET_SHA. Since P9.F1 THIS in-container check IS
# the authoritative ancestor gate — S3's remote script runs as `opc`, which cannot fetch/verify
# (root-owned deploy key, no opc GitHub key), so it delegates all authoritative git here. When the gate
# hands off it always passes a 40-hex SHA, so this branch always fires on a real deploy.
# NB: we deploy the fetched TIP, not this SHA (deliberate divergence — see deploy.sh header).
if [ -n "${TARGET_SHA:-}" ]; then
  if ! git cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null; then
    echo "[reconcile] ERROR: TARGET_SHA ${TARGET_SHA} not present after fetch"
    exit 1
  fi
  if ! git merge-base --is-ancestor "${TARGET_SHA}" "$fetched"; then
    echo "[reconcile] ERROR: TARGET_SHA ${TARGET_SHA} is not an ancestor of fetched origin/main"
    exit 1
  fi
  echo "[reconcile] TARGET_SHA ${TARGET_SHA} confirmed reachable from the fetched tip (deploying the TIP)"
fi

head="$(git rev-parse HEAD)"
if [ "$head" = "$fetched" ]; then
  echo "[reconcile] already at origin/main tip — nothing to reconcile"
elif git merge-base --is-ancestor "$head" "$fetched"; then
  # Box strictly behind → fast-forward only (never a merge commit, never force).
  echo "[reconcile] box behind tip — fast-forward (ff-only)"
  git merge --ff-only "$fetched"
else
  # Box ahead/diverged (an unpushed publish-on-write doc) → rebase onto the tip.
  echo "[reconcile] box ahead/diverged — rebasing local commit(s) onto the tip"
  if git rebase "$fetched"; then
    echo "[reconcile] rebase clean"
  else
    echo "[reconcile] ERROR: rebase conflict — aborting (never leave a half-rebased clone)"
    git rebase --abort || true
    exit 1
  fi
fi

echo "[reconcile] done — HEAD now $(git rev-parse HEAD) on main"
RECONCILE

# --- preflight ---------------------------------------------------------------
command -v git >/dev/null || die "git not found"
command -v docker >/dev/null || die "docker not found"
docker compose version >/dev/null 2>&1 || die "'docker compose' (v2 plugin) not found"

cd "$APP_DIR"
[[ -f "$COMPOSE_FILE" ]] || die "compose file not found: $APP_DIR/$COMPOSE_FILE"
[[ -d .git ]] || die "not a git checkout: $APP_DIR (clone the repo here first — see deploy/README.md)"
[[ -f "$ENV_FILE" ]] || die "env file not found: $APP_DIR/$ENV_FILE (create it — see deploy/SECRETS.md / README.md)"

if [[ -n "$TARGET_SHA" && ! "$TARGET_SHA" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
    log "WARNING: TARGET_SHA='$TARGET_SHA' is not a git SHA — the in-container assert will validate it"
fi

log "repo: $APP_DIR   compose: $COMPOSE_FILE   target-sha: ${TARGET_SHA:-<none, deploy tip>}"

# --- 1. reconcile the box clone on `main` (one-shot api-service container, §E) ---
# A SEPARATE ephemeral container reusing the api service (mounts, secrets,
# GIT_SSH_COMMAND, network, baked safe.directory + identity). The live knowledge-api
# is untouched. `--no-deps` never spins up `web`/`postgres`; `-T` disables the TTY
# (non-interactive GHA/SSH context); `--name` sidesteps the api's pinned container_name.
log "reconciling box clone (one-shot container '$RECONCILE_CONTAINER' reusing the api service)"
if ! dc run --rm -T --no-deps \
        --name "$RECONCILE_CONTAINER" \
        -e "TARGET_SHA=${TARGET_SHA}" \
        -e "LOCK_TRIES=${LOCK_TRIES}" \
        -e "LOCK_INTERVAL=${LOCK_INTERVAL}" \
        --entrypoint sh \
        api -c "$RECONCILE_SCRIPT"; then
    die "reconcile failed (see [reconcile] output above). The box clone was NOT moved backwards and NO rollback was performed. Fix forward: merge a corrected commit to origin/main and re-dispatch — the reconcile picks it up. If 'docker compose run' refused because the api service pins 'container_name: knowledge-api', apply the documented fallback (add 'image: knowledge-api:latest' to the api service + use 'docker run', see this script's header); S5 confirms the run path live."
fi

# --- 2. build the app images + recreate web/mcp ------------------------------
# Builds the api + web + mcp images. Compose recreates a container only when its image or
# config changed: `web` serves the rebuilt Next standalone bundle and `mcp` ships its own
# self-contained image, so both recreate on a code push. The `api` does NOT — it runs
# server/ from the BIND MOUNT (.:/repo), so a code-only push changes neither its image nor
# its config and this plain `up` leaves the running uvicorn on stale code; step 2b
# force-recreates it explicitly. `postgres` comes up as the api's healthy-dependency.
log "building images + recreating web/mcp (COMPOSE_BAKE=false docker compose up -d --build)"
dc up -d --build

# --- 2b. force-recreate the bind-mounted api ---------------------------------
# The api runs server/ from the BIND MOUNT — a code-only push changes neither its image
# nor its config, so the plain `up` above never recreates it and the running uvicorn keeps
# stale code (the S5/P17 split-deploy incident). Recreate it unconditionally; `--no-deps`
# leaves the already-running postgres untouched.
log "force-recreating the api (bind-mounted code — plain up won't recreate it)"
dc up -d --force-recreate --no-deps api

# --- 3. health-gate the app services (api + web + mcp) -----------------------
gate_ok=1
wait_healthy api knowledge-api || gate_ok=0
wait_healthy web knowledge-web || gate_ok=0
wait_healthy mcp knowledge-mcp || gate_ok=0

if (( gate_ok )); then
    log "all three services healthy — knowledge-api + knowledge-web + knowledge-mcp are live"
    # Post-gate freshness self-assert: prove step 2b's force-recreate actually landed a
    # NEW uvicorn, not the pre-existing stale one (the S5/P17 split-deploy trap).
    assert_api_fresh
else
    # --- 4. on failure: capture + fix-forward, NO rollback (§F v1) ------------
    capture_artifacts
    die "health-gate FAILED for knowledge-api and/or knowledge-web and/or knowledge-mcp. NO rollback performed (§F v1): server/ runs from the bind mount, so an image flip cannot revert code, and the publish-on-write checkout is never moved backwards under the running container. RECOVER BY FIX-FORWARD: merge a corrected commit to origin/main and re-dispatch the deploy (the reconcile applies it). Inspect: docker compose -f $COMPOSE_FILE logs api web mcp${REMOTE_ARTIFACT_DIR:+ (artifacts in $REMOTE_ARTIFACT_DIR)}."
fi

log "DONE — origin/main tip is live on the box (api at knowledge-api:8000, web at knowledge-web:3000, mcp at knowledge-mcp:9000; edge re-apply is S3)."
