# P9.F1 — Gate hardening: make `deploy.sh`'s in-container reconcile the single source of git truth

**You are `slice-executor-high`.** Fix a certain blocker in S3's on-box gate. **Author + static-validate
ONLY** — no box, no dispatch, no `docker`.

## The problem
`deploy/oracle-production-deploy-remote.sh` runs its authoritative `git fetch --prune origin main` +
ancestor-verify **as `opc`** (~lines 104-112). That fetch can't authenticate: `origin` is SSH, its deploy
key is root-owned/unreadable by `opc`, and `opc` has no GitHub key — so every deploy dies at the gate.

## Why the fix is a net deletion
`deploy/deploy.sh` (S2) **already** does, inside its one-shot root container (deploy key via
`GIT_SSH_COMMAND` + baked `safe.directory`, all fail-closed): the on-`main` branch check (160-164),
dirty-tracked-worktree refusal (168-172), `.git/index.lock` wait (177-186), `git fetch --prune origin main`
(189), `TARGET_SHA` ancestor-verify (195-205, `exit 1` on missing/non-ancestor), and ff/rebase reconcile
(207-224) — **strictly more** than the gate's opc-side checks. Re-read both scripts to confirm before editing.

## Changes

### `deploy/oracle-production-deploy-remote.sh` (the gate)
- **Delete the fetch + ancestor block** (~104-112: `git fetch --prune origin main`, `FETCH_HEAD` rev-parse,
  `cat-file -e`, `merge-base --is-ancestor`).
- **Delete the opc-side dirty-check gate** (~96-102) — `deploy.sh` refuses a dirty tree fail-closed
  in-container; a bare `git diff` as opc can trip on the root-owned index.
- **Make `git-before`/`git-after` status captures non-fatal** (`|| true`) — best-effort artifacts only; never
  fail the deploy on them. Drop the `GIT=(git -c safe.directory=…)` array if no authoritative git remains
  (or keep it solely for these best-effort captures).
- **Keep unchanged:** the `TARGET_SHA` 40-hex + `$REPO_PATH/.git` asserts, the `deploy/deploy.sh "$TARGET_SHA"`
  handoff (now the sole git owner), the edge re-apply (`reapply_edge`), `collect_status`, the summary.
- **Update the header comment:** the gate is now opc-safe orchestration (assert inputs → `deploy.sh` owns the
  publish-on-write reconcile + fetch + fail-closed ancestor-verify in-container → edge re-apply → artifacts),
  not "the authoritative gate that fetches + verifies ancestry."

### `deploy/deploy.sh` — comment accuracy only (NO logic change)
- Its in-container ancestor-check (195-205) already fails closed → it **is** authoritative. Update the comments
  that call it "only a sanity assert" / "the authoritative ancestor gate is S3's remote script" (~22-23,
  ~193-194): after F1, this in-container check **is** the authoritative ancestor gate. Do not change any logic.

## Safety (preserved, relocated)
A non-`main` branch, dirty (mid-write) tree, missing/non-ancestor `TARGET_SHA`, or rebase conflict all still
**fail closed** — now inside `deploy.sh`'s container, before any build. The runner driver + workflow are
unchanged (they only invoke the gate).

## Static validation (no box access)
- `bash -n deploy/oracle-production-deploy-remote.sh deploy/deploy.sh`; `shellcheck` if available.
- Logic review: no authoritative git runs as `opc` in the gate; `deploy.sh` covers
  branch+dirty+lock+fetch+ancestor+reconcile fail-closed; gate captures are `|| true`.
- `python3 scripts/plugin_parity.py` (deploy files not in the manifest — confirm no impact);
  `python3 scripts/workflow.py validate`. Behavioral proof is **S5**.

## Constraints
- Never commit / transition status. Append F1 findings to `phase.md`; add a Doc-impact note (reconcile/ancestor
  authority now lives in-container — for REVIEW). Do not version docs or edit `docs/current/*`.

## Verdict
`done` with the two files (gate: logic deletion + comment; deploy.sh: comment only) + static-validation, or
`escalate` if `deploy.sh`'s in-container path does NOT fully cover the removed gate logic.
