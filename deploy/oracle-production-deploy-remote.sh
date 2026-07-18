#!/usr/bin/env bash
set -Eeuo pipefail

# Runs ON the shared Oracle box as `opc` (shipped + invoked by github-actions-production-deploy.sh,
# P9.S3). This is the opc-safe ORCHESTRATION layer, NOT the authoritative git gate: it asserts its
# inputs (TARGET_SHA is a 40-hex SHA, REPO_PATH is a git checkout), hands off to knowledge's OWN
# deploy/deploy.sh — which owns ALL authoritative git INSIDE its one-shot root container (on-`main`
# check + dirty-tracked-worktree refusal + .git/index.lock wait + `git fetch --prune origin main` +
# fail-closed TARGET_SHA ancestor-verify + publish-on-write ff/rebase reconcile, then both-service
# build + health-gate; see phase.md §E/§F) — THEN re-applies the edge vhost (deploy/knowledge.conf ->
# /home/opc/edge, the edge's own nginx -t gate + graceful reload), and collects artifacts.
#
# Why no git gate here (P9.F1): the authoritative fetch + ancestor-verify CANNOT run as `opc`. `origin`
# is an SSH remote whose deploy key is root-owned/unreadable by opc, and opc has no GitHub key, so an
# opc-side `git fetch` dies before it can authenticate. deploy.sh runs that fetch + fail-closed
# ancestor-verify inside its one-shot root container (deploy key via GIT_SSH_COMMAND + baked
# safe.directory), so deploy.sh is the SOLE authoritative git path. The only git left in THIS helper is
# best-effort `git status` artifact capture (git-before/git-after), which never fails the deploy.
#
# Mirrors hi2vi_web/deploy/oracle-production-deploy-remote.sh for the knowledge checkout, with two
# knowledge specifics: the edge re-apply is layered on after a healthy deploy (hi2vi has no edge step
# here), and — unlike hi2vi, whose opc-side fetch works because its clone is not a root-committing
# publish-on-write clone — knowledge relocates ALL authoritative git into deploy.sh's root container.
# This helper does NOT itself check out — deploy/deploy.sh reconciles on `main`, never detaching. First
# real run is P9.S5.

TARGET_SHA="${TARGET_SHA:-}"
REPO_PATH="${REPO_PATH:-/opt/knowledge}"
REMOTE_ARTIFACT_DIR="${REMOTE_ARTIFACT_DIR:-/tmp/knowledge-gha-artifacts}"
COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-compose.prod.yml}"
EDGE_DIR="${EDGE_DIR:-/home/opc/edge}"        # the dedicated edge project (conf.d + certs are RO host mounts)
EDGE_VHOST="${EDGE_VHOST:-knowledge.conf}"    # the vhost filename in deploy/ and in the edge's conf.d/

# The box clone is opc-owned but its .git objects are root-owned (the api container commits as uid 0),
# so a bare `git` as opc can trip "detected dubious ownership". `-c safe.directory=$REPO_PATH` quiets
# that ownership check and never mutates config. NB (P9.F1): this git is used ONLY for the best-effort,
# non-fatal `git status` artifact captures below (git-before/git-after) — no authoritative git runs as
# opc anymore. The authoritative fetch + ancestor-verify live inside deploy.sh's root container.
GIT=(git -c "safe.directory=${REPO_PATH}")

SUMMARY_FILE=""

log() {
  printf '[oracle-production-deploy] %s\n' "$*"
}

die() {
  printf '[oracle-production-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

append_summary() {
  if [ -n "${SUMMARY_FILE}" ]; then
    printf '%s\n' "$*" >> "${SUMMARY_FILE}"
  fi
}

run_capture() {
  # Best-effort artifact capture only (git-before/git-after status). NEVER fails the deploy: `|| true`
  # so a git status that trips on the root-owned index (P9.F1) still can't abort the run.
  local label="$1"
  shift
  log "+ $*"
  "$@" > "${REMOTE_ARTIFACT_DIR}/${label}.txt" 2>&1 || true
}

collect_status() {
  # knowledge's compose project has no `-p`/`--env-file` (env_file is baked as `.env` inside the file),
  # so a plain `docker compose -f compose.prod.yml ps` is the artifact — unlike hi2vi's -p/--env-file form.
  docker compose -f "${COMPOSE_FILE}" ps \
    > "${REMOTE_ARTIFACT_DIR}/compose-ps.txt" 2>&1 || true
}

# Re-apply the edge vhost AFTER a healthy deploy (containers up before `/` cuts over to the web app). Drop
# the just-reconciled conf onto the edge's read-only conf.d/ host mount, then run the edge's OWN deploy.sh
# — a hard `nginx -t` gate inside the RUNNING edge-nginx followed by a graceful `nginx -s reload`, NEVER a
# recreate. A failed `nginx -t` reloads nothing (the edge keeps its last-good config) but MUST fail this
# deploy loudly: healthy containers with stale routing is not a success. Returns the edge deploy.sh status.
reapply_edge() {
  log "re-applying edge vhost: install deploy/${EDGE_VHOST} -> ${EDGE_DIR}/conf.d/ then ${EDGE_DIR}/deploy.sh (nginx -t gate -> graceful reload; never recreate edge-nginx)"
  if ! install -m 0644 "${REPO_PATH}/deploy/${EDGE_VHOST}" "${EDGE_DIR}/conf.d/${EDGE_VHOST}"; then
    append_summary "- Edge: FAILED to install \`deploy/${EDGE_VHOST}\` into \`${EDGE_DIR}/conf.d/\`."
    die "failed to install edge vhost: ${REPO_PATH}/deploy/${EDGE_VHOST} -> ${EDGE_DIR}/conf.d/${EDGE_VHOST}"
  fi
  set +e
  ( cd "${EDGE_DIR}" && ./deploy.sh ) > "${REMOTE_ARTIFACT_DIR}/edge-reload.txt" 2>&1
  local edge_status=$?
  set -e
  cat "${REMOTE_ARTIFACT_DIR}/edge-reload.txt" || true
  return "${edge_status}"
}

main() {
  [ -n "${TARGET_SHA}" ] || die "TARGET_SHA is required"
  [[ "${TARGET_SHA}" =~ ^[0-9a-fA-F]{40}$ ]] || die "TARGET_SHA must be a 40-character git SHA"
  [ -d "${REPO_PATH}/.git" ] || die "REPO_PATH is not a git checkout: ${REPO_PATH}"

  mkdir -p "${REMOTE_ARTIFACT_DIR}"
  SUMMARY_FILE="${REMOTE_ARTIFACT_DIR}/summary.md"
  : > "${SUMMARY_FILE}"

  cd "${REPO_PATH}"

  append_summary "# knowledge Production Deploy Artifact"
  append_summary ""
  append_summary "- Target SHA: \`${TARGET_SHA}\`"
  append_summary "- Repo path: \`${REPO_PATH}\`"
  append_summary "- Started at: \`$(date -u '+%Y-%m-%dT%H:%M:%SZ')\`"

  run_capture "git-before" "${GIT[@]}" status --short --branch

  # NB (P9.F1): NO authoritative git runs here. deploy/deploy.sh does the on-`main` branch check, the
  # dirty-tracked-worktree refusal, the `.git/index.lock` wait, the `git fetch --prune origin main`, and
  # the fail-closed TARGET_SHA ancestor-verify INSIDE its one-shot root container (which holds the deploy
  # key) — the SOLE authoritative git path. The opc-side dirty-check + fetch + ancestor block that used
  # to live here was removed: an opc-side fetch cannot authenticate (root-owned deploy key, no opc GitHub
  # key), so it would fail every deploy. TARGET_SHA is asserted 40-hex above, so deploy.sh's in-container
  # ancestor gate always fires. The git-before capture above is a best-effort artifact only.
  log "Running deploy/deploy.sh (owns the authoritative reconcile: on-main check + dirty refusal + .git/index.lock wait + fetch origin/main + fail-closed TARGET_SHA ancestor-verify + ff/rebase, then both-service build + health-gate — all inside one root container)."
  set +e
  deploy/deploy.sh "${TARGET_SHA}" > >(tee "${REMOTE_ARTIFACT_DIR}/deploy-output.txt") \
    2> >(tee "${REMOTE_ARTIFACT_DIR}/deploy-error.txt" >&2)
  local deploy_status=$?
  set -e

  collect_status

  if [ "${deploy_status}" -ne 0 ]; then
    append_summary "- Finished at: \`$(date -u '+%Y-%m-%dT%H:%M:%SZ')\`"
    append_summary "- Result: deploy failed with status \`${deploy_status}\` (edge NOT re-applied)."
    exit "${deploy_status}"
  fi
  append_summary "- Deploy: both services built + healthy."

  # Both containers are healthy — now cut the edge over to the reconciled vhost.
  if ! reapply_edge; then
    run_capture "git-after" "${GIT[@]}" status --short --branch
    append_summary "- Finished at: \`$(date -u '+%Y-%m-%dT%H:%M:%SZ')\`"
    append_summary "- Result: deploy succeeded but the EDGE RE-APPLY FAILED (nginx -t rejected the vhost or the reload failed); the edge kept its last-good config, so routing was NOT updated."
    die "edge vhost re-apply failed (see edge-reload.txt): containers are healthy but the edge routing was NOT updated. Fix deploy/${EDGE_VHOST} and re-dispatch."
  fi
  append_summary "- Edge: vhost re-applied (nginx -t passed, graceful reload)."

  run_capture "git-after" "${GIT[@]}" status --short --branch
  append_summary "- Finished at: \`$(date -u '+%Y-%m-%dT%H:%M:%SZ')\`"
  append_summary "- Result: deploy completed successfully (both services healthy, edge routing live)."
  log "Deploy completed successfully."
}

main "$@"
