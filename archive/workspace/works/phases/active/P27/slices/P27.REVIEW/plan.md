# P27.REVIEW — plan (orchestrator native plan, `auto`, 2026-09-21)

**The phase review for P27 — "Console visual redesign — design system + responsive surfaces (design)".**
Executor: `slice-executor-high` (review routes there by **kind**, whatever the risk says).

Read `works/phases/active/P27/phase.md` whole first, then `intent.md`. They are the contract for what this
phase was for. Every slice is `done`: `DECOMP`, `S1` (docs), and four `co-work` design rounds `S2`–`S5`.

## What this phase is, and what that makes the review

P27 is a **`design-only`** phase. It produced four signed, immutable design rounds and **no product code**.
P28 is the apply phase and has not started. Two consequences that shape everything below:

- **The acceptance gate is `waived`** (`accept-gate P27` shows the fixed note `design-only, no mockup: the
  operator signed the round on the card set`). So there is **no walkthrough**, **no browser stage**, and
  **no opening of the running product**. Do not produce a `walkthrough` field. Do not run `accept-gate` —
  it is a phase-state command and executors never run it.
- **The phase's boundary contains no product code.** Run `python3 scripts/workflow.py phase-scope P27` and
  confirm this rather than assuming it: the changed product files should be `web/design/rounds/**` only
  (`works/` and `docs/` are excluded by the command). Record the file count and the commit range.

## Your job, in order

### 1. The boundary and the regression checklist

`phase-scope P27` prints the creation commit, the commit range and the changed product files. Read
`## Regression Checklist` in `docs/current/qa.md` (line ~234). **Place each line against the boundary.** A
phase that changed no product surface has **no line inside its boundary**: record the lines by **count**,
name the diff as the proof, and re-run **nothing**. That is the correct outcome here, not a shortcut — say
so plainly in `result.md`.

**Do not append new checklist lines.** A checklist line is a check on shipped behaviour; this phase shipped
none. The behaviour these rounds describe becomes checkable when **P28** implements it, and P28's review
appends the lines then. State this decision explicitly in `result.md` so the review's stage-4 carve-out is
visibly *considered and declined*, never forgotten.

### 2. The one write this review owns — `## Operator Runtime`

This is the review's named carve-out and **the phase's only `## Doc impact` line**. The section is absent
from `docs/current/operations.md` today (verified: its headings run `## Status` … `## Invariant`, with no
`## Operator Runtime`).

The exact text to write is in `works/phases/active/P27/slices/P27.S1/result.md` under the heading
`## Draft — ## Operator Runtime`. It was verified by S1 against `web/.env.example` and the operations doc's
own *Local Development* / *Web app local build/run (P12)* / *Web app production deploy (P14)* sections.

```sh
python3 scripts/workflow.py doc-new-version --doc operations \
  --summary "P27 operator runtime manifest: how the operator runs and views the web product (dev + production runtimes, acceptance origin, devices/viewports, Aside agent account u1)" \
  --source P27.REVIEW
# edit ONLY the returned edit_path, adding ONLY the ## Operator Runtime section, verbatim
python3 scripts/workflow.py rebuild-docs
```

Write it **verbatim** and touch **no other section**. Never hand-edit `docs/current/operations.md` — it is
a generated snapshot. Place the new section where it reads naturally beside the other runtime sections.

### 3. Verify the four rounds' records

For each of `web/design/rounds/0{3,4,5,6}-*/`, confirm: `handoff.md`; a read-only `output/` directory;
`build-prompt.md` inside it (round 03's is `output/build-prompt.md` too); and `SIGNOFF.md` carrying the
operator's **literal** words. Round 03 additionally has `bootstrap.md`. Each SIGNOFF should quote `"done"`
and record what was checked before signing.

You are **verifying that the record is complete and self-consistent**, not re-reviewing the design. The
designs are signed and immutable. Do not propose visual changes, do not "improve" anything, and never edit
a file under any round's `output/`.

Two things to check that are cheap and worth catching:

- **Cross-round contradiction.** Rounds 04→05→06 each corrected something earlier (round 05 fixed round
  04's public `.kb-app-layout` grid; round 06 retired `.kb-prose`'s 46rem and re-cut the explainer frame's
  height the way round 05 re-cut the graph plate). Confirm each correction is recorded **in the later
  round** and that no earlier round was edited to hide it. A correction that is *not* recorded anywhere is
  a finding; a correction recorded in the later round is correct practice.
- **Decisions completeness.** Every decision recorded in a round's `output/result.md` should be represented
  in `phase.md`'s `## Decisions`. A decision that exists only in a `result.md` is a finding.

### 4. The `## Doc impact` list

Verify it covers every durable-truth change the phase made. Expected: **exactly one line**, S1's operations
section — because a design round changes no durable doc until P28 implements it. If you find a durable-truth
change with no note, that is a finding.

### 5. Route every `## Operator Questions` entry — five of them

The gate is waived, so **nothing can be folded into a walkthrough**. Each entry is therefore either answered
by the operator at this review or **filed with `defer-job`**. **You list them; the orchestrator files them** —
do not run `defer-job` yourself. For each, return a proposed title / reason / trigger:

1. `(from P27.DECOMP)` the unreproduced off-frame graph screenshot — never supplied; round 05 designed a fit
   contract around it and P28 carries it as an unreproduced report.
2. `(from P27.DECOMP)` whether a closing consistency-sweep round 07 is wanted (default: no).
3. `(from P27.S2)` round 03 card 14's error/empty copy (default: adopt verbatim).
4. `(from P27.S4)` round 05's new graph strings, including the bilingual halves (default: adopt verbatim).
5. `(from P27.S5)` round 06's nineteen document strings, English-only (default: adopt verbatim).

An unrouted entry is a review finding and the review may not pass with one.

### 6. `result.md` and the verdict

Write `works/phases/active/P27/slices/P27.REVIEW/result.md`, **verdict block first**, then: the boundary
(commit range, file count), the checklist placement by count, the four records' verification, the Doc impact
verification, the five questions with proposed filings, any findings, and the commands you ran with their
outcomes. Edit `phase.md` under budget — rewrite `## Now`, drop the notes you consumed, and **append** the
`## Doc impact` line for the operations version you wrote.

Return `done` with a verdict of `pass` / `changes_requested` / `blocked`, **no `walkthrough`**. Do **not**
run `review-phase`, `accept-gate`, `defer-job`, `archive-*`, or any `git` command — the orchestrator owns
every state transition and every commit.

## Constraints

- This phase writes **no product code**. If something in the rounds looks wrong to build, that is a
  **finding reported to P28**, never a fix here.
- Never edit a signed round's `output/` or `SIGNOFF.md`. Never edit `docs/current/*.md` by hand.
- `doc-new-version` + `rebuild-docs` run on the default stream, which is where you are.
- Do not run `prettier --write` on any existing web file (**D22**).
- Related deferred jobs already filed: **D18**, **D22**, **D25** — do not duplicate them.

## Validation

`python3 scripts/workflow.py validate` must pass. `python3 scripts/workflow.py docs` should show
`operations` at its new version with `source=P27.REVIEW`.
