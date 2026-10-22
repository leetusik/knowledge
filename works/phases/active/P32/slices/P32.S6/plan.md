# P32.S6 — Part A: writing from the dossier, the critic, the book section and the suggestion

## Goal

Finish Part A of the explain skill: the writer works only from the dossier, keeping a `trace.md` that maps
every checkable sentence to its claim; `knowledge check`, then the plugin's `explain-critic` on a model of the
other family, one confirm pass and one revision, then publish; the final report (D9). Add the **book section**
the bootstrap package calls (whole-book research before the outline, and each chapter's top-up), the **book
suggestion** (OQ3), and release plumbing: plugin 0.6.0 and its README (OQ4). After this slice the single
document runs end to end. Quality over efficiency; loop safety is the only bound.

## Read first

- `phase.md` `## Notes for later slices`: **Rules for every slice**, the **P32.S6** entry (this slice's spec),
  **(from P32.S4, for P32.S6)** and **(from P32.S5, for P32.S6)** (what S5 left stale and what to check).
- `phase.md` `## Decisions`: the S1–S5 and operator lines, in particular **OQ3** (a literal yes to the book
  proposal is `create-phase`'s confirmation), **OQ4** (README tells the operator to raise the search cap; the
  skill never changes settings) and **OQ5** (cite Part B's sections, never restate them).
- The topic sections the S6 entry lists, and only those unless one points further.
- `plugin/skills/explain/SKILL.md` by section (`grep -n '^#'`): the core card, §3.3, §3.6, §3.8, §4–§8, Part B
  B0, B5, B8, B9; `plugin/.claude-plugin/plugin.json`; `plugin/README.md`.
- The bootstrap read-only, for what the book section must fit: its explain route in
  `payload/claude/skills/create-phase/SKILL.md` and `do-whole-phase/reference/explain-{decomposition,chapter}.md`.

## What to build (S6's parts of SKILL.md, per the ownership note)

1. **D6 final outline** from `outline.md`, `ledger.md` states and `gaps/final.md`; quiz claims only from
   `supported` entries.
2. **D7 writing** from the dossier with `trace.md` and the writer-gap rule: §4.5 ("Best practices & next
   steps") on every run except `no-research`; §4.6's sources from `library.md`. Fix S5's stale lines: §4.2
   item 4 and §8's `included / skipped-by-judgment / skipped-offline` line.
3. **D8:** `knowledge check` → the critic (`knowledge:explain-critic` with a per-call model of the family other
   than the lead's; the generic path writes `briefs/critic.md`; its scratch is `mktemp -d`) → one bounded
   confirm pass → one revision → publish. The publish step's command (the `python3 -c` payload builder, or the
   `knowledge` CLI) is added to §3.2's printed allow rules, because the skill's grant is gone by D8. Decide and
   record whether `no-research` runs the critic.
4. **D9** replacing §8: the final report, with the mode block from `run.md`, degraded modes, declared gaps, the
   critic's verdict, and the book suggestion when it applies.
5. **The book section**, written as a procedure a bootstrap executor follows: B1–B5 whole-book research to
   `book/research/` with `summary.md` (key sources, open disagreements, weak spots) for the outline gate and
   the freeze of `library.md`/`ledger.md` at the outline signature; B6 a chapter's top-up writing its own
   overlays (`library-ch<k>.md`, `ledger-ch<k>.md`) and `trace-<key>.md`. Cite Part B for formats.
6. **The book suggestion:** offered, never imposed, when the request names a book (or chapters, a course) or
   the D1 plan is plainly too big (S3 §2 Q9's rule). Detect a workflow workspace (flat and nested) and whether
   its explain route has the new fields; propose a name, an objective and every `## Explain` field verbatim
   with `lang: en`; on a literal yes invoke `create-phase`'s explain route, then stop. An old workspace is told
   to update first (and offered a single document); outside a workspace, a single document. Never asks under
   `-p` or as a subagent: it reports the suggestion instead.
7. **Release plumbing:** `plugin/.claude-plugin/plugin.json` to 0.6.0 (and any version mirror the parity
   guards check); `plugin/README.md`: the five agents, the permission posture and the exact rules the
   preflight prints, the dossier path, the modes and flags, raising the search cap with
   `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`; the skill's `description` in both frontmatters. Nothing pushed.
8. All three copies; `--write-agents` if Part B changes; both guards; `## Doc impact` lines.

## Verification

- `skills_parity.py`, `plugin_parity.py` and `claude plugin validate plugin` pass.
- Report the skill's size. The operator accepted ≈ 125–145 KB (OQ5); above 145 KB, say so in `## Now` with
  where the bytes went.
- **One `quick` run end to end** under `claude -p --plugin-dir plugin`, with scratch `XDG_*`/`KB_*` env
  checked with §2's resolver first and a **scratch stack** per the scratch-stack rules (your own port, fresh
  `KB_ROOT`, never `:8766`, `:3030` or production; stop only your own PIDs). Its request names a book, so it
  must ask nothing, run through publish to the scratch stack, and report the suggestion. Check that it writes
  `gaps/final.md` per §3.8 (the first live run to do so), refreshes `library.md` and `outline.md` after each
  merge (S5's run did not after round 2), and keeps B6's one-form-per-call rule.
- Spend cap for this slice's `claude -p` runs: **$10**, summed from `total_cost_usd`; never set a
  `--max-budget-usd` near the real cost (it makes the lead cut stages); at the cap, return `needs_operator`.
- `git diff --stat` stays in the edit scope; `validate` passes.

## Notebook and result

- `phase.md` is at its 40 KB budget. Before adding anything, move the long build material in `## Decisions`
  (it is 21 KB) into `topics/build-decisions.md`, leaving one line per decision with a pointer; never drop a
  decision. Then, one section at a time: remove the S6 entry and the S4/S5 notes for S6; add
  `(from P32.S6, for P32.S7)` and `(from P32.S6, for P32.S8)` notes (the book section's names and paths the
  package must call); `## Decisions`; `## Doc impact`; `## Now`.
- `result.md`: the verdict block first (`status`, `tier`, `model`, `effort` from `## Dispatch`, `summary`,
  `files_changed`, `validation`, `deviations`, `doc_impact`), then the `claude -p` spend, the run's dossier
  shape, and the skill's size.
- No commit, no push, no state command.

## Dispatch

slice=P32.S6
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
