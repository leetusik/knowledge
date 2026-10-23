# Rehearsal 1: scorecard

Old = plugin 0.5.0 at `2849ea6`; new = plugin 0.6.0 (`full`). Both writers on Opus, both under the new
skill's printed rules and the same isolation. Judge: Sonnet, blind, a fresh `claude -p` session per order
(`judges/`; the key is `judges/key-C.json`). The rubric is `rubric.md`; the judge's own copy is
`judges/judge-rubric.md`.
The scripts that ran every session (isolation, watchdog, cost estimate, judge folders, R7 check, the
three fix scripts) are in `harness/`, with S7's scratch paths baked in.

**Status: subject C is complete; subject G is not.** The cap was reached with new-g's chapter drafted but
not yet through the critic or published, so G's judges have not run. See `spend.md`, "Where it stopped".

## Subject C: POST /api/documents, validation to commit and push

Chapters: `chapters/c-old.md` (4,118 words) and `chapters/c-new.md` (4,065 words).

| Check | old, o1 | old, o2 | new, o1 | new, o2 |
|---|---|---|---|---|
| R1 must-cover (8) | 8 | 8 | 8 | 8 |
| R2 expert (4) | 3 (E3 absent) | 3 (E3 absent) | 4 | 4 |
| R3 cited / checked / supported / partial / contradicted | 9 / 9 / 9 / 0 / 0 | 9 / 9 / 9 / 0 / 0 | 19 / 14 / 14 / 0 / 0 | 24 / 15 / 14 / 1 / 0 |
| R3 effective citations | 4 | 4 | 11 | 12 |
| R4 primary or two-independent | 8 of 8 | 7 of 7 | 9 of 9 | 8 of 8 |
| R5 code truth | pass | pass | pass | pass ¹ |
| R6 traps committed | none | none | none | none |
| R7 English · quiz keys · `knowledge check` | yes · 4/5 ² · exit 0 | yes · 5/5 · exit 0 | yes · 5/5 · exit 0 | yes · 5/5 · exit 0 |
| R8 declared gaps | **fail** (mild) | pass | pass | pass |
| R9 padding | minor | none | none | minor |

Columns are by arm; "o1" is the session where chapter 1 was old, "o2" the swapped one.

¹ o2 left `resolve_api_write` and commit `207f2ff` unconfirmed (its `git cat-file` was denied). P32.S7
checked both at 9978d84: `server/api_auth.py:190` and a commit. So it is 30/30.

² o1 marked the old quiz's `q-validate` key `[a, d]` wrong. `server/main.py:1374-1377` (at 9978d84)
re-reads the manifest under `WRITE_LOCK`, so that a binding 409 or "a book that cannot be created (422)"
leaves nothing behind. The key is right, as o2 found. Read it as 5/5.

**Pairwise.** Both orders gave the same answer on every criterion:

| Criterion | o1 | o2 | Result |
|---|---|---|---|
| Helpfulness | old | old | **old** |
| Comprehensiveness | new | new | **new** |
| Insight | new | new | **new** |
| Readability | old | old | **old** |

What the judges said:

- **New** finds real defects that the old chapter and the project's notes miss:
  - validation is not re-checked under the lock, so two publishes to one path can race;
  - a publish waits behind a background push that holds the lock;
  - the locked section is not a transaction;
  - `architecture.md` contradicts the code.
- **Old** is a step-ordered code walk with line numbers. It ends in an invariants checklist ("Before you
  change the write path") and the test that pins it. That serves this reader's purpose, "trace, explain,
  change without breaking invariants", more directly.

**S1's decision rule on C:**

1. **No mandatory failure that old lacks: met.** New passes R1, R3, R5, R7 and R8 in both orders. Old
   failed R8 once.
2. **R3 accuracy ≥ old's: not met, by one item.**
   - New: 28 of 29 checked statements supported, 1 partial (git-push's remedy is `pull --rebase`; the
     chapter says "rebase and push again").
   - Old: 18 of 18 supported.
   - No contradiction on either side. New has about 3× the effective citations (11–12 against 4).
3. **New wins or ties Comprehensiveness and Helpfulness in both orders: not met.** Helpfulness went to
   old in both orders.
4. **The operator's read:** waiting for the acceptance walkthrough.

→ **On C, the new arm is not better by the rule.** It is more comprehensive and more insightful, and it
is the only chapter that found the race. It is less helpful and less readable for this reader.

## Subject G: free-threaded CPython

- **Old:** `chapters/g-old.md`, 4,803 words, published.
- **New:** `chapters/g-new-draft.md`, 9,052 words. This is the D7 draft. It is unpublished, has not been
  through the critic, and has not been judged.
- **New-arm dossier:** `dossiers/g-new/`, at D8.
  - 3 rounds;
  - the evidence gate passed: must-cover 6/6, load-bearing questions 21/21;
  - 70 claims through D5: 63 supported, 7 partial;
  - counter-evidence on 25 main claims: two refinements, and nothing contradicted.

**Pending:**

1. `/knowledge:explain resume 20261023-0350-free-threaded-cpython`, from D8;
2. two judge sessions;
3. the decision rule.

**Already visible: the length.** The new draft is 1.9× the old chapter. R9 (length is not merit, padding
is a negative) will decide whether that is depth or padding.

## New-arm checks (S2 §3.14), subject C, from `dossiers/c-new/`

- **`trace.md`:** maps every section's paragraphs, callouts, code blocks and quiz items to claim ids.
  Unmapped sentences are only those marked `framing`.
- **`gaps/final.md`:** every line was honoured as its disposition says.
  - The three `stated` gaps appear in the body: the `architecture.md` contradiction, `KB_GIT_TIMEOUT_S`
    with no bound on the whole push, and the ignored `rebase --abort`.
  - The two `dropped` gaps do not (`index.lock`, the object-transfer wording).
- **Ledger:**
  - 140 claims verified on Sonnet: 119 supported, 21 partial;
  - the gate passed: must-cover 5/5, load-bearing questions 16/16;
  - counter-evidence on 3 main claims: none found.
- **The S6 items the lead had to keep:**
  - `outline.md` was rewritten at D6 (sections, questions, claim statuses, code ranges, diagrams). It does
    not repeat the declared gaps per section.
  - `run.md` has `## Critique` with C01–C07 (6 fixed, 1 declined should-fix) and `state: done`.
  - `report.md` carries items 1–6. Item 7 (the project copy) and item 8 (the book suggestion) did not apply.
  - `run.md`'s mode block was left stale (`critic: tbd`, `searches: 1`).

## Process record

| | old-g | old-c | new-g (so far) | new-c |
|---|---|---|---|---|
| sessions | 1 | 1 | 3 (stop: permissions; stop: budget; P32.S7 stop at D8) | 1 |
| wall time | 5.5 min | 6.0 min | 100 min to D8 | 55 min |
| cost | $1.53 | $2.31 | $43.65 to D8 | $27.83 |
| research | lead alone: 1 search, 12 fetches | lead alone: 4 fetches | 5 + 3 + 1 web researchers, 3 rounds, stop: complete | 6 code + 3 web researchers (1 re-dispatch), 2 gap rounds, stop: complete |
| verifier / gap-reviewer / critic dispatches | — | — | 17 / 3 (+1 continued by SendMessage) / 1 (stopped) | 11 / 3 (1 retry) / 1 |
| web searches | 1 | 0 | 57 | 6 |
| duplicate queries across researchers | — | — | 1 of 30 logged (normalized); 0 exact | 0 |
| converter exact match (after the researchers' `--check`) | — | — | 473/474 (first pass ≈ 467/474) | 87/87 (first pass ≈ 81/87) |
| permission denials | 6 | 15 | 5 + 3 + 8 | 32 |

Old arm notes:

- Both old leads wrote under `/tmp/explain-*`, outside the rules. Their edits were denied and they worked
  around it.
- old-c tried to read `~/.config/knowledge-kb/config.json` through a `python3` heredoc. The config deny
  rule stopped it, and the leak scans are clean.

## S3's `-p` checks

| Check | Result |
|---|---|
| Preflight, no rules | `FAILED: permissions` with the printed rules; only the converter written (pf-norules) |
| Preflight, the printed rules | passes (new-g, new-c, fail-pub, the resumes) |
| Auto mode, no rules | passes, zero denials (pf-auto) |
| State-dir writes | every dossier under `$XDG_STATE_HOME/knowledge-kb/explain/<run-id>/` |
| Converter exact match | see the process record (about 98.5% first pass, 99.8% after `--check`) |
| Searches per tier | tier 2 both; G 57 web searches over 3 rounds (one session's per-session cap was never hit); C 6 |
| maxTurns | enforced (see the first bullet below) |
| effort | not observable in the stream (no field reports it); unverified |
| One form per call (B6) | broken in both subjects (see the last bullet below); fixed as fix 1 |

maxTurns, in detail:

- The gap reviewer hit "stopped at its 15-turn limit" before writing, in both subjects.
- Hosts with no Grep or Glob tool leave it only Read; it wasted about 10 calls on Grep. Fixed as fix 3.

B6, in detail:

- Code researchers added `git -C <repo>` because of B6's "with absolute paths".
- Verifiers, researchers and the critic wrote `$` anchors and `{m,n}` braces in `grep`.
- On this host (2.1.308) Grep and Glob do not exist and the error points to Bash `grep`, so agents
  translated their Grep patterns straight into denied forms.
- Results:
  - new-g session 1 stopped on a verifier's `failed: permissions`;
  - two new-c researchers returned `failed: permissions`, which the lead overrode;
  - in new-g session 3, on the fixed copy, 5 subagent denials in 527 Bash calls, none fatal.

## S6's open items

| Item | Result |
|---|---|
| The lead keeps outline.md (D6), `## Critique`, `state: done`, the report items | yes on C (above); G not finished |
| `quick` / Sonnet lead: the verifier on the other model | fixed in §3.9 (fix 1). **Not run-confirmed** (the confirming run was over the cap) |
| A STOPPED or FAILED path | `FAILED: permissions` (pf-norules); `FAILED: publish` on a 401 (fail-pub: draft kept, resume line given, nothing published); `STOPPED: permissions` (new-g s1, a real defect); `STOPPED: budget` (new-g s2, the lead's own) |
| The curl publish via `pagetext.py --payload` | **not exercised.** Every run had the CLI on PATH, and the CLI-hidden confirming run was over the cap |
