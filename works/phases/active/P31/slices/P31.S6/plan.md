# P31.S6 — Handoff note: retire the old explain and apply the package

## Goal

Write the one note the operator gives the bootstrap agent: **`works/phases/active/P31/handoff-explain.md`**.
The bootstrap agent reads it cold. It must say, in order:
1. **Retire the old `/explain`.**
   - P30's handoff covers this: delete the vendored HTML skill, add the pointer to the knowledge plugin, and
     make the updater never touch anything named `explain`.
   - Point to `works/phases/active/P30/handoff-explain.md` for the detail, as the package's `PATCHES.md`
     section 0 crosswalk does. Don't restate it.
   - Say what P31 supersedes in it: the pointer line, and the plugin minimum, which becomes **0.5.0**.
2. **Apply the package** at `works/phases/active/P31/package/`, in the README's order:
   - copy the four new files;
   - apply `PATCHES.md` sections 1–12;
   - release (section 13);
   - verify (section 14).
3. **What a workspace gets afterwards:**
   - `/knowledge:explain` for one chapter;
   - "make an explain phase for X" for a book, with the outline gate, chapters with a critic, a review that
     publishes private, and the acceptance gate.
4. **The minimums:**
   - plugin 0.5.0;
   - CLI 0.2.0;
   - a server with `POST /api/documents/check`, deployed by the knowledge operator.

   Until that server is deployed, chapter checks exit 2 ("no route") and are skipped with a report line. The
   review's 422 is the backstop.
5. **What the rehearsal taught.** These are the lines the S5 note lists (the outline's new lines, the
   target-free `## Publish`, exit-2 branching, the critic's extra checks), each as a one-line pointer into the
   package file that now carries it.

Keep it short: an index with pointers, about 150 lines at most. The package carries the detail.

## Read first

- `phase.md`: the `for S6` notes (three of them) and `## Decisions`.
- `package/README.md`, `package/PATCHES.md` (section 0 and the section list), and
  `works/phases/active/P30/handoff-explain.md` (its headings and section 2).
- The bootstrap, **read-only**: re-grep any line number the note cites against HEAD (`git -C … rev-parse
  --short HEAD`). Pin the HEAD it was checked at in the note.

## Done when

- The note exists. Every path it names exists, and every line number it cites matches bootstrap HEAD.
- `python3 scripts/workflow.py validate` passes.
- The bootstrap is unchanged. No product code is touched.

## Notebook

- `phase.md`:
  - `## Now`, with REVIEW next;
  - the REVIEW's note: what the gate shows the operator (`knowledge check` on a real chapter, which needs
    the deploy (OQ1); the package; the handoff), plus the open OQs to route (OQ1, OQ10).
- `result.md`: verdict block first.

## Dispatch

slice=P31.S6
phase=P31
kind=docs
risk=low
attempt=1
route=cheap
reason=kind docs rated low
tier=mid
subagent_type=slice-executor-mid
model=sonnet
pass_model=yes
effort=high
pass_effort=yes
attribution=Claude Sonnet 5.5
explore_model=haiku
explore_effort=high
