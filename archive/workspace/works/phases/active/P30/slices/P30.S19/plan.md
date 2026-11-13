# P30.S19 — Quiz (`04-quiz`)

## Goal

Build the signed `04-quiz` round §1–§9, with *Behaviour*, in the reader:
- the block head;
- the grading margin;
- prompt, hint and note;
- `choice`, `recall` and `cloze`;
- the foot;
- after grading: accepted answers and the explanation;
- Sign in to save.

Behaviour:
- states and transitions;
- grading **on the client**;
- saving the **first attempt** through `POST quiz-attempts`, which seeds S10's card;
- on return, signed in: the saved answer ("your answer, v3");
- signed out;
- retry and focus;
- keyboard;
- what assistive technology hears;
- Korean.

The option border is the 3:1 control edge (`--rd-control-edge`, from `01-reader` round 03 → `## Build`
§1; quiz C09 in the A5 wave).

## Read first

- **`works/phases/active/P30/topics/surface-slice-rules.md`: binding.**
- The spec:
  - `docs/reference/design/jobs/04-quiz/rounds/01-quiz/build-prompt.md`, the whole prompt;
  - the canvas `docs/reference/design/jobs/04-quiz/rounds/01-quiz/canvas/project/`;
  - `docs/reference/design/jobs/01-reader/rounds/03-chapter-bar-and-border/result.md` → `## Build` §1, the control edge.
- `topics/notes-server.md` → *S8* (the quiz-attempt payload carries `doc` and `unit`, plus the limits) and
  *S10* (the quiz-attempt response's `card`; first-attempt seeding).
- `server/native/README.md`: the quiz grammar, as fixed by F2.
- `topics/notes-later.md` → *The render pipeline as shipped* (`kb-ch-quiz`, which S19's island replaces)
  and S15's notes.

## Approach

- **A client island per quiz block.** It gets its items from the server render, with the answers. P29
  says whether answers may be in the page; follow *S2* and *S3 Quiz results*.
- **Grading:** exact client grading per the prompt's *Grading* (choice sets, recall self-grade, and cloze
  matching rules).
- **Saving:** the first attempt is posted through a BFF route, created in the existing BFF pattern if
  missing, and is idempotent per item (S8).
- **On return:** prefill the saved answer with its version label.
- **Very-core tests:** grading (choice, cloze matching, recall) and the first-attempt-only save decision.

## Out of scope

- The review surface (S24) and an entry to review from the quiz (D42).

## Dispatch

slice=P30.S19
phase=P30
kind=implementation
risk=low
attempt=1
route=mid
reason=kind implementation rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
