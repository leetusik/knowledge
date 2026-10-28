# P34-n0.S5 — Purge private projects from the public history

## Goal

The operator said "all private. cleanup the github repo as well. accept" and, on OQ4, "as your recommendation". GitHub's `leetusik/knowledge` history must carry none of tenant #1's 12 projects' documents, titles, index bullets or cards, nor the commit messages naming them. The tip keeps its current tree, minus the 3 index cards. Every tenant #1 project is private now, so this covers all of them.

Read first: `## Now`, `## Decisions` (Footprint, Everything private, All private / GitHub cleaned), the S5-tagged notes, and S4's `result.md` (`#leftovers-for-s5`).

## Inputs (session scratchpad, never copied into the repo)

- `…/scratchpad/all12.txt`: tenant #1's 12 project names, one per line. All are private.
- `git-filter-repo` 2.47.0 is installed (`git filter-repo`).
- Facts: the remote has one branch (`main`) and no tags, PRs, releases or forks. Actions holds 397 runs and 6 artifacts. Origin's tip is `ba2e8781a7066db6900aff522c70fb727ea58740`.

Scratchpad root: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/92187eb6-2875-4f67-86c4-d9f905426343/scratchpad`. Work in `<scratchpad>/purge/`.

## This dispatch (first pass): build and verify the rewrite locally, then stop

1. **Fresh clone:** `git clone --mirror https://github.com/leetusik/knowledge.git <scratchpad>/purge/before.git`, kept untouched as the reference. Then work in a second fresh clone of it (`purge/after`). Never touch this checkout's `.git`.
2. **Title list:** from `before.git`, read every blob ever stored under a private footprint. Collect each document's title (front matter `title:`, the first `# ` heading, and the slug part of its file name) into `<scratchpad>/purge/titles.txt`. Never print the list into a repo file.
3. **The rewrite** (`git filter-repo` on `purge/after`):
   - **Paths:** `--invert-paths` with exact prefixes `docs/<p>/`, `docs/.versions/<p>/`, `docs/.books/<p>/` for each of the 12 names and `p34-probe`. Never drop by a name match: 19 tip paths outside the footprints contain a name.
   - **`docs/index.md`, every version:** drop each line linking into a listed project (markdown `](<p>/` and `](./<p>/`), and each whole Browse-grid card whose `href` is `<p>/` or `./<p>/`, with its title and description. Inspect the real card markup in history first. Use `--file-info-callback` limited to that one filename. Leave every other line byte-identical.
   - **Commit messages:** commits left empty are pruned (the default). Reword every surviving message that names a listed project or holds a title or slug, using a `--message-callback` that replaces only the identifying part. For example, `docs(<p>): add <slug>` becomes `docs: update the knowledge base`. Never reword a message that names nothing.
   - **Residual blobs:** any title from `titles.txt` that still appears in a blob outside the footprints (an old `docs/tags.md`, `docs/graph.md`, a `works/` record) is redacted with `--replace-text`, title → `[private]`. Exact strings only, and only titles that are distinctive (several words, or a unique token). Report how many, never which.
4. **Verify** `purge/after` against `before.git` and the lists:
   - Every blob in the rewritten history (`git rev-list --all --objects` → `git cat-file --batch`) contains no title from `titles.txt`.
   - No path under any footprint, in any commit.
   - `git log --all --format=%B` holds no listed name and no title, apart from the allowed contexts below.
   - The tip's tree equals `ba2e878`'s tree except `docs/index.md`, which differs only by the 3 removed cards.
   - Report the commit counts before and after.
   - **Allowed contexts** for the name grep: four listed names are also ordinary words or public identifiers of this product, so they appear legitimately in code, config and workspace records. They are the repo and product name, a common English word, the public production domain, and the workspace tool shipped in this repo; the list in the scratchpad says which. Report those by file count and context class, never as failures, and never spell them out in `result.md`.
   - Any other distinctive name outside the footprints is listed by path and count, with your judgement: a doc reference to purge, or a harmless mention.
5. **Actions:** read-only, enumerate the 397 runs and 6 artifacts. Count the runs whose logs, and the artifacts whose contents, hold a listed distinctive name (not the allowed contexts) or a title, and list their run ids (ids are fine in `result.md`). Do not delete anything.
6. **Write the operator runbook** into `result.md`:
   - **a. The force-push** from `purge/after`: re-add `origin`, then `git push --force origin main` (only `main`). Give the exact command, and say that the harness denies it to the agents.
   - **b. The box reset**, for the main thread over SSH, before any write or deploy:
     - Confirm the box's `HEAD` is `ba2e878` with nothing ahead.
     - Back up the untracked private files.
     - Run `sudo git -c safe.directory=/opt/knowledge fetch origin && sudo git -c safe.directory=/opt/knowledge reset --hard origin/main`.
     - Check that `git status --short --branch` is clean and the private file count on disk is unchanged (67).
   - **c. This clone:** rebase the local unpushed `works/` commits onto the new `main` with `git rebase --onto origin/main 25fe9f9 main`. The private files leave the working tree; the backup exists. Note that SHAs cited in `works/` records go stale, which is accepted.
   - **d. The plugin marketplace clone:** `~/.claude/plugins/marketplaces/knowledge`, shallow. Run `git fetch --depth 1 origin main && git reset --hard origin/main`.
   - **e. Actions cleanup:** the `gh run delete <id>` / `gh api -X DELETE …/artifacts/<id>` lines for the matches from step 5.
   - **f. GitHub Support:** a drafted request for the operator to send, asking GitHub to purge cached views and unreachable commits of the rewritten history. Name the repo, describe the content as "private documents" with no names, and list no old SHAs that point at private content.
7. Return **`needs_operator`**:
   - `operator_need` names the force-push command (a). It also covers e (Actions deletes) and f (sending the Support request).
   - b, c and d run on the main thread after the push.

## The resumed pass (after the push)

The main thread re-dispatches with the outputs appended under `## Operator report`. That pass makes a fresh clone from GitHub and repeats step 4's checks on it, and checks `git ls-remote` (only `main`, at the rewritten tip). It confirms the box and this clone are on the new history, then returns `done` or `blocked`.

## Set

No product files. The rewrite lives in the scratchpad. This slice writes only its `result.md` and the notebook (through `phase-section`).

## Binding

Never push, force-push, ssh, delete Actions runs or artifacts, or touch this checkout's `.git`. No private project name, title, slug, tenant id or secret in `result.md`, the notebook or any message. Counts and run ids only.

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

- **OQ5 → `after`.** The operator force-pushed from `purge/after`: `+ ba2e878...a852b40 main -> main (forced update)`.
- **(b) Box (main thread, SSH):**
  - Before: head `ba2e878`, 0 ahead, clean. Backup tarball of the 21 footprint dirs (67 files) in `/home/opc`.
  - `sudo git fetch origin` failed, because the host's root has no deploy key; the first `reset --hard origin/main` was a no-op at `ba2e878`. So it fetched over HTTPS from the public URL into `refs/remotes/origin/main` (forced update to `a852b40`), then ran `reset --hard origin/main`.
  - After: head `a852b40` (427 commits), `## main...origin/main`, 0 status lines, 67 private files on disk (unchanged).
  - The box's origin URL stays SSH, so the API's `gitops.push` keeps using the deploy key.
