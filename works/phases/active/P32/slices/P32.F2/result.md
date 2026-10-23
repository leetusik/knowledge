# P32.F2 result

## Verdict

- **status:** done
- **tier:** high
- **model:** opus
- **effort:** xhigh
- **summary:** `quick` now keeps the agents, the files and the map, and its path follows D0b's rule.
  - **First pass:** the card, §1, §3.2, §3.3, §3.9, §8, §9.1, and B6, with the five agents regenerated.
  - **Second revision (OQ12 → (a), d71):** D0b re-sends a probe whose own command form was denied. §4.9 writes the dossier line and the `searches:` total right before `knowledge check`, and D9 only points to it.
  - **Size:** the skill is 155,790 B (+1,857 B over 153,933 B).
  - **Live, six Sonnet runs ($13.00 of $20):** run a's `path: sequential` never came back. The headline held wherever a run reached it, in full on the final text in f2b3.
  - **Two misses are named, not fixed.**
    - Sonnet never writes the dossier line or the search total.
    - Run a's prompt never published. Its last try (f2a3) ended when `claude -p` stopped the background verifier at 10 idle minutes.
- **files_changed:**
  - `plugin/skills/explain/SKILL.md`, `.agents/skills/explain/SKILL.md`, `web/public/SKILL.md`;
  - `plugin/agents/{web-researcher,code-researcher,gap-reviewer,verifier,explain-critic}.md` (regenerated in the first pass, for B6);
  - `works/phases/active/P32/phase.md` (Decisions d70 corrected in place, Doc impact, Notes, Now);
  - `works/phases/active/P32/topics/build-decisions.md` (d70);
  - `works/phases/active/P32/rehearsal/f2/` (`spend.md`, and `f2a/`, `f2b/`, `f2a2/`, `f2b2/`, `f2a3/`, `f2b3/`);
  - this `result.md`.
- **validation:**
  - `python3 scripts/skills_parity.py`: PASS (the web copy byte-identical; the 5 agents match Part B);
  - `python3 scripts/plugin_parity.py`: PASS;
  - `claude plugin validate plugin`: passed;
  - `python3 scripts/workflow.py validate`: passed (only the existing warnings);
  - `git diff --stat`: within `plugin/`, `.agents/skills/explain/`, `web/public/SKILL.md` and P32's folder;
  - bootstrap: `git status` clean, and no command was run there;
  - live runs: f2a, f2b, then f2a2 and f2b2 (first revision), then f2a3 and f2b3 (second revision, d71). Each run's checks are below;
  - leak scan after every run: the same six known files;
  - all three scratch stacks (:8863, :8864, :8865) stopped, my own PIDs only.
- **deviations:**
  - Part B's B6 changed in the first pass, so `--write-agents` ran; the second revision left Part B alone.
  - Each round of runs used a fresh scratch stack (:8863, :8864, :8865), so no rerun found an earlier run's document.
  - f2a3 is counted at its watchdog's streamed estimate ($3.87), not its last `result` event ($3.57), because the stopped verifier worked on after that event.
  - Two findings are reported, not fixed. d71 allowed one revision.
- **doc_impact:** four lines are in `phase.md` `## Doc impact`.
  - First pass:
    - finding 3's exact line (qa.md, operations.md: the AGENTS check);
    - product.md: `quick` keeps the agents, the files and the map;
    - architecture.md: the dossier check, `searches:` as the total, B6's return line, the wrong-folder denial.
  - Continuation: a superseding architecture.md line. The dossier line moves to the publish step (§4.9), and a probe's own command form is the probe's error, sent once more.
- **deferred-job candidates** (for the re-review to route):
  1. **A mechanical dossier and search-total line.** The trigger: three Sonnet runs, on two placements of the text, never wrote it. A tool that prints the line is the remaining route.
  2. **Headless verifier batches.** Under `claude -p`, a verifier batch or wave sent in the background is stopped 10 idle minutes after the lead's last turn (f2a3). The trigger: any headless `quick` or `full` run whose batch outlasts 10 minutes. The critic is already foreground for this reason (§4.10).

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

## Continuation (OQ12 answered (a), Decisions d71)

The operator answered: "/do-whole-phase with a". That allowed one more bounded revision, then one Sonnet rerun per case.

### The second revision (all three copies; Part B unchanged)

- **D0b, step 4.** A call the probe wrote in another form than step 3 gives (a `mkdir … &&`, a `cd`, a `$`) is now the probe's error, not a stop. The lead sends that probe once more with the six calls as written; a second denial stops. Probe B's brief now reads "exactly these calls, as written".
- **§4.9.** It opens with **the dossier line**, offline too; a chapter (§9.3) skips it, because its files have other names.
  - One `ls` of the dossier, `findings/`, `verify/` and `gaps/`, against the run kind's file list.
  - The mode block's `searches:` line is rewritten with the run's total and ends `· dossier: complete` or `· dossier: missing <file> (<the stage skipped, why>), …`.
  - `verifier:` is set to the model that ran.
  - An unused listed verifier is stated there as a defect.
  - The dry-run check follows ("Then, …").
- **§8.** The first-pass "First, a published run checks its dossier" paragraph is gone. Item 2, the mode block, says its `searches:` line carries §4.9's dossier line, and that a role played by the same model or by the lead is a defect while its `knowledge:` agent was listed.
- **The card.** D8's row writes "the dossier line"; D9's row is back to `report.md`, `run.md` `state: done`.
- **§3.3.** The template's `searches:` line gains `[ · dossier: complete | missing …]`. "Yours" is defined as your findings' `## Queries`, and "§4.9 adds the dossier".
- **Size.** 155,790 B (+411 B over the first pass's 155,379 B, +1,857 B over 153,933 B; the limit is ≈ 2 KB). `.agents` is 155,164 B and `web/public` byte-identical. Both guards and `claude plugin validate plugin` pass.

### The reruns

These ran on a third fresh stack on :8865 (PID 54918, now stopped). The isolation was unchanged:

- scratch `XDG_*` and `KB_*`, with §2's resolver printing only the scratch values;
- `--setting-sources project`, `--permission-mode manual --permission-prompts none` and the deny rules on `//Users/sugang/.config/knowledge-kb/**`;
- `--plugin-dir plugin` and `--no-session-persistence`;
- `watchdog2.py` at $6, with no budget flag and no permission-skipping flag.

`check.py` gained a check for the dossier line in `run.md` and the report.

| Check | f2b3 (sourdough) | f2a3 (run a's prompt, word for word) |
|---|---|---|
| `path: plugin`, two haiku probes | pass | pass (probe B `ok` ×6) |
| verifier on a model other than Sonnet | pass (`knowledge:verifier`, `model: opus` on the first dispatch) | pass (dispatched on Opus, ran on `claude-opus-5-5`; stopped before it wrote) |
| `plan.md`, `findings/`, `library.md` | pass | pass (10 sources, 22 claims, `--check` all found) |
| `verify/`, `gaps/final.md` | pass | not reached |
| `outline.md` opens `## Reader's task`, not in the chapter | pass (the published source fetched) | not reached |
| `trace.md` | pass | not reached |
| the dossier line, `searches:` matching the transcript | **miss**: no `ls`, no line; `run.md` `searches: 1 (probe)` against 5 made (lead 4, probe 1), `verifier: pending` (the report names the Opus verifier) | not reached; mid-run, `run.md` read `searches: 7 lead + 1 probe = 8`, the §3.3 total form |
| publish to the scratch stack only | pass (:8865) | nothing published |
| outcome | **published; the bookkeeping missed again** | **ended at D3v by the headless runner**, resumable |

**f2b3.** After writing `trace.md`, the lead went straight to `knowledge --version`, then `knowledge check`, a fix and `save`. The §4.9 paragraph sits directly above the command it ran, but it never ran the `ls` or rewrote the mode block. In three Sonnet runs and two placements of the same text (first D9, then the publish step), the bookkeeping did not take; prose alone does not carry it. The remaining route is mechanical: a tool the lead already runs prints the line. That is deferred-job candidate 1.

**f2a3.** The lead passed D0b and researched into `findings/r1-lead.md`, `library.md` and `ledger.md`. It then sent `knowledge:verifier` with `model: opus` **in the background** (§3.5's form) and ended its turn to wait (its last event at +378 s).
- The verifier made 75 tool calls; its last event was at +891 s.
- At +979 s (the lead's last turn + 600 s), `claude -p` ended the session: "Background tasks still running 10m after the last turn (subagent "Verify claims batch r1-b1"); stopping them. Set CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 to wait indefinitely."
- No verify file, outline, trace or publish. `run.md` stays at `D3v verify · state: running`.
- Nothing was skipped by the lead's choice. The skill already sends the critic in the foreground for this reason (§4.10 step 1); a verifier batch or wave under a headless session has no such rule. That is deferred-job candidate 2. Evidence: `rehearsal/f2/f2a3/evidence.md`.

**Run a's prompt across the slice:**
- f2a was stopped by a wrong `tools:` folder; the first revision covers it.
- f2a2 was stopped by a haiku probe's own `mkdir … && curl`; the second revision covers it. In f2a3, probe B used the given form.
- f2a3 was stopped by the headless 10-minute ceiling on background agents.

None of the three repeated run a's `path: sequential` or skipped an agent or a file, but none reached `outline.md`. For run a's prompt the headline is therefore shown up to the verifier (D3v). The sourdough case shows it whole three times (f2b, f2b2, f2b3).

**The verdict, by d71's rule.** The rule is "`done` with the miss named if the headline held; `needs_operator` only if the headline failed". No headline item failed in any run. Every item a run reached was done as the skill says, and f2b3 shows all five on the final text. So the verdict is `done`, with both misses named here, in `## Now`, and in the re-review's note.

### Spend and leak scans

- f2b3 cost $1.92 and f2a3 $3.87 (the watchdog's streamed estimate; its last `result` event says $3.57, but the verifier worked on after it). The continuation was $5.79, bringing the total to **$13.00 of $20** (`rehearsal/f2/spend.md`).
- The leak scans after f2b3 and f2a3 found the same six known files. No new hit.
- Kept files:
  - `rehearsal/f2/f2b3/`: `run.md`, `outline.md`, `report.md`, `files.txt`;
  - `rehearsal/f2/f2a3/`: `run.md`, `files.txt`, `evidence.md`;
  - no `pages/`.

### Notebook (continuation)

- **`## Decisions`:** d70 corrected in place (§4.9's dossier line, the probe rule, the live result). Its `topics/build-decisions.md` entry gained the continuation, and its heading now reads "the dossier line before publishing".
- **`## Doc impact`:** one superseding architecture.md line appended. The earlier lines are committed and append-only, so the new one says what it supersedes.
- **`## Notes for later slices`:** the F2-resumption note was consumed and removed. The re-review note now says what F2 changed, which runs to read (`spend.md` first; f2b3, f2a3), and the two findings to route.
- **`## Now`:** rewritten.
