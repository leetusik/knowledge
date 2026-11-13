# P31.S3 result

- status: done
- tier: high
- model: opus
- effort: high
- summary: Wrote the package's first half: `explain-critic.md`, a one-pass fresh-eyes critic on opus with web tools and no Edit, whose model always differs from the chapter drafter's (`model: sonnet` passed per call for a high chapter), with no engine change; `explain-chapter.md`, the chapter slice's three spans; and a `package/README.md` stub mapping each file to its place in the bootstrap's `payload/`.
- files_changed: works/phases/active/P31/package/claude/agents/explain-critic.md (new), works/phases/active/P31/package/claude/skills/do-whole-phase/reference/explain-chapter.md (new), works/phases/active/P31/package/README.md (new), works/phases/active/P31/phase.md (Decisions, Operator Questions, Notes for later slices, Now), works/phases/active/P31/slices/P31.S3/result.md
- validation: `python3 scripts/workflow.py validate` PASS (warnings pre-existing only); `git -C <bootstrap> status --short` empty before and after (HEAD f207775); no product code touched
- deviations: two small additions the plan left open, recorded as decided OQ5/OQ6: images at `book/assets/<key>/` plus a `## Publish` section in the chapter's `result.md`; span 3 always runs, even on a critic `pass`
- doc_impact: none (the package is workflow material under `works/`, and no product doc changes)

## What was written

| File | Lines | Notes |
|---|---|---|
| `package/claude/agents/explain-critic.md` | 142 | Mirrors `design-critic`'s shape (frontmatter, Inputs, how it checks, rubric, the file, Never, verdict block). It is smaller (323 → 142 lines) and well under the 250-line cap |
| `package/claude/skills/do-whole-phase/reference/explain-chapter.md` | 80 | One page: where things live, the three spans, the critic's model, records/limits/commit |
| `package/README.md` | stub | A table of each file, where it goes in `payload/` and which slice wrote it. S4 completes it |

Pinned decisions, and where each landed:
1. **The critic's model, option (a).** The frontmatter is `model: opus`, `effort: high`, with tools `Read, Glob, Grep, Bash, Write, WebFetch, WebSearch`. The rule (always a model different from the drafter's; pass `model: sonnet` for a high chapter; STOP when both rows resolve to one model) and why (a fresh-eyes check on the same model shares its blind spots; the route table stays untouched; option b is left for the bootstrap) are in both files. The critic also gets `executor_model:` in its dispatch and returns `blocked` on a match.
2. **Locations.** `book/<key>.md`, `book/critique/<key>.md` and `topics/<key>-research.md`. The slice folder keeps only `plan.md` and `result.md`.
3. **Three spans.** Span 1: research §3, draft §4, read-through §4.8, check §4.9 to exit 0, then `done` + `critic_ready: yes`. Span 2: the orchestrator dispatches the critic. Span 3: resumed with SendMessage or re-dispatched from disk; one revision, a `## Critique answers` section, a re-check, the final verdict. There is no second critic round; a disputed must-fix goes to the REVIEW.
4. **The rubric.** Categories `facts`, `citations`, `diagrams`, `quiz`, `order`, `clarity` and `rules` (§4.1), under severities must-fix / should-fix / note, each with confidence and evidence. The critic never edits, publishes or talks to the operator.
5. **Size.** Met (see the table above).

Neither file restates the skill's writing rules: both cite §3, §4.1, §4.2, §4.4–§4.6, §4.8 and §4.9.

## Choices the plan left open (all in phase.md)

- **Asset path and publish flags (OQ5).** The REVIEW publishes every chapter at once, later, so the images and the exact flags must persist. Images go in `book/assets/<key>/`. The flags go in a `## Publish` section in the chapter's `result.md`: the `knowledge check` command, which the REVIEW turns into a publish by swapping `check` for `save`.
- **Span 3 always runs (OQ6).** It is the only place the critique gets answered and recorded, because the orchestrator never writes `result.md`.
- **Two-strike mapping.** §4.9's "same list twice → STOP" becomes the executor's existing two-strike rule: a mid-tier executor escalates, a high-tier one returns `blocked`.
- **Records.** `record-dispatch` runs once, after span 3. The critic span is metered from transcripts and never recorded, as with design spans. There is one commit, after span 3.
- **Escalation.** If span 1 is redone on opus after an escalation, the critic runs on sonnet.
- **The critic never reads the executor's `result.md`.** This mirrors design-critic, which never reads the drafter's render log. The research notes serve only as a map to sources, never as evidence.
- **Notes for later chapters.** Span 3 adds a `## Notes for later slices` entry with the terms the chapter defines and the heading ids to link to, as corrected. This serves the intent's "later chapters build on corrected ones".

## Findings for S4 (in phase.md's S3→S4 note)

The bootstrap engine's `MANAGED_AGENT_FILES` (workflow.py L361) lists five agents. Registering explain-critic as a sixth agent file outside that list needs:
- `installer/build.py` `FIXED_LIVE_FILES`;
- `installer/main.py` `MANAGED_FILES`, `NESTED_AGENTS` (L642), the install write (~L1493) and the summary print (~L1822).

`do-next-slice/reference/` has its own copies of the special-slice references, and only `dispatch.md` is shared through `build.py` `SHARED_SKILL_FILES` (L73–78). So `explain-chapter.md` must reach `do-next-slice` too.

## Commands

- `git -C /Users/sugang/projects/personal/bootstrap_agentic_workspace.sh status --short`: empty, before and after.
- `python3 scripts/workflow.py validate`: `Workflow validation passed.` The only warnings were pre-existing: P26.S5 kind, consolidation owed for P28/P30, stale docs, oversized doc sections.
- `phase-section` writes:
  - Decisions 2554 → 4073 B;
  - Operator Questions +OQ5, OQ6;
  - Notes 3545 → 4549 B (removed the consumed S2→S3 note and the critic-model note; narrowed the paths note to S4; added S3→S4 and S3→S5);
  - Now rewritten.

  `phase.md` is now 15.8 KB, within its 40 KB budget.

The skill's location: the plugin is not installed in this machine's `~/.claude/plugins/cache`, so the critic and the procedure name the location in the chapter's `plan.md`. The fallback is a Glob of the plugin cache.
