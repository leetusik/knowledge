# Rehearsal 1b: scorecard (P32.F1)

**Old** is rehearsal 1's old chapter: plugin 0.5.0, the stored files `../r1/chapters/c-old.md` and `g-old.md`.

**New** is the same research rewritten with the fixed writing stage. Each dossier is S7's, reset to D6
(`reset-c.md`, `reset-g.md`; v2 from fresh copies, `reset-c2.md`, `reset-g2.md`) and run as
`/knowledge:explain resume <run-id>` on an Opus lead with `--plugin-dir plugin`. It goes through the critic
(Sonnet) and is published to a scratch stack.

**Rules v1** is this slice's first rewrite of D6–D7:
- the reader's tasks and their deliverables;
- the path in the reader's order;
- six prose rules and a reader pass;
- the critic's `reader` category.

**Rules v2** is the one allowed revision, made after the misses below. It is the rules as they stand.

**Judging.** Sonnet judges, blind, one fresh `claude -p` session per order. They use rehearsal 1's rubric
(`judges/judge-rubric.md`) and the hidden checklist from `../r1/subjects.md`. The keys are in `judges/key-*.json`.

**Order.** "o1" is the session where chapter 1 was old; "o2" swaps them. A pairwise win counts only when both
orders agree; otherwise it is a tie.

## Result

| Subject · rules | Helpfulness | Comprehensiveness | Insight | Readability | Target |
|---|---|---|---|---|---|
| C · rehearsal 1 (S7, before the fix) | old · old → **old** | new · new → **new** | new · new → **new** | old · old → **old** | — |
| C · v1 | new · new → **new** | new · new → **new** | new · new → **new** | old · old → **old** | miss (Readability) |
| G · v1 | old · new → **tie** | new · new → **new** | new · new → **new** | old · old → **old** | miss (Readability) |
| **C · v2** | new · new → **new** | new · new → **new** | new · new → **new** | old · old → **old** | **miss** (Readability) |
| **G · v2** | new · new → **new** | new · new → **new** | new · new → **new** | old · old → **old** | **miss** (Readability) |

The target: in both orders, new wins or ties Helpfulness and Readability, keeps Comprehensiveness and Insight,
and has no R1/R3/R5/R7 failure.
- **Mandatory checks:** met by new on both subjects in all eight sessions (table below).
- **Comprehensiveness and Insight:** kept on both subjects, under both rule sets.
- **Helpfulness:** v2 wins it on both subjects in both orders. On G that is a flip from v1's tie; on C it holds
  v1's flip of rehearsal 1.
- **Readability:** still old on both subjects, in both orders, under v2. That is the one miss. Per d61 no further
  rule revision was made; the next lever is the operator's call (`result.md`).

## Absolute checks (R1–R9), by arm

| Session | Arm | R1 must-cover | R2 expert | R3 cited / checked / supported / partial / contradicted · effective | R4 | R5 code | R6 traps | R7 English · keys · `check` | R8 | R9 |
|---|---|---|---|---|---|---|---|---|---|---|
| C-o1 | old | 8/8 | 3/4 | 7 / 7 / 7 / 0 / 0 · 4 | 8/8 | pass | none | yes · 5/5 · — | pass | minor |
| C-o1 | new v1 | 8/8 | 4/4 | 26 / 15 / 13 / 2 / 0 · 12 | 10/10 | pass | none | yes · 5/5 · exit 0 | pass | minor |
| C-o2 | old | 8/8 | 3/4 | 7 / 7 / 6 / 1 / 0 · 4 | 7/7 | pass | none | yes · 5/5 · — | pass | none |
| C-o2 | new v1 | 8/8 | 4/4 | 16 / 15 / 15 / 0 / 0 · 14 | 8/8 | pass | none | yes · 5/5 · exit 0 | pass | minor |
| G-o1 | old | 8/8 | 4/4 | 45 / 12 / 10 / 2 / 0 · 11 | 7/8 | — | none | yes · 5/5 · — | pass | none |
| G-o1 | new v1 | 8/8 | 4/4 | 150 / 13 / 12 / 1 / 0 · 13 | 9/10 | — | none | yes · 6/6 · exit 0 | pass | minor |
| G-o2 | old | 7/8 ¹ | 4/4 | 35 / 15 / 15 / 0 / 0 · 8 | 8/8 | — | none | yes · 5/5 · — | pass | none |
| G-o2 | new v1 | 8/8 | 4/4 | 150 / 15 / 13 / 2 / 0 · 14 | 8/9 | — | none | yes · 6/6 · exit 0 | pass | minor |
| C-o1-v2 | old | 8/8 | 3/4 | 8 / 8 / 7 / 1 / 0 · 4 | 7/7 | pass | none | yes · 5/5 · — | **fail** ² | minor |
| C-o1-v2 | new v2 | 8/8 | 3/4 | 15 / 15 / 14 / 0 / 0 · 12 (1 unopenable) | 8/8 | pass | none | yes · 6/6 · exit 0 | pass | minor |
| C-o2-v2 | old | 8/8 | 3/4 | 8 / 8 / 8 / 0 / 0 · 4 | 8/8 | pass | none | yes · 5/5 · — | **fail** ² | minor |
| C-o2-v2 | new v2 | 8/8 | 4/4 | 15 / 15 / 15 / 0 / 0 · 13 | 9/10 | pass | none | yes · 6/6 · exit 0 | pass | minor |
| G-o1-v2 | old | 8/8 | 4/4 | 45 / 15 / 13 / 2 / 0 · 7 | 7/7 | — | none | yes · 5/5 · — | pass | minor |
| G-o1-v2 | new v2 | 8/8 | 4/4 | 120 / 15 / 11 / 2 / 0 · 9 (2 unopenable) | 8/9 | — | none | yes · 6/6 · exit 0 | pass | minor |
| G-o2-v2 | old | 8/8 | 3/4 | 45 / 15 / 13 / 2 / 0 · 9 | 8/8 | — | none | yes · 5/5 · — | pass | none |
| G-o2-v2 | new v2 | 8/8 | 4/4 | 110 / 15 / 13 / 2 / 0 · 13 | 9/10 | — | none | yes · 6/6 · exit 0 | pass | minor |

¹ Old G omits the shared-iterator part of G-M8. A grep confirms it: "iterator" occurs 0 times in `g-old.md` and
2 times in `chapters/g-new.md`.

² The v2 judges failed old C's R8 in both orders (o2's prose says "partial pass"): it states "the 201 never waits
on the network" without the lock-wait exception, which new C names. The v1 judges passed it. Judge variance on the
same old file; it does not change a pairwise result.

**R7 `knowledge check`.** Run on a fresh scratch API (:8833), exit 0 for `c-new` (v1), `g-new` (v1), `c-new-v2`
and `g-new-v2`.

## What the judges said

**C, v1:**
- **New wins Helpfulness in both orders.** It has a field table and an error-order table. Its "Before you
  change" list is tied to the concurrency limits. It shows the one way the 201 can wait (`WRITE_LOCK` behind a
  push), which old misses.
- **Old wins Readability in both orders.** It is "shorter and linear". New is "about 55% longer and denser,
  with line-number clutter" and "long and dense".

**G, v1:**
- **Helpfulness splits.** o1 says new's "verdicts are buried under attribution detail", while old has a
  runnable benchmark, a race demo and a decision flow. o2 credits new's decision table, the dependency checks,
  one asyncio loop per thread, the testing tools and the subinterpreters note.
- **Old wins Readability in both orders.** New is "dense and very long, with heavy citation clutter".

**C, v2:**
- **New wins Helpfulness in both orders:** the lock-wait exception to "201 never waits", the GET-before-re-POST
  rule, the unpushed-commit check and the race hazards (o1); the full ordered 422/409 list, the race and rollback
  gaps and a fuller change checklist (o2).
- **Old wins Readability in both orders, on length alone.** o1: old is "shorter and tighter, with a clear numbered
  invariants checklist"; new is "longer but well structured". o2: old is "shorter, with a timeline, a sequence
  diagram and a tight checklist"; new is "longer but well structured". Neither mentions clutter or density now.

**G, v2:**
- **New wins Helpfulness in both orders,** where v1 split: the asyncio section (one loop per thread,
  `to_thread`), the concrete dependency check with live counts, the testing steps, subinterpreters and a
  try/wait table. Old is credited with its decision flow and runnable `scale.py`.
- **Old wins Readability in both orders.** o1: old is "shorter, with a runnable benchmark and worked examples";
  new is "denser". o2: old is "shorter and tighter, with runnable `check_gil.py`/`scale.py`, a clear key-idea
  callout and little repetition"; new is "dense and long, with many inline citations".

**Spot-checks of the judges** (against the chapters, by grep):
- old C never mentions the lock wait behind a push;
- old G has no subinterpreters (0) and no iterators (0);
- new C v1 carries 18 inline `L<n>` line references, against 0 in old C;
- new G v1 has 177 citation links, against 44 in old G; new G v2 has 125.

All the judge statements checked hold.

## Rules v2 and the reruns

The judges' complaint was length, density, and citation and line-number clutter. The revision (`result.md`,
"Rule changes") added:
- a per-section word budget at D6 (a single document mostly 3,000–5,000 words in all);
- a reader pass that cuts to the budget;
- "Show, then tell", "Teach, don't report" (own voice; one citation per source per paragraph; a code location
  once, in its block's title) and "Shorter wins";
- two more `reader` should-fixes for the critic;
- the critic's `maxTurns` raised from 60 to 120.

Both subjects were rerun from fresh copies of their dossiers under v2 (`reset-c2.md`, `reset-g2.md`;
`dossiers/c-rw2/`, `dossiers/g-rw2/`). The chapters are `chapters/c-new-v2.md` and `chapters/g-new-v2.md`:

| Chapter | Words | Inline `L<n>` refs | Links (all `](`) | "says / notes / calls / promises / states" |
|---|---|---|---|---|
| `../r1/chapters/c-old.md` | 4,118 | 0 | 7 | 5 |
| `chapters/c-new.md` (v1) | 6,395 | 18 | 21 | 29 |
| `chapters/c-new-v2.md` (v2) | 5,881 | 0 | 14 | 20 |
| `../r1/chapters/g-old.md` | 4,803 | 0 | 44 | 7 |
| `chapters/g-new.md` (v1) | 8,561 | 0 | 177 | 43 |
| `chapters/g-new-v2.md` (v2) | 6,888 | 0 | 125 | 23 |

v2 moved both subjects the right way on every surface measure: C −8% words and no line refs, G −20% words, −29%
links and about half the attribution verbs. Both are still about 43% longer than old (C 5,881 against 4,118; G
6,888 against 4,803), and both are above the 5,000-word budget D6 sets. The judges' Readability reasons follow
that: on C only length is left; on G length plus the inline citations.

## What the runs showed about the skill (beyond the scores)

- **The critic dispatched in the background dies under `claude -p`.** The C lead dispatched it with
  `run_in_background` and ended its turn. The host stopped the critic after 600 s idle, and the session ended
  at D8. §4.10 now says to dispatch it in the foreground. All three Opus sessions after the fix (rw-c2, rw-c-v2,
  rw-g-v2) did so, and each finished.
- **The critic hit its 60-turn limit** on its first attempt on both subjects (C, without `pages/`, re-fetches 14
  sources; G has `pages/`). Each failure costs a re-dispatch. Under `maxTurns: 120` both v2 critics finished in
  one attempt (G v2: revise, 2 must-fix, 12 should-fix, one revision).
- **The mode block:** G's lead left `searches: 0` in `run.md` in both v1 and v2 (its report says "about 60"); v1
  also wrote a D8 log line inside `## Mode`; the confirm run left `searches: 0` too (report "~4"). C's runs keep
  `searches: 1` in both. Partly met (plan item 7).
- **G's resume verified 8 `candidate` claims** that the new map used (one D5 batch) in v1. This was a
  verification of already-found claims, not new research.
- **G v2 published under a new slug** (`python/2026-10-23-free-threaded-cpython-python-without-the-gil-and-whether-to-use-it-today.md`,
  v1 used `…-free-threaded-cpython.md`), each on its own fresh stack, so nothing was overwritten.

## The confirming run and the resume lookup (`dossiers/confirm2/`)

`quick` on a Sonnet lead, the `knowledge` CLI off PATH, the prompt "…on 429 and 503 responses (reader: a backend
developer who writes API clients) quick", a fresh stack (:8835):
- **The mode was read right** with the flag set apart: `run: quick`, the lead researched alone (4 sources, 11
  claims, 19/19 quotes checked).
- **§3.9's verifier ran on another model:** `knowledge:verifier` on Opus ("I am Sonnet"), one batch of 10 claims:
  9 supported, 1 partial (narrowed in the chapter).
- **The curl publish:** `knowledge --version` failed (off PATH), so the lead built the payload with
  `pagetext.py --payload` and sent it with `curl --json` to the check and then the documents endpoint: 201, v1,
  committed, `pushed: false`. 1,703 words.
- **The gate held** in `quick` (4/4 load-bearing answered); the critic was skipped as `quick` says.
- **A miss: no `outline.md` at all.** The lead went from D5g straight to D7 (its log: "stage: D7 write"), so
  neither D3's outline nor D6's reader's path was written; it put a `## Reader's task` section (three tasks) at the
  top of the chapter itself instead. §3.9 lists D3 but does not say D6 still runs in `quick`. Not changed here
  (d61: no further rule revision); a note for S9.
- **The resume lookup:** the run was set back to `stopped` at D9 with `report.md` removed, and a newer finished
  decoy dossier (`state: done`) put beside it. `/knowledge:explain resume` with no run id picked the stopped run
  ("the only unfinished one"), re-ran the preflight, read the document back by path (200) instead of publishing
  again, wrote `report.md` and set `state: done`. No second commit on the stack.
