# do-whole-phase — a design slice (`kind: co-work`)

A design slice runs inline, with dispatched spans, per the `design-cowork` skill: **its references own
the round procedure**, and you read each one when its moment comes. This file keeps only what the loop
adds.

- **Who runs what.** The round's lifecycle and the operator's words stay inline; the **drafting is
  dispatched to `design-drafter`** every round, the **critique to `design-critic`** when a job's level
  asks for it, and the **mockup build is the one span dispatched to a slice executor**
  (`slice-executor` on the high row, like any code slice), only when the operator asked for one. Each round runs in passes, once per round: a `co-work`
  slice designs one job, its frame drafter first, then its page drafters at once (each page's critic as
  its drafter returns), then the join and the cross-page critic. The slice is a barrier that never shares
  a slice wave; its own spans run in parallel inside it.
- **Legacy tool.** A phase whose `intent.md` still says `Design tool: claude-design` is a legacy one:
  at its first design slice set the slice `pending` (`--stop-kind decision`) and ask the operator to
  re-confirm it on `drafter`, per `design-cowork`'s legacy rule.
- **The steps, each where it lives:** open the slice's round, write the slice's brief and the round's
  handoff (`design-cowork/reference/opening.md`); dispatch the drafter and run the job's critique
  loop (`reference/drafting.md`); read back, publish, commit and report the stop
  (`reference/publish.md`); the operator's return: edits, comments, feedback, signing
  (`reference/operator.md`); a requested mockup (`reference/mockup.md`).
- **The stops.** STOP the loop at **PENDING #1**, once per round:
  `python3 scripts/workflow.py set-slice-status <slice_id> pending --stop-kind wave --on-words "<what their words will do>"`.
  With a mockup requested, STOP again at **PENDING #2**, the mockup gate (`--stop-kind mockup`).
  **PENDING #2 exists only when a mockup was requested** (`Mockup: requested` in `intent.md`, or the
  operator asked in their own words before the round closed).
- **The mockup's verdict** is handled exactly as any delegated slice's (`reference/verdicts.md`); its
  `needs_operator` also covers a record too thin, wrong or inconsistent to build from, which you raise
  rather than fill.
- **Commits and stops.** The drafted round is one commit and one stop; the signoff is one commit; each
  superseding round is **one more commit and one more stop**; a mockup adds its commit and PENDING #2.
  **A round signed at the first return is two commits and one stop; with a mockup, three commits and
  two loop stops.** When the job is signed, or dropped by the operator, `finish-slice`, commit, and
  continue the loop.
