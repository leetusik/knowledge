# P32.S3 result: where the research team runs (hosts, the plugin and the book package)

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **summary:** I judged every host the explain skill ships to against the S1/S2 pipeline, using vendor docs and seven
  throwaway-plugin tests in this Claude Code install. The findings are in `topics/hosts-and-delivery.md`:
  - questions 1–9 answered;
  - all 22 assumed capabilities across 4 hosts;
  - the recommended delivery: five plugin agents, waves, the session-posture preflight, the state-dir dossier,
    `curl` plus a converter for exact text, three single-file copies plus an AGENTS parity check, plugin 0.6.0, the
    book package and the book suggestion.
- **files_changed:**
  - `works/phases/active/P32/topics/hosts-and-delivery.md` (new)
  - `works/phases/active/P32/phase.md` (Decisions, Notes for later slices, Operator Questions, Now)
  - `works/phases/active/P32/slices/P32.S3/result.md` (new)
- **validation:**
  - `python3 scripts/workflow.py validate`: passed
  - `git diff --stat -- web/ server/ cli/ plugin/ .agents/ scripts/`: empty
  - bootstrap `git status --short`: empty
  - every throwaway file removed (listed below)
- **deviations:**
  - One test was added beyond the plan's examples: a foreground parallel wave under `-p`. It was needed to separate
    "the grant clears at a notification" from "the grant clears at a new turn".
  - I kept the `(from P32.DECOMP, for S1, S2, S3)` rule under "Rules for every slice", as the plan said to keep
    those rules, although no research slice remains.
  - No other deviations.
- **doc_impact:** none

---

## Sources

Every source is listed with its quotes in the topic's §6.

**Opened:**

- **Claude Code docs** (code.claude.com/docs/en, fetched 2026-10-22 as `.md`, pinned to install 2.1.308):
  - sub-agents
  - plugins/components
  - plugins/manifest-reference
  - plugins/publish
  - plugins/loading
  - plugins
  - skills
  - permission-modes
  - permissions
  - tools-reference
  - env-vars
  - headless
  - workflows
  - settings
  - model-config
  - cli-reference
- **Codex** (learn.chatgpt.com/docs): build-skills, agent-configuration/subagents, config-file/config-reference,
  agent-configuration/agents-md.
- **Agent Skills** (agentskills.io): specification, adding-skills-support, clients.
- **Host pages:**
  - Gemini CLI: skills, subagents
  - Cursor: skills, subagents
  - VS Code: agent skills, subagents
  - OpenCode: skills, agents
- **Wayback:** the Internet Archive's Wayback Machine APIs page, plus a live call to the availability API (429, then
  200).
- **Local files, read-only:**
  - this repo's three skill copies, both parity scripts, `plugin.json`, `marketplace.json`, the CI workflow, the
    setup skill and the landing content;
  - the bootstrap at `64b2d6f` (v69): create-phase, the explain references, `explain-critic.md`,
    `slice-executor.md`, payload `settings.json`, the contract's size, the installer, the engine's nested marker
    and span reader;
  - P42's intent and Decisions in the read-only worktree.

**Not opened:** none. Every cited page loaded within two tries.

## Tests

All tests ran in this Claude Code install (2.1.308). Each used a throwaway plugin `kt` in the session scratchpad,
loaded with `--plugin-dir` (never installed), under `claude -p --setting-sources project --model haiku
--no-session-persistence`. Each run cost $0.02–0.06.

- **T1:** frontmatter `tools: Read, Grep` restricts the agent. It had no Bash and no Write.
- **T2:** frontmatter `model: sonnet` ran on Sonnet under a Haiku main model. A per-call `model: haiku` overrode it.
  The agent reported its own model id correctly.
- **T3:** the skill's `allowed-tools` grant reaches subagents, but clears at the main thread's next turn, including a
  sibling's completion notification. Later calls were denied: "Permission prompts are not available in this
  context". Session allow rules held. Auto mode allowed everything tested, including writes and `curl` outside the
  working directory.
- **Foreground wave:** three `run_in_background: false` calls in one message ran concurrently. The main thread waited
  in one turn, and the grant held throughout (0 denials).
- **T4:** three background agents ran concurrently and returned as notifications in later turns.
- **T5:** `${CLAUDE_PLUGIN_ROOT}` is substituted in the agent body, and `${CLAUDE_SKILL_DIR}/ref.md` resolves.
- **T6:** the plugin's `bin/` is on `PATH` for an agent's Bash.
- **T7:** a plugin agent dispatched another plugin agent at depth 2 and waited. The transcript's `.meta.json`
  carries `spawnDepth: 2` and `parentAgentId`.
- **Side findings:**
  - The auto-mode classifier blocked `claude plugin validate` on a plugin carrying a
    `permissionMode: bypassPermissions` agent.
  - WebFetch caps quotes at 125 characters. `curl` plus local conversion returned the full passage.

**Removed afterwards:**

- From the scratchpad: `docs/`, `kt-plugin/`, `runs/`, `work/`, `work2/`, `outside/`, `s3work/` and `tools/sj.py`.
  `tools/h2t.py`, `absmeta.py` and `pg.py` belong to earlier slices and were left alone.
- The test sessions' folders that Claude Code itself created:
  - `~/.claude/projects/-private-tmp-…-scratchpad-work*`;
  - `/private/tmp/claude-502/-private-tmp-…-scratchpad-work*`.
- Nothing was installed. `~/.claude/plugins/installed_plugins.json` is unchanged.

## Headline findings

The full findings are in `topics/hosts-and-delivery.md`; the delivery lines are in `phase.md` `## Decisions`, tagged
"(S3, …)".

1. **Permissions belong to the session.** A skill's `allowed-tools` grant cannot carry a background wave: it clears
   at the first notification (tested). Plugins cannot ship permission rules, and plugin agents ignore
   `permissionMode` (documented). So a run needs auto mode (the interactive default), bypass or allow rules. A
   two-agent preflight checks this, and a failure stops loudly.
2. **Interactive Claude Code cannot wait for subagents while fork mode is on.** The skill dispatches each wave in one
   message and merges only when all have returned, recorded in `run.md`. Wave sizes: 10 on Claude Code (cap 20), 6
   elsewhere.
3. **The verifier's different model holds by frontmatter.** It can be forced or substituted, so every agent reports
   the model it ran on, and the run records any degradation.
4. **WebSearch is capped at 200 per interactive session,** subagents included. At the cap, searches silently do
   nothing. A book needs roughly 360. This is OQ4.
5. **Exact text needs `curl` plus a converter:** WebFetch is lossy, with quotes capped at 125 characters. The
   converter travels as text in Part B, so one source serves every host.
6. **The three copies stay single files:** Part A is the lead, Part B the role briefs, and the agent bodies are
   guarded extracts. The landing design is untouched. The cost is a file of about 85–90 KB.
7. **Book research is dispatched by the `DECOMP` and chapter executors** under a `slice-executor.md` carve-out, with
   no contract edit (OQ2). The orchestrator dispatches the critic as `knowledge:explain-critic`.
8. **The book suggestion** detects nested and at-root workspaces and checks the route's capability, then invokes
   `create-phase` on a literal yes to the full proposal (OQ3). The route gains `must-cover`, `leave-out` and
   `trusted sources`, and `lang` defaults to `en`.

**Operator questions:** OQ2, OQ3 and OQ4 were appended to `phase.md`.
