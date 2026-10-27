# design-cowork — the mockup

## The mockup — only when the operator asks for one

**A mockup is optional.** The working canvas is the default review surface. An in-product mockup is
built only when the operator asked for one: `Mockup: requested` under `## Design Style`, or in their
own words before the round closes. Then their go-ahead at PENDING #1 starts it, **in addition to** the
canvas, and SIGNOFF waits for PENDING #2. **It transcribes the signed-off design; it decides
nothing.**

- **A throwaway route in the project's own router**, namespaced by job, following the project's own
  conventions. **Record its path in `phase.md`**, beside the job's signed-round line
  (`phase-section <P> Decisions --entry K --replace`).
- **The project's real stack, real components, real tokens**, under **RESPECT THE DESIGN**: every
  designed element and state present, nothing dropped, simplified, restyled or "improved".
- **Stubbed data, no backing work.** It proves **look and states, not wiring.** Non-functional
  controls are acceptable **and must be named as such in the gate walkthrough**; without that bound
  the mockup grows into the apply slice it exists to precede.
- **Exempt from the full functional sweep** (*Verifying*): that sweep is the apply slice's duty, on
  real wiring. What is checked here: it runs, every designed element and state renders, and it matches
  the record.
- **Verified in the operator's runtime**, the one `## Operator Runtime` names, plus the production
  build when they differ. Absent or `UNFILLED` → **`needs_operator`**, and the slice goes `pending`.
  Driven with the same instrument *Verifying* prescribes (**Claude in Chrome**, the agent's profile
  selected first, or the fallback the manifest names): the exemption is from the sweep,
  never from the runtime or the tooling.
- **Dispatched to `slice-executor`** (`executor-route <slice>`, the high row by kind), built from
  the round `result.md`'s `## Build` (a legacy round's `build-prompt.md`) and the job's record on disk,
  the canvas tree included. If it has to guess how to build something, `## Build` is what is short.
- **Its own `needs_operator` condition:** a record that proves **wrong, internally inconsistent, or
  too thin to build without inventing** comes back as `needs_operator`, and you raise it. **Never fill
  the gap.**
- **Then PENDING #2, the mockup gate.** Commit `feat(design): <slice> mockup — …` and stop
  (`set-slice-status <slice> pending --stop-kind mockup --on-words "<what their words will do>"`). The
  walkthrough names the run command, the URL, the viewports, **what is real and what is stubbed**, and
  what is deliberately not wired. **PENDING #2 exists only when a mockup was requested.**
- **Rejection splits like every other finding.** A departure from the record is fixed in the mockup. A
  design question starts a superseding round (their words into `feedback.md`, the round closed
  `--superseded`, the job re-drafted, critiqued as its level says, republished, and the mockup rebuilt
  from it).
- **Throwaway lifecycle.** Whichever slice builds the surface for real **deletes the route** (under
  `design-only`, the apply phase's). The phase review checks that no orphaned design route remains, in
  a phase that shipped one.
