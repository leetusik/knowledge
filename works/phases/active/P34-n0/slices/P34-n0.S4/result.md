# P34-n0.S4 result: step 4, verify (read-only)

- **status:** blocked
- **route:** high
- **model:** opus
- **effort:** xhigh
- **summary:** I verified GitHub `main` at `ba2e878` read-only. The tip has 0 private footprint paths (all 12 listed projects, plus the S3 probe). All 43 private index bullets are gone. The commit message names no project. Every count matches dry run 2 and the push run. One check fails: the tip `docs/index.md` still holds 3 hand-written Browse-grid cards that link to 3 private projects and name them. They are HTML `href` links, not bullets, and the reconcile's markdown-link matcher cannot see them. Removing them needs another public commit and push on the operator's word.
- **files_changed:** `works/phases/active/P34-n0/slices/P34-n0.S4/result.md`; `works/phases/active/P34-n0/phase.md`, changed only through `phase-section` (Notes for later slices +1, Operator Questions +1 (OQ4), Now replaced)
- **validation:**
  - `gh api repos/leetusik/knowledge/git/ref/heads/main`: `ba2e878…`, matching the expected tip. PASS
  - `gh api repos/leetusik/knowledge/commits/ba2e878…`: parent `25fe9f9`; 66 files (65 removed, 1 modified `docs/index.md` at −43/+0). PASS
  - `gh api …/git/trees/main?recursive=1` (4,485 entries, not truncated; identical to the tree fetched by its sha): 0 footprint paths for the 12 listed names, case-sensitive and case-insensitive; 0 for the probe. PASS
  - `gh api …/contents/docs/index.md?ref=ba2e878…` (blob sha matches the tree): 0 bullets linking into a listed project. PASS on plan.md's wording ("no bullet"). It still has **3 non-bullet links** into listed projects. FAIL on the dispatch's wording ("no link")
  - Tip commit message: 0 whole-word and 0 substring matches of any listed name. PASS
  - Counts against dry run 2 and the push run: they agree. PASS (the box-disk figure cannot be checked from GitHub; see below)
- **deviations:** None in method. plan.md step 4 says the index must hold "no bullet" into a private project, and the dispatch says "no link". I ran both and report both. I left the S4-tagged notes in `## Notes for later slices` in place, because S4 is not finished.
- **doc_impact:** none
- **blocker:** The tip `docs/index.md` Browse grid still holds 3 cards of the form `<a class="kb-card" href="<p>/">`. Each one links into a private project, names it in its card title and describes it in one line. The site shows them publicly, and their targets now 404. The cause is that `server/documents.py` `remove_project_bullets` only matches `](<p>/` and `](./<p>/`, and the reconcile and the publish guard both use that test. Input needed (OQ4): either remove the 3 cards now, with one more unpublish commit on the box (a message naming nothing, the operator running the push), or fold them into S5's history rewrite. Every other S4 check passes.

## Verification

All checks ran read-only through `gh api` against `leetusik/knowledge`. The name list was read from the off-repo scratchpad file and matched in memory. No name appears here.

**Tip and commit**

- `refs/heads/main` = `ba2e8781a7066db6900aff522c70fb727ea58740`, the expected tip. Its single parent is `25fe9f9`, the box head the dry runs ran at.
- Message: `docs: unpublish private projects (11)`, byte-equal to the message the dry run and the push run printed. It is one line, has 0 project-name matches and is unsigned.
- Files: 66 in total. 65 are `removed` and 1 is `modified` (`docs/index.md`, 0 additions, 43 deletions). The commit deletes 49,357 lines in all.

**Removed files, by footprint**

| footprint | files removed |
|---|---|
| `docs/<p>/` | 54 |
| `docs/.versions/<p>/` | 7 |
| `docs/.books/<p>/` | 4 |
| outside any listed footprint | 0 |
| **total** | **65** |

- The 65 removals span 11 distinct listed projects and 19 top-level footprint dirs.
- The laptop clone still tracks exactly 19 dirs and 65 files under those footprints (`git ls-files`, read-only). That agrees with the main thread's laptop backup figure.

**Tip tree** (4,485 entries, against 4,576 at the parent)

- 0 paths under `docs/<p>/`, `docs/.versions/<p>/` or `docs/.books/<p>/` for any of the 12 listed names. The case-insensitive check also finds 0.
- 0 paths for the S3 probe project.
- The parent had 89 entries under those footprints: 65 blobs and 24 dirs.
- 91 entries are gone in total: those 89, plus the two container dirs `docs/.versions` and `docs/.books`. Both held only private footprints.
- No path was added, and the only blob that changed is `docs/index.md`.
- No KB project dir of any kind remains under `docs/`. What is left is the site shell (home, tags, graph, assets, scripts, styles) and the workspace's own `current/`, `versions/`, `reference/`, `README.md` and `index.json`.

**Tip `docs/index.md`** (2,634 bytes, 51 lines, against 94 at the parent)

- All 43 removed lines were bullets linking into a listed project. 0 such bullets remain, and the Recent list is now empty.
- 5 links remain, none of them bullets:
  - 3 Browse-grid cards point into 3 listed projects. Each also names the project in its card title and has a one-line description. These **fail** the dispatch's "no link" check.
  - 2 point to the site's tags and graph pages.
- The 3 cards were already at the parent; this commit did not touch them.
- Cause: the cards are HTML `href` links, while the matcher (`server/documents.py:726`, `remove_project_bullets`) only recognizes markdown links.

**Counts against the main thread's report**

| figure | dry run 2 | push run | GitHub `ba2e878` |
|---|---|---|---|
| projects unpublished | 11 | 11 | 11 distinct projects in the removals |
| tracked files untracked | 65 | 65 | 65 `removed` |
| index lines removed | 43 | 43 | −43 on `docs/index.md` (all bullets with private links) |
| commit message | `docs: unpublish private projects (11)` | same | same |
| projects marked private, nothing tracked | 2 | 2 | 1 listed name and the probe have 0 paths at the parent |
| files still on the box's disk | n/a | 67 (the main thread's box check) | **not checkable from GitHub** (read-only binding, no ssh) |

The box-disk figure is consistent: 67 is the 65 untracked files plus the stray project's files, which were never tracked.

**Laptop clone, for the pull after S4**

- Local `main` is 3 commits ahead of `25fe9f9`, and `ba2e878` has not been fetched.
- The branches have diverged by 1 commit on each side.
- The pull will delete the 65 private files from this clone's `docs/`. The main thread's backup sits outside the repo.

## Leftovers for S5

These are tip paths outside the footprints that contain a listed name as a whole word, checked in the five files the dispatch named. Counts only.

| path | whole-word hits | in a KB document title or link | what the hits are |
|---|---|---|---|
| `docs/index.md` | 10 | **6** (3 card links, 3 card titles) | the 6, plus 3 one-line card descriptions of those projects; 4 more are common-word false positives (an ordinary word used in its ordinary sense) |
| `docs/tags.md` | 0 | 0 | none |
| `docs/graph.md` | 2 | 0 | common-word false positives |
| `docs/README.md` | 0 | 0 | none |
| `docs/index.json` | 46 | 0 | It is the workspace's doc-version index, not the KB's. 33 hits are common-word false positives in version summaries. 13 are one listed name inside workspace deployment references: 3 version ids, 3 version file paths, 3 `previous` pointers and 4 summaries. None of the 13 links into a project footprint. |

- **For S5's rewrite:** historical `docs/index.md` blobs may carry the same Browse cards (link, title, description), not only bullets. Removing only bullets will not clear them.
- **Purge by exact footprint prefix, never by a name match:** 19 tip paths outside the footprints contain a listed name as a whole word. 16 are product code, config, asset and script paths, and 3 are workspace doc-version file names (the same 3 that `index.json` points to). A name-based path filter would destroy product files.
- **Not checked:** the rest of the tip tree's file contents. That includes `docs/current/*.md`, `docs/versions/**` and `docs/reference/**` (935 entries), beyond their path names. The OQ2 residual (a document naming another in its own text) is S5's blob grep.

## Notebook

- `## Notes for later slices`: one entry, `(from P34-n0.S4, for P34-n0.S5)`, with the leftover findings.
- `## Operator Questions`: OQ4, about the 3 Browse cards: remove them now or in S5.
- `## Now`: replaced.
