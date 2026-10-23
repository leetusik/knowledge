# P32.F2 result

## Verdict

- **status:** needs_operator
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **summary:** The skill now says `quick` keeps the agents, the files and the map, and that its path is D0b's rule, never the run kind. It also adds a one-`ls` dossier check before D9 and makes `searches:` the run's total (each role returns a `searches:` line; B6, the five agents regenerated). It grew +1,446 B and all three copies are in parity. In four Sonnet `quick` runs, run a's `path: sequential` never came back. But each live case missed twice: run a's prompt never published (a wrong `tools:` folder, then a haiku probe's own `mkdir … && curl` form), and the sourdough runs under-counted `searches:` and skipped the D9 `ls`. So by the plan's rule the slice returns `needs_operator` (OQ12).
- **files_changed:**
  - `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`;
  - `plugin/agents/{web-researcher,code-researcher,gap-reviewer,verifier,explain-critic}.md` (regenerated);
  - `works/phases/active/P32/phase.md` (Decisions, Doc impact, Operator Questions, Notes, Now);
  - `works/phases/active/P32/topics/build-decisions.md` (d70);
  - `works/phases/active/P32/rehearsal/f2/` (`spend.md`, `f2a/`, `f2b/`, `f2a2/`, `f2b2/`);
  - this `result.md`.
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS (the web copy byte-identical; the 5 plugin agents match Part B);
  - `python3 scripts/plugin_parity.py`: PASS;
  - `claude plugin validate plugin`: passed;
  - `python3 scripts/workflow.py validate`: passed (only the existing warnings);
  - `git diff --stat`: within `plugin/`, `.agents/skills/explain/`, `web/public/SKILL.md` and P32's folder. The other `works/*` changes were already there when the slice started (the orchestrator's);
  - bootstrap `git status`: clean, and no command was run there;
  - live runs: 4 of 3–4 planned (f2a, f2b, then f2a2 and f2b2 after the one revision); **each case missed twice** (below);
  - leak scan after every run: the same six known files;
  - spend $7.21 of $20.
- **deviations:**
  - The revision touched Part B's B6 (each role's second return line is `searches: <n>`), so `skills_parity.py --write-agents` regenerated the five agents. Without it, the lead could not total the roles' searches (plan item (c)).
  - The reruns used a second fresh stack on :8864, because f2b's sourdough document was already on :8863 and a rerun there would have published a v2.
  - The optional f2c did not run: its condition, both cases passing, failed.
  - A probe-form gap and the Sonnet bookkeeping misses surfaced live and were **not** fixed. They need a second revision, which the plan does not allow, so they are OQ12.
- **doc_impact:** three lines appended to `phase.md` `## Doc impact`:
  - finding 3's exact line (qa.md, operations.md: the AGENTS check);
  - product.md: `quick` keeps the agents, the files and the map, and its path is the preflight's rule;
  - architecture.md (*Plugin packaging*): the D9 dossier check, `searches:` as the total with B6's return line, and the wrong-folder denial as the dispatch's error.
- **operator_need:** answer OQ12 in `phase.md`.
  - **Recommended:** resume F2 for one more bounded revision and one rerun per case: about $5 more, the size limit raised from 1.5 KB to about 2 KB.
    - D0b treats a probe's own command form as the probe's error and sends probe B once more.
    - The dossier check and the search total move into the publish step that Sonnet leads do run (before `knowledge check`), as one report line.
  - **Or** accept F2 as it stands (the headline holds) and file those two as a deferred job. The re-review's Sonnet run would then show the same misses.

## The cause of run a's `path: sequential`

**This is a well-supported suspect, not a located cause.** Run a's session was not persisted (`--no-session-persistence`), but the harness kept its full stream (`scratchpad/review/runs/a/out.jsonl`, 314 KB: the lead and every event). That is the transcript. The lead's 13 thinking blocks are redacted (`thinking: ""` with only a signature), so its own words at D0b are not there. What the stream does show:

1. **The capability was there.** At init, `Task` was among the tools and all five `knowledge:` agent types were listed. The full skill was loaded: the first turn's cache creation was about 65k tokens, the same as F1's `confirm2` and run b.
2. **The path was decided before the preflight ran, not by it.**
   - After §2's resolver, the converter and `which pdftotext`, the lead made probe B's calls itself and never tried an `Agent` call, not even probe A.
   - §3.2 says "On the sequential path, make the same six calls yourself".
   - Its first `run.md`, written right after, already reads `mode: sequential · agents: lead · wave: 0`, `verifier: lead (degraded)`, `path: sequential`. Nothing failed first.
3. **It took `quick` as "a quick pass", not as a run kind with a map.**
   - It skipped §9.1's working-folder read, D1's `plan.md`, the findings files, D6 and D7's trace, and read pages only through WebFetch.
   - Its closing words describe its own model of the run: "A full-depth run would replace the quick pass here with a research team, second-model verification and a critic for each chapter."
   - In the skill, `quick` keeps the second-model verification. The lead believed it does not.
4. **The book branch is the one difference from the Sonnet runs that passed.**
   - F1's `confirm` and `confirm2` (Sonnet, `quick`, a plain single document) both took `path: plugin`. Run a (Sonnet, `quick`, a book request outside a workspace, under `claude -p`) did not.
   - §9.1's no-workspace text frames the document as the stand-in: "I can write one document now"; "Otherwise never ask: write the single document".

**The suspect, as a chain of the skill's own words:**

- The card ("you research alone into the same dossier") and §1 ("you research alone, with one verifier batch") define `quick` without saying the agents stay.
- §3.3's mode block offers `agents: plugin | generic | lead`, so a lead that "researches alone" fills `agents: lead`.
- `sequential` is also D0b's third path, and §3.3 said "the sequential path makes it `lead (degraded)`".
- §3.9's verifier clause carried its own escape hatch: "a verifier agent where you can dispatch one … with none, `verifier: lead (degraded)`".
- §9.1's fallback framing made the run a cheap overview.

Run a's mode block is exactly that chain, written before any research. Which link decided it cannot be read from a redacted transcript, so the fix closes every link. **In F2's four Sonnet runs the chain did not recur:** every lead dispatched probe agents and recorded `agents: plugin`, f2a2 included, which was run a's prompt word for word.

## The edits and the size

`plugin/skills/explain/SKILL.md` went from 153,933 to **155,379 B (+1,446 B, limit 1.5 KB)**. `.agents` is 154,753 B (its own frontmatter); `web/public` is byte-identical to the plugin copy.

**First pass, before any run:**

- **The card's `quick` bullet:** "no research team: you research the angles yourself, then one verifier batch by the verifier agent on another model. The path stays D0b's, and every agent and file §3.9 lists stays. …"
- **§1's flag line:** "no research team, gap rounds, counter-evidence or critic; you research the angles yourself, and every agent and file §3.9 lists stays."
- **§3.2, step 1:** the path is picked "by what you can spawn, never by the run (`quick` too)".
- **§3.3:** `mode` is how the research ran (`quick`: sequential), and `agents` is D0b's path whatever the run. `searches` counts every WebSearch of the run.
- **§3.9, rewritten:**
  - `quick` cuts the research team, never the agents, the files or the map. "Alone" means no researchers in waves, not no agents.
  - The path is D0b's rule.
  - What `quick` keeps on every path is named once: D0b's two probe agents; `plan.md`; the findings files and `library.md`; the verifier agent's batch on another model; `gaps/final.md`; `outline.md` with `## Reader's task`; `trace.md`.
  - The `with none, lead (degraded)` escape hatch is gone.
- **§8, a new first paragraph:** the dossier check, one `ls <DOSSIER> <DOSSIER>/findings <DOSSIER>/verify <DOSSIER>/gaps`.
  - Each run kind's required files are listed. A missing file is named in item 2 as a skipped stage with its reason.
  - A verifier or critic played by the lead, or on its model, while its `knowledge:` agent was listed is a defect, stated as one ("the verifier agent was available and not used").
  - Then `run.md`'s mode block is brought up to date (`verifier:`, `searches:`). Item 2 was shortened to match.
- **§9.1:** "write the single document, every stage of its run kept".

**The one revision, after f2a and f2b:**

- **§3.2:** a denied call on a folder other than `run.md`'s `dossier:` and `tools:` paths is the dispatch's error (`tools:` is `<TOOLS>`). The lead corrects the path and re-dispatches once; it is not a stop. This covers f2a.
- **B6:** every role's second return line is `searches: <n>`. `--write-agents` regenerated the five agents.
- **§3.3:** `searches:` is yours, plus the probe's one, plus each role's return line.
- **The card's D9 row:** "§8's dossier check, then `report.md`; `run.md` final, `state: done`".
- **Trims to stay under 1.5 KB:**
  - §3.9's list was shortened;
  - §8 item 2 lost its parenthesis;
  - §3.3 lost "`lead` only on the sequential path".

## The runs

**Isolation** was P32.REVIEW's harness copied to `scratchpad/f2/harness/` (scratch token `f2-token`):

- scratch `XDG_CONFIG_HOME`, `XDG_STATE_HOME`, `KB_ROOT`, `KB_API_BASE_URL` and `KB_API_TOKEN`, checked with §2's resolver before each run;
- `--setting-sources project`, `--permission-mode manual --permission-prompts none`, the deny rules on `//Users/sugang/.config/knowledge-kb/**`, `--plugin-dir plugin`, `--no-session-persistence`;
- `watchdog2.py` at $6 per run, with no `--max-budget-usd` and no permission-skipping flag;
- fresh scratch stacks on :8863 (f2a, f2b) and :8864 (f2a2, f2b2), both stopped at the end (my own PIDs 74094 and 15505; both ports confirmed free).

The checks come from `scratchpad/f2/tools/check.py`, which reads the stream, the dossier and the stack.

| Check | f2a (run a's prompt) | f2b (sourdough) | f2a2 (run a's prompt, revised) | f2b2 (sourdough, revised) |
|---|---|---|---|---|
| `path: plugin` | pass | pass | pass (probe agents dispatched; no `run.md` yet) | pass |
| D0b's two probe agents (haiku) | pass | pass | pass; **probe B denied** | pass |
| verifier on a model other than Sonnet | pass (`knowledge:verifier`, `model: opus`) | pass (Opus) | not reached | **partial**: r1-b1 was sent without `model` and ran on Sonnet. The lead read the model from the return and re-ran the batch on Opus (r1-b2), which the ledger cites |
| `plan.md`, `findings/`, `library.md` | pass | pass | not reached | pass |
| `gaps/final.md`, `trace.md` | not reached | pass | not reached | pass |
| `outline.md` opens `## Reader's task`, not in the chapter | not reached | pass | not reached | pass (the published source fetched, no such heading) |
| `searches:` matches the transcript | pass (6 = lead 5 + probe 1; it stopped before any role's return) | **fail** (2 against 14: lead 4, probe 1, verifier 9) | not reached | **fail** (1 against 5: lead 4, probe 1, verifiers 0; both verifiers did return `searches: 0`) |
| dossier `ls` before D9 | not reached | **not done** | not reached | **not done** |
| publish to the scratch stack only | nothing published | pass (:8863) | nothing published | pass (:8864) |
| outcome | **stopped at D3v**, `FAILED: permissions` | published; **missed** | **stopped at D0b**, `FAILED: permissions` | published; **missed** |

**What each miss was:**

- **f2a.** The lead's `knowledge:verifier` dispatch named `tools:` as the explain root, not `<TOOLS>`. The verifier ran `python3 -I <explain root>/pagetext.py …` eight times, each denied by the allow rule `Bash(python3 -I <TOOLS>/pagetext.py *)`. It returned `failed: permissions`, and the pre-F2 text gave the lead no reason to treat that as the dispatch's error. The revision's §3.2 sentence covers it. Evidence: `rehearsal/f2/f2a/evidence.md` and `final-message.md`.
- **f2a2.** Probe B, a haiku general subagent, wrote call 3 as `mkdir -p <TOOLS>/probe && curl …`, though the lead's prompt gave the exact `curl … --create-dirs` command. That form is outside every allow rule, so it was denied. Calls 4 and 6 then failed for want of the page.
  - The lead stopped with the permissions block, exactly as D0b's text says ("A `denied` call → stop").
  - D0b has no counterpart to §3.2's "a call in another form is the role's error".
  - Across this phase's rehearsal streams, probe B did this in **1 of 17** runs; the other 16 ran `curl` first.
  - Evidence: `rehearsal/f2/f2a2/final-message.md` (probe B's calls and return, the lead's message).
- **f2b and f2b2.** Every file was there and the chapter was published to the scratch stack. But `run.md`'s `searches:` stayed at the preflight's count, and the lead never ran the `ls`.
  - The findings file listed the lead's 4 queries (`## Queries`), and the verifiers returned their `searches:` lines (B6 took), so the total was derivable. The lead never totalled it.
  - In f2b2 the lead published, wrote `report.md` and ended its turn with `run.md` still at `D2 research`. It fixed `stage` and `verifier:` only in a later turn, when a background notification woke it.
  - The revised D9 row and §8's first paragraph were in place for f2b2, and the Sonnet lead did not act on them. It does reliably run `knowledge check` before publishing. That is why the proposal moves the check there.

**Under the plan's rule** ("Revise once, then rerun that case once. A second miss returns `needs_operator`"), both cases have missed twice. The transcripts are `scratchpad/f2/runs/{f2a,f2a2,f2b,f2b2}/out.jsonl` (887 KB, 104 KB, and f2b's and f2b2's). That scratchpad belongs to this session and may not outlive it, so the kept evidence is in `rehearsal/f2/`.

**Leak scans** (`scratchpad/leakcheck/scan.py` over each run's folder, the scratch stack and `~/.claude/projects`) after f2a, f2b, f2a2 and f2b2 found the same six known files each time and nothing new. The kept rehearsal files carry no token. (`spend.md` names the scratch stack's own throwaway token, `f2-token`.)

## Spend

`rehearsal/f2/spend.md` holds the ledger:

| Run | Cost |
|---|---|
| f2a | $1.93 |
| f2b | $2.83 |
| f2a2 | $0.41 |
| f2b2 | $2.04 |
| **Total** | **$7.21 of the $20 cap** |

No watchdog fired. The watchdog estimates were 1.86, 2.68, 0.47 and 1.89, each within 15% of its run's `total_cost_usd`.

## Kept

`rehearsal/f2/`, with no `pages/` anywhere:

- `spend.md`;
- `f2a/`: `run.md`, `files.txt`, `final-message.md`, `evidence.md` (no outline or report; it stopped at D3v);
- `f2b/`: `run.md`, `outline.md`, `report.md`, `files.txt`;
- `f2a2/`: `final-message.md`, `files.txt` (no dossier; it stopped at D0b);
- `f2b2/`: `run.md`, `outline.md`, `report.md`, `files.txt`.

## Notebook

All edits were made one section at a time, through `phase-section`:

- **`## Decisions`:** d70 (one line); the full entry is in `topics/build-decisions.md`.
- **`## Doc impact`:** three lines (above).
- **`## Operator Questions`:** OQ12. Its first sentence was corrected in place right after the append, with a precise Edit to my own line, because the run counts were wrong.
- **`## Notes for later slices`:** the F2 note was replaced by a note for F2's resumption, and the re-review note now says what F2 changed and which runs to look at.
- **`## Now`:** rewritten.
