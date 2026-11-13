# P34-n0.REVIEW — phase review (acceptance gate: required)

## Scope

`python3 scripts/workflow.py phase-scope P34-n0` is the boundary: range `e160957..HEAD`, 22 product files (`server/publish_gate.py`, `server/reconcile.py`, `server/write_lock.py`, `server/main.py`, `server/gitops.py`, `server/documents.py`, `server/documents_api.py`, `server/app_api.py`, their `plugin/templates/kb/` copies, `plugin/templates/manifest.json`, `tests/test_private_publish.py`, `tests/test_reconcile.py`, `tests/test_migrate_books.py`). It prints no `## Regression Checklist` line inside the boundary. Re-run none of the list. Anything noticed outside the boundary is a deferred-job candidate, never a finding.

The phase also changed state outside the code, all recorded in the slices' `result.md`:
- the box's checkout and registry (S3, S4);
- GitHub's history (S5, force-pushed to `a852b40`);
- this clone and the marketplace clone.

The review checks that state read-only.

## Objective and intent

Read `intent.md` and the `## Decisions` lines. The operator's words through the phase were:
- "just keep everything private";
- "you do the runbook";
- "all private. cleanup the github repo as well. accept";
- "as your recommendation" (OQ4);
- the force-push from `purge/after` (OQ5).

The confirmed intent has three parts:
1. Stop the server from committing or pushing private projects' documents.
2. Deal with what was already exposed.
3. Keep private titles out of the published home index.

## Validate all slices together

- **Tests:** `.venv/bin/python -m pytest -q tests`, run twice:
  - without Postgres;
  - with a throwaway `postgres:17` container on a free port, `KB_TEST_DATABASE_URL` set. Stop and remove it afterwards, and touch no other container.

  Expected baseline: 239 passed with Postgres; 170 passed and 69 skipped without.
- `python3 scripts/plugin_parity.py` (PASS) and `python3 scripts/workflow.py validate`.
- **The headline claims, each from its evidence, never from a slice's say-so alone:**
  - **The gate** (S1): read `server/publish_gate.py` and every commit site in `server/main.py` / `server/documents_api.py`. Check that legacy mode is unchanged, that a lookup failure fails closed, and that the `gitops` guard refuses marked footprints. S3's live probe record is the deployed evidence.
  - **The reconcile** (S2): read `server/reconcile.py` and the toggle. Check that an unreadable registry means no change, and that unpublish messages name no project.
  - **GitHub, read-only:**
    - `git ls-remote https://github.com/leetusik/knowledge.git` shows only `main`, at `a852b40` or a fast-forward descendant.
    - The tip tree, through `gh api …/git/trees/main?recursive=1`, holds no path under any footprint of the 12 names in `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/92187eb6-2875-4f67-86c4-d9f905426343/scratchpad/all12.txt`. Read that file; never copy a name into the repo.
    - The tip `docs/index.md` has no bullet or card linking into one.
    - The commit count is 427 or more.
  - **This clone:** `main` descends from `a852b40` and tracks no private footprint.

## Gate stages (required gate)

- **Open the running product itself**, in the `## Operator Runtime` manifest (`docs/current/operations.md`). The operator accepts on production, `https://knowledge.hi2vi.com`.
  - **Anonymous:** fetch the public landing and the owner's public org page without a cookie (`curl`, or the manifest's anonymous recipe). Confirm no private project name, document title or card appears, and that a private document's URL answers 404.
  - **Signed in:** the manifest's instrument is Aside, `repl`, agent account `u1`. Never use `u0`, the operator's profile. Confirm that the app still lists the operator's projects as private and still opens one document. If Aside is unavailable, use the manifest's fallback. Name the instrument used in `result.md`.
  - Do not write, toggle or delete anything on the product.
- **Route every `## Operator Questions` entry.** OQ1, OQ3, OQ4 and OQ5 are resolved. OQ2 (a public document linking to a private one) is moot now that every project is private: route it into the walkthrough or a deferred job, as you judge.
- **Deferred-job candidates** for the main thread to file (title, why, trigger):
  1. The HTML-card matcher gap (`## Notes for later slices`).
  2. The site build's invariants with no public project: `scripts/site_smoke.py` fails on every push (`## Notes for later slices`). Also judge whether the red CI is a finding: it is inside the boundary only if a phase file feeds it.
  3. **The backup gap.** With every project private, none of the owner's documents reaches git any more, so the box disk is their only copy. Check whether the existing deferred per-tenant backup job (see `.gitignore`'s note and `works/deferred/`) covers tenant #1 now. If it does not, propose the job, and put the gap in the walkthrough: it is operator-visible risk.
- **The walkthrough** (returned on a pass, by the stop rules: about 5 decisions at most, a report of about 2k chars):
  - what the operator can open and check: GitHub's `docs/` tree and history, the public site anonymous, the app signed in;
  - what is still theirs to do:
    - delete the 280 Actions runs (`…/scratchpad/purge/delete-required.sh`) and optionally the 114;
    - send the GitHub Support request (S5 `result.md` f);
    - delete the backup tarballs in `/home/opc` and `~/kb-private-docs-backup-20261028.tgz` when no longer wanted;
    - delete the scratchpad `purge/` directory;
  - that KB writes may resume. Every project is private, so a write never commits, and the box is on the new history.

## Pass-only steps

Check that `## Doc impact` is complete against the phase's changes, and append any missing line. Return `doc_versions: none — deferred to a docs phase`. The phase is on the default stream, so the gate sections (`## Regression Checklist`, `## Operator Runtime`) may be versioned only if this phase changed them. It did not, unless you find otherwise.

A non-passing verdict stops before the pass-only steps, with numbered findings and proposed fix slices.

## Return

`review_verdict`, the `explain:` pointer line, and on a pass the `walkthrough` and the deferred-job list. `result.md` gets the verdict block first. Rewrite `## Now` through `phase-section`.

## Binding

Read-only toward GitHub, the box (no ssh) and the product (no writes). Never run `accept-gate`, `review-phase` or any status command. No private project name, title, tenant id or secret in anything written into the repo: counts only.

## Dispatch

route=high
reason=kind review
subagent_type=slice-executor
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=xhigh
