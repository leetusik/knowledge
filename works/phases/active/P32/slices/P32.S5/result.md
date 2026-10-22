# P32.S5 result: Part A, the research stage

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **summary:** Wrote Part A's research stage into all three copies of the explain skill. That covers the core card before §1, the `quick`, `no-research`, `resume` and `lang=en` flags in §1, the state-dir dossier in §2, §3.1–3.9 (D0 brief through the D5g evidence gate, plus `quick` and `no-research`) and §4's drafts in the dossier. It was tested live under `claude -p` with scratch env for $8.42 of the $10 cap. Without allow rules the preflight stops with `FAILED: permissions` and writes nothing for the run. With them, a tier-1 run ran D0–D3v, stopped loudly on a verifier's denied call, and resumed from `run.md` through one gap round to D5g. The runs' findings were fixed in the skill: Bash one form per call, no Glob/Grep tool on Claude Code 2.1.308, and never skip a stage. D5 and `gaps/final.md` were not run live (deviation 1).
- **files_changed:**
  - `plugin/skills/explain/SKILL.md`
  - `.agents/skills/explain/SKILL.md`
  - `web/public/SKILL.md`
  - `plugin/agents/{web-researcher,code-researcher,gap-reviewer,verifier,explain-critic}.md`, regenerated with `--write-agents` after the B6/B11 edits
  - `works/phases/active/P32/phase.md`: Decisions, Notes for later slices, Doc impact and Now
  - this file
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS (BODY, WEB, AGENTS)
  - `python3 scripts/plugin_parity.py`: PASS
  - Card position: bytes 2133–6169 of 135,285, ending about 1.5k tokens in, inside the first 5,000.
  - `claude -p` run 1 (no rules): `FAILED: permissions`, nothing written beyond `tools/pagetext.py`. PASS.
  - Runs 3 and 4 (rules, then resume): a dossier through D5g, but without D5 or `gaps/final.md`. PARTIAL (deviation 1).
  - `git diff --stat`: in scope.
  - `python3 scripts/workflow.py validate`: PASS (see below).
- **deviations:**
  1. **D5, D5s and `gaps/final.md` were not exercised live.** The budget-capped resume (run 4) skipped D5 and judged D5g on D3v verification alone. It also did not refresh `library.md` or `outline.md` after round 2. The card now forbids skipping or shortening a stage; a limit stops the run, resumable. A rerun would have passed the $10 cap. S6's `quick` run is the first to write `gaps/final.md`, and S7 runs full; both are named in the notes.
  2. **Part B (S4's text) was edited.** B6's Bash rule now requires one given form per call, with listing and search through Glob/Grep or a plain `ls`/`find`/`grep -n`. B6's `failed: permissions` covers a denied given-form call. B11 no longer offers a WebFetch fallback for a *denied* command, which contradicted B6. The agents were regenerated. The plan expected `--write-agents` "if Part B changes".
  3. **The test runs used a sonnet lead** (the researchers and gap reviewer are opus, the verifiers sonnet, per the agents' frontmatter), to stay under the cap. The test limits (tier 1, one gap round, stop after D5g) were passed through `--append-system-prompt`.
  4. The second half of the tier-1 run went through `resume`, which exercised §3.3's resume path as well.
  5. Throwaway probes ran in the scratchpad, outside the repo: a one-skill plugin, a tiny git repo, $0.01. Nothing of them is in the repo.
  6. **`phase.md` is held at 40,955 B (budget 40,960).** To get there I compressed four older Decisions lines (Cut, Three copies, Research stage, Permissions) without dropping a decision.
- **doc_impact:** three lines appended to `phase.md` `## Doc impact`, quoted under *Doc impact* below. In short: product.md (research by default, quick/no-research/resume, loud stops, English); operations.md (the dossier path, the session's posture); architecture.md (the core card, `run.md` and resume).

## What landed, by section (canonical file)

- **Frontmatter.** The argument hint is `[resume [<run-id>]] <topic or change-ref> [here] [quick|no-research] [book=<slug>] [lang=<xx>]`. `allowed-tools` adds:
  - `Edit`
  - the converter, as narrowly as S3 §4.3: `python3 -I *knowledge-kb/explain/tools/pagetext.py *` and the `.knowledge-explain` fallback
  - `pdftotext`
  - read-only `git` (`grep`, `blame`, `status`)
  - `shasum -a 256` / `sha256sum`
  - `mktemp -d`
- **`## The run, in one card`**, before §1:
  - the re-read instruction after a compaction
  - the D0–D9 stage table
  - the RUN kinds (`full`, `quick`, `no-research`, `resume`), named apart from MODE (change, topic, general)
  - the dossier and `run.md`
  - the stop rules: `FAILED: permissions`, `FAILED: web research unavailable — no chapter written`, `failed: search-limit`, failing twice, `STOPPED: evidence gate`, loop safety, never skip a stage, English
- **§1.**
  - `resume [<run-id>]` with `trust` / `drop` notes
  - `quick`, and `no-research` (operator-only, labelled)
  - `research` is a no-op
  - `lang` defaults to `en` whatever the request's language
- **§2.**
  - The resolver prints `KB_EXPLAIN_STATE` and `KB_NOW`.
  - The dossier is `<KB_EXPLAIN_STATE>/<KB_NOW>-<slug>/`. The tools in `<KB_EXPLAIN_STATE>/tools/` are shared by every run. The fallback is `<cwd>/.knowledge-explain/`.
  - `<tmp>` in §4–§7 is the dossier, and nothing in a dossier is deleted.
  - The resolver runs as a Bash call of its own.
- **§3, replaced:**
  - **3.1 D0:** the brief, the unfinished-run notice, the prior-version lookup (kept from the old §3), and translation.
  - **3.2 D0b:** the path (plugin, generic or sequential); the converter written by a line-exact `python3 -c` extract, which is also the write probe; `which pdftotext`; the two-agent probe; judging the results; the stop block with the real-path rules.
  - **3.3:** the `run.md` template with S3 §4.2's mode block, and the six resume steps.
  - **3.4 D1:** the plan, the tier table and the angle catalogue with merges by tier.
  - **3.5 D2:** waves (one message, ≤ 10 or 6, overflow queued; plugin, generic or sequential sending) and the failure rules.
  - **3.6:** D3 merge with the checklist (ids in full, counts never fall), D3v batches and D3s statuses.
  - **3.7 D4:** gap rounds and the stop reasons.
  - **3.8:** D5 main claims and final batches; D5s disagreements and `gaps/final.md`; the D5g gate.
  - **3.9:** `quick` and `no-research`.
- **§4 intro:** `<tmp>` is the dossier.
- **Part B:** B6's Bash and read-tools rule, B6's `failed: permissions`, and B11's fallback wording (deviation 2).
- **Size:** 135,285 B, up from 108,695. Part A is 72.7 KB. This sits inside OQ5's accepted ≈ 125–145 KB; S6 adds more.

## The `claude -p` runs (scratch env, never the operator's config)

Every run used:
- scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME` and `KB_ROOT` under the scratchpad
- `KB_API_BASE_URL=http://127.0.0.1:9`, a dead port, so nothing could publish
- `--setting-sources project`, `--permission-mode manual` and `--no-session-persistence`
- `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` only on the run's own command line

§2's resolver ran first in every run and printed the scratch paths. Costs are the last `result` event's `total_cost_usd`, which includes the subagents.

| Run | What | Lead | Outcome | $ |
|---|---|---|---|---|
| 1 | preflight, no allow rules | sonnet | Probe A ok. B's WebSearch and Write were denied, so `FAILED: permissions` with the rules printed (real paths). Only `tools/pagetext.py` was written; no dossier. | 0.358 |
| 2 | with rules (first try) | sonnet | `FAILED: permissions` before D0b. The lead had chained `; which pdftotext; ls ~/.claude/plugins` onto the resolver, and a chained unapproved part denies the whole call. Fixed: the resolver and checks run alone. | 0.306 |
| probes | one-skill plugin ×4 and a hash-pipeline test (haiku) | — | Showed that `--allowedTools` swallows a trailing positional prompt. The skill grant covers a multi-line `python3 -c`, but a chained `ls` outside the working folders denies the call. `git show … \| sed -n … \| shasum -a 256` passes under `git show`/`shasum` rules. | 0.012 |
| 3 | tier-1 run, "HTTP 418 (I'm a teapot)" | sonnet | Preflight all ok. D1 plan (8 questions, 3 merged angles). D2: 3 opus web researchers. D3: 18 sources, 45 claims. In D3v one verifier batch hit a denied `awk` and returned `failed: permissions`, so the lead stopped loudly with the block; the other batch was `partial`. | 3.535 |
| 4 | `/knowledge:explain resume <run-id>` | sonnet | D0b re-probed. Only the failed batch was re-sent (15 supported). D3s ran. D4: a gap reviewer (opus) found 3 load-bearing gaps, then 2 researchers in round 2, a verify batch r2-b1, and `capped: rounds` (test limit). D5 and D5s were **skipped "for budget"**. D5g passed on D3v alone (must-cover 2/2, load-bearing 8/8). | 4.215 |
| | **total** | | | **8.424** of the $10 cap |

**Searches.** The findings files list 12 queries; Claude Code's counters show 8 web-search requests. The `CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION` cap (20, then 150) was never reached.

**Models.** The returns' `model:` lines show:
- researchers and gap reviewer: `claude-opus-5-5`
- verifiers: `claude-sonnet-5-5`
- probe B: `claude-haiku-5-5`

The verifier was on a different model from the researchers, so the run is not degraded.

### Findings that changed the skill

1. **The skill's grant is fine for the resolver; chaining is not.** Run 2's lead chained `ls` onto it. §2 now says to run the resolver as a Bash call of its own. §3.2 says `which pdftotext` runs alone and `<this file>` is never `ls`ed.
2. **Agents write shell, and allow rules deny it whole.** In run 3 the researchers and verifiers used:
   - `D=…; ls …; for …` chains
   - a shell function wrapping `curl`
   - `awk` over findings files
   - `cd …; grep …`

   All were denied. One verifier correctly returned `failed: permissions`, but a researcher routed around a denial into WebFetch because B11 allowed that. Fixed:
   - B6 requires one given form per call: absolute paths, nothing chained, wrapped or redirected.
   - Listing and search go through Glob/Grep or one plain `ls`/`find`/`grep -n`; the `Read(//<state>/**)` rule lets those run there (seen in run 3).
   - A denied given-form call is `failed: permissions`, and B11's fallback no longer covers denials.
   - The lead's own Bash keeps the same rule, and it writes dossier files with Write; run 3's heredoc into `$D/brief.md` was refused as "unanalyzable".
3. **Claude Code 2.1.308 has no Glob or Grep tool** ("No such tool available: Grep … use `grep` via the Bash tool"). The init event lists 25 tools, with no Glob and no Grep. That is why the rule above names the plain commands as the fallback.
4. **A budget-aware lead cuts stages.** With `--max-budget-usd 4.5`, run 4's lead skipped D5 and D5s and judged the gate anyway. The card now says: never skip or shorten a stage to save time, tokens or money; a limit stops the run at the last stage boundary, resumable.
5. `git diff` was added to the printed rules, because the critic reads the change (B5).
6. `outline.md` question states follow the findings files until D3s sets them. Run 3 had written `candidate` as a question state, and the indexes used id ranges, which the checklist cannot verify. §3.6 now says this, and that indexes list ids in full.

## The dossier against B9

Dossier: `/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/c2016e8a-14bf-4ba0-89b3-a899f1c9c55e/scratchpad/s5/run/state/knowledge-kb/explain/20261023-0208-http-418-im-a-teapot/`. It is scratch and not kept in the repo.

**Present and well-formed:**
- **`brief.md`:** §3.1's template; must-cover lists two items; `lang: en`.
- **`plan.md`:** tier axes, Q1–Q11 with load-bearing marks, owning angles and `not yours`, the skeleton.
- **`run.md`:** header, the `## Mode` block (plugin, wave 3, `caps: agent`, `quote-match: exact`), `## Preflight` with all six probe calls, `## Log` per stage with counts and stop reasons, `## Models`, `## Resume`.
- **Five findings files:** B9's header with model, status and tool calls; 26 `### S-` entries.
- **`library.md`:** one line per source with `merged:`; RFC 9110 was merged across researchers.
- **`ledger.md`:** 63 claims (25 supported, 3 partial, the rest `candidate`) and a `## Disagreements` section with D-01.
- **`outline.md`:** questions per section with B8 states and claim ids.
- **`verify/r1-b1.md`, `r1-b2.md`, `r2-b1.md`:** B4 headers with per-status counts.
- **`gaps/r1.md`:** B3's format, with G-r1-01..03 carrying kind, load-bearing, owner, try and refs.
- **`pages/`:** 40 files: html with txt, and a PDF via `pdftotext`.

**Short of the plan:**
- There is no `gaps/final.md` and no `verify/final-*` (deviation 1).
- `library.md` and `outline.md` were not refreshed after round 2.
- `## Models` appears twice in `run.md`, and `searches:` stayed 0.

These are lead slips under budget pressure; the template is unambiguous. S7 should look at them in a full run.

## Doc impact

Appended to `phase.md`:
- `product.md`: research by default (`full` or `quick`); `no-research` operator-only; `resume`; loud stops; English by default.
- `operations.md`: the dossier at `${XDG_STATE_HOME:-~/.local/state}/knowledge-kb/explain/<run-id>/`, the converter in `…/explain/tools/`; the session's posture (auto, bypass or the printed rules).
- `architecture.md` (*explain skill*): the core card re-read after a compaction; run state in `run.md`, from which `resume` continues.

## Notebook

In `works/phases/active/P32/phase.md`:
- **Decisions:** three new lines (Part A as built, Preflight and Bash, Lead's rules). Four older lines were compressed and the Dossier line kept.
- **Notes:**
  - removed the S5 spec and the parts of S4's note that S5 used
  - added `(from P32.S5, for P32.S6)` and `(from P32.S5, for P32.S7)`
  - narrowed the ownership note to S6
- **Doc impact:** +3 lines.
- **Now:** rewritten.
- `## Operator Questions` and the generated `## Slices` block are unchanged (checked with diff).
