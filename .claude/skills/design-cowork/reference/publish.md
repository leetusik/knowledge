# design-cowork — read back, publish, PENDING #1

## Read back, then publish

**Read back each job yourself; a `done` is a claim, not your check:**

1. **`python3 scripts/workflow.py design-check <job>`.** **Never rest on the drafter's own
   `design_check` line.** Exit 1 goes back to the drafter on the same open round with exactly the
   named problems; if they survive that pass, report them and hold the job.
2. **Read only the verdict blocks and `## Summary`:** the drafter's verdict, the round `result.md`'s
   `## Summary` (1 KB or less: what was drawn, departures, open items with their IDs) and, when
   critique was on, the critique's verdict block. Never the rest of the drafter's output, canvas JS or
   CSS, or a whole design file: `## Build` is for the mockup builder and the build slices. Render it
   yourself with `design-preview` when you need to see something; never view the published canvas to
   check it.
3. **Concreteness check.** The bar: *no design decision is left to invent.* A gap the summary or a
   verdict names (an open question, a `## Build` the drafter calls thin) goes back to the drafter with
   the gaps named. A question only the operator can settle goes to them at the stop as a decision to
   take. **Never fill a design gap yourself.**

**Then publish** (main thread only):

1. **Read back first, from the second round on** (and at the operator's return, *The operator's
   words*). Never pull the canvas whole:
   - `Artifact` `list` with `scope: files` on the job's canvas; save its output to a scratch file (or
     pipe it) and run **`design-readback <job> --listing <file|->`**. It compares the listing's
     sizes with the size manifest of the last publish and prints one line per fact, never a file's
     contents: `readback=unchanged` (nothing to fetch); `readback=changed … files=N` with one
     `fetch=` line (the files whose size moved, and new ones) and a `removed=` line for files gone
     from the canvas; or `readback=changed-unlocated` when the version moved but no size did (opening
     a canvas in the app saves a new version; a same-size edit looks the same) or the job has no
     manifest yet, and then `fetch=` names the boards.
   - `Artifact` `read` exactly the `fetch=` paths, `out_dir` a scratch folder outside the design
     root, then **`design-readback <job> --fetched <dir>`**: one `diff=<path> +A -B` line per file
     that differs from the canvas tree (the unified diffs go to `<dir>/readback.diff`, scratch, never
     the record). No difference settles the read-back `unchanged`.
   - A difference is an operator edit: **`--fetched <dir> --apply`** copies their files over the
     canvas tree and settles it `edited` (delete by hand first any file they removed; `--apply`
     refuses until then). List each in `feedback.md` (*The operator's words*) before you send
     anything.
2. **`design-publish-plan <job>`** prints `{url, root, file_path, files}`: the changed files and
   removed ones mapped to `null`. The system files, as server-side copies from the system Artifact
   (`ds/` is never sent from disk), are in it only on the job's **first publish** or when the system
   version its `canvas.json` pins has changed since the last publish (`job.json` `canvas.system`);
   otherwise they are left out, and the server keeps them. Pass the plan to `Artifact` `publish` as
   is, with a per-round `label` (`round 02-revise`); never trim it.
3. **`design-canvas <job> --version <id>`** with the version id the publish returned. It also records
   the system version the publish installed (`canvas.system`), the size manifest the next read-back
   compares with (`canvas.manifest`), and the version on the open round (`published`): what
   `design-sign` presents, and what a read-back must follow before the round can be signed.
4. **A publish refused over the operator's in-app edit:** read it back (step 1), copy it in with
   `--apply`, record it verbatim in `feedback.md` as their decision, then republish. **Never
   `force`.**

**Land the notebook's half.** Spec **pointers** into `phase.md`, entry by entry through
`phase-section` (never `Edit` or `Write` on the file): each job's address and canvas link,
the mockup route once one exists, and the decisions later slices must not re-litigate. The boards and
the full spec stay in the record, linked by path.

## PENDING #1 — one stop per wave

When every job of the wave is published or held: commit,
`set-slice-status <slice> pending --stop-kind wave --on-words "<what their words will do>"`, and STOP. The commit is `feat(design): <slice> drafted — <job>/<round>, …` (a superseding round:
`… — supersedes <job>/<round>`), carrying the wave brief, the handoffs, the canvas trees, the round
records, the critique files and the closes of superseded rounds.

**The stop report** is a chat message, never a file in the record: about 2,000 characters or less,
plus each job's canvas link (and what each Page is for, in a few words).

- **At most about 5 decisions**, across the wave. A decision is an item that changes a contract,
  contradicts the operator's own words, or is costly to reverse after the build. Each names its job
  and open-item ID, and both sides where the answer pass left a rebuttal or the critic was unsure.
- **Everything else is one "decided as drawn" list** the operator can skim, by job and ID: the
  drafter's departures and `component_gaps`, the critique items the answer pass settled, the taste
  (2b) notes, the wave choices, the unsure and low-confidence items that are not decisions.
- **A held job's exact need** (`needs_operator`, `blocked`, a failed read-back), and the jobs that
  are not presented with it.
- **What their words will do:** one word ("accept", "moveon", or words to that effect) **signs
  everything presented** (`design-sign`); with a mockup requested it is that job's go-ahead instead;
  anything else is feedback, and a superseding round re-drafts that job. Comments they send to Claude
  and edits they make in the canvas are read when they return.

## Never — the round's channels

- Make a round depend on a `git push` or a repo connection: a design slice authorizes no `git push`.
- Write the stop report, a canvas listing, a fetched file or a diff into the record.
