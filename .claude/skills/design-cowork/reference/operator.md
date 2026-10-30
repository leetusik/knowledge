# design-cowork — the operator's return

## The operator's words — feedback, comments, edits, sign-off

**The session's words are the record.** On the operator's return:

1. **In-app edits.** Read the job back with `design-readback` (*Read back, then publish*: the
   listing, then only the files it names). A newer version with unchanged `project/` files is only
   the app saving on open, not an edit. Each changed file is copied into `jobs/<job>/canvas/project/`
   by `--fetched <dir> --apply` as the operator's work, and listed in `feedback.md` under
   `## Operator edits` (board, file, what changed). Their edits are their decisions; a signed job
   includes them, because the close snapshots the tree after the copy-in.
2. **Comments.** Read every thread with `ArtifactComments`. Copy each **verbatim** into
   `feedback.md` with its board and anchor. Threads the operator **activated** for Claude (Send to
   Claude, @claude) you reply to (`recorded in round <NN>`) and resolve once the superseding round is
   published, or at the close when the job is signed; plain comments you can read but not answer,
   so say you read them. A comment saying
   "approved" signs nothing: confirm it in the session.
3. **Their words decide the job:**
   - **Literal approval, no mockup requested** ("accept", "moveon", "approved", "ship it", or words
     to that effect): **`python3 scripts/workflow.py design-sign --slice <S> --words "<their literal
     words>"`** signs the job presented at the stop (in a pre-change multi-job slice, every job
     presented in one call, or none: below). When their words sign only one job of such a slice,
     sign it alone:
     `python3 scripts/workflow.py design-close <job>/<round> --words "<their literal words>"`.
   - **Feedback, anything but literal approval:** their words go verbatim into `feedback.md`; run
     `python3 scripts/workflow.py design-close <job>/<round> --superseded`, then `design-open --slug
     <s> --slice <S> --job <job>`, write the new round's handoff, and dispatch **one scoped revise pass**: one drafter
     (`pass: join`, the owner of the joined canvas) edits the canvas in place, with no frame and no
     page passes. Only when the feedback adds a page does the round run a page pass for it
     (`design-open … --pages <slug>`, `pass: page <slug>`) and then a join. **A
     superseding round's critique is off by default**: it is the scoped re-draft of an operator note.
     Pass `--critique <level>` only when the operator asks for it or the change reopens the look. The
     republish is a new canvas version of the same Artifact. A superseding round is a **new immutable
     round**, never an edit to the one it replaces.
   - **Mockup requested:** their go-ahead starts the mockup (*The mockup*); the close waits for their
     literal approval at PENDING #2. Never `design-sign` a slice with such a job at PENDING #1.
   - **The operator drops the job:** record their words in `feedback.md`, close the round
     `--superseded`, and open no new one.

A signed job is done; an unsigned one goes round again, and the slice stops at PENDING #1 once more:
**one more commit and one more stop per superseding round.**

## Signing — the engine writes the record

SIGNOFF is taken on the operator's **literal** words, at their return or, with a mockup, at
PENDING #2; never on silence, a drafter's `done`, a critic's `pass` or a read-back that raised points.

- **`design-sign --slice <S> --words "<w>"`** signs every job **presented**: each open round of the
  slice with a recorded publish (`design-canvas --version`). Rounds that published nothing are held
  and named. **All or nothing:** a preflight runs first, and one presented job that fails it signs
  none; the refusal names each problem and its command. It prints one line per job.
- **`design-close <job>/<round> --words "<w>"`** signs one job with the same preflight.
- **The preflight:** a recorded publish of the job's canvas, a **settled read-back since it**
  (`unchanged`, or `edited` once their files are copied in), the round's build contract (`result.md`
  `## Build`; a legacy round's `build-prompt.md`) and a passing `design-check <job>`.
- **Each signed round gets a generated `SIGNOFF.md`**: their words verbatim, the canvas version they
  saw, the read-back, and the open-item IDs from the `open_items:` lines of the round's verdict blocks
  (`result.md`, the latest critique and judge), or `none recorded`. Then the snapshot, the round and
  the job marked `signed`. Re-run a half-landed close. **Never write `SIGNOFF.md` yourself**; one
  hand-written before v61 is kept, with a warning.
- **The notebook gets one gist line per signed job** in `phase.md` `## Decisions`, appended through
  `phase-section <P> Decisions --append` (never `Edit` or `Write` on `phase.md`): it states what was
  signed, not a summary of it or a bare link, and links its round folder (`jobs/<job>/rounds/<round>/`).
  Anything longer (a contract, a summary later slices need) goes to `topics/<slug>.md` beside
  `phase.md`, behind that gist line.

Commit `feat(design): <slice> signoff — <job>`. **The slice finishes when its job is signed or
dropped** (a pre-change slice: every job in it): then `finish-slice`. **Implementation is a separate slice in every style.**
