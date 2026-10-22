# P32.S5 — Part A: the research stage

## Goal

Replace the explain skill's one-step research (§3 today: a judgment gate, a skipped-offline fallback) with
P32's research stage: a lead that plans, checks its permissions, dispatches researchers in waves, merges their
findings into a source library and claim ledger, has them verified, runs gap rounds, and passes an evidence
gate before any writing starts. It runs on three paths (plugin agents, generic subagents, sequential), keeps
its state on disk so it can resume, and fails loudly. Also: **English by default**. Quality over efficiency;
loop safety is the only bound.

## Read first

- `phase.md` `## Notes for later slices`: **Rules for every slice**, the **P32.S5** entry (this slice's spec),
  and **(from P32.S4, for P32.S5, P32.S6)** (how Part A must consume Part B).
- `phase.md` `## Decisions`: the S1, S2, S3, S4 and operator lines, including **OQ5: write Part A by citing
  Part B's sections (B0–B12), never restating them**.
- The topic sections the S5 entry lists, and only those unless one points further (S1 §3.2, §3.4–3.5, §3.8,
  §3.9, §3.11, §3.12; S2 §3.1, §3.6, §3.9, §3.11, §3.13, §4.1 rows D0–D5g; S3 §4.2–4.4).
- `plugin/skills/explain/SKILL.md` by section (`grep -n '^#'`): the frontmatter, §1, §2, §3 and Part B's B0
  and B6–B12 in full; the rest only as needed.

## What to build (S5's parts of SKILL.md, per the ownership note)

1. **`allowed-tools`** adds what the stage runs, as narrowly as S3 §4.3 says (the converter, `pdftotext`,
   read-only `git`, `shasum`, `mktemp -d`, the curl forms), knowing the grant does not survive a background
   wave: the preflight, not `allowed-tools`, is what makes a run safe.
2. **The core card**, inside Part A's first 5,000 tokens (≈ 20 KB of the file): the stages, `run.md`, "after a
   compaction re-read `SKILL.md`, then `run.md`", the modes, the stop rules.
3. **§1:** the flags `quick`, `no-research` (operator-only; the agent never chooses it; the run is labelled),
   `resume [<run-id>]`, `research` (a no-op, kept for old habits); **English by default** replacing "the
   language the user is writing in"; another language only when the operator names one.
4. **§2:** only the state dir (`${XDG_STATE_HOME:-~/.local/state}/knowledge-kb/explain/<run-id>/`); drafts
   move there from `/tmp`.
5. **§3 replaced** by the stage, each step citing Part B for formats and briefs:
   - D0 brief; **D0b preflight**: pick the path (plugin / generic / sequential), the two-agent probe that
     reproduces "after a notification", the state-dir write probe and its fallback, the converter written to
     `tools/pagetext.py` as B0 says, and `FAILED: permissions` printing the exact allow rules (covering B6/B11's
     commands) with nothing else written;
   - D1 plan (questions, angles, team size by complexity);
   - D2 waves (one message, ≤ 10 per wave on Claude Code, 6 elsewhere, overflow queued; the plugin path sends
     only the filled "Your dispatch" block; the generic path writes `briefs/<name>.md`);
   - D3 merge (`library.md`, `ledger.md`, `outline.md` in B9's formats, B8's states, counts never fall, S2 §5
     item 11's checks as the merge checklist), D3v/D3s verification after each merge;
   - D4 gap rounds (cap 3, the stop reasons, declared gaps in `gaps/final.md`);
   - D5 final verification, D5s counter-evidence and disagreements, D5g the evidence gate (the must-cover
     rule and the two-thirds line; below the bar a single document stops before writing);
   - the search-limit rule: `failed: search-limit` is a loud, resumable stop, never "not found".
6. **`run.md`** with S3 §4.2's mode block (path, models actually run, degraded modes such as `verifier: same
   model (degraded)`), and resume from it.
7. **The `quick` path** (S2 §3.13: one verifier batch on load-bearing claims, no counter-evidence, no critic)
   and the **`no-research` path** (labelled, repo-only, no "Best practices & next steps").
8. All three copies updated; `python3 scripts/skills_parity.py --write-agents` if Part B changes; both guards.
9. **`## Doc impact`** lines for what this changes (the single document now researches by default, stops
   loudly, English by default, the state-dir dossier).

Between S5 and S6 the skill need not run end to end (S6 owns writing, the critic, §8 and the book).

## Verification

- `skills_parity.py` and `plugin_parity.py` pass.
- Part A's first 5,000 tokens (bytes ÷ 4) hold the core card.
- Under `claude -p --plugin-dir plugin` with scratch `XDG_*`/`KB_*` env (checked with §2's resolver first):
  - without allow rules, the preflight stops with `FAILED: permissions`, prints the rules, and writes nothing
    else;
  - with those rules, one tier-1 run on a tiny general subject, told to stop after D5g, leaves a well-formed
    dossier (`run.md`, findings, `library.md`, `ledger.md`, verify files, `gaps/final.md`) that you inspect
    against B9's formats.
- Spend cap for this slice's `claude -p` runs: **$10**, summed from each run's `total_cost_usd`; at the cap,
  return `needs_operator`. Set `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` only on the run's own command line.
- `git diff --stat` stays in the edit scope; `validate` passes.

## Notebook and result

- `phase.md`, one section at a time (`phase-section`; it is near its 40 KB budget, so compress as you go and
  move long material to `topics/`): remove the P32.S5 entry and the parts of S4's note S5 used; add a
  `(from P32.S5, for P32.S6)` note (the section numbers, the dossier paths and run states S6 writes from);
  `## Decisions` for choices you settled; `## Doc impact`; `## Now`.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`), then the `claude -p` spend and the dossier's
  shape from the test run.
- No commit, no state command.

## Dispatch

slice=P32.S5
phase=P32
kind=implementation
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
