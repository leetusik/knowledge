# P32.DECOMP — decompose "Thorough research and critic in the explain pipeline"

## Context

The operator wants explaining to rest on **thorough research by agents**, with **quality over efficiency**:
research becomes its own multi-agent stage (a plan, parallel researchers, a source library and claim ledger,
independent verification, gap rounds), and every chapter is written from it and checked against it by a
fresh-eyes critic. This applies to both the single document (`/knowledge:explain`) and the book (the
bootstrap's explain phase). Everything is in **English by default**; Korean only when asked. `intent.md` holds
the verbatim words and the confirmed scope. Out of scope: the server draft state, the CLI plumbing and skill
shrink, thinning the bootstrap references after its P42 merges, and the cross-vendor verifier (D67).

This slice only cuts P32 into slices. It writes no product code.

What exploration found:
- **The skill ships in three copies**, held by `scripts/skills_parity.py` (CI `plugin-ci.yml`):
  `plugin/skills/explain/SKILL.md` (canonical), `.agents/skills/explain/SKILL.md` (the portable copy for
  hosts other than Claude Code: same body, no `argument-hint`/`allowed-tools`) and `web/public/SKILL.md` (the
  landing page's single-file download, byte-identical to canonical). So the research team has to work, or
  degrade cleanly, on a host with **no subagents** and in a **single file**, and the bodies stay identical.
- **Today's research** (§3 of the skill) is one step in the writer's own context: web research mainly feeds
  the "Best practices & next steps" section, is skipped by a judgment gate or after a couple of failures, and
  stops at "enough to say" what aligns and diverges. No source ladder, no ledger, no verifier, no critic in
  the single document.
- **The plugin** (`plugin/.claude-plugin/plugin.json`, 0.5.0) ships skills only: no `plugin/agents/` yet.
- **The book flow** lives in the bootstrap (v69, read-only from here): `payload/claude/skills/create-phase`
  (*The explain route*), `do-whole-phase/reference/explain-{decomposition,chapter,review}.md` and
  `agents/explain-critic.md`, applied from P31's `package/` + `PATCHES.md` + `handoff-explain.md`. The
  bootstrap's executors may spawn only `Explore`, so a book's parallel research there fans out as **slices**;
  its P42 (several slices at once, in worktree `.claude/worktrees/run-loop/workflow`) is not merged yet.
- **P31.S5's rehearsal** is the evidence for the critic: two must-fixes (a wrong quiz key, a diagram in the
  wrong step order) that `knowledge check` passed.
- The meter (`dispatch-summary` means): research ≈ $11 and ≈ 31 span-min per slice; decomposition ≈ $7;
  implementation ≈ $9 and ≈ 27 span-min; qa ≈ $11 and ≈ 43 span-min; review ≈ $10 and ≈ 40 span-min.

## Proposed cut (the executor decides the final one and justifies it)

Research first, then a second decomposition: the build's shape depends on how a research team is best run
(the method) and where it can run (the hosts), and both need finding out, not guessing.

| Slice | Kind / risk | Does |
|---|---|---|
| **S1** the research method | research, high (by kind) | Find out, deeply and with every page opened, how the best research agents and research-to-writing systems work, and recommend P32's method. At least: Anthropic's multi-agent research system; the OpenAI and Google deep-research products' published design notes; Stanford STORM / Co-STORM (perspective-guided questions, an outline built from research — close to our book); long-form factuality work that splits text into atomic claims and verifies each one by search (e.g. SAFE, FActScore); citation-faithfulness work; source-credibility heuristics. Answer: the stages; what each agent's brief must hold; the dossier and claim-ledger format; the source ladder; how verification and counter-evidence search work; how a coverage/gap round is driven and when it stops; how a critic checks a chapter against a ledger. Writes `topics/research-method.md` (findings, a recommended design, citations); findings only. |
| **S2** where the team runs | research, high (by kind) | Find out what each host allows, and what the book flow must change. At least: Claude Code plugins (shipping agents, their frontmatter and tools, a skill dispatching several in parallel, a per-call model, permission prompts inside subagents, a skill's supporting files); the portable `.agents` copy's hosts (Codex and others: subagents or not) and a sequential fallback that keeps the same dossier; the single-file landing copy and the parity guard; the bootstrap's current explain route and references at v69, the critic moving into the plugin, and how P42's waves would run research slices (read-only). Writes `topics/hosts-and-delivery.md`; findings only. |
| **DECOMP2** cut the build | decomposition | Re-cut the rest from S1 and S2. Planned at the operator's gate, like any decomposition. |

**What DECOMP2 is expected to cut** (a sketch for the estimate, not binding):
- the research stage and dossier format written into the skill (high: open design);
- the plugin's `researcher`, `verifier` and `explain-critic` agents (high: open design);
- the single-document pipeline: research team → draft from the dossier → `knowledge check` → critic → one
  revision → publish; `quick` opts out; English by default; the three copies in parity; plugin 0.6.0 (high:
  wide blast radius, every user's skill);
- the book package for the bootstrap: research before the outline, the intake's must-cover / leave-out /
  trusted-sources fields, the research summary at the outline signature, a per-chapter top-up, the critic
  from the plugin, English by default (high: open design);
- two rehearsals (qa): the same subjects (one general, one codebase) through the old and the new single
  document, judged on one rubric, on a scratch API; and one book chapter through the package;
- the handoff for the bootstrap (docs, low).

**Estimate** (from the meter; quality-first research runs longer than the mean): DECOMP ≈ $7; S1 + S2 ≈
$25–45; DECOMP2 ≈ $7; the build ≈ $40–60; rehearsals ≈ $25–35; handoff ≈ $2–5; review ≈ $12–15. **About
$120–170 and 8–10 span-hours.** No slice spends money beyond the workspace's own dispatches (WebSearch and
WebFetch run inside them). No server change, so no deploy; a plugin release reaches users only when pushed,
which waits for your word.

## Two decisions I'm making, flagged for you

1. **Research before build, so one more stop.** S1 and S2 run unattended after this plan; DECOMP2 then plans
   at your gate, where you see the findings and the build cut. The alternative, cutting the build now, would
   fix agent and pipeline shapes before we know how best to run them.
2. **The research and high rows run at xhigh.** Today the engine routes research at opus @ medium and high at
   opus @ high. For quality over efficiency I'll add `[claude.research] effort = "xhigh"` and `[claude.high]
   effort = "xhigh"` to `executors.toml` and run `sync-agents`, in this slice's commit. It is durable; say so
   if you want it reverted after P32.

Decided as drawn: the acceptance gate is `--require` (the skill's output is what you see and use); the
rehearsals compare old and new output on the same subjects; nothing is published to production from a slice;
this repo's stale vendored `.claude/skills/explain` copy stays untouched (not P32's).

## What the DECOMP executor does (`slice-executor-high`)

1. **Read just in time:** P32's `intent.md`; `plugin/skills/explain/SKILL.md` §1, §3, §4.2, §4.5–4.6, §8;
   `scripts/skills_parity.py`; `plugin/.claude-plugin/plugin.json`; P31's `package/README.md`, `PATCHES.md`
   head and `handoff-explain.md` head (the handoff pattern); the bootstrap read-only: its explain route in
   `payload/claude/skills/create-phase/SKILL.md`, the three `explain-*.md` references and
   `agents/explain-critic.md`.
2. **Cut** with `new-slice` as **bare folders**: the research slices (`--kind research --risk high`) and
   `P32.DECOMP2` (`--kind decomposition`) ordered after them, with each slice's questions written into
   `phase.md` so that S1 and S2 can be planned from it.
3. **`phase.md`:**
   - `## Decisions`: the cut and why (research first); the xhigh rows; English by default;
   - `## Notes for later slices`: the three skill copies and both parity guards; the bootstrap and P42's
     worktree are **read-only**; research findings go to `topics/`, never product files; the scratch-stack
     rules (never `:8766` or `:3030`, never production); no publish from a slice;
   - `## Now`.
4. **Validate** with `python3 scripts/workflow.py validate`, then return a structured verdict. No commit and
   no state moves beyond `new-slice`.

## After the executor returns (orchestrator)

- `record-dispatch`, `finish-slice P32.DECOMP`, `accept-gate P32 --require`, the `executors.toml` change and
  `sync-agents`, in one commit.
- Run S1 and S2 straight through (auto, planned inline). Stop at DECOMP2's plan for your approval.

## Verification

- `validate` passes; `next` points at S1.
- No middle slice has a `plan.md`.
- The product diff is empty (`git diff --stat -- web/ server/ cli/ plugin/ .agents/`).
- `executor-route` shows research and high at xhigh.

## Dispatch

slice=P32.DECOMP
phase=P32
kind=decomposition
risk=high
attempt=1
route=high
reason=kind decomposition
tier=high
subagent_type=slice-executor-high
model=opus
pass_model=yes
effort=xhigh
pass_effort=yes
attribution=Claude Opus 5.5
explore_model=haiku
explore_effort=high
