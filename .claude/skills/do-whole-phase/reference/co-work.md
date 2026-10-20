# do-whole-phase — a design slice (`kind: co-work`)

A design slice runs inline, with dispatched spans, per the `design-cowork` skill: **its references own
the round procedure**, and you read each one when its moment comes. This file keeps only what the loop
adds.

- **Who runs what.** The round's lifecycle and the operator's words stay inline; the **drafting is
  dispatched to `design-drafter`** every round, the **critique to `design-critic`** when a job's level
  asks for it, and the **mockup build is the one span dispatched to a slice executor**
  (`slice-executor-high`, like any code slice), only when the operator asked for one. A wave's
  drafters run at once: the one carve-out from one executor at a time.
- **Legacy tool.** A phase whose `intent.md` still says `Design tool: claude-design` is a legacy one:
  at its first design slice set the slice `pending` (`--stop-kind decision`) and ask the operator to
  re-confirm it on `drafter`, per `design-cowork`'s legacy rule.
- **The steps, each where it lives:** open the wave's rounds, write the wave brief and each job's
  handoff (`design-cowork/reference/opening.md`); dispatch the drafters and run each job's critique
  loop (`reference/drafting.md`); read back, publish, commit and report the stop
  (`reference/publish.md`); the operator's return: edits, comments, feedback, signing
  (`reference/operator.md`); a requested mockup (`reference/mockup.md`).
- **The stops.** STOP the loop at **PENDING #1**, once for the whole wave:
  `python3 scripts/workflow.py set-slice-status <slice_id> pending --stop-kind wave --on-words "<what their words will do>"`.
  With a mockup requested, STOP again at **PENDING #2**, the mockup gate (`--stop-kind mockup`).
  **PENDING #2 exists only when a mockup was requested** (`Mockup: requested` in `intent.md`, or the
  operator asked in their own words before the round closed).
- **The mockup's verdict** is handled exactly as any delegated slice's (`reference/verdicts.md`); its
  `needs_operator` also covers a record too thin, wrong or inconsistent to build from, which you raise
  rather than fill.
- **Commits and stops.** The drafted wave is one commit and one stop; the signoff is one commit; each
  superseding wave is **one more commit and one more stop**; a mockup adds its commit and PENDING #2.
  **A wave signed at the first return is two commits and one stop; with a mockup, three commits and
  two loop stops.** When every job is signed, or dropped by the operator, `finish-slice`, commit, and
  continue the loop.
