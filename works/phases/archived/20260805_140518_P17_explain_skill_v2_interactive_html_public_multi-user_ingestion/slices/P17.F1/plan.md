# Plan — P17.F1: Production Deploy — force-recreate the bind-mounted api + freshness self-check

Operator-approved at the plan gate (2026-07-21). Fix slice for the S5 split-deploy
incident. Read `../../phase.md` (the S5 Stage-B findings + Doc impact lines) for the
incident record, and read ALL of `deploy/deploy.sh` before editing. This plan is
prescriptive — follow it literally; if anything in the script contradicts it,
return `escalate` with findings instead of improvising.

## Root cause (context, verified)

`knowledge-api` runs its code from the bind mount (`.:/repo`), not from its image.
`deploy.sh` step 2 (`dc up -d --build`, ~L280) only recreates containers whose image
or config changed — a code-only push changes neither for the api, so the running
uvicorn keeps the code it imported at its last recreate. `web`/`mcp` bake code into
their images and recreate naturally. Result at S5: green deploy, stale api, split
topology. The step-2 comment even claims recreation happens ("uvicorn reloads
against the reconciled bind-mounted code") — false today.

## The three edits (all in `deploy/deploy.sh`, nothing else)

1. **Force-recreate the api after the build step.** Directly after the existing
   `dc up -d --build` line add:

       # The api runs server/ from the BIND MOUNT — a code-only push changes neither
       # its image nor its config, so plain `up` never recreates it and the running
       # uvicorn keeps stale code (the S5/P17 split-deploy incident). Recreate it
       # unconditionally; --no-deps leaves the already-running postgres untouched.
       log "force-recreating the api (bind-mounted code — plain up won't recreate it)"
       dc up -d --force-recreate --no-deps api

   (Adjust the comment wording to fit the file's comment voice; keep the two flags
   exactly: `--force-recreate --no-deps`, service `api` only.)

2. **Freshness self-assert.** Near the top of the script (after the config knobs)
   capture `DEPLOY_START_TS="$(date -u +%s)"`. After the three `wait_healthy` gates
   pass (inside the `if (( gate_ok ))` success branch, before the final success log),
   add a check: read `docker inspect --format '{{.State.StartedAt}}' knowledge-api`,
   convert to epoch with GNU date (`date -u -d "$started_at" +%s` — the box is Oracle
   Linux/GNU; guard the conversion so a parse failure dies loudly rather than passing
   silently), and `die` if it is `< DEPLOY_START_TS`, with a message naming the trap
   ("api process predates this deploy — bind-mount stale-process trap; see P17.F1").
   Keep it a small function (e.g. `assert_api_fresh`) in the style of `wait_healthy`.

3. **Fix the false prose.** The step-2 comment block ("Builds the api + web + mcp
   images and recreates all three containers (uvicorn reloads against the reconciled
   bind-mounted code; …)") and the header's "rebuilds + recreates the app compose
   services" phrasing → describe reality: images rebuild; web/mcp recreate on image
   change; the api is force-recreated explicitly because its code is bind-mounted.

## Rollout nuance to RECORD (no code action)

`deploy.sh` executes from the box clone, so the first post-F1 dispatch runs the OLD
script (its reconcile updates the clone); the fix + self-check ARM from the second
dispatch onward. The box is already current (operator restart today), so that first
dispatch is a normal green — no forced red. State this in `result.md` and in the
`phase.md` Doc-impact line; the live two-dispatch proof is an OPTIONAL operator step
the orchestrator offers after this slice (if skipped, REVIEW records "armed, proven
on next organic deploy" as a residual).

## Validation (static only — no docker, no dispatch, no box access)

1. `bash -n deploy/deploy.sh` → clean. `shellcheck deploy/deploy.sh` if available
   (report notes; do not chase pre-existing style warnings outside your edits).
2. Dry-test the StartedAt parsing logic as a pure-shell snippet with a sample
   timestamp (e.g. `2026-07-21T08:31:02.123456789Z`): on macOS, GNU `date -d` is
   unavailable — so test the LOGIC with a portable harness (e.g. feed a precomputed
   epoch) and note that the `date -d` path is box-GNU-only by design (the script
   already assumes the box's toolchain; `bash -n` covers syntax here).
3. `python3 scripts/workflow.py validate` passes; you touched nothing that
   `plugin_parity.py`/`skills_parity.py` cover (both must stay green if run).

## Wrap-up

`result.md`: the three edits as landed (quote the new lines), static validation
outcomes, the arming/rollout note, the optional operator proof procedure (two
dispatches: first arms, second proves — expected green both times, with the second's
logs showing the force-recreate + freshness pass). `phase.md` append: one Doc-impact
line — **operations**: `Production Deploy` now force-recreates the bind-mounted api
and self-asserts api-process freshness post-gate (S5 split-deploy fix; arms on the
second post-F1 dispatch). Never commit; never transition status.
