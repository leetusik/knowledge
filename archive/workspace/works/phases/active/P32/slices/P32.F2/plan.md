# P32.F2 — `quick` keeps the research team's shape on any lead

## Goal

Fix P32.REVIEW's finding 1 (and fold in finding 3). In the review's run a, a Sonnet lead running `quick` had
`Task` and all five `knowledge:` agents, yet took `path: sequential` and skipped:

- the probe agents, `plan.md`, the findings files and `library.md`;
- the verifier on another model (`lead (degraded)`);
- `gaps/final.md`, `outline.md` with `## Reader's task`, and `trace.md`.

It also counted 1 search against 4 made. Opus (run b) did all of it, and F1's `confirm2` (Sonnet, `quick`) took
the plugin path, so the failure comes and goes. This breaks two of the phase's headline claims: "verified on
another model", and "`quick` cuts the research, never the map". Plugin 0.6.0 is unreleased, so fix it now.

## Read first

- `phase.md` `## Notes for later slices`: **Rules for every slice**, **(from P32.REVIEW, for P32.F2)** (yours),
  **(from P32.REVIEW, for the re-review)**.
- `slices/P32.REVIEW/result.md`:
  - findings 1 and 3, with finding 3's exact `## Doc impact` text;
  - how the live runs were made, which harness copy and which isolation.
- `rehearsal/review/a/` and `rehearsal/review/b/` side by side (`run.md` first).
- `plugin/skills/explain/SKILL.md` by section:
  - the card: the D-table, **The run** (≈ lines 34–70);
  - §1's flag words (≈ line 104);
  - §3.2 D0b (the path rule, ≈ 353–400);
  - §3.3's mode block (≈ 446–471);
  - §3.9 (≈ 678–690);
  - §8 (the report);
  - §4.10 and §5 only where the completeness check touches them.

## Locate the cause first

Before you edit, find out why run a chose `sequential`.

- **The transcript.** If the review persisted run a's session, read it for the lead's own words at D0b. The
  review's `result.md` or its harness copy says where it went. Under a scratch `XDG_CONFIG_HOME` it is that
  folder's `projects/`; if `persist: false`, there is none.
- **If there is no transcript,** reason from the text a Sonnet lead reads first. That is the card's `quick`
  bullet ("you research alone into the same dossier") and §1's `quick` line ("you research alone").
  Either reads as "no agents". Then check whether §9.1's framing of a book request outside a workspace (a
  fallback document) adds to it.
- **Record** what you found, or that the cause stays a well-supported suspect, in `result.md`.

## What to change (all three copies; `skills_parity.py` after)

**(a) Make `quick` explicit wherever it is defined:** the card bullet, §1's flag line and §3.9.

- **"Alone" means no research team in waves.** It does not mean no agents.
- **The path follows D0b's rule, never the run kind:** `plugin` whenever the `knowledge:` roles are listed.
- **On every path, `quick` keeps:**
  - D0b's two probe agents;
  - D1's `plan.md`;
  - the findings files and `library.md`;
  - the verifier agent on the other model;
  - `gaps/final.md`;
  - D6's `outline.md` with `## Reader's task`;
  - D7's `trace.md`.

  Name them once (in §3.9), and have the card and §1 cite it.

**(b) A dossier-completeness check before D9 (§8, or the end of D8).**

- Each run kind lists the files it must have.
- Each file is present, or the report names it as a skipped stage with its reason.
- A degraded verifier while `knowledge:verifier` was listed is a defect the report states as such ("the
  verifier agent was available and not used"), never a limit of the run.
- Keep it to a short list the lead can check with one `ls`, not a new procedure.

**(c) The `searches:` line counts the lead's own queries** as well as the agents'.

**(d) Append finding 3's `## Doc impact` line** to `phase.md` (the exact text in P32.REVIEW's `result.md`), plus
a line for this slice's change if it changes durable truth (product.md: `quick` keeps the agents and the
map; architecture.md: the completeness check).

**Size:** net growth ≤ 1.5 KB. Reword rather than add where you can. The skill is ≈ 153.9 KB; report the new
size.

Part B changes only if the fix needs it. If it does, run `skills_parity.py --write-agents` and say why.

## Verify live

Use the review's isolation, unchanged:

- its harness copy, and a fresh scratch port of your own;
- scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT`, `KB_API_BASE_URL`, checked with §2's resolver
  first;
- `--setting-sources project`, the deny rules on `//Users/sugang/.config/knowledge-kb/**`, `--plugin-dir
  plugin`;
- `watchdog2.py`, never a visible `--max-budget-usd`;
- never a permission-skipping flag (d69).

The runs:

1. **Run a's prompt, word for word, on a Sonnet lead.**
2. **One more Sonnet-lead `quick` run** on a different small general subject, as a plain single document (no
   `book`).
3. **Optional, if 1–2 pass:** a third Sonnet `quick` run, to give the fix more than one sample.

Each run must show:

- `path: plugin`;
- the verifier on a model other than Sonnet;
- `plan.md`, `findings/`, `library.md`, `gaps/final.md`, `outline.md` with `## Reader's task` (and the
  heading not in the published chapter), and `trace.md`;
- a `searches:` count that matches the transcript;
- a publish to your scratch stack only.

A run that fails is a finding of this slice. Revise once, then rerun that case once. A second miss returns
`needs_operator` with both transcripts' evidence.

**Cap: $20** for the runs, kept in `rehearsal/f2/spend.md`. It is a loop-safety stop (d61). At the cap, return
`needs_operator`.

After each run, run the leak scan:

`python3 -I /private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/leakcheck/scan.py <your run dirs> ~/.claude/projects`

Six files are known hits:

- changple5 `4bca8b0c…`;
- `1eb18f1b…/subagents/agent-a5c22e0e39716ea81.jsonl`;
- bootstrap `1f05045c…`;
- glide-ilab `ac92989b…` and `e1d150e2…`;
- glide `0118b617…`.

Any other hit: redact it if it is yours, then stop and return `needs_operator`.

- Never use `:8766`, `:3030`, `:8777`, `:8797` or production.
- Stop only your own PIDs.

**Keep** `rehearsal/f2/`: `spend.md`, and each run's `run.md`, `outline.md`, `report.md` and file listing. No
`pages/`.

## Verification

- `python3 scripts/skills_parity.py`, `python3 scripts/plugin_parity.py` and `claude plugin validate plugin`
  pass.
- The live runs pass as above.
- `git diff --stat` stays within `plugin/`, `.agents/skills/explain/`, `web/public/SKILL.md` and this phase's
  folder.
- `python3 scripts/workflow.py validate` passes.
- The bootstrap is untouched; this slice needs no command there.

## Notebook and result

- **`phase.md`, one section at a time:**
  - remove the F2 note;
  - update the re-review note (what F2 changed, which runs to look at);
  - `## Decisions` (one line; long material goes to `topics/build-decisions.md`);
  - `## Doc impact` per (d);
  - `## Now`.
- **`result.md`:** the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`). Then:
  - the cause found, or the suspect;
  - the edits and the size;
  - each run's checks, and the spend.
- No commit, no push, no state command.

## Dispatch

slice=P32.F2
phase=P32
kind=fix
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

## Continuation (OQ12 answered: (a), Decisions d71)

The operator: "/do-whole-phase with a". One more bounded revision, then one rerun per case.

- **The revision** (all three copies; `--write-agents` only if Part B changes):
  - **D0b:** a probe's own command form (for example `mkdir -p … && curl`) that the allow rules deny is the
    probe's error, not a permissions stop: the lead sends that probe once more, with the exact form §3.2
    prints. A second denial is `FAILED: permissions` as today.
  - **The dossier check and the search total move into the publish step** that every lead runs (right before
    `knowledge check`), written as one report line (the files present or named as skipped, and `searches:`
    as the run's total). Keep D9's mention as a pointer, not a second procedure.
- **Size:** net growth for the whole slice ≈ 2 KB or less (the skill was 153,933 B before F2).
- **Reruns:** one per case on a Sonnet lead, under the same isolation: run a's prompt word for word, and the
  sourdough prompt. Each must show what the plan's *Verify live* lists, plus the report line with a `searches:`
  count that matches the transcript. Spend stays within the $20 cap ($7.21 spent).
- **A miss after this** is reported as it is: the verdict is `done` with the miss named in `result.md` and
  `## Now` if the headline (path, verifier on another model, `plan.md`, `outline.md` with `## Reader's task`,
  `trace.md`) held; `needs_operator` only if the headline failed.
- Update `result.md` (a `## Continuation` section, the verdict block rewritten first), `phase.md`'s
  re-review note, `## Doc impact` if the lines change, and `## Now`.
