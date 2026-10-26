# P32.REVIEW round 4 evidence: three direct probes of `knowledge:verifier` (after P32.F5)

**Setup.** One `claude -p` session, `--model sonnet`, on round 2's harness (`scratchpad/review2/`, spec
`harness/spec-r4p.json`, run `runs/r4p/`). The isolation is in `../spend.md`, round 4. A scratch dossier
(`20261025-r4-probe`) holds a copy of rv3a's `findings/r1-all.md` and `library.md` (as F5's f5p did) and
`tools/pagetext.py`. The prompt told the main thread to make three foreground `knowledge:verifier` calls, **none
with a `model` parameter** (so each verifier ran on its `sonnet` frontmatter), on C-r1-all-02 and C-r1-all-03
(both on S-r1-all-01, HyperPhysics), to make no other call, never retry, and print the returns verbatim. The calls
and returns, verbatim, are in `probe-returns.txt`; every subagent `Bash` command and its result is in
`probe-bash.txt`; the two verify files written are `verify-r4-a.md` and `verify-r4-c.md`.

The main thread made exactly the three `Agent` calls and no other tool call; each call's prompt is the spec's,
byte for byte. 4 turns, 108 s, **$0.33** (the watchdog estimated $0.26). `modelUsage`: `claude-sonnet-5-5`
$0.318, `claude-haiku-5-5` $0.012 (Claude Code's own housekeeping; no haiku agent was dispatched).

| Probe | Dispatch line (no `model:` on any call) | Ran on (return's model line; the stream) | Return | Expected | Verdict |
|---|---|---|---|---|---|
| a | `researchers_model: claude-opus-5-5` (the `full`-on-Sonnet case, and `full`/`quick` on an Opus lead) | `claude-sonnet-5-5` (both) | `Status: complete`; `verify/r4-a.md` headed `verifier: claude-sonnet-5-5`: 1 supported, 1 partial; the source re-fetched into `pages/r4-a/`, both passages found by `--find`, one search | runs and writes a verify file, no block | **PASS** |
| b | `researchers_model: claude-sonnet-5-5` | `claude-sonnet-5-5` (return line; 0 tool calls, so nothing streamed) | `status: blocked: same model as the researchers`; "I stopped before any check … wrote no `verify/r4-b.md`"; it names the two ways on (`model: opus`, or `same-model: accepted`) | blocks before any check | **PASS** |
| c | `researchers_model: claude-sonnet-5-5 · same-model: accepted` | `claude-sonnet-5-5` (both) | passed the guard and began the check (read the entries, fetched the source); `verify/r4-c.md` headed **`verifier: claude-sonnet-5-5 (same model, degraded)`**; then `status: failed: permissions`, no verdicts | runs, and records the degraded verifier | **PASS for the guard**; the check did not finish (below) |

**Probe c's failure is the verifier's own path slip, not F5's guard.** Its converter call was
`python3 -I <EXPLAIN_STATE>/20261025-r4-probe/tools/pagetext.py …`: it put the tools folder **inside the dossier**,
where no `pagetext.py` exists, instead of the dispatch's `tools:` path (`<EXPLAIN_STATE>/tools`, which probe a used
correctly, four times). The harness's allow rule covers only the dispatch's path, so the call was denied and the
role returned `failed: permissions`, as B6 says, with no verdict and the claims left `candidate`. In a real run
§3.2's folder clause classifies exactly this ("one on another path your dispatch's (`tools:` is `<TOOLS>`) … dispatch
it once more, the path corrected"), so the run would re-send the batch once and stop loudly on a second failure.
The hard limit of three probes left no re-send here.

**What the probes say about "the same family".** B4's guard reads "If it is the model you run on, or the same
family, or the line is missing". Probe a is the case the plan asked about: a Sonnet verifier given an Opus
researchers' model ran. It did not read `claude-opus-5-5` and `claude-sonnet-5-5` as one family (all Claude, or
the 5.5 generation). Probe b's return reads the guard as "the model I run on". B5's identical wording has run six
times with `writer_model: claude-opus-5-5` (or `opus`) and a `claude-sonnet-5-5` critic without a block
(`r1/dossiers/c-new`, `r1b/dossiers/{c-rw1,c-rw2,g-rw2}`, `r2/book/critique/how-wal-works.md`).

**Also seen (not F5's lines).** Probe a's Sonnet verifier rated C-r1-all-02 `partial`: the page prints "121 °C
(257 °F)", but 121 °C is about 250 °F. rv3a's Opus verifier and f5p's Opus call 2 rated the same claim
`supported` on the page's own words (B4's rule: a label "from what its source itself says"). rv3a's scratch
chapter carries the figure attributed to HyperPhysics, as B8 allows for a below-bar claim. Rehearsal-only.

## Leak scans

`scratchpad/leakcheck/scan.py`, before the session (`scratchpad/review2/`, `~/.claude/projects`) and after it
(the same, plus this folder): the six known files each time, no other hit. One wider pass after the session also
walked all of `/private/tmp/claude-502` and listed a seventh path,
`/private/tmp/claude-502/-Users-sugang-projects-personal-knowledge/1eb18f1b…/tasks/a5c22e0e39716ea81.output`. It is a
symlink, dated 2026-09-22, to known hit 2 (`1eb18f1b…/subagents/agent-a5c22e0e39716ea81.jsonl`), so it is the same
file and not a new copy; the session the symlink belongs to is not this phase's. The session was not persisted; Claude
Code left three `agent-*.meta.json` stubs (194 B each: the agent type and description) under
`~/.claude/projects/` in a folder ending `-runs-r4p-work`.
