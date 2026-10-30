# do-next-slice — a design slice (`kind: co-work`)

When the selected slice is a design slice (`kind: co-work`), step 3 runs it inline, with dispatched
spans, per the `design-cowork` skill: **its references own the round procedure**, and you read each one
when its moment comes. This file keeps only what this skill adds.

- **Who runs what.** The round's lifecycle and the operator's words stay inline; the **drafting is
  dispatched to `design-drafter`** every round, the **critique to `design-critic`** (its judge mode
  too) when a job's level asks for it, and the **mockup build is the one span dispatched to a slice
  executor** (`slice-executor` on the high row, like any code slice), **when the operator asked for one, and only
  then**. Each round runs in passes, once per round: a `co-work` slice designs one job, its frame
  drafter first, then its page drafters at once (each page's critic as its drafter returns), then the
  join and the cross-page critic.
- **Legacy tool.** A phase whose `intent.md` still says `Design tool: claude-design` is a legacy one:
  at its first design slice set the slice `pending` (`--stop-kind decision`) and ask the operator to
  re-confirm it on `drafter`, per `design-cowork`'s legacy rule.
- **The steps, each where it lives:** open the slice's round, write the slice's brief and the round's
  handoff (`design-cowork/reference/opening.md`); dispatch the drafter and run the job's critique
  loop (`reference/drafting.md`); read back, publish, commit and report the stop
  (`reference/publish.md`); on the **resume**, the operator's return: edits, comments, feedback,
  signing (`reference/operator.md`); a requested mockup (`reference/mockup.md`).
- **The stops.** Stop at **PENDING #1**, once per round:
  `python3 scripts/workflow.py set-slice-status <slice_id> pending --stop-kind wave --on-words "<what their words will do>"`.
  With a mockup requested (`Mockup: requested` in `intent.md`, or asked for in their own words before
  the round closed), their go-ahead dispatches the mockup and you stop at **PENDING #2**, the mockup
  gate (`--stop-kind mockup`); `Mockup: on request` with no ask means no mockup.
  **PENDING #2 exists only when a mockup was requested.**
- **The mockup's verdict** is handled by step 4 unchanged; its `needs_operator` also covers a record
  too thin, wrong or inconsistent to build from, which you raise rather than fill.
- **Commits, stops and invocations.** Each superseding round is **one more commit, stop and
  invocation**. **A round signed at the first return takes two commits, one `pending` stop and two
  `/do-next-slice` invocations**; with a mockup, **three commits, two stops, three invocations**. When
  the job is signed, or dropped by the operator, continue at step 5.
