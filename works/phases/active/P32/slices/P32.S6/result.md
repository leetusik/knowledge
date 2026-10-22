# P32.S6 result

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Finished Part A of the explain skill in all three copies:
  - D6, the final outline;
  - D7, writing alone from the dossier with `trace.md`;
  - D8, check, a critic on the other family, one confirm pass and one revision;
  - a publish that runs only on printed rules (`pagetext.py --payload`);
  - D9, the report;
  - the book section, §9.1 suggestion, §9.2 whole-book research and §9.3 a chapter's top-up.

  Also: plugin 0.6.0, a new README, and both descriptions. Two live `claude -p` runs published to a scratch API for $6.93. A `quick` run on a book request asked nothing and reported the proposal, and a `no-research` run went through the critic. The runs led to four fixes (d52). One run read the operator's real config, which is OQ6.
- **files_changed:**
  - `plugin/skills/explain/SKILL.md`
  - `.agents/skills/explain/SKILL.md`
  - `web/public/SKILL.md`
  - `plugin/agents/{web-researcher,code-researcher,gap-reviewer,verifier,explain-critic}.md`, regenerated from Part B (B6's no-`$` rule)
  - `plugin/.claude-plugin/plugin.json` (0.6.0)
  - `plugin/README.md`
  - `works/phases/active/P32/phase.md`: Decisions, Doc impact, Operator Questions, Notes, Now
  - `works/phases/active/P32/topics/build-decisions.md` (new)
  - this `result.md`
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS (body, web byte copy, 5 agents match Part B)
  - `python3 scripts/plugin_parity.py`: PASS
  - `claude plugin validate plugin`: passed
  - two live `claude -p --plugin-dir plugin` runs, end to end, to a scratch stack on :8803, which is now stopped: both published
  - `git diff --stat`: in scope
  - `python3 scripts/workflow.py validate`: passed (only pre-existing warnings)
- **deviations:**
  1. The generic critic brief is `<DOSSIER>/briefs/explain-critic.md`, B0's naming, not the plan's `briefs/critic.md`.
  2. The critic's scratch is `<DOSSIER>/critic`, not `mktemp -d`, because a mktemp folder is outside §3.2's Read and Edit rules.
  3. The publish payload comes from `pagetext.py --payload`, a new B12 mode the converter's existing rule already covers, instead of a printed `python3 -c` rule that would allow any Python. B12 is not in any agent's `with=` list, so the agents are unchanged by this.
  4. The book stages are named §9.2 and §9.3, not "B1–B6", which would collide with Part B's numbers.
  5. Four small edits outside S6's own sections, each forced by what the plan's live runs showed (d52):
     - B6: no `$` in a command; the agents were regenerated;
     - §2: run the resolver verbatim, never open a config file, never put `$VAR` in a command;
     - §3.6 step 6: the merge checklist names `outline.md`;
     - §5: never set the token on the CLI's command line.
  6. The skill is 147,586 B, ≈ 2.6 KB above OQ5's band. This is reported in `## Now`.
  7. A second, `no-research` run on a Sonnet lead was added to exercise D8, which `quick` skips. It was given a `--max-budget-usd 4.6` backstop, well above its real cost of $1.94.
- **doc_impact:** appended to `## Doc impact`:
  - product.md: writing from the dossier, the critic, the report, the book suggestion, plugin 0.6.0;
  - operations.md: the printed rules gain `knowledge --version` and `Read(/<SKILL_DIR>/**)` and cover the publish; no `$`; the README documents the rules, modes, agents and search cap;
  - architecture.md: SKILL.md §9's book procedure, `pagetext.py --payload`, §2's resolver as the only config reader.

---

## What was built

All of it is in the canonical file, synced byte for byte to the web copy, and with the portable frontmatter in `.agents/`:

- **The card:** the D6–D9 table becomes four rows: D6 final outline, D7 write, D8 check/critic/revise/publish, D9 report. The stop rules name `STOPPED: critic`, `STOPPED: check` and `FAILED: publish`. Only §9.1's book question and §5's 409 are ever asked, and only interactively. `no-research` still runs the critic.
- **§1:** a request for a whole book goes to §9.1 first. `book=<slug>`, one chapter in a book, does not count.
- **§3.2:** the printed rules cover the publish and add `Bash(knowledge --version)` and `Read(/<SKILL_DIR>/**)`, because the critic reads the skill.
- **§3.3:** the `critic:` mode line.
- **§3.4:** D1's size test against §9.1.
- **§3.10 D6:** `outline.md` is rewritten once, in §4.2's order, with:
  - claim ids and their statuses;
  - code ranges;
  - declared gaps from `gaps/final.md`;
  - diagrams with their claims;
  - a quiz of ≈ 5 items, only on `supported` claims.
  
  `run.md` gets `D6: sections · claims · quiz`.
- **§4 D7:** the lead writes alone, section by section. For each section it loads only that section's entries and code ranges, and writes its lines in `trace.md` before starting the next. The rules:
  - no fact without a claim id or a code range (`user` under `no-research`);
  - each sentence says what its claim says, per B8;
  - a declared gap is stated or dropped;
  - a writer gap gets one top-up inside the caps, otherwise it is stated as open or dropped;
  - the coherence pass adds no fact.
  
  Also: §4.2 item 4 and §4.5 now apply on every run but `no-research`, with every claim cited. §4.6 lists only `library.md` sources. §4.9 gives the CLI form and `STOPPED: check`.
- **§4.10 D8:**
  - `quick` goes straight to publish.
  - Otherwise B5 runs on a per-call model of the other family: `sonnet` for an Opus lead, `opus` for any other lead.
  - The dispatch block names `draft`, `critique`, `dossier`, `skill`, `scratch` and `writer_model`. The degraded paths are covered.
  - The lead answers in `run.md` `## Critique`.
  - At most one must-fix may be disputed, through one confirm pass.
  - Then one revision, §4.8–§4.9 again, and no second critique.
- **§5:** the payload comes from `pagetext.py --payload`. Refusals end in `FAILED: publish`, and a 409 with nobody to ask fails. §5.1 and §6 were tightened.
- **§8 D9:** `report.md` carries eight items and sets `state: done`.
- **§9:**
  - §9.1, the suggestion: triggers, detection of a nested or root workspace, the readiness marker, the proposal block, asking only interactively, a literal yes → `create-phase`, then stop.
  - §9.2, whole-book research: `book/research/`, `pages/.gitignore`, steps 1–7, `summary.md`, the freeze.
  - §9.3, a chapter: `run-ch<k>.md`, a gap check at `after round: 0`, a top-up of 0–3 researchers with a ceiling of 5, overlays, the chapter's gate, `outline-ch<k>.md`, `trace-<key>.md`, and the critic with `kind: chapter` writing `book/critique/<key>.md`.
- **B12:** `--payload <meta.json> <body.md> <payload.json> [name|type|path …]`, tested offline with and without images.
- **Release plumbing:**
  - `plugin.json` is now 0.6.0. It is the only version field; nothing mirrors it.
  - The README has new sections: modes and flags, the dossier path, the five agents table, and permissions with the preflight's exact rules plus the search cap (`CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION`, raised in the user's settings `env`; the skill never changes settings). The release checklist adds `skills_parity.py`.
  - Both frontmatters have the new description (905 characters).

**Decision recorded: `no-research` runs the critic.** The critic is not research. P31's critic ran on repo-only chapters. B5 already handles `no-research`.

## Live runs (`claude -p --plugin-dir plugin`, scratch env)

**Setup:**
- Scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT=<scratch>/kb`, `KB_API_BASE_URL=http://127.0.0.1:8803` and `KB_API_TOKEN=s6-token`. §2's resolver was run first with the same env. It printed the scratch KB_ROOT, `:8803` and `KB_EXPLAIN_STATE` under the scratch state dir.
- The scratch stack was `uvicorn server.main:app` on 127.0.0.1:8803 (my PID 77355) with a fresh `KB_ROOT` git repo. There was no Gemini key and no push. It is now stopped and the port is free.
- Every run passed `--setting-sources project --permission-mode manual --no-session-persistence` and the 19 printed rules with real `//` paths. `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION=150` was set on the command line only.
- The working folder was a fake "ready" workspace: a stub `scripts/workflow.py`, `works/.workspace-version.json` at v72, and a stub create-phase skill carrying `## The explain route` and `must-cover`.

| Run | Lead | Request | Outcome | Cost |
|---|---|---|---|---|
| 1 | opus | `write a short book, three chapters, on the HTTP Retry-After header … quick` | asked nothing; preflight ok; 7 sources, 22 claims, all 30 passages `--check`-exact; **FAILED: permissions** at D3v (the verifier's `grep -n -A9 -E "…$"` was denied) | $2.4802 |
| probes | haiku | which `grep` forms a `Read` rule lets run | any `$` in a command, even single-quoted, "requires approval"; `grep -x` works → B6 fix | $0.0058 |
| 1b | opus | `resume 20261023-0303-http-retry-after-header` | preflight again; verifier re-dispatched (15 supported, 1 partial) → D5s → `gaps/final.md` → D5g pass (must-cover 3/3, load-bearing 6/6) → D6 → D7 → check failed once on YAML, fixed → **published** v1 to :8803 → `report.md` with the book proposal | $2.5054 |
| 2 | sonnet | `how retry.py in this repo decides how long to wait between attempts no-research` (a scratch git repo) | the critic went to `knowledge:explain-critic` with `model: opus` and wrote `critique.md` (Opus critic on a Sonnet writer, `revise`: 3 must-fix ledger findings, 6 should-fix); one revision; check passed; **published** v1 | $1.9358 |
| **total** | | | | **$6.93 of $10** |

**The checks the plan asked for:**
- **Asked nothing, and reported the suggestion.** Yes. AskUserQuestion is absent under `-p`. Both of run 1's reports carry the proposal (name, objective, every `## Explain` field) with the reason. The stub create-phase was never invoked.
- **`gaps/final.md` per §3.8.** Written in the `# Final gaps: … · stop: … · gap rounds: …` header form, with a disposition on each line. It also has one extra summary line.
- **`library.md` and `outline.md` refreshed after each merge.** `library.md` and `ledger.md`: yes. `outline.md`: **no** at the first merge, so I fixed §3.6's checklist. The D6 rewrite then landed: 7 sections, 22 claims, quiz 6, all quiz claims `supported`. It still holds one unfilled `<…>` placeholder on a partial claim's line.
- **B6's one form per call.**
  - Agents: the verifier's `$` pattern was denied, and B6 is now fixed. On resume the verifier used plain `grep -n '…'` and Read.
  - Opus lead: tried `KB_API_TOKEN=… knowledge … check` once (denied), then the plain form. §5 is now fixed.
  - Sonnet lead: `curl … "$KB_API_TOKEN"` was denied, and a `python3 -I -c` that ran the repository's code was denied.
- **Publish.** Both runs used the `knowledge` CLI, and both documents are in the scratch KB, commits `00602e5` and `6ceaf05`. Nothing went anywhere else: no tool call named `knowledge.hi2vi.com`.

**Run 1b's dossier shape:**
- `brief.md`, `plan.md`, `run.md` (state `done`, a full mode block, log, models, `## Resume`)
- `findings/` with `r1-spec.md` and `r1-practice.md`
- `pages/` with 7 sources, plus the verifier's `r1-b1/` copies
- `library.md` (7 sources), `ledger.md` (22 claims)
- `verify/r1-b1.md`
- `gaps/final.md`
- `outline.md` (D6), `body.md` (243 lines: Background, Intuition, three parts, a cited Best practices section, a 6-item quiz, sources), `trace.md` (51 lines)
- `report.md`: §8's items in order, with the book suggestion last

Run 2's dossier holds only `brief.md`, `run.md`, `body.md`, `trace.md`, `critique.md` and `report.md`.

**Sonnet-lead gaps, left for S7:**
- no D6 `outline.md`;
- no `## Critique` answers in `run.md`;
- `run.md` still `state: running`;
- the report kept 3 of the 8 items.

**Incident (OQ6).** In run 2, the Sonnet lead rewrote §2's resolver to print `KB_API_TOKEN=set` instead of the value. It then could not authenticate its `$KB_API_TOKEN` curl, which was denied, so it opened the operator's real `~/.config/knowledge-kb/config.json` with Read. Read was not denied there. That put the production token (knowledge.hi2vi.com) into the session's context. The lead said it did not use it, and it published to :8803 with the env token. Nothing touched production. The session was not persisted. I redacted the token in my scratch transcript (`run2.jsonl`), and it appears nowhere in this repo. Fixes:
- §2 now says to run the resolver exactly as written, that it is the only reader of the config, never to open a `config.json`, and never to put `$VAR` in a command.
- The S7 note asks for `--disallowedTools "Read(//Users/sugang/.config/knowledge-kb/**)"` on every rehearsal run.

Whether to rotate the token is the operator's call (OQ6).

## Not proven live (handed to S7 and S9 in Notes)

- `full`'s critic with a confirm pass, and the `STOPPED: critic` and `STOPPED: check` paths.
- `FAILED: publish`.
- The curl publish through `pagetext.py --payload`. It was tested offline; both leads chose the CLI.
- The suggestion's interactive ask and the literal yes → `create-phase`. This needs a session with AskUserQuestion: the walkthrough.
- §9.2–§9.3, which S9 rehearses.
- The `quick` verifier's same-model case for a Sonnet lead (§3.9, S5's text): recorded for S7, not changed.

## The skill's size

| | bytes |
|---|---|
| S5 (HEAD) canonical | 135,285 |
| S6 canonical and web | **147,586** |
| S6 portable `.agents` | 146,960 |

The file is ≈ 2.6 KB above OQ5's accepted 125–145 KB band.

**Added:**
- §9: +6.05 KB (§9.1 2.5, §9.2 2.2, §9.3 1.3)
- §4.10: +1.9
- §8: +1.7 (replacing 2.0)
- §4's D7 rules: +1.3
- §3.10: +1.2
- B12 `--payload`: +0.9
- the card: +0.7
- frontmatter description: +0.26
- §1, §2, §3.2, §3.4, §3.6, §4.5, §4.6, §4.9 and B6: ≈ +1.2 in all

**Trimmed:**
- old §8: −2.0
- §5: −0.4
- §5.1: −0.4
- §6: −0.3

## Notebook

- `## Decisions` was 21 KB. It is moved verbatim into `topics/build-decisions.md` as d01–d44, with d34 amended. `phase.md` keeps one line per decision with its `dNN`. S6 added d45–d52: writing, D8, publish rules, D9, the book section, the suggestion, size, and the run fixes. No decision was dropped.
- `## Notes`: removed the S6 entry and the S4 and S5 notes for S6. Added `(from P32.S6, for P32.S7)` (run findings, config isolation, what is unproven) and `(from P32.S6, for P32.S8)` (§9's names and paths, and the create-phase readiness contract).
- `## Operator Questions`: OQ6, whether to rotate the token.
- `## Doc impact`: three lines.
- `## Now`: rewritten.
- `phase.md` is 34.2 KB, under budget.

## Validate

`python3 scripts/workflow.py validate` → "Workflow validation passed." It printed only pre-existing warnings: P26's legacy `kind: knowledge` slices, P28/P30/P31 consolidation debt, stale docs, and oversized doc sections. None of them comes from P32.S6.
