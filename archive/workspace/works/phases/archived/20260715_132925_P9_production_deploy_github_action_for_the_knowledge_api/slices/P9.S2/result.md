# P9.S2 result — On-box deploy core `deploy/deploy.sh` (authored + statically validated)

**Verdict: done.** Authored `deploy/deploy.sh` per §D/§E/§F and the signed-off operator
decisions (one-shot container git, gate + fix-forward, no rollback). **Author-only, zero
production impact** — no box SSH, no `docker`/`docker compose up`, no edge change. Behavioral
proof (reconcile authenticates + ff/rebase; both services build + gate healthy; and that
`docker compose run` is accepted on the `container_name`-pinned api service) is **S5**.

## Files changed
- **`deploy/deploy.sh`** (new, `chmod +x`) — the only deliverable. `compose.prod.yml` was **not**
  touched (see the reconcile-mechanism choice below), so no `image:` was added and the
  config/parity/site_smoke suite was **not** required.

## What the script does (maps 1:1 to §E/§F)
1. **Preflight** — `git`, `docker`, `docker compose` v2; asserts `$COMPOSE_FILE`, `.git`, `.env`
   under `$APP_DIR` (default = the script's parent = `/opt/knowledge`).
2. **Reconcile the box clone on `main`** inside a one-shot container that reuses the api service
   (details below). Mirrors `server/gitops.py`: refuse a dirty tracked worktree (permit
   ahead/unpushed clean), wait out a concurrent `.git/index.lock`, `git fetch --prune origin main`,
   optional `TARGET_SHA` sanity assert (`cat-file -e` + `merge-base --is-ancestor`), then reconcile:
   `git merge --ff-only` when behind/equal, `git rebase` when ahead/diverged, `git rebase --abort` +
   fail on conflict. A defensive branch check refuses if not on `main`. **Never** detach / `reset
   --hard` / `--force` (those tokens appear only in explanatory comments).
3. **Build + recreate both services** — `export COMPOSE_BAKE=false` then
   `docker compose -f compose.prod.yml up -d --build` (builds api, uses the pinned mkdocs image for
   site, recreates both containers).
4. **Health-gate both** `knowledge-api` and `knowledge-site` via `docker inspect
   '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'` — hi2vi's `wait_healthy` loop,
   parameterized per service (24×5 s each; covers the api's `start_period 60s` and the site's `40s`;
   docker's transient `starting` falls through the catch-all and keeps polling, only an explicit
   `unhealthy`/`none`/timeout fails).
5. **On failure — gate + fix-forward, NO rollback (§F v1)** — `capture_artifacts` dumps `compose ps`
   + per-service `logs` into `$REMOTE_ARTIFACT_DIR` when set (else inline), then `die` non-zero with
   a fix-forward message (merge a corrected commit to `main` and re-dispatch — the reconcile picks it
   up). No `rollback.sh`, no image-tag flip, no `git reset` — the bind-mounted code is never moved
   backwards under the running container.

## Reconcile mechanism chosen (the crux — S5 must confirm live)
**`docker compose -f compose.prod.yml run --rm -T --no-deps --name knowledge-reconcile-$$
--entrypoint sh api -c "$RECONCILE_SCRIPT"`** — a **separate ephemeral container reusing the api
service**. It inherits the api's `.:/repo` mount, `/run/secrets` deploy key, `GIT_SSH_COMMAND`,
`changple_shared_network`, and the image's baked `git config --system safe.directory /repo` +
identity (`Dockerfile:39-41`), so `git fetch`/`rebase` over SSH run as uid 0 — matching the ownership
of the root-owned `.git` the running api writes. The live `knowledge-api` container is untouched.

- **`container_name` caveat handled by `--name`, not a compose edit.** The api service pins
  `container_name: knowledge-api`. I pass `--name knowledge-reconcile-$$` so the run container gets a
  distinct, unique name and cannot clash with the live container — sidestepping the caveat entirely
  and keeping the change confined to `deploy/deploy.sh` (no `compose.prod.yml` edit → no
  config/parity/site_smoke re-run). `-T` disables the TTY for the non-interactive GHA/SSH context;
  `--no-deps` never spins up `site`.
- **Documented fallback (in the script header + the failure message):** if a given Compose still
  refuses `run` on a `container_name`-pinned service despite `--name`, add
  `image: knowledge-api:latest` to the api service and swap to `docker run --rm -v .:/repo -v
  /opt/knowledge-secrets:/run/secrets:ro -e GIT_SSH_COMMAND=… -w /repo knowledge-api:latest sh -c '…'`.
- **S5 must confirm live**, since docker cannot run here: (a) `docker compose run` is accepted on the
  pinned api service, (b) the run container authenticates to github over SSH and reconciles, (c) the
  bind-mounted tree the live api uses reflects the reconcile.

## Deliberate divergence documented (tip vs TARGET_SHA)
The box deploys origin/main's **tip**, not the exact `TARGET_SHA` — we cannot `checkout --detach` to a
specific SHA without risking orphaning an unpushed publish-on-write doc. `TARGET_SHA` is only a sanity
assert + log here (`cat-file -e` + `merge-base --is-ancestor`); the authoritative ancestor gate is
S3's remote script. Because code and docs are disjoint paths, the tip's *code* equals `TARGET_SHA`'s
code unless an interleaved code commit lands mid-run (rare under manual dispatch). Noted in the script
header comment and in `[reconcile]` log lines.

## Concurrency (§E step 5)
Before reconciling, the in-container script waits out a `.git/index.lock` held by a concurrent
publish-on-write (`LOCK_TRIES`×`LOCK_INTERVAL`, default 6×3 s; a write is ~6 s), then proceeds.
The small residual race (a write grabbing the lock right after the check) is accepted — a git op that
then hits the lock fails loudly under `set -e`, and manual dispatch is rare.

## Static validation (no box access — this is all that is possible here)
| Check | Command | Result |
|---|---|---|
| Outer bash syntax | `bash -n deploy/deploy.sh` (system bash 3.2) | **PASS** |
| Inner reconcile POSIX syntax | captured heredoc body → `sh -n` (dash) | **PASS** (74 lines, clean) |
| shellcheck | `shellcheck deploy/deploy.sh` | **NOT AVAILABLE** on this host (fell back to manual logic review) |
| Workflow state integrity | `python3 scripts/workflow.py validate` | **PASS** ("Workflow validation passed.") |
| Forbidden git verbs | `grep -nE 'reset --hard\|checkout --detach\|--force'` | only in explanatory comments; **no live command** uses them |

- **Not run (correctly skipped):** `docker compose config`, `scripts/plugin_parity.py`,
  `scripts/site_smoke.py` — those are required by the plan *only if* `compose.prod.yml` gains an
  `image:`, which it did not.
- **bash-3.2 toolchain note:** the reconcile script is first assigned via
  `IFS='' read -r -d '' RECONCILE_SCRIPT <<'RECONCILE' … || true` rather than `$(cat <<'RECONCILE' …)`.
  A heredoc inside `$(…)` whose body contains an apostrophe (`hi2vi's`) trips macOS bash 3.2's
  command-substitution parser (verified with a minimal repro); the `read` idiom parses cleanly on both
  bash 3.2 (the static-check toolchain) and the box's modern bash. `read -d ''` returns non-zero at
  EOF, hence the `|| true`. This is purely a local-toolchain accommodation — the original construct
  was valid on the box's bash.

## Logic review vs §E/§F (manual, since shellcheck is absent)
- **Never detach/reset/force:** ✓ only `fetch`/`merge --ff-only`/`rebase`/`rebase --abort`; explicit
  `main`-branch guard refuses a detached/other-branch HEAD.
- **ff-only vs rebase branch correct:** ✓ `head==fetched` → no-op; `head` ancestor of `fetched`
  (strictly behind) → `merge --ff-only`; else (ahead/diverged) → `rebase`.
- **Conflict aborts, never half-rebased:** ✓ `git rebase --abort || true; exit 1`.
- **Both services health-gated:** ✓ both must report `healthy` (`gate_ok`), else fail.
- **Failure path:** ✓ captures artifacts, exits non-zero, no rollback / no image flip / no reset.
- **Env inheritance:** `docker compose run` reuses the api service's `environment` (`GIT_SSH_COMMAND`)
  + `env_file: .env` + volumes + network; `-e TARGET_SHA/LOCK_*` add to that. Empty `TARGET_SHA`
  safely skips the assert (`${TARGET_SHA:-}`). SSH outbound is proven by P8's publish-on-write on the
  same network — S5 confirms it here.

## Scope / boundaries honored
- Delivered **only** `deploy/deploy.sh`. The remote gate
  (`oracle-production-deploy-remote.sh`), the runner driver, the workflow, and the edge re-apply are
  **S3**. No `rollback.sh` authored (§F v1 = gate + fix-forward).
- No commit, no status transition, no `doc-new-version`. A Doc-impact note was appended to `phase.md`.

## Deviations from plan.md
- **None material.** The two decisions the plan left to my judgment: (1) reconcile via
  `docker compose run` with `--name` (keeping `compose.prod.yml` untouched, vs adding an `image:`) —
  chosen as documented; (2) the `read -r -d ''` heredoc idiom for bash-3.2 static-check compatibility.
  Both are within the plan's explicit latitude.
