# P39-hk.F5 — the explain front door names v94, the bootstrap release that carries S5's package

## Context

Review round 2 (`slices/P39-hk.REVIEW/result.md` § *Round 2 › Findings*, R2-F1) found one problem class: **the plugin and S5's package name a bootstrap release that went to other work.**

- S5 pinned v92 "when nothing else lands first", and S11 shipped plugin 0.10.0 with that number.
- The bootstrap then released v92 (the PR rule) and v93 (the close), neither with the package. So a v93 workspace passed "92 or later", failed the `**phases**` test, and was told it needed v92.
- `handoff-explain.md` § 4 already allows for this: "if it stamps another, that number is the one the plugin's test below names".

The operator answered OQ24 "all as your recommendations." (`intent.md` § *Added at review*, last item), choosing **(a): the bootstrap first, then re-pin.** On 2026-11-09 the operator said "done": the release is out.

Read-only facts from the bootstrap repo (`/Users/sugang/projects/personal/bootstrap_agentic_workspace.sh`):
- **v94 is released and pushed.** `origin/main` and local `main` are both at `1f02da5`, "build(release): workspace v94 — An explain is written from the code and the phases' records…". `installer/main.py` has `WORKSPACE_VERSION = 94`.
- **The package commit is `d6856a8`**, "feat(skills): write explains from the code and the phases' records, and offer a research phase first". It sits directly on v93 (`f72fb9f`).
- `CHANGELOG.md` `## v94 — 2026-11-06` describes S5's package: the sixteen-line `## Explain` with `phases:`, the research route, the rewritten references, the critic on the other model family, and the plugin floor 0.10.0.

## The fix (binding)

1. **Every product site that names the release the explain needs now names v94.** The front door's step 2 tests `workspace_version` **94 or later** **and** a `## The explain route` in create-phase that lists the `**phases**` field. Both conditions stay; only the number changes. Its refusal texts, and every "v92 or later" in the plugin's copy, name v94.
   - The sites (the review counted 21 in 9 files):
     - the three explain SKILL copies: canonical `plugin/skills/explain/SKILL.md`, portable `.agents/skills/explain/SKILL.md`, and the byte copy `web/public/SKILL.md`;
     - `plugin/README.md`, `plugin/skills/setup/SKILL.md`, `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `README.md`;
     - the KB template page `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`.
   - Read each site and change only a mention of the release the explain needs. A "92" that means something else stays. `web/pnpm-lock.yaml` matches only inside a hash: never touch it.
   - List every changed site, file:line, in `result.md`, and say why your count differs from 21 if it does.
2. **The package's own record** (`works/phases/active/P39-hk/package/README.md`, `package/PATCHES.md`, `works/phases/active/P39-hk/handoff-explain.md`):
   - Where they state the release the plugin tests for, say v94.
   - Add one line near the top of each saying where the package landed: the bootstrap's `d6856a8` on v93 (`f72fb9f`), released as v94 (`1f02da5`, 2026-11-06).
   - Keep everything else true to what was handed off. Never rewrite the texts the bootstrap applied.
3. **`package/checks/apply.py`:** the pinned skill count becomes the count of the tree the package applied to: v93's, 20.

## Prove it landed as handed off (read-only on the bootstrap repo)

- **Read-only means read-only.** Never check out, fetch, write to, or commit in the bootstrap repo. Read it with `git -C <bootstrap> log`, `show` and `archive` into the session scratchpad only.
- **At v93 (`f72fb9f`):** export the tree into a scratch directory.
  - `finds.py` must find 18 of 18, each exactly once.
  - `apply.py`, with the count at 20, must pass on a scratch copy.
- **Applied against landed:** for every file the package touches, diff the tree `apply.py` produced against the tree at `d6856a8`, exported the same way. They should be identical. List each difference and explain it (for example, an edit of the bootstrap session's own).
  - If a difference breaks the handshake, return `needs_operator` naming it; it is not F5's to fix. The handshake means the sixteen-line `## Explain` set with `phases:`, `**phases**` in create-phase's explain route, and the plugin floor 0.10.0.
- **At v94 (`1f02da5`):** check the front door's two conditions by reading the shipped files:
  - the version is 94;
  - the explain route lists `**phases**`.
  - Run `cites.py` with the plugin's canonical SKILL against v94's shipped explain files: missing=0.
- **Optional, only if it stays inside the scratchpad and needs no network.** Install v94 and v93 from exported trees into scratch directories with the bootstrap's own installer. Then walk the front door's step 2 by hand on each:
  - v94 passes;
  - v93 is refused, with the v94 text.

  If the installer needs anything beyond the scratchpad, skip this and say so. It is the review's deferred job 5, "re-run the front-door lines on the release F5 pins", and passing it would retire that job.

## Validation

- `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py`: PASS.
- `wc -l plugin/skills/explain/SKILL.md` equals `web/src/content/marketing/content.ts`'s count ("2,492"). Change `content.ts` only if the count moved; a one-digit edit should not move it.
- `uv run pytest tests/test_explain_resolver.py -q` passes, and `uv run pytest -q` stays at 183 passed, 60 skipped.
- `pnpm --dir web typecheck`, `lint` and `exec vitest run` (41 files, 589 tests) pass, if any file under `web/` changed (only `web/public/SKILL.md` should).
- Grep the product tree (excluding `works/`, `docs/versions/`, `node_modules`, `.next`): no "v92" or "92 or later" left that means the explain's release. The v86 grep stays empty.
- `git status --porcelain .claude/` is empty.
- `python3 scripts/workflow.py validate` passes.

## Set

- `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`;
- `plugin/README.md`, `plugin/skills/setup/SKILL.md`, `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `README.md`;
- `plugin/templates/kb/docs/getting-started/{{KB_DATE}}-how-your-knowledge-base-works.md`;
- `works/phases/active/P39-hk/package/README.md`, `package/PATCHES.md`, `package/checks/apply.py`, `works/phases/active/P39-hk/handoff-explain.md`;
- `web/src/content/marketing/content.ts`, only if the line count moved;
- this slice's `result.md`;
- `phase.md` through `phase-section`.

Any other file means `needs_operator`, naming it.
- Never touch anything under `.claude/`, including the vendored workspace skills. They update by `/update-workspace` after the merge (OQ8's order).
- Never write to the bootstrap repo.
- Never commit, push, or move workflow state.
- No browser and no servers are needed. Leave `:3030`, `:8766`, `:8977` (PID 68284) and `:3978` (PID 3131) alone.

## Notebook (write through `phase-section`; `phase.md` is about 38.8 of 40 KB)

- **Free room first, if needed:** move older Decisions entries to `topics/decisions.md` with `--to-topic decisions --entry K`, and fix their relative links by hand.
- **Decisions:** one short entry: the front door names v94 (OQ24 (a)), the package landed at `d6856a8` (v94), and apply.py now pins v93's 20 skills.
- **Doc impact:** one line: "(P39-hk.F5) supersedes S5's and S11's v92: the explain front door needs workspace v94 or later plus `**phases**`".
- **Notes for later slices:** for REVIEW round 3, whether the optional v93/v94 front-door walk ran, which decides whether deferred job 5 retires.
- **Now:** F5's landing, then "Next: REVIEW round 3".

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
