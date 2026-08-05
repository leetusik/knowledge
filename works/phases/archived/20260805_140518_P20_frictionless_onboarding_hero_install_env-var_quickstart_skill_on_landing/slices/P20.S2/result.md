# P20.S2 result — design round 02 (env-var quickstart + skill on landing)

Orchestrator-run co-work slice (DesignSync is main-thread-only; never dispatched). The round completed
the full loop: handoff → `pending` (operator designed in Claude Design) → read-back → landed as-is.

## The loop as it ran

1. **Handoff** written to `web/design/rounds/02-onboarding/handoff.md` (commit `15b5f23`), slice set
   `pending` — scope: the env-var agent quickstart section + the explain-skill-on-landing section, all
   technical facts locked as data, copy in play (dated exception), five questions posed back (incl. D10).
2. **Operator returned round 02** and directed the gate clear. Read back with DesignSync from
   *Knowledge Base Design System* (`f49ab425-e75f-46c4-a6fa-48bb9938b203`) — project verified by id +
   content, not name: `get_project` (type `PROJECT_TYPE_DESIGN_SYSTEM`), `list_files` shows
   `_ds_manifest.json`, the three round-02 cards (`marketing/agent-quickstart.card.html`,
   `marketing/skill-landing.card.html`, `marketing/copy-snippet.card.html`), and the round record under
   `marketing/rounds/02-onboarding/`. Operator confirmed the cards render in the Design System pane.
3. **Concreteness check: PASS** — `build-prompt.md` pins the final page order, full verbatim copy for both
   sections and the D10 ledes, exact snippet/copy behaviors (display vs copy-action distinction), the
   `/SKILL.md` serving decision, the copy-control component contract, and the motion/a11y floor. No design
   decisions left to invent.
4. **Landed as-is:** `output/result.md` + `output/build-prompt.md` (verbatim, read-only), `SIGNOFF.md`
   (authorization quote, supersession, **token delta: None**, the bronze open flag), spec + notes appended
   to `phase.md` for S3/S4/REVIEW.

## Resolutions of note

- **D10 resolved** — the two feature ledes existed on the shipped round-01 cards but were never quoted;
  build-prompt §D10 now quotes them verbatim for `content.ts`. Deferred D10 closed at this boundary
  (dropped with a done-reason, D3 precedent).
- **No token delta** — no `tokens.css` returned; bronze `#c8a15e` remains a literal (the terminal `.key`
  ink), reused as the trap-note kicker.
- **Open flag** (operator to confirm, default as-returned): bronze as the caution kicker vs keys-only —
  a one-value apply-time swap in S3 if requested.

## Validation

- DesignSync read-back completed read-only (no writes to the design project).
- Round record files exist under `web/design/rounds/02-onboarding/{handoff.md,SIGNOFF.md,output/}`.
- `python3 scripts/workflow.py validate` — run at the boundary by the orchestrator.

## Deviations from plan.md

- The operator's gate-clear message did not include the project id (the handoff asked for it), so the
  project was discovered via `list_projects` and verified by id + content before any read — read-only, and
  the id is recorded in `SIGNOFF.md`/`phase.md` for future rounds.
- Otherwise none: no implementation code written, design landed unedited, two-commit shape kept
  (handoff commit `15b5f23`; read-back commit at this boundary).
