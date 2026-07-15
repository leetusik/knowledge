#!/usr/bin/env bash
set -Eeuo pipefail

# Runs ON the shared Oracle box (shipped + invoked by github-actions-production-deploy.sh, P9.S3). This
# is the AUTHORITATIVE gate: it refuses a dirty tracked worktree, fetches origin/main, verifies the
# target SHA is an ancestor of fetched origin/main, hands off to knowledge's OWN deploy/deploy.sh (which
# owns the publish-on-write reconcile + both-service build + health-gate; see phase.md §E/§F), THEN
# re-applies the edge vhost (deploy/knowledge.conf -> /home/opc/edge, the edge's own nginx -t gate +
# graceful reload), and collects artifacts. Mirrors hi2vi_web/deploy/oracle-production-deploy-remote.sh
# for the knowledge checkout, with two knowledge specifics: the git checks pass `-c safe.directory`
# (the box clone's .git objects are root-owned — the api container commits as uid 0), and the edge
# re-apply is layered on after a healthy deploy (hi2vi has no edge step here). This helper does NOT
# itself check out — deploy/deploy.sh reconciles on `main`, never detaching. First real run is P9.S5.

TARGET_SHA="${TARGET_SHA:-}"
REPO_PATH="${REPO_PATH:-/opt/knowledge}"
REMOTE_ARTIFACT_DIR="${REMOTE_ARTIFACT_DIR:-/tmp/knowledge-gha-artifacts}"
COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-compose.prod.yml}"
EDGE_DIR="${EDGE_DIR:-/home/opc/edge}"        # the dedicated edge project (conf.d + certs are RO host mounts)
EDGE_VHOST="${EDGE_VHOST:-knowledge.conf}"    # the vhost filename in deploy/ and in the edge's conf.d/

# The box clone is opc-owned but its .git objects are root-owned (the api container commits as uid 0),
# so a bare `git` as opc can trip "detected dubious ownership". These are READ-ONLY ref reads (loose
# objects are world-readable), so `-c safe.directory=$REPO_PATH` is enough and never mutates config.
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
  local label="$1"
  shift
  log "+ $*"
  "$@" > "${REMOTE_ARTIFACT_DIR}/${label}.txt" 2>&1
}

collect_status() {
  # knowledge's compose project has no `-p`/`--env-file` (env_file is baked as `.env` inside the file),
  # so a plain `docker compose -f compose.prod.yml ps` is the artifact — unlike hi2vi's -p/--env-file form.
  docker compose -f "${COMPOSE_FILE}" ps \
    > "${REMOTE_ARTIFACT_DIR}/compose-ps.txt" 2>&1 || true
}

# Re-apply the edge vhost AFTER a healthy deploy (containers up before `/` cuts over to the site). Drop
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

  # Refuse a mid-write (dirty TRACKED tree = a doc write in progress). An ahead/unpushed CLEAN tree passes
  # — the box clone is also the publish-on-write clone, so ahead/unpushed is normal, not an error.
  if ! "${GIT[@]}" diff --quiet || ! "${GIT[@]}" diff --cached --quiet; then
    "${GIT[@]}" status --short > "${REMOTE_ARTIFACT_DIR}/dirty-tracked-worktree.txt" 2>&1 || true
    append_summary "- Result: failed before deploy because tracked changes were present."
    die "tracked production checkout has local changes; refusing to deploy"
  fi

  log "Fetching origin main."
  if ! "${GIT[@]}" fetch --prune origin main > "${REMOTE_ARTIFACT_DIR}/git-fetch.txt" 2>&1; then
    append_summary "- Result: failed while fetching \`origin/main\`."
    cat "${REMOTE_ARTIFACT_DIR}/git-fetch.txt" >&2 || true
    die "failed to fetch origin/main"
  fi
  fetched_main_sha="$("${GIT[@]}" rev-parse --verify "FETCH_HEAD^{commit}" 2>/dev/null)" || die "FETCH_HEAD is not a valid commit after fetching origin main"
  "${GIT[@]}" cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null || die "target commit is not available after fetching origin main"
  "${GIT[@]}" merge-base --is-ancestor "${TARGET_SHA}" "${fetched_main_sha}" || die "target commit is not reachable from fetched origin main"

  log "Running deploy/deploy.sh (knowledge's deploy.sh owns the publish-on-write reconcile + both-service build + health-gate)."
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
