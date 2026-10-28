# P34-n0 breakdown

Hygiene, binding on every slice: this repo is public. No private project name, document title, tenant id or secret goes into any plan, result, topic, notebook entry, test fixture or commit message. Tests use invented names. The list of private projects and titles lives only on the server and in an operator-kept file outside this repo.

The code map every slice works from: [topics/publish-paths.md](publish-paths.md).

## Passes

- DECOMP (2026-10-28): one pass. S1 → S2 → S3 → S4 → S5 → REVIEW, a chain. No research slice and no DECOMP2: the code paths were read in full here, and nothing past S2 depends on something still unknown.

## Estimate

From `dispatch-summary` means (2026-10-28), applied to the slices below:

- By kind (span-min per slice): S1 implementation 28.1 + S2 implementation 28.1 + S3 qa 88.7 + S4 qa 88.7 + S5 implementation 28.1 + REVIEW 293.1 = **about 555 span-min (about 9.2 h)**.
- By route (min per span): S1, S2, S4, S5 on high at 79.3 each (317) + S3 on mid at 20.1 + REVIEW on high at 79.3 × 2.4 spans per review (190) = **about 528 span-min (about 8.8 h)**.
- The qa mean is skewed by browser-sweep slices. S3 and S4 are mostly runbook preparation and read-only GitHub checks, so they likely run shorter. The review dominates either way.
- Operator time is extra and not metered: the S3 server pre-steps, push and deploy; the S4 dry-run confirmation and run; the S5 force-push word, server re-sync and GitHub Support request.
- Money: no slice spends money (one line per slice below).

## Re-cut from the plan's suggested shape

The plan's six steps are kept, in the same order. Three changes, with reasons:

1. **The stray server state moves into S3's pre-steps.** `deploy/deploy.sh` refuses a dirty tracked tree, and the server's `docs/index.md` is modified today. The deploy also uploads `git status --short --branch` (git-before / git-after) as GitHub Actions artifacts and tees its output to the run log. So before the deploy can run, the modified index has to be restored, and the stray private document's project has to be listed in `.git/info/exclude`, or its path shows up on GitHub. S4 still owns the whole-tree cleanup.
2. **The live public-write check moves from S3 to S4.** The operator paused all KB writes until the cleanup lands (decision 2). S3 therefore checks only the private write, which the gate keeps local. The public write that proves publish-on-write still works runs in S4, after the cleanup, and lifting the pause is the last step of S4.
3. **S5 also covers what GitHub holds beyond the git history:** commit messages (`docs(<project>): add <slug>` names the project and the slug), Production Deploy artifacts and logs (14-day retention), and the GitHub Support request for cached commits.

## P34-n0.S1

- **Goal:** on every commit path (save, delete including the app-side delete, book manifest), a tenant #1 write commits only when its registry project is `public`. A write to a private project never writes its bullet into `docs/index.md`, never creates `docs/<project>/index.md`, and never reaches `gitops.commit`. A visibility lookup that fails means no commit (fail closed). `gitops.add` and `gitops.remove` refuse any path in a private project's footprint, whatever a caller passes. Legacy mode (no `DATABASE_URL`) stays byte-for-byte. Tiny tests for the core rule only, with invented names.
- **Set:** `server/main.py`, `server/gitops.py`, `server/documents_api.py`, `server/documents.py` (only if a helper lands there), one new module for the shared rule (S1 names it), one new test file, the identical copies of each under `plugin/templates/kb/`, and `plugin/templates/manifest.json` (a new shipped file is listed there).
- **Risk:** high. Trigger: core invariant (what reaches a public repo).
- **spends money:** no
- **Depends on:** none.

## P34-n0.S2

- **Goal:** one idempotent reconcile routine makes the tree match the registry for tenant #1: public → private runs `git rm --cached` on the project's footprint, drops its bullets from `docs/index.md`, adds its footprint to the managed block in `.git/info/exclude`, and commits once, with a message that does not name the project. Private → public does the reverse: exclude lines removed, landing created, bullets rebuilt from the database, footprint staged, one commit. Files never leave the disk. The visibility toggle (`set_project_visibility`) calls it. A one-shot command (with `--dry-run`) runs it for every tenant #1 project. It acts only on projects in the registry and never touches a `docs/` directory that is not one.
- **Set:** `server/app_api.py`, one new reconcile module and its command entry point, the S1 shared module, `server/main.py` (only if `WRITE_LOCK` moves to a shared module), one new test file, the `plugin/templates/kb/` copies, and `plugin/templates/manifest.json`.
- **Risk:** high. Trigger: core invariant plus deletion (it removes tracked files from the public tree).
- **spends money:** no
- **Depends on:** P34-n0.S1 (the footprint, the guard and the visibility lookup it reuses; both slices edit `server/main.py` and its plugin copy).

## P34-n0.S3

- **Goal:** ship S1 and S2 to the server and prove the gate live on the private side. Pre-steps on the server, run by the operator: back up `docs/`, restore `docs/index.md` (`git checkout -- docs/index.md`), and add the stray private document's project footprint to `.git/info/exclude` in the managed-block format S1/S2 define. Then a hygiene grep of every unpushed commit (messages and diffs) against the operator's private list, which is kept outside the repo. Then push `main` and dispatch `Production Deploy`, each on the operator's word at that moment. Verify: a private write with `commit: true` (an invented, harmless probe project) makes no commit, no index bullet and no push. GitHub is checked read-only, and the server's git state comes from the operator.
- **Set:** no product files. Only the slice's own `result.md`; the server checkout is the operator's.
- **Risk:** low (the mid row). The runbook is pinned, and every server and GitHub action is the operator's.
- **spends money:** no
- **Depends on:** P34-n0.S2.

## P34-n0.S4

- **Goal:** on the server, never from this laptop: back up `docs/`, run the reconcile command with `--dry-run`, and stop until the operator confirms the private list. Every project never toggled public is private by the registry default. Then run it: one unpublish commit, pushed, with the exclude block written. Verify that GitHub's tip tree holds no private footprint path and no private bullet (checked against the operator's off-repo list), and that the server still has every private file on disk. Then the public-write probe proves publish-on-write still works, and the operator lifts the write pause.
- **Set:** no product files. Only the slice's own `result.md`.
- **Risk:** high. Trigger: core invariant, deletion. It unpublishes tracked files, and done wrong it either unpublishes a public project or deletes private files from the server's disk.
- **spends money:** no
- **Depends on:** P34-n0.S3.

## P34-n0.S5

- **Goal:** on a fresh mirror clone, outside the repo, `git filter-repo` drops every private footprint path from all history, strips the private bullets from every version of `docs/index.md`, and rewords any surviving commit message that names a private project. Verify that `git log --all` messages and a grep of every blob find no private name or title (against the off-repo list). Force-push only on the operator's literal word at that moment. Then reset the server checkout to the new origin before any write or deploy (back up the untracked private files first), and re-sync this clone and the operator's local plugin-marketplace clone. Check the Production Deploy artifacts and logs for private paths, deleting any match on the operator's word. Draft the GitHub Support request for cached commits; the operator sends it.
- **Set:** no product files. The mirror clone lives outside the repo, and this slice writes only its own `result.md`. Commit SHAs cited in `works/` records go stale; this is accepted.
- **Risk:** high. Trigger: irreversible deletion (it rewrites public history).
- **spends money:** no (installing `git-filter-repo` is a free download, made on the operator's OK).
- **Depends on:** P34-n0.S4.

## P34-n0.REVIEW

- **Goal:** the gated phase review, held to the phase's boundary (`phase-scope P34-n0`). The walkthrough shows the operator what is on GitHub and what the server does on write.
- **Risk:** high (review kind).
- **spends money:** no
- **Depends on:** all of the above (a barrier).
