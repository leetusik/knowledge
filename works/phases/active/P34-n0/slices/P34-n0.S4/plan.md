# P34-n0.S4 — Unpublish private projects from the tree on the server

## Goal

On the knowledge box (`ssh oracle-cloud`, `/opt/knowledge`), never from this laptop, the reconcile untracks every private registry project's footprint and unlists its bullets from `docs/index.md`. That is one unpublish commit, pushed, with the exclude block rewritten whole. Afterwards, GitHub's tip tree holds no private footprint path and no private bullet, and the server still has every private file on disk.

## Who runs what

The operator said "you do the runbook" for S3, and the harness denied the main thread's `git push`. So the main thread runs the read-only and server steps over SSH. The steps that change the public repo happen only on the operator's word at this slice's stop. The executor then verifies.

1. **Dry run (main thread, read-only):** `docker exec knowledge-api python -m server.reconcile --dry-run --verbose`. Its output names private projects, so it stays in the session, never in a repo file. Record counts only below, under `## Operator report`.
2. **Stop (`decision`):** the operator confirms the private list. They also say whether "keep everything private" covers the two projects that are public in the registry today. If it does, the main thread sets those two private first, through the registry on the box. A toggle through the app would commit and push at once, so the order is agreed at the stop. Then the dry run is repeated.
3. **On the operator's word (main thread):**
   - Back up `docs/` again on the box.
   - Run `docker exec knowledge-api python -m server.reconcile --push`.
   - If the harness denies the push step, run it without `--push` and hand the operator `docker exec knowledge-api python -m server.reconcile --push` to run on the box. That command is the owed-push retry.
4. **Verify (executor, high row, read-only):** re-dispatched with the main thread's report appended below. It checks, against the private-name list at the scratchpad path given in the dispatch prompt (never copied into the repo):
   - GitHub's tip tree, through `gh api repos/leetusik/knowledge/git/trees/main?recursive=1`, holds no path under any private project's footprint (`docs/<p>/`, `docs/.versions/<p>/`, `docs/.books/<p>/`);
   - the tip's `docs/index.md` (`gh api …/contents/docs/index.md`) has no bullet linking into a private project;
   - the unpublish commit's message names no project;
   - the counts in the main thread's report (files untracked, index lines removed, files still on the box's disk) agree with the dry run.
   It writes `result.md` with counts only, no names, and returns `done` or `blocked`.
5. **The write pause:** it lifts once the verify passes. If a public project remains, a public-write probe goes to it first (a tiny document, `commit: true`, expected `committed: true` and pushed), and is then deleted. If none remains, there is nothing left to publish, and the probe is skipped with that reason.

## After S4

Pulling into this laptop clone deletes the private files from this laptop's `docs/`, because the server is canonical. The operator decides whether to copy them first. S5 (the history purge) follows.

## Set

No product files: only this slice's `result.md` and the notebook through `phase-section`.

## Hygiene

No private project name, title, tenant id or secret in `result.md`, the notebook or any commit; counts only.

## Dispatch

route=high
reason=risk high (not low)
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh

## Operator report

- **Dry run (main thread, 2026-10-28, box at `25fe9f9`, clean tree):**
  - `reconcile --dry-run --verbose` exit 0, 13 registry projects in scope.
  - 9 `unpublish` (52 tracked files would be untracked; 34 index lines removed), 2 `none private` (already marked, nothing tracked: the stray project and the probe), 2 `none public`.
  - Exclude block: would change. Would commit `docs: unpublish private projects (9)`.
  - Names stay in the session.
- **Operator, 2026-10-28:** "all private. cleanup the github repo as well. accept".
- **Box `docs/` backup 2:** `/home/opc/kb-docs-backup-20261028-050242.tgz` (7,794,584 bytes).
- **The 2 public projects:** set `private` through the accounts service inside `knowledge-api`, the same call the app toggle makes. Calling the service directly runs no reconcile.
- **Dry run 2:** exit 0. 11 `unpublish` (65 tracked files, 43 index lines), 2 `none private`, 0 public. Would commit `docs: unpublish private projects (11)`.
- **Laptop backup:** the clone's 19 private footprint dirs (65 files) are in `/Users/sugang/kb-private-docs-backup-20261028.tgz`, mode 600, outside the repo.
- **`reconcile --push`:** denied to the main thread by the harness, so the operator runs it.
- **Operator ran** `ssh oracle-cloud 'docker exec knowledge-api python -m server.reconcile --push'`: 11 `unpublish` (65 files untracked, 43 index lines removed), 2 `none private`. `exclude block: changed`. `committed ba2e8781a7066db6900aff522c70fb727ea58740: docs: unpublish private projects (11)`. `pushed: origin/main is now ba2e878…`.
- **Box after (main thread):** `## main...origin/main`, head `ba2e878`. Tracked files under the 12 projects' footprints: 0. Private files on disk: 67 (the 65 untracked, plus the stray project's untracked files). Index lines linking into a private project: 0.

## Resolution (main thread)

The verify returned `blocked`. 3 hand-written Browse-grid cards in the tip `docs/index.md` (HTML `href`) name private projects. The reconcile's markdown-link matcher cannot see them. Operator, 2026-10-28, on OQ4: "as your recommendation", that is, fold them into S5. S5's rewrite drops them from every version of `docs/index.md`, the tip included. Teaching the matcher and the guard the `href` forms goes to the review, as a deferred job. S4's own goal is met at `ba2e878`: 11 projects unpublished, 65 files untracked, 43 bullets removed, every private file still on the box's disk. The public-write probe is skipped: no public project remains. The write pause holds through S5.
