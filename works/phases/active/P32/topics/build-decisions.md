# P32 decisions, in full

_Moved verbatim from `phase.md` `## Decisions` at P32.S6, when the notebook reached its 40 KB budget. Each
`## dNN` entry is one decision as it stood then; `phase.md` keeps one line per decision, naming its `dNN`.
A decision superseded later is replaced in both places. Links are relative to this folder._

## d01 · Cut (DECOMP, then DECOMP2)

**Cut (DECOMP, then DECOMP2).** Research first, unattended (S1 orchestration, S2 evidence, S3 hosts and delivery), then the build in `## Slices` order: S4 Part B, the agents, the AGENTS check → S5 Part A's research stage D0–D5g → S6 writing D6–D9, the critic, the book section and suggestion, 0.6.0, README → S7 rehearsal 1 → S8 the bootstrap package → S9 rehearsal 2 → S10 the handoff (docs, low) → REVIEW (gate required); S4–S9 high (open design, wide blast radius; S7 and S9 also unlocated root cause). Why: Part B fixes each role's brief and output format, which Part A's lead consumes; Part A splits at the evidence gate; S8 waits for S7's fixes to the text it cites, S10 for S9's lessons. Specs: `## Notes for later slices`.

## d02 · Estimate (DECOMP; revised at DECOMP2)

**Estimate (DECOMP; revised at DECOMP2).** Spent through S3 ≈ $46, ≈ 1.9 span-h. To go: S4–S6 and S8 ≈ $15–20 each (an 85–90 KB file in three copies at xhigh, above the high row's $6.90 mean); S7 + S9 ≈ $90–140 with their `claude -p` runs; S10 ≈ $2–5; review ≈ $12–20: **≈ $165–245 and ≈ 7–8.5 span-h to go, the phase ≈ $210–290** (≈ $215–285 approved with DECOMP2's plan). `claude -p` caps, from each run's `total_cost_usd`: S4 ≤ $2, S5 ≤ $10, S6 ≤ $10, S7 ≤ $80, S9 ≤ $45; at a cap → `needs_operator`. No other spend; no deploy.

## d03 · Research and high rows at xhigh (DECOMP, operator-approved with the plan)

**Research and high rows at xhigh (DECOMP, operator-approved with the plan):** `executors.toml` `[claude.research] effort = "xhigh"` and `[claude.high] effort = "xhigh"`, applied by the orchestrator with `sync-agents`. Durable; reverted after P32 only on the operator's word.

## d04 · English by default, everywhere (DECOMP, from intent)

**English by default, everywhere (DECOMP, from intent):** a single document, every chapter of a book, and the research notes and dossier are written in English whatever language the request is in; a Korean (or other) version only when the operator asks; a book asks for no translation unless the operator names one. This replaces the skill's §1 rule "use the language the user is writing in".

## d05 · Acceptance gate `--require` (DECOMP, decided as drawn)

**Acceptance gate `--require` (DECOMP, decided as drawn):** the skill's output is what the operator sees and uses; the orchestrator runs `accept-gate P32 --require`.

## d06 · Nothing reaches users from a slice (DECOMP, decided as drawn)

**Nothing reaches users from a slice (DECOMP, decided as drawn):** no slice publishes to production; a plugin release reaches users only when pushed, which waits for the operator's word. This repo's stale vendored `.claude/skills/explain` copy is not P32's and stays untouched.

## d07 · Research stage, single document (S1, [topic](topics/research-method.md) §3.2)

**Research stage, single document (S1, [topic](research-method.md) §3.2):** brief (no questions asked) → preflight → plan (questions incl. expert expectations, skeleton, tier, one owning angle per question) → wave 1 → merge into an evidence-mapped outline → up to 3 gap rounds, each merge verified → final verification with counter-evidence → evidence gate → final outline → **the lead writes alone**, section by section, from claim ids loaded just in time → `knowledge check` → critic (S2) → one revision → publish → report.

## d08 · Research stage, book (S1, §3.3)

**Research stage, book (S1, §3.3):** the same stages over the whole book before any outline (≤ 10 researchers per wave, run ceiling 45) → outline from research + a research summary (key sources, open disagreements, weak spots, gaps open at the cap) at the outline signature → per chapter: a top-up (gap check of its outline entry against the shared ledger, 0–3 researchers, 1 round + 1 follow-up, ceiling 5) appending to the shared library → write.

## d09 · Roles and models (S1, §3.1)

**Roles and models (S1, §3.1):** lead = planner, merger and the only writer; one fresh-context researcher per angle (Opus; web researchers get no repo secrets, code researchers get no web); a fresh-context gap reviewer per round (Opus, reads only); verifier (Sonnet, fresh context, sees only claim and source entries) and critic (a model different from the writer's): see S2's lines below.

## d10 · Angles and team size (S1, §3.4–3.5)

**Angles and team size (S1, §3.4–3.5):** the intent's six general angles plus, for a codebase, the code in real order, the history behind it, how others solve it, each with not-yours boundaries; the tier is the highest of ResearchRubrics' breadth / nesting / exploration axes: wave 1 = 3 / 5–6 / 7–10, never more than 10 per wave; run ceilings 12 / 18 / 25 dispatches; per web researcher target/hard cap 8–12/20, 10–20/30, 15–25/40 tool calls (code researchers double).

## d11 · Part B (S4; briefs per S1 §3.6)

**Part B (S4; briefs per S1 §3.6):** the role briefs live in SKILL.md Part B (after §8; one pointer line in §3): B0 how the lead uses it; B1–B5 the web-researcher, code-researcher, gap-reviewer, verifier and critic sections; B6–B11 shared (rules, ladder, bar, dossier formats, search, exact page text and archives); B12 the converter. Each block sits between `<!-- part-b:begin <name>[ with=<a>,…] -->` and `<!-- part-b:end <name> -->` lines; a role's brief = its extract, then the `with=` extracts in order, one blank line apart; that brief is, byte for byte, the body of `plugin/agents/<name>.md` and of the generic path's `briefs/<name>.md`. `skills_parity.py` AGENTS (FAIL) checks it; `--write-agents` regenerates the bodies, keeping the frontmatter. Each role's dispatch fields are a fenced block in its section; the verifier reads claim and source entries by id itself (no lead copying).

## d12 · Gap rounds and the cap (S1, §3.8)

**Gap rounds and the cap (S1, §3.8):** the gap reviewer asks expert / reader / evidence / unused / must-cover against the evidence-mapped outline; a round runs only for load-bearing gaps; stop on `complete`, `stalled` (a round closed none) or the cap of **3 gap rounds** (chapter top-up: 1 + 1); a capped or stalled run declares every open gap in `run.md`, `gaps/final.md`, the report's first lines, the chapter text (stated or dropped, never asserted) and, in a book, the research summary; a must-cover item still open at the cap stops a single document before writing (S2's evidence gate, below).

## d13 · Loud failure, orchestration side (S1, §3.9, §3.12)

**Loud failure, orchestration side (S1, §3.9, §3.12):** a preflight search and fetch that fails twice stops the run with nothing written; a load-bearing angle failing twice stops it, resumable from `run.md`; overflow is queued, never dropped; no silent stop on an exception and never a truncated dossier. This replaces SKILL.md §3's judgment gate and `skipped-offline`.

## d14 · `quick` (S1, §3.11)

**`quick` (S1, §3.11):** the lead researches alone (target 20, hard cap 40 tool calls) into the same dossier, with one self coverage check and no gap rounds and no critic; it keeps the brief, the plan, the preflight and loud failure, English, open-every-page, and one verifier batch on load-bearing claims (S2, below); the report says `quick`.

## d15 · Rehearsal rubric draft (S1, §3.13)

**Rehearsal rubric draft (S1, §3.13):** per subject, hand-written before either arm runs: must-cover (mandatory), expert-expectation (optional) and trap (negative) points; binary checks (coverage, citation accuracy on 15 re-opened statements, source quality, code truth, instructions, declared gaps, length guard); pairwise Helpfulness / Comprehensiveness / Insight / Readability judged twice with positions swapped; the operator reads one subject; process metrics reported.

## d16 · Dossier files and ids (S2, [topic](topics/research-evidence.md) §3.1–3.4; text: Part B B9)

**Dossier files and ids (S2, [topic](research-evidence.md) §3.1–3.4; text: Part B B9):** fragments plus lead-written indexes. A researcher's findings file (sources with verbatim passages and locators, molecular claims) is never edited after its return; the lead alone writes `library.md` and `ledger.md`, indexes pointing at entries by id; verifiers write their own `verify/` files; one writer per file, no passage retyped. Ids are stable and namespaced, duplicates keep the first id, counts never fall. A code claim cites `path:La-Lb@commit` with a verbatim excerpt and its hash. Book: the indexes freeze at the outline signature; each chapter writes `library-ch<k>.md` and `ledger-ch<k>.md` overlays.

## d17 · Source ladder and independence (S2 §3.5; text: B7)

**Source ladder and independence (S2 §3.5; text: B7):** the rung is set per (source, claim) pair: 1 primary, descriptive claims only; 2 independent secondary, needed for interpretation, evaluation, comparison and consensus; 3 a pointer, never support. Six credibility tests, done off the page. Independent = different owners, neither derives from the other, different upstreams (wire copies count once).

## d18 · Support bar and states (S2 §3.6; text: B8)

**Support bar and states (S2 §3.6; text: B8):** load-bearing descriptive: one verified rung-1 source; evaluative in the chapter's own voice: two independent rung-2; exceptional: two independent. Claim statuses `candidate` → `supported` / `partial` / `contested` / `unsupported` / `contradicted`, set by the lead from verify files; question states `answered` / `contested` / `thin` / `not found` (+ `not searched`, S4).

## d19 · Claim rule and trace (S2, §3.7)

**Claim rule and trace (S2, §3.7):** every checkable chapter sentence (quiz keys, `explain`s and facts in diagrams included) maps to a claim id or a code range. Claims are molecular: standalone, with the modifiers they need. The writer keeps `trace.md`, because the chapter itself may not carry HTML comments.

## d20 · Verifier (S2 §3.8; brief: B4)

**Verifier (S2 §3.8; brief: B4):** after every merge on load-bearing claims (a failure becomes an evidence gap inside S1's cap), then a final pass on every mapped claim before the final outline; at most one re-verification per claim. A model other than the researchers' (Sonnet for Opus), fresh context, only the claim and source entries; an open question before reading the quote, the passage found verbatim at its locator, an item-by-item compare, a strict label. Degraded modes reported.

## d21 · Counter-evidence and disagreements (S2, §3.9)

**Counter-evidence and disagreements (S2, §3.9):** on the main claims at D5: two neutral queries against the claim, one currency query and a lateral read (about 3 searches and 3 fetches). A counter-source counts only with a quoted passage. Disagreements become `D-…` entries (both sides, nature, prominence, what would settle it) and the lead never settles one. The chapter attributes contested views and never makes them a quiz key or a fact in a diagram.

## d22 · Critic (S2 §3.10; brief: B5)

**Critic (S2 §3.10; brief: B5):** P31's rubric kept whole, plus S2's inputs (brief, plan questions, ledger, library, `gaps/final.md`, trace) and two categories: `ledger` (untraceable, unfaithful, beyond its status, citation precision; load-bearing passages re-opened, the rest sampled) and `coverage` (a missing load-bearing question or must-cover item, or a dishonoured declared gap, is a must-fix). A model other than the writer's.

## d23 · Evidence gate (S2, §3.11)

**Evidence gate (S2, §3.11):** checked before writing. Every must-cover item must be answered or contested, and at least two-thirds of the load-bearing questions answered or contested (extrapolated, a rehearsal candidate); otherwise a single document stops with the dossier kept, and a book lists weak spots at the signature. A below-bar load-bearing claim may only be written hedged and attributed. A verifier or critic dispatch failing twice stops the run.

## d24 · `quick` and the rehearsal judge (S2, §3.13–3.14)

**`quick` and the rehearsal judge (S2, §3.13–3.14):** `quick` keeps the dossier, the ladder, the bar, the gate, the trace and one verifier batch on load-bearing claims, and drops counter-evidence and the critic. In the rehearsal both arms' writers run on one model (Opus) and the judge on Sonnet, twice with positions swapped; R3 and R4 also read the trace and the ledger.

## d25 · (operator, 2026-10-22)

**(operator, 2026-10-22)** OQ1 answered: keep `no-research` as an explicit operator-only opt-out, labelled in the report; failed web research still stops loudly. And a book starts from a suggestion: `/knowledge:explain` proposes the explain phase (name, objective, every `## Explain` field), creates it through the explain route on the operator's yes and stops; the operator runs it with `/do-whole-phase`; outside a workflow workspace it offers a single document. (`intent.md`, Clarifications)

## d26 · Agents ship in the plugin (S3 §4.1; landed in S4)

**Agents ship in the plugin (S3 §4.1; landed in S4):** `plugin/agents/` holds `web-researcher` (opus/high, 40 turns), `code-researcher` (opus/high, 80, reads CLAUDE.md), `gap-reviewer` (opus/xhigh, 30 turns and Bash since S7's fix 3, d53), `verifier` (sonnet/high, 40) and `explain-critic` (sonnet/xhigh, 60), tools per S3 §4.1 plus `Grep` for the web researcher (to read saved pages); invoked as `knowledge:<name>` (a `-p --plugin-dir` smoke lists all five). Frontmatter only name, description, model, effort, tools, maxTurns, omitClaudeMd; never `permissionMode` (ignored by plugins; it got `claude plugin validate` blocked), `hooks`, `mcpServers` or `Agent`/`Task`. `tools` really restricts (tested); no field limits Write or Bash to a path, so B6 carries that rule.

## d27 · Dispatch (S3, §4.2)

**Dispatch (S3, §4.2):** each wave goes out as one message of Agent calls, and the lead merges only when every dispatched agent has returned (interactive sessions get the reports in later turns; under `-p` the lead can wait). Wave size 10 on Claude Code (cap 20 concurrent), 6 elsewhere; overflow queued. Three paths: plugin agents, generic subagents given `<dossier>/briefs/<role>.md`, or sequential; the path and every degraded mode go in `run.md` and the report's first lines. Dynamic workflows are not used.

## d28 · Models (S3, §4.2)

**Models (S3, §4.2):** frontmatter puts researchers and the gap reviewer on Opus and the verifier on Sonnet. The critic gets a per-call model of the family other than the lead's. Every return's first line is `model: <id actually run>`, and the lead records it: the same model as the researchers means `verifier: same model (degraded)`.

## d29 · Permissions are the session's (S3, §4.3)

**Permissions are the session's (S3, §4.3):** a skill's `allowed-tools` grant clears at the main thread's next turn, a background agent's notification included (later agent calls were denied under `-p`), and plugins cannot ship permission rules, so the run needs auto mode (the interactive default), bypass, or allow rules. The D0b preflight's probe runs after a notification (S5 below). A WebSearch session-limit notice means `failed: search-limit`, never "not found".

## d30 · Dossier (S3, §4.4)

**Dossier (S3, §4.4):** a single document's is `${XDG_STATE_HOME:-~/.local/state}/knowledge-kb/explain/<run-id>/` (the drafts move there from `/tmp`; if it can't be written, `<cwd>/.knowledge-explain/<run-id>/`, reported); a book's is `book/research/`, committed with each slice except `pages/`. Both resume from `run.md`.

## d31 · Verbatim text (S3 §4.5; S4)

**Verbatim text (S3 §4.5; S4):** exact text comes from `curl` plus `pagetext.py` (stdlib, run as `python3 -I`; its source is Part B's `pagetext` extract, which D0b writes to the state dir's `tools/`). It also checks quotes: `--find` (one passage as the entries file records it) and `--check` (every `quote-match: exact` passage of a findings or verify file), whitespace collapsed, curly quotes straightened, ` … ` between ordered pieces. PDFs: plain `pdftotext`, **not `-layout`** (it interleaved a two-column arXiv PDF so a real quote was not found; plain mode found it on p.1). WebFetch quotes are capped at 125 characters (tested), so such a source is `quote-match: approximate`. Wayback: the availability API through `curl --retry 1 --retry-delay 10` (one retry on a 429), the snapshot fetched with `id_` (no archive frame); otherwise `archive: unavailable`, never a loop.

## d32 · Three copies (S3 §4.6)

**Three copies (S3 §4.6):** each stays one file. Canonical = Part A (the lead, with a core card in its first 5k tokens, the part re-attached after a compaction) + Part B. Plugin agent bodies are byte-identical Part B extracts. `skills_parity.py` gains AGENTS; `plugin_parity.py` and CI are unchanged. No `references/`, because the signed landing promises one byte-identical file. Size: 108.7 KB at S4 (Part B 62.1), ≈ 135 KB after S5; OQ5 accepted ≈ 125–145 KB.

## d33 · Role contracts (S4, Part B)

**Role contracts (S4, Part B):** every return opens `model: <exact id>`; statuses `complete`, `partial (<why>)`, `failed: search-limit` (a limit notice, or two broad queries in a row with no results), `failed: permissions` (a denied call, never routed around), `failed: tools`; a new question state `not searched`, never the same as `not found`. Researchers write their findings file early (load-bearing questions answered or ¾ of the hard cap) and run `--check` before returning. The critic's dispatch names `writer_model:` (alias `executor_model:`); the same model or family → `blocked`, unless `same-model: accepted` (reported degraded); a single document's disputed must-fix gets `mode: confirm` (a fresh critic writes `critique-confirm.md`, `upheld` when unsure). Critique paths: `<dossier>/critique.md`, a book's `book/critique/<key>.md`.

## d34 · Plugin 0.6.0 (S3, §4.7)

**Plugin 0.6.0 (S3, §4.7):** the bootstrap finds the skill through `installed_plugins.json` and requires version ≥ 0.6.0. S6 set `plugin/.claude-plugin/plugin.json` to `0.6.0` (its only version field; nothing pushed), rewrote `plugin/README.md` (modes and flags, the five agents, the permission posture with the preflight's exact rules, the dossier path, the search cap) and the description in both frontmatters.

## d35 · Book (S3, §2 Q7, §4.9)

**Book (S3, §2 Q7, §4.9):** the `DECOMP` executor leads the whole-book research (B1–B5) and each chapter executor its top-up (B6), both dispatching the plugin's research agents under a `slice-executor.md` carve-out, not the contract (OQ2). The orchestrator dispatches `knowledge:explain-critic`; the bootstrap's `explain-critic.md` is deleted. The research summary is `book/research/summary.md`, linked from the outline gate; the indexes freeze at the signature, each chapter has its own overlays.

## d36 · Book suggestion (S3, §2 Q9)

**Book suggestion (S3, §2 Q9):** offered, never imposed: when the request names a book or D1's plan is plainly over one document, asking only when interactive. It detects a nested or at-root workspace and checks the explain route has the new fields (too old → `/update-workspace` or a single document); the proposal shows the name, the objective and every field, and on a literal yes invokes `create-phase`, then stops (OQ3). `## Explain` gains `must-cover`, `leave-out`, `trusted sources`; `lang` becomes `en`, translations only when named.

## d37 · Bootstrap package (S3, §4.9)

**Bootstrap package (S3, §4.9):** text-anchored patches to `create-phase`, the three explain references, `slice-executor.md` and the installer (which drops the critic), plus a CHANGELOG entry and a handoff; no contract edit; the version is the next free number (v72 if it lands after P40's v70 and P42's v71).

## d38 · (operator, 2026-10-23, by approving DECOMP2's plan)

**(operator, 2026-10-23, by approving DECOMP2's plan)** OQ2: a narrow carve-out in the bootstrap's `slice-executor.md` lets the explain `DECOMP` executor (B1–B5) and each chapter executor (B6) dispatch the plugin's research agents; no contract edit. OQ3: the operator's literal yes to the book proposal is `create-phase`'s confirmation; the route runs `new-phase`, writes `intent.md`, stops. OQ4: the README and the package say to raise `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` (e.g. 1000 in user settings' `env`); the skill never changes settings and stops loudly, resumable, at the cap. Also accepted: the full rehearsals and the ≈ 85–90 KB skill (core card in the first 5,000 tokens). (`intent.md` Clarifications)

## d39 · Decided as drawn with DECOMP2's plan

**Decided as drawn with DECOMP2's plan:** the rehearsals publish nothing beyond a scratch API, the old arm runs `2849ea6`, costs come from `claude -p --output-format json`; the interactive permission check goes to the acceptance walkthrough; book chapters route high on an Opus lead (package); the `argument-hint` line claude.ai's upload rejects becomes a deferred job; the package's anchors avoid P42's new sections.

## d40 · Rehearsal mechanics (DECOMP2)

**Rehearsal mechanics (DECOMP2).** Arms, leads and judges run as their own `claude -p` sessions with `--plugin-dir`, since this repo's executors dispatch only `Explore`. The operator's read of one rehearsal-1 subject (S1 §3.13) joins the walkthrough instead of stopping S7. Outputs stay in the phase folder's `rehearsal/r1/` and `rehearsal/r2/`, without `pages/`.

## d41 · (operator, 2026-10-23, OQ5)

**(operator, 2026-10-23, OQ5)** "accept": the skill stays one file at about 125–145 KB; S5 and S6 write Part A by citing Part B's sections, never restating them. Moving Part B out waits for the later skill-shrink work (with D68).

## d42 · Part A as built (S5)

**Part A as built (S5):** the card `## The run, in one card` before §1; RUN `full | quick | no-research`, apart from MODE; §1 adds `quick`, `no-research` (operator-only), `resume [<run-id>]` (`trust`/`drop`), `research` a no-op, `lang` default `en`; §2's resolver prints `KB_EXPLAIN_STATE` and `KB_NOW` (run id `<YYYYMMDD-HHMM>-<slug>`); §3.1–3.9 cite Part B; §4's numbering kept (B5 cites it).

## d43 · Preflight and Bash (S5, §3.2, B6)

**Preflight and Bash (S5, §3.2, B6):** the converter is written by a line-exact `python3 -c` extract (also the write probe); probe A (haiku), then B's six calls, all run; a denial → `FAILED: permissions`, nothing beyond `tools/`, and the printed rules = S3 §4.3's + `pdftotext`, read-only `git`, `shasum`, `mktemp -d`, `knowledge --base-url`, `Read`/`Edit(//<state dir>/**)`. Every Bash call is one given form, nothing chained, wrapped or redirected; listing and search go through Glob/Grep or one plain `ls`/`find`/`grep -n`; a denied given form is `failed: permissions`, no longer B11's WebFetch fallback.

## d44 · Lead's rules (S5)

**Lead's rules (S5):** never skip a stage for time or money (a limit stops the run, resumable); an unfinished run is announced, never silently resumed; a translation runs no research; `no-research` writes `brief.md`/`run.md` at once, with no Best practices section; `needs-rewrite` stays `candidate`; counter-evidence is no re-verification; the ceiling counts researchers and gap reviewers.

## d45 · Writing from the dossier (S6, §3.10, §4)

**Writing from the dossier (S6, §3.10, §4):** D6 rewrites `outline.md` once, in §4.2's order: each section's questions with their states, claim ids with ledger statuses (a `partial` claim with its narrower wording, `D-` ids for disagreements), code ranges, the declared gaps from `gaps/final.md`, and the diagrams with their claims; the quiz (≈ 5) tests only `supported` claims; `run.md` gets `D6: sections · claims · quiz`. D7: the lead writes alone, section by section, loading only that section's entries (`grep -n` the ids, then Read the ranges) and code ranges, and appends the section's lines to `trace.md` (B9) before the next one. A fact with no claim id or code range (`no-research`: a code range or `user`) is not written; a sentence says what its claim says (B8 for contested and below-bar claims); a declared gap is stated or dropped. A **writer gap** gets one targeted top-up (D2–D3s, counted against the gap rounds and the ceiling) while there is room, else it is left out or stated as open and added to `gaps/final.md` and `run.md`. A final coherence pass adds no fact. §4.5 ("Best practices & next steps") is on every run but `no-research`, every claim cited to a library source, a practice in the writer's own voice held to B8's bar for evaluations; §4.6 lists only the `library.md` sources the chapter cites (a new item's id is its library id in lowercase). S5's stale §4.2 item 4 and §8 line are gone.

## d46 · D8: check, critic, one revision (S6, §4.9–§4.10)

**D8: check, critic, one revision (S6, §4.9–§4.10):** `knowledge --base-url <api> check`; the same list twice → `STOPPED: check`. `quick` goes straight to publish; `full` **and `no-research`** get the critic (decided: the critic is not research, P31's critic ran on repo-only chapters, and B5 already handles `no-research`). The critic is B5 on a per-call model of the other family (an Opus lead names `sonnet`, any other names `opus`): `knowledge:explain-critic` on the plugin path, B0's `briefs/explain-critic.md` on the generic path (B0's name, not the plan's `briefs/critic.md`); its scratch is `<DOSSIER>/critic`, because a `mktemp -d` folder is outside §3.2's rules. A `blocked` on the model is corrected and re-dispatched once; any failure twice → `STOPPED: critic`. The lead answers each finding in `run.md` `## Critique` (`fixed | disputed | declined`), adds no new evidence, and may dispute at most one must-fix through one confirm pass (`critique-confirm.md`; a confirm failing twice counts as `upheld`). One revision, the trace updated, §4.8–§4.9 again, no second critique; a must-fix left open → `STOPPED: critic`.

## d47 · Publish under the session's rules (S6, §3.2, §5, B12)

**Publish under the session's rules (S6, §3.2, §5, B12):** by D8 the skill's grant is gone, so the publish uses only printed rules: the payload is built by `python3 -I <TOOLS>/pagetext.py --payload <meta.json> <body.md> <payload.json> [name|type|path …]` (the converter's rule covers it; a `python3 -c` rule would allow any Python), then the `knowledge` CLI or `curl -sS --max-time 30`. §3.2's printed rules add `Bash(knowledge --version)` and `Read(/<SKILL_DIR>/**)` (the critic reads the skill). Failure words: `STOPPED: check`, `STOPPED: critic`, `FAILED: publish` (a refusal twice, a 401, a 409 with nobody to ask, or no API), each keeping the draft. Only §9.1's book question and §5's 409 are ever asked, and only in an interactive session.

## d48 · D9: the report (S6, §8)

**D9: the report (S6, §8):** written to `<DOSSIER>/report.md`, shown, and `run.md` set `state: done`: the `PUBLISHED (<run>)` line with url and version; the mode block and degraded modes; the research (tier, rounds, stop reason, claim statuses, counter-evidence, `D-` ids, gate counts); declared gaps; the critic; where it landed (push_pending, warnings, migrated_from, a recovered path); the dossier path and any project copy; the book suggestion when it applied unasked.

## d49 · The book section (S6, §9.2–§9.3)

**The book section (S6, §9.2–§9.3):** written as a procedure for the bootstrap's executors and named §9.2 (whole-book research, S3's "B1–B5") and §9.3 (a chapter, S3's "B6"), since "B1–B6" collides with Part B's numbers. §9.2: the `DECOMP` executor leads; the dossier is `book/research/` (committed except `pages/`, which holds a `.gitignore` of `*` and `!.gitignore`), run id `<KB_NOW>-<book slug>`; the brief from `## Explain`; 20–60 questions, the skeleton a draft chapter list, tier usually 3; waves ≤ 10 (wave 1 in up to 2), ≤ 3 gap rounds of ≤ 6 researchers, ceiling 45; D5–D5s and `gaps/final.md` with no gate stop (weak spots instead); `book/outline.md` with each chapter's expected top-up; `book/research/summary.md` (Key sources, Open disagreements, Weak spots, Expected top-ups); `library.md`/`ledger.md` frozen at the signature. §9.3: a chapter executor's state in `run-ch<k>.md`; D0b again; a B3 gap check (`after round: 0 · scope: chapter <k> (<key>)` → `gaps/ch<k>-r0.md`); a top-up of 0–3 researchers (`ch<k>-r<n>-<angle>`, one round plus one follow-up, ceiling 5) into `library-ch<k>.md`/`ledger-ch<k>.md`, verify batches `ch<k>-b<m>`, `gaps/final-ch<k>.md`; the chapter's gate; D6–D7 into `outline-ch<k>.md`, `book/<key>.md`, `trace-<key>.md`; the critic with `kind: chapter` → `book/critique/<key>.md`, answered once with no confirm pass (the review decides disputes); nothing published (the review publishes).

## d50 · The book suggestion as built (S6, §1, §3.4, §9.1)

**The book suggestion as built (S6, §1, §3.4, §9.1):** triggered by a request for a book, chapters, a course, a series or a multi-part guide (`book=<slug>`, one chapter in a book, does not count), or by a D1 plan over ~25 questions or 7 sections, tier 3 on two or more axes, or over 10 wave-1 researchers. Detection with Read in the working folder: nested (`workflow/.agentic-nested.json`) or at root (`scripts/workflow.py` + `works/`), both → ambiguous; ready when create-phase's SKILL.md has `## The explain route` and a `must-cover` field; not ready → `/update-workspace` (never run by the skill) or a single document. The proposal: `Proposed explain phase: <name>`, an objective, and every `## Explain` field (`lang: en`, `translations: none`, `visibility: private`). Asked only when AskUserQuestion is among the tools; a literal yes invokes `create-phase` through the Skill tool (or prints `/create-phase` with the proposal) and stops with `run.md` `state: stopped: book phase`; otherwise nothing is asked, the single document is written and §8 reports the suggestion.

## d51 · Size after S6

**Size after S6:** the canonical file is 147,586 B (≈ 147.6 KB; S5 left 135,285 B), about 2.6 KB above OQ5's 125–145 KB band: the new D6–D9, the critic step and the book section added ≈ 14 KB (§9 6.0 KB, §4.10 1.9 KB, §8 1.7 KB, §3.10 1.2 KB, §4's D7 rules 1.3 KB, B12's `--payload` 0.9 KB, the card, §1 and §3.2 ≈ 1.2 KB), ≈ 2.6 KB were trimmed from §5–§6 and the old §8, and the fixes from the live runs added ≈ 0.5 KB. Reported to the operator in `## Now`.

## d52 · Fixes from S6's live runs (S6; §2, §3.6, §5, B6)

**Fixes from S6's live runs (S6; §2, §3.6, §5, B6):** (1) B6: no `$` anywhere in a command, since any `$` (even single-quoted, tested) needs approval and an unattended session denies it; a whole-line match is `grep -x`, never `^…$` (the `quick` run's verifier was denied `grep -n -A9 -E "…$"`; agents regenerated). (2) §2: the resolver runs exactly as written and is the only reader of the configuration: never open a `config.json`, never `$KB_API_TOKEN` or another variable in a command (the Sonnet lead of the `no-research` run edited the resolver to hide the token, then read the operator's real `~/.config/knowledge-kb/config.json`; see OQ6). (3) §5: the CLI's token is never set on the command line (`KB_API_TOKEN=… knowledge` matches no rule; the Opus lead's first try was denied). (4) §3.6 step 6: the merge checklist names `library.md`, `ledger.md` and `outline.md` as rewritten from each merge (the first `quick` attempt merged without writing `outline.md`).

## d53 · Fixes from rehearsal 1 (S7; §3.2, §3.5, §3.9, B1–B4, B6, the gap reviewer)

**Fixes from rehearsal 1 (S7):** all three copies, agents regenerated, guards and `claude plugin validate` pass; plugin version left at 0.6.0 (not pushed). (1) **Shell forms (B6, B2, B4, B1):** on Claude Code 2.1.308 under `-p` there is no Grep or Glob tool and the error points agents to Bash `grep`, so they translated patterns into denied forms; and B6's "absolute paths" led code researchers to `git -C <repo>`, which a session allowing `git show` denies. B6 now says: paths absolute except in `git`, which runs in the session's working folder with repo-relative paths and never `-C`; Grep and Glob where the host has them ("some hosts have neither"), otherwise one plain `ls`/`find`/`grep -n` with `-F` for literal text, `-x` for a whole line, one `-e` per pattern; no `$` and no braces holding a comma (`.{0,80}`, `{a,b}`); for context, `grep -n` the words, then Read those lines. B4's entry lookup is `grep -n -x -F -e '### <id>' … <file>` without Grep; B1's known-already lookup cites B6; B2's dispatch writes `commit: <sha> (HEAD)` so the researcher never looks it up. (2) **What `failed: permissions` means (§3.2, §3.5 item 4, B6):** it stops the run only when the denied call is in a form the role's brief gives; a call in another form is the role's own error, re-dispatched once with the call named (new-g's session 1 stopped on a verifier's own `grep … ^…$`). (3) **§3.9 `quick`:** the verifier runs on a model other than the lead's (`knowledge:verifier` as is under an Opus lead, `model: opus` otherwise; `verifier: lead (degraded)` with none) — S6's note 4. (4) **The unfinished-run lookup** (resume): Glob `<KB_EXPLAIN_STATE>/*/run.md`, else `find <KB_EXPLAIN_STATE> -maxdepth 2 -name run.md`, never a folder above it. (5) **Gap reviewer (B3, frontmatter):** it hit its 15-turn limit before writing in both subjects (about 10 calls lost on the missing Grep), so `maxTurns: 30`, `tools` gains `Bash` (for B6's `ls`/`find`/`grep -n`), and B3 says write `gaps/r<n>.md` by the 20th tool call at the latest. Not run-confirmed: (3), (4) and (5) (the confirming run waits on the cap, OQ7); (1)–(2) ran as a scratch fix-1 copy in new-g's sessions 2–3 (5 subagent denials in 527 Bash calls, none fatal). Size: the canonical file is 149,280 B, ≈ 4.3 KB above OQ5's band (S7 added ≈ 1.7 KB).

## d54 · Rehearsal 1's result so far (S7)

**Rehearsal 1 (S7; `rehearsal/r1/scorecard.md`):** subject C (this repo's publish path, pinned at 9978d84) judged blind twice on Sonnet, positions swapped, consistent in both orders: new wins Comprehensiveness and Insight, old wins Helpfulness and Readability; R1 8/8 both; R2 old 3/4, new 4/4; R3 old 18/18 supported, new 28 + 1 partial of 29 with ≈ 3× the effective citations; R5/R6/R7 pass both (two judge errors corrected by S7's spot-checks); R8 new pass both, old fail once. **S1's decision rule fails on C** (rule 3: Helpfulness to old in both orders; rule 2 by one partial). New found real defects old missed (validation not re-checked under the lock, a publish waiting behind a push, `architecture.md` contradicting the code); old's step-ordered code walk with an invariants checklist served the reader's "change without breaking invariants" purpose better. Subject G (free-threaded CPython) is unfinished: the new arm's dossier passed the gate (6/6, 21/21) and D7 drafted 9,052 words (old: 4,803); the critic, publish and G's judges wait on OQ7. Cost: new ≈ 12–18× old per chapter (C $27.83 vs $2.31; G $43.65 to D8 vs $1.53), ≈ 9–18× slower (C 55 min vs 6; G 100 min to D8 vs 5.5).

## d55 · Rehearsal harness (S7)

**Rehearsal harness (S7):** `claude -p` runs never carry a `--max-budget-usd` near the real cost, because the lead reads it and stops itself (`STOPPED: budget`, new-g session 2); a watchdog estimating cost from the streamed per-message usage (dedupe by message id, list prices; within ≈ 1% of `total_cost_usd`) SIGTERMs the session instead, and a killed session's cost is that estimate (its last `result` event lags). An unattended background agent's denial carries reason `asyncAgent`. The old arm ran under the new skill's printed rules (its `/tmp` edits were denied and it worked around them): a confound that favours neither arm's chapter.

## d57 · Reader-first writing (F1; §3.10, §4, §4.2, §9.3)

**D6, §3.10, "the reader's path".** `outline.md` opens with `## Reader's task`:
- 2–4 tasks, each from the brief's `purpose`;
- each task with the deliverable the reader will use: a checklist, a decision table, the commands, or the test
  that guards the behaviour.

Then come the path and the `## Not used` list:
- **The path:** §4.2's sections, the middle ones in the order the reader meets the work (code: the order it
  runs; a general subject: the decision or the steps). Each task gets a section that ends in its deliverable.
  Each heading carries a one-line purpose, its tasks and a word budget: "the fewest words that deliver them (a
  single document mostly 3,000–5,000 in all)". The budget is v2's.
- **Findings:** each goes in the step it changes, and in the checklist line that guards it. Secondary depth goes
  in a collapsed callout.
- **`## Not used`:** each claim that serves no task and no must-cover point, with a reason. Every must-cover
  point, load-bearing question and `stated` gap still lands on the path.

**D7, §4, three passes:**
1. a skeleton of the path;
2. each section in order, with its `trace.md` lines before the next;
3. a reader pass. It reads as the brief's reader doing each task, fixes what slows them, adds no fact, and cuts
   each section to its budget (v2). It replaces the old coherence pass.

**The prose rules:**
- one idea a paragraph, about 100 words at most;
- **Show, then tell** (v2);
- a finding opens with a bold sentence saying what it means for the reader;
- **Teach, don't report** (v2): a fact in the chapter's own voice. A source is named in the sentence only where
  B8 needs the attributed form or it changes the reader's trust. One citation per source a paragraph, at the
  sentence's end. A code location once, in its block's title;
- secondary depth in `> [!NOTE]-` callouts;
- **Shorter wins** (v2).

**The rest:**
- §4.2 is "a starting shape, not a form to fill", and a task's own section ("Should you use it today?") follows
  the path.
- The tone line points at the prose rules and the budgets. There is no longer "no length cap".
- §9.3 item 5 cites §3.10 and §4 and restates nothing.
- §3.10 and §8 tell the lead to bring the mode block up to date.

## d58 · The critic reads as the reader (F1; B5, §4.10, `plugin/agents/explain-critic.md`)

**Input.** The critic gets the outline's `## Reader's task` (a chapter's is in `outline-ch<k>.md`).

**The new `reader` check:** as the stated reader, do each task from the chapter alone.
- **`must-fix`:** a task not served, or its deliverable missing.
- **`should-fix`:** a paragraph with two ideas or past about 100 words, a step buried in prose, a caveat that
  interrupts the main line, a fact reported as who-said-what, a section past its budget. Each says where the
  reader trips.
- The rubric, the category list and the file template carry `reader`.

**Two host fixes from the runs:**
- **§4.10 dispatches the critic in the foreground.** A headless session (`claude -p`) stopped a background
  critic after 600 s idle, and the run ended at D8 (C's first session).
- **`maxTurns` goes from 60 to 120.** The critic hit 60 on its first attempt on both subjects. Each miss costs a
  re-dispatch, and `--no-session-persistence` cannot resume one.

## d59 · Rehearsal 1b's result (F1)

C and G were rewritten from their dossiers at D6 on an Opus lead, then judged blind on Sonnet in both orders
against rehearsal 1's old chapters.

**Rules v1:**

| Subject | Helpfulness | Comprehensiveness | Insight | Readability |
|---|---|---|---|---|
| C | **new** in both orders (a flip from rehearsal 1's old) | new | new | old |
| G | tie (old, then new) | new | new | old |

- No R1/R3/R5/R7 failure on either.
- Both subjects miss the target on Readability alone. The judges gave length (C 6,395 and G 8,561 words, against
  4,118 and 4,803), density, and citation or line-number clutter (G 177 links against 44; C 18 inline line refs
  against 0).

**Rules v2** (budgets; teach, don't report; one citation per source a paragraph; shorter wins) and one C rerun
from D6 gave 5,881 words, 0 line refs and 14 links. Its two judges did not run: the leak scan's new hits stopped
the rehearsal (OQ8).

`rehearsal/r1b/scorecard.md`.

## d60 · Size after F1

`plugin/skills/explain/SKILL.md` is **152,339 B**, **+3,059 B** over S7's 149,280.

| Section | Change |
|---|---|
| §3.10 (D6) | +1,860 |
| §4's D7 passes and rules | +1,169 |
| B5 | +635 |
| §9.3 | +154 |
| §4.10 | +139 |
| §4.2 | +95 |
| §8 and the card | +51 |
| §2's reference list (trimmed) | −707 |
| §4.3 (trimmed) | −182 |
| §4.8 (trimmed) | −119 |
| §5 (trimmed) | −36 |
