# P32.S9 — Rehearsal 2: a tiny book through the package, research to one chapter, nothing published

## Goal

Run a small book (2–3 chapters) through the bootstrap package exactly as S8 wrote it, in a scratch folder laid
out as an explain phase, and fix the package (and the skill's §9 in three copies) where the run shows a problem.
This is the only live test of the book path before the operator applies the package: whole-book research before
the outline, the research summary at the outline gate, the freeze, one chapter's top-up, F1's reader-first
writing, and the plugin's critic on a chapter. Quality over efficiency; nothing is published anywhere real.

## Read first

- `phase.md` `## Notes for later slices`: **Rules for every slice** (the bootstrap is read-only: never run its
  installer, build or engine against anything), **(from P32.S7, for P32.S9)** (the `claude -p` mechanics and
  F1's additions), **(from P32.S8, for P32.S9)** (how to use the package) and **(from P32.DECOMP2, for P32.S9)**
  (the spec). `## Decisions` d57–d63.
- `package/README.md` first (the order, permissions, the search cap, *What the rehearsal checks*), then
  `PATCHES.md` and the three texts under `package/claude/`.
- `plugin/skills/explain/SKILL.md` §9 (9.1–9.3), §3.9, §3.10, §4.10, by section.
- Method: `slices/P32.S7/result.md` and `slices/P32.F1/result.md` (what ran and how), and the harnesses in
  `rehearsal/r1/harness/` and `rehearsal/r1b/harness/` (reuse; copy what you change into `rehearsal/r2/harness/`).
- P31.S5's `result.md` (`works/phases/active/P31/slices/P31.S5/result.md`) for the scratch-explain-phase
  method.

## Decided for this run (the orchestrator's calls)

1. **No bootstrap install.** The Rules note stands: S9 runs on the package's texts in a scratch folder laid out
   as an explain phase (`intent.md` with `## Explain`, `book/`, a scratch git repo for the commits). PATCHES 6–7
   (the build, the release fragment, smoke, `RETIRED_FILES`) are not run here; say in `result.md` that the
   bootstrap's own build and smoke check them when the operator applies the package.
2. **Nest the chapter lead once, to test depth 2.** The package's whole design (OQ2's carve-out) rests on an
   executor, which is a subagent, dispatching the research agents. A `claude -p` main thread puts them at
   depth 1 and proves nothing about that. So:
   - run the whole-book research lead (the `DECOMP` role) as a `claude -p` main thread;
   - run the chapter lead **as a subagent** that the `claude -p` main thread dispatches, playing the
     orchestrator with the package's dispatch rules. That subagent dispatches the research agents and the
     critic, as the chapter executor would.

   This settles README items 1–2: do depth-2 agents run on the session's permissions, and does a denial
   surface as `FAILED: permissions`? Do background completions reach a lead that is itself a subagent? If the
   host forbids nesting, record exactly what happened and fall back to a main-thread chapter lead. Items 3–4
   (`dispatch-summary` attribution, the orchestrator's background critic) are read from the transcripts as far
   as they go; the rest stays for the first real book, as the README says.
3. **The subject:** small and general, so the web research, the summary and the top-up are all exercised
   (for example SQLite's write-ahead log: how it works, then running it). Two chapters are enough. Write the
   `## Explain` fields by hand as the route would: `must-cover`, `leave-out`, trusted sources, a reader whose
   tasks are stated, and `lang: en`.
4. **The cap is $100** for this slice's `claude -p` runs, as a stop for loop safety, not a budget. The operator
   said "I don't care about the token spending for now" (d61), and S7 showed that $45 covers about one `full`
   document. Keep a running total in `rehearsal/r2/spend.md`, and plan the runs before you start. At the cap,
   return `needs_operator`.
5. **One small skill fix, if the cap allows a check:** §3.9 should say that D6 (the reader's path) still runs in
   `quick`. F1's confirm run skipped it and put `## Reader's task` into the chapter. Fix it in all three copies;
   confirm it with one cheap `quick` run only if the book is done and the spend allows.

## Isolation (unchanged from S7 and F1)

On every `claude -p` run:

- scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT` and `KB_API_BASE_URL`, checked with §2's resolver
  first;
- `--setting-sources project`;
- deny rules on `//Users/sugang/.config/knowledge-kb/**`;
- `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` set only on the run's own command line;
- no `--max-budget-usd` the lead can see (use `watchdog2.py`);
- the critic dispatched in the foreground wherever a `-p` main thread would otherwise end its turn.

After each run, run
`python3 -I /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/leakcheck/scan.py <your run dirs> ~/.claude/projects`.
Six files are known hits, all predating P32:

- the changple5 log `4bca8b0c…`;
- `1eb18f1b…/subagents/agent-a5c22e0e39716ea81.jsonl`;
- the bootstrap log `1f05045c…`;
- the two glide-ilab logs `ac92989b…` and `e1d150e2…`;
- the glide log `0118b617…`.

Any other hit stops the slice: redact it if it is yours, report it, and return `needs_operator`. Publish only to
your own scratch stack: never `:8766`, `:3030`, `:8777`, `:8797` or production. Stop only your own PIDs.

## The run

1. Lay out the scratch explain phase. Its texts are the package's files, with `<P>` set to the scratch phase's
   id.
2. **DECOMP role** (main thread, Opus): §9.2's whole-book research into `book/research/`, then `summary.md`,
   then the outline with each chapter's reader tasks and its expected top-up. Stop at the outline gate, which
   you sign as the operator would, writing it down. Then the freeze.
3. **One chapter**, with the chapter lead nested as in decision 2: §9.3's top-up writes the overlays, then
   `outline-ch<k>.md` with `## Reader's task` and the budgets, then the draft and `trace-<key>.md`. The critic
   is `knowledge:explain-critic`, `kind: chapter`, on the other family. One revision follows, then
   `knowledge check` exits 0 on a scratch stack. Nothing is published.
4. **The checks:**
   - Nested prompts open `slice: <id>`, read from the transcripts.
   - `book/research/pages/` holds only its `.gitignore` in git.
   - The freeze holds: the chapter commits touch only files named for their chapter.
   - The chapter lead's tier and model.
   - The search count against the cap, and the real cost of the research and of the chapter.
   - Decision 2's depth-2 findings.
5. **Fix** what the run shows, in `package/`, and in §9 in all three copies plus `--write-agents` if Part B
   changes. A redesign-sized problem goes to `## Now`.

## Verification

- The bootstrap's `git status --short` is identical before and after, and nothing is written there.
- The scratch PIDs are gone and nothing was published.
- The leak scans are clean against the six known hits.
- If the skill changed: `skills_parity.py`, `plugin_parity.py` and `claude plugin validate plugin` pass.
- If the package changed: the S8 anchor method re-run at the bootstrap's current `main`. Re-run it first if
  `main` is past `1f4aa7d`.
- `git diff --stat` stays in scope (`plugin/`, `.agents/skills/explain/`, `web/public/SKILL.md` and this phase's
  folder), and `validate` passes.

## Keep

`rehearsal/r2/`, without `pages/`:

- the scratch phase's `intent.md`;
- `book/research/` (`summary.md`, `library.md`, `ledger.md`, the findings and verify files);
- `book/outline.md`;
- the chapter's overlays, `outline-ch<k>.md`, draft, `trace-<key>.md` and critique;
- `spend.md` and the harness.

## Notebook and result

- `phase.md`, one section at a time:
  - remove the S9 notes;
  - add `(from P32.S9, for P32.S10)`: what the handoff must say from this run, its cost for a book, and what
    stays for the first real book;
  - update the REVIEW note;
  - `## Decisions` (long material goes to `topics/build-decisions.md`);
  - `## Doc impact`;
  - `## Now`.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`). Then the book's shape, the checks one by one,
  decision 2's depth-2 findings, the spend, and the fixes.
- No commit, no push, no state command.

## Dispatch

slice=P32.S9
phase=P32
kind=qa
risk=high
attempt=1
route=high
reason=risk high (not low)
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
