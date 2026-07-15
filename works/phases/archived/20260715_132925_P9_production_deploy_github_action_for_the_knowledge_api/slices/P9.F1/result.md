# P9.F1 result — Gate hardening: `deploy.sh`'s in-container reconcile is the single source of git truth

**Verdict: `done`.** Author + static-validate only (no box SSH, no dispatch, no docker). Behavioral proof
is S5. The fix is a net deletion in the gate + comment-only accuracy updates in `deploy.sh`.

## The problem addressed
`deploy/oracle-production-deploy-remote.sh` ran its authoritative `git fetch --prune origin main` +
ancestor-verify **as `opc`**. That fetch cannot authenticate: `origin` is SSH, its deploy key is
root-owned/unreadable by `opc`, and `opc` has no GitHub key — so every real deploy would die at the gate.
S3's own findings flagged this as the top S5 risk. F1 removes the broken opc-side git and makes
`deploy/deploy.sh`'s in-container reconcile (which holds the deploy key) the sole authoritative git path.

## Coverage check (why this is a net deletion, not a loss of safety)
Before deleting the gate's checks I confirmed `deploy/deploy.sh`'s one-shot **root** container already does
**strictly more**, all fail-closed under `set -eu`, with `TARGET_SHA` injected via `-e`:

| Removed from gate (ran as `opc`) | Covered in `deploy.sh` reconcile container (runs as root, has key) |
|---|---|
| dirty-tracked-worktree refusal (`diff --quiet`/`--cached`) | lines 168-172 — identical guard, `exit 1` |
| `git fetch --prune origin main` | line 189 |
| `FETCH_HEAD^{commit}` rev-parse | line 190 (`set -eu` → fails closed) |
| `cat-file -e $TARGET_SHA^{commit}` | lines 196-199 — `exit 1` if missing |
| `merge-base --is-ancestor $TARGET_SHA $fetched` | lines 200-203 — `exit 1` if not ancestor |
| _(not in gate)_ on-`main` branch check | lines 160-164 — refuses off-`main` |
| _(not in gate)_ `.git/index.lock` wait | lines 177-186 |
| _(not in gate)_ ff/rebase reconcile, abort-on-conflict | lines 207-224 |

The gate asserts `TARGET_SHA` is a 40-hex SHA and hands off `deploy/deploy.sh "$TARGET_SHA"`, so the
in-container `if [ -n "${TARGET_SHA:-}" ]` ancestor gate **always fires** on a real deploy. A non-`main`
branch, dirty (mid-write) tree, missing/non-ancestor `TARGET_SHA`, or rebase conflict all still fail closed
— now inside the container, before any build. Safety is preserved and relocated, not weakened.

## Changes

### `deploy/oracle-production-deploy-remote.sh` (the gate — logic deletion + comment)
- **Deleted the opc-side dirty-check gate** (was ~96-102: `diff --quiet`/`diff --cached --quiet` → `die`).
- **Deleted the fetch + ancestor block** (was ~104-112: `git fetch --prune origin main`, `FETCH_HEAD`
  rev-parse, `cat-file -e`, `merge-base --is-ancestor`; the now-unused `fetched_main_sha` var went with it).
- Replaced both with a short `# NB (P9.F1)` comment + an updated handoff log line explaining that all
  authoritative git now lives in `deploy.sh`'s container.
- **Made status captures non-fatal:** added `|| true` inside `run_capture` (its only three call sites are
  `git-before` + two `git-after` status captures) — a `git status` that trips on the root-owned index can
  no longer abort the deploy.
- **Kept the `GIT=(git -c safe.directory=…)` array** solely for those best-effort captures, and updated its
  comment to say so (no authoritative git as `opc` anymore).
- **Rewrote the header comment:** the gate is now the opc-safe **orchestration** layer (assert inputs →
  `deploy.sh` owns fetch + fail-closed ancestor-verify + reconcile in-container → edge re-apply → artifacts),
  with an explicit "why no git gate here" paragraph. Kept unchanged: the `TARGET_SHA` 40-hex + `.git`
  asserts, the `deploy/deploy.sh "$TARGET_SHA"` handoff, `reapply_edge`, `collect_status`, the summary.

### `deploy/deploy.sh` (comment accuracy only — NO logic change)
Updated four comments that mislabeled the in-container ancestor-verify as "only a sanity assert" / pointed
to "S3's remote script" as authoritative — after F1 the in-container check **is** the authoritative gate:
- the DELIBERATE DIVERGENCE block (~18-27),
- the usage line (`deploy/deploy.sh [TARGET_SHA]`, ~63),
- the `TARGET_SHA=` knob comment (~76),
- the in-container reconcile comment above the ancestor branch (~196-197).
The deliberate tip-vs-`TARGET_SHA` divergence note is preserved (the box still deploys the fetched **tip**;
`TARGET_SHA` is verified an ancestor of that tip, fail-closed). `git diff` confirms the only non-comment
line touched is the trailing comment on the otherwise-unchanged `TARGET_SHA="${1:-${TARGET_SHA:-}}"` line —
**zero logic change**.

## Static validation (all pass; no box access)
| Command | Result |
|---|---|
| `bash -n deploy/oracle-production-deploy-remote.sh` | PASS |
| `bash -n deploy/deploy.sh` | PASS |
| `shellcheck` | not installed in this env (skipped) |
| logic review: no authoritative git runs as `opc` in the gate | PASS — only 3 best-effort `${GIT[@]} status` captures remain (lines 110/137/144), all via non-fatal `run_capture` |
| logic review: `deploy.sh` covers branch+dirty+lock+fetch+ancestor+reconcile fail-closed | PASS — see coverage table above |
| `python3 scripts/plugin_parity.py` | PASS (deploy files not in the manifest — no impact) |
| `python3 scripts/workflow.py validate` | PASS ("Workflow validation passed.") |

Behavioral proof (opc runs the gate → deploy.sh reconcile authenticates + ancestor-gates + ff/rebase) is
**S5**, per plan.

## Deviations from plan.md
- The plan named two `deploy.sh` comment spots (~22-23, ~193-194). I also updated the usage line (~63) and
  the `TARGET_SHA=` knob comment (~76), which used the same now-inaccurate "sanity assert / log only"
  wording — updating only two would have left the file internally contradictory. All four are comment-only;
  no logic changed. This is within the plan's stated intent ("the comments that call it 'only a sanity
  assert'"). Otherwise followed exactly.

## Doc impact (appended to phase.md; NOT versioned — for P9.REVIEW)
Authoritative reconcile/fetch/ancestor gate now lives in `deploy.sh`'s in-container path, not the opc-side
gate — `operations.md` (redeploy procedure) + `decisions.md` (the gate-hardening ADR) should reflect it.
