# P40-2t.S1 — plugin front door

Kind `implementation`, a round-1 wave slice: S1, S2, S3 and S4 run at once. Mode `auto`.

## Goal

Implement change-list A1, A2 and A4–A13 in the canonical `plugin/skills/explain/SKILL.md`:

- the frontmatter description and the intro;
- §1 **Arguments** (`from=P<N>`);
- MODE's *subject* case;
- the book kind `codebase|subject`;
- COVERAGE and the research block: `paths: … | none`, `sources:` and the chained `then:`, verbatim
  from change-list §3(a);
- the front door's steps 2, 3, 5, 6, 7 and 8:
  - the v96 + `**sources**` readiness test;
  - both refusals naming v96;
  - no decline for a subject with no code; "outside a git repository: decline";
  - the hand-off carrying the block and the proposal as last shown;
  - the confirmation coming back by itself through create-phase's research route, **When it
    passes**, and still waiting for the literal yes.

Leave §3, §4, §5, §9 and Part B to S5 (A3, A14–A22).

Then:
- make `.agents/skills/explain/SKILL.md` carry the same body, keeping its own frontmatter;
- make `web/public/SKILL.md` the byte copy;
- regenerate the critic agent with `python3 scripts/skills_parity.py --write-agents`. Expect no change,
  because Part B is untouched.

## Validation

- `python3 scripts/skills_parity.py` and `python3 scripts/plugin_parity.py` PASS.
- `uv run pytest tests/test_explain_resolver.py -q` passes.
- The heading list (`grep -n '^#' plugin/skills/explain/SKILL.md`) is unchanged against
  `git show HEAD:plugin/skills/explain/SKILL.md`.
- `python3 works/phases/active/P39-hk/package/checks/cites.py plugin/skills/explain/SKILL.md <files>`
  reports missing 0. The `<files>` are `fdb1151`'s payload `create-phase/SKILL.md` and the three
  explain references, extracted to the scratchpad.
- `git status --porcelain .claude/` shows nothing.

## Risk

`high`, trigger **wide blast radius**. The v96 payload reads the front door: the block fields,
`from=`, the `**sources**` marker and the cited headings. S2 and S3 write those readers beside you, from
change-list §3/§4, never from your edit. So keep every name exactly as §3 and §4 pin it.

## Read first

- **`topics/breakdown.md`.** Two parts of it:
  - *Pins for every edit slice (S1–S6)*, which binds:
    - the base is `fdb1151`;
    - read the bootstrap only with
      `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh show fdb1151:<path>` into
      the scratchpad, written literally, one plain command per call;
    - no heading is renamed or added;
    - the two pinned anchors, **When it passes** and *Chapters at once (a wave)*;
    - no test files.
  - your own `## P40-2t.S1` block.
- **`topics/change-list.md`.** §3 holds the pinned answers, verbatim where it says so. §4 holds the
  parallel rules, and §5 your group-A rows A1–A13. They are the contract: implement them and don't
  redesign them. If a passage needs a decision §3 did not make, that is an Operator Question, never a
  guess.
- **`intent.md`** *Confirmed Intent*. OQ1 is answered **yes** (see Decisions).

## Never

- Write in the bootstrap repo, Note or arb_upbit_1, or anything outside your set (the scratchpad
  aside).
- Commit, move workflow state, or run an engine command that writes.
- Search the web, or spend money.
- Write test files (CLAUDE.md).

## Return

`result.md`, with the structured verdict block first: status, route, model, effort, summary,
files_changed, validation, deviations, doc_impact, notebook. The detail follows.

The `notebook` field carries:
- your block's Doc impact note;
- a Notes-for-later-slices entry for S5 and S6 with the parity facts they need: how you made the
  `.agents` copy, and what the checks printed;
- any Decisions gist line;
- any Operator Question.

## Wave

- **Your set.** Edit nothing else; your slice folder's `result.md` aside:
  - `plugin/skills/explain/SKILL.md`
  - `.agents/skills/explain/SKILL.md`
  - `web/public/SKILL.md`
  - `plugin/agents/explain-critic.md`, regenerated
- **Running beside you.** Never touch their sets:
  - P40-2t.S2: `works/phases/active/P40-2t/package/claude/skills/create-phase/{explain-route.md,research-route.md}`,
    `works/phases/active/P40-2t/package/patches/create-phase.md`
  - P40-2t.S3: `works/phases/active/P40-2t/package/claude/skills/do-whole-phase/reference/explain-{decomposition,chapter,review}.md`,
    `works/phases/active/P40-2t/package/patches/workflow.md`
  - P40-2t.S4: `works/phases/active/P40-2t/package/patches/engine.md`
- **Done slices whose commit waits:** none.
- **Join-rebuilt artifact:** none. Per DECOMP2, S1 and S5 each regenerate the plugin copies inside
  their own set.
- **Checks:** only the ones under Validation. A whole-tree check (the full pytest suite, the web
  build) is `deferred: whole-tree`, for S6 and REVIEW.
- **Notebook:** write no `phase.md`. Return your entries in the verdict's `notebook` field, by section,
  each gist-sized.
- **No engine command that writes.** `validate` and `phase-section` reads are fine.

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
