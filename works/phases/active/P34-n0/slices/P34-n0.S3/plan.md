# P34-n0.S3 — Deploy the gate and verify a private write live

## Goal

Ship S1 and S2 (already committed on local `main`) to the server, and prove live that a private write with `commit: true` makes no commit, no index bullet and no push. Every server action, the push of `main` and the deploy dispatch are the operator's. This slice prepares an exact, copy-paste runbook, runs the read-only checks it can, and stops for the operator. On the operator's return it verifies what they report.

Read first: `## Now`, the S3-tagged entries in `## Notes for later slices` (they carry the pre-steps, the probe's expected response, and the toggle warning), `topics/reconcile.md`, `deploy/README.md` (the box layout and §6, the redeploy), `deploy/deploy.sh` (its dirty-tree refusal, ~L224-288), `deploy/oracle-production-deploy-remote.sh` (the `git status` artifact, ~L110-144), `.github/workflows/deploy-production.yml`, and the block markers in `server/gitops.py` (`PRIVATE_BLOCK_BEGIN` / `PRIVATE_BLOCK_END`).

## This dispatch (first pass): write the runbook, then stop

1. **Read-only checks now**, recorded in `result.md`:
   - `git log --oneline origin/main..main` (the unpushed commits and their count);
   - `git status --short` (must be clean apart from this slice's own files);
   - `gh run list --workflow deploy-production.yml -L 3` (the last deploys);
   - `gh api repos/leetusik/knowledge/commits/main --jq .sha` (origin's head).
   Nothing that writes, pushes or dispatches.
2. **Write the runbook into `result.md`**, under `## Operator runbook`, as numbered copy-paste blocks with the expected output of each. Take the server checkout's path from `deploy/README.md`, and the API container name and `KB_ROOT` from `compose.prod.yml`. Never guess a path; if the README leaves one open, say so. The steps, in order:
   - **A. OQ3.** If the session label in `intent.md`'s `## Notes` matches a private project's name, the operator gives the replacement wording, and the main thread edits that one line and commits it before anything is pushed.
   - **B. Server pre-steps** (`ssh h`, in the server checkout):
     - Back up `docs/` to a tarball **outside** the checkout.
     - Run `git checkout -- docs/index.md`.
     - Write the stray private document's project footprint into `info/exclude` in the exact managed-block format: the two marker lines verbatim from `server/gitops.py`, and between them the three sorted lines `/docs/<p>/`, `/docs/.versions/<p>/`, `/docs/.books/<p>/`, with `<p>` as a placeholder the operator fills. Locate the file with `git rev-parse --git-path info/exclude`.
     - Check that `git status --short --branch` shows a clean tree on `main...origin/main` with no ahead count. Explain why the clean check matters: the deploy prints `git status` publicly when it refuses, and uploads it as an artifact.
   - **C. Hygiene grep**, with the operator's private list in a file outside every repo (one name per line):
     `git log -p --format='%H%n%s%n%b' origin/main..main | grep -niwF -f <list>`. It must print nothing. Note that it also covers `works/` records.
   - **D. Push** `main` (`git push origin main`), then **dispatch** `gh workflow run deploy-production.yml --ref main` and `gh run watch`. Each happens on the operator's word at that moment. The main thread may run D for the operator once they say so.
   - **E. Verify the deploy:**
     - On the box, `docker exec <api> python -m server.reconcile --help` (prints no project).
     - The server's `git log -1` equals origin's head.
     - `git status --short` is clean.
   - **F. The probe write**: the only write during the pause, with an invented project name such as `p34-probe`. Give one exact request. Use the KB API with the master bearer the box already holds, through `curl` on the box against the API container, reading the token from the container's environment, never pasting it. Use a tiny body and `commit: true`. Expected: 201 with the fields S1's note lists (`committed: false`, `commit_sha: null`, no `commit_error`). Then check:
     - the server's `git status --short` is still clean;
     - `git log -1` and `docs/index.md` are unchanged;
     - origin's head is unchanged;
     - the `info/exclude` block now lists the probe.
   - **G. Probe cleanup**: delete the probe document through the API (`commit: true`; a private delete makes no commit), and confirm the tree is still clean. The probe's registry row stays, private and harmless. Say so; the operator may delete it from the app later.
3. Return **`needs_operator`** with `operator_need` naming: A (OQ3), B to F run by the operator (or B, C, E, F by the operator and D by the main thread on their word), and what to paste back. Paste back the outputs of B's status check, C's grep (empty), E's three checks, F's response and its four checks, and G's status. Do not wait for anything.

## The resumed pass (after the operator returns)

The main thread re-dispatches this slice with the operator's pasted outputs appended under `## Operator report`. That pass compares each to the expected output and re-checks GitHub read-only (origin's head, the deploy run's conclusion). It writes `## Verification` in `result.md`, and returns `done` or `blocked` with the mismatch.

## Set

No product files: only this slice's `result.md` and the notebook through `phase-section`. Never ssh, push, dispatch a workflow, or write to the server.

## Hygiene

No private project name, document title, tenant id, token or secret in `result.md` or the notebook. The runbook uses placeholders (`<p>`, `<list>`).

## Notebook at the end of the first pass

- Rewrite `## Now`: S3 waits on the operator, and for what.
- Leave the notes S4 needs.

## Dispatch

route=mid
reason=kind qa rated low
subagent_type=slice-executor
model=opus
pass_model=yes
effort=medium
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
