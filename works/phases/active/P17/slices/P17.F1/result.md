# Result — P17.F1: force-recreate the bind-mounted api + post-gate freshness self-assert

Fix slice for the S5 split-deploy incident. One source file changed: `deploy/deploy.sh`.
Static validation only (no docker, no deploy dispatch, no box access), per plan.

## Root cause (recap)

`knowledge-api` runs `server/` from the bind mount (`.:/repo`), not from its image. The
old step-2 `dc up -d --build` recreates a container only when its image or config
changed; a code-only push changes neither for the api, so the running uvicorn kept the
code it imported at its last recreate. At S5, a GREEN `Production Deploy` (run
29830927799) left the api on stale pre-P16 code while `web`/`mcp` (which bake code into
their images) updated — a split deploy that took an operator container restart to land.
The old step-2 comment even claimed "uvicorn reloads against the reconciled bind-mounted
code" — false.

## The three edits, as landed (all in `deploy/deploy.sh`)

### 1. Force-recreate the api after the build step — new step "2b" (L316–322)

Directly after the existing `dc up -d --build`:

```bash
# --- 2b. force-recreate the bind-mounted api ---------------------------------
# The api runs server/ from the BIND MOUNT — a code-only push changes neither its image
# nor its config, so the plain `up` above never recreates it and the running uvicorn keeps
# stale code (the S5/P17 split-deploy incident). Recreate it unconditionally; `--no-deps`
# leaves the already-running postgres untouched.
log "force-recreating the api (bind-mounted code — plain up won't recreate it)"
dc up -d --force-recreate --no-deps api
```

Flags are exactly `--force-recreate --no-deps`, service `api` only (per plan). `--no-deps`
leaves the already-running `postgres` (the api's dependency) untouched.

### 2. Freshness self-assert — `DEPLOY_START_TS` + `assert_api_fresh` (L100–105, L146–166, L332–334)

- After the config knobs (right after `export COMPOSE_BAKE=false`), capture the deploy
  run's start epoch:

  ```bash
  DEPLOY_START_TS="$(date -u +%s)"
  ```

- A small function in the style of `wait_healthy`, placed between `wait_healthy` and
  `capture_artifacts`:

  ```bash
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
  ```

  The `date -u -d "$started_at" +%s` conversion is GNU-only (the box is Oracle Linux /
  GNU date); it is **guarded** so a parse failure yields an empty `started_ts` and `die`s
  loudly ("could not parse … refusing to pass a possibly-stale api") rather than passing
  silently. A missing container (empty StartedAt) also dies. The trap name is in every
  `die` message ("bind-mount stale-process trap; see P17.F1").

- Called in the `if (( gate_ok ))` success branch, after "all three services healthy" and
  before the final `DONE` log (L332–334):

  ```bash
      # Post-gate freshness self-assert: prove step 2b's force-recreate actually landed a
      # NEW uvicorn, not the pre-existing stale one (the S5/P17 split-deploy trap).
      assert_api_fresh
  ```

### 3. Fix the false prose (header + step-2 comment)

- **Step-2 comment block** rewritten to describe reality: images rebuild; Compose
  recreates `web`/`mcp` on image change; the api does NOT recreate on a plain `up`
  because its code is bind-mounted, so step 2b force-recreates it explicitly. The section
  heading became `# --- 2. build the app images + recreate web/mcp ---`, and the `log`
  line now reads `building images + recreating web/mcp (…)`.
- **Header L2** — the false "rebuilds + recreates the app compose services" phrasing now
  reads "rebuilds the app images … Compose recreates `web`/`mcp` when their image changes;
  `api` is FORCE-recreated unconditionally because it runs server/ from the bind mount …
  Health-gates all three, then self-asserts the api process is fresh."
- **Header Lifecycle list** — renumbered to 6 steps to describe the new reality: step 3
  builds + recreates web/mcp but NOT the bind-mounted api; step 4 force-recreates the api;
  step 5 health-gates then self-asserts StartedAt postdates the run. (This is a minor
  within-intent extension of edit 3 — see Deviations.)

## Static validation (no docker / no dispatch / no box access)

| Command | Outcome |
|---|---|
| `bash -n deploy/deploy.sh` | **clean** (no syntax errors) |
| `shellcheck deploy/deploy.sh` | **not run** — shellcheck NOT INSTALLED on this machine (reported, not chased) |
| Portable branch-logic dry-test of `assert_api_fresh` | **5/5 passed** (see below) |
| `python3 scripts/workflow.py validate` | **passed** ("Workflow validation passed.") |
| `python3 scripts/plugin_parity.py` | **exit 0 (green)** — untouched by this slice |
| `python3 scripts/skills_parity.py` | **exit 0 (green)** — untouched by this slice |

**Freshness parse/compare dry-test.** GNU `date -u -d <rfc3339>` is unavailable on
macOS/BSD, so — per the plan — I exercised the LOGIC portably: a faithful copy of the
guard + `(( started_ts < DEPLOY_START_TS ))` branch with the one GNU-only `date -d` line
replaced by an injected precomputed epoch. All five cases behaved correctly: started
AFTER start → pass; started EXACTLY at start → pass; started BEFORE start → die (stale);
empty StartedAt (container missing) → die; StartedAt present but epoch empty (parse
failure) → die. The `date -d` RFC3339-parse path itself is box-GNU-only **by design**
(the script already assumes the box's toolchain; `deploy.sh` only ever runs on the box),
and `bash -n` covers its syntax here.

## Arming / rollout note (no code action — for REVIEW and the optional operator proof)

`deploy.sh` executes from the box clone, and its own reconcile step updates that clone.
So the **first** post-F1 `Production Deploy` dispatch runs the OLD (pre-F1) script — its
reconcile fast-forwards the clone to the commit carrying this fix, but the fix + the
freshness self-assert only **ARM from the second dispatch onward**. The box is already
current (the operator restarted the api today, 2026-07-21), so that first dispatch is a
normal green — **no forced red**.

**Optional operator proof** (the orchestrator offers this after the slice; if skipped,
REVIEW records "armed, proven on next organic deploy" as a residual):

1. **First dispatch** — `gh workflow run "Production Deploy" --ref main` after this fix is
   pushed. Expected GREEN; this run executes the pre-F1 script but reconciles the clone up
   to the fix (it ARMS the fix; it does not yet exercise it).
2. **Second dispatch** — dispatch again. Expected GREEN, and this run's logs should now
   show the two new lines proving the fix ran: `force-recreating the api (bind-mounted
   code — plain up won't recreate it)` and `api process is fresh (StartedAt=…, …s >=
   deploy start …s)`. A negative-control that would trip the gate: if a plain `up` had
   left the old uvicorn, `assert_api_fresh` would `die` "api process predates this deploy
   … bind-mount stale-process trap; see P17.F1" and the deploy would go RED instead of
   silently green — which is exactly the S5 failure this slice closes.

The live two-dispatch proof is deliberately out of this slice's scope (static-only
validation); the code is correct and syntactically proven off-box.

## Deviations from `plan.md`

- **Header Lifecycle list updated (minor, within edit-3 intent).** The plan's edit 3
  named "the step-2 comment block" and "the header's 'rebuilds + recreates the app compose
  services' phrasing". I also renumbered the header's `# Lifecycle:` list from 5 to 6
  steps to add the force-recreate + freshness steps. Left un-updated, that list would
  itself be stale/false prose (it would omit the new step), so this is squarely within
  edit 3's "describe reality" intent and touches only `deploy/deploy.sh` header comments.
  No other deviations: force-recreate flags are exactly `--force-recreate --no-deps` on
  `api`; the freshness assert reads `knowledge-api`'s `StartedAt` and dies on parse
  failure; scope stayed strictly inside `deploy/deploy.sh` (plus this `result.md` and the
  `phase.md` Doc-impact append). No `.github/workflows/**`, `server/**`, `compose.prod.yml`
  touched.
