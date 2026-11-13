# P32.S3: where the research team runs (hosts, the plugin and the book package)

Research slice P32.S3, 2026-10-22. Findings only: no product file and no bootstrap file was changed.

This file judges every host the explain skill ships to against the pipeline in S1 and S2
(`research-method.md` §3.2–3.3, `research-evidence.md` §4). It then recommends how that pipeline is delivered.

**Labels.** Every finding carries one of three labels:

- **[D]** documented: a vendor page or a file says so. It is quoted in §6.
- **[T]** tested: checked in this Claude Code install (2.1.308) with a throwaway plugin `kt` in the session
  scratchpad. The plugin was loaded with `claude -p --plugin-dir … --setting-sources project --model haiku`, and
  every test file has since been removed.
- **[I]** inferred: reasoning from [D] and [T]. Inferred findings are rehearsal candidates.

**Pages and test runs.**

- Pages were fetched on 2026-10-22. Vendor doc pages carry no date, so the Claude Code pages are pinned to the
  2.1.308 install they describe.
- Each test run cost $0.02–0.06.

---

## 1. Summary

**The team ships as plugin agents. The method ships in the skill file.**

**Agents.** The plugin gains `plugin/agents/`, with five agents. Claude Code invokes them as `knowledge:<name>`:

- `web-researcher`
- `code-researcher`
- `gap-reviewer`
- `verifier`
- `explain-critic`, which moves out of the bootstrap

Each agent pins its model, effort, tools and `maxTurns` in its frontmatter. None declares `permissionMode`:

- a plugin ignores that field [D];
- a plugin agent that declares it made the auto-mode classifier block `claude plugin validate` [T].

Frontmatter tool lists really restrict an agent [T]. They cannot limit Write or Bash to a path.

**Dispatch.** The skill's lead dispatches each wave as one message of parallel Agent calls. It merges only once
every agent in the wave has returned. The skill must handle both ways a wave comes back:

- In interactive Claude Code, subagents start in the background and report back as notifications in later turns.
  The main thread cannot wait while fork mode is on, which is the default [D].
- In `claude -p`, the lead can wait in one turn, foreground [T].

Wave sizes:

- Claude Code: 10 per wave, under the session cap of 20 concurrent subagents [D]. Overflow is queued.
- Other hosts: 6 per wave [I].

**Models per role.**

- Opus for researchers and the gap reviewer; Sonnet for the verifier. Frontmatter sets these; a per-call model
  overrides frontmatter [T].
- The critic gets a per-call model from the other family than the lead's.
- Every agent's return opens with the exact model id it ran on. Agents read it from their own context [T].
- The lead compares those ids. If the verifier ran on the researchers' model, the run reports
  `verifier: same model (degraded)`.

**Three dispatch paths:**

1. **plugin agents** (Claude Code with the plugin);
2. **generic subagents** given the brief file (the landing copy installed by hand, Codex, Cursor and others);
3. **sequential** (no subagents), with `mode: sequential`.

**Permissions belong to the session, not the skill.**

- A skill's `allowed-tools` grant clears at the main thread's next turn [D]. That includes a background agent's
  completion notification: in the test, the agents still running were then denied [T].
- A plugin cannot ship permission rules [D].
- The run therefore needs auto mode, bypass, or session allow rules. Auto mode is the interactive default since
  2.1.283 [D].
- The preflight (D0b) checks that posture with a two-agent probe, which reproduces the "after a notification"
  case. If the probe fails, the run stops loudly and prints the exact allow rules it needs.

**Dossier location.**

- Single document: `${XDG_STATE_HOME:-~/.local/state}/knowledge-kb/explain/<run-id>/`. It is host-neutral, survives
  a reboot and sits outside any repo. Drafts move there too, out of `/tmp`.
- Book: `book/research/` in the phase folder, committed with each slice.
- Both resume from `run.md`.

**Verbatim text.**

- `WebFetch` is "lossy by design" [D]. In testing it capped quotes at 125 characters [T]. A source fetched with
  it is recorded `quote-match: approximate`.
- Exact text comes from `curl` plus a small standard-library HTML-to-text converter. The converter's source lives
  in the skill file, and D0b writes it to `…/knowledge-kb/tools/` [I]. PDFs go through `pdftotext` where it is
  installed.
- Wayback goes through `curl`. On HTTP 429, retry once.

**The three copies stay three single files.**

- The canonical `SKILL.md` gains Part B, an appendix with every role brief, the source ladder, the critic rubric
  and the converter.
- The plugin agents' bodies are byte-identical extracts of their Part B sections.
- The portable copy keeps the same body.
- The landing copy stays a full-file byte copy. This respects the signed landing design ("Download SKILL.md",
  "Copy the skill" and its shown "byte-parity" line).
- `skills_parity.py` gains one AGENTS check. `plugin_parity.py` is unchanged.
- The cost is size. The file grows to about 85–90 KB, against a 500-line guideline [D]. Part A's first 5,000 tokens
  must therefore carry a core card: after a compaction, only the first 5,000 tokens of a skill are re-attached [D].

**Plugin version:** **0.6.0.**

**The book (bootstrap).**

- Whole-book research runs inside `DECOMP`, whose executor is the book's lead (B1–B5).
- Each chapter's top-up runs inside its chapter slice (B6).
- Both executors dispatch the plugin's research agents under a narrow carve-out in `slice-executor.md`.
  - The "Explore only" rule lives there, not in the contract (12,278 of 12,288 bytes).
  - A nested dispatch from an executor works and waits [T][D]. Its transcripts carry `parentAgentId` [T].
- The orchestrator keeps dispatching the critic, now `knowledge:explain-critic`. The bootstrap's own
  `explain-critic.md` is deleted.
- The research summary goes to `book/research/summary.md` and is linked from the outline gate.
- The book's indexes freeze at the outline signature. Each chapter writes its own overlay files.
- P42 keeps explain phases sequential [D]. The overlays make chapters safe if that ever changes.
- **OQ2** asks the operator to confirm the carve-out over research-as-slices.

**The book suggestion (Q9).**

- The skill offers a book, never imposes one:
  - when the request names a book (or chapters or a course);
  - or when the D1 plan is plainly over one document's size, using the rule in §2 Q9.
- In a workflow workspace it proposes the phase: a name, an objective and every `## Explain` field.
  - The route gains `must-cover`, `leave-out` and `trusted sources`.
  - `lang` defaults to `en`, with translations only when named.
- On the operator's literal yes it invokes the workspace's `create-phase` explain route, which skips the questions
  already answered, and then stops.
  - `create-phase` may be model-invoked [D].
  - **OQ3** asks the operator to confirm that this yes counts as the confirmation.
- A workspace without the new route is told to update first (`/update-workspace` is operator-only [D]).
  This repo, at v61, is one. Until then, the skill offers a single document.

**The bootstrap package.** Text-anchored patches to:

- `create-phase`;
- the three explain references;
- `slice-executor.md`;
- the installer lists, for the critic's removal.

Also a CHANGELOG entry and a handoff file. No contract edit. Its version is the next free number at apply time:
P40 holds v70 and P42 v71, so most likely v72.

**Not chosen: dynamic workflows.** They are Claude-Code-only and main-thread-only (the `Workflow` tool is removed
from subagents [D], so a bootstrap executor cannot use one). Pro users must turn them on first [D]. They are a
later option for the single-document path only.

---

## 2. Findings by question

### Q1. Agents in a plugin

- **Where and what [D].** Agents are Markdown files under the plugin's `agents/` directory. A plugin agent loads
  as `<plugin>:<name>`, here `knowledge:verifier`. The manifest's `agents` field can list files explicitly.
- **Which fields are honored [D].**
  - Supported: `name`, `description`, `model`, `effort`, `maxTurns`, `autoCompactWindow`, `tools`,
    `disallowedTools`, `skills`, `memory`, `background`, `omitClaudeMd`, `isolation`, `color`, and
    `experimental.cacheTtl`.
  - Ignored: `permissionMode`, `hooks`, `mcpServers` and `initialPrompt`. The docs give the reason: "For security
    reasons, plugin subagents don't support the `hooks`, `mcpServers`, or `permissionMode` frontmatter fields".
  - Auto mode also ignores a subagent's `permissionMode` [D].
- **What the tests showed [T].**
  - **T1.** An agent declared with `tools: Read, Grep` saw only those two tools. It had no Bash and no Write.
  - **T2.** `model: sonnet` in the frontmatter ran on `claude-sonnet-5-5` while the main model was Haiku.
    A per-call `model: haiku` overrode it.
  - **T5.** `${CLAUDE_PLUGIN_ROOT}` is substituted in the agent body.
  - A probe plugin carrying an agent with `permissionMode: bypassPermissions` got
    `claude plugin validate` blocked by the auto-mode classifier ("Create Unsafe Agents"). So the field is worse
    than useless in a plugin.
  - The bootstrap's `explain-critic.md` declares it today. That line must go when the critic moves.
- **What frontmatter cannot do [D/I].**
  - `tools` lists tool names. Its documented example is `Read, Grep, Bash`.
  - `disallowedTools` with a specifier "still removes the whole tool" [D]. So a role cannot be given "Write, but
    only to the dossier" or "Bash, but only read-only git" by frontmatter.
  - Those limits live in the brief, plus the session's allow rules when the session runs in Manual mode [I].
- **Caps [D].** `maxTurns` is a hard per-agent limit. When it hits, "Claude Code returns its output marked as
  partial, and Claude can resume it". The partial marking needs 2.1.246 or later.
- **Useful extras [D].**
  - `omitClaudeMd: true` (2.1.271 or later) keeps the project's `CLAUDE.md` out of a web researcher, verifier or
    critic. It suits subagents "that take everything they need from the delegation prompt".
  - `effort` overrides the session's effort.
- **The plugin version the agents need.** The plugin's own version goes to 0.6.0 (§4.7). Users only get the agents
  after `claude plugin update`, because plugins are cached per version [D].

### Q2. Dispatch from a skill

- **Parallel fan-out works [T].** In T4 three agents dispatched in one message ran concurrently. They were
  backgrounded by default (`is_backgrounded: true`, spawn depth 1). The main thread ended its turn and received
  each completion as a new turn. A `-p` run continued until all of them finished.
- **Foreground in `-p` [T].** Each call can carry `run_in_background: false`. In the extra test, three such calls in
  one message still ran concurrently. Their tool calls interleaved and the first finished while the others were
  fetching. The main thread waited in the same turn and collected all three.
- **Interactive sessions cannot wait [D].** "to let Claude wait for a subagent, turn off fork mode, which is on by
  default". Results arrive as "a completion notification in a later turn".
- **Consequence for the skill [I].** It must be written for notifications:
  - record every dispatched agent in `run.md`;
  - treat one notification as "one of N back";
  - merge only when all N have returned (completed, partial or failed);
  - end its turn while any are outstanding.
  This works in interactive and `-p` alike.
- **A per-call model works [T]:** per-call beats frontmatter (T2). The documented order: per-call → frontmatter →
  `CLAUDE_CODE_SUBAGENT_MODEL` → the main model [D].
- **The model can be forced or substituted [D]:**
  - A mod's `agent.spawn` can override the per-call model.
  - `CLAUDE_CODE_SUBAGENT_MODEL` can be forced onto every subagent.
  - `availableModels` substitutes.
  - A fallback report opens "⚠ This agent switched to <model>…".
  - A family alias resolves to the main conversation's exact model when the main model is in that family.

  So the run can't trust what it asked for. It records what each agent reports it ran on. T2's agent reported its
  own model id correctly [T].
- **Limits [D].**
  - 20 concurrent subagents per session: the next spawn fails with `Concurrent subagent limit reached`, and the
    error tells Claude not to retry. The cap is set by `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`.
  - Nesting depth 3 by default.
  - **WebSearch: 200 calls per interactive session, main thread and every subagent together.** It refills about
    100 per hour (2.1.290 or later). Under `-p` the limit is per turn.
    - At the limit, searches "appear in the conversation as calls that did nothing", with a notice to carry on
      with what is gathered.
    - A researcher could mistake that for "not found". §4.2 makes it a loud `failed: search-limit`.
    - Book ceiling: 45 researchers × about 8 searches ≈ 360 searches, over 200. A tier-3 single document comes
      close: 25 × 8 ≈ 200.
    - The cap can be raised (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`) but not turned off. See **OQ4**.
- **When the skill itself runs inside a subagent.** This is the bootstrap case: an executor runs the research.
  - The lead is at depth 1, so its agents are at depth 2, within the limit [D].
  - The nested dispatch works and waits [T]. In T7 a plugin agent dispatched another plugin agent in the
    foreground. The transcript's `.meta.json` carries `spawnDepth: 2` and `parentAgentId`.
  - In an interactive session, "a subagent that launches background subagents waits for their results before it
    finishes" [D].
  - Two tools are removed from subagents [D]:
    - `AskUserQuestion`, so a lead running inside a subagent can never ask the operator anything (§4.8);
    - `Workflow`.
  - VS Code Copilot is different [D]: "Local subagents cannot invoke further subagents by default." There, a skill
    run inside a subagent goes sequential.

### Q3. Permissions

- **Do the tools prompt inside a plugin agent? [D/T]**
  - **Manual mode.** A call that needs approval waits for an allow rule or an answer. WebFetch prompts unless
    the domain is allowed or preapproved [D]. Bash, and Write outside the working directory, needed rules in the
    tests [T].
  - **Auto and bypass modes.** They skip the WebFetch prompt [D]. In the test, auto mode with no rules allowed:
    - WebFetch;
    - WebSearch;
    - Write outside the working directory (`/private/tmp`);
    - `curl` [T].
  - **How the auto classifier treats subagents [D].** It checks the delegated task at spawn time, then each action,
    then the final report.
  - **Interactive vs `-p` [D].**
    - Interactive: "Background subagents surface every permission prompt in your main session". That is noise,
      not a hang. A session-wide answer applies to the whole session.
    - `claude -p` since 2.1.302 starts in Manual mode, and "calls needing approval are denied".
    - Auto mode under `-p`: after repeated blocks "the action doesn't run and Claude keeps working. Claude Code
      doesn't stop the run". So the skill must turn a denial into a loud failure itself.
- **The skill's `allowed-tools` and the agents [D/T].**
  - The docs: the grant applies "during the turn that invokes this skill. The grant clears when you send your next
    message", and "It does not restrict which tools are available".
  - **T3 (manual mode, `-p`):**
    - The grant did reach dispatched subagents: Write, WebFetch and `curl` within the grant worked.
    - But it **cleared at the main thread's next turn, including the first sibling's completion notification.**
    - Every later call by the agents still running was denied: "Permission prompts are not available in this
      context", decision type `asyncAgent`. An in-flight WebFetch failed with "Command failed with no output".
    - With one agent, there is no notification before it ends, so everything passed.
    - With the foreground variant (extra test), the turn never ended, so the grant held for the whole wave.
  - **Conclusion [I].** In interactive Claude Code, where waves are background by default, `allowed-tools` cannot
    carry a wave. Session allow rules held across notifications in testing [T], for example
    `{"permissions":{"allow":["WebFetch","Edit(//abs/path/**)"]}}`. So the run relies on one of three postures:
    - auto mode;
    - bypass;
    - allow rules.
- **No plugin route to permissions [D].** A plugin's `settings.json` honors "Only `agent` and `subagentStatusLine`;
  other keys are dropped". An agent's `permissionMode` is ignored. The docs' own advice is rules "in `settings.json`
  or `settings.local.json`, but these rules apply to the entire session".
- **What an unattended run needs so it never hangs [I].**
  - **A two-agent preflight at D0b.**
    1. Agent A ("reply done") returns at once.
    2. Agent B does one WebSearch, one `curl` with conversion, and one Write into the dossier. These calls land
       after A's notification, which is the condition T3 showed denies.

    Both run on a cheap per-call model.
  - B's calls pass: the posture holds for real waves.
  - B is denied (`-p`): the run stops with nothing written, and the report's first line reads `FAILED: permissions`.
    It prints the exact rules it needs (§4.3).
  - In an interactive Manual session, B's prompts reach the operator. Answering them session-wide fixes the posture
    for the rest of the run.
- **Where the dossier is written:** §4.4. Under auto mode, Write outside the working directory passed [T]. In Manual
  mode it needs an `Edit(//<abs dossier root>/**)` rule [T][D]. In the docs, `//path` is an absolute path and
  `~/path` is home-relative.

### Q4. Supporting files

- **Claude Code [D/T].** A skill directory can carry supporting files. `${CLAUDE_SKILL_DIR}` points at the skill's
  folder: "For plugin skills, this is the skill's subdirectory within the plugin". T5 read
  `${CLAUDE_SKILL_DIR}/ref.md` [T].
- **A plugin can also ship scripts:**
  - `bin/` is on the Bash `PATH` [D]. T6 ran `bin/kt-hello` from an agent's Bash [T].
  - This repo already does it: the `setup` skill runs `python3 "${CLAUDE_PLUGIN_ROOT}/setup/render.py"`.
  - `bin/` "is not installed on claude.ai or Cowork" [D].
- **The Agent Skills standard [D]:**
  - `scripts/`, `references/` and `assets/`;
  - references "one level deep";
  - "Keep your main SKILL.md under 500 lines".
  - Codex loads `scripts/`, `references/`, `assets/` and `agents/openai.yaml` beside a skill [D].
- **What it does to the copies [I].**
  - The portable copy could carry the same `references/`.
  - **The single-file landing copy cannot.** It would become a bundle (a zip) or a generated concatenation. Either
    changes the signed landing: its "Download SKILL.md" and "Copy the skill" actions, and its shown line "parity:
    byte-parity with plugin/skills/explain/SKILL.md" (`web/src/content/marketing/content.ts`, line 266).
  - So the method stays in the one file (§4.6). Supporting files are not used.
  - The converter and the optional lint travel as text blocks in Part B. The lead writes them to the state
    directory at D0b, so one source serves every host.

### Q5. The portable copy's hosts

- **Who loads `.agents/skills` [D].**
  - The Agent Skills page says the paths "have emerged as a widely-adopted convention". Its client showcase lists
    46 clients, among them Codex (ChatGPT & Codex), Cursor, Gemini CLI, GitHub Copilot and VS Code, OpenCode,
    Junie, Goose, Amp, Factory, Roo Code, Kiro, OpenHands and Tabnine.
  - Pages checked directly:

    | Host | Loads | Precedence |
    |---|---|---|
    | Codex | `.agents/skills` from the working directory up to the repo root, plus `$HOME/.agents/skills` | — |
    | Gemini CLI | `.agents/skills` alias | the alias "takes precedence" |
    | Cursor | `.agents/skills` | — |
    | VS Code Copilot | `.agents/skills` | — |
    | OpenCode | `.agents/skills` | — |

- **Subagents and models per host [D].**

  | Host | Subagents | Model choice | Notes |
  |---|---|---|---|
  | **Codex** | On by default; "delegate when you ask directly or when applicable `AGENTS.md` or skill instructions request it" | Per spawn, by `[agents]` defaults, or by a custom agent TOML (`model`, `model_reasoning_effort`) | "Codex waits until all requested results are available". Thread cap `agents.max_concurrent_threads_per_session`: Codex chooses the default, and the docs' examples use 6 and 8. "Subagents inherit the parent turn's current sandbox and approval settings", and "a custom agent file can't replace those settings". "In non-interactive flows… an action that needs new approval fails and Codex surfaces the error back to the parent workflow". **No WebFetch tool.** `web_search` defaults to `"cached"` ("an OpenAI-maintained index without external web access"); `"live"` is opt-in. `sandbox_workspace_write.network_access` must be on for `curl` |
  | **Cursor** | Run "in parallel", foreground or background | `model:` field per subagent | — |
  | **Gemini CLI** | Subagent files | `model`, `max_turns` (default 30), **`timeout_mins` (default 10)** | Parallel not established from the page |
  | **VS Code Copilot** | Yes | A model named in the prompt, "checked against the main model's cost tier" | No nesting by default |
  | **OpenCode** | The `general` agent runs "multiple units of work in parallel" | `model:` per agent | — |

- **The sequential fallback [I].**
  - It applies on a host with no subagent tool, or one that refuses to spawn.
  - The lead plays each role in turn and writes the same dossier files.
  - It reports `mode: sequential`, `verifier: lead (degraded)` and `gap review: lead (degraded)`.
  - A host that spawns but cannot name a model reports `verifier: same model (degraded)`.
  - A host with no `maxTurns` equivalent reports `caps: prompt-only`.
- **Mode reporting.** It appears in `run.md` and in the report's first lines (§4.2). The run knows the verifier's
  model from the `model:` line every agent's return opens with. On Codex that line holds the model id the spawn
  reports.
- **Codex specifics [D/I].**
  - Research needs `web_search = "live"` and network access. The cached index is a different evidence base, and
    `curl` fails without network.
  - D0b's preflight catches a failed fetch.
  - A cached-only search is hard to detect. The skill must state the requirement, and the report records
    `search: cached` when the operator says so: see the open questions.

### Q6. The landing copy and parity

- **The briefs can live in the skill body [I].** Recommended: Part A holds the lead's procedure; Part B is an
  appendix holding every role brief, the ladder text, the verifier brief, the critic rubric and the converter.
  - So the single file carries the whole method, as S1 item 10 and S2 item 10 require.
  - The download stays one file.
- **Plugin agents [I].** Each plugin agent's body is a byte-identical extract of its Part B section. The plugin path
  never retypes a brief: the lead passes only the filled-in fields.
- **The generic path [I].** The landing copy installed by hand, Codex and others. The lead writes each Part B
  section once per run to `<dossier>/briefs/<role>.md`. Each spawn prompt then says: read that file and follow it;
  here is your brief.
- **What `skills_parity.py` must change [I].**
  - It keeps BODY, WEB, DESCRIPTION and MISSING.
  - It adds **AGENTS (FAIL)**: each `plugin/agents/<role>.md` body equals the marked Part B section of the canonical
    file, and each agent's frontmatter is free of `permissionMode`, `hooks` and `mcpServers`.
  - Alternatively, a small generator writes the agent bodies from the canonical file, and the guard regenerates
    and compares. DECOMP2 chooses.
- **`plugin_parity.py`** checks the `plugin/templates/kb/` scaffold against the live repo, so it is unchanged.
- **Observation, not in scope.** The landing copy (and the canonical) carries `argument-hint`. A claude.ai upload
  fails with "Unexpected key(s) in SKILL.md frontmatter: argument-hint" [D]. This is a deferred-job candidate
  because the landing design is signed; P32 does not change it.

### Q7. The book flow (bootstrap v69, read-only)

**Today [D, bootstrap files].**

- **The explain route** (`create-phase` SKILL.md, *The explain route*) asks eight fields: subject, mode, book,
  lang (+translations), reader, depth, project (private) and visibility (private).
- **`explain-decomposition.md`:**
  - finds the skill with a Glob `~/.claude/plugins/cache/*/knowledge/*/skills/explain/SKILL.md` at version ≥ 0.5.0;
  - writes `topics/outline-research.md` and `book/outline.md`, with a `web research: on | off` line per chapter;
  - cuts chapter slices `--kind implementation --risk low`;
  - stops at the outline gate.
- **`explain-chapter.md`:**
  - runs three spans: the executor drafts, the orchestrator dispatches `explain-critic`, the executor revises;
  - gives the critic a model different from the drafter's;
  - stops when both resolve to one model behind a loopback proxy.
- **`explain-critic.md`:**
  - `tools: Read, Glob, Grep, Bash, Write, WebFetch, WebSearch`;
  - `model: opus`, `effort: xhigh`;
  - `permissionMode: bypassPermissions`.
- **"Explore only".** Executors may spawn only Explore. That rule is in `payload/claude/agents/slice-executor.md`
  (lines 31 and 64), **not** in the contract. The contract is 12,278 of 12,288 bytes and never mentions explain.

**What changes [I]:**

- **Research before the outline (B1–B5).** The `DECOMP` executor is the book's lead.
  - It reads the installed skill's Part A book section and runs whole-book research into `book/research/`.
  - It dispatches `knowledge:web-researcher`, `code-researcher`, `gap-reviewer` and `verifier`, nested at depth 2.
  - It writes `book/research/summary.md` with key sources, open disagreements, weak spots and each chapter's
    expected top-up.
  - It writes `book/outline.md` from the research.
  - `topics/outline-research.md` gives way to `book/research/`.
  - The per-chapter `web research` line becomes the chapter's expected top-up.
- **Intake fields:** must-cover, leave-out, trusted sources; English by default (§2 Q9).
- **The research summary at the signature.** The outline gate's stop holds at most about five decisions, as the
  stop rules require, and links `book/research/summary.md` and `book/outline.md`. On the signature, `library.md`
  and `ledger.md` freeze.
  - The engine cannot lock a file. The freeze is a reference rule, and the review can check it with `git log` on
    those two paths [I].
- **Per-chapter top-ups (B6).** The chapter executor is the chapter's lead.
  - It dispatches 0–3 researchers and the verifier into its own `library-ch<k>.md`, `ledger-ch<k>.md` and
    `trace-<key>.md`.
  - It then drafts from the frozen indexes plus its overlay.
- **The critic moves into the plugin.**
  - The orchestrator still dispatches it, as today. The name becomes `knowledge:explain-critic`, depth 1, with no
    carve-out needed.
  - Its inputs grow by S2 §3.10: the ledger, the library, `gaps/final.md` and the trace.
  - The "model different from the drafter's" rule and the proxy stop stay.
- **Who dispatches the research agents.** Three options:
  - **(a) Executor carve-out (recommended).**
    - One added rule in `slice-executor.md`: on an explain phase, the executor running `DECOMP` or a chapter
      slice may also dispatch the knowledge plugin's research agents, as the skill's research stage directs.
    - It needs no contract edit.
    - The lead stays one context, as S1 requires (planner, merger, only writer).
  - **(b) Research as slices.**
    - One slice per researcher would mean up to 45 slices with their plans and commits.
    - The orchestrator would become the merger, and its context would carry every merge.
    - The researchers would run on the executor's agent rather than the plugin's.
  - **(c) The orchestrator inline**, as a design slice runs: it needs a contract sentence, and the contract has
    10 bytes free.

  (a) is **OQ2**.
- **English by default.** `lang: en`, translations only when named (Q9).
- **P42 [D].** P42 runs waves of declared-independent slices.
  - Its intent and decisions say "explain references unchanged, and explain phases stay sequential".
  - It drops `--depends-on` from explain chapters, which are cut undeclared.
  - So research runs one slice at a time. The overlays keep parallel chapters safe if that changes.
  - The binding shared resource then would be the session's WebSearch cap, not the files [I].
- **Before and after P42 merges:** §4.9.

### Q9. The book suggestion

**When to suggest a book: a rule, offered not imposed [I].** The skill suggests a book in two cases.

- **(a) Before any research,** when the request names a book, chapters, a course, a series or a multi-part guide.
  `book=<slug>`, which places one chapter in an existing book, does not count.
- **(b) After D1's plan,** when any of these holds:
  - the plan needs more than about 25 reader questions;
  - or more than 7 top-level outline sections;
  - or the subject rates tier 3 on two or more of the three axes (S1 §3.5);
  - or the evidence map needs more than 10 researchers in wave 1.

**How it is offered.**

- One short question: "This looks like a book: <reason>. In your workspace a book is an explain phase … Shall I
  propose one, or write one document covering <the scoped part>?"
- Interactive only. Inside a subagent `AskUserQuestion` is removed [D], and an unattended run must not stop. So a
  run inside a subagent or under `-p` writes the single document and puts the suggestion in the report.

**Detecting a workspace [D: installer `resolve_layout`, read-only].**

1. **Find the root.** Start at the session's working directory, or `git rev-parse --show-toplevel`.
2. **Nested:** `workflow/.agentic-nested.json` exists.
   - The engine is `python3 workflow/scripts/workflow.py`.
   - The version is in `workflow/works/.workspace-version.json`.
   - Skills and agents sit in the host's `.claude/`, possibly renamed: the marker's `renames.skills` maps
     `create-phase` to its installed name.
3. **At the root:** `scripts/workflow.py` plus `works/` exist. The version is in `works/.workspace-version.json`
   (`workspace_version`).
4. **Both:** ambiguous. The skill says so and does not guess.
5. **Neither:** "A book needs a workflow workspace (agentic workspace bootstrap). I can write one document now."

**Capability, not just the number [I].**

- The skill reads the installed `create-phase` SKILL.md and looks for `## The explain route` and the new
  `must-cover` field. The version number is only for the message. The plugin and the bootstrap release
  independently, so the plugin cannot know which number ships the new route.
- **Too old.** Under v65 there is no route at all; this repo is at v61. From v65 to the package version, the route
  lacks the research fields.
  - The skill says: "This workspace (v<N>) needs an update for research-first books: run `/update-workspace`, then
    ask again. Meanwhile I can write a single document."
  - It never runs the update itself: `update-workspace` is `disable-model-invocation: true` [D].

**The hand-over [D: the create-phase header; I: the reading].**

- The skill shows one proposal: the phase name, the objective and every `## Explain` field with a one-line reason.
  - The fields: subject, mode, book, reader, depth, must-cover, leave-out, trusted sources, project (private) and
    `lang: en`.
  - It ends with "Reply yes to create it, or change any field." Any change means showing the changed proposal
    again.
- On a literal yes it **invokes the workspace's `create-phase` through the Skill tool.** `create-phase` is the one
  workflow skill without `disable-model-invocation` [D]. It may run "when instructed … by a direct operator
  instruction" [D].
- It passes the confirmed proposal verbatim. The patched route reads: "entered from `/knowledge:explain` with a
  confirmed proposal". Steps 1–3 are done, because the operator's yes answered a proposal showing the name,
  objective and every field verbatim. That is the explicit confirmation `new-phase` needs.
- `create-phase` then runs `new-phase` and writes `intent.md`: the operator's request verbatim, the confirmed
  proposal as the confirmed intent, and `## Explain`. Then it stops.
- The skill stops too: "Run `/do-whole-phase`". That command is operator-only [D].
- **Fallback.** Where the Skill tool cannot reach `create-phase`, the skill prints `/create-phase` with the fields
  to paste. This covers the portable hosts and a renamed or missing skill.
- Whether the yes counts as the confirmation is the contract's reading, so it is **OQ3**.

**The `## Explain` fields the route must gain [I].**

- `must-cover`: a list. It is mandatory coverage, and the evidence gate and the critic's `coverage` check enforce
  it.
- `leave-out`: a list, which the plan and every brief carry as "not this book's".
- `trusted sources`: URLs, domains or documents the operator trusts. They are candidates for the top rung, still
  opened and verified, never exempt.
- **`lang`** changes from "the language … plus any translations wanted" to `lang: en`, with translations only when
  the operator names one: `lang: en (translations: none)`. This follows the English-by-default decision.

---

## 3. The capability table

Hosts:

- **CC**: Claude Code with the plugin (`/knowledge:explain`).
- **PH**: the portable copy's hosts (Codex first; also Cursor, Gemini CLI, VS Code Copilot and OpenCode).
- **LC**: the single-file landing copy installed by hand: a standalone Claude Code skill with no plugin agents, or
  any PH host. As a claude.ai upload it is rejected today because of `argument-hint` [D].
- **BK**: the bootstrap's book flow (orchestrator → executor → plugin agents).

Cell values:

- **yes**: available as assumed;
- **diff**: available differently;
- **no**: missing;
- **n/a**.

The last column is what the run does or reports.

| # | Capability | CC | PH | LC | BK | Fallback / reported mode |
|---|---|---|---|---|---|---|
| S1-1 | Parallel dispatch, per-host wave | **diff**: parallel [T]; background with notifications when interactive [D], waits under `-p` [T]; 20 concurrent [D]; wave 10 | **diff**: Codex parallel and waits [D]; Cursor parallel [D]; others not established; wave 6 [I] | **diff**: in Claude Code, generic subagents as CC [I]; elsewhere as PH | **diff**: nested at depth 2 from the executor, which waits [T][D]; wave 10 | Merge on all-returned; overflow queued; no subagents → `mode: sequential` |
| S1-2 | Model per call | **yes**: frontmatter and per-call [T]; may be forced or substituted [D] | **diff**: per spawn or per agent file; vendor models; Copilot caps by cost tier [D] | **diff**: per-call on generic agents in Claude Code [I]; else as PH | **yes** | Each agent returns its `model:` line; mismatch → recorded |
| S1-3 | Tools per role, no prompt | **diff**: `tools` restricts [T], with no path limits [D]; no `permissionMode` [D]; no prompts only under auto, bypass or rules [T]; `allowed-tools` can't carry a background wave [T] | **diff**: Codex can only disable features; sandbox and approval inherited; non-interactive approval fails to parent [D] | **diff**: generic agents get every tool → `tools: unrestricted (degraded)` | **diff**: as CC; payload settings allow Read, Edit, Write, Glob, Grep only [D] | D0b two-agent preflight; `FAILED: permissions` plus the rules |
| S1-4 | Caps | **yes**: `maxTurns`, partial output, resumable [D] | **diff**: Gemini `max_turns` and `timeout_mins` [D]; others prompt-only | **diff**: no agent file → prompt-only [I] | **yes** | `caps: prompt-only`; run ceiling as backstop |
| S1-5 | Dossier root | **yes**: state dir [I]; auto writes outside the working dir [T]; Manual needs an `Edit(//…)` rule [T] | **diff**: Codex's sandbox may refuse writes outside the workspace [I] | as CC or PH | **diff**: `book/research/`, committed | D0b write-probe; fall back to `<cwd>/.knowledge-explain/<run-id>/`; report `dossier: <path>` |
| S1-6 | Resume from `run.md` | **yes**: file-based [I]; a partial agent can be resumed in-session [D] | **yes** [I] | **yes** [I] | **yes**: committed dossier; the engine's usage-limit resume [D] | `/knowledge:explain resume <run-id>` |
| S1-7 | Sequential fallback | **yes**: when Agent is denied [I] | **yes**: hosts without subagents | **yes** | **no**: 45 researchers in one context would overflow it | `mode: sequential`; a book stops loudly instead |
| S1-8 | Book dispatcher and top-ups under P42 | n/a | n/a | n/a | **diff**: executor carve-out (OQ2); P42 keeps explain sequential [D]; overlays | — |
| S1-9 | Unattended stop surfaces as failure | **diff**: `-p` Manual denies [D]; auto never stops a `-p` run [D]; a background API error marks the agent failed [D] | **diff**: Codex surfaces failed approvals to the parent [D] | as CC or PH | **diff**: the executor returns `blocked`, and the run stops [D] | Report line 1 `FAILED: <reason>`; nothing published |
| S1-10 | Method travels | **yes**: Part B + agent bodies (guarded) | **yes**: same body | **yes**: one file | **diff**: the executor reads the installed plugin's file (`installed_plugins.json`) | — |
| S2-1 | Verifier, different model, known | **yes**: `knowledge:verifier` on Sonnet [T]; `model:` line [T] | **diff**: a different vendor model where a spawn can name one | **diff** | **yes** | `verifier: same model (degraded)` / `lead (degraded)` |
| S2-2 | Verbatim page text | **diff**: WebFetch lossy, quotes ≤ 125 characters [T][D]; `curl` + converter exact [T] | **diff**: Codex has no WebFetch; `curl` needs network [D] | **diff** | **diff** | `quote-match: approximate` per source; no `pdftotext` → approximate for PDFs |
| S2-3 | Wayback | **yes**: availability API via `curl` [T]; 429 seen once [T] | **diff**: needs network | **diff** | **yes** | One retry, then `archive: unavailable` |
| S2-4 | Tools per role (verifier, critic) | **diff**: as S1-3 | **diff** | **diff** | **diff** | As S1-3 |
| S2-5 | Critic as plugin agent; book dispatcher | **yes**: `knowledge:explain-critic`, per-call model of the other family [T] | **diff**: generic subagent with the Part B rubric | **diff** | **yes**: orchestrator dispatches at depth 1, as today | `critic: same model (degraded)`; `critic: none (quick)` |
| S2-6 | Bounded confirm pass | **yes** [I] | **yes** [I] | **yes** | n/a: the chapter keeps its critic → revise spans | — |
| S2-7 | Dossier persistence (`verify/`, `trace.md`, `critique.md`) | **yes** [I] | **diff** (writability) | as CC or PH | **yes**: committed | As S1-5 |
| S2-8 | Book overlays; where the summary shows | n/a | n/a | n/a | **yes**: overlays per chapter; freeze is a rule; summary linked from the outline gate | — |
| S2-9 | Degraded modes reported | **yes** | **yes** | **yes** | **yes**: also in `result.md` and the gate stop | `run.md` + report first lines |
| S2-10 | Method's texts travel | **yes** | **yes** | **yes** | **diff**: as S1-10 | — |
| S2-11 | Optional dossier lint | **diff**: plugins can ship and run scripts [D][T]; one source is better: Part B text → state dir | **diff**: same; needs `python3` | **diff** | **diff** | The lead's checklist when there is no `python3` |
| S2-12 | Verifier concurrency shares the wave | **yes**: 10, under 20 | **diff**: 6 [I] | as host | **yes** | Batches queued between waves |

**Count, over the 88 cells (22 capabilities × 4 hosts):**

| As assumed | Different | Missing | n/a |
|---|---|---|---|
| 36 | 44 | 1 | 7 |

Notes on the count:

- The one **missing** cell is the sequential book.
- The four "as CC or PH" / "as host" cells count as **different**, because they vary by host.
- In every **different** cell the pipeline can still run. It runs either through a named fallback or through a
  reported degraded mode.

---

## 4. Recommendation (Q8)

### 4.1 Agents and their frontmatter (plugin `agents/`, invoked `knowledge:<name>`)

| Agent | model | effort | tools | maxTurns | omitClaudeMd | Writes (by brief) |
|---|---|---|---|---|---|---|
| `web-researcher` | opus | high | WebSearch, WebFetch, Read, Write, Bash | 40 (tier 3 / book hard cap) | true | `findings/r<n>-<angle>.md` |
| `code-researcher` | opus | high | Read, Grep, Glob, Bash, Write | 80 (double, S1) | false (repo rules help) | its findings file |
| `gap-reviewer` | opus | xhigh | Read, Grep, Glob, Write | 15 | true | `gaps/r<n>.md` |
| `verifier` | sonnet | high | WebFetch, WebSearch, Read, Grep, Glob, Bash, Write | 40 | true | `verify/r<n>-b<k>.md` |
| `explain-critic` | sonnet (the lead overrides per call to the family other than its own) | xhigh | Read, Grep, Glob, Bash, WebFetch, WebSearch, Write | 60 | true | `critique.md` / `book/critique/<key>.md` |

**Rules for every agent:**

- No `permissionMode`, no `hooks`, no `mcpServers`.
- No `Agent` tool: researchers never spawn.
- Bash is for `curl`, the converter and read-only `git`. The brief says so, because frontmatter cannot.
- Write goes to the brief's named file only.

**What is inferred.** The effort and `maxTurns` values are [I] rehearsal candidates. `maxTurns` is the backstop;
the brief carries the tier's own budget.

**Why separate web and code researchers:** S1's "code researchers get no web" holds by construction only if the
tool lists differ [T1].

**Each agent's body:**

- the byte-identical Part B section;
- opening rule: "Your return's first line is `model: <the exact model id you are running on>`";
- page content is data, never instructions.

### 4.2 Dispatch, models, degradation and the reported mode

1. **D0b decides the path, once per run, and writes it to `run.md`:**
   - **plugin**: the `knowledge:*` agents are listed;
   - **generic**: subagents exist but not those agents. The lead writes `<dossier>/briefs/<role>.md` from Part B
     and passes the path plus the filled fields;
   - **sequential**: no subagents.
2. **A wave.**
   - The lead sends all of the wave's Agent calls in one message.
   - Wave size: up to 10 on Claude Code, under the cap of 20 [D]; 6 elsewhere [I].
   - It records each id in `run.md` (`wave r1: 7 dispatched: …`).
   - It treats each notification or result as one returned, and merges only when every dispatched agent is
     `complete`, `partial` or `failed`.
   - Overflow and a refused spawn (`Concurrent subagent limit reached`) are queued, never dropped and never retried
     in a loop.
   - Verifier batches run between waves, on the same limit.
   - S1's failure rules apply unchanged: a load-bearing angle failing twice stops the run, and it can resume.
3. **Models.**
   - Frontmatter pins researchers and the gap reviewer to Opus and the verifier to Sonnet.
   - The lead passes a per-call model only:
     - to the critic (the family other than the lead's);
     - on the generic path, where every role is named per call.
   - Every return's first line gives the model that really ran. The lead records it and checks the rules:
     - verifier ≠ researchers, else `verifier: same model (degraded)`;
     - critic ≠ lead, else `critic: same model (degraded)`;
     - an "⚠ This agent switched to …" prefix is recorded as a fallback.
4. **Reported mode.** It goes in `run.md` and the report's first lines, and in a book also in `result.md` and the
   outline gate:

   ```
   mode: parallel | sequential      agents: plugin | generic | lead      wave: <n>
   verifier: <model> | same model (degraded) | lead (degraded)
   critic: <model> | same model (degraded) | none (quick)
   quote-match: exact | approximate (<k> sources)      caps: agent | prompt-only
   searches: <used>; limit hit: no | yes (stopped, resumable)
   ```

5. **Search limit.** Every brief says it: a WebSearch result carrying the session-limit notice means
   `failed: search-limit`, never "not found". The lead then stops loudly with the dossier kept and resumable after
   the refill or a raised cap (**OQ4**).
6. **Dynamic workflows are not used.** They are Claude-Code-only, removed from subagents [D] and off on Pro until
   turned on [D]. They are a possible later option for the single-document path.

### 4.3 Permissions and the preflight

- **Session posture.**
  - Interactive Claude Code defaults to auto mode (2.1.283 or later [D]), and the run needs nothing more there.
  - Manual mode and `-p` need allow rules.
  - Unattended bootstrap runs should use auto (or bypass).
- **The two-agent preflight (D0b) [I].** It runs on cheap per-call models:
  - agent A replies at once;
  - agent B does one WebSearch, one `curl` + converter call and one Write into the dossier, after A's notification.

  Then:
  - pass → run;
  - denied → stop with nothing written, report line 1 `FAILED: permissions`, and print the rules below;
  - an interactive Manual prompt → the operator's session-wide answer fixes it.
- **The rules a Manual session needs** (exact text printed by the skill; the command forms are fixed in the
  briefs):
  - `WebSearch`
  - `WebFetch` (or `WebFetch(domain:*)`)
  - `Bash(curl -sS --max-time 30:*)`
  - `Bash(python3 -I <abs tools dir>/pagetext.py:*)`
  - `Edit(//<abs state dir>/knowledge-kb/**)`

  The skill's own `allowed-tools` keeps its existing `curl -sS --max-time 30` prefix and adds the converter
  command, for the lead's own calls.
- **The book.** The bootstrap's payload `settings.json` allows Read, Edit, Write, Glob and Grep, but not WebFetch,
  WebSearch or `curl` [D]. The book needs auto mode, or those rules added in the host. The package documents this;
  it does not change the payload's allow list.

### 4.4 Dossier location and resume

- **Single document:** `${XDG_STATE_HOME:-~/.local/state}/knowledge-kb/explain/<YYYYMMDD-HHMM>-<slug>/`.
  - The S2 §3.1 layout, plus `briefs/` (generic path), `pages/` (fetched text, local only) and `report.md`.
  - The drafts move here from `/tmp/explain-<date>-<slug>/`, which a reboot clears.
  - Why here: beside the KB config (`$XDG_CONFIG_HOME/knowledge-kb/`), outside every repo, the same path on every
    host.
  - Not `${CLAUDE_PLUGIN_DATA}`: only the plugin has it.
  - Fallback: a D0b write probe; if it fails, use `<cwd>/.knowledge-explain/<run-id>/`, reported.
- **Resume:**
  - `run.md` holds the stage, the waves (dispatched, returned and failed ids), the models, the mode and the counts.
  - `/knowledge:explain resume [<run-id>]`, or the skill notices an unfinished run for the same subject and offers
    it.
  - A resumed run re-dispatches only the agents with no file.
  - The skill never deletes a dossier, and the report prints its path.
- **Book:** `works/phases/active/P<N>/book/research/`.
  - The same layout, with `summary.md`, the overlays and `trace-<key>.md`.
  - The orchestrator commits it with each slice, so a usage-limited `DECOMP` resumes from disk (the engine's
    protocol).
  - `pages/` stays out of git: the `DECOMP` writes a `.gitignore` there [I].
- **After a compaction.** Part A's first lines tell the lead to re-read `SKILL.md` (`${CLAUDE_SKILL_DIR}/SKILL.md`
  in Claude Code) and then `run.md` before acting. Only the first 5,000 tokens of a skill are re-attached [D].

### 4.5 Verbatim page text

- **Source of record:**

  ```
  curl -sS --max-time 30 -L -A "<ua>" -o <dossier>/pages/<id>.html <url>
  python3 -I <tools>/pagetext.py <html> <txt>
  ```

  - The converter is about 40 lines of standard-library `html.parser`. It skips `script`/`style`, puts a newline per
    block element and normalises whitespace.
  - It is written from Part B to `${XDG_STATE_HOME:-~/.local/state}/knowledge-kb/tools/` at D0b, if missing or if
    its hash differs.
  - PDFs: `pdftotext -layout` when installed.
  - Pages are saved as data in their own folder and read with `python3 -I`, never executed.
- **The verifier** re-fetches independently and string-matches with normalised whitespace, giving
  `quote-match: exact`.
- **Fallback:** WebFetch (a quote cap of 125 characters [T]; "lossy by design" [D]) or no converter means
  `quote-match: approximate` for that source, which the verifier checks by substance (S2 §3.8).
- **Wayback:** `curl` on `https://archive.org/wayback/available?url=<url>&timestamp=<YYYYMMDD>` (the documented
  API [D]). A 429 gets one retry after a pause, then `archive: unavailable`.
- **Codex:** the same commands with network access on.

### 4.6 The three copies and the parity guard

- **Canonical** `plugin/skills/explain/SKILL.md`:
  - **Part A**, the lead. Its first ~5k tokens are the core card: stages, `run.md`, re-read rule, modes.
  - **Part B**, an appendix with marked sections:
    - the web researcher, code researcher, gap reviewer, verifier and critic briefs;
    - the source ladder;
    - the converter source;
    - optionally the lint.
- **Portable** `.agents/skills/explain/SKILL.md`: the same body, frontmatter without `argument-hint` and
  `allowed-tools` (unchanged rule).
- **Landing** `web/public/SKILL.md`: a full-file byte copy (unchanged). It stays one file, so the signed landing is
  untouched.
- **Plugin agents:** the bodies are Part B extracts; frontmatter as in §4.1.
- **`skills_parity.py`** adds AGENTS (FAIL): the bodies equal the Part B sections, and the frontmatter carries no
  ignored or unsafe fields. Or a generator plus a regenerate-and-compare check. `plugin_parity.py` is unchanged.
- **The cost, stated.**
  - The file grows from 46.5 KB to about 85–90 KB (about 1,400 lines). The lead loads all of it.
  - It is already over the 500-line guideline [D].
  - Shrinking it is out of scope (intent: "moving the publish plumbing into the CLI and shrinking the skill" is
    later).

### 4.7 Plugin version

- `plugin.json` becomes **0.6.0**: a minor release, adding `agents/` and the research pipeline.
- `marketplace.json`'s source (`./plugin`) is unchanged.
- Users get it with `claude plugin update`. The docs say to "increment `version` on every release" [D].
- The bootstrap references require ≥ 0.6.0.
- The skill is located through `~/.claude/plugins/installed_plugins.json` (`installPath`, `version`) rather than
  the cache Glob, because `CLAUDE_CODE_PLUGIN_CACHE_DIR` can move the cache [D].
- `plugin/README.md` gains the agents, the permissions note, the dossier path and the modes.

### 4.8 The book suggestion flow

As in §2 Q9:

1. Detect the workspace.
2. Check the route's capability.
3. Propose: name, objective, fields.
4. On a literal yes, invoke `create-phase`. Its route accepts a confirmed proposal (**OQ3**).
5. Stop: the operator runs `/do-whole-phase`.

Outside a workspace, or with a too-old one, the skill says what is needed and offers a single document. Inside a
subagent or under `-p` it never asks: it writes the single document and reports the suggestion.

### 4.9 The bootstrap package (P31's pattern: `package/README.md`, `PATCHES.md`, a handoff)

Patches are anchored on text (headings and quoted sentences), never line numbers.

1. **`payload/claude/skills/create-phase/SKILL.md`, *The explain route*:**
   - the new fields;
   - `lang: en`, translations only when named;
   - plugin ≥ 0.6.0;
   - the "entered from `/knowledge:explain` with a confirmed proposal" paragraph.
2. **`do-whole-phase/reference/explain-decomposition.md`:**
   - research first (B1–B5) via the skill's book section;
   - the dossier at `book/research/`;
   - `summary.md`;
   - the outline gate linking it;
   - the freeze;
   - finding the skill via `installed_plugins.json`;
   - nested prompts start with `slice: <id>`, so `dispatch-summary` attributes them. Today it attributes by that
     prompt line or by time window; it does not read `parentAgentId` [D].
3. **`explain-chapter.md`:**
   - the top-up (B6) with the overlays and `trace-<key>.md`;
   - the critic as `knowledge:explain-critic` with S2's inputs.
4. **`explain-review.md`:** the optional "Sources and further reading" chapter from the book's ledger; check the
   indexes were not edited after the signature.
5. **`payload/claude/agents/slice-executor.md`:** the carve-out sentence next to the Explore-only rule, the
   `## Delegate reads` paragraph and the `## Never` bullet (**OQ2**). `sync-agents` carries it to both tiers.
6. **Remove `payload/claude/agents/explain-critic.md`:**
   - plus its entries in `installer/main.py` (the agent list, `NESTED_AGENTS`, the writer) and `installer/build.py`;
   - `installer/README.md`, `README.en.md` and `tests/retrofit_smoke.sh`;
   - an update step that deletes the host's installed copy;
   - rebuild `bootstrap_agentic_workspace.sh`.
7. **CHANGELOG and the version marker.** No contract edit: the contract has 10 bytes free and needs none.

**Before vs. after P42.**

- P42 touches `slice-executor.md` (`## In a wave`, the `notebook` verdict field) and `explain-decomposition.md`
  (drops `--depends-on`).
- Applied **after** P42 merges (v71), the package is v72. Its anchors avoid P42's new sections.
- Applied **before**, it is v70 or v71, depending on P40, and P42 rebases on it.
- Either way the explain phases stay sequential, so no wave rule is needed.
- The handoff names the anchors and both orders.

---

## 5. Hand-offs to DECOMP2

| Build piece | Trigger | Notes |
|---|---|---|
| Skill Part A: research stage D0–D9 and the book section, dispatch paths, the two-agent preflight, `run.md` and resume, modes report, search-limit rule, English default, the book suggestion | **high: open design + wide blast radius** (all three copies, every user) | Biggest piece; may split in two: research stage / suggestion + report |
| Part B texts + the five plugin agents (frontmatter §4.1) | **high: open design** (the brief, verifier and critic texts) | From S1 §3.6, S2 §3.5, §3.8, §3.10; P31's critic body minus `permissionMode` |
| Converter + Wayback + (optional) lint, as Part B blocks | low | Small; exact-match check in the rehearsal |
| `skills_parity.py` AGENTS check (or generator) + CI | low | Run both guards |
| Plugin 0.6.0, `plugin/README.md` | low | No push before the operator's word (Decisions) |
| Bootstrap package + handoff (§4.9) | **high: open design + blast radius** (bootstrap references, installer, agent removal); waits on OQ2, OQ3 | A file set like P31's |
| Rehearsals (qa) | — | S1 §3.13 and S2 §3.14, plus S3's checks: interactive-session permission behaviour (T3 ran in `-p` only); the two-agent preflight in Manual, auto and `-p`; state-dir writes under auto; the converter's exact-match rate; searches used per tier; whether nested spans are metered; effort and `maxTurns` values |

---

## 6. Sources

**Claude Code docs** (Anthropic, code.claude.com, `.md` pages; fetched 2026-10-22; undated; install 2.1.308):

- **H1 Subagents**, `/docs/en/sub-agents`.
  - "Interactive terminal session, VS Code, and desktop app sessions on your machine: to let Claude wait for a
    subagent, turn off fork mode, which is on by default."
  - "A background subagent's results reach Claude as a completion notification in a later turn."
  - "Background subagents surface every permission prompt in your main session."
  - "By default, when 20 subagents are running in a session, spawning another with the Agent tool fails with
    `Concurrent subagent limit reached`, and the error tells Claude not to retry."
  - "For security reasons, plugin subagents don't support the `hooks`, `mcpServers`, or `permissionMode`
    frontmatter fields."
  - `maxTurns`: "Claude Code returns its output marked as partial, and Claude can resume it".
  - `omitClaudeMd`: "Use it for subagents that take everything they need from the delegation prompt … Requires
    Claude Code v2.1.271 or later".
  - The model order: "1. The per-invocation `model` parameter 2. The subagent definition's `model` frontmatter …
    3. … `CLAUDE_CODE_SUBAGENT_MODEL` … 4. The main conversation's model".
  - Nested: "only the top-level subagent's summary returns to you, because a subagent that launches background
    subagents waits for their results before it finishes".
  - Removed tools include `AskUserQuestion` and `Workflow`.
- **H2 Plugins: components**, `/docs/en/plugins/components`.
  - "Ignored fields: `permissionMode`, `hooks`, `mcpServers`, and `initialPrompt`."
  - "Files in `bin/` at the plugin root are on the `PATH` of the Bash tool's shell while the plugin is enabled".
- **H3 Plugins: manifest reference**, `/docs/en/plugins/manifest-reference`: "Only `agent` and
  `subagentStatusLine` take effect; other keys are dropped at load."
- **H4 Plugins: publish**, `/docs/en/plugins/publish`: "Either increment `version` on every release, or omit it in
  a git-hosted marketplace".
- **H5 Skills**, `/docs/en/skills`.
  - `allowed-tools`: "during the turn that invokes this skill. The grant clears when you send your next message";
    "It does not restrict which tools are available".
  - "re-attaches the most recent invocation of each skill after the summary, keeping the first 5,000 tokens of
    each".
  - `${CLAUDE_SKILL_DIR}`: "For plugin skills, this is the skill's subdirectory within the plugin".
  - "Unexpected key(s) in SKILL.md frontmatter: argument-hint."
- **H6 Permission modes**, `/docs/en/permission-modes`.
  - "`claude -p` and Agent SDK runs with no permission mode set start in Manual mode … Calls needing approval are
    denied".
  - The built-in default is "`auto` with Claude Code v2.1.283 or later" in a terminal.
  - "the action doesn't run and Claude keeps working. Claude Code doesn't stop the run."
  - "Any `permissionMode` in the subagent's frontmatter is ignored."
- **H7 Permissions**, `/docs/en/permissions`: "`//path` | Absolute path from filesystem root".
- **H8 Tools reference**, `/docs/en/tools-reference`.
  - "This makes WebFetch lossy by design … use `curl` via Bash for the unprocessed page."
  - "An interactive terminal session has a limit of 200 WebSearch calls. Searches from the main conversation and
    from subagents … count against the same limit."
  - "searches appear in the conversation as calls that did nothing".
  - The limit "refills at about 100 calls per hour"; in `-p` "the limit applies per turn".
- **H9 Environment variables**, `/docs/en/env-vars`: `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`, "default: 200 …
  the cap can be raised but not turned off".
- **H10 Headless**, `/docs/en/headless`: "With Claude Code v2.1.302 or later, `claude -p` runs start in Manual mode
  when nothing sets a permission mode".
- **H11 Workflows**, `/docs/en/workflows`: "Dynamic workflows are available on all paid plans … On Pro, turn them
  on from the Dynamic workflows row in `/config`."
- Also opened, as background: `plugins`, `plugins/loading` (local-path marketplaces load in place), `settings`,
  `model-config` (the aliases) and `cli-reference`.

**Codex docs** (OpenAI, learn.chatgpt.com, redirected from developers.openai.com/codex; fetched 2026-10-22;
undated):

- **C1** `/docs/build-skills.md`: the skill locations (`.agents/skills` from the working directory up to the repo
  root, `$HOME/.agents/skills`), `scripts/`, `references/`, `assets/`, `agents/openai.yaml`.
- **C2** `/docs/agent-configuration/subagents.md`.
  - "Current local Codex releases delegate when you ask directly or when applicable `AGENTS.md` or skill
    instructions request it."
  - "Codex waits until all requested results are available".
  - "In non-interactive flows, or whenever a run can't surface a fresh approval, an action that needs new approval
    fails and Codex surfaces the error back to the parent workflow."
  - "Subagents inherit the parent turn's current sandbox and approval settings … A custom agent file can't replace
    those settings."
  - `agents.max_concurrent_threads_per_session`.
- **C3** `/docs/config-file/config-reference.md`.
  - `web_search`: "default: `"cached"`; cached uses an OpenAI-maintained index without external web access".
  - `sandbox_workspace_write.network_access`: "Allow outbound network access inside the workspace-write sandbox."
- **C4** `/docs/agent-configuration/agents-md.md`: opened for the `AGENTS.md` loading order; not relied on beyond C2.

**Agent Skills** (agentskills.io; fetched 2026-10-22; undated):

- **K1** `/specification`: `scripts/`, `references/`, `assets/`; "Keep your main SKILL.md under 500 lines";
  `allowed-tools` "Experimental".
- **K2** `/adding-skills-support`: the `.agents/skills/` paths "have emerged as a widely-adopted convention".
- **K3** `/clients`: the 46-client showcase. The names were read from the page's data, because the page renders
  with JavaScript.

**Hosts** (fetched 2026-10-22; undated):

- **G1** geminicli.com/docs/cli/skills: "Workspace skills: Located in `.gemini/skills/` or the `.agents/skills/`
  alias."
- **G2** geminicli.com/docs/core/subagents: "`timeout_mins` … Defaults to 10"; "`max_turns` … Defaults to 30".
- **U1** cursor.com/docs/skills: `.agents/skills/` at project level.
- **U2** cursor.com/docs/subagents: "Launch multiple subagents simultaneously."
- **V1** code.visualstudio.com/docs/agent-customization/agent-skills: `.agents/skills/` among the project skill
  folders.
- **V2** code.visualstudio.com/docs/agents/run/subagents.
  - "Explicit and agent-configured model selections are checked against the main model's cost tier."
  - "Local subagents cannot invoke further subagents by default."
- **O1** opencode.ai/docs/skills: "Project agent-compatible: `.agents/skills/<name>/SKILL.md`".
- **O2** opencode.ai/docs/agents: "Use this to run multiple units of work in parallel."
- **W1** Internet Archive, "Wayback Machine APIs" (archive.org/help/wayback_api.php): "`http://archive.org/wayback/available?url=example.com`".
  The API itself was called: 429 once, then 200 JSON.

**Local files, read-only:**

- This repo: the three skill copies; `scripts/skills_parity.py`, `scripts/plugin_parity.py`; `plugin.json`
  (0.5.0); `marketplace.json`; `plugin-ci.yml`; `plugin/skills/setup/SKILL.md` (the `render.py` precedent); the
  landing's `content.ts`, line 266; `works/.workspace-version.json` (v61).
- The bootstrap at `64b2d6f` (v69):
  - `payload/claude/skills/create-phase/SKILL.md` (the header and *The explain route*);
  - `do-whole-phase/reference/explain-*.md`;
  - `payload/claude/agents/explain-critic.md`, `slice-executor.md`;
  - `payload/claude/settings.json`;
  - `payload/contract.md` (size);
  - `installer/main.py` (`resolve_layout`, `NESTED_AGENTS`), `installer/build.py`;
  - `payload/scripts/workflow.py` (the nested marker schema, the `dispatch-summary` span reader);
  - the skills' `disable-model-invocation` flags.
- P42 in the worktree `.claude/worktrees/run-loop`: intent and Decisions.

### Not opened

None. Every page cited here loaded within two tries.

### Open questions

1. The interactive-session behaviour of the allow grant and of background prompts was documented, not tested. T3
   ran under `-p`. A rehearsal check.
2. Does the two-agent preflight reliably land B's calls after A's notification on every host? Timing-dependent [I].
3. Codex: how to detect a cached-only `web_search` from inside a run. Today the skill can only state the
   requirement.
4. The `~` form inside Bash and Edit rules for the converter command. The build fixes the exact command and its
   rule text, and tests them.
5. `dispatch-summary`'s route for `knowledge:*` agent types (unknown to its agent map), and the attribution of
   nested spans. Their `.meta.json` carries `parentAgentId` [T]; the engine does not read it.
6. The chapter-lead tier: chapters are cut `--risk low` (the mid row) today, but S1 makes the lead the only writer,
   on Opus for quality. DECOMP2 or the package decides. It is a routing choice, not an operator question.
7. Size of a committed book dossier, which holds verbatim passages of third-party pages in the workspace's git.
   Decided as drawn: commit everything but `pages/`.
